# Database Connection Management Guide

This guide explains how to properly manage database connections in our application to avoid the "Too many connections" error, especially in Vercel's serverless environment.

## The Problem

We've been experiencing "Too many connections" errors (MySQL error code: `ER_CON_COUNT_ERROR`) because:

1. Each serverless function creates its own database connection
2. Connections aren't properly closed in some code paths
3. No connection pooling strategy is applied consistently
4. Different connection limits are used across the codebase (10, 200, etc.)

## The Solution

We've created a centralized database utility at `lib/db.ts` that implements:

1. A singleton connection pool shared across serverless functions
2. Helper methods for common database operations
3. Built-in transaction support with automatic cleanup
4. Debug logging for connection lifecycle

## How to Use the DB Utility

### 1. Simple Queries

```typescript
import { query } from 'lib/db';
import { RowDataPacket } from 'mysql2/promise';

// Define your data interface
interface User extends RowDataPacket {
  id: number;
  name: string;
  email: string;
}

// Execute a query and get typed results
const [users] = await query<User[]>('SELECT * FROM users WHERE active = ?', [true]);
```

### 2. Using Transactions

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

```typescript
import DB from 'lib/db';

// Using static methods
const [products] = await DB.query('SELECT * FROM products WHERE category_id = ?', [categoryId]);

// Get by ID helper
const product = await DB.getById('products', productId);
```

## Refactoring Process

Follow these steps to refactor existing API endpoints:

### Step 1: Import the DB Utility

Replace:

```typescript
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};
```

With:

```typescript
import DB, { query, transaction } from 'lib/db';
```

### Step 2: Replace Direct Connection Creation

Replace:

```typescript
const connection = await mysql.createConnection(dbConfig);
try {
  // ... code using connection
} finally {
  await connection.end();
}
```

With:

```typescript
// For simple queries:
const [results] = await query('SELECT * FROM table WHERE field = ?', [value]);

// For multiple operations:
const result = await transaction(async connection => {
  // ... code using connection
  return result;
}); // No need to manually close the connection
```

### Step 3: Replace Pool Creation

Replace:

```typescript
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
```

With:

```typescript
import { getPool } from 'lib/db';

const pool = getPool(); // Gets the singleton pool instance
```

## Example Before & After

### Before:

```typescript
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  const dbConfig = {
    host: process.env.DB_HOST_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };

  const connection = await mysql.createConnection(dbConfig);

  try {
    const [rows] = await connection.execute('SELECT * FROM clients WHERE id = ?', [req.query.id]);

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ error: 'Client not found' });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await connection.end();
  }
}
```

### After:

```typescript
import { query } from 'lib/db';
import { RowDataPacket } from 'mysql2/promise';

interface Client extends RowDataPacket {
  id: number;
  name: string;
  email: string;
}

export default async function handler(req, res) {
  try {
    const [rows] = await query<Client[]>('SELECT * FROM clients WHERE id = ?', [req.query.id]);

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ error: 'Client not found' });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
```

## Vercel-specific Considerations

1. **Environment Variables**: Set `DB_CONNECTION_LIMIT` to a reasonable value (10-20) in your Vercel environment variables.

2. **Connection Limits**: Make sure your database service allows enough connections for your production environment.

3. **Warm Starts**: Vercel functions that remain warm will maintain the connection pool, improving performance for subsequent requests.

4. **Cold Starts**: When a function cold starts, a new pool will be created, but the existing pattern ensures proper connection management.

## Monitoring and Troubleshooting

1. **Connection Logging**: The DB utility logs connection acquisition and release events, which can help identify connection leaks.

2. **Check Database Metrics**: Monitor your database connection count through your database provider's dashboard.

3. **Vercel Logs**: Check Vercel function logs for any connection-related errors.

4. **Connection Limiting**: If you still see issues, consider reducing `DB_CONNECTION_LIMIT` to a lower value.

## Next Steps

1. Refactor all API endpoints to use the new DB utility
2. Update scripts and utilities to use the shared connection pool
3. Add monitoring for database connections
4. Consider using a database service that handles connection pooling automatically (like PlanetScale)
