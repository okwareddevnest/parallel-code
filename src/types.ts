/**
 * Types for the Parallel Code MCP Server
 */

export interface CollaborationState {
  /** Map of file paths to agent IDs that have them locked */
  fileLocks: Record<string, string>;
  /** List of currently connected agent IDs */
  connectedAgents: string[];
  /** ISO timestamp of last activity */
  lastActivity: string;
}

export interface BroadcastMessage {
  /** Agent ID that sent the message */
  sender: string;
  /** Type of message being sent */
  type: 'broadcast' | 'update' | 'announcement' | 'status';
  /** Optional file path if message relates to a specific file */
  file?: string;
  /** Message content */
  content: string;
  /** ISO timestamp when message was sent */
  timestamp: string;
}

export interface WorkAnnouncement {
  /** Agent ID making the announcement */
  sender: string;
  /** Description of the work being done */
  action: string;
  /** Optional list of files that will be worked on */
  files?: string[];
  /** Optional estimated time to complete */
  estimated_time?: string;
  /** ISO timestamp of announcement */
  timestamp: string;
}

export interface FileLockResult {
  /** Whether the lock operation was successful */
  success: boolean;
  /** Human-readable message about the result */
  message: string;
  /** Agent ID that currently has the file locked (if lock failed) */
  lockedBy?: string;
}

export interface FileUnlockResult {
  /** Whether the unlock operation was successful */
  success: boolean;
  /** Human-readable message about the result */
  message: string;
}