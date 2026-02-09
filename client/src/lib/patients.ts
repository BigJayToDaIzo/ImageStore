import { readFile, writeFile, mkdir, access, constants, copyFile, readdir, unlink, rename } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { loadSettings, getDataPath as getSettingsDataPath } from './settings';

export interface Patient {
  case_number: string;
  first_name: string;
  last_name: string;
  dob: string;
  surgery_date: string;
  primary_procedure: string;
  surgeon: string;
  created_at: string;
  updated_at: string;
}

// TODO: Eventually need to figure out how to manage surgery packages
// (multiple procedures per surgery date, bundled pricing, etc.)

export type PatientInput = Pick<Patient, 'case_number' | 'first_name' | 'last_name' | 'dob' | 'surgery_date' | 'primary_procedure' | 'surgeon'>;
export type PatientUpdate = Partial<Pick<Patient, 'first_name' | 'last_name' | 'dob' | 'surgery_date' | 'primary_procedure' | 'surgeon'>>;

const CSV_HEADERS = ['case_number', 'first_name', 'last_name', 'dob', 'surgery_date', 'primary_procedure', 'surgeon', 'created_at', 'updated_at'] as const;

export async function getDataPath(): Promise<string> {
  // Environment variables take precedence for backwards compatibility
  if (process.env.IMAGESTORE_DATA) {
    return join(process.env.IMAGESTORE_DATA, 'patients.csv');
  }
  const settings = await loadSettings();
  return getSettingsDataPath(settings);
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

function patientToCSVLine(patient: Patient): string {
  return CSV_HEADERS.map(header => escapeCSVValue(patient[header])).join(',');
}

export async function loadPatients(csvPath?: string): Promise<Patient[]> {
  const path = csvPath ?? await getDataPath();

  try {
    await access(path, constants.F_OK);
  } catch {
    return [];
  }

  const content = await readFile(path, 'utf-8');
  const lines = content.trim().split('\n');

  if (lines.length <= 1) {
    return [];
  }

  // Skip header row
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
      updated_at: values[8] || ''
    };
  });
}

async function backupPatients(csvPath: string): Promise<void> {
  try {
    await access(csvPath, constants.F_OK);
  } catch {
    return; // Nothing to back up
  }

  try {
    const backupDir = join(dirname(csvPath), 'backups');
    await mkdir(backupDir, { recursive: true });

    const today = new Date().toISOString().slice(0, 10);
    await copyFile(csvPath, join(backupDir, `patients.${today}.csv`));

    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const files = await readdir(backupDir);
    for (const file of files) {
      const match = file.match(/^patients\.(\d{4}-\d{2}-\d{2})\.csv$/);
      if (match && new Date(match[1]).getTime() < cutoff) {
        await unlink(join(backupDir, file));
      }
    }
  } catch (err) {
    console.warn('Patient backup failed:', err);
  }
}

export async function savePatients(patients: Patient[], csvPath?: string): Promise<void> {
  const path = csvPath ?? await getDataPath();

  await backupPatients(path);

  await mkdir(dirname(path), { recursive: true });

  const header = CSV_HEADERS.join(',');
  const rows = patients.map(patientToCSVLine);
  const content = [header, ...rows].join('\n') + '\n';

  await writeFile(path + '.tmp', content, 'utf-8');
  await rename(path + '.tmp', path);
}

export async function findPatientByCase(caseNumber: string, csvPath?: string): Promise<Patient | null> {
  const patients = await loadPatients(csvPath);
  return patients.find(p => p.case_number === caseNumber) ?? null;
}

export async function searchPatients(query: string, csvPath?: string): Promise<Patient[]> {
  const patients = await loadPatients(csvPath);

  if (!query) {
    return patients;
  }

  const lowerQuery = query.toLowerCase();
  return patients.filter(p =>
    p.case_number.toLowerCase().includes(lowerQuery) ||
    p.first_name.toLowerCase().includes(lowerQuery) ||
    p.last_name.toLowerCase().includes(lowerQuery)
  );
}

export async function createPatient(input: PatientInput, csvPath?: string): Promise<Patient> {
  const patients = await loadPatients(csvPath);

  const existing = patients.find(p => p.case_number === input.case_number);
  if (existing) {
    throw new Error(`Patient with case number ${input.case_number} already exists`);
  }

  const now = new Date().toISOString();
  const newPatient: Patient = {
    ...input,
    created_at: now,
    updated_at: now
  };

  patients.push(newPatient);
  await savePatients(patients, csvPath);

  return newPatient;
}

export async function updatePatient(
  caseNumber: string,
  updates: PatientUpdate,
  csvPath?: string
): Promise<Patient> {
  const patients = await loadPatients(csvPath);

  const index = patients.findIndex(p => p.case_number === caseNumber);
  if (index === -1) {
    throw new Error(`Patient with case number ${caseNumber} not found`);
  }

  const { case_number, ...safeUpdates } = updates as any;

  patients[index] = {
    ...patients[index],
    ...safeUpdates,
    updated_at: new Date().toISOString()
  };

  await savePatients(patients, csvPath);

  return patients[index];
}

export async function deletePatient(caseNumber: string, csvPath?: string): Promise<void> {
  const patients = await loadPatients(csvPath);

  const index = patients.findIndex(p => p.case_number === caseNumber);
  if (index === -1) {
    throw new Error(`Patient with case number ${caseNumber} not found`);
  }

  patients.splice(index, 1);
  await savePatients(patients, csvPath);
}
