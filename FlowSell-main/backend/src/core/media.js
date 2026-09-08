import {v2 as cloudinary} from 'cloudinary';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {config,planFor} from './config.js';
import {ensure,AppError} from './errors.js';
import {Media} from '../models/Security.js';
import {limitedBuffer} from './meli.js';
import User from '../models/User.js';
import {consume} from './runtime.js';

export const MEDIA_MAX=2*1024*1024;
export const mediaPath=id=>'/api/media/'+id;
export async function normalizeImage(buffer) {
  ensure(buffer.length<=MEDIA_MAX,413,'Cada imagen puede pesar hasta 2 MB.');
  try {
    const source=sharp(buffer,{limitInputPixels:20000000,animated:false,failOn:'warning'});
    const info=await source.metadata();
    ensure(['jpeg','png','webp'].includes(info.format) && (!info.pages||info.pages===1),400,'Usá JPG, PNG o WEBP estáticos.');
    const data=await source.rotate().resize({width:2560,height:2560,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
    ensure(data.length<=MEDIA_MAX,413,'La imagen normalizada supera 2 MB.');
    return data;
  } catch(error){ if(error instanceof AppError) throw error;throw new AppError(400,'La imagen está dañada o tiene un formato no permitido.');}
}
export class MediaStore {
  constructor(){
    cloudinary.config({cloud_name:config.cloudName,api_key:config.cloudKey,api_secret:config.cloudSecret,secure:true,timeout:20000});
  }
  async upload(user,files,assertLease=async()=>{}) {
    ensure(files.length<=5,400,'Podés adjuntar hasta 5 imágenes.');
    const used=await Media.aggregate([{$match:{owner:user._id}},{$group:{_id:null,bytes:{$sum:'$bytes'}}}]);
    const normalized=[];for(const f of files) normalized.push(await normalizeImage(f.buffer));
    if(files.length)await consume(user._id,'uploads',{free:30,premium:500,plus:1500}[planFor(user).id],files.length);
    ensure((used[0]?.bytes||0)+normalized.reduce((s,b)=>s+b.length,0)<=planFor(user).storageBytes,402,'El almacenamiento de tu plan está completo.','PLAN_LIMIT');
    const created=[];
    try {
      for(const data of normalized) {
        await assertLease();
        const media=await Media.create({owner:user._id,publicId:config.cloudFolder+'/'+user._id+'/'+randomUUID(),bytes:data.length,format:'webp'});
        created.push(media);
        await new Promise((resolve,reject)=>cloudinary.uploader.upload_stream({public_id:media.publicId,type:'authenticated',resource_type:'image',overwrite:false,format:'webp'},(error,result)=>error?reject(new AppError(502,'No se pudo guardar la imagen.','MEDIA_UPLOAD')):resolve(result)).end(data));
        await assertLease();
        media.state='ready';await media.save();
      }
      return created;
    } catch(error){await Media.updateMany({_id:{$in:created.map(m=>m._id)}},{$set:{state:'deleting'}});throw error;}
  }
  async bytes(media) {
    ensure(media.state==='ready',404,'Archivo no encontrado.');
    const user=await User.findOne({_id:media.owner,status:{$nin:['deleting','disconnected']}});
    ensure(user,404,'Archivo no encontrado.');
    const budget={free:250,premium:5000,plus:20000}[planFor(user).id]*1024*1024;
    // Se reserva antes de consultar Cloudinary, incluso si la descarga falla.
    await consume(user._id,'mediaBytes',budget,Math.max(1,media.bytes||MEDIA_MAX));
    await consume('000000000000000000000000','mediaBytes',Number(process.env.CLOUDINARY_GLOBAL_MONTHLY_MB||100000)*1024*1024,Math.max(1,media.bytes||MEDIA_MAX));
    const url=cloudinary.utils.private_download_url(media.publicId,media.format,{type:'authenticated',resource_type:'image',expires_at:Math.floor(Date.now()/1000)+60,attachment:false});
    return limitedBuffer(await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)}),MEDIA_MAX);
  }
  async remove(media) {
    const result=await cloudinary.uploader.destroy(media.publicId,{type:'authenticated',resource_type:'image',invalidate:true});
    ensure(['ok','not found'].includes(result.result),502,'No se pudo eliminar el archivo.','MEDIA_DELETE');
    await Media.deleteOne({_id:media._id,owner:media.owner});
  }
}
