import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { CollaborationManager } from './collaboration-manager.js';
import type { BroadcastMessage, WorkAnnouncement } from './types.js';

/**
 * Register all MCP tools for the collaboration server
 */
export function registerTools(server: any, collaboration: CollaborationManager) {
  // Tool: broadcast_message
  server.setRequestHandler('tools/list', async () => {
    return {
      tools: [
        {
          name: 'broadcast_message',
          description: 'Broadcast a message to all connected AI agents for coordination and communication',
          inputSchema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Message to broadcast to all connected agents'
              },
              type: {
                type: 'string',
                enum: ['broadcast', 'update', 'announcement', 'status'],
                default: 'broadcast',
                description: 'Type of message being sent'
              },
              file: {
                type: 'string',
                description: 'Optional file path if the message relates to a specific file'
              }
            },
            required: ['message']
          }
        },
        {
          name: 'lock_file',
          description: 'Lock a file to prevent other agents from editing it simultaneously, ensuring conflict-free collaboration',
          inputSchema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                description: 'File path to lock for exclusive editing'
              },
              reason: {
                type: 'string',
                description: 'Optional reason for locking the file'
              }
            },
            required: ['file']
          }
        },
        {
          name: 'unlock_file',
          description: 'Release a file lock to allow other agents to edit it',
          inputSchema: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                description: 'File path to unlock'
              }
            },
            required: ['file']
          }
        },
        {
          name: 'get_collaboration_status',
          description: 'Get current collaboration status including file locks and system state',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        },
        {
          name: 'announce_work',
          description: 'Announce what work you are starting to coordinate with other agents and prevent conflicts',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                description: 'What action you are taking (e.g., "implementing login feature", "fixing bug in utils.js")'
              },
              files: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'List of files you will be working on'
              },
              estimated_time: {
                type: 'string',
                description: 'Estimated time to complete (e.g., "10 minutes", "1 hour")'
              }
            },
            required: ['action']
          }
        }
      ]
    };
  });

  // Tool execution handler
  server.setRequestHandler('tools/call', async (request: any) => {
    const { name, arguments: params } = request.params;

    switch (name) {
      case 'broadcast_message': {
        const agentId = process.env.MCP_AGENT_ID || randomUUID();
        const message: BroadcastMessage = {
          sender: agentId,
          type: params.type || 'broadcast',
          file: params.file,
          content: params.message,
          timestamp: new Date().toISOString()
        };

        collaboration.logMessage(message);

        return {
          content: [
            {
              type: 'text',
              text: `Message broadcasted successfully: "${params.message}"\nType: ${message.type}\nTimestamp: ${message.timestamp}${params.file ? `\nFile: ${params.file}` : ''}`,
            },
          ],
        };
      }

      case 'lock_file': {
        const agentId = process.env.MCP_AGENT_ID || randomUUID();
        const result = await collaboration.lockFile(params.file, agentId);

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: result.message,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `${result.message}. You now have exclusive edit access.${params.reason ? ` Reason: ${params.reason}` : ''}`,
            },
          ],
        };
      }

      case 'unlock_file': {
        const agentId = process.env.MCP_AGENT_ID || randomUUID();
        const result = await collaboration.unlockFile(params.file, agentId);

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: result.message,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `${result.message}. Other agents can now edit it.`,
            },
          ],
        };
      }

      case 'get_collaboration_status': {
        const status = collaboration.getStatus();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                fileLocks: status.fileLocks,
                totalLockedFiles: Object.keys(status.fileLocks).length,
                lastActivity: status.lastActivity,
                serverTime: new Date().toISOString()
              }, null, 2),
            },
          ],
        };
      }

      case 'announce_work': {
        const agentId = process.env.MCP_AGENT_ID || randomUUID();
        const announcement: WorkAnnouncement = {
          sender: agentId,
          action: params.action,
          files: params.files,
          estimated_time: params.estimated_time,
          timestamp: new Date().toISOString()
        };

        collaboration.logWorkAnnouncement(announcement);

        return {
          content: [
            {
              type: 'text',
              text: `Work announcement sent: "${params.action}"${params.estimated_time ? ` (ETA: ${params.estimated_time})` : ''}${params.files?.length ? `\nFiles: ${params.files.join(', ')}` : ''}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });
}