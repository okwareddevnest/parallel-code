# Parallel Code MCP Server

A Model Context Protocol server that enables collaborative AI coding with conflict prevention. This server allows multiple AI assistants to coordinate their work, share messages, and manage file locks to prevent editing conflicts.

## Features

- **🔒 File Locking** - Prevent multiple agents from editing the same file simultaneously
- **📢 Message Broadcasting** - Coordinate between AI agents with real-time messaging  
- **📊 Collaboration Status** - Track active locks and system state
- **🎯 Work Announcements** - Announce planned work to coordinate with other agents
- **⚡ Real-time Coordination** - Built on the Model Context Protocol for seamless integration

## Security Warning

This server can access and lock files in your project directory. Ensure you trust the AI agents that will be using this server, as they can potentially lock important files and affect your development workflow.

## Installation

### Using npm (recommended)

```bash
npm install -g parallel-code-mcp-server
```

### Using npx

```bash
npx parallel-code-mcp-server
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "parallel-code": {
      "command": "parallel-code-mcp-server"
    }
  }
}
```

### With Cursor AI

1. Go to Cursor Settings → Extensions → MCP
2. Add new MCP server
3. Server name: `parallel-code`
4. Command: `parallel-code-mcp-server`
5. Enable the server

## Available Tools

### `broadcast_message`
Send a message to coordinate with other AI agents.

```typescript
{
  message: string,           // Required: Message content
  type?: string,            // Optional: broadcast, update, announcement, status
  file?: string             // Optional: Related file path
}
```

### `lock_file`
Lock a file to prevent editing conflicts.

```typescript
{
  file: string,             // Required: File path to lock
  reason?: string           // Optional: Reason for locking
}
```

### `unlock_file`
Release a file lock.

```typescript
{
  file: string              // Required: File path to unlock
}
```

### `announce_work`
Announce your planned work to other agents.

```typescript
{
  action: string,           // Required: Description of work
  files?: string[],         // Optional: List of files you'll work on
  estimated_time?: string   // Optional: Time estimate
}
```

### `get_collaboration_status`
Get current collaboration state.

```typescript
{} // No parameters required
```

## Example Usage

```typescript
// Announce your work
await mcp.call('announce_work', {
  action: 'Implementing user authentication system',
  files: ['src/auth.ts', 'src/user.ts'],
  estimated_time: '30 minutes'
});

// Lock a file before editing
await mcp.call('lock_file', {
  file: 'src/auth.ts',
  reason: 'Adding login validation'
});

// Broadcast a status update
await mcp.call('broadcast_message', {
  message: 'Authentication system is ready for testing',
  type: 'announcement',
  file: 'src/auth.ts'
});

// Unlock when done
await mcp.call('unlock_file', {
  file: 'src/auth.ts'
});
```

## Development

```bash
# Clone the repository
git clone https://github.com/okwareddevnest/parallel-code.git
cd parallel-code

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## State Management

The server maintains collaboration state in `mcp-collaboration-state.json` in your working directory. This file tracks:

- Active file locks
- Connected agents
- Last activity timestamp

## License

Licensed under the AGPL-3.0 License. See LICENSE file for details.

## Contributing

We encourage contributions to help expand and improve the server. Please feel free to submit issues, feature requests, and pull requests.