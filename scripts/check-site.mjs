import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join,resolve,relative,dirname,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);}
let links=0,pages=0;const files=walk(root);
for(const file of files){
 if(!file.endsWith('.html'))continue;pages++;
 const html=readFileSync(file,'utf8');
 for(const [,kind,value] of html.matchAll(/\b(href|src)=["']([^"']+)["']/g)){
  if(value.startsWith('#'))continue;
  if(/^https:\/\//.test(value)&&kind==='href')continue;
  if(/^[a-z]+:|^\/\//i.test(value))throw Error('Unexpected remote asset: '+value);
  const dest=resolve(dirname(file),decodeURIComponent(value.split(/[?#]/)[0]));
  const rel=relative(root,dest);
  if(rel.startsWith('..')||isAbsolute(rel)||!statSync(dest).isFile())throw Error('Broken or escaping link '+value+' in '+file);
  links++;
 }
}
if(files.some(f=>/\/\.env(?:\.|$)|node_modules|\/\.agents\//.test(f)))throw Error('Private/tooling material in public build');
console.log(`${pages} HTML pages; ${links} local links and assets verified.`);
