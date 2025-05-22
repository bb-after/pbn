import mysql, {
  PoolOptions,
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
  OkPacket,
  FieldPacket,
} from 'mysql2/promise';

// Set sensible defaults - these can be overridden by environment variables
const DEFAULT_CONNECTION_LIMIT = 10;
const DEFAULT_QUEUE_LIMIT = 0;
const DEFAULT_MAX_IDLE_TIME_MS = 30000; // 30 seconds idle before releasing connection

// Get connection limit from env or use default
const CONNECTION_LIMIT = parseInt(
  process.env.DB_CONNECTION_LIMIT || DEFAULT_CONNECTION_LIMIT.toString(),
  10
);

// Variables to store singleton instance
let _pool: Pool | null = null;
let _lastUsed: number = Date.now();

// Track active queries for debugging
const DEBUG = process.env.NODE_ENV !== 'production' && process.env.DB_DEBUG === 'true';
const activeQueries: Map<number, { sql: string; startTime: number }> = new Map();
let queryCounter = 0;

/**
 * Pool configuration for our database
 */
const poolConfig: PoolOptions = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: CONNECTION_LIMIT,
  queueLimit: DEFAULT_QUEUE_LIMIT,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000, // 30 seconds
};

/**
 * Get a connection pool instance (singleton pattern)
 * We only create a pool once per server instance
 */
export function getPool(): Pool {
  if (!_pool) {
    // Use the global variable first if it exists (for hot reloading environments)
    if (typeof global !== 'undefined' && (global as any).__mysql_pool) {
      console.log(`Reusing global MySQL connection pool with limit: ${CONNECTION_LIMIT}`);
      _pool = (global as any).__mysql_pool;
    } else {
      console.log(`Creating MySQL connection pool with limit: ${CONNECTION_LIMIT}`);
      _pool = mysql.createPool(poolConfig);

      // Store in global for reuse across hot reloads
      if (typeof global !== 'undefined') {
        (global as any).__mysql_pool = _pool;
      }

      // Add instrumentation to track connections
      _pool.on('acquire', connection => {
        if (DEBUG) console.log(`Connection ${connection.threadId} acquired`);
      });

      _pool.on('release', connection => {
        if (DEBUG) console.log(`Connection ${connection.threadId} released`);
      });

      _pool.on('enqueue', () => {
        console.warn('Waiting for available connection slot - connection queue growing');
      });

      // Handle pool errors - using EventEmitter's on method
      // This works because Pool extends EventEmitter
      (_pool as any).on('error', (err: Error) => {
        console.error('MySQL Pool Error:', err);
      });
    }
  }

  _lastUsed = Date.now();
  // At this point we know _pool is initialized
  return _pool!;
}

/**
 * Execute a query using a connection from the pool and automatically release it
 * This is the preferred method for simple queries
 *
 * @param query SQL query to execute
 * @param params Parameters for the query
 * @returns Query results with fields
 */
export async function query<
  T extends RowDataPacket[][] | RowDataPacket[] | OkPacket | OkPacket[] | ResultSetHeader,
>(query: string, params?: any[]): Promise<[T, FieldPacket[]]> {
  const pool = getPool();
  const queryId = ++queryCounter;
  const startTime = Date.now();

  if (DEBUG) {
    activeQueries.set(queryId, { sql: query, startTime });
    console.log(
      `DB Query #${queryId} started: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`
    );
  }

  try {
    const result = await pool.query<T>(query, params);

    if (DEBUG) {
      const duration = Date.now() - startTime;
      console.log(`DB Query #${queryId} completed in ${duration}ms`);
      activeQueries.delete(queryId);
    }

    _lastUsed = Date.now();
    return result;
  } catch (error) {
    if (DEBUG) {
      const duration = Date.now() - startTime;
      console.error(`DB Query #${queryId} failed after ${duration}ms: ${(error as Error).message}`);
      activeQueries.delete(queryId);
    }
    throw error;
  }
}

/**
 * Get a connection from the pool for multiple operations
 * IMPORTANT: Caller must release the connection when done!
 *
 * @returns A connection from the pool
 */
export async function getConnection(): Promise<PoolConnection> {
  const pool = getPool();
  try {
    const connection = await pool.getConnection();
    _lastUsed = Date.now();
    return connection;
  } catch (error) {
    console.error('Failed to get connection from pool:', error);
    throw error;
  }
}

/**
 * Execute a transaction with automatic commit/rollback
 *
 * @param callback Function that receives a connection and executes queries
 * @returns Result from the callback function
 */
export async function transaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    throw error;
  } finally {
    try {
      connection.release();
    } catch (releaseError) {
      console.error('Error releasing connection after transaction:', releaseError);
    }
  }
}

/**
 * Check the health of the connection pool
 * Returns information about the current state of the pool
 */
export async function getPoolStatus(): Promise<{
  connectionLimit: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  maxIdle: number;
  lastUsed: number;
  activeQueries: number;
}> {
  const pool = getPool() as any;

  // These properties are internal and not documented in the type definitions
  const activeConnections = pool._allConnections ? pool._allConnections.length : 0;
  const idleConnections = pool._freeConnections ? pool._freeConnections.length : 0;
  const waitingRequests = pool._connectionQueue ? pool._connectionQueue.length : 0;

  return {
    connectionLimit: CONNECTION_LIMIT,
    activeConnections,
    idleConnections,
    waitingRequests,
    maxIdle: DEFAULT_MAX_IDLE_TIME_MS,
    lastUsed: _lastUsed,
    activeQueries: activeQueries.size,
  };
}

/**
 * Close the pool - only needed when shutting down the application
 */
export async function closePool(): Promise<void> {
  if (_pool) {
    try {
      await _pool.end();
      _pool = null;

      // Also remove from global
      if (typeof global !== 'undefined' && (global as any).__mysql_pool) {
        delete (global as any).__mysql_pool;
      }

      console.log('MySQL connection pool closed');
    } catch (error) {
      console.error('Error closing MySQL connection pool:', error);
      throw error;
    }
  }
}

/**
 * Common query helper to get a single row by ID
 *
 * @param table Table name
 * @param id ID to look up
 * @param idField Name of ID field (defaults to 'id')
 * @returns The record or null if not found
 */
export async function getById<T extends RowDataPacket>(
  table: string,
  id: number | string,
  idField: string = 'id'
): Promise<T | null> {
  const [rows] = await query<T[]>(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id]);

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Database helper class for common operations - alternative to function-based approach
 */
export class DB {
  static pool(): Pool {
    return getPool();
  }

  static async query<
    T extends RowDataPacket[][] | RowDataPacket[] | OkPacket | OkPacket[] | ResultSetHeader,
  >(query: string, params?: any[]): Promise<[T, FieldPacket[]]> {
    return DB.pool().query<T>(query, params);
  }

  static async getConnection(): Promise<PoolConnection> {
    return getConnection();
  }

  static async transaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
    return transaction(callback);
  }

  static async getById<T extends RowDataPacket>(
    table: string,
    id: number | string,
    idField: string = 'id'
  ): Promise<T | null> {
    return getById<T>(table, id, idField);
  }

  static async getPoolStatus(): Promise<any> {
    return getPoolStatus();
  }

  static async closePool(): Promise<void> {
    return closePool();
  }
}

export default DB;
