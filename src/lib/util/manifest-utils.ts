import type { ManifestImage, ImageStatus } from '../store/types';

const TERMINAL_STATUSES = new Set<ImageStatus>([
  'sorted', 'skipped', 'error', 'cleaned', 'clean_failed',
]);

export function allImagesProcessed(images: ManifestImage[]): boolean {
  return images.every(img => TERMINAL_STATUSES.has(img.status));
}

export function isTerminalStatus(status: ImageStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function canTransitionTo(from: ImageStatus, to: ImageStatus): boolean {
  switch (from) {
    case 'pending':
      return to === 'sorting' || to === 'skipped';
    case 'sorting':
      return to === 'sorted' || to === 'error' || to === 'pending';
    case 'sorted':
      return to === 'cleaned' || to === 'clean_failed';
    case 'skipped':
      return to === 'cleaned' || to === 'clean_failed' || to === 'pending';
    case 'error':
      return to === 'pending';
    case 'cleaned':
    case 'clean_failed':
      return false;
    default:
      return false;
  }
}
