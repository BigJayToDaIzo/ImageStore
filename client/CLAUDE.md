# ImageSort Client

Astro + Svelte frontend for the ImageSort application.

## Technology
- **Framework:** Astro
- **Interactive Islands:** Svelte (as needed)

## Views
- **Sort View:** Main workflow - display image, fill form, move to next
- **Patients Tab:** CRUD table for patient lookup CSV

## Components
*To be documented as built*

## UI Conventions
*To be documented as built*

## Sort Form Behavior

### Case Number Field
- Text input with autocomplete (throttled search against CSV)
- Ghost text for tab-completion when partial match found
- **Existing case:** Name/DOB auto-populate and become read-only
- **New case:** Name/DOB are empty and editable; saved to CSV on submit

### Patient Name / DOB
- Editable only when entering a new case number
- Read-only when case number exists (edit via Patients tab instead)

## TODO
- [ ] Filter for malformed case numbers once schema is defined (schema TBD)

---
*Last updated: 2026-01-28*
