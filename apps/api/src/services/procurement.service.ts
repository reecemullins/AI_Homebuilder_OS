import { prisma, SupplierCategory } from '@builderos/database';
import type { PriceForecast, ConsolidatedOrder } from '@builderos/types';

export class ProcurementService {
  async getPriceForecast(material: string, days: number = 30): Promise<PriceForecast> {
    // Get historical prices
    const history = await prisma.materialPrice.findMany({
      where: { material: { contains: material, mode: 'insensitive' } },
      orderBy: { recordedAt: 'desc' },
      take: 365,
    });

    if (history.length === 0) {
      return {
        material,
        currentPrice: 0,
        forecastedPrice: 0,
        confidenceLow: 0,
        confidenceHigh: 0,
        recommendation: 'MONITOR',
        factors: ['Insufficient historical data'],
        forecastDays: days,
      };
    }

    const currentPrice = history[0].price;

    // Calculate trend
    const trend = this.calculateTrend(history);

    // Simple forecast based on trend
    const forecastedPrice = currentPrice * (1 + trend.direction * trend.percentage / 100);

    // Calculate confidence interval (simplified)
    const volatility = this.calculateVolatility(history);
    const confidenceLow = forecastedPrice * (1 - volatility);
    const confidenceHigh = forecastedPrice * (1 + volatility);

    // Determine recommendation
    let recommendation: 'LOCK_NOW' | 'WAIT' | 'MONITOR';
    if (trend.direction > 0 && trend.percentage > 5) {
      recommendation = 'LOCK_NOW';
    } else if (trend.direction < 0 && trend.percentage > 5) {
      recommendation = 'WAIT';
    } else {
      recommendation = 'MONITOR';
    }

    // Identify factors
    const factors = this.identifyFactors(trend, volatility, history.length);

    return {
      material,
      currentPrice,
      forecastedPrice: Math.round(forecastedPrice * 100) / 100,
      confidenceLow: Math.round(confidenceLow * 100) / 100,
      confidenceHigh: Math.round(confidenceHigh * 100) / 100,
      recommendation,
      factors,
      forecastDays: days,
    };
  }

  async generateConsolidatedOrder(
    buildIds: string[],
    category: SupplierCategory,
    organizationId: string
  ): Promise<ConsolidatedOrder> {
    // Verify builds belong to org
    const builds = await prisma.build.findMany({
      where: {
        id: { in: buildIds },
        organizationId,
      },
      include: {
        lot: { select: { address: true } },
      },
    });

    if (builds.length === 0) {
      throw new Error('No valid builds found');
    }

    // Get suppliers for this category
    const suppliers = await prisma.supplier.findMany({
      where: { organizationId, category },
      orderBy: { onTimeRate: 'desc' },
    });

    if (suppliers.length === 0) {
      throw new Error('No suppliers found for this category');
    }

    const primarySupplier = suppliers[0];

    // Get material needs (simplified - in production would analyze build plans)
    const materialNeeds = this.estimateMaterialNeeds(category, builds.length);

    // Calculate totals
    const subtotal = materialNeeds.reduce((sum, item) => sum + item.total, 0);

    // Calculate volume discount
    const volumeDiscounts = (primarySupplier.volumeDiscounts as Array<{ threshold: number; discountPct: number }>) || [];
    let discountPct = 0;
    for (const discount of volumeDiscounts) {
      if (subtotal >= discount.threshold) {
        discountPct = Math.max(discountPct, discount.discountPct);
      }
    }
    const volumeDiscount = subtotal * (discountPct / 100);
    const total = subtotal - volumeDiscount;

    // Calculate individual order cost for savings comparison
    const individualCost = subtotal * 1.1; // Assume 10% higher without consolidation
    const projectedSavings = individualCost - total;

    return {
      supplierId: primarySupplier.id,
      supplierName: primarySupplier.name,
      items: materialNeeds.map(item => ({
        ...item,
        builds: buildIds,
      })),
      subtotal,
      volumeDiscount,
      total,
      recommendedOrderDate: this.calculateOptimalOrderDate(builds),
      projectedSavings,
    };
  }

  private calculateTrend(history: Array<{ price: number; recordedAt: Date }>): {
    direction: number;
    percentage: number;
  } {
    if (history.length < 2) {
      return { direction: 0, percentage: 0 };
    }

    const recent = history.slice(0, Math.min(30, history.length));
    const oldest = recent[recent.length - 1].price;
    const newest = recent[0].price;

    if (oldest === 0) {
      return { direction: 0, percentage: 0 };
    }

    const change = (newest - oldest) / oldest;
    return {
      direction: change > 0 ? 1 : change < 0 ? -1 : 0,
      percentage: Math.abs(change * 100),
    };
  }

  private calculateVolatility(history: Array<{ price: number }>): number {
    if (history.length < 2) return 0.1;

    const prices = history.map(h => h.price);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    return mean > 0 ? stdDev / mean : 0.1;
  }

  private identifyFactors(
    trend: { direction: number; percentage: number },
    volatility: number,
    dataPoints: number
  ): string[] {
    const factors: string[] = [];

    if (trend.direction > 0 && trend.percentage > 5) {
      factors.push('Upward price trend detected');
    } else if (trend.direction < 0 && trend.percentage > 5) {
      factors.push('Downward price trend detected');
    } else {
      factors.push('Prices relatively stable');
    }

    if (volatility > 0.15) {
      factors.push('High price volatility');
    } else if (volatility < 0.05) {
      factors.push('Low price volatility');
    }

    if (dataPoints < 30) {
      factors.push('Limited historical data available');
    }

    // Seasonal factors (simplified)
    const month = new Date().getMonth();
    if (month >= 3 && month <= 8) {
      factors.push('Peak construction season may affect demand');
    }

    return factors;
  }

  private estimateMaterialNeeds(
    category: SupplierCategory,
    buildCount: number
  ): Array<{ material: string; totalQty: number; unitPrice: number; total: number }> {
    // Simplified material estimates by category
    const estimates: Record<SupplierCategory, Array<{ material: string; qtyPerBuild: number; unitPrice: number }>> = {
      LUMBER: [
        { material: '2x4x8 SPF', qtyPerBuild: 500, unitPrice: 4.50 },
        { material: '2x6x8 SPF', qtyPerBuild: 200, unitPrice: 6.00 },
        { material: '2x10x16', qtyPerBuild: 50, unitPrice: 18.00 },
        { material: 'OSB 7/16 4x8', qtyPerBuild: 100, unitPrice: 12.00 },
        { material: 'Plywood 3/4 4x8', qtyPerBuild: 30, unitPrice: 45.00 },
      ],
      CONCRETE: [
        { material: 'Ready Mix 3000 PSI', qtyPerBuild: 50, unitPrice: 125.00 },
        { material: 'Rebar #4', qtyPerBuild: 100, unitPrice: 8.00 },
      ],
      ROOFING: [
        { material: 'Architectural Shingles', qtyPerBuild: 40, unitPrice: 35.00 },
        { material: 'Underlayment Roll', qtyPerBuild: 10, unitPrice: 85.00 },
        { material: 'Drip Edge', qtyPerBuild: 200, unitPrice: 1.50 },
      ],
      ELECTRICAL: [
        { material: '14/2 NM-B Wire (250ft)', qtyPerBuild: 8, unitPrice: 95.00 },
        { material: '12/2 NM-B Wire (250ft)', qtyPerBuild: 6, unitPrice: 125.00 },
        { material: '200A Panel', qtyPerBuild: 1, unitPrice: 250.00 },
      ],
      PLUMBING: [
        { material: '3" PVC Pipe 10ft', qtyPerBuild: 20, unitPrice: 15.00 },
        { material: '1/2" PEX (100ft)', qtyPerBuild: 10, unitPrice: 45.00 },
        { material: 'Water Heater 50gal', qtyPerBuild: 1, unitPrice: 650.00 },
      ],
      HVAC: [
        { material: '3 Ton Heat Pump', qtyPerBuild: 1, unitPrice: 3500.00 },
        { material: 'Flex Duct 6" (25ft)', qtyPerBuild: 10, unitPrice: 35.00 },
      ],
      APPLIANCES: [
        { material: 'Refrigerator', qtyPerBuild: 1, unitPrice: 1200.00 },
        { material: 'Range/Oven', qtyPerBuild: 1, unitPrice: 800.00 },
        { material: 'Dishwasher', qtyPerBuild: 1, unitPrice: 600.00 },
      ],
      FIXTURES: [
        { material: 'Toilet', qtyPerBuild: 3, unitPrice: 250.00 },
        { material: 'Vanity w/ Sink', qtyPerBuild: 2, unitPrice: 350.00 },
        { material: 'Kitchen Faucet', qtyPerBuild: 1, unitPrice: 175.00 },
      ],
      FLOORING: [
        { material: 'LVP Flooring (box)', qtyPerBuild: 50, unitPrice: 65.00 },
        { material: 'Carpet w/ Pad (sqyd)', qtyPerBuild: 100, unitPrice: 25.00 },
      ],
      PAINT: [
        { material: 'Interior Paint (5gal)', qtyPerBuild: 15, unitPrice: 150.00 },
        { material: 'Exterior Paint (5gal)', qtyPerBuild: 8, unitPrice: 175.00 },
        { material: 'Primer (5gal)', qtyPerBuild: 5, unitPrice: 85.00 },
      ],
      GENERAL: [
        { material: 'Misc Materials', qtyPerBuild: 1, unitPrice: 2500.00 },
      ],
    };

    const items = estimates[category] || estimates.GENERAL;

    return items.map(item => ({
      material: item.material,
      totalQty: item.qtyPerBuild * buildCount,
      unitPrice: item.unitPrice,
      total: item.qtyPerBuild * buildCount * item.unitPrice,
    }));
  }

  private calculateOptimalOrderDate(builds: Array<{ startDate: Date | null }>): Date {
    // Find earliest start date and subtract lead time
    const startDates = builds
      .filter(b => b.startDate)
      .map(b => b.startDate!.getTime());

    if (startDates.length === 0) {
      // Default to 2 weeks from now
      const date = new Date();
      date.setDate(date.getDate() + 14);
      return date;
    }

    const earliest = new Date(Math.min(...startDates));
    earliest.setDate(earliest.getDate() - 7); // 1 week lead time

    return earliest;
  }
}
