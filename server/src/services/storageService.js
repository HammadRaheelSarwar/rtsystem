import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { supabase } from '../config/db.js';

const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET || 'documents';
let bucketPromise;

function storageError(error) {
  const err = new Error(`Supabase Storage failed: ${error?.message || 'Unknown storage error'}`);
  err.status = 503;
  err.code = 'STORAGE_UNAVAILABLE';
  return err;
}

async function ensureBucket() {
  if (!supabase) return false;
  bucketPromise ??= (async () => {
    const { data, error } = await supabase.storage.getBucket(bucket);
    if (data) return true;
    if (error) {
      const created = await supabase.storage.createBucket(bucket, { public: false, fileSizeLimit: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 });
      if (created.error && !String(created.error.message).toLowerCase().includes('already exists')) throw storageError(created.error);
    }
    return true;
  })();
  return bucketPromise;
}

export async function persistUploadedFile(file, inquiryId) {
  if (!supabase) {
    if (process.env.NODE_ENV === 'production') throw storageError(new Error('SUPABASE_SERVICE_ROLE_KEY is required'));
    return { filePath: file.path, storageBucket: null, storagePath: null };
  }
  await ensureBucket();
  const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${inquiryId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const bytes = await fs.readFile(file.path);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, bytes, { contentType: file.mimetype, upsert: false });
  if (error) throw storageError(error);
  await fs.unlink(file.path).catch(() => {});
  return { filePath: storagePath, storageBucket: bucket, storagePath };
}

export async function readStoredFile(document) {
  if (document.storageBucket && document.storagePath) {
    if (!supabase) throw storageError(new Error('Supabase is not configured'));
    const { data, error } = await supabase.storage.from(document.storageBucket).download(document.storagePath);
    if (error) throw storageError(error);
    return Buffer.from(await data.arrayBuffer());
  }
  return fs.readFile(document.filePath);
}
