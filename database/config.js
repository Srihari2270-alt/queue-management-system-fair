// The ONLY MongoDB connection configuration. Secrets belong in backend/.env, not Git.
import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
dotenv.config({path:fileURLToPath(new URL('../backend/.env',import.meta.url)), quiet:true});
export const config = Object.freeze({
 mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/qflow',
 port: Number(process.env.PORT || 3000),
 production: process.env.NODE_ENV === 'production',
 origin: process.env.APP_ORIGIN || 'http://localhost:4200',
 sessionMs: 8*60*60*1000
});
