VATTAMS ONLINE TUITION — PHASE 5.2
STEP 2: FIX EXISTING ADMIN AUTHENTICATION ONLY

STEP 1 INSPECTION IS COMPLETE.

IMPORTANT:
DO NOT TOUCH PHASE 5.1.
DO NOT MODIFY CourseMaterialsSection.tsx.
DO NOT MODIFY student learning-material UI.
DO NOT START tutor authentication.
DO NOT START material upload UI.
DO NOT START watermark processing.
DO NOT START Phase 5.3.

STEP 2 GOAL:

Fix the existing Admin login so it uses the already-existing working
admin-auth Edge Function and the existing admins/admin_sessions schema.

INSPECTION FOUND:

1. Existing working Edge Function:
   supabase/functions/admin-auth/index.ts

   It:
   - checks the admins table
   - verifies password_hash using bcrypt
   - creates admin_sessions
   - is the real existing admin authentication implementation

2. Current frontend AdminLogin.tsx is broken/inconsistent:
   - calls supabase.rpc('verify_admin_login', ...)
   - expects role = 'super_admin'
   - expects is_active
   - those do not match the tracked admins schema
   - verify_admin_login is not present in tracked migrations

3. AdminDashboard currently checks:
   sessionStorage['vattams_admin']
   and an expiry value.

4. Do not introduce Supabase Auth.
   Keep the existing custom admin authentication architecture.

TASK:

A. Inspect:
- supabase/functions/admin-auth/index.ts
- src/pages/AdminLogin.tsx
- src/pages/AdminDashboard.tsx
- router/App routing
- admins table schema
- admin_sessions table schema

B. Update AdminLogin.tsx so it calls the existing
   admin-auth Edge Function instead of verify_admin_login RPC.

C. Match the response format of the actual admin-auth Edge Function.

D. After successful authentication:
   - store the minimum required admin session information in
     sessionStorage['vattams_admin']
   - preserve the existing expiry/session behavior expected by AdminDashboard
   - do not store password or password_hash
   - do not expose service_role key

E. Do NOT change AdminDashboard unless absolutely necessary
   to consume the existing admin-auth response.

F. If AdminDashboard currently expects a specific sessionStorage
   object shape, inspect it and preserve that exact shape.

G. Handle:
   - invalid credentials
   - network error
   - Edge Function error
   - expired session

H. Keep the existing AdminLogin visual design unchanged.
   Only fix authentication logic.

I. Do NOT modify:
- tuition_course_materials
- tuitionMaterials.ts
- CourseMaterialsSection.tsx
- tuition-materials bucket
- tuition-watermark-pdf
- student pages
- technician authentication
- tutor pages

J. Do not create migrations.

K. Do not create new tables.

L. Do not deploy.

BUILD:

Run:

npm run build

If build fails, fix ONLY issues caused by this Admin authentication change.

FINAL REPORT:

1. Files changed
2. Exact Admin auth flow now used
3. Edge Function called
4. SessionStorage object/keys used
5. Whether AdminDashboard remains compatible
6. Build result

STOP after Step 2.

Do not continue to Phase 5.2 Step 3 automatically.