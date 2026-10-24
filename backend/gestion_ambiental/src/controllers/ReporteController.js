
import Archivo from '../models/Archivo.js';
import Usuario from '../models/Usuario.js';

const obtenerRangoFechas = (query) => {
    const filtro = {};
    const { fechaInicio, fechaFin } = query;

    if (fechaInicio) {
        const inicio = new Date(`${fechaInicio}T00:00:00.000Z`);

        if (Number.isNaN(inicio.getTime())) {
            throw new Error('La fecha de inicio no es válida.');
        }

        filtro.$gte = inicio;
    }

    if (fechaFin) {
        const fin = new Date(`${fechaFin}T00:00:00.000Z`);

        if (Number.isNaN(fin.getTime())) {
            throw new Error('La fecha de fin no es válida.');
        }

        // Se incluye el día completo de fechaFin.
        fin.setUTCDate(fin.getUTCDate() + 1);
        filtro.$lt = fin;
    }

    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
        throw new Error(
            'La fecha de inicio no puede ser posterior a la fecha de fin.'
        );
    }

    return filtro;
};

export const obtenerReporteArchivos = async (req, res) => {
    try {
        const rangoFechas = obtenerRangoFechas(req.query);
        const filtro = Object.keys(rangoFechas).length
            ? { fechaCreacion: rangoFechas }
            : {};

        const [
            resumenArchivos,
            porEstado,
            porExtension,
            porUsuario,
            resumenAlmacenamiento
        ] = await Promise.all([
            // Total de archivos y tamaño acumulado según el filtro de fechas.
            Archivo.aggregate([
                { $match: filtro },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        tamanoTotal: { $sum: '$tamano' }
                    }
                }
            ]),

            // Cantidad y tamaño de los archivos por estado.
            Archivo.aggregate([
                { $match: filtro },
                {
                    $group: {
                        _id: '$estado',
                        cantidad: { $sum: 1 },
                        tamanoTotal: { $sum: '$tamano' }
                    }
                },
                { $sort: { cantidad: -1 } }
            ]),

            // Cantidad y tamaño de los archivos por extensión.
            Archivo.aggregate([
                { $match: filtro },
                {
                    $group: {
                        _id: { $toLower: '$extension' },
                        cantidad: { $sum: 1 },
                        tamanoTotal: { $sum: '$tamano' }
                    }
                },
                { $sort: { cantidad: -1 } }
            ]),

            // Usuarios ordenados por cantidad de archivos en el período.
            Archivo.aggregate([
                { $match: filtro },
                {
                    $group: {
                        _id: '$propietarioId',
                        cantidadArchivos: { $sum: 1 },
                        tamanoTotal: { $sum: '$tamano' }
                    }
                },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'usuario'
                    }
                },
                {
                    $unwind: {
                        path: '$usuario',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        _id: 0,
                        usuarioId: '$_id',
                        nombres: '$usuario.nombres',
                        apellidos: '$usuario.apellidos',
                        correo: '$usuario.correo',
                        cantidadArchivos: 1,
                        tamanoTotal: 1
                    }
                },
                { $sort: { cantidadArchivos: -1, tamanoTotal: -1 } },
                { $limit: 10 }
            ]),

            // Capacidad y uso registrados en las cuentas de usuario.
            Usuario.aggregate([
                {
                    $group: {
                        _id: null,
                        totalUsuarios: { $sum: 1 },
                        capacidadTotal: {
                            $sum: '$almacenamiento.capacidad'
                        },
                        utilizadoTotal: {
                            $sum: '$almacenamiento.utilizado'
                        },
                        disponibleTotal: {
                            $sum: '$almacenamiento.disponible'
                        }
                    }
                }
            ])
        ]);

        const estados = porEstado.reduce((resultado, item) => {
            resultado[item._id] = {
                cantidad: item.cantidad,
                tamanoTotal: item.tamanoTotal
            };

            return resultado;
        }, {});

        res.status(200).json({
            filtros: {
                fechaInicio: req.query.fechaInicio || null,
                fechaFin: req.query.fechaFin || null
            },
            archivos: {
                total: resumenArchivos[0]?.total ?? 0,
                tamanoTotal: resumenArchivos[0]?.tamanoTotal ?? 0,
                porEstado: estados,
                porExtension: porExtension.map(item => ({
                    extension: item._id,
                    cantidad: item.cantidad,
                    tamanoTotal: item.tamanoTotal
                })),
                principalesUsuarios: porUsuario
            },
            almacenamiento: {
                totalUsuarios: resumenAlmacenamiento[0]?.totalUsuarios ?? 0,
                capacidadTotal:
                    resumenAlmacenamiento[0]?.capacidadTotal ?? 0,
                utilizadoTotal:
                    resumenAlmacenamiento[0]?.utilizadoTotal ?? 0,
                disponibleTotal:
                    resumenAlmacenamiento[0]?.disponibleTotal ?? 0
            }
        });
    } catch (error) {
        console.error('Error al generar reporte de archivos:', error);

        const esErrorDeFiltro =
            error.message.includes('fecha');

        res.status(esErrorDeFiltro ? 400 : 500).json({
            mensaje: esErrorDeFiltro
                ? error.message
                : 'No se pudo generar el reporte de archivos.'
        });
    }
};
