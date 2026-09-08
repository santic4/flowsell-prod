import mongoose from 'mongoose';
import {config,validateConfig} from './core/config.js';
import {keyring} from './core/crypto.js';
import {createRuntime} from './core/runtime.js';
import {Meli} from './core/meli.js';
import {MediaStore} from './core/media.js';
import {startWorkers} from './core/jobs.js';
import {log} from './core/errors.js';
try {
validateConfig();keyring();
await mongoose.connect(config.mongoUrl,{serverSelectionTimeoutMS:10000,autoIndex:false});
const runtime=createRuntime();if(runtime.redis.status==='wait')await runtime.redis.connect();await runtime.redis.ping();
const workers=await startWorkers({...runtime,meli:new Meli(runtime.redis),media:new MediaStore()});
log('worker_ready');
const close=async()=>{await workers.close();await runtime.close();await mongoose.disconnect();process.exit(0);};
process.once('SIGTERM',close);process.once('SIGINT',close);
} catch {
  log('worker_startup_failed',{hint:'Revisá las variables requeridas, claves y conexiones. Ver CONFIGURACION.md.'});
  process.exit(1);
}
