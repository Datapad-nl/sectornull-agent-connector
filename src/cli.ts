#!/usr/bin/env node

/**
 * SectorNull hook command — reads Claude Code / OpenClaw hook events
 * from stdin and automatically updates the agent's status in the city.
 *
 * Usage in Claude Code settings.json:
 *   "hooks": {
 *     "PreToolUse":  [{ "matcher": "", "hooks": [{ "type": "command", "command": "sectornull", "timeout": 5 }] }],
 *     "PostToolUse": [{ "matcher": "", "hooks": [{ "type": "command", "command": "sectornull", "timeout": 5 }] }],
 *     "Stop":        [{ "matcher": "", "hooks": [{ "type": "command", "command": "sectornull", "timeout": 5 }] }]
 *   }
 */

import { SectorNullAgent } from './SectorNullAgent';

const SOCKET_TIMEOUT = 4000;
const PRIVATE_MODE = !!process.env.SECTORNULL_PRIVATE;

const PRIVATE_LABELS = [
  'Working', 'Thinking', 'Processing', 'Analyzing', 'Computing',
  'Reasoning', 'Evaluating', 'Running', 'Building', 'Compiling',
];

function privateLabel(): string {
  return PRIVATE_LABELS[Math.floor(Math.random() * PRIVATE_LABELS.length)];
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    // If no stdin after 500ms, resolve with empty
    setTimeout(() => resolve(data), 500);
  });
}

function toolNameToTask(toolName: string, toolInput: Record<string, unknown>): string {
  switch (toolName) {
    case 'Bash':
      return `Running: ${String(toolInput.command || '').slice(0, 80)}`;
    case 'Read':
      return `Reading ${String(toolInput.file_path || '').split('/').pop()}`;
    case 'Write':
      return `Writing ${String(toolInput.file_path || '').split('/').pop()}`;
    case 'Edit':
      return `Editing ${String(toolInput.file_path || '').split('/').pop()}`;
    case 'Grep':
      return `Searching for "${String(toolInput.pattern || '').slice(0, 40)}"`;
    case 'Glob':
      return `Finding files: ${String(toolInput.pattern || '').slice(0, 40)}`;
    case 'Agent':
      return `${String(toolInput.description || 'Running sub-agent')}`;
    default:
      return `Using ${toolName}`;
  }
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) {
    process.exit(0);
  }

  let input: Record<string, unknown>;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const event = String(input.hook_event_name || '');
  if (!event) process.exit(0);

  const token = process.env.SECTORNULL_TOKEN;
  if (!token) {
    console.error('[SectorNull] SECTORNULL_TOKEN not set. Get your token at sectornull.city/dashboard');
    process.exit(0);
  }

  const agent = new SectorNullAgent({ token });

  try {
    await Promise.race([
      agent.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), SOCKET_TIMEOUT)),
    ]);
  } catch {
    // Can't connect — silently exit so we don't block the host tool
    process.exit(0);
  }

  switch (event) {
    case 'PreToolUse': {
      if (PRIVATE_MODE) {
        agent.working(privateLabel());
      } else {
        const toolName = String(input.tool_name || 'unknown');
        const toolInput = (input.tool_input as Record<string, unknown>) || {};
        agent.working(toolNameToTask(toolName, toolInput));
      }
      break;
    }

    case 'PostToolUse':
    case 'PostToolUseFailure':
    case 'Stop':
    case 'SessionEnd':
      agent.idle();
      break;

    case 'SessionStart':
      agent.working(PRIVATE_MODE ? 'Working' : 'Starting session');
      break;

    default:
      // Unknown event — don't update status
      break;
  }

  // Give the message time to send, then exit
  setTimeout(() => {
    agent.disconnect();
    process.exit(0);
  }, 500);
}

main();
