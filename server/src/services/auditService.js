import { ActivityLog } from '../models/index.js';
export async function audit(req,{action,entityType,entityId,oldValue,newValue,description}){
  return ActivityLog.create({user:req.user?._id,department:req.user?.department?._id||req.user?.department,action,entityType,entityId,oldValue,newValue,description,ipAddress:req.ip,userAgent:req.get('user-agent')});
}
