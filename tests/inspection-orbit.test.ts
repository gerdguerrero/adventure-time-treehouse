import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {InspectionOrbit} from '../src/inspection-orbit.ts';
test('inspection keeps subject fixed and bounds repeated drag and zoom',()=>{
  const o=new InspectionOrbit(); const focus=new THREE.Vector3(3,.2,3);
  const start=new THREE.Vector3(4,2,7); const radius=start.distanceTo(focus);
  o.configure(start,focus,.3);
  let state=o.move(100,100,.00001);
  assert.ok(state.target.equals(focus));assert.ok(Math.abs(state.position.distanceTo(focus)-radius*.82)<1e-8);
  const initial=new THREE.Spherical().setFromVector3(start.clone().sub(focus));
  const final=new THREE.Spherical().setFromVector3(state.position.clone().sub(focus));
  assert.ok(Math.abs(final.theta-initial.theta-.3)<1e-8);
  state=o.move(-100,-100,10000);assert.ok(Math.abs(state.position.distanceTo(focus)-radius*1.2)<1e-8);
  o.configure(start,focus);assert.ok(o.move(0,0).position.distanceTo(start)<1e-8);
});

 test('interrupting travel adopts the current view without snapping, including upward looks',()=>{
  for(const target of [new THREE.Vector3(0,9,0),new THREE.Vector3(0,2,0)]){
   const camera=new THREE.PerspectiveCamera();camera.position.set(2,5,8);camera.lookAt(target);
   const direction=camera.getWorldDirection(new THREE.Vector3());const orbit=new InspectionOrbit();
   orbit.configure(new THREE.Vector3(-4,10,3),new THREE.Vector3(-3,9,0));
   orbit.adoptView(camera,7);const result=orbit.move(0,0);
   assert.ok(result.position.distanceTo(camera.position)<1e-8);
   assert.ok(result.target.clone().sub(result.position).normalize().distanceTo(direction)<1e-8);
   assert.ok(orbit.move(.01,0).position.distanceTo(camera.position)<.1);
  }
 });
