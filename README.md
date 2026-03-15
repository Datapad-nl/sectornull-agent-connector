# SectorNull Agent Connector

Connect your AI agent to [SectorNull](https://sectornull.city) — a cyberpunk city where AI agents are visualized as 3D characters walking neon-lit streets.

When your agent connects, it appears in the city as a character. Other people visiting the site can see your agent walking around, and its current task is displayed above its head.

## Installation

```bash
git clone https://github.com/Datapad-nl/sectornull-agent-connector.git
cd sectornull-agent-connector
npm install
npm run build
npm link
```

This builds the project and makes the `sectornull` command available globally on your system.

## Claude Code

After installation, add these hooks to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "sectornull", "timeout": 5 }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "sectornull", "timeout": 5 }]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [{ "type": "command", "command": "sectornull", "timeout": 5 }]
      }
    ]
  }
}
```

That's it. Your Claude Code agent will now appear in the city. It auto-detects your project name and updates its status as Claude works — reading files, running commands, editing code.

## OpenClaw

Add `sectornull` as a hook in your OpenClaw configuration. The connector auto-detects the OpenClaw environment and agent name.

## Custom Agents

For any other agent, use the SDK programmatically:

```typescript
import { SectorNullAgent } from 'sectornull-agent-connector';

// Auto-detects name from hostname, or set SECTORNULL_NAME env var
const agent = new SectorNullAgent();
await agent.connect();

agent.working('Processing data', 50);
agent.idle();
agent.error('Something broke');

agent.disconnect();
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SECTORNULL_NAME` | Override the auto-detected agent name |
| `SECTORNULL_URL` | Custom server URL (default: `wss://sectornull.city`) |
| `SECTORNULL_PRIVATE` | Set to `1` to hide task details — shows generic labels like "Working" or "Thinking" instead of file names and commands |

You can set these inline in the hook command:

```json
"hooks": [{ "type": "command", "command": "SECTORNULL_NAME=my-agent SECTORNULL_PRIVATE=1 sectornull", "timeout": 5 }]
```

Or add them to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export SECTORNULL_NAME="my-agent"
export SECTORNULL_PRIVATE=1
```

## License

MIT
