# ASTA CONSTUCTION shared workspace

## Current activation status
The shared-storage implementation and migrations are ready to configure. The checked-in `workspace-config.json` is intentionally empty: **no live Supabase project, owner login, cloud upload or phone/laptop migration is claimed until it is provisioned and tested.** Existing browser/Drive data remains available until activation. Never clear browser storage or uninstall the PWA during migration.

## One-time provisioning

The Supabase connection offered in this conversation can apply the project/schema configuration once it is connected. Signing into supabase.com alone does not connect that integration. Without that connection an administrator can use the dashboard:

1. Create a dedicated Supabase project on the Free plan, in an appropriate UK/EU region. Choose the database password privately; do not put it in GitHub or this chat. Do not enable a paid plan without an explicit budget decision.
2. Apply `supabase/migrations/202611030001_shared_workspace.sql` in the SQL Editor (or `supabase db push`). It creates private tables, checked RPCs, history and the private `qa-evidence` bucket. Keep migrations under source control and append later migrations; never disable RLS.
3. In Authentication settings, disable public sign-up. In Authentication → Users → Add user / Create user, create the owner's **application login** (`goglikoadeishvili@gmail.com`) with a password chosen privately. This is separate from the Supabase dashboard login and the PostgreSQL password. No Google OAuth setup is required for shared storage. Gmail sending remains a separate optional Google permission.
4. Run `supabase/bootstrap-owner.sql`. Copy the returned `workspace_id`.
5. From the project's API settings obtain the project URL and **publishable** key (legacy `anon` key also supported). Never use the secret / service-role key. These two values and the workspace ID are browser-public configuration; RLS and membership protect the actual data.
6. Set those three values in `source/public/workspace-config.json`, then publish the app, or use `.env.example` build variables. The existing GitHub Pages URL and installed PWA can remain. Configuration changes should be applied to the tracked source config and root deploy copy together. The config is fetched from the network, with a last-known copy for offline startup.
7. Open the app on each device and sign in once with the application login. The SDK persists the session and refreshes it automatically; sign-out, revocation, clearing browser data or provider session policy can still require sign-in again.

## Preserve and merge the existing 4 / 3 inspections

After signing in, the shared workspace uses an isolated per-workspace, per-user cache. The old `asta-personal-qa` database is untouched. A banner reports how many old inspections remain on that device. Use **Import this device's old inspections** once on the phone and once on the laptop, and wait for **All shared records synced**. You may download a full backup from the old mode before activation as an extra independent copy.

The migration verifies required evidence exists, keeps original bytes, uploads files by SHA256 only once, retains separate inspection IDs, and preserves differing same-ID inspections as Pending imported alternatives. Existing drawing IDs are reused when they point to the same original PDF/revision/page. The same project stays together. Conflicting drawing revisions stay separate. Repeating an import does not replace an already reviewed imported alternative. Sent history is retained and no migration sends an email.

A phone's old local-only record cannot be recovered remotely by looking at the laptop. That device must complete its import (or supply its full `.asta` backup). Both devices must use the same configured workspace; individual colleagues may use different authorised accounts.

## Data and access model

- `qa_workspaces`: one shared company, configurable byte limit.
- `qa_members`: explicitly allowed app users (`admin` / `editor`). No self-enrolment, anonymous reads or member-list administration in browser code.
- `qa_records`: authoritative current project/drawing/inspection/report/settings records with server revisions. Conditional writes prevent stale devices replacing newer edits.
- `qa_record_history`: immutable record revisions, actor IDs and times.
- `qa_files` and private `qa-evidence`: content-addressed originals and report files, bounded by reservations and 50 MB per-file validation. Failed-upload reservations count toward the workspace limit until an administrator diagnoses them; the app does not silently purge evidence.
- Writes and email send claims use database functions with explicit membership checks and transaction locks. One batch cannot be claimed simultaneously by two devices. Gmail provider success is still required to record a successful send; a lost reply remains uncertain.
- Access/refresh sessions belong to Supabase Auth storage, not exported QA records. Gateway credentials are stripped from records before upload. Private downloads are checked against SHA256 and metadata size.
- Offline edits remain in the local cache until a sync succeeds. The interface labels this explicitly. Network failure must never be displayed as successful sync.
- Concurrent inspection edits are preserved as Pending REVIEW copies. Concurrent edits to shared company/project/drawing settings are retained locally and reported for review; export a backup and resolve them before retrying, rather than overwriting them silently.

To add a colleague, create/invite their Auth user and insert their `user_id` into `qa_members` for the same `workspace_id`. Use an administrator's SQL console, never a service key in the app. All authorisation is enforced again by the database/storage, not merely by hidden UI controls.

## Storage, costs and retention

At implementation time Supabase Free lists **1 GB file storage**, **500 MB database space**, and no paid subscription is selected by this code. Free projects can pause after inactivity and include network/other limits; verify the current plan before production use. The app starts with a 1 GiB workspace reservation limit, but the actual provider plan is authoritative. Lower that limit if other files share the project. It is not GitHub storage and not unlimited. Database revision history also consumes space.

The shared meter counts committed and reserved company file bytes, including incomplete uploads, so failed uploads cannot make available capacity look larger. Offline caches consume separate device storage. Cloud evidence has no automatic delete policy. Local seven-day evidence cleanup is disabled in shared mode to avoid removing evidence while other devices are migrating. PDF-only ZIPs are not an original-evidence backup. Configure a separately reviewed backup/retention process before enabling any future purge.

Sources: https://supabase.com/pricing ; https://supabase.com/docs/guides/storage/security/access-control ; https://supabase.com/docs/guides/auth/sessions

## Verification and rollout

`npm run check`, `npm test`, `npm run build`, `npm run publish:assets`.

Tests include an actual embedded PostgreSQL migration with roles/RLS, denied outsider access, version conflicts, immutable file rules, quota reservations and one email claim. Transport tests simulate phone/laptop reconciliation from three to four inspections, byte-identical files, retries, conflicts, isolated caches and migration idempotency. These do not establish that a live Supabase account is configured. After provisioning, verify on the live project that a non-member cannot read data, then create/edit an inspection on one real device and confirm its photos/pin on the other. Preserve the old workspace until that comparison succeeds.

Rollback: publish an empty public config to return to the preserved legacy device workspace. New shared-only records remain in Supabase and the isolated shared cache; export their full backup before switching workflows. Never roll back by deleting a database or clearing browser data.
