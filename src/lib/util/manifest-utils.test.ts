import { describe, it, expect } from 'bun:test';
import { allImagesProcessed, isTerminalStatus, canTransitionTo } from './manifest-utils';
import type { ManifestImage, ImageStatus } from '../store/types';

function makeImage(status: ImageStatus): ManifestImage {
  return {
    filename: 'test.jpg',
    sourceHash: 'abc123',
    status,
    destinationSegments: null,
    destinationFilename: null,
    destinationHash: null,
    patientRecordSaved: false,
    sourceDeleted: false,
    sortedAt: null,
  };
}

describe('allImagesProcessed', () => {
  it('should return true when all images are in terminal states', () => {
    const images = [
      makeImage('sorted'),
      makeImage('skipped'),
      makeImage('error'),
      makeImage('cleaned'),
      makeImage('clean_failed'),
    ];
    expect(allImagesProcessed(images)).toBe(true);
  });

  it('should return false when any image is pending', () => {
    const images = [makeImage('sorted'), makeImage('pending')];
    expect(allImagesProcessed(images)).toBe(false);
  });

  it('should return false when any image is sorting', () => {
    const images = [makeImage('sorted'), makeImage('sorting')];
    expect(allImagesProcessed(images)).toBe(false);
  });

  it('should return true for empty array', () => {
    expect(allImagesProcessed([])).toBe(true);
  });

  it('should return true when all images are sorted', () => {
    const images = [makeImage('sorted'), makeImage('sorted'), makeImage('sorted')];
    expect(allImagesProcessed(images)).toBe(true);
  });

  it('should return true when mix of sorted and skipped', () => {
    const images = [makeImage('sorted'), makeImage('skipped')];
    expect(allImagesProcessed(images)).toBe(true);
  });
});

describe('isTerminalStatus', () => {
  it('should return true for terminal statuses', () => {
    expect(isTerminalStatus('sorted')).toBe(true);
    expect(isTerminalStatus('skipped')).toBe(true);
    expect(isTerminalStatus('error')).toBe(true);
    expect(isTerminalStatus('cleaned')).toBe(true);
    expect(isTerminalStatus('clean_failed')).toBe(true);
  });

  it('should return false for non-terminal statuses', () => {
    expect(isTerminalStatus('pending')).toBe(false);
    expect(isTerminalStatus('sorting')).toBe(false);
  });
});

describe('canTransitionTo', () => {
  it('should allow pending -> sorting', () => {
    expect(canTransitionTo('pending', 'sorting')).toBe(true);
  });

  it('should allow pending -> skipped', () => {
    expect(canTransitionTo('pending', 'skipped')).toBe(true);
  });

  it('should not allow pending -> sorted directly', () => {
    expect(canTransitionTo('pending', 'sorted')).toBe(false);
  });

  it('should allow sorting -> sorted', () => {
    expect(canTransitionTo('sorting', 'sorted')).toBe(true);
  });

  it('should allow sorting -> error', () => {
    expect(canTransitionTo('sorting', 'error')).toBe(true);
  });

  it('should allow sorting -> pending (retry)', () => {
    expect(canTransitionTo('sorting', 'pending')).toBe(true);
  });

  it('should allow sorted -> cleaned', () => {
    expect(canTransitionTo('sorted', 'cleaned')).toBe(true);
  });

  it('should allow sorted -> clean_failed', () => {
    expect(canTransitionTo('sorted', 'clean_failed')).toBe(true);
  });

  it('should not allow cleaned -> anything', () => {
    expect(canTransitionTo('cleaned', 'pending')).toBe(false);
    expect(canTransitionTo('cleaned', 'sorted')).toBe(false);
  });

  it('should not allow clean_failed -> anything', () => {
    expect(canTransitionTo('clean_failed', 'pending')).toBe(false);
    expect(canTransitionTo('clean_failed', 'sorted')).toBe(false);
  });

  it('should allow error -> pending (retry)', () => {
    expect(canTransitionTo('error', 'pending')).toBe(true);
  });

  it('should allow skipped -> pending (undo skip)', () => {
    expect(canTransitionTo('skipped', 'pending')).toBe(true);
  });

  it('should allow skipped -> cleaned', () => {
    expect(canTransitionTo('skipped', 'cleaned')).toBe(true);
  });
});
