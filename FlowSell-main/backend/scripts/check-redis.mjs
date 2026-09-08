import 'dotenv/config';
import Redis from 'ioredis';
import {randomUUID} from 'node:crypto';
if(!process.env.REDIS_URL)throw new Error('Falta REDIS_URL en el backend.');
const redis=new Redis(process.env.REDIS_URL,{lazyConnect:true,connectTimeout:8000,maxRetriesPerRequest:1,enableOfflineQueue:false,retryStrategy:()=>null});
redis.on('error',()=>{});
const key='fs:diagnostic:'+randomUUID();
try {
  await redis.connect();
  if(await redis.ping()!=='PONG')throw new Error();
  await redis.set(key,'0','EX',30);
  if(await redis.incr(key)!==1)throw new Error();
  const info=await redis.info('memory');
  console.log('Conexión, autenticación, escritura temporal y lectura: OK.');
  const policy=info.match(/maxmemory_policy:([^\r\n]+)/)?.[1];
  console.log('Política de memoria: '+(policy||'consultar en Render'));
  if(policy&&policy!=='noeviction'){console.error('Corregí Maxmemory Policy a noeviction antes de operar.');process.exitCode=1;}
  const u=new URL(process.env.REDIS_URL);
  console.log('Credenciales en URL: '+(u.password?'sí':'no: habilitá autenticación interna para producción'));
  console.log('TLS según URL: '+(u.protocol==='rediss:'?'sí':'no: usar únicamente la red privada de Render o localhost'));
}catch{console.error('No se pudo verificar Redis. Revisá región, URL, autenticación y permisos de red. La URL no se imprime.');process.exitCode=1;}
finally{await redis.del(key).catch(()=>{});redis.disconnect();}
