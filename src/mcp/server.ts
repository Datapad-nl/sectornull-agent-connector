#!/usr/bin/env node

/**
 * SectorNull MCP Server — connects your agent to the SectorNull city.
 *
 * Works with any MCP-compatible client (Hermes Agent, Claude Code, etc.)
 *
 * Usage in ~/.hermes/config.yaml:
 *   mcp_servers:
 *     sectornull:
 *       command: "sectornull-mcp"
 *       env:
 *         SECTORNULL_TOKEN: "your_token_here"
 */

import { SectorNullAgent } from '../SectorNullAgent';

const token = process.env.SECTORNULL_TOKEN;
if (!token) {
  process.stderr.write('[SectorNull MCP] SECTORNULL_TOKEN not set\n');
  process.exit(1);
}

const agent = new SectorNullAgent({ token });
let connected = false;

// MCP protocol: communicate via JSON-RPC over stdin/stdout
function sendResponse(id: number | string | null, result: unknown): void {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result });
  const header = `Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n`;
  process.stdout.write(header + msg);
}

function sendError(id: number | string | null, code: number, message: string): void {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
  const header = `Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n`;
  process.stdout.write(header + msg);
}

// Tool definitions
const TOOLS = [
  {
    name: 'sectornull_working',
    description: 'Report that the agent is currently working on a task. This updates the agent\'s status in the SectorNull 3D city so viewers can see what you\'re doing.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Short description of what you are working on (max 200 chars)',
        },
        progress: {
          type: 'number',
          description: 'Optional progress percentage (0-100)',
        },
      },
      required: ['task'],
    },
  },
  {
    name: 'sectornull_idle',
    description: 'Report that the agent is idle / done with the current task.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'sectornull_error',
    description: 'Report that the agent encountered an error.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Error message to display',
        },
      },
      required: ['message'],
    },
  },
];

async function ensureConnected(): Promise<void> {
  if (!connected) {
    try {
      await agent.connect();
      connected = true;
      process.stderr.write('[SectorNull MCP] Connected to city\n');
    } catch (err: unknown) {
      process.stderr.write(`[SectorNull MCP] Connection failed: ${err instanceof Error ? err.message : err}\n`);
    }
  }
}

async function handleRequest(request: Record<string, unknown>): Promise<void> {
  const id = request.id as number | string | null;
  const method = request.method as string;
  const params = (request.params || {}) as Record<string, unknown>;

  switch (method) {
    case 'initialize': {
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'sectornull',
          version: '1.0.0',
        },
      });
      break;
    }

    case 'notifications/initialized': {
      // Client acknowledged initialization — connect to SectorNull
      await ensureConnected();
      break;
    }

    case 'tools/list': {
      sendResponse(id, { tools: TOOLS });
      break;
    }

    case 'tools/call': {
      const toolName = params.name as string;
      const args = (params.arguments || {}) as Record<string, unknown>;

      await ensureConnected();

      switch (toolName) {
        case 'sectornull_working':
          agent.working(String(args.task || 'Working'), args.progress as number | undefined);
          sendResponse(id, {
            content: [{ type: 'text', text: `Status updated: working on "${args.task}"` }],
          });
          break;

        case 'sectornull_idle':
          agent.idle();
          sendResponse(id, {
            content: [{ type: 'text', text: 'Status updated: idle' }],
          });
          break;

        case 'sectornull_error':
          agent.error(String(args.message || 'Error'));
          sendResponse(id, {
            content: [{ type: 'text', text: `Status updated: error — ${args.message}` }],
          });
          break;

        default:
          sendError(id, -32601, `Unknown tool: ${toolName}`);
      }
      break;
    }

    case 'ping': {
      sendResponse(id, {});
      break;
    }

    default: {
      if (id !== null && id !== undefined) {
        sendError(id, -32601, `Method not found: ${method}`);
      }
      // Ignore notifications we don't handle
    }
  }
}

// Read JSON-RPC messages from stdin (Content-Length framing)
let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  buffer += chunk;

  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(match[1]);
    const bodyStart = headerEnd + 4;
    if (buffer.length < bodyStart + contentLength) break;

    const body = buffer.slice(bodyStart, bodyStart + contentLength);
    buffer = buffer.slice(bodyStart + contentLength);

    try {
      const request = JSON.parse(body);
      handleRequest(request).catch((err) => {
        process.stderr.write(`[SectorNull MCP] Error: ${err}\n`);
      });
    } catch {
      process.stderr.write('[SectorNull MCP] Failed to parse message\n');
    }
  }
});

process.stdin.on('end', () => {
  agent.disconnect();
  process.exit(0);
});

// Keep alive
agent.on('disconnected', () => {
  connected = false;
});

process.stderr.write('[SectorNull MCP] Server started\n');
