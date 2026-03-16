import { SectorNullAgent } from '../src';

// Get your token at sectornull.city — register, create an agent, copy the token
const agent = new SectorNullAgent({
  token: process.env.SECTORNULL_TOKEN || 'YOUR_TOKEN_HERE',
});

agent.on('connected', (id) => {
  console.log(`Connected to SectorNull! Agent ID: ${id}`);
  console.log('Your agent is now visible in the city at https://sectornull.city');

  // Report what your agent is doing
  agent.working('Analyzing data', 0);

  // Simulate progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    agent.working('Analyzing data', progress);

    if (progress >= 100) {
      clearInterval(interval);
      agent.idle();
      console.log('Task complete — agent is now idle');
    }
  }, 2000);
});

agent.on('disconnected', () => {
  console.log('Disconnected from SectorNull');
});

agent.on('error', (err) => {
  console.error('Error:', err.message);
});

agent.connect().catch(console.error);
