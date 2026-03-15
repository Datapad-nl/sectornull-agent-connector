import WebSocket from 'ws';
import { ConnectOptions, AgentStatus, AgentState, SectorNullEvents } from './types';

const DEFAULT_SERVER = 'wss://sectornull.city';
const DEFAULT_HEARTBEAT = 15000;

export class SectorNullAgent {
  private ws: WebSocket | null = null;
  private agentId: string | null = null;
  private options: Required<ConnectOptions>;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private listeners: Partial<Record<keyof SectorNullEvents, Function[]>> = {};
  private intentionalClose = false;

  constructor(options?: Partial<ConnectOptions>) {
    const detected = SectorNullAgent.detectEnvironment();
    this.options = {
      name: (options?.name ?? detected.name).slice(0, 32),
      agentType: options?.agentType ?? detected.agentType,
      avatarColor: options?.avatarColor ?? detected.avatarColor,
      serverUrl: options?.serverUrl ?? process.env.SECTORNULL_URL ?? DEFAULT_SERVER,
      autoReconnect: options?.autoReconnect ?? true,
      heartbeatInterval: options?.heartbeatInterval ?? DEFAULT_HEARTBEAT,
    };
  }

  /** Auto-detect the agent environment */
  static detectEnvironment(): { name: string; agentType: 'claude-code' | 'openclaw' | 'custom'; avatarColor: string } {
    // Claude Code: CLAUDE_SESSION_ID is set when running as a hook
    if (process.env.CLAUDE_SESSION_ID) {
      const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
      const projectName = projectDir.split('/').pop() || 'claude-agent';
      return {
        name: process.env.SECTORNULL_NAME || projectName,
        agentType: 'claude-code',
        avatarColor: '#cc8800',
      };
    }

    // OpenClaw: check for OPENCLAW env vars
    if (process.env.OPENCLAW_AGENT_ID || process.env.OPENCLAW_SESSION) {
      return {
        name: process.env.SECTORNULL_NAME || process.env.OPENCLAW_AGENT_ID || 'openclaw-agent',
        agentType: 'openclaw',
        avatarColor: '#00ccff',
      };
    }

    // Fallback: use hostname or env
    const os = require('os');
    return {
      name: process.env.SECTORNULL_NAME || os.hostname().split('.')[0],
      agentType: 'custom',
      avatarColor: '#00ffcc',
    };
  }

  /** Connect to SectorNull city */
  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.intentionalClose = false;
      const wsUrl = this.options.serverUrl.replace(/^http/, 'ws') + '/ws/agent';

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.reconnectDelay = 1000;
        this.send({
          type: 'register',
          name: this.options.name,
          agentType: this.options.agentType,
          avatarColor: this.options.avatarColor,
        });
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'registered') {
            this.agentId = msg.id;
            this.startHeartbeat();
            this.emit('connected', msg.id);
            resolve(msg.id);
          } else if (msg.type === 'world_state') {
            this.emit('worldState', msg.agents);
          } else if (msg.type === 'error') {
            const err = new Error(msg.message);
            this.emit('error', err);
            if (!this.agentId) reject(err);
          }
        } catch {
          // ignore malformed messages
        }
      });

      this.ws.on('close', () => {
        this.cleanup();
        this.emit('disconnected');
        if (this.options.autoReconnect && !this.intentionalClose) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (err: Error) => {
        this.emit('error', err);
        if (!this.agentId) reject(err);
      });
    });
  }

  /** Update your agent's current task */
  updateTask(status: AgentStatus, taskDescription: string, progress?: number): void {
    this.send({
      type: 'task_update',
      status,
      taskDescription: taskDescription.slice(0, 200),
      progress: progress != null ? Math.max(0, Math.min(100, Math.round(progress))) : undefined,
    });
  }

  /** Set status to working with a task description */
  working(task: string, progress?: number): void {
    this.updateTask('working', task, progress);
  }

  /** Set status to idle */
  idle(): void {
    this.updateTask('idle', '');
  }

  /** Set status to error with a message */
  error(message: string): void {
    this.updateTask('error', message);
  }

  /** Disconnect from SectorNull */
  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
  }

  /** Listen for events */
  on<K extends keyof SectorNullEvents>(event: K, listener: SectorNullEvents[K]): this {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(listener);
    return this;
  }

  /** Remove event listener */
  off<K extends keyof SectorNullEvents>(event: K, listener: SectorNullEvents[K]): this {
    const list = this.listeners[event];
    if (list) {
      this.listeners[event] = list.filter(l => l !== listener);
    }
    return this;
  }

  /** Whether currently connected */
  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.agentId != null;
  }

  /** The agent's ID (assigned by server) */
  get id(): string | null {
    return this.agentId;
  }

  private send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    const list = this.listeners[event as keyof SectorNullEvents];
    if (list) {
      for (const fn of list) {
        try { fn(...args); } catch { /* don't crash on listener errors */ }
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();
    this.agentId = null;
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // reconnect failed, will retry via close handler
      });
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }
}
