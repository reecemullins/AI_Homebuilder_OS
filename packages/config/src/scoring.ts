// Lot Scoring Configuration

export interface LotScoringConfig {
  weights: {
    schoolRating: number;
    zoningCompatibility: number;
    utilityAvailability: number;
    compScore: number;
    marginEstimate: number;
    sellerMotivation: number;
  };
  thresholds: {
    minSchoolRating: number;
    minMargin: number;
    maxDaysOnMarket: number;
    maxPrice: number;
  };
}

export const defaultScoringConfig: LotScoringConfig = {
  weights: {
    schoolRating: 0.15,
    zoningCompatibility: 0.20,
    utilityAvailability: 0.15,
    compScore: 0.20,
    marginEstimate: 0.20,
    sellerMotivation: 0.10,
  },
  thresholds: {
    minSchoolRating: 5,
    minMargin: 0.18,
    maxDaysOnMarket: 180,
    maxPrice: 150000, // varies by market
  },
};

// Schedule Optimization Configuration
export interface ScheduleConfig {
  defaultBuffer: {
    beforeInspection: number; // days
    weatherBuffer: number; // days
  };
  maxConcurrentTrades: number;
  confirmationSchedule: {
    hours48: boolean;
    hours24: boolean;
    hours2: boolean;
  };
}

export const defaultScheduleConfig: ScheduleConfig = {
  defaultBuffer: {
    beforeInspection: 1,
    weatherBuffer: 1,
  },
  maxConcurrentTrades: 3,
  confirmationSchedule: {
    hours48: true,
    hours24: true,
    hours2: true,
  },
};

// Sub Reliability Configuration
export interface ReliabilityConfig {
  weights: {
    onTime: number;
    quality: number;
    response: number;
    rehire: number;
  };
  recencyDecayFactor: number;
  minJobsForRating: number;
}

export const defaultReliabilityConfig: ReliabilityConfig = {
  weights: {
    onTime: 0.35,
    quality: 0.30,
    response: 0.20,
    rehire: 0.15,
  },
  recencyDecayFactor: 0.9,
  minJobsForRating: 3,
};

// Build Phases and Default Durations
export const defaultPhaseDurations: Record<string, number> = {
  PRE_CONSTRUCTION: 14,
  PERMITTING: 30,
  SITE_WORK: 5,
  FOUNDATION: 7,
  FRAMING: 14,
  ROUGH_INS: 10,
  INSULATION_DRYWALL: 14,
  FINISHES: 21,
  FINAL: 7,
  PUNCH_LIST: 5,
};

// Inspection Type to Build Phase Mapping
export const inspectionPhaseMap: Record<string, string> = {
  FOOTING: 'FOUNDATION',
  FOUNDATION: 'FOUNDATION',
  SLAB: 'FOUNDATION',
  FRAMING: 'FRAMING',
  ROUGH_ELECTRICAL: 'ROUGH_INS',
  ROUGH_PLUMBING: 'ROUGH_INS',
  ROUGH_HVAC: 'ROUGH_INS',
  INSULATION: 'INSULATION_DRYWALL',
  DRYWALL: 'INSULATION_DRYWALL',
  FINAL_ELECTRICAL: 'FINAL',
  FINAL_PLUMBING: 'FINAL',
  FINAL_HVAC: 'FINAL',
  FINAL_BUILDING: 'FINAL',
  CERTIFICATE_OF_OCCUPANCY: 'COMPLETE',
};
