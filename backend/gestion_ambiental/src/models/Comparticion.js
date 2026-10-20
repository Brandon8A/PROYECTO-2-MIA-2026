
import mongoose from 'mongoose';

const comparticionSchema = new mongoose.Schema(
    {
        propietarioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario',
            required: true
        },
        usuarioReceptorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario',
            required: true
        },
        tipoRecurso: {
            type: String,
            required: true,
            enum: ['archivo', 'carpeta']
        },
        // Los campos admiten null, según el tipo de recurso.
        archivoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Archivo',
            default: null
        },
        carpetaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Carpeta',
            default: null
        },
        tipoPermiso: {
            type: String,
            required: true,
            enum: ['lectura', 'edicion']
        },
        fechaComparticion: {
            type: Date,
            required: true,
            default: Date.now
        },
        fechaModificacion: {
            type: Date,
            required: true,
            default: Date.now
        },
        estado: {
            type: String,
            required: true,
            enum: ['activa', 'revocada'],
            default: 'activa'
        }
    },
    {
        collection: 'comparticiones',
        versionKey: false
    }
);

// Impide combinaciones incorrectas antes de guardar.
comparticionSchema.pre('validate', function () {
    if (this.tipoRecurso === 'archivo') {
        if (!this.archivoId || this.carpetaId != null) {
            this.invalidate(
                'archivoId',
                'Una compartición de archivo requiere archivoId y carpetaId null.'
            );
        }
    } else if (this.tipoRecurso === 'carpeta') {
        if (!this.carpetaId || this.archivoId != null) {
            this.invalidate(
                'carpetaId',
                'Una compartición de carpeta requiere carpetaId y archivoId null.'
            );
        }
    }
});

comparticionSchema.index({
    usuarioReceptorId: 1,
    estado: 1
});

comparticionSchema.index({
    propietarioId: 1,
    estado: 1
});

comparticionSchema.index(
    {
        propietarioId: 1,
        usuarioReceptorId: 1,
        tipoRecurso: 1,
        archivoId: 1,
        carpetaId: 1
    },
    {
        unique: true,
        partialFilterExpression: { estado: 'activa' }
    }
);

const Comparticion = mongoose.model(
    'Comparticion',
    comparticionSchema
);

export default Comparticion;
