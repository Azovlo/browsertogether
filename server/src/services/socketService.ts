import { Server, Socket } from 'socket.io';
import { RoomManager } from './roomManager';
import { BrowserService } from './browserService';
import { ChatStorage, ChatMessage } from './chatStorage';
import { nanoid } from 'nanoid';

const chatStorage = new ChatStorage();

// ─── Rate limiting ─────────────────────────────────────────────────────────────
// Map<socketId, Map<eventName, lastTimestamp>>
const rateLimitMap = new Map<string, Map<string, number>>();

const RATE_LIMITS: Record<string, number> = {
  'browser:click':     50,
  'browser:mousemove': 50,
  'browser:scroll':    50,
  'browser:keypress':  50,
  'browser:type':      50,
  'browser:navigate':  500,
};

function isRateLimited(socketId: string, event: string): boolean {
  const limit = RATE_LIMITS[event];
  if (!limit) return false;

  let socketMap = rateLimitMap.get(socketId);
  if (!socketMap) {
    socketMap = new Map();
    rateLimitMap.set(socketId, socketMap);
  }

  const now = Date.now();
  const last = socketMap.get(event) ?? 0;
  if (now - last < limit) return true;

  socketMap.set(event, now);
  return false;
}

export function setupSocketHandlers(
  io: Server,
  roomManager: RoomManager,
  browserService: BrowserService
): void {
  // Forward browser screenshots to rooms
  browserService.on('screenshot', ({ roomId, data, url }: { roomId: string; data: Buffer; url: string }) => {
    const base64 = data.toString('base64');
    io.to(`room:${roomId}`).emit('browser:frame', {
      data: `data:image/jpeg;base64,${base64}`,
      url,
      timestamp: Date.now(),
    });
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // ─── CREATE ROOM ─────────────────────────────────────────────────────────
    socket.on('room:create', async ({ userName, roomName }: { userName: string; roomName?: string }, callback) => {
      try {
        const userId = nanoid(12);
        const room = roomManager.createRoom(userId, userName, socket.id, roomName);

        socket.join(`room:${room.id}`);
        socket.data.userId = userId;
        socket.data.roomId = room.id;

        // Create browser for the room
        await browserService.createRoomBrowser(room.id);

        const systemMsg: ChatMessage = {
          id: nanoid(),
          userId: 'system',
          userName: 'System',
          avatar: '#888',
          content: `Room "${room.name}" created`,
          type: 'system',
          timestamp: new Date(),
          reactions: {},
        };
        chatStorage.addMessage(room.id, systemMsg);

        const hostUser = room.users.get(userId);
        callback({
          success: true,
          room: roomManager.serializeRoom(room),
          userId,
          sessionToken: hostUser?.sessionToken ?? '',
          messages: chatStorage.getMessages(room.id),
        });

        console.log(`Room created: ${room.id} by ${userName}`);
      } catch (err: any) {
        callback({ success: false, error: err.message });
      }
    });

    // ─── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on('room:join', async ({ inviteCode, userName }: { inviteCode: string; userName: string }, callback) => {
      try {
        const existingRoom = roomManager.getRoomByInviteCode(inviteCode);
        if (!existingRoom) {
          return callback({ success: false, error: 'Room not found. Check the invite code.' });
        }

        const userId = nanoid(12);
        const { room, user } = roomManager.joinRoom(existingRoom.id, userId, userName, socket.id);

        socket.join(`room:${room.id}`);
        socket.data.userId = userId;
        socket.data.roomId = room.id;

        // Ensure browser is running
        const rb = (browserService as any).roomBrowsers.get(room.id);
        if (!rb) {
          await browserService.createRoomBrowser(room.id, room.currentUrl);
        }

        const systemMsg: ChatMessage = {
          id: nanoid(),
          userId: 'system',
          userName: 'System',
          avatar: '#888',
          content: `${userName} joined the room`,
          type: 'system',
          timestamp: new Date(),
          reactions: {},
        };
        chatStorage.addMessage(room.id, systemMsg);

        // Notify other users
        socket.to(`room:${room.id}`).emit('room:user-joined', {
          user: { id: userId, name: userName, isHost: false, hasControl: false, avatar: user.avatar },
          message: systemMsg,
        });

        const joinedUser = room.users.get(userId);
        callback({
          success: true,
          room: roomManager.serializeRoom(room),
          userId,
          sessionToken: joinedUser?.sessionToken ?? '',
          messages: chatStorage.getMessages(room.id),
        });

        console.log(`User ${userName} joined room ${room.id}`);
      } catch (err: any) {
        callback({ success: false, error: err.message });
      }
    });

    // ─── LEAVE ROOM ───────────────────────────────────────────────────────────
    socket.on('room:leave', async () => {
      await handleDisconnect(socket, io, roomManager, browserService);
    });

    // ─── BROWSER CONTROLS ─────────────────────────────────────────────────────
    socket.on('browser:navigate', async ({ url }: { url: string }, callback) => {
      if (isRateLimited(socket.id, 'browser:navigate')) return;
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const user = roomManager.getUserInRoom(roomId, userId);
      if (!user?.hasControl) return callback?.({ success: false, error: 'No control' });

      try {
        const finalUrl = await browserService.navigate(roomId, url);
        roomManager.updateRoomUrl(roomId, finalUrl);
        io.to(`room:${roomId}`).emit('browser:url-changed', { url: finalUrl });
        callback?.({ success: true, url: finalUrl });
      } catch (err: any) {
        callback?.({ success: false, error: err.message });
      }
    });

    socket.on('browser:click', async ({ x, y }: { x: number; y: number }) => {
      if (isRateLimited(socket.id, 'browser:click')) return;
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const user = roomManager.getUserInRoom(roomId, userId);
      if (!user?.hasControl) return;

      await browserService.click(roomId, x, y).catch(() => {});
    });

    socket.on('browser:scroll', async ({ x, y, deltaX, deltaY }: { x: number; y: number; deltaX: number; deltaY: number }) => {
      if (isRateLimited(socket.id, 'browser:scroll')) return;
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const user = roomManager.getUserInRoom(roomId, userId);
      if (!user?.hasControl) return;

      await browserService.scroll(roomId, x, y, deltaX, deltaY).catch(() => {});
    });

    socket.on('browser:mousemove', async ({ x, y }: { x: number; y: number }) => {
      if (isRateLimited(socket.id, 'browser:mousemove')) return;
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const user = roomManager.getUserInRoom(roomId, userId);
      if (!user?.hasControl) return;

      await browserService.mouseMove(roomId, x, y).catch(() => {});
    });

    socket.on('browser:keypress', async ({ key }: { key: string }) => {
      if (isRateLimited(socket.id, 'browser:keypress')) return;
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const user = roomManager.getUserInRoom(roomId, userId);
      if (!user?.hasControl) return;

      await browserService.keyPress(roomId, key).catch(() => {});
    });

    socket.on('browser:type', async ({ text }: { text: string }) => {
      if (isRateLimited(socket.id, 'browser:type')) return;
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const user = roomManager.getUserInRoom(roomId, userId);
      if (!user?.hasControl) return;

      await browserService.typeText(roomId, text).catch(() => {});
    });

    socket.on('browser:back', async () => {
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const user = roomManager.getUserInRoom(roomId, userId);
      if (!user?.hasControl) return;

      const url = await browserService.goBack(roomId).catch(() => '');
      if (url) {
        roomManager.updateRoomUrl(roomId, url);
        io.to(`room:${roomId}`).emit('browser:url-changed', { url });
      }
    });

    socket.on('browser:forward', async () => {
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const user = roomManager.getUserInRoom(roomId, userId);
      if (!user?.hasControl) return;

      const url = await browserService.goForward(roomId).catch(() => '');
      if (url) {
        roomManager.updateRoomUrl(roomId, url);
        io.to(`room:${roomId}`).emit('browser:url-changed', { url });
      }
    });

    // ─── ADAPTIVE STREAMING ───────────────────────────────────────────────────
    socket.on('stream:ping', ({ timestamp }: { timestamp: number }) => {
      socket.emit('stream:pong', { timestamp });
    });

    // Client reports round-trip latency every ~5s
    socket.on('stream:latency', ({ latency }: { latency: number }) => {
      const { roomId } = socket.data;
      if (!roomId) return;

      const room = roomManager.getRoom(roomId);
      const userCount = room ? room.users.size : 1;

      const result = browserService.adaptQuality(roomId, latency, userCount);
      if (result && result.changed) {
        io.to(`room:${roomId}`).emit('stream:quality-change', {
          fps: result.fps,
          quality: result.quality,
          reason: result.reason,
        });
      }
    });

    socket.on('stream:set-quality', ({ preset }: { preset: 'low' | 'medium' | 'high' | 'auto' }) => {
      const { roomId } = socket.data;
      if (!roomId) return;

      const result = browserService.setQualityPreset(roomId, preset);
      if (result) {
        io.to(`room:${roomId}`).emit('stream:quality-change', {
          fps: result.fps,
          quality: result.quality,
          reason: result.reason,
        });
      }
    });

    // ─── CONTROL REQUESTS ─────────────────────────────────────────────────────
    socket.on('control:request', () => {
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      roomManager.requestControl(roomId, userId);
      const user = roomManager.getUserInRoom(roomId, userId);

      // Notify host
      const room = roomManager.getRoom(roomId);
      if (!room) return;

      const hostUser = room.users.get(room.hostId);
      if (hostUser) {
        io.to(hostUser.socketId).emit('control:request-received', {
          userId,
          userName: user?.name,
        });
      }
    });

    socket.on('control:grant', ({ toUserId }: { toUserId: string }) => {
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const room = roomManager.getRoom(roomId);
      if (!room || room.hostId !== userId) return; // Only host can grant

      const success = roomManager.transferControl(roomId, toUserId);
      if (success) {
        io.to(`room:${roomId}`).emit('control:transferred', {
          toUserId,
          users: roomManager.getRoomUsers(roomId).map(u => ({
            id: u.id,
            name: u.name,
            isHost: u.isHost,
            hasControl: u.hasControl,
            avatar: u.avatar,
          })),
        });
      }
    });

    socket.on('control:release', () => {
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const room = roomManager.getRoom(roomId);
      if (!room) return;

      // Transfer back to host
      roomManager.transferControl(roomId, room.hostId);
      io.to(`room:${roomId}`).emit('control:transferred', {
        toUserId: room.hostId,
        users: roomManager.getRoomUsers(roomId).map(u => ({
          id: u.id,
          name: u.name,
          isHost: u.isHost,
          hasControl: u.hasControl,
          avatar: u.avatar,
        })),
      });
    });

    // ─── CHAT ─────────────────────────────────────────────────────────────────
    socket.on('chat:message', ({ content, type = 'text', fileData }: {
      content: string;
      type?: 'text' | 'sticker' | 'file';
      fileData?: ChatMessage['fileData'];
    }) => {
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const user = roomManager.getUserInRoom(roomId, userId);
      if (!user) return;

      const message: ChatMessage = {
        id: nanoid(),
        userId,
        userName: user.name,
        avatar: user.avatar,
        content,
        type,
        timestamp: new Date(),
        reactions: {},
        fileData,
      };

      chatStorage.addMessage(roomId, message);
      io.to(`room:${roomId}`).emit('chat:message', message);
    });

    socket.on('chat:react', ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { roomId, userId } = socket.data;
      if (!roomId || !userId) return;

      const messages = chatStorage.getMessages(roomId);
      const msg = messages.find(m => m.id === messageId);
      if (!msg) return;

      if (!msg.reactions[emoji]) {
        msg.reactions[emoji] = [];
      }

      const idx = msg.reactions[emoji].indexOf(userId);
      if (idx >= 0) {
        msg.reactions[emoji].splice(idx, 1);
        if (msg.reactions[emoji].length === 0) {
          delete msg.reactions[emoji];
        }
      } else {
        msg.reactions[emoji].push(userId);
      }

      io.to(`room:${roomId}`).emit('chat:reaction-updated', {
        messageId,
        reactions: msg.reactions,
      });
    });

    // ─── DISCONNECT ───────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      rateLimitMap.delete(socket.id);
      await handleDisconnect(socket, io, roomManager, browserService);
    });
  });
}

async function handleDisconnect(
  socket: Socket,
  io: Server,
  roomManager: RoomManager,
  browserService: BrowserService,
): Promise<void> {
  const { roomId, userId } = socket.data;
  if (!roomId || !userId) return;

  const user = roomManager.getUserInRoom(roomId, userId);
  const userName = user?.name || 'Someone';

  const { room, wasHost, newHostId } = roomManager.leaveRoom(roomId, userId);

  socket.leave(`room:${roomId}`);
  socket.data.roomId = null;
  socket.data.userId = null;

  if (!room) {
    // Room is empty, close browser and delete chat
    await browserService.closeRoomBrowser(roomId).catch(() => {});
    chatStorage.deleteRoom(roomId);
    console.log(`Room ${roomId} deleted (empty)`);
    return;
  }

  const systemMsg: ChatMessage = {
    id: nanoid(),
    userId: 'system',
    userName: 'System',
    avatar: '#888',
    content: wasHost && newHostId
      ? `${userName} left. ${room.users.get(newHostId)?.name} is now the host.`
      : `${userName} left the room`,
    type: 'system',
    timestamp: new Date(),
    reactions: {},
  };

  chatStorage.addMessage(roomId, systemMsg);

  io.to(`room:${roomId}`).emit('room:user-left', {
    userId,
    newHostId,
    message: systemMsg,
    users: roomManager.getRoomUsers(roomId).map(u => ({
      id: u.id,
      name: u.name,
      isHost: u.isHost,
      hasControl: u.hasControl,
      avatar: u.avatar,
    })),
  });

  console.log(`User ${userName} left room ${roomId}`);
}
