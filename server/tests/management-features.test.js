import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

let adminToken;
let salesToken;
let inquiryId;

async function login(email, password) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  expect(response.status).toBe(200);
  return response.body.data.accessToken;
}

describe('management requirements', () => {
  beforeAll(async () => {
    adminToken = await login('admin@rt.com', 'ChangeMe123!');
    salesToken = await login('sales@rt.com', 'Sales123!');
    const client = await request(app).post('/api/clients').set('Authorization', `Bearer ${salesToken}`).send({ clientCode: 'REQ-CLIENT', companyName: 'Requirements Client', status: 'ACTIVE' });
    const inquiry = await request(app).post('/api/inquiries').set('Authorization', `Bearer ${salesToken}`).send({ client: client.body.data._id, projectName: 'Requirements Coverage Project', projectLocation: 'Dhaka', inquiryType: 'PEB' });
    inquiryId = inquiry.body.data._id;
  }, 15000);

  it('manages system settings and approval rules', async () => {
    const setting = await request(app).post('/api/admin/system-settings').set('Authorization', `Bearer ${adminToken}`).send({ key: 'company.name', category: 'COMPANY', value: 'RT' });
    const rule = await request(app).post('/api/admin/approval-rules').set('Authorization', `Bearer ${adminToken}`).send({ name: 'GM high value approval', requiredRole: 'GM', minimumValue: 10000000 });
    const configuration = await request(app).get('/api/admin/configuration').set('Authorization', `Bearer ${adminToken}`);
    expect(setting.status).toBe(201);
    expect(rule.status).toBe(201);
    expect(configuration.body.data.settings.some(item => item.key === 'company.name')).toBe(true);
    expect(configuration.body.data.approvalRules.some(item => item.name === 'GM high value approval')).toBe(true);
  });

  it('assigns an inquiry and records an audit event', async () => {
    const assignment = await request(app).patch(`/api/inquiries/${inquiryId}/assignment`).set('Authorization', `Bearer ${salesToken}`).send({ assignedTo: 'assignee-id', comments: 'Assigned for requirement test' });
    const audit = await request(app).get('/api/admin/audit-logs').set('Authorization', `Bearer ${adminToken}`).query({ action: 'ASSIGNMENT' });
    expect(assignment.status).toBe(200);
    expect(assignment.body.data.assignedTo).toBe('assignee-id');
    expect(audit.body.data.some(item => item.entityId === inquiryId)).toBe(true);
  });

  it('supports document numbering, replacement and version history', async () => {
    const uploaded = await request(app).post(`/api/inquiries/${inquiryId}/documents`).set('Authorization', `Bearer ${salesToken}`).field('documentType', 'Client specification').attach('files', Buffer.from('version one'), { filename: 'specification.pdf', contentType: 'application/pdf' });
    const first = uploaded.body.data[0];
    const replaced = await request(app).post(`/api/documents/${first._id}/replace`).set('Authorization', `Bearer ${salesToken}`).attach('file', Buffer.from('version two'), { filename: 'specification-v2.pdf', contentType: 'application/pdf' });
    expect(uploaded.status).toBe(201);
    expect(first.documentNumber).toMatch(/-DOC-\d{3}$/);
    expect(replaced.status).toBe(201);
    expect(replaced.body.data.versionNumber).toBe(2);
    expect(replaced.body.data.previousVersion).toBe(first._id);
  });

  it('returns expanded management analytics', async () => {
    const response = await request(app).get('/api/reports/analytics').set('Authorization', `Bearer ${salesToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.byStatus).toEqual(expect.any(Object));
    expect(response.body.data.ageing).toEqual(expect.any(Object));
    expect(response.body.data.openQueryAgeing).toEqual(expect.any(Array));
  });
});
