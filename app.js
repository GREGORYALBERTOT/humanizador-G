// ~/humanizador-backend/app.js
require('dotenv').config(); // Carga las variables de entorno del archivo .env

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors'); // Importa el paquete cors

const app = express();
const port = process.env.PORT || 3000; // Puerto donde escuchará tu backend

// Configuración de la base de datos
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Middleware para parsear JSON en las peticiones
app.use(express.json());

// Configuración de CORS
app.use(cors({
    origin: '*', // En desarrollo, '*' permite cualquier origen.
                 // En producción, CAMBIA ESTO al dominio específico de tu frontend (ej: 'https://humanizador.com')
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware de autenticación (para rutas protegidas)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // El token viene como 'Bearer TOKEN'

    if (token == null) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Error de verificación de token:', err);
            return res.status(403).json({ message: 'Token inválido o expirado.' });
        }
        req.user = user; // Guarda la información del usuario del token en el objeto request
        next(); // Continúa con la siguiente función middleware o ruta
    });
};

// Límites de uso por tipo de plan
const PLAN_LIMITS = {
    free: {
        maxAttempts: 5,   // Por ejemplo, 5 intentos diarios
        maxWords: 1000    // Por ejemplo, 1000 palabras diarias
    },
    standard: {
        maxAttempts: 50,  // Límites mayores
        maxWords: 10000
    },
    premium: {
        maxAttempts: -1,  // -1 para ilimitado
        maxWords: -1      // -1 para ilimitado
    }
};


// Ruta para registro de usuario
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Correo electrónico y contraseña son requeridos.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await pool.query(
            'INSERT INTO users (email, password_hash, plan_type, daily_attempts, last_attempt_date, word_count_today, last_word_count_date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id, email, plan_type, daily_attempts, last_attempt_date, word_count_today, last_word_count_date',
            [email, password_hash, 'free', 0, new Date(), 0, new Date()] // Valores por defecto para nuevos usuarios
        );

        const newUser = result.rows[0];

        // Generar JWT
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'Registro exitoso.',
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                plan_type: newUser.plan_type,
                daily_attempts: newUser.daily_attempts,
                // Asegúrate de que las fechas se envíen en un formato compatible con JS Date
                last_attempt_date: new Date(newUser.last_attempt_date).toISOString(),
                word_count_today: newUser.word_count_today,
                last_word_count_date: new Date(newUser.last_word_count_date).toISOString()
            }
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        if (error.code === '23505') { // Código de error para violación de unicidad (email ya existe)
            return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }
        res.status(500).json({ message: 'Error interno del servidor al registrar.' });
    }
});

// Ruta para inicio de sesión
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Correo electrónico y contraseña son requeridos.' });
    }

    try {
        const result = await pool.query('SELECT id, email, password_hash, plan_type, daily_attempts, last_attempt_date, word_count_today, last_word_count_date FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Inicio de sesión exitoso.',
            token,
            user: {
                id: user.id,
                email: user.email,
                plan_type: user.plan_type,
                daily_attempts: user.daily_attempts,
                // Asegúrate de que las fechas se envíen en un formato compatible con JS Date
                last_attempt_date: new Date(user.last_attempt_date).toISOString(),
                word_count_today: user.word_count_today,
                last_word_count_date: new Date(user.last_word_count_date).toISOString()
            }
        });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ message: 'Error interno del servidor al iniciar sesión.' });
    }
});

// Ruta para humanizar texto (protegida)
app.post('/api/humanize', authenticateToken, async (req, res) => {
    const { originalText, wordCount } = req.body; // wordCount viene del frontend
    const userId = req.user.id; // ID del usuario desde el token JWT
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Establecer la hora a medianoche para comparación de fechas

    if (!originalText || typeof wordCount !== 'number' || wordCount <= 0) {
        return res.status(400).json({ message: 'Texto original y conteo de palabras válidos son requeridos.' });
    }

    try {
        // 1. Obtener la información más reciente del usuario
        const userResult = await pool.query(
            'SELECT plan_type, daily_attempts, last_attempt_date, word_count_today, last_word_count_date FROM users WHERE id = $1 FOR UPDATE', // FOR UPDATE para evitar race conditions
            [userId]
        );
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        let { plan_type, daily_attempts, last_attempt_date, word_count_today, last_word_count_date } = user;

        // Convertir las fechas de la DB a objetos Date y ajustar a medianoche
        const userLastAttemptDate = new Date(last_attempt_date);
        userLastAttemptDate.setHours(0, 0, 0, 0);

        const userLastWordCountDate = new Date(last_word_count_date);
        userLastWordCountDate.setHours(0, 0, 0, 0);

        // Reiniciar contadores si es un nuevo día para intentos
        if (userLastAttemptDate.getTime() < today.getTime()) {
            daily_attempts = 0;
            last_attempt_date = today;
        }

        // Reiniciar contadores si es un nuevo día para palabras
        if (userLastWordCountDate.getTime() < today.getTime()) {
            word_count_today = 0;
            last_word_count_date = today;
        }

        // 2. Verificar límites del plan
        const planLimits = PLAN_LIMITS[plan_type];
        if (!planLimits) {
            return res.status(500).json({ message: 'Tipo de plan desconocido.' });
        }

        // Verificar límite de intentos
        if (planLimits.maxAttempts !== -1 && daily_attempts >= planLimits.maxAttempts) {
            return res.status(403).json({ message: `Has alcanzado tu límite diario de ${planLimits.maxAttempts} intentos para el plan ${plan_type}.` });
        }

        // Verificar límite de palabras
        if (planLimits.maxWords !== -1 && (word_count_today + wordCount) > planLimits.maxWords) {
            const remainingWords = planLimits.maxWords - word_count_today;
            return res.status(403).json({ message: `El texto excede tu límite diario de palabras. Solo puedes humanizar ${remainingWords} palabras más (tienes ${word_count_today} de ${planLimits.maxWords}).` });
        }

        // 3. Proceso de humanización (esto es un placeholder, aquí va tu lógica real)
        // Reemplaza esto con tu lógica de humanización real
        let humanizedText = originalText; // Default: si no hay lógica, devuelve el mismo texto
        // Aquí puedes integrar tu lógica de Python o IA
        // const { spawn } = require('child_process');
        // const pythonProcess = spawn('python', ['your_script.py', originalText]);
        // humanizedText = await new Promise((resolve, reject) => { /* ... */ });

        // Ejemplo de lógica simple de "humanización" para prueba:
        humanizedText = `"${originalText}" ha sido humanizado. ¡Suena más natural ahora!`;


        // 4. Actualizar contadores del usuario y registrar la humanización
        daily_attempts++;
        word_count_today += finalWordCount; // finalWordCount es el conteo del texto original procesado

        await pool.query(
            'UPDATE users SET daily_attempts = $1, last_attempt_date = $2, word_count_today = $3, last_word_count_date = $4 WHERE id = $5',
            [daily_attempts, last_attempt_date, word_count_today, last_word_count_date, userId]
        );

        // 5. Registrar la humanización en la tabla 'humanizations'
        await pool.query(
            'INSERT INTO humanizations (user_id, word_count, plan_at_time) VALUES ($1, $2, $3)',
            [userId, finalWordCount, plan_type]
        );

        // 6. Enviar la respuesta al frontend
        res.status(200).json({
            message: 'Texto humanizado con éxito.',
            humanizedText: humanizedText,
            updatedUserStats: { // Enviar stats actualizados al frontend
                plan_type: plan_type,
                daily_attempts: daily_attempts,
                // Asegúrate de que las fechas se envíen en un formato compatible con JS Date
                last_attempt_date: new Date(last_attempt_date).toISOString(),
                word_count_today: word_count_today,
                last_word_count_date: new Date(last_word_count_date).toISOString()
            }
        });

    } catch (error) {
        console.error('Error al humanizar texto:', error);
        res.status(500).json({ message: 'Error interno del servidor al humanizar texto.' });
    }
});


// Conexión a la base de datos y inicio del servidor
pool.connect()
    .then(() => {
        console.log('Conectado a la base de datos PostgreSQL.');
        app.listen(port, () => {
            console.log(`Servidor Node.js escuchando en el puerto ${port}.`);
        });
    })
    .catch(err => {
        console.error('Error al conectar a la base de datos:', err.message);
        console.error('Verifica tu archivo .env y que PostgreSQL esté corriendo.');
        process.exit(1); // Sale de la aplicación si no puede conectar a la DB
    });