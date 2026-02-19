import { idbGet, idbSet, idbGetAllKeys } from './idb';
import { hashFile } from './hash';
import { isImageFile } from '../util/image-utils';
import { allImagesProcessed } from '../util/manifest-utils';
import type { Manifest, ManifestImage, ImageStatus, ManifestStatus } from './types';

const CONCURRENCY_LIMIT = 4;

function generateId(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 15);
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${timestamp}${ms}`;
}

async function hashWithConcurrency(
  handles: FileSystemFileHandle[],
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  let index = 0;

  async function worker(): Promise<void> {
    while (index < handles.length) {
      const i = index++;
      const handle = handles[i];
      const hash = await hashFile(handle);
      results.set(handle.name, hash);
    }
  }

  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, handles.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return results;
}

export async function createManifest(
  sourceHandle: FileSystemDirectoryHandle,
): Promise<Manifest> {
  const fileHandles: FileSystemFileHandle[] = [];

  for await (const entry of sourceHandle.values()) {
    if (entry.kind === 'file' && isImageFile(entry.name)) {
      fileHandles.push(entry as FileSystemFileHandle);
    }
  }

  if (fileHandles.length === 0) {
    throw new Error('No image files found in source directory');
  }

  fileHandles.sort((a, b) => a.name.localeCompare(b.name));

  const hashes = await hashWithConcurrency(fileHandles);

  const images: ManifestImage[] = fileHandles.map(handle => ({
    filename: handle.name,
    sourceHash: hashes.get(handle.name)!,
    status: 'pending' as ImageStatus,
    destinationSegments: null,
    destinationFilename: null,
    destinationHash: null,
    patientRecordSaved: false,
    sourceDeleted: false,
    sortedAt: null,
  }));

  const manifest: Manifest = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    status: 'in_progress',
    totalImages: images.length,
    images,
  };

  await saveManifest(manifest);
  return manifest;
}

export async function saveManifest(manifest: Manifest): Promise<void> {
  await idbSet('manifests', manifest.id, manifest);
}

export async function getManifest(id: string): Promise<Manifest | null> {
  return (await idbGet<Manifest>('manifests', id)) ?? null;
}

export async function getCurrentManifest(): Promise<Manifest | null> {
  const keys = await idbGetAllKeys('manifests');
  // Check most recent first
  const sorted = keys.sort().reverse();

  for (const key of sorted) {
    const manifest = await idbGet<Manifest>('manifests', key);
    if (manifest && (manifest.status === 'in_progress' || manifest.status === 'confirming')) {
      return manifest;
    }
  }

  return null;
}

export interface ImageStatusUpdate {
  status: ImageStatus;
  destinationSegments?: string[] | null;
  destinationFilename?: string | null;
  destinationHash?: string | null;
  patientRecordSaved?: boolean;
  sourceDeleted?: boolean;
  skipReason?: string;
}

export async function updateImageStatus(
  manifestId: string,
  filename: string,
  update: ImageStatusUpdate,
): Promise<Manifest> {
  const manifest = await getManifest(manifestId);
  if (!manifest) throw new Error(`Manifest ${manifestId} not found`);

  const image = manifest.images.find(img => img.filename === filename);
  if (!image) throw new Error(`Image "${filename}" not found in manifest ${manifestId}`);

  image.status = update.status;
  if (update.destinationSegments !== undefined) image.destinationSegments = update.destinationSegments ?? null;
  if (update.destinationFilename !== undefined) image.destinationFilename = update.destinationFilename ?? null;
  if (update.destinationHash !== undefined) image.destinationHash = update.destinationHash ?? null;
  if (update.patientRecordSaved !== undefined) image.patientRecordSaved = update.patientRecordSaved;
  if (update.sourceDeleted !== undefined) image.sourceDeleted = update.sourceDeleted;
  if (update.skipReason !== undefined) image.skipReason = update.skipReason;

  if (update.status === 'sorted') {
    image.sortedAt = new Date().toISOString();
  }

  if (update.status === 'pending') {
    image.sortedAt = null;
    delete image.skipReason;
  }

  // Auto-transition manifest status
  if (allImagesProcessed(manifest.images) && manifest.status === 'in_progress') {
    manifest.status = 'confirming';
  } else if (!allImagesProcessed(manifest.images) && manifest.status === 'confirming') {
    manifest.status = 'in_progress';
  }

  await saveManifest(manifest);
  return manifest;
}

export async function abandonManifest(id: string): Promise<void> {
  const manifest = await getManifest(id);
  if (!manifest) throw new Error(`Manifest ${id} not found`);

  manifest.status = 'abandoned';
  await saveManifest(manifest);
}
