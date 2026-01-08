import { prisma, TimeCategory } from '@builderos/database';
import type { DashboardMetrics, TimeAnalysis, MarginAnalysis, SubPerformanceReport } from '@builderos/types';

export class AnalyticsService {
  async getDashboardMetrics(organizationId: string): Promise<DashboardMetrics> {
    // Get counts
    const [
      activeLots,
      activeBuilds,
      scheduledInspections,
      buildsByStatus,
      financials,
      subMetrics,
    ] = await Promise.all([
      // Active lots
      prisma.lot.count({
        where: { organizationId, status: { in: ['NEW', 'REVIEWING', 'CONTACTED', 'NEGOTIATING'] } },
      }),

      // Active builds
      prisma.build.count({
        where: { organizationId, status: { notIn: ['COMPLETE', 'SOLD'] } },
      }),

      // Scheduled inspections in next 7 days
      prisma.inspection.count({
        where: {
          build: { organizationId },
          status: 'SCHEDULED',
          scheduledDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Builds by status
      prisma.build.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),

      // Financial totals
      prisma.build.aggregate({
        where: { organizationId },
        _sum: {
          budgetTotal: true,
          actualHard: true,
          actualSoft: true,
          projectedSalePrice: true,
        },
      }),

      // Sub metrics
      prisma.subcontractor.aggregate({
        where: { organizationId, status: { in: ['APPROVED', 'PREFERRED'] } },
        _avg: {
          reliabilityScore: true,
          onTimeRate: true,
        },
      }),
    ]);

    // Calculate builds pipeline
    const statusMap = new Map(buildsByStatus.map(s => [s.status, s._count]));

    // Count upcoming deadlines (tasks in next 7 days)
    const upcomingDeadlines = await prisma.buildTask.count({
      where: {
        build: { organizationId },
        status: { notIn: ['COMPLETE', 'SKIPPED'] },
        scheduledEnd: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Count lots this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const lotsThisMonth = await prisma.lot.count({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth },
      },
    });

    // Count scheduled entries this week
    const scheduledThisWeek = await prisma.scheduleEntry.count({
      where: {
        build: { organizationId },
        scheduledDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const totalSpent = (financials._sum.actualHard || 0) + (financials._sum.actualSoft || 0);
    const projectedRevenue = financials._sum.projectedSalePrice || 0;

    return {
      activeLots,
      activeBuilds,
      scheduledInspections,
      upcomingDeadlines,
      lotsThisMonth,
      buildsPipeline: {
        preConstruction: statusMap.get('PRE_CONSTRUCTION') || 0,
        inProgress: (statusMap.get('SITE_WORK') || 0) +
          (statusMap.get('FOUNDATION') || 0) +
          (statusMap.get('FRAMING') || 0) +
          (statusMap.get('ROUGH_INS') || 0) +
          (statusMap.get('INSULATION_DRYWALL') || 0) +
          (statusMap.get('FINISHES') || 0) +
          (statusMap.get('FINAL') || 0),
        punchList: statusMap.get('PUNCH_LIST') || 0,
        complete: (statusMap.get('COMPLETE') || 0) + (statusMap.get('SOLD') || 0),
      },
      financials: {
        totalBudget: financials._sum.budgetTotal || 0,
        totalSpent,
        projectedRevenue,
        projectedMargin: projectedRevenue > 0
          ? (projectedRevenue - totalSpent) / projectedRevenue
          : 0,
      },
      subPerformance: {
        avgReliability: subMetrics._avg.reliabilityScore || 0.5,
        avgOnTime: subMetrics._avg.onTimeRate || 0.5,
        scheduledThisWeek,
      },
    };
  }

  async getTimeAnalysis(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
    buildId?: string
  ): Promise<TimeAnalysis> {
    // Get users for this org
    const users = await prisma.user.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const userIds = users.map(u => u.id);

    const where: Record<string, unknown> = {
      userId: { in: userIds },
    };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        (where.startTime as Record<string, unknown>).gte = startDate;
      }
      if (endDate) {
        (where.startTime as Record<string, unknown>).lte = endDate;
      }
    }

    if (buildId) {
      where.buildId = buildId;
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { name: true } },
      },
    });

    // Calculate totals
    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

    // Group by category
    const byCategory: Record<TimeCategory, number> = {
      SUB_COORDINATION: 0,
      PROCUREMENT: 0,
      INSPECTIONS: 0,
      SITE_VISITS: 0,
      ADMIN: 0,
      SALES: 0,
      LAND_SOURCING: 0,
      PLANNING: 0,
      OTHER: 0,
    };

    for (const entry of entries) {
      byCategory[entry.category] += (entry.duration || 0) / 60;
    }

    // Round values
    for (const key of Object.keys(byCategory)) {
      byCategory[key as TimeCategory] = Math.round(byCategory[key as TimeCategory] * 10) / 10;
    }

    // Group by build
    const buildMap = new Map<string, { hours: number; address?: string }>();
    for (const entry of entries) {
      if (entry.buildId) {
        const existing = buildMap.get(entry.buildId) || { hours: 0 };
        existing.hours += (entry.duration || 0) / 60;
        buildMap.set(entry.buildId, existing);
      }
    }

    // Get build addresses
    const buildIds = Array.from(buildMap.keys());
    const builds = await prisma.build.findMany({
      where: { id: { in: buildIds } },
      include: { lot: { select: { address: true } } },
    });

    const byBuild = builds.map(b => ({
      buildId: b.id,
      address: b.lot.address,
      hours: Math.round((buildMap.get(b.id)?.hours || 0) * 10) / 10,
    })).sort((a, b) => b.hours - a.hours);

    // Generate daily trends
    const trends: Array<{ date: string; hours: number }> = [];
    const dateMap = new Map<string, number>();

    for (const entry of entries) {
      const date = entry.startTime.toISOString().split('T')[0];
      const existing = dateMap.get(date) || 0;
      dateMap.set(date, existing + (entry.duration || 0) / 60);
    }

    for (const [date, hours] of dateMap) {
      trends.push({ date, hours: Math.round(hours * 10) / 10 });
    }
    trends.sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: startDate && endDate
        ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        : 'All time',
      totalHours,
      byCategory,
      byBuild,
      trends,
    };
  }

  async getMarginAnalysis(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<MarginAnalysis> {
    const where: Record<string, unknown> = { organizationId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = startDate;
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = endDate;
      }
    }

    const builds = await prisma.build.findMany({
      where,
      include: {
        lot: { select: { address: true } },
      },
    });

    const analysisBuilds = builds.map(build => {
      const totalCost = build.landCost + build.actualHard + build.actualSoft;
      const salePrice = build.contractPrice || build.projectedSalePrice;
      const grossMargin = salePrice ? salePrice - totalCost : null;
      const marginPercent = salePrice && salePrice > 0 ? grossMargin! / salePrice : null;

      return {
        buildId: build.id,
        address: build.lot.address,
        landCost: build.landCost,
        hardCosts: build.actualHard,
        softCosts: build.actualSoft,
        totalCost,
        salePrice,
        grossMargin,
        marginPercent,
        status: build.status,
      };
    });

    // Calculate averages
    const completedBuilds = analysisBuilds.filter(b => b.marginPercent !== null);
    const averageMargin = completedBuilds.length > 0
      ? completedBuilds.reduce((sum, b) => sum + (b.marginPercent || 0), 0) / completedBuilds.length
      : 0;

    const totalRevenue = analysisBuilds.reduce((sum, b) => sum + (b.salePrice || 0), 0);
    const totalProfit = analysisBuilds.reduce((sum, b) => sum + (b.grossMargin || 0), 0);

    return {
      period: startDate && endDate
        ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        : 'All time',
      builds: analysisBuilds,
      averageMargin,
      totalRevenue,
      totalProfit,
    };
  }

  async getSubPerformanceReport(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SubPerformanceReport> {
    const where: Record<string, unknown> = { organizationId };

    const subs = await prisma.subcontractor.findMany({
      where,
      include: {
        ratings: {
          where: startDate || endDate ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          } : {},
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    const subcontractors = subs.map(sub => {
      // Calculate trend (simplified)
      const recentRatings = sub.ratings.slice(0, 5);
      const olderRatings = sub.ratings.slice(5, 10);

      let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
      if (recentRatings.length > 0 && olderRatings.length > 0) {
        const recentAvg = recentRatings.reduce((sum, r) => sum + r.qualityScore, 0) / recentRatings.length;
        const olderAvg = olderRatings.reduce((sum, r) => sum + r.qualityScore, 0) / olderRatings.length;

        if (recentAvg > olderAvg + 0.5) {
          trend = 'IMPROVING';
        } else if (recentAvg < olderAvg - 0.5) {
          trend = 'DECLINING';
        }
      }

      return {
        id: sub.id,
        companyName: sub.companyName,
        trades: sub.trades,
        jobsCompleted: sub.completedJobs,
        reliabilityScore: sub.reliabilityScore,
        onTimeRate: sub.onTimeRate,
        qualityRating: sub.qualityRating,
        avgJobCost: 0, // Would need to calculate from actual task costs
        trend,
      };
    });

    // Calculate trade performance
    const tradePerformance: Record<string, {
      avgReliability: number;
      avgOnTime: number;
      avgQuality: number;
      topPerformer: string;
    }> = {};

    const tradeMap = new Map<string, typeof subcontractors>();

    for (const sub of subcontractors) {
      for (const trade of sub.trades) {
        if (!tradeMap.has(trade)) {
          tradeMap.set(trade, []);
        }
        tradeMap.get(trade)!.push(sub);
      }
    }

    for (const [trade, tradeSubs] of tradeMap) {
      const avgReliability = tradeSubs.reduce((sum, s) => sum + s.reliabilityScore, 0) / tradeSubs.length;
      const avgOnTime = tradeSubs.reduce((sum, s) => sum + s.onTimeRate, 0) / tradeSubs.length;
      const avgQuality = tradeSubs.reduce((sum, s) => sum + s.qualityRating, 0) / tradeSubs.length;

      const topPerformer = tradeSubs.sort((a, b) => b.reliabilityScore - a.reliabilityScore)[0];

      tradePerformance[trade] = {
        avgReliability,
        avgOnTime,
        avgQuality,
        topPerformer: topPerformer?.companyName || 'N/A',
      };
    }

    return {
      period: startDate && endDate
        ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        : 'All time',
      subcontractors,
      tradePerformance,
    };
  }
}
