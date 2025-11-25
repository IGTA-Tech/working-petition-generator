export type VisaType = 'O-1A' | 'O-1B' | 'P-1A' | 'EB-1A';

export interface UploadedFileData {
  fileName: string;
  fileType: string;
  blobUrl: string;
  wordCount: number;
  pageCount?: number;
  summary: string;
}

export type BriefMode = 'standard' | 'comprehensive';

export interface BeneficiaryInfo {
  fullName: string;
  visaType: VisaType;
  fieldOfProfession: string;
  background: string;
  primaryUrls: string[];
  uploadedFiles: UploadedFileData[];
  additionalInfo: string;
  recipientEmail: string;
  petitionerName?: string;
  itinerary?: string;
  briefMode?: BriefMode; // Generation mode selection
  // Legacy/alias fields for compatibility
  fieldOfExpertise?: string; // alias for fieldOfProfession
  urls?: string[]; // alias for primaryUrls
  jobTitle?: string; // professional title/descriptor
  occupation?: string; // occupation/role
  nationality?: string; // country of origin
}

export interface GenerationProgress {
  stage: string;
  progress: number;
  message: string;
  currentDocument?: string;
}

export interface GeneratedDocument {
  id: string;
  name: string;
  content: string;
  pageCount: number;
  timestamp: Date;
}

export interface PetitionCase {
  id: string;
  beneficiaryInfo: BeneficiaryInfo;
  documents: GeneratedDocument[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}
