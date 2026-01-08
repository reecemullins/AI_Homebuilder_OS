import { prisma, InspectionType } from '@builderos/database';
import { InspectionService } from '../services/inspection.service';

const inspectionService = new InspectionService();

export const inspectionJobHandlers = {
  async runPreAudit(inspectionId: string): Promise<void> {
    console.log(`Running pre-audit for inspection ${inspectionId}`);

    const inspection = await prisma.inspection.findUnique({
      where: { id: inspectionId },
      include: {
        build: { select: { organizationId: true } },
      },
    });

    if (!inspection) {
      console.log('Inspection not found');
      return;
    }

    try {
      const result = await inspectionService.runPreAudit(
        inspectionId,
        inspection.build.organizationId
      );

      console.log(`Pre-audit complete. Readiness score: ${result.readinessScore}`);

      // If low score, could trigger notification
      if (result.readinessScore < 70) {
        console.log('Low readiness score - consider sending alert');
        // In production, would send notification to builder
      }
    } catch (error) {
      console.error(`Error running pre-audit:`, error);
    }
  },

  async analyzePhoto(photoUrl: string, inspectionType: string): Promise<void> {
    console.log(`Analyzing photo for ${inspectionType} inspection`);

    try {
      const result = await inspectionService.analyzePhoto(
        photoUrl,
        inspectionType as InspectionType
      );

      console.log(`Photo analysis complete. Issues found: ${result.issues.length}`);

      // Update photo record if exists
      const photo = await prisma.inspectionPhoto.findFirst({
        where: { url: photoUrl },
      });

      if (photo) {
        await prisma.inspectionPhoto.update({
          where: { id: photo.id },
          data: {
            analyzed: true,
            analysisResult: result as never,
            flagged: result.issues.some((i) => i.severity === 'CRITICAL'),
            flagReason: result.issues
              .filter((i) => i.severity === 'CRITICAL')
              .map((i) => i.description)
              .join('; '),
          },
        });
      }
    } catch (error) {
      console.error(`Error analyzing photo:`, error);
    }
  },

  async scheduleUpcomingAudits(): Promise<void> {
    console.log('Checking for inspections needing pre-audits...');

    // Find inspections scheduled in next 24 hours without pre-audit
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const inspections = await prisma.inspection.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledDate: {
          gte: new Date(),
          lte: tomorrow,
        },
        preAuditScore: null,
      },
      select: { id: true },
    });

    console.log(`Found ${inspections.length} inspections needing pre-audit`);

    // Queue pre-audits
    for (const inspection of inspections) {
      await inspectionJobHandlers.runPreAudit(inspection.id);
    }
  },
};
