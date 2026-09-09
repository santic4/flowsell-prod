import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
import {ZodError} from 'zod';
import {config,production,PLANS,legalReady,SUPPORT_PHONE} from '../core/config.js';
import {wrap,log} from '../core/errors.js';
import {rate} from '../core/runtime.js';
import {authStack,mountAuth,requireAuth,requireOperational,csrf} from './auth.js';
import {accountRouter,adminRouter,accountPayload} from './account.js';
import {operationsRouter} from './operations.js';
import {mountWebhook} from './webhook.js';

// Fábrica sin listen ni workers: las pruebas ejercitan las rutas reales.
export function createApp(deps) {
  const app=express();app.disable('x-powered-by');
  if(production)app.set('trust proxy',1);
  app.use(helmet({referrerPolicy:{policy:'no-referrer'},contentSecurityPolicy:{directives:{
    defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],
    fontSrc:["'self'",'data:'],imgSrc:["'self'",'data:','blob:','https://*.mlstatic.com',...(config.mock?['https://images.pexels.com']:[])],
    connectSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"],formAction:["'self'"],baseUri:["'self'"],
    upgradeInsecureRequests:production?[]:null,
  }},strictTransportSecurity:production?{maxAge:31536000,includeSubDomains:true}:false}));
  app.use(cors({origin:config.appUrl,credentials:true,methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','X-CSRF-Token']}));
  app.use((req,res,next)=>{req.requestId=randomUUID();res.set('X-Request-ID',req.requestId);if(req.path.startsWith('/api'))res.set('Cache-Control','no-store');next();});
  app.get('/api/health/live',(req,res)=>res.json({ok:true}));
  app.get('/api/health/ready',wrap(async(req,res)=>{
    let ready=false;try{ready=mongoose.connection.readyState===1&&await deps.redis.ping()==='PONG';}catch{}
    res.status(ready?200:503).json({ok:ready});
  }));
  app.use('/api',wrap(async(req,res,next)=>{await rate(deps.redis,'api:'+req.ip,600);next();}));
  app.use(express.json({limit:'16kb',strict:true}));
  app.use(express.urlencoded({extended:false,limit:'8kb',parameterLimit:20}));
  const {passport,sessions}=authStack(deps);
  app.use(sessions,passport.initialize(),passport.session());
  const api=express.Router();
  api.get('/public/config',(req,res)=>res.json({plans:Object.values(PLANS),legal:{...config.legal,ready:legalReady()},supportPhone:SUPPORT_PHONE}));
  mountAuth(api,passport,deps.redis);
  mountWebhook(api,deps);
  // No hay CRUD público de usuarios, tokens, jobs o mensajes ni endpoints de prueba.
  api.use(requireAuth,csrf,wrap(async(req,res,next)=>{await rate(deps.redis,'account-api:'+req.user._id,240);next();}));
  api.get('/users/me',wrap(async(req,res)=>res.json(await accountPayload(req.user))));
  api.use('/account',accountRouter(deps));
  api.use('/admin',adminRouter(deps));
  api.use(requireOperational,operationsRouter(deps));
  app.use('/api',api);
  app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint no encontrado.'}));
  const buildPath=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../public/build');
  app.use(express.static(buildPath,{index:false,maxAge:3600000,setHeaders(res,p){if(p.endsWith('.html'))res.set('Cache-Control','no-cache');}}));
  app.get('*',(req,res)=>res.set('Cache-Control','no-cache').sendFile(path.join(buildPath,'index.html')));
  app.use((error,req,res,next)=>{
    if(res.headersSent)return next(error);
    const invalid=error instanceof ZodError||['ValidationError','CastError','StrictModeError'].includes(error.name);
    const upload=error.name==='MulterError';
    const status=invalid?400:upload?413:error.type==='entity.too.large'?413:error instanceof SyntaxError?400:([400,401,402,403,404,409,413,422,429,502,503].includes(error.status)?error.status:500);
    if(status>=500)log('request_failed',{requestId:req.requestId,code:error.code?.startsWith('MELI_')?'MELI_ERROR':status});
    if(status===429)res.set('Retry-After','60');
    res.status(status).json({error:invalid?'Revisá los campos de la solicitud.':upload?'Máximo 5 imágenes JPG, PNG o WEBP de hasta 2 MB cada una.':status>=500?'No pudimos completar la operación. Intentá más tarde.':error.message||'Solicitud inválida.',code:typeof error.code==='string'?error.code:'REQUEST_ERROR',requestId:req.requestId});
  });
  return app;
}
