export interface User {
  id: string;
  name: string;
  isHost: boolean;
  hasControl: boolean;
  avatar: string;
}

export interface Room {
  id: string;
  inviteCode: string;
  name: string;
  hostId: string;
  users: User[];
  currentUrl: string;
  maxUsers: number;
  isLocked: boolean;
  userCount: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  type: 'text' | 'sticker' | 'file' | 'system';
  timestamp: string | Date;
  reactions: Record<string, string[]>;
  fileData?: {
    url: string;
    name: string;
    size: number;
    mimeType: string;
  };
}

export interface BrowserFrame {
  data: string; // base64 jpeg data URL
  url: string;
  timestamp: number;
}

export const STICKERS = [
  { id: 'thumbsup', emoji: '👍', label: 'Thumbs Up' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'clap', emoji: '👏', label: 'Clap' },
  { id: 'eyes', emoji: '👀', label: 'Eyes' },
  { id: 'thinking', emoji: '🤔', label: 'Thinking' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'skull', emoji: '💀', label: 'Skull' },
  { id: 'sunglasses', emoji: '😎', label: 'Sunglasses' },
  { id: 'wave', emoji: '👋', label: 'Wave' },
  { id: 'ok', emoji: '✅', label: 'OK' },
];

export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
