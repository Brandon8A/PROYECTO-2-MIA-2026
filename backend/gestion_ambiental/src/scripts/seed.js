import 'dotenv/config'

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { Readable } from 'node:stream'

import conectarDB from '../config/DataBase.js'
import Usuario from '../models/Usuario.js'
import Carpeta from '../models/Carpeta.js'
import Archivo from '../models/Archivo.js'
import Comparticion from '../models/Comparticion.js'
import Actividad from '../models/Actividad.js'

const SEED_KEY = 'gestion-documental-demo-v1'
const CAPACIDAD = 5 * 1024 ** 3

const usuariosDemo = [
    {
        nombres: 'Administrador',
        apellidos: 'Demostración',
        correo: 'admin.demo@ejemplo.com',
        rol: 'admin'
    },
    {
        nombres: 'Ana',
        apellidos: 'Martínez',
        correo: 'ana.demo@ejemplo.com',
        rol: 'usuario'
    },
    {
        nombres: 'Carlos',
        apellidos: 'López',
        correo: 'carlos.demo@ejemplo.com',
        rol: 'usuario'
    }
]

const definicionesCarpetas = [
    // Administrador
    { usuario: 0, clave: 'admin', nombre: 'Documentos de administración', padre: null },
    { usuario: 0, clave: 'proyectos', nombre: 'Proyectos institucionales', padre: null },
    { usuario: 0, clave: 'informes', nombre: 'Informes de demostración', padre: 'admin' },
    { usuario: 0, clave: 'reglamentos', nombre: 'Reglamentos de demostración', padre: 'admin' },
    { usuario: 0, clave: 'planificacion', nombre: 'Planificación de demostración', padre: 'proyectos' },
    { usuario: 0, clave: 'presupuestos', nombre: 'Presupuestos de demostración', padre: 'proyectos' },
    { usuario: 0, clave: 'papelera-admin', nombre: 'Archivo histórico de demostración', padre: 'admin', estado: 'papelera' },

    // Ana
    { usuario: 1, clave: 'personales', nombre: 'Documentos personales de demostración', padre: null },
    { usuario: 1, clave: 'colaborativo', nombre: 'Trabajo colaborativo de demostración', padre: null },
    { usuario: 1, clave: 'estudios', nombre: 'Estudios de demostración', padre: 'personales' },
    { usuario: 1, clave: 'informes-ana', nombre: 'Informes de demostración', padre: 'colaborativo' },
    { usuario: 1, clave: 'actas', nombre: 'Actas de demostración', padre: 'colaborativo' },
    { usuario: 1, clave: 'consulta', nombre: 'Material de consulta de demostración', padre: 'personales' },
    { usuario: 1, clave: 'papelera-ana', nombre: 'Borradores antiguos de demostración', padre: 'personales', estado: 'papelera' },

    // Carlos
    { usuario: 2, clave: 'proyectos-carlos', nombre: 'Proyectos de demostración', padre: null },
    { usuario: 2, clave: 'tecnica', nombre: 'Documentación técnica de demostración', padre: null },
    { usuario: 2, clave: 'desarrollo', nombre: 'Desarrollo de demostración', padre: 'proyectos-carlos' },
    { usuario: 2, clave: 'disenos', nombre: 'Diseños de demostración', padre: 'proyectos-carlos' },
    { usuario: 2, clave: 'manuales', nombre: 'Manuales de demostración', padre: 'tecnica' },
    { usuario: 2, clave: 'recursos', nombre: 'Recursos de demostración', padre: 'tecnica' },
    { usuario: 2, clave: 'papelera-carlos', nombre: 'Versiones antiguas de demostración', padre: 'tecnica', estado: 'papelera' }
]

const titulosArchivos = [
    'Informe-mensual',
    'Acta-de-reunion',
    'Plan-de-trabajo',
    'Manual-de-usuario',
    'Requisitos-del-sistema',
    'Registro-de-actividades',
    'Informe-de-proyecto',
    'Normativa-interna',
    'Planificacion-de-tareas',
    'Notas-de-investigacion',
    'Resumen-de-avances',
    'Documento-tecnico',
    'Lista-de-requerimientos',
    'Cronograma-de-proyecto',
    'Reporte-de-incidencias',
    'Guia-de-procedimientos',
    'Inventario-documental',
    'Propuesta-de-mejora',
    'Informe-de-resultados',
    'Bitacora-de-trabajo',
    'Especificacion-funcional',
    'Especificacion-tecnica',
    'Registro-de-revision',
    'Plan-de-implementacion',
    'Control-de-cambios',
    'Documento-de-diseno',
    'Resumen-ejecutivo',
    'Solicitud-de-revision',
    'Informe-de-calidad',
    'Plan-de-pruebas',
    'Resultados-de-pruebas',
    'Guia-de-instalacion',
    'Manual-de-mantenimiento',
    'Registro-de-reuniones',
    'Seguimiento-de-tareas',
    'Informe-de-seguimiento',
    'Propuesta-institucional',
    'Documento-de-referencia',
    'Analisis-de-requisitos',
    'Plan-de-capacitacion',
    'Registro-de-incidentes',
    'Informe-de-auditoria',
    'Plan-de-seguridad',
    'Procedimiento-operativo',
    'Catalogo-de-documentos',
    'Revision-de-proyecto',
    'Resumen-de-reunion',
    'Plan-de-mejoras',
    'Informe-final',
    'Notas-generales'
]

const operaciones = [
    'crear',
    'consultar',
    'subir',
    'descargar',
    'renombrar',
    'mover',
    'eliminar',
    'restaurar',
    'compartir',
    'modificar_permiso',
    'revocar_comparticion',
    'iniciar_sesion',
    'cerrar_sesion'
]

function fechaDiasAtras(dias) {
    return new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
}

async function crearUsuarios() {
    const password =
        process.env.SEED_DEMO_PASSWORD || 'Demo1234!'

    const passwordHash = await bcrypt.hash(password, 12)
    const usuarios = []

    for (const datos of usuariosDemo) {
        const usuario = await Usuario.findOneAndUpdate(
            { correo: datos.correo },
            {
                $set: {
                    nombres: datos.nombres,
                    apellidos: datos.apellidos,
                    passwordHash,
                    rol: datos.rol,
                    estado: 'activo',
                    almacenamiento: {
                        capacidad: CAPACIDAD,
                        utilizado: 0,
                        disponible: CAPACIDAD
                    }
                }
            },
            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        )

        usuarios.push(usuario)
    }

    console.log(`Usuarios de demostración preparados: ${usuarios.length}`)
    console.log('Contraseña inicial de las tres cuentas: Demo1234!')

    return usuarios
}

async function crearCarpetas(usuarios) {
    const porClave = new Map()
    const carpetas = []

    for (const definicion of definicionesCarpetas) {
        const propietario = usuarios[definicion.usuario]
        const padre = definicion.padre ? porClave.get(`${definicion.usuario}:${definicion.padre}`) : null

        if (definicion.padre && !padre) {
            throw new Error(`No se encontró la carpeta padre "${definicion.padre}" para "${definicion.nombre}".`)
        }

        let carpeta = await Carpeta.findOne({
            propietarioId: propietario._id,
            nombre: definicion.nombre,
            carpetaPadreId: padre?._id ?? null
        })

        if (!carpeta) {
            carpeta = await Carpeta.create({
                nombre: definicion.nombre,
                propietarioId: propietario._id,
                carpetaPadreId: padre?._id ?? null,
                fechaCreacion: fechaDiasAtras(30),
                fechaModificacion: fechaDiasAtras(2),
                estado: definicion.estado || 'activa'
            })
        }

        porClave.set(`${definicion.usuario}:${definicion.clave}`, carpeta)

        carpetas.push({
            documento: carpeta,
            propietario: propietario,
            indiceUsuario: definicion.usuario,
            estado: definicion.estado || 'activa'
        })
    }

    console.log(`Carpetas de demostración preparadas: ${carpetas.length}`)

    return carpetas
}

async function guardarContenidoGridFS(bucket, nombre, contenido, metadata) {
    const coleccionArchivosGridFS = mongoose.connection.db.collection('fs.files')

    const existente = await coleccionArchivosGridFS.findOne({
        filename: nombre,
        'metadata.seedKey': SEED_KEY
    })

    if (existente) {
        return existente._id
    }

    return new Promise((resolve, reject) => {
        const flujo = bucket.openUploadStream(nombre, {
            contentType: metadata.contentType,
            metadata: {
                seedKey: SEED_KEY,
                propietarioId: metadata.propietarioId
            }
        })

        flujo.once('error', reject)
        flujo.once('finish', () => resolve(flujo.id))

        Readable.from([contenido]).pipe(flujo)
    })
}

function generarContenido(titulo, extension, usuario, carpeta, numero) {
    if (extension === '.md') {
        return [
            `# ${titulo.replaceAll('-', ' ')}`,
            '',
            `Documento de demostración número ${numero}.`,
            '',
            '## Información general',
            '',
            `Responsable: ${usuario.nombres} ${usuario.apellidos}.`,
            `Carpeta: ${carpeta.nombre}.`,
            `Fecha de referencia: ${fechaDiasAtras(numero % 25).toLocaleDateString('es-GT')}.`,
            '',
            '## Descripción',
            '',
            'Este documento contiene información de ejemplo para comprobar la carga,',
            'consulta, descarga, organización y compartición de archivos del sistema.',
            '',
            '## Observaciones',
            '',
            '- El contenido está almacenado en GridFS.',
            '- Los metadatos se registran en la colección archivos.',
            '- Este documento forma parte del conjunto de datos de demostración.'
        ].join('\n')
    }

    return [
        titulo.replaceAll('-', ' '),
        '='.repeat(titulo.length),
        '',
        `Documento de demostración número ${numero}.`,
        `Responsable: ${usuario.nombres} ${usuario.apellidos}.`,
        `Carpeta: ${carpeta.nombre}.`,
        `Fecha de referencia: ${fechaDiasAtras(numero % 25).toLocaleDateString('es-GT')}.`,
        '',
        'Este archivo de texto contiene información de ejemplo para probar',
        'la gestión documental, la descarga de contenido y las operaciones',
        'de organización y compartición.',
        '',
        'El contenido se almacena en GridFS y sus metadatos en la colección archivos.'
    ].join('\n')
}

async function crearArchivos(usuarios, carpetas) {
    const bucket = new mongoose.mongo.GridFSBucket(
        mongoose.connection.db,
        { bucketName: 'fs' }
    )

    const carpetasActivasPorUsuario = usuarios.map((usuario, indice) =>
        carpetas
            .filter(
                carpeta =>
                    carpeta.indiceUsuario === indice &&
                    carpeta.estado === 'activa'
            )
            .map(carpeta => carpeta.documento)
    )

    const archivos = []

    for (let i = 0; i < 50; i++) {
        const numero = i + 1
        const indiceUsuario = i % usuarios.length
        const usuario = usuarios[indiceUsuario]
        const carpetasActivas = carpetasActivasPorUsuario[indiceUsuario]
        const carpeta = carpetasActivas[
            Math.floor(i / usuarios.length) % carpetasActivas.length
        ]

        const extension = i % 2 === 0 ? '.md' : '.txt'
        const tituloBase = titulosArchivos[i]
        const nombre = `DEMO-${String(numero).padStart(2, '0')}-${tituloBase}${extension}`
        const nombreGridFS = `${SEED_KEY}/${usuario.correo}/${nombre}`
        const estado = numero % 9 === 1 ? 'papelera' : 'activo'

        const contenido = Buffer.from(
            generarContenido(tituloBase, extension, usuario, carpeta, numero),
            'utf8'
        )

        const gridFsId = await guardarContenidoGridFS(
            bucket,
            nombreGridFS,
            contenido,
            {
                propietarioId: usuario._id,
                contentType: extension === '.md' ? 'text/markdown' : 'text/plain'
            }
        )

        let archivo = await Archivo.findOne({
            propietarioId: usuario._id,
            nombre
        })

        const datosArchivo = {
            nombre,
            extension,
            tipoMime: extension === '.md' ? 'text/markdown' : 'text/plain',
            tamano: contenido.length,
            propietarioId: usuario._id,
            carpetaId: carpeta._id,
            fechaCreacion: fechaDiasAtras(numero % 30),
            fechaModificacion: fechaDiasAtras(numero % 10),
            fechaEliminacion: estado === 'papelera' ? fechaDiasAtras(2) : null,
            estado,
            gridFsId
        }

        if (archivo) {
            // Repara los metadatos si un intento anterior quedó incompleto.
            archivo.set(datosArchivo)
            await archivo.save()
        } else {
            archivo = await Archivo.create(datosArchivo)
        }

        archivos.push({
            documento: archivo,
            propietario: usuario,
            indiceUsuario,
            estado
        })
    }

    console.log(`Archivos de demostración preparados: ${archivos.length}`)

    return archivos
}

async function crearComparticiones(usuarios, carpetas, archivos) {
    const recursos = [
        ...archivos
            .filter(archivo => archivo.estado === 'activo')
            .slice(0, 18)
            .map(archivo => ({
                tipoRecurso: 'archivo',
                archivoId: archivo.documento._id,
                carpetaId: null,
                propietario: archivo.propietario,
                indiceUsuario: archivo.indiceUsuario
            })),

        ...carpetas
            .filter(carpeta => carpeta.estado === 'activa')
            .slice(0, 6)
            .map(carpeta => ({
                tipoRecurso: 'carpeta',
                archivoId: null,
                carpetaId: carpeta.documento._id,
                propietario: carpeta.propietario,
                indiceUsuario: carpeta.indiceUsuario
            }))
    ]

    const comparticiones = []

    for (let i = 0; i < recursos.length; i++) {
        const recurso = recursos[i]
        const receptor = usuarios[(recurso.indiceUsuario + 1) % usuarios.length]
        const estado = i < 20 ? 'activa' : 'revocada'
        const tipoPermiso = i % 2 === 0 ? 'lectura' : 'edicion'

        let comparticion = await Comparticion.findOne({
            propietarioId: recurso.propietario._id,
            usuarioReceptorId: receptor._id,
            tipoRecurso: recurso.tipoRecurso,
            archivoId: recurso.archivoId,
            carpetaId: recurso.carpetaId,
            estado
        })

        if (!comparticion) {
            comparticion = await Comparticion.create({
                propietarioId: recurso.propietario._id,
                usuarioReceptorId: receptor._id,
                tipoRecurso: recurso.tipoRecurso,
                archivoId: recurso.archivoId,
                carpetaId: recurso.carpetaId,
                tipoPermiso,
                fechaComparticion: fechaDiasAtras(20 - (i % 20)),
                fechaModificacion: fechaDiasAtras(i % 5),
                estado
            })
        }

        comparticiones.push(comparticion)
    }

    console.log(`Comparticiones de demostración preparadas: ${comparticiones.length}`)

    return comparticiones
}

async function crearActividades(usuarios, carpetas, archivos, comparticiones) {
    const actividades = []

    for (let i = 0; i < 75; i++) {
        const numero = i + 1
        const usuario = usuarios[i % usuarios.length]
        let recursoTipo
        let recursoId

        if (i % 3 === 0 && archivos.length > 0) {
            const archivo = archivos[i % archivos.length]
            recursoTipo = 'archivo'
            recursoId = archivo.documento._id
        } else if (i % 3 === 1 && carpetas.length > 0) {
            const carpeta = carpetas[i % carpetas.length]
            recursoTipo = 'carpeta'
            recursoId = carpeta.documento._id
        } else {
            const comparticion = comparticiones[i % comparticiones.length]
            recursoTipo = 'comparticion'
            recursoId = comparticion._id
        }

        const tipoOperacion = operaciones[i % operaciones.length]
        const detalles =
            `DEMO-SEED-v1 #${String(numero).padStart(3, '0')}: ` +
            `registro de ${tipoOperacion} sobre ${recursoTipo} de demostración.`

        let actividad = await Actividad.findOne({ detalles })

        if (!actividad) {
            actividad = await Actividad.create({
                usuarioId: usuario._id,
                tipoOperacion,
                recursoTipo,
                recursoId,
                fechaHora: fechaDiasAtras(i % 30),
                detalles
            })
        }

        actividades.push(actividad)
    }

    console.log(`Actividades de demostración preparadas: ${actividades.length}`)
    return actividades
}

async function actualizarAlmacenamiento(usuarios) {
    for (const usuario of usuarios) {
        const archivosUsuario = await Archivo.find({
            propietarioId: usuario._id,
            estado: { $ne: 'eliminado' }
        }).select('tamano')

        const utilizado = archivosUsuario.reduce(
            (total, archivo) => total + archivo.tamano,
            0
        )

        usuario.almacenamiento = {
            capacidad: CAPACIDAD,
            utilizado,
            disponible: Math.max(0, CAPACIDAD - utilizado)
        }

        await usuario.save()
    }

    console.log('Almacenamiento de los usuarios actualizado.')
}

async function verificarResultados(usuarios) {
    const coleccionGridFS = mongoose.connection.db.collection('fs.files')

    const [totalArchivos, totalComparticiones, totalActividades, totalGridFS] =
        await Promise.all([
            Archivo.countDocuments({
                nombre: /^DEMO-\d{2}-/
            }),
            Comparticion.countDocuments({
                propietarioId: { $in: usuarios.map(usuario => usuario._id) },
                $or: [
                    {
                        archivoId: {
                            $in: await Archivo.find({
                                propietarioId: { $in: usuarios.map(usuario => usuario._id) }
                            }).distinct('_id')
                        }
                    },
                    {
                        carpetaId: {
                            $in: await Carpeta.find({
                                propietarioId: { $in: usuarios.map(usuario => usuario._id) }
                            }).distinct('_id')
                        }
                    }
                ]
            }),
            Actividad.countDocuments({
                detalles: /^DEMO-SEED-v1 #/
            }),
            coleccionGridFS.countDocuments({
                'metadata.seedKey': SEED_KEY
            })
        ])

    console.log('\n--- Resumen de verificación ---')
    console.log(`Usuarios de demostración: ${usuarios.length}`)
    console.log(`Archivos de demostración: ${totalArchivos}`)
    console.log(`Comparticiones vinculadas a usuarios de prueba: ${totalComparticiones}`)
    console.log(`Actividades de demostración: ${totalActividades}`)
    console.log(`Contenidos almacenados en GridFS: ${totalGridFS}`)
}

async function ejecutarSeed() {
    try {
        await conectarDB()

        const usuarios = await crearUsuarios()
        const carpetas = await crearCarpetas(usuarios)
        const archivos = await crearArchivos(usuarios, carpetas)
        const comparticiones = await crearComparticiones(
            usuarios,
            carpetas,
            archivos
        )

        await crearActividades(
            usuarios,
            carpetas,
            archivos,
            comparticiones
        )

        await actualizarAlmacenamiento(usuarios)
        await verificarResultados(usuarios)

        console.log('\nCarga de demostración finalizada correctamente.')
    } catch (error) {
        console.error('\nError durante la carga de demostración:', error)
        process.exitCode = 1
    } finally {
        await mongoose.disconnect()
    }
}

await ejecutarSeed()