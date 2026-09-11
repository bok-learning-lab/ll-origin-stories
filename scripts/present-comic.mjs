import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync} from 'node:fs';
import {resolve,join,dirname,basename,isAbsolute,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {comicHtml} from '../utils/lib/comic-viewer.mjs';
const repo=dirname(dirname(fileURLToPath(import.meta.url)));
const source=resolve(process.argv[2]||'');if(!process.argv[2])throw Error('Usage: node scripts/present-comic.mjs PRODUCTION_FOLDER');
const destination=join(repo,'site',basename(source));
if(existsSync(destination))throw Error('Presentation already exists; use a new edition folder.');
const original=JSON.parse(readFileSync(join(source,'comic.json'),'utf8'));
const paths=new Set();const gallery=[];
for(const j of original.jobs){if(!j.selected)throw Error('Unfinished: '+j.id);paths.add(j.selected);gallery.push({path:j.selected,label:j.label});}
for(const c of original.characters)paths.add(c.reference);
if(original.cover)paths.add(original.cover);
for(const p of paths){if(!p||isAbsolute(p)||relative(source,resolve(source,p)).startsWith('..')||!p.startsWith('images/'))throw Error('Invalid image path');if(!existsSync(join(source,p)))throw Error('Missing '+p);}
mkdirSync(destination);
for(const p of paths){mkdirSync(dirname(join(destination,p)),{recursive:true});copyFileSync(join(source,p),join(destination,p));}
const comic={version:1,title:original.title,stories:original.stories.map(({script,...s})=>s),pages:original.pages,readingOrder:original.readingOrder,characters:original.characters.map(({id,name,reference})=>({id,name,reference})),jobs:original.jobs.map(({id,kind,story,character,label,selected})=>({id,kind,story,character,label,selected})),...(original.cover?{cover:original.cover}:{})};
writeFileSync(join(destination,'comic.json'),JSON.stringify(comic,null,2)+'\n');
writeFileSync(join(destination,'index.html'),comicHtml(comic,gallery).replace('<header>','<header><p class="collection-link"><a href="../index.html">← All comics</a></p>'));
console.log(destination);
