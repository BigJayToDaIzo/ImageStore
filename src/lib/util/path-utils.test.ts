import { describe, it, expect } from 'bun:test';
import { buildDestinationPath } from './path-utils';
import type { SortFormData } from '../store/types';

const BASE_DATA: SortFormData = {
  caseNumber: 'C001',
  consentStatus: 'no_consent',
  procedureType: 'Rhinoplasty',
  surgeryDate: '2026-02-12',
  imageType: 'pre_op',
  angle: 'front',
  originalFilename: 'IMG_001.jpg',
};

describe('buildDestinationPath', () => {
  it('should build no_consent path correctly', () => {
    const result = buildDestinationPath(BASE_DATA);

    expect(result.segments).toEqual(['no_consent', 'Rhinoplasty', '2026-02-12', 'C001']);
    expect(result.filename).toBe('C001_pre_op_front.jpg');
  });

  it('should build consent/hipaa path correctly', () => {
    const data: SortFormData = { ...BASE_DATA, consentStatus: 'consent', consentType: 'hipaa' };
    const result = buildDestinationPath(data);

    expect(result.segments).toEqual(['consent', 'hipaa', 'Rhinoplasty', '2026-02-12', 'C001']);
    expect(result.filename).toBe('C001_pre_op_front.jpg');
  });

  it('should build consent/social_media path correctly', () => {
    const data: SortFormData = { ...BASE_DATA, consentStatus: 'consent', consentType: 'social_media' };
    const result = buildDestinationPath(data);

    expect(result.segments).toEqual(['consent', 'social_media', 'Rhinoplasty', '2026-02-12', 'C001']);
  });

  it('should preserve original file extension in lowercase', () => {
    const data: SortFormData = { ...BASE_DATA, originalFilename: 'photo.PNG' };
    const result = buildDestinationPath(data);

    expect(result.filename).toBe('C001_pre_op_front.png');
  });

  it('should default to .jpg when no extension', () => {
    const data: SortFormData = { ...BASE_DATA, originalFilename: 'photo_no_ext' };
    const result = buildDestinationPath(data);

    expect(result.filename).toBe('C001_pre_op_front.jpg');
  });

  it('should handle .heic extension', () => {
    const data: SortFormData = { ...BASE_DATA, originalFilename: 'IMG_0042.HEIC' };
    const result = buildDestinationPath(data);

    expect(result.filename).toBe('C001_pre_op_front.heic');
  });

  it('should use all form fields in path segments', () => {
    const data: SortFormData = {
      caseNumber: 'ABC-123',
      consentStatus: 'consent',
      consentType: 'hipaa',
      procedureType: 'Facelift',
      surgeryDate: '2024-01-15',
      imageType: 'photo',
      angle: 'front',
      originalFilename: 'DSC_9999.jpg',
    };
    const result = buildDestinationPath(data);

    expect(result.segments).toEqual(['consent', 'hipaa', 'Facelift', '2024-01-15', 'ABC-123']);
    expect(result.filename).toBe('ABC-123_photo_front.jpg');
  });

  it('should fall back to no_consent when consent but no consentType', () => {
    const data: SortFormData = { ...BASE_DATA, consentStatus: 'consent' };
    const result = buildDestinationPath(data);

    expect(result.segments).toEqual(['no_consent', 'Rhinoplasty', '2026-02-12', 'C001']);
  });
});
