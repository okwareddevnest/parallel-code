#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CollaborationManager } from './collaboration-manager.js';
import { registerTools } from './tools.js';

// Initialize collaboration manager
const collaboration = new CollaborationManager();

// Create MCP server
const server = new McpServer({
  name: 'parallel-code-collaboration',
  version: '2.0.0',
});

// Register all collaboration tools
registerTools(server, collaboration);

// Main function to run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Parallel Code MCP Server running on stdio transport');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down Parallel Code MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Shutting down Parallel Code MCP Server...');
  process.exit(0);
});

// Run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}