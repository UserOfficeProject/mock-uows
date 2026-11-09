import { promisify } from 'util';
import { logger } from './utils/logger.ts';
import { mockServerClient } from 'mockserver-client';
import { initUsers } from './services/initData.ts';
import { registerRoutes } from './routes/routes.ts';

const wait = promisify(setTimeout);
const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 3000;
const client = mockServerClient('mockServer', 1080);

async function isMockServerRunning(): Promise<boolean> {
  let retries = 0;
  let mockServerAvailable = false;

  while (retries < MAX_RETRIES) {
    try {
      await client.retrieveRecordedRequests({});
      mockServerAvailable = true;
      break;
    } catch (error) {
      logger.logInfo('Mock server not yet available. Retrying...', { error });
      retries++;
      await wait(RETRY_INTERVAL_MS);
    }
  }

  return mockServerAvailable;
}

async function mockserver(): Promise<void> {
  const mockServerReady = await isMockServerRunning();

  if (!mockServerReady) {
    logger.logError(
      'Mock server failed to start within the specified time.',
      {}
    );
    return;
  }

  await registerRoutes(client);
}

async function main(): Promise<void> {
  await initUsers();
  await mockserver();
}

main().catch((error: unknown) => {
  logger.logException('Mock failed to start', error);
  process.exit(1);
});
