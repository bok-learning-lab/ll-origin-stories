#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {resolve, dirname} from 'node:path';
import {mkdirSync} from 'node:fs';
import {compressReference} from './lib/compress.mjs';

try {
  const {values, positionals} = parseArgs({allowPositionals: true, options: {help: {type: 'boolean'}, 'max-edge': {type: 'string'}, 'max-kb': {type: 'string'}}});
  if (values.help) console.log('Usage: node utils/compress-image.mjs INPUT OUTPUT.jpg [--max-edge 1536] [--max-kb 512]');
  else {
    if (positionals.length !== 2 || !/\.jpe?g$/i.test(positionals[1])) throw new Error('Supply an input image and a new output .jpg path.');
    const target = resolve(positionals[1]);
    mkdirSync(dirname(target), {recursive: true});
    const result = await compressReference(resolve(positionals[0]), target, {maxEdge: Number(values['max-edge'] || 1536), maxBytes: Number(values['max-kb'] || 512) * 1024});
    console.log(JSON.stringify({file: target, ...result}, null, 2));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
