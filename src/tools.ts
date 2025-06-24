import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { randomUUID } from 'crypto';
import type { CollaborationManager } from './collaboration-manager.js';
import type { BroadcastMessage, WorkAnnouncement } from './types.js';

// Input schemas
const BroadcastMessageSchema = z.object({
  message: z.string().describe('Message to broadcast to all connected agents'),
  type: z.enum(['broadcast', 'update', 'announcement', 'status'])
    .optional()
    .default('broadcast')
    .describe('Type of message being sent'),
  file: z.string().optional().describe('Optional file path if the message relates to a specific file'),
});

const LockFileSchema = z.object({
  file: z.string().describe('File path to lock for exclusive editing'),
  reason: z.string().optional().describe('Optional reason for locking the file'),
});

const UnlockFileSchema = z.object({
  file: z.string().describe('File path to unlock'),
});

const AnnounceWorkSchema = z.object({
  action: z.string().describe('Description of the work being planned'),
  files: z.array(z.string()).optional().describe('List of files that will be worked on'),
  estimated_time: z.string().optional().describe('Estimated time to complete the work'),
});

const GetCollaborationStatusSchema = z.object({});

/**
 * Get all available tools
 */
export function getTools() {
  return [
    {
      name: 'broadcast_message',
      description: 'Broadcast a message to all connected AI agents for coordination and communication',
      inputSchema: zodToJsonSchema(BroadcastMessageSchema),
    },
    {
      name: 'lock_file',
      description: 'Lock a file to prevent other agents from editing it simultaneously, ensuring conflict-free collaboration',
      inputSchema: zodToJsonSchema(LockFileSchema),
    },
    {
      name: 'unlock_file',
      description: 'Release a file lock to allow other agents to edit it',
      inputSchema: zodToJsonSchema(UnlockFileSchema),
    },
    {
      name: 'announce_work',
      description: 'Announce planned work to coordinate with other agents and avoid conflicts',
      inputSchema: zodToJsonSchema(AnnounceWorkSchema),
    },
    {
      name: 'get_collaboration_status',
      description: 'Get current collaboration status including active locks and connected agents',
      inputSchema: zodToJsonSchema(GetCollaborationStatusSchema),
    },
  ];
}

/**
 * Handle tool calls
 */
export async function handleToolCall(name: string, args: any, collaboration: CollaborationManager) {
  try {
    switch (name) {
      case 'broadcast_message': {
        const params = BroadcastMessageSchema.parse(args);
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
        const params = LockFileSchema.parse(args);
        const agentId = process.env.MCP_AGENT_ID || randomUUID();
        const result = await collaboration.lockFile(params.file, agentId);

        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `File "${params.file}" locked successfully by agent ${agentId}${params.reason ? `\nReason: ${params.reason}` : ''}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to lock file "${params.file}": ${result.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'unlock_file': {
        const params = UnlockFileSchema.parse(args);
        const agentId = process.env.MCP_AGENT_ID || randomUUID();
        const result = await collaboration.unlockFile(params.file, agentId);

        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `File "${params.file}" unlocked successfully by agent ${agentId}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to unlock file "${params.file}": ${result.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'announce_work': {
        const params = AnnounceWorkSchema.parse(args);
        const agentId = process.env.MCP_AGENT_ID || randomUUID();
        const announcement: WorkAnnouncement = {
          sender: agentId,
          action: params.action,
          files: params.files || [],
          estimated_time: params.estimated_time,
          timestamp: new Date().toISOString()
        };

        collaboration.logWorkAnnouncement(announcement);

        return {
          content: [
            {
              type: 'text',
              text: `Work announced successfully!\nAgent: ${agentId}\nAction: ${params.action}${params.files ? `\nFiles: ${params.files.join(', ')}` : ''}${params.estimated_time ? `\nEstimated time: ${params.estimated_time}` : ''}\nTimestamp: ${announcement.timestamp}`,
            },
          ],
        };
      }

      case 'get_collaboration_status': {
        GetCollaborationStatusSchema.parse(args);
        const status = collaboration.getStatus();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}