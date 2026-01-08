import { prisma } from '@builderos/database';
import { LotService } from '../services/lot.service';

const lotService = new LotService();

export const lotJobHandlers = {
  async importMLS(): Promise<void> {
    console.log('Importing MLS listings...');
    // In production, would connect to MLS API and import new listings
    // For now, log placeholder
    console.log('MLS import complete');
  },

  async scoreNewLots(): Promise<void> {
    console.log('Scoring new lots...');

    // Find lots without scores
    const unscoredLots = await prisma.lot.findMany({
      where: { overallScore: null },
      select: { id: true, organizationId: true },
    });

    console.log(`Found ${unscoredLots.length} lots to score`);

    for (const lot of unscoredLots) {
      try {
        await lotService.scoreLot(lot.id, lot.organizationId);
        console.log(`Scored lot ${lot.id}`);
      } catch (error) {
        console.error(`Error scoring lot ${lot.id}:`, error);
      }
    }

    console.log('Lot scoring complete');
  },

  async generateDailyDigest(): Promise<void> {
    console.log('Generating daily digests...');

    // Get all organizations
    const orgs = await prisma.organization.findMany({
      select: { id: true },
    });

    for (const org of orgs) {
      try {
        const digest = await lotService.generateDailyDigest(org.id);
        console.log(`Generated digest for org ${org.id}: ${digest.topOpportunities.length} opportunities`);
        // In production, would send email/notification with digest
      } catch (error) {
        console.error(`Error generating digest for org ${org.id}:`, error);
      }
    }

    console.log('Daily digest generation complete');
  },

  async refreshComparables(): Promise<void> {
    console.log('Refreshing comparables...');

    // Find lots with outdated comps (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const lotsToRefresh = await prisma.lot.findMany({
      where: {
        status: { in: ['NEW', 'REVIEWING', 'CONTACTED', 'NEGOTIATING'] },
        comparables: {
          none: {
            createdAt: { gte: thirtyDaysAgo },
          },
        },
      },
      select: { id: true },
    });

    console.log(`Found ${lotsToRefresh.length} lots needing comp refresh`);
    // In production, would fetch new comparables from data provider

    console.log('Comparable refresh complete');
  },
};
