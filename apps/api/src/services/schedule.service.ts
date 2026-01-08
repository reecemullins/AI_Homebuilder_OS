import { prisma, Trade } from '@builderos/database';
import Anthropic from '@anthropic-ai/sdk';
import type { ScheduleOptimizeResponse, ResequenceResponse } from '@builderos/types';

export class ScheduleService {
  private claude: Anthropic | null = null;

  private getClaudeClient(): Anthropic {
    if (!this.claude) {
      this.claude = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      });
    }
    return this.claude;
  }

  async scheduleConfirmations(entryId: string): Promise<void> {
    const entry = await prisma.scheduleEntry.findUnique({
      where: { id: entryId },
      include: { subcontractor: true },
    });

    if (!entry || !entry.subcontractor) return;

    // In production, this would queue jobs for 48h, 24h, 2h confirmations
    // using BullMQ
    console.log(`Scheduling confirmations for entry ${entryId}`);
  }

  async optimizeSchedule(
    buildId: string,
    organizationId: string,
    constraints?: {
      fixedDates?: Array<{ taskId: string; date: string }>;
      excludeDates?: string[];
      maxConcurrentTrades?: number;
    },
    preferences?: {
      preferredSubs?: Record<string, string>;
      weatherBuffer?: boolean;
      inspectionBuffer?: number;
    }
  ): Promise<ScheduleOptimizeResponse> {
    const build = await prisma.build.findFirst({
      where: { id: buildId, organizationId },
      include: {
        tasks: {
          include: {
            subcontractor: { select: { id: true, companyName: true } },
          },
        },
        schedules: true,
      },
    });

    if (!build) {
      throw new Error('Build not found');
    }

    // Get available subs
    const subs = await prisma.subcontractor.findMany({
      where: { organizationId, status: { in: ['APPROVED', 'PREFERRED'] } },
    });

    // Simple optimization logic
    const optimizedSchedule = this.runOptimization(
      build.tasks,
      subs,
      constraints,
      preferences
    );

    // Calculate critical path
    const criticalPath = this.findCriticalPath(build.tasks);

    // Identify risks
    const risks = this.identifyRisks(optimizedSchedule, preferences);

    // Generate changes list
    const changes = this.generateChanges(build.tasks, optimizedSchedule);

    return {
      schedule: optimizedSchedule.map(s => ({
        id: s.id || '',
        taskId: s.taskId || null,
        trade: s.trade,
        description: s.description,
        scheduledDate: s.scheduledDate,
        scheduledTime: s.scheduledTime || null,
        estimatedDuration: s.estimatedDuration,
        status: 'SCHEDULED' as const,
        subcontractorId: s.subcontractorId || null,
        subcontractorName: s.subcontractorName || null,
      })),
      criticalPath,
      totalDuration: this.calculateDuration(optimizedSchedule),
      risks,
      changes,
    };
  }

  async resequence(
    buildId: string,
    organizationId: string,
    delayedTaskId: string,
    newCompletionDate: string,
    reason: string
  ): Promise<ResequenceResponse> {
    const build = await prisma.build.findFirst({
      where: { id: buildId, organizationId },
      include: {
        tasks: {
          include: { subcontractor: true },
        },
      },
    });

    if (!build) {
      throw new Error('Build not found');
    }

    const delayedTask = build.tasks.find(t => t.id === delayedTaskId);
    if (!delayedTask) {
      throw new Error('Task not found');
    }

    // Calculate days of delay
    const originalEnd = delayedTask.scheduledEnd || new Date();
    const newEnd = new Date(newCompletionDate);
    const delayDays = Math.ceil((newEnd.getTime() - originalEnd.getTime()) / (1000 * 60 * 60 * 24));

    // Find dependent tasks
    const affectedTasks = build.tasks.filter(t =>
      t.dependencies.includes(delayedTaskId)
    );

    // Calculate new dates for affected tasks
    const taskChanges = affectedTasks.map(task => {
      const oldStart = task.scheduledStart || new Date();
      const oldEnd = task.scheduledEnd || new Date();
      const newStart = new Date(oldStart.getTime() + delayDays * 24 * 60 * 60 * 1000);
      const newEndDate = new Date(oldEnd.getTime() + delayDays * 24 * 60 * 60 * 1000);

      return {
        taskId: task.id,
        oldDates: {
          start: oldStart.toISOString(),
          end: oldEnd.toISOString(),
        },
        newDates: {
          start: newStart.toISOString(),
          end: newEndDate.toISOString(),
        },
      };
    });

    // Generate notifications for affected subs
    const notifications = affectedTasks
      .filter(t => t.subcontractor)
      .map(t => ({
        subcontractorId: t.subcontractorId!,
        type: 'RESCHEDULE' as const,
        message: `Your scheduled work on ${t.name} has been rescheduled due to: ${reason}`,
      }));

    // Calculate new projected completion
    const allEndDates = build.tasks.map(t => {
      const affected = taskChanges.find(tc => tc.taskId === t.id);
      if (affected) {
        return new Date(affected.newDates.end);
      }
      return t.scheduledEnd || new Date();
    });
    const newProjectedCompletion = new Date(Math.max(...allEndDates.map(d => d.getTime())));

    return {
      affectedTasks: taskChanges,
      notifications,
      newProjectedCompletion: newProjectedCompletion.toISOString(),
      daysImpact: delayDays,
    };
  }

  private runOptimization(
    tasks: Array<{
      id: string;
      name: string;
      trade: Trade;
      duration: number;
      scheduledStart: Date | null;
      scheduledEnd: Date | null;
      dependencies: string[];
      subcontractor?: { id: string; companyName: string } | null;
    }>,
    subs: Array<{ id: string; trades: Trade[]; companyName: string }>,
    constraints?: {
      fixedDates?: Array<{ taskId: string; date: string }>;
      excludeDates?: string[];
      maxConcurrentTrades?: number;
    },
    preferences?: {
      preferredSubs?: Record<string, string>;
    }
  ): Array<{
    id?: string;
    taskId?: string;
    trade: Trade;
    description: string;
    scheduledDate: Date;
    scheduledTime?: string;
    estimatedDuration: number;
    subcontractorId?: string;
    subcontractorName?: string;
  }> {
    const schedule: Array<{
      id?: string;
      taskId?: string;
      trade: Trade;
      description: string;
      scheduledDate: Date;
      scheduledTime?: string;
      estimatedDuration: number;
      subcontractorId?: string;
      subcontractorName?: string;
    }> = [];

    let currentDate = new Date();
    const fixedDatesMap = new Map(
      constraints?.fixedDates?.map(f => [f.taskId, new Date(f.date)]) || []
    );

    // Sort tasks by dependencies
    const sortedTasks = this.topologicalSort(tasks);

    for (const task of sortedTasks) {
      // Check for fixed date
      let scheduledDate = fixedDatesMap.get(task.id);

      if (!scheduledDate) {
        // Calculate based on dependencies
        const depEndDates = task.dependencies
          .map(depId => schedule.find(s => s.taskId === depId)?.scheduledDate)
          .filter(Boolean) as Date[];

        if (depEndDates.length > 0) {
          const maxDepEnd = new Date(Math.max(...depEndDates.map(d => d.getTime())));
          scheduledDate = new Date(maxDepEnd.getTime() + 24 * 60 * 60 * 1000);
        } else {
          scheduledDate = new Date(currentDate);
        }

        // Skip excluded dates
        while (constraints?.excludeDates?.includes(scheduledDate.toISOString().split('T')[0])) {
          scheduledDate = new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000);
        }
      }

      // Find appropriate sub
      let subcontractorId = preferences?.preferredSubs?.[task.trade];
      let subcontractorName: string | undefined;

      if (!subcontractorId) {
        const availableSub = subs.find(s => s.trades.includes(task.trade));
        if (availableSub) {
          subcontractorId = availableSub.id;
          subcontractorName = availableSub.companyName;
        }
      } else {
        const sub = subs.find(s => s.id === subcontractorId);
        subcontractorName = sub?.companyName;
      }

      schedule.push({
        taskId: task.id,
        trade: task.trade,
        description: task.name,
        scheduledDate,
        scheduledTime: '8:00 AM',
        estimatedDuration: task.duration * 8, // Convert days to hours
        subcontractorId,
        subcontractorName,
      });
    }

    return schedule;
  }

  private topologicalSort<T extends { id: string; dependencies: string[] }>(tasks: T[]): T[] {
    const result: T[] = [];
    const visited = new Set<string>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const visit = (taskId: string) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      const task = taskMap.get(taskId);
      if (!task) return;

      for (const depId of task.dependencies) {
        visit(depId);
      }
      result.push(task);
    };

    for (const task of tasks) {
      visit(task.id);
    }

    return result;
  }

  private findCriticalPath(tasks: { id: string; dependencies: string[]; duration: number }[]): string[] {
    // Simplified critical path - find longest chain
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    let longestPath: string[] = [];

    const findPath = (taskId: string, path: string[]): string[] => {
      const task = taskMap.get(taskId);
      if (!task) return path;

      const newPath = [...path, taskId];

      if (task.dependencies.length === 0) {
        return newPath;
      }

      let longest = newPath;
      for (const depId of task.dependencies) {
        const depPath = findPath(depId, newPath);
        if (depPath.length > longest.length) {
          longest = depPath;
        }
      }
      return longest;
    };

    for (const task of tasks) {
      const path = findPath(task.id, []);
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    }

    return longestPath.reverse();
  }

  private identifyRisks(
    schedule: Array<{ scheduledDate: Date; trade: Trade }>,
    preferences?: { weatherBuffer?: boolean }
  ): Array<{ type: string; description: string; mitigation: string }> {
    const risks: Array<{ type: 'WEATHER' | 'SUB_AVAILABILITY' | 'INSPECTION_TIMING' | 'DEPENDENCY'; description: string; mitigation: string }> = [];

    // Check for weather-sensitive trades without buffer
    const exteriorTrades: Trade[] = ['ROOFING', 'EXCAVATION', 'CONCRETE', 'LANDSCAPING'];
    const exteriorWork = schedule.filter(s => exteriorTrades.includes(s.trade));

    if (exteriorWork.length > 0 && !preferences?.weatherBuffer) {
      risks.push({
        type: 'WEATHER',
        description: 'Exterior work scheduled without weather buffer',
        mitigation: 'Consider adding 1-2 day buffer for weather delays',
      });
    }

    return risks;
  }

  private generateChanges(
    originalTasks: Array<{ id: string; scheduledStart: Date | null }>,
    newSchedule: Array<{ taskId?: string; scheduledDate: Date }>
  ): Array<{ taskId: string; oldDate: string; newDate: string; reason: string }> {
    const changes: Array<{ taskId: string; oldDate: string; newDate: string; reason: string }> = [];

    for (const newEntry of newSchedule) {
      if (!newEntry.taskId) continue;

      const original = originalTasks.find(t => t.id === newEntry.taskId);
      if (original?.scheduledStart) {
        const oldDate = original.scheduledStart.toISOString().split('T')[0];
        const newDate = newEntry.scheduledDate.toISOString().split('T')[0];

        if (oldDate !== newDate) {
          changes.push({
            taskId: newEntry.taskId,
            oldDate,
            newDate,
            reason: 'Optimization adjustment',
          });
        }
      }
    }

    return changes;
  }

  private calculateDuration(schedule: Array<{ scheduledDate: Date }>): number {
    if (schedule.length === 0) return 0;

    const dates = schedule.map(s => s.scheduledDate.getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);

    return Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
  }
}
