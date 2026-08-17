Choose option 2.

Build the full new trial flow.

Requirements:
- Public CTA: "Book Trial — ₹150"
- ₹150 is the charge for ONE trial session.
- Do NOT call it Free Trial anywhere.
- Create the TuitionTrialBooking page.
- Add the proper route using the existing router architecture.
- Wire the Online Tuition Home "Book Trial — ₹150" button to that route.
- Create/use the trial request database flow safely.
- Admin must be able to see trial booking requests.
- Preserve existing tuition_students and tuition_tutors data.
- Do not modify historical records.
- Do not create duplicate Abacus.
- Keep Public Speaking display name with existing slug spoken-english.
- Do not build Phase 2 features such as batches, attendance, certificates, etc.
- Keep existing VATTAMS UI/branding.
- Make the complete booking flow actually functional, not just a visual button.

Before creating a migration, inspect the existing Supabase schema/migrations.
If trial-request infrastructure already exists, reuse it.
If it does not exist, create only a safe additive migration.

After implementation:
npm run build

The build must pass.
Do not deploy automatically.

Report exact files changed, database changes, and build result.