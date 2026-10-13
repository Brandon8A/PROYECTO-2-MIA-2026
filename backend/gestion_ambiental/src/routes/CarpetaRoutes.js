
const express = require('express');

const { verificarToken } = require('../middlewares/AuthMiddleware');

const {
  crearCarpeta,
  listarCarpetas,
  obtenerCarpeta,
  actualizarCarpeta,
  eliminarCarpeta
} = require('../controllers/CarpetaController');

const router = express.Router();

// Todas las rutas requieren autenticación
//Con esto todas las rutas de este archivo quedan protegidas
router.use(verificarToken);

router.post('/', crearCarpeta);
router.get('/', listarCarpetas);
router.get('/:id', obtenerCarpeta);
router.put('/:id', actualizarCarpeta);
router.delete('/:id', eliminarCarpeta);

module.exports = router;
