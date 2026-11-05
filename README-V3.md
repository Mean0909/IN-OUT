# SISD-IN Version 3.0 — Offline + Cloud Sync (Starter Integration)

## Included
- Existing SISD-IN application, UI, reports, company information and DDG workflows.
- IndexedDB local storage retained (`SISD_IN_Database`, `appData`).
- Backup now also includes saved document subjects.
- Optional Supabase Auth and Cloud Sync panel in Settings.
- First-time upload/download choices and conservative two-way sync with dataset-level conflict detection.
- SQL schema with Row Level Security (RLS).

## Important limitations / security
1. This is a **single-user-per-account starter integration**, not yet a production multi-user workflow. Shared team access, role permissions, audit trails, document-level conflict resolution and admin provisioning require a separately reviewed design.
2. Only the four listed data sets are synchronized. Other browser settings/UI preferences are not synchronized.
3. The existing app stores attachments as embedded data URLs in some DDG records; this starter stores those JSON payloads in the database. For real operational use, move files to private Supabase Storage with strict policies and size limits.
4. Do not use this for confidential institutional records until the institution's IT/security/privacy team approves the architecture, access model, retention, backups and hosting/data-residency requirements.
5. Never put a Supabase `service_role` secret in browser code. Use only the Project URL and publishable/anon key, with RLS enabled.
6. Browser-side config is saved in LocalStorage. Do not use shared/public computers for confidential records.
7. Sync is manual (button-driven), not real-time/background sync. A conflict stops the sync instead of silently overwriting either side.

## 1. Preserve local data first
- Open the existing SISD-IN website in the **same browser profile** that contains the IndexedDB records.
- Open Settings → Backup Data and download a JSON backup.
- Keep a separate copy. Do not clear browser/site data or delete the old IndexedDB database.
- Deploy these files over a copy/branch first, not over the only working version.

## 2. Create Supabase project
1. Create a Supabase project in an institution-approved account/region.
2. Open SQL Editor and run `supabase-schema.sql`.
3. In Project Settings → API, copy the Project URL and publishable key (or legacy anon key).
4. In Authentication settings, configure allowed sign-up policy and email confirmation. For a controlled institution system, prefer admin-provisioned accounts and disable open public sign-up after setup.
5. Confirm RLS is enabled on `public.sisd_app_data` and policies exist.

## 3. Deploy to GitHub Pages
- Keep all original files/folders together.
- Add `cloud-sync.js` and the modified `index.html` / `app.js` from this package.
- Commit and push to the intended repository/branch.
- Open the deployed site over HTTPS. Supabase SDK loads from jsDelivr, so Cloud features require internet; local IndexedDB functions continue to work offline after app files are cached/loaded, but CDN-dependent cloud features will not.

## 4. Configure and sign in
1. In SISD-IN open Settings.
2. Enter Supabase Project URL and publishable/anon key; click Save Cloud Settings.
3. Enter the account email/password and click Sign in / Create account.
4. If email confirmation is enabled, confirm the email before signing in.

## 5. First migration — choose carefully
- If this computer contains the data you want to seed into a new/empty cloud account: click **Upload this computer's data to Cloud**.
- If Cloud already contains the authoritative data and this computer should receive it: click **Download Cloud data to this computer**. This replaces the local SISD datasets, so make a backup first.
- Do not click both as an experiment. Choose one direction based on which copy is authoritative.

## 6. Normal operation
- Make sure each computer signs in to the same account.
- Use Two-way Sync manually after changes. If the same dataset was changed on both sides since the last successful sync, the app stops and reports a conflict. Back up both computers and reconcile manually before selecting the authoritative dataset.
- Avoid simultaneous editing and syncing from multiple computers until record-level merge and audit logging are implemented.

## 7. Test plan
- Use fictional/test data only.
- Test sign-in and RLS with two separate accounts: one must not read the other's data.
- Test upload from Computer A, download to Computer B, then edit on A and sync to B.
- Test simultaneous edits to the same dataset; expected result is a conflict message and no automatic overwrite.
- Verify incoming documents, company information, DDG records/history, and saved subjects.
- Test local operation with internet disconnected (cloud controls unavailable; local records should remain).
- Verify backup/restore before any production migration.

## Files
- `index.html`, `app.js`, `style.css`, `data.js`, `i18n.js`, `img/` — original app plus settings integration.
- `cloud-sync.js` — Supabase auth and manual sync.
- `supabase-schema.sql` — table and RLS policies.
- `README-V3-KM.md` — Khmer setup guide.
