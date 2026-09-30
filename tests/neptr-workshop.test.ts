import test from 'node:test';
import assert from 'node:assert/strict';
import {piePhase} from '../src/neptr-workshop.ts';
import {parseMemory} from '../src/visit-memory.ts';
test('door clears the tray throughout extension and return; steam only when served',()=>{
 for(let t=0;t<36;t+=.025){const p=piePhase(t);assert.ok(p.flight>=0&&p.flight<=1);assert.ok(p.door>=0&&p.door<=1);if(p.flight>0)assert.equal(p.door,1);if(p.steam>0)assert.equal(p.flight,1);assert.equal(p.visible,true);}
 assert.equal(piePhase(8).flight,1);assert.equal(piePhase(14.5).flight,0);assert.equal(piePhase(17).door,0);
});
test('loop boundary is continuous and deterministic without pie disappearance',()=>{
 assert.deepEqual(piePhase(0),piePhase(18));assert.deepEqual(piePhase(0),piePhase(18-.001));assert.deepEqual(piePhase(4.5),piePhase(22.5));
 for(const boundary of [2.5,3.6,4,6.4,12,14.4,15,16.1]){const a=piePhase(boundary-.0001),b=piePhase(boundary+.0001);assert.ok(Math.abs(a.flight-b.flight)<.001);assert.ok(Math.abs(a.door-b.door)<.001);}
});
test('reduced motion keeps a served pie and shut door regardless of elapsed time',()=>{
 assert.deepEqual(piePhase(0,true),piePhase(99,true));assert.equal(piePhase(0,true).flight,1);assert.equal(piePhase(0,true).door,0);assert.equal(piePhase(0,true).steam,0);
});
test('NEPTR discovery survives reload without disturbing existing destinations',()=>{
 assert.deepEqual(parseMemory(JSON.stringify({discovered:['neptr','pond','invalid']})).discovered,['pond','neptr']);
});
