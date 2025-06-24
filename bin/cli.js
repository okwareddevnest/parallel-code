#!/usr/bin/env node

const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');
const { spawn } = require('child_process');

const argv = yargs(hideBin(process.argv))
  .command('start', 'Start the ParallelCode WebSocket collaboration server', {
    port: {
      alias: 'p',
      type: 'number',
      default: 8080,
      description: 'Port to run the server on'
    },
    host: {
      alias: 'h',
      type: 'string',
      default: 'localhost',
      description: 'Host to bind the server to'
    }
  })
  .command('mcp', 'Run as MCP server for client integration (STDIO)')
  .command('version', 'Show version information')
  .help()
  .alias('help', 'h')
  .argv;

const command = argv._[0];

switch (command) {
  case 'start':
    startServer(argv.port, argv.host);
    break;
  case 'mcp':
    startMCPServer();
    break;
  case 'version':
    showVersion();
    break;
  default:
    console.log('🧠 ParallelCode MCP Server');
    console.log('');
    console.log('Usage:');
    console.log('  npx parallel-code-mcp-server start    Start WebSocket collaboration server');
    console.log('  npx parallel-code-mcp-server mcp      Run as MCP server (for Cursor/Claude)');
    console.log('  npx parallel-code-mcp-server version  Show version');
    console.log('');
    console.log('Options for start:');
    console.log('  -p, --port <number>  Port to run on (default: 8080)');
    console.log('  -h, --host <string>  Host to bind to (default: localhost)');
    console.log('');
    console.log('Examples:');
    console.log('  npx parallel-code-mcp-server start');
    console.log('  npx parallel-code-mcp-server start -p 3000');
    console.log('  npx parallel-code-mcp-server mcp  # For MCP client integration');
}

function startServer(port, host) {
  console.log(`🧠 Starting ParallelCode MCP Server on ${host}:${port}`);
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  const serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: port, HOST: host },
    stdio: 'inherit'
  });
  
  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Server exited with code ${code}`);
      process.exit(code);
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down ParallelCode MCP Server...');
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down ParallelCode MCP Server...');
    serverProcess.kill('SIGTERM');
  });
}

function startMCPServer() {
  console.error('🧠 Starting ParallelCode MCP Server (STDIO mode)');
  
  const mcpServerPath = path.join(__dirname, '..', 'mcp-server.js');
  const mcpProcess = spawn('node', [mcpServerPath], {
    stdio: 'inherit'
  });
  
  mcpProcess.on('error', (error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
  
  mcpProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`MCP server exited with code ${code}`);
      process.exit(code);
    }
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.error('\n🛑 Shutting down ParallelCode MCP Server...');
    mcpProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.error('\n🛑 Shutting down ParallelCode MCP Server...');
    mcpProcess.kill('SIGTERM');
  });
}

function showVersion() {
  const packageJson = require('../package.json');
  console.log(`ParallelCode MCP Server v${packageJson.version}`);
}