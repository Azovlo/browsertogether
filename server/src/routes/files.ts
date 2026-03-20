import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import { RoomManager } from '../services/roomManager';
import { createAuthMiddleware, AuthenticatedRequest } from '../middleware/auth';

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${nanoid(12)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req: AuthenticatedRequest, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'video/mp4', 'video/webm', 'video/ogg',
    'text/plain',
    'application/zip',
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Track uploads per room: roomId -> Set<filename>
const roomFiles: Map<string, Set<string>> = new Map();

function getRoomFiles(roomId: string): Set<string> {
  if (!roomFiles.has(roomId)) {
    roomFiles.set(roomId, new Set());
  }
  return roomFiles.get(roomId)!;
}

export function fileRoutes(roomManager: RoomManager): Router {
  const router = Router();
  const auth = createAuthMiddleware(roomManager);

  router.post('/upload', auth, upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const roomId = req.user!.roomId;
    getRoomFiles(roomId).add(req.file.filename);

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      file: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  });

  // List files for the authenticated user's room
  router.get('/list', auth, (req: AuthenticatedRequest, res: Response) => {
    const roomId = req.user!.roomId;
    const files = getRoomFiles(roomId);
    const fileList = Array.from(files).map(filename => {
      const filePath = path.join(uploadsDir, filename);
      let size = 0;
      try {
        size = fs.statSync(filePath).size;
      } catch {
        // file may have been deleted
      }
      return {
        url: `/uploads/${filename}`,
        filename,
        size,
      };
    });

    res.json({ success: true, files: fileList });
  });

  // Cleanup files belonging to the authenticated user's room
  router.delete('/cleanup', auth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const roomId = req.user!.roomId;
      const files = getRoomFiles(roomId);
      let deleted = 0;

      for (const filename of Array.from(files)) {
        const filePath = path.join(uploadsDir, filename);
        try {
          fs.unlinkSync(filePath);
          deleted++;
        } catch {
          // File may already be gone
        }
      }

      roomFiles.delete(roomId);
      res.json({ success: true, deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
