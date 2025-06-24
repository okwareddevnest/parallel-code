const WebSocket = require('ws');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';

// MCP protocol compliance
const MCP_VERSION = '0.1.0';

// Serve static files
app.use(express.static('public'));

// Create HTTP server
const server = require('http').createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info) => {
    const url = new URL(info.req.url, `http://${info.req.headers.host}`);
    const clientId = url.searchParams.get('id');
    return clientId && clientId.length > 0;
  }
});

// Store connected clients
const clients = new Map();

// File locks storage
const LOCKS_FILE = path.join(__dirname, 'mcp-locks.json');
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

// Broadcast message to all clients except sender
function broadcast(message, excludeClient = null) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client, clientId) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const clientId = url.searchParams.get('id') || uuidv4();
  
  console.log(`Client connected: ${clientId}`);
  
  // Store client
  clients.set(clientId, ws);
  ws.clientId = clientId;
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId: clientId,
    timestamp: new Date().toISOString(),
    connectedClients: Array.from(clients.keys())
  }));
  
  // Notify other clients about new connection
  broadcast({
    type: 'client_connected',
    clientId: clientId,
    timestamp: new Date().toISOString()
  }, ws);
  
  // Set up ping/pong heartbeat
  let isAlive = true;
  ws.isAlive = true;
  
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      // Add metadata
      message.sender = clientId;
      message.timestamp = new Date().toISOString();
      
      // Handle different message types
      switch (message.type) {
        case 'lock':
          handleFileLock(message, ws);
          break;
          
        case 'unlock':
          handleFileUnlock(message, ws);
          break;
          
        case 'update':
        case 'broadcast':
          // Broadcast to other clients
          broadcast(message, ws);
          break;
          
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
          
        default:
          // Forward unknown message types
          broadcast(message, ws);
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    
    // Release all locks held by this client
    Object.keys(fileLocks).forEach(file => {
      if (fileLocks[file] === clientId) {
        delete fileLocks[file];
      }
    });
    saveLocks();
    
    // Remove client
    clients.delete(clientId);
    
    // Notify other clients
    broadcast({
      type: 'client_disconnected',
      clientId: clientId,
      timestamp: new Date().toISOString()
    });
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// Handle file locking
function handleFileLock(message, ws) {
  const { file } = message;
  const clientId = ws.clientId;
  
  if (fileLocks[file] && fileLocks[file] !== clientId) {
    // File is already locked by another client
    ws.send(JSON.stringify({
      type: 'lock_denied',
      file: file,
      lockedBy: fileLocks[file],
      timestamp: new Date().toISOString()
    }));
  } else {
    // Grant lock
    fileLocks[file] = clientId;
    saveLocks();
    
    ws.send(JSON.stringify({
      type: 'lock_granted',
      file: file,
      timestamp: new Date().toISOString()
    }));
    
    // Notify other clients
    broadcast({
      type: 'file_locked',
      file: file,
      lockedBy: clientId,
      timestamp: new Date().toISOString()
    }, ws);
  }
}

// Handle file unlocking
function handleFileUnlock(message, ws) {
  const { file } = message;
  const clientId = ws.clientId;
  
  if (fileLocks[file] === clientId) {
    delete fileLocks[file];
    saveLocks();
    
    ws.send(JSON.stringify({
      type: 'unlock_confirmed',
      file: file,
      timestamp: new Date().toISOString()
    }));
    
    // Notify other clients
    broadcast({
      type: 'file_unlocked',
      file: file,
      unlockedBy: clientId,
      timestamp: new Date().toISOString()
    }, ws);
  } else {
    ws.send(JSON.stringify({
      type: 'unlock_denied',
      file: file,
      message: 'File not locked by you',
      timestamp: new Date().toISOString()
    }));
  }
}

// Ping all clients periodically to detect dead connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`Terminating dead connection: ${ws.clientId}`);
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // 30 seconds

// Clean up on server shutdown
wss.on('close', () => {
  clearInterval(interval);
});

// API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    connectedClients: Array.from(clients.keys()),
    fileLocks: fileLocks,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/locks', (req, res) => {
  res.json(fileLocks);
});

// MCP tools endpoint
app.get('/api/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'broadcast_message',
        description: 'Broadcast a message to all connected AI agents',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message to broadcast' },
            type: { type: 'string', enum: ['broadcast', 'update', 'announcement'] }
          },
          required: ['message']
        }
      },
      {
        name: 'lock_file',
        description: 'Lock a file to prevent concurrent editing',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'File path to lock' }
          },
          required: ['file']
        }
      },
      {
        name: 'unlock_file',
        description: 'Release a file lock',
        inputSchema: {
          type: 'object',
          properties: {
            file: { type: 'string', description: 'File path to unlock' }
          },
          required: ['file']
        }
      },
      {
        name: 'get_server_status',
        description: 'Get current server status and connected clients',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`🧠 ParallelCode MCP Server v${MCP_VERSION}`);
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`WebSocket endpoint: ws://${HOST}:${PORT}/?id=your_client_id`);
  console.log(`Test client: http://${HOST}:${PORT}/test.html`);
  console.log(`Status API: http://${HOST}:${PORT}/api/status`);
  console.log(`MCP Tools: http://${HOST}:${PORT}/api/mcp/tools`);
});