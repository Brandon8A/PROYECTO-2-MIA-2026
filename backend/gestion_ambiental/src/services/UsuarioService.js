
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';

const CAMPOS_EDITABLES = [
    'nombres',
    'apellidos',
    'correo',
    'rol',
    'estado',
    'almacenamiento'
];

class ErrorServicio extends Error {
    constructor(mensaje, codigo = 400, detalles = undefined) {
        super(mensaje);
        this.name = 'ErrorServicio';
        this.codigo = codigo;
        this.detalles = detalles;
    }
}

const validarId = (id) => {
    if (!mongoose.isValidObjectId(id)) {
        throw new ErrorServicio( 'El ID del usuario no tiene un formato válido.', 400)
    }
}

const usuarioPublico = (usuario) => {
    const datos = usuario.toObject ? usuario.toObject() : { ...usuario }
    delete datos.passwordHash
    return datos
}

// CREATE
const crearUsuario = async (datos) => {
    const {
        nombres,
        apellidos,
        correo,
        password,
        rol = 'usuario',
        estado = 'activo',
        almacenamiento
    } = datos;

    if (typeof nombres !== 'string' || !nombres.trim() || typeof apellidos !== 'string' || 
        !apellidos.trim() || typeof correo !== 'string' || !correo.trim() || 
        typeof password !== 'string' || !password || !almacenamiento) {
        throw new ErrorServicio('Se deben proporcionar nombres, apellidos, correo, contraseña y almacenamiento.')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const usuario = await Usuario.create({
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        correo: correo.trim().toLowerCase(),
        passwordHash,
        rol,
        estado,
        almacenamiento
    })
    return usuarioPublico(usuario)
}

// READ: listar
const listarUsuarios = async () => {
    const usuarios = await Usuario.find()
        .sort({ fechaCreacion: -1 })
        .lean();

    return { total: usuarios.length, usuarios }
}

// READ: consultar uno
const obtenerUsuario = async (id) => {
    validarId(id)
    const usuario = await Usuario.findById(id)
    if (!usuario) {
        throw new ErrorServicio('Usuario no encontrado.', 404)
    }
    return usuarioPublico(usuario)
}

// UPDATE
const actualizarUsuario = async (id, datos, actorId) => {
    validarId(id)

    const camposRecibidos = Object.keys(datos)
    const camposPermitidos = [...CAMPOS_EDITABLES, 'password']
    const camposNoPermitidos = camposRecibidos.filter(campo => !camposPermitidos.includes(campo))

    if (camposNoPermitidos.length > 0) {
        throw new ErrorServicio('La solicitud contiene campos que no se pueden modificar.', 400, { campos: camposNoPermitidos })
    }

    if (camposRecibidos.length === 0) {
        throw new ErrorServicio('Se debe enviar al menos un campo para actualizar.')
    }
    const usuario = await Usuario.findById(id)
    if (!usuario) {
        throw new ErrorServicio('Usuario no encontrado.', 404)
    }

    // Evitar que el administrador desactive o degrade su propia cuenta.
    const esPropiaCuenta = actorId && usuario._id.toString() === actorId.toString()
    if (esPropiaCuenta && (datos.estado === 'inactivo' || datos.rol === 'usuario')) {
        throw new ErrorServicio('No puedes desactivar ni quitarte el rol de administrador a ti mismo.', 400)
    }

    if (Object.hasOwn(datos, 'nombres')) {
        if (typeof datos.nombres !== 'string' || !datos.nombres.trim()) {
            throw new ErrorServicio('Los nombres no pueden estar vacíos.')
        }
        usuario.nombres = datos.nombres.trim()
    }

    if (Object.hasOwn(datos, 'apellidos')) {
        if (typeof datos.apellidos !== 'string' || !datos.apellidos.trim()) {
            throw new ErrorServicio('Los apellidos no pueden estar vacíos.')
        }
        usuario.apellidos = datos.apellidos.trim()
    }

    if (Object.hasOwn(datos, 'correo')) {
        if (typeof datos.correo !== 'string' || !datos.correo.trim()) {
            throw new ErrorServicio('El correo no puede estar vacío.')
        }
        usuario.correo = datos.correo.trim().toLowerCase()
    }

    if (Object.hasOwn(datos, 'rol')) {
        usuario.rol = datos.rol
    }

    if (Object.hasOwn(datos, 'estado')) {
        usuario.estado = datos.estado
    }

    if (Object.hasOwn(datos, 'almacenamiento')) {
        usuario.almacenamiento = datos.almacenamiento
    }

    if (Object.hasOwn(datos, 'password')) {
        if (typeof datos.password !== 'string' || datos.password.length === 0) {
            throw new ErrorServicio('La contraseña no puede estar vacía.')
        }
        usuario.passwordHash = await bcrypt.hash(datos.password, 12);
    }
    await usuario.save()
    return usuarioPublico(usuario)
}

// Activar o inactivar una cuenta.
const cambiarEstadoUsuario = async (id, estado, actorId) => {
    validarId(id);

    if (!['activo', 'inactivo'].includes(estado)) {
        throw new ErrorServicio(
            "El estado debe ser 'activo' o 'inactivo'."
        );
    }

    return actualizarUsuario(id, { estado }, actorId);
};

// DELETE: se conserva porque ya existe en las rutas actuales.
const eliminarUsuario = async (id, actorId) => {
    validarId(id);

    if (actorId && id === actorId.toString()) {
        throw new ErrorServicio(
            'No puedes eliminar tu propia cuenta.',
            400
        );
    }

    const usuario = await Usuario.findByIdAndDelete(id);

    if (!usuario) {
        throw new ErrorServicio('Usuario no encontrado.', 404);
    }

    return { id: usuario._id };
};

export {
    crearUsuario,
    listarUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario,
    eliminarUsuario,
    ErrorServicio
};
