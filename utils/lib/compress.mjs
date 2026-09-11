import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';

// Keep the entire sheet, correct camera orientation, remove alpha/metadata,
// and reduce bytes without ever replacing the source.
export async function compressReference(source, destination, {maxEdge = 1536, maxBytes = 512 * 1024} = {}) {
  if (!Number.isInteger(maxEdge) || maxEdge < 512 || !Number.isInteger(maxBytes) || maxBytes < 1024) throw new Error('Compression requires maxEdge >= 512 and maxBytes >= 1024.');
  for (let edge = maxEdge; edge >= 512; edge = Math.floor(edge * 0.8)) {
    for (const quality of [82, 74, 66, 58]) {
      const {data, info} = await sharp(source).rotate().resize({width: edge, height: edge, fit: 'inside', withoutEnlargement: true})
        .flatten({background: '#ffffff'}).jpeg({quality, mozjpeg: true}).toBuffer({resolveWithObject: true});
      if (data.length <= maxBytes) {
        await writeFile(destination, data, {flag: 'wx'});
        return {width: info.width, height: info.height, bytes: data.length, quality, format: 'jpeg'};
      }
    }
  }
  throw new Error('Could not fit the character sheet within the JPEG byte limit; choose a larger limit or a simpler sheet.');
}
