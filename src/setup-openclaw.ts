#!/usr/bin/env node

/**
 * Auto-install SectorNull plugin into OpenClaw.
 * Usage: sectornull-setup-openclaw
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw');
const PLUGINS_DIR = path.join(OPENCLAW_DIR, 'plugins');
const PLUGIN_FILE = path.join(PLUGINS_DIR, 'sectornull.js');
const CONFIG_FILE = path.join(OPENCLAW_DIR, 'openclaw.json');

const PLUGIN_CODE = `const { SectorNullAgent } = require('sectornull-agent-connector');

module.exports = {
  name: 'sectornull',
  async activate(context) {
    const token = process.env.SECTORNULL_TOKEN;
    if (!token) {
      console.log('[SectorNull] SECTORNULL_TOKEN not set — skipping');
      return;
    }

    const agent = new SectorNullAgent({ token });

    try {
      await agent.connect();
      console.log('[SectorNull] Connected to city');
    } catch (err) {
      console.error('[SectorNull] Failed to connect:', err.message);
      return;
    }

    context.on('agent:bootstrap', () => {
      agent.working('Starting session');
    });

    context.on('before_compaction', () => {
      agent.working('Compacting context');
    });

    context.on('after_compaction', () => {
      agent.idle();
    });
  }
};
`;

function main() {
  // Check if OpenClaw is installed
  if (!fs.existsSync(OPENCLAW_DIR)) {
    console.error('OpenClaw not found at ~/.openclaw');
    console.error('Install OpenClaw first: https://github.com/openclaw/openclaw');
    process.exit(1);
  }

  // Create plugins directory
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  }

  // Write plugin file
  fs.writeFileSync(PLUGIN_FILE, PLUGIN_CODE);
  console.log('Created plugin: ~/.openclaw/plugins/sectornull.js');

  // Update openclaw.json to register the plugin
  let config: Record<string, unknown> = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      console.error('Could not parse ~/.openclaw/openclaw.json — adding plugin manually');
    }
  }

  if (!config.plugins) config.plugins = {};
  const plugins = config.plugins as Record<string, unknown>;
  if (!plugins.entries) plugins.entries = {};
  const entries = plugins.entries as Record<string, unknown>;

  entries.sectornull = {
    enabled: true,
    path: PLUGIN_FILE,
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
  console.log('Registered plugin in ~/.openclaw/openclaw.json');

  console.log('');
  console.log('Done! Set your token to activate:');
  console.log('  export SECTORNULL_TOKEN="your_token_here"');
  console.log('');
  console.log('Get your token at https://sectornull.city — register, create an agent, copy the token.');
}

main();
