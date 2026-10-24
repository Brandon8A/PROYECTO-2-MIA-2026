import 'dotenv/config'

import express from 'express'
import cors from 'cors'

import conectarDB from './config/DataBase.js'
import usuarioRoutes from './routes/UsuarioRoutes.js'
import carpetaRoutes from './routes/CarpetaRoutes.js'
import authRoutes from './routes/AuthRoutes.js'
import archivoRoutes from './routes/ArchivoRoutes.js'
import comparticionRoutes from './routes/ComparticionRoutes.js'
import reporteRoutes from './routes/ReporteRoutes.js'
import reporteActividadRoutes from './routes/ReporteActividadRoutes.js'

const app = express();
const PORT = process.env.PORT || 3000

app.use(cors({ origin: 'http://localhost:4200' }))

app.use(express.json({ limit: '1mb' }))

// Ruta inicial.
app.get('/', (req, res) => {
    res.status(200).json({ mensaje: 'API de Gestión Documental funcionando', estado: 'correcto' })
})

// Rutas de la API
app.use('/api/usuarios', usuarioRoutes)
app.use('/api/carpetas', carpetaRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/archivos', archivoRoutes)
app.use('/api/comparticiones', comparticionRoutes)
app.use('/api/reportes', reporteRoutes)
app.use('/api/reportes/actividad', reporteActividadRoutes)

// Respuesta para rutas inexistentes.
app.use((req, res) => { res.status(404).json({ mensaje: 'Ruta no encontrada.' }) })


const iniciarServidor = async () => {
    try {
        // Esperar a que MongoDB establezca la conexión.
        await conectarDB()

        // Iniciar Express únicamente cuando la conexión esté lista.
        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`)
            console.log('CRUD de usuarios disponible en /api/usuarios')
        })
    } catch (error) {
        console.error('No se pudo iniciar el servidor:', error)
        process.exit(1)
    }
}

iniciarServidor()