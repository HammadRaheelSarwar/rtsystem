import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { Department, Role, User, Client, Inquiry, MaterialRate, TaxSetting, SystemSetting } from '../models/index.js';

const departments = [['Administration', 'ADMIN'], ['Sales', 'SALES'], ['Estimation', 'EST'], ['Design', 'DESIGN'], ['General Management', 'GM']];
const roles = {
  ADMIN: ['users.manage', 'settings.manage', 'inquiries.all', 'reports.view'],
  SALES: ['clients.manage', 'inquiries.create', 'itf.manage', 'sales.submit', 'followups.manage'],
  ESTIMATION: ['inquiries.review', 'jif.manage', 'costing.manage', 'proposals.manage'],
  DESIGN: ['design.manage', 'dws.manage', 'queries.manage'],
  GM: ['gm.review', 'gm.approve', 'inquiries.all', 'reports.view']
};

async function run() {
  await connectDB();
  const deptMap = {};
  for (const [name, code] of departments) {
    deptMap[code] = await Department.findOneAndUpdate({ code }, { $set: { name, code, isActive: true } }, { upsert: true, new: true });
  }
  const roleMap = {};
  for (const [name, permissions] of Object.entries(roles)) {
    roleMap[name] = await Role.findOneAndUpdate({ name }, { $set: { name, permissions, isActive: true } }, { upsert: true, new: true });
  }
  const users = [
    [process.env.ADMIN_NAME || 'System Administrator', process.env.ADMIN_EMAIL || 'admin@rt.com', process.env.ADMIN_PASSWORD || 'ChangeMe123!', 'ADMIN', 'ADMIN'],
    ['Sales Executive', 'sales@rt.com', 'Sales123!', 'SALES', 'SALES'],
    ['Estimator', 'estimation@rt.com', 'Estimate123!', 'ESTIMATION', 'EST'],
    ['Design Engineer', 'design@rt.com', 'Design123!', 'DESIGN', 'DESIGN'],
    ['General Manager', 'gm@rt.com', 'Manager123!', 'GM', 'GM']
  ];
  for (const [name, email, password, role, dept] of users) {
    if (!await User.exists({ email })) {
      await User.create({ name, email, password, role: roleMap[role]._id, roleName: role, department: deptMap[dept]._id, isActive: true, isDeleted: false });
    }
  }
  const sales = await User.findOne({ email: 'sales@rt.com' });
  let client = await Client.findOne({ clientCode: 'CLI-001' });
  if (!client && sales) {
    client = await Client.create({ clientCode: 'CLI-001', companyName: 'Summit Industrial Holdings', contactPerson: 'A. Rahman', email: 'projects@summit.example', phone: '+880 1700 000000', city: 'Dhaka', country: 'Bangladesh', industry: 'Manufacturing', status: 'ACTIVE', createdBy: sales._id });
  }
  if (client && sales && !await Inquiry.exists({ projectName: 'Gazipur Manufacturing Extension' })) {
    await Inquiry.create({ inquiryNumber: `IQN-${String(new Date().getFullYear()).slice(-2)}-${String(new Date().getMonth() + 1).padStart(2, '0')}-001`, client: client._id, projectName: 'Gazipur Manufacturing Extension', projectDescription: 'New pre-engineered production facility and warehouse extension.', projectLocation: 'Gazipur', inquiryType: 'PEB', urgency: 'HIGH', priority: 'HIGH', currentStatus: 'DRAFT', currentDepartment: deptMap.SALES._id, createdBy: sales._id });
  }
  for (const r of [['Primary steel', 'Steel', 'kg', 105], ['Secondary steel', 'Steel', 'kg', 118], ['Roof cladding', 'Cladding', 'sqm', 920], ['Wall cladding', 'Cladding', 'sqm', 875]]) {
    await MaterialRate.findOneAndUpdate({ name: r[0] }, { $set: { name: r[0], category: r[1], unit: r[2], rate: r[3], currency: 'BDT', isActive: true, effectiveFrom: new Date() } }, { upsert: true });
  }
  await TaxSetting.findOneAndUpdate({ name: 'VAT' }, { $set: { name: 'VAT', percentage: 7.5, isDefault: true, isActive: true } }, { upsert: true });
  await SystemSetting.findOneAndUpdate({ key: 'inquiryStatuses' }, { $set: { value: ['DRAFT', 'SENT_TO_ESTIMATION', 'JIF_IN_PROGRESS', 'SENT_TO_DESIGN', 'DESIGN_IN_PROGRESS', 'COSTING_IN_PROGRESS', 'SUBMITTED_TO_GM', 'GM_APPROVED', 'SUBMITTED_TO_CLIENT', 'WON', 'LOST'], description: 'Default visible inquiry statuses' } }, { upsert: true });
  console.log('Seed complete');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
