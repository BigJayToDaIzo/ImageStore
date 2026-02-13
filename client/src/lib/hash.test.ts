import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { mkdir, rm, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

// Module under test — will be implemented after tests
import { hashFile, verifyFileCopy } from './hash';

const TEST_DIR = '/tmp/imagestore-test-hash';

describe('hash', () => {
  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clean test files between tests
    const files = ['source.jpg', 'dest.jpg', 'corrupt.jpg', 'empty.dat', 'large.bin'];
    for (const f of files) {
      await rm(join(TEST_DIR, f), { force: true });
    }
  });

  describe('hashFile', () => {
    it('should return a sha256 hex string for a file', async () => {
      const filePath = join(TEST_DIR, 'source.jpg');
      await writeFile(filePath, 'fake image content for hashing');

      const hash = await hashFile(filePath);

      expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA256 = 64 hex chars
    });

    it('should return identical hashes for identical content', async () => {
      const content = Buffer.from('identical content across two files');
      const file1 = join(TEST_DIR, 'source.jpg');
      const file2 = join(TEST_DIR, 'dest.jpg');
      await writeFile(file1, content);
      await writeFile(file2, content);

      const hash1 = await hashFile(file1);
      const hash2 = await hashFile(file2);

      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different content', async () => {
      const file1 = join(TEST_DIR, 'source.jpg');
      const file2 = join(TEST_DIR, 'dest.jpg');
      await writeFile(file1, 'content version A');
      await writeFile(file2, 'content version B');

      const hash1 = await hashFile(file1);
      const hash2 = await hashFile(file2);

      expect(hash1).not.toBe(hash2);
    });

    it('should hash empty files without error', async () => {
      const filePath = join(TEST_DIR, 'empty.dat');
      await writeFile(filePath, '');

      const hash = await hashFile(filePath);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should throw for non-existent file', async () => {
      await expect(hashFile(join(TEST_DIR, 'nonexistent.jpg')))
        .rejects.toThrow();
    });

    it('should handle binary content correctly', async () => {
      const filePath = join(TEST_DIR, 'large.bin');
      // Create a buffer with non-UTF8 bytes (simulates real image data)
      const binaryContent = Buffer.alloc(1024 * 100); // 100KB
      for (let i = 0; i < binaryContent.length; i++) {
        binaryContent[i] = i % 256;
      }
      await writeFile(filePath, binaryContent);

      const hash = await hashFile(filePath);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifyFileCopy', () => {
    it('should return true when source and destination match', async () => {
      const content = Buffer.from('matching image data');
      const source = join(TEST_DIR, 'source.jpg');
      const dest = join(TEST_DIR, 'dest.jpg');
      await writeFile(source, content);
      await copyFile(source, dest);

      const result = await verifyFileCopy(source, dest);

      expect(result.verified).toBe(true);
      expect(result.sourceHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.destHash).toBe(result.sourceHash);
    });

    it('should return false when files differ', async () => {
      const source = join(TEST_DIR, 'source.jpg');
      const dest = join(TEST_DIR, 'corrupt.jpg');
      await writeFile(source, 'original data');
      await writeFile(dest, 'corrupted data');

      const result = await verifyFileCopy(source, dest);

      expect(result.verified).toBe(false);
      expect(result.sourceHash).not.toBe(result.destHash);
    });

    it('should throw when destination does not exist', async () => {
      const source = join(TEST_DIR, 'source.jpg');
      await writeFile(source, 'some data');

      await expect(verifyFileCopy(source, join(TEST_DIR, 'nonexistent.jpg')))
        .rejects.toThrow();
    });

    it('should verify against a known source hash without re-reading source', async () => {
      const content = Buffer.from('pre-hashed image data');
      const source = join(TEST_DIR, 'source.jpg');
      const dest = join(TEST_DIR, 'dest.jpg');
      await writeFile(source, content);
      await writeFile(dest, content);

      const knownHash = await hashFile(source);
      // Delete source to prove it's not re-read
      await rm(source, { force: true });

      const result = await verifyFileCopy(knownHash, dest);

      expect(result.verified).toBe(true);
      expect(result.sourceHash).toBe(knownHash);
      expect(result.destHash).toBe(knownHash);
    });
  });
});
