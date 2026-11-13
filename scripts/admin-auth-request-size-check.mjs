import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const source = await readFile(new URL("../supabase/functions/admin-auth/index.ts", import.meta.url), "utf8");
assert.match(source, /const MAX_REQUEST_BYTES = 8 \* 1024/);
assert.match(source, /async function readBoundedJson\(req: Request\)/);
assert.match(source, /content-length/);
assert.match(source, /totalBytes > MAX_REQUEST_BYTES/);
assert.match(source, /Request body exceeds the 8 KB limit/);
assert.match(source, /typeof email !== "string" \|\| typeof password !== "string"/);
assert.match(source, /MAX_EMAIL_LENGTH = 254/);
assert.match(source, /MAX_PASSWORD_LENGTH = 128/);
assert.match(source, /password.length > MAX_PASSWORD_LENGTH/);
assert.doesNotMatch(source, /await req\.json\(\)/, "admin login must not parse unbounded request JSON");
process.stdout.write("PASS admin-auth bounded login request contract\n");
