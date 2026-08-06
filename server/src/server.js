import 'dotenv/config';
import {app} from './app.js';
import {connectDB} from './config/db.js';
const port=Number(process.env.PORT)||5000;
connectDB().then(()=>app.listen(port,()=>console.log(`RT Inquiry API listening on ${port}`))).catch(error=>{console.error('Database connection failed',error);process.exit(1);});
