import { Request, Response, NextFunction } from 'express';
import { RoomManager } from '../services/roomManager';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    roomId: string;
    token: string;
  };
}

export function createAuthMiddleware(roomManager: RoomManager) {
  return function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.slice(7);
    const result = roomManager.getRoomIdByToken(token);

    if (!result) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.user = { userId: result.userId, roomId: result.roomId, token };
    next();
  };
}
