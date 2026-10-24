
import mongoose from 'mongoose';

import Comparticion from '../models/Comparticion.js';
import Usuario from '../models/Usuario.js';
import Archivo from '../models/Archivo.js';
import Carpeta from '../models/Carpeta.js';

const obtenerPropietarioId = (req) => req.usuario.id;

// POST /api/comparticiones
export const crearComparticion = async (req, res) => {
    try {
        const propietarioId = obtenerPropietarioId(req);

        const correo = String(req.body.correo ?? '')
            .trim()
            .toLowerCase();

        const { tipoRecurso, tipoPermiso, recursoId } = req.body;

        if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
            return res.status(400).json({
                mensaje: 'Debes proporcionar un correo válido.'
            });
        }

        if (!['archivo', 'carpeta'].includes(tipoRecurso)) {
            return res.status(400).json({
                mensaje: 'El tipo de recurso debe ser archivo o carpeta.'
            });
        }

        if (!['lectura', 'edicion'].includes(tipoPermiso)) {
            return res.status(400).json({
                mensaje: 'El permiso debe ser lectura o edicion.'
            });
        }

        if (!mongoose.isValidObjectId(recursoId)) {
            return res.status(400).json({
                mensaje: 'El identificador del recurso no es válido.'
            });
        }

        const propietario = await Usuario.findById(propietarioId)
            .select('_id correo estado');

        if (!propietario || propietario.estado !== 'activo') {
            return res.status(401).json({
                mensaje: 'El usuario autenticado no está activo.'
            });
        }

        const receptor = await Usuario.findOne({ correo })
            .select('_id correo nombres apellidos estado');

        if (!receptor || receptor.estado !== 'activo') {
            return res.status(404).json({
                mensaje: 'No existe un usuario activo con ese correo.'
            });
        }

        if (receptor._id.equals(propietario._id)) {
            return res.status(400).json({
                mensaje: 'No puedes compartir un recurso contigo mismo.'
            });
        }

        let recurso;

        if (tipoRecurso === 'archivo') {
            recurso = await Archivo.findOne({
                _id: recursoId,
                propietarioId,
                estado: 'activo'
            }).select('_id nombre');

        } else {
            recurso = await Carpeta.findOne({
                _id: recursoId,
                propietarioId,
                estado: 'activa'
            }).select('_id nombre');
        }

        if (!recurso) {
            return res.status(404).json({
                mensaje:
                    'No se encontró el recurso activo o no te pertenece.'
            });
        }

        const camposRecurso = tipoRecurso === 'archivo'
            ? { archivoId: recurso._id, carpetaId: null }
            : { archivoId: null, carpetaId: recurso._id };

        const filtro = {
            propietarioId: propietario._id,
            usuarioReceptorId: receptor._id,
            tipoRecurso,
            ...camposRecurso,
            estado: 'activa'
        };

        // Si ya existe una compartición activa, actualizamos el permiso.
        const existente = await Comparticion.findOne(filtro);

        if (existente) {
            existente.tipoPermiso = tipoPermiso;
            existente.fechaModificacion = new Date();

            await existente.save();

            return res.status(200).json({
                mensaje: 'Se actualizó el permiso de la compartición.',
                comparticion: existente
            });
        }

        const comparticion = await Comparticion.create({
            propietarioId: propietario._id,
            usuarioReceptorId: receptor._id,
            tipoRecurso,
            ...camposRecurso,
            tipoPermiso
        });

        return res.status(201).json({
            mensaje: 'Recurso compartido correctamente.',
            comparticion: {
                _id: comparticion._id,
                propietarioId: comparticion.propietarioId,
                usuarioReceptorId: comparticion.usuarioReceptorId,
                tipoRecurso: comparticion.tipoRecurso,
                archivoId: comparticion.archivoId,
                carpetaId: comparticion.carpetaId,
                tipoPermiso: comparticion.tipoPermiso,
                fechaComparticion: comparticion.fechaComparticion,
                estado: comparticion.estado
            }
        });

    } catch (error) {
        console.error('Error al compartir recurso:', error);

        return res.status(500).json({
            mensaje: 'No se pudo compartir el recurso.'
        });
    }
};

// GET /api/comparticiones/recibidas
export const listarComparticionesRecibidas = async (req, res) => {
    try {
        const comparticiones = await Comparticion.find({
            usuarioReceptorId: obtenerPropietarioId(req),
            estado: 'activa'
        })
            .populate('propietarioId', 'nombres apellidos correo')
            .populate('archivoId', 'nombre extension tipoMime tamano estado')
            .populate('carpetaId', 'nombre carpetaPadreId estado')
            .sort({ fechaComparticion: -1 })
            .lean();

        return res.status(200).json({
            total: comparticiones.length,
            comparticiones
        });
    } catch (error) {
        console.error('Error al listar comparticiones recibidas:', error);

        return res.status(500).json({
            mensaje: 'No se pudieron consultar los recursos compartidos contigo.'
        });
    }
};

// GET /api/comparticiones/enviadas
export const listarComparticionesEnviadas = async (req, res) => {
    try {
        const comparticiones = await Comparticion.find({
            propietarioId: obtenerPropietarioId(req),
            estado: 'activa'
        })
            .populate('usuarioReceptorId', 'nombres apellidos correo')
            .populate('archivoId', 'nombre extension estado')
            .populate('carpetaId', 'nombre estado')
            .sort({ fechaComparticion: -1 })
            .lean();

        return res.status(200).json({
            total: comparticiones.length,
            comparticiones
        });
    } catch (error) {
        console.error('Error al listar comparticiones enviadas:', error);

        return res.status(500).json({
            mensaje: 'No se pudieron consultar las comparticiones enviadas.'
        });
    }
};

// PATCH /api/comparticiones/:id/revocar
export const revocarComparticion = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                mensaje: 'El identificador de la compartición no es válido.'
            });
        }

        const comparticion = await Comparticion.findOneAndUpdate(
            {
                _id: id,
                propietarioId: obtenerPropietarioId(req),
                estado: 'activa'
            },
            {
                $set: {
                    estado: 'revocada',
                    fechaModificacion: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        if (!comparticion) {
            return res.status(404).json({
                mensaje: 'No se encontró una compartición activa que te pertenezca.'
            });
        }

        return res.status(200).json({
            mensaje: 'Se revocó el acceso al recurso.',
            comparticion
        });
    } catch (error) {
        console.error('Error al revocar compartición:', error);

        return res.status(500).json({
            mensaje: 'No se pudo revocar la compartición.'
        });
    }
};
