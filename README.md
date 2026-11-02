# ASTA CONSTUCTION · GOGA Dryliner QI

Personal, mobile-first drylining QA for the NEOS / Haymarket project. The user-authorised three-floor C1 wall-plan PDF is included with the public application. It is publicly downloadable. Other project PDFs, inspection records, original photos, recipient addresses and credentials are not published.

Live application: https://goglikoadeishvili-cmyk.github.io/asta-qi/

## Current working workflow

1. Choose **Oxendon Basement OB1**, **Ground Floor GF1/GF3**, or **Mezzanine MO1**.
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

Public source is in `source/`. Root HTML/assets are the compiled deployable app. Tests cover checklist gates, pin validity, exactly one email/ZIP for multiple PDFs, provider rejection/uncertainty, duplicate request handling and secure-link mode using mocks; they do not claim real email delivery.

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
