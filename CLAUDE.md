# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Parallel Code MCP Server

A Model Context Protocol server that enables collaborative AI coding with conflict prevention. This TypeScript project provides tools for AI agents to coordinate work, lock files, and communicate effectively.

## Development Commands

```bash
# Install dependencies
npm install

# Build the TypeScript project
npm run build

# Start the MCP server
npm start

# Development mode with TypeScript watching
npm run dev

# Run tests
npm test
```

## Project Architecture

**TypeScript Structure:**
- **src/index.ts** - Main MCP server entry point
- **src/types.ts** - TypeScript type definitions
- **src/collaboration-manager.ts** - Core collaboration logic
- **src/tools.ts** - MCP tool registrations
- **dist/** - Compiled JavaScript output
- **package.json** - Project configuration with MCP conventions

## MCP Tools Available

- **broadcast_message** - Send coordination messages between agents
- **lock_file** - Lock files to prevent editing conflicts
- **unlock_file** - Release file locks  
- **announce_work** - Announce planned work to other agents
- **get_collaboration_status** - Check current locks and activity

## Usage with Claude Code

The server integrates with MCP clients like Claude Desktop and Cursor AI. When using with Claude Code:

1. Announce your work before starting: `announce_work`
2. Lock files before editing: `lock_file` 
3. Broadcast updates: `broadcast_message`
4. Release locks when done: `unlock_file`

## State Management

- **mcp-collaboration-state.json** - Persistent collaboration state
- File locks are maintained across server restarts
- State includes file locks, connected agents, and timestamps