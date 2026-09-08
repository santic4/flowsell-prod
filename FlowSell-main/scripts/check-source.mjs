import {readdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));const problems=[];
const skip=new Set(['node_modules','.git','build','redis-binaries','screenshots','coverage','.build-history']);
async function scan(dir){
  for(const e of await readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name),rel=path.relative(root,p);
    if(e.isDirectory()){if(!skip.has(e.name))await scan(p);continue;}
    if((e.name==='.env'||e.name.startsWith('.env.'))&&e.name!=='.env.example')problems.push(rel+': archivo de credenciales no entregable');
    if(/\.(pem|key|dump|bak)$/.test(e.name))problems.push(rel+': posible clave o respaldo privado');
    if(!/\.(js|mjs|jsx)$/.test(e.name)||rel.includes('test/')||rel.includes('qa/')||rel==='scripts/check-source.mjs')continue;
    const data=await readFile(p,'utf8');
    if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(data)||/APP_USR-[A-Za-z0-9-]{30,}/.test(data))problems.push(rel+': posible secreto literal');
    if(/firebase|react-scripts/.test(data))problems.push(rel+': integración retirada');
  }
}
await scan(root);
if(problems.length){console.error(problems.join('\n'));process.exitCode=1;}
else console.log('Sin archivos .env reales, claves privadas, tokens ML literales ni integraciones retiradas en la entrega. Revisión básica; no reemplaza un detector de secretos especializado.');
