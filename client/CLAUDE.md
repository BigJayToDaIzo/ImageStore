# ImageStore Client

Astro + Svelte frontend for the ImageStore application.

## Technology
- **Framework:** Astro
- **Interactive Islands:** Svelte (as needed)

## Views
- **Sort View:** Main workflow - display image, fill form, move to next
- **Patients Tab:** CRUD table for patient lookup CSV

## Components

### ImageSorter.svelte
Main layout component combining thumbnail panel + form panel.
- Thumbnail grid with hover preview (shows hovered image in main preview)
- Folder selection via `webkitdirectory` input
- Collapsible thumbnail panel (collapses on image selection)
- Toggle button to show/hide thumbnails

### CaseNumberInput.svelte
Form fields for patient/case data with ghost text autocomplete.
- **Case Number:** Text input with ghost text autocomplete
  - Search triggers on first keystroke (100ms throttle)
  - Suggestions dropdown flies UP (doesn't cover fields below)
  - Tab/Enter selects first suggestion or exact match
  - Ghost text shows suggested case number completion
- **Last Name / First Name:** Two fields with ghost text from suggestion
- **Date of Birth:** Complex input with ghost text, plus:
  - Text field (MM/DD/YYYY format, auto-formats as you type)
  - Month dropdown, Day dropdown, Year button with modal
  - Default year = 33 years ago (average patient age)
  - Enter key accepts default year and moves focus to consent
  - All 4 inputs stay synced bidirectionally
- **Consent Status:** Radio (No Consent / Consent Given)
- **Consent Type:** Radio (HIPAA Only / Social Media) - only shown when consent given
- **New patients** saved to CSV automatically on image submit

### PatientsTable.svelte
Full CRUD table for patient management.
- Search with ghost text autocomplete (Tab/Enter completes)
- Sortable columns: Case #, Last Name, First Name, DOB, Surgery Date, Procedure
- Inline editing with Enter to save, Escape to cancel
- Delete confirmation modal
- "Copy Path" button shows image folder location for each patient

## UI Conventions
- Blue accent color: #2563eb
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

## Next Session
- [ ] **START HERE:** When consent status = "consent", default consent type to "hipaa" (safer than leaving blank)
- [ ] Settings tab - allow user to change default values (procedure, angle, image type, etc.)
- [ ] Filter for malformed case numbers once schema is defined (schema TBD)
- [ ] Figure out how to manage surgery packages (multiple procedures per surgery, bundled pricing, etc.)
- [ ] Show clickable links to browse images in file system for existing case numbers

## Completed 2026-02-02
- [x] Dirty form confirmation modal (warns when switching images with unsaved form data)
- [x] Code review before merging friday_work into main
- [x] Ghost text autocomplete on Patients tab search field
- [x] Ghost text autocomplete on Sort tab (case #, name, DOB fields)
- [x] Suggestions dropdown flies up to avoid covering ghost fields
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
*Last updated: 2026-02-02*
