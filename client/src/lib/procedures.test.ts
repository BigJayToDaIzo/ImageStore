import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  getProceduresPath,
  loadProcedures,
  saveProcedures,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  importProcedures,
  type Procedure
} from './procedures';
import { saveSettings } from './settings';

const TEST_DIR = '/tmp/imagestore-test-procedures';
const TEST_CONFIG_DIR = join(TEST_DIR, 'config');
const TEST_DATA_DIR = join(TEST_DIR, 'data');

// Redirect both config and data to test directory
process.env.XDG_CONFIG_HOME = TEST_CONFIG_DIR;
process.env.XDG_DATA_HOME = TEST_DATA_DIR;

describe('procedures', () => {
  beforeAll(async () => {
    await mkdir(join(TEST_CONFIG_DIR, 'imagestore'), { recursive: true });
    await mkdir(join(TEST_DATA_DIR, 'imagestore'), { recursive: true });
  });

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await rm(join(TEST_DATA_DIR, 'imagestore', 'procedures.csv'), { force: true });
    await rm(join(TEST_CONFIG_DIR, 'imagestore', 'settings.json'), { force: true });
  });

  describe('getProceduresPath', () => {
    it('should use custom dataPath directory when set in settings', async () => {
      await saveSettings({ dataPath: '/custom/data/patients.csv' });

      const path = await getProceduresPath();

      expect(path).toBe('/custom/data/procedures.csv');
    });

    it('should use XDG data dir when dataPath not set', async () => {
      const path = await getProceduresPath();

      expect(path).toBe(join(TEST_DATA_DIR, 'imagestore', 'procedures.csv'));
    });
  });

  describe('loadProcedures', () => {
    it('should return default procedures when no file exists', async () => {
      const procedures = await loadProcedures();

      expect(procedures.length).toBe(5);
      expect(procedures[0].id).toBe('rhinoplasty');
      expect(procedures[0].favorite).toBe(true);
    });

    it('should load procedures from CSV', async () => {
      const csv = `id,name,favorite
custom_proc,Custom Procedure,false
another,Another One,true`;
      await writeFile(join(TEST_DATA_DIR, 'imagestore', 'procedures.csv'), csv);

      const procedures = await loadProcedures();

      expect(procedures.length).toBe(2);
      expect(procedures[0].id).toBe('custom_proc');
      expect(procedures[0].name).toBe('Custom Procedure');
      expect(procedures[0].favorite).toBe(false);
      expect(procedures[1].favorite).toBe(true);
    });

    it('should handle escaped quotes in values', async () => {
      const csv = `id,name,favorite
test_proc,"Procedure ""Special""",true`;
      await writeFile(join(TEST_DATA_DIR, 'imagestore', 'procedures.csv'), csv);

      const procedures = await loadProcedures();
      expect(procedures[0].name).toBe('Procedure "Special"');
    });
  });

  describe('saveProcedures', () => {
    it('should write procedures to CSV', async () => {
      const procedures: Procedure[] = [
        { id: 'test', name: 'Test Proc', favorite: true }
      ];

      await saveProcedures(procedures);

      const content = await readFile(join(TEST_DATA_DIR, 'imagestore', 'procedures.csv'), 'utf-8');
      expect(content).toContain('id,name,favorite');
      expect(content).toContain('test,Test Proc,true');
    });

    it('should escape values with commas', async () => {
      const procedures: Procedure[] = [
        { id: 'test', name: 'Procedure, With Comma', favorite: false }
      ];

      await saveProcedures(procedures);

      const content = await readFile(join(TEST_DATA_DIR, 'imagestore', 'procedures.csv'), 'utf-8');
      expect(content).toContain('"Procedure, With Comma"');
    });

    it('should escape values with quotes', async () => {
      const procedures: Procedure[] = [
        { id: 'test', name: 'The "Best" Procedure', favorite: false }
      ];

      await saveProcedures(procedures);

      const content = await readFile(join(TEST_DATA_DIR, 'imagestore', 'procedures.csv'), 'utf-8');
      expect(content).toContain('"The ""Best"" Procedure"');
    });
  });

  describe('createProcedure', () => {
    it('should add new procedure', async () => {
      await loadProcedures();

      const created = await createProcedure('new_proc', 'New Procedure', true);

      expect(created.id).toBe('new_proc');
      expect(created.favorite).toBe(true);

      const all = await loadProcedures();
      expect(all.find(p => p.id === 'new_proc')).toBeDefined();
    });

    it('should throw for duplicate id', async () => {
      await loadProcedures();

      await expect(createProcedure('rhinoplasty', 'Dupe', false))
        .rejects.toThrow('already exists');
    });
  });

  describe('updateProcedure', () => {
    it('should update procedure fields', async () => {
      await loadProcedures();

      const updated = await updateProcedure('rhinoplasty', { name: 'Nose Job', favorite: false });

      expect(updated.name).toBe('Nose Job');
      expect(updated.favorite).toBe(false);
      expect(updated.id).toBe('rhinoplasty');
    });

    it('should throw for non-existent id', async () => {
      await loadProcedures();

      await expect(updateProcedure('fake_id', { name: 'Whatever' }))
        .rejects.toThrow('not found');
    });
  });

  describe('deleteProcedure', () => {
    it('should remove procedure', async () => {
      await loadProcedures();

      await deleteProcedure('rhinoplasty');

      const all = await loadProcedures();
      expect(all.find(p => p.id === 'rhinoplasty')).toBeUndefined();
    });

    it('should throw for non-existent id', async () => {
      await loadProcedures();

      await expect(deleteProcedure('fake_id'))
        .rejects.toThrow('not found');
    });
  });

  describe('importProcedures', () => {
    it('should import new procedures and skip duplicates', async () => {
      await loadProcedures();

      const result = await importProcedures([
        { id: 'rhinoplasty', name: 'Dupe' },
        { id: 'new_one', name: 'New One' },
        { id: 'new_two', name: 'New Two' }
      ]);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(1);

      const all = await loadProcedures();
      expect(all.find(p => p.id === 'new_one')).toBeDefined();
    });

    it('should set imported procedures as non-favorites', async () => {
      await loadProcedures();

      await importProcedures([{ id: 'imported', name: 'Imported' }]);

      const all = await loadProcedures();
      const imported = all.find(p => p.id === 'imported');
      expect(imported?.favorite).toBe(false);
    });
  });
});
