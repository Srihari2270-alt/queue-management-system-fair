import {Queue} from '../../database/db.js';
import {initialState,branches} from './data.js';
export function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export const branch=id=>branches.find(b=>b.id===id)||fail('Unknown branch.');
export const waiting=(s,b)=>s.t.filter(t=>t.b===b&&t.st==='Waiting').sort((a,b)=>b.prio-a.prio||a.ts-b.ts||a.id.localeCompare(b.id));
export function estimate(s,t){const p=waiting(s,t.b).findIndex(x=>x.id===t.id);return Math.max(0,Math.round(p*branch(t.b).avg/Math.max(1,s.c.filter(c=>c.b===t.b&&c.open).length)));}
export async function ensureQueue(){await Queue.updateOne({_id:'main'},{$setOnInsert:{data:initialState(),revision:0}},{upsert:true});}
// Optimistic compare-and-swap across processes: never accept a client's whole queue state.
// Bounded retries avoid lost updates and double-calling a counter.
export async function mutate(fn){for(let n=0;n<12;n++){const row=await Queue.findById('main').lean();const s=structuredClone(row.data);const result=fn(s);const update=await Queue.updateOne({_id:'main',revision:row.revision},{$set:{data:s},$inc:{revision:1}});if(update.modifiedCount)return result;}fail('Queue is busy. Please try again.',409);}
export function activity(s,b,m){s.act.unshift({b,m,ts:Date.now()});s.act=s.act.slice(0,100);}
export function issue(s,{b,name,ph='',svc,type='Online',prio=0,u}){branch(b);if(s.t.length>=5000)fail('Demo capacity reached. Export and reset the demo as admin.',409);const t={id:b+'-'+s.seq[b]++,b,name,ph,svc,type,prio,st:'Waiting',ts:Date.now(),c:null,...(u?{u}: {})};s.t.push(t);activity(s,b,'Token '+t.id+' issued');return t;}
export function callToken(s,b,cid,tid){branch(b);const c=cid?s.c.find(x=>x.id===cid&&x.b===b):s.c.find(x=>x.b===b&&x.open&&!x.serving);if(!c||!c.open||c.serving)fail('No free open counter. Finish the current token first.',409);const t=tid?s.t.find(x=>x.id===tid&&x.b===b&&x.st==='Waiting'):waiting(s,b)[0];if(!t)fail('No waiting token available.',409);t.st='Serving';t.c=c.id;c.serving=t.id;activity(s,b,t.id+' called to counter '+c.no);return t;}
