
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';

export const verificarToken = async (req, res, next) => {
  try {
    const autorizacion = req.headers.authorization;

    if (!autorizacion || !autorizacion.startsWith('Bearer ')) {
      return res.status(401).json({
        mensaje: 'Debes iniciar sesión para acceder a este recurso.'
      });
    }

    const token = autorizacion.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        mensaje: 'Token no proporcionado.'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('Falta configurar JWT_SECRET.');

      return res.status(500).json({
        mensaje: 'Error de configuración del servidor.'
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const usuario = await Usuario.findById(payload.sub)
      .select('_id nombres apellidos correo rol estado');

    if (!usuario || usuario.estado !== 'activo') {
      return res.status(401).json({
        mensaje: 'La sesión no es válida o la cuenta está inactiva.'
      });
    }

    // La identidad proviene de la base de datos.
    req.usuario = {
      id: usuario._id.toString(),
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      rol: usuario.rol
    };

    return next();

  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        mensaje: 'El token es inválido o ha expirado.'
      });
    }

    console.error('Error al verificar el token:', error);

    return res.status(500).json({
      mensaje: 'Error al verificar la autenticación.'
    });
  }
};
