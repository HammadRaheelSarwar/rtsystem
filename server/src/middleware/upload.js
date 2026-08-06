import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';

// Vercel functions run from a read-only deployment directory. Only the system
// temp directory is writable, so creating ./uploads while the app is imported
// makes the entire function fail before even the health or login routes run.
export const uploadRoot = process.env.VERCEL
  ? path.join(os.tmpdir(), 'rtsystem-uploads')
  : path.resolve(process.env.UPLOAD_PATH || 'uploads');

fs.mkdirSync(uploadRoot, { recursive: true });
const allowed=new Set(['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','application/dwg','application/dxf','application/octet-stream']);
export const upload=multer({storage:multer.diskStorage({destination:uploadRoot,filename:(req,file,cb)=>cb(null,`${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)}),limits:{fileSize:Number(process.env.MAX_FILE_SIZE)||10*1024*1024,files:10},fileFilter:(req,file,cb)=>cb(allowed.has(file.mimetype)?null:new Error('Unsupported file type'),allowed.has(file.mimetype))});
