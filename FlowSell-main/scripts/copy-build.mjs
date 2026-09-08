import {cp,mkdir,rename,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const source=new URL('frontend/build/',root),destination=new URL('backend/public/build/',root);
await access(new URL('index.html',source));
await mkdir(new URL('backend/public/',root),{recursive:true});
try {
  await access(destination);
  // Respaldo temporal fuera del árbol publicado. Sólo se mueve el build generado.
  const history=new URL('.build-history/',root);await mkdir(history,{recursive:true});
  await rename(fileURLToPath(destination),fileURLToPath(new URL('build-'+Date.now(),history)));
} catch(error) {if(error.code!=='ENOENT')throw error;}
await cp(source,destination,{recursive:true});
console.log('Frontend copiado al directorio público del backend.');
