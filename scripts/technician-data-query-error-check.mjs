import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../supabase/functions/technician-data/index.ts", import.meta.url), "utf8");

assert.match(source, /const \{data,error\}=await supabase\.from\("technician_auth_sessions"\)[\s\S]*?if\(error\)return \{technicianId:null,error:true\}/, "session-store query errors must be distinguished from invalid or expired sessions");
assert.match(source, /if\(authResult\.error\)return out\(\{error:"Unable to verify technician session[\s\S]*?\},503\)/, "session-store outages must return HTTP 503");
assert.match(source, /Number\.isFinite\(expiresAt\)[\s\S]*?expiresAt<=Date\.now\(\)/, "invalid and expired session timestamps must be rejected");
assert.match(source, /if\(technicianResult\.error\|\|jobsResult\.error\|\|transactionsResult\.error\|\|rechargesResult\.error\|\|notificationsResult\.error\|\|jobNotificationsResult\.error\)return out\(\{error:"Unable to load technician account data[\s\S]*?\},503\)/, "any account dashboard query failure must fail the request instead of becoming empty data");
assert.match(source, /jobs:jobsResult\.data\|\|\[\][\s\S]*?transactions:transactionsResult\.data\|\|\[\][\s\S]*?recharges:rechargesResult\.data\|\|\[\][\s\S]*?notifications:notificationsResult\.data\|\|\[\][\s\S]*?jobNotifications:jobNotificationsResult\.data\|\|\[\]/, "successful empty dashboard query results must remain empty collections");
console.log("PASS technician-data session and account query error contract");
