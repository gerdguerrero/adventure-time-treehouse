import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CameraGesture} from '../src/camera-input.ts';

test('two fingers spread to zoom closer without changing camera angle',()=>{
  const g=new CameraGesture();g.start(1,100,100);g.start(2,200,100);
  const result=g.move(2,300,100,390,844);
  assert.deepEqual(result,{yaw:0,elevation:0,zoom:.5});
});
test('coincident fingers stay finite and releasing a finger resumes dragging without a jump',()=>{
  const g=new CameraGesture();g.start(1,100,100);g.start(2,200,100);
  assert.ok(Number.isFinite(g.move(2,100,100,390,844).zoom));
  g.end(2);assert.deepEqual(g.move(1,100,100,390,844),{yaw:-0,elevation:-0,zoom:1});
  assert.notEqual(g.move(1,120,100,390,844).yaw,0);
});
test('cancel or window blur leaves no captured gesture',()=>{
  const g=new CameraGesture();g.start(1,10,20);g.clear();
  assert.equal(g.count,0);assert.deepEqual(g.move(1,300,500,390,844),{yaw:0,elevation:0,zoom:1});
});
