import { describe, it, expect } from 'bun:test';
import { parseCSVLine, escapeCSVValue, patientToCSVLine } from './csv-utils';
import type { Patient } from '../store/types';

describe('parseCSVLine', () => {
  it('should parse simple comma-separated values', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('should handle quoted values', () => {
    expect(parseCSVLine('"hello","world"')).toEqual(['hello', 'world']);
  });

  it('should handle escaped quotes within quoted values', () => {
    expect(parseCSVLine('"say ""hello""",world')).toEqual(['say "hello"', 'world']);
  });

  it('should handle commas inside quoted values', () => {
    expect(parseCSVLine('"Smith, Jr.",John')).toEqual(['Smith, Jr.', 'John']);
  });

  it('should handle empty fields', () => {
    expect(parseCSVLine('a,,c,')).toEqual(['a', '', 'c', '']);
  });

  it('should handle a single value', () => {
    expect(parseCSVLine('solo')).toEqual(['solo']);
  });

  it('should handle empty string', () => {
    expect(parseCSVLine('')).toEqual(['']);
  });

  it('should handle mixed quoted and unquoted fields', () => {
    expect(parseCSVLine('plain,"quoted,with,commas",another')).toEqual([
      'plain', 'quoted,with,commas', 'another',
    ]);
  });
});

describe('escapeCSVValue', () => {
  it('should return plain values unchanged', () => {
    expect(escapeCSVValue('hello')).toBe('hello');
  });

  it('should wrap values with commas in quotes', () => {
    expect(escapeCSVValue('hello, world')).toBe('"hello, world"');
  });

  it('should escape double quotes and wrap', () => {
    expect(escapeCSVValue('say "hi"')).toBe('"say ""hi"""');
  });

  it('should wrap values with newlines in quotes', () => {
    expect(escapeCSVValue('line1\nline2')).toBe('"line1\nline2"');
  });

  it('should handle empty string', () => {
    expect(escapeCSVValue('')).toBe('');
  });
});

describe('patientToCSVLine', () => {
  it('should produce correct CSV line from patient', () => {
    const patient: Patient = {
      case_number: 'C001',
      first_name: 'John',
      last_name: 'Doe',
      dob: '1990-05-15',
      surgery_date: '2026-02-12',
      primary_procedure: 'Rhinoplasty',
      surgeon: 'dr_smith',
      created_at: '2026-02-12T10:00:00Z',
      updated_at: '2026-02-12T10:00:00Z',
    };

    const line = patientToCSVLine(patient);
    expect(line).toBe('C001,John,Doe,1990-05-15,2026-02-12,Rhinoplasty,dr_smith,2026-02-12T10:00:00Z,2026-02-12T10:00:00Z');
  });

  it('should handle values that need escaping', () => {
    const patient: Patient = {
      case_number: 'C002',
      first_name: 'Jane',
      last_name: 'O"Brien',
      dob: '',
      surgery_date: '2026-01-01',
      primary_procedure: 'Breast Augmentation',
      surgeon: '',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    const line = patientToCSVLine(patient);
    // last_name has a quote so it gets escaped
    expect(line).toContain('"O""Brien"');
  });

  it('should round-trip through parseCSVLine', () => {
    const patient: Patient = {
      case_number: 'C003',
      first_name: 'Maria, Elena',
      last_name: 'Garcia',
      dob: '1985-12-25',
      surgery_date: '2026-03-01',
      primary_procedure: 'Facelift',
      surgeon: 'dr_jones',
      created_at: '2026-03-01T08:00:00Z',
      updated_at: '2026-03-01T08:00:00Z',
    };

    const line = patientToCSVLine(patient);
    const parsed = parseCSVLine(line);

    expect(parsed[0]).toBe(patient.case_number);
    expect(parsed[1]).toBe(patient.first_name);
    expect(parsed[2]).toBe(patient.last_name);
    expect(parsed[3]).toBe(patient.dob);
    expect(parsed[4]).toBe(patient.surgery_date);
    expect(parsed[5]).toBe(patient.primary_procedure);
    expect(parsed[6]).toBe(patient.surgeon);
  });
});
