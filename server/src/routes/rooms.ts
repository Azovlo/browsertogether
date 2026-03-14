import { Router, Request, Response } from 'express';
import { RoomManager } from '../services/roomManager';

export function roomRoutes(roomManager: RoomManager): Router {
  const router = Router();

  // Check if invite code is valid
  router.get('/check/:inviteCode', (req: Request, res: Response) => {
    const { inviteCode } = req.params;
    const room = roomManager.getRoomByInviteCode(inviteCode);

    if (!room) {
      return res.status(404).json({ valid: false, error: 'Room not found' });
    }

    if (room.isLocked) {
      return res.status(403).json({ valid: false, error: 'Room is locked' });
    }

    if (room.users.size >= room.maxUsers) {
      return res.status(403).json({ valid: false, error: 'Room is full' });
    }

    res.json({
      valid: true,
      room: {
        id: room.id,
        name: room.name,
        userCount: room.users.size,
        maxUsers: room.maxUsers,
      },
    });
  });

  return router;
}
