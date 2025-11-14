import { startTestServer } from '../dist/tests/fixtures/server.js';

startTestServer()
  .then(() => {
    console.log('Test server started successfully');
  })
  .catch((error) => {
    console.error('Failed to start test server:', error);
    process.exit(1);
  });

// Keep process alive
process.on('SIGINT', () => {
  console.log('\nShutting down test server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down test server...');
  process.exit(0);
});

