# ImageSort Client

Astro + Svelte frontend for the ImageSort application.

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
Form fields for patient/case data.
- **Case Number:** Text input, reveals other fields when populated
- **Last Name / First Name:** Two separate fields
- **Date of Birth:** Complex input with:
  - Text field (MM/DD/YYYY format, auto-formats as you type)
  - Month dropdown, Day dropdown, Year button with modal
  - Default year = 33 years ago (average patient age)
  - Enter key accepts default year and moves focus to consent
  - All 4 inputs stay synced bidirectionally
- **Consent Status:** Radio (No Consent / Consent Given)
- **Consent Type:** Radio (HIPAA Only / Social Media) - only shown when consent given

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
- [ ] **CODE REVIEW FIRST** - Do code review in the cloud (not locally) before committing. User wants to audit code before commits.
- [ ] Settings tab - allow user to change default values (procedure, angle, image type, etc.)
- [ ] Filter for malformed case numbers once schema is defined (schema TBD)
- [ ] Wire form submission to backend API (move/rename file)
- [ ] Case number autocomplete with ghost text tab-completion

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
*Last updated: 2026-01-29*
