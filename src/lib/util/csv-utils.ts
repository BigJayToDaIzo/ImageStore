import type { Patient } from '../store/types';

const PATIENT_CSV_HEADERS = [
  'case_number', 'first_name', 'last_name', 'dob',
  'surgery_date', 'primary_procedure', 'surgeon', 'created_at', 'updated_at',
] as const;

export function parseCSVLine(line: string): string[] {
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

export function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function patientToCSVLine(patient: Patient): string {
  return PATIENT_CSV_HEADERS.map(header => escapeCSVValue(patient[header])).join(',');
}

export { PATIENT_CSV_HEADERS };
