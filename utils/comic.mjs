#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {resolve} from 'node:path';
import {initComic, loadComic, renderComic, importArtwork, generateJob} from './lib/comic.mjs';

try {
  const {values: o, positionals: p} = parseArgs({allowPositionals: true, options: {
    help: {type: 'boolean'}, plan: {type: 'string'}, destination: {type: 'string'}, mode: {type: 'string'},
    provider: {type: 'string'}, model: {type: 'string'}, 'env-file': {type: 'string'}, 'params-file': {type: 'string'},
    aspect: {type: 'string'}, resolution: {type: 'string'}, size: {type: 'string'}, quality: {type: 'string'},
    format: {type: 'string'}, 'ref-field': {type: 'string'}, timeout: {type: 'string'}, 'dry-run': {type: 'boolean'},
  }});
  const [command, folder, job, file] = p;
  if (o.help || !command) console.log(`Comic production and local reader
  node utils/comic.mjs init --plan plan.json [--destination DIRECTORY] [--mode page|panels]
  node utils/comic.mjs status COMIC_FOLDER
  node utils/comic.mjs generate COMIC_FOLDER JOB_ID [--provider NAME --model ID] [--dry-run]
  node utils/comic.mjs import COMIC_FOLDER JOB_ID IMAGE_FILE
  node utils/comic.mjs render COMIC_FOLDER

init creates a new {comic-title} directory under the destination (default ~/Downloads).
generate runs one job; character sheets must precede panels that use them.
import accepts externally generated art and compresses character references automatically.
render rebuilds index.html with a page reader and a gallery of every local image.
See .agents/skills/origin-story/references/comic-production.md for the plan format.`);
  else if (command === 'init') {
    if (!o.plan || p.length !== 1) throw new Error('init needs --plan FILE, with optional --destination and --mode.');
    console.log(await initComic(o.plan, {parent: o.destination, renderMode: o.mode}));
  } else {
    if (!folder) throw new Error('Supply a comic output folder.');
    const root = resolve(folder);
    if (command === 'status') {
      const comic = loadComic(root);
      console.log(`${comic.title}\n${comic.stories.length} stories, ${comic.pages.length} reader pages\n` + comic.jobs.map(j => `${j.selected ? 'READY' : 'TODO '} ${j.id} — ${j.label}`).join('\n'));
    } else if (command === 'render') console.log(renderComic(root));
    else if (command === 'import' && job && file) console.log(await importArtwork(root, job, file));
    else if (command === 'generate' && job) console.log(await generateJob(root, job, o));
    else throw new Error('Unknown command or missing arguments; run with --help.');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
