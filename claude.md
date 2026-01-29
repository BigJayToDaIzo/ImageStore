# ImageSort - HIPAA-Compliant Media Management

## Project Overview
Application for a cosmetic surgery center to help the photographer sort and safely store HIPAA-compliant images and videos.

## Project Structure

```
/ImageSort
  /server        # Gleam API (Wisp/Mist) - see server/CLAUDE.md
  /client        # Astro + Svelte UI - see client/CLAUDE.md
  claude.md      # Project-wide context (this file)
```

## Requirements
- [ ] HIPAA-compliant storage of patient images/videos
- [ ] Sorting/organization functionality for photographer
- [ ] Secure access controls
- [ ] Patient consent tracking (for downstream usage)
- [ ] Audit logging (HIPAA requirement)

## Technology Stack

**Backend:** Gleam (compiles to Erlang/BEAM)
- Web framework: Wisp or Mist
- File I/O: simplifile
- CSV parsing: gsv or similar

**Frontend:** Astro (with Svelte islands for interactivity if needed)

**Deployment:** Localhost webapp on Mac workstation

## Application Purpose
**File sorting/filing tool** - batch ingest and organize images from various sources.

### Source Options (read-only inputs)
- Camera SD card (new photos from shoots)
- External SSD
- Network share with legacy disorganized images
- **Unsorted folder on the LAN share** (for images already on the share but not yet organized)

### Destination
- **LAN share (sorted area)** - the sole destination for all sorted images
- App renames and stores files only in the organized portion of the LAN share
- All sources (including the LAN share's own unsorted folder) feed into this single organized location

### Workflow
1. Photographer points app at source folder (SD card, external drive, or network share)
2. App displays thumbnails of all images in source; first image selected by default
3. Photographer can select any image from the source (not locked to sequential order)
4. Photographer fills out form (dropdowns, radio buttons, checkboxes)
5. App moves/renames file to correct destination path based on form inputs
6. App advances to next image (or photographer selects another)
7. Repeat until source folder is empty

The folder structure serves as the organizational system - the app ensures files land in the right place with proper naming.

### File Safety
- **Non-destructive operations:** Source files are never deleted until destination write is confirmed successful
- Pattern: copy to destination → verify write succeeded → delete source
- If destination write fails, source file remains untouched and user sees a modal with a descriptive error message

## Data Architecture
**Filesystem-based approach (no database engine)**

Consent status and metadata indicated by folder structure and filenames. Optional CSV alongside case images for additional metadata if needed.

### Patient Lookup Table
CSV file mapping case numbers to patient identity.
- Editable via "Patients" tab in app (simple table: add/edit/delete rows)
- Can be manually edited in text editor or Excel for bulk historical data entry
- App reads on startup, writes on save

```csv
case_number,patient_name,dob
2026-001,Smith Jane,1985-03-15
2026-002,Doe John,1990-07-22
```

All other metadata (procedure, consent level, etc.) stored in folder structure and filenames.

## Folder Structure

```
/<consent_status>
  /<consent_type>          (only under consent/)
    /<procedure_type>
      /<surgery_date>
        /<case_number>
          <case#>_<image_type>_<angle>.jpg
```

### Example
```
/no_consent
  /rhinoplasty
    /2026-01-15
      /2026-001
        2026-001_pre_op_front.jpg
        2026-001_3mo_post_op_front.jpg

/consent
  /hipaa
    /rhinoplasty
      /2026-01-15
        /2026-001
          2026-001_pre_op_front.jpg
  /social_media
    /rhinoplasty
      /2026-01-15
        /2026-001
          2026-001_6mo_post_op_left.jpg
```

### Field Values

**surgery_date:** YYYY-MM-DD format (folder level, keeps PHI out of filename)

**consent_status:** no_consent, consent

**consent_type:** hipaa, social_media (only applies when consent_status=consent)

**procedure_type:** *To be scraped from website*

**image_type:**
- pre_op
- 1day_post_op
- 3mo_post_op
- 6mo_post_op
- 9plus_mo_post_op

**angle:** front, back, left, right

### Access Rules
- **no_consent:** Internal LAN only, never cloud or external sharing
- **consent/hipaa:** HIPAA-compliant sharing allowed
- **consent/social_media:** Cleared for social media posting

## Deployment
- **Self-hosted on local LAN** (no cloud providers)
- On-premises data storage

## Key HIPAA Considerations
- Encryption at rest and in transit
- Access controls and authentication
- Audit trails for all PHI access
- Patient authorization for marketing use
- Physical security of on-premises servers

## Notes
- Cosmetic surgery before/after photos are PHI under HIPAA
- Images will be sorted into safe buckets for downstream users (web developer, social media manager, etc.)
- Need to track which images are cleared for public use vs. internal only

## Post-MVP Features
- [ ] Source image sorting (by name, date, size, etc.)
- [ ] Show 2 parent directories in source path (e.g., `../../parent/folder`)

---
*Last updated: 2026-01-29*
