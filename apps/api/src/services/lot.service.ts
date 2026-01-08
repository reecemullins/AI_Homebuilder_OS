import { prisma } from '@builderos/database';
import Anthropic from '@anthropic-ai/sdk';
import { defaultScoringConfig } from '@builderos/config';
import type { LotScoreResponse, DailyDigestResponse } from '@builderos/types';

export class LotService {
  private claude: Anthropic | null = null;

  private getClaudeClient(): Anthropic {
    if (!this.claude) {
      this.claude = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      });
    }
    return this.claude;
  }

  async scoreLot(
    lotId: string,
    organizationId: string,
    options: { forceRefresh?: boolean; includeComps?: boolean } = {}
  ): Promise<LotScoreResponse> {
    const lot = await prisma.lot.findFirst({
      where: { id: lotId, organizationId },
      include: { comparables: true },
    });

    if (!lot) {
      throw new Error('Lot not found');
    }

    // Calculate component scores
    const schoolScore = this.calculateSchoolScore(lot.schoolRating);
    const zoningScore = this.calculateZoningScore(lot.zoningCompatible);
    const utilityScore = this.calculateUtilityScore(lot.utilities as Record<string, boolean>);
    const compScore = await this.calculateCompScore(lot);
    const marginScore = this.calculateMarginScore(lot.marginEstimate);
    const motivationScore = this.calculateMotivationScore(lot.sellerMotivation);

    // Calculate weighted overall score
    const weights = defaultScoringConfig.weights;
    const overallScore = Math.round(
      schoolScore * weights.schoolRating +
      zoningScore * weights.zoningCompatibility +
      utilityScore * weights.utilityAvailability +
      compScore * weights.compScore +
      marginScore * weights.marginEstimate +
      motivationScore * weights.sellerMotivation
    );

    // Generate AI reasoning
    const reasoning = await this.generateReasoning(lot, overallScore);

    // Update lot with scores
    await prisma.lot.update({
      where: { id: lotId },
      data: {
        overallScore,
        scoreBreakdown: {
          schoolRating: { value: lot.schoolRating, weight: weights.schoolRating, score: schoolScore },
          zoning: { compatible: lot.zoningCompatible, weight: weights.zoningCompatibility, score: zoningScore },
          utilities: { available: this.getAvailableUtilities(lot.utilities as Record<string, boolean>), weight: weights.utilityAvailability, score: utilityScore },
          comps: { avgPsf: this.getAvgPsf(lot.comparables), count: lot.comparables.length, weight: weights.compScore, score: compScore },
          margin: { estimated: lot.marginEstimate, weight: weights.marginEstimate, score: marginScore },
          motivation: { signals: [], weight: weights.sellerMotivation, score: motivationScore },
        },
      },
    });

    const recommendation = this.getRecommendation(overallScore);

    return {
      overallScore,
      breakdown: {
        schoolRating: { value: lot.schoolRating || 0, weight: weights.schoolRating, score: schoolScore },
        zoning: { compatible: lot.zoningCompatible, weight: weights.zoningCompatibility, score: zoningScore },
        utilities: { available: this.getAvailableUtilities(lot.utilities as Record<string, boolean>), weight: weights.utilityAvailability, score: utilityScore },
        comps: { avgPsf: this.getAvgPsf(lot.comparables), count: lot.comparables.length, weight: weights.compScore, score: compScore },
        margin: { estimated: lot.marginEstimate || 0, weight: weights.marginEstimate, score: marginScore },
        motivation: { signals: [], weight: weights.sellerMotivation, score: motivationScore },
      },
      comparables: lot.comparables,
      recommendation,
      reasoning,
    };
  }

  async generateDailyDigest(organizationId: string): Promise<DailyDigestResponse> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get new lots from last 24 hours
    const newLots = await prisma.lot.findMany({
      where: {
        organizationId,
        createdAt: { gte: yesterday },
      },
    });

    // Get top opportunities
    const topLots = await prisma.lot.findMany({
      where: {
        organizationId,
        status: { in: ['NEW', 'REVIEWING'] },
        overallScore: { not: null },
      },
      orderBy: { overallScore: 'desc' },
      take: 5,
    });

    const topOpportunities = topLots.map(lot => ({
      lot: {
        id: lot.id,
        address: lot.address,
        city: lot.city,
        listPrice: lot.listPrice,
        acreage: lot.acreage,
        source: lot.source,
        daysOnMarket: lot.daysOnMarket,
      },
      score: lot.overallScore || 0,
      highlights: this.generateHighlights(lot),
      urgency: this.determineUrgency(lot) as 'HIGH' | 'MEDIUM' | 'LOW',
    }));

    // Generate market insights with AI
    const marketInsights = await this.generateMarketInsights(organizationId);

    return {
      date: today.toISOString().split('T')[0],
      newLots: newLots.length,
      topOpportunities,
      priceChanges: [],
      expiringDeals: [],
      marketInsights,
    };
  }

  private calculateSchoolScore(rating: number | null): number {
    if (!rating) return 50;
    return Math.min(100, rating * 10);
  }

  private calculateZoningScore(compatible: boolean): number {
    return compatible ? 100 : 30;
  }

  private calculateUtilityScore(utilities: Record<string, boolean>): number {
    if (!utilities) return 50;
    const available = Object.values(utilities).filter(Boolean).length;
    return (available / 4) * 100;
  }

  private async calculateCompScore(lot: { comparables: { pricePerSqft: number }[] }): Promise<number> {
    if (lot.comparables.length === 0) return 50;
    const avgPsf = lot.comparables.reduce((sum, c) => sum + c.pricePerSqft, 0) / lot.comparables.length;
    // Higher price per sqft in area = better market = higher score
    return Math.min(100, avgPsf / 2);
  }

  private calculateMarginScore(margin: number | null): number {
    if (!margin) return 50;
    if (margin >= 0.25) return 100;
    if (margin >= 0.20) return 80;
    if (margin >= 0.15) return 60;
    if (margin >= 0.10) return 40;
    return 20;
  }

  private calculateMotivationScore(motivation: number | null): number {
    if (!motivation) return 50;
    return motivation * 100;
  }

  private getAvailableUtilities(utilities: Record<string, boolean>): string[] {
    if (!utilities) return [];
    return Object.entries(utilities)
      .filter(([, available]) => available)
      .map(([utility]) => utility);
  }

  private getAvgPsf(comparables: { pricePerSqft: number }[]): number {
    if (comparables.length === 0) return 0;
    return comparables.reduce((sum, c) => sum + c.pricePerSqft, 0) / comparables.length;
  }

  private getRecommendation(score: number): 'STRONG_BUY' | 'BUY' | 'HOLD' | 'PASS' {
    if (score >= 80) return 'STRONG_BUY';
    if (score >= 65) return 'BUY';
    if (score >= 50) return 'HOLD';
    return 'PASS';
  }

  private generateHighlights(lot: {
    schoolRating: number | null;
    zoningCompatible: boolean;
    daysOnMarket: number | null;
    marginEstimate: number | null;
  }): string[] {
    const highlights: string[] = [];
    if (lot.schoolRating && lot.schoolRating >= 7) {
      highlights.push(`Strong schools (${lot.schoolRating}/10)`);
    }
    if (lot.zoningCompatible) {
      highlights.push('Zoning compatible');
    }
    if (lot.daysOnMarket && lot.daysOnMarket > 90) {
      highlights.push('Motivated seller potential');
    }
    if (lot.marginEstimate && lot.marginEstimate >= 0.20) {
      highlights.push(`Good margin potential (${(lot.marginEstimate * 100).toFixed(0)}%)`);
    }
    return highlights;
  }

  private determineUrgency(lot: { daysOnMarket: number | null; overallScore: number | null }): string {
    if (lot.overallScore && lot.overallScore >= 80) return 'HIGH';
    if (lot.daysOnMarket && lot.daysOnMarket < 7) return 'HIGH';
    if (lot.overallScore && lot.overallScore >= 65) return 'MEDIUM';
    return 'LOW';
  }

  private async generateReasoning(lot: Record<string, unknown>, score: number): Promise<string> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return `This lot scored ${score}/100. Key factors include location, zoning compatibility, and market comparables.`;
    }

    try {
      const claude = this.getClaudeClient();
      const response = await claude.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Provide a 2-3 sentence investment thesis for this lot:
Address: ${lot.address}
Score: ${score}/100
List Price: $${lot.listPrice || 'Unknown'}
Acreage: ${lot.acreage}
School Rating: ${lot.schoolRating || 'Unknown'}/10
Days on Market: ${lot.daysOnMarket || 'Unknown'}
Zoning Compatible: ${lot.zoningCompatible ? 'Yes' : 'No'}`,
        }],
      });

      return (response.content[0] as { text: string }).text;
    } catch (error) {
      return `This lot scored ${score}/100. Review the breakdown for detailed analysis.`;
    }
  }

  private async generateMarketInsights(organizationId: string): Promise<string> {
    const lotCount = await prisma.lot.count({
      where: { organizationId, status: { in: ['NEW', 'REVIEWING'] } },
    });

    return `You have ${lotCount} active lots in your pipeline. Review the top opportunities above for the best investment potential.`;
  }
}
