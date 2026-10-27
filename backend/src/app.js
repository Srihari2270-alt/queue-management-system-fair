import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {z} from 'zod';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {User,Session,Queue} from '../../database/db.js';
import {config} from '../../database/config.js';
import {hashPassword,verifyPassword,loginSession,authenticate,staffOnly,adminOnly,cookieToken,digest,safeUser} from './auth.js';
import {branches,services,initialState} from './data.js';
import {mutate,branch,waiting,estimate,issue,callToken,fail,activity} from './queue.js';
export const app=express();
if(config.trustProxy)app.set('trust proxy',1);
app.disable('x-powered-by');app.use(helmet());app.use(express.json({limit:'32kb'}));
app.use('/api',rateLimit({windowMs:60000,limit:240,standardHeaders:'draft-8',legacyHeaders:false}));
// Split hosting uses explicit bearer sessions and an exact allowed frontend origin.
// Default local/same-origin mode retains HttpOnly cookies and cross-site protection.
app.use('/api',(req,res,next)=>{
 const origin=req.get('origin');
 if(config.sessionTransport==='bearer'&&origin===config.origin){
  res.set('Access-Control-Allow-Origin',config.origin);res.vary('Origin');
  res.set('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods','GET, POST, PATCH, OPTIONS');
  if(req.method==='OPTIONS')return res.sendStatus(204);
 }
 if(!['GET','HEAD','OPTIONS'].includes(req.method)){
  const allowedSplit=config.sessionTransport==='bearer'&&origin===config.origin;
  if(!allowedSplit&&(req.get('sec-fetch-site')==='cross-site'||(origin&&origin!==config.origin&&origin!==req.protocol+'://'+req.get('host'))))return res.status(403).json({message:'Origin not allowed.'});
 }
 next();
});
const sessionResponse=async(res,user)=>{const result=await loginSession(res,user);const {sessionToken,...safe}=result;return sessionToken?{user:safe,sessionToken}:{user:safe};};
const authLimit=rateLimit({windowMs:15*60000,limit:30,standardHeaders:'draft-8',legacyHeaders:false});
const username=z.string().trim().toLowerCase().regex(/^[a-z0-9_]{4,20}$/,'Use 4-20 letters, numbers or underscores.');
const password=z.string().min(8,'Use at least 8 characters.').max(128);
const name=z.string().trim().min(1).max(60);
const phone=z.string().trim().regex(/^[0-9 +\-]{7,15}$/,'Enter a valid phone number.');
const parse=(schema,req)=>schema.parse(req.body);
app.get('/api/health',async(req,res)=>res.json({ok:true,database:Queue.db.readyState===1?'connected':'disconnected'}));
app.post('/api/auth/register',authLimit,async(req,res)=>{const data=parse(z.object({username,password,name,phone}),req);const user=await User.create({...data,password:undefined,passwordHash:await hashPassword(data.password),role:'customer'});res.status(201).json(await sessionResponse(res,user));});
app.post('/api/auth/login',authLimit,async(req,res)=>{const data=parse(z.object({username,password:z.string().min(1).max(128)}),req);const user=await User.findOne({username:data.username}).select('+passwordHash');if(!user||!await verifyPassword(data.password,user.passwordHash))fail('Invalid username or password.',401);res.json(await sessionResponse(res,user));});
app.post('/api/auth/logout',async(req,res)=>{const t=cookieToken(req);if(t)await Session.deleteOne({digest:digest(t)});res.clearCookie('qflow_session',{path:'/'}).json({ok:true});});
app.get('/api/auth/me',authenticate,(req,res)=>res.json({user:safeUser(req.user)}));
app.use('/api',authenticate);
app.get('/api/branches',(req,res)=>res.json({branches,services}));
app.get('/api/queue',async(req,res)=>{const b=String(req.query.branch||'SBT');branch(b);const {data:s,revision}=await Queue.findById('main').lean();const isStaff=req.user.role!=='customer';const tokens=s.t.filter(x=>x.b===b).map(t=>({...t,eta:estimate(s,t)}));const publicTokens=tokens.map(({name,ph,u,...t})=>isStaff?{...t,name,ph,u}:t);const myTokens=s.t.filter(t=>t.u===req.user.username).map(t=>({...t,eta:estimate(s,t),position:waiting(s,t.b).findIndex(x=>x.id===t.id)+1}));res.json({revision,tokens:publicTokens,myTokens,counters:s.c.filter(c=>c.b===b),callbacks:isStaff?s.calls.filter(x=>x.b===b):[],activity:isStaff?s.act.filter(x=>x.b===b):[],summaries:branches.map(x=>({id:x.id,waiting:waiting(s,x.id).length,eta:Math.round(waiting(s,x.id).length*x.avg/Math.max(1,s.c.filter(c=>c.b===x.id&&c.open).length)),open:s.c.filter(c=>c.b===x.id&&c.open).length}))});});
app.post('/api/tokens',async(req,res)=>{const data=parse(z.object({branch:z.string(),service:z.string(),name:name.optional(),phone:phone.or(z.literal('')).optional(),priority:z.boolean().optional(),type:z.enum(['Online','Walk-in']).optional()}),req);const b=branch(data.branch);if(!services[b.t].includes(data.service))fail('Choose a valid service.');const isCustomer=req.user.role==='customer';const token=await mutate(s=>{if(isCustomer&&s.t.some(t=>t.u===req.user.username&&t.b===b.id&&['Waiting','Serving'].includes(t.st)))fail('You already have an active token at this branch.',409);return issue(s,{b:b.id,name:isCustomer?req.user.name:data.name||fail('Customer name required.'),ph:isCustomer?req.user.phone:data.phone||'',svc:data.service,type:isCustomer?'Online':data.type||'Walk-in',prio:!isCustomer&&data.priority?1:0,...(isCustomer?{u:req.user.username}:{})});});res.status(201).json({token});});
app.patch('/api/tokens/:id/cancel',async(req,res)=>{const token=await mutate(s=>{const t=s.t.find(x=>x.id===req.params.id);if(!t)fail('Token not found.',404);if(t.u!==req.user.username)fail('You can only cancel your own tokens.',403);if(t.st!=='Waiting')fail('Only waiting tokens can be cancelled.',409);t.st='Cancelled';activity(s,t.b,t.id+' cancelled');return t;});res.json({token});});
app.post('/api/queue/call-next',staffOnly,async(req,res)=>{const d=parse(z.object({branch:z.string(),counterId:z.string().optional(),tokenId:z.string().optional()}),req);res.json({token:await mutate(s=>callToken(s,d.branch,d.counterId,d.tokenId))});});
app.patch('/api/tokens/:id/status',staffOnly,async(req,res)=>{const {status}=parse(z.object({status:z.enum(['Completed','Skipped'])}),req);res.json({token:await mutate(s=>{const t=s.t.find(x=>x.id===req.params.id);if(!t)fail('Token not found.',404);if(!['Waiting','Serving'].includes(t.st)||status==='Completed'&&t.st!=='Serving')fail('Invalid token transition.',409);const c=s.c.find(c=>c.serving===t.id);if(c)c.serving=null;t.st=status;t.c=null;activity(s,t.b,t.id+' '+status.toLowerCase());return t;})});});
app.patch('/api/counters/:id',adminOnly,async(req,res)=>{const {open}=parse(z.object({open:z.boolean()}),req);res.json({counter:await mutate(s=>{const c=s.c.find(x=>x.id===req.params.id);if(!c)fail('Counter not found.',404);if(c.serving&&!open)fail('Complete the current token before closing.',409);c.open=open;activity(s,c.b,'Counter '+c.no+(open?' opened':' closed'));return c;})});});
app.post('/api/callbacks',async(req,res)=>{const d=parse(z.object({branch:z.string(),name,phone,message:z.string().trim().max(160).default('')}),req);branch(d.branch);const callback=await mutate(s=>{if(s.calls.length>=1000)fail('Demo callback capacity reached.',409);const item={id:crypto.randomUUID(),b:d.branch,name:d.name,ph:d.phone,why:d.message,ts:Date.now(),done:false};s.calls.unshift(item);activity(s,d.branch,'Callback requested');return item;});res.status(201).json({callback});});
app.patch('/api/callbacks/:id',staffOnly,async(req,res)=>res.json({callback:await mutate(s=>{const c=s.calls.find(x=>x.id===req.params.id);if(!c)fail('Callback not found.',404);c.done=true;return c;})}));
const indiaDay=ts=>new Date(ts).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
app.get('/api/reports',staffOnly,async(req,res)=>{const b=String(req.query.branch||'SBT');branch(b);const {data:s}=await Queue.findById('main').lean();const tokens=s.t.filter(t=>t.b===b&&indiaDay(t.ts)===indiaDay(Date.now()));res.json({date:indiaDay(Date.now()),tokens,issued:tokens.length,completed:tokens.filter(t=>t.st==='Completed').length,skipped:tokens.filter(t=>t.st==='Skipped').length});});
app.get('/api/reports/export',adminOnly,async(req,res)=>{const b=String(req.query.branch||'SBT');branch(b);const {data:s}=await Queue.findById('main').lean();const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';const rows=[['Token','Customer','Service','Type','Issued (ISO)','Status'],...s.t.filter(t=>t.b===b&&indiaDay(t.ts)===indiaDay(Date.now())).map(t=>[t.id,t.name,t.svc,t.type,new Date(t.ts).toISOString(),t.st])];res.type('text/csv').attachment('qflow-'+b+'-'+indiaDay(Date.now())+'.csv').send(rows.map(r=>r.map(cell).join(',')).join('\r\n'));});
app.post('/api/admin/reset',adminOnly,async(req,res)=>{if(req.body.confirm!=='RESET DEMO')fail('Confirmation required.');await mutate(s=>{Object.assign(s,initialState());return true;});res.json({ok:true,message:'Demo queue reset. Accounts were preserved.'});});
app.use('/api',(req,res)=>res.status(404).json({message:'API route not found.'}));
const web=fileURLToPath(new URL('../../frontend/dist/qflow/browser/',import.meta.url));
if(existsSync(web)){app.use(express.static(web));app.get('/{*path}',(req,res)=>res.sendFile(web+'index.html'));}
app.use((error,req,res,next)=>{if(error instanceof z.ZodError)return res.status(400).json({message:error.issues.map(x=>x.message).join(' ')});if(error.code===11000)return res.status(409).json({message:'That username is already taken.'});const status=error.status||500;if(status===500)console.error(error);res.status(status).json({message:status===500?'Server error. Please try again.':error.message});});
