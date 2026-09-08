import User from '../models/User.js';
import {config} from './config.js';
import {decryptToken,encryptToken} from './crypto.js';
import {rate,withLock} from './runtime.js';
import {AppError,ensure} from './errors.js';

export async function limitedBuffer(response,maxBytes=3*1024*1024) {
  ensure(response.ok,502,'El proveedor no pudo completar la operación.','PROVIDER_ERROR');
  ensure(Number(response.headers.get('content-length')||0)<=maxBytes,413,'El archivo o respuesta es demasiado grande.');
  const chunks=[];let size=0;
  for await(const chunk of response.body) {size+=chunk.length;if(size>maxBytes){await response.body.cancel?.().catch(()=>{});throw new AppError(413,'La respuesta superó el límite.');} chunks.push(Buffer.from(chunk));}
  return Buffer.concat(chunks);
}
export async function meliRequest(path,token,options={}) {
  ensure(/^\/[a-zA-Z0-9/_?=&.%+,:-]+$/.test(path) && !path.includes('..'),400,'Recurso inválido.');
  let response;
  try {response=await fetch('https://api.mercadolibre.com'+path,{...options,headers:{...(token?{Authorization:'Bearer '+token}:{}),...options.headers},redirect:'error',signal:AbortSignal.timeout(20000)});}
  catch {throw new AppError(502,'Mercado Libre no respondió.','MELI_NETWORK');}
  if(!response.ok) throw new AppError(response.status===401?401:response.status===429?429:502,'Mercado Libre no pudo completar la solicitud.','MELI_'+response.status);
  const bytes=await limitedBuffer(response);
  return bytes.length?JSON.parse(bytes.toString()):{};
}
export class Meli {
  constructor(redis){this.redis=redis;}
  async token(user) {
    const get=()=>User.findOne({_id:user._id,status:{$nin:['deleting','disconnected']}}).select('+accessToken +refreshToken');
    let current=await get();ensure(current,401,'Volvé a conectar tu cuenta.','RECONNECT');
    if(current.expiresAt && new Date(current.expiresAt).getTime()>Date.now()+120000) return decryptToken(current.accessToken,current.meliId);
    return withLock(this.redis,'refresh:'+user._id,async assertLease=>{
      current=await get();ensure(current,401,'Volvé a conectar tu cuenta.');
      if(current.expiresAt && new Date(current.expiresAt).getTime()>Date.now()+120000) return decryptToken(current.accessToken,current.meliId);
      const body=new URLSearchParams({grant_type:'refresh_token',client_id:config.clientId,client_secret:config.clientSecret,refresh_token:decryptToken(current.refreshToken,current.meliId)});
      const data=await meliRequest('/oauth/token',null,{method:'POST',body});
      ensure(data.access_token && data.refresh_token && Number(data.expires_in)>0,502,'Respuesta de autorización inválida.');
      await assertLease();
      const result=await User.updateOne({_id:current._id,status:{$nin:['deleting','disconnected']},sessionVersion:current.sessionVersion},{$set:{accessToken:encryptToken(data.access_token,current.meliId),refreshToken:encryptToken(data.refresh_token,current.meliId),expiresAt:new Date(Date.now()+data.expires_in*1000),lastUpdated:new Date()}});
      ensure(result.matchedCount,401,'La conexión se cerró.');
      return data.access_token;
    });
  }
  async request(user,path,options={}) {
    await rate(this.redis,'meli:'+user._id,240);
    return meliRequest(path,await this.token(user),options);
  }
  async item(user,id) {
    ensure(/^ML[A-Z]\d{5,20}$/.test(id),400,'ID de publicación inválido.');
    const item=await this.request(user,'/items/'+id);
    ensure(String(item.seller_id)===String(user.meliId),404,'Publicación no encontrada.');
    return item;
  }
  async order(user,id) {
    ensure(/^\d{1,24}$/.test(String(id)),400,'Orden inválida.');
    const order=await this.request(user,'/orders/'+id);
    ensure(String(order.seller?.id)===String(user.meliId),404,'Orden no encontrada.');
    return order;
  }
  async orders(user,from,to,max=10000) {
    let offset=0,total=Infinity; const results=[];
    while(offset<total) {
      const params=new URLSearchParams({seller:user.meliId,'order.date_created.from':from,'order.date_created.to':to,'order.status':'paid',offset:String(offset),limit:'50'});
      const page=await this.request(user,'/orders/search?'+params);
      total=Number(page.paging?.total||0);
      ensure(total<=max,422,'Hay demasiadas ventas para una sola consulta. Acortá el período.');
      const orders=page.results||[];
      results.push(...orders.filter(o=>String(o.seller?.id)===String(user.meliId) && o.status==='paid'));
      if(!orders.length) break;
      offset+=50;
    }
    return results;
  }
}
