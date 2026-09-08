import { randomBytes, createCipheriv, createDecipheriv, timingSafeEqual, createHmac } from 'node:crypto';
import { AppError } from './errors.js';

export function keyring() {
  let keys;
  try { keys = JSON.parse(process.env.TOKEN_ENCRYPTION_KEYS || '{}'); } catch { throw new Error('TOKEN_ENCRYPTION_KEYS debe ser JSON válido.'); }
  const active = process.env.TOKEN_ENCRYPTION_ACTIVE_KEY;
  for (const [id,key] of Object.entries(keys)) if (!/^[a-zA-Z0-9_-]{1,24}$/.test(id) || typeof key !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(key) || Buffer.from(key,'base64').length !== 32) throw new Error('Cada clave de cifrado debe ser de 32 bytes en Base64.');
  if (!active || !keys[active]) throw new Error('Falta una clave de cifrado activa. Ejecutá npm run secrets.');
  return { keys, active };
}
export function encryptToken(value, owner) {
  if (!value) return undefined;
  const {keys,active} = keyring(), iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(keys[active],'base64'), iv);
  cipher.setAAD(Buffer.from('flowsell:token:' + owner));
  const bytes = Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return ['enc',active,iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),bytes.toString('base64url')].join('.');
}
export function decryptToken(value, owner) {
  if (!value?.startsWith('enc.')) throw new AppError(409,'Reconectá Mercado Libre o migrá los tokens antiguos.','TOKEN_MIGRATION_REQUIRED');
  try {
    const [prefix,id,iv,tag,bytes,...extra] = value.split('.');
    if (extra.length || prefix !== 'enc') throw new Error();
    const {keys} = keyring();
    const cipher = createDecipheriv('aes-256-gcm',Buffer.from(keys[id],'base64'),Buffer.from(iv,'base64url'));
    cipher.setAAD(Buffer.from('flowsell:token:' + owner)); cipher.setAuthTag(Buffer.from(tag,'base64url'));
    return Buffer.concat([cipher.update(Buffer.from(bytes,'base64url')),cipher.final()]).toString('utf8');
  } catch { throw new AppError(503,'No se pudo abrir la conexión cifrada de Mercado Libre.','TOKEN_DECRYPT_FAILED'); }
}
export function equalSecret(a,b) {
  const x=Buffer.from(String(a||'')), y=Buffer.from(String(b||''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x,y);
}
export function totpCode(secret, step) {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits='';
  for (const c of secret) { const n=alphabet.indexOf(c); if(n<0) throw new Error('TOTP inválido'); bits+=n.toString(2).padStart(5,'0'); }
  const key=Buffer.from((bits.match(/.{8}/g)||[]).map(b=>parseInt(b,2)));
  const counter=Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const h=createHmac('sha1',key).update(counter).digest(), offset=h.at(-1)&15;
  return String((h.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
export function verifyTotp(code,secret,now=Date.now()) {
  if(!/^\d{6}$/.test(code) || !secret) return null;
  const step=Math.floor(now/30000);
  for (const s of [step-1,step,step+1]) if(equalSecret(code,totpCode(secret,s))) return s;
  return null;
}
