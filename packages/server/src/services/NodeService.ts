import { PrismaClient } from '@prisma/client';
import config from '../config';
import logger from '../utils/logger';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
const STALE_THRESHOLD_MS = 90_000; // 90 seconds

const LEADER_LEASE_TTL_MS = 60_000; // 60 seconds
const LEADER_RENEW_INTERVAL_MS = 30_000; // 30 seconds

/** Shape of the Node row. Matches the generated Prisma Node model. */
export interface NodeRecord {
  id: string;
  address: string;
  lastHeartbeat: Date;
  startedAt: Date;
}

export class NodeService {
  private prisma: PrismaClient;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private leaderRenewTimer: ReturnType<typeof setInterval> | null = null;
  private _isLeader: boolean = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /** Prisma delegate for the Node model. */
  private get nodeModel() {
    return this.prisma.node;
  }

  /** Prisma delegate for the LeaderElection model. */
  private get leaderModel() {
    return this.prisma.leaderElection;
  }

  /**
   * Register this node in the database and start the heartbeat loop.
   * Called once at startup.
   */
  async register(): Promise<void> {
    if (!config.internalAddress) {
      logger.info('[NodeService] INTERNAL_ADDRESS not set — skipping node registration (single-node mode)');
      return;
    }

    await this.nodeModel.upsert({
      where: { id: config.nodeId },
      update: {
        address: config.internalAddress,
        lastHeartbeat: new Date(),
      },
      create: {
        id: config.nodeId,
        address: config.internalAddress,
        lastHeartbeat: new Date(),
        startedAt: new Date(),
      },
    });

    logger.info(`[NodeService] Registered node ${config.nodeId} at ${config.internalAddress}`);
    this.startHeartbeat();
  }

  /**
   * Start the periodic heartbeat that updates lastHeartbeat in the DB.
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;

    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.nodeModel.update({
          where: { id: config.nodeId },
          data: { lastHeartbeat: new Date() },
        });
      } catch (err) {
        logger.error('[NodeService] Heartbeat failed:', err);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Check whether a node is still alive based on its last heartbeat.
   */
  isAlive(node: NodeRecord): boolean {
    return Date.now() - node.lastHeartbeat.getTime() < STALE_THRESHOLD_MS;
  }

  /**
   * Look up a node by ID. Returns null if not found.
   */
  async getNode(nodeId: string): Promise<NodeRecord | null> {
    return this.nodeModel.findUnique({ where: { id: nodeId } });
  }

  // ── Leader Election ────────────────────────────────────────────────

  /**
   * Check if this node currently holds the scheduler leadership lease.
   * In single-node mode (no INTERNAL_ADDRESS), always returns true.
   */
  isLeader(): boolean {
    if (!config.internalAddress) return true; // single-node auto-elects
    return this._isLeader;
  }

  /**
   * Attempt to acquire the scheduler leadership lease using an atomic
   * INSERT ... ON CONFLICT UPDATE ... WHERE to prevent TOCTOU races.
   * Succeeds if no lease exists, the lease has expired, or we already own it.
   * Returns true if this node is now the leader.
   */
  async tryAcquireLeadership(): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LEADER_LEASE_TTL_MS);

    try {
      // Atomic upsert: insert if no row exists, or update only if we own it
      // or the existing lease has expired. The WHERE clause on the ON CONFLICT
      // ensures only one node can win even under concurrent execution.
      const result: number = await this.prisma.$executeRaw`
        INSERT INTO "LeaderElection" ("id", "nodeId", "expiresAt")
        VALUES ('scheduler', ${config.nodeId}, ${expiresAt})
        ON CONFLICT ("id") DO UPDATE
        SET "nodeId" = ${config.nodeId}, "expiresAt" = ${expiresAt}
        WHERE "LeaderElection"."nodeId" = ${config.nodeId}
           OR "LeaderElection"."expiresAt" < ${now}
      `;

      if (result > 0) {
        this._isLeader = true;
        logger.info(`[NodeService] Acquired scheduler leadership (atomic upsert)`);
        this.startLeaderRenewal();
        return true;
      }

      // Another node holds a valid lease
      this._isLeader = false;
      return false;
    } catch (err) {
      logger.warn('[NodeService] Leadership acquisition failed:', err);
      this._isLeader = false;
      return false;
    }
  }

  /**
   * Renew the leadership lease. Only succeeds if we still own it.
   */
  async renewLeadership(): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + LEADER_LEASE_TTL_MS);
      const result = await this.leaderModel.updateMany({
        where: { id: 'scheduler', nodeId: config.nodeId },
        data: { expiresAt },
      });

      if (result.count === 0) {
        // Lost leadership (another node took over after our lease expired)
        this._isLeader = false;
        this.stopLeaderRenewal();
        logger.warn('[NodeService] Lost scheduler leadership — lease was taken by another node');
        return false;
      }

      return true;
    } catch (err) {
      logger.error('[NodeService] Leadership renewal failed:', err);
      this._isLeader = false;
      this.stopLeaderRenewal();
      return false;
    }
  }

  /**
   * Release the leadership lease on graceful shutdown so another node
   * can take over immediately instead of waiting for TTL expiry.
   */
  async releaseLeadership(): Promise<void> {
    this.stopLeaderRenewal();

    if (!this._isLeader) return;

    try {
      await this.leaderModel.deleteMany({
        where: { id: 'scheduler', nodeId: config.nodeId },
      });
      this._isLeader = false;
      logger.info('[NodeService] Released scheduler leadership');
    } catch (err) {
      logger.warn('[NodeService] Failed to release leadership (best-effort):', err);
    }
  }

  /**
   * Start the periodic lease renewal (called when we become leader).
   */
  private startLeaderRenewal(): void {
    if (this.leaderRenewTimer) return;

    this.leaderRenewTimer = setInterval(async () => {
      await this.renewLeadership();
    }, LEADER_RENEW_INTERVAL_MS);
  }

  /**
   * Stop the lease renewal timer.
   */
  private stopLeaderRenewal(): void {
    if (this.leaderRenewTimer) {
      clearInterval(this.leaderRenewTimer);
      this.leaderRenewTimer = null;
    }
  }

  /**
   * Best-effort deregistration on shutdown.
   * Clears node ownership from all servers before removing the node row.
   */
  async deregister(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Release leadership before deregistering the node
    await this.releaseLeadership();

    if (!config.internalAddress) return;

    try {
      // Clear nodeId on all servers owned by this node so they can be
      // recovered by another node (prevents orphaned ownership references)
      await this.prisma.server.updateMany({
        where: { nodeId: config.nodeId },
        data: { nodeId: null },
      });

      await this.nodeModel.delete({ where: { id: config.nodeId } });
      logger.info(`[NodeService] Deregistered node ${config.nodeId}`);
    } catch (err) {
      logger.warn('[NodeService] Failed to deregister node (best-effort):', err);
    }
  }
}
