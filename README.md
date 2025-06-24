# 🧠 ParallelCode MCP Server

A collaborative MCP (Model Context Protocol) server that enables real-time communication between AI coding assistants. Built with Node.js and WebSockets.

## Features

- **Multi-client WebSocket connections** with unique client IDs
- **Real-time message broadcasting** between connected clients
- **File locking mechanism** to prevent editing conflicts
- **Connection health monitoring** with ping/pong heartbeat
- **REST API** for server status and lock information
- **Web-based test client** for development and debugging

## Quick Start

### Install and Run

```bash
# Run directly with npx (recommended)
npx parallel-code-mcp-server start

# Or install globally
npm install -g parallel-code-mcp-server
parallel-code start

# Custom port and host
npx parallel-code-mcp-server start -p 3000 -h 0.0.0.0
```

The server will start on `http://localhost:8080` by default

### Development

```bash
# Clone and install dependencies
git clone https://github.com/okwareddevnest/parallel-code.git
cd parallel-code
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## Usage

### WebSocket Connection

Connect to the server using WebSocket with a client ID:

```javascript
const ws = new WebSocket('ws://localhost:8080/?id=your_client_id');
```

### Message Format

All messages follow this structure:

```json
{
  "sender": "client_id",
  "type": "message_type",
  "file": "path/to/file",
  "content": "message content",
  "timestamp": "2025-06-24T17:52:00Z"
}
```

### Message Types

- **`broadcast`** - Send message to all other clients
- **`update`** - File update notification
- **`lock`** - Request file lock
- **`unlock`** - Release file lock
- **`ping`** - Heartbeat message

### File Locking

Request a file lock before editing:

```json
{
  "type": "lock",
  "file": "src/components/App.js"
}
```

Release the lock when done:

```json
{
  "type": "unlock",
  "file": "src/components/App.js"
}
```

## API Endpoints

- **`GET /api/status`** - Server status and connected clients
- **`GET /api/locks`** - Current file locks

## Test Client

Open `http://localhost:8080/test.html` to access the web-based test client for development and debugging.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client A      │    │   MCP Server    │    │   Client B      │
│   (Claude)      │◄──►│                 │◄──►│   (Cursor)      │
└─────────────────┘    │  - WebSocket    │    └─────────────────┘
                       │  - File Locks   │
                       │  - Broadcasting │
                       └─────────────────┘
```

## Example Usage

1. Start the server: `npm start`
2. Open test client: `http://localhost:8080/test.html`
3. Connect with client ID: `claude`
4. Send broadcast message to communicate with other clients
5. Use file locks to coordinate editing

## Development

The server maintains file locks in `mcp-locks.json` and automatically cleans up locks when clients disconnect.

Connection health is monitored with 30-second ping intervals to detect and terminate dead connections.