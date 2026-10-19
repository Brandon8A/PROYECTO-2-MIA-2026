import mongoose from 'mongoose'

const conectarDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        const dbName = process.env.MONGODB_DB;

        if (!uri || !dbName) {
            throw new Error('Faltan las variables MONGODB_URI o MONGODB_DB en el archivo .env');
        }

        await mongoose.connect(uri, {dbName});

        console.log('MongoDB conectado correctamente');
        console.log(`Base de datos: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('Error al conectar con MongoDB:', error.message);
        throw error;
    }
};

export default conectarDB;
