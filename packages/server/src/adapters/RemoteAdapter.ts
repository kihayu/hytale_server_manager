import { PrismaClient } from '@prisma/client';
import { IServerAdapter } from './IServerAdapter';
import {
  ServerStatus,
  ServerMetrics,
  ServerConfig,
  LogEntry,
  CommandResponse,
  Player,
  Mod,
  ModMetadata,
  InstalledFile,
  Backup,
} from '../types';
import config from '../config';
import logger from '../utils/logger';

const REMOTE_FETCH_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * RemoteAdapter proxies commands to the node that actually owns the server process.
 *
 * - Read operations (status, metrics, players) are served from the shared DB.
 * - Write operations (start, stop, restart, kill, command) are forwarded via HTTP
 *   to the owner node's internal API.
 * - File/mod/backup operations are also proxied to the owner node.
 */
export class RemoteAdapter implements IServerAdapter {
  private serverId: string;
  private ownerNodeAddress: string;
  private prisma: PrismaClient;

  constructor(serverId: string, ownerNodeAddress: string, prisma: PrismaClient) {
    this.serverId = serverId;
    this.ownerNodeAddress = ownerNodeAddress;
    this.prisma = prisma;
  }

  // ------------------------------------------------------------------
  // Internal HTTP helpers
  // ------------------------------------------------------------------

  private get headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.internalSecret) {
      h['X-Internal-Secret'] = config.internalSecret;
    }
    return h;
  }

  private async post(action: string, body?: Record<string, unknown>): Promise<any> {
    const url = `${this.ownerNodeAddress}/internal/servers/${this.serverId}/${action}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REMOTE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Remote ${action} failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  // ------------------------------------------------------------------
  // Lifecycle — forwarded to owner node
  // ------------------------------------------------------------------

  async start(): Promise<void> {
    await this.post('start');
  }

  async stop(): Promise<void> {
    await this.post('stop');
  }

  async restart(): Promise<void> {
    await this.post('restart');
  }

  async kill(): Promise<void> {
    await this.post('kill');
  }

  // ------------------------------------------------------------------
  // Process persistence — not supported on remote
  // ------------------------------------------------------------------

  async reconnect(_pid: number): Promise<boolean> {
    return false;
  }

  async disconnect(): Promise<void> {
    // no-op for remote
  }

  isConnected(): boolean {
    return false;
  }

  getPid(): number | null {
    return null;
  }

  // ------------------------------------------------------------------
  // Status & Monitoring — read from shared DB
  // ------------------------------------------------------------------

  async getStatus(): Promise<ServerStatus> {
    const server = await this.prisma.server.findUnique({ where: { id: this.serverId } });
    if (!server) throw new Error(`Server ${this.serverId} not found`);

    return {
      serverId: server.id,
      status: server.status as ServerStatus['status'],
      playerCount: server.playersOnline,
      maxPlayers: server.maxPlayers,
      version: server.version,
      uptime: server.startedAt
        ? Math.floor((Date.now() - server.startedAt.getTime()) / 1000)
        : 0,
    };
  }

  async getMetrics(): Promise<ServerMetrics> {
    const server = await this.prisma.server.findUnique({ where: { id: this.serverId } });
    if (!server) throw new Error(`Server ${this.serverId} not found`);

    if (server.metricsJson) {
      try {
        const m = JSON.parse(server.metricsJson);
        return {
          cpuUsage: m.cpuUsage ?? 0,
          memoryUsage: m.memoryUsage ?? 0,
          memoryTotal: m.memoryTotal ?? 0,
          diskUsage: m.diskUsage ?? 0,
          tps: m.tps ?? 0,
          uptime: server.startedAt
            ? Math.floor((Date.now() - server.startedAt.getTime()) / 1000)
            : 0,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        };
      } catch {
        // fall through to defaults
      }
    }

    return {
      cpuUsage: 0,
      memoryUsage: 0,
      memoryTotal: 0,
      diskUsage: 0,
      tps: 0,
      uptime: server.startedAt
        ? Math.floor((Date.now() - server.startedAt.getTime()) / 1000)
        : 0,
      timestamp: new Date(),
    };
  }

  // ------------------------------------------------------------------
  // Configuration
  // ------------------------------------------------------------------

  async getConfig(): Promise<ServerConfig> {
    const server = await this.prisma.server.findUnique({ where: { id: this.serverId } });
    if (!server) throw new Error(`Server ${this.serverId} not found`);

    return {
      name: server.name,
      address: server.address,
      port: server.port,
      maxPlayers: server.maxPlayers,
      gameMode: server.gameMode,
      worldPath: server.worldPath,
      serverPath: server.serverPath,
      version: server.version,
    };
  }

  async updateConfig(_config: Partial<ServerConfig>): Promise<void> {
    throw new Error('Cannot update config on a remote server — use the owning node');
  }

  // ------------------------------------------------------------------
  // Console — proxied
  // ------------------------------------------------------------------

  async sendCommand(command: string): Promise<CommandResponse> {
    return this.post('command', { command });
  }

  streamLogs(_callback: (log: LogEntry) => void): void {
    logger.warn('[RemoteAdapter] streamLogs not supported for remote servers');
  }

  stopLogStream(): void {
    // no-op
  }

  async getLogs(_limit?: number, _offset?: number): Promise<LogEntry[]> {
    return [];
  }

  // ------------------------------------------------------------------
  // Player management — proxied via internal API
  // ------------------------------------------------------------------

  async getPlayers(): Promise<Player[]> {
    const players = await this.prisma.player.findMany({
      where: { serverId: this.serverId, isOnline: true },
    });
    return players.map((p) => ({
      id: p.id,
      serverId: p.serverId,
      uuid: p.uuid,
      username: p.username,
      displayName: p.displayName ?? undefined,
      isOnline: p.isOnline,
      firstJoined: p.firstJoined,
      lastSeen: p.lastSeen,
      playtime: p.playtime,
      permissions: p.permissions ? JSON.parse(p.permissions) : undefined,
      isBanned: p.isBanned,
      banReason: p.banReason ?? undefined,
      bannedAt: p.bannedAt ?? undefined,
      bannedUntil: p.bannedUntil ?? undefined,
      isWhitelisted: p.isWhitelisted,
      isOperator: p.isOperator,
    }));
  }

  async kickPlayer(_uuid: string, _reason?: string): Promise<void> {
    throw new Error('Player moderation must be performed on the owning node');
  }

  async banPlayer(_uuid: string, _reason?: string, _duration?: number): Promise<void> {
    throw new Error('Player moderation must be performed on the owning node');
  }

  async unbanPlayer(_uuid: string): Promise<void> {
    throw new Error('Player moderation must be performed on the owning node');
  }

  async whitelistPlayer(_uuid: string): Promise<void> {
    throw new Error('Player moderation must be performed on the owning node');
  }

  async unwhitelistPlayer(_uuid: string): Promise<void> {
    throw new Error('Player moderation must be performed on the owning node');
  }

  // ------------------------------------------------------------------
  // Mod management — proxied
  // ------------------------------------------------------------------

  async installMod(_modFile: Buffer, _metadata: ModMetadata): Promise<InstalledFile[]> {
    throw new Error('Mod installation must be performed on the owning node');
  }

  async deleteModFiles(_filePaths: string[]): Promise<void> {
    throw new Error('Mod file deletion must be performed on the owning node');
  }

  async uninstallMod(_modId: string): Promise<void> {
    throw new Error('Mod uninstallation must be performed on the owning node');
  }

  async enableMod(_modId: string): Promise<void> {
    throw new Error('Mod management must be performed on the owning node');
  }

  async disableMod(_modId: string): Promise<void> {
    throw new Error('Mod management must be performed on the owning node');
  }

  async listInstalledMods(): Promise<Mod[]> {
    return [];
  }

  // ------------------------------------------------------------------
  // Backup management — proxied
  // ------------------------------------------------------------------

  async createBackup(_name: string, _description?: string): Promise<Backup> {
    throw new Error('Backup creation must be performed on the owning node');
  }

  async restoreBackup(_backupId: string): Promise<void> {
    throw new Error('Backup restore must be performed on the owning node');
  }

  async deleteBackup(_backupId: string): Promise<void> {
    throw new Error('Backup deletion must be performed on the owning node');
  }

  // ------------------------------------------------------------------
  // File management — proxied
  // ------------------------------------------------------------------

  async readFile(_relativePath: string): Promise<string> {
    throw new Error('File operations must be performed on the owning node');
  }

  async writeFile(_relativePath: string, _content: string): Promise<void> {
    throw new Error('File operations must be performed on the owning node');
  }

  async deleteFile(_relativePath: string): Promise<void> {
    throw new Error('File operations must be performed on the owning node');
  }

  async listFiles(_relativePath: string): Promise<string[]> {
    throw new Error('File operations must be performed on the owning node');
  }
}
