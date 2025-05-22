# Database Connection Management Guide

This guide explains how to properly manage database connections in our application to avoid the "Too many connections" error, especially in serverless environments.

## The Problem

The "Too many connections" error (MySQL error code: `ER_CON_COUNT_ERROR`) can occur because:

1. Serverless functions can scale to many concurrent instances, each creating their own database connections
2. Hot reloading in development creates new connection pools on each reload
3. Connections aren't properly released or managed
4. The MySQL server has a limited number of available connections (typically 151 by default)

## Our Solution

We've implemented a centralized database utility at `lib/db.ts` that:

1. Uses a singleton connection pool shared across the application
2. Stores the pool in a global variable to survive hot reloads
3. Implements proper error handling and connection tracking
4. Provides a consistent API for database operations

## How to Use the DB Utility

### 1. Simple Queries

For simple database operations, use the `query` function:

```typescript
import { query } from 'lib/db';

// Execute a query and get typed results
const [users] = await query('SELECT * FROM users WHERE active = ?', [true]);
```

### 2. Multiple Operations Using Transactions

For operations that require multiple queries that should succeed or fail together:

```typescript
import { transaction } from 'lib/db';

// Run multiple queries in a transaction
const result = await transaction(async connection => {
  // All queries here use the same connection
  const [orderResult] = await connection.query(
    'INSERT INTO orders (user_id, total) VALUES (?, ?)',
    [userId, total]
  );

  const orderId = orderResult.insertId;

  // Insert order items
  for (const item of items) {
    await connection.query(
      'INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)',
      [orderId, item.productId, item.quantity]
    );
  }

  return { orderId };
});
```

### 3. Class-based API

If you prefer a class-based approach:

```typescript
import DB from 'lib/db';

// Using static methods
const [products] = await DB.query('SELECT * FROM products WHERE category_id = ?', [categoryId]);

// Get by ID helper
const product = await DB.getById('products', productId);
```

## Best Practices

1. **Don't create your own pool**: Always use the utility in `lib/db.ts` to ensure connection sharing.

2. **Always release connections**: When using `getConnection()` directly, always call `connection.release()` when done:

   ```typescript
   const connection = await getConnection();
   try {
     // Use connection
   } finally {
     connection.release();
   }
   ```

3. **Use transactions for multi-step operations**: This ensures consistency and proper connection management.

4. **Don't call pool.end() in API handlers**: The pool should remain open for the duration of the server's lifetime.

5. **Monitor connection usage**: Use the `/api/admin/db-status` endpoint to monitor connection usage.

## Connection Management in Different Environments

### Development Environment

In development, hot reloading can cause connection problems. Our solution:

1. Stores the connection pool in a global variable (`global.__mysql_pool`)
2. Reuses this variable across hot reloads
3. Implements debug logging when `DB_DEBUG=true`

### Production Environment

In production, especially in serverless environments:

1. Connection pools are maintained per server instance
2. Pools are kept for the lifetime of the server instance
3. Connections are automatically released back to the pool when queries complete

### Configuration

You can configure the database connection through environment variables:

- `DB_HOST_NAME` - Database host
- `DB_USER_NAME` - Database user
- `DB_PASSWORD` - Database password
- `DB_DATABASE` - Database name
- `DB_CONNECTION_LIMIT` - Maximum number of connections in the pool (default: 10)
- `DB_DEBUG` - Enable debug logging (set to "true")

## Troubleshooting

### Too Many Connections Error

If you encounter "Too many connections" errors:

1. Check the `/api/admin/db-status` endpoint to monitor connection usage
2. Verify that connections are being released properly
3. Consider increasing the `DB_CONNECTION_LIMIT` (but remember MySQL server limits)
4. Look for code that might be creating its own database connections
5. Ensure transactions are properly committed or rolled back

### Memory Leaks

If memory usage grows over time:

1. Ensure connections are properly released
2. Check for long-running queries
3. Monitor the number of active connections
4. Restart the server if necessary

## Database Health Monitoring

The `/api/admin/db-status` endpoint provides information about:

- Connection limit
- Active connections
- Idle connections
- Waiting requests
- Server uptime
- Active queries (when `DB_DEBUG=true`)

## Related Documentation

- [MySQL2 Documentation](https://github.com/sidorares/node-mysql2#readme)
- [MySQL Connection Pooling](https://dev.mysql.com/doc/connector-j/8.0/en/connector-j-usagenotes-j2ee-concepts-connection-pooling.html)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
