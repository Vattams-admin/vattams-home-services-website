import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const source = await readFile(new URL('../supabase/functions/technician-data/index.ts', import.meta.url), 'utf8');
assert.match(source, /const MAX_REQUEST_BYTES = 16 \\* 1024/, 'technician-data must enforce a 16 KB body limit');
assert.match(source, /async function readBoundedJson\\(req: Request\\)/, 'bounded JSON reader must exist');
assert.match(source, /totalBytes > MAX_REQUEST_BYTES[\\s\\S]*?reader\\.cancel\\(\\)/, 'oversized streams must be cancelled');
assert.match(source, /TextDecoder\\("utf-8", \\{ fatal: true \\}\\)/, 'invalid UTF-8 must be rejected');
assert.match(source, /RequestBodyTooLargeError[\\s\\S]*?},413\\)/, 'oversized bodies must return HTTP 413');
assert.match(source, /InvalidRequestBodyError[\\s\\S]*?},400\\)/, 'invalid JSON must return HTTP 400');
assert.match(source, /readBoundedJson\\(req\\)/, 'handler must use bounded parsing');
assert.doesNotMatch(source, /req\\.json\\(\\)/, 'unbounded req.json() must not remain');
process.stdout.write('PASS technician-data bounded request body contract\\n');
