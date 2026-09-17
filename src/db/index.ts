import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | null | undefined;
}

// Function to retrieve valid external database connection string (Supabase / Postgres)
export const getDatabaseConnectionString = (): string | null => {
  const url = 
    process.env.DATABASE_URL || 
    process.env.SUPABASE_DB_URL || 
    process.env.POSTGRES_URL || 
    process.env.POSTGRES_PRISMA_URL || 
    process.env.POSTGRES_URL_NON_POOLING;
  
  if (url && url.trim().length > 0) {
    return url.trim();
  }
  return null;
};

export const isDatabaseEnabled = (): boolean => {
  return getDatabaseConnectionString() !== null;
};

// Function to create or retrieve the connection pool.
// Google Cloud SQL is completely disconnected. Only connects if DATABASE_URL (Supabase) is provided.
export const createPool = (): Pool | null => {
  if (global._postgresPool !== undefined) {
    return global._postgresPool;
  }

  const connectionString = getDatabaseConnectionString();
  
  // If no connection string is provided, Google Cloud SQL is NOT used. Pool is null.
  if (!connectionString) {
    global._postgresPool = null;
    return null;
  }

  try {
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    const newPool = new Pool({
      connectionString,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });

    newPool.on('error', (err) => {
      console.error('Unexpected error on database pool client:', err);
    });

    global._postgresPool = newPool;
    return newPool;
  } catch (err) {
    console.error('Failed to initialize database pool:', err);
    global._postgresPool = null;
    return null;
  }
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema if pool is available.
export const db = pool ? drizzle(pool, { schema }) : null as any;
