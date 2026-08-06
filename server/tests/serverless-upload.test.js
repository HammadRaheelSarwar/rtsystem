import { describe, expect, it, vi } from 'vitest';
import os from 'os';
import path from 'path';

describe('serverless upload storage', () => {
  it('uses the writable system temp directory on Vercel', async () => {
    const previousVercel = process.env.VERCEL;
    process.env.VERCEL = '1';

    try {
      vi.resetModules();
      const { uploadRoot } = await import('../src/middleware/upload.js');
      expect(uploadRoot).toBe(path.join(os.tmpdir(), 'rtsystem-uploads'));
    } finally {
      if (previousVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previousVercel;
    }
  });
});
