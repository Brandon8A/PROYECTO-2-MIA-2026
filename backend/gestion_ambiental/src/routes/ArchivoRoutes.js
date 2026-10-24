import express from 'express'
import multer from 'multer'

import { verificarToken } from '../middlewares/AuthMiddleware.js';

import {
    cargarArchivo,
    listarArchivos,
    obtenerArchivo,
    descargarArchivo,
    actualizarArchivo,
    eliminarArchivo,
    listarArchivosPapelera,
    restaurarArchivo,
    eliminarArchivoPermanente,
    obtenerContenidoArchivo,
    actualizarContenidoArchivo
} from '../controllers/ArchivoController.js'

const router = express.Router()

const TAMANO_MAXIMO = 10 * 1024 * 1024

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: TAMANO_MAXIMO,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        const nombre = file.originalname.toLowerCase()

        if (!nombre.endsWith('.txt') && !nombre.endsWith('.md')) {
            return callback(new Error('Solo se permiten archivos .txt y .md.'))
        }
        callback(null, true)
    }
})

// Todas las rutas requieren autenticación JWT.
router.use(verificarToken)

// POST /api/archivos
router.post('/', (req, res, next) => {
    upload.single('archivo')(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
            return res.status(status).json({
                mensaje: error.code === 'LIMIT_FILE_SIZE'
                    ? 'El archivo supera el límite de 10 MB.'
                    : 'No se pudo recibir el archivo.',
                detalle: error.message
            })
        }

        if (error) {
            return res.status(400).json({ mensaje: error.message })
        }

        next()
    })
}, cargarArchivo)

router.get('/papelera', listarArchivosPapelera)

// Listar archivos activos
router.get('/', listarArchivos)

// Descargar contenido
router.get('/:id/descargar', descargarArchivo)

// Restaurar un archivo de la papelera
router.patch('/:id/restaurar', restaurarArchivo)

// Eliminar permanentemente un archivo de la papelera
router.delete('/:id/permanente', eliminarArchivoPermanente)

router.get('/:id/contenido', obtenerContenidoArchivo);

router.put('/:id/contenido', express.text({
        type: 'text/plain',
        limit: '10mb'
    }), actualizarContenidoArchivo)

// Consultar un archivo
router.get('/:id', obtenerArchivo)

// Actualizar nombre o carpeta
router.put('/:id', actualizarArchivo)

// Enviar a la papelera
router.delete('/:id', eliminarArchivo)

export default router