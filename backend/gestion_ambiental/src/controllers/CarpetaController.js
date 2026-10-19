import mongoose from 'mongoose';
import Carpeta from '../models/Carpeta.js';

const esObjectIdValido = (id) => typeof id === 'string' && mongoose.isValidObjectId(id)

const obtenerPropietarioId = (req) => req.usuario.id

// POST /api/carpetas
const crearCarpeta = async (req, res) => {
    try {
        const { nombre } = req.body;
        const carpetaPadreId =
            req.body.carpetaPadreId === undefined
                ? null
                : req.body.carpetaPadreId;

        const propietarioId = obtenerPropietarioId(req)

        if (typeof nombre !== 'string' || !nombre.trim()) {
            return res.status(400).json({mensaje: 'El nombre de la carpeta es obligatorio.'})
        }

        if (carpetaPadreId !== null && !esObjectIdValido(carpetaPadreId)) {
            return res.status(400).json({mensaje: 'carpetaPadreId debe ser un ObjectId válido o null.'})
        }

        if (carpetaPadreId !== null) {
            const padre = await Carpeta.findOne({
                _id: carpetaPadreId,
                propietarioId,
                estado: 'activa'
            });

            if (!padre) {
                return res.status(404).json({mensaje: 'La carpeta padre no existe o no está disponible.'})
            }
        }

        const ahora = new Date();

        const carpeta = await Carpeta.create({
            nombre: nombre.trim(),
            propietarioId,
            carpetaPadreId,
            fechaCreacion: ahora,
            fechaModificacion: ahora,
            estado: 'activa'
        });

        return res.status(201).json({
            mensaje: 'Carpeta creada correctamente.',
            carpeta
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                mensaje: 'Los datos de la carpeta no son válidos.',
                errores: Object.values(error.errors).map((e) => e.message)
            });
        }

        if (error.name === 'MongoServerError' && error.code === 121) {
            return res.status(400).json({mensaje: 'La carpeta no cumple las validaciones de MongoDB.'})
        }

        console.error('Error al crear carpeta:', error);

        return res.status(500).json({mensaje: 'Error interno al crear la carpeta.'})
    }
};

// GET /api/carpetas
// GET /api/carpetas?carpetaPadreId
const listarCarpetas = async (req, res) => {
    try {
        const propietarioId = obtenerPropietarioId(req);
        const { carpetaPadreId } = req.query;

        let padreId = null;

        if (carpetaPadreId !== undefined && carpetaPadreId !== 'null') {
            if (!esObjectIdValido(carpetaPadreId)) {
                return res.status(400).json({mensaje: 'carpetaPadreId no es válido.'});
            }

            padreId = carpetaPadreId;

            const padre = await Carpeta.findOne({
                _id: padreId,
                propietarioId,
                estado: 'activa'
            }).select('_id');

            if (!padre) {
                return res.status(404).json({mensaje: 'La carpeta padre no existe o no está disponible.'})
            }
        }

        const carpetas = await Carpeta.find({
            propietarioId,
            carpetaPadreId: padreId,
            estado: 'activa'
        })
            .sort({ nombre: 1 })
            .lean();

        return res.status(200).json({
            total: carpetas.length,
            carpetas
        });
    } catch (error) {
        console.error('Error al listar carpetas:', error);
        return res.status(500).json({mensaje: 'Error interno al listar las carpetas.'})
    }
};

// GET /api/carpetas/:id
const obtenerCarpeta = async (req, res) => {
    try {
        const { id } = req.params;
        const propietarioId = obtenerPropietarioId(req);

        if (!esObjectIdValido(id)) {
            return res.status(400).json({mensaje: 'El identificador de la carpeta no es válido.'})
        }

        const carpeta = await Carpeta.findOne({
            _id: id,
            propietarioId,
            estado: 'activa'
        }).lean();

        if (!carpeta) {
            return res.status(404).json({mensaje: 'La carpeta no existe o no está disponible.'})
        }

        const subcarpetas = await Carpeta.find({
            propietarioId,
            carpetaPadreId: carpeta._id,
            estado: 'activa'
        })
            .sort({ nombre: 1 })
            .lean();

        return res.status(200).json({
            carpeta,
            subcarpetas
        });
    } catch (error) {
        console.error('Error al consultar carpeta:', error);

        return res.status(500).json({mensaje: 'Error interno al consultar la carpeta.'})
    }
};

// PUT /api/carpetas/:id
const actualizarCarpeta = async (req, res) => {
    try {
        const { id } = req.params;
        const propietarioId = obtenerPropietarioId(req);
        const camposPermitidos = ['nombre', 'carpetaPadreId'];

        if (!esObjectIdValido(id)) {
            return res.status(400).json({mensaje: 'El identificador de la carpeta no es valido.'})
        }

        const camposEnviados = Object.keys(req.body);

        if (camposEnviados.length === 0 ||
            camposEnviados.some((campo) => !camposPermitidos.includes(campo))) {
            return res.status(400).json({mensaje:'Solo puedes modificar nombre y carpetaPadreId.'})
        }

        const carpeta = await Carpeta.findOne({
            _id: id,
            propietarioId,
            estado: 'activa'
        });

        if (!carpeta) {
            return res.status(404).json({mensaje: 'La carpeta no existe o no está disponible.'})
        }

        if (Object.hasOwn(req.body, 'nombre')) {
            if (typeof req.body.nombre !== 'string' || !req.body.nombre.trim()) {
                return res.status(400).json({mensaje: 'El nombre no puede estar vacío.'})
            }
            carpeta.nombre = req.body.nombre.trim();
        }

        if (Object.hasOwn(req.body, 'carpetaPadreId')) {
            const nuevoPadreId = req.body.carpetaPadreId;

            if (nuevoPadreId !== null && !esObjectIdValido(nuevoPadreId)) {
                return res.status(400).json({mensaje: 'carpetaPadreId debe ser un ObjectId válido o null.'})
            }

            if (nuevoPadreId !== null) {
                // Impide mover la carpeta dentro de sí misma
                if (nuevoPadreId === id) {
                    return res.status(400).json({mensaje: 'Una carpeta no puede ser su propia carpeta padre.'})
                }

                const padre = await Carpeta.findOne({
                    _id: nuevoPadreId,
                    propietarioId,
                    estado: 'activa'
                }).select('_id');

                if (!padre) {
                    return res.status(404).json({mensaje: 'La carpeta destino no existe.'})
                }

                // Recorre los antecesores del destino para impedir ciclos.
                const visitados = new Set();
                let antecesorId = nuevoPadreId;

                while (antecesorId !== null) {
                    const antecesorTexto = antecesorId.toString();

                    if (antecesorTexto === id) {
                        return res.status(400).json({mensaje:'No puedes mover una carpeta dentro de una de sus descendientes.'})
                    }

                    if (visitados.has(antecesorTexto)) {
                        return res.status(409).json({mensaje:'Se detectó una inconsistencia en la jerarquía de carpetas.'})
                    }

                    visitados.add(antecesorTexto);

                    const antecesor = await Carpeta.findOne({
                        _id: antecesorId,
                        propietarioId
                    }).select('_id carpetaPadreId');

                    if (!antecesor) {
                        return res.status(409).json({mensaje:'La jerarquía del destino contiene una referencia inválida.'})
                    }
                    antecesorId = antecesor.carpetaPadreId;
                }
            }
            carpeta.carpetaPadreId = nuevoPadreId;
        }

        carpeta.fechaModificacion = new Date();
        await carpeta.save();

        return res.status(200).json({
            mensaje: 'Carpeta actualizada correctamente.',
            carpeta
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                mensaje: 'Los datos de la carpeta no son válidos.',
                errores: Object.values(error.errors).map((e) => e.message)
            });
        }

        if (error.name === 'MongoServerError' && error.code === 121) {
            return res.status(400).json({mensaje: 'La carpeta no cumple las validaciones de MongoDB.'})
        }
        console.error('Error al actualizar carpeta:', error)
        return res.status(500).json({mensaje: 'Error interno al actualizar la carpeta.'})
    }
};

// DELETE /api/carpetas/:id
// Envía la carpeta y sus descendientes activos a la papelera.
const eliminarCarpeta = async (req, res) => {
    try {
        const { id } = req.params;
        const propietarioId = obtenerPropietarioId(req);

        if (!esObjectIdValido(id)) {
            return res.status(400).json({mensaje: 'El identificador de la carpeta no es válido.'});
        }

        const carpeta = await Carpeta.findOne({
            _id: id,
            propietarioId,
            estado: 'activa'
        }).select('_id');

        if (!carpeta) {
            return res.status(404).json({mensaje: 'La carpeta no existe o no está disponible.'})
        }

        // Se visitan los descendientes sin filtrar por estado.
        // Tambien se recorren ramas que ya contengan carpetas
        // en la papelera, sin reactivarlas.
        const idsVisitados = new Set([id]);
        const pendientes = [id];

        while (pendientes.length > 0) {
            const padreActual = pendientes.pop();

            const hijas = await Carpeta.find({
                propietarioId,
                carpetaPadreId: padreActual
            }).select('_id');

            for (const hija of hijas) {
                const hijaId = hija._id.toString();

                if (!idsVisitados.has(hijaId)) {
                    idsVisitados.add(hijaId);
                    pendientes.push(hijaId);
                }
            }
        }

        const ids = [...idsVisitados].map(
            (valor) => new mongoose.Types.ObjectId(valor)
        );

        const resultado = await Carpeta.updateMany(
            {
                _id: { $in: ids },
                propietarioId,
                estado: 'activa'
            },
            {
                $set: {
                    estado: 'papelera',
                    fechaModificacion: new Date()
                }
            },
            {
                runValidators: true
            }
        );

        return res.status(200).json({
            mensaje:'La carpeta y sus descendientes activos se enviaron a la papelera.',
            carpetasEnviadas: resultado.modifiedCount
        });
    } catch (error) {
        console.error('Error al enviar carpeta a la papelera:', error);
        return res.status(500).json({mensaje: 'Error interno al enviar la carpeta a la papelera.'})
    }
}

export {
    crearCarpeta,
    listarCarpetas,
    obtenerCarpeta,
    actualizarCarpeta,
    eliminarCarpeta
};