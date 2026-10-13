
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const iniciarSesion = async (req, res) => {
    try {
        const { correo, password } = req.body;

        if (
            typeof correo !== 'string' ||
            typeof password !== 'string' ||
            !correo.trim() ||
            !password
        ) {
            return res.status(400).json({mensaje: 'El correo y la contraseña son obligatorios.'});
        }

        if (!process.env.JWT_SECRET) {
            console.error('Falta configurar JWT_SECRET.');
            return res.status(500).json({mensaje: 'Error de configuración del servidor.'});
        }

        const usuario = await Usuario.findOne({
            correo: correo.trim()
        }).select('+passwordHash');

        // Se utiliza el mismo mensaje para no revelar si el correo existe.
        if (!usuario) {
            return res.status(401).json({mensaje: 'Credenciales incorrectas.'});
        }

        if (usuario.estado !== 'activo') {
            return res.status(403).json({mensaje: 'La cuenta se encuentra inactiva.'});
        }

        const passwordValida = await bcrypt.compare(
            password,
            usuario.passwordHash
        );

        if (!passwordValida) {
            return res.status(401).json({mensaje: 'Credenciales incorrectas.'});
        }

        const token = jwt.sign(
            {
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                subject: usuario._id.toString(),
                expiresIn: process.env.JWT_EXPIRES_IN || '2h'
            }
        );

        return res.status(200).json({
            mensaje: 'Inicio de sesión correcto.',
            token,
            usuario: {
                id: usuario._id,
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);

        return res.status(500).json({
            mensaje: 'Error interno al iniciar sesión.'
        });
    }
};

module.exports = { iniciarSesion };
