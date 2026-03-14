import { create } from 'zustand';
import { Room, User, ChatMessage } from '../types';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface RoomState {
  // Connection
  connected: boolean;
  setConnected: (v: boolean) => void;

  // Room
  roomId: string | null;
  room: Room | null;
  userId: string | null;
  setRoom: (room: Room, userId: string) => void;
  updateRoom: (partial: Partial<Room>) => void;
  leaveRoom: () => void;

  // Users
  updateUsers: (users: User[]) => void;

  // Browser
  browserFrame: string | null;
  currentUrl: string;
  setBrowserFrame: (data: string) => void;
  setCurrentUrl: (url: string) => void;
  controlHolder: string | null; // userId who has control

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessageReaction: (messageId: string, reactions: Record<string, string[]>) => void;
  setMessages: (msgs: ChatMessage[]) => void;

  // Control requests
  pendingControlRequest: { userId: string; userName: string } | null;
  setPendingControlRequest: (req: { userId: string; userName: string } | null) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  // UI
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  unreadCount: number;
  clearUnread: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),

  roomId: null,
  room: null,
  userId: null,
  setRoom: (room, userId) => set({ room, roomId: room.id, userId }),
  updateRoom: (partial) => set(state => ({ room: state.room ? { ...state.room, ...partial } : null })),
  leaveRoom: () => set({
    room: null,
    roomId: null,
    userId: null,
    messages: [],
    browserFrame: null,
    currentUrl: '',
    pendingControlRequest: null,
  }),

  updateUsers: (users) => set(state => {
    if (!state.room) return {};
    const controlHolder = users.find(u => u.hasControl)?.id || null;
    return {
      room: { ...state.room, users, userCount: users.length },
      controlHolder,
    };
  }),

  browserFrame: null,
  currentUrl: 'https://www.google.com',
  controlHolder: null,
  setBrowserFrame: (data) => set({ browserFrame: data }),
  setCurrentUrl: (url) => set({ currentUrl: url }),

  messages: [],
  addMessage: (msg) => set(state => {
    const messages = [...state.messages, msg];
    const unreadCount = state.chatOpen ? 0 : state.unreadCount + (msg.type !== 'system' ? 1 : 0);
    return { messages, unreadCount };
  }),
  updateMessageReaction: (messageId, reactions) => set(state => ({
    messages: state.messages.map(m => m.id === messageId ? { ...m, reactions } : m),
  })),
  setMessages: (messages) => set({ messages }),

  pendingControlRequest: null,
  setPendingControlRequest: (req) => set({ pendingControlRequest: req }),

  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),

  chatOpen: true,
  setChatOpen: (chatOpen) => set({ chatOpen, unreadCount: chatOpen ? 0 : get().unreadCount }),
  unreadCount: 0,
  clearUnread: () => set({ unreadCount: 0 }),
}));
