const mongoose = require('mongoose')

//Definiendo la estructura y validaciones de los documentos de almacenamiento
const almacenamientoSchema = new mongoose.Schema({
    capacidad: {
        type: Number,
        required: true,
        min: 0//Impide que mongoose acepte valores negativos 
    },
    utilizado: {
        type: Number,
        required: true,
        min: 0
    },
    disponible: {
        type: Number,
        required: true,
        min: 0
    }

}, {
    _id: false
})

//Definiendo la estructura y validaciones de los documentos usuario
const usuarioSchema = new mongoose.Schema({
    nombres:{
        type: String,
        required: true,
        trim: true
    },
    apellidos: {
        type: String,
        required: true,
        trim: true
    },
    correo: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    passwordHash: {
        type: String,
        required: true,
        select: false//Indica que este campo no se incluira en las consultas
    },
    rol: {
        type:String,
        required: true,
        enum: ['admin', 'usuario'],//Valores permitidos para el campo rol
        default: 'usuario'
    },
    estado: {
        type: String,
        required: true,
        enum: ['activo', 'inactivo'],//Valores permitidos para el campo estado
        default: 'activo'
    },
    almacenamiento: {
        type: almacenamientoSchema,
        required: true
    },
    fechaCreacion: {
        type: Date,
        required: true,
        default: Date.now//Genera la fecha de creacion automaticamente al crear el documento
    }
},{
    collection: 'usuarios',//Indicando explicitamente la coleccion existente que se utilizara
    versionKey: false
})

usuarioSchema.index({ correo: 1}, { unique: true})//'unique: true' indica que el campo correo debe ser unico

module.exports = mongoose.model('Usuario', usuarioSchema)