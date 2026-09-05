import { cert, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { clientEmail, privateKey, projectId, storageBucket } from './config.js';

if (!projectId || !clientEmail || !privateKey || !storageBucket) {
  throw new Error('Faltan variables de entorno para inicializar Firebase Storage.');
}

const serviceAccount = {
  projectId,
  clientEmail,
  privateKey,
};

const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  storageBucket,
});

const bucket = getStorage(firebaseApp).bucket();

export { bucket };
