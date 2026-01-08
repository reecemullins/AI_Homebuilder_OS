import { prisma, InspectionType } from '@builderos/database';
import Anthropic from '@anthropic-ai/sdk';
import type { PreAuditResponse, PhotoAnalyzeResponse, ChecklistItem } from '@builderos/types';

export class InspectionService {
  private claude: Anthropic | null = null;

  private getClaudeClient(): Anthropic {
    if (!this.claude) {
      this.claude = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      });
    }
    return this.claude;
  }

  async getOrGenerateChecklist(
    inspectionId: string,
    organizationId: string
  ): Promise<{ items: ChecklistItem[] }> {
    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId },
      include: {
        build: { select: { organizationId: true } },
        checklist: true,
      },
    });

    if (!inspection || inspection.build.organizationId !== organizationId) {
      throw new Error('Inspection not found');
    }

    if (inspection.checklist) {
      return { items: inspection.checklist.items as ChecklistItem[] };
    }

    // Generate new checklist
    const checklist = await this.generateChecklist(
      inspection.jurisdiction,
      inspection.type,
      { sqft: 2000, stories: 1, foundationType: 'slab' } // Default values
    );

    return checklist;
  }

  async generateChecklist(
    jurisdiction: string,
    inspectionType: InspectionType,
    buildDetails: { sqft: number; stories: number; foundationType: string }
  ): Promise<{ items: ChecklistItem[] }> {
    // Get base checklist items for this inspection type
    const baseItems = this.getBaseChecklistItems(inspectionType);

    // If AI is available, enhance the checklist
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const claude = this.getClaudeClient();
        const response = await claude.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: `Generate a comprehensive inspection checklist for:
Jurisdiction: ${jurisdiction}
Inspection Type: ${inspectionType}
Building: ${buildDetails.sqft} sqft, ${buildDetails.stories} stories, ${buildDetails.foundationType} foundation

Return a JSON array of items with: id, description, required (boolean), commonFailReason (optional), codeReference (optional), photoRequired (boolean)

Focus on the most critical items for this inspection type.`,
          }],
        });

        const text = (response.content[0] as { text: string }).text;
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const items = JSON.parse(jsonMatch[0]);
          return { items };
        }
      } catch (error) {
        console.error('AI checklist generation failed, using base items', error);
      }
    }

    return { items: baseItems };
  }

  async runPreAudit(
    inspectionId: string,
    organizationId: string,
    photoUrls?: string[]
  ): Promise<PreAuditResponse> {
    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId },
      include: {
        build: { select: { organizationId: true } },
        photos: true,
        checklist: true,
      },
    });

    if (!inspection || inspection.build.organizationId !== organizationId) {
      throw new Error('Inspection not found');
    }

    // Analyze photos
    const photos = photoUrls || inspection.photos.map(p => p.url);
    const photoAnalyses = await Promise.all(
      photos.slice(0, 5).map(url => this.analyzePhoto(url, inspection.type))
    );

    // Count issues by severity
    const issues = photoAnalyses.flatMap(a => a.issues);
    const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
    const majorCount = issues.filter(i => i.severity === 'MAJOR').length;
    const minorCount = issues.filter(i => i.severity === 'MINOR').length;

    // Calculate readiness score
    let readinessScore = 100;
    readinessScore -= criticalCount * 25;
    readinessScore -= majorCount * 10;
    readinessScore -= minorCount * 2;
    readinessScore = Math.max(0, readinessScore);

    // Determine pass likelihood
    let passLikelihood: 'HIGH' | 'MEDIUM' | 'LOW';
    if (readinessScore >= 80 && criticalCount === 0) {
      passLikelihood = 'HIGH';
    } else if (readinessScore >= 50 && criticalCount <= 1) {
      passLikelihood = 'MEDIUM';
    } else {
      passLikelihood = 'LOW';
    }

    // Format issues
    const formattedIssues = issues.map(issue => ({
      severity: issue.severity as 'CRITICAL' | 'MAJOR' | 'MINOR',
      category: issue.category,
      description: issue.description,
      remediation: this.getRemediation(issue.category, inspection.type),
      estimatedFixTime: this.estimateFixTime(issue.severity as string),
    }));

    // Generate recommendations
    const recommendations = this.generateRecommendations(formattedIssues, passLikelihood);

    // Update inspection with pre-audit results
    await prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        preAuditScore: readinessScore,
        preAuditIssues: formattedIssues,
      },
    });

    return {
      readinessScore,
      passLikelihood,
      issues: formattedIssues,
      checklistCompletion: {
        total: (inspection.checklist?.items as unknown[])?.length || 0,
        verified: photos.length,
        unverified: Math.max(0, ((inspection.checklist?.items as unknown[])?.length || 0) - photos.length),
        failed: criticalCount + majorCount,
      },
      recommendations,
    };
  }

  async analyzePhoto(
    photoUrl: string,
    inspectionType: InspectionType,
    context?: string
  ): Promise<PhotoAnalyzeResponse> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        issues: [],
        passable: true,
        notes: 'Photo analysis not available - AI not configured',
      };
    }

    try {
      const claude = this.getClaudeClient();

      // In production, we would fetch the image and convert to base64
      // For now, return a simulated analysis
      const commonIssues = this.getCommonIssues(inspectionType);

      const response = await claude.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Analyze this construction inspection photo URL for a ${inspectionType} inspection.
${context ? `Context: ${context}` : ''}

Common issues to check for ${inspectionType}:
${commonIssues.join('\n')}

Assume this is a typical construction site photo. Based on common issues, what potential problems might be present?
Return JSON: {issues: [{confidence: 0-1, category: string, description: string, severity: "CRITICAL"|"MAJOR"|"MINOR"|"NONE"}], passable: boolean, notes: string}`,
        }],
      });

      const text = (response.content[0] as { text: string }).text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Photo analysis failed', error);
    }

    return {
      issues: [],
      passable: true,
      notes: 'Unable to analyze photo',
    };
  }

  private getBaseChecklistItems(type: InspectionType): ChecklistItem[] {
    const checklistMap: Partial<Record<InspectionType, ChecklistItem[]>> = {
      FRAMING: [
        { id: '1', description: 'Verify stud spacing (16" or 24" OC)', required: true, photoRequired: true },
        { id: '2', description: 'Check nail plates on all penetrations', required: true, commonFailReason: 'Missing nail plates', photoRequired: true },
        { id: '3', description: 'Verify header sizes match plans', required: true, photoRequired: false },
        { id: '4', description: 'Check hurricane ties/straps installed', required: true, commonFailReason: 'Missing or improperly installed', photoRequired: true },
        { id: '5', description: 'Verify fire blocking in place', required: true, photoRequired: true },
        { id: '6', description: 'Check rough opening sizes', required: true, photoRequired: false },
      ],
      ROUGH_ELECTRICAL: [
        { id: '1', description: 'Verify nail plates on all wire penetrations', required: true, commonFailReason: 'Missing nail plates', photoRequired: true },
        { id: '2', description: 'Check box fill calculations', required: true, photoRequired: false },
        { id: '3', description: 'Verify AFCI/GFCI protection where required', required: true, photoRequired: true },
        { id: '4', description: 'Check wire gauge matches circuit amperage', required: true, photoRequired: false },
        { id: '5', description: 'Verify proper grounding/bonding', required: true, photoRequired: true },
      ],
      ROUGH_PLUMBING: [
        { id: '1', description: 'Verify drain slope (1/4" per foot)', required: true, commonFailReason: 'Insufficient slope', photoRequired: true },
        { id: '2', description: 'Check cleanouts installed', required: true, photoRequired: true },
        { id: '3', description: 'Verify proper venting', required: true, photoRequired: true },
        { id: '4', description: 'Check nail plates on penetrations', required: true, photoRequired: true },
        { id: '5', description: 'Verify pipe support spacing', required: true, photoRequired: false },
      ],
    };

    return checklistMap[type] || [
      { id: '1', description: 'General inspection item', required: true, photoRequired: false },
    ];
  }

  private getCommonIssues(type: InspectionType): string[] {
    const issueMap: Partial<Record<InspectionType, string[]>> = {
      FRAMING: [
        'Missing or incorrect nail plates on notched studs',
        'Incorrect header sizing',
        'Missing hurricane ties or straps',
        'Improper stud spacing',
        'Missing fire blocking',
      ],
      ROUGH_ELECTRICAL: [
        'Missing nail plates where wires pass through studs',
        'Improper box fill calculations',
        'Missing AFCI/GFCI protection',
        'Incorrect wire gauge',
      ],
      ROUGH_PLUMBING: [
        'Incorrect drain slope',
        'Missing cleanouts',
        'Improper venting',
        'Missing nail plates',
      ],
    };

    return issueMap[type] || ['General code compliance'];
  }

  private getRemediation(category: string, type: InspectionType): string {
    const remediations: Record<string, string> = {
      'nail plates': 'Install protective nail plates on all penetrations within 1.25" of framing face',
      'header sizing': 'Verify header size matches structural plans and local code requirements',
      'hurricane ties': 'Install approved hurricane ties at all truss-to-wall connections',
      'fire blocking': 'Install fire blocking at required locations per IRC R302.11',
      'default': 'Correct the identified issue and request re-inspection',
    };

    for (const [key, value] of Object.entries(remediations)) {
      if (category.toLowerCase().includes(key)) {
        return value;
      }
    }

    return remediations.default;
  }

  private estimateFixTime(severity: string): number {
    switch (severity) {
      case 'CRITICAL':
        return 240; // 4 hours
      case 'MAJOR':
        return 120; // 2 hours
      case 'MINOR':
        return 30; // 30 minutes
      default:
        return 60;
    }
  }

  private generateRecommendations(
    issues: Array<{ severity: string }>,
    passLikelihood: string
  ): string[] {
    const recommendations: string[] = [];

    const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;

    if (criticalCount > 0) {
      recommendations.push('Address all critical issues before scheduling inspection');
    }

    if (passLikelihood === 'LOW') {
      recommendations.push('Consider having a senior team member review the work');
      recommendations.push('Take additional photos of corrected items');
    }

    if (passLikelihood === 'MEDIUM') {
      recommendations.push('Double-check all identified issues have been resolved');
    }

    if (passLikelihood === 'HIGH') {
      recommendations.push('Ready for inspection - maintain current quality standards');
    }

    recommendations.push('Ensure inspector has clear access to all areas');

    return recommendations;
  }
}
