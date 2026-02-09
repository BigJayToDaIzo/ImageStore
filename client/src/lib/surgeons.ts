import { readFile, writeFile, mkdir, access, constants, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { loadSettings, getDataDir } from './settings';

export interface Surgeon {
  id: string;
  name: string;
}

const CSV_HEADERS = ['id', 'name'] as const;

const DEFAULT_SURGEONS: Surgeon[] = [];

export async function getSurgeonsPath(): Promise<string> {
  const settings = await loadSettings();
  // Use custom dataPath directory if set, otherwise ~/.local/share/imagestore/
  const dataDir = settings.dataPath
    ? dirname(settings.dataPath)
    : getDataDir();
  return join(dataDir, 'surgeons.csv');
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  return values;
}

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function surgeonToCSVLine(surgeon: Surgeon): string {
  return [
    escapeCSVValue(surgeon.id),
    escapeCSVValue(surgeon.name),
  ].join(',');
}

export async function loadSurgeons(): Promise<Surgeon[]> {
  const path = await getSurgeonsPath();

  try {
    await access(path, constants.F_OK);
  } catch {
    // File doesn't exist - return defaults and create the file
    await saveSurgeons(DEFAULT_SURGEONS);
    return DEFAULT_SURGEONS;
  }

  const content = await readFile(path, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length <= 1) {
    return DEFAULT_SURGEONS;
  }

  // Skip header row
  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values = parseCSVLine(line);
    return {
      id: values[0] || '',
      name: values[1] || '',
    };
  });
}

export async function saveSurgeons(surgeons: Surgeon[]): Promise<void> {
  const path = await getSurgeonsPath();

  await mkdir(dirname(path), { recursive: true });

  const header = CSV_HEADERS.join(',');
  const rows = surgeons.map(surgeonToCSVLine);
  const content = [header, ...rows].join('\n') + '\n';

  await writeFile(path + '.tmp', content, 'utf-8');
  await rename(path + '.tmp', path);
}

export async function createSurgeon(id: string, name: string): Promise<Surgeon> {
  const surgeons = await loadSurgeons();

  const existing = surgeons.find(s => s.id === id);
  if (existing) {
    throw new Error(`Surgeon with id ${id} already exists`);
  }

  const newSurgeon: Surgeon = { id, name };
  surgeons.push(newSurgeon);
  await saveSurgeons(surgeons);

  return newSurgeon;
}

export async function updateSurgeon(id: string, updates: Partial<Omit<Surgeon, 'id'>>): Promise<Surgeon> {
  const surgeons = await loadSurgeons();

  const index = surgeons.findIndex(s => s.id === id);
  if (index === -1) {
    throw new Error(`Surgeon with id ${id} not found`);
  }

  surgeons[index] = {
    ...surgeons[index],
    ...updates
  };

  await saveSurgeons(surgeons);

  return surgeons[index];
}

export async function deleteSurgeon(id: string): Promise<void> {
  const surgeons = await loadSurgeons();

  const index = surgeons.findIndex(s => s.id === id);
  if (index === -1) {
    throw new Error(`Surgeon with id ${id} not found`);
  }

  surgeons.splice(index, 1);
  await saveSurgeons(surgeons);
}

export async function importSurgeons(newSurgeons: Array<{ id: string; name: string }>): Promise<{ imported: number; skipped: number }> {
  const surgeons = await loadSurgeons();
  const existingIds = new Set(surgeons.map(s => s.id));

  let imported = 0;
  let skipped = 0;

  for (const surg of newSurgeons) {
    if (existingIds.has(surg.id)) {
      skipped++;
    } else {
      surgeons.push({ id: surg.id, name: surg.name });
      existingIds.add(surg.id);
      imported++;
    }
  }

  await saveSurgeons(surgeons);

  return { imported, skipped };
}
