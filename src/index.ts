#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { CollaborationManager } from './collaboration-manager.js';
import { getTools, handleToolCall } from './tools.js';

// Initialize collaboration manager
const collaboration = new CollaborationManager();

// Create MCP server
const server = new Server({
  name: 'parallel-code-collaboration',
  version: '2.3.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Register tool listing handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: getTools(),
}));

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return await handleToolCall(name, args || {}, collaboration);
});

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