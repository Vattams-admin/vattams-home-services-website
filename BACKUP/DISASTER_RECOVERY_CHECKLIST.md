# VATTAMS Home Services — Disaster Recovery Checklist

## A. Source
- [x] Git repository
- [x] Full Git history backup workflow
- [x] Dependency lockfile
- [x] CI/CD workflows
- [x] Supabase migrations/functions
- [x] Backup manifest/checksum generation

## B. Database
- [ ] Export production PostgreSQL database
- [ ] Verify schema and row counts
- [ ] Store dump separately from GitHub source
- [ ] Encrypt the database backup at rest

## C. Storage
- [ ] Export Supabase Storage objects
- [ ] Verify object counts/sizes
- [ ] Store storage backup separately
- [ ] Encrypt backup at rest

## D. Authentication / infrastructure
- [ ] Record Firebase project ID and configuration names
- [ ] Record Supabase project reference and region
- [ ] Record Cloudflare/DNS configuration
- [ ] Record hosting/deployment configuration
- [ ] Keep all secret VALUES outside this repository

## E. Verification
- [ ] Restore source to a clean environment
- [ ] npm ci
- [ ] production build
- [ ] restore database
- [ ] restore storage
- [ ] configure secrets
- [ ] deploy staging/recovery instance
- [ ] run customer, technician and admin smoke tests
- [ ] verify payment and notification flows

## Safety
Never place passwords, API keys, service-account JSON, service-role keys, OTPs, or private customer/technician data into the repository or source backup.
