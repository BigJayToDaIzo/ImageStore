import { mkdir, writeFile, copyFile, access, unlink, rename, constants } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { hashFile, verifyFileCopy } from './hash';
import { updateImageStatus, saveManifest, type Manifest } from './manifest';
import { findPatientByCase, createPatient } from './patients';

export interface SortImageRequest {
  caseNumber: string;
  consentStatus: 'no_consent' | 'consent';
  consentType?: 'hipaa' | 'social_media';
  procedureType: string;
  surgeryDate: string;
  imageType: string;
  angle: string;
  originalFilename: string;
}

export interface SortImageOptions {
  metadata: SortImageRequest;
  sourcePath: string;
  destinationRoot: string;
  sourceHash?: string;
  csvPath?: string;
  manifest?: Manifest;
  manifestDir?: string;
  patient?: {
    firstName: string;
    lastName: string;
    dob?: string;
    surgeon?: string;
  };
}

export interface SortImageResult {
  success: boolean;
  conflict?: boolean;
  error?: string;
  destinationPath?: string;
  filename?: string;
  sourceHash?: string;
  destinationHash?: string;
}

export interface BatchCleanupResult {
  cleanedCount: number;
  failedCount: number;
  warnings: string[];
}

/**
 * Build the destination directory and filename for a sorted image.
 * Extracted from the API route for testability.
 */
export function buildDestinationPath(
  data: SortImageRequest,
  destinationRoot: string,
): { dir: string; filename: string } {
  const { caseNumber, consentStatus, consentType, procedureType, surgeryDate, imageType, angle, originalFilename } = data;

  const ext = extname(originalFilename).toLowerCase() || '.jpg';

  let basePath: string;
  if (consentStatus === 'consent' && consentType) {
    basePath = join(destinationRoot, 'consent', consentType, procedureType, surgeryDate, caseNumber);
  } else {
    basePath = join(destinationRoot, 'no_consent', procedureType, surgeryDate, caseNumber);
  }

  const filename = `${caseNumber}_${imageType}_${angle}${ext}`;
  return { dir: basePath, filename };
}

/**
 * Sort a single image: atomic copy, SHA256 verification, patient record save.
 * Source file is NOT deleted — that's handled by batchCleanup().
 */
export async function sortImage(options: SortImageOptions): Promise<SortImageResult> {
  const { metadata, sourcePath, destinationRoot, csvPath, manifest, manifestDir, patient } = options;

  try {
    // 1. Verify source exists
    await access(sourcePath, constants.R_OK);

    // 2. Build destination path
    const { dir, filename } = buildDestinationPath(metadata, destinationRoot);
    const destPath = join(dir, filename);

    // 3. Check if destination already exists → conflict
    try {
      await access(destPath, constants.F_OK);
      // File exists — conflict
      return { success: false, conflict: true, error: 'Destination file already exists' };
    } catch {
      // File doesn't exist — good, continue
    }

    // 4. Get source hash (from manifest, pre-computed, or compute now)
    let sourceHash: string;
    if (options.sourceHash) {
      sourceHash = options.sourceHash;
    } else if (manifest) {
      const manifestImage = manifest.images.find(
        img => img.filename === metadata.originalFilename
      );
      if (manifestImage?.sourceHash) {
        sourceHash = manifestImage.sourceHash;
      } else {
        sourceHash = await hashFile(sourcePath);
      }
    } else {
      sourceHash = await hashFile(sourcePath);
    }

    // 5. Create destination directory
    await mkdir(dir, { recursive: true });

    // 6. Atomic write: copy to .tmp, then rename
    const tmpPath = destPath + '.tmp';
    await copyFile(sourcePath, tmpPath);

    // 7. Hash the temp file and verify against source
    const destHash = await hashFile(tmpPath);

    if (destHash !== sourceHash) {
      // Hash mismatch — clean up temp file
      try { await unlink(tmpPath); } catch { /* best effort */ }
      return {
        success: false,
        error: 'Hash verification failed — destination does not match source',
        sourceHash,
        destinationHash: destHash,
      };
    }

    // 8. Atomic rename temp → final
    await rename(tmpPath, destPath);

    // 9. Save patient record (if provided)
    let patientRecordSaved = false;
    if (patient?.firstName && patient?.lastName) {
      const existing = await findPatientByCase(metadata.caseNumber, csvPath);
      if (!existing) {
        await createPatient({
          case_number: metadata.caseNumber,
          first_name: patient.firstName,
          last_name: patient.lastName,
          dob: patient.dob || '',
          surgery_date: metadata.surgeryDate,
          primary_procedure: metadata.procedureType,
          surgeon: patient.surgeon || '',
        }, csvPath);
      }
      patientRecordSaved = true;
    }

    // 10. Update manifest if provided
    if (manifest) {
      await updateImageStatus(manifest, metadata.originalFilename, {
        status: 'sorted',
        destinationPath: destPath,
        destinationHash: destHash,
        patientRecordSaved,
      }, manifestDir);
    }

    return {
      success: true,
      destinationPath: destPath,
      filename,
      sourceHash,
      destinationHash: destHash,
    };
  } catch (error) {
    // Update manifest on error if provided
    if (manifest) {
      try {
        await updateImageStatus(manifest, metadata.originalFilename, {
          status: 'error',
        }, manifestDir);
      } catch { /* best effort */ }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch cleanup: re-verify all sorted images, then delete their source files.
 * Only deletes sources where the destination hash still matches.
 * Updates manifest statuses to cleaned/clean_failed.
 */
export async function batchCleanup(
  manifest: Manifest,
  manifestDir?: string,
): Promise<BatchCleanupResult> {
  let cleanedCount = 0;
  let failedCount = 0;
  const warnings: string[] = [];

  manifest.status = 'cleaning';
  await saveManifest(manifest, manifestDir);

  for (const image of manifest.images) {
    if (image.status !== 'sorted') continue;

    const destPath = image.destinationPath;
    const expectedHash = image.destinationHash;

    if (!destPath || !expectedHash) {
      image.status = 'clean_failed';
      image.sourceDeleted = false;
      failedCount++;
      warnings.push(`${image.filename}: missing destination path or hash`);
      continue;
    }

    try {
      // Re-verify destination exists and hash matches
      const currentHash = await hashFile(destPath);

      if (currentHash !== expectedHash) {
        image.status = 'clean_failed';
        image.sourceDeleted = false;
        failedCount++;
        warnings.push(`${image.filename}: destination hash mismatch — source preserved`);
        continue;
      }

      // Hash verified — safe to delete source
      const sourcePath = join(manifest.sourcePath, image.filename);
      await unlink(sourcePath);

      image.status = 'cleaned';
      image.sourceDeleted = true;
      cleanedCount++;
    } catch (error) {
      image.status = 'clean_failed';
      image.sourceDeleted = false;
      failedCount++;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      warnings.push(`${image.filename}: ${msg}`);
    }
  }

  manifest.status = 'completed';
  await saveManifest(manifest, manifestDir);

  return { cleanedCount, failedCount, warnings };
}
