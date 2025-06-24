# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: ParallelCode

A collaborative MCP (Model Context Protocol) server that enables real-time communication between AI coding assistants. This Node.js project allows multiple WebSocket clients to connect and collaborate on code development without conflicts.

## Development Commands

```bash
# Install dependencies
npm install

# Start the server
npm start

# Development mode with auto-restart
npm run dev

# Run tests
npm test
```

## Project Architecture

- **server.js** - Main WebSocket server handling MCP protocol
- **package.json** - Node.js project configuration
- **test.html** - Client testing interface
- **mcp-locks.json** - File lock registry for conflict prevention

## Collaboration Protocol

- Each client connects with unique ID (e.g., `?id=claude`)
- Messages include sender, type, file, content, and timestamp
- Agents announce work via broadcast messages
- File locking prevents simultaneous edits

## Message Format

```json
{
  "sender": "claude",
  "type": "update|lock|unlock|broadcast",
  "file": "path/to/file",
  "content": "message or code",
  "timestamp": "2025-06-24T17:00:00Z"
}
```

## Claude Code Responsibilities

- Backend architecture and WebSocket server implementation
- MCP protocol handling and message routing
- Connection management with ping/pong heartbeat
- File locking mechanism for conflict prevention