import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeFinnIdle} from '../src/character-idle.ts';
import {makeJakeIdle} from '../src/jake-idle.ts';
import {makeFishing} from '../src/fishing.ts';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

test('served Finn leaf remains bound to r9 book and clears authored hand bounds throughout turn',async()=>{
  const bytes=await readFile(new URL('../public/models/quiet-cameos.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const finn=gltf.scene.getObjectByName('Finn')!;
  const idle=makeFinnIdle(finn);
  const page=finn.getObjectByName('Finn loose turning leaf')!;
  const binding=finn.getObjectByName('Finn book bound spine')!;
  const hands=finn.children.filter(o=>o.name.startsWith('Hand_on_book'));
  const blocks=finn.children.filter(o=>o.name.startsWith('Book_page_block'));
  assert.equal(hands.length,2);assert.equal(blocks.length,2);
  finn.updateWorldMatrix(true,true);
  const bindingBounds=new THREE.Box3().setFromObject(binding);
  for(const block of blocks)assert.ok(bindingBounds.intersectsBox(new THREE.Box3().setFromObject(block)),'binding physically joins authored page blocks');
  for(let time=8;time<=10.4;time+=.02){
    idle.update(time,false);finn.updateWorldMatrix(true,true);
    const innerEdge=page.localToWorld(new THREE.Vector3(-.06,0,0));
    assert.ok(bindingBounds.containsPoint(innerEdge),'leaf inner edge stays embedded in binding');
    const pageBounds=new THREE.Box3().setFromObject(page);
    for(const hand of hands)assert.ok(!pageBounds.intersectsBox(new THREE.Box3().setFromObject(hand)),'leaf clears fixed hands');
  }
});

test('Finn page and greeting use elapsed time without moving book or hands',()=>{
  const root=new THREE.Group();
  const hand=new THREE.Object3D();hand.name='Hand_on_book';hand.position.set(.163,.53,.35);root.add(hand);
  const book=new THREE.Object3D();book.name='Book_cover';root.add(book);
  const idle=makeFinnIdle(root);idle.greet(8);
  const handMatrix=hand.matrix.clone(),bookMatrix=book.matrix.clone();
  for(let t=0;t<40;t+=.05){idle.update(t,false);assert.deepEqual(hand.matrix,handMatrix);assert.deepEqual(book.matrix,bookMatrix);}
  idle.update(9,false);const pose=root.toJSON();idle.update(9,false);assert.deepEqual(root.toJSON(),pose);
});

test('Jake stretch leaves root transform and planted feet unchanged',()=>{
  const root=new THREE.Group();root.scale.setScalar(.66);
  const foot=new THREE.Object3D();foot.name='Jake_rounded_foot';foot.position.set(.19,.045,.33);root.add(foot);
  const arm=new THREE.Object3D();arm.name='Jake_relaxed_arm';root.add(arm);
  const idle=makeJakeIdle(root);const position=foot.position.clone(),scale=root.scale.clone();idle.greet(1);
  for(let t=0;t<48;t+=.05){idle.update(t,false);assert.deepEqual(foot.position,position);assert.deepEqual(root.scale,scale);}
});

test('Jake eyelids never deform the exported eye surfaces or detach their contact',async()=>{
  const bytes=await readFile(new URL('../public/models/quiet-cameos.glb',import.meta.url));
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const jake=gltf.scene.getObjectByName('Jake')!;
  const meshes:THREE.Mesh[]=[];jake.traverse(o=>{if(o instanceof THREE.Mesh&&o.userData.capsuleEye)meshes.push(o);});
  assert.equal(meshes.length,4);
  for(const mesh of meshes){
    const vertices=mesh.geometry.getAttribute('position');
    const radius=Number(mesh.userData.eyeRadius),offset=Number(mesh.userData.eyeCenterOffset);
    assert.ok(Number.isFinite(radius)&&Number.isFinite(offset),'export supplies eyelid bounds');
    for(let i=0;i<vertices.count;i++)assert.ok(Math.abs(vertices.getY(i)+offset)<radius,'fully open eyelid must reveal the complete eye');
  }
  const original=meshes.map(o=>({vertices:new Float32Array(o.geometry.getAttribute('position').array),scale:o.scale.clone()}));
  const idle=makeJakeIdle(jake);
  for(let t=0;t<48;t+=.025){
    idle.update(t,false);
    meshes.forEach((o,i)=>{
      assert.equal(o.visible,idle.eyeOpening>.025);
      assert.deepEqual(o.scale,original[i].scale,'eye silhouette scale stays fixed');
    });
  }
  meshes.forEach((o,i)=>assert.deepEqual(o.geometry.getAttribute('position').array,original[i].vertices,'contact geometry stays fixed'));
  idle.update(15.2,false);assert.equal(idle.eyeOpening,1);
  idle.update(15.28,false);assert.equal(idle.eyeOpening,0);
  idle.update(15.4,false);assert.equal(idle.eyeOpening,1);
  idle.update(24,false);for(const o of meshes)assert.equal(o.visible,false);
  idle.greet(24);idle.update(24.2,false);assert.equal(idle.eyeOpening,1);
});

test('fishing float endpoint remains attached through bites, cycles and paused frames',()=>{
  const context=new Proxy({}, {get:()=>()=>{},set:()=>true});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({getContext:()=>context})}});
  try{
    const scene=new THREE.Scene(),bmo=new THREE.Group();scene.add(bmo);
    const fishing=makeFishing(scene,bmo),position=bmo.position.clone(),scale=bmo.scale.clone();
    const line=scene.getObjectByName('BMO attached fishing line') as THREE.Line;
    const bobber=scene.getObjectByName('BMO nibbling bobber')!;
    fishing.bite(3);
    for(let t=0;t<48;t+=.05){
      fishing.update(t);const attr=line.geometry.getAttribute('position');
      assert.ok([...attr.array].every(Number.isFinite));
      assert.ok(new THREE.Vector3().fromBufferAttribute(attr,24).distanceTo(bobber.position)<1e-6);
      assert.deepEqual(bmo.position,position);assert.deepEqual(bmo.scale,scale);
      const previous=[...attr.array];fishing.update(t);assert.deepEqual([...attr.array],previous);
    }
  }finally{delete (globalThis as any).document;}
});
