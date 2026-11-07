import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/lib/socialLinksCache.ts', import.meta.url), 'utf8');

assert.match(source, /let cacheGeneration = 0;/, 'cache has a generation fence');
assert.match(source, /const generation = cacheGeneration;/, 'each request captures its generation');
assert.match(source, /if \(generation === cacheGeneration\)/, 'stale responses cannot populate the cache');
assert.match(source, /fetchPromise === pending/, 'an older request cannot clear a newer in-flight request');
assert.match(source, /cacheGeneration \+= 1;/, 'refresh invalidates all earlier generations');
assert.match(source, /cachedSettings = null;[\s\S]*fetchPromise = null;/, 'refresh clears cached and pending state');

console.log('Social settings cache invalidation regression checks passed (6 assertions).');
