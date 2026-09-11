import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync, rmSync, readdirSync, cpSync} from 'node:fs';
import {join, basename} from 'node:path';
import {tmpdir, homedir} from 'node:os';
import sharp from 'sharp';
import {initComic, loadComic, importArtwork, generateJob, renderComic, destination, jobInputs} from '../lib/comic.mjs';
import {compressReference} from '../lib/compress.mjs';

function temporary(t) { const dir = mkdtempSync(join(tmpdir(), 'comic-test-')); t.after(() => rmSync(dir, {recursive: true, force: true})); return dir; }
function script(n) { return '# A story\n\n## Visual direction\nWarm ink.\n\n' + Array.from({length:n}, (_,i) => `## Panel ${i+1} — A beat\nArt: A red pencil draws a line.\nCaption: “Beat ${i+1}.”\n\n`).join('') + '## Editorial notes\nPrivate editorial reasoning, excluded from prompts.\n'; }
function makePlan(dir, panels = 4, mode = 'page') {
  writeFileSync(join(dir, 'story.md'), script(panels));
  const plan = {title: 'Pencil & Paper', sourceText: 'Input text.', style: 'Warm ink.', render: {mode, provider: 'openrouter', model: 'example/image-model'}, characters: [{id:'pencil', name:'Pencil', description:'A red pencil with a blue eraser.'}], stories: [{id:'origin', title:'The origin', script:'story.md', characters:['pencil']}]};
  writeFileSync(join(dir,'plan.json'),JSON.stringify(plan)); return plan;
}
async function fixture(file, width = 1800, height = 1200) {
  await sharp({create: {width,height,channels:4,background: {r:190,g:70,b:30,alpha:0.5}}}).png().toFile(file);
}

test('four and eight panel books support page and separate-panel modes', async t => {
  for (const count of [4,8]) for (const mode of ['page','panels']) {
    const dir = temporary(t); makePlan(dir,count,mode);
    const root = await initComic(join(dir,'plan.json'),{parent:dir});
    const comic=loadComic(root);
    assert.equal(comic.pages.length,count/4);
    assert.equal(comic.jobs.filter(j=>j.kind!=='character').length,mode==='page'?count/4:count);
    assert.ok(comic.pages.every(p=>p.jobs.length===(mode==='page'?1:4)));
    assert.ok(existsSync(join(root,'index.html')));
    assert.equal(readFileSync(join(root,'source/input.md'),'utf8'),'Input text.');
    assert.ok(!readFileSync(join(root,comic.jobs[1].prompt),'utf8').includes('Private editorial'));
  }
});

test('default destination is Downloads/title; collisions create a fresh folder', async t => {
  assert.equal(destination('My Great Comic!'),join(homedir(),'Downloads','my-great-comic'));
  const dir=temporary(t);makePlan(dir);
  const first=await initComic(join(dir,'plan.json'),{parent:dir});
  writeFileSync(join(first,'keep.txt'),'keep');
  const second=await initComic(join(dir,'plan.json'),{parent:dir});
  assert.equal(basename(second),'pencil-paper-2');
  assert.equal(readFileSync(join(first,'keep.txt'),'utf8'),'keep');
});

test('invalid panel counts, casts, and reading orders fail before creating a comic', async t => {
  const dir=temporary(t);const plan=makePlan(dir,5,'page');
  await assert.rejects(()=>initComic(join(dir,'plan.json'),{parent:dir}),/four or eight/);
  assert.ok(!existsSync(join(dir,'pencil-paper')));
  writeFileSync(join(dir,'story.md'),script(4));
  plan.readingOrder=['missing:1'];writeFileSync(join(dir,'plan.json'),JSON.stringify(plan));
  await assert.rejects(()=>initComic(join(dir,'plan.json'),{parent:dir}),/every story:page/);
  delete plan.readingOrder; plan.render.mode='panels';plan.stories[0].characters=[];
  writeFileSync(join(dir,'plan.json'),JSON.stringify(plan));
  await assert.rejects(()=>initComic(join(dir,'plan.json'),{parent:dir}),/character sheet/);
});

test('imported sheets preserve the original and create bounded JPEGs for reuse', async t => {
  const dir=temporary(t);makePlan(dir,8,'panels');
  const root=await initComic(join(dir,'plan.json'),{parent:dir});
  const png=join(dir,'large-sheet.png');await fixture(png,3000,2000);
  const original=readFileSync(png);
  const take=await importArtwork(root,'character-pencil',png);
  assert.deepEqual(readFileSync(join(root,take.images[0])),original);
  const jpeg=await sharp(join(root,take.reference)).metadata();
  assert.equal(jpeg.format,'jpeg');assert.ok(Math.max(jpeg.width,jpeg.height)<=1536);
  assert.equal(jpeg.hasAlpha,false);assert.ok(readFileSync(join(root,take.reference)).length<=512*1024);
  assert.equal(jpeg.width/jpeg.height,1.5);
  const comic=loadComic(root), refs=jobInputs(root,comic,comic.jobs[1]);
  assert.equal(refs.length,1);assert.match(refs[0],/reference\.jpg$/);
  await assert.rejects(()=>compressReference(png,join(root,take.reference)),/EEXIST/);
});

test('panels cannot run before sheets; model receives actual compressed JPEG input', async t => {
  const dir=temporary(t);makePlan(dir,4,'panels');
  const root=await initComic(join(dir,'plan.json'),{parent:dir});
  let calls=0;
  await assert.rejects(()=>generateJob(root,'origin-panel-01',{}, {generate:()=>{calls++;}}),/sheet first/);
  assert.equal(calls,0);assert.ok(!existsSync(join(root,'.comic.lock')));
  const png=join(dir,'sheet.png');await fixture(png);
  await importArtwork(root,'character-pencil',png);
  await generateJob(root,'origin-panel-01',{}, {generate:async(kind,args)=>{
    calls++;assert.equal(kind,'image');
    const ref=args[args.indexOf('--ref')+1];assert.match(ref,/reference\.jpg$/);
    assert.equal((await sharp(ref).metadata()).format,'jpeg');
    assert.match(args[1],/Image input 1: the character sheet for Pencil/);
    const out=args[args.indexOf('--out')+1];mkdirSync(out,{recursive:true});
    const image=join(out,'image-01.png');await fixture(image,600,400);return {out,images:[image]};
  }});
  assert.equal(calls,1);const comic=loadComic(root);
  assert.match(comic.jobs.find(j=>j.id==='origin-panel-01').selected,/take-01\/image-01.png/);
});

test('multi-story frame can bracket origins and mix image layouts', async t => {
  const dir=temporary(t), plan=makePlan(dir,4,'panels');
  writeFileSync(join(dir,'frame.md'),script(8));
  plan.stories.push({id:'frame',title:'Together',role:'frame',script:'frame.md',characters:['pencil'],pageModes:['page','panels']});
  plan.readingOrder=['frame:1','origin:1','frame:2'];
  writeFileSync(join(dir,'plan.json'),JSON.stringify(plan));
  const root=await initComic(join(dir,'plan.json'),{parent:dir});
  const comic=loadComic(root);
  assert.deepEqual(comic.readingOrder,plan.readingOrder);
  assert.equal(comic.pages.find(p=>p.id==='frame:1').jobs.length,1);
  assert.equal(comic.pages.find(p=>p.id==='frame:2').jobs.length,4);
  const html=readFileSync(join(root,'index.html'),'utf8');
  assert.ok(html.indexOf('<h2>Together</h2>')<html.indexOf('<h2>The origin</h2>'));
  assert.match(html,/class="comic-page panel-grid"/);assert.match(html,/class="comic-page full-page"/);
});

test('input photos reach sheet generation and team scenes receive both character sheets', async t => {
  const dir=temporary(t),plan=makePlan(dir,4,'panels');
  const photo=join(dir,'portrait.png');await fixture(photo,2400,3000);
  plan.characters[0].photos=['portrait.png'];
  plan.characters.push({id:'paper',name:'Paper',description:'A folded paper explorer.',photos:['portrait.png']});
  plan.stories[0].characters=['pencil','paper'];
  writeFileSync(join(dir,'plan.json'),JSON.stringify(plan));
  const root=await initComic(join(dir,'plan.json'),{parent:dir});
  for (const id of ['pencil','paper']) {
    assert.deepEqual(readFileSync(join(root,`images/references/${id}/photo-01-original.png`)),readFileSync(photo));
    await generateJob(root,`character-${id}`,{}, {generate:async(kind,args)=>{
      const ref=args[args.indexOf('--ref')+1];
      assert.match(ref,new RegExp(`images/references/${id}/photo-01.jpg$`));
      const meta=await sharp(ref).metadata();assert.equal(meta.format,'jpeg');assert.ok(meta.height<=1536);
      const out=args[args.indexOf('--out')+1];mkdirSync(out,{recursive:true});
      const image=join(out,'image-01.png');await fixture(image);return {out,images:[image]};
    }});
  }
  await generateJob(root,'origin-panel-01',{'dry-run':true},{generate:async(kind,args)=>{
    const refs=args.flatMap((arg,i)=>arg==='--ref'?[args[i+1]]:[]);
    assert.equal(refs.length,2);assert.notEqual(refs[0],refs[1]);
    assert.ok(refs.every(ref=>ref.endsWith('/reference.jpg')));
    assert.match(args[1],/Image input 1: the character sheet for Pencil/);
    assert.match(args[1],/Image input 2: the character sheet for Paper/);
    return {network:false};
  }});
});

test('viewer retains all takes, escapes titles, and survives moving the folder', async t => {
  const dir=temporary(t),plan=makePlan(dir);
  plan.title='A <script>alert(1)</script> comic';writeFileSync(join(dir,'plan.json'),JSON.stringify(plan));
  const root=await initComic(join(dir,'plan.json'),{parent:dir});
  const png=join(dir,'art.png');await fixture(png);
  await importArtwork(root,'origin-page-01',png);await importArtwork(root,'origin-page-01',png);
  const moved=join(dir,'moved');cpSync(root,moved,{recursive:true});
  const stats=renderComic(moved),html=readFileSync(join(moved,'index.html'),'utf8');
  assert.equal(stats.images,2);assert.match(html,/&lt;script&gt;/);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  const images=[...html.matchAll(/<img src="([^"]+)"/g)].map(m=>decodeURIComponent(m[1]));
  assert.ok(images.length>=3);assert.ok(images.every(path=>existsSync(join(moved,path))));
  assert.ok(!html.includes('fetch('));assert.ok(!html.includes(root));
});

test('dry-run with stored native params creates no take or lock', async t => {
  const dir=temporary(t),plan=makePlan(dir);
  plan.characters=[];plan.stories[0].characters=[];plan.render.params={seed:17};
  writeFileSync(join(dir,'plan.json'),JSON.stringify(plan));
  const root=await initComic(join(dir,'plan.json'),{parent:dir});
  const before=readFileSync(join(root,'comic.json'),'utf8');
  const preview=await generateJob(root,'origin-page-01',{'dry-run':true},{env:{},stdout:()=>{}});
  assert.equal(preview.body.seed,17);assert.equal(preview.network,false);
  assert.equal(readFileSync(join(root,'comic.json'),'utf8'),before);
  assert.ok(!existsSync(join(root,'.comic.lock')));
  assert.equal(readdirSync(join(root,'images/stories')).length,0);
});
