
import express from 'express';

import { verificarToken } from '../middlewares/AuthMiddleware.js';
import { AutorizarRoles } from '../middlewares/AutorizarRoles.js';

import {
    obtenerReporteArchivos
} from '../controllers/ReporteController.js';

const router = express.Router();

// Solo los administradores pueden consultar los reportes.
router.use(verificarToken);
router.use(AutorizarRoles('admin'));

router.get('/archivos', obtenerReporteArchivos);

export default router;
