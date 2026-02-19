import { idbGet, idbSet, idbDelete } from './idb';
import type { Settings } from './types';

const SETTINGS_KEY = 'settings';

const DEFAULT_SETTINGS: Settings = {
  defaults: {
    procedure: 'rhinoplasty',
    imageType: 'pre_op',
    angle: 'front',
    defaultPatientAge: 33,
    surgeon: '',
  },
};

export async function loadSettings(): Promise<Settings> {
  const stored = await idbGet<Partial<Settings>>('settings', SETTINGS_KEY);
  if (!stored) return { ...DEFAULT_SETTINGS, defaults: { ...DEFAULT_SETTINGS.defaults } };

  return {
    defaults: {
      procedure: stored.defaults?.procedure ?? DEFAULT_SETTINGS.defaults.procedure,
      imageType: stored.defaults?.imageType ?? DEFAULT_SETTINGS.defaults.imageType,
      angle: stored.defaults?.angle ?? DEFAULT_SETTINGS.defaults.angle,
      defaultPatientAge: stored.defaults?.defaultPatientAge ?? DEFAULT_SETTINGS.defaults.defaultPatientAge,
      surgeon: stored.defaults?.surgeon ?? DEFAULT_SETTINGS.defaults.surgeon,
    },
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await idbSet('settings', SETTINGS_KEY, settings);
}

export async function resetSettings(): Promise<void> {
  await idbDelete('settings', SETTINGS_KEY);
}
