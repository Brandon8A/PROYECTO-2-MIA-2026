import 'dotenv/config';

import express from 'express';
import cors from 'cors';

import conectarDB from './config/DataBase.js';
import usuarioRoutes from './routes/UsuarioRoutes.js';
import carpetaRoutes from './routes/CarpetaRoutes.js';
import authRoutes from './routes/AuthRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://localhost:4200'
}));

app.use(express.json({ limit: '1mb' }));

// Ruta inicial.
app.get('/', (req, res) => {
    res.status(200).json({
        mensaje: 'API de Gestión Documental funcionando',
        estado: 'correcto'
    });
});

// Rutas de la API.
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/carpetas', carpetaRoutes);
app.use('/api/auth', authRoutes);

// Respuesta para rutas inexistentes.
app.use((req, res) => {
    res.status(404).json({
        mensaje: 'Ruta no encontrada.'
    });
});

const iniciarServidor = async () => {
    try {
        await conectarDB();

        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
            console.log('CRUD de usuarios disponible en /api/usuarios');
        });
    } catch (error) {
        console.error('No se pudo iniciar el servidor:', error);
        process.exit(1);
    }
};

iniciarServidor();
