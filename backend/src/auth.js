import {randomBytes,scrypt as rawScrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {User,Session} from '../../database/db.js';
import {config} from '../../database/config.js';
const scrypt=promisify(rawScrypt);
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64);return salt+':'+key.toString('hex');}
export async function verifyPassword(password,hash){if(!hash)return false;const [salt,hex]=hash.split(':');const key=await scrypt(password,salt,64);const saved=Buffer.from(hex,'hex');return saved.length===key.length&&timingSafeEqual(saved,key);}
export const digest=token=>createHash('sha256').update(token).digest('hex');
export const safeUser=u=>({id:String(u._id),username:u.username,name:u.name,phone:u.phone,role:u.role});
export async function loginSession(res,user){const token=randomBytes(32).toString('hex');await Session.create({digest:digest(token),user:user._id,expiresAt:new Date(Date.now()+config.sessionMs)});if(config.sessionTransport==='bearer')return {...safeUser(user),sessionToken:token};res.cookie('qflow_session',token,{httpOnly:true,sameSite:'lax',secure:config.production,maxAge:config.sessionMs,path:'/'});return safeUser(user);}
export function cookieToken(req){if(config.sessionTransport==='bearer')return /^Bearer [a-f0-9]{64}$/.test(req.get('authorization')||'')?req.get('authorization').slice(7):undefined;const cookie=req.headers.cookie||'';return cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('qflow_session='))?.slice(14);}
export async function authenticate(req,res,next){try{const token=cookieToken(req);if(!token)return res.status(401).json({message:'Please sign in.'});const session=await Session.findOne({digest:digest(token),expiresAt:{$gt:new Date()}}).populate('user');if(!session?.user)return res.status(401).json({message:'Your session has expired. Please sign in.'});req.user=session.user;next();}catch(e){next(e);}}
export const staffOnly=(req,res,next)=>['staff','admin'].includes(req.user.role)?next():res.status(403).json({message:'Staff access required.'});
export const adminOnly=(req,res,next)=>req.user.role==='admin'?next():res.status(403).json({message:'Admin access required.'});
