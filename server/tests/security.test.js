import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { authorize } from '../src/middleware/auth.js';
import { Client, Inquiry } from '../src/models/index.js';

describe('authentication and permissions', () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-characters';
  });

  it('signs expiring access tokens and rejects a different secret', () => {
    const token = jwt.sign({ sub: '507f1f77bcf86cd799439011' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    expect(jwt.verify(token, process.env.JWT_ACCESS_SECRET).sub).toBe('507f1f77bcf86cd799439011');
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });

  it('enforces role permissions', () => {
    let error;
    authorize('ADMIN')({ user: { role: { name: 'SALES' } } }, {}, e => { error = e; });
    expect(error.status).toBe(403);

    let allowed = false;
    authorize('SALES')({ user: { role: { name: 'SALES' } } }, {}, () => { allowed = true; });
    expect(allowed).toBe(true);
  });
});

describe('backend model validation', () => {
  it('creates client instance via model repository', async () => {
    const client = await Client.create({ clientCode: 'CLI-TEST', companyName: 'Test Inc' });
    expect(client.clientCode).toBe('CLI-TEST');
    expect(client.companyName).toBe('Test Inc');
  });

  it('creates inquiry record with currentStatus', async () => {
    const inquiry = await Inquiry.create({ inquiryNumber: 'IQN-26-08-999', projectName: 'Test Project', currentStatus: 'DRAFT' });
    expect(inquiry.currentStatus).toBe('DRAFT');
  });
});
