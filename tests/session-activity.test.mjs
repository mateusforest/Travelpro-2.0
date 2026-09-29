import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
test('server idle migration rejects expired sessions permanently and restricts tracking to service role',async()=>{
 const db=new PGlite();try{
  await db.exec('create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create table public.workspaces(id uuid primary key);');
  await db.exec(readFileSync(new URL('../supabase/migrations/20260929_session_activity.sql',import.meta.url),'utf8'));
  const user='00000000-0000-4000-8000-000000000001',workspace='00000000-0000-4000-8000-000000000002',session='00000000-0000-4000-8000-000000000003';
  await db.query('insert into auth.users values($1)',[user]);await db.query('insert into workspaces values($1)',[workspace]);
  const touch=async active=>(await db.query('select travelpro_touch_session($1,$2,$3,30,$4) as active',[session,user,workspace,active])).rows[0].active;
  assert.equal(await touch(true),true);await db.query("update travelpro_session_activity set last_activity=now()-interval '5 minutes'");
  const before=(await db.query('select last_activity from travelpro_session_activity')).rows[0].last_activity;assert.equal(await touch(false),true);assert.deepEqual((await db.query('select last_activity from travelpro_session_activity')).rows[0].last_activity,before);
  await db.query("update travelpro_session_activity set last_activity=now()-interval '31 minutes'");assert.equal(await touch(false),false);assert.equal(await touch(true),false,'activity cannot resurrect revoked session');
  await db.exec('set role authenticated');await assert.rejects(touch(true),/permission denied/);
 }finally{await db.close();}
});
