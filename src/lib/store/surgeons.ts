import { idbGet, idbSet } from './idb';
import type { Surgeon } from './types';

const IDB_KEY = 'list';

export async function loadSurgeons(): Promise<Surgeon[]> {
  const stored = await idbGet<Surgeon[]>('surgeons', IDB_KEY);
  if (stored) return stored;

  // First load — seed empty
  await saveSurgeons([]);
  return [];
}

export async function saveSurgeons(list: Surgeon[]): Promise<void> {
  await idbSet('surgeons', IDB_KEY, list);
}

export async function addSurgeon(id: string, name: string): Promise<Surgeon> {
  const list = await loadSurgeons();

  if (list.some(s => s.id === id)) {
    throw new Error(`Surgeon with id ${id} already exists`);
  }

  const surgeon: Surgeon = { id, name };
  list.push(surgeon);
  await saveSurgeons(list);
  return surgeon;
}

export async function updateSurgeon(
  id: string,
  updates: Partial<Omit<Surgeon, 'id'>>,
): Promise<void> {
  const list = await loadSurgeons();
  const index = list.findIndex(s => s.id === id);
  if (index === -1) throw new Error(`Surgeon with id ${id} not found`);

  list[index] = { ...list[index], ...updates };
  await saveSurgeons(list);
}

export async function deleteSurgeon(id: string): Promise<void> {
  const list = await loadSurgeons();
  const index = list.findIndex(s => s.id === id);
  if (index === -1) throw new Error(`Surgeon with id ${id} not found`);

  list.splice(index, 1);
  await saveSurgeons(list);
}

export async function importSurgeons(csvText: string): Promise<{ imported: number; skipped: number }> {
  const list = await loadSurgeons();
  const existingIds = new Set(list.map(s => s.id));

  const lines = csvText.trim().split('\n');
  const start = (lines[0]?.toLowerCase().includes('id') || lines[0]?.toLowerCase().includes('name')) ? 1 : 0;

  let imported = 0;
  let skipped = 0;

  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    const id = parts[0]?.trim() || '';
    const name = parts[1]?.trim() || id;

    if (!id || existingIds.has(id)) {
      skipped++;
    } else {
      list.push({ id, name });
      existingIds.add(id);
      imported++;
    }
  }

  await saveSurgeons(list);
  return { imported, skipped };
}

export async function showSurgeonFilePicker(): Promise<string> {
  const [fileHandle] = await window.showOpenFilePicker({
    types: [{ description: 'CSV files', accept: { 'text/csv': ['.csv'] } }],
    multiple: false,
  });
  const file = await fileHandle.getFile();
  return file.text();
}
