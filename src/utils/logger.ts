import { WinstonLogger } from '@user-office-software/duo-logger';

const logger = new WinstonLogger({ level: process.env.LOG_LEVEL ?? 'info' });

export { logger };
