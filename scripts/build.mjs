import { cp, mkdir, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
if (existsSync('mushaf.html')) await copyFile('mushaf.html', 'dist/mushaf.html');
if (existsSync('public')) await cp('public', 'dist', { recursive: true });
if (existsSync('src')) await cp('src', 'dist/src', { recursive: true });
console.log('Tadabor web bundle built to dist/.');
