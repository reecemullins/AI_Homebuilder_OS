import { prisma, Trade } from '@builderos/database';
import { defaultReliabilityConfig } from '@builderos/config';
import type { SubRecommendation } from '@builderos/types';

export class SubService {
  async updateReliabilityScore(subId: string): Promise<number> {
    const sub = await prisma.subcontractor.findUnique({
      where: { id: subId },
      include: {
        ratings: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        communications: {
          where: { type: { in: ['CONFIRMATION_48H', 'CONFIRMATION_24H', 'CONFIRMATION_2H'] } },
          take: 20,
        },
      },
    });

    if (!sub || sub.ratings.length === 0) {
      return sub?.reliabilityScore || 0.5;
    }

    // Calculate component scores
    const onTimeRate = sub.ratings.filter(r => r.arrivedOnTime && r.completedOnTime).length / sub.ratings.length;
    const qualityAvg = sub.ratings.reduce((sum, r) => sum + r.qualityScore, 0) / (sub.ratings.length * 5);
    const responseRate = sub.communications.filter(c => c.confirmedAt).length / Math.max(1, sub.communications.length);
    const rehireRate = sub.ratings.filter(r => r.wouldRehire).length / sub.ratings.length;

    // Apply weights
    const weights = defaultReliabilityConfig.weights;
    const score =
      onTimeRate * weights.onTime +
      qualityAvg * weights.quality +
      responseRate * weights.response +
      rehireRate * weights.rehire;

    // Apply recency decay (more recent ratings weighted more)
    const decayedScore = this.applyRecencyDecay(score, sub.ratings.length);

    // Update sub record
    await prisma.subcontractor.update({
      where: { id: subId },
      data: {
        reliabilityScore: decayedScore,
        onTimeRate,
        qualityRating: qualityAvg,
        responseRate,
        totalJobs: sub.totalJobs + 1,
        completedJobs: sub.completedJobs + 1,
      },
    });

    return decayedScore;
  }

  async checkAvailability(
    subId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    available: boolean;
    conflictingJobs: number;
    nextAvailable: Date | null;
  }> {
    const sub = await prisma.subcontractor.findUnique({
      where: { id: subId },
      include: {
        scheduleEntries: {
          where: {
            scheduledDate: {
              gte: startDate,
              lte: endDate,
            },
            status: { notIn: ['CANCELLED', 'COMPLETED'] },
          },
        },
      },
    });

    if (!sub) {
      throw new Error('Subcontractor not found');
    }

    const conflictingJobs = sub.scheduleEntries.length;
    const available = conflictingJobs < sub.maxConcurrent;

    let nextAvailable: Date | null = null;
    if (!available && sub.scheduleEntries.length > 0) {
      // Find next available date
      const sortedEntries = sub.scheduleEntries.sort(
        (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
      );
      const lastEntry = sortedEntries[sortedEntries.length - 1];
      nextAvailable = new Date(lastEntry.scheduledDate);
      nextAvailable.setDate(nextAvailable.getDate() + 1);
    }

    return {
      available,
      conflictingJobs,
      nextAvailable,
    };
  }

  async recommendSubs(
    organizationId: string,
    trade: Trade,
    buildId: string,
    scheduledDate: Date,
    duration: number,
    priority: 'COST' | 'RELIABILITY' | 'SPEED' = 'RELIABILITY'
  ): Promise<SubRecommendation[]> {
    // Get all approved subs for this trade
    const subs = await prisma.subcontractor.findMany({
      where: {
        organizationId,
        trades: { has: trade },
        status: { in: ['APPROVED', 'PREFERRED'] },
      },
      include: {
        ratings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        scheduleEntries: {
          where: {
            scheduledDate: {
              gte: new Date(scheduledDate.getTime() - 7 * 24 * 60 * 60 * 1000),
              lte: new Date(scheduledDate.getTime() + 7 * 24 * 60 * 60 * 1000),
            },
            status: { notIn: ['CANCELLED', 'COMPLETED'] },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    // Score and rank subs
    const recommendations: SubRecommendation[] = [];

    for (const sub of subs) {
      // Check availability
      const conflictingJobs = sub.scheduleEntries.length;
      let availability: 'CONFIRMED' | 'LIKELY' | 'UNKNOWN' | 'UNAVAILABLE';

      if (conflictingJobs === 0) {
        availability = 'LIKELY';
      } else if (conflictingJobs < sub.maxConcurrent) {
        availability = 'UNKNOWN';
      } else {
        availability = 'UNAVAILABLE';
      }

      // Calculate recommendation score based on priority
      let score = 0;
      const riskFactors: string[] = [];

      switch (priority) {
        case 'RELIABILITY':
          score = sub.reliabilityScore * 100;
          break;
        case 'COST':
          score = sub.pricingTier === 'BUDGET' ? 90 : sub.pricingTier === 'MARKET' ? 70 : 50;
          break;
        case 'SPEED':
          score = availability === 'LIKELY' ? 90 : availability === 'UNKNOWN' ? 60 : 30;
          break;
      }

      // Adjust for availability
      if (availability === 'UNAVAILABLE') {
        score *= 0.3;
        riskFactors.push('Currently at max capacity');
      }

      // Check for expired insurance
      if (sub.insuranceExpiry && sub.insuranceExpiry < new Date()) {
        score *= 0.7;
        riskFactors.push('Insurance expired');
      }

      // Check for low ratings
      if (sub.qualityRating < 0.6) {
        riskFactors.push('Below average quality ratings');
      }

      // Estimate cost (simplified)
      const estimatedCost = this.estimateCost(trade, duration, sub.pricingTier);

      // Generate reasoning
      const reasoning = this.generateReasoning(sub, priority, score);

      recommendations.push({
        subcontractor: {
          id: sub.id,
          companyName: sub.companyName,
          contactName: sub.contactName,
          phone: sub.phone,
          reliabilityScore: sub.reliabilityScore,
          onTimeRate: sub.onTimeRate,
          qualityRating: sub.qualityRating,
        },
        score: Math.round(score),
        reasoning,
        availability,
        estimatedCost,
        riskFactors,
      });
    }

    // Sort by score descending
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations.slice(0, 5);
  }

  private applyRecencyDecay(score: number, jobCount: number): number {
    // Apply decay factor based on job count
    const minJobs = defaultReliabilityConfig.minJobsForRating;
    if (jobCount < minJobs) {
      // Not enough data, return closer to neutral
      return 0.5 + (score - 0.5) * (jobCount / minJobs);
    }
    return score;
  }

  private estimateCost(trade: Trade, duration: number, pricingTier: string): number {
    // Base daily rates by trade (simplified)
    const baseRates: Record<Trade, number> = {
      GENERAL: 400,
      EXCAVATION: 800,
      CONCRETE: 600,
      FRAMING: 700,
      ROOFING: 500,
      PLUMBING: 550,
      ELECTRICAL: 500,
      HVAC: 600,
      INSULATION: 350,
      DRYWALL: 400,
      PAINT: 350,
      FLOORING: 450,
      CABINETS: 400,
      COUNTERTOPS: 500,
      TILE: 400,
      TRIM: 350,
      LANDSCAPING: 400,
      CLEANING: 250,
      OTHER: 400,
    };

    const baseRate = baseRates[trade] || 400;

    // Apply pricing tier multiplier
    const multiplier = pricingTier === 'BUDGET' ? 0.85 : pricingTier === 'PREMIUM' ? 1.25 : 1.0;

    return Math.round(baseRate * duration * multiplier);
  }

  private generateReasoning(
    sub: { reliabilityScore: number; onTimeRate: number; qualityRating: number; completedJobs: number },
    priority: string,
    score: number
  ): string {
    const reasons: string[] = [];

    if (sub.reliabilityScore >= 0.8) {
      reasons.push('highly reliable');
    } else if (sub.reliabilityScore >= 0.6) {
      reasons.push('generally reliable');
    }

    if (sub.onTimeRate >= 0.9) {
      reasons.push('excellent on-time record');
    }

    if (sub.qualityRating >= 0.8) {
      reasons.push('high quality work');
    }

    if (sub.completedJobs >= 10) {
      reasons.push(`proven track record (${sub.completedJobs} jobs)`);
    }

    if (reasons.length === 0) {
      reasons.push('meets basic requirements');
    }

    return `Score: ${Math.round(score)}/100. ${reasons.join(', ').charAt(0).toUpperCase() + reasons.join(', ').slice(1)}.`;
  }
}
