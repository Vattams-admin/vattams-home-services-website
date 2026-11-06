import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../supabase/functions/notification-push-retry/index.ts", import.meta.url), "utf8");
assert.ok(worker.includes('const terminalized = results.filter((item) => item.terminalized === true).length;'),
  "worker summary must count terminalized inactive-token deliveries");
assert.ok(worker.includes('const terminalizationFailures = results.filter((item) => item.terminalized === false).length;'),
  "worker summary must separately count terminalization failures");
assert.ok(worker.includes("      terminalized,\n      terminalizationFailures,"),
  "worker response must expose both terminalization counters");
assert.ok(worker.includes('terminalized: terminalized,') || worker.includes('terminalized,'),
  "per-delivery terminalization outcome must remain represented");
console.log("PASS retry worker response reports terminalized deliveries and terminalization failures");
