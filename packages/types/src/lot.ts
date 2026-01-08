// Lot Types

export type LotSource =
  | 'MLS'
  | 'WHOLESALER'
  | 'DIRECT_MAIL'
  | 'DRIVING_FOR_DOLLARS'
  | 'REFERRAL'
  | 'OFF_MARKET'
  | 'TAX_DELINQUENT'
  | 'PROBATE'
  | 'FSBO';

export type LotStatus =
  | 'NEW'
  | 'REVIEWING'
  | 'CONTACTED'
  | 'NEGOTIATING'
  | 'UNDER_CONTRACT'
  | 'DUE_DILIGENCE'
  | 'PURCHASED'
  | 'PASSED'
  | 'LOST';

export interface LotListParams {
  status?: LotStatus[];
  minScore?: number;
  maxPrice?: number;
  source?: LotSource[];
  sortBy?: 'score' | 'price' | 'created' | 'dom';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface LotScoreRequest {
  forceRefresh?: boolean;
  includeComps?: boolean;
}

export interface ScoreBreakdownItem {
  value: number;
  weight: number;
  score: number;
}

export interface LotScoreBreakdown {
  schoolRating: ScoreBreakdownItem;
  zoning: { compatible: boolean; weight: number; score: number };
  utilities: { available: string[]; weight: number; score: number };
  comps: { avgPsf: number; count: number; weight: number; score: number };
  margin: { estimated: number; weight: number; score: number };
  motivation: { signals: string[]; weight: number; score: number };
}

export interface Comparable {
  id: string;
  address: string;
  salePrice: number;
  saleDate: Date;
  sqft: number;
  beds: number;
  baths: number;
  yearBuilt: number;
  distance: number;
  pricePerSqft: number;
}

export type LotRecommendation = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'PASS';

export interface LotScoreResponse {
  overallScore: number;
  breakdown: LotScoreBreakdown;
  comparables: Comparable[];
  recommendation: LotRecommendation;
  reasoning: string;
}

export interface LotOpportunity {
  lot: {
    id: string;
    address: string;
    city: string;
    listPrice: number | null;
    acreage: number;
    source: LotSource;
    daysOnMarket: number | null;
  };
  score: number;
  highlights: string[];
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PriceChange {
  lot: {
    id: string;
    address: string;
    city: string;
  };
  oldPrice: number;
  newPrice: number;
  daysOnMarket: number;
}

export interface ExpiringDeal {
  lot: {
    id: string;
    address: string;
    city: string;
  };
  expiresIn: number;
}

export interface DailyDigestResponse {
  date: string;
  newLots: number;
  topOpportunities: LotOpportunity[];
  priceChanges: PriceChange[];
  expiringDeals: ExpiringDeal[];
  marketInsights: string;
}

export interface LotCreateInput {
  address: string;
  city: string;
  county: string;
  state?: string;
  zip: string;
  latitude: number;
  longitude: number;
  acreage: number;
  source: LotSource;
  sourceId?: string;
  listPrice?: number;
  parcelId?: string;
  zoning?: string;
  utilities?: {
    water?: boolean;
    sewer?: boolean;
    electric?: boolean;
    gas?: boolean;
  };
  topography?: string;
}

export interface LotUpdateInput {
  status?: LotStatus;
  listPrice?: number;
  estimatedValue?: number;
  zoning?: string;
  zoningCompatible?: boolean;
  utilities?: {
    water?: boolean;
    sewer?: boolean;
    electric?: boolean;
    gas?: boolean;
  };
  topography?: string;
  sellerMotivation?: number;
}
