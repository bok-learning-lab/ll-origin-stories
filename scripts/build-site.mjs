import {readFileSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {marked} from 'marked';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const source=readFileSync(join(root,'_context/why-origin-stories.md'),'utf8');
// Editorial Markdown is trusted repository content, never untrusted web input.
const content=marked.parse(source);
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Where the powers come from — Learning Lab</title><style>body{margin:0;background:#f5f1e6;color:#242921;font:19px/1.75 Georgia,serif}header,main,footer{max-width:780px;margin:auto;padding:30px 24px}header{font:14px/1.5 system-ui;border-bottom:1px solid #cfc7b5}a{color:#17636b;text-underline-offset:3px}h1{font-size:clamp(38px,6vw,64px);line-height:1.1;letter-spacing:-.035em}h2{font-size:30px;line-height:1.2;margin-top:2.5em}p{margin:1.2em 0}footer{font:13px/1.5 system-ui;border-top:1px solid #cfc7b5}.note{color:#697066;font-size:13px}blockquote{border-left:3px solid #c58442;padding-left:22px;margin-left:0}a:focus-visible{outline:3px solid #bd6839}@media print{header,footer{display:none}body{background:white;font-size:12pt}}</style></head><body><header><a href="index.html">← All the origin stories</a><p class="note">Working essay · September 11, 2026 · Drafted from Marlon Kuzmick’s workshop notes and conversations for further revision.</p></header><main>${content}</main><footer><a href="index.html">Return to the comics</a></footer></body></html>`;
writeFileSync(join(root,'site/why-origin-stories.html'),html);
writeFileSync(join(root,'site/.nojekyll'),'');
mkdirSync(join(root,'dist'),{recursive:true});
cpSync(join(root,'site'),join(root,'dist'),{recursive:true});
console.log('Built dist/ from site/ and the editorial essay. Only dist/ is deployable.');
