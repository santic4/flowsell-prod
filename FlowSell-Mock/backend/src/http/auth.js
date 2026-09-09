import {Passport} from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import {randomBytes} from 'node:crypto';
import User from '../models/User.js';
import {config,production,legalReady,isAdmin,consentCurrent} from '../core/config.js';
import {encryptToken,equalSecret} from '../core/crypto.js';
import {meliRequest} from '../core/meli.js';
import {ensure,wrap,log} from '../core/errors.js';
import {rate} from '../core/runtime.js';

export const cookieOptions={httpOnly:true,secure:production,sameSite:'lax',path:'/'};
export function authStack({store,redis}) {
  const passport=new Passport();
  const sessions=session({name:'flowsell.sid',secret:config.sessionSecret,store:store||MongoStore.create({mongoUrl:config.mongoUrl,ttl:86400,autoRemove:'native',touchAfter:300}),resave:false,saveUninitialized:false,rolling:true,cookie:{...cookieOptions,maxAge:86400000}});
  passport.serializeUser((user,done)=>done(null,{id:String(user._id),version:user.sessionVersion||0}));
  passport.deserializeUser(async(identity,done)=>{
    try {
      if(!identity?.id) return done(null,false); // sesiones anteriores se invalidan en la migración
      const user=await User.findOne({_id:identity.id,sessionVersion:identity.version||0,status:{$ne:'deleting'}});
      if(!user)log('session_identity_unavailable');
      done(null,user||false);
    } catch(e){done(e);}
  });
  passport.use('meli',new OAuth2Strategy({
    authorizationURL:'https://auth.mercadolibre.com.ar/authorization',tokenURL:'https://api.mercadolibre.com/oauth/token',
    clientID:config.clientId||'unconfigured',clientSecret:config.clientSecret||'unconfigured',callbackURL:config.callback,
    state:true,...(process.env.MELI_PKCE==='true'?{pkce:'S256'}:{}),
  },async(accessToken,refreshToken,params,profile,done)=>{
    try {
      const data=await meliRequest('/users/me',accessToken);
      ensure(/^\d+$/.test(String(data.id)),502,'Perfil inválido.');
      const existing=await User.findOne({meliId:String(data.id)});
      ensure(existing?.status!=='deleting',409,'La eliminación de la cuenta sigue en curso.');
      ensure(!production||config.mock||legalReady()||isAdmin({meliId:data.id}),503,'Las altas están temporalmente suspendidas mientras se completa la información legal.','LEGAL_NOT_READY');
      // $setOnInsert no actualiza documentos de la versión anterior. Persistir el
      // valor ausente antes de serializar evita perder la sesión al volver de OAuth.
      // Nunca restablecer un contador existente: protege la revocación de sesiones.
      await User.updateOne({meliId:String(data.id),sessionVersion:{$exists:false}},{$set:{sessionVersion:0}});
      const user=await User.findOneAndUpdate({meliId:String(data.id)},{$set:{
        nickname:String(data.nickname||'').slice(0,100),email:String(data.email||'').slice(0,254),
        accessToken:encryptToken(accessToken,data.id),refreshToken:encryptToken(refreshToken,data.id),
        expiresAt:new Date(Date.now()+Number(params.expires_in||21600)*1000),lastUpdated:new Date(),status:'active',
      },$setOnInsert:{plan:'free',sessionVersion:0}},{upsert:true,new:true});
      done(null,user);
    } catch(e){done(e);}
  }));
  return {passport,sessions};
}
export const requireAuth=wrap(async(req,res,next)=>{
  ensure(req.user,401,'Iniciá sesión para continuar.','AUTH_REQUIRED');
  ensure(!req.session.authAt || Date.now()-req.session.authAt<7*86400000,401,'Tu sesión venció. Volvé a ingresar.','SESSION_EXPIRED');
  next();
});
export const requireOperational=wrap(async(req,res,next)=>{
  if(config.mock)return next();
  ensure(req.user.status!=='disconnected',409,'Reconectá Mercado Libre desde Mi cuenta.','RECONNECT');
  ensure(consentCurrent(req.user),403,'Leé y aceptá los documentos vigentes desde Mi cuenta.','CONSENT_REQUIRED');
  ensure(!production||legalReady(),503,'La operación está pausada mientras se completa la información legal.');
  next();
});
export const csrf=wrap(async(req,res,next)=>{
  if(['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin=req.get('origin');
  ensure(origin===config.appUrl,403,'Origen de solicitud no permitido.','CSRF');
  ensure(equalSecret(req.get('x-csrf-token'),req.session.csrf),403,'La sesión de seguridad venció. Recargá la página.','CSRF');
  next();
});
export function mountAuth(router,passport,redis) {
  router.get('/auth/csrf',wrap(async(req,res)=>{
    await rate(redis,'csrf:'+req.ip,60);
    req.session.csrf ||= randomBytes(32).toString('hex');
    res.json({csrfToken:req.session.csrf});
  }));
  router.get('/auth/check',(req,res)=>res.json({isAuthenticated:Boolean(req.user),authenticated:Boolean(req.user)}));
  router.get('/auth/login',wrap(async(req,res,next)=>{await rate(redis,'login:'+req.ip,12,300);req.session.oauthStartedAt=Date.now();next();}),passport.authenticate('meli'));
  router.get('/auth/callback',wrap(async(req,res,next)=>{await rate(redis,'callback:'+req.ip,20,300);if(!req.session.oauthStartedAt||Date.now()-req.session.oauthStartedAt>600000)return res.redirect(config.appUrl+'/login?error=oauth');next();}),(req,res,next)=>{
    passport.authenticate('meli',(err,user)=>{
      if(err||!user) {
        const reason=['LEGAL_NOT_READY','TOKEN_DECRYPT_FAILED','invalid_grant','invalid_client','invalid_request'].includes(err?.code)?err.code:'AUTHORIZATION_FAILED';
        log('oauth_failed',{reason});
        return res.redirect(config.appUrl+'/login?error=oauth');
      }
      req.logIn(user,error=>{
        if(error) return next(error);
        req.session.authAt=Date.now();req.session.csrf=randomBytes(32).toString('hex');
        req.session.save(saveError=>saveError?next(saveError):res.redirect(config.appUrl+'/app'));
      });
    })(req,res,next);
  });
  router.post('/auth/logout',requireAuth,csrf,(req,res,next)=>req.session.destroy(error=>{
    if(error)return next(error);
    res.clearCookie('flowsell.sid',cookieOptions).status(204).end();
  }));
}
