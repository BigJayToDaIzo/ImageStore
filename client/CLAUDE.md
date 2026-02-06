# ImageStore Client

## CRITICAL: No Git Operations
**Do NOT run any git commands** (commit, add, rm, push, pull, checkout, reset, stash, etc.) without the user's specific and explicit consent. This consent is rarely given. The user manages their own git workflow.

Astro + Svelte frontend for the ImageStore application.

## Technology
- **Framework:** Astro (SSR with Node adapter)
- **Interactive Islands:** Svelte 5
- **Desktop App:** Electron (for distribution)
- **Runtime:** Bun (development)

## Views
- **Sort View:** Main workflow - display image, fill form, move to next
- **Patients Tab:** CRUD table for patient lookup CSV

## Components

### ImageSorter.svelte
Main layout component with 50/50 horizontal split.
- **Left half:** Preview image on top, thumbnail grid below (always visible)
- **Right half:** Form fields only (no scrolling needed)
- Thumbnail grid with hover preview (shows hovered image in main preview)
- Folder selection via `webkitdirectory` input
- Dirty form warning modal when switching images OR changing source folder

### CaseNumberInput.svelte
Compact form fields for patient/case data with ghost text autocomplete.
- **Case Number:** Text input with ghost text autocomplete
  - Search triggers on first keystroke (100ms throttle)
  - Suggestions dropdown flies out LEFT (doesn't cover form fields)
  - Tab/Enter selects first suggestion or exact match
  - Ghost text shows suggested case number completion
- **Last Name / First Name:** Two fields side by side with ghost text from suggestion
- **Date of Birth:** Complex input with ghost text, plus:
  - Text field (MM/DD/YYYY format, auto-formats as you type)
  - Month dropdown, Day dropdown, Year button with modal
  - Default year = 33 years ago (average patient age)
  - Enter key accepts default year and moves focus to consent
  - All 4 inputs stay synced bidirectionally
- **Consent Status:** Radio (No Consent / Consent Given)
- **Consent Type:** Radio (HIPAA Only / Social Media) - only shown when consent given
- **Procedure / Surgeon:** Two fields side by side
- **Surgery Date:** Date picker (defaults to yesterday)
- **Image Type / Angle:** Two fields side by side
- **New patients** saved to CSV automatically on image submit

### PatientsTable.svelte
Full CRUD table for patient management.
- Search with ghost text autocomplete (Tab/Enter completes)
- Sortable columns: Case #, Last Name, First Name, DOB, Surgery Date, Procedure
- Inline editing with Enter to save, Escape to cancel
- Delete confirmation modal
- "Copy Path" button shows image folder location for each patient

### SettingsPanel.svelte
Settings management with subtab navigation.
- **Subtabs:** Storage, Procedures, Surgeons, Misc
- **Storage tab:** Destination path, custom data path option
- **Procedures tab:** Default procedure selector, CSV import, CRUD list
- **Surgeons tab:** Default surgeon selector, CSV import, CRUD list
- **Misc tab:** Image type, angle, patient age defaults
- CSV import: Click "Import CSV" → file picker → auto-imports on selection (merges, skips duplicates)

## Data Layer

### procedures.ts
CSV-based procedures storage (like patients.csv).
- **Location:** `{dataDir}/procedures.csv`
- **Schema:** `id, name, favorite`
- **Default procedures:** Rhinoplasty, Facelift, Blepharoplasty, Breast Augmentation, Liposuction
- **Functions:** `loadProcedures()`, `saveProcedures()`, `createProcedure()`, `updateProcedure()`, `deleteProcedure()`, `importProcedures()`

### /api/procedures
REST API for procedures CRUD.
- **GET:** List all procedures
- **POST:** Create single or bulk import (array)
- **PUT:** Update procedure by id
- **DELETE:** Delete procedure by id

### surgeons.ts
CSV-based surgeons storage (like procedures.csv).
- **Location:** `{dataDir}/surgeons.csv`
- **Schema:** `id, name`
- **Default surgeons:** *(empty - add via Settings)*
- **Functions:** `loadSurgeons()`, `saveSurgeons()`, `createSurgeon()`, `updateSurgeon()`, `deleteSurgeon()`, `importSurgeons()`

### /api/surgeons
REST API for surgeons CRUD.
- **GET:** List all surgeons
- **POST:** Create single or bulk import (array)
- **PUT:** Update surgeon by id
- **DELETE:** Delete surgeon by id

## Default Settings

On first run, ImageStore creates config/data files with factory defaults. Once modified, changes persist and become the new defaults for future sessions.

### File Locations (XDG Standard)
| Purpose | Path | Contents |
|---------|------|----------|
| Config | `~/.config/imagestore/settings.json` | Settings (paths, defaults) |
| App Data | `~/.local/share/imagestore/` | `procedures.csv`, `surgeons.csv` |
| Patient Data | `{destinationRoot}/patients.csv` | Patient index (lives with images) |
| Images | `~/Documents/ImageStore/sorted/` | Sorted patient images |
| Source | `~/Documents/ImageStore/unsorted/` | Unsorted images to process |

### Factory Default Values

**Storage Paths:**
- Destination Root: `~/Documents/ImageStore/sorted`
- Source Root: `~/Documents/ImageStore/unsorted`
- Custom Data Path: *(empty - uses destinationRoot)*

**Form Defaults:**
- Procedure: Rhinoplasty
- Image Type: Pre-Op
- Angle: Front
- Patient Age: 33 years (for DOB year picker)
- Surgeon: *(none)*
- Consent: No Consent

**Default Procedures:**
- Rhinoplasty, Facelift, Blepharoplasty, Breast Augmentation, Liposuction
- All marked as favorites

**Surgeons:** *(empty - add via Settings)*

## UI Conventions

### Tab Colors (ROYGBIV)
Each main tab has a unique color theme with folder-tab styling:
- **Sort Images:** Red (#fee2e2 bg, #991b1b text)
- **Patients:** Orange (#ffedd5 bg, #9a3412 text)
- **Settings:** Violet (#f3e8ff bg, #6b21a8 text)

Settings subtabs use purple shades (#ede9fe inactive, #ddd6fe active).

### Form Styling
- Form inputs: 1px solid #ccc border, 4px radius
- Consent form wrapped in light grey (#f8f8f8) rounded container

## Sort Form Behavior

### Case Number Field
- Text input with autocomplete (throttled search against CSV)
- Ghost text for tab-completion when partial match found
- **Existing case:** Name/DOB auto-populate and become read-only
- **New case:** Name/DOB are empty and editable; saved to CSV on submit

### Patient Name / DOB
- Editable only when entering a new case number
- Read-only when case number exists (edit via Patients tab instead)

## Packaging & Distribution

### Development
```bash
bun run dev          # Start Astro dev server at localhost:4321
bun run build        # Build for production
bun run electron:dev # Build + run in Electron window
```

### Building Distributables
```bash
bun run dist:mac       # Mac ARM (M1/M2/M3) .dmg
bun run dist:mac-intel # Mac Intel .dmg
bun run dist:win       # Windows .exe installer
bun run dist:linux     # Linux AppImage
```

Output goes to `release/` folder.

### Architecture
- Electron main process (`electron/main.js`) spawns the Astro Node server
- BrowserWindow loads `http://localhost:4321`
- All file system operations happen server-side via `/api/*` endpoints
- Clean separation enables future migration to Tauri if bundle size matters

## Next Session
- [ ] Procedure favorites filter: show favorites first, "Other..." reveals full list with type-to-filter
- [ ] Filter for malformed case numbers once schema is defined (schema TBD)
- [ ] Figure out how to manage surgery packages (multiple procedures per surgery, bundled pricing, etc.)
- [ ] Show clickable links to browse images in file system for existing case numbers
- [ ] Set up GitHub Releases for distribution (auto-publish on tags)
- [ ] Procedure-specific form behaviors (e.g., tummy tuck cycles angles front→left→back→right, BBL defaults to back)

## Completed 2026-02-05
- [x] Store surgeons as local CSV (like procedures.csv)
  - Created `surgeons.ts` library with full CRUD operations
  - Created `/api/surgeons` REST endpoint
  - Removed surgeons from settings.json (now in `~/.local/share/imagestore/surgeons.csv`)
  - Updated SettingsPanel to use surgeons API
  - Updated CaseNumberInput to fetch surgeons from API
  - Factory reset no longer affects surgeons (stored separately)
- [x] Auto-load images from default source folder on startup
  - Created `/api/source-images` and `/api/source-image` endpoints
  - ImageSorter fetches from server on mount
  - Sort flow handles both server-loaded and folder-picker images
- [x] Zebra striping on patients table rows
- [x] Surgeon name formatting in patients table (strip dr_, capitalize)
- [x] Image sorting flow: write → verify → delete source → save patient
- [x] Electron packaging for desktop distribution
  - `electron/main.js` - main process starts Astro server and opens BrowserWindow
  - `bun run dist:mac` / `dist:mac-intel` / `dist:win` / `dist:linux` build commands
  - Creates proper .app bundle for Mac (drag to Applications folder)

## Completed 2026-02-03 (Session 2)
- [x] Reorganized ImageSorter layout: 50/50 horizontal split
  - Left half: preview image on top, thumbnails always visible below
  - Right half: form only (no scrolling)
- [x] Compacted form layout: Procedure/Surgeon and ImageType/Angle in two-column rows
- [x] Removed pin/collapse functionality from thumbnails (always visible)
- [x] Dirty form warning now shows when changing source folder (not just image switch)
- [x] Matched red theme colors (#fee2e2) across left panel
- [x] Disabled Astro dev toolbar in config
- [x] Created procedures.ts library with CSV persistence
- [x] Created /api/procedures endpoint with full CRUD

## Completed 2026-02-03 (Session 1)
- [x] Default consent type to "hipaa" when consent given (least access principle)
- [x] Removed consent status from Settings (always defaults to no_consent, not configurable)
- [x] Settings panel with subtabs: Storage, Procedures, Surgeons, Misc
- [x] Moved default procedure selector to Procedures tab
- [x] Moved default surgeon selector to Surgeons tab
- [x] Streamlined CSV import: single "Import CSV" button opens file picker, auto-imports on selection
- [x] Removed Browse buttons from import sections
- [x] ROYGBIV tab colors: red (Sort), orange (Patients), violet (Settings)
- [x] Folder-tab styling for main tabs and Settings subtabs
- [x] Matching background colors throughout each tab's content area

## Completed 2026-02-02
- [x] Dirty form confirmation modal (warns when switching images with unsaved form data)
- [x] Code review before merging friday_work into main
- [x] Ghost text autocomplete on Patients tab search field
- [x] Ghost text autocomplete on Sort tab (case #, name, DOB fields)
- [x] Suggestions dropdown flies left to avoid covering form fields
- [x] New patients saved to CSV on image submit
- [x] Added surgery_date and primary_procedure to patient CSV schema
- [x] Copy Path button for image folder location on Patients tab

## Completed 2026-01-29
- [x] Date picker UX (text + dropdowns + year button modal, all synced)
- [x] Thumbnails collapse on image selection with toggle button
- [x] Folder selection via browser picker (webkitdirectory)
- [x] Hover preview in thumbnail grid
- [x] Consent status/type radio buttons
- [x] Enter key in DOB field accepts default year and advances focus
- [x] Procedure dropdown (top 5: Rhinoplasty, Facelift, Blepharoplasty, Breast Augmentation, Liposuction)
- [x] Surgery date field (defaults to yesterday)
- [x] Image type dropdown (Pre-Op, 1 Day, 3 Mo, 6 Mo, 9+ Mo Post-Op)
- [x] Angle dropdown (Front, Back, Left, Right)
- [x] Smart defaults for 98% use case (no consent, rhinoplasty, yesterday, pre-op, front)
- [x] Live destination path preview with placeholders
- [x] Submit button with form validation

---
*Last updated: 2026-02-05 (Electron packaging)*
