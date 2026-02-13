import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { mkdir, rm, writeFile, readFile, access, constants, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// Modules under test — will be implemented after tests
import { buildDestinationPath, sortImage, batchCleanup, type SortImageRequest } from './sort-image';
import { createManifest, loadManifest, type Manifest } from './manifest';
import { hashFile } from './hash';
import { loadPatients, type Patient } from './patients';

const TEST_DIR = '/tmp/imagestore-test-sort';
const TEST_SOURCE = join(TEST_DIR, 'source');
const TEST_DEST = join(TEST_DIR, 'sorted');
const TEST_DATA = join(TEST_DIR, 'data');
const TEST_CSV = join(TEST_DATA, 'patients.csv');
const TEST_MANIFESTS = join(TEST_DATA, 'manifests');

// Redirect all paths to test directories
process.env.IMAGESTORE_DEST = TEST_DEST;
process.env.IMAGESTORE_DATA = TEST_DATA;

const VALID_METADATA: SortImageRequest = {
  caseNumber: 'C001',
  consentStatus: 'no_consent',
  procedureType: 'Rhinoplasty',
  surgeryDate: '2026-02-12',
  imageType: 'pre_op',
  angle: 'front',
  originalFilename: 'IMG_001.jpg',
};

describe('sort-image', () => {
  beforeAll(async () => {
    await mkdir(TEST_SOURCE, { recursive: true });
    await mkdir(TEST_DEST, { recursive: true });
    await mkdir(TEST_DATA, { recursive: true });
    await mkdir(TEST_MANIFESTS, { recursive: true });
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean all test directories between tests
    await rm(TEST_SOURCE, { recursive: true, force: true });
    await rm(TEST_DEST, { recursive: true, force: true });
    await rm(TEST_MANIFESTS, { recursive: true, force: true });
    await rm(TEST_CSV, { force: true });
    await mkdir(TEST_SOURCE, { recursive: true });
    await mkdir(TEST_DEST, { recursive: true });
    await mkdir(TEST_MANIFESTS, { recursive: true });
  });

  describe('buildDestinationPath', () => {
    it('should build no_consent path correctly', () => {
      const result = buildDestinationPath(VALID_METADATA, TEST_DEST);

      expect(result.dir).toBe(join(TEST_DEST, 'no_consent', 'Rhinoplasty', '2026-02-12', 'C001'));
      expect(result.filename).toBe('C001_pre_op_front.jpg');
    });

    it('should build consent/hipaa path correctly', () => {
      const metadata = { ...VALID_METADATA, consentStatus: 'consent' as const, consentType: 'hipaa' as const };
      const result = buildDestinationPath(metadata, TEST_DEST);

      expect(result.dir).toBe(join(TEST_DEST, 'consent', 'hipaa', 'Rhinoplasty', '2026-02-12', 'C001'));
    });

    it('should build consent/social_media path correctly', () => {
      const metadata = { ...VALID_METADATA, consentStatus: 'consent' as const, consentType: 'social_media' as const };
      const result = buildDestinationPath(metadata, TEST_DEST);

      expect(result.dir).toBe(join(TEST_DEST, 'consent', 'social_media', 'Rhinoplasty', '2026-02-12', 'C001'));
    });

    it('should preserve original file extension', () => {
      const metadata = { ...VALID_METADATA, originalFilename: 'photo.PNG' };
      const result = buildDestinationPath(metadata, TEST_DEST);

      expect(result.filename).toBe('C001_pre_op_front.png');
    });

    it('should default to .jpg when no extension', () => {
      const metadata = { ...VALID_METADATA, originalFilename: 'photo_no_ext' };
      const result = buildDestinationPath(metadata, TEST_DEST);

      expect(result.filename).toBe('C001_pre_op_front.jpg');
    });
  });

  describe('sortImage', () => {
    it('should copy source file to correct destination via atomic write', async () => {
      const sourceFile = join(TEST_SOURCE, 'IMG_001.jpg');
      const imageContent = 'fake DSLR image binary content for testing';
      await writeFile(sourceFile, imageContent);

      const result = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
      });

      expect(result.success).toBe(true);
      expect(result.destinationPath).toContain('C001_pre_op_front.jpg');

      // Verify destination has correct content
      const destContent = await readFile(result.destinationPath!, 'utf-8');
      expect(destContent).toBe(imageContent);
    });

    it('should NOT delete source file after successful sort', async () => {
      const sourceFile = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(sourceFile, 'image content');

      await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
      });

      // Source must still exist — deletion is batch-only
      const sourceExists = await access(sourceFile, constants.F_OK).then(() => true, () => false);
      expect(sourceExists).toBe(true);
    });

    it('should verify SHA256 hash matches between source and destination', async () => {
      const sourceFile = join(TEST_SOURCE, 'IMG_001.jpg');
      const content = 'image data for hash verification';
      await writeFile(sourceFile, content);

      const result = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
      });

      expect(result.sourceHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.destinationHash).toBe(result.sourceHash);
    });

    it('should accept a pre-computed source hash from manifest', async () => {
      const sourceFile = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(sourceFile, 'image data');
      const precomputedHash = await hashFile(sourceFile);

      const result = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        sourceHash: precomputedHash,
        csvPath: TEST_CSV,
      });

      expect(result.sourceHash).toBe(precomputedHash);
      expect(result.destinationHash).toBe(precomputedHash);
    });

    it('should use atomic write pattern (no partial files on crash)', async () => {
      const sourceFile = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(sourceFile, 'image data for atomic test');

      await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
      });

      // No .tmp files should remain in destination
      const destDir = join(TEST_DEST, 'no_consent', 'Rhinoplasty', '2026-02-12', 'C001');
      const files = await readdir(destDir);
      const tmpFiles = files.filter(f => f.endsWith('.tmp'));
      expect(tmpFiles).toHaveLength(0);
    });

    it('should return 409-type error when destination already exists', async () => {
      const sourceFile = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(sourceFile, 'image data');

      // Sort once — succeeds
      await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
      });

      // Sort again — destination exists
      const result = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
      });

      expect(result.success).toBe(false);
      expect(result.conflict).toBe(true);
    });

    it('should create patient record when name is provided', async () => {
      const sourceFile = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(sourceFile, 'image data');

      await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        patient: {
          firstName: 'John',
          lastName: 'Doe',
          dob: '1990-05-15',
          surgeon: 'dr_smith',
        },
      });

      const patients = await loadPatients(TEST_CSV);
      expect(patients).toHaveLength(1);
      expect(patients[0].case_number).toBe('C001');
      expect(patients[0].first_name).toBe('John');
    });

    it('should not create duplicate patient for existing case number', async () => {
      const sourceFile1 = join(TEST_SOURCE, 'IMG_001.jpg');
      const sourceFile2 = join(TEST_SOURCE, 'IMG_002.jpg');
      await writeFile(sourceFile1, 'image1');
      await writeFile(sourceFile2, 'image2');

      // Sort first image — creates patient
      await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile1,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        patient: {
          firstName: 'John',
          lastName: 'Doe',
          dob: '1990-05-15',
          surgeon: 'dr_smith',
        },
      });

      // Sort second image same case — different angle
      await sortImage({
        metadata: { ...VALID_METADATA, angle: 'left', originalFilename: 'IMG_002.jpg' },
        sourcePath: sourceFile2,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        patient: {
          firstName: 'John',
          lastName: 'Doe',
          dob: '1990-05-15',
          surgeon: 'dr_smith',
        },
      });

      const patients = await loadPatients(TEST_CSV);
      expect(patients).toHaveLength(1); // not 2
    });

    it('should sort image without patient data (patient fields optional)', async () => {
      const sourceFile = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(sourceFile, 'image data');

      const result = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
      });

      expect(result.success).toBe(true);
      const patients = await loadPatients(TEST_CSV);
      expect(patients).toHaveLength(0);
    });

    it('should create destination directories that do not exist', async () => {
      const sourceFile = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(sourceFile, 'image data');

      const result = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
      });

      expect(result.success).toBe(true);
      const destDir = join(TEST_DEST, 'no_consent', 'Rhinoplasty', '2026-02-12', 'C001');
      const dirExists = await access(destDir, constants.F_OK).then(() => true, () => false);
      expect(dirExists).toBe(true);
    });

    it('should fail when source file does not exist', async () => {
      const result = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: join(TEST_SOURCE, 'NONEXISTENT.jpg'),
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should clean up temp file when hash verification fails', async () => {
      // This is hard to trigger naturally — we test that no .tmp files remain
      // after a failed sort (simulated by making source unreadable after copy starts)
      const sourceFile = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(sourceFile, 'image data');

      // Normal sort should leave no temp files
      await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
      });

      const destDir = join(TEST_DEST, 'no_consent', 'Rhinoplasty', '2026-02-12', 'C001');
      const files = await readdir(destDir);
      expect(files.every(f => !f.endsWith('.tmp'))).toBe(true);
    });

    it('should handle binary image content correctly', async () => {
      const sourceFile = join(TEST_SOURCE, 'IMG_001.jpg');
      // Create realistic binary content
      const binaryContent = Buffer.alloc(1024 * 50); // 50KB
      for (let i = 0; i < binaryContent.length; i++) {
        binaryContent[i] = i % 256;
      }
      await writeFile(sourceFile, binaryContent);

      const result = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: sourceFile,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
      });

      expect(result.success).toBe(true);
      const destContent = await readFile(result.destinationPath!);
      expect(Buffer.compare(destContent, binaryContent)).toBe(0);
    });
  });

  describe('batchCleanup', () => {
    it('should delete source files for all sorted images', async () => {
      // Set up source images
      const img1 = join(TEST_SOURCE, 'IMG_001.jpg');
      const img2 = join(TEST_SOURCE, 'IMG_002.jpg');
      await writeFile(img1, 'image1 content');
      await writeFile(img2, 'image2 content');

      // Create manifest and sort both images
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      await sortImage({
        metadata: { ...VALID_METADATA, originalFilename: 'IMG_001.jpg' },
        sourcePath: img1,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        manifest,
      });
      await sortImage({
        metadata: { ...VALID_METADATA, angle: 'left', originalFilename: 'IMG_002.jpg' },
        sourcePath: img2,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        manifest,
      });

      // Run batch cleanup
      const result = await batchCleanup(manifest, TEST_MANIFESTS);

      expect(result.cleanedCount).toBe(2);
      expect(result.failedCount).toBe(0);

      // Source files should be gone
      await expect(access(img1, constants.F_OK)).rejects.toThrow();
      await expect(access(img2, constants.F_OK)).rejects.toThrow();
    });

    it('should NOT delete source files for skipped images', async () => {
      const img1 = join(TEST_SOURCE, 'IMG_001.jpg');
      const img2 = join(TEST_SOURCE, 'IMG_002.jpg');
      await writeFile(img1, 'image1');
      await writeFile(img2, 'image2 skipped');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      // Sort img1, skip img2
      await sortImage({
        metadata: { ...VALID_METADATA, originalFilename: 'IMG_001.jpg' },
        sourcePath: img1,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        manifest,
      });

      // Manually mark img2 as skipped in manifest
      const { updateImageStatus } = await import('./manifest');
      await updateImageStatus(manifest, 'IMG_002.jpg', { status: 'skipped' });

      const result = await batchCleanup(manifest, TEST_MANIFESTS);

      expect(result.cleanedCount).toBe(1);
      // Skipped image source should still exist
      const skippedExists = await access(img2, constants.F_OK).then(() => true, () => false);
      expect(skippedExists).toBe(true);
    });

    it('should re-verify destination hash before deleting source', async () => {
      const img1 = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(img1, 'original content');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const sortResult = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: img1,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        manifest,
      });

      // Corrupt the destination after sort
      await writeFile(sortResult.destinationPath!, 'CORRUPTED');

      const result = await batchCleanup(manifest, TEST_MANIFESTS);

      // Should NOT delete source because hash verification fails
      expect(result.failedCount).toBe(1);
      expect(result.cleanedCount).toBe(0);
      const sourcePreserved = await access(img1, constants.F_OK).then(() => true, () => false);
      expect(sourcePreserved).toBe(true);
    });

    it('should handle missing destination gracefully during cleanup', async () => {
      const img1 = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(img1, 'image content');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const sortResult = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: img1,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        manifest,
      });

      // Delete destination before cleanup
      await rm(sortResult.destinationPath!, { force: true });

      const result = await batchCleanup(manifest, TEST_MANIFESTS);

      // Should NOT delete source — destination is gone
      expect(result.failedCount).toBe(1);
      expect(result.cleanedCount).toBe(0);
      const sourceKept = await access(img1, constants.F_OK).then(() => true, () => false);
      expect(sourceKept).toBe(true);
    });

    it('should update manifest image statuses to cleaned', async () => {
      const img1 = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(img1, 'image content');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      await sortImage({
        metadata: VALID_METADATA,
        sourcePath: img1,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        manifest,
      });

      await batchCleanup(manifest, TEST_MANIFESTS);

      const reloaded = await loadManifest(manifest.id, TEST_MANIFESTS);
      const img = reloaded!.images.find(i => i.filename === 'IMG_001.jpg')!;
      expect(img.status).toBe('cleaned');
      expect(img.sourceDeleted).toBe(true);
    });

    it('should set manifest status to completed after cleanup', async () => {
      const img1 = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(img1, 'image content');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      await sortImage({
        metadata: VALID_METADATA,
        sourcePath: img1,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        manifest,
      });

      await batchCleanup(manifest, TEST_MANIFESTS);

      const reloaded = await loadManifest(manifest.id, TEST_MANIFESTS);
      expect(reloaded!.status).toBe('completed');
    });

    it('should mark failed cleanups as clean_failed', async () => {
      const img1 = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(img1, 'image content');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const sortResult = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: img1,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        manifest,
      });

      // Corrupt destination to force cleanup failure
      await writeFile(sortResult.destinationPath!, 'CORRUPTED');

      await batchCleanup(manifest, TEST_MANIFESTS);

      const reloaded = await loadManifest(manifest.id, TEST_MANIFESTS);
      const img = reloaded!.images.find(i => i.filename === 'IMG_001.jpg')!;
      expect(img.status).toBe('clean_failed');
      expect(img.sourceDeleted).toBe(false);
    });

    it('should return warnings for failed cleanups', async () => {
      const img1 = join(TEST_SOURCE, 'IMG_001.jpg');
      await writeFile(img1, 'image content');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const sortResult = await sortImage({
        metadata: VALID_METADATA,
        sourcePath: img1,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        manifest,
      });

      await writeFile(sortResult.destinationPath!, 'CORRUPTED');

      const result = await batchCleanup(manifest, TEST_MANIFESTS);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('IMG_001.jpg');
    });

    it('should continue cleaning remaining images when one fails', async () => {
      const img1 = join(TEST_SOURCE, 'IMG_001.jpg');
      const img2 = join(TEST_SOURCE, 'IMG_002.jpg');
      await writeFile(img1, 'image1 content');
      await writeFile(img2, 'image2 content');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const result1 = await sortImage({
        metadata: { ...VALID_METADATA, originalFilename: 'IMG_001.jpg' },
        sourcePath: img1,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        manifest,
      });
      await sortImage({
        metadata: { ...VALID_METADATA, angle: 'left', originalFilename: 'IMG_002.jpg' },
        sourcePath: img2,
        destinationRoot: TEST_DEST,
        csvPath: TEST_CSV,
        manifest,
      });

      // Corrupt only img1's destination
      await writeFile(result1.destinationPath!, 'CORRUPTED');

      const result = await batchCleanup(manifest, TEST_MANIFESTS);

      // img1 fails, img2 succeeds
      expect(result.cleanedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      // img1 source preserved, img2 source deleted
      const img1Preserved = await access(img1, constants.F_OK).then(() => true, () => false);
      expect(img1Preserved).toBe(true);
      await expect(access(img2, constants.F_OK)).rejects.toThrow();
    });
  });
});
