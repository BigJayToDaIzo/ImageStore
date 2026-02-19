export interface Settings {
  defaults: {
    procedure: string;
    imageType: string;
    angle: string;
    defaultPatientAge: number;
    surgeon: string;
  };
}

export interface Procedure {
  id: string;
  name: string;
  favorite: boolean;
}

export interface Surgeon {
  id: string;
  name: string;
}

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

export type PatientInput = Pick<
  Patient,
  'case_number' | 'first_name' | 'last_name' | 'dob' | 'surgery_date' | 'primary_procedure' | 'surgeon'
>;

export type ImageStatus = 'pending' | 'sorting' | 'sorted' | 'skipped' | 'error' | 'cleaned' | 'clean_failed';
export type ManifestStatus = 'in_progress' | 'confirming' | 'cleaning' | 'completed' | 'abandoned';

export interface ManifestImage {
  filename: string;
  sourceHash: string;
  status: ImageStatus;
  destinationSegments: string[] | null;
  destinationFilename: string | null;
  destinationHash: string | null;
  patientRecordSaved: boolean;
  sourceDeleted: boolean;
  sortedAt: string | null;
  skipReason?: string;
}

export interface Manifest {
  id: string;
  createdAt: string;
  status: ManifestStatus;
  totalImages: number;
  images: ManifestImage[];
}

export interface SortFormData {
  caseNumber: string;
  consentStatus: 'no_consent' | 'consent';
  consentType?: 'hipaa' | 'social_media';
  procedureType: string;
  surgeryDate: string;
  imageType: string;
  angle: string;
  originalFilename: string;
}

export interface SortResult {
  hash: string;
  destPath: string[];
}

export interface CleanupResult {
  cleanedCount: number;
  failedCount: number;
  warnings: string[];
}

export interface SourceImage {
  name: string;
  handle: FileSystemFileHandle;
}
