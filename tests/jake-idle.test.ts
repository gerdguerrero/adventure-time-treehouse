import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeJakeIdle} from '../src/jake-idle.ts';

test('Jake wake cycle preserves the resting contact and closes smoothly across repeat',()=>{
  const root=new THREE.Group();root.position.set(-3.63,8.704,-.72);root.scale.setScalar(.66);
  const head=new THREE.Group();head.name='Jake_sleepy_head_pivot';head.position.set(0,.25,0);root.add(head);
  const lid=new THREE.Mesh();lid.name='Jake_eye_white';lid.scale.y=.085;head.add(lid);
  const rim=new THREE.Mesh();rim.name='Jake_eye_dark_rim';rim.scale.y=.12;head.add(rim);
  const closed=new THREE.Mesh();closed.name='Sleepy_eyelid';head.add(closed);
  const idle=makeJakeIdle(root);const contact=root.position.clone();const pivot=head.position.clone();
  for(let time=0;time<72;time+=.05){idle.update(time,false);assert.ok(lid.scale.y>0&&Number.isFinite(lid.scale.y));assert.ok(Number.isFinite(head.rotation.x));assert.deepEqual(root.position,contact);assert.deepEqual(head.position,pivot);}
  idle.update(16,false);assert.ok(idle.awake>.99);assert.equal(closed.visible,false);
  idle.update(24,false);assert.equal(idle.awake,0);assert.equal(closed.visible,true);assert.equal(lid.visible,false);assert.equal(rim.visible,false);
  idle.update(16,false);assert.equal(lid.visible,true);assert.equal(lid.scale.y,.085);
  idle.update(2,true);assert.ok(idle.awake>=.7);
});
