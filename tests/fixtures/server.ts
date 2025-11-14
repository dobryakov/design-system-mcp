import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

// Serve fixture pages
app.use('/fixtures', express.static(path.join(__dirname, 'pages')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export function startTestServer(): Promise<void> {
  return new Promise((resolve) => {
    // Listen on all interfaces (0.0.0.0) to be accessible from other containers
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Test server running on http://0.0.0.0:${PORT}`);
      resolve();
    });
  });
}

export function stopTestServer(): void {
  // Server will be stopped by process termination in tests
}

// Start server when RUN_TEST_SERVER env var is set (for Docker container)
if (process.env.RUN_TEST_SERVER === 'true') {
  startTestServer()
    .then(() => {
      console.log('Test server started successfully on port', PORT);
      // Process will stay alive as long as the Express server is running
    })
    .catch((error) => {
      console.error('Failed to start test server:', error);
      process.exit(1);
    });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down test server...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\nShutting down test server...');
    process.exit(0);
  });
}

// For tests running in test container, use localhost
// For API container accessing test server, use test-server hostname
// This will be set by environment variable in Docker
export const TEST_SERVER_URL = process.env.TEST_SERVER_URL || `http://localhost:${PORT}`;

// URL that API container should use to access test server
// This is the URL that should be passed to the API for analysis
export const TEST_SERVER_URL_FOR_API = process.env.TEST_SERVER_URL_FOR_API || `http://test-server:${PORT}`;

