import mongoose from 'mongoose';

const archivoSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: true,
            trim: true,
            minlength: 1
        },
        extension: {
            type: String,
            required: true,
            trim: true,
            minlength: 1
        },
        tipoMime: {
            type: String,
            required: true,
            trim: true,
            minlength: 1
        },
        tamano: {
            type: Number,
            required: true,
            min: 0
        },
        propietarioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario',
            required: true,
            immutable: true
        },
        // Se permite null para archivos situados en la raíz
        carpetaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Carpeta',
            default: null
        },
        fechaCreacion: {
            type: Date,
            required: true,
            default: Date.now,
            immutable: true
        },
        fechaModificacion: {
            type: Date,
            required: true,
            default: Date.now
        },
        // null significa que el archivo no está en la papelera.
        fechaEliminacion: {
            type: Date,
            default: null
        },
        estado: {
            type: String,
            required: true,
            enum: ['activo', 'papelera', 'eliminado'],
            default: 'activo'
        },
        gridFsId: {//gridFsId almacena la referencia al contenido del archivo. no el contenido mismo
            type: mongoose.Schema.Types.ObjectId,
            required: true
        }
    },
    {
        collection: 'archivos',
        versionKey: false
    }
);

archivoSchema.index({
    propietarioId: 1,
    carpetaId: 1
});

archivoSchema.index({
    propietarioId: 1,
    estado: 1
});

archivoSchema.index(
    { gridFsId: 1 },
    { unique: true }
);

const Archivo = mongoose.model('Archivo', archivoSchema);

export default Archivo;