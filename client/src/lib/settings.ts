import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

export interface Settings {
  destinationRoot: string;
  sourceRoot: string;
  dataPath: string;
  defaults: {
    procedure: string;
    imageType: string;
    angle: string;
    defaultPatientAge: number;
    surgeon: string;
  };
}

// XDG Base Directory paths (config and data separate from images)
function getXdgConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
}

function getXdgDataHome(): string {
  return process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
}

// Config: $XDG_CONFIG_HOME/imagestore/
export function getConfigDir(): string {
  return join(getXdgConfigHome(), 'imagestore');
}

// Data (CSVs): $XDG_DATA_HOME/imagestore/
export function getDataDir(): string {
  return join(getXdgDataHome(), 'imagestore');
}

// Images: ~/Documents/ImageStore/ (completely separate from config/data)
const DEFAULT_DEST = join(homedir(), 'Documents', 'ImageStore', 'sorted');
const DEFAULT_SOURCE = join(homedir(), 'Documents', 'ImageStore', 'unsorted');

const DEFAULT_SETTINGS: Settings = {
  destinationRoot: DEFAULT_DEST,
  sourceRoot: DEFAULT_SOURCE,
  dataPath: '',
  defaults: {
    procedure: 'rhinoplasty',
    imageType: 'pre_op',
    angle: 'front',
    defaultPatientAge: 33,
    surgeon: '',
  },
};

export function getSettingsPath(): string {
  return join(getConfigDir(), 'settings.json');
}

export async function loadSettings(): Promise<Settings> {
  const settingsPath = getSettingsPath();

  try {
    const content = await readFile(settingsPath, 'utf-8');
    const stored = JSON.parse(content) as Partial<Settings>;

    // Merge with defaults to ensure all fields exist
    return {
      destinationRoot: stored.destinationRoot ?? DEFAULT_SETTINGS.destinationRoot,
      sourceRoot: stored.sourceRoot ?? DEFAULT_SETTINGS.sourceRoot,
      dataPath: stored.dataPath ?? DEFAULT_SETTINGS.dataPath,
      defaults: {
        procedure: stored.defaults?.procedure ?? DEFAULT_SETTINGS.defaults.procedure,
        imageType: stored.defaults?.imageType ?? DEFAULT_SETTINGS.defaults.imageType,
        angle: stored.defaults?.angle ?? DEFAULT_SETTINGS.defaults.angle,
        defaultPatientAge: stored.defaults?.defaultPatientAge ?? DEFAULT_SETTINGS.defaults.defaultPatientAge,
        surgeon: stored.defaults?.surgeon ?? DEFAULT_SETTINGS.defaults.surgeon,
      },
    };
  } catch {
    // File doesn't exist or is invalid - return defaults
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  const settingsPath = getSettingsPath();
  const current = await loadSettings();

  // Merge partial update with current settings
  const updated: Settings = {
    destinationRoot: settings.destinationRoot ?? current.destinationRoot,
    sourceRoot: settings.sourceRoot ?? current.sourceRoot,
    dataPath: settings.dataPath ?? current.dataPath,
    defaults: {
      procedure: settings.defaults?.procedure ?? current.defaults.procedure,
      imageType: settings.defaults?.imageType ?? current.defaults.imageType,
      angle: settings.defaults?.angle ?? current.defaults.angle,
      defaultPatientAge: settings.defaults?.defaultPatientAge ?? current.defaults.defaultPatientAge,
      surgeon: settings.defaults?.surgeon ?? current.defaults.surgeon,
    },
  };

  // Ensure directory exists
  await mkdir(dirname(settingsPath), { recursive: true });

  await writeFile(settingsPath + '.tmp', JSON.stringify(updated, null, 2), 'utf-8');
  await rename(settingsPath + '.tmp', settingsPath);

  return updated;
}

export function getDataPath(settings: Settings): string {
  if (settings.dataPath) {
    return settings.dataPath;
  }
  // Patient data lives with images (same backup, same security)
  return join(settings.destinationRoot, 'patients.csv');
}

export async function resetSettings(): Promise<Settings> {
  const settingsPath = getSettingsPath();

  // Ensure directory exists
  await mkdir(dirname(settingsPath), { recursive: true });

  // Write factory defaults
  await writeFile(settingsPath + '.tmp', JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
  await rename(settingsPath + '.tmp', settingsPath);

  return { ...DEFAULT_SETTINGS };
}
