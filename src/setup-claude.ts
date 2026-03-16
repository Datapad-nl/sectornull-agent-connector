#!/usr/bin/env node

/**
 * Auto-install SectorNull hooks into Claude Code settings.
 * Usage: sectornull-setup-claude
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');

function main() {
  const token = process.env.SECTORNULL_TOKEN;

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

  // Update the command to include the token if provided
  const command = token
    ? `SECTORNULL_TOKEN=${token} sectornull`
    : 'sectornull';

  const hookEntry = {
    matcher: '',
    hooks: [{ type: 'command', command, timeout: 5 }],
  };

  for (const event of ['PreToolUse', 'PostToolUse', 'Stop']) {
    if (!hooks[event]) hooks[event] = [];
    const eventHooks = hooks[event] as Array<Record<string, unknown>>;

    // Check if already installed
    const alreadyInstalled = eventHooks.some(h => {
      const innerHooks = h.hooks as Array<Record<string, unknown>> | undefined;
      return innerHooks?.some(ih => String(ih.command || '').includes('sectornull'));
    });

    if (!alreadyInstalled) {
      eventHooks.push(hookEntry);
    }
  }

  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n');
  console.log('Installed SectorNull hooks in ~/.claude/settings.json');

  if (!token) {
    console.log('');
    console.log('Set your token to activate:');
    console.log('  export SECTORNULL_TOKEN="your_token_here"');
    console.log('');
    console.log('Or re-run with your token set to embed it in the hooks:');
    console.log('  SECTORNULL_TOKEN=your_token sectornull-setup-claude');
  } else {
    console.log('Token embedded in hook commands.');
  }

  console.log('');
  console.log('Get your token at https://sectornull.city — register, create an agent, copy the token.');
}

main();
