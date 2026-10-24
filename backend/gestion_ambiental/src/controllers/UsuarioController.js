import {
    crearUsuario as crearUsuarioServicio,
    listarUsuarios as listarUsuariosServicio,
    obtenerUsuario as obtenerUsuarioServicio,
    actualizarUsuario as actualizarUsuarioServicio,
    cambiarEstadoUsuario as cambiarEstadoUsuarioServicio,
    eliminarUsuario as eliminarUsuarioServicio,
    ErrorServicio
} from '../services/UsuarioService.js';

const responderError = (res, error, operacion) => {
    if (error instanceof ErrorServicio) {
        return res.status(error.codigo).json({ mensaje: error.message, ...(error.detalles ? error.detalles : {}) })
    }

    if (error.code === 11000) {
        return res.status(409).json({ mensaje: 'Ya existe un usuario registrado con ese correo.' })
    }

    if (error.name === 'ValidationError') {
        return res.status(400).json({
            mensaje: 'Los datos del usuario no son válidos.',
            errores: Object.values(error.errors).map(e => e.message)
        })
    }

    if (error.name === 'MongoServerError' && error.code === 121) {
        return res.status(400).json({ mensaje: 'El documento no cumple las validaciones de MongoDB.' })
    }

    console.error(`Error al ${operacion}:`, error)

    return res.status(500).json({ mensaje: `Error interno al ${operacion}.` })
}

// POST /api/usuarios
const crearUsuario = async (req, res) => {
    try {
        const usuario = await crearUsuarioServicio(req.body)
        return res.status(201).json({ mensaje: 'Usuario creado correctamente.', usuario })
    } catch (error) {
        return responderError(res, error, 'crear el usuario')
    }
}

// GET /api/usuarios
const listarUsuarios = async (req, res) => {
    try {
        const resultado = await listarUsuariosServicio()
        return res.status(200).json(resultado)
    } catch (error) {
        return responderError(res, error, 'consultar los usuarios')
    }
}

// GET /api/usuarios/:id
const obtenerUsuario = async (req, res) => {
    try {
        const usuario = await obtenerUsuarioServicio(req.params.id)
        return res.status(200).json({ usuario })
    } catch (error) {
        return responderError(res, error, 'consultar el usuario')
    }
}

// PUT /api/usuarios/:id
const actualizarUsuario = async (req, res) => {
    try {
        const usuario = await actualizarUsuarioServicio(req.params.id, req.body, req.usuario?.id)

        return res.status(200).json({ mensaje: 'Usuario actualizado correctamente.', usuario })
    } catch (error) {
        return responderError(res, error, 'actualizar el usuario')
    }
}

// PATCH /api/usuarios/:id/estado
const cambiarEstadoUsuario = async (req, res) => {
    try {
        const usuario = await cambiarEstadoUsuarioServicio(req.params.id, req.body.estado, req.usuario?.id)

        return res.status(200).json({
            mensaje: `Usuario ${usuario.estado === 'activo' ? 'activado' : 'inactivado'} correctamente.`,
            usuario
        })
    } catch (error) {
        return responderError(res, error, 'cambiar el estado del usuario')
    }
}

// DELETE /api/usuarios/:id
const eliminarUsuario = async (req, res) => {
    try {
        const resultado = await eliminarUsuarioServicio(req.params.id, req.usuario?.id)

        return res.status(200).json({ mensaje: 'Usuario eliminado correctamente.', ...resultado })
    } catch (error) {
        return responderError(res, error, 'eliminar el usuario')
    }
}

export {
    crearUsuario,
    listarUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario,
    eliminarUsuario
}