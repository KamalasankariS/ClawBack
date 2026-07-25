import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.xlsx', '.xls', '.csv', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  },
});

const router = Router();

// POST /api/uploads — upload files, return metadata
router.post('/', upload.array('files', 5), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const result = files.map(f => ({
    filename: f.filename,
    originalName: f.originalname,
    size: f.size,
  }));
  res.json(result);
});

// GET /api/uploads/:filename — serve a file
router.get('/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename!);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(filePath);
});

export default router;
