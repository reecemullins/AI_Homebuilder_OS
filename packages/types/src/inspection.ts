// Inspection Types

export type InspectionType =
  | 'FOOTING'
  | 'FOUNDATION'
  | 'SLAB'
  | 'FRAMING'
  | 'ROUGH_ELECTRICAL'
  | 'ROUGH_PLUMBING'
  | 'ROUGH_HVAC'
  | 'INSULATION'
  | 'DRYWALL'
  | 'FINAL_ELECTRICAL'
  | 'FINAL_PLUMBING'
  | 'FINAL_HVAC'
  | 'FINAL_BUILDING'
  | 'CERTIFICATE_OF_OCCUPANCY';

export type InspectionStatus =
  | 'NOT_SCHEDULED'
  | 'SCHEDULED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'FAILED'
  | 'PARTIAL'
  | 'RESCHEDULED';

export type InspectionResult = 'PASS' | 'FAIL' | 'PARTIAL' | 'CORRECTION_REQUIRED';

export interface InspectionCreateInput {
  buildId: string;
  type: InspectionType;
  jurisdiction: string;
  scheduledDate?: Date;
  scheduledTime?: string;
  inspectorId?: string;
}

export interface InspectionUpdateInput {
  scheduledDate?: Date;
  scheduledTime?: string;
  inspectorId?: string;
  status?: InspectionStatus;
  result?: InspectionResult;
  failedItems?: Array<{
    itemId: string;
    description: string;
    correctionRequired: string;
  }>;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  description: string;
  required: boolean;
  commonFailReason?: string;
  codeReference?: string;
  photoRequired?: boolean;
}

export interface InspectionChecklist {
  id: string;
  jurisdiction: string;
  type: InspectionType;
  version: number;
  items: ChecklistItem[];
}

export interface PreAuditRequest {
  inspectionId: string;
  photos?: string[];
}

export interface PreAuditIssue {
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  category: string;
  description: string;
  location?: string;
  photoUrl?: string;
  remediation: string;
  estimatedFixTime: number;
}

export interface PreAuditResponse {
  readinessScore: number;
  passLikelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  issues: PreAuditIssue[];
  checklistCompletion: {
    total: number;
    verified: number;
    unverified: number;
    failed: number;
  };
  recommendations: string[];
}

export interface PhotoAnalyzeRequest {
  photoUrl: string;
  inspectionType: InspectionType;
  context?: string;
}

export interface PhotoIssue {
  confidence: number;
  category: string;
  description: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'NONE';
}

export interface PhotoAnalyzeResponse {
  issues: PhotoIssue[];
  passable: boolean;
  notes: string;
}
