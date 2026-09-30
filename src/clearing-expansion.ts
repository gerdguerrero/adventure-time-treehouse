import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Additive scenery: existing character and architectural assets remain unchanged. */
export function buildClearing(model:THREE.Object3D){
 const root=new THREE.Group();root.name='Beyond the clearing';
 model.updateMatrixWorld(true);
 const ground:THREE.Mesh[]=[];
 model.traverse(o=>{if(o instanceof THREE.Mesh && (Array.isArray(o.material)?o.material:[o.material]).some(m=>m.name==='Meadow moss and grass soil'))ground.push(o);});
 // Spatial buckets avoid raycasting the entire meadow for every flower stem.
 const cells=new Map<string,number[][]>();
 for(const mesh of ground){const p=mesh.geometry.attributes.position,indices=mesh.geometry.index;
  for(let i=0;i<(indices?.count??p.count);i+=3){const v=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,indices?indices.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld));
   const xs=v.map(p=>p.x),zs=v.map(p=>p.z),tri=v.flatMap(p=>[p.x,p.y,p.z]);
   for(let x=Math.floor(Math.min(...xs)/2);x<=Math.floor(Math.max(...xs)/2);x++)for(let z=Math.floor(Math.min(...zs)/2);z<=Math.floor(Math.max(...zs)/2);z++){
    const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key)!.push(tri);
   }
  }
 }
 const baseHeight=(x:number,z:number)=>{for(const t of cells.get(Math.floor(x/2)+','+Math.floor(z/2))??[]){
  const [ax,ay,az,bx,by,bz,cx,cy,cz]=t,d=(bz-cz)*(ax-cx)+(cx-bx)*(az-cz);if(Math.abs(d)<1e-10)continue;
  const u=((bz-cz)*(x-cx)+(cx-bx)*(z-cz))/d,v=((cz-az)*(x-cx)+(ax-cx)*(z-cz))/d;
  if(u>=-.0001&&v>=-.0001&&u+v<=1.0001)return u*ay+v*by+(1-u-v)*cy;
 }return -.14;};
 const height=(x:number,z:number)=>baseHeight(x,z)+swell(x,z);
 const materials=new Map<string,THREE.MeshStandardMaterial>();
 const batches=new Map<string,THREE.BufferGeometry[]>();
 const material=(color:string)=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.94}));return materials.get(color)!;};
 function shape(g:THREE.BufferGeometry,c:string,p:number[],s=[1,1,1],r=[0,0,0]){
  g=g.index?g.toNonIndexed():g;g.deleteAttribute('uv');
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),new THREE.Vector3(...s)));
  if(!batches.has(c))batches.set(c,[]);batches.get(c)!.push(g);
 }
 const ball=(c:string,p:number[],s:number[])=>shape(new THREE.SphereGeometry(1,8,6),c,p,s);
 const box=(c:string,p:number[],s:number[],r=[0,0,0])=>shape(new THREE.BoxGeometry(1,1,1),c,p,s,r);
 const pole=(c:string,a:number[],b:number[],radius:number)=>{
  const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va);
  const g=new THREE.CylinderGeometry(radius,radius,d.length(),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));shape(g,c,va.add(vb).multiplyScalar(.5).toArray());
 };
 let seed=3841;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 // Sculpt the existing meadow so there are no overlapping patch edges.
 const swell=(x:number,z:number)=>{
  const d=Math.hypot(x,z),mask=THREE.MathUtils.smoothstep(d,5.5,9);
  return mask*(1.25*Math.exp(-(((x+10)/4.5)**2+((z+3)/6)**2))+1.55*Math.exp(-(((x-12)/5)**2+((z+7)/7)**2))+.55*Math.exp(-(((x+5)/7)**2+((z+13)/5)**2)));
 };
 const point=new THREE.Vector3();
 model.traverse(o=>{if(!(o instanceof THREE.Mesh))return;
 const mats=Array.isArray(o.material)?o.material:[o.material];
 if(!mats.some(m=>/Meadow|Lichen|Woodland/.test(m.name))||mats.some(m=>/ridge/i.test(m.name)))return;
 o.geometry=o.geometry.clone();const pos=o.geometry.attributes.position,inv=o.matrixWorld.clone().invert();
 for(let i=0;i<pos.count;i++){point.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld);point.y+=swell(point.x,point.z);point.applyMatrix4(inv);pos.setXYZ(i,point.x,point.y,point.z);}
 pos.needsUpdate=true;o.geometry.deleteAttribute('normal');o.geometry.computeVertexNormals();o.geometry.computeBoundingSphere();
 });
 // A stone well: open dark throat, staggered masonry, timber windlass and rope.
 const wx=-4.7,wz=1.25,wy=height(wx,wz);
 shape(new THREE.CylinderGeometry(.43,.43,.04,20),'#23372f',[wx,wy+.06,wz]);
 for(let row=0;row<3;row++)for(let i=0;i<10;i++){
  const a=i*Math.PI/5+(row%2)*Math.PI/10;
  box(row===2?'#a2a28a':'#858d7c',[wx+Math.cos(a)*.51,wy+.12+row*.19,wz+Math.sin(a)*.51],[.30,.18,.23],[0,-a,0]);
 }
 for(const sign of [-1,1])box('#766044',[wx+sign*.72,wy+.91,wz],[.12,1.8,.12]);
 pole('#766044',[wx-.85,wy+1.55,wz],[wx+.85,wy+1.55,wz],.09);
 pole('#c4b087',[wx,wy+.36,wz],[wx,wy+1.55,wz],.017);
 // Compact kitchen garden on the left, clear of the path and Finn camera.
 const gx=-5.8,gz=4.2,gy=height(gx,gz);
 box('#5d4935',[gx,gy+.04,gz],[1.9,.13,1.4]);
 for(const sign of [-1,1]){
  box('#8f7450',[gx+sign*.99,gy+.13,gz],[.10,.23,1.55]);
  box('#8f7450',[gx,gy+.13,gz+sign*.75],[2.08,.23,.10]);
 }
 for(let i=0;i<4;i++)for(let j=0;j<3;j++){
  const x=gx-.7+i*.46,z=gz-.46+j*.44;
  ball('#748654',[x,gy+.20,z],[.17,.14,.17]);
  for(let k=0;k<3;k++)ball('#91a56a',[x+Math.cos(k*2.1)*.08,gy+.26,z+Math.sin(k*2.1)*.08],[.1,.13,.07]);
 }
 // Group plants in intentional islands. Every stem starts at sampled ground height.
 for(const [cx,cz] of [[-6.7,2.1],[-3.8,5.8],[7.6,1.8],[7.2,7.0],[-7.6,-4.5]]){
  for(let i=0;i<5;i++){
   const x=cx+(random()-.5)*1.4,z=cz+(random()-.5)*1.1,y=height(x,z);
   ball('#4e6850',[x,y+.20,z],[.35+random()*.25,.25+random()*.15,.4]);
  }
  for(let i=0;i<18;i++){
   const x=cx+(random()-.5)*2.5,z=cz+(random()-.5)*2,y=height(x,z),h=.12+random()*.20;
   pole('#71845a',[x,y,z],[x,y+h,z],.009);
   for(let p=0;p<5;p++){const a=p*Math.PI*2/5;ball(i%3?'#e6d9ac':'#c8a6a2',[x+Math.cos(a)*.039,y+h,z+Math.sin(a)*.039],[.037,.018,.025]);}
   ball('#bd974c',[x,y+h+.015,z],[.017,.018,.017]);
  }
 }
 // Asymmetric shore stones, leaving the fishing line and camera approach open.
 for(let i=0;i<9;i++){
  const a=2.4+i*.16,x=4.4+Math.cos(a)*2.35,z=4.6+Math.sin(a)*1.68;
  ball('#8a927b',[x,height(x,z)+.025,z],[.13+random()*.08,.07,.11]);
 }
 // Far landmarks are deliberately composed geography, not a canonical map.
 for(const [x,z,h,r] of [[-38,-62,10,4],[-32,-65,13,4.5],[-26,-64,11,3],[-44,-63,9,3]]){
  shape(new THREE.ConeGeometry(r,h,5),'#69838d',[x,h/2-1,z],[1,1,1],[0,.3,0]);
  shape(new THREE.ConeGeometry(r*.46,h*.44,5),'#a5bdc0',[x,h*.78-1,z],[1,1,1],[0,.3,0]);
 }
 // Cake-like stepped keep, frosting cornices, wafer cones and a branching crown tree.
 const cx=9,cz=-57;
 for(const [r,h,y] of [[3.5,1.25,4.7],[2.5,1.5,6.0],[1.55,1.35,7.4],[.65,1.8,8.9]]){
  shape(new THREE.CylinderGeometry(r,r*1.035,h,24),'#c7b391',[cx,y,cz]);
  shape(new THREE.CylinderGeometry(r+.10,r+.10,.16,24),'#cfb1ae',[cx,y+h/2,cz]);
  for(let i=0;i<14;i++){const a=i*Math.PI*2/14;ball('#dfc9ae',[cx+Math.cos(a)*r,y+h/2-.13,cz+Math.sin(a)*r],[.14,.24,.14]);}
 }
 for(const [dx,dz,h] of [[-2.9,0,2],[-1.8,1.8,2.4],[2.6,.3,2.1],[1.6,-1.5,2.8]]){
  const y=5.4;shape(new THREE.CylinderGeometry(.22,.3,h,10),'#c7b391',[cx+dx,y+h/2,cz+dz]);
  shape(new THREE.ConeGeometry(.48,1.6,10),'#b89860',[cx+dx,y+h+.7,cz+dz]);
  for(let k=0;k<4;k++)shape(new THREE.TorusGeometry(.37-k*.075,.025,4,12),'#d5b883',[cx+dx,y+h+.3+k*.3,cz+dz],[1,1,1],[Math.PI/2,0,0]);
 }
 // Red candy ribbon descends across the front of the cake tiers.
 pole('#a76767',[cx+.8,8.05,cz+1.65],[cx+.8,6.5,cz+1.75],.14);
 pole('#a76767',[cx+.8,6.5,cz+1.75],[cx+1.5,5.4,cz+3],.14);
 pole('#8d7159',[cx,9.8,cz],[cx,10.7,cz],.16);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;
  pole('#8d7159',[cx,10.2,cz],[cx+Math.cos(a)*.95,11.0,cz+Math.sin(a)*.7],.08);
  ball('#d8bdba',[cx+Math.cos(a)*.85,11.1+(i%2)*.25,cz+Math.sin(a)*.6],[.95,.55,.7]);
 }
 for(let i=0;i<8;i++){const x=cx-4+random()*8,z=cz+2+random()*2;pole('#887c77',[x,3.5,z],[x,4.3,z],.09);ball('#ad969e',[x,4.5,z],[.55,.6,.5]);}
 for(const [c,geometries] of batches){const merged=mergeGeometries(geometries);if(!merged)throw new Error('Scenery merge failed');const m=new THREE.Mesh(merged,material(c));m.name='Clearing '+c;m.castShadow=true;m.receiveShadow=true;root.add(m);geometries.forEach(g=>g.dispose());}
 return {root,height};
}
