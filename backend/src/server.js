const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para interpretar solicitudes JSON
app.use(express.json());

// Ruta inicial para comprobar que el servidor funciona
app.get('/', (req, res) => {
    res.json({
        mensaje: 'Backend del Proyecto 2 MIA 2026 funcionando correctamente'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
