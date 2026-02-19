import { hashArrayBuffer } from './hash';
import { buildDestinationPath } from '../util/path-utils';
import { findPatientByCase, savePatient } from './patients';
import { updateImageStatus, saveManifest, getManifest } from './manifest';
import type { SortFormData, SortResult, CleanupResult, Manifest } from './types';

export async function sortImage(
  sourceHandle: FileSystemDirectoryHandle,
  destHandle: FileSystemDirectoryHandle,
  filename: string,
  formData: SortFormData,
  options?: {
    manifestId?: string;
    sourceHash?: string;
    patient?: {
      firstName: string;
      lastName: string;
      dob?: string;
      surgeon?: string;
    };
  },
): Promise<SortResult> {
  const { segments, filename: destFilename } = buildDestinationPath(formData);

  // Read source file
  const sourceFileHandle = await sourceHandle.getFileHandle(filename);
  const sourceFile = await sourceFileHandle.getFile();
  const buffer = await sourceFile.arrayBuffer();

  // Hash source
  let sourceHash: string;
  if (options?.sourceHash) {
    sourceHash = options.sourceHash;
  } else if (options?.manifestId) {
    const manifest = await getManifest(options.manifestId);
    const manifestImage = manifest?.images.find(img => img.filename === filename);
    sourceHash = manifestImage?.sourceHash ?? await hashArrayBuffer(buffer);
  } else {
    sourceHash = await hashArrayBuffer(buffer);
  }

  // Create nested destination directories
  let currentDir = destHandle;
  for (const segment of segments) {
    currentDir = await currentDir.getDirectoryHandle(segment, { create: true });
  }

  // Check for conflict
  try {
    await currentDir.getFileHandle(destFilename);
    throw new Error('Destination file already exists');
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      // Good — file doesn't exist
    } else {
      throw err;
    }
  }

  // Write file
  const destFileHandle = await currentDir.getFileHandle(destFilename, { create: true });
  const writable = await destFileHandle.createWritable();
  await writable.write(buffer);
  await writable.close();

  // Save patient record if provided
  if (options?.patient?.firstName && options?.patient?.lastName) {
    const existing = await findPatientByCase(formData.caseNumber);
    if (!existing) {
      await savePatient({
        case_number: formData.caseNumber,
        first_name: options.patient.firstName,
        last_name: options.patient.lastName,
        dob: options.patient.dob || '',
        surgery_date: formData.surgeryDate,
        primary_procedure: formData.procedureType,
        surgeon: options.patient.surgeon || '',
      }, destHandle);
    }
  }

  // Update manifest if provided
  if (options?.manifestId) {
    await updateImageStatus(options.manifestId, formData.originalFilename, {
      status: 'sorted',
      destinationSegments: segments,
      destinationFilename: destFilename,
      destinationHash: sourceHash,
      patientRecordSaved: !!(options.patient?.firstName && options.patient?.lastName),
    });
  }

  return {
    hash: sourceHash,
    destPath: [...segments, destFilename],
  };
}

export async function batchCleanup(
  manifest: Manifest,
  sourceHandle: FileSystemDirectoryHandle,
  destHandle: FileSystemDirectoryHandle,
): Promise<CleanupResult> {
  let cleanedCount = 0;
  let failedCount = 0;
  const warnings: string[] = [];

  manifest.status = 'cleaning';
  await saveManifest(manifest);

  // Clean sorted images: verify dest exists, then delete source
  for (const image of manifest.images) {
    if (image.status !== 'sorted') continue;

    const destSegments = image.destinationSegments;
    const destFilename = image.destinationFilename;

    if (!destSegments || !destFilename) {
      image.status = 'clean_failed';
      image.sourceDeleted = false;
      failedCount++;
      warnings.push(`${image.filename}: missing destination path`);
      continue;
    }

    try {
      // Walk to destination directory
      let dir = destHandle;
      for (const seg of destSegments) {
        dir = await dir.getDirectoryHandle(seg);
      }

      // Verify dest file exists
      await dir.getFileHandle(destFilename);

      // Delete source
      await sourceHandle.removeEntry(image.filename);

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

  // Clean skipped images: just delete source
  for (const image of manifest.images) {
    if (image.status !== 'skipped') continue;

    try {
      await sourceHandle.removeEntry(image.filename);
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
  await saveManifest(manifest);

  return { cleanedCount, failedCount, warnings };
}
