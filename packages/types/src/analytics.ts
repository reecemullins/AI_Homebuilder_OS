// Analytics Types

export type TimeCategory =
  | 'SUB_COORDINATION'
  | 'PROCUREMENT'
  | 'INSPECTIONS'
  | 'SITE_VISITS'
  | 'ADMIN'
  | 'SALES'
  | 'LAND_SOURCING'
  | 'PLANNING'
  | 'OTHER';

export interface TimeEntryCreateInput {
  buildId?: string;
  category: TimeCategory;
  subcategory?: string;
  startTime: Date;
  endTime?: Date;
  description?: string;
}

export interface TimeEntryUpdateInput {
  category?: TimeCategory;
  subcategory?: string;
  endTime?: Date;
  duration?: number;
  description?: string;
}

export interface DashboardMetrics {
  activeLots: number;
  activeBuilds: number;
  scheduledInspections: number;
  upcomingDeadlines: number;
  lotsThisMonth: number;
  buildsPipeline: {
    preConstruction: number;
    inProgress: number;
    punchList: number;
    complete: number;
  };
  financials: {
    totalBudget: number;
    totalSpent: number;
    projectedRevenue: number;
    projectedMargin: number;
  };
  subPerformance: {
    avgReliability: number;
    avgOnTime: number;
    scheduledThisWeek: number;
  };
}

export interface TimeAnalysis {
  period: string;
  totalHours: number;
  byCategory: Record<TimeCategory, number>;
  byBuild: Array<{
    buildId: string;
    address: string;
    hours: number;
  }>;
  trends: Array<{
    date: string;
    hours: number;
  }>;
}

export interface MarginAnalysis {
  period: string;
  builds: Array<{
    buildId: string;
    address: string;
    landCost: number;
    hardCosts: number;
    softCosts: number;
    totalCost: number;
    salePrice: number | null;
    grossMargin: number | null;
    marginPercent: number | null;
    status: string;
  }>;
  averageMargin: number;
  totalRevenue: number;
  totalProfit: number;
}

export interface SubPerformanceReport {
  period: string;
  subcontractors: Array<{
    id: string;
    companyName: string;
    trades: string[];
    jobsCompleted: number;
    reliabilityScore: number;
    onTimeRate: number;
    qualityRating: number;
    avgJobCost: number;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  }>;
  tradePerformance: Record<string, {
    avgReliability: number;
    avgOnTime: number;
    avgQuality: number;
    topPerformer: string;
  }>;
}
