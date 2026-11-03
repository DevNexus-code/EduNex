import { PrismaClient } from './generated/client/index.js';
export * from './generated/client/index.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' }
    ]
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

let isDatabaseConnected = false;

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDatabaseConnected = true;
    return true;
  } catch {
    isDatabaseConnected = false;
    return false;
  }
}

export function getDatabaseConnectedStatus(): boolean {
  return isDatabaseConnected;
}
