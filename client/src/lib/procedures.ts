import { readFile, writeFile, mkdir, access, constants } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { loadSettings, getDataDir } from './settings';

export interface Procedure {
  id: string;
  name: string;
  favorite: boolean;
}

const CSV_HEADERS = ['id', 'name', 'favorite'] as const;

const DEFAULT_PROCEDURES: Procedure[] = [
  { id: 'rhinoplasty', name: 'Rhinoplasty', favorite: true },
  { id: 'facelift', name: 'Facelift', favorite: true },
  { id: 'blepharoplasty', name: 'Blepharoplasty', favorite: true },
  { id: 'breast_augmentation', name: 'Breast Augmentation', favorite: true },
  { id: 'liposuction', name: 'Liposuction', favorite: true },
];

export async function getProceduresPath(): Promise<string> {
  const settings = await loadSettings();
  // Use custom dataPath directory if set, otherwise ~/.imagestore/data/
  const dataDir = settings.dataPath
    ? dirname(settings.dataPath)
    : getDataDir();
  return join(dataDir, 'procedures.csv');
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

function procedureToCSVLine(procedure: Procedure): string {
  return [
    escapeCSVValue(procedure.id),
    escapeCSVValue(procedure.name),
    procedure.favorite ? 'true' : 'false'
  ].join(',');
}

export async function loadProcedures(): Promise<Procedure[]> {
  const path = await getProceduresPath();

  try {
    await access(path, constants.F_OK);
  } catch {
    // File doesn't exist - return defaults and create the file
    await saveProcedures(DEFAULT_PROCEDURES);
    return DEFAULT_PROCEDURES;
  }

  const content = await readFile(path, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length <= 1) {
    return DEFAULT_PROCEDURES;
  }

  // Skip header row
  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values = parseCSVLine(line);
    return {
      id: values[0] || '',
      name: values[1] || '',
      favorite: values[2]?.toLowerCase() === 'true'
    };
  });
}

export async function saveProcedures(procedures: Procedure[]): Promise<void> {
  const path = await getProceduresPath();

  await mkdir(dirname(path), { recursive: true });

  const header = CSV_HEADERS.join(',');
  const rows = procedures.map(procedureToCSVLine);
  const content = [header, ...rows].join('\n') + '\n';

  await writeFile(path, content, 'utf-8');
}

export async function createProcedure(id: string, name: string, favorite: boolean = false): Promise<Procedure> {
  const procedures = await loadProcedures();

  const existing = procedures.find(p => p.id === id);
  if (existing) {
    throw new Error(`Procedure with id ${id} already exists`);
  }

  const newProcedure: Procedure = { id, name, favorite };
  procedures.push(newProcedure);
  await saveProcedures(procedures);

  return newProcedure;
}

export async function updateProcedure(id: string, updates: Partial<Omit<Procedure, 'id'>>): Promise<Procedure> {
  const procedures = await loadProcedures();

  const index = procedures.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error(`Procedure with id ${id} not found`);
  }

  procedures[index] = {
    ...procedures[index],
    ...updates
  };

  await saveProcedures(procedures);

  return procedures[index];
}

export async function deleteProcedure(id: string): Promise<void> {
  const procedures = await loadProcedures();

  const index = procedures.findIndex(p => p.id === id);
  if (index === -1) {
    throw new Error(`Procedure with id ${id} not found`);
  }

  procedures.splice(index, 1);
  await saveProcedures(procedures);
}

export async function importProcedures(newProcedures: Array<{ id: string; name: string }>): Promise<{ imported: number; skipped: number }> {
  const procedures = await loadProcedures();
  const existingIds = new Set(procedures.map(p => p.id));

  let imported = 0;
  let skipped = 0;

  for (const proc of newProcedures) {
    if (existingIds.has(proc.id)) {
      skipped++;
    } else {
      procedures.push({ id: proc.id, name: proc.name, favorite: false });
      existingIds.add(proc.id);
      imported++;
    }
  }

  await saveProcedures(procedures);

  return { imported, skipped };
}
