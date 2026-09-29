import test from 'node:test';
import assert from 'node:assert/strict';
import {Ambience} from '../src/ambience.ts';
test('sound stays opt-in and repeated time changes never overlap sources', () => {
 let active=0,peak=0,contexts=0;
 class Context {
  sampleRate=100;state='running';
  constructor(){contexts++;}
  resume(){return Promise.resolve();} suspend(){return Promise.resolve();}
  createBuffer(_channels:number,length:number){const data=new Float32Array(length);return {getChannelData:()=>data};}
  createGain(){return {gain:{value:0},connect(){return this;},disconnect(){}};}
  createBufferSource(){return {buffer:null,loop:false,connect(){return this;},disconnect(){},start(){active++;peak=Math.max(peak,active);},stop(){active--;}};}
 }
 Object.defineProperty(globalThis,'AudioContext',{value:Context,configurable:true});
 const sound=new Ambience();assert.equal(contexts,0);assert.equal(sound.activeSources,0);
 for(let i=0;i<20;i++)for(const time of ['day','golden','twilight','night'] as const)sound.play(time);
 assert.equal(contexts,1);assert.equal(peak,1);assert.equal(active,1);
 sound.stop();sound.stop();assert.equal(active,0);assert.equal(sound.activeSources,0);
 sound.play('day');sound.stop();assert.equal(active,0);assert.equal(contexts,1);
 delete (globalThis as any).AudioContext;
});
