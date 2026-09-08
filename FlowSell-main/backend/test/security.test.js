import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {Writable} from 'node:stream';
import {MongoMemoryServer} from 'mongodb-memory-server';
import {RedisMemoryServer} from 'redis-memory-server';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import session from 'express-session';
import signature from 'cookie-signature';
import request from 'supertest';
import sharp from 'sharp';
import {v2 as cloudinary} from 'cloudinary';

process.env.NODE_ENV='test';
process.env.APP_URL='http://localhost:3000';
process.env.SESSION_SECRET=randomBytes(48).toString('hex');
process.env.WEBHOOK_SECRET=randomBytes(48).toString('hex');
process.env.TOKEN_ENCRYPTION_KEYS=JSON.stringify({test:randomBytes(32).toString('base64')});
process.env.TOKEN_ENCRYPTION_ACTIVE_KEY='test';
process.env.ADMIN_MELI_IDS='999';
process.env.ADMIN_TOTP_SECRET='JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
process.env.CLIENT_ID='12345';
process.env.CLOUDINARY_CLOUD_NAME='test-cloud';
process.env.CLOUDINARY_API_KEY='test-key';
process.env.CLOUDINARY_API_SECRET='test-secret';
process.env.LEGAL_NAME='Responsable de prueba';
process.env.LEGAL_ADDRESS='Domicilio de prueba';
process.env.LEGAL_EMAIL='legal@example.test';
process.env.DATA_REGIONS='Entorno de pruebas local';
process.env.LEGAL_READY='true';
const {createApp}=await import('../src/http/app.js');
const {config,LEGAL_VERSION,planFor}=await import('../src/core/config.js');
const {encryptToken,decryptToken,totpCode}=await import('../src/core/crypto.js');
const {consume,monthKey,withLock}=await import('../src/core/runtime.js');
const {Meli}=await import('../src/core/meli.js');
const {MediaStore,normalizeImage,mediaPath}=await import('../src/core/media.js');
const {legacyPublicId}=await import('../src/core/legacy-media.js');
const {jobHandlers}=await import('../src/core/jobs.js');
const {default:User}=await import('../src/models/User.js');
const {Template}=await import('../src/models/Template.js');
const {Product}=await import('../src/models/Product.js');
const {JobModel}=await import('../src/models/jobModel.js');
const {Media,Usage,Delivery,Notice,Audit,PlanRequest}=await import('../src/models/Security.js');
let mongo,redisServer,redis,app,store,alice,bob,admin,deps,handlers,aliceCookie,bobCookie,adminCookie;
const csrf='test-csrf-value',posted=[],queued=[],images=[];
const nowDate=()=>new Date().toISOString().slice(0,10);
class FakeMeli extends Meli {
  async request(user,path,options={}) {
    if(path.startsWith('/items/'))return {id:path.split('/').pop(),seller_id:path.endsWith('22222')?'222':'111',title:'Publicación propia',site_id:'MLA',variations:[{id:77,attribute_combinations:[{value_name:'Azul'}]}]};
    if(path.startsWith('/orders/search'))return {paging:{total:2},results:[this.orderData('111'),this.orderData('222')]};
    if(path.startsWith('/orders/'))return this.orderData(path.endsWith('22222')?'222':'111');
    if(path==='/messages/attachments')return {id:'file-id'};
    if(path.startsWith('/messages/packs/')){posted.push({seller:user.meliId,path,body:JSON.parse(options.body)});return {id:'message-id'};}
    throw new Error('Unexpected test request');
  }
  orderData(seller){return {id:seller==='111'?11111:22222,seller:{id:seller},buyer:{id:seller==='111'?11101:22201,nickname:'buyer-'+seller},status:'paid',date_created:new Date().toISOString(),total_amount:200,currency_id:'ARS',order_items:[{item:{id:'MLA'+(seller==='111'?'11111':'22222'),title:'Item '+seller},quantity:1,unit_price:200}]};}
}
async function cookie(user,authAt=Date.now()) {
  const sid=randomUUID();
  await new Promise((resolve,reject)=>store.set(sid,{cookie:{httpOnly:true,path:'/',maxAge:86400000,expires:new Date(Date.now()+86400000)},passport:{user:{id:String(user._id),version:user.sessionVersion||0}},authAt,csrf},e=>e?reject(e):resolve()));
  return 'flowsell.sid='+encodeURIComponent('s:'+signature.sign(sid,config.sessionSecret));
}
const req=(method,path,cookieValue=aliceCookie)=>request(app)[method](path).set('Cookie',cookieValue).set('Origin',config.appUrl).set('X-CSRF-Token',csrf);
before(async()=>{
  mongo=await MongoMemoryServer.create({binary:{version:'7.0.24'},instance:{args:['--nounixsocket']}});
  await mongoose.connect(mongo.getUri());
  redisServer=new RedisMemoryServer();redis=new Redis({host:'127.0.0.1',port:await redisServer.getPort(),maxRetriesPerRequest:1});
  await redis.ping();
  for(const model of Object.values(mongoose.models))await model.init();
  store=new session.MemoryStore();
  cloudinary.uploader.upload_stream=(options,cb)=>{
    images.push(options);
    return new Writable({write(chunk,enc,done){done();},final(done){cb(null,{public_id:options.public_id,bytes:50});done();}});
  };
  cloudinary.uploader.destroy=async()=>({result:'ok'});
  const media=new MediaStore();media.bytes=async m=>{assert.equal(m.state,'ready');return Buffer.from('test-image');};
  deps={redis,store,media,meli:new FakeMeli(redis),queue:{async add(name,data,opts){queued.push({name,data,opts});return {id:randomUUID()};}}};
  handlers=jobHandlers(deps);app=createApp(deps);
});
beforeEach(async()=>{
  for(const model of Object.values(mongoose.models))await model.deleteMany({});
  await redis.flushdb();store.clear();posted.length=0;queued.length=0;images.length=0;
  const legal={privacyVersion:LEGAL_VERSION,termsVersion:LEGAL_VERSION,acceptedAt:new Date()};
  [alice,bob,admin]=await User.create([{meliId:'111',nickname:'ALICE',email:'alice@example.test',legal},{meliId:'222',nickname:'BOB',email:'bob@example.test',legal},{meliId:'999',nickname:'ADMIN',legal}]);
  [aliceCookie,bobCookie,adminCookie]=await Promise.all([cookie(alice),cookie(bob),cookie(admin)]);
});
after(async()=>{redis?.disconnect();await redisServer?.stop();await mongoose.disconnect();await mongo?.stop();});

test('AES-GCM cifra, autentica, aísla por propietario y rechaza texto plano',()=>{
  const a=encryptToken('secret-ml','111'),b=encryptToken('secret-ml','111');
  assert.notEqual(a,b);assert(!a.includes('secret-ml'));assert.equal(decryptToken(a,'111'),'secret-ml');
  assert.throws(()=>decryptToken(a,'222'));assert.throws(()=>decryptToken('secret-ml','111'));
  const parts=a.split('.');parts[4]='AAAA'+parts[4].slice(4);assert.throws(()=>decryptToken(parts.join('.'),'111'));
});
test('rutas internas y archivos requieren sesión; no hay CRUD de usuarios o jobs',async()=>{
  for(const path of ['/api/users','/api/jobs','/api/messages','/api/products/saved','/api/templates','/api/account','/api/admin/overview','/api/media/123456789012345678901234'])await request(app).get(path).expect(401);
  await req('post','/api/users').send({meliId:'333'}).expect(404);
  await req('put','/api/jobs/anything').send({buyers:[]}).expect(404);
  const publicData=await request(app).get('/api/public/config').expect(200);
  assert(!JSON.stringify(publicData.body).includes(config.cloudSecret));
});
test('CSRF requiere token y origen exacto; ninguna solicitud rechazada modifica datos',async()=>{
  await request(app).post('/api/templates').set('Cookie',aliceCookie).send({name:'A',content:'Hola'}).expect(403);
  await req('post','/api/templates').set('Origin','https://evil.example').send({name:'A',content:'Hola'}).expect(403);
  await req('post','/api/templates').set('X-CSRF-Token','bad').send({name:'A',content:'Hola'}).expect(403);
  assert.equal(await Template.countDocuments(),0);
});
test('IDOR: no se listan, editan ni borran plantillas de otra cuenta',async()=>{
  const tpl=await Template.create({owner:bob._id,name:'SECRETO-BOB',content:'Contenido privado'});
  const list=await req('get','/api/templates').expect(200);assert.deepEqual(list.body,[]);
  await req('put','/api/templates/'+tpl._id).send({name:'intruso',content:'hack'}).expect(404);
  await req('delete','/api/templates/'+tpl._id).expect(404);
  assert.equal((await Template.findById(tpl._id)).name,'SECRETO-BOB');
  await req('get','/api/templates',bobCookie).expect(200).expect(r=>assert.equal(r.body[0].name,'SECRETO-BOB'));
});
test('IDOR: publicación y plantillas de otra cuenta no pueden asignarse',async()=>{
  const a=await Template.create({owner:alice._id,name:'A',content:'Hola'}),b=await Template.create({owner:bob._id,name:'B',content:'Hola'});
  await req('post','/api/products/MLA11111/assign-templates-modal').send({templateIds:[String(b._id)]}).expect(404);
  await req('post','/api/products/MLA22222/assign-templates-modal').send({templateIds:[String(a._id)]}).expect(404);
  await req('post','/api/products/MLA11111/assign-templates-modal').send({templateIds:[String(a._id)],productAsign:'título falsificado'}).expect(200);
  const flow=await Product.findOne({owner:alice._id});assert.equal(flow.title,'Publicación propia');
  await req('delete','/api/products/MLA11111/saved-product',bobCookie).expect(404);
  await req('get','/api/products/template/MLA11111',bobCookie).expect(404);
});
test('los uploads son authenticated, privados por propietario y se valida el contenido real',async()=>{
  const png=await sharp({create:{width:8,height:8,channels:3,background:'#285ee8'}}).png().toBuffer();
  const res=await req('post','/api/templates').field('name','Imagen').field('content','Hola').attach('images-posventa',png,{filename:'test.png',contentType:'image/png'}).expect(201);
  assert.equal(images[0].type,'authenticated');assert.equal(images[0].overwrite,false);assert(images[0].public_id.includes('/'+alice._id+'/'));
  const url=res.body.attachments[0];assert.match(url,/^\/api\/media\//);assert(!JSON.stringify(res.body).includes('res.cloudinary'));
  await req('get',url,bobCookie).expect(404);await req('get',url).expect(200).expect('Cache-Control','no-store');
  await req('post','/api/templates').field('name','Mal').field('content','Mal').attach('images-posventa',Buffer.from('<svg onload="alert(1)"/>'),{filename:'bad.jpg',contentType:'image/jpeg'}).expect(400);
  await assert.rejects(()=>normalizeImage(Buffer.alloc(2*1024*1024+1)));
});
test('borrado de imágenes ajenas y owner inyectado se rechazan',async()=>{
  const tpl=await Template.create({owner:alice._id,name:'A',content:'hola'});
  await req('put','/api/templates/'+tpl._id).send({name:'A',content:'hola',attachmentsRaw:JSON.stringify(['/api/media/123456789012345678901234'])}).expect(400);
  await req('post','/api/templates').send({name:'A',content:'hola',owner:String(bob._id)}).expect(400);
});
test('cuotas concurrentes no se exceden y un downgrade no borra registros',async()=>{
  await Usage.create({owner:alice._id,month:monthKey(),messages:99});
  const results=await Promise.allSettled(Array.from({length:15},()=>consume(alice._id,'messages',100)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await Usage.findOne({owner:alice._id})).messages,100);
  for(let i=0;i<3;i++)await Template.create({owner:alice._id,name:'tpl'+i,content:'Hola'});
  const create=()=>req('post','/api/templates').send({name:'exceso',content:'Hola'});
  const responses=await Promise.all([create(),create()]);assert(responses.every(r=>[402,409].includes(r.status)));
  assert.equal(await Template.countDocuments({owner:alice._id}),3);
  alice.plan='premium';alice.planExpiresAt=new Date(Date.now()-1000);assert.equal(planFor(alice).id,'free');
});
test('planes se controlan en API: export, diferidos, campañas e historial',async()=>{
  await req('get','/api/statistics/sales/export?from='+nowDate()+'&to='+nowDate()).expect(402);
  await req('post','/api/products/MLA11111/assign-delay').send({delayHours:24}).expect(402);
  await req('post','/api/client-tracking').send({itemIds:['MLA11111'],startDate:new Date().toISOString(),endDate:new Date().toISOString()}).expect(402);
  await req('get','/api/statistics/sales?from=2020-01-01&to=2020-01-02').expect(402);
});
test('estadísticas y CSV sólo contienen órdenes verificadas del vendedor',async()=>{
  const url='/api/statistics/sales?from='+nowDate()+'&to='+nowDate();
  const a=await req('get',url).expect(200),b=await req('get',url,bobCookie).expect(200);
  assert.equal(a.body.recentOrders[0].buyerNickname,'buyer-111');assert.equal(b.body.recentOrders[0].buyerNickname,'buyer-222');
  await User.updateOne({_id:alice._id},{$set:{plan:'premium'}});
  const csv=await req('get','/api/statistics/sales/export?from='+nowDate()+'&to='+nowDate()).expect(200);
  assert(csv.text.includes('buyer-111'));assert(!csv.text.includes('buyer-222'));
});
test('un comprador o job inyectado no permite iniciar campaña ajena',async()=>{
  await User.updateOne({_id:alice._id},{$set:{plan:'premium'}});
  const job=await JobModel.create({userId:String(bob._id),jobId:randomUUID(),status:'COMPLETED',buyers:[{buyerId:'22201',order_id:'22222'}]});
  const tpl=await Template.create({owner:alice._id,name:'A',content:'Hola'});
  await req('get','/api/client-tracking/buyers/'+job.jobId).expect(404);
  await req('post','/api/client-tracking/send').send({jobId:job.jobId,templateIds:[String(tpl._id)]}).expect(404);
  await req('post','/api/client-tracking/send').send({jobId:job.jobId,templateIds:[String(tpl._id)],buyers:[{buyerId:'hack'}]}).expect(400);
  assert.equal(queued.length,0);
});
test('panel admin exige allowlist, TOTP, evita replay y sólo expone metadatos',async()=>{
  await req('get','/api/admin/overview').expect(403);
  await req('get','/api/admin/users',adminCookie).expect(403).expect(r=>assert.equal(r.body.code,'ADMIN_MFA_REQUIRED'));
  const code=totpCode(config.adminTotpSecret,Math.floor(Date.now()/30000));
  await req('post','/api/admin/verify',adminCookie).send({code}).expect(200);
  await req('post','/api/admin/verify',adminCookie).send({code}).expect(403);
  const result=await req('get','/api/admin/users',adminCookie).expect(200);
  const text=JSON.stringify(result.body);assert(!text.includes('alice@example'));assert(!text.includes('accessToken'));assert(!text.includes('content'));
  await req('patch','/api/admin/users/'+alice._id+'/plan',adminCookie).send({plan:'plus',expiresAt:null}).expect(200);
  assert.equal((await User.findById(alice._id)).plan,'plus');assert.equal(await Audit.countDocuments({action:'plan.change'}),1);
  await req('patch','/api/admin/users/'+bob._id+'/plan').send({plan:'plus',expiresAt:null}).expect(403);
});
test('solicitud comercial requiere login y no cambia el plan por sí sola',async()=>{
  await request(app).post('/api/account/plan-request').send({plan:'plus'}).expect(401);
  const res=await req('post','/api/account/plan-request').send({plan:'premium'}).expect(200);
  assert.match(res.body.whatsappUrl,/^https:\/\/wa.me\/5492342510893/);
  assert.equal((await User.findById(alice._id)).plan,'free');assert.equal(await PlanRequest.countDocuments({owner:alice._id}),1);
});
test('webhook rechaza secretos, app ajena y recursos arbitrarios',async()=>{
  const payload={topic:'orders_v2',resource:'/orders/11111',user_id:'111',application_id:config.clientId};
  await request(app).post('/api/payments/wrong').send(payload).expect(404);
  const url='/api/payments/'+config.webhookSecret;
  await request(app).post(url).send({...payload,application_id:'666'}).expect(403);
  await request(app).post(url).send({...payload,resource:'https://evil.example/x'}).expect(400);
  await request(app).post(url).send({...payload,resource:'/orders/../users'}).expect(400);
  await request(app).post(url).send(payload).expect(202);
  assert.equal(await Notice.countDocuments({owner:alice._id,orderId:'11111'}),1);
  assert.deepEqual(Object.keys(queued[0].data),['noticeId']);
});
test('worker verifica dueño de la orden y el ledger evita duplicados',async()=>{
  const tpl=await Template.create({owner:alice._id,name:'A',content:'Hola'});
  await Product.create({owner:alice._id,id:'MLA11111',templates:[{templateId:tpl._id,name:tpl.name}]});
  const n=await Notice.create({owner:alice._id,orderId:'11111',receivedAt:new Date()});
  await handlers.notification({noticeId:n._id});
  await Notice.updateOne({_id:n._id},{$set:{pending:true,receivedAt:new Date()}});
  await handlers.notification({noticeId:n._id});
  assert.equal(posted.length,1);assert.equal(await Delivery.countDocuments({owner:alice._id,status:'sent'}),1);
  const forged=await Notice.create({owner:alice._id,orderId:'22222',receivedAt:new Date()});
  await assert.rejects(()=>handlers.notification({noticeId:forged._id}));assert.equal(posted.length,1);
});
test('worker no envía desde cuentas desconectadas ni flujos pausados',async()=>{
  const tpl=await Template.create({owner:alice._id,name:'A',content:'Hola'});
  await Product.create({owner:alice._id,id:'MLA11111',enabled:false,templates:[{templateId:tpl._id}]});
  const n=await Notice.create({owner:alice._id,orderId:'11111',receivedAt:new Date()});
  await handlers.notification({noticeId:n._id});assert.equal(posted.length,0);
  await User.updateOne({_id:alice._id},{$set:{status:'disconnected'}});
  await assert.rejects(()=>handlers.delayed({owner:alice._id,orderId:'11111',templateId:tpl._id,flowId:'MLA11111'}));
  assert.equal(posted.length,0);
});
test('logout global y desconexión invalidan todas las sesiones',async()=>{
  const another=await cookie(alice);
  await req('post','/api/account/disconnect').expect(200);
  await req('get','/api/account',another).expect(401);
  const user=await User.findById(alice._id).select('+accessToken +refreshToken');assert.equal(user.status,'disconnected');assert(!user.accessToken&&!user.refreshToken);
});
test('borrado requiere reautenticación y cleanup sólo borra al propietario',async()=>{
  const stale=await cookie(alice,Date.now()-16*60000);
  await req('delete','/api/account',stale).send({confirmation:'ELIMINAR MI CUENTA'}).expect(403);
  await Template.create({owner:alice._id,name:'A',content:'hola'});await Template.create({owner:bob._id,name:'B',content:'hola'});
  await req('delete','/api/account').send({confirmation:'ELIMINAR MI CUENTA'}).expect(202);
  await req('get','/api/account').expect(401);await handlers.cleanup();
  assert.equal(await User.countDocuments({_id:alice._id}),0);assert.equal(await Template.countDocuments({owner:alice._id}),0);
  assert.equal(await User.countDocuments({_id:bob._id}),1);assert.equal(await Template.countDocuments({owner:bob._id}),1);
});
test('la caída de Redis cierra operaciones y su lock no puede liberarlo otro token',async()=>{
  await withLock(redis,'test-lock',async()=>{await assert.rejects(()=>withLock(redis,'test-lock',async()=>{}),{code:'OPERATION_BUSY'});});
  const badApp=createApp({...deps,redis:{eval:async()=>{throw new Error('redis://password@secret-host');}}});
  const result=await request(badApp).post('/api/templates').set('Cookie',aliceCookie).send({name:'A',content:'B'}).expect(503);
  assert(!JSON.stringify(result.body).includes('password'));
});
test('migración de medios no acepta dominios, rutas ni propietarios externos',()=>{
  const valid='https://res.cloudinary.com/test-cloud/image/upload/v123/flowsell/templates/'+alice._id+'/abcdef12345.jpg';
  assert(legacyPublicId(valid,alice._id));assert.equal(legacyPublicId(valid,bob._id),null);
  assert.equal(legacyPublicId(valid.replace('res.cloudinary.com','evil.example'),alice._id),null);
  assert.equal(legacyPublicId(valid+'?evil=1',alice._id),null);
});

test('una campaña se recupera de contención sin duplicar ni perder su estado',async()=>{
  await User.updateOne({_id:alice._id},{$set:{plan:'premium'}});
  const tpl=await Template.create({owner:alice._id,name:'A',content:'Hola'});
  const job=await JobModel.create({userId:String(alice._id),jobId:randomUUID(),status:'COMPLETED',statusMessagesMassive:'PROCESSING',templateIds:[String(tpl._id)],buyers:[{buyerId:'11101',order_id:'11111'}]});
  await withLock(redis,'account:'+alice._id,async()=>{
    await assert.rejects(()=>handlers.campaign({jobId:job.jobId}),{code:'OPERATION_BUSY'});
  });
  assert.equal((await JobModel.findById(job._id)).statusMessagesMassive,'PROCESSING');assert.equal(posted.length,0);
  await handlers.campaign({jobId:job.jobId});await handlers.campaign({jobId:job.jobId});
  assert.equal((await JobModel.findById(job._id)).statusMessagesMassive,'COMPLETED');assert.equal(posted.length,1);
});
test('un envío con respuesta incierta queda registrado y no se repite',async()=>{
  await User.updateOne({_id:alice._id},{$set:{plan:'premium'}});
  const tpl=await Template.create({owner:alice._id,name:'A',content:'Hola'});
  await Product.create({owner:alice._id,id:'MLA11111',secondMessages:[{templateId:tpl._id}]});
  const fake=new FakeMeli(redis),base=fake.request.bind(fake);let attempts=0;
  fake.request=async(user,path,options)=>{if(path.startsWith('/messages/packs/')){attempts++;throw Object.assign(new Error('Network'),{code:'MELI_NETWORK'});}return base(user,path,options);};
  const h=jobHandlers({...deps,meli:fake});
  const data={owner:alice._id,orderId:'11111',templateId:tpl._id,flowId:'MLA11111'};
  assert.equal(await h.delayed(data),'uncertain');assert.equal(await h.delayed(data),'uncertain');assert.equal(attempts,1);
});
test('descargas privadas usan enlace autenticado breve en backend y reservan cupo antes de consultar',async()=>{
  const file=await Media.create({owner:alice._id,publicId:'flowsell/templates/'+alice._id+'/test',format:'webp',bytes:5,state:'ready'});
  const originalFetch=globalThis.fetch;let downloads=0;
  globalThis.fetch=async(input)=>{
    downloads++;const url=new URL(input);
    assert.equal(url.hostname,'api.cloudinary.com');assert.equal(url.searchParams.get('type'),'authenticated');
    assert.equal(url.searchParams.get('public_id'),file.publicId);
    const expires=Number(url.searchParams.get('expires_at'));assert(expires>Date.now()/1000 && expires<Date.now()/1000+65);
    assert(!url.href.includes(config.cloudSecret));return new Response(Buffer.from('image'));
  };
  try {
    assert.equal((await new MediaStore().bytes(file)).toString(),'image');
    await Usage.updateOne({owner:alice._id,month:monthKey()},{$set:{mediaBytes:250*1024*1024}});
    await assert.rejects(()=>new MediaStore().bytes(file),{code:'PLAN_LIMIT'});assert.equal(downloads,1);
  }finally{globalThis.fetch=originalFetch;}
});
test('migración real: dry run no altera; aplicar cifra tokens y conserva referencias e índices por dueño',async()=>{
  const {execFile}=await import('node:child_process');const {promisify}=await import('node:util');
  const run=promisify(execFile);
  await User.updateOne({_id:alice._id},{$set:{accessToken:'legacy-access',refreshToken:'legacy-refresh',plan:'premium'}});
  const tpl=await Template.create({owner:alice._id,name:'Conservar',content:'Contenido propio'});
  await Product.create({owner:alice._id,id:'MLA11111',templates:[{templateId:tpl._id}]});
  await Product.collection.createIndex({id:1},{unique:true});
  const opts={cwd:new URL('..',import.meta.url),env:{...process.env,MONGO_URI:mongo.getUri()},timeout:20000};
  const dry=await run(process.execPath,['scripts/migrate.mjs'],opts);
  assert(!dry.stdout.includes('legacy-access'));assert.equal((await User.findById(alice._id).select('+accessToken')).accessToken,'legacy-access');
  await run(process.execPath,['scripts/migrate.mjs','--apply'],opts);
  let migrated=await User.findById(alice._id).select('+accessToken +refreshToken');
  assert.equal(decryptToken(migrated.accessToken,'111'),'legacy-access');assert.equal(decryptToken(migrated.refreshToken,'111'),'legacy-refresh');
  assert.equal(migrated.plan,'premium');assert.equal(migrated.sessionVersion,1);
  assert.equal((await Product.findOne({owner:alice._id})).templates[0].templateId.toString(),tpl._id.toString());
  const indexes=await Product.collection.indexes();assert(!indexes.some(i=>i.name==='id_1'));assert(indexes.some(i=>i.key.owner===1&&i.key.id===1&&i.unique));
  await Product.create({owner:bob._id,id:'MLA11111'});
  await run(process.execPath,['scripts/migrate.mjs','--apply'],opts);
  migrated=await User.findById(alice._id).select('+accessToken');assert.equal(decryptToken(migrated.accessToken,'111'),'legacy-access');
  assert.equal(await Template.countDocuments({_id:tpl._id,owner:alice._id}),1);
});

test('OAuth completo conserva la sesión de cuentas antiguas y respeta versiones revocadas',async()=>{
  const {default:express}=await import('express');
  const {authStack,mountAuth}=await import('../src/http/auth.js');
  const stack=authStack({store:new session.MemoryStore(),redis});
  const authApp=express();authApp.use(stack.sessions,stack.passport.initialize(),stack.passport.session());
  const router=express.Router();mountAuth(router,stack.passport,redis);authApp.use('/api',router);
  const strategy=stack.passport._strategy('meli');
  strategy._oauth2.getOAuthAccessToken=(code,params,done)=>done(null,'oauth-test-access','oauth-test-refresh',{expires_in:21600});
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async input=>{
    assert.equal(String(input),'https://api.mercadolibre.com/users/me');
    return new Response(JSON.stringify({id:111,nickname:'ALICE',email:'alice@example.test'}),{headers:{'content-type':'application/json'}});
  };
  try {
    for(const version of [undefined,7]) {
      if(version===undefined)await User.collection.updateOne({_id:alice._id},{$unset:{sessionVersion:1}});
      else await User.collection.updateOne({_id:alice._id},{$set:{sessionVersion:version}});
      const browser=request.agent(authApp);
      const started=await browser.get('/api/auth/login').expect(302);
      const state=new URL(started.headers.location).searchParams.get('state');assert(state);
      await browser.get('/api/auth/callback').query({code:'provider-test-code',state}).expect(302).expect('Location',config.appUrl+'/app');
      const check=await browser.get('/api/auth/check').expect(200);
      assert.equal(check.body.isAuthenticated,true,'Debe mantener la sesión luego de OAuth');
      const saved=await User.collection.findOne({_id:alice._id});assert.equal(saved.sessionVersion,version??0);
      assert.equal(decryptToken(saved.accessToken,'111'),'oauth-test-access');
      await User.updateOne({_id:alice._id},{$inc:{sessionVersion:1}});
      assert.equal((await browser.get('/api/auth/check').expect(200)).body.isAuthenticated,false,'La revocación debe seguir invalidando la sesión');
    }
  }finally{globalThis.fetch=originalFetch;}
});
