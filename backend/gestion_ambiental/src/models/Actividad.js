import mongoose from 'mongoose';

const actividadSchema = new mongoose.Schema(
    {
        usuarioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario',
            required: true
        },
        tipoOperacion: {
            type: String,
            required: true,
            enum: [
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
            ]
        },
        recursoTipo: {
            type: String,
            required: true,
            enum: [
                'usuario',
                'carpeta',
                'archivo',
                'comparticion',
                'sistema'
            ]
        },
        recursoId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        fechaHora: {
            type: Date,
            required: true,
            default: Date.now
        },
        detalles: {
            type: String,
            required: true,
            trim: true,
            minlength: 1
        }
    },
    {
        collection: 'actividades',
        versionKey: false
    }
);

actividadSchema.index({
    usuarioId: 1,
    fechaHora: -1
});

actividadSchema.index({
    recursoTipo: 1,
    recursoId: 1,
    fechaHora: -1
});

const Actividad = mongoose.model('Actividad', actividadSchema);

export default Actividad;
