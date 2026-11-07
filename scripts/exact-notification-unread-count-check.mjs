import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const client = await readFile(new URL("../src/lib/notifications.ts", import.meta.url), "utf8");
const customer = await readFile(new URL("../supabase/functions/customer-data/index.ts", import.meta.url), "utf8");
const technician = await readFile(new URL("../supabase/functions/technician-data/index.ts", import.meta.url), "utf8");
const admin = await readFile(new URL("../supabase/functions/admin-data/index.ts", import.meta.url), "utf8");

const countFn = client.match(/export async function fetchUnreadCount[\s\S]*?\n}\n/);
assert.ok(countFn, "fetchUnreadCount exists");
assert.match(countFn[0], /notification_unread_count/);
assert.doesNotMatch(countFn[0], /fetchNotifications\(/);
assert.match(customer, /from\("notifications"\)\.select\("id",\{count:"exact",head:true\}\)[\s\S]*?eq\("is_read",false\)/);
assert.match(technician, /from\("technician_notifications"\)\.select\("id",\{count:"exact",head:true\}\)/);
assert.match(technician, /from\("notifications"\)\.select\("id",\{count:"exact",head:true\}\)/);
assert.match(technician, /unread_count:walletCount\.count\+jobCount\.count/);
assert.match(technician, /case "notifications_read_all"[\s\S]*?from\("technician_notifications"\)\.update/);
assert.match(technician, /case "notifications_read_all"[\s\S]*?from\("notifications"\)\.update/);
assert.match(admin, /case "notification_unread_count"[\s\S]*?count:"exact",head:true/);
console.log("PASS exact unread count uses server-side head/count queries for customer, both technician sources, and admin");
