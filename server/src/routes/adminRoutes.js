import { Router } from 'express';
import { ActivityLog, ApprovalRule, SystemSetting } from '../models/index.js';
import { protect, authorize } from '../middleware/auth.js';
import { asyncHandler, AppError, parsePagination } from '../utils/http.js';

const router = Router();
router.use(protect, authorize('ADMIN'));

router.get('/audit-logs', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  for (const key of ['action', 'entityType', 'user']) if (req.query[key]) filter[key] = req.query[key];
  if (req.query.from || req.query.to) filter.createdAt = {
    ...(req.query.from && { $gte: new Date(req.query.from) }),
    ...(req.query.to && { $lte: new Date(`${req.query.to}T23:59:59.999Z`) })
  };
  const [items, total] = await Promise.all([
    ActivityLog.find(filter).populate('user department').sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(filter)
  ]);
  res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

router.get('/configuration', asyncHandler(async (req, res) => {
  const [settings, approvalRules] = await Promise.all([SystemSetting.find(), ApprovalRule.find()]);
  res.json({ success: true, data: { settings, approvalRules } });
}));

router.post('/system-settings', asyncHandler(async (req, res) => {
  if (!req.body.key) throw new AppError('Setting key is required', 422);
  const item = await SystemSetting.findOneAndUpdate(
    { key: req.body.key },
    { $set: { ...req.body, updatedBy: req.user._id, updatedAt: new Date() } },
    { upsert: true, new: true }
  );
  res.status(201).json({ success: true, data: item });
}));

router.put('/system-settings/:id', asyncHandler(async (req, res) => {
  const item = await SystemSetting.findByIdAndUpdate(req.params.id, { ...req.body, updatedBy: req.user._id }, { new: true });
  if (!item) throw new AppError('Setting not found', 404);
  res.json({ success: true, data: item });
}));

router.post('/approval-rules', asyncHandler(async (req, res) => {
  if (!req.body.name) throw new AppError('Rule name is required', 422);
  const item = await ApprovalRule.create({ ...req.body, isActive: req.body.isActive !== false, createdBy: req.user._id });
  res.status(201).json({ success: true, data: item });
}));

router.put('/approval-rules/:id', asyncHandler(async (req, res) => {
  const item = await ApprovalRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!item) throw new AppError('Approval rule not found', 404);
  res.json({ success: true, data: item });
}));

export default router;
