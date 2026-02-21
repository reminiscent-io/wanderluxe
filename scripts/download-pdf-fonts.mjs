// One-time font downloader for PDF export
// Run with: node scripts/download-pdf-fonts.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import https from 'node:https';

const BASE = 'https://raw.githubusercontent.com/googlefonts/dm-fonts/main';
const OUT = 'src/assets/fonts/pdf';

mkdirSync(OUT, { recursive: true });

const FILES = [
  ['Serif/Exports/DMSerifDisplay-Regular.ttf', 'DMSerifDisplay-Regular.ttf'],
  ['Serif/Exports/DMSerifDisplay-Italic.ttf', 'DMSerifDisplay-Italic.ttf'],
  ['Sans/Exports/DMSans-Regular.ttf', 'DMSans-Regular.ttf'],
  ['Sans/Exports/DMSans-Italic.ttf', 'DMSans-Italic.ttf'],
  ['Sans/Exports/DMSans-Medium.ttf', 'DMSans-Medium.ttf'],
  ['Sans/Exports/DMSans-MediumItalic.ttf', 'DMSans-MediumItalic.ttf'],
];

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        return download(resp.headers.location).then(resolve).catch(reject);
      }
      if (resp.statusCode !== 200) {
        return reject(new Error(`HTTP ${resp.statusCode} for ${url}`));
      }
      const chunks = [];
      resp.on('data', (c) => chunks.push(c));
      resp.on('end', () => resolve(Buffer.concat(chunks)));
      resp.on('error', reject);
    }).on('error', reject);
  });
}

for (const [src, dest] of FILES) {
  const url = `${BASE}/${src}`;
  console.log('Downloading', dest, '...');
  const buf = await download(url);
  writeFileSync(`${OUT}/${dest}`, buf);
  console.log(`  Saved ${dest} (${(buf.length / 1024).toFixed(0)} KB)`);
}
console.log('\nDone — fonts saved to', OUT);
