import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const source = await readFile(new URL("../supabase/functions/customer-data/index.ts", import.meta.url), "utf8");

assert.match(source, /const parsed: unknown = await req\.json\(\);[\s\S]*?Array\.isArray\(parsed\)/, "request body must be a JSON object");
assert.match(source, /typeof token !== "string" \|\| token\.length < 16 \|\| token\.length > 512/, "session token must be bounded string");
assert.match(source, /fullName\.length < 2 \|\| fullName\.length > 100/, "profile name length must be validated");
assert.match(source, /email\.length > 254 \|\| !\/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\//, "profile email must be validated");
assert.match(source, /city\.length > 100/, "city length must be bounded");
assert.match(source, /address\.length > 500/, "address length must be bounded");
assert.match(source, /subject\.length < 3 \|\| subject\.length > 120/, "support subject length must be validated");
assert.match(source, /message\.length < 10 \|\| message\.length > 5000/, "support message length must be validated");
assert.match(source, /if \(!customer\) return out\(\{error:"Customer not found"\},404\);[\s\S]*?subject,message,status:"open"/, "support message must require an existing customer and use validated values");
console.log("PASS customer-data input validation contract");
