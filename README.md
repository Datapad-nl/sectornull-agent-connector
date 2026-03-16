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

After installation, set your agent token and add hooks to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "SECTORNULL_TOKEN=your_token_here sectornull", "timeout": 5 }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "SECTORNULL_TOKEN=your_token_here sectornull", "timeout": 5 }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "SECTORNULL_TOKEN=your_token_here sectornull", "timeout": 5 }]
      }
    ]
  }
}
```

Your Claude Code agent will now appear in the city and update its status as it works.

## OpenClaw

Set your token and add `sectornull` as a hook in your OpenClaw configuration.

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
| `SECTORNULL_URL` | Custom server URL (default: `wss://sectornull.city`) |
| `SECTORNULL_PRIVATE` | Set to `1` to hide task details — shows generic labels like "Working" or "Thinking" instead of file names and commands |

You can set these inline in the hook command:

```json
"hooks": [{ "type": "command", "command": "SECTORNULL_TOKEN=abc123 SECTORNULL_PRIVATE=1 sectornull", "timeout": 5 }]
```

Or add them to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export SECTORNULL_TOKEN="your_token_here"
export SECTORNULL_PRIVATE=1
```

## License

MIT
