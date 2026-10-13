
require('dotenv').config();

const express = require('express');
const conectarDB = require('./config/DataBase');

const usuarioRoutes = require('./routes/UsuarioRoutes');
const carpetaRoutes = require('./routes/CarpetaRoutes')
const authRoutes = require('./routes/AuthRoutes')

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

// Ruta inicial.
app.get('/', (req, res) => {
    res.status(200).json({
        mensaje: 'API de Gestión Documental funcionando',
        estado: 'correcto'
    });
});

app.use('/api/usuarios', usuarioRoutes)// Rutas para usuarios.
app.use('/api/carpetas', carpetaRoutes)//Rutas para carpetas
app.use('/api/auth', authRoutes)//Rutas para autenticacion

// Respuesta para rutas inexistentes.
app.use((req, res) => {
    res.status(404).json({mensaje: 'Ruta no encontrada.'});
});

const iniciarServidor = async () => {
    try {
        await conectarDB();

        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
            console.log('CRUD de usuarios disponible en /api/usuarios');
        });
    } catch (error) {
        console.error('No se pudo iniciar el servidor.');
        process.exit(1);
    }
};

iniciarServidor();
