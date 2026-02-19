import type { SortFormData } from '../store/types';

export function buildDestinationPath(
  data: SortFormData,
): { segments: string[]; filename: string } {
  const { caseNumber, consentStatus, consentType, procedureType, surgeryDate, imageType, angle, originalFilename } = data;

  const dotIndex = originalFilename.lastIndexOf('.');
  const ext = dotIndex !== -1 ? originalFilename.slice(dotIndex).toLowerCase() : '.jpg';

  let segments: string[];
  if (consentStatus === 'consent' && consentType) {
    segments = ['consent', consentType, procedureType, surgeryDate, caseNumber];
  } else {
    segments = ['no_consent', procedureType, surgeryDate, caseNumber];
  }

  const filename = `${caseNumber}_${imageType}_${angle}${ext}`;
  return { segments, filename };
}
