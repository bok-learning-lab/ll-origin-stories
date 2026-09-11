import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, renameSync, openSync, closeSync, unlinkSync, constants} from 'node:fs';
import {resolve, join, dirname, relative, extname, isAbsolute, sep} from 'node:path';
import {homedir} from 'node:os';
import sharp from 'sharp';
import {prepare, parseScript} from '../../.agents/skills/origin-story/scripts/prepare.mjs';
import {compressReference} from './compress.mjs';
import {comicHtml} from './comic-viewer.mjs';
import {run} from './cli.mjs';

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pad = n => String(n).padStart(2, '0');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
const mergeRender = (...values) => Object.fromEntries(Object.entries(Object.assign({}, ...values)).filter(([, value]) => value != null));
export function slug(title) {
  const value = title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90).replace(/-$/, '');
  return value || 'comic';
}
export function destination(title, parent = join(homedir(), 'Downloads')) { return join(resolve(parent.replace(/^~(?=\/|$)/, homedir())), slug(title)); }
function local(root, path) {
  if (typeof path !== 'string' || isAbsolute(path) || path.includes('\\')) throw new Error('Comic paths must be relative paths within the comic folder.');
  const target = resolve(root, path), rel = relative(root, target);
  if (!rel || rel === '..' || rel.startsWith('..' + sep)) throw new Error('Comic path leaves the output folder.');
  return target;
}
function mode(value) { if (!['page', 'panels'].includes(value)) throw new Error('Rendering mode must be page or panels.'); return value; }
function uniqueRoot(proposed) {
  mkdirSync(dirname(proposed), {recursive: true});
  for (let i = 1; ; i++) {
    const root = i === 1 ? proposed : `${proposed}-${i}`;
    try { mkdirSync(root); return root; } catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
}
function freshTake(root, job) {
  const base = job.kind === 'character' ? `images/characters/${job.character}` : `images/stories/${job.story}/${job.id}`;
  for (let n = 1; ; n++) { const path = `${base}/take-${pad(n)}`; if (!existsSync(local(root, path))) return path; }
}
function locked(root, fn) {
  const file = join(root, '.comic.lock');
  const handle = openSync(file, 'wx'); closeSync(handle);
  return Promise.resolve().then(fn).finally(() => unlinkSync(file));
}
function store(root, comic) {
  const temp = join(root, '.comic.json.tmp'); writeJson(temp, comic); renameSync(temp, join(root, 'comic.json'));
  renderComic(root, comic);
}

export async function initComic(planFile, {parent, renderMode} = {}) {
  const plan = readJson(planFile), base = dirname(resolve(planFile));
  if (typeof plan.title !== 'string' || !plan.title.trim()) throw new Error('Plan needs a title.');
  if (!Array.isArray(plan.stories) || !plan.stories.length) throw new Error('Plan needs at least one story.');
  const characters = plan.characters || [], seen = new Set();
  if (!Array.isArray(characters)) throw new Error('characters must be an array.');
  for (const person of characters) {
    if (!idPattern.test(person.id) || seen.has(person.id) || !person.name || !person.description) throw new Error('Characters need unique kebab-case IDs, names, and visual descriptions.');
    seen.add(person.id);
    if (person.photos && !Array.isArray(person.photos)) throw new Error('Character photos must be an array of local paths.');
    for (const photo of person.photos || []) if (!existsSync(resolve(base, photo))) throw new Error(`Missing photo: ${photo}`);
  }
  const storyIds = new Set(), prepared = [];
  for (const story of plan.stories) {
    if (!idPattern.test(story.id) || storyIds.has(story.id) || !story.title || !story.script) throw new Error('Stories need unique kebab-case IDs, titles, and script paths.');
    storyIds.add(story.id);
    const text = readFileSync(resolve(base, story.script), 'utf8'), script = parseScript(text);
    if (![4, 8].includes(script.panels.length)) throw new Error(`${story.id}: a baseline story must have exactly four or eight panels.`);
    const cast = story.characters || [];
    if (!Array.isArray(cast) || new Set(cast).size !== cast.length || cast.some(id => !seen.has(id))) throw new Error(`${story.id}: invalid or duplicate character IDs.`);
    const rendering = mergeRender(plan.render, story.render);
    const modes = story.pageModes || Array(script.panels.length / 4).fill(renderMode || rendering.mode || 'page');
    if (!Array.isArray(modes) || modes.length !== script.panels.length / 4) throw new Error(`${story.id}: pageModes must have one entry per four-panel page.`);
    modes.forEach(mode);
    if (modes.includes('panels') && !cast.length) throw new Error(`${story.id}: panel-by-panel stories need at least one character sheet.`);
    prepared.push({story, text, script, cast, rendering, modes});
  }
  const allPages = prepared.flatMap(({story, modes}) => modes.map((_, i) => `${story.id}:${i + 1}`));
  const readingOrder = plan.readingOrder || allPages;
  if (!Array.isArray(readingOrder) || readingOrder.length !== allPages.length || new Set(readingOrder).size !== allPages.length || readingOrder.some(id => !allPages.includes(id))) throw new Error('readingOrder must list every story:page exactly once.');
  const root = uniqueRoot(destination(plan.title, parent));
  for (const folder of ['source', 'scripts', 'prompts/characters', 'images/references', 'images/characters', 'images/stories']) mkdirSync(join(root, folder), {recursive: true});
  copyFileSync(resolve(planFile), join(root, 'source/plan.json'), constants.COPYFILE_EXCL);
  if (plan.sourceText) writeFileSync(join(root, 'source/input.md'), plan.sourceText);
  const comic = {version: 1, title: plan.title, created: new Date().toISOString(), style: plan.style || '', characters: [], stories: [], jobs: [], pages: [], readingOrder};
  for (const person of characters) {
    const photos = [];
    for (const [i, path] of (person.photos || []).entries()) {
      const folder = `images/references/${person.id}`; mkdirSync(join(root, folder), {recursive: true});
      const original = `${folder}/photo-${pad(i + 1)}-original${extname(path).toLowerCase()}`;
      copyFileSync(resolve(base, path), local(root, original), constants.COPYFILE_EXCL);
      const reference = `${folder}/photo-${pad(i + 1)}.jpg`;
      await compressReference(local(root, original), local(root, reference)); photos.push(reference);
    }
    const promptPath = `prompts/characters/${person.id}.md`;
    writeFileSync(local(root, promptPath), `Create a character reference sheet for ${person.name}.\n\n${person.description}\n\n${comic.style}\n\nShow the SAME character in a clear full-body front view, three-quarter view, profile, and a few readable facial expressions. Consistent face, proportions, costume, hair, palette, and distinctive props. Neutral light background, generous separation. This is a production reference, not a narrative page. No captions, title, labels, or extra lettering. If reference photographs are supplied, use them for identity; render the character in the specified comic style.\n`);
    comic.characters.push({id: person.id, name: person.name, description: person.description, photos});
    comic.jobs.push({id: `character-${person.id}`, kind: 'character', character: person.id, label: `${person.name} · character sheet`, prompt: promptPath, characters: [], photos, render: mergeRender(plan.render, plan.characterRender, person.render), takes: []});
  }
  for (const {story, text, script, cast, rendering, modes} of prepared) {
    const scriptPath = `scripts/${story.id}.md`; writeFileSync(local(root, scriptPath), text);
    comic.stories.push({id: story.id, title: story.title, role: story.role || 'origin', panels: script.panels.length, script: scriptPath, characters: cast});
    const prompts = new Map(prepare(text).map(p => [p.name, p.prompt]));
    mkdirSync(join(root, 'prompts', story.id));
    for (const [pageIndex, pageMode] of modes.entries()) {
      const names = pageMode === 'page' ? [`page-${pad(pageIndex + 1)}`] : Array.from({length: 4}, (_, i) => `panel-${pad(pageIndex * 4 + i + 1)}`);
      const jobs = [];
      for (const name of names) {
        const id = `${story.id}-${name}`, promptPath = `prompts/${story.id}/${name}.md`;
        writeFileSync(local(root, promptPath), `${comic.style ? 'Shared comic style: ' + comic.style + '\n\n' : ''}${prompts.get(name)}\n`);
        comic.jobs.push({id, kind: pageMode === 'page' ? 'page' : 'panel', story: story.id, label: `${story.title} · ${name.replace('-', ' ')}`, prompt: promptPath, characters: cast, render: rendering, takes: []}); jobs.push(id);
      }
      comic.pages.push({id: `${story.id}:${pageIndex + 1}`, story: story.id, number: pageIndex + 1, mode: pageMode, jobs});
    }
  }
  for (const job of comic.jobs) if (job.render.params) {
    if (typeof job.render.params !== 'object' || Array.isArray(job.render.params)) throw new Error('render.params must be a native provider parameter object.');
    job.render.paramsFile = `prompts/${job.id}-params.json`;
    writeJson(local(root, job.render.paramsFile), job.render.params);
    delete job.render.params;
  }
  store(root, comic); return root;
}

export function loadComic(root) {
  const comic = readJson(join(root, 'comic.json'));
  if (comic.version !== 1 || !comic.jobs?.length || !comic.pages?.length) throw new Error('Invalid comic manifest.');
  return comic;
}
export function renderComic(root, comic = loadComic(root)) {
  const gallery = [];
  function walk(folder) {
    for (const entry of readdirSync(folder, {withFileTypes: true})) {
      const file = join(folder, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name)) {
        const path = relative(root, file).split(sep).join('/');
        const job = comic.jobs.find(j => j.takes?.some(t => t.images.includes(path) || t.reference === path));
        gallery.push({path, label: job ? job.label + (job.selected === path ? ' · selected' : '') : entry.name});
      }
    }
  }
  walk(join(root, 'images')); gallery.sort((a,b) => a.path.localeCompare(b.path));
  writeFileSync(join(root, 'index.html'), comicHtml(comic, gallery));
  return {pages: comic.pages.length, images: gallery.length};
}

export function jobInputs(root, comic, job) {
  if (job.kind === 'character') return (job.photos || []).map(p => local(root, p));
  return job.characters.map(id => {
    const character = comic.characters.find(c => c.id === id);
    if (!character?.reference || !existsSync(local(root, character.reference))) throw new Error(`Generate or import the character-${id} sheet first; a compressed JPEG reference is required.`);
    return local(root, character.reference);
  });
}
async function adopt(root, comic, job, images, take) {
  for (const image of images) { const meta = await sharp(local(root, image)).metadata(); if (!['png', 'jpeg', 'webp'].includes(meta.format)) throw new Error('Comic artwork must be PNG, JPEG, or WebP.'); }
  const record = {folder: take, images, created: new Date().toISOString()};
  if (job.kind === 'character') {
    record.reference = `${take}/reference.jpg`;
    record.compression = await compressReference(local(root, images[0]), local(root, record.reference));
    comic.characters.find(c => c.id === job.character).reference = record.reference;
  }
  job.takes.push(record); job.selected = images[0]; store(root, comic); return record;
}

export async function importArtwork(root, jobId, imagePath) {
  root = resolve(root);
  return locked(root, async () => {
    const comic = loadComic(root), job = comic.jobs.find(j => j.id === jobId);
    if (!job) throw new Error(`Unknown job: ${jobId}`);
    const meta = await sharp(imagePath).metadata();
    const extension = {png: 'png', jpeg: 'jpg', webp: 'webp'}[meta.format];
    if (!extension) throw new Error('Import a PNG, JPEG, or WebP image.');
    const take = freshTake(root, job); mkdirSync(local(root, take), {recursive: true});
    const image = `${take}/image-01.${extension}`;
    copyFileSync(resolve(imagePath), local(root, image), constants.COPYFILE_EXCL);
    return adopt(root, comic, job, [image], take);
  });
}

export async function generateJob(root, jobId, options = {}, deps = {}) {
  root = resolve(root);
  const work = async () => {
    const comic = loadComic(root), job = comic.jobs.find(j => j.id === jobId);
    if (!job) throw new Error(`Unknown job: ${jobId}`);
    const refs = jobInputs(root, comic, job), rendering = mergeRender(job.render, options);
    if (!rendering.provider || !rendering.model) throw new Error('Choose provider and model in the plan or with --provider and --model.');
    const take = freshTake(root, job);
    // The reusable utility records this exact prompt along with reference paths.
    // Append identity mappings to the job prompt once; original art direction remains editable.
    const mappings = job.kind === 'character' ? 'The supplied images are identity references for this character.' : job.characters.map((id, i) => `Image input ${i + 1}: the character sheet for ${comic.characters.find(c => c.id === id).name}. Preserve that identity and design; do not reproduce the sheet layout.`).join('\n');
    const prompt = readFileSync(local(root, job.prompt), 'utf8') + (refs.length ? '\nReference-image roles:\n' + mappings : '');
    const args = [rendering.provider, prompt, '--model', rendering.model, '--out', local(root, take)];
    for (const flag of ['aspect', 'resolution', 'size', 'quality', 'format', 'ref-field', 'env-file', 'timeout']) if (rendering[flag] !== undefined) args.push(`--${flag}`, String(rendering[flag]));
    for (const ref of refs) args.push('--ref', ref);
    const paramsFile = options['params-file'] ? resolve(options['params-file']) : rendering.paramsFile && local(root, rendering.paramsFile);
    if (paramsFile) args.push('--params-file', paramsFile);
    if (options['dry-run']) args.push('--dry-run');
    const result = await (deps.generate || run)('image', args, deps);
    if (options['dry-run']) return result;
    return adopt(root, comic, job, result.images.map(path => relative(root, path).split(sep).join('/')), take);
  };
  return options['dry-run'] ? work() : locked(root, work);
}
