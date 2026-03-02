import { idbGet, idbSet } from './idb';
import type { Procedure } from './types';

const IDB_KEY = 'list';

const DEFAULT_PROCEDURES: Procedure[] = [
  // Facial
  { id: 'rhinoplasty', name: 'Rhinoplasty', favorite: true },
  { id: 'facelift', name: 'Facelift', favorite: true },
  { id: 'blepharoplasty', name: 'Blepharoplasty', favorite: true },
  { id: 'brow_lift', name: 'Brow Lift', favorite: false },
  { id: 'buccal_fat_removal', name: 'Buccal Fat Removal', favorite: false },
  { id: 'chin_liposuction', name: 'Chin Liposuction', favorite: false },
  { id: 'morpheus8', name: 'Morpheus8', favorite: false },
  { id: 'neck_lift', name: 'Neck Lift', favorite: false },
  // Breast
  { id: 'breast_augmentation', name: 'Breast Augmentation', favorite: true },
  { id: 'breast_lift', name: 'Breast Lift', favorite: false },
  { id: 'breast_reduction', name: 'Breast Reduction', favorite: false },
  // Body
  { id: 'arm_lift', name: 'Arm Lift', favorite: false },
  { id: 'bbl', name: 'BBL', favorite: true },
  { id: 'mommy_makeover', name: 'Mommy Makeover', favorite: false },
  { id: 'non_surgical_tummy_tuck', name: 'Non-Surgical Tummy Tuck', favorite: false },
  { id: 'thigh_lift', name: 'Thigh Lift', favorite: false },
  { id: 'tummy_tuck', name: 'Tummy Tuck', favorite: true },
  { id: 'vaser_lipo_360', name: 'Vaser Lipo 360', favorite: true },
];

export async function loadProcedures(): Promise<Procedure[]> {
  const stored = await idbGet<Procedure[]>('procedures', IDB_KEY);
  if (stored) return stored;

  // First load — seed defaults
  await saveProcedures(DEFAULT_PROCEDURES);
  return [...DEFAULT_PROCEDURES];
}

export async function saveProcedures(list: Procedure[]): Promise<void> {
  await idbSet('procedures', IDB_KEY, list);
}

export async function addProcedure(name: string): Promise<Procedure> {
  const list = await loadProcedures();
  const id = name.toLowerCase().replace(/\s+/g, '_');

  if (list.some(p => p.id === id)) {
    throw new Error(`Procedure with id ${id} already exists`);
  }

  const procedure: Procedure = { id, name, favorite: false };
  list.push(procedure);
  await saveProcedures(list);
  return procedure;
}

export async function updateProcedure(
  id: string,
  updates: Partial<Omit<Procedure, 'id'>>,
): Promise<void> {
  const list = await loadProcedures();
  const index = list.findIndex(p => p.id === id);
  if (index === -1) throw new Error(`Procedure with id ${id} not found`);

  list[index] = { ...list[index], ...updates };
  await saveProcedures(list);
}

export async function deleteProcedure(id: string): Promise<void> {
  const list = await loadProcedures();
  const index = list.findIndex(p => p.id === id);
  if (index === -1) throw new Error(`Procedure with id ${id} not found`);

  list.splice(index, 1);
  await saveProcedures(list);
}

export async function importProcedures(csvText: string): Promise<{ imported: number; skipped: number }> {
  const list = await loadProcedures();
  const existingIds = new Set(list.map(p => p.id));

  const lines = csvText.trim().split('\n');
  // Skip header if it looks like one
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
      list.push({ id, name, favorite: false });
      existingIds.add(id);
      imported++;
    }
  }

  await saveProcedures(list);
  return { imported, skipped };
}

export async function showProcedureFilePicker(): Promise<string> {
  const [fileHandle] = await window.showOpenFilePicker({
    types: [{ description: 'CSV files', accept: { 'text/csv': ['.csv'] } }],
    multiple: false,
  });
  const file = await fileHandle.getFile();
  return file.text();
}
