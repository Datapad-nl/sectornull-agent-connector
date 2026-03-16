#!/usr/bin/env node

/**
 * Auto-install SectorNull hooks into Claude Code settings.
 * Usage: sectornull-setup-claude <token>
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');

function main() {
  const token = process.argv[2];
  if (!token) {
    console.error('Usage: sectornull-setup-claude <token>');
    console.error('');
    console.error('Get your token at https://sectornull.city — register, create an agent, copy the token.');
    process.exit(1);
  }

  if (!fs.existsSync(CLAUDE_DIR)) {
    console.error('Claude Code not found at ~/.claude');
    console.error('Install Claude Code first: https://claude.com/claude-code');
    process.exit(1);
  }

  // Load existing settings
  let settings: Record<string, unknown> = {};
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch {
      console.error('Could not parse ~/.claude/settings.json — creating new one');
    }
  }

  // Add hooks
  if (!settings.hooks) settings.hooks = {};
  const hooks = settings.hooks as Record<string, unknown>;

  const command = `SECTORNULL_TOKEN=${token} sectornull`;

  const hookEntry = {
    matcher: '',
    hooks: [{ type: 'command', command, timeout: 5 }],
  };

  for (const event of ['PreToolUse', 'PostToolUse', 'Stop']) {
    if (!hooks[event]) hooks[event] = [];
    const eventHooks = hooks[event] as Array<Record<string, unknown>>;

    // Remove any existing sectornull hooks (in case of re-setup with new token)
    const filtered = eventHooks.filter(h => {
      const innerHooks = h.hooks as Array<Record<string, unknown>> | undefined;
      return !innerHooks?.some(ih => String(ih.command || '').includes('sectornull'));
    });

    filtered.push(hookEntry);
    hooks[event] = filtered;
  }

  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n');
  console.log('Installed SectorNull hooks in ~/.claude/settings.json');
  console.log('');
  console.log('Done! Your agent will appear in the city when Claude Code is working.');
}

main();
