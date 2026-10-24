import express from 'express';
import { verificarToken } from '../middlewares/AuthMiddleware.js';
import { AutorizarRoles } from '../middlewares/AutorizarRoles.js';
import {
  obtenerHistorialActividad
} from '../controllers/ReporteActividadController.js';

const router = express.Router();

router.use(verificarToken);
router.use(AutorizarRoles('admin'));

router.get('/', obtenerHistorialActividad);

export default router;
