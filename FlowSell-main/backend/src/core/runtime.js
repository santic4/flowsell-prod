import Redis from 'ioredis';
import {Queue} from 'bullmq';
import {randomUUID,createHash} from 'node:crypto';
import {config} from './config.js';
import {AppError,ensure,log} from './errors.js';
import {Usage} from '../models/Security.js';

export function createRuntime() {
  const redis=new Redis(config.redisUrl,{maxRetriesPerRequest:1,enableOfflineQueue:false,lazyConnect:true,connectTimeout:8000});
  redis.on('error',()=>log('redis_unavailable'));
  const queueRedis=new Redis(config.redisUrl,{maxRetriesPerRequest:null,connectTimeout:8000,lazyConnect:true});
  queueRedis.on('error',()=>log('queue_unavailable'));
  const queue=new Queue('flowsell-v2',{connection:queueRedis,defaultJobOptions:{attempts:3,backoff:{type:'exponential',delay:5000},removeOnComplete:{age:86400,count:1000},removeOnFail:{age:7*86400,count:1000}}});
  return {redis,queueRedis,queue,async close(){await queue.close();await Promise.all([redis.quit(),queueRedis.quit()]);}};
}
export const hashKey=value=>createHash('sha256').update(String(value)).digest('hex').slice(0,32);
export async function rate(redis,key,limit,seconds=60) {
  let n;
  try { n=await redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n",1,'fs:rate:'+hashKey(key),seconds); }
  catch { throw new AppError(503,'El servicio está temporalmente ocupado. Intentá más tarde.','REDIS_UNAVAILABLE'); }
  ensure(n<=limit,429,'Alcanzaste el límite de solicitudes. Esperá un momento.','RATE_LIMIT');
}
export async function withLock(redis,key,fn) {
  const lockKey='fs:lock:'+hashKey(key), token=randomUUID();
  let got;
  try {got=await redis.set(lockKey,token,'PX',60000,'NX');} catch {throw new AppError(503,'No se pudo asegurar la operación. Intentá más tarde.','REDIS_UNAVAILABLE');}
  ensure(got,409,'Hay otra operación en curso. Intentá de nuevo en unos segundos.','OPERATION_BUSY');
  let lost=false;
  const timer=setInterval(async()=>{
    try {if(!await redis.eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('PEXPIRE',KEYS[1],60000) else return 0 end",1,lockKey,token)) lost=true;} catch {lost=true;}
  },15000); timer.unref();
  const assertLease=async()=>{ensure(!lost && await redis.get(lockKey)===token,503,'La operación perdió su reserva. Reintentá.','LOCK_LOST');};
  try { return await fn(assertLease); } finally {
    clearInterval(timer);
    await redis.eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end",1,lockKey,token).catch(()=>{});
  }
}
export const monthKey=()=>new Date().toISOString().slice(0,7);
export async function consume(owner,field,limit,amount=1) {
  ensure(['messages','campaigns','searches','mediaBytes','uploads'].includes(field) && Number.isInteger(amount) && amount>0,500,'Contador inválido.');
  const where={owner,month:monthKey()};
  try {await Usage.updateOne(where,{$setOnInsert:where},{upsert:true});} catch(e){if(e.code!==11000) throw e;}
  const result=await Usage.findOneAndUpdate({...where,[field]:{$lte:limit-amount}},{$inc:{[field]:amount}},{new:true});
  ensure(result,402,'Alcanzaste el cupo mensual de tu plan. Podés consultar un cambio en Mi plan.','PLAN_LIMIT');
  return result;
}
