import { createPrismaClient } from '../lib/prisma';
import cron, { ScheduledTask } from 'node-cron';
import { ServerService } from './ServerService';
import { BackupService } from './BackupService';
import { ConsoleService } from './ConsoleService';
import { NodeService } from './NodeService';
import logger from '../utils/logger';

const prisma = createPrismaClient();

export class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private serverService: ServerService;
  private backupService: BackupService;
  private consoleService: ConsoleService;
  private nodeService: NodeService | null = null;

  constructor(
    serverService: ServerService,
    backupService: BackupService,
    consoleService: ConsoleService
  ) {
    this.serverService = serverService;
    this.backupService = backupService;
    this.consoleService = consoleService;
  }

  /**
   * Set the NodeService for leader election checks.
   * Must be called before loadTasks() so leadership is acquired on startup.
   */
  setNodeService(nodeService: NodeService): void {
    this.nodeService = nodeService;
  }

  /**
   * Load all enabled tasks from database and schedule them.
   * Also attempts to acquire scheduler leadership for this node.
   */
  async loadTasks(): Promise<void> {
    try {
      // Attempt to become the scheduler leader
      if (this.nodeService) {
        const acquired = await this.nodeService.tryAcquireLeadership();
        logger.info(`[Scheduler] Leadership acquired: ${acquired}`);
      }

      const tasks = await prisma.scheduledTask.findMany({
        where: { enabled: true },
      });

      logger.info(`Loading ${tasks.length} scheduled tasks...`);

      for (const task of tasks) {
        try {
          this.scheduleTask(task);
        } catch (error) {
          logger.error(`Failed to schedule task ${task.name}:`, error);
        }
      }

      logger.info('All scheduled tasks loaded');
    } catch (error) {
      logger.error('Error loading scheduled tasks:', error);
    }
  }

  /**
   * Schedule a single task
   */
  scheduleTask(task: any): void {
    // Validate cron expression
    if (!cron.validate(task.cronExpression)) {
      logger.error(`Invalid cron expression for task ${task.name}: ${task.cronExpression}`);
      return;
    }

    // Stop existing task if it exists
    if (this.tasks.has(task.id)) {
      this.tasks.get(task.id)?.stop();
      this.tasks.delete(task.id);
    }

    // Create new scheduled task
    const cronTask = cron.schedule(
      task.cronExpression,
      async () => {
        await this.executeTask(task);
      },
      {
        timezone: 'UTC',
      }
    );

    this.tasks.set(task.id, cronTask);
    logger.info(`Scheduled task: ${task.name} (${task.cronExpression})`);
  }

  /**
   * Execute a scheduled task.
   * Skips execution silently if this node is not the scheduler leader.
   */
  async executeTask(task: any): Promise<void> {
    // Leader election guard: only the leader node executes scheduled tasks
    if (this.nodeService && !this.nodeService.isLeader()) {
      // Not the leader — try to acquire in case the leader died
      const acquired = await this.nodeService.tryAcquireLeadership();
      if (!acquired) {
        logger.debug(`[Scheduler] Skipping task ${task.name} — not the leader`);
        return;
      }
    }

    logger.info(`Executing scheduled task: ${task.name} (${task.type})`);

    try {
      const taskData = task.taskData ? JSON.parse(task.taskData) : {};

      switch (task.type) {
        case 'backup':
          await this.executeBackupTask(task.serverId, taskData, task.id);
          break;

        case 'restart':
          await this.executeRestartTask(task.serverId);
          break;

        case 'start':
          await this.executeStartTask(task.serverId);
          break;

        case 'stop':
          await this.executeStopTask(task.serverId);
          break;

        case 'command':
          await this.executeCommandTask(task.serverId, taskData);
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Update task status
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: {
          lastRun: new Date(),
          lastStatus: 'success',
          lastError: null,
        },
      });

      logger.info(`Task ${task.name} executed successfully`);
    } catch (error: any) {
      logger.error(`Error executing task ${task.name}:`, error);

      // Update task status with error
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: {
          lastRun: new Date(),
          lastStatus: 'failed',
          lastError: error.message,
        },
      });
    }
  }

  /**
   * Execute backup task
   */
  private async executeBackupTask(serverId: string, taskData: any, taskId: string): Promise<void> {
    const description = taskData.description || 'Automated backup';
    // Pass undefined for automationRuleId and the actual scheduledTaskId
    await this.backupService.createBackup(serverId, description, undefined, taskId);
    logger.info(`Backup created for server ${serverId}`);
  }

  /**
   * Execute restart task
   */
  private async executeRestartTask(serverId: string): Promise<void> {
    await this.serverService.restartServer(serverId);
    logger.info(`Server ${serverId} restarted`);
  }

  /**
   * Execute start task
   */
  private async executeStartTask(serverId: string): Promise<void> {
    await this.serverService.startServer(serverId);
    logger.info(`Server ${serverId} started`);
  }

  /**
   * Execute stop task
   */
  private async executeStopTask(serverId: string): Promise<void> {
    await this.serverService.stopServer(serverId);
    logger.info(`Server ${serverId} stopped`);
  }

  /**
   * Execute command task
   */
  private async executeCommandTask(serverId: string, taskData: any): Promise<void> {
    const command = taskData.command;
    if (!command) {
      throw new Error('No command specified for command task');
    }

    const adapter = await this.serverService.getAdapterForServer(serverId);
    await this.consoleService.sendCommand(adapter, command);
    logger.info(`Command executed on server ${serverId}: ${command}`);
  }

  /**
   * Create a new scheduled task
   */
  async createTask(data: {
    serverId: string;
    name: string;
    type: string;
    cronExpression: string;
    taskData?: any;
    enabled?: boolean;
    backupLimit?: number;
  }): Promise<any> {
    // Validate cron expression
    if (!cron.validate(data.cronExpression)) {
      throw new Error(`Invalid cron expression: ${data.cronExpression}`);
    }

    // Create task in database
    const task = await prisma.scheduledTask.create({
      data: {
        serverId: data.serverId,
        name: data.name,
        type: data.type,
        cronExpression: data.cronExpression,
        taskData: data.taskData ? JSON.stringify(data.taskData) : null,
        enabled: data.enabled !== false,
        backupLimit: data.backupLimit ?? 10,
      },
      include: {
        server: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Schedule task if enabled
    if (task.enabled) {
      this.scheduleTask(task);
    }

    return task;
  }

  /**
   * Update a scheduled task
   */
  async updateTask(taskId: string, data: Partial<{
    name: string;
    cronExpression: string;
    taskData: any;
    enabled: boolean;
    backupLimit: number;
  }>): Promise<any> {
    // Validate cron expression if provided
    if (data.cronExpression && !cron.validate(data.cronExpression)) {
      throw new Error(`Invalid cron expression: ${data.cronExpression}`);
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.cronExpression !== undefined) updateData.cronExpression = data.cronExpression;
    if (data.taskData !== undefined) updateData.taskData = JSON.stringify(data.taskData);
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.backupLimit !== undefined) updateData.backupLimit = data.backupLimit;

    // Update task in database
    const task = await prisma.scheduledTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        server: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Reschedule task
    if (task.enabled) {
      this.scheduleTask(task);
    } else {
      // Stop task if disabled
      if (this.tasks.has(taskId)) {
        this.tasks.get(taskId)?.stop();
        this.tasks.delete(taskId);
      }
    }

    return task;
  }

  /**
   * Delete a scheduled task
   */
  async deleteTask(taskId: string): Promise<void> {
    // Stop scheduled task
    if (this.tasks.has(taskId)) {
      this.tasks.get(taskId)?.stop();
      this.tasks.delete(taskId);
    }

    // Delete from database
    await prisma.scheduledTask.delete({
      where: { id: taskId },
    });

    logger.info(`Deleted scheduled task: ${taskId}`);
  }

  /**
   * Toggle task enabled/disabled
   */
  async toggleTask(taskId: string, enabled: boolean): Promise<any> {
    return this.updateTask(taskId, { enabled });
  }

  /**
   * List all tasks for a server
   */
  async listTasks(serverId?: string): Promise<any[]> {
    const tasks = await prisma.scheduledTask.findMany({
      where: serverId ? { serverId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        server: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return tasks;
  }

  /**
   * Get a single task
   */
  async getTask(taskId: string): Promise<any> {
    const task = await prisma.scheduledTask.findUnique({
      where: { id: taskId },
      include: {
        server: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }

  /**
   * Run a task immediately (manual trigger)
   */
  async runTaskNow(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    await this.executeTask(task);
  }

  /**
   * Cleanup - stop all scheduled tasks
   */
  cleanup(): void {
    logger.info('Stopping all scheduled tasks...');
    for (const [taskId, cronTask] of this.tasks) {
      cronTask.stop();
      logger.info(`Stopped task: ${taskId}`);
    }
    this.tasks.clear();
    logger.info('All scheduled tasks stopped');
  }
}
