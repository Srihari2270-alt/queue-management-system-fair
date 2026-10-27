import mongoose from 'mongoose';
import {app} from './app.js';
import {config} from '../../database/config.js';
import {connectDb} from '../../database/db.js';
import {ensureQueue} from './queue.js';
try{await connectDb();await ensureQueue();const server=app.listen(config.port,()=>console.log(`QFlow API listening at http://localhost:${config.port}`));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await mongoose.disconnect();process.exit(0);}));}catch(error){console.error('Startup failed. Check MONGO_URI in backend/.env and that MongoDB is reachable.');console.error(error.message);process.exit(1);}
