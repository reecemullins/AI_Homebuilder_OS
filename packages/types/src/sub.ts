// Subcontractor Types

import type { Trade } from './build';

export type SubStatus =
  | 'PROSPECT'
  | 'VETTING'
  | 'APPROVED'
  | 'PREFERRED'
  | 'PROBATION'
  | 'BLACKLISTED';

export type PricingTier = 'BUDGET' | 'MARKET' | 'PREMIUM';

export type PaymentMethod = 'CHECK' | 'ACH' | 'ZELLE' | 'VENMO';

export type ScheduleStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export type CommType =
  | 'CONFIRMATION_48H'
  | 'CONFIRMATION_24H'
  | 'CONFIRMATION_2H'
  | 'REMINDER'
  | 'DELAY_NOTIFICATION'
  | 'RESCHEDULE'
  | 'COMPLETION_REQUEST'
  | 'PHOTO_REQUEST'
  | 'GENERAL';

export interface SubcontractorCreateInput {
  companyName: string;
  contactName: string;
  phone: string;
  email?: string;
  address?: string;
  trades: Trade[];
  crewSize?: number;
  maxConcurrent?: number;
  serviceRadius?: number;
  licenseNumber?: string;
  licenseExpiry?: Date;
  insuranceExpiry?: Date;
  insuranceAmount?: number;
  pricingTier?: PricingTier;
  preferredPayment?: PaymentMethod;
  paymentTerms?: number;
}

export interface SubcontractorUpdateInput {
  companyName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  trades?: Trade[];
  crewSize?: number;
  maxConcurrent?: number;
  serviceRadius?: number;
  licenseNumber?: string;
  licenseExpiry?: Date;
  insuranceExpiry?: Date;
  insuranceAmount?: number;
  w9OnFile?: boolean;
  pricingTier?: PricingTier;
  status?: SubStatus;
  preferredPayment?: PaymentMethod;
  paymentTerms?: number;
}

export interface SubRatingInput {
  buildId: string;
  taskId: string;
  arrivedOnTime: boolean;
  completedOnTime: boolean;
  qualityScore: number;
  communicationScore: number;
  cleanupScore: number;
  wouldRehire: boolean;
  notes?: string;
}

export interface SubRecommendRequest {
  trade: Trade;
  buildId: string;
  scheduledDate: string;
  duration: number;
  priority?: 'COST' | 'RELIABILITY' | 'SPEED';
}

export interface SubRecommendation {
  subcontractor: {
    id: string;
    companyName: string;
    contactName: string;
    phone: string;
    reliabilityScore: number;
    onTimeRate: number;
    qualityRating: number;
  };
  score: number;
  reasoning: string;
  availability: 'CONFIRMED' | 'LIKELY' | 'UNKNOWN' | 'UNAVAILABLE';
  estimatedCost: number;
  riskFactors: string[];
}

export interface SubRecommendResponse {
  recommendations: SubRecommendation[];
}

export interface ScheduleOptimizeRequest {
  buildId: string;
  constraints?: {
    fixedDates?: Array<{ taskId: string; date: string }>;
    excludeDates?: string[];
    maxConcurrentTrades?: number;
  };
  preferences?: {
    preferredSubs?: Record<string, string>;
    weatherBuffer?: boolean;
    inspectionBuffer?: number;
  };
}

export interface ScheduleRisk {
  type: 'WEATHER' | 'SUB_AVAILABILITY' | 'INSPECTION_TIMING' | 'DEPENDENCY';
  description: string;
  mitigation: string;
}

export interface ScheduleChange {
  taskId: string;
  oldDate: string;
  newDate: string;
  reason: string;
}

export interface ScheduleOptimizeResponse {
  schedule: ScheduleEntryOutput[];
  criticalPath: string[];
  totalDuration: number;
  risks: ScheduleRisk[];
  changes: ScheduleChange[];
}

export interface ScheduleEntryOutput {
  id: string;
  taskId: string | null;
  trade: Trade;
  description: string;
  scheduledDate: Date;
  scheduledTime: string | null;
  estimatedDuration: number;
  status: ScheduleStatus;
  subcontractorId: string | null;
  subcontractorName: string | null;
}

export interface ResequenceRequest {
  buildId: string;
  delayedTaskId: string;
  newCompletionDate: string;
  reason: string;
}

export interface AffectedTask {
  taskId: string;
  oldDates: { start: string; end: string };
  newDates: { start: string; end: string };
}

export interface ResequenceNotification {
  subcontractorId: string;
  type: 'RESCHEDULE' | 'DELAY_WARNING';
  message: string;
}

export interface ResequenceResponse {
  affectedTasks: AffectedTask[];
  notifications: ResequenceNotification[];
  newProjectedCompletion: string;
  daysImpact: number;
}
