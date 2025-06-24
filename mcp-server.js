#!/usr/bin/env node

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
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
const server = new McpServer({
  name: 'parallel-code-mcp-server',
  version: '1.2.0',
});

// Register MCP tools using new API
server.registerTool(
  'broadcast_message',
  {
    title: 'Broadcast Message',
    description: 'Broadcast a message to all connected AI agents in the collaboration session',
    inputSchema: {
      message: z.string().describe('Message to broadcast to all connected agents'),
      type: z.enum(['broadcast', 'update', 'announcement', 'status']).optional().describe('Type of message being sent'),
      file: z.string().optional().describe('Optional file path if the message relates to a specific file'),
    }
  },
  async (params) => handleBroadcastMessage(params, process.env.MCP_CLIENT_ID || uuidv4())
);

server.registerTool(
  'lock_file',
  {
    title: 'Lock File',
    description: 'Lock a file to prevent other agents from editing it simultaneously',
    inputSchema: {
      file: z.string().describe('File path to lock for exclusive editing'),
      reason: z.string().optional().describe('Optional reason for locking the file'),
    }
  },
  async (params) => handleLockFile(params, process.env.MCP_CLIENT_ID || uuidv4())
);

server.registerTool(
  'unlock_file',
  {
    title: 'Unlock File',
    description: 'Release a file lock to allow other agents to edit it',
    inputSchema: {
      file: z.string().describe('File path to unlock'),
    }
  },
  async (params) => handleUnlockFile(params, process.env.MCP_CLIENT_ID || uuidv4())
);

server.registerTool(
  'get_collaboration_status',
  {
    title: 'Get Collaboration Status',
    description: 'Get current collaboration status including connected agents and file locks',
    inputSchema: {}
  },
  async (params) => handleGetStatus()
);

server.registerTool(
  'announce_work',
  {
    title: 'Announce Work',
    description: 'Announce what work you are starting to do to coordinate with other agents',
    inputSchema: {
      action: z.string().describe('What action you are taking (e.g., "implementing login feature", "fixing bug in utils.js")'),
      files: z.array(z.string()).optional().describe('List of files you will be working on'),
      estimated_time: z.string().optional().describe('Estimated time to complete (e.g., "10 minutes", "1 hour")'),
    }
  },
  async (params) => handleAnnounceWork(params, process.env.MCP_CLIENT_ID || uuidv4())
);

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