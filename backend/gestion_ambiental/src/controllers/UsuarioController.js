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

// Elimina información privada antes de responder al cliente.
const usuarioPublico = (usuario) => {
    const datos = usuario.toObject();
    delete datos.passwordHash;
    return datos;
};

// Comprueba que el ID tenga un formato válido.
const idValido = (id) => mongoose.isValidObjectId(id);

// CREATE: registrar un usuario.
const crearUsuario = async (req, res) => {
    try {
        const {
            nombres,
            apellidos,
            correo,
            password,
            rol,
            estado,
            almacenamiento
        } = req.body;

        if (
            !nombres?.trim() ||
            !apellidos?.trim() ||
            !correo?.trim() ||
            typeof password !== 'string' ||
            password.length === 0 ||
            !almacenamiento
        ) {
            return res.status(400).json({
                mensaje: 'Se deben proporcionar nombres, apellidos, correo, password y almacenamiento.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const usuario = await Usuario.create({
            nombres,
            apellidos,
            correo: correo.trim().toLowerCase(),
            passwordHash,
            rol: rol ?? 'usuario',
            estado: estado ?? 'activo',
            almacenamiento,
            fechaCreacion: new Date()
        });

        return res.status(201).json({
            mensaje: 'Usuario creado correctamente.',
            usuario: usuarioPublico(usuario)
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ mensaje: 'Ya existe un usuario registrado con ese correo.' });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                mensaje: 'Los datos del usuario no son válidos.',
                errores: Object.values(error.errors).map((e) => e.message)
            });
        }

        if (error.name === 'MongoServerError' && error.code === 121) {
            return res.status(400).json({ mensaje: 'El documento no cumple las validaciones de MongoDB.' });
        }

        console.error('Error al crear usuario:', error);
        return res.status(500).json({ mensaje: 'Error interno al crear el usuario.' });
    }
};


// READ: listar usuarios.
const listarUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.find()
            .sort({ fechaCreacion: -1 })
            .lean();

        return res.status(200).json({
            total: usuarios.length,
            usuarios
        });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        return res.status(500).json({ mensaje: 'Error interno al consultar los usuarios.' });
    }
};


// READ: consultar un usuario por ID.
const obtenerUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({ mensaje: 'El ID del usuario no tiene un formato válido.' });
        }

        const usuario = await Usuario.findById(id);

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        return res.status(200).json({ usuario: usuarioPublico(usuario) });
    } catch (error) {
        console.error('Error al consultar usuario:', error);
        return res.status(500).json({ mensaje: 'Error interno al consultar el usuario.' });
    }
};


// UPDATE: actualizar los campos permitidos.
const actualizarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({ mensaje: 'El ID del usuario no tiene un formato válido.' });
        }

        const camposRecibidos = Object.keys(req.body);
        const camposPermitidos = [...CAMPOS_EDITABLES, 'password'];

        const camposNoPermitidos = camposRecibidos.filter((campo) => !camposPermitidos.includes(campo));

        if (camposNoPermitidos.length > 0) {
            return res.status(400).json({
                mensaje: 'La solicitud contiene campos que no se pueden modificar.',
                campos: camposNoPermitidos
            });
        }

        if (camposRecibidos.length === 0) {
            return res.status(400).json({ mensaje: 'Se debe enviar al menos un campo para actualizar.' });
        }

        const usuario = await Usuario.findById(id);

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        for (const campo of CAMPOS_EDITABLES) {
            if (Object.hasOwn(req.body, campo)) {
                usuario[campo] = req.body[campo];
            }
        }

        if (Object.hasOwn(req.body, 'correo')) {
            if (
                typeof req.body.correo !== 'string' ||
                !req.body.correo.trim()
            ) {
                return res.status(400).json({ mensaje: 'El correo no puede estar vacío.' });
            }

            usuario.correo = req.body.correo.trim().toLowerCase();
        }

        if (Object.hasOwn(req.body, 'password')) {
            if (
                typeof req.body.password !== 'string' ||
                req.body.password.length === 0
            ) {
                return res.status(400).json({ mensaje: 'La contraseña no puede estar vacía.' });
            }

            usuario.passwordHash = await bcrypt.hash(req.body.password, 12);
        }

        await usuario.save();

        return res.status(200).json({
            mensaje: 'Usuario actualizado correctamente.',
            usuario: usuarioPublico(usuario)
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ mensaje: 'Ya existe otro usuario registrado con ese correo.' });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                mensaje: 'Los datos del usuario no son válidos.',
                errores: Object.values(error.errors).map((e) => e.message)
            });
        }

        if (error.name === 'MongoServerError' && error.code === 121) {
            return res.status(400).json({ mensaje: 'El documento no cumple las validaciones de MongoDB.' });
        }

        console.error('Error al actualizar usuario:', error);
        return res.status(500).json({ mensaje: 'Error interno al actualizar el usuario.' });
    }
};

// DELETE: eliminar un usuario.
const eliminarUsuario = async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({ mensaje: 'El ID del usuario no tiene un formato válido.' });
        }

        const usuario = await Usuario.findByIdAndDelete(id);

        if (!usuario) {
            return res.status(404).json({
                mensaje: 'Usuario no encontrado.'
            });
        }

        return res.status(200).json({
            mensaje: 'Usuario eliminado correctamente.',
            id: usuario._id
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        return res.status(500).json({ mensaje: 'Error interno al eliminar el usuario.' });
    }
};

export {
    crearUsuario,
    listarUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    eliminarUsuario
}
