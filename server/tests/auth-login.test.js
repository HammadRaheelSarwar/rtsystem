import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('seeded lifecycle accounts', () => {
  const accounts = [
    ['Sales', 'sales@rt.com', 'Sales123!', 'SALES'],
    ['Estimation', 'estimation@rt.com', 'Estimate123!', 'ESTIMATION'],
    ['Design', 'design@rt.com', 'Design123!', 'DESIGN'],
    ['General Manager', 'gm@rt.com', 'Manager123!', 'GM']
  ];

  it.each(accounts)('allows the documented %s account to sign in', async (_label, email, password, role) => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.user.role.name).toBe(role);
    expect(response.body.data.user.roleName).toBe(role);
    expect(response.body.data.accessToken).toBeTypeOf('string');
  });

  it('retains the Sales role on an authenticated follow-up request', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales@rt.com', password: 'Sales123!' });

    const response = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ clientCode: 'AUTH-TEST', companyName: 'Authorization Test Client', status: 'ACTIVE' });

    expect(response.status).toBe(201);
  });

  it('returns a role and dashboard data for the Sales account', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sales@rt.com', password: 'Sales123!' });

    const response = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe('SALES');
    expect(response.body.data.statusCounts).toEqual(expect.any(Object));
  });
});
