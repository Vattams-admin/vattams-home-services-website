import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const client = await readFile(new URL("../src/lib/notifications.ts", import.meta.url), "utf8");
const edge = await readFile(new URL("../supabase/functions/technician-data/index.ts", import.meta.url), "utf8");

// Technician account payload exposes technician_notifications as jobNotifications.
assert.match(edge, /jobNotificationsResult\s*=\s*await supabase\.from\("technician_notifications"\)/);
assert.match(client, /recipientType === 'technician' \? data\.jobNotifications : data\.notifications/);

// The single-row read endpoint maps wallet -> technician_notifications and job -> notifications.
assert.match(edge, /const table=source==="job"\?"notifications":"technician_notifications"/);
assert.match(client, /source: 'wallet'/);
assert.doesNotMatch(client, /source: 'job'/);

console.log("PASS technician notification read targets technician_notifications");
