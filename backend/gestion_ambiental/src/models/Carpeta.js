
const mongoose = require('mongoose');

const carpetaSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: true,
            trim: true,
            minlength: 1
        },
        propietarioId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario',
            required: true,
            immutable: true
        },
        carpetaPadreId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Carpeta',
            default: null,
            validate: {
                validator: function (valor){
                    return valor === null || valor instanceof mongoose.Types.ObjectId
                },
                message: 'CarpetaPadreId debe ser un ObjectiID valido o null'
            }
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
        estado: {
            type: String,
            required: true,
            enum: ['activa', 'papelera', 'eliminada'],
            default: 'activa'
        }
    },
    {
        collection: 'carpetas',
        versionKey: false
    }
);

// Conservamos los índices definidos en MongoDB.
carpetaSchema.index({
    propietarioId: 1,
    carpetaPadreId: 1
});

carpetaSchema.index({
    estado: 1
});

module.exports = mongoose.model('Carpeta', carpetaSchema);
