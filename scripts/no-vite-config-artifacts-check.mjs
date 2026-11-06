import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const entries = await readdir(root);
const generatedSnapshots = entries.filter((name) =>
  name.startsWith('vite.config.ts.timestamp-') && name.endsWith('.mjs')
);
assert.deepEqual(generatedSnapshots, [], 'Generated Vite timestamp snapshots must not be committed at repository root.');

const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
assert.match(config, /VITE_DEV_HOST/);
assert.match(config, /VITE_PREVIEW_HOST/);
assert.ok(!config.includes('file:///home/project/node_modules'), 'Canonical config must not contain generated machine-local imports.');

console.log('PASS no generated Vite config snapshots are present; canonical config remains authoritative.');
