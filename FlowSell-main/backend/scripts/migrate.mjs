import 'dotenv/config';
import mongoose from 'mongoose';
import {v2 as cloudinary} from 'cloudinary';
import sharp from 'sharp';
import User from '../src/models/User.js';
import {Template} from '../src/models/Template.js';
import {Product} from '../src/models/Product.js';
import {JobModel} from '../src/models/jobModel.js';
import {Media} from '../src/models/Security.js';
import Order from '../src/models/Order.js';
import {config} from '../src/core/config.js';
import {keyring,encryptToken,decryptToken} from '../src/core/crypto.js';
import {MediaStore,mediaPath} from '../src/core/media.js';
import {limitedBuffer} from '../src/core/meli.js';
import {legacyPublicId} from '../src/core/legacy-media.js';

const apply=process.argv.includes('--apply'),migrateMedia=process.argv.includes('--media');
const counts={users:0,tokens:0,media:0,mediaPending:0,unsupportedMedia:0};
try {
  if(!config.mongoUrl)throw new Error('Falta MONGO_URI. Ejecutá desde backend.');
  keyring();
  await mongoose.connect(config.mongoUrl,{autoIndex:false,serverSelectionTimeoutMS:10000});
  console.log(apply?'MODO APLICAR: requiere backup y servicios anteriores detenidos.':'SIMULACIÓN: no modifica datos. Agregá --apply para ejecutar.');
  for await(const user of User.find().select('+accessToken +refreshToken').cursor()) {
    counts.users++;
    const changes={plan:user.plan||'free',status:user.status||'active',sessionVersion:(user.sessionVersion||0)+1};
    for(const field of ['accessToken','refreshToken'])if(user[field]) {
      // Reejecutable; también permite rotar claves manteniendo las anteriores en el keyring.
      const plain=user[field].startsWith('enc.')?decryptToken(user[field],user.meliId):user[field];
      changes[field]=encryptToken(plain,user.meliId);counts.tokens++;
    }
    if(apply)await User.updateOne({_id:user._id},{$set:changes});
  }
  if(apply) {
    await Product.updateMany({createdAt:{$exists:false}},{$set:{createdAt:new Date(0),enabled:true,markDelivered:false}});
    const indexes=await Product.collection.indexes().catch(()=>[]);
    const old=indexes.find(i=>i.name==='id_1'&&i.unique&&Object.keys(i.key).length===1&&i.key.id===1);
    if(old)await Product.collection.dropIndex(old.name);
    await Product.createIndexes();
    await JobModel.updateMany({expiresAt:{$exists:false}},{$set:{expiresAt:new Date(Date.now()+90*86400000)}});
    await JobModel.updateMany({status:{$in:['PENDING','IN_PROGRESS','PROCESSING']}},{$set:{status:'FAILED',errorCode:'LEGACY_JOB_CANCELLED'}});
    await JobModel.updateMany({statusMessagesMassive:'PROCESSING'},{$set:{statusMessagesMassive:'FAILED',errorCode:'LEGACY_JOB_CANCELLED'}});
    // El modelo Token sin propietario era un caché obsoleto y no se usa en esta versión.
    await mongoose.connection.collection('tokens').deleteMany({});
    await mongoose.connection.collection('sessions').deleteMany({});
    await Order.collection.createIndex({createdAt:1},{expireAfterSeconds:400*86400});
  }
  const store=migrateMedia?new MediaStore():null;
  if(migrateMedia) for await(const template of Template.find().cursor()) {
    for(const url of [...template.attachments]) {
      if(url.startsWith('/api/media/'))continue;
      const publicId=legacyPublicId(url,template.owner);
      if(!publicId){counts.unsupportedMedia++;continue;}
      counts.media++;
      if(!apply)continue;
      try {
        const owner=await User.findById(template.owner);if(!owner){counts.unsupportedMedia++;continue;}
        // Una cuenta eliminándose sólo requiere borrar la copia pública anterior.
        if(owner.status==='deleting') {
          const result=await cloudinary.uploader.destroy(publicId,{type:'upload',resource_type:'image',invalidate:true});
          if(!['ok','not found'].includes(result.result))throw new Error();
          template.attachments=template.attachments.filter(p=>p!==url);await template.save();continue;
        }
        let file=await Media.findOne({owner:owner._id,legacyUrl:url,state:'ready'});
        if(!file) {
          const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});
          const bytes=await limitedBuffer(response,5*1024*1024);
          const normalized=await sharp(bytes,{limitInputPixels:20000000,animated:false}).rotate().resize({width:2560,height:2560,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
          // Se admite temporalmente la capacidad Plus, sin cambiar el plan guardado.
          // Conserva sus límites máximos de almacenamiento y cargas; ver MIGRACION.md.
          owner.plan='plus';owner.planExpiresAt=null;
          [file]=await store.upload(owner,[{buffer:normalized}]);
          file.legacyUrl=url;await file.save();
        }
        template.attachments=template.attachments.map(p=>p===url?mediaPath(file._id):p);
        await template.save();
        const result=await cloudinary.uploader.destroy(publicId,{type:'upload',resource_type:'image',invalidate:true});
        if(!['ok','not found'].includes(result.result))throw new Error();
        await Media.updateOne({_id:file._id},{$unset:{legacyUrl:1}});
      }catch{counts.mediaPending++;}
    }
  }
  if(migrateMedia&&apply)for await(const file of Media.find({legacyUrl:{$exists:true}}).cursor()){
    const old=legacyPublicId(file.legacyUrl,file.owner);if(!old){counts.unsupportedMedia++;continue;}
    // No elimina el origen si la plantilla aún no enlazó la copia privada.
    if(!await Template.exists({owner:file.owner,attachments:mediaPath(file._id)}))continue;
    try{const result=await cloudinary.uploader.destroy(old,{type:'upload',resource_type:'image',invalidate:true});if(!['ok','not found'].includes(result.result))throw new Error();await Media.updateOne({_id:file._id},{$unset:{legacyUrl:1}});}catch{counts.mediaPending++;}
  }
  console.log(JSON.stringify(counts,null,2));
  if(counts.mediaPending||counts.unsupportedMedia){console.error('Hay archivos que requieren atención. No se eliminaron orígenes desconocidos. Ver MIGRACION.md.');process.exitCode=2;}
  else console.log('Proceso finalizado. No se imprimieron tokens ni URLs privadas.');
}catch{console.error('Migración interrumpida: revisá conexión, claves anteriores y permisos. Conservá el backup.');process.exitCode=1;}
finally{await mongoose.disconnect();}
