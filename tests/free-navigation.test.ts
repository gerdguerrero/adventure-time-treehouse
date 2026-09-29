import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FreeNavigation } from '../src/free-navigation.ts';
function controller(){const n=new FreeNavigation(new THREE.PerspectiveCamera());n.visit(new THREE.Vector3(0,2,10),new THREE.Vector3(0,2,0));n.collisionReady=true;return n;}
test('movement is frame-rate independent and diagonals are normalized',()=>{
 const a=controller(),b=controller(),c=controller();a.keys.add('KeyW');b.keys.add('KeyW');c.keys.add('KeyW');c.keys.add('KeyD');
 for(let i=0;i<60;i++)a.update(1/60);for(let i=0;i<120;i++)b.update(1/120);for(let i=0;i<60;i++)c.update(1/60);
 assert.ok(a.camera.position.distanceTo(b.camera.position)<1e-8);assert.ok(Math.abs(c.camera.position.distanceTo(new THREE.Vector3(0,2,10))-4)<1e-8);
});
test('look is immediate, yaw unrestricted, pitch bounded, reset clears movement',()=>{
 const n=controller();n.look(1600,10000);assert.ok(n.camera.rotation.y < -Math.PI);assert.equal(n.camera.rotation.x,-1.48);n.keys.add('KeyW');n.visit(new THREE.Vector3(1,2,3),new THREE.Vector3());assert.equal(n.keys.size,0);
});
test('substeps stop a long movement at a thin wall',()=>{
 const n=controller();const wall=new THREE.Mesh(new THREE.BoxGeometry(20,20,.1));wall.updateMatrixWorld();n.world.fromGraphNode(wall);n.move(0,0,1,20);assert.ok(n.camera.position.z>=.399);assert.ok(n.camera.position.z<.41);
});
test('floor bounds and missing collider prevent unsafe movement',()=>{
 const n=controller();n.move(0,-1,0,10);assert.equal(n.camera.position.y,.75);n.collisionReady=false;const before=n.camera.position.clone();n.move(1,0,0,10);assert.deepEqual(n.camera.position,before);
});
test('authored camera moves are interruptible and finish with synced direct look',()=>{
 const n=controller();
 n.transition(new THREE.Vector3(4,4,3),new THREE.Vector3(0,2,0),.5);
 for(let i=0;i<6;i++)n.update(.1);
 assert.ok(n.camera.position.distanceTo(new THREE.Vector3(4,4,3))<1e-8);
 n.transition(new THREE.Vector3(8,4,3),new THREE.Vector3(0,2,0),1);
 n.update(.25);
 assert.equal(n.transitioning,true);
 n.look(20,0);
 assert.equal(n.transitioning,false);
 const before=n.camera.rotation.y;n.look(0,0);
 assert.equal(n.camera.rotation.y,before);
});
