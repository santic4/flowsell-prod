import mongoose from 'mongoose';
import {config,validateConfig} from './core/config.js';
import {keyring} from './core/crypto.js';
import {createRuntime} from './core/runtime.js';
import {Meli} from './core/meli.js';
import {MediaStore} from './core/media.js';
import {startWorkers} from './core/jobs.js';
import {createApp} from './http/app.js';
import {log} from './core/errors.js';

try {
  validateConfig();keyring();
  await mongoose.connect(config.mongoUrl,{serverSelectionTimeoutMS:10000,autoIndex:false});
  for(const model of Object.values(mongoose.models))await model.createIndexes();
  const runtime=createRuntime();
  if(runtime.redis.status==='wait')await runtime.redis.connect();
  await runtime.redis.ping();
  const deps={...runtime,meli:new Meli(runtime.redis),media:new MediaStore()};
  const workers=config.workers?await startWorkers(deps):null;
  const app=createApp(deps);
  const server=app.listen(process.env.PORT||8080,()=>log('server_ready'));
  server.requestTimeout=30000;server.headersTimeout=15000;server.keepAliveTimeout=5000;
  const shutdown=async()=>{
    server.close();await workers?.close();await runtime.close();await mongoose.disconnect();process.exit(0);
  };
  process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
}catch(error){
  log('startup_failed',{hint:error.name==='Error'&&!error.code?String(error.message).replace(/(?:mongodb(?:\+srv)?|rediss?):\/\/\S+/gi,'[URL omitida]'):'Revisá MONGO_URI, REDIS_URL, claves y conexión privada.'});
  process.exit(1);
}
