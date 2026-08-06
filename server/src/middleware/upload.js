import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
const root=path.resolve(process.env.UPLOAD_PATH||'uploads'); fs.mkdirSync(root,{recursive:true});
const allowed=new Set(['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','application/dwg','application/dxf','application/octet-stream']);
export const upload=multer({storage:multer.diskStorage({destination:root,filename:(req,file,cb)=>cb(null,`${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)}),limits:{fileSize:Number(process.env.MAX_FILE_SIZE)||10*1024*1024,files:10},fileFilter:(req,file,cb)=>cb(allowed.has(file.mimetype)?null:new Error('Unsupported file type'),allowed.has(file.mimetype))});
