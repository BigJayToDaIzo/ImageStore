const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tiff', '.tif', '.bmp',
]);

export function isImageFile(filename: string): boolean {
  if (filename.startsWith('.')) return false;
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) return false;
  return IMAGE_EXTENSIONS.has(filename.slice(dotIndex).toLowerCase());
}
