import {Router} from 'express';
import {z} from 'zod';
import User from '../models/User.js';
import {Template} from '../models/Template.js';
import {Product} from '../models/Product.js';
import {JobModel} from '../models/jobModel.js';
import {Media,Usage,PlanRequest,Audit,Delivery} from '../models/Security.js';
import {config,planFor,isAdmin,consentCurrent,LEGAL_VERSION,legalReady,SUPPORT_PHONE} from '../core/config.js';
import {wrap,ensure} from '../core/errors.js';
import {rate,withLock,monthKey} from '../core/runtime.js';
import {verifyTotp} from '../core/crypto.js';
import {cookieOptions} from './auth.js';
import {mockAccountMiddleware,mockAccountPayload} from '../core/mockMode.js';

export const objectId=z.string().regex(/^[a-f0-9]{24}$/i);
export async function accountPayload(user) {
  if(config.mock)return mockAccountPayload();
  const [templates,flows,storage,usage]=await Promise.all([
    Template.countDocuments({owner:user._id}),Product.countDocuments({owner:user._id}),
    Media.aggregate([{$match:{owner:user._id}},{$group:{_id:null,bytes:{$sum:'$bytes'}}}]),
    Usage.findOne({owner:user._id,month:monthKey()}).lean(),
  ]);
  return {id:String(user._id),meliId:user.meliId,nickname:user.nickname,email:user.email,status:user.status||'active',
    plan:planFor(user),planExpiresAt:user.planExpiresAt,isAdmin:isAdmin(user),consentCurrent:consentCurrent(user),
    legalVersion:LEGAL_VERSION,legalReady:legalReady(),usage:{templates,flows,storageBytes:storage[0]?.bytes||0,messages:usage?.messages||0,campaigns:usage?.campaigns||0,month:monthKey()}};
}
export function accountRouter({redis,queue}) {
  const router=Router();
  router.use(mockAccountMiddleware);
  router.get('/',wrap(async(req,res)=>res.json(await accountPayload(req.user))));
  router.post('/consent',wrap(async(req,res)=>{
    const data=z.object({privacyVersion:z.literal(LEGAL_VERSION),termsVersion:z.literal(LEGAL_VERSION),accepted:z.literal(true)}).strict().parse(req.body);
    ensure(legalReady(),503,'El responsable debe completar los datos legales antes de aceptar el servicio.');
    await User.updateOne({_id:req.user._id},{$set:{legal:{privacyVersion:data.privacyVersion,termsVersion:data.termsVersion,acceptedAt:new Date()}}});
    res.json({ok:true});
  }));
  router.post('/plan-request',wrap(async(req,res)=>{
    const {plan}=z.object({plan:z.enum(['free','premium','plus'])}).strict().parse(req.body);
    ensure(consentCurrent(req.user)&&legalReady(),403,'Primero aceptá los documentos vigentes.');
    await rate(redis,'planrequest:'+req.user._id,3,3600);
    const request=await PlanRequest.findOneAndUpdate({owner:req.user._id,status:'pending'},{$set:{plan}},{upsert:true,new:true});
    const text='Hola, quiero consultar el plan '+plan+'. Mi solicitud de Flow Sell es '+request._id+'.';
    res.json({requestId:request._id,whatsappUrl:'https://wa.me/'+SUPPORT_PHONE+'?text='+encodeURIComponent(text)});
  }));
  router.get('/export',wrap(async(req,res)=>{
    await rate(redis,'export-account:'+req.user._id,3,3600);
    const owner=req.user._id;
    const [templates,products,usage,jobs,requests,deliveries]=await Promise.all([
      Template.find({owner}).lean(),Product.find({owner}).lean(),Usage.find({owner}).lean(),
      JobModel.find({userId:String(owner)}).lean(),PlanRequest.find({owner}).lean(),Delivery.find({owner}).select('-key').lean(),
    ]);
    await Audit.create({actor:owner,target:owner,action:'account.export'});
    res.attachment('flowsell-mis-datos.json').json({generatedAt:new Date(),account:await accountPayload(req.user),acceptance:req.user.legal,templates,products,usage,jobs,requests,deliveries});
  }));
  router.post('/sessions/revoke',wrap(async(req,res)=>{
    await User.updateOne({_id:req.user._id},{$inc:{sessionVersion:1}});
    req.session.destroy(()=>{});res.clearCookie('flowsell.sid',cookieOptions).json({ok:true});
  }));
  router.post('/disconnect',wrap(async(req,res)=>{
    await withLock(redis,'account:'+req.user._id,async()=>{
      await User.updateOne({_id:req.user._id},{$set:{status:'disconnected'},$unset:{accessToken:1,refreshToken:1,expiresAt:1},$inc:{sessionVersion:1}});
      await Audit.create({actor:req.user._id,target:req.user._id,action:'account.disconnect'});
    });
    req.session.destroy(()=>{});res.clearCookie('flowsell.sid',cookieOptions).json({ok:true});
  }));
  router.delete('/',wrap(async(req,res)=>{
    z.object({confirmation:z.literal('ELIMINAR MI CUENTA')}).strict().parse(req.body);
    ensure(req.session.authAt && Date.now()-req.session.authAt<15*60000,403,'Por seguridad, cerrá sesión y volvé a entrar antes de eliminar tu cuenta.','REAUTH_REQUIRED');
    await withLock(redis,'account:'+req.user._id,async()=>{
      await User.updateOne({_id:req.user._id},{$set:{status:'deleting',deletedRequestedAt:new Date()},$unset:{accessToken:1,refreshToken:1,expiresAt:1},$inc:{sessionVersion:1}});
      await Media.updateMany({owner:req.user._id},{$set:{state:'deleting'}});
    });
    // La tarea de mantenimiento también recupera solicitudes si la cola se interrumpe.
    await queue.add('cleanup',{}, {jobId:'cleanup-account-'+req.user._id}).catch(()=>{});
    req.session.destroy(()=>{});res.clearCookie('flowsell.sid',cookieOptions).status(202).json({ok:true,message:'Acceso cerrado. La eliminación de archivos se procesa en segundo plano.'});
  }));
  return router;
}
export function adminRouter({redis}) {
  const router=Router();
  router.use(wrap(async(req,res,next)=>{ensure(isAdmin(req.user),403,'Acceso restringido.');next();}));
  router.post('/verify',wrap(async(req,res)=>{
    await rate(redis,'admin-totp:'+req.user._id,5,300);
    const {code}=z.object({code:z.string().regex(/^\d{6}$/)}).strict().parse(req.body);
    const step=verifyTotp(code,config.adminTotpSecret);
    ensure(step!==null,403,'Código inválido o vencido.');
    ensure(await redis.set('fs:totp:'+req.user._id+':'+step,'1','EX',120,'NX'),403,'Este código ya se usó. Esperá el próximo.');
    req.session.adminAt=Date.now();res.json({ok:true,expiresIn:900});
  }));
  router.use(wrap(async(req,res,next)=>{
    ensure(req.session.adminAt && Date.now()-req.session.adminAt<900000,403,'Verificá el código de tu autenticador.','ADMIN_MFA_REQUIRED');
    await rate(redis,'admin:'+req.user._id,60);next();
  }));
  router.get('/overview',wrap(async(req,res)=>{
    const [users,templates,flows,media,jobs,failed,requests,deliveries]=await Promise.all([
      User.countDocuments(),Template.countDocuments(),Product.countDocuments(),Media.aggregate([{$group:{_id:null,count:{$sum:1},bytes:{$sum:'$bytes'}}}]),
      JobModel.countDocuments(),Delivery.countDocuments({status:{$in:['uncertain','failed']}}),PlanRequest.countDocuments({status:'pending'}),Delivery.countDocuments({status:'sent'}),
    ]);
    res.json({users,templates,flows,files:media[0]?.count||0,storageBytes:media[0]?.bytes||0,jobs,failed,requests,sent:deliveries,legalReady:legalReady()});
  }));
  router.get('/users',wrap(async(req,res)=>{
    const page=z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page);
    const filter=req.query.meliId?{meliId:z.string().regex(/^\d+$/).parse(req.query.meliId)}:{};
    const users=await User.find(filter).select('_id meliId nickname plan planExpiresAt status createdAt').sort({_id:-1}).skip((page-1)*30).limit(30).lean();
    const ids=users.map(u=>u._id);
    const [templates,flows,media]=await Promise.all([
      Template.aggregate([{$match:{owner:{$in:ids}}},{$group:{_id:'$owner',count:{$sum:1}}}]),
      Product.aggregate([{$match:{owner:{$in:ids}}},{$group:{_id:'$owner',count:{$sum:1}}}]),
      Media.aggregate([{$match:{owner:{$in:ids}}},{$group:{_id:'$owner',count:{$sum:1},bytes:{$sum:'$bytes'}}}]),
    ]);
    res.json({page,total:await User.countDocuments(filter),users:users.map(u=>({...u,effectivePlan:planFor(u).id,templates:templates.find(x=>String(x._id)===String(u._id))?.count||0,flows:flows.find(x=>String(x._id)===String(u._id))?.count||0,storageBytes:media.find(x=>String(x._id)===String(u._id))?.bytes||0}))});
  }));
  router.patch('/users/:id/plan',wrap(async(req,res)=>{
    const id=objectId.parse(req.params.id);
    const body=z.object({plan:z.enum(['free','premium','plus']),expiresAt:z.iso.datetime().nullable()}).strict().parse(req.body);
    ensure(body.expiresAt===null||new Date(body.expiresAt)>new Date(),400,'El vencimiento debe ser futuro.');
    await withLock(redis,'account:'+id,async()=>{
      const user=await User.findOne({_id:id,status:{$ne:'deleting'}});ensure(user,404,'Cuenta no encontrada.');
      // Auditoría antes del cambio: si no se puede registrar, el plan no se modifica.
      await Audit.create({actor:req.user._id,target:user._id,action:'plan.change',details:{plan:body.plan,expiresAt:body.expiresAt}});
      user.plan=body.plan;user.planExpiresAt=body.plan==='free'?null:body.expiresAt;await user.save();
      await PlanRequest.updateMany({owner:id,status:'pending'},{$set:{status:'resolved'}});
    });
    res.json({ok:true});
  }));
  router.get('/requests',wrap(async(req,res)=>res.json(await PlanRequest.find({status:'pending'}).select('_id owner plan createdAt').populate('owner','meliId nickname').sort({createdAt:1}).limit(100).lean())));
  router.get('/audit',wrap(async(req,res)=>res.json(await Audit.find().select('actor target action details createdAt').sort({createdAt:-1}).limit(100).lean())));
  return router;
}
