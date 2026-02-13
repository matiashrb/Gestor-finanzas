    import express from 'express';
    import cors from 'cors';
    import fs from 'node:fs/promises'; // Para modo local
    import mongoose from 'mongoose';   // Para modo nube
    import dotenv from 'dotenv';

    dotenv.config();

    const app = express();
    const PORT = process.env.PORT || 4000;
    const DB_FILE = './database.json';

    app.use(cors());
    app.use(express.json());

    // VARIABLE GLOBAL PARA SABER QUÉ USAR
    let USE_MONGO = false;

    // --- DEFINIR MODELO DE MONGO (Esquema) ---
    const TransactionSchema = new mongoose.Schema({
    id: Number, // Usamos el mismo ID numérico que en local para no romper nada
    text: String,
    amount: Number
    });
    const TransactionModel = mongoose.model('Transaction', TransactionSchema);

    // --- INTENTO DE CONEXIÓN ---
    const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        console.log('⚠️ No hay MONGO_URI definida. Usando modo LOCAL (Archivo JSON).');
        return;
    }
    
    try {
        await mongoose.connect(process.env.MONGO_URI);
        USE_MONGO = true;
        console.log('✅ Conectado a MongoDB Atlas (Modo NUBE)');
    } catch (error) {
        console.log('❌ Error conectando a Mongo. Usando modo LOCAL (Archivo JSON).');
        // Aquí no detenemos el servidor, simplemente USE_MONGO se queda en false
    }
    };

    // --- FUNCIONES AUXILIARES (ADAPTADORES) ---

    // LEER
    const getData = async () => {
    if (USE_MONGO) {
        // Si hay mongo, pedimos a la base de datos, excluyendo el _id interno de mongo para no ensuciar
        const data = await TransactionModel.find({}, { _id: 0, __v: 0 });
        return data;
    } else {
        // Si no, leemos archivo
        try {
        const data = await fs.readFile(DB_FILE, 'utf-8');
        return JSON.parse(data);
        } catch {
        return []; // Si no existe el archivo, devolvemos array vacío
        }
    }
    };

    // GUARDAR (CREAR)
    const saveData = async (newTransaction) => {
    if (USE_MONGO) {
        await TransactionModel.create(newTransaction);
    } else {
        let currentData = await getData();
        currentData.push(newTransaction);
        await fs.writeFile(DB_FILE, JSON.stringify(currentData, null, 2));
    }
    };

    // BORRAR
    const deleteData = async (id) => {
    if (USE_MONGO) {
        await TransactionModel.deleteOne({ id: id });
    } else {
        let currentData = await getData();
        const filtered = currentData.filter(t => t.id !== Number(id));
        await fs.writeFile(DB_FILE, JSON.stringify(filtered, null, 2));
    }
    };

    // ACTUALIZAR (PUT)
    const updateData = async (id, updatedFields) => {
    if (USE_MONGO) {
        // findOneAndUpdate busca por id y actualiza
        await TransactionModel.findOneAndUpdate({ id: id }, updatedFields);
        return { id, ...updatedFields };
    } else {
        let currentData = await getData();
        const index = currentData.findIndex(t => t.id === Number(id));
        if (index !== -1) {
        currentData[index] = { ...currentData[index], ...updatedFields };
        await fs.writeFile(DB_FILE, JSON.stringify(currentData, null, 2));
        return currentData[index];
        }
        return null;
    }
    };


    // --- RUTAS (Endpoints) ---

    // GET
    app.get('/transactions', async (req, res) => {
    const data = await getData();
    res.json(data);
    });

    // POST
    app.post('/transactions', async (req, res) => {
    const { text, amount } = req.body;
    const newTransaction = { id: Date.now(), text, amount: Number(amount) };
    
    await saveData(newTransaction);
    res.json(newTransaction);
    });

    // DELETE
    app.delete('/transactions/:id', async (req, res) => {
    await deleteData(Number(req.params.id));
    res.json({ success: true });
    });

    // PUT
    app.put('/transactions/:id', async (req, res) => {
    const { text, amount } = req.body;
    const updated = await updateData(Number(req.params.id), { text, amount: Number(amount) });
    
    if (updated) res.json(updated);
    else res.status(404).json({ error: 'No encontrado' });
    });

    // --- INICIALIZAR ---
    connectDB().then(() => {
    // Inicializar archivo local si no existe y no estamos en Mongo
    if (!USE_MONGO) {
        fs.access(DB_FILE).catch(() => fs.writeFile(DB_FILE, '[]'));
    }

    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        console.log(`MODO ACTUAL: ${USE_MONGO ? '☁️ NUBE (MongoDB)' : '💻 LOCAL (Archivo JSON)'}`);
    });
    });