import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { User, Department, Role } from '../models/index.js';
import { asyncHandler, AppError } from '../utils/http.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'), path: '/' };
const hash = v => crypto.createHash('sha256').update(v).digest('hex');
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-32-chars-long';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-32-chars-long';
let seedPromise;

function tokens(user) {
  return {
    accessToken: jwt.sign({ sub: user._id }, jwtAccessSecret, { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }),
    refreshToken: jwt.sign({ sub: user._id, jti: crypto.randomUUID() }, jwtRefreshSecret, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' })
  };
}

async function seedAccounts() {
  try {
    const departments = [['Administration', 'ADMIN'], ['Sales', 'SALES'], ['Estimation', 'EST'], ['Design', 'DESIGN'], ['General Management', 'GM']];
    const roles = {
      ADMIN: ['users.manage', 'settings.manage', 'inquiries.all', 'reports.view'],
      SALES: ['clients.manage', 'inquiries.create', 'itf.manage', 'sales.submit', 'followups.manage'],
      ESTIMATION: ['inquiries.review', 'jif.manage', 'costing.manage', 'proposals.manage'],
      DESIGN: ['design.manage', 'dws.manage', 'queries.manage'],
      GM: ['gm.review', 'gm.approve', 'inquiries.all', 'reports.view']
    };

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
        await User.create({
          name,
          email,
          password,
          role: roleMap[role]._id,
          department: deptMap[dept]._id,
          isActive: true,
          isDeleted: false
        });
      }
    }
  } catch (err) {
    console.warn('Auto-seed notice:', err.message);
  }
}

function ensureSeeded() {
  // A serverless instance may receive simultaneous login requests. Reusing one
  // seed operation prevents duplicate in-memory roles and dangling role IDs.
  seedPromise ??= seedAccounts();
  return seedPromise;
}

router.post('/login', validate(z.object({ email: z.string().email(), password: z.string().min(8) })), asyncHandler(async (req, res) => {
  await ensureSeeded();
  const user = await User.findOne({ email: req.body.email.toLowerCase(), isDeleted: false }).select('+password').populate('role department');
  if (!user || !user.isActive || !(await user.comparePassword(req.body.password))) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  const pair = tokens(user);
  user.refreshTokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];
  user.refreshTokens.push({ tokenHash: hash(pair.refreshToken), expiresAt: new Date(Date.now() + 7 * 864e5) });
  user.lastLogin = new Date();
  await user.save();
  res.cookie('refreshToken', pair.refreshToken, { ...cookieBase, maxAge: 7 * 864e5 }).json({ success: true, data: { accessToken: pair.accessToken, user: user.toSafeObject() } });
}));

router.post('/refresh-token', asyncHandler(async (req, res) => {
  const raw = req.cookies.refreshToken || req.body.refreshToken;
  if (!raw) throw new AppError('Refresh token required', 401);
  let decoded;
  try {
    decoded = jwt.verify(raw, jwtRefreshSecret);
  } catch {
    throw new AppError('Refresh token invalid', 401);
  }
  const user = await User.findById(decoded.sub).populate('role department');
  if (!user || !user.isActive || !user.refreshTokens?.some(t => t.tokenHash === hash(raw))) throw new AppError('Refresh token revoked', 401);
  user.refreshTokens = (user.refreshTokens || []).filter(t => t.tokenHash !== hash(raw) && new Date(t.expiresAt) > new Date());
  const pair = tokens(user);
  user.refreshTokens.push({ tokenHash: hash(pair.refreshToken), expiresAt: new Date(Date.now() + 7 * 864e5) });
  await user.save();
  res.cookie('refreshToken', pair.refreshToken, { ...cookieBase, maxAge: 7 * 864e5 }).json({ success: true, data: { accessToken: pair.accessToken } });
}));

router.post('/forgot-password', validate(z.object({ email: z.string().email() })), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (user) {
    const raw = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hash(raw);
    user.passwordResetExpires = new Date(Date.now() + 3600000);
    await user.save();
    if (process.env.SMTP_HOST) {
      const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587, secure: Number(process.env.SMTP_PORT) === 465, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined });
      await transport.sendMail({ from: process.env.SMTP_FROM, to: user.email, subject: 'Reset your RT Inquiry password', text: `Use this secure link within one hour: ${process.env.CLIENT_URL}/reset-password?token=${raw}` });
    }
  }
  res.json({ success: true, message: 'If the account exists, reset instructions have been sent.' });
}));

router.post('/reset-password', validate(z.object({ token: z.string().min(20), password: z.string().min(8) })), asyncHandler(async (req, res) => {
  const user = await User.findOne({ passwordResetToken: hash(req.body.token), passwordResetExpires: { $gt: new Date() } }).select('+passwordResetToken +passwordResetExpires');
  if (!user) throw new AppError('Reset link is invalid or expired', 400);
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = [];
  await user.save();
  res.json({ success: true, message: 'Password reset successfully' });
}));

router.post('/logout', protect, asyncHandler(async (req, res) => {
  const raw = req.cookies.refreshToken;
  if (raw && req.user) {
    req.user.refreshTokens = (req.user.refreshTokens || []).filter(t => t.tokenHash !== hash(raw));
    await req.user.save();
  }
  res.clearCookie('refreshToken', cookieBase).json({ success: true });
}));

router.get('/profile', protect, (req, res) => res.json({ success: true, data: req.user.toSafeObject() }));

export default router;
