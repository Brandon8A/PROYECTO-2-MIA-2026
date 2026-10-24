import mongoose from 'mongoose';
import { basename, extname, parse } from 'node:path';
import { GridFSBucket } from 'mongodb';

import Archivo from '../models/Archivo.js';
import Carpeta from '../models/Carpeta.js';
import Usuario from '../models/Usuario.js';
import Comparticion from '../models/Comparticion.js';
import Actividad from '../models/Actividad.js';

const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB

const esObjectIdValido = (id) => typeof id === 'string' && mongoose.isValidObjectId(id)

const obtenerPropietarioId = (req) => req.usuario.id

const obtenerBucket = () => new GridFSBucket(mongoose.connection.db, {
    bucketName: 'fs'
});

const obtenerExtension = (nombre) => extname(nombre).toLowerCase()

const obtenerTipoMime = (extension) =>
    extension === '.md' ? 'text/markdown' : 'text/plain';

// Registrar actividades sin impedir la operación principal
const registrarActividad = async (
    usuarioId,
    tipoOperacion,
    recursoTipo,
    recursoId,
    detalles
) => {
    try {
        await Actividad.create({
            usuarioId,
            tipoOperacion,
            recursoTipo,
            recursoId: recursoId ?? null,
            fechaHora: new Date(),
            detalles
        });
    } catch (error) {
        console.error('No se pudo registrar la actividad:', error.message)
    }
}

// Actualizar el almacenamiento utilizado por un usuario
const actualizarAlmacenamiento = async (usuarioId) => {
    const usuario = await Usuario.findById(usuarioId)

    if (!usuario) return;

    const resultado = await Archivo.aggregate([
        {
            $match: {
                propietarioId: new mongoose.Types.ObjectId(usuarioId),
                estado: { $ne: 'eliminado' }
            }
        },
        {
            $group: {
                _id: null,
                utilizado: { $sum: '$tamano' }
            }
        }
    ]);

    const utilizado = resultado[0]?.utilizado ?? 0;

    usuario.almacenamiento.utilizado = utilizado;
    usuario.almacenamiento.disponible = Math.max(0, usuario.almacenamiento.capacidad - utilizado)

    await usuario.save();
};

// Obtener un archivo propio o compartido directamente con el usuario.
// Los permisos de una carpeta compartida se implementarán en una fase
// posterior para incluir también sus archivos descendientes.
const obtenerArchivoConAcceso = async (archivoId, usuarioId) => {
    const archivo = await Archivo.findOne({
        _id: archivoId,
        estado: 'activo'
    })

    if (!archivo) return null;

    if (archivo.propietarioId.toString() === usuarioId) {
        return {
            archivo,
            esPropietario: true,
            permiso: 'edicion'
        };
    }

    const comparticion = await Comparticion.findOne({
        propietarioId: archivo.propietarioId,
        usuarioReceptorId: usuarioId,
        tipoRecurso: 'archivo',
        archivoId: archivo._id,
        estado: 'activa'
    });

    if (!comparticion) return null;

    return {
        archivo,
        esPropietario: false,
        permiso: comparticion.tipoPermiso
    };
};

// POST /api/archivos
// Recibe un archivo en memoria y guarda su contenido en GridFS.
const cargarArchivo = async (req, res) => {
    let gridFsId = null;

    try {
        if (!req.file) {
            return res.status(400).json({ mensaje: 'Debes seleccionar un archivo .txt o .md.' })
        }

        const usuarioId = obtenerPropietarioId(req);
        const nombreOriginal = basename(req.file.originalname);
        const extension = obtenerExtension(nombreOriginal);

        if (!['.txt', '.md'].includes(extension)) {
            return res.status(400).json({ mensaje: 'Solo se permiten archivos .txt y .md.' })
        }

        if (req.file.size > TAMANO_MAXIMO) {
            return res.status(413).json({ mensaje: 'El archivo supera el límite de 10 MB.' })
        }

        const nombre = parse(nombreOriginal).name.trim();

        if (!nombre) {
            return res.status(400).json({ mensaje: 'El nombre del archivo no es válido.' })
        }

        const carpetaId = req.body.carpetaId || null;

        if (carpetaId !== null) {
            if (!esObjectIdValido(carpetaId)) {
                return res.status(400).json({ mensaje: 'El identificador de la carpeta no es válido.' })
            }

            const carpeta = await Carpeta.findOne({
                _id: carpetaId,
                propietarioId: usuarioId,
                estado: 'activa'
            }).select('_id');

            if (!carpeta) {
                return res.status(404).json({ mensaje: 'La carpeta no existe o no está disponible.' })
            }
        }

        const usuario = await Usuario.findById(usuarioId);

        if (!usuario) {
            return res.status(401).json({ mensaje: 'El usuario autenticado ya no existe.' })
        }

        const utilizado = usuario.almacenamiento.utilizado ?? 0;
        const capacidad = usuario.almacenamiento.capacidad;

        if (req.file.size > capacidad - utilizado) {
            return res.status(400).json({ mensaje: 'No hay suficiente espacio de almacenamiento.' })
        }

        const ahora = new Date();
        const bucket = obtenerBucket();

        const uploadStream = bucket.openUploadStream(nombreOriginal, {
            contentType: obtenerTipoMime(extension),
            metadata: {
                propietarioId: usuarioId,
                extension
            }
        });

        await new Promise((resolve, reject) => {
            uploadStream.once('error', reject);
            uploadStream.once('finish', resolve);
            uploadStream.end(req.file.buffer);
        });

        gridFsId = uploadStream.id;

        const archivo = await Archivo.create({
            nombre,
            extension,
            tipoMime: obtenerTipoMime(extension),
            tamano: req.file.size,
            propietarioId: usuarioId,
            carpetaId,
            fechaCreacion: ahora,
            fechaModificacion: ahora,
            fechaEliminacion: null,
            estado: 'activo',
            gridFsId
        });

        await actualizarAlmacenamiento(usuarioId);

        await registrarActividad(
            usuarioId,
            'subir',
            'archivo',
            archivo._id,
            `Se subió el archivo ${nombreOriginal}.`
        );

        return res.status(201).json({ mensaje: 'Archivo cargado correctamente.', archivo })
    } catch (error) {
        // Si se guardó el contenido pero falló el documento de metadatos,
        // evitar dejar un archivo huérfano en GridFS.
        if (gridFsId) {
            try {
                await obtenerBucket().delete(gridFsId);
            } catch (errorGridFS) {
                console.error('No se pudo limpiar el contenido de GridFS:', errorGridFS.message)
            }
        }

        if (error.name === 'ValidationError' || (error.name === 'MongoServerError' && error.code === 121)) {
            return res.status(400).json({ mensaje: 'Los datos del archivo no cumplen las validaciones.' })
        }
        console.error('Error al cargar archivo:', error);
        return res.status(500).json({ mensaje: 'Error interno al cargar el archivo.' })
    }
}

// GET /api/archivos?carpetaId=
// Sin carpetaId, lista los archivos de la raíz del usuario.
const listarArchivos = async (req, res) => {
    try {
        const propietarioId = obtenerPropietarioId(req);
        const { carpetaId } = req.query;

        let carpeta = null;

        if (carpetaId && carpetaId !== 'null') {
            if (!esObjectIdValido(carpetaId)) {
                return res.status(400).json({ mensaje: 'El identificador de la carpeta no es válido.' })
            }

            carpeta = await Carpeta.findOne({
                _id: carpetaId,
                propietarioId,
                estado: 'activa'
            }).select('_id');

            if (!carpeta) {
                return res.status(404).json({ mensaje: 'La carpeta no existe o no está disponible.' })
            }
        }

        const archivos = await Archivo.find({
            propietarioId,
            carpetaId: carpeta?._id ?? null,
            estado: 'activo'
        })
            .select('-gridFsId')
            .sort({ nombre: 1 })
            .lean();

        return res.status(200).json({ total: archivos.length, archivos })
    } catch (error) {
        console.error('Error al listar archivos:', error);
        return res.status(500).json({ mensaje: 'Error interno al listar los archivos.' })
    }
}

// GET /api/archivos/:id
const obtenerArchivo = async (req, res) => {
    try {
        const { id } = req.params;

        if (!esObjectIdValido(id)) {
            return res.status(400).json({ mensaje: 'El identificador del archivo no es válido.' })
        }
        const acceso = await obtenerArchivoConAcceso(id, obtenerPropietarioId(req))

        if (!acceso) {
            return res.status(404).json({ mensaje: 'El archivo no existe o no tienes acceso.' })
        }

        return res.status(200).json({
            archivo: {
                ...acceso.archivo.toObject(),
                gridFsId: undefined
            },
            permiso: acceso.permiso,
            esPropietario: acceso.esPropietario
        })
    } catch (error) {
        console.error('Error al consultar archivo:', error);

        return res.status(500).json({ mensaje: 'Error interno al consultar el archivo.' })
    }
}

// GET /api/archivos/:id/descargar
const descargarArchivo = async (req, res) => {
    try {
        const { id } = req.params;

        if (!esObjectIdValido(id)) {
            return res.status(400).json({ mensaje: 'El identificador del archivo no es válido.' })
        }

        const acceso = await obtenerArchivoConAcceso(id, obtenerPropietarioId(req))

        if (!acceso) {
            return res.status(404).json({ mensaje: 'El archivo no existe o no tienes acceso.' })
        }

        const archivo = acceso.archivo;
        const nombreCompleto = `${archivo.nombre}${archivo.extension}`;

        res.setHeader('Content-Type', archivo.tipoMime);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(nombreCompleto)}`
        );
        res.setHeader('Content-Length', archivo.tamano);

        await registrarActividad(
            obtenerPropietarioId(req),
            'descargar',
            'archivo',
            archivo._id,
            `Se descargó el archivo ${nombreCompleto}.`
        );

        const stream = obtenerBucket().openDownloadStream(archivo.gridFsId)

        stream.on('error', (error) => {
            console.error('Error al leer contenido de GridFS:', error)

            if (!res.headersSent) {
                res.status(404).json({ mensaje: 'No se encontró el contenido del archivo.' })
            } else {
                res.destroy(error)
            }
        })
        stream.pipe(res)
    } catch (error) {
        console.error('Error al descargar archivo:', error)
        if (!res.headersSent) {
            return res.status(500).json({ mensaje: 'Error interno al descargar el archivo.' })
        }
    }
}

// PUT /api/archivos/:id
// Permite renombrar o mover un archivo propio.
const actualizarArchivo = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = obtenerPropietarioId(req);
        const camposPermitidos = ['nombre', 'carpetaId'];
        const camposEnviados = Object.keys(req.body);

        if (!esObjectIdValido(id)) {
            return res.status(400).json({ mensaje: 'El identificador del archivo no es válido.' })
        }

        if (camposEnviados.length === 0 || camposEnviados.some((campo) => !camposPermitidos.includes(campo))) {
            return res.status(400).json({ mensaje: 'Solo puedes modificar nombre y carpetaId.' })
        }

        const archivo = await Archivo.findOne({
            _id: id,
            propietarioId: usuarioId,
            estado: 'activo'
        })

        if (!archivo) {
            return res.status(404).json({ mensaje: 'El archivo no existe o no está disponible.' })
        }

        if (Object.hasOwn(req.body, 'nombre')) {
            if (typeof req.body.nombre !== 'string' || !req.body.nombre.trim()) {
                return res.status(400).json({ mensaje: 'El nombre del archivo no puede estar vacío.' })
            }

            // La extensión se conserva por separado.
            const nombreNuevo = req.body.nombre.trim();

            if (extname(nombreNuevo)) {
                return res.status(400).json({ mensaje: 'Envía el nombre sin extensión.' })
            }
            archivo.nombre = nombreNuevo;
        }

        if (Object.hasOwn(req.body, 'carpetaId')) {
            const nuevaCarpetaId = req.body.carpetaId

            if (nuevaCarpetaId !== null && !esObjectIdValido(nuevaCarpetaId)) {
                return res.status(400).json({ mensaje: 'carpetaId debe ser un ObjectId válido o null.' })
            }

            if (nuevaCarpetaId !== null) {
                const carpeta = await Carpeta.findOne({
                    _id: nuevaCarpetaId,
                    propietarioId: usuarioId,
                    estado: 'activa'
                }).select('_id');

                if (!carpeta) {
                    return res.status(404).json({ mensaje: 'La carpeta destino no existe o no está disponible.' })
                }
            }
            archivo.carpetaId = nuevaCarpetaId;
        }
        archivo.fechaModificacion = new Date();
        await archivo.save();

        await registrarActividad(
            usuarioId,
            'renombrar',
            'archivo',
            archivo._id,
            `Se actualizó el archivo ${archivo.nombre}${archivo.extension}.`
        )

        return res.status(200).json({ mensaje: 'Archivo actualizado correctamente.', archivo })
    } catch (error) {
        if (error.name === 'ValidationError' || (error.name === 'MongoServerError' && error.code === 121)) {
            return res.status(400).json({ mensaje: 'Los datos del archivo no son válidos.' })
        }
        console.error('Error al actualizar archivo:', error)
        return res.status(500).json({ mensaje: 'Error interno al actualizar el archivo.' })
    }
}

// DELETE /api/archivos/:id
// Enviar a la papelera no elimina el contenido de GridFS.
const eliminarArchivo = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = obtenerPropietarioId(req);

        if (!esObjectIdValido(id)) {
            return res.status(400).json({ mensaje: 'El identificador del archivo no es válido.' })
        }
        const archivo = await Archivo.findOne({
            _id: id,
            propietarioId: usuarioId,
            estado: 'activo'
        })

        if (!archivo) {
            return res.status(404).json({ mensaje: 'El archivo no existe o no está disponible.' })
        }

        archivo.estado = 'papelera';
        archivo.fechaEliminacion = new Date();
        archivo.fechaModificacion = new Date();

        await archivo.save()
        await actualizarAlmacenamiento(usuarioId)

        await registrarActividad(
            usuarioId,
            'eliminar',
            'archivo',
            archivo._id,
            `Se envió a la papelera ${archivo.nombre}${archivo.extension}.`
        )

        return res.status(200).json({
            mensaje: 'Archivo enviado a la papelera correctamente.',
            archivoId: archivo._id
        })
    } catch (error) {
        console.error('Error al enviar archivo a la papelera:', error)
        return res.status(500).json({ mensaje: 'Error interno al enviar el archivo a la papelera.' })
    }
}

const listarArchivosPapelera = async (req, res) => {
    try {
        const propietarioId = obtenerPropietarioId(req)
        const archivos = await Archivo.find({
            propietarioId,
            estado: 'papelera'
        })
            .select('-gridFsId')
            .sort({ fechaEliminacion: -1 })
            .lean();

        return res.status(200).json({ total: archivos.length, archivos })
    } catch (error) {
        console.error('Error al listar archivos de la papelera:', error)
        return res.status(500).json({ mensaje: 'No se pudieron consultar los archivos de la papelera.' })
    }
}

const restaurarArchivo = async (req, res) => {
    try {
        const { id } = req.params
        const usuarioId = obtenerPropietarioId(req)

        if (!esObjectIdValido(id)) {
            return res.status(400).json({ mensaje: 'El identificador del archivo no es válido.' })
        }

        const archivo = await Archivo.findOne({
            _id: id,
            propietarioId: usuarioId,
            estado: 'papelera'
        })

        if (!archivo) {
            return res.status(404).json({ mensaje: 'El archivo no existe en la papelera.' })
        }

        // Si estaba dentro de una carpeta, esta debe seguir activa
        if (archivo.carpetaId !== null) {
            const carpeta = await Carpeta.findOne({
                _id: archivo.carpetaId,
                propietarioId: usuarioId,
                estado: 'activa'
            }).select('_id');

            if (!carpeta) {
                return res.status(409).json({ mensaje: 'Primero debes restaurar la carpeta que contiene el archivo.' })
            }
        }

        archivo.estado = 'activo'
        archivo.fechaEliminacion = null
        archivo.fechaModificacion = new Date()

        await archivo.save()
        await actualizarAlmacenamiento(usuarioId)
        await registrarActividad(
            usuarioId,
            'restaurar',
            'archivo',
            archivo._id,
            `Se restauró el archivo ${archivo.nombre}${archivo.extension}.`
        )

        return res.status(200).json({ mensaje: 'Archivo restaurado correctamente.', archivo })
    } catch (error) {
        console.error('Error al restaurar archivo:', error)
        return res.status(500).json({ mensaje: 'No se pudo restaurar el archivo.' })
    }
}

const eliminarArchivoPermanente = async (req, res) => {
    try {
        const { id } = req.params
        const usuarioId = obtenerPropietarioId(req)

        if (!esObjectIdValido(id)) {
            return res.status(400).json({ mensaje: 'El identificador del archivo no es válido.' })
        }

        const archivo = await Archivo.findOne({
            _id: id,
            propietarioId: usuarioId,
            estado: 'papelera'
        })

        if (!archivo) {
            return res.status(404).json({ mensaje: 'El archivo no existe en la papelera.' })
        }

        // Eliminar primero el contenido almacenado en GridFS
        try {
            await obtenerBucket().delete(archivo.gridFsId)
        } catch (error) {
            // MongoDB puede devolver NamespaceNotFound (26) si falta la colección de archivos de GridFS
            if (error.code !== 26 && error.codeName !== 'FileNotFound') {
                throw error
            }
        }

        // Eliminar las comparticiones asociadas al archivo
        await Comparticion.deleteMany({
            propietarioId: archivo.propietarioId,
            tipoRecurso: 'archivo',
            archivoId: archivo._id
        })

        // Eliminar los metadatos
        await Archivo.deleteOne({
            _id: archivo._id,
            propietarioId: usuarioId,
            estado: 'papelera'
        })

        await actualizarAlmacenamiento(usuarioId)
        await registrarActividad(
            usuarioId,
            'eliminar_permanente',
            'archivo',
            archivo._id,
            `Se eliminó definitivamente el archivo ${archivo.nombre}${archivo.extension}.`
        )

        return res.status(200).json({ mensaje: 'Archivo eliminado definitivamente.', archivoId: id })
    } catch (error) {
        console.error('Error al eliminar definitivamente el archivo:', error)

        return res.status(500).json({ mensaje: 'No se pudo eliminar definitivamente el archivo.' })
    }
}

export {
    cargarArchivo,
    listarArchivos,
    obtenerArchivo,
    descargarArchivo,
    actualizarArchivo,
    eliminarArchivo,
    listarArchivosPapelera,
    restaurarArchivo,
    eliminarArchivoPermanente
}