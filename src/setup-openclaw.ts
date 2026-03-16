#!/usr/bin/env node

/**
 * Auto-install SectorNull plugin into OpenClaw.
 * Usage: sectornull-setup-openclaw <token>
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const OPENCLAW_DIR = path.join(os.homedir(), '.openclaw');
const PLUGINS_DIR = path.join(OPENCLAW_DIR, 'plugins');
const PLUGIN_DIR = path.join(PLUGINS_DIR, 'sectornull');
const PLUGIN_FILE = path.join(PLUGIN_DIR, 'index.js');
const MANIFEST_FILE = path.join(PLUGIN_DIR, 'openclaw.plugin.json');
const CONFIG_FILE = path.join(OPENCLAW_DIR, 'openclaw.json');

function getPluginCode(token: string): string {
  return `const { SectorNullAgent } = require('sectornull-agent-connector');

module.exports = {
  name: 'sectornull',
  async activate(context) {
    const token = '${token}';

    const agent = new SectorNullAgent({ token });

    try {
      await agent.connect();
      console.log('[SectorNull] Connected to city');
    } catch (err) {
      console.error('[SectorNull] Failed to connect:', err.message);
      return;
    }

    let idleTimer = null;

    context.on('agent:bootstrap', () => {
      agent.working('Starting session');
    });

    context.on('tool_result_persist', (result) => {
      const toolName = result?.tool_name || result?.name || 'tool';
      agent.working('Using ' + toolName);

      // Go idle after 10s of no tool activity
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => agent.idle(), 10000);
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
}

function main() {
  const token = process.argv[2];
  if (!token) {
    console.error('Usage: sectornull-setup-openclaw <token>');
    console.error('');
    console.error('Get your token at https://sectornull.city — register, create an agent, copy the token.');
    process.exit(1);
  }

  // Check if OpenClaw is installed
  if (!fs.existsSync(OPENCLAW_DIR)) {
    console.error('OpenClaw not found at ~/.openclaw');
    console.error('Install OpenClaw first: https://github.com/openclaw/openclaw');
    process.exit(1);
  }

  // Create plugin directory
  if (!fs.existsSync(PLUGIN_DIR)) {
    fs.mkdirSync(PLUGIN_DIR, { recursive: true });
  }

  // Write plugin manifest
  const manifest = {
    id: 'sectornull',
    name: 'SectorNull',
    version: '1.0.0',
    description: 'Connect your agent to the SectorNull cyberpunk city',
    entry: 'index.js',
  };
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n');

  // Write plugin code with token embedded
  fs.writeFileSync(PLUGIN_FILE, getPluginCode(token));
  console.log('Created plugin: ~/.openclaw/plugins/sectornull/');

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

  // Add plugin directory to load paths
  if (!plugins.load) plugins.load = {};
  const load = plugins.load as Record<string, unknown>;
  if (!load.paths) load.paths = [];
  const paths = load.paths as string[];
  if (!paths.includes(PLUGINS_DIR)) {
    paths.push(PLUGINS_DIR);
  }

  // Enable the plugin in entries
  if (!plugins.entries) plugins.entries = {};
  const entries = plugins.entries as Record<string, unknown>;
  entries.sectornull = {
    enabled: true,
  };

  // Add to plugins.allow list
  if (!plugins.allow) plugins.allow = [];
  const allow = plugins.allow as string[];
  if (!allow.includes('sectornull')) {
    allow.push('sectornull');
  }

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
  console.log('Registered plugin in ~/.openclaw/openclaw.json');

  console.log('');
  console.log('Done! Your agent will appear in the city when OpenClaw starts.');
}

main();
