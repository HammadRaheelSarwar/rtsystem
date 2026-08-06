import jwt from 'jsonwebtoken';
import { User, ActivityLog } from '../models/index.js';
import { AppError, asyncHandler } from '../utils/http.js';

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-32-chars-long';

export const protect = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : req.cookies?.accessToken;
  if (!token) throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  let decoded;
  try {
    decoded = jwt.verify(token, jwtAccessSecret);
  } catch {
    throw new AppError('Session expired or invalid', 401, 'TOKEN_INVALID');
  }
  const user = await User.findById(decoded.sub).populate('role department');
  if (!user || !user.isActive || user.isDeleted) throw new AppError('Account is inactive', 401, 'ACCOUNT_INACTIVE');
  req.user = user;

  if (!req._auditAttached && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    req._auditAttached = true;
    res.on('finish', () => {
      if (res.statusCode < 400) {
        ActivityLog.create({
          user: user._id,
          department: user.department?._id || user.department,
          action: req.method === 'POST' ? 'CREATE_OR_SUBMIT' : req.method === 'DELETE' ? 'DELETE' : 'UPDATE',
          entityType: req.path.split('/').filter(Boolean)[0] || 'API',
          entityId: req.params?.id || undefined,
          description: `${req.method} ${req.originalUrl}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }).catch(() => {});
      }
    });
  }
  next();
});

export const authorize = (...roles) => (req, res, next) => {
  const userRoleName = typeof req.user.role === 'object' ? req.user.role.name : req.user.role;
  if (!roles.includes(userRoleName)) return next(new AppError('You do not have permission for this action', 403, 'FORBIDDEN'));
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    return await protect(req, res, next);
  } catch {
    return next();
  }
};
