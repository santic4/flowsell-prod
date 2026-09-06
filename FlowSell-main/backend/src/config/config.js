import dotenv from 'dotenv';

dotenv.config();

export const MONGO_URI = process.env.MONGO_URI

export const REDIRECT_URI = process.env.REDIRECT_URI

export const CLIENT_SECRET = process.env.CLIENT_SECRET

export const CLIENT_ID = process.env.CLIENT_ID

export const PORT = process.env.PORT

export const CLIENT_ID_PERMITIDO = process.env.CLIENT_ID_PERMITIDO

export const REACT_APP_PORT_REDIS = process.env.REACT_APP_PORT_REDIS

export const REACT_APP_HOST_REDIS = process.env.REACT_APP_HOST_REDIS


export const REACT_APP_PORT_REDIS_TRACKING = process.env.REACT_APP_PORT_REDIS_TRACKING

export const REACT_APP_HOST_REDIS_TRACKING = process.env.REACT_APP_HOST_REDIS_TRACKING

export const REACT_APP_REDIS_PASSWORD_TRACKING = process.env.REACT_APP_REDIS_PASSWORD_TRACKING

export const REDIS_URL = process.env.REDIS_URL

export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
export const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'flowsell/templates';

export const SESSION_SECRET = process.env.SESSION_SECRET;

export const APP_URL = (process.env.APP_URL || 'https://flowsell-8woz.onrender.com').replace(/\/$/, '');

export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
