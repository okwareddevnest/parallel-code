import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { CollaborationManager } from './collaboration-manager.js';
import type { BroadcastMessage, WorkAnnouncement } from './types.js';

/**
 * Register all MCP tools for the collaboration server
 */
export function registerTools(server: any, collaboration: CollaborationManager) {
  // Tool: broadcast_message
  server.registerTool(
    'broadcast_message',
    {
      title: 'Broadcast Message',
      description: 'Broadcast a message to all connected AI agents for coordination and communication',
      inputSchema: {
        message: z.string().describe('Message to broadcast to all connected agents'),
        type: z.enum(['broadcast', 'update', 'announcement', 'status'])
          .optional()
          .default('broadcast')
          .describe('Type of message being sent'),
        file: z.string().optional().describe('Optional file path if the message relates to a specific file'),
      }
    },
    async (params: any) => {
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
  );

  // Tool: lock_file
  server.registerTool(
    'lock_file',
    {
      title: 'Lock File',
      description: 'Lock a file to prevent other agents from editing it simultaneously, ensuring conflict-free collaboration',
      inputSchema: {
        file: z.string().describe('File path to lock for exclusive editing'),
        reason: z.string().optional().describe('Optional reason for locking the file'),
      }
    },
    async (params: any) => {
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
  );

  // Tool: unlock_file
  server.registerTool(
    'unlock_file',
    {
      title: 'Unlock File',
      description: 'Release a file lock to allow other agents to edit it',
      inputSchema: {
        file: z.string().describe('File path to unlock'),
      }
    },
    async (params: any) => {
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
  );

  // Tool: get_collaboration_status
  server.registerTool(
    'get_collaboration_status',
    {
      title: 'Get Collaboration Status',
      description: 'Get current collaboration status including file locks and system state',
      inputSchema: {}
    },
    async () => {
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
  );

  // Tool: announce_work
  server.registerTool(
    'announce_work',
    {
      title: 'Announce Work',
      description: 'Announce what work you are starting to coordinate with other agents and prevent conflicts',
      inputSchema: {
        action: z.string().describe('What action you are taking (e.g., "implementing login feature", "fixing bug in utils.js")'),
        files: z.array(z.string()).optional().describe('List of files you will be working on'),
        estimated_time: z.string().optional().describe('Estimated time to complete (e.g., "10 minutes", "1 hour")'),
      }
    },
    async (params: any) => {
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
  );
}