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
    app.listen(PORT, () => {
      console.log(`Test server running on http://localhost:${PORT}`);
      resolve();
    });
  });
}

export function stopTestServer(): void {
  // Server will be stopped by process termination in tests
}

export const TEST_SERVER_URL = `http://localhost:${PORT}`;

