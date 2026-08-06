import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import userRoutes,{masterRouter} from './routes/userRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import inquiryRoutes from './routes/inquiryRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import {notFound,errorHandler} from './middleware/error.js';

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(url => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const app=express();
app.set('trust proxy',1);
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, origin);
    }
    return callback(null, origin);
  },
  credentials: true
}));
app.use(compression());app.use(cookieParser());app.use(express.json({limit:'2mb'}));app.use(express.urlencoded({extended:true,limit:'2mb'}));if(process.env.NODE_ENV!=='test')app.use(morgan('combined'));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:100,standardHeaders:'draft-7',legacyHeaders:false}),authRoutes);
app.get('/api/health',(req,res)=>res.json({success:true,status:'healthy',timestamp:new Date().toISOString()}));
app.use('/api/users',userRoutes);app.use('/api/master',masterRouter);app.use('/api/clients',clientRoutes);app.use('/api/inquiries',inquiryRoutes);app.use('/api',workflowRoutes);app.use('/api',dashboardRoutes);app.use('/api',exportRoutes);
app.use(notFound);app.use(errorHandler);
