import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { mkdir, rm, writeFile, readFile, access, constants } from 'node:fs/promises';
import { join } from 'node:path';

// Module under test — will be implemented after tests
import {
  createManifest,
  loadManifest,
  saveManifest,
  updateImageStatus,
  getActiveManifest,
  getPendingManifests,
  abandonManifest,
  getManifestDir,
  type Manifest,
  type ManifestImage,
  type ImageStatus,
  type ManifestStatus
} from './manifest';

const TEST_DIR = '/tmp/imagestore-test-manifest';
const TEST_SOURCE = join(TEST_DIR, 'source');
const TEST_MANIFESTS = join(TEST_DIR, 'manifests');

// Redirect manifest storage to test directory
process.env.IMAGESTORE_DATA = TEST_DIR;

describe('manifest', () => {
  beforeAll(async () => {
    await mkdir(TEST_SOURCE, { recursive: true });
    await mkdir(TEST_MANIFESTS, { recursive: true });
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean manifests between tests
    await rm(TEST_MANIFESTS, { recursive: true, force: true });
    await mkdir(TEST_MANIFESTS, { recursive: true });
    // Clean and recreate source folder with test images
    await rm(TEST_SOURCE, { recursive: true, force: true });
    await mkdir(TEST_SOURCE, { recursive: true });
  });

  describe('getManifestDir', () => {
    it('should return path under data directory', async () => {
      const dir = await getManifestDir();
      expect(dir).toContain('manifests');
    });
  });

  describe('createManifest', () => {
    it('should scan source folder and create manifest with all images', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image1');
      await writeFile(join(TEST_SOURCE, 'IMG_002.jpg'), 'image2');
      await writeFile(join(TEST_SOURCE, 'IMG_003.png'), 'image3');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      expect(manifest.sourcePath).toBe(TEST_SOURCE);
      expect(manifest.status).toBe('in_progress');
      expect(manifest.totalImages).toBe(3);
      expect(manifest.images).toHaveLength(3);
    });

    it('should set all images to pending status', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image1');
      await writeFile(join(TEST_SOURCE, 'IMG_002.jpg'), 'image2');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      for (const image of manifest.images) {
        expect(image.status).toBe('pending');
        expect(image.destinationPath).toBeNull();
        expect(image.destinationHash).toBeNull();
        expect(image.patientRecordSaved).toBe(false);
        expect(image.sourceDeleted).toBe(false);
        expect(image.sortedAt).toBeNull();
      }
    });

    it('should compute SHA256 hashes for all images', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image content 1');
      await writeFile(join(TEST_SOURCE, 'IMG_002.jpg'), 'image content 2');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      for (const image of manifest.images) {
        expect(image.sourceHash).toMatch(/^[a-f0-9]{64}$/);
      }
      // Different content = different hashes
      expect(manifest.images[0].sourceHash).not.toBe(manifest.images[1].sourceHash);
    });

    it('should only include image files (jpg, jpeg, png, heic, heif, webp, tiff, bmp)', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      await writeFile(join(TEST_SOURCE, 'IMG_002.JPEG'), 'image');
      await writeFile(join(TEST_SOURCE, 'photo.png'), 'image');
      await writeFile(join(TEST_SOURCE, 'photo.heic'), 'image');
      await writeFile(join(TEST_SOURCE, 'notes.txt'), 'not an image');
      await writeFile(join(TEST_SOURCE, '.DS_Store'), 'system file');
      await writeFile(join(TEST_SOURCE, 'thumbs.db'), 'system file');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      expect(manifest.totalImages).toBe(4);
      const filenames = manifest.images.map(i => i.filename);
      expect(filenames).toContain('IMG_001.jpg');
      expect(filenames).toContain('IMG_002.JPEG');
      expect(filenames).toContain('photo.png');
      expect(filenames).toContain('photo.heic');
      expect(filenames).not.toContain('notes.txt');
      expect(filenames).not.toContain('.DS_Store');
    });

    it('should generate a unique manifest ID', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');

      const m1 = await createManifest(TEST_SOURCE, TEST_MANIFESTS);
      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 10));
      const m2 = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      expect(m1.id).not.toBe(m2.id);
    });

    it('should persist manifest to disk as JSON', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      // Verify file exists on disk
      const files = await import('node:fs/promises').then(fs => fs.readdir(TEST_MANIFESTS));
      expect(files.length).toBeGreaterThanOrEqual(1);

      const content = await readFile(join(TEST_MANIFESTS, files[0]), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.id).toBe(manifest.id);
    });

    it('should throw for empty source folder', async () => {
      await expect(createManifest(TEST_SOURCE, TEST_MANIFESTS))
        .rejects.toThrow();
    });

    it('should throw for non-existent source folder', async () => {
      await expect(createManifest('/tmp/nonexistent-folder-xyz', TEST_MANIFESTS))
        .rejects.toThrow();
    });

    it('should record createdAt timestamp', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const before = new Date().toISOString();

      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const after = new Date().toISOString();
      expect(manifest.createdAt >= before).toBe(true);
      expect(manifest.createdAt <= after).toBe(true);
    });
  });

  describe('loadManifest', () => {
    it('should load a previously saved manifest by ID', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const original = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const loaded = await loadManifest(original.id, TEST_MANIFESTS);

      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(original.id);
      expect(loaded!.sourcePath).toBe(original.sourcePath);
      expect(loaded!.images).toHaveLength(original.images.length);
    });

    it('should return null for non-existent manifest ID', async () => {
      const loaded = await loadManifest('nonexistent_id', TEST_MANIFESTS);
      expect(loaded).toBeNull();
    });
  });

  describe('saveManifest', () => {
    it('should persist manifest changes to disk', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      manifest.status = 'completed';
      await saveManifest(manifest, TEST_MANIFESTS);

      const reloaded = await loadManifest(manifest.id, TEST_MANIFESTS);
      expect(reloaded!.status).toBe('completed');
    });

    it('should use atomic write (temp + rename)', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      manifest.status = 'completed';
      await saveManifest(manifest, TEST_MANIFESTS);

      // Verify no .tmp files left behind
      const files = await import('node:fs/promises').then(fs => fs.readdir(TEST_MANIFESTS));
      const tmpFiles = files.filter(f => f.endsWith('.tmp'));
      expect(tmpFiles).toHaveLength(0);
    });
  });

  describe('updateImageStatus', () => {
    it('should update a single image to sorted status', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image1');
      await writeFile(join(TEST_SOURCE, 'IMG_002.jpg'), 'image2');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const updated = await updateImageStatus(manifest, 'IMG_001.jpg', {
        status: 'sorted',
        destinationPath: '/sorted/case123/pre_op_front.jpg',
        destinationHash: 'abc123def456',
        patientRecordSaved: true,
      });

      const img = updated.images.find(i => i.filename === 'IMG_001.jpg')!;
      expect(img.status).toBe('sorted');
      expect(img.destinationPath).toBe('/sorted/case123/pre_op_front.jpg');
      expect(img.destinationHash).toBe('abc123def456');
      expect(img.patientRecordSaved).toBe(true);
      expect(img.sortedAt).not.toBeNull();
    });

    it('should update a single image to skipped status', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const updated = await updateImageStatus(manifest, 'IMG_001.jpg', {
        status: 'skipped',
      });

      const img = updated.images.find(i => i.filename === 'IMG_001.jpg')!;
      expect(img.status).toBe('skipped');
      expect(img.destinationPath).toBeNull();
    });

    it('should update a single image to error status', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const updated = await updateImageStatus(manifest, 'IMG_001.jpg', {
        status: 'error',
      });

      const img = updated.images.find(i => i.filename === 'IMG_001.jpg')!;
      expect(img.status).toBe('error');
    });

    it('should not modify other images in the manifest', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image1');
      await writeFile(join(TEST_SOURCE, 'IMG_002.jpg'), 'image2');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const updated = await updateImageStatus(manifest, 'IMG_001.jpg', {
        status: 'sorted',
        destinationPath: '/sorted/somewhere.jpg',
        destinationHash: 'hash123',
        patientRecordSaved: true,
      });

      const img2 = updated.images.find(i => i.filename === 'IMG_002.jpg')!;
      expect(img2.status).toBe('pending');
    });

    it('should throw for image not in manifest', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      await expect(updateImageStatus(manifest, 'NONEXISTENT.jpg', {
        status: 'sorted',
        destinationPath: '/sorted/somewhere.jpg',
        destinationHash: 'hash',
        patientRecordSaved: true,
      })).rejects.toThrow();
    });

    it('should persist updated manifest to disk', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      await updateImageStatus(manifest, 'IMG_001.jpg', {
        status: 'skipped',
      });

      const reloaded = await loadManifest(manifest.id, TEST_MANIFESTS);
      const img = reloaded!.images.find(i => i.filename === 'IMG_001.jpg')!;
      expect(img.status).toBe('skipped');
    });

    it('should allow reverting skipped back to pending (undo skip)', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const skipped = await updateImageStatus(manifest, 'IMG_001.jpg', {
        status: 'skipped',
      });
      const reverted = await updateImageStatus(skipped, 'IMG_001.jpg', {
        status: 'pending',
      });

      const img = reverted.images.find(i => i.filename === 'IMG_001.jpg')!;
      expect(img.status).toBe('pending');
    });

    it('should set manifest to confirming when all images are sorted or skipped', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image1');
      await writeFile(join(TEST_SOURCE, 'IMG_002.jpg'), 'image2');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const after1 = await updateImageStatus(manifest, 'IMG_001.jpg', {
        status: 'sorted',
        destinationPath: '/sorted/a.jpg',
        destinationHash: 'hash1',
        patientRecordSaved: true,
      });
      expect(after1.status).toBe('in_progress'); // still one pending

      const after2 = await updateImageStatus(after1, 'IMG_002.jpg', {
        status: 'skipped',
      });
      expect(after2.status).toBe('confirming'); // all done
    });

    it('should revert manifest from confirming to in_progress on undo skip', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image1');
      await writeFile(join(TEST_SOURCE, 'IMG_002.jpg'), 'image2');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const after1 = await updateImageStatus(manifest, 'IMG_001.jpg', {
        status: 'sorted',
        destinationPath: '/sorted/a.jpg',
        destinationHash: 'hash1',
        patientRecordSaved: true,
      });
      const after2 = await updateImageStatus(after1, 'IMG_002.jpg', {
        status: 'skipped',
      });
      expect(after2.status).toBe('confirming');

      const after3 = await updateImageStatus(after2, 'IMG_002.jpg', {
        status: 'pending',
      });
      expect(after3.status).toBe('in_progress'); // back to in_progress
    });
  });

  describe('getActiveManifest', () => {
    it('should return the in_progress manifest', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const created = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const active = await getActiveManifest(TEST_MANIFESTS);

      expect(active).not.toBeNull();
      expect(active!.id).toBe(created.id);
    });

    it('should return null when no active manifest exists', async () => {
      const active = await getActiveManifest(TEST_MANIFESTS);
      expect(active).toBeNull();
    });

    it('should not return completed manifests', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);
      manifest.status = 'completed';
      await saveManifest(manifest, TEST_MANIFESTS);

      const active = await getActiveManifest(TEST_MANIFESTS);
      expect(active).toBeNull();
    });

    it('should return confirming manifests as active', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);
      manifest.status = 'confirming';
      await saveManifest(manifest, TEST_MANIFESTS);

      const active = await getActiveManifest(TEST_MANIFESTS);
      expect(active).not.toBeNull();
      expect(active!.status).toBe('confirming');
    });
  });

  describe('getPendingManifests', () => {
    it('should return manifests with in_progress or confirming status', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');

      const m1 = await createManifest(TEST_SOURCE, TEST_MANIFESTS);
      // Create second manifest — need unique source
      const source2 = join(TEST_DIR, 'source2');
      await mkdir(source2, { recursive: true });
      await writeFile(join(source2, 'IMG_A.jpg'), 'imageA');
      const m2 = await createManifest(source2, TEST_MANIFESTS);
      m2.status = 'confirming';
      await saveManifest(m2, TEST_MANIFESTS);

      // Mark m1 as completed
      m1.status = 'completed';
      await saveManifest(m1, TEST_MANIFESTS);

      const pending = await getPendingManifests(TEST_MANIFESTS);
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(m2.id);
    });

    it('should return empty array when no pending manifests exist', async () => {
      const pending = await getPendingManifests(TEST_MANIFESTS);
      expect(pending).toEqual([]);
    });
  });

  describe('abandonManifest', () => {
    it('should set manifest status to abandoned', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      const abandoned = await abandonManifest(manifest, TEST_MANIFESTS);

      expect(abandoned.status).toBe('abandoned');
    });

    it('should persist abandoned status to disk', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      await abandonManifest(manifest, TEST_MANIFESTS);

      const reloaded = await loadManifest(manifest.id, TEST_MANIFESTS);
      expect(reloaded!.status).toBe('abandoned');
    });

    it('should not appear in pending manifests after abandoning', async () => {
      await writeFile(join(TEST_SOURCE, 'IMG_001.jpg'), 'image');
      const manifest = await createManifest(TEST_SOURCE, TEST_MANIFESTS);

      await abandonManifest(manifest, TEST_MANIFESTS);

      const pending = await getPendingManifests(TEST_MANIFESTS);
      expect(pending).toHaveLength(0);
    });
  });
});
