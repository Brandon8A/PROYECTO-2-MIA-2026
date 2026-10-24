import mongoose from 'mongoose'
import Carpeta from '../models/Carpeta.js'
import { GridFSBucket } from 'mongodb'

import Archivo from '../models/Archivo.js'
import Comparticion from '../models/Comparticion.js'
import Usuario from '../models/Usuario.js'
import Actividad from '../models/Actividad.js'


const esObjectIdValido = (id) => typeof id === 'string' && mongoose.isValidObjectId(id)

const obtenerPropietarioId = (req) => req.usuario.id

const registrarActividad = async (usuarioId, tipoOperacion, recursoTipo, recursoId, detalles) => {
    try {
        await Actividad.create({
            usuarioId,
            tipoOperacion,
            recursoTipo,
            recursoId: recursoId ?? null,
            fechaHora: new Date(),
            detalles
        })
    } catch (error) {
        console.error('No se pudo registrar la actividad de carpeta:', error.message)
    }
}

// POST /api/carpetas
const crearCarpeta = async (req, res) => {
    try {
        const { nombre } = req.body;
        const carpetaPadreId = req.body.carpetaPadreId === undefined ? null : req.body.carpetaPadreId
        const propietarioId = obtenerPropietarioId(req)

        if (typeof nombre !== 'string' || !nombre.trim()) {
            return res.status(400).json({ mensaje: 'El nombre de la carpeta es obligatorio.' })
        }

        if (carpetaPadreId !== null && !esObjectIdValido(carpetaPadreId)) {
            return res.status(400).json({ mensaje: 'carpetaPadreId debe ser un ObjectId válido o null.' })
        }

        if (carpetaPadreId !== null) {
            const padre = await Carpeta.findOne({ _id: carpetaPadreId, propietarioId, estado: 'activa' })

            if (!padre) {
                return res.status(404).json({ mensaje: 'La carpeta padre no existe o no está disponible.' })
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
        })

        await registrarActividad(
            propietarioId,
            'crear',
            'carpeta',
            carpeta._id,
            `Se creó la carpeta ${carpeta.nombre}.`
        )
        return res.status(201).json({ mensaje: 'Carpeta creada correctamente.', carpeta })
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                mensaje: 'Los datos de la carpeta no son válidos.',
                errores: Object.values(error.errors).map((e) => e.message)
            });
        }

        if (error.name === 'MongoServerError' && error.code === 121) {
            return res.status(400).json({ mensaje: 'La carpeta no cumple las validaciones de MongoDB.' })
        }

        console.error('Error al crear carpeta:', error);

        return res.status(500).json({ mensaje: 'Error interno al crear la carpeta.' })
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
                return res.status(400).json({ mensaje: 'carpetaPadreId no es válido.' });
            }

            padreId = carpetaPadreId;

            const padre = await Carpeta.findOne({
                _id: padreId,
                propietarioId,
                estado: 'activa'
            }).select('_id');

            if (!padre) {
                return res.status(404).json({ mensaje: 'La carpeta padre no existe o no está disponible.' })
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
        return res.status(500).json({ mensaje: 'Error interno al listar las carpetas.' })
    }
};

// GET /api/carpetas/:id
const obtenerCarpeta = async (req, res) => {
    try {
        const { id } = req.params;
        const propietarioId = obtenerPropietarioId(req);
        if (!esObjectIdValido(id)) {
            return res.status(400).json({ mensaje: 'El identificador de la carpeta no es válido.' })
        }

        const carpeta = await Carpeta.findOne({
            _id: id,
            propietarioId,
            estado: 'activa'
        }).lean();

        if (!carpeta) {
            return res.status(404).json({ mensaje: 'La carpeta no existe o no está disponible.' })
        }

        await registrarActividad(
            propietarioId,
            'consultar',
            'carpeta',
            carpeta._id,
            `Se consultó la carpeta ${carpeta.nombre}.`
        )

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

        return res.status(500).json({ mensaje: 'Error interno al consultar la carpeta.' })
    }
};

// PUT /api/carpetas/:id
const actualizarCarpeta = async (req, res) => {
    try {
        const { id } = req.params;
        const propietarioId = obtenerPropietarioId(req);
        const camposPermitidos = ['nombre', 'carpetaPadreId'];

        if (!esObjectIdValido(id)) {
            return res.status(400).json({ mensaje: 'El identificador de la carpeta no es valido.' })
        }

        const camposEnviados = Object.keys(req.body);

        if (camposEnviados.length === 0 ||
            camposEnviados.some((campo) => !camposPermitidos.includes(campo))) {
            return res.status(400).json({ mensaje: 'Solo puedes modificar nombre y carpetaPadreId.' })
        }

        const carpeta = await Carpeta.findOne({
            _id: id,
            propietarioId,
            estado: 'activa'
        });

        if (!carpeta) {
            return res.status(404).json({ mensaje: 'La carpeta no existe o no está disponible.' })
        }

        const nombreAnterior = carpeta.nombre;
        const padreAnteriorId = carpeta.carpetaPadreId ? carpeta.carpetaPadreId.toString() : null

        if (Object.hasOwn(req.body, 'nombre')) {
            if (typeof req.body.nombre !== 'string' || !req.body.nombre.trim()) {
                return res.status(400).json({ mensaje: 'El nombre no puede estar vacío.' })
            }
            carpeta.nombre = req.body.nombre.trim();
        }

        if (Object.hasOwn(req.body, 'carpetaPadreId')) {
            const nuevoPadreId = req.body.carpetaPadreId;

            if (nuevoPadreId !== null && !esObjectIdValido(nuevoPadreId)) {
                return res.status(400).json({ mensaje: 'carpetaPadreId debe ser un ObjectId válido o null.' })
            }

            if (nuevoPadreId !== null) {
                // Impide mover la carpeta dentro de sí misma
                if (nuevoPadreId === id) {
                    return res.status(400).json({ mensaje: 'Una carpeta no puede ser su propia carpeta padre.' })
                }

                const padre = await Carpeta.findOne({
                    _id: nuevoPadreId,
                    propietarioId,
                    estado: 'activa'
                }).select('_id');

                if (!padre) {
                    return res.status(404).json({ mensaje: 'La carpeta destino no existe.' })
                }

                // Recorre los antecesores del destino para impedir ciclos.
                const visitados = new Set();
                let antecesorId = nuevoPadreId;

                while (antecesorId !== null) {
                    const antecesorTexto = antecesorId.toString();

                    if (antecesorTexto === id) {
                        return res.status(400).json({ mensaje: 'No puedes mover una carpeta dentro de una de sus descendientes.' })
                    }

                    if (visitados.has(antecesorTexto)) {
                        return res.status(409).json({ mensaje: 'Se detectó una inconsistencia en la jerarquía de carpetas.' })
                    }

                    visitados.add(antecesorTexto);

                    const antecesor = await Carpeta.findOne({
                        _id: antecesorId,
                        propietarioId
                    }).select('_id carpetaPadreId');

                    if (!antecesor) {
                        return res.status(409).json({ mensaje: 'La jerarquía del destino contiene una referencia inválida.' })
                    }
                    antecesorId = antecesor.carpetaPadreId;
                }
            }
            carpeta.carpetaPadreId = nuevoPadreId;
        }

        carpeta.fechaModificacion = new Date();
        await carpeta.save();

        const padreActualId = carpeta.carpetaPadreId
            ? carpeta.carpetaPadreId.toString()
            : null

        const cambioNombre = nombreAnterior !== carpeta.nombre;
        const cambioUbicacion = padreAnteriorId !== padreActualId;

        if (cambioNombre || cambioUbicacion) {
            let tipoOperacion
            let detalles

            if (cambioNombre && cambioUbicacion) {
                tipoOperacion = 'mover'
                detalles = `Se renombró la carpeta ${nombreAnterior} a ${carpeta.nombre} y se cambió su ubicación.`;
            } else if (cambioNombre) {
                tipoOperacion = 'renombrar'
                detalles = `Se renombró la carpeta ${nombreAnterior} a ${carpeta.nombre}.`
            } else {
                tipoOperacion = 'mover'
                detalles = `Se movió la carpeta ${carpeta.nombre} a otra ubicación.`
            }

            await registrarActividad(
                propietarioId,
                tipoOperacion,
                'carpeta',
                carpeta._id,
                detalles
            );
        }
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
            return res.status(400).json({ mensaje: 'La carpeta no cumple las validaciones de MongoDB.' })
        }
        console.error('Error al actualizar carpeta:', error)
        return res.status(500).json({ mensaje: 'Error interno al actualizar la carpeta.' })
    }
};

// DELETE /api/carpetas/:id
// Envía la carpeta y sus descendientes activos a la papelera.
const eliminarCarpeta = async (req, res) => {
    try {
        const { id } = req.params;
        const propietarioId = obtenerPropietarioId(req);

        if (!esObjectIdValido(id)) {
            return res.status(400).json({ mensaje: 'El identificador de la carpeta no es válido.' });
        }

        const carpeta = await Carpeta.findOne({
            _id: id,
            propietarioId,
            estado: 'activa'
        }).select('_id');

        if (!carpeta) {
            return res.status(404).json({ mensaje: 'La carpeta no existe o no está disponible.' })
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

        await registrarActividad(
            propietarioId,
            'eliminar',
            'carpeta',
            carpeta._id,
            `Se envió a la papelera la carpeta y sus descendientes. Carpetas afectadas: ${resultado.modifiedCount}.`
        )
        return res.status(200).json({
            mensaje: 'La carpeta y sus descendientes activos se enviaron a la papelera.',
            carpetasEnviadas: resultado.modifiedCount
        });
    } catch (error) {
        console.error('Error al enviar carpeta a la papelera:', error);
        return res.status(500).json({ mensaje: 'Error interno al enviar la carpeta a la papelera.' })
    }
}

export const listarCarpetasPapelera = async (req, res) => {
    try {
        const carpetas = await Carpeta.find({
            propietarioId: req.usuario.id,
            estado: 'papelera'
        }).sort({ fechaModificacion: -1 })

        return res.status(200).json({ total: carpetas.length, carpetas })
    } catch (error) {
        console.error('Error al listar carpetas de la papelera:', error)
        return res.status(500).json({ mensaje: 'No se pudieron consultar las carpetas de la papelera.' })
    }
}

const restaurarCarpeta = async (req, res) => {
    try {
        const { id } = req.params
        const propietarioId = obtenerPropietarioId(req)

        if (!esObjectIdValido(id)) {
            return res.status(400).json({ mensaje: 'El identificador de la carpeta no es válido.' })
        }

        const carpeta = await Carpeta.findOne({
            _id: id,
            propietarioId,
            estado: 'papelera'
        })

        if (!carpeta) {
            return res.status(404).json({ mensaje: 'La carpeta no existe en la papelera.' })
        }

        // Si la carpeta tiene un padre, este debe estar activo
        if (carpeta.carpetaPadreId !== null) {
            const padreActivo = await Carpeta.findOne({
                _id: carpeta.carpetaPadreId,
                propietarioId,
                estado: 'activa'
            }).select('_id')
            if (!padreActivo) {
                return res.status(409).json({ mensaje: 'Primero debes restaurar la carpeta padre para recuperar esta carpeta.' })
            }
        }

        // Recorrer todas las subcarpetas descendientes
        const idsVisitados = new Set([id]);
        const pendientes = [id];

        while (pendientes.length > 0) {
            const padreActual = pendientes.pop()
            const hijas = await Carpeta.find({
                propietarioId,
                carpetaPadreId: padreActual
            }).select('_id')

            for (const hija of hijas) {
                const hijaId = hija._id.toString()
                if (!idsVisitados.has(hijaId)) {
                    idsVisitados.add(hijaId)
                    pendientes.push(hijaId)
                }
            }
        }
        const ids = [...idsVisitados].map(valor => new mongoose.Types.ObjectId(valor))
        const resultado = await Carpeta.updateMany(
            {
                _id: { $in: ids },
                propietarioId,
                estado: 'papelera'
            },
            {
                $set: {
                    estado: 'activa',
                    fechaModificacion: new Date()
                }
            },
            {
                runValidators: true
            }
        )

        await registrarActividad(
            propietarioId,
            'restaurar',
            'carpeta',
            carpeta._id,
            `Se restauró la carpeta y sus subcarpetas. Carpetas restauradas: ${resultado.modifiedCount}.`
        )
        return res.status(200).json({
            mensaje: 'La carpeta y sus subcarpetas se restauraron correctamente.',
            carpetasRestauradas: resultado.modifiedCount
        })
    } catch (error) {
        console.error('Error al restaurar carpeta:', error)
        return res.status(500).json({ mensaje: 'Error interno al restaurar la carpeta.' })
    }
}

const eliminarCarpetaPermanente = async (req, res) => {
    try {
        const { id } = req.params
        const propietarioId = obtenerPropietarioId(req)

        if (!esObjectIdValido(id)) {
            return res.status(400).json({ mensaje: 'El identificador de la carpeta no es válido.' })
        }

        // Solo se permite eliminar definitivamente una carpeta propia que este en papelera
        const carpeta = await Carpeta.findOne({
            _id: id,
            propietarioId,
            estado: 'papelera'
        }).select('_id');

        if (!carpeta) {
            return res.status(404).json({ mensaje: 'La carpeta no existe en la papelera o no te pertenece.' })
        }

        // Obtener la carpeta y todos sus descendientes
        const idsVisitados = new Set([id])
        const pendientes = [id]

        while (pendientes.length > 0) {
            const padreActual = pendientes.pop()
            const hijas = await Carpeta.find({ propietarioId, carpetaPadreId: padreActual }).select('_id')
            for (const hija of hijas) {
                const hijaId = hija._id.toString()
                if (!idsVisitados.has(hijaId)) {
                    idsVisitados.add(hijaId)
                    pendientes.push(hijaId)
                }
            }
        }

        const idsCarpetas = [...idsVisitados].map(valor => new mongoose.Types.ObjectId(valor))

        // Obtener todos los archivos ubicados en estas carpetas
        const archivos = await Archivo.find({
            propietarioId,
            carpetaId: { $in: idsCarpetas }
        }).select('_id gridFsId tamano');

        // Eliminar los contenidos físicos almacenados en GridFS
        const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'fs' })

        for (const archivo of archivos) {
            try {
                await bucket.delete(archivo.gridFsId)
            } catch (error) {
                // Si el contenido ya no existe en GridFS, se puede seguir eliminando sus metadatos
                if (error.code !== 26 && error.codeName !== 'FileNotFound') {
                    throw error
                }
            }
        }

        const idsArchivos = archivos.map(archivo => archivo._id)

        // Eliminar las comparticiones de las carpetas y archivos afectados
        await Comparticion.deleteMany({
            propietarioId,
            $or: [
                {
                    tipoRecurso: 'carpeta',
                    carpetaId: { $in: idsCarpetas }
                },
                {
                    tipoRecurso: 'archivo',
                    archivoId: { $in: idsArchivos }
                }
            ]
        })

        // Eliminar los metadatos de los archivos
        await Archivo.deleteMany({ propietarioId, _id: { $in: idsArchivos } })

        // Eliminar las carpetas, incluyendo sus descendientes
        const resultado = await Carpeta.deleteMany({ propietarioId, _id: { $in: idsCarpetas } })

        // Recalcular el espacio utilizado por el propietario
        const usuario = await Usuario.findById(propietarioId);

        if (usuario) {
            const resultadoAlmacenamiento = await Archivo.aggregate([
                {
                    $match: {
                        propietarioId: usuario._id,
                        estado: { $ne: 'eliminado' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$tamano' }
                    }
                }
            ])

            const utilizado = resultadoAlmacenamiento[0]?.total ?? 0

            usuario.almacenamiento.utilizado = utilizado;
            usuario.almacenamiento.disponible = Math.max(0, usuario.almacenamiento.capacidad - utilizado)
            await usuario.save()
        }

        await registrarActividad(
            propietarioId,
            'eliminar_permanente',
            'carpeta',
            carpeta._id,
            `Se eliminó permanentemente la carpeta ${carpeta.nombre} y su contenido. Carpetas eliminadas: ${resultado.deletedCount}; archivos eliminados: ${archivos.length}.`
        )
        return res.status(200).json({
            mensaje: 'La carpeta y todo su contenido se eliminaron definitivamente.',
            carpetasEliminadas: resultado.deletedCount,
            archivosEliminados: archivos.length
        })
    } catch (error) {
        console.error('Error al eliminar definitivamente la carpeta:', error)
        return res.status(500).json({ mensaje: 'No se pudo eliminar definitivamente la carpeta.' })
    }
}

export {
    crearCarpeta,
    listarCarpetas,
    obtenerCarpeta,
    actualizarCarpeta,
    eliminarCarpeta,
    restaurarCarpeta,
    eliminarCarpetaPermanente
};