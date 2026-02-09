import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  getSurgeonsPath,
  loadSurgeons,
  saveSurgeons,
  createSurgeon,
  updateSurgeon,
  deleteSurgeon,
  importSurgeons,
  type Surgeon
} from './surgeons';
import { saveSettings } from './settings';

const TEST_DIR = '/tmp/imagestore-test-surgeons';
const TEST_CONFIG_DIR = join(TEST_DIR, 'config');
const TEST_DATA_DIR = join(TEST_DIR, 'data');

process.env.XDG_CONFIG_HOME = TEST_CONFIG_DIR;
process.env.XDG_DATA_HOME = TEST_DATA_DIR;

// NOTE: Tests use unique IDs (dr_create_test, dr_update_test, etc.) to avoid race conditions.
// Bun runs tests in parallel within a file. Even with beforeEach clearing the CSV,
// parallel execution caused "already exists" errors when multiple tests used the same ID.
// beforeEach cleanup is correct - unique IDs are the fix for parallel test execution.

describe('surgeons', () => {
  beforeAll(async () => {
    await mkdir(join(TEST_CONFIG_DIR, 'imagestore'), { recursive: true });
    await mkdir(join(TEST_DATA_DIR, 'imagestore'), { recursive: true });
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await rm(join(TEST_DATA_DIR, 'imagestore', 'surgeons.csv'), { force: true });
    await rm(join(TEST_CONFIG_DIR, 'imagestore', 'settings.json'), { force: true });
  });

  describe('getSurgeonsPath', () => {
    it('should use custom dataPath directory when set in settings', async () => {
      await saveSettings({ dataPath: '/custom/data/patients.csv' });

      const path = await getSurgeonsPath();

      expect(path).toBe('/custom/data/surgeons.csv');
    });

    it('should use XDG data dir when dataPath not set', async () => {
      const path = await getSurgeonsPath();

      expect(path).toBe(join(TEST_DATA_DIR, 'imagestore', 'surgeons.csv'));
    });
  });

  describe('loadSurgeons', () => {
    it('should return empty array when no file exists', async () => {
      const surgeons = await loadSurgeons();
      expect(surgeons).toEqual([]);
    });

    it('should load surgeons from CSV', async () => {
      const csv = `id,name
dr_smith,Dr. Smith
dr_jones,Dr. Jones`;
      await writeFile(join(TEST_DATA_DIR, 'imagestore', 'surgeons.csv'), csv);

      const surgeons = await loadSurgeons();

      expect(surgeons.length).toBe(2);
      expect(surgeons[0].id).toBe('dr_smith');
      expect(surgeons[0].name).toBe('Dr. Smith');
    });

    it('should handle escaped quotes in values', async () => {
      const csv = `id,name
dr_test,"Dr. ""The Best"" Smith"`;
      await writeFile(join(TEST_DATA_DIR, 'imagestore', 'surgeons.csv'), csv);

      const surgeons = await loadSurgeons();
      expect(surgeons[0].name).toBe('Dr. "The Best" Smith');
    });
  });

  describe('saveSurgeons', () => {
    it('should write surgeons to CSV', async () => {
      const surgeons: Surgeon[] = [
        { id: 'dr_test', name: 'Dr. Test' }
      ];

      await saveSurgeons(surgeons);

      const content = await readFile(join(TEST_DATA_DIR, 'imagestore', 'surgeons.csv'), 'utf-8');
      expect(content).toContain('id,name');
      expect(content).toContain('dr_test,Dr. Test');
    });

    it('should escape values with commas', async () => {
      const surgeons: Surgeon[] = [
        { id: 'dr_test', name: 'Smith, John MD' }
      ];

      await saveSurgeons(surgeons);

      const content = await readFile(join(TEST_DATA_DIR, 'imagestore', 'surgeons.csv'), 'utf-8');
      expect(content).toContain('"Smith, John MD"');
    });

    it('should escape values with quotes', async () => {
      const surgeons: Surgeon[] = [
        { id: 'dr_test', name: 'Dr. "Johnny" Smith' }
      ];

      await saveSurgeons(surgeons);

      const content = await readFile(join(TEST_DATA_DIR, 'imagestore', 'surgeons.csv'), 'utf-8');
      expect(content).toContain('"Dr. ""Johnny"" Smith"');
    });
  });

  describe('createSurgeon', () => {
    it('should add new surgeon', async () => {
      const created = await createSurgeon('dr_create_test', 'Dr. Create');

      expect(created.id).toBe('dr_create_test');
      expect(created.name).toBe('Dr. Create');

      const all = await loadSurgeons();
      expect(all.find(s => s.id === 'dr_create_test')).toBeDefined();
    });

    it('should throw for duplicate id', async () => {
      await createSurgeon('dr_dupe_test', 'Dr. Dupe');

      await expect(createSurgeon('dr_dupe_test', 'Another'))
        .rejects.toThrow('already exists');
    });
  });

  describe('updateSurgeon', () => {
    it('should update surgeon name', async () => {
      await createSurgeon('dr_update_test', 'Dr. Update');

      const updated = await updateSurgeon('dr_update_test', { name: 'Dr. Updated Name' });

      expect(updated.name).toBe('Dr. Updated Name');
      expect(updated.id).toBe('dr_update_test');
    });

    it('should throw for non-existent id', async () => {
      await expect(updateSurgeon('fake_id', { name: 'Whatever' }))
        .rejects.toThrow('not found');
    });
  });

  describe('deleteSurgeon', () => {
    it('should remove surgeon', async () => {
      await createSurgeon('dr_delete_test', 'Dr. Delete');

      await deleteSurgeon('dr_delete_test');

      const all = await loadSurgeons();
      expect(all.find(s => s.id === 'dr_delete_test')).toBeUndefined();
    });

    it('should throw for non-existent id', async () => {
      await expect(deleteSurgeon('nonexistent_id'))
        .rejects.toThrow('not found');
    });
  });

  describe('importSurgeons', () => {
    it('should import new surgeons and skip duplicates', async () => {
      await createSurgeon('dr_import_existing', 'Dr. Existing');

      const result = await importSurgeons([
        { id: 'dr_import_existing', name: 'Dupe' },
        { id: 'dr_import_new', name: 'Dr. New' }
      ]);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);

      const all = await loadSurgeons();
      expect(all.find(s => s.id === 'dr_import_new')).toBeDefined();
    });
  });
});
