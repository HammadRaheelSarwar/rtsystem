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

  it('ships the normalized-table runtime migration', () => {
    const sql = fs.readFileSync(new URL('../../docs/supabase_normalized_runtime.sql', import.meta.url), 'utf8');
    expect(sql).toContain('ALTER TABLE public.profiles');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.system_settings');
    expect(sql).toContain('Allow service role full access');
  });

  it('maps application client fields to relational columns', async () => {
    const { toDatabaseRow } = await import('../src/models/base.js');
    const row = toDatabaseRow('Client', 'clients', {
      _id: '327f5b20-0d4a-45e3-873f-0e30b3b4598c',
      clientCode: '45544',
      companyName: 'izhar',
      createdBy: '2fe2ae3f-0b7f-4556-a16f-918a935760ad'
    });
    expect(row.client_code).toBe('45544');
    expect(row.company_name).toBe('izhar');
    expect(row.created_by).toBe('2fe2ae3f-0b7f-4556-a16f-918a935760ad');
    expect(row.metadata).toEqual({});
  });

  it('serializes populated relationship objects as UUIDs', async () => {
    const { toDatabaseRow } = await import('../src/models/base.js');
    const row = toDatabaseRow('DesignTask', 'design_tasks', {
      inquiry: '949f5e01-7291-4504-9782-a7b0d2f3ea1a',
      assignedBy: { _id: 'c6d5f92a-a9e8-4000-8000-b937e668630e', name: 'Estimator' },
      designStatus: 'IN_PROGRESS'
    });
    expect(row.assigned_by).toBe('c6d5f92a-a9e8-4000-8000-b937e668630e');
    expect(row.status).toBe('IN_PROGRESS');
  });
});
