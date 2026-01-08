import { prisma } from '@builderos/database';
import { AnalyticsService } from '../services/analytics.service';

const analyticsService = new AnalyticsService();

export const analyticsJobHandlers = {
  async calculateDailyMetrics(): Promise<void> {
    console.log('Calculating daily metrics...');

    const orgs = await prisma.organization.findMany({
      select: { id: true },
    });

    for (const org of orgs) {
      try {
        const metrics = await analyticsService.getDashboardMetrics(org.id);

        // Log metrics for monitoring
        console.log(`Org ${org.id} metrics:`, {
          activeLots: metrics.activeLots,
          activeBuilds: metrics.activeBuilds,
          scheduledInspections: metrics.scheduledInspections,
          projectedMargin: metrics.financials.projectedMargin,
        });

        // In production, could store historical metrics for trend analysis
        // await prisma.dailyMetrics.create({ data: { orgId: org.id, ...metrics } });
      } catch (error) {
        console.error(`Error calculating metrics for org ${org.id}:`, error);
      }
    }

    console.log('Daily metrics calculation complete');
  },

  async runMarginAnalysis(): Promise<void> {
    console.log('Running margin analysis...');

    const orgs = await prisma.organization.findMany({
      select: { id: true },
    });

    for (const org of orgs) {
      try {
        // Get last 12 months of data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12);

        const analysis = await analyticsService.getMarginAnalysis(
          org.id,
          startDate,
          endDate
        );

        console.log(`Org ${org.id} margin analysis:`, {
          buildsAnalyzed: analysis.builds.length,
          avgMargin: (analysis.averageMargin * 100).toFixed(1) + '%',
          totalRevenue: analysis.totalRevenue,
          totalProfit: analysis.totalProfit,
        });

        // Flag builds with poor margins
        const poorMarginBuilds = analysis.builds.filter(
          (b) => b.marginPercent !== null && b.marginPercent < 0.15
        );

        if (poorMarginBuilds.length > 0) {
          console.log(
            `Warning: ${poorMarginBuilds.length} builds with margin below 15%`
          );
          // In production, would send alerts
        }
      } catch (error) {
        console.error(`Error running margin analysis for org ${org.id}:`, error);
      }
    }

    console.log('Margin analysis complete');
  },

  async generatePerformanceReport(): Promise<void> {
    console.log('Generating performance reports...');

    const orgs = await prisma.organization.findMany({
      select: { id: true },
    });

    for (const org of orgs) {
      try {
        const subReport = await analyticsService.getSubPerformanceReport(org.id);

        // Identify top performers
        const topPerformers = subReport.subcontractors
          .filter((s) => s.reliabilityScore >= 0.85)
          .slice(0, 5);

        // Identify subs needing attention
        const needsAttention = subReport.subcontractors.filter(
          (s) => s.reliabilityScore < 0.6 || s.trend === 'DECLINING'
        );

        console.log(`Org ${org.id} sub performance:`, {
          totalSubs: subReport.subcontractors.length,
          topPerformers: topPerformers.length,
          needsAttention: needsAttention.length,
        });

        // In production, would generate and email detailed report
      } catch (error) {
        console.error(
          `Error generating performance report for org ${org.id}:`,
          error
        );
      }
    }

    console.log('Performance report generation complete');
  },
};
