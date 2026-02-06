import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  getConfigDir,
  getDataDir,
  getSettingsPath,
  loadSettings,
  saveSettings,
  getDataPath,
  resetSettings,
  type Settings
} from './settings';

const TEST_CONFIG_DIR = '/tmp/imagestore-test-config';
const TEST_DATA_DIR = '/tmp/imagestore-test-data';

// Set once for all tests
process.env.XDG_CONFIG_HOME = TEST_CONFIG_DIR;
process.env.XDG_DATA_HOME = TEST_DATA_DIR;

describe('settings', () => {
  beforeAll(async () => {
    await mkdir(TEST_CONFIG_DIR, { recursive: true });
    await mkdir(TEST_DATA_DIR, { recursive: true });
  });

  afterAll(async () => {
    await rm(TEST_CONFIG_DIR, { recursive: true, force: true });
    await rm(TEST_DATA_DIR, { recursive: true, force: true });
  });

  describe('getConfigDir', () => {
    it('should use XDG_CONFIG_HOME when set', () => {
      expect(getConfigDir()).toBe(join(TEST_CONFIG_DIR, 'imagestore'));
    });
  });

  describe('getDataDir', () => {
    it('should use XDG_DATA_HOME when set', () => {
      expect(getDataDir()).toBe(join(TEST_DATA_DIR, 'imagestore'));
    });
  });

  describe('getSettingsPath', () => {
    it('should return settings.json inside config dir', () => {
      expect(getSettingsPath()).toBe(join(TEST_CONFIG_DIR, 'imagestore', 'settings.json'));
    });
  });

  describe('loadSettings', () => {
    it('should return default settings when no file exists', async () => {
      const settings = await loadSettings();

      expect(settings.defaults.procedure).toBe('rhinoplasty');
      expect(settings.defaults.imageType).toBe('pre_op');
      expect(settings.defaults.angle).toBe('front');
      expect(settings.defaults.defaultPatientAge).toBe(33);
      expect(settings.defaults.surgeon).toBe('');
      expect(settings.dataPath).toBe('');
    });

    it('should load stored settings from file', async () => {
      const stored = {
        destinationRoot: '/custom/dest',
        sourceRoot: '/custom/source',
        dataPath: '/custom/data/patients.csv',
        defaults: {
          procedure: 'facelift',
          imageType: '3mo_post_op',
          angle: 'left',
          defaultPatientAge: 45,
          surgeon: 'dr_jones'
        }
      };
      const settingsPath = getSettingsPath();
      await mkdir(join(TEST_CONFIG_DIR, 'imagestore'), { recursive: true });
      await writeFile(settingsPath, JSON.stringify(stored));

      const settings = await loadSettings();

      expect(settings.destinationRoot).toBe('/custom/dest');
      expect(settings.sourceRoot).toBe('/custom/source');
      expect(settings.dataPath).toBe('/custom/data/patients.csv');
      expect(settings.defaults.procedure).toBe('facelift');
      expect(settings.defaults.surgeon).toBe('dr_jones');
    });

    it('should merge partial stored settings with defaults', async () => {
      const partial = {
        destinationRoot: '/custom/dest',
        defaults: {
          procedure: 'facelift'
        }
      };
      const settingsPath = getSettingsPath();
      await mkdir(join(TEST_CONFIG_DIR, 'imagestore'), { recursive: true });
      await writeFile(settingsPath, JSON.stringify(partial));

      const settings = await loadSettings();

      expect(settings.destinationRoot).toBe('/custom/dest');
      expect(settings.defaults.procedure).toBe('facelift');
      // Should fall back to defaults for missing fields
      expect(settings.defaults.imageType).toBe('pre_op');
      expect(settings.defaults.angle).toBe('front');
    });

    it('should return defaults for invalid JSON', async () => {
      const settingsPath = getSettingsPath();
      await mkdir(join(TEST_CONFIG_DIR, 'imagestore'), { recursive: true });
      await writeFile(settingsPath, 'not valid json {{{');

      const settings = await loadSettings();

      expect(settings.defaults.procedure).toBe('rhinoplasty');
    });
  });

  describe('saveSettings', () => {
    it('should create config directory if it does not exist', async () => {
      await saveSettings({ destinationRoot: '/new/path' });

      const content = await readFile(getSettingsPath(), 'utf-8');
      expect(content).toContain('/new/path');
    });

    it('should merge partial updates with current settings', async () => {
      // Save initial settings
      await saveSettings({
        destinationRoot: '/dest',
        defaults: { procedure: 'facelift', imageType: 'pre_op', angle: 'front', defaultPatientAge: 33, surgeon: '' }
      });

      // Update only one field
      const updated = await saveSettings({
        defaults: { procedure: 'rhinoplasty', imageType: 'pre_op', angle: 'front', defaultPatientAge: 33, surgeon: '' }
      });

      expect(updated.destinationRoot).toBe('/dest');
      expect(updated.defaults.procedure).toBe('rhinoplasty');
    });

    it('should write formatted JSON', async () => {
      await saveSettings({ destinationRoot: '/test' });

      const content = await readFile(getSettingsPath(), 'utf-8');
      expect(content).toContain('\n'); // Pretty printed
    });
  });

  describe('getDataPath', () => {
    it('should return custom dataPath when set', () => {
      const settings: Settings = {
        destinationRoot: '/dest',
        sourceRoot: '/source',
        dataPath: '/custom/patients.csv',
        defaults: { procedure: '', imageType: '', angle: '', defaultPatientAge: 33, surgeon: '' }
      };

      expect(getDataPath(settings)).toBe('/custom/patients.csv');
    });

    it('should return destinationRoot/patients.csv when dataPath is empty', () => {
      const settings: Settings = {
        destinationRoot: '/my/images',
        sourceRoot: '/source',
        dataPath: '',
        defaults: { procedure: '', imageType: '', angle: '', defaultPatientAge: 33, surgeon: '' }
      };

      expect(getDataPath(settings)).toBe('/my/images/patients.csv');
    });
  });

  describe('resetSettings', () => {
    it('should write factory defaults to settings file', async () => {
      // First save custom settings
      await saveSettings({
        destinationRoot: '/custom',
        defaults: { procedure: 'facelift', imageType: 'pre_op', angle: 'front', defaultPatientAge: 50, surgeon: 'dr_smith' }
      });

      // Reset
      const reset = await resetSettings();

      expect(reset.defaults.procedure).toBe('rhinoplasty');
      expect(reset.defaults.defaultPatientAge).toBe(33);

      // Verify file was overwritten
      const loaded = await loadSettings();
      expect(loaded.defaults.procedure).toBe('rhinoplasty');
    });

    it('should create config directory if it does not exist', async () => {
      await rm(TEST_CONFIG_DIR, { recursive: true, force: true });

      await resetSettings();

      const content = await readFile(getSettingsPath(), 'utf-8');
      expect(content).toContain('rhinoplasty');
    });
  });
});
