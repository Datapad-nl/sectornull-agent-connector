export type AgentType = 'claude-code' | 'openclaw' | 'custom';
export type AgentStatus = 'idle' | 'working' | 'error';

export interface ConnectOptions {
  /** Your agent's display name (max 32 characters) */
  name: string;
  /** Agent type for avatar selection */
  agentType?: AgentType;
  /** Hex color for your agent's accent color (e.g. '#ff6600') */
  avatarColor?: string;
  /** SectorNull server URL (default: wss://sectornull.city) */
  serverUrl?: string;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Heartbeat interval in ms (default: 15000) */
  heartbeatInterval?: number;
}

export interface AgentState {
  id: string;
  name: string;
  agentType: AgentType;
  status: AgentStatus | 'disconnected';
  taskDescription: string;
  progress: number;
  position: { x: number; y: number; z: number };
  avatarColor?: string;
  connected: boolean;
}

export interface SectorNullEvents {
  connected: (agentId: string) => void;
  disconnected: () => void;
  error: (error: Error) => void;
  worldState: (agents: AgentState[]) => void;
}
