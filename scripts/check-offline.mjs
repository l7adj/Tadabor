import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

const files = globSync([
  'index.html',
  'mushaf.html',
  'src/**/*.js',
  'src/**/*.json',
  'public/**/*.{js,json,webmanifest}',
  'scripts/**/*.mjs',
  'capacitor.config.ts',
  'package.json'
], { exclude: ['**/node_modules/**', 'dist/**'] });

const remoteUrl = /https?:\\/\\//g;
const hits = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (remoteUrl.test(text)) hits.push(file);
}
if (hits.length) {
  console.error('Offline check failed. Remote URLs found in:', hits.join(', '));
  process.exit(1);
}
console.log(`Offline source check passed for ${files.length} files.`);
