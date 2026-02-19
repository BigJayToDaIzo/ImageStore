import { idbGet, idbSet } from './idb';
import { parseCSVLine, patientToCSVLine, PATIENT_CSV_HEADERS } from '../util/csv-utils';
import type { Patient, PatientInput } from './types';

const IDB_KEY = 'list';
const CSV_FILENAME = 'patients.csv';

export function parsePatientCSV(text: string): Patient[] {
  const lines = text.trim().split('\n');
  if (lines.length <= 1) return [];

  return lines.slice(1).filter(line => line.trim()).map(line => {
    const values = parseCSVLine(line);
    return {
      case_number: values[0] || '',
      first_name: values[1] || '',
      last_name: values[2] || '',
      dob: values[3] || '',
      surgery_date: values[4] || '',
      primary_procedure: values[5] || '',
      surgeon: values[6] || '',
      created_at: values[7] || '',
      updated_at: values[8] || '',
    };
  });
}

export function patientsToCSV(patients: Patient[]): string {
  const header = PATIENT_CSV_HEADERS.join(',');
  const rows = patients.map(patientToCSVLine);
  return [header, ...rows].join('\n') + '\n';
}

async function writeCSVToDir(
  destHandle: FileSystemDirectoryHandle,
  patients: Patient[],
): Promise<void> {
  const content = patientsToCSV(patients);
  const fileHandle = await destHandle.getFileHandle(CSV_FILENAME, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function readCSVFromDir(destHandle: FileSystemDirectoryHandle): Promise<Patient[]> {
  try {
    const fileHandle = await destHandle.getFileHandle(CSV_FILENAME);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return parsePatientCSV(text);
  } catch {
    // File doesn't exist yet
    return [];
  }
}

export async function loadPatients(
  destHandle: FileSystemDirectoryHandle | null,
): Promise<Patient[]> {
  if (destHandle) {
    const patients = await readCSVFromDir(destHandle);
    // Cache to IDB
    await idbSet('patients', IDB_KEY, patients);
    return patients;
  }

  // Fallback to IDB cache
  const cached = await idbGet<Patient[]>('patients', IDB_KEY);
  return cached ?? [];
}

export async function savePatient(
  input: PatientInput,
  destHandle: FileSystemDirectoryHandle | null,
): Promise<Patient> {
  const patients = await loadPatients(destHandle);

  const existing = patients.find(p => p.case_number === input.case_number);
  if (existing) {
    throw new Error(`Patient with case number ${input.case_number} already exists`);
  }

  const now = new Date().toISOString();
  const patient: Patient = {
    ...input,
    created_at: now,
    updated_at: now,
  };

  patients.push(patient);

  // Write-through: IDB always, FS if available
  await idbSet('patients', IDB_KEY, patients);
  if (destHandle) {
    await writeCSVToDir(destHandle, patients);
  }

  return patient;
}

export async function searchPatients(query: string): Promise<Patient[]> {
  const patients = await idbGet<Patient[]>('patients', IDB_KEY) ?? [];

  if (!query) return patients;

  const lowerQuery = query.toLowerCase();
  return patients.filter(p =>
    p.case_number.toLowerCase().includes(lowerQuery) ||
    p.first_name.toLowerCase().includes(lowerQuery) ||
    p.last_name.toLowerCase().includes(lowerQuery)
  );
}

export async function findPatientByCase(caseNumber: string): Promise<Patient | null> {
  const patients = await idbGet<Patient[]>('patients', IDB_KEY) ?? [];
  return patients.find(p => p.case_number === caseNumber) ?? null;
}

export async function updatePatient(
  caseNumber: string,
  updates: Partial<Omit<Patient, 'case_number' | 'created_at'>>,
  destHandle: FileSystemDirectoryHandle | null,
): Promise<void> {
  const patients = await loadPatients(destHandle);
  const index = patients.findIndex(p => p.case_number === caseNumber);
  if (index === -1) throw new Error(`Patient with case number ${caseNumber} not found`);

  patients[index] = { ...patients[index], ...updates, updated_at: new Date().toISOString() };

  await idbSet('patients', IDB_KEY, patients);
  if (destHandle) {
    await writeCSVToDir(destHandle, patients);
  }
}

export async function deletePatient(
  caseNumber: string,
  destHandle: FileSystemDirectoryHandle | null,
): Promise<void> {
  const patients = await loadPatients(destHandle);
  const index = patients.findIndex(p => p.case_number === caseNumber);
  if (index === -1) throw new Error(`Patient with case number ${caseNumber} not found`);

  patients.splice(index, 1);

  await idbSet('patients', IDB_KEY, patients);
  if (destHandle) {
    await writeCSVToDir(destHandle, patients);
  }
}
