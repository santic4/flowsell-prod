import {Worker} from 'bullmq';
import User from '../models/User.js';
import {Template} from '../models/Template.js';
import {Product} from '../models/Product.js';
import Order from '../models/Order.js';
import {JobModel} from '../models/jobModel.js';
import {Media,Delivery,Notice,Usage,PlanRequest,Audit} from '../models/Security.js';
import {config,planFor,legalReady,production} from './config.js';
import {withLock,consume,hashKey} from './runtime.js';
import {ensure,log} from './errors.js';
import {liveUser,allowedFlows} from '../http/operations.js';
import {MEDIA_MAX} from './media.js';

const transient = error => ['OPERATION_BUSY','REDIS_UNAVAILABLE','LOCK_LOST','RATE_LIMIT','MELI_NETWORK','MELI_429','MELI_502','MELI_503','MELI_504'].includes(error.code);

export function jobHandlers(deps) {
  const {redis,queue,meli,media}=deps;
  async function deliver(owner,orderId,templateId,phase,jobId,flowId) {
    return withLock(redis,'account:'+owner,async lease=>{
      const user=await liveUser(owner),plan=planFor(user);
      ensure(!production||legalReady(),503,'Operación pausada.');
      if(phase==='delayed'&&!plan.delayed)return 'blocked';
      if(phase==='campaign') {
        ensure(plan.campaigns>0,402,'Plan sin campañas.');
        const job=await JobModel.findOne({jobId,userId:String(owner),statusMessagesMassive:'PROCESSING'});
        ensure(job&&job.buyers.length<=plan.recipients&&job.templateIds.includes(String(templateId)),403,'Campaña no habilitada.');
      } else {
        const flows=await allowedFlows(user);
        const product=flows.find(p=>p.id===flowId);if(!product)return 'blocked';
        const assigned=phase==='delayed'?product.secondMessages:[...product.templates,...product.variations.flatMap(v=>v.templates)];
        if(!assigned.some(t=>String(t.templateId)===String(templateId)))return 'blocked';
      }
      const template=await Template.findOne({_id:templateId,owner});
      ensure(template,404,'Plantilla no disponible.');
      const order=await meli.order(user,orderId);
      ensure(order.status==='paid' && order.buyer?.id,409,'Orden no habilitada.');
      // Las variantes también se vuelven a validar al ejecutar, no sólo al programar.
      if(phase==='initial') {
        const p=(await allowedFlows(user)).find(p=>p.id===flowId);
        const applicable=(order.order_items||[]).filter(i=>i.item?.id===flowId).flatMap(i=>{
          const v=p?.variations?.find(v=>v.id===String(i.item?.variation_id));
          return v?.templates?.length?v.templates:p?.templates||[];
        });
        if(!applicable.some(t=>String(t.templateId)===String(templateId))) return 'blocked';
      }
      const key=hashKey(owner+':'+orderId+':'+phase+':'+templateId+(phase==='campaign'?':'+jobId:''));
      let record;
      try{record=await Delivery.create({owner,key,orderId:String(orderId),templateId,phase,jobId,status:'preparing'});}
      catch(e){if(e.code===11000)return (await Delivery.findOne({key})).status;throw e;}
      try {
        // Cupo de intentos: nunca se repite automáticamente un POST con resultado incierto.
        await consume(owner,'messages',plan.messages);
        const attachments=[];
        for(const path of template.attachments||[]) {
          const id=/^\/api\/media\/([a-f0-9]{24})$/i.exec(path)?.[1];ensure(id,409,'Migración de adjuntos pendiente.','MEDIA_MIGRATION_REQUIRED');
          const file=await Media.findOne({_id:id,owner,state:'ready'});ensure(file,404,'Adjunto no disponible.');
          const bytes=await media.bytes(file);ensure(bytes.length<=MEDIA_MAX,413,'Adjunto demasiado grande.');
          const form=new FormData();form.append('file',new Blob([bytes],{type:'image/webp'}),'imagen.webp');
          const result=await meli.request(user,'/messages/attachments',{method:'POST',body:form});
          ensure(result.id,502,'No se pudo adjuntar la imagen.');attachments.push({id:result.id,type:'image'});
        }
        await lease();await liveUser(owner);
        record.status='sending';await record.save();
        await meli.request(user,'/messages/packs/'+(order.pack_id||order.id)+'/sellers/'+user.meliId+'?tag=post_sale',{
          method:'POST',headers:{'Content-Type':'application/json','x-client-id':config.clientId},
          body:JSON.stringify({from:{user_id:user.meliId},to:{user_id:String(order.buyer.id)},text:template.content,...(attachments.length?{attachments}:{})}),
        });
        record.status='sent';await record.save();return 'sent';
      } catch(e) {
        record.status=record.status==='sending'&&!/^MELI_4\d\d$/.test(e.code||'')?'uncertain':e.code==='PLAN_LIMIT'?'blocked':'failed';
        record.reason=['PLAN_LIMIT','MEDIA_MIGRATION_REQUIRED'].includes(e.code)?e.code:'PROVIDER_OR_CONNECTION';
        await record.save();return record.status;
      }
    });
  }
  async function notification(data) {
    const notice=await Notice.findById(data.noticeId);if(!notice?.pending)return;
    const receivedAt=notice.receivedAt;
    const user=await liveUser(notice.owner);
    const order=await meli.order(user,notice.orderId);
    if(order.status==='paid') {
      // Evita reenviar órdenes de la instalación anterior (no tenían ledger por plantilla).
      const old=await Order.exists({owner:user._id,orderId:String(order.id)});
      if(!old) {
        const flows=await allowedFlows(user),sent=new Set();
        for(const item of order.order_items||[]) {
          const p=flows.find(p=>p.id===item.item?.id);if(!p)continue;
          if(p.createdAt && new Date(order.date_created)<new Date(p.createdAt))continue;
          const v=p.variations.find(v=>v.id===String(item.item?.variation_id));
          const initial=v?.templates?.length?v.templates:p.templates;
          for(const t of initial) {
            const key=String(t.templateId);if(sent.has(key))continue;sent.add(key);
            await deliver(user._id,order.id,t.templateId,'initial',null,p.id);
          }
          if(planFor(user).delayed) for(const t of p.secondMessages) {
            await queue.add('delayed',{owner:String(user._id),orderId:String(order.id),templateId:String(t.templateId),flowId:p.id},{
              jobId:'delayed-'+hashKey(user._id+':'+order.id+':'+t.templateId),delay:Math.max(0,new Date(order.date_created).getTime()+(p.secondMessageDelay||24)*3600000-Date.now()),removeOnComplete:{age:400*86400,count:20000},
            });
          }
        }
        // La confirmación de entrega es optativa y sólo para órdenes sin envío físico.
        const configured=(order.order_items||[]).map(i=>flows.find(p=>p.id===i.item?.id));
        if(!order.shipping?.id && configured.length && configured.every(p=>p?.markDelivered===true)) {
          await withLock(redis,'account:'+user._id,async lease=>{
            const fresh=await liveUser(user._id),current=await allowedFlows(fresh);
            if(!configured.every(p=>current.find(c=>c.id===p.id)?.markDelivered))return;
            const failed=await Delivery.exists({owner:user._id,orderId:String(order.id),phase:'initial',status:{$ne:'sent'}});
            if(failed||!await Delivery.exists({owner:user._id,orderId:String(order.id),phase:'initial',status:'sent'}))return;
            const key=hashKey(user._id+':'+order.id+':delivery-confirmation');
            try{await Delivery.create({owner:user._id,key,orderId:String(order.id),phase:'delivery-confirmation',status:'sending'});}catch(e){if(e.code===11000)return;throw e;}
            await lease();
            try{await meli.request(fresh,'/orders/'+order.id+'/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fulfilled:true,rating:'positive'})});await Delivery.updateOne({key},{$set:{status:'sent'}});}
            catch {await Delivery.updateOne({key},{$set:{status:'uncertain',reason:'PROVIDER_OR_CONNECTION'}});}
          });
        }
      }
    }
    await Notice.updateOne({_id:notice._id,receivedAt},{$set:{pending:false}});
  }
  async function buyers(data) {
    const job=await JobModel.findOne({jobId:data.jobId});if(!job||job.status==='COMPLETED')return;
    try {
      const user=await liveUser(job.userId),plan=planFor(user);ensure(plan.campaigns,402,'Plan sin campañas.');
      job.status='IN_PROGRESS';await job.save();
      for(const id of job.itemIds)await meli.item(user,id);
      const orders=await meli.orders(user,job.from,job.to),byBuyer=new Map();
      for(const o of orders)if(o.buyer?.id && o.order_items?.some(i=>job.itemIds.includes(i.item?.id))) {
        // Un contacto por comprador, utilizando la orden más reciente.
        const old=byBuyer.get(String(o.buyer.id));
        if(!old||new Date(o.date_created)>new Date(old.date))byBuyer.set(String(o.buyer.id),{buyerId:String(o.buyer.id),nickname:String(o.buyer.nickname||''),order_id:String(o.id),date:o.date_created});
      }
      ensure(byBuyer.size<=plan.recipients,402,'La audiencia excede el plan. Acortá el período.');
      await liveUser(job.userId);
      job.buyers=[...byBuyer.values()].map(({date,...b})=>b);job.status='COMPLETED';job.completedAt=new Date();
      job.progress={percent:100,processedSoFar:orders.length,totalEstimate:orders.length};await job.save();
    } catch(e){
      if(transient(e)){await JobModel.updateOne({_id:job._id},{$set:{status:'PENDING'}});throw e;}
      await JobModel.updateOne({_id:job._id},{$set:{status:'FAILED',errorCode:e.code==='PLAN_LIMIT'?'PLAN_LIMIT':'SEARCH_FAILED'}});
    }
  }
  async function campaign(data) {
    const job=await JobModel.findOne({jobId:data.jobId,statusMessagesMassive:'PROCESSING'});if(!job)return;
    try {
      for(const buyer of job.buyers) for(const tid of job.templateIds) {
        await deliver(job.userId,buyer.order_id,tid,'campaign',job.jobId);
        const sent=await Delivery.countDocuments({owner:job.userId,jobId:job.jobId,status:'sent'});
        const failed=await Delivery.countDocuments({owner:job.userId,jobId:job.jobId,status:{$ne:'sent'}});
        await JobModel.updateOne({_id:job._id},{$set:{sent,failed}});
      }
      const bad=await Delivery.exists({owner:job.userId,jobId:job.jobId,status:{$ne:'sent'}});
      await JobModel.updateOne({_id:job._id},{$set:{statusMessagesMassive:bad?'FAILED':'COMPLETED',completedAt:new Date()}});
    }catch(e){
      // La contención ocurre antes del POST; conservar PROCESSING permite recuperarla.
      // Los envíos intentados ya tienen un ledger y nunca se repiten automáticamente.
      if(!transient(e))await JobModel.updateOne({_id:job._id},{$set:{statusMessagesMassive:'FAILED',errorCode:'SEND_INTERRUPTED'}});
      throw e;
    }
  }
  async function cleanup() {
    // Archivos huérfanos de una carga interrumpida también se recogen.
    const pending=await Media.find({$or:[{state:'deleting'},{state:'pending',createdAt:{$lt:new Date(Date.now()-86400000)}}]}).limit(100);
    for(const file of pending) {
      try {await media.remove(file);}catch{log('media_cleanup_pending');}
    }
    // Una caída entre la carga y el guardado de la plantilla puede dejar una imagen sin referencia.
    for(const file of await Media.find({state:'ready',createdAt:{$lt:new Date(Date.now()-86400000)}}).limit(200)) {
      if(!await Template.exists({owner:file.owner,attachments:'/api/media/'+file._id})) {
        try{await media.remove(file);}catch{log('orphan_cleanup_pending');}
      }
    }
    for(const user of await User.find({status:'deleting'}).limit(20)) {
      if(await Media.exists({owner:user._id}))continue;
      const legacy=await Template.exists({owner:user._id,attachments:{$elemMatch:{$regex:'^https?://'}}});
      if(legacy){log('legacy_media_cleanup_required');continue;}
      await Promise.all([Template.deleteMany({owner:user._id}),Product.deleteMany({owner:user._id}),JobModel.deleteMany({userId:String(user._id)}),
        Order.deleteMany({owner:user._id}),Delivery.deleteMany({owner:user._id}),Usage.deleteMany({owner:user._id}),PlanRequest.deleteMany({owner:user._id}),Notice.deleteMany({owner:user._id}),
        Audit.deleteMany({$or:[{actor:user._id},{target:user._id}]})]);
      // Elimina sesiones por identidad, también las invalidadas que aún no vencieron.
      await User.db.collection('sessions').deleteMany({session:{$regex:'"id":"'+user._id+'"'}});
      await User.deleteOne({_id:user._id,status:'deleting'});
    }
    await Delivery.updateMany({status:{$in:['preparing','sending']},updatedAt:{$lt:new Date(Date.now()-15*60000)}},{$set:{status:'uncertain',reason:'INTERRUPTED'}});
    await PlanRequest.deleteMany({status:'resolved',updatedAt:{$lt:new Date(Date.now()-180*86400000)}});
  }
  return {notification,buyers,campaign,delayed:d=>deliver(d.owner,d.orderId,d.templateId,'delayed',null,d.flowId),cleanup};
}
export async function startWorkers(deps) {
  const handlers=jobHandlers(deps);
  const worker=new Worker('flowsell-v2',async job=>{
    if(!handlers[job.name])throw new Error('UNKNOWN_JOB');
    const identity=job.data.jobId||job.data.noticeId||job.id;
    return withLock(deps.redis,'job:'+job.name+':'+identity,()=>handlers[job.name](job.data));
  },{connection:deps.queueRedis,concurrency:2,limiter:{max:30,duration:1000},lockDuration:120000});
  worker.on('failed',job=>log('job_failed',{kind:job?.name||'unknown'}));
  worker.on('error',()=>log('worker_error'));
  let dispatching=false;
  const dispatch=async()=>{
    if(dispatching)return;dispatching=true;
    try {
      await withLock(deps.redis,'dispatcher',async()=>{
        for(const n of await Notice.find({pending:true}).limit(100))await deps.queue.add('notification',{noticeId:String(n._id)},{jobId:'notice-'+n._id+'-'+Math.floor(Date.now()/60000)});
        for(const j of await JobModel.find({$or:[{status:{$in:['PENDING','IN_PROGRESS']}},{statusMessagesMassive:'PROCESSING'}]}).limit(50)) {
          const kind=['PENDING','IN_PROGRESS'].includes(j.status)?'buyers':'campaign';
          await deps.queue.add(kind,{jobId:j.jobId},{jobId:kind+'-'+j.jobId+'-'+Math.floor(Date.now()/60000)});
        }
        await deps.queue.add('cleanup',{}, {jobId:'cleanup-'+Math.floor(Date.now()/300000)});
      });
    } catch(e){if(e.code!=='OPERATION_BUSY')log('dispatcher_unavailable');}finally{dispatching=false;}
  };
  const timer=setInterval(dispatch,30000);timer.unref();await dispatch();
  return {worker,async close(){clearInterval(timer);await worker.close();}};
}
