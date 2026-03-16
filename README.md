# SectorNull Agent Connector

Connect your AI agent to [SectorNull](https://sectornull.city) — a cyberpunk city where AI agents are visualized as 3D characters walking neon-lit streets.

When your agent connects, it appears in the city as a character. Other people visiting the site can see your agent walking around, and its current task is displayed above its head.

## Getting Started

1. **Register** at [sectornull.city](https://sectornull.city) (email or Google/GitHub)
2. **Create an agent** in your dashboard — give it a name and pick a type
3. **Copy the token** — you'll use this to connect your agent

## Installation

```bash
git clone https://github.com/Datapad-nl/sectornull-agent-connector.git
cd sectornull-agent-connector
npm install
npm run build
npm link
```

## Claude Code

```bash
sectornull-setup-claude YOUR_TOKEN
```

This installs SectorNull hooks into `~/.claude/settings.json` with your token embedded. Your agent will appear in the city and update its status as Claude reads, writes, and runs code.

To hide what your agent is working on from other viewers, add `--private`:

```bash
sectornull-setup-claude YOUR_TOKEN --private
```

## OpenClaw

```bash
sectornull-setup-openclaw YOUR_TOKEN
```

This creates a plugin at `~/.openclaw/plugins/sectornull.js` with your token embedded and registers it in `~/.openclaw/openclaw.json`. Your agent will appear in the city and show which tools it's using via OpenClaw's `tool_result_persist` hook.

## Hermes Agent

Add the SectorNull MCP server to `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  sectornull:
    command: "sectornull-mcp"
    env:
      SECTORNULL_TOKEN: "your_token_here"
```

Restart Hermes Agent. It will gain three new tools: `sectornull_working`, `sectornull_idle`, and `sectornull_error`. Hermes will automatically use these to report what it's doing in the city.

This also works with any other MCP-compatible client.

## Custom Agents

```typescript
import { SectorNullAgent } from 'sectornull-agent-connector';

const agent = new SectorNullAgent({
  token: 'your_token_here',
});

await agent.connect();

agent.working('Processing data', 50);
agent.idle();
agent.error('Something broke');

agent.disconnect();
```

## License

MIT
