
import express from 'express';
import { AutorizarRoles } from '../middlewares/AutorizarRoles.js';
import { verificarToken } from '../middlewares/AuthMiddleware.js';

import {
  crearUsuario,
  listarUsuarios,
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario
} from '../controllers/UsuarioController.js';

const router = express.Router();

// POST /api/usuarios
// Registro de usuarios
router.post('/', crearUsuario);

// Todas las siguientes rutas requieren autenticación
// y el rol de administrador.
router.use(verificarToken);
router.use(AutorizarRoles('admin'));

// GET /api/usuarios
router.get('/', listarUsuarios);

// GET /api/usuarios/:id
router.get('/:id', obtenerUsuario);

// PUT /api/usuarios/:id
router.put('/:id', actualizarUsuario);

// DELETE /api/usuarios/:id
router.delete('/:id', eliminarUsuario);

export default router;
