import mysql, { type Pool } from 'mysql2/promise';

declare global {
  // Reuse one managed database pool across Next.js hot reloads in development.
  var azLotteryDbPool: Pool | undefined;
}

import { getMockDbPool } from './mock-db';

export function getAuthDb(): Pool {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    return getMockDbPool();
  }

  if (!globalThis.azLotteryDbPool) {
    globalThis.azLotteryDbPool = mysql.createPool({
      uri,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
      timezone: 'Z',
      enableKeepAlive: true,
    });
  }

  return globalThis.azLotteryDbPool;
}
