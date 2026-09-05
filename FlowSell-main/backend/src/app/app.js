import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import cookieParser from 'cookie-parser';
import apiRouter from '../router/apiRouter.js';
import "../utils/queue.js";
import "../workers/worker-tracking.js";
import { sessions } from '../middlewares/sessions.js';
import passport from 'passport';
import '../middlewares/passport.js'
import { APP_URL } from '../config/config.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(helmet());

// -----------------------------------------------------------------------------
// CORS
// https://flowsell-8woz.onrender.com
// http://localhost:3000
// -----------------------------------------------------------------------------
const allowedOrigins = new Set([APP_URL, 'http://localhost:3000']);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido por CORS.'));
  },
  credentials: true,
}));

// -----------------------------------------------------------------------------
// SESIONES (MongoDB) y Cookies
// -----------------------------------------------------------------------------
app.use(cookieParser());

app.use(sessions);

// -----------------------------------------------------------------------------
// PASSPORT
// -----------------------------------------------------------------------------
app.use(passport.initialize());
app.use(passport.session());


process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
});

// -----------------------------------------------------------------------------
// Middleware de CSP
// -----------------------------------------------------------------------------
app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' http: https: data:",
        "connect-src 'self' https://api.paypal.com https://api.mercadopago.com"
      ].join('; ')
    );
    next();
});

// -----------------------------------------------------------------------------
// Conecta DB
// -----------------------------------------------------------------------------
connectDB();

// -----------------------------------------------------------------------------
// Parse JSON
// -----------------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api', apiRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const uploadError = ['LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'].includes(error.code);
  const status = uploadError ? 400 : Number(error.status) || 500;
  if (status >= 500) console.error('Error de API:', error);
  return res.status(status).json({
    error: uploadError
      ? 'Los adjuntos deben ser imágenes de hasta 5 MB (máximo 20 archivos).'
      : status >= 500 ? 'Ocurrió un error inesperado. Intentá nuevamente.' : error.message,
  });
});

// Sirve todo desde public/build
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const buildPath  = path.join(__dirname, '..', '..', 'public', 'build');

app.use(express.static(buildPath));

// Catch‑all para React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
})

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
