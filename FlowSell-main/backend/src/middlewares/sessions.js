import { COOKIE_DOMAIN, MONGO_URI, SESSION_SECRET } from '../config/config.js';
import session from 'express-session';
import connectMongo from 'connect-mongo';

const store = connectMongo.create({
  mongoUrl: MONGO_URI,
  ttl: 60 * 60 * 24,
});

if (!SESSION_SECRET) {
  throw new Error('La variable SESSION_SECRET no está definida.');
}

export const sessions = session({
  name: 'flowsell.sid',
  store,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    maxAge: 60 * 60 * 24 * 1000
  }
});
