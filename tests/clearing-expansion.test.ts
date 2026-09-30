import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildClearing} from '../src/clearing-expansion.ts';

test('scenery samples transformed ground, keeps existing characters intact, and produces finite batches',()=>{
 const model=new THREE.Group();
 const mat=new THREE.MeshStandardMaterial();mat.name='Meadow moss and grass soil';
 const geo=new THREE.PlaneGeometry(80,80,80,80);geo.rotateX(-Math.PI/2);
 const ground=new THREE.Mesh(geo,mat);ground.position.y=-.2;model.add(ground);
 const character=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());character.name='Jake';character.position.set(1,5,2);model.add(character);
 const original=character.geometry;const before=character.position.clone();
 const expansion=buildClearing(model);
 assert.equal(character.geometry,original);assert.deepEqual(character.position,before);
 assert.ok(expansion.height(-10,-2)>-.2);
 assert.ok(Math.abs(expansion.height(0,0)+.2)<.01);
 assert.ok(expansion.root.children.length<32,'static detail must stay batched');
 expansion.root.traverse(o=>{if(o instanceof THREE.Mesh){assert.ok(o.geometry.attributes.position.count>0);for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));}});
 const normals=ground.geometry.attributes.normal;assert.ok(normals.array instanceof Float32Array,'recomputed normals must not reuse quantized integer buffers');
});
