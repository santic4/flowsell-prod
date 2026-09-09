import {Router} from 'express';
import multer from 'multer';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import User from '../models/User.js';
import {Template} from '../models/Template.js';
import {Product} from '../models/Product.js';
import {JobModel} from '../models/jobModel.js';
import {Media,Delivery} from '../models/Security.js';
import {planFor,consentCurrent} from '../core/config.js';
import {rate,withLock,consume} from '../core/runtime.js';
import {ensure,wrap,AppError} from '../core/errors.js';
import {mediaPath,MEDIA_MAX} from '../core/media.js';
import {objectId} from './account.js';
import {aggregateSales,validateDateRange,createSalesCsv} from '../services/statisticsServices.js';
import {mockOperationsMiddleware} from '../core/mockMode.js';

const itemId=z.string().regex(/^ML[A-Z]\d{5,20}$/);
const templateIds=z.array(objectId).max(10).refine(a=>new Set(a).size===a.length);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:MEDIA_MAX,files:5,fields:12,fieldSize:10000,parts:20},fileFilter(req,file,cb){cb(['image/jpeg','image/png','image/webp'].includes(file.mimetype)?null:new AppError(400,'Usá imágenes JPG, PNG o WEBP.'),true);}}).array('images-posventa',5);
const owned=async(Model,id,owner)=>{const item=await Model.findOne({_id:objectId.parse(id),owner});ensure(item,404,'Registro no encontrado.');return item;};
const productOwned=async(id,owner)=>{const p=await Product.findOne({id:itemId.parse(id),owner});ensure(p,404,'Flujo no encontrado.');return p;};
export async function ownedTemplates(ids,owner) {
  templateIds.parse(ids);const docs=await Template.find({_id:{$in:ids},owner});
  ensure(docs.length===ids.length,404,'Una plantilla no está disponible en tu cuenta.');
  return ids.map(id=>docs.find(d=>String(d._id)===id));
}
export async function allowedFlows(user) {
  return Product.find({owner:user._id,enabled:{$ne:false}}).sort({createdAt:1,_id:1}).limit(planFor(user).flows).lean();
}
export async function liveUser(id) {
  const user=await User.findOne({_id:id,status:{$nin:['deleting','disconnected']}});
  ensure(user&&consentCurrent(user),403,'Cuenta no habilitada para operar.','ACCOUNT_DISABLED');return user;
}
const refs=templates=>templates.map(t=>({templateId:t._id,name:t.name}));
const mediaIdFromPath=p=>/^\/api\/media\/([a-f0-9]{24})$/i.exec(p)?.[1];
const templateView=t=>({...t,legacyAttachments:(t.attachments||[]).filter(p=>!mediaIdFromPath(p)).length,attachments:(t.attachments||[]).filter(p=>mediaIdFromPath(p))});
export function operationsRouter(deps) {
  const {redis,queue,meli,media}=deps,router=Router();
  router.use(mockOperationsMiddleware);
  const mutate=(req,fn)=>withLock(redis,'account:'+req.user._id,async assertLease=>fn(await liveUser(req.user._id),assertLease));
  const uploadRate=wrap(async(req,res,next)=>{await rate(redis,'upload:'+req.user._id,12,3600);next();});
  router.get('/templates',wrap(async(req,res)=>{
    const [templates,products]=await Promise.all([Template.find({owner:req.user._id}).sort({createdAt:-1}).lean(),Product.find({owner:req.user._id}).lean()]);
    res.json(templates.map(t=>templateView({...t,assignedPublications:products.filter(p=>[...p.templates,...p.secondMessages,...p.variations.flatMap(v=>v.templates)].some(x=>String(x.templateId)===String(t._id))).map(p=>p.title||p.id)})));
  }));
  const saveTemplate=wrap(async(req,res)=>{
    const data=z.object({name:z.string().trim().min(1).max(70),content:z.string().trim().min(1).max(350),attachmentsRaw:z.string().max(8000).optional(),assignedPublications:z.union([z.string(),z.array(z.string())]).optional()}).strict().parse(req.body);
    let deleted=[];try{deleted=z.array(z.string().max(2000)).max(20).parse(JSON.parse(data.attachmentsRaw||'[]'));}catch{ensure(false,400,'Adjuntos a quitar inválidos.');}
    const value=await mutate(req,async(user,lease)=>{
      let tpl=req.params.id?await owned(Template,req.params.id,user._id):null;
      ensure(tpl||await Template.countDocuments({owner:user._id})<planFor(user).templates,402,'Alcanzaste el límite de plantillas de tu plan.','PLAN_LIMIT');
      const current=tpl?.attachments||[];
      ensure(deleted.every(p=>current.includes(p)),400,'No podés modificar esos adjuntos.');
      const retained=current.filter(p=>!deleted.includes(p));
      ensure(retained.length+(req.files||[]).length<=5,400,'Máximo 5 imágenes por plantilla. Migrá o quitá adjuntos antiguos.');
      const files=await media.upload(user,req.files||[],lease);
      try {
        await lease();
        if(!tpl) tpl=new Template({owner:user._id});
        tpl.name=data.name;tpl.content=data.content;tpl.attachments=[...retained,...files.map(m=>mediaPath(m._id))];
        await tpl.save();
      } catch(e){await Media.updateMany({_id:{$in:files.map(m=>m._id)},owner:user._id},{$set:{state:'deleting'}});throw e;}
      await Media.updateMany({_id:{$in:deleted.map(mediaIdFromPath).filter(Boolean)},owner:user._id},{$set:{state:'deleting'}});
      return templateView(tpl.toObject());
    });
    res.status(req.params.id?200:201).json(value);
  });
  router.post('/templates',uploadRate,upload,saveTemplate);
  router.put('/templates/:id',uploadRate,upload,saveTemplate);
  router.delete('/templates/:id',wrap(async(req,res)=>{
    await mutate(req,async(user)=>{
      const tpl=await owned(Template,req.params.id,user._id);
      ensure(!(tpl.attachments||[]).some(p=>!mediaIdFromPath(p)),409,'Esta plantilla tiene adjuntos antiguos. Ejecutá primero la migración de Cloudinary.');
      await Product.updateMany({owner:user._id},{$pull:{templates:{templateId:tpl._id},secondMessages:{templateId:tpl._id},'variations.$[].templates':{templateId:tpl._id}}});
      await Media.updateMany({_id:{$in:tpl.attachments.map(mediaIdFromPath)},owner:user._id},{$set:{state:'deleting'}});
      await tpl.deleteOne();
    });res.status(204).end();
  }));
  router.get('/media/:id',wrap(async(req,res)=>{
    await rate(redis,'media:'+req.user._id,100);
    const file=await owned(Media,req.params.id,req.user._id);
    const bytes=await media.bytes(file);
    res.type('image/webp').set('Content-Disposition','inline').send(bytes);
  }));
  router.get('/products',wrap(async(req,res)=>{
    await rate(redis,'catalog:'+req.user._id,30);
    const offset=z.coerce.number().int().min(0).max(100000).default(0).parse(req.query.offset);
    const result=await meli.request(req.user,'/users/'+req.user.meliId+'/items/search?offset='+offset+'&limit=50');
    const items=[];
    // Secuencial para respetar límites de API y memoria.
    for(let i=0;i<(result.results||[]).length;i+=20) {
      const ids=result.results.slice(i,i+20).map(id=>itemId.parse(id));
      const page=await meli.request(req.user,'/items?ids='+ids.join(','));
      for(const entry of page) if(entry.code===200&&String(entry.body.seller_id)===String(req.user.meliId)) {
        const {id,title,thumbnail,secure_thumbnail,status,available_quantity,sold_quantity,price,currency_id,permalink,variations}=entry.body;
        items.push({id,title,thumbnail:secure_thumbnail||thumbnail,status,available_quantity,sold_quantity,price,currency_id,permalink,
          variations:(variations||[]).map(v=>({id:v.id,attribute_combinations:v.attribute_combinations,available_quantity:v.available_quantity,price:v.price}))});
      }
    }
    res.json({items,total:result.paging?.total||0,nextOffset:offset+50<(result.paging?.total||0)?offset+50:null});
  }));
  router.get('/products/saved',wrap(async(req,res)=>{
    const active=new Set((await allowedFlows(req.user)).map(p=>p.id));
    const products=await Product.find({owner:req.user._id}).sort({createdAt:1,_id:1}).lean();
    res.json(products.map(p=>({...p,effectiveActive:active.has(p.id)})));
  }));
  router.get('/products/template/:id',wrap(async(req,res)=>res.json(await productOwned(req.params.id,req.user._id))));
  router.get('/products/:id/refetch-id',wrap(async(req,res)=>res.json(await meli.item(req.user,itemId.parse(req.params.id)))));
  router.post('/products/:id/assign-templates-modal',wrap(async(req,res)=>{
    const id=itemId.parse(req.params.id);
    const data=z.object({templateIds,productAsign:z.string().max(500).optional(),variationId:z.union([z.string().regex(/^\d+$/),z.number().int().nonnegative()]).nullable().optional(),variationName:z.string().max(500).optional()}).strict().parse(req.body);
    const result=await mutate(req,async(user,lease)=>{
      const templates=await ownedTemplates(data.templateIds,user._id);
      const source=await meli.item(user,id);await lease();
      let product=await Product.findOne({id,owner:user._id});
      ensure(product||await Product.countDocuments({owner:user._id})<planFor(user).flows,402,'Alcanzaste el límite de flujos.','PLAN_LIMIT');
      product ||= new Product({id,owner:user._id,title:source.title,site_id:source.site_id});
      if(data.variationId) {
        const variant=source.variations?.find(v=>String(v.id)===String(data.variationId));ensure(variant,404,'Variante no encontrada.');
        const entry={id:String(variant.id),name:(variant.attribute_combinations||[]).map(a=>a.value_name).join(' / '),templates:refs(templates)};
        const i=product.variations.findIndex(v=>v.id===entry.id);if(i<0)product.variations.push(entry);else product.variations[i]=entry;
      } else product.templates=refs(templates);
      await product.save();return product;
    });res.json(result);
  }));
  router.patch('/products/:id/settings',wrap(async(req,res)=>{
    const data=z.object({enabled:z.boolean().optional(),markDelivered:z.boolean().optional()}).strict().parse(req.body);
    res.json(await mutate(req,async user=>{const p=await productOwned(req.params.id,user._id);Object.assign(p,data);return p.save();}));
  }));
  router.post('/products/:id/assign-delay',wrap(async(req,res)=>{
    const {delayHours}=z.object({delayHours:z.coerce.number().int().min(1).max(72)}).strict().parse(req.body);
    res.json(await mutate(req,async user=>{ensure(planFor(user).delayed,402,'Los mensajes diferidos están disponibles desde Premium.','PLAN_LIMIT');const p=await productOwned(req.params.id,user._id);p.secondMessageDelay=delayHours;await p.save();return {secondMessageDelay:delayHours};}));
  }));
  router.post('/templates/:id/assign-second-messages',wrap(async(req,res)=>{
    const data=z.object({templateIds}).strict().parse(req.body);
    res.json(await mutate(req,async user=>{ensure(planFor(user).delayed,402,'Los mensajes diferidos requieren Premium o Plus.','PLAN_LIMIT');const p=await productOwned(req.params.id,user._id);p.secondMessages=refs(await ownedTemplates(data.templateIds,user._id));return p.save();}));
  }));
  router.post('/products/assign-template-to-all',wrap(async(req,res)=>{
    const {templateId}=z.object({templateId:objectId}).strict().parse(req.body);
    await mutate(req,async user=>{const [tpl]=await ownedTemplates([templateId],user._id);const products=await allowedFlows(user);
      for(const p of products) {ensure(p.templates.length<10||p.templates.some(t=>String(t.templateId)===templateId),400,'Un flujo ya tiene 10 mensajes.');}
      for(const p of products) if(!p.templates.some(t=>String(t.templateId)===templateId))await Product.updateOne({_id:p._id,owner:user._id},{$push:{templates:refs([tpl])[0]}});
    });res.json({ok:true});
  }));
  router.patch('/products/:id/templates/reorder',wrap(async(req,res)=>{
    const data=z.object({templateId:objectId,direction:z.enum(['up','down']),variationId:z.union([z.string(),z.number()]).nullable().optional()}).strict().parse(req.body);
    res.json(await mutate(req,async user=>{
      const p=await productOwned(req.params.id,user._id);
      const list=data.variationId?p.variations.find(v=>v.id===String(data.variationId))?.templates:p.templates;
      ensure(list,404,'Variante no encontrada.');
      const i=list.findIndex(t=>String(t.templateId)===data.templateId),j=i+(data.direction==='up'?-1:1);
      ensure(i>=0,404,'Asignación no encontrada.');if(j>=0&&j<list.length) {const temp=list[i];list[i]=list[j];list[j]=temp;}
      await p.save();return {templates:p.templates};
    }));
  }));
  for(const kind of ['templates','second-template']) router.delete('/products/:id/'+kind+'/:templateId',wrap(async(req,res)=>{
    const tid=objectId.parse(req.params.templateId);
    await mutate(req,async user=>{
      const p=await productOwned(req.params.id,user._id);
      const keep=t=>String(t.templateId)!==tid;
      if(kind==='second-template')p.secondMessages=p.secondMessages.filter(keep);
      else if(req.query.variationId){const v=p.variations.find(v=>v.id===String(req.query.variationId));ensure(v,404,'Variante no encontrada.');v.templates=v.templates.filter(keep);}
      else p.templates=p.templates.filter(keep);
      await p.save();
    });res.status(204).end();
  }));
  router.delete('/products/:id/saved-product',wrap(async(req,res)=>{
    await mutate(req,async user=>{const p=await productOwned(req.params.id,user._id);await p.deleteOne();});res.status(204).end();
  }));
  const report=async req=>{
    await rate(redis,'reports:'+req.user._id,6,300);
    const range=validateDateRange(req.query.from,req.query.to),plan=planFor(req.user);
    const oldest=new Date();oldest.setUTCDate(oldest.getUTCDate()-plan.statisticsDays+1);
    ensure(range.rangeDays<=plan.statisticsDays && range.from>=oldest.toISOString().slice(0,10),402,'Tu plan permite consultar los últimos '+plan.statisticsDays+' días.','PLAN_LIMIT');
    ensure(range.to<=new Date().toISOString().slice(0,10),400,'No podés consultar fechas futuras.');
    return withLock(redis,'reports:'+req.user._id,async()=>{
      const orders=await meli.orders(req.user,range.fromIso,range.toIso);
      const a=aggregateSales(orders,range);
      return {orders,report:{summary:a.summary,timeline:a.timeline,topProducts:a.topProducts,recentOrders:a.recentOrders,meta:{...range,currencyId:a.currencyId,generatedAt:new Date().toISOString(),source:'Mercado Libre'}}};
    });
  };
  router.get('/statistics/sales',wrap(async(req,res)=>res.json((await report(req)).report)));
  router.get('/statistics/sales/export',wrap(async(req,res)=>{ensure(planFor(req.user).export,402,'La exportación CSV está disponible desde Premium.','PLAN_LIMIT');res.attachment('flowsell-ventas.csv').type('text/csv').send(createSalesCsv((await report(req)).orders));}));
  router.post('/client-tracking',wrap(async(req,res)=>{
    const data=z.object({itemIds:z.array(itemId).min(1).max(150),startDate:z.iso.datetime(),endDate:z.iso.datetime()}).strict().parse(req.body);
    const job=await mutate(req,async user=>{
      const plan=planFor(user);ensure(plan.campaigns,402,'Las campañas están disponibles desde Premium.','PLAN_LIMIT');
      const range=validateDateRange(data.startDate.slice(0,10),data.endDate.slice(0,10));
      ensure(range.rangeDays<=plan.statisticsDays,402,'El rango excede tu plan.','PLAN_LIMIT');
      const oldest=new Date(Date.now()-(plan.statisticsDays-1)*86400000).toISOString().slice(0,10);
      ensure(range.from>=oldest && range.to<=new Date().toISOString().slice(0,10),400,'El período debe estar dentro del historial habilitado.');
      ensure(await JobModel.countDocuments({userId:String(user._id),status:{$in:['PENDING','IN_PROGRESS','PROCESSING']}})<2,429,'Esperá a que finalice la búsqueda en curso.');
      for(const id of data.itemIds) await meli.item(user,id);
      await consume(user._id,'searches',plan.campaigns*5);
      const job=await JobModel.create({userId:String(user._id),jobId:randomUUID(),status:'PENDING',itemIds:[...new Set(data.itemIds)],from:range.fromIso,to:range.toIso});
      try{await queue.add('buyers',{jobId:job.jobId},{jobId:'buyers-'+job.jobId});}catch(e){job.status='FAILED';job.errorCode='QUEUE_UNAVAILABLE';await job.save();throw e;}return job;
    });res.status(202).json({jobId:job.jobId});
  }));
  router.get('/client-tracking/buyers/:id',wrap(async(req,res)=>{
    const id=z.uuid().parse(req.params.id);
    const job=await JobModel.findOne({jobId:id,userId:String(req.user._id)}).select('-__v').lean();ensure(job,404,'Campaña no encontrada.');res.json(job);
  }));
  router.post('/client-tracking/send',wrap(async(req,res)=>{
    const data=z.object({jobId:z.uuid(),templateIds:templateIds.refine(a=>a.length>0),itemIds:z.array(itemId).optional()}).strict().parse(req.body);
    await mutate(req,async user=>{
      const plan=planFor(user);ensure(plan.campaigns,402,'Tu plan no incluye campañas.','PLAN_LIMIT');
      const job=await JobModel.findOne({jobId:data.jobId,userId:String(user._id)});ensure(job,404,'Campaña no encontrada.');
      ensure(job.status==='COMPLETED'&&job.statusMessagesMassive==='PENDING',409,'Esta campaña todavía no está lista o ya se inició.');
      ensure(job.buyers.length>0&&job.buyers.length<=plan.recipients,402,'La audiencia excede el cupo del plan.','PLAN_LIMIT');
      await ownedTemplates(data.templateIds,user._id);
      await consume(user._id,'campaigns',plan.campaigns);
      job.templateIds=data.templateIds;job.statusMessagesMassive='PROCESSING';await job.save();
      // Outbox: mantenimiento recupera PROCESSING sin tarea si falla Redis aquí.
      await queue.add('campaign',{jobId:job.jobId},{jobId:'campaign-'+job.jobId});
    });res.status(202).json({jobId:data.jobId,status:'PROCESSING'});
  }));
  router.get('/activity',wrap(async(req,res)=>res.json(await Delivery.find({owner:req.user._id}).select('orderId phase status reason createdAt').sort({createdAt:-1}).limit(50).lean())));
  return router;
}
