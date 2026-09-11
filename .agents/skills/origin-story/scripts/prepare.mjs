#!/usr/bin/env node
import { readFileSync, realpathSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function parseScript(text) {
  const sections = [...text.matchAll(/^## (.+)\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)];
  const direction = sections.find(s => s[1].trim() === 'Visual direction')?.[2].trim();
  const panels = sections.filter(s => /^Panel \d+\b/.test(s[1])).map(s => ({
    number: Number(s[1].match(/^Panel (\d+)/)[1]), text: s[2].trim(),
  }));
  if (!direction || !panels.length) throw new Error('Expected Visual direction and numbered Panel sections.');
  if (panels.some((p, i) => p.number !== i + 1 || !p.text)) throw new Error('Panels must be nonempty and numbered consecutively from 1.');
  return {direction, panels};
}

export function prepare(text) {
  const {direction, panels} = parseScript(text);
  const common = `Create comic art using the following visual direction. Art directions are instructions, not lettering. Render only the explicitly specified Caption, Dialogue, and Lettering text. No additional text.\n\n${direction}`;
  const jobs = panels.map(p => ({name: `panel-${String(p.number).padStart(2, '0')}`, prompt: `${common}\n\nRender one panel, not a page.\n\n${p.text}`}));
  // Four panels per page keeps eight-panel stories readable as two pages.
  for (let i = 0; i < panels.length; i += 4) {
    const group = panels.slice(i, i + 4);
    const layout = group.length === 4 ? 'a 2 by 2 grid' : `a clearly ordered layout of ${group.length} panels`;
    jobs.push({name: `page-${String(i / 4 + 1).padStart(2, '0')}`, prompt: `${common}\n\nRender exactly ${group.length} panels in ${layout}, read left to right then top to bottom, with clean gutters. Panel numbers are instructions; do not letter them.\n\n${group.map((p, j) => `Panel ${j + 1}:\n${p.text}`).join('\n\n')}`});
  }
  return jobs;
}

export function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help')) { console.log('Usage: node prepare.mjs SCRIPT.md OUTPUT_DIRECTORY\nWrites panel and page prompts; no network or credentials.'); return; }
  if (argv.length !== 2) throw new Error('Usage: node prepare.mjs SCRIPT.md OUTPUT_DIRECTORY');
  const source = resolve(argv[0]), out = resolve(argv[1]);
  const jobs = prepare(readFileSync(source, 'utf8'));
  const outputs = jobs.map(j => join(out, `${j.name}.md`));
  const manifest = join(out, 'manifest.json');
  for (const file of [...outputs, manifest]) if (existsSync(file)) throw new Error(`Output exists; choose a new directory: ${file}`);
  mkdirSync(out, {recursive: true});
  jobs.forEach((j, i) => writeFileSync(outputs[i], `${j.prompt}\n`, {flag: 'wx'}));
  writeFileSync(manifest, JSON.stringify({source, created: new Date().toISOString(), prompts: outputs}, null, 2) + '\n', {flag: 'wx'});
  console.log(`Prepared ${jobs.length} prompts in ${out}; no API calls made.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(resolve(process.argv[1]))).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
