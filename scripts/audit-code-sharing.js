const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// --- Configuration ---
const PORTAL_CODE_PATHS = [
  'pages/client-portal',
  'pages/client-approval',
  'pages/api/approval-requests',
  'pages/api/client-auth',
];

const SHARED_CODE_PATHS = ['components', 'hooks', 'lib', 'utils', 'styles', 'app'];
const EXCLUDED_DIRS = ['node_modules', '.next', '.git'];
// --- End Configuration ---

async function getFilesInDir(dir, allFiles = []) {
  const files = await readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (EXCLUDED_DIRS.includes(file)) continue;

    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      await getFilesInDir(filePath, allFiles);
    } else if (/\.(tsx|ts|js|css)$/.test(file)) {
      allFiles.push(filePath);
    }
  }
  return allFiles;
}

async function analyzeCodeSharing() {
  console.log('🚀 Starting codebase audit...');

  const allProjectFiles = await getFilesInDir(process.cwd());

  const portalFiles = allProjectFiles.filter(file =>
    PORTAL_CODE_PATHS.some(portalPath => file.includes(path.normalize(portalPath)))
  );

  const nonPortalFiles = allProjectFiles.filter(file => !portalFiles.includes(file));

  console.log(`\nFound ${portalFiles.length} files related to the Approval Portal.`);

  const portalDependencies = new Map();
  const importRegex = /from\s+['"]([^'"]+)['"]/g;

  for (const file of portalFiles) {
    const content = await readFile(file, 'utf-8');
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        // Relative import
        const resolvedPath = path.resolve(path.dirname(file), importPath);

        const matchingFile = allProjectFiles.find(f => f.startsWith(resolvedPath));

        if (matchingFile) {
          const normalizedPath = path.relative(process.cwd(), matchingFile);
          if (SHARED_CODE_PATHS.some(sharedPath => normalizedPath.startsWith(sharedPath))) {
            portalDependencies.set(
              normalizedPath,
              (portalDependencies.get(normalizedPath) || 0) + 1
            );
          }
        }
      }
    }
  }

  console.log(`\nPortal code imports ${portalDependencies.size} unique shared files.`);

  const trulySharedFiles = new Map();
  let mainAppUses = 0;

  for (const sharedFile of portalDependencies.keys()) {
    for (const nonPortalFile of nonPortalFiles) {
      const content = await readFile(nonPortalFile, 'utf-8');
      const relativeSharedPath = path
        .relative(path.dirname(nonPortalFile), sharedFile)
        .replace(/\\/g, '/')
        .replace(/\.(tsx|ts|js)$/, '');

      if (
        content.includes(`'${relativeSharedPath}'`) ||
        content.includes(`"${relativeSharedPath}"`)
      ) {
        trulySharedFiles.set(sharedFile, (trulySharedFiles.get(sharedFile) || 0) + 1);
        mainAppUses++;
      }
    }
  }

  console.log(
    `\nOf those, ${trulySharedFiles.size} files are TRULY SHARED (also used by the main app).`
  );
  console.log('--------------------------------------------------\n');

  console.log('📊 AUDIT SUMMARY');
  console.log('==================================================');
  console.log(`Total Approval Portal Files Analyzed: ${portalFiles.length}`);
  console.log(`Unique Shared Dependencies for Portal: ${portalDependencies.size}`);
  console.log(`Truly Shared Files (used by both): ${trulySharedFiles.size}`);
  console.log('--------------------------------------------------\n');

  const sortedPortalDeps = [...portalDependencies.entries()].sort((a, b) => b[1] - a[1]);

  console.log('🔗 TOP 10 MOST USED SHARED FILES BY THE PORTAL:\n');
  sortedPortalDeps.slice(0, 10).forEach(([file, count]) => {
    const isTrulyShared = trulySharedFiles.has(file) ? '✅ (Used by Main App too)' : '...';
    console.log(`  - ${file} (used ${count} times) ${isTrulyShared}`);
  });

  console.log('\n\n✅ EXAMPLES OF TRULY SHARED FILES:\n');
  [...trulySharedFiles.keys()].slice(0, 5).forEach(file => {
    console.log(`  - ${file}`);
  });

  console.log('\n==================================================');
  console.log('Analysis complete.');
}

analyzeCodeSharing().catch(console.error);
