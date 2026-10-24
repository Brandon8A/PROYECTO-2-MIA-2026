import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import Actividad from '../models/Actividad.js';

const registrarActividad = async (usuarioId, tipoOperacion, detalles) => {
    try {
        await Actividad.create({
            usuarioId,
            tipoOperacion,
            recursoTipo: 'sistema',
            recursoId: null,
            fechaHora: new Date(),
            detalles
        })
    } catch (error) {
        console.error('No se pudo registrar la actividad de autenticación:', error.message)
    }
}

export const iniciarSesion = async (req, res) => {
    try {
        const { correo, password } = req.body;

        if (typeof correo !== 'string' || typeof password !== 'string' || !correo.trim() || !password) {
            return res.status(400).json({ mensaje: 'El correo y la contraseña son obligatorios.' })
        }

        if (!process.env.JWT_SECRET) {
            console.error('Falta configurar JWT SECRET.');
            return res.status(500).json({ mensaje: 'Error de configuración del servidor.' })
        }

        const usuario = await Usuario.findOne({ correo: correo.trim() }).select('+passwordHash')

        // No revelar si el correo existe.
        if (!usuario) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas.' })
        }

        if (usuario.estado !== 'activo') {
            return res.status(403).json({ mensaje: 'La cuenta se encuentra inactiva.' })
        }

        const passwordValida = await bcrypt.compare(password, usuario.passwordHash)

        if (!passwordValida) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas.' })
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
        )
        await registrarActividad(
            usuario._id,
            'iniciar_sesion',
            `El usuario ${usuario.correo} inició sesión correctamente.`
        )
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
        console.error('Error al iniciar sesión:', error)
        return res.status(500).json({ mensaje: 'Error interno al iniciar sesión.' })
    }
}

export const cerrarSesion = async (req, res) => {
    try {
        const usuarioId = req.usuario.id
        await registrarActividad(
            usuarioId,
            'cerrar_sesion',
            `El usuario ${req.usuario.correo ?? usuarioId} cerró sesión.`
        )
        return res.status(200).json({mensaje: 'Cierre de sesión registrado correctamente.'})
    } catch (error) {
        console.error('Error al cerrar sesión:', error)
        return res.status(500).json({mensaje: 'No se pudo registrar el cierre de sesión.'})
    }
}
