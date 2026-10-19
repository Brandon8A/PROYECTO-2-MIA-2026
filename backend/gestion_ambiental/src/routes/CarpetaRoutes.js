import express from 'express';
import { verificarToken } from '../middlewares/AuthMiddleware.js';

import {
  crearCarpeta,
  listarCarpetas,
  obtenerCarpeta,
  actualizarCarpeta,
  eliminarCarpeta
} from '../controllers/CarpetaController.js';

const router = express.Router();

// Todas las rutas requieren autenticación.
router.use(verificarToken);

router.post('/', crearCarpeta);
router.get('/', listarCarpetas);
router.get('/:id', obtenerCarpeta);
router.put('/:id', actualizarCarpeta);
router.delete('/:id', eliminarCarpeta);

export default router;
