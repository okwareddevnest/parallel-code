import * as fs from 'fs/promises';
import * as path from 'path';
import type { 
  CollaborationState, 
  BroadcastMessage, 
  WorkAnnouncement, 
  FileLockResult, 
  FileUnlockResult 
} from './types.js';

/**
 * Manages collaboration state including file locks and agent coordination
 */
export class CollaborationManager {
  private state: CollaborationState;
  private readonly stateFile: string;

  constructor(stateFile?: string) {
    this.stateFile = stateFile || path.join(process.cwd(), 'mcp-collaboration-state.json');
    this.state = {
      fileLocks: {},
      connectedAgents: [],
      lastActivity: new Date().toISOString()
    };
    
    // Load state asynchronously but don't wait for it
    this.loadState().catch(console.error);
  }

  /**
   * Load collaboration state from disk
   */
  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.stateFile, 'utf-8');
      this.state = { ...this.state, ...JSON.parse(data) };
    } catch (error) {
      // File doesn't exist or invalid JSON, use defaults
      await this.saveState();
    }
  }

  /**
   * Save collaboration state to disk
   */
  private async saveState(): Promise<void> {
    try {
      await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Failed to save collaboration state:', error);
    }
  }

  /**
   * Update last activity timestamp
   */
  private updateActivity(): void {
    this.state.lastActivity = new Date().toISOString();
  }

  /**
   * Attempt to lock a file for exclusive editing
   */
  async lockFile(file: string, agentId: string): Promise<FileLockResult> {
    if (this.state.fileLocks[file] && this.state.fileLocks[file] !== agentId) {
      return {
        success: false,
        message: `File "${file}" is already locked by agent: ${this.state.fileLocks[file]}`,
        lockedBy: this.state.fileLocks[file]
      };
    }

    this.state.fileLocks[file] = agentId;
    this.updateActivity();
    await this.saveState();
    
    return {
      success: true,
      message: `Successfully locked file "${file}"`
    };
  }

  /**
   * Release a file lock
   */
  async unlockFile(file: string, agentId: string): Promise<FileUnlockResult> {
    if (!this.state.fileLocks[file]) {
      return {
        success: false,
        message: `File "${file}" is not currently locked`
      };
    }

    if (this.state.fileLocks[file] !== agentId) {
      return {
        success: false,
        message: `File "${file}" is locked by another agent (${this.state.fileLocks[file]}). You cannot unlock it.`
      };
    }

    delete this.state.fileLocks[file];
    this.updateActivity();
    await this.saveState();

    return {
      success: true,
      message: `Successfully unlocked file "${file}"`
    };
  }

  /**
   * Get current collaboration status
   */
  getStatus(): CollaborationState {
    return { ...this.state };
  }

  /**
   * Log a broadcast message to stderr for visibility
   */
  logMessage(message: BroadcastMessage): void {
    console.error(`[${message.type.toUpperCase()}] ${message.sender}: ${message.content}`);
    if (message.file) {
      console.error(`  File: ${message.file}`);
    }
  }

  /**
   * Log a work announcement to stderr for visibility
   */
  logWorkAnnouncement(announcement: WorkAnnouncement): void {
    const files = announcement.files?.length ? ` (Files: ${announcement.files.join(', ')})` : '';
    const eta = announcement.estimated_time ? ` (ETA: ${announcement.estimated_time})` : '';
    console.error(`[WORK] ${announcement.sender}: ${announcement.action}${files}${eta}`);
  }

  /**
   * Clean up locks for a disconnected agent
   */
  async releaseAgentLocks(agentId: string): Promise<string[]> {
    const releasedFiles: string[] = [];
    
    for (const [file, lockOwner] of Object.entries(this.state.fileLocks)) {
      if (lockOwner === agentId) {
        delete this.state.fileLocks[file];
        releasedFiles.push(file);
      }
    }

    if (releasedFiles.length > 0) {
      this.updateActivity();
      await this.saveState();
    }

    return releasedFiles;
  }
}