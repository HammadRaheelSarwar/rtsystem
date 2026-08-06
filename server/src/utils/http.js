export class AppError extends Error { constructor(message,status=400,code='BAD_REQUEST',details){ super(message); this.status=status; this.code=code; this.details=details; } }
export const asyncHandler = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
export function parsePagination(query){ const page=Math.max(Number(query.page)||1,1); const limit=Math.min(Math.max(Number(query.limit)||20,1),100); return {page,limit,skip:(page-1)*limit}; }
export function pick(obj, keys){ return keys.reduce((out,key)=>{ if(obj[key]!==undefined) out[key]=obj[key]; return out; },{}); }
