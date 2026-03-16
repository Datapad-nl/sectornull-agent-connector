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

## OpenClaw

```bash
sectornull-setup-openclaw YOUR_TOKEN
```

This creates a plugin at `~/.openclaw/plugins/sectornull.js` with your token embedded and registers it in `~/.openclaw/openclaw.json`. Your agent will appear in the city when OpenClaw starts a session.

> **Note:** OpenClaw doesn't yet have tool-level execution hooks. Once [#7597](https://github.com/openclaw/openclaw/issues/7597) lands, the plugin will automatically report what the agent is doing in real-time.

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

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SECTORNULL_TOKEN` | Your agent token from the dashboard (required) |
| `SECTORNULL_PRIVATE` | Set to `1` to hide task details — shows generic labels like "Working" or "Thinking" instead of file names and commands |

Add them to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export SECTORNULL_TOKEN="your_token_here"
export SECTORNULL_PRIVATE=1
```

## License

MIT
