import { nanoid } from 'nanoid';
import crypto from 'crypto';

export interface User {
  id: string;
  name: string;
  socketId: string;
  isHost: boolean;
  hasControl: boolean;
  avatar: string;
  joinedAt: Date;
  sessionToken: string;
}

export interface Room {
  id: string;
  inviteCode: string;
  name: string;
  hostId: string;
  users: Map<string, User>;
  currentUrl: string;
  createdAt: Date;
  maxUsers: number;
  isLocked: boolean;
  controlRequestQueue: string[]; // user IDs waiting for control
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private maxRooms: number;
  private maxUsersPerRoom: number;

  constructor() {
    this.maxRooms = parseInt(process.env.MAX_ROOMS || '50');
    this.maxUsersPerRoom = parseInt(process.env.MAX_USERS_PER_ROOM || '6');

    // Cleanup old rooms every 30 minutes
    setInterval(() => this.cleanupOldRooms(), 30 * 60 * 1000);
  }

  createRoom(hostId: string, hostName: string, hostSocketId: string, roomName?: string): Room {
    if (this.rooms.size >= this.maxRooms) {
      throw new Error('Maximum number of rooms reached');
    }

    const roomId = nanoid(10);
    const inviteCode = nanoid(8).toUpperCase();

    const host: User = {
      id: hostId,
      name: hostName,
      socketId: hostSocketId,
      isHost: true,
      hasControl: true,
      avatar: this.generateAvatar(hostName),
      joinedAt: new Date(),
      sessionToken: crypto.randomBytes(32).toString('hex'),
    };

    const room: Room = {
      id: roomId,
      inviteCode,
      name: roomName || `${hostName}'s Room`,
      hostId,
      users: new Map([[hostId, host]]),
      currentUrl: 'https://www.google.com',
      createdAt: new Date(),
      maxUsers: this.maxUsersPerRoom,
      isLocked: false,
      controlRequestQueue: [],
    };

    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, userId: string, userName: string, socketId: string): { room: Room; user: User } {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    if (room.isLocked) throw new Error('Room is locked');
    if (room.users.size >= room.maxUsers) throw new Error('Room is full');

    const user: User = {
      id: userId,
      name: userName,
      socketId,
      isHost: false,
      hasControl: false,
      avatar: this.generateAvatar(userName),
      joinedAt: new Date(),
      sessionToken: crypto.randomBytes(32).toString('hex'),
    };

    room.users.set(userId, user);
    return { room, user };
  }

  leaveRoom(roomId: string, userId: string): { room: Room | null; wasHost: boolean; newHostId: string | null } {
    const room = this.rooms.get(roomId);
    if (!room) return { room: null, wasHost: false, newHostId: null };

    const user = room.users.get(userId);
    const wasHost = user?.isHost || false;

    room.users.delete(userId);
    room.controlRequestQueue = room.controlRequestQueue.filter(id => id !== userId);

    // If room is empty, delete it
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
      return { room: null, wasHost, newHostId: null };
    }

    let newHostId: string | null = null;

    // If host left, assign new host
    if (wasHost) {
      const newHost = Array.from(room.users.values())[0];
      newHost.isHost = true;
      newHost.hasControl = true;
      room.hostId = newHost.id;
      newHostId = newHost.id;

      // Remove control from any other user
      room.users.forEach((u, id) => {
        if (id !== newHostId) {
          u.hasControl = false;
        }
      });
    }

    return { room, wasHost, newHostId };
  }

  getRoomByInviteCode(inviteCode: string): Room | undefined {
    return Array.from(this.rooms.values()).find(r => r.inviteCode === inviteCode.toUpperCase());
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomBySocketId(socketId: string): { room: Room; user: User } | null {
    for (const room of this.rooms.values()) {
      for (const user of room.users.values()) {
        if (user.socketId === socketId) {
          return { room, user };
        }
      }
    }
    return null;
  }

  getRoomIdByToken(token: string): { userId: string; roomId: string } | null {
    for (const room of this.rooms.values()) {
      for (const user of room.users.values()) {
        if (user.sessionToken === token) {
          return { userId: user.id, roomId: room.id };
        }
      }
    }
    return null;
  }

  transferControl(roomId: string, toUserId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    // Remove control from all users
    room.users.forEach(u => { u.hasControl = false; });

    // Give control to target user
    const user = room.users.get(toUserId);
    if (!user) return false;

    user.hasControl = true;

    // Remove from queue if present
    room.controlRequestQueue = room.controlRequestQueue.filter(id => id !== toUserId);

    return true;
  }

  requestControl(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (!room.controlRequestQueue.includes(userId)) {
      room.controlRequestQueue.push(userId);
    }

    return true;
  }

  updateRoomUrl(roomId: string, url: string): void {
    const room = this.rooms.get(roomId);
    if (room) room.currentUrl = url;
  }

  getUserInRoom(roomId: string, userId: string): User | undefined {
    return this.rooms.get(roomId)?.users.get(userId);
  }

  getRoomUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.users.values());
  }

  serializeRoom(room: Room) {
    return {
      id: room.id,
      inviteCode: room.inviteCode,
      name: room.name,
      hostId: room.hostId,
      users: Array.from(room.users.values()).map(u => ({
        id: u.id,
        name: u.name,
        isHost: u.isHost,
        hasControl: u.hasControl,
        avatar: u.avatar,
      })),
      currentUrl: room.currentUrl,
      maxUsers: room.maxUsers,
      isLocked: room.isLocked,
      userCount: room.users.size,
    };
  }

  private generateAvatar(name: string): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  private cleanupOldRooms(): void {
    const now = Date.now();
    const maxAge = 4 * 60 * 60 * 1000; // 4 hours

    this.rooms.forEach((room, id) => {
      if (room.users.size === 0 || now - room.createdAt.getTime() > maxAge) {
        this.rooms.delete(id);
        console.log(`Cleaned up room ${id}`);
      }
    });
  }
}
