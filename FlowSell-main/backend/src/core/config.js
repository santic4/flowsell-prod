import 'dotenv/config';

export const LEGAL_VERSION = '2026-09-06';
export const SUPPORT_PHONE = '5492342510893';
export const production = process.env.NODE_ENV === 'production';
export const config = {
  appUrl: (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  apiUrl: (process.env.API_URL || process.env.APP_URL || 'http://localhost:8080').replace(/\/$/, ''),
  mongoUrl: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL,
  sessionSecret: process.env.SESSION_SECRET,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callback: process.env.REDIRECT_URI,
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  adminIds: (process.env.ADMIN_MELI_IDS || '').split(',').map(s => s.trim()).filter(Boolean),
  adminTotpSecret: process.env.ADMIN_TOTP_SECRET || '',
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudKey: process.env.CLOUDINARY_API_KEY,
  cloudSecret: process.env.CLOUDINARY_API_SECRET,
  cloudFolder: process.env.CLOUDINARY_FOLDER || 'flowsell/templates',
  workers: process.env.RUN_WORKERS !== 'false',
  legal: {
    version: LEGAL_VERSION,
    name: process.env.LEGAL_NAME || '',
    taxId: process.env.LEGAL_TAX_ID || '',
    address: process.env.LEGAL_ADDRESS || '',
    email: process.env.LEGAL_EMAIL || '',
    regions: process.env.DATA_REGIONS || '',
    ready: process.env.LEGAL_READY === 'true',
  },
};
export const legalReady = () => config.legal.ready && ['name','address','email','regions'].every(k => Boolean(config.legal[k]));
export function validateConfig() {
  const required = ['mongoUrl','redisUrl','sessionSecret','clientId','clientSecret','callback','cloudName','cloudKey','cloudSecret'];
  const missing = required.filter(k => !config[k]);
  if (missing.length) throw new Error('Configuración faltante: ' + missing.join(', ') + '. Ver CONFIGURACION.md.');
  if (config.sessionSecret.length < 48 || config.webhookSecret.length < 48) throw new Error('SESSION_SECRET y WEBHOOK_SECRET deben tener al menos 48 caracteres aleatorios.');
  if (!/^rediss?:\/\//.test(config.redisUrl)) throw new Error('REDIS_URL debe ser una URL redis:// o rediss:// válida.');
  const redis=new URL(config.redisUrl);
  if(production && !redis.password)throw new Error('Redis en producción requiere autenticación. Usá la URL interna autenticada de Render.');
  if(production && redis.protocol==='redis:' && redis.hostname.includes('.')&&!redis.hostname.endsWith('.internal'))throw new Error('Para Redis fuera de la red privada usá rediss:// con TLS.');
  if(production && (/([?&])(tls|ssl)=false/i.test(config.mongoUrl)||(!config.mongoUrl.startsWith('mongodb+srv://')&&!/[?&](tls|ssl)=true/i.test(config.mongoUrl))))throw new Error('MongoDB en producción requiere TLS: mongodb+srv:// o tls=true.');
  if(Object.values(PLANS).some(p=>!Number.isFinite(p.price)||p.price<0))throw new Error('Los precios de planes deben ser números válidos.');
  const globalMedia=Number(process.env.CLOUDINARY_GLOBAL_MONTHLY_MB||100000);
  if(!Number.isSafeInteger(globalMedia)||globalMedia<1||globalMedia>10000000)throw new Error('CLOUDINARY_GLOBAL_MONTHLY_MB debe ser un entero entre 1 y 10000000.');
  if (config.adminIds.some(id => !/^\d+$/.test(id))) throw new Error('ADMIN_MELI_IDS debe contener IDs numéricos separados por comas.');
  if (config.adminIds.length && !/^[A-Z2-7]{32,}$/.test(config.adminTotpSecret)) throw new Error('Configurá ADMIN_TOTP_SECRET para proteger el panel.');
  if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(config.cloudFolder)) throw new Error('CLOUDINARY_FOLDER no válida.');
  if (production && (!config.appUrl.startsWith('https://') || new URL(config.callback).origin !== config.appUrl || config.callback !== config.appUrl + '/api/auth/callback')) throw new Error('En producción APP_URL y REDIRECT_URI deben coincidir y usar HTTPS.');
}
const MB = 1024 * 1024;
export const PLANS = Object.freeze({
  free: { id:'free', name:'Gratuito', price:0, currency:'USD', templates:3, flows:3, messages:100, campaigns:0, recipients:0, storageBytes:25*MB, statisticsDays:7, export:false, delayed:false },
  premium: { id:'premium', name:'Premium', price:Number(process.env.PREMIUM_PRICE_USD || 19), currency:'USD', templates:50, flows:30, messages:3000, campaigns:5, recipients:500, storageBytes:250*MB, statisticsDays:90, export:true, delayed:true },
  plus: { id:'plus', name:'Plus', price:Number(process.env.PLUS_PRICE_USD || 39), currency:'USD', templates:200, flows:150, messages:10000, campaigns:20, recipients:2000, storageBytes:1024*MB, statisticsDays:366, export:true, delayed:true },
});
export const planFor = user => PLANS[user?.plan] && (!user.planExpiresAt || new Date(user.planExpiresAt) > new Date()) ? PLANS[user.plan] : PLANS.free;
export const isAdmin = user => Boolean(user && config.adminIds.includes(String(user.meliId)));
export const consentCurrent = user => user?.legal?.privacyVersion === LEGAL_VERSION && user?.legal?.termsVersion === LEGAL_VERSION;
