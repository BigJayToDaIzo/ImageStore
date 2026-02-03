import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

export interface Surgeon {
  id: string;
  name: string;
}

export interface Settings {
  destinationRoot: string;
  sourceRoot: string;
  dataPath: string;
  surgeons: Surgeon[];
  defaults: {
    procedure: string;
    imageType: string;
    angle: string;
    defaultPatientAge: number;
    surgeon: string;
  };
}

const DEFAULT_DEST = join(homedir(), 'Documents', 'ImageStore', 'sorted');
const DEFAULT_SOURCE = join(homedir(), 'Documents', 'ImageStore', 'unsorted');

const DEFAULT_SETTINGS: Settings = {
  destinationRoot: DEFAULT_DEST,
  sourceRoot: DEFAULT_SOURCE,
  dataPath: '',
  surgeons: [],
  defaults: {
    procedure: 'rhinoplasty',
    imageType: 'pre_op',
    angle: 'front',
    defaultPatientAge: 33,
    surgeon: '',
  },
};

export function getSettingsPath(): string {
  return join(homedir(), '.imagestore', 'settings.json');
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
      surgeons: stored.surgeons ?? DEFAULT_SETTINGS.surgeons,
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
    surgeons: settings.surgeons ?? current.surgeons,
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

  await writeFile(settingsPath, JSON.stringify(updated, null, 2), 'utf-8');

  return updated;
}

export function getDataPath(settings: Settings): string {
  if (settings.dataPath) {
    return settings.dataPath;
  }
  return join(settings.destinationRoot, 'data', 'patients.csv');
}
