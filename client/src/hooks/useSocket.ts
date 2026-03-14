import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRoomStore } from '../stores/roomStore';
import { ChatMessage, User } from '../types';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || '';

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socketInstance;
}

export function useSocket() {
  const store = useRoomStore();
  const setupRef = useRef(false);

  useEffect(() => {
    if (setupRef.current) return;
    setupRef.current = true;

    const socket = getSocket();

    socket.on('connect', () => {
      store.setConnected(true);
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      store.setConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('browser:frame', ({ data, url }: { data: string; url: string }) => {
      store.setBrowserFrame(data);
      if (url && url !== store.currentUrl) {
        store.setCurrentUrl(url);
        store.updateRoom({ currentUrl: url });
      }
    });

    socket.on('browser:url-changed', ({ url }: { url: string }) => {
      store.setCurrentUrl(url);
      store.updateRoom({ currentUrl: url });
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      store.addMessage(msg);
    });

    socket.on('chat:reaction-updated', ({ messageId, reactions }: { messageId: string; reactions: Record<string, string[]> }) => {
      store.updateMessageReaction(messageId, reactions);
    });

    socket.on('room:user-joined', ({ user, message }: { user: User; message: ChatMessage }) => {
      store.addMessage(message);
      const currentUsers = store.room?.users || [];
      store.updateUsers([...currentUsers, user]);
      store.addToast(`${user.name} joined the room`, 'info');
    });

    socket.on('room:user-left', ({ userId, newHostId, message, users }: {
      userId: string;
      newHostId: string | null;
      message: ChatMessage;
      users: User[];
    }) => {
      store.addMessage(message);
      store.updateUsers(users);
    });

    socket.on('control:transferred', ({ toUserId, users }: { toUserId: string; users: User[] }) => {
      store.updateUsers(users);
      const isMe = toUserId === store.userId;
      const user = users.find(u => u.id === toUserId);
      if (isMe) {
        store.addToast('You now have browser control! 🎮', 'success');
      } else if (user) {
        store.addToast(`${user.name} now has control`, 'info');
      }
    });

    socket.on('control:request-received', ({ userId, userName }: { userId: string; userName: string }) => {
      store.setPendingControlRequest({ userId, userName });
      store.addToast(`${userName} is requesting control`, 'warning');
    });

    socket.connect();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('browser:frame');
      socket.off('browser:url-changed');
      socket.off('chat:message');
      socket.off('chat:reaction-updated');
      socket.off('room:user-joined');
      socket.off('room:user-left');
      socket.off('control:transferred');
      socket.off('control:request-received');
      setupRef.current = false;
    };
  }, []);

  const createRoom = useCallback((userName: string, roomName?: string): Promise<{ room: any; userId: string; messages: ChatMessage[] }> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      socket.emit('room:create', { userName, roomName }, (res: any) => {
        if (res.success) {
          resolve(res);
        } else {
          reject(new Error(res.error));
        }
      });
    });
  }, []);

  const joinRoom = useCallback((inviteCode: string, userName: string): Promise<{ room: any; userId: string; messages: ChatMessage[] }> => {
    return new Promise((resolve, reject) => {
      const socket = getSocket();
      socket.emit('room:join', { inviteCode, userName }, (res: any) => {
        if (res.success) {
          resolve(res);
        } else {
          reject(new Error(res.error));
        }
      });
    });
  }, []);

  const leaveRoom = useCallback(() => {
    const socket = getSocket();
    socket.emit('room:leave');
    store.leaveRoom();
  }, []);

  const navigate = useCallback((url: string) => {
    const socket = getSocket();
    return new Promise<string>((resolve, reject) => {
      socket.emit('browser:navigate', { url }, (res: any) => {
        if (res?.success) resolve(res.url);
        else reject(new Error(res?.error || 'Navigation failed'));
      });
    });
  }, []);

  const click = useCallback((x: number, y: number) => {
    getSocket().emit('browser:click', { x, y });
  }, []);

  const scroll = useCallback((x: number, y: number, deltaX: number, deltaY: number) => {
    getSocket().emit('browser:scroll', { x, y, deltaX, deltaY });
  }, []);

  const mouseMove = useCallback((x: number, y: number) => {
    getSocket().emit('browser:mousemove', { x, y });
  }, []);

  const keyPress = useCallback((key: string) => {
    getSocket().emit('browser:keypress', { key });
  }, []);

  const typeText = useCallback((text: string) => {
    getSocket().emit('browser:type', { text });
  }, []);

  const goBack = useCallback(() => {
    getSocket().emit('browser:back');
  }, []);

  const goForward = useCallback(() => {
    getSocket().emit('browser:forward');
  }, []);

  const requestControl = useCallback(() => {
    getSocket().emit('control:request');
  }, []);

  const grantControl = useCallback((toUserId: string) => {
    getSocket().emit('control:grant', { toUserId });
  }, []);

  const releaseControl = useCallback(() => {
    getSocket().emit('control:release');
  }, []);

  const sendMessage = useCallback((content: string, type: 'text' | 'sticker' | 'file' = 'text', fileData?: any) => {
    getSocket().emit('chat:message', { content, type, fileData });
  }, []);

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    getSocket().emit('chat:react', { messageId, emoji });
  }, []);

  return {
    createRoom,
    joinRoom,
    leaveRoom,
    navigate,
    click,
    scroll,
    mouseMove,
    keyPress,
    typeText,
    goBack,
    goForward,
    requestControl,
    grantControl,
    releaseControl,
    sendMessage,
    reactToMessage,
  };
}
