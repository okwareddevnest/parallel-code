#!/usr/bin/env node

import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

console.log(`🧪 Testing ${packageJson.name} v${packageJson.version}`);

// Test 1: Check required files exist
const requiredFiles = [
  'dist/index.js',
  'src/index.ts',
  'src/types.ts',
  'src/collaboration-manager.ts',
  'src/tools.ts',
  'tsconfig.json',
  'README.md',
  'LICENSE'
];

let allTestsPassed = true;
for (const file of requiredFiles) {
  const filePath = join(__dirname, '..', file);
  if (!existsSync(filePath)) {
    console.error(`❌ Missing required file: ${file}`);
    allTestsPassed = false;
  } else {
    console.log(`✅ Found: ${file}`);
  }
}

// Test 2: Check built executable is executable
const executablePath = join(__dirname, '..', 'dist/index.js');
try {
  const stats = statSync(executablePath);
  if (stats.mode & parseInt('111', 8)) {
    console.log('✅ Executable has correct permissions');
  } else {
    console.error('❌ Executable is not executable');
    allTestsPassed = false;
  }
} catch (err) {
  console.error('❌ Cannot check executable permissions:', (err as Error).message);
  allTestsPassed = false;
}

// Test 3: Check package.json structure for MCP compliance
const requiredFields = ['name', 'version', 'description', 'main', 'bin', 'type'];
for (const field of requiredFields) {
  if (packageJson[field]) {
    console.log(`✅ Package.json has ${field}`);
  } else {
    console.error(`❌ Missing package.json field: ${field}`);
    allTestsPassed = false;
  }
}

// Test 4: Validate package naming
if (packageJson.name === 'parallel-code-mcp-server') {
  console.log('✅ Package name is correct');
} else {
  console.error('❌ Package name should be parallel-code-mcp-server');
  allTestsPassed = false;
}

// Test 5: Check bin naming
const binName = Object.keys(packageJson.bin)[0];
if (binName === 'parallel-code-mcp') {
  console.log('✅ Binary name is correct');
} else {
  console.error('❌ Binary name should be parallel-code-mcp');
  allTestsPassed = false;
}

// Test 6: Check TypeScript configuration
try {
  const tsconfig = JSON.parse(readFileSync(join(__dirname, '..', 'tsconfig.json'), 'utf8'));
  if (tsconfig.compilerOptions && tsconfig.compilerOptions.outDir === './dist') {
    console.log('✅ TypeScript configuration is valid');
  } else {
    console.error('❌ Invalid TypeScript configuration');
    allTestsPassed = false;
  }
} catch (err) {
  console.error('❌ Cannot read TypeScript configuration:', (err as Error).message);
  allTestsPassed = false;
}

// Test 7: Check if server can be imported
try {
  const serverContent = readFileSync(join(__dirname, '..', 'dist/index.js'), 'utf8');
  if (serverContent.includes('Server') && serverContent.includes('StdioServerTransport')) {
    console.log('✅ Server implementation looks correct');
  } else {
    console.error('❌ Server implementation missing required components');
    allTestsPassed = false;
  }
} catch (err) {
  console.error('❌ Cannot validate server implementation:', (err as Error).message);
  allTestsPassed = false;
}

// Test 8: Check AGPL-3.0 license
if (packageJson.license === 'AGPL-3.0') {
  console.log('✅ Package uses AGPL-3.0 license');
} else {
  console.error('❌ Package should use AGPL-3.0 license');
  allTestsPassed = false;
}

if (allTestsPassed) {
  console.log('\n🎉 All tests passed! MCP server is compliant and ready for publishing.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Fix issues before publishing.');
  process.exit(1);
}