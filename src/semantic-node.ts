import type { Object3D } from 'three';

// GLTFLoader creates child meshes for a multi-material glTF mesh. The node
// carrying the authored name is therefore not necessarily the rendered mesh.
export function semanticNodeName(object:Object3D, root:Object3D):string {
  let node=object;
  while(node.parent && node.parent!==root) node=node.parent;
  return node.name;
}
