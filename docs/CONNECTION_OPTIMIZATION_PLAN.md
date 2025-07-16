# Database Connection Optimization Action Plan

## 🚨 **CRITICAL ISSUE IDENTIFIED**

**Current State:** 71 files creating 287+ database connections
**Impact:** Frequent "Too many connections" errors in production
**Root Cause:** Each API endpoint creates its own connection pools/connections instead of using centralized utility

## 📊 **Analysis Summary**

- **71 files** need refactoring
- **287+ connections** currently being created
- **95% reduction possible** by using centralized `lib/db.ts`
- **Files creating individual connections:** 47 (highest priority)
- **Files creating separate pools:** 24 (medium priority)

## 🔧 **IMMEDIATE ACTIONS**

### Phase 1: Emergency Stabilization (Do Now)

```bash
# 1. Set connection limit in environment
DB_CONNECTION_LIMIT=15

# 2. Run analysis script
node scripts/optimize-database-connections.js

# 3. Monitor current connection usage
curl /api/admin/db-status
```

### Phase 2: High-Priority Refactoring

#### **Files with Highest Impact:**

1. `pages/api/postSuperStarContent.ts` - **200 connections** ⚡ CRITICAL
2. `pages/api/approval-requests/[id].ts` - **20 connections**
3. `pages/api/reactions/index.ts` - **20 connections**
4. `pages/api/client-auth/request-login.ts` - **20 connections**

#### **Refactoring Template:**

**BEFORE:**

```typescript
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 20,
});

// Usage
const [rows] = await pool.query('SELECT * FROM table WHERE id = ?', [id]);
```

**AFTER:**

```typescript
import { query, transaction } from 'lib/db';

// Simple queries
const [rows] = await query('SELECT * FROM table WHERE id = ?', [id]);

// Multiple operations (transactions)
const result = await transaction(async connection => {
  const [result1] = await connection.query('INSERT INTO...', []);
  const [result2] = await connection.query('UPDATE...', []);
  return { result1, result2 };
});
```

### Phase 3: Batch Automated Refactoring

Run the batch script for priority files:

```bash
node scripts/fix-connection-pools-batch.js
```

### Phase 4: Manual Review & Testing

1. **Test each refactored endpoint**
2. **Run type checking:** `npm run typecheck`
3. **Monitor connection usage:** Check `/api/admin/db-status`
4. **Performance testing:** Ensure no regressions

## 📋 **File-by-File Action List**

### **HIGH PRIORITY** (Immediate - Week 1)

| File                           | Current Connections | Type | Action                      |
| ------------------------------ | ------------------- | ---- | --------------------------- |
| `postSuperStarContent.ts`      | 200                 | Pool | ✅ **DONE** - Use getPool() |
| `approval-requests/[id].ts`    | 20                  | Pool | ✅ **DONE** - Use getPool() |
| `reactions/index.ts`           | 20                  | Pool | Replace with query()        |
| `client-auth/request-login.ts` | 20                  | Pool | Replace with query()        |

### **MEDIUM PRIORITY** (Week 2)

| File                        | Current Connections | Type | Action               |
| --------------------------- | ------------------- | ---- | -------------------- |
| All approval-requests files | 10 each             | Pool | Replace with query() |
| All client-auth files       | 10 each             | Pool | Replace with query() |
| All client contact files    | 10 each             | Pool | Replace with query() |

### **LOW PRIORITY** (Week 3-4)

| File                        | Current Connections | Type       | Action               |
| --------------------------- | ------------------- | ---------- | -------------------- |
| Individual connection files | 1 each              | Connection | Replace with query() |

## 🔍 **Monitoring & Validation**

### **Connection Health Check Endpoint**

```bash
curl http://localhost:3000/api/admin/db-status
```

**Expected Response After Fix:**

```json
{
  "connectionLimit": 15,
  "connectionsInUse": 2,
  "connectionsIdle": 13,
  "waitingRequests": 0,
  "status": "healthy"
}
```

### **Performance Metrics to Track**

- **Connection count:** Should drop from 287+ to ~15
- **Response times:** Should improve due to better connection management
- **Error rates:** "Too many connections" errors should disappear
- **Memory usage:** Should decrease

## ⚠️ **Risk Mitigation**

### **Backup Strategy**

- All refactored files get `.backup` copies
- Git commit before each batch of changes
- Test each endpoint after refactoring

### **Rollback Plan**

If issues arise:

1. Stop the problematic service
2. Restore from `.backup` files or git revert
3. Restart with previous connection pattern
4. Debug the specific issue

### **Testing Checklist**

- [ ] Database queries return correct results
- [ ] No connection leaks (check `/api/admin/db-status`)
- [ ] No performance regressions
- [ ] Error handling still works
- [ ] Transactions work correctly

## 🎯 **Success Metrics**

### **Primary Goals**

- ✅ Eliminate "Too many connections" errors
- ✅ Reduce total connections from 287+ to ~15
- ✅ Maintain or improve response times
- ✅ Zero production incidents during migration

### **Secondary Benefits**

- Improved code maintainability
- Consistent database patterns across codebase
- Better error handling and logging
- Easier monitoring and debugging

## 📅 **Timeline**

| Phase      | Duration               | Tasks                                       |
| ---------- | ---------------------- | ------------------------------------------- |
| **Week 1** | Emergency              | Fix top 4 highest-impact files              |
| **Week 2** | Bulk fixes             | Refactor remaining pool files               |
| **Week 3** | Individual connections | Fix files creating individual connections   |
| **Week 4** | Testing & cleanup      | Full testing, remove backups, documentation |

## 🛠️ **Tools & Scripts**

1. **Analysis Script:** `scripts/optimize-database-connections.js`
2. **Batch Fix Script:** `scripts/fix-connection-pools-batch.js`
3. **Health Check:** `/api/admin/db-status`
4. **Documentation:** `docs/database-connection-guide.md`

## 📞 **Support Resources**

- **Main Documentation:** `docs/database-connection-guide.md`
- **Refactoring Guide:** `docs/db-connection-refactoring-guide.md`
- **Centralized Utility:** `lib/db.ts`
- **Health Monitoring:** `/api/admin/db-status`

---

## 🎉 **Expected Outcome**

After completing this optimization:

- **95% reduction in database connections**
- **Elimination of "too many connections" errors**
- **Improved application performance and stability**
- **Cleaner, more maintainable codebase**
