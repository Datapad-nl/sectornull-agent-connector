/**
 * Example: Connect Claude Code to SectorNull via hooks
 *
 * Add this to your Claude Code hooks config to broadcast
 * what Claude is working on to the SectorNull city.
 *
 * Usage: ts-node claude-code-hook.ts "working" "Fixing bug in auth module" "50"
 */
import { SectorNullAgent } from '../src';

const [, , status, task, progress] = process.argv;

const agent = new SectorNullAgent({
  name: 'claude-code',
  agentType: 'claude-code',
  avatarColor: '#cc8800',
  serverUrl: 'wss://sectornull.city',
});

agent.connect().then(() => {
  if (status === 'working') {
    agent.working(task || 'Working...', parseInt(progress) || 0);
  } else if (status === 'error') {
    agent.error(task || 'Something went wrong');
  } else {
    agent.idle();
  }

  // Keep alive for 5 seconds to ensure message is sent
  setTimeout(() => agent.disconnect(), 5000);
}).catch(console.error);
