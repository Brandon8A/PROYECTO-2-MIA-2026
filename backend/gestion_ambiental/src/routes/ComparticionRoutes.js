
import express from 'express';

import { verificarToken } from '../middlewares/AuthMiddleware.js';

import {
    crearComparticion,
    listarComparticionesRecibidas,
    listarComparticionesEnviadas,
    revocarComparticion
} from '../controllers/ComparticionController.js';

const router = express.Router();

router.use(verificarToken);

router.post('/', crearComparticion);
router.get('/recibidas', listarComparticionesRecibidas);
router.get('/enviadas', listarComparticionesEnviadas);
router.patch('/:id/revocar', revocarComparticion);

export default router;
