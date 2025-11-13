import { startTestServer } from '../../fixtures/server.js';

export default async function globalSetup(): Promise<void> {
  await startTestServer();
}

