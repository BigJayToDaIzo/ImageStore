import { readFile, writeFile, mkdir, readdir, rename, access, constants } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { hashFile } from './hash';
import { getDataDir } from './settings';

export type ImageStatus = 'pending' | 'sorting' | 'sorted' | 'skipped' | 'error' | 'cleaned' | 'clean_failed';
export type ManifestStatus = 'in_progress' | 'confirming' | 'cleaning' | 'completed' | 'abandoned';

export interface ManifestImage {
  filename: string;
  sourceHash: string;
  status: ImageStatus;
  destinationPath: string | null;
  destinationHash: string | null;
  patientRecordSaved: boolean;
  sourceDeleted: boolean;
  sortedAt: string | null;
  skipReason?: string;
}

export interface Manifest {
  id: string;
  sourcePath: string;
  createdAt: string;
  status: ManifestStatus;
  totalImages: number;
  images: ManifestImage[];
}

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tiff', '.tif', '.bmp',
]);

function isImageFile(filename: string): boolean {
  if (filename.startsWith('.')) return false;
  return IMAGE_EXTENSIONS.has(extname(filename).toLowerCase());
}

function generateId(sourcePath: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 15);
  const folderName = sourcePath.split('/').pop() || 'unknown';
  // Add ms for uniqueness in fast successive calls
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${timestamp}${ms}_${folderName}`;
}

function manifestFilename(id: string): string {
  return `${id}.json`;
}

/**
 * Get the directory where manifests are stored.
 */
export async function getManifestDir(): Promise<string> {
  const dataDir = process.env.IMAGESTORE_DATA || getDataDir();
  return join(dataDir, 'manifests');
}

/**
 * Save a manifest to disk using atomic write (temp + rename).
 */
export async function saveManifest(manifest: Manifest, manifestDir?: string): Promise<void> {
  const dir = manifestDir ?? await getManifestDir();
  await mkdir(dir, { recursive: true });

  const filePath = join(dir, manifestFilename(manifest.id));
  const tmpPath = filePath + '.tmp';
  const content = JSON.stringify(manifest, null, 2);

  await writeFile(tmpPath, content, 'utf-8');
  await rename(tmpPath, filePath);
}

/**
 * Scan a source folder, hash all images, and create a new manifest.
 */
export async function createManifest(sourcePath: string, manifestDir?: string): Promise<Manifest> {
  // Verify source folder exists
  await access(sourcePath, constants.R_OK);

  const entries = await readdir(sourcePath);
  const imageFiles = entries.filter(isImageFile).sort();

  if (imageFiles.length === 0) {
    throw new Error(`No image files found in ${sourcePath}`);
  }

  // Hash all images
  const images: ManifestImage[] = await Promise.all(
    imageFiles.map(async (filename): Promise<ManifestImage> => {
      const hash = await hashFile(join(sourcePath, filename));
      return {
        filename,
        sourceHash: hash,
        status: 'pending',
        destinationPath: null,
        destinationHash: null,
        patientRecordSaved: false,
        sourceDeleted: false,
        sortedAt: null,
      };
    })
  );

  const manifest: Manifest = {
    id: generateId(sourcePath),
    sourcePath,
    createdAt: new Date().toISOString(),
    status: 'in_progress',
    totalImages: images.length,
    images,
  };

  await saveManifest(manifest, manifestDir);
  return manifest;
}

/**
 * Load a manifest by ID. Returns null if not found.
 */
export async function loadManifest(id: string, manifestDir?: string): Promise<Manifest | null> {
  const dir = manifestDir ?? await getManifestDir();
  const filePath = join(dir, manifestFilename(id));

  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as Manifest;
  } catch {
    return null;
  }
}

/**
 * Check if all images are in a terminal state (sorted, skipped, error, cleaned, clean_failed).
 * Returns true if no images are pending or sorting.
 */
function allImagesProcessed(manifest: Manifest): boolean {
  return manifest.images.every(
    img => img.status !== 'pending' && img.status !== 'sorting'
  );
}

export interface ImageStatusUpdate {
  status: ImageStatus;
  destinationPath?: string | null;
  destinationHash?: string | null;
  patientRecordSaved?: boolean;
  sourceDeleted?: boolean;
  skipReason?: string;
}

/**
 * Update the status of a single image in the manifest.
 * Automatically transitions manifest status when all images are processed.
 * Persists changes to disk.
 */
export async function updateImageStatus(
  manifest: Manifest,
  filename: string,
  update: ImageStatusUpdate,
  manifestDir?: string,
): Promise<Manifest> {
  const imageIndex = manifest.images.findIndex(img => img.filename === filename);
  if (imageIndex === -1) {
    throw new Error(`Image "${filename}" not found in manifest ${manifest.id}`);
  }

  const image = manifest.images[imageIndex];

  // Apply updates
  image.status = update.status;
  if (update.destinationPath !== undefined) image.destinationPath = update.destinationPath ?? null;
  if (update.destinationHash !== undefined) image.destinationHash = update.destinationHash ?? null;
  if (update.patientRecordSaved !== undefined) image.patientRecordSaved = update.patientRecordSaved;
  if (update.sourceDeleted !== undefined) image.sourceDeleted = update.sourceDeleted;
  if (update.skipReason !== undefined) image.skipReason = update.skipReason;

  // Set sortedAt timestamp when marking as sorted
  if (update.status === 'sorted') {
    image.sortedAt = new Date().toISOString();
  }

  // Clear sort-specific fields when reverting to pending
  if (update.status === 'pending') {
    image.sortedAt = null;
    delete image.skipReason;
  }

  // Auto-transition manifest status
  if (allImagesProcessed(manifest) && manifest.status === 'in_progress') {
    manifest.status = 'confirming';
  } else if (!allImagesProcessed(manifest) && manifest.status === 'confirming') {
    manifest.status = 'in_progress';
  }

  await saveManifest(manifest, manifestDir);
  return manifest;
}

/**
 * Get the currently active manifest (in_progress or confirming).
 * Returns null if no active manifest.
 */
export async function getActiveManifest(manifestDir?: string): Promise<Manifest | null> {
  const dir = manifestDir ?? await getManifestDir();

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }

  const jsonFiles = entries.filter(f => f.endsWith('.json')).sort().reverse();

  for (const file of jsonFiles) {
    const content = await readFile(join(dir, file), 'utf-8');
    const manifest = JSON.parse(content) as Manifest;
    if (manifest.status === 'in_progress' || manifest.status === 'confirming') {
      return manifest;
    }
  }

  return null;
}

/**
 * Get all manifests that are incomplete (in_progress or confirming).
 */
export async function getPendingManifests(manifestDir?: string): Promise<Manifest[]> {
  const dir = manifestDir ?? await getManifestDir();

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const pending: Manifest[] = [];
  const jsonFiles = entries.filter(f => f.endsWith('.json'));

  for (const file of jsonFiles) {
    const content = await readFile(join(dir, file), 'utf-8');
    const manifest = JSON.parse(content) as Manifest;
    if (manifest.status === 'in_progress' || manifest.status === 'confirming') {
      pending.push(manifest);
    }
  }

  return pending;
}

/**
 * Mark a manifest as abandoned. Persists to disk.
 */
export async function abandonManifest(manifest: Manifest, manifestDir?: string): Promise<Manifest> {
  manifest.status = 'abandoned';
  await saveManifest(manifest, manifestDir);
  return manifest;
}
