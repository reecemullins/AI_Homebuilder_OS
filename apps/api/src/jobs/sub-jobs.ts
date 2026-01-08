import { prisma } from '@builderos/database';
import { SubService } from '../services/sub.service';

const subService = new SubService();

export const subJobHandlers = {
  async sendConfirmation(entryId: string, hoursType: '48H' | '24H' | '2H'): Promise<void> {
    console.log(`Sending ${hoursType} confirmation for entry ${entryId}`);

    const entry = await prisma.scheduleEntry.findUnique({
      where: { id: entryId },
      include: {
        subcontractor: true,
        build: {
          include: {
            lot: { select: { address: true, city: true } },
          },
        },
      },
    });

    if (!entry || !entry.subcontractor) {
      console.log('Entry or subcontractor not found');
      return;
    }

    // Build confirmation message
    const scheduledDate = entry.scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    const message = `Hi ${entry.subcontractor.contactName}, this is a reminder about your scheduled work at ${entry.build.lot.address}, ${entry.build.lot.city} on ${scheduledDate}${entry.scheduledTime ? ` at ${entry.scheduledTime}` : ''}. Please reply YES to confirm or call us to reschedule.`;

    // Log communication
    await prisma.subCommunication.create({
      data: {
        subcontractorId: entry.subcontractor.id,
        type: `CONFIRMATION_${hoursType}` as never,
        channel: 'SMS',
        direction: 'OUTBOUND',
        content: message,
        buildId: entry.buildId,
        taskId: entry.taskId || undefined,
        scheduledFor: entry.scheduledDate,
      },
    });

    // In production, would send actual SMS via Twilio
    console.log(`SMS sent to ${entry.subcontractor.phone}: ${message}`);
  },

  async processResponse(subId: string, response: string): Promise<void> {
    console.log(`Processing response from sub ${subId}: ${response}`);

    // Find the most recent pending confirmation
    const comm = await prisma.subCommunication.findFirst({
      where: {
        subcontractorId: subId,
        type: { in: ['CONFIRMATION_48H', 'CONFIRMATION_24H', 'CONFIRMATION_2H'] },
        confirmedAt: null,
      },
      orderBy: { sentAt: 'desc' },
    });

    if (!comm) {
      console.log('No pending confirmation found');
      return;
    }

    // Simple response parsing
    const normalizedResponse = response.toLowerCase().trim();
    const isConfirmed = ['yes', 'confirmed', 'y', 'ok', 'okay', 'sure'].some(
      (keyword) => normalizedResponse.includes(keyword)
    );

    // Update communication record
    await prisma.subCommunication.update({
      where: { id: comm.id },
      data: {
        response,
        respondedAt: new Date(),
        confirmedAt: isConfirmed ? new Date() : null,
      },
    });

    // Update schedule entry if confirmed
    if (isConfirmed && comm.scheduledFor) {
      const entry = await prisma.scheduleEntry.findFirst({
        where: {
          subcontractorId: subId,
          scheduledDate: comm.scheduledFor,
          status: 'SCHEDULED',
        },
      });

      if (entry) {
        await prisma.scheduleEntry.update({
          where: { id: entry.id },
          data: {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
          },
        });
      }
    }

    console.log(`Response processed. Confirmed: ${isConfirmed}`);
  },

  async updateReliabilityScores(): Promise<void> {
    console.log('Updating reliability scores...');

    // Get all subs with recent activity
    const subs = await prisma.subcontractor.findMany({
      where: {
        ratings: { some: {} },
      },
      select: { id: true },
    });

    console.log(`Updating scores for ${subs.length} subcontractors`);

    for (const sub of subs) {
      try {
        await subService.updateReliabilityScore(sub.id);
      } catch (error) {
        console.error(`Error updating score for sub ${sub.id}:`, error);
      }
    }

    console.log('Reliability score update complete');
  },
};
