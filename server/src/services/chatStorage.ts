import fs from 'fs';
import path from 'path';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  type: 'text' | 'sticker' | 'file' | 'system';
  timestamp: Date;
  reactions: Record<string, string[]>;
  fileData?: {
    url: string;
    name: string;
    size: number;
    mimeType: string;
  };
}

const MAX_MESSAGES = 200;
const DEBOUNCE_MS = 2000;

export class ChatStorage {
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private memoryCache: Map<string, ChatMessage[]> = new Map();

  private getFilePath(roomId: string): string {
    return `/tmp/browsertogether-chat-${roomId}.json`;
  }

  getMessages(roomId: string): ChatMessage[] {
    if (this.memoryCache.has(roomId)) {
      return this.memoryCache.get(roomId)!;
    }

    const filePath = this.getFilePath(roomId);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as ChatMessage[];
        // Restore Date objects
        const messages = parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
        this.memoryCache.set(roomId, messages);
        return messages;
      }
    } catch (err) {
      console.error(`[ChatStorage] Failed to read messages for room ${roomId}:`, err);
    }

    const empty: ChatMessage[] = [];
    this.memoryCache.set(roomId, empty);
    return empty;
  }

  addMessage(roomId: string, message: ChatMessage): void {
    const messages = this.getMessages(roomId);
    messages.push(message);

    // Keep only last MAX_MESSAGES
    if (messages.length > MAX_MESSAGES) {
      messages.splice(0, messages.length - MAX_MESSAGES);
    }

    this.memoryCache.set(roomId, messages);
    this.scheduleSave(roomId);
  }

  private scheduleSave(roomId: string): void {
    const existing = this.debounceTimers.get(roomId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.flushToDisk(roomId);
      this.debounceTimers.delete(roomId);
    }, DEBOUNCE_MS);

    this.debounceTimers.set(roomId, timer);
  }

  private flushToDisk(roomId: string): void {
    const messages = this.memoryCache.get(roomId);
    if (!messages) return;

    const filePath = this.getFilePath(roomId);
    try {
      fs.writeFileSync(filePath, JSON.stringify(messages), 'utf-8');
    } catch (err) {
      console.error(`[ChatStorage] Failed to save messages for room ${roomId}:`, err);
    }
  }

  deleteRoom(roomId: string): void {
    // Cancel pending save
    const timer = this.debounceTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(roomId);
    }

    this.memoryCache.delete(roomId);

    const filePath = this.getFilePath(roomId);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`[ChatStorage] Failed to delete chat file for room ${roomId}:`, err);
    }
  }
}
