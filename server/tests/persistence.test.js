import { describe, expect, it } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';

describe('Supabase persistence contract', () => {
  it('fails closed instead of using memory in production', () => {
    const script = `
      process.env.NODE_ENV = 'production';
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      const { User } = await import('./src/models/index.js');
      try { await User.findOne({ email: 'test@example.com' }); }
      catch (error) { console.log(error.code); process.exit(0); }
      process.exit(1);
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { cwd: process.cwd(), encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('DATABASE_UNAVAILABLE');
  });

  it('ships the required record-store migration', () => {
    const sql = fs.readFileSync(new URL('../../docs/supabase_app_records.sql', import.meta.url), 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.app_records');
    expect(sql).toContain('data JSONB NOT NULL');
    expect(sql).toContain('TO service_role');
  });
});
