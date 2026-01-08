import { prisma, TaskStatus } from '@builderos/database';
import type { BuildTimeline, BuildFinancials, GanttTask } from '@builderos/types';

export class BuildService {
  async getTimeline(buildId: string, organizationId: string): Promise<BuildTimeline> {
    const build = await prisma.build.findFirst({
      where: { id: buildId, organizationId },
      include: {
        tasks: {
          include: {
            subcontractor: {
              select: { companyName: true },
            },
          },
          orderBy: { scheduledStart: 'asc' },
        },
      },
    });

    if (!build) {
      throw new Error('Build not found');
    }

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(build.tasks);

    // Map tasks to Gantt format
    const ganttTasks: GanttTask[] = build.tasks.map(task => ({
      id: task.id,
      name: task.name,
      phase: task.phase,
      trade: task.trade,
      start: task.scheduledStart || new Date(),
      end: task.scheduledEnd || new Date(),
      progress: this.calculateProgress(task.status),
      dependencies: task.dependencies,
      subcontractorName: task.subcontractor?.companyName,
      isCriticalPath: criticalPath.includes(task.id),
    }));

    // Calculate totals
    const completedTasks = build.tasks.filter(t => t.status === 'COMPLETE').length;
    const percentComplete = build.tasks.length > 0
      ? Math.round((completedTasks / build.tasks.length) * 100)
      : 0;

    const totalDuration = this.calculateTotalDuration(build.tasks);
    const daysRemaining = build.estimatedComplete
      ? Math.ceil((build.estimatedComplete.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      tasks: ganttTasks,
      criticalPath,
      totalDuration,
      percentComplete,
      estimatedComplete: build.estimatedComplete,
      daysRemaining,
    };
  }

  async getFinancials(buildId: string, organizationId: string): Promise<BuildFinancials> {
    const build = await prisma.build.findFirst({
      where: { id: buildId, organizationId },
      include: {
        tasks: {
          where: { status: 'COMPLETE' },
          select: { actualAmount: true },
        },
        purchaseOrders: {
          where: { status: { in: ['DELIVERED', 'CONFIRMED'] } },
          select: { total: true },
        },
      },
    });

    if (!build) {
      throw new Error('Build not found');
    }

    // Calculate actual costs from completed tasks and POs
    const taskCosts = build.tasks.reduce((sum, t) => sum + (t.actualAmount || 0), 0);
    const poCosts = build.purchaseOrders.reduce((sum, po) => sum + po.total, 0);
    const actualTotal = build.actualHard + build.actualSoft;

    const variance = build.budgetTotal - actualTotal;
    const percentComplete = build.budgetTotal > 0
      ? Math.round((actualTotal / build.budgetTotal) * 100)
      : 0;

    const projectedMargin = build.projectedSalePrice && build.projectedSalePrice > 0
      ? (build.projectedSalePrice - build.budgetTotal) / build.projectedSalePrice
      : null;

    return {
      landCost: build.landCost,
      budgetHard: build.budgetHard,
      budgetSoft: build.budgetSoft,
      budgetTotal: build.budgetTotal,
      actualHard: build.actualHard,
      actualSoft: build.actualSoft,
      actualTotal,
      variance,
      percentComplete,
      projectedSalePrice: build.projectedSalePrice,
      projectedMargin,
      contractPrice: build.contractPrice,
    };
  }

  private calculateProgress(status: TaskStatus): number {
    switch (status) {
      case 'COMPLETE':
        return 100;
      case 'IN_PROGRESS':
        return 50;
      case 'SCHEDULED':
        return 10;
      default:
        return 0;
    }
  }

  private calculateCriticalPath(tasks: { id: string; dependencies: string[]; duration: number }[]): string[] {
    // Simple critical path calculation
    // In a real implementation, this would use proper CPM algorithm
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const criticalPath: string[] = [];

    // Find tasks with most dependencies (simplified)
    const sortedTasks = [...tasks].sort((a, b) => {
      const aDeps = this.countTotalDependencies(a.id, taskMap);
      const bDeps = this.countTotalDependencies(b.id, taskMap);
      return bDeps - aDeps;
    });

    // Mark longest chain as critical
    if (sortedTasks.length > 0) {
      let current = sortedTasks[0];
      criticalPath.push(current.id);

      while (current.dependencies.length > 0) {
        const depId = current.dependencies[0];
        const dep = taskMap.get(depId);
        if (dep) {
          criticalPath.unshift(depId);
          current = dep;
        } else {
          break;
        }
      }
    }

    return criticalPath;
  }

  private countTotalDependencies(
    taskId: string,
    taskMap: Map<string, { dependencies: string[] }>,
    visited = new Set<string>()
  ): number {
    if (visited.has(taskId)) return 0;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return 0;

    let count = task.dependencies.length;
    for (const depId of task.dependencies) {
      count += this.countTotalDependencies(depId, taskMap, visited);
    }
    return count;
  }

  private calculateTotalDuration(tasks: { scheduledStart: Date | null; scheduledEnd: Date | null }[]): number {
    if (tasks.length === 0) return 0;

    const starts = tasks.filter(t => t.scheduledStart).map(t => t.scheduledStart!.getTime());
    const ends = tasks.filter(t => t.scheduledEnd).map(t => t.scheduledEnd!.getTime());

    if (starts.length === 0 || ends.length === 0) return 0;

    const minStart = Math.min(...starts);
    const maxEnd = Math.max(...ends);

    return Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24));
  }
}
