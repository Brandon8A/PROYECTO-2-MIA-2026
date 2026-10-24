import mongoose from 'mongoose';
import Actividad from '../models/Actividad.js';

export const obtenerHistorialActividad = async (req, res) => {
    try {
        const {
            fechaInicio,
            fechaFin,
            usuarioId,
            tipoOperacion,
            recursoTipo
        } = req.query;

        const filtro = {};

        // Filtrar por fecha de la operación.
        if (fechaInicio || fechaFin) {
            const rango = {};

            if (fechaInicio) {
                const inicio = new Date(`${fechaInicio}T00:00:00.000Z`);

                if (Number.isNaN(inicio.getTime())) {
                    return res.status(400).json({
                        mensaje: 'La fecha inicial no es válida.'
                    });
                }

                rango.$gte = inicio;
            }

            if (fechaFin) {
                const fin = new Date(`${fechaFin}T00:00:00.000Z`);

                if (Number.isNaN(fin.getTime())) {
                    return res.status(400).json({
                        mensaje: 'La fecha final no es válida.'
                    });
                }

                fin.setUTCDate(fin.getUTCDate() + 1);
                rango.$lt = fin;
            }

            if (
                fechaInicio &&
                fechaFin &&
                fechaInicio > fechaFin
            ) {
                return res.status(400).json({
                    mensaje: 'La fecha inicial no puede ser posterior a la fecha final.'
                });
            }

            filtro.fechaHora = rango;
        }

        // Filtrar por usuario.
        if (usuarioId) {
            if (!mongoose.isValidObjectId(usuarioId)) {
                return res.status(400).json({
                    mensaje: 'El identificador del usuario no es válido.'
                });
            }

            filtro.usuarioId = usuarioId;
        }

        // Filtrar por operación.
        const operacionesPermitidas = [
            'crear',
            'consultar',
            'subir',
            'descargar',
            'renombrar',
            'mover',
            'eliminar',
            'restaurar',
            'eliminar_permanente',
            'compartir',
            'modificar_permiso',
            'revocar_comparticion',
            'iniciar_sesion',
            'cerrar_sesion'
        ];

        if (tipoOperacion) {
            if (!operacionesPermitidas.includes(tipoOperacion)) {
                return res.status(400).json({
                    mensaje: 'El tipo de operación no es válido.'
                });
            }

            filtro.tipoOperacion = tipoOperacion;
        }

        // Filtrar por tipo de recurso.
        const recursosPermitidos = [
            'usuario',
            'carpeta',
            'archivo',
            'comparticion',
            'sistema'
        ];

        if (recursoTipo) {
            if (!recursosPermitidos.includes(recursoTipo)) {
                return res.status(400).json({
                    mensaje: 'El tipo de recurso no es válido.'
                });
            }

            filtro.recursoTipo = recursoTipo;
        }

        const [total, registros] = await Promise.all([
            Actividad.countDocuments(filtro),

            Actividad.find(filtro)
                .sort({ fechaHora: -1, _id: -1 })
                .limit(500)
                .populate('usuarioId', 'nombres apellidos correo')
                .lean()
        ]);

        const actividades = registros.map((actividad) => {
            const usuario = actividad.usuarioId;

            return {
                id: actividad._id.toString(),
                usuario: usuario
                    ? {
                        id: usuario._id.toString(),
                        nombres: usuario.nombres,
                        apellidos: usuario.apellidos,
                        correo: usuario.correo
                    }
                    : null,
                tipoOperacion: actividad.tipoOperacion,
                recursoTipo: actividad.recursoTipo,
                recursoId: actividad.recursoId
                    ? actividad.recursoId.toString()
                    : null,
                fechaHora: actividad.fechaHora,
                detalles: actividad.detalles || 'Sin detalles adicionales'
            };
        });

        return res.status(200).json({
            total,
            cantidadDevuelta: actividades.length,
            limite: 500,
            actividades
        });
    } catch (error) {
        console.error('Error al consultar el historial:', error);

        return res.status(500).json({
            mensaje: 'No fue posible consultar el historial de actividad.'
        });
    }
};
