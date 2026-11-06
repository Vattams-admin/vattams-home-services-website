import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const entries = await readdir(root);
const generatedSnapshots = entries.filter((name) =>
  /^vite\\.config\\.ts\\.timestamp-\\d+-[a-f0-9]+\\.mjs$/.test(name)
);
assert.deepEqual(generatedSnapshots, [], 'Generated Vite timestamp snapshots must not be committed at repository root.');

const config = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
assert.match(config, /VITE_DEV_HOST/);
assert.match(config, /VITE_PREVIEW_HOST/);
assert.doesNotMatch(config, /file:\/\/\/home\/project\/node_modules/);

console.log('PASS no generated Vite config snapshots are present; canonical config remains authoritative.');
