import mongoose from 'mongoose';
export function notFound(req,res){ res.status(404).json({success:false,error:{code:'NOT_FOUND',message:`Route ${req.method} ${req.originalUrl} not found`}}); }
export function errorHandler(err,req,res,next){
  let status=err.status||500,code=err.code||'INTERNAL_ERROR',message=err.message||'Unexpected server error';
  if(err instanceof mongoose.Error.ValidationError){status=422;code='VALIDATION_ERROR';}
  if(err?.code===11000){status=409;code='DUPLICATE';message=`Duplicate value for ${Object.keys(err.keyPattern||{}).join(', ')}`;}
  if(process.env.NODE_ENV!=='production') console.error(err);
  res.status(status).json({success:false,error:{code,message,details:err.details||(process.env.NODE_ENV==='development'?err.stack:undefined)}});
}
