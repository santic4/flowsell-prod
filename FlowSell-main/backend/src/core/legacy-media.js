import {config} from './config.js';
// Sólo originales públicos del cloud y carpeta/propietario de esta instalación.
export function legacyPublicId(value,owner) {
  try {
    const u=new URL(value);
    if(u.protocol!=='https:'||u.hostname!=='res.cloudinary.com'||u.username||u.password||u.search||u.hash||u.port)return null;
    const prefix='/'+config.cloudName+'/image/upload/';
    if(!u.pathname.startsWith(prefix))return null;
    let id=decodeURIComponent(u.pathname.slice(prefix.length)).replace(/^v\d+\//,'').replace(/\.(jpg|jpeg|png|webp)$/i,'');
    if(!id.startsWith(config.cloudFolder+'/'+owner+'/'))return null;
    const last=id.slice((config.cloudFolder+'/'+owner+'/').length);
    if(!/^[a-zA-Z0-9_-]{8,100}$/.test(last))return null;
    return id;
  }catch{return null;}
}
