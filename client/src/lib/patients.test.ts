import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  loadPatients,
  savePatients,
  findPatientByCase,
  searchPatients,
  createPatient,
  updatePatient,
  deletePatient,
  getDataPath,
  type Patient
} from './patients';

const TEST_DIR = '/tmp/imagestore-test-data';
const TEST_CSV = join(TEST_DIR, 'patients.csv');

describe('patients', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    process.env.IMAGESTORE_DATA = TEST_DIR;
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
    delete process.env.IMAGESTORE_DATA;
  });

  describe('getDataPath', () => {
    it('should use IMAGESTORE_DATA env var when set', () => {
      process.env.IMAGESTORE_DATA = '/custom/path';
      expect(getDataPath()).toBe('/custom/path/patients.csv');
    });

    it('should fall back to IMAGESTORE_DEST/data when IMAGESTORE_DATA not set', () => {
      delete process.env.IMAGESTORE_DATA;
      process.env.IMAGESTORE_DEST = '/dest/path';
      expect(getDataPath()).toBe('/dest/path/data/patients.csv');
      delete process.env.IMAGESTORE_DEST;
    });
  });

  describe('loadPatients', () => {
    it('should return empty array when CSV does not exist', async () => {
      const patients = await loadPatients(TEST_CSV);
      expect(patients).toEqual([]);
    });

    it('should parse CSV with headers correctly', async () => {
      const csv = `case_number,first_name,last_name,dob,created_at,updated_at
C001,John,Doe,1990-05-15,2026-01-15T10:30:00Z,2026-01-15T10:30:00Z
C002,Jane,Smith,1985-03-22,2026-01-16T14:20:00Z,2026-01-20T09:15:00Z`;
      await writeFile(TEST_CSV, csv);

      const patients = await loadPatients(TEST_CSV);
      expect(patients).toHaveLength(2);
      expect(patients[0]).toEqual({
        case_number: 'C001',
        first_name: 'John',
        last_name: 'Doe',
        dob: '1990-05-15',
        created_at: '2026-01-15T10:30:00Z',
        updated_at: '2026-01-15T10:30:00Z'
      });
    });

    it('should handle empty CSV with only headers', async () => {
      const csv = 'case_number,first_name,last_name,dob,created_at,updated_at\n';
      await writeFile(TEST_CSV, csv);

      const patients = await loadPatients(TEST_CSV);
      expect(patients).toEqual([]);
    });

    it('should handle values with commas in quotes', async () => {
      const csv = `case_number,first_name,last_name,dob,created_at,updated_at
C001,"John, Jr.",Doe,1990-05-15,2026-01-15T10:30:00Z,2026-01-15T10:30:00Z`;
      await writeFile(TEST_CSV, csv);

      const patients = await loadPatients(TEST_CSV);
      expect(patients[0].first_name).toBe('John, Jr.');
    });
  });

  describe('savePatients', () => {
    it('should create CSV file with headers', async () => {
      const patients: Patient[] = [{
        case_number: 'C001',
        first_name: 'John',
        last_name: 'Doe',
        dob: '1990-05-15',
        created_at: '2026-01-15T10:30:00Z',
        updated_at: '2026-01-15T10:30:00Z'
      }];

      await savePatients(patients, TEST_CSV);

      const content = await readFile(TEST_CSV, 'utf-8');
      expect(content).toContain('case_number,first_name,last_name,dob,created_at,updated_at');
      expect(content).toContain('C001,John,Doe,1990-05-15');
    });

    it('should escape values containing commas', async () => {
      const patients: Patient[] = [{
        case_number: 'C001',
        first_name: 'John, Jr.',
        last_name: 'Doe',
        dob: '1990-05-15',
        created_at: '2026-01-15T10:30:00Z',
        updated_at: '2026-01-15T10:30:00Z'
      }];

      await savePatients(patients, TEST_CSV);

      const content = await readFile(TEST_CSV, 'utf-8');
      expect(content).toContain('"John, Jr."');
    });

    it('should create parent directories if they do not exist', async () => {
      const nestedPath = join(TEST_DIR, 'nested', 'dir', 'patients.csv');
      const patients: Patient[] = [];

      await savePatients(patients, nestedPath);

      const content = await readFile(nestedPath, 'utf-8');
      expect(content).toContain('case_number');
    });
  });

  describe('findPatientByCase', () => {
    beforeEach(async () => {
      const csv = `case_number,first_name,last_name,dob,created_at,updated_at
C001,John,Doe,1990-05-15,2026-01-15T10:30:00Z,2026-01-15T10:30:00Z
C002,Jane,Smith,1985-03-22,2026-01-16T14:20:00Z,2026-01-20T09:15:00Z`;
      await writeFile(TEST_CSV, csv);
    });

    it('should find patient by exact case number', async () => {
      const patient = await findPatientByCase('C001', TEST_CSV);
      expect(patient).not.toBeNull();
      expect(patient?.first_name).toBe('John');
    });

    it('should return null for non-existent case number', async () => {
      const patient = await findPatientByCase('C999', TEST_CSV);
      expect(patient).toBeNull();
    });

    it('should be case-sensitive', async () => {
      const patient = await findPatientByCase('c001', TEST_CSV);
      expect(patient).toBeNull();
    });
  });

  describe('searchPatients', () => {
    beforeEach(async () => {
      const csv = `case_number,first_name,last_name,dob,created_at,updated_at
C001,John,Doe,1990-05-15,2026-01-15T10:30:00Z,2026-01-15T10:30:00Z
C002,Jane,Smith,1985-03-22,2026-01-16T14:20:00Z,2026-01-20T09:15:00Z
C003,Johnny,Appleseed,1975-07-04,2026-01-17T08:00:00Z,2026-01-17T08:00:00Z`;
      await writeFile(TEST_CSV, csv);
    });

    it('should search by case number prefix', async () => {
      const results = await searchPatients('C00', TEST_CSV);
      expect(results).toHaveLength(3);
    });

    it('should search by first name (case-insensitive)', async () => {
      const results = await searchPatients('john', TEST_CSV);
      expect(results).toHaveLength(2); // John and Johnny
    });

    it('should search by last name (case-insensitive)', async () => {
      const results = await searchPatients('smith', TEST_CSV);
      expect(results).toHaveLength(1);
      expect(results[0].case_number).toBe('C002');
    });

    it('should return empty array for no matches', async () => {
      const results = await searchPatients('xyz', TEST_CSV);
      expect(results).toEqual([]);
    });

    it('should return all patients for empty query', async () => {
      const results = await searchPatients('', TEST_CSV);
      expect(results).toHaveLength(3);
    });
  });

  describe('createPatient', () => {
    it('should add new patient to empty CSV', async () => {
      const newPatient = await createPatient({
        case_number: 'C001',
        first_name: 'John',
        last_name: 'Doe',
        dob: '1990-05-15'
      }, TEST_CSV);

      expect(newPatient.case_number).toBe('C001');
      expect(newPatient.created_at).toBeDefined();
      expect(newPatient.updated_at).toBeDefined();

      const patients = await loadPatients(TEST_CSV);
      expect(patients).toHaveLength(1);
    });

    it('should add new patient to existing CSV', async () => {
      const csv = `case_number,first_name,last_name,dob,created_at,updated_at
C001,John,Doe,1990-05-15,2026-01-15T10:30:00Z,2026-01-15T10:30:00Z`;
      await writeFile(TEST_CSV, csv);

      await createPatient({
        case_number: 'C002',
        first_name: 'Jane',
        last_name: 'Smith',
        dob: '1985-03-22'
      }, TEST_CSV);

      const patients = await loadPatients(TEST_CSV);
      expect(patients).toHaveLength(2);
    });

    it('should throw error for duplicate case number', async () => {
      const csv = `case_number,first_name,last_name,dob,created_at,updated_at
C001,John,Doe,1990-05-15,2026-01-15T10:30:00Z,2026-01-15T10:30:00Z`;
      await writeFile(TEST_CSV, csv);

      await expect(createPatient({
        case_number: 'C001',
        first_name: 'Another',
        last_name: 'Person',
        dob: '1980-01-01'
      }, TEST_CSV)).rejects.toThrow('already exists');
    });
  });

  describe('updatePatient', () => {
    beforeEach(async () => {
      const csv = `case_number,first_name,last_name,dob,created_at,updated_at
C001,John,Doe,1990-05-15,2026-01-15T10:30:00Z,2026-01-15T10:30:00Z`;
      await writeFile(TEST_CSV, csv);
    });

    it('should update patient fields', async () => {
      const updated = await updatePatient('C001', {
        first_name: 'Jonathan',
        last_name: 'Doe-Smith'
      }, TEST_CSV);

      expect(updated.first_name).toBe('Jonathan');
      expect(updated.last_name).toBe('Doe-Smith');
      expect(updated.dob).toBe('1990-05-15'); // unchanged
    });

    it('should update updated_at timestamp', async () => {
      const before = await findPatientByCase('C001', TEST_CSV);

      // Small delay to ensure timestamp differs
      await new Promise(r => setTimeout(r, 10));

      const updated = await updatePatient('C001', {
        first_name: 'Jonathan'
      }, TEST_CSV);

      expect(updated.updated_at).not.toBe(before?.updated_at);
    });

    it('should throw error for non-existent patient', async () => {
      await expect(updatePatient('C999', {
        first_name: 'Nobody'
      }, TEST_CSV)).rejects.toThrow('not found');
    });

    it('should not allow changing case_number', async () => {
      const updated = await updatePatient('C001', {
        case_number: 'C999' as any,
        first_name: 'Jonathan'
      }, TEST_CSV);

      expect(updated.case_number).toBe('C001');
    });
  });

  describe('deletePatient', () => {
    beforeEach(async () => {
      const csv = `case_number,first_name,last_name,dob,created_at,updated_at
C001,John,Doe,1990-05-15,2026-01-15T10:30:00Z,2026-01-15T10:30:00Z
C002,Jane,Smith,1985-03-22,2026-01-16T14:20:00Z,2026-01-20T09:15:00Z`;
      await writeFile(TEST_CSV, csv);
    });

    it('should remove patient from CSV', async () => {
      await deletePatient('C001', TEST_CSV);

      const patients = await loadPatients(TEST_CSV);
      expect(patients).toHaveLength(1);
      expect(patients[0].case_number).toBe('C002');
    });

    it('should throw error for non-existent patient', async () => {
      await expect(deletePatient('C999', TEST_CSV))
        .rejects.toThrow('not found');
    });
  });
});
