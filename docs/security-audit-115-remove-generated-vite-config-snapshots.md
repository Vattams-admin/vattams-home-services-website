# Investigation 342 — remove generated Vite config snapshots

## Confirmed repository defect

The default branch contained five generated files named `vite.config.ts.timestamp-*.mjs`. These are Vite's temporary bundled configuration snapshots, not maintained source. Each embedded absolute `file:///home/project/node_modules/...` imports and a base64 source map containing the generated configuration. The snapshots also preserved an obsolete server configuration binding to `0.0.0.0`, while the canonical `vite.config.ts` now defaults development and preview servers to loopback with explicit environment overrides.

These stale generated files were tracked at repository root and could mislead tooling, reviewers, or manual invocation into using obsolete configuration. They are not required by the Vite build; Vite loads the canonical `vite.config.ts`.

## Fix

- Removed all five generated timestamp snapshots from the repository.
- Added `scripts/no-vite-config-artifacts-check.mjs` to fail if generated Vite timestamp snapshots reappear.
- The regression check also confirms that the canonical config retains its explicit host override settings and does not contain the leaked build-machine import path.

## Validation boundary

This is a repository hygiene and configuration-integrity fix. It does not modify runtime application behavior, Cloudflare settings, Supabase, Firestore, or production data. The PR must receive a successful Cloudflare Pages preview for its exact head SHA before merge. Vercel and GitHub Actions are not deployment gates.
