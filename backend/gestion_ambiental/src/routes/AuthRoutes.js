import express from 'express'
import { iniciarSesion } from '../controllers/AuthController.js'
import { cerrarSesion } from '../controllers/AuthController.js'
import { verificarToken } from '../middlewares/AuthMiddleware.js'

const router = express.Router()

router.post('/login', iniciarSesion)
router.post('/logout', verificarToken, cerrarSesion)

export default router;
