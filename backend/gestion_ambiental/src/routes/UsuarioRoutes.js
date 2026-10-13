
const express = require('express');

const {
  crearUsuario,
  listarUsuarios,
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario
} = require('../controllers/UsuarioController');

const router = express.Router();

// POST /api/usuarios
router.post('/', crearUsuario);

// GET /api/usuarios
router.get('/', listarUsuarios);

// GET /api/usuarios/:id
router.get('/:id', obtenerUsuario);

// PUT /api/usuarios/:id
router.put('/:id', actualizarUsuario);

// DELETE /api/usuarios/:id
router.delete('/:id', eliminarUsuario);

module.exports = router;