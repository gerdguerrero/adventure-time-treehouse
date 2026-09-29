import test from 'node:test';
import assert from 'node:assert/strict';
import {Group, Mesh} from 'three';
import {semanticNodeName} from '../src/semantic-node.ts';

test('multi-material primitive inherits authored node identity, including nested groups',()=>{
  const scene=new Group(), canopy=new Group(), primitiveGroup=new Group(), leaf=new Mesh();
  canopy.name='Foliage_Central';leaf.name='Central_structural_leafy_bough_00_3';
  scene.add(canopy);canopy.add(primitiveGroup);primitiveGroup.add(leaf);
  assert.equal(semanticNodeName(leaf,scene),'Foliage_Central');
  const environment=new Group();environment.name='Environment';scene.add(environment);
  environment.add(leaf);
  assert.equal(semanticNodeName(leaf,scene),'Environment');
});

test('single-primitive glTF node retains its own semantic name',()=>{
  const scene=new Group(), flag=new Mesh();flag.name='Flag';scene.add(flag);
  assert.equal(semanticNodeName(flag,scene),'Flag');
});
