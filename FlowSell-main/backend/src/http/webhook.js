import {z} from 'zod';
import User from '../models/User.js';
import {Notice} from '../models/Security.js';
import {config,consentCurrent,legalReady,production} from '../core/config.js';
import {equalSecret} from '../core/crypto.js';
import {rate} from '../core/runtime.js';
import {ensure,wrap} from '../core/errors.js';

export function mountWebhook(router,{redis,queue}) {
  router.post('/payments/:secret',wrap(async(req,res)=>{
    ensure(config.webhookSecret.length>=48 && equalSecret(req.params.secret,config.webhookSecret),404,'Endpoint no encontrado.');
    await rate(redis,'webhook:ip:'+req.ip,300);
    const numeric=z.union([z.string().regex(/^\d{1,24}$/),z.number().int().positive()]).transform(String);
    const data=z.object({topic:z.string().max(50),resource:z.string().max(80),user_id:numeric,application_id:numeric}).parse(req.body);
    ensure(data.application_id===String(config.clientId),403,'Notificación no válida.');
    if(data.topic!=='orders_v2') return res.status(202).json({accepted:true});
    ensure(/^\/orders\/\d{1,24}$/.test(data.resource),400,'Recurso de notificación no válido.');
    await rate(redis,'webhook:seller:'+data.user_id,120);
    const user=await User.findOne({meliId:data.user_id,status:{$nin:['deleting','disconnected']}});
    if(!user||!consentCurrent(user)||(production&&!legalReady()))return res.status(202).json({accepted:true});
    const notice=await Notice.findOneAndUpdate({owner:user._id,orderId:data.resource.slice(8)},{$set:{pending:true,receivedAt:new Date()}},{new:true,upsert:true});
    // Primero MongoDB. El despachador recupera esta entrada si Redis está indisponible después de guardarla.
    await queue.add('notification',{noticeId:String(notice._id)}).catch(()=>{});
    res.status(202).json({accepted:true});
  }));
}
