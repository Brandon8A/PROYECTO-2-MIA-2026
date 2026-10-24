import express from 'express'

import { verificarToken } from '../middlewares/AuthMiddleware.js'
import { AutorizarRoles } from '../middlewares/AutorizarRoles.js'

import {
    crearUsuario,
    listarUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    cambiarEstadoUsuario,
    eliminarUsuario
} from '../controllers/UsuarioController.js'

const router = express.Router()

// Todas las operaciones de gestión requieren JWT y rol administrador.
router.use(verificarToken);
router.use(AutorizarRoles('admin'))

// POST /api/usuarios
router.post('/', crearUsuario)

// GET /api/usuarios
router.get('/', listarUsuarios)

// GET /api/usuarios/:id
router.get('/:id', obtenerUsuario)

// PUT /api/usuarios/:id
router.put('/:id', actualizarUsuario)

// PATCH /api/usuarios/:id/estado
router.patch('/:id/estado', cambiarEstadoUsuario)

// DELETE /api/usuarios/:id
router.delete('/:id', eliminarUsuario)

export default router