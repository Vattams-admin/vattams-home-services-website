# VATTAMS Home Services — Full A–Z Backup

Backup date: 2026-10-07

## Source-of-truth
Repository: Vattams-admin/vattams-home-services-website
Backup branch: backup/full-project-2026-10-07
Default production branch: main

## Included
- Complete application source
- Supabase Edge Functions
- Supabase SQL migrations
- Public/PWA assets
- Firebase/Supabase client configuration templates
- package.json and package-lock.json
- TypeScript/Vite/Tailwind configuration
- GitHub Actions workflows
- Full Git history in the generated archive

## Intentionally excluded
- node_modules
- passwords
- API keys
- Firebase service-account private keys
- Supabase service-role keys
- OTPs
- customer/technician private production records

## Separate disaster-recovery backups required
1. Supabase PostgreSQL database dump
2. Supabase Storage object backup
3. Firebase project/Auth configuration export where applicable
4. Domain/DNS/Cloudflare configuration record
5. Production deployment/environment-variable inventory (names only, never values)

## Recovery principle
Restore source code first, install dependencies from package-lock.json, restore database/schema, restore storage objects, configure environment secrets securely, then deploy and run production smoke tests.

This document does not claim that live database/storage data is contained in the Git repository.
