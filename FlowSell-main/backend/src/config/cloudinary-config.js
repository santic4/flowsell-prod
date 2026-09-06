import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_FOLDER,
} from './config.js';

const missingVariables = [
  ['CLOUDINARY_CLOUD_NAME', CLOUDINARY_CLOUD_NAME],
  ['CLOUDINARY_API_KEY', CLOUDINARY_API_KEY],
  ['CLOUDINARY_API_SECRET', CLOUDINARY_API_SECRET],
]
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missingVariables.length) {
  throw new Error(`Faltan variables de entorno de Cloudinary: ${missingVariables.join(', ')}.`);
}

const normalizedFolder = String(CLOUDINARY_FOLDER || '')
  .trim()
  .replace(/^\/+|\/+$/g, '');

if (!normalizedFolder || !/^[a-zA-Z0-9_/-]+$/.test(normalizedFolder) || normalizedFolder.includes('..')) {
  throw new Error('CLOUDINARY_FOLDER contiene una ruta inválida.');
}

export const cloudinaryConfig = Object.freeze({
  cloudName: CLOUDINARY_CLOUD_NAME,
  apiKey: CLOUDINARY_API_KEY,
  apiSecret: CLOUDINARY_API_SECRET,
  folder: normalizedFolder,
  apiBaseUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}`,
  authorization: `Basic ${Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64')}`,
});
