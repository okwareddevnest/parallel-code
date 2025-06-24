#!/usr/bin/env node

const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');
const { spawn } = require('child_process');

const argv = yargs(hideBin(process.argv))
  .command('start', 'Start the ParallelCode MCP server', {
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
  .command('version', 'Show version information')
  .help()
  .alias('help', 'h')
  .argv;

const command = argv._[0];

switch (command) {
  case 'start':
    startServer(argv.port, argv.host);
    break;
  case 'version':
    showVersion();
    break;
  default:
    console.log('🧠 ParallelCode MCP Server');
    console.log('');
    console.log('Usage:');
    console.log('  npx @okwareddevnest/parallel-code start    Start the server');
    console.log('  npx @okwareddevnest/parallel-code version  Show version');
    console.log('');
    console.log('Options:');
    console.log('  -p, --port <number>  Port to run on (default: 8080)');
    console.log('  -h, --host <string>  Host to bind to (default: localhost)');
    console.log('');
    console.log('Examples:');
    console.log('  npx @okwareddevnest/parallel-code start');
    console.log('  npx @okwareddevnest/parallel-code start -p 3000');
    console.log('  npx @okwareddevnest/parallel-code start -h 0.0.0.0 -p 8080');
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

function showVersion() {
  const packageJson = require('../package.json');
  console.log(`ParallelCode MCP Server v${packageJson.version}`);
}