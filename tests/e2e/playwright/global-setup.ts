// Test server is now run as a separate Docker container (test-server)
// No need to start it here when running in Docker
// If running tests locally (not in Docker), uncomment the code below:
/*
import { startTestServer } from '../../fixtures/server.js';

export default async function globalSetup(): Promise<void> {
  // Only start test server if not in Docker (no TEST_SERVER_URL env var means local run)
  if (!process.env.TEST_SERVER_URL) {
    await startTestServer();
  }
}
*/

export default async function globalSetup(): Promise<void> {
  // Test server is managed by Docker Compose as a separate service
  // No action needed here
}

