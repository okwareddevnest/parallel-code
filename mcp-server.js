#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Store connected clients and file locks
const clients = new Map();
const LOCKS_FILE = path.join(process.cwd(), 'mcp-locks.json');
let fileLocks = {};

// Load existing locks
try {
  if (fs.existsSync(LOCKS_FILE)) {
    fileLocks = JSON.parse(fs.readFileSync(LOCKS_FILE, 'utf8'));
  }
} catch (error) {
  console.error('Error loading locks file:', error);
  fileLocks = {};
}

// Save locks to file
function saveLocks() {
  try {
    fs.writeFileSync(LOCKS_FILE, JSON.stringify(fileLocks, null, 2));
  } catch (error) {
    console.error('Error saving locks file:', error);
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'parallel-code-mcp-server',
    version: '1.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define MCP tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'broadcast_message',
        description: 'Broadcast a message to all connected AI agents in the collaboration session',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message to broadcast to all connected agents',
            },
            type: {
              type: 'string',
              enum: ['broadcast', 'update', 'announcement', 'status'],
              description: 'Type of message being sent',
              default: 'broadcast'
            },
            file: {
              type: 'string',
              description: 'Optional file path if the message relates to a specific file',
            }
          },
          required: ['message'],
        },
      },
      {
        name: 'lock_file',
        description: 'Lock a file to prevent other agents from editing it simultaneously',
        inputSchema: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              description: 'File path to lock for exclusive editing',
            },
            reason: {
              type: 'string',
              description: 'Optional reason for locking the file',
            }
          },
          required: ['file'],
        },
      },
      {
        name: 'unlock_file',
        description: 'Release a file lock to allow other agents to edit it',
        inputSchema: {
          type: 'object',
          properties: {
            file: {
              type: 'string',
              description: 'File path to unlock',
            }
          },
          required: ['file'],
        },
      },
      {
        name: 'get_collaboration_status',
        description: 'Get current collaboration status including connected agents and file locks',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'announce_work',
        description: 'Announce what work you are starting to do to coordinate with other agents',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'What action you are taking (e.g., "implementing login feature", "fixing bug in utils.js")',
            },
            files: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of files you will be working on',
            },
            estimated_time: {
              type: 'string',
              description: 'Estimated time to complete (e.g., "10 minutes", "1 hour")',
            }
          },
          required: ['action'],
        },
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const clientId = process.env.MCP_CLIENT_ID || uuidv4();

  switch (name) {
    case 'broadcast_message':
      return handleBroadcastMessage(args, clientId);
    
    case 'lock_file':
      return handleLockFile(args, clientId);
    
    case 'unlock_file':
      return handleUnlockFile(args, clientId);
    
    case 'get_collaboration_status':
      return handleGetStatus();
    
    case 'announce_work':
      return handleAnnounceWork(args, clientId);
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Tool handlers
async function handleBroadcastMessage(args, clientId) {
  const message = {
    sender: clientId,
    type: args.type || 'broadcast',
    file: args.file,
    content: args.message,
    timestamp: new Date().toISOString()
  };

  // Broadcast via WebSocket if server is running
  if (global.wssBroadcast) {
    global.wssBroadcast(message);
  }

  // Log to console for MCP client
  console.error(`[BROADCAST] ${clientId}: ${args.message}`);
  
  return {
    content: [
      {
        type: 'text',
        text: `Message broadcasted successfully to ${clients.size} connected agents: "${args.message}"`,
      },
    ],
  };
}

async function handleLockFile(args, clientId) {
  const { file, reason } = args;
  
  if (fileLocks[file] && fileLocks[file] !== clientId) {
    return {
      content: [
        {
          type: 'text',
          text: `File "${file}" is already locked by agent: ${fileLocks[file]}. Cannot acquire lock.`,
        },
      ],
      isError: true,
    };
  }

  fileLocks[file] = clientId;
  saveLocks();

  // Broadcast lock notification
  if (global.wssBroadcast) {
    global.wssBroadcast({
      sender: clientId,
      type: 'file_locked',
      file: file,
      reason: reason,
      timestamp: new Date().toISOString()
    });
  }

  console.error(`[LOCK] ${clientId} locked file: ${file}`);

  return {
    content: [
      {
        type: 'text',
        text: `Successfully locked file "${file}". You now have exclusive edit access.${reason ? ` Reason: ${reason}` : ''}`,
      },
    ],
  };
}

async function handleUnlockFile(args, clientId) {
  const { file } = args;
  
  if (!fileLocks[file]) {
    return {
      content: [
        {
          type: 'text',
          text: `File "${file}" is not currently locked.`,
        },
      ],
    };
  }

  if (fileLocks[file] !== clientId) {
    return {
      content: [
        {
          type: 'text',
          text: `File "${file}" is locked by another agent (${fileLocks[file]}). You cannot unlock it.`,
        },
      ],
      isError: true,
    };
  }

  delete fileLocks[file];
  saveLocks();

  // Broadcast unlock notification
  if (global.wssBroadcast) {
    global.wssBroadcast({
      sender: clientId,
      type: 'file_unlocked',
      file: file,
      timestamp: new Date().toISOString()
    });
  }

  console.error(`[UNLOCK] ${clientId} unlocked file: ${file}`);

  return {
    content: [
      {
        type: 'text',
        text: `Successfully unlocked file "${file}". Other agents can now edit it.`,
      },
    ],
  };
}

async function handleGetStatus() {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          connectedAgents: Array.from(clients.keys()),
          fileLocks: fileLocks,
          serverTime: new Date().toISOString(),
          totalConnections: clients.size
        }, null, 2),
      },
    ],
  };
}

async function handleAnnounceWork(args, clientId) {
  const message = {
    sender: clientId,
    type: 'work_announcement',
    action: args.action,
    files: args.files || [],
    estimated_time: args.estimated_time,
    timestamp: new Date().toISOString()
  };

  // Broadcast work announcement
  if (global.wssBroadcast) {
    global.wssBroadcast(message);
  }

  console.error(`[WORK] ${clientId} announced: ${args.action}`);

  return {
    content: [
      {
        type: 'text',
        text: `Work announcement sent: "${args.action}"${args.estimated_time ? ` (ETA: ${args.estimated_time})` : ''}`,
      },
    ],
  };
}

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ParallelCode MCP Server running on stdio transport');
}

// Export for programmatic use
module.exports = { server, runServer };

// Run if called directly
if (require.main === module) {
  runServer().catch(console.error);
}