import { io, Socket } from 'socket.io-client';
import { env } from '../config';

const WS_BASE_URL = env.websocket.url || env.api.baseUrl;

// WebSocket event payload types
interface ServerEventBase {
  serverId: string;
}

export interface ServerStatusData extends ServerEventBase {
  status: { status: string; playerCount: number };
}

export interface ServerMetricsData extends ServerEventBase {
  metrics: { cpuUsage: number; memoryUsage: number; memoryTotal: number; tps: number; uptime: number };
}

export interface ConsoleLogData extends ServerEventBase {
  log: { timestamp: string; level: string; message: string; source?: string };
}

export interface ConsoleHistoricalLogsData extends ServerEventBase {
  logs: Array<{ id?: string; timestamp: string; level: string; message: string; source?: string }>;
}

export interface ConsoleCommandResponseData extends ServerEventBase {
  response: { success: boolean; output?: string; error?: string };
}

export interface ServerUpdateStartedData extends ServerEventBase {
  sessionId: string;
  [key: string]: unknown;
}

export interface ServerUpdateProgressData extends ServerEventBase {
  sessionId: string;
  status: string;
  progress: number;
  message?: string;
  [key: string]: unknown;
}

export interface ServerUpdateFailedData extends ServerEventBase {
  error?: string;
  [key: string]: unknown;
}

export interface ServerUpdateEventData extends ServerEventBase {
  [key: string]: unknown;
}

export interface UpdatesAvailableData {
  [key: string]: unknown;
}

class WebSocketService {
  private baseUrl: string;
  private serversSocket: Socket | null = null;
  private consoleSocket: Socket | null = null;
  private serverUpdatesSocket: Socket | null = null;

  constructor(baseUrl: string = WS_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  // ============================================
  // Server Events (/servers namespace)
  // ============================================

  connectToServers(): Socket {
    if (this.serversSocket?.connected) {
      return this.serversSocket;
    }

    if (this.serversSocket) {
      this.serversSocket.disconnect();
    }

    this.serversSocket = io(`${this.baseUrl}/servers`, {
      transports: ['websocket', 'polling'],
      // Use function to always get fresh token on reconnect
      auth: (cb) => cb({ token: this.getToken() }),
      reconnection: true,
      reconnectionAttempts: env.websocket.reconnectAttempts,
      reconnectionDelay: env.websocket.reconnectDelay,
    });

    this.serversSocket.on('connect', () => {
      console.log('[WS] Connected to /servers');
    });

    this.serversSocket.on('connect_error', (err) => {
      console.error('[WS] /servers error:', err.message);
    });

    return this.serversSocket;
  }

  subscribeToServer(serverId: string, callbacks: {
    onStatus?: (data: ServerStatusData) => void;
    onMetrics?: (data: ServerMetricsData) => void;
  }): () => void {
    const socket = this.connectToServers();

    const subscribe = () => {
      socket.emit('subscribe', { serverId });
    };

    // Use 'on' instead of 'once' so subscriptions are re-established on reconnect
    socket.on('connect', subscribe);
    if (socket.connected) {
      subscribe();
    }

    if (callbacks.onStatus) {
      socket.on('server:status', (data: ServerStatusData) => {
        if (data.serverId === serverId) callbacks.onStatus!(data);
      });
    }

    if (callbacks.onMetrics) {
      socket.on('server:metrics', (data: ServerMetricsData) => {
        if (data.serverId === serverId) callbacks.onMetrics!(data);
      });
    }

    return () => {
      socket.emit('unsubscribe', { serverId });
    };
  }

  disconnectFromServers(): void {
    this.serversSocket?.disconnect();
    this.serversSocket = null;
  }

  // ============================================
  // Console Events (/console namespace)
  // ============================================

  connectToConsole(): Socket {
    if (this.consoleSocket?.connected) {
      return this.consoleSocket;
    }

    if (this.consoleSocket) {
      this.consoleSocket.disconnect();
    }

    this.consoleSocket = io(`${this.baseUrl}/console`, {
      transports: ['websocket', 'polling'],
      // Use function to always get fresh token on reconnect
      auth: (cb) => cb({ token: this.getToken() }),
      reconnection: true,
      reconnectionAttempts: env.websocket.reconnectAttempts,
      reconnectionDelay: env.websocket.reconnectDelay,
    });

    this.consoleSocket.on('connect', () => {
      console.log('[WS] Connected to /console');
    });

    this.consoleSocket.on('connect_error', (err) => {
      console.error('[WS] /console error:', err.message);
    });

    return this.consoleSocket;
  }

  subscribeToConsole(serverId: string, callbacks: {
    onLog?: (data: ConsoleLogData) => void;
    onHistoricalLogs?: (data: ConsoleHistoricalLogsData) => void;
    onCommandResponse?: (data: ConsoleCommandResponseData) => void;
  }): () => void {
    const socket = this.connectToConsole();

    const subscribe = () => {
      console.log('[WS] Subscribing to console:', serverId);
      socket.emit('subscribe', { serverId });
    };

    // Use 'on' instead of 'once' so subscriptions are re-established on reconnect
    socket.on('connect', subscribe);
    if (socket.connected) {
      subscribe();
    }

    if (callbacks.onLog) {
      socket.on('log', (data: ConsoleLogData) => {
        if (data.serverId === serverId) callbacks.onLog!(data);
      });
    }

    if (callbacks.onHistoricalLogs) {
      socket.on('logs:history', (data: ConsoleHistoricalLogsData) => {
        if (data.serverId === serverId) callbacks.onHistoricalLogs!(data);
      });
    }

    if (callbacks.onCommandResponse) {
      socket.on('commandResponse', (data: ConsoleCommandResponseData) => {
        if (data.serverId === serverId) callbacks.onCommandResponse!(data);
      });
    }

    return () => {
      socket.emit('unsubscribe', { serverId });
    };
  }

  sendCommand(serverId: string, command: string): void {
    const socket = this.connectToConsole();
    if (socket.connected) {
      socket.emit('command', { serverId, command });
    } else {
      socket.once('connect', () => {
        socket.emit('command', { serverId, command });
      });
    }
  }

  disconnectFromConsole(): void {
    this.consoleSocket?.disconnect();
    this.consoleSocket = null;
  }

  // ============================================
  // Server Updates (/server-updates namespace)
  // ============================================

  connectToServerUpdates(): Socket {
    if (this.serverUpdatesSocket?.connected) {
      return this.serverUpdatesSocket;
    }

    if (this.serverUpdatesSocket) {
      this.serverUpdatesSocket.disconnect();
    }

    this.serverUpdatesSocket = io(`${this.baseUrl}/server-updates`, {
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: this.getToken() }),
      reconnection: true,
      reconnectionAttempts: env.websocket.reconnectAttempts,
      reconnectionDelay: env.websocket.reconnectDelay,
    });

    this.serverUpdatesSocket.on('connect', () => {
      console.log('[WS] Connected to /server-updates');
    });

    this.serverUpdatesSocket.on('connect_error', (err) => {
      console.error('[WS] /server-updates error:', err.message);
    });

    return this.serverUpdatesSocket;
  }

  subscribeToServerUpdates(serverId: string | null, callbacks: {
    onStarted?: (data: ServerUpdateStartedData) => void;
    onProgress?: (data: ServerUpdateProgressData) => void;
    onCompleted?: (data: ServerUpdateEventData) => void;
    onFailed?: (data: ServerUpdateFailedData) => void;
    onCancelled?: (data: ServerUpdateEventData) => void;
    onRollbackCompleted?: (data: ServerUpdateEventData) => void;
    onUpdatesAvailable?: (data: UpdatesAvailableData) => void;
  }): () => void {
    const socket = this.connectToServerUpdates();

    const subscribe = () => {
      socket.emit('subscribe', { serverId });
    };

    // Use 'on' instead of 'once' so subscriptions are re-established on reconnect
    socket.on('connect', subscribe);
    if (socket.connected) {
      subscribe();
    }

    if (callbacks.onStarted) {
      socket.on('update:started', (data: ServerUpdateStartedData) => {
        if (!serverId || data.serverId === serverId) callbacks.onStarted!(data);
      });
    }

    if (callbacks.onProgress) {
      socket.on('update:progress', (data: ServerUpdateProgressData) => {
        if (!serverId || data.serverId === serverId) callbacks.onProgress!(data);
      });
    }

    if (callbacks.onCompleted) {
      socket.on('update:completed', (data: ServerUpdateEventData) => {
        if (!serverId || data.serverId === serverId) callbacks.onCompleted!(data);
      });
    }

    if (callbacks.onFailed) {
      socket.on('update:failed', (data: ServerUpdateFailedData) => {
        if (!serverId || data.serverId === serverId) callbacks.onFailed!(data);
      });
    }

    if (callbacks.onCancelled) {
      socket.on('update:cancelled', (data: ServerUpdateEventData) => {
        if (!serverId || data.serverId === serverId) callbacks.onCancelled!(data);
      });
    }

    if (callbacks.onRollbackCompleted) {
      socket.on('update:rollback-completed', (data: ServerUpdateEventData) => {
        if (!serverId || data.serverId === serverId) callbacks.onRollbackCompleted!(data);
      });
    }

    if (callbacks.onUpdatesAvailable) {
      socket.on('updates:available', callbacks.onUpdatesAvailable);
    }

    return () => {
      socket.emit('unsubscribe', { serverId });
    };
  }

  disconnectFromServerUpdates(): void {
    this.serverUpdatesSocket?.disconnect();
    this.serverUpdatesSocket = null;
  }

  // ============================================
  // Cleanup
  // ============================================

  disconnectAll(): void {
    this.disconnectFromServers();
    this.disconnectFromConsole();
    this.disconnectFromServerUpdates();
  }

  // Reconnect with fresh token (call after login/token refresh)
  reconnect(): void {
    const wasConsoleConnected = this.consoleSocket?.connected;
    const wasServersConnected = this.serversSocket?.connected;
    const wasServerUpdatesConnected = this.serverUpdatesSocket?.connected;

    this.disconnectAll();

    if (wasServersConnected) {
      this.connectToServers();
    }
    if (wasConsoleConnected) {
      this.connectToConsole();
    }
    if (wasServerUpdatesConnected) {
      this.connectToServerUpdates();
    }
  }
}

export const websocket = new WebSocketService();
export default websocket;
