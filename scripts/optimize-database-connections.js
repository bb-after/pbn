#!/usr/bin/env node

/**
 * Database Connection Optimization Script
 *
 * This script helps identify and fix "Too many connections" issues by:
 * 1. Finding all files that create their own MySQL pools/connections
 * 2. Providing refactoring suggestions
 * 3. Generating a report of current connection usage
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files to analyze
const API_DIR = 'pages/api';
const UTILS_DIR = 'utils';

// Connection patterns to find
const PATTERNS = {
  createPool: /mysql\.createPool\s*\(/g,
  createConnection: /mysql\.createConnection\s*\(/g,
  connectionLimit: /connectionLimit\s*:\s*(\d+)/g,
  importMysql: /import.*mysql.*from.*['"]mysql2\/promise['"];?/g,
  dbConfig: /const\s+dbConfig\s*=\s*\{/g,
};

function findFilesRecursively(dir, extension = '.ts') {
  const files = [];

  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist`);
    return files;
  }

  function walkDir(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (item.endsWith(extension)) {
        files.push(fullPath);
      }
    }
  }

  walkDir(dir);
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const analysis = {
    filePath,
    hasCreatePool: false,
    hasCreateConnection: false,
    connectionLimit: null,
    hasDbConfig: false,
    needsRefactoring: false,
    issues: [],
  };

  // Check for createPool
  const poolMatches = content.match(PATTERNS.createPool);
  if (poolMatches) {
    analysis.hasCreatePool = true;
    analysis.needsRefactoring = true;
    analysis.issues.push(`Creates ${poolMatches.length} connection pool(s)`);

    // Extract connection limit
    const limitMatch = content.match(PATTERNS.connectionLimit);
    if (limitMatch) {
      analysis.connectionLimit = parseInt(limitMatch[1]);
      analysis.issues.push(`Uses ${analysis.connectionLimit} connections per pool`);
    }
  }

  // Check for createConnection
  const connMatches = content.match(PATTERNS.createConnection);
  if (connMatches) {
    analysis.hasCreateConnection = true;
    analysis.needsRefactoring = true;
    analysis.issues.push(`Creates ${connMatches.length} individual connection(s)`);
  }

  // Check for dbConfig
  if (PATTERNS.dbConfig.test(content)) {
    analysis.hasDbConfig = true;
    analysis.issues.push('Defines its own dbConfig');
  }

  return analysis;
}

function generateRefactoringPlan(analysis) {
  const plan = {
    priority: 'low',
    steps: [],
    estimatedConnectionReduction: 0,
  };

  if (analysis.hasCreatePool) {
    plan.priority =
      analysis.connectionLimit > 50 ? 'high' : analysis.connectionLimit > 20 ? 'medium' : 'low';
    plan.estimatedConnectionReduction = analysis.connectionLimit || 10;

    plan.steps.push(
      '1. Replace mysql import with: import { query, transaction, getPool } from "lib/db"'
    );
    plan.steps.push('2. Remove pool creation and dbConfig');
    plan.steps.push('3. Replace pool.query() calls with query() function');
    plan.steps.push(
      '4. Replace pool.getConnection() with transaction() for multi-query operations'
    );
  }

  if (analysis.hasCreateConnection) {
    plan.priority = 'medium';
    plan.estimatedConnectionReduction += 1; // Individual connections are also problematic

    plan.steps.push('1. Replace mysql.createConnection() with query() for simple operations');
    plan.steps.push('2. Use transaction() for multi-step operations');
    plan.steps.push('3. Remove connection.end() calls');
  }

  return plan;
}

function main() {
  console.log('🔍 Analyzing database connection usage...\n');

  const allFiles = [...findFilesRecursively(API_DIR), ...findFilesRecursively(UTILS_DIR)];

  const results = [];
  let totalEstimatedConnections = 0;

  console.log(`Found ${allFiles.length} TypeScript files to analyze\n`);

  for (const filePath of allFiles) {
    const analysis = analyzeFile(filePath);

    if (analysis.needsRefactoring) {
      const plan = generateRefactoringPlan(analysis);
      analysis.refactoringPlan = plan;
      results.push(analysis);
      totalEstimatedConnections += plan.estimatedConnectionReduction;
    }
  }

  // Sort by priority and connection impact
  results.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff =
      priorityOrder[b.refactoringPlan.priority] - priorityOrder[a.refactoringPlan.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return (
      b.refactoringPlan.estimatedConnectionReduction -
      a.refactoringPlan.estimatedConnectionReduction
    );
  });

  // Generate report
  console.log('📊 DATABASE CONNECTION ANALYSIS REPORT');
  console.log('=====================================\n');

  console.log(`🚨 Found ${results.length} files that need refactoring`);
  console.log(
    `⚡ Estimated total connection reduction: ${totalEstimatedConnections} connections\n`
  );

  // Group by priority
  const byPriority = results.reduce((acc, item) => {
    const priority = item.refactoringPlan.priority;
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(item);
    return acc;
  }, {});

  for (const priority of ['high', 'medium', 'low']) {
    if (!byPriority[priority]) continue;

    console.log(`\n🔥 ${priority.toUpperCase()} PRIORITY (${byPriority[priority].length} files):`);
    console.log(''.padEnd(50, '-'));

    for (const item of byPriority[priority]) {
      console.log(`\n📁 ${item.filePath}`);
      console.log(`   Issues: ${item.issues.join(', ')}`);
      console.log(`   Impact: -${item.refactoringPlan.estimatedConnectionReduction} connections`);
      console.log(`   Steps:`);
      for (const step of item.refactoringPlan.steps) {
        console.log(`     ${step}`);
      }
    }
  }

  console.log('\n\n🛠️  QUICK FIXES:');
  console.log('===============');
  console.log('1. Set environment variable: DB_CONNECTION_LIMIT=15');
  console.log('2. Start with HIGH priority files first');
  console.log('3. Test each refactoring thoroughly');
  console.log('4. Monitor connection usage with /api/admin/db-status');

  console.log('\n\n📋 REFACTORING TEMPLATE:');
  console.log('=======================');
  console.log(`
BEFORE:
import mysql from 'mysql2/promise';
const pool = mysql.createPool({
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 20,
});

AFTER:
import { query, transaction } from 'lib/db';

// For simple queries:
const [rows] = await query('SELECT * FROM table WHERE id = ?', [id]);

// For multiple operations:
const result = await transaction(async (connection) => {
  const [result1] = await connection.query('INSERT INTO...', []);
  const [result2] = await connection.query('UPDATE...', []);
  return { result1, result2 };
});
`);

  // Save detailed report to file
  const report = {
    timestamp: new Date().toISOString(),
    totalFiles: allFiles.length,
    filesNeedingRefactoring: results.length,
    estimatedConnectionReduction: totalEstimatedConnections,
    fileAnalysis: results,
  };

  fs.writeFileSync('database-connection-analysis.json', JSON.stringify(report, null, 2));
  console.log('\n💾 Detailed report saved to: database-connection-analysis.json');
}

if (require.main === module) {
  main();
}
