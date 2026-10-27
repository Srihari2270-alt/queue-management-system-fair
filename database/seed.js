import mongoose from 'mongoose';
import {config} from './config.js';
if(config.production){console.error('Refusing public demo passwords in production. Register a private account and use database/set-role.js instead.');process.exit(1);}
import {User,connectDb} from './db.js';
import {hashPassword} from '../backend/src/auth.js';
import {ensureQueue} from '../backend/src/queue.js';
try{await connectDb();await ensureQueue();for(const [username,role,password,name] of [['customer','customer','customer123','Demo Customer'],['staff','staff','staff1234','Demo Staff'],['admin','admin','admin1234','Demo Admin']]){if(!await User.exists({username})){await User.create({username,role,passwordHash:await hashPassword(password),name,phone:'9876500000'});console.log('Created demo '+role);}else console.log('Preserved existing '+username);}console.log('Demo accounts are for local development only. Never seed these on a public site.');}finally{await mongoose.disconnect();}
