// Build Types

export type BuildStatus =
  | 'PRE_CONSTRUCTION'
  | 'PERMITTING'
  | 'SITE_WORK'
  | 'FOUNDATION'
  | 'FRAMING'
  | 'ROUGH_INS'
  | 'INSULATION_DRYWALL'
  | 'FINISHES'
  | 'FINAL'
  | 'PUNCH_LIST'
  | 'COMPLETE'
  | 'SOLD';

export type TaskStatus =
  | 'NOT_STARTED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETE'
  | 'SKIPPED';

export type Trade =
  | 'GENERAL'
  | 'EXCAVATION'
  | 'CONCRETE'
  | 'FRAMING'
  | 'ROOFING'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'HVAC'
  | 'INSULATION'
  | 'DRYWALL'
  | 'PAINT'
  | 'FLOORING'
  | 'CABINETS'
  | 'COUNTERTOPS'
  | 'TILE'
  | 'TRIM'
  | 'LANDSCAPING'
  | 'CLEANING'
  | 'OTHER';

export interface BuildCreateInput {
  lotId: string;
  floorPlanId?: string;
  landCost: number;
  budgetHard: number;
  budgetSoft: number;
  projectedSalePrice?: number;
}

export interface BuildUpdateInput {
  status?: BuildStatus;
  floorPlanId?: string;
  budgetHard?: number;
  budgetSoft?: number;
  contractPrice?: number;
  projectedSalePrice?: number;
  permitSubmitted?: Date;
  permitApproved?: Date;
  startDate?: Date;
  estimatedComplete?: Date;
  actualComplete?: Date;
  closingDate?: Date;
}

export interface BuildTaskCreateInput {
  name: string;
  phase: BuildStatus;
  trade: Trade;
  duration: number;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  subcontractorId?: string;
  dependencies?: string[];
  budgetAmount?: number;
  notes?: string;
}

export interface BuildTaskUpdateInput {
  name?: string;
  phase?: BuildStatus;
  trade?: Trade;
  status?: TaskStatus;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  subcontractorId?: string;
  dependencies?: string[];
  blockedBy?: string[];
  budgetAmount?: number;
  actualAmount?: number;
  notes?: string;
}

export interface BuildFinancials {
  landCost: number;
  budgetHard: number;
  budgetSoft: number;
  budgetTotal: number;
  actualHard: number;
  actualSoft: number;
  actualTotal: number;
  variance: number;
  percentComplete: number;
  projectedSalePrice: number | null;
  projectedMargin: number | null;
  contractPrice: number | null;
}

export interface GanttTask {
  id: string;
  name: string;
  phase: BuildStatus;
  trade: Trade;
  start: Date;
  end: Date;
  progress: number;
  dependencies: string[];
  subcontractorName?: string;
  isCriticalPath: boolean;
}

export interface BuildTimeline {
  tasks: GanttTask[];
  criticalPath: string[];
  totalDuration: number;
  percentComplete: number;
  estimatedComplete: Date | null;
  daysRemaining: number | null;
}
