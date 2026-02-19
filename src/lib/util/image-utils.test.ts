import { describe, it, expect } from 'bun:test';
import { isImageFile } from './image-utils';

describe('isImageFile', () => {
  it('should accept common image extensions', () => {
    expect(isImageFile('photo.jpg')).toBe(true);
    expect(isImageFile('photo.jpeg')).toBe(true);
    expect(isImageFile('photo.png')).toBe(true);
    expect(isImageFile('photo.webp')).toBe(true);
    expect(isImageFile('photo.bmp')).toBe(true);
    expect(isImageFile('photo.tiff')).toBe(true);
    expect(isImageFile('photo.tif')).toBe(true);
  });

  it('should accept HEIC/HEIF extensions', () => {
    expect(isImageFile('photo.heic')).toBe(true);
    expect(isImageFile('photo.heif')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isImageFile('PHOTO.JPG')).toBe(true);
    expect(isImageFile('Photo.PNG')).toBe(true);
    expect(isImageFile('img.HEIC')).toBe(true);
    expect(isImageFile('scan.TIF')).toBe(true);
  });

  it('should reject non-image extensions', () => {
    expect(isImageFile('document.pdf')).toBe(false);
    expect(isImageFile('script.js')).toBe(false);
    expect(isImageFile('data.csv')).toBe(false);
    expect(isImageFile('archive.zip')).toBe(false);
    expect(isImageFile('readme.md')).toBe(false);
    expect(isImageFile('video.mp4')).toBe(false);
  });

  it('should reject dotfiles', () => {
    expect(isImageFile('.hidden.jpg')).toBe(false);
    expect(isImageFile('.DS_Store')).toBe(false);
  });

  it('should reject files with no extension', () => {
    expect(isImageFile('photo')).toBe(false);
    expect(isImageFile('Makefile')).toBe(false);
  });

  it('should handle filenames with multiple dots', () => {
    expect(isImageFile('photo.edit.final.jpg')).toBe(true);
    expect(isImageFile('scan.2024.tiff')).toBe(true);
  });

  it('should reject gif', () => {
    // gif is not in the supported set (medical images only)
    expect(isImageFile('animation.gif')).toBe(false);
  });
});
