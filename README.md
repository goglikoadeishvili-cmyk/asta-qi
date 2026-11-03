# ASTA CONSTUCTION · Goga quality inspection

Personal, mobile-first drylining QA for the NEOS / Haymarket project. The user-authorised three-floor C1 wall-plan PDF is included with the public application. It is publicly downloadable. Other project PDFs, inspection records, original photos, recipient addresses and credentials are not published.

Live application: https://goglikoadeishvili-cmyk.github.io/asta-qi/

## Current working workflow

1. Choose a project, then a drawing with its floor. The default NEOS project includes OB1, GF1/GF3 and MO1 C1 plans.
2. The three-floor C1 drawing loads automatically. There is no manual import step. The app saves it once to local storage for subsequent use. Optional private project-pack import in Settings adds supporting reference documents.
3. The selected floor's page opens in pin-placement mode. Tap the inspection location, adjust the temporary NEW pin if needed, then press **DONE**. The inspection form opens only after DONE.
4. Choose IWL-1, IWL-2, IWL-3, IWS-1, IWS-2 or BLK-1; see the build-up and source notes.
5. Choose inspection stage, answer specification questions using prepared editable answers, record observed measurements and any approved design/RFI reference.
6. Take/upload photos. Original bytes are saved separately from 2400px quality-93 JPEG report copies. Caption evidence, select Pass/Fail/Pending and save; drafts are supported.
7. Search/open/edit inspections. Deletion archives the inspection recoverably; original files and old report snapshots remain.
8. Select completed inspections in Reports. Selected rows are highlighted with a count. Generate one PDF per inspection, then one ZIP. Download the ZIP or share this single file to an email app.
9. An optional separately deployed gateway provides direct sending, one provider request for one email, provider-confirmed acceptance, failed retries, unknown-state protection and secure seven-day download links. It is **not configured on the public app**.

PDFs contain branded headers, inspector, creation/update timestamps, version, floor/location, drawing reference/revision, wall specification snapshot, checklist requirements/answers/source references, defects/actions, captioned photos and a pin-marked drawing excerpt. Full original drawings are not automatically attached. Every generated batch preserves its own PDF and ZIP files; editing an inspection does not alter an earlier batch.

## Storage and privacy

IndexedDB stores records and file blobs on the **current device/browser origin**. SHA-256 deduplicates exact file uploads. Data survives refresh and normal browser restarts, but this is not shared cloud storage or an authenticated multi-user service. The user requested a personal app. No team or invitation controls are present. Only the explicitly included C1 drawing is a public asset; personal evidence remains local.

Use Settings → Download full backup regularly. Importing a backup adds missing records and preserves existing records with the same ID, so it is not a concurrent multi-device merge/sync service. The email access token is deliberately excluded from backups. Project packs and backups are unencrypted private files: keep them in a trusted location, not a public repository. Browser storage can be cleared or evicted; persistent-storage permission is best effort. Storage usage and browser quota are displayed. There is no automatic evidence deletion or retention purge.

Settings edit company name, inspector and default recipient. Gateway URL/access token are optional; never put the provider API key into the browser. Clearing site storage loses local records unless a backup exists. All public source code can be viewed, but files imported into IndexedDB are not served to other visitors.

## Document control and prepared answers

The C1 wall plans (dated 07 Oct 2026 in the title blocks) are the active floor plans. Their three pages are OB1, GF1/GF3 and MO1. The supplied wall-detail PDFs marked `(1)` and `(2)` have identical file hashes: the private pack includes only one copy.

Separate document series stay separate: typical details 80-0001–80-0006 P02, ceiling layouts P03, and specification TIG-RYD-SP-A-1005 P2 (Draft for Information, printed 15 Apr 2026). Filename/email timestamps are not used as document revision authority. Ceiling drawings include other zones; they do not create a fourth floor in this personal wall workflow.

**Known conflicts:** IWS-1 C1 legend specifies a 92mm I-stud and two 15mm layers each face; P2 describes a 92mm C-stud and one 15mm layer each face. IWS-2 lacks a complete P2 system section. P2 isolation refers to CineWALL PRO while a CineWALL LITE datasheet is supplied; product substitution approval is not established by receiving a datasheet or purchase order. The app requires the inspector's recorded approved design/RFI and confirmed build-up before passing IWS-1/IWS-2.

ALPHA standard details are double-layer systems and are **not** automatically used as approval for the project four-layer linings. The supplied ITP references CC HQ, unrelated wall codes and generic dimensions; it informs checklist stages, not automatic NEOS acceptance dimensions. Historical site-audit issues are readiness prompts, not claims that those defects remain open today. Technical questions contain source references; answers start blank/Pending. Choosing a prepared answer records the user's observation, not an automatic certification.

The interface and professional reports use English. Unicode notes are retained; unsupported built-in PDF font characters render through a canvas fallback. Phone camera capture depends on browser/OS support; unsupported HEIC decoding shows an explicit conversion instruction.

## Run and rebuild

Requires Node 22+ and npm. From this repository:

```bash
npm install
npm run check
npm test
PAGES_BASE_PATH=/asta-qi/ npm run build
npm run publish:assets
```

`postinstall` copies the PDF.js worker into `source/public`. The Vite build creates `site-build`; publish:assets copies its outputs to the repository root and creates a versioned offline app-shell service worker. Commit both source and ready root assets. Do not commit `node_modules`, private project packs, photos, other PDFs, backups or secrets. The .gitignore permits only the explicitly authorised built-in C1 PDF under source/public/drawings and drawings. For a different repository slug, set `PAGES_BASE_PATH=/your-slug/` at build time.

Public source is in `source/`. Root HTML/assets are the compiled deployable app. Additional initialisation tests verify a fresh install loads the three correct floor pages, reuses the saved drawing, and preserves a newer active revision and existing inspection references. Tests cover checklist gates, pin validity, exactly one email/ZIP for multiple PDFs, provider rejection/uncertainty, duplicate request handling and secure-link mode using mocks; they do not claim real email delivery.

## GitHub Pages deployment

Repository Settings → Pages → Deploy from a branch → `main` → `/(root)`. Push the rebuilt source and root assets. GitHub Pages serves the static app; it cannot run the optional email gateway. No Cloudflare account is required to open/use the local app or generate/download/share PDFs and ZIPs. GitHub deployment is independent of ChatGPT login.

After first online load the service worker caches the app shell and PDF worker. Imported drawings and records are local. Offline email sending is unavailable. Install from Android Chrome's menu (Install app/Add to Home screen), or iPhone Safari Share → Add to Home Screen. Desktop browsers can install using their install/menu control. Real iPhone/Android camera and mail-app handoff still need device testing.

## Optional direct email gateway — not deployed/configured

Source: `email-gateway/worker.ts`; migration: `email-gateway/schema.sql`; example bindings: `email-gateway/wrangler.jsonc`.

Needs a Cloudflare account (Workers, D1, private R2 bucket), a Resend account and an approved sender/domain. Do not enable any public R2 bucket URL. Review current service quotas/billing before activation; the base personal app has no cloud database/file charges, while this optional gateway uses provider quotas and may incur usage charges.

1. Install Wrangler as a development dependency (`npm install --save-dev wrangler`).
2. Create a D1 database `asta-qa-email` and private R2 bucket `asta-qa-report-links` using your Cloudflare account.
3. Replace the D1 database ID in the gateway config. Set APP_ORIGIN to the website **origin**, e.g. `https://goglikoadeishvili-cmyk.github.io` (without the repository path).
4. Apply `email-gateway/schema.sql` to the remote D1 database.
5. Set Worker secrets with `wrangler secret put PERSONAL_TOKEN`, `RESEND_API_KEY`, and `EMAIL_FROM`, using the gateway config. Generate a random personal token with at least 32 characters. Never commit `.dev.vars` or provider secrets. `.dev.vars.example` contains placeholders only.
6. Deploy the gateway using its Wrangler config. Enter the resulting HTTPS gateway URL and personal access token in app Settings. This token authorizes only your gateway; it is not the provider API key.
7. Test to your own recipient first: select two completed inspections and verify a **single received email**, one ZIP, two distinct readable PDFs, pin excerpt, file names, dates and photos. Verify failed/retry and oversize modes before use for company records. No such live integration test has been performed in this workspace.

The gateway limits requests to 35MB, 20 PDF files, STORE-only app-generated ZIPs, and direct attachment ZIPs to 10MB (conservative configurable limit). Oversize uses a private R2 object behind a cryptographically derived bearer URL expiring after 7 days. Anyone holding that URL can download until expiry; treat it as confidential. Configure an R2 lifecycle rule for the `downloads/` prefix after at least 8 days if desired. These are temporary report links only, never original local evidence. D1 email batch history remains.

D1 uniqueness/compare-and-update locks plus provider idempotency protect retries. Exact payload identity is enforced: changing a previously submitted recipient/subject/body requires a new batch. `accepted` means the provider returned an ID, **not recipient delivery**. Network uncertainty stays unknown and blocks blind retries; Check server status can recover a recorded provider confirmation without sending a new email. If the provider accepted but persistence failed, inspect its dashboard. There is no delivery webhook or automatic evidence purge. Old PDF snapshots and original evidence remain local.

Provider references checked when implementing: https://resend.com/docs/api-reference/emails/send-email and https://resend.com/docs/dashboard/emails/idempotency-keys ; R2: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/ .

## Branding and installed app updates

The supplied ACL logo was refined with the built-in image tool, then optimised for the header, PDF report header and maskable installation icons. The displayed subtitle is **Goga quality inspection**.

Reinstalling is not required for normal app updates. The same website origin and IndexedDB database are retained. The app checks for service-worker updates when opened, focused or reconnected and shows an Update app notice after an updated worker takes control. The notice never automatically reloads the page and is disabled while a form or operation is open. Save edits before updating. Settings also includes Check for app updates. Close/reopen while online to load updated code. Previous app cache is retained during transition; no inspection or photo database is deleted. Installed icon refresh timing depends on the browser/OS, especially existing iPhone home-screen shortcuts. Never clear website storage to update; keep regular full backups.

## Simplified inspection and automatic location

New inspections derive location from the selected floor and the C1 PDF grid axes at the normalised pin position. Grid ranges are transcribed from each original PDF page, not inferred room names. Exact pin coordinates remain the authoritative location. Pins outside the calibrated grid, on a different revision or on another PDF use floor/page/percentage position; the app never invents a room or reuses a calibration on an unverified drawing. Automatic locations update when their pins move. A user can explicitly edit the location, after which it remains manual. Existing entered locations are preserved.

There is one question and one editable detailed answer per selected inspection stage. IWL-1 metal framing uses 148mm U channels / 146mm I-studs at 600mm centres; IWL-2 uses 94mm U channels / 92mm I-studs at 600mm centres, as referenced in the supplied P2 system sections. IWS-1/IWS-2 centres are not invented where the accepted project design is unresolved. The prepared answer is an inspector-selected statement, not automatic acceptance. N/A is removed from new answer choices and validation. Earlier multi-item checklist answers are preserved in legacyAnswers when a user saves an edited record and are accessible under retained history; existing stored records are not silently rewritten. Work description is filled from the selected answer, with optional editing. New PDF reports avoid repeating the same statement as both description and requirement.

## Projects, small mobile pins and ordered wall QA

Startup now asks for a project, then lists that project's uploaded drawings with their floor and revision. NEOS is the default project; an automatic non-destructive metadata migration assigns earlier unscoped drawings, inspections and batches to it without changing pin coordinates, evidence or record versions. New projects start empty and use their own entered wall specification, not NEOS dimensions. Drawing upload assigns project, reference, revision, floor and PDF page. Only a matching drawing reference in the same project is superseded; other drawings on the same floor stay active. Project drawing writes use an atomic database transaction. Project selection resets report selection and all lists, pins, archive entries and report batches are scoped by project. Full backup includes all projects.

On touch devices the visible pin is smaller, with a larger invisible tap target. Browser visual-viewport pinch zoom is counter-scaled so the marker does not grow across the plan; desktop pin dimensions remain unchanged. Real iPhone pinch-zoom behaviour still needs device confirmation.

New wall inspections begin with the Tracks & metal framing section: Q1 head/base tracks, isolation and head fillets, then Q2 metal framing and stud centres. Each question has its own camera/upload controls and linked site photographs. The next plasterboard section contains pre-boarding flat-plate position, board layers/fixing/stagger, and final-layer joint backing. Switching sections retains their answers and question-linked photographs in the same inspection record; PDF reports include all recorded sections. Unstarted sections are not silently certified. Earlier checklist records are retained and can be explicitly upgraded in the form.

The three supplied email images are embedded as cropped technical references with the sender's name/contact/email signature excluded. They are marked REFERENCE — NOT SITE EVIDENCE and cannot satisfy the required site photo per question. They appear in the track question and in its generated report. The email states two 12.5mm blue CineWALL LITE strips at the base (25mm total), and one 12.5mm black CineWALL PRO strip at the head. Its 94mm width is not a universal approval for wider tracks. The head sketch labels two 19mm Knauf Coreboard fillets; FireLine substitutions are not automatically assumed. P2 also distinguishes 2x19mm Coreboard and 2x30mm Fireboard by deflection allowance; the ALPHA C-stud table has its own different board schedule.

P2 names Knauf Flat Fixing Plate 258300; the ALPHA double-layer sheets name a 70mm fixing strap. No fixed distance below the head track has been identified in the supplied documents. The plate question therefore records the actual measured head offset and its approved detail reference, rather than inventing a dimension. The 150mm minimum explicitly found in ALPHA is the horizontal board-joint stagger, with vertical joints staggered between layers/opposing faces. These are double-layer details and are not automatically a complete approval of the NEOS four-layer Knauf assembly. Final-layer backing is checked behind the joints where the accepted detail requires it, not presented as an exposed finish strip.

Direct email remains an optional, unconfigured gateway; report generation and ZIP download are working local functions. No real email delivery is claimed by this update.


November 2026 simplification: main navigation now has Inspections and Projects / Add project. Existing projects open their own inspection list; an empty/new project immediately prompts for its PDF drawing. Reports and email selection are available inside Inspections, with backup/settings inside Projects. Track answers use the owner's requested two FireLine layers; inspector must verify against the current drawing before choosing Yes. Flat-plate checks no longer request a numeric offset. No per-question photo count limit is imposed; browser storage and the existing 35 MB per-image validation still apply. Email reference illustrations have been removed from current source/public assets, UI, generated reports and service-worker caches. Existing saved records and previously generated PDF archives are retained; historical Git commits are not rewritten.


Inspection workflow update: after placing a pin, choose Tracks & metal framing or Plasterboard. These create separate inspection records, references, evidence lists and PDFs. Completed framing records offer a new plasterboard inspection at the same pin; no answers or site photos are copied. The former next-section switch is removed. Earlier multi-section records are retained for compatibility. Default prepared wording is shortened in the editor; previous wording is retained in the record's legacy answers when saved, and custom-written answers remain unchanged.


Fix: inspection lists now show every saved record in the selected project across all floors. Saving resets list search/status/floor context so the preceding inspection is not hidden by a floor or Pending filter. Pending accepts incomplete records for later editing. Pass still requires answered/passed checks and at least one inspection photo, but no longer requires a separate photo for every question. Per-question camera/upload remains available without a photo count limit. Track response describes the top track, including two FireLine plasterboard fire-strip layers, before the bottom track. Boarding question/answer references manufacturer guidance.


## Gmail sender, QI reports and original-quality evidence
The visible app/report/email wording and new inspection references use QI (Quality Inspection). Existing QA record references, frozen PDFs and backup format IDs remain stable. Each newly generated email ZIP contains individual report PDFs, `original-photos/<sha256>.<extension>` with byte-for-byte originals, and `photo-index.json` mapping photos/captions/questions to inspections. Duplicate original bytes are stored once. PDF report images use readable report copies; the ZIP also includes the unchanged full-resolution originals.

The footer shows actual device file usage and the browser storage estimate, including estimated remaining space. Files are local IndexedDB data, not GitHub uploads; no fictitious GitHub capacity is shown. Browser quota is approximate and not a guarantee of disk space or retention.

Direct personal Gmail uses Google Identity Services + Gmail API, from the verified connected account, one MIME message with one ZIP. Setup is documented at `/asta-qi/gmail-setup.html` (also bundled offline). Requires a Google Cloud project, Gmail API, External OAuth consent/test-user setup, Web OAuth Client ID, and exact authorised origin `https://goglikoadeishvili-cmyk.github.io`. Enter only the public Client ID and sender address in Company & email, then Connect Gmail from the email form. No client secret or Gmail password is used. Tokens are short-lived and checked against the selected sender's verified email. An unexpired token may survive same-tab reload through sessionStorage; expiry or a closed browser session requires reconnecting. Requested scopes: gmail.send, openid, email; no inbox read or delete permission. Real Gmail account authorisation and delivery remain unconfigured/untested until the owner completes Google setup. Mock transport tests do not establish live delivery.

Direct Gmail ZIP limit: 24 MB in-app, below personal Gmail's documented 25 MB attachment limit. Sending is disabled for larger ZIPs; originals are never silently reduced. The optional secure-link gateway remains a separate deployment/configuration; no automatic Drive upload exists. A batch is marked sent only on Gmail 2xx plus message ID. Network/5xx/invalid successful responses stay unknown, block automatic retry, and direct the owner to Gmail Sent. Recipient delivery is unverified. Other API rejections remain failed for retry. Alternative gateway does not impersonate the Gmail address; it uses its separately verified provider sender.


## Pending / Pass, recipient-confirmed delivery and private device sync
Inspection UI has Pending and Pass only. Historical Draft/Fail values are displayed as Pending without erasing previous data. Email status is separate: Draft = prepared/shared/failed/uncertain; Sent = provider acceptance, receipt unverified; Delivered = provider-confirmed send plus owner's explicit evidence of recipient acknowledgement. **Gmail send success is never treated as automatic delivery confirmation.** No real delivery webhook/recipient mailbox verification is configured.

From explicit recipient confirmation, a seven-day countdown and exact archive date are shown. At expiry, only the same inspection version referenced by the delivered batch is soft-archived. Originals, photo bytes, drawing pins and immutable PDF/email history remain recoverable. Edited versions, unconfirmed sends and restored records with a retention hold are excluded. Archive/restore and full archive download remain available manually. Checks run on opening/refresh and every minute while open. This is **recoverable removal from the active list**, not irreversible evidence deletion or storage cleanup; no unattended background-server purge exists while all devices are closed. Archiving does not free storage.

Private Google Drive appData sync is implemented behind explicit Connect private cloud sync. Requires the same Google OAuth Client ID and same verified owner account on phone and laptop, Drive API enabled, and drive.appdata/openid/email consent. Use the existing Gmail setup guide; no new storage service password or public bucket is used. Unexpired tokens can survive same-tab reload in sessionStorage; expiry or a closed browser session requires reconnecting. Local data is never cleared on connect/disconnect or network failure. Cloud synchronisation remains unconfigured and not verified with a live Google account until the owner completes setup; tests use a simulated Drive API.

The synchroniser uploads immutable SHA256-addressed blobs and append-only record snapshots, downloads missing bytes with SHA256 integrity checks, and merges independent projects/records. Original evidence is not recompressed. Edits during network operations stay local for the next sync. Inspection version conflicts create Pending REVIEW copies with their evidence, instead of silently losing an edit. Accepted email histories cannot be downgraded to Draft by an old snapshot. Backup/settings tokens are excluded. Sync runs every 30 seconds while connected/open, on focus/online, or via Sync now; inspection forms pause sync. Google storage quota is shown only when its API returns a quota; it is shared Google-account space, not GitHub or a guaranteed free allocation. Immutable history and archives consume storage until a separately designed purge is enabled.

Drive snapshots are not a transactional server lock across devices. The Gmail send lock prevents repeated sends on a single device; avoid sending the same batch simultaneously from two devices. Exact global cross-device send idempotency, provider-verified delivery events and closed-app deletion scheduling require a backend/provider integration that has not been configured. The optional gateway has its separate server-side idempotency.


## Current download-first workflow and local storage cleanup
Google setup may be deferred. Select completed inspections → Generate PDFs & Download ZIP. Every batch offers separate Download PDF links and one Download ZIP with untouched original photos. Send the downloaded ZIP from the computer's email app. The app does not assume download/share means email sending: the owner explicitly selects “I sent this ZIP from my email · mark Sent”. That manual status is labelled as the owner's confirmation, with no invented provider ID. Delivered UI and receipt requirement are removed.

Reports now use an ACL-branded A4 layout with the issued-by company, configurable Prepared for / client company, project, exact recorded pin location, reference/revision/page, a prominent drawing excerpt with the same normalised pin, checklist responses, captions and site photos. Company & email settings contain Report issued by (default ACL) and Prepared for / client company; new projects can override the client field. If no recipient organisation is configured the PDF identifies the project team, rather than guessing a legal company name. Old frozen PDFs are preserved; generating a new batch produces the new design.

After sent status **and explicit confirmation that the downloaded original-photo ZIP is kept outside the app**, a seven-day timer schedules physical deletion of large local original photos, report photo copies and the local ZIP. Drawings, all immutable report PDFs, inspection metadata, photo captions/hashes, pin references and sent history remain. Shared photos referenced by another retained inspection, newer edited versions and restored retention-hold records are protected. File deletion and record tombstones are one IndexedDB transaction. Blob URLs are revoked and the storage meter refreshes. Manual “Remove large local files now” uses the same backup, sent, version and shared-reference protections. Without backup confirmation, cleanup is paused. A downloaded report ZIP can be imported to restore SHA256-verified original photo bytes.

Cleanup runs on opening/refresh and periodically while open, paused during inspection editing. It cannot run at the exact deadline with the app/device closed: it runs at the next opening. This frees **local browser storage**. Immutable Google Drive historical backups are not automatically purged; this update does not claim to free Google storage. The cloud downloader honours purged-record metadata so obsolete photo files are not automatically re-downloaded. Cloud account configuration and real two-device validation remain pending owner setup.


The owner's public Google OAuth Client ID is configured as the app default. Existing local settings with an empty/missing Client ID inherit this default; a non-empty custom Client ID remains unchanged. This does not include a client secret or access token and does not authorise Gmail/Drive by itself. The owner still connects the account, grants the requested scopes, and must have the exact GitHub Pages origin and test user/API configuration enabled in Google Cloud. Live account sending/sync are not claimed just because a Client ID is present.

### Current report-only exports (November 2026)
New recipient ZIPs contain only individual PDFs, named `Metal inspection - FLOOR - QI-REFERENCE - vN.pdf` or `Plasterboard inspection - FLOOR - QI-REFERENCE - vN.pdf`. Loose originals and JSON indexes are excluded. Each PDF embeds inspection checks/answers/photos and the saved drawing excerpt; every photo repeats that inspection's pin, drawing reference and revision. Legacy QA/QN prefixes are displayed as QI in newly generated reports without changing stored record identities. Existing frozen batches remain unchanged; select inspections and generate a new ZIP to use this format.
PDF-only downloads are not backups of the original photos. They can be sent/marked sent, but never enable automatic original-photo deletion. Keep originals in the app/cloud and use the separate full `.asta` backup for recoverable evidence. Legacy original-photo ZIP restore and cleanup guards remain supported.

## 2026-11-02 QA report and sync update

- Generated reports include the selected inspection stage questions and all corresponding site evidence in one PDF per inspection.
- The pin-marked drawing excerpt appears once, in a compact section after the photographs; it is not repeated under each photo.
- Standard generated work descriptions are shorter without removing measurements or inspection decisions.
- Connected Google Drive devices sync after a completed local save, when reopened/focused and every 30 seconds while the app stays open. Google may still require reconnection on reload or expiry, and true unattended sign-in is not supported by the browser-only OAuth token model.
- Static site assets are automatically compiled and checked on source updates.

### Reliability review, 3 November 2026
Reviewed the current GitHub changes (including the compact paired-photo PDF layout) without rolling them back. New inspection drawings hide historical pins by default; Select pin / Show saved inspection pins reveals retained records. Archived, other-project, other-drawing/revision and other-page pins are excluded.

Unexpired Google Drive/Gmail access tokens can now survive reloads in the **same browser tab** using `sessionStorage`, bound to the verified account, Client ID and separate permission. They are never placed in app records, ZIP backups, source code or cloud snapshots. Disconnect clears the local session rather than revoking Google's entire application grant, which could interrupt other devices. Expired tokens require a user-initiated Google reconnect; this is **not permanent sign-in**, and closing a browser/PWA session may clear it. True long-lived sign-in requires a configured OAuth code-flow backend with securely stored refresh tokens; no such backend is deployed/configured by this change.

Cloud imports now read/merge/write in a single IndexedDB transaction, preserving local saves during network activity. Missing required cloud evidence prevents reporting a complete successful sync. Uploads skip unreferenced local blobs. Offline work remains local until a connected sync completes.

Validation covers pin visibility/scoping, session restore/account/expiry separation, two simulated devices, preservation of a save during sync, missing-evidence rejection, PDF-only ZIPs, PDF layouts and sending-state guards. Real phone/laptop Google sessions and live Gmail delivery still require user-side verification; they cannot be inferred from repository tests. The existing cross-device simultaneous-email-send lock and shared team workspace are still not implemented. This is a targeted reliability review, not a completed production security audit.

## Shared storage migration (prepared; activation required)

The app now includes a Supabase-backed common company workspace with persistent app login, private evidence storage, server-checked membership, revisioned records, migration of old phone/laptop copies, storage usage and cross-device email claims. The original local/Drive mode remains available while the checked-in configuration is empty. **No live shared workspace or transfer of the owner's inspections has been completed merely by publishing this code.**

See [shared workspace setup and migration](docs/SHARED-WORKSPACE.md) for the exact one-time activation steps, migration safety, free-tier limits, validation, and rollback. Set only the public values in `source/public/workspace-config.json` or `.env.example`; never publish Supabase secret/service-role keys or database passwords. The existing GitHub Pages app URL can stay unchanged.

### Current compact inspection PDFs
New reports use three proportional, uncropped photographs per evidence row. The current three-question boarding checklist with three photos per question fits one A4 page, including its marked drawing excerpt. Photo size is calculated from actual text, captions and optional notes; longer content continues without losing evidence or shrinking text indefinitely. Question/answer text stays with the first evidence row where it fits. Continuation pages use a small reference/CONTINUED line, without restarting the full logo/title header. Existing sent PDFs and ZIPs remain frozen; generate a new batch to use the new layout.
