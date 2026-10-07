# Production data backup

Workflow: `.github/workflows/production-data-backup.yml`

The workflow creates an encrypted backup of the production Supabase database and the `technician-docs` and `technician-photos` Storage buckets. It requires repository secrets `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN`, and `SUPABASE_SERVICE_ROLE_KEY`.

The backup is encrypted before the GitHub artifact is created. The private decryption key is stored outside GitHub.

Do not place production data, credentials, or the private key in this repository.
