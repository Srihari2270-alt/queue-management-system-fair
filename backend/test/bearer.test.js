import {test} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {MongoMemoryServer} from 'mongodb-memory-server';
import request from 'supertest';
process.env.SESSION_TRANSPORT='bearer';
process.env.APP_ORIGIN='https://srihari2270-alt.github.io';
const {app}=await import('../src/app.js');
const {User,Session}=await import('../../database/db.js');
const {ensureQueue}=await import('../src/queue.js');
test('split-host bearer login, exact-origin CORS, private queues, export and revocation',async()=>{
 const mongo=await MongoMemoryServer.create();
 try{
  await mongoose.connect(mongo.getUri());await User.init();await Session.init();await ensureQueue();
  const origin='https://srihari2270-alt.github.io';
  const preflight=await request(app).options('/api/auth/login').set('Origin',origin).set('Access-Control-Request-Headers','content-type,authorization').expect(204);
  assert.equal(preflight.headers['access-control-allow-origin'],origin);assert.equal(preflight.headers['access-control-allow-credentials'],undefined);
  const bad=await request(app).options('/api/auth/login').set('Origin','https://evil.example');assert.equal(bad.headers['access-control-allow-origin'],undefined);
  await request(app).post('/api/auth/register').set('Origin','https://evil.example').send({}).expect(403);
  const r=await request(app).post('/api/auth/register').set('Origin',origin).set('Sec-Fetch-Site','cross-site').send({username:'pagesuser',name:'Pages Test',phone:'9876543210',password:'testpass123'}).expect(201);
  assert.match(r.body.sessionToken,/^[a-f0-9]{64}$/);assert.equal(r.headers['set-cookie'],undefined);assert.equal(r.body.user.sessionToken,undefined);
  const auth='Bearer '+r.body.sessionToken;
  await request(app).get('/api/auth/me').set('Authorization',auth).expect(200);
  await request(app).get('/api/auth/me').set('Cookie','qflow_session='+r.body.sessionToken).expect(401);
  const q=await request(app).get('/api/queue?branch=SBT').set('Authorization',auth).expect(200);assert.equal(q.body.tokens[0].name,undefined);
  await request(app).post('/api/tokens').set('Origin',origin).set('Sec-Fetch-Site','cross-site').set('Authorization',auth).send({branch:'SBT',service:'Cash deposit / withdrawal'}).expect(201);
  await request(app).get('/api/reports/export').set('Authorization',auth).expect(403);
  await User.updateOne({username:'pagesuser'},{role:'admin'});
  const csv=await request(app).get('/api/reports/export?branch=SBT').set('Authorization',auth).expect(200);assert.match(csv.text,/Token/);
  await request(app).post('/api/auth/logout').set('Origin',origin).set('Authorization',auth).expect(200);
  await request(app).get('/api/auth/me').set('Authorization',auth).expect(401);
 }finally{await mongoose.disconnect();await mongo.stop();}
});
