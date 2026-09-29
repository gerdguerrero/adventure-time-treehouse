import * as THREE from 'three';

/** A sparse, continuous stream follows the wind through the front of the canopy. */
export function makeDriftingLeaves(scene: THREE.Scene) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -.10);
  shape.quadraticCurveTo(-.075, .005, 0, .10);
  shape.quadraticCurveTo(.075, -.005, 0, -.10);
  const geometry = new THREE.ShapeGeometry(shape, 5);
  const material = new THREE.MeshStandardMaterial({color:'#80944f',roughness:.9,side:THREE.DoubleSide});
  const leaves = new THREE.InstancedMesh(geometry, material, 14);
  leaves.name='Wind carried leaves';leaves.frustumCulled=false;scene.add(leaves);
  const pose=new THREE.Object3D();
  return {update(time:number){
    for(let i=0;i<14;i++){
      const t=(time*.082+i/14)%1;
      const lane=Math.sin(i*2.39);
      pose.position.set(lane*3.2+Math.sin(time*.7+i)*.45+t*.9,9.4-t*7.8,2.1+Math.cos(i*1.7)*1.1);
      pose.rotation.set(time*1.1+i,time*.7+i*.6,Math.sin(time*1.4+i)*.7);
      // Fade each flight by shrinking at the canopy and ground, avoiding teleport flashes.
      pose.scale.setScalar(Math.sin(Math.PI*t)*(.65+(i%3)*.12));
      pose.updateMatrix();leaves.setMatrixAt(i,pose.matrix);
    }
    leaves.instanceMatrix.needsUpdate=true;
  }};
}
