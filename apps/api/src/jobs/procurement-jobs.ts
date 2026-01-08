import { prisma, SupplierCategory } from '@builderos/database';

export const procurementJobHandlers = {
  async trackPrices(): Promise<void> {
    console.log('Tracking material prices...');

    // In production, would fetch prices from suppliers/market data
    // For now, simulate with sample materials
    const materials = [
      { material: 'lumber_2x4_8ft', category: 'LUMBER' as SupplierCategory, price: 4.50, unit: 'each' },
      { material: 'lumber_2x6_8ft', category: 'LUMBER' as SupplierCategory, price: 6.00, unit: 'each' },
      { material: 'osb_7/16_4x8', category: 'LUMBER' as SupplierCategory, price: 12.00, unit: 'sheet' },
      { material: 'ready_mix_3000psi', category: 'CONCRETE' as SupplierCategory, price: 125.00, unit: 'yard' },
      { material: 'arch_shingles', category: 'ROOFING' as SupplierCategory, price: 35.00, unit: 'bundle' },
    ];

    for (const material of materials) {
      // Add slight random variation to simulate market movement
      const variation = (Math.random() - 0.5) * 0.1; // +/- 5%
      const price = material.price * (1 + variation);

      await prisma.materialPrice.create({
        data: {
          material: material.material,
          category: material.category,
          region: 'atlanta',
          price: Math.round(price * 100) / 100,
          unit: material.unit,
          source: 'market',
        },
      });
    }

    console.log(`Tracked prices for ${materials.length} materials`);
  },

  async checkAlerts(): Promise<void> {
    console.log('Checking price alerts...');

    // Get materials with significant price changes
    const materials = ['lumber_2x4_8ft', 'osb_7/16_4x8', 'ready_mix_3000psi'];

    for (const material of materials) {
      // Get latest and previous prices
      const prices = await prisma.materialPrice.findMany({
        where: { material },
        orderBy: { recordedAt: 'desc' },
        take: 2,
      });

      if (prices.length < 2) continue;

      const [latest, previous] = prices;
      const changePercent = ((latest.price - previous.price) / previous.price) * 100;

      if (Math.abs(changePercent) >= 5) {
        console.log(
          `Alert: ${material} price ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(changePercent).toFixed(1)}%`
        );
        // In production, would send notifications to relevant users
      }
    }

    console.log('Price alert check complete');
  },

  async generateBulkOrderSuggestions(): Promise<void> {
    console.log('Generating bulk order suggestions...');

    // Find builds starting in next 30 days that might benefit from consolidated orders
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const builds = await prisma.build.findMany({
      where: {
        startDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
        status: { in: ['PRE_CONSTRUCTION', 'PERMITTING'] },
      },
      select: { id: true, organizationId: true },
    });

    // Group by organization
    const orgBuilds = new Map<string, string[]>();
    for (const build of builds) {
      const existing = orgBuilds.get(build.organizationId) || [];
      existing.push(build.id);
      orgBuilds.set(build.organizationId, existing);
    }

    // Suggest consolidation for orgs with multiple builds
    for (const [orgId, buildIds] of orgBuilds) {
      if (buildIds.length >= 2) {
        console.log(
          `Org ${orgId}: ${buildIds.length} builds could benefit from consolidated orders`
        );
        // In production, would create suggestions/notifications
      }
    }

    console.log('Bulk order suggestion generation complete');
  },
};
