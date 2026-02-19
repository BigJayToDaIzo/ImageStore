# ImageStore

## CRITICAL: No Git Operations
**Do NOT run any git commands** (commit, add, rm, push, pull, checkout, reset, stash, etc.) without the user's specific and explicit consent. This consent is rarely given. The user manages their own git workflow.

## Project Overview
Medical image sorting tool for a cosmetic surgery center. The photographer uses it to ingest images from a source (SD card, external drive, network share) and sort them into the practice's organized LAN share with proper naming and consent-level folder structure.

## Technology
- **Framework:** Astro 5 (static output — no server, no adapter)
- **Interactive Islands:** Svelte 5
- **Storage:** File System Access API (directory handles) + IndexedDB
- **Hosting:** Cloudflare Pages (`bun run deploy`)
- **Runtime/test runner:** Bun

## Project Structure
```
/
  src/
    components/      Svelte islands
    lib/
      store/         Browser I/O modules (IndexedDB + File System Access API)
      util/          Pure logic, no I/O (testable with bun:test)
    pages/           Astro pages (index.astro only)
    layouts/
  public/
  scripts/           Dev utilities
  astro.config.mjs
  wrangler.jsonc     Cloudflare Pages config
  package.json
```

## Development
```bash
bun run dev       # Astro dev server
bun run build     # Static build → dist/
bun run preview   # Build + run in Wrangler (Cloudflare emulator)
bun run deploy    # Build + push to Cloudflare Pages
bun test          # Run tests
```

## Architecture

### Data layer: lib/store/
All I/O goes through these browser-native modules. Components import directly — no fetch, no API routes.

| Module | Responsibility |
|--------|---------------|
| `idb.ts` | IndexedDB wrapper (single `imagestore` DB, object stores: settings/procedures/surgeons/patients/manifests/handles) |
| `fs-handles.ts` | `pickDirectory`, `persistHandle`, `reconnectHandle` — directory handle lifecycle |
| `hash.ts` | SHA-256 via `crypto.subtle.digest` |
| `settings.ts` | App settings in IndexedDB |
| `procedures.ts` | Procedure CRUD + CSV import |
| `surgeons.ts` | Surgeon CRUD + CSV import |
| `patients.ts` | Write-through cache: `patients.csv` in dest directory + IndexedDB mirror |
| `manifest.ts` | Sort session tracking — per-image status machine, concurrent hashing (limit 4) |
| `sort-image.ts` | Core sort: read source → hash → write to dest via nested `getDirectoryHandle` → `createWritable()` |
| `source-images.ts` | List images from source handle, create object URLs |

### Pure logic: lib/util/
No I/O. Covered by `bun:test`.

| Module | Exports |
|--------|---------|
| `path-utils.ts` | `buildDestinationPath()` → `{segments, filename}` |
| `csv-utils.ts` | `parseCSVLine`, `escapeCSVValue`, `patientToCSVLine` |
| `manifest-utils.ts` | `allImagesProcessed`, `isTerminalStatus`, `canTransitionTo` |
| `image-utils.ts` | `isImageFile` |

### Directory handle lifecycle
- User picks source + destination via `showDirectoryPicker()` → handles persisted in IndexedDB
- On revisit: `reconnectHandle()` retrieves from IDB and calls `requestPermission({mode:'readwrite'})` (requires a user gesture)
- `DirectoryConnectionBar.svelte` owns this UX: disconnected → reconnecting → connected → error states

### Patient CSV
- Authoritative copy: `patients.csv` in the destination directory (portable backup)
- IndexedDB mirrors it for fast search without filesystem access
- Writes go to both; reads fall back to IndexedDB if dest handle unavailable

### Sort safety
- Source files are never deleted until `batchCleanup()` runs (end of session)
- `createWritable().close()` is atomic — no re-read verification needed
- Manifest tracks per-image status; cleanup only proceeds on confirmed writes

## Views

### Sort View (ImageSorter)
50/50 horizontal split.
- **Left:** Preview image (top) + thumbnail grid with status badges (bottom)
- **Right:** Form (CaseNumberInput)
- Session flow: pick source dir → images load → fill form per image → complete session → cleanup (delete sources)
- Practice mode: in-memory synthetic images, never touches filesystem

### Patients Tab (PatientsTable)
Full CRUD table for `patients.csv`.
- Search with ghost text autocomplete
- Sortable columns: Case #, Last, First, DOB, Surgery Date, Procedure
- Inline editing (Enter to save, Escape to cancel)

### Settings Tab (SettingsPanel)
Subtabs: Procedures, Surgeons, Misc.
- Procedures/Surgeons: CRUD list + CSV import via `showOpenFilePicker()`
- Misc: default form values (image type, angle, patient age)

## Components

### CaseNumberInput.svelte
Form fields for patient/case data with ghost text autocomplete.
- **Case Number:** Autocomplete against IndexedDB patient cache (100ms throttle). Ghost text + left-fly dropdown.
- **Last / First Name:** Ghost text from suggestion. Read-only for existing patients.
- **Date of Birth:** Text (MM/DD/YYYY auto-format) + month/day dropdowns + year modal. Default year = 33 years ago.
- **Consent Status:** Radio (No Consent / Consent Given)
- **Consent Type:** Radio (HIPAA Only / Social Media) — shown only when consent given
- **Procedure / Surgeon:** Two fields side by side
- **Surgery Date:** Date picker (defaults to yesterday)
- **Image Type / Angle:** Two fields side by side
- New patients auto-saved to `patients.csv` on submit

### DirectoryConnectionBar.svelte
Top-of-app bar managing source and destination directory handles.
- Per-directory state: `disconnected | reconnecting | connected | error`
- On page load: attempts `reconnectHandle()` for both; shows "Reconnect to [name]" button if handle found in IDB
- User-gesture buttons trigger `requestPermission()` or `showDirectoryPicker()`

## UI Conventions

### Tab colors (ROYGBIV)
- **Sort Images:** Red (`#fee2e2` bg, `#991b1b` text)
- **Patients:** Orange (`#ffedd5` bg, `#9a3412` text)
- **Settings:** Violet (`#f3e8ff` bg, `#6b21a8` text)

Settings subtabs use purple shades (`#ede9fe` inactive, `#ddd6fe` active).

### Form styling
- Inputs: `1px solid #ccc`, `4px` radius
- Consent block: light grey (`#f8f8f8`) rounded container

## Destination Folder Structure
```
/<consent_status>/
  [<consent_type>/]       (only under consent/)
    <procedure>/
      <surgery_date>/     YYYY-MM-DD
        <case_number>/
          <case>_<image_type>_<angle>.<ext>
```

Access rules: `no_consent` — internal LAN only. `consent/hipaa` — HIPAA-compliant sharing. `consent/social_media` — cleared for social media.

## Patient CSV Schema
```csv
case_number,first_name,last_name,dob,surgery_date,primary_procedure,surgeon,created_at,updated_at
```
Stored as `patients.csv` in the destination directory root. Can be edited in Excel for bulk historical import.

## Testing
```bash
bun test              # All tests
bun test --coverage   # With coverage report
```
Tests live in `src/lib/util/*.test.ts` (pure logic). Browser I/O modules (`lib/store/`) are not unit-tested — use the manual smoke test for those.

**Smoke test checklist:**
1. Open in Chrome, pick source + destination directories
2. Sort an image end-to-end (fill form → submit → verify thumbnail status)
3. Complete session → verify source deleted, dest file exists with correct path
4. Verify `patients.csv` appears in dest directory
5. Close and reopen tab → verify "Reconnect" flow restores both handles without re-picking
6. Disconnect network → verify sorting still works (all logic is local)

## Post-MVP
- [ ] Source image sorting (by name, date, size)
- [ ] Show 2 parent directories in source path preview
- [ ] Surgery packages (multiple procedures per surgery, returning patients)
- [ ] Procedure favorites with "Other..." filter
- [ ] Session complete modal purge options: full purge (sorted + skipped), purge sorted only (leave skipped), or keep all files
- [ ] Procedure-specific form behaviors (e.g., tummy tuck cycles angles front→left→back→right, BBL defaults to back)
- [ ] Filter for malformed case numbers once schema is defined
- [ ] Audit logging for HIPAA compliance
