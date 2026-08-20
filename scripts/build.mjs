import { appendFile, cp, mkdir, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
if (existsSync('mushaf.html')) await copyFile('mushaf.html', 'dist/mushaf.html');
if (existsSync('public')) await cp('public', 'dist', { recursive: true });
if (existsSync('src')) await cp('src', 'dist/src', { recursive: true });

const bridge = 'scripts/offline-bridge.js';
if (existsSync(bridge)) {
  await copyFile(bridge, 'dist/offline-bridge.js');
  await appendFile('dist/index.html', '\n<script src="./offline-bridge.js"></script>\n');
}

const mushafSvg = 'vendor/quran-svg/mushafs/hafs/kfqc/svg';
if (existsSync(mushafSvg)) {
  await cp(mushafSvg, 'dist/mushaf-svg', { recursive: true });
} else {
  throw new Error('Hafs Mushaf SVG source is missing. Initialize submodules before building.');
}

console.log('Tadabor web bundle built with local Hafs Mushaf SVG pages.');
