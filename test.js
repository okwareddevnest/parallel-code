#!/usr/bin/env node

// Simple test to verify the package works
const package = require('./package.json');
const fs = require('fs');
const path = require('path');

console.log(`🧪 Testing ${package.name} v${package.version}`);

// Test 1: Check required files exist
const requiredFiles = [
  'server.js',
  'index.js', 
  'bin/cli.js',
  'public/test.html',
  'mcp-manifest.json'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing required file: ${file}`);
    allFilesExist = false;
  } else {
    console.log(`✅ Found: ${file}`);
  }
}

// Test 2: Check CLI executable is executable
const cliPath = path.join(__dirname, 'bin/cli.js');
try {
  const stats = fs.statSync(cliPath);
  if (stats.mode & parseInt('111', 8)) {
    console.log('✅ CLI is executable');
  } else {
    console.error('❌ CLI is not executable');
    allFilesExist = false;
  }
} catch (err) {
  console.error('❌ Cannot check CLI permissions:', err.message);
  allFilesExist = false;
}

// Test 3: Check package.json structure
const requiredFields = ['name', 'version', 'description', 'main', 'bin', 'files'];
for (const field of requiredFields) {
  if (package[field]) {
    console.log(`✅ Package.json has ${field}`);
  } else {
    console.error(`❌ Missing package.json field: ${field}`);
    allFilesExist = false;
  }
}

// Test 4: Validate MCP manifest
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'mcp-manifest.json'), 'utf8'));
  if (manifest.name === package.name && manifest.version === package.version) {
    console.log('✅ MCP manifest is valid');
  } else {
    console.error('❌ MCP manifest name/version mismatch');
    allFilesExist = false;
  }
} catch (err) {
  console.error('❌ Invalid MCP manifest:', err.message);
  allFilesExist = false;
}

if (allFilesExist) {
  console.log('\n🎉 All tests passed! Package is ready for publishing.');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Fix issues before publishing.');
  process.exit(1);
}