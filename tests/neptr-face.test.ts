import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {facePose,makeNeptrFace} from '../src/neptr-face.ts';
test('face motion is bounded and reduced motion restores rest',()=>{
 for(let t=0;t<33;t+=.01){const p=facePose(t);assert.ok(p.blink>=.119&&p.blink<=1);assert.ok(Math.abs(p.gaze)<=.004);assert.ok(Math.abs(p.mouth-1)<=.03501);}
 assert.deepEqual(facePose(3.1,true),{blink:1,gaze:0,mouth:1});
});
test('repeated face updates do not accumulate or move eye attachments',()=>{
 const root=new THREE.Group(),eye=new THREE.Group(),pupil=new THREE.Group(),mouth=new THREE.Group();eye.name='NEPTR_side_eye_0';pupil.name='Side eye pupil';mouth.name='NEPTR_side_mouth';eye.position.set(1,2,3);pupil.position.set(2,3,4);root.add(eye,pupil,mouth);const can=new THREE.Group();can.name='Vertical can eye';root.add(can);const face=makeNeptrFace(root);
 for(let i=0;i<100;i++)face.update(3.1,false);assert.deepEqual(eye.position.toArray(),[1,2,3]);assert.ok(eye.scale.y<.13);assert.deepEqual(can.scale.toArray(),[1,1,1]);
 face.update(10,true);assert.deepEqual(eye.scale.toArray(),[1,1,1]);assert.deepEqual(pupil.position.toArray(),[2,3,4]);assert.equal(mouth.scale.y,1);
});
