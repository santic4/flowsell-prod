import {chromium} from 'playwright';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {RedisMemoryServer} from 'redis-memory-server';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import session from 'express-session';
import signature from 'cookie-signature';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.APP_URL='http://127.0.0.1:4197';
process.env.SESSION_SECRET=randomBytes(48).toString('hex');process.env.CLIENT_ID='123';process.env.ADMIN_MELI_IDS='999';
process.env.ADMIN_TOTP_SECRET='JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
process.env.LEGAL_NAME='Responsable de demostración';process.env.LEGAL_ADDRESS='Domicilio de prueba, Argentina';
process.env.LEGAL_EMAIL='legal@example.test';process.env.DATA_REGIONS='Entorno local de pruebas';process.env.LEGAL_READY='true';
const {createApp}=await import('../src/http/app.js');
const {config,LEGAL_VERSION}=await import('../src/core/config.js');
const {totpCode}=await import('../src/core/crypto.js');
const {default:User}=await import('../src/models/User.js');
const {Template}=await import('../src/models/Template.js');
const {Product}=await import('../src/models/Product.js');
let browser,server,redis,redisServer,mongo;
const out=process.env.QA_SCREENSHOTS||'qa/screenshots';await mkdir(out,{recursive:true});
try {
  mongo=await MongoMemoryServer.create({binary:{version:'7.0.24'},instance:{args:['--nounixsocket']}});await mongoose.connect(mongo.getUri());
  redisServer=new RedisMemoryServer();redis=new Redis({host:'127.0.0.1',port:await redisServer.getPort()});await redis.ping();
  const user=await User.create({meliId:'999',nickname:'TIENDA_DEMO',plan:'plus',email:'tienda@example.test',legal:{privacyVersion:LEGAL_VERSION,termsVersion:LEGAL_VERSION,acceptedAt:new Date()}});
  const tpl=await Template.create({owner:user._id,name:'Gracias por tu compra',content:'¡Gracias por elegirnos! Si necesitás ayuda con tu compra, escribinos por este medio.'});
  await Product.create({owner:user._id,id:'MLA12345678',title:'Kit de oficina',templates:[{templateId:tpl._id,name:tpl.name}]});
  const store=new session.MemoryStore(),sid=randomUUID();
  await new Promise(resolve=>store.set(sid,{cookie:{path:'/',httpOnly:true,expires:new Date(Date.now()+86400000)},authAt:Date.now(),passport:{user:{id:String(user._id),version:0}}},resolve));
  const meli={
    async orders(){return [];},
    async request(user,path){if(path.includes('/users/'))return {results:[],paging:{total:0}};return [];},
  };
  const app=createApp({redis,store,meli,queue:{async add(){}},media:{}});
  server=app.listen(4197,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const options={headless:true};
  if(process.env.QA_CHROMIUM_MODULE){const {default:custom}=await import(process.env.QA_CHROMIUM_MODULE);options.executablePath=process.env.QA_CHROMIUM_EXECUTABLE||await custom.executablePath();options.args=custom.args.filter(a=>!['--disable-web-security','--allow-running-insecure-content','--disable-site-isolation-trials'].includes(a));}
  browser=await chromium.launch(options);
  const page=await browser.newPage(),errors=[];
  await page.route('https://**',route=>route.abort());
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,375,768,1280,1905]){
    await page.setViewportSize({width,height:909});
    await page.goto(config.appUrl+'/login');await page.getByRole('heading',{name:'Ingresá a Flow Sell'}).waitFor();
    await page.getByRole('heading',{name:'Premium',exact:true}).waitFor();
    const dimensions=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,left:document.querySelector('.fs-story').getBoundingClientRect().left}));
    assert(dimensions.scroll<=dimensions.viewport,'Overflow login '+width+': '+JSON.stringify(dimensions));
    assert(dimensions.left>=0,'Contenido izquierdo fuera del viewport');
    await page.screenshot({path:out+'/login-'+width+'.png',fullPage:true});
  }
  for(const path of ['/privacy','/terms','/guide']){
    await page.setViewportSize({width:375,height:812});await page.goto(config.appUrl+path);
    await page.locator('h1').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow '+path);
  }
  await page.context().addCookies([{name:'flowsell.sid',value:encodeURIComponent('s:'+signature.sign(sid,config.sessionSecret)),url:config.appUrl,httpOnly:true,sameSite:'Lax'}]);
  for(const width of [375,1280]){
    await page.setViewportSize({width,height:900});
    for(const path of ['/app','/app/templates','/app/automations','/app/statistics','/app/plans','/app/guide','/app/account','/app/admin']){
      await page.goto(config.appUrl+path);await page.locator('.app-main').waitFor();await page.locator('.app-main h1,.app-main h2').first().waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow '+path+' '+width);
      if(path==='/app/admin' && await page.getByLabel('Código del autenticador').isVisible()){
        await page.getByLabel('Código del autenticador').fill(totpCode(config.adminTotpSecret,Math.floor(Date.now()/30000)));
        await page.getByRole('button',{name:'Verificar acceso'}).click();
        await page.getByRole('heading',{name:'Cuentas',exact:true}).waitFor();
      }
      await page.screenshot({path:out+'/'+path.replaceAll('/','_')+'-'+width+'.png',fullPage:true});
    }
  }
  assert.deepEqual(errors,[]);console.log('QA visual: login 5 anchos, documentos públicos, 8 secciones privadas en móvil y escritorio, sin overflow ni errores React.');
} finally {await browser?.close();server?.close();redis?.disconnect();await redisServer?.stop();await mongoose.disconnect();await mongo?.stop();}
