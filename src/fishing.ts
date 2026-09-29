import * as THREE from 'three';
import {makeMusicNotes} from './music-notes.ts';

/** BMO's quiet fishing spot; all movement shares the pausable environment clock. */
export function makeFishing(scene:THREE.Scene,bmo:THREE.Object3D) {
  bmo.position.set(3.1,-.10,3.05);bmo.scale.multiplyScalar(.9);bmo.rotation.y=.4;
  const music=makeMusicNotes(scene,bmo.position.clone().add(new THREE.Vector3(-.14,.39,0)),.5);
  const wood=new THREE.MeshStandardMaterial({color:'#795936',roughness:.9});
  const stone=new THREE.MeshStandardMaterial({color:'#687571',roughness:1});
  const seat=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),stone);seat.scale.set(.16,.13,.105);seat.position.set(3.10,-.15,3.01);scene.add(seat);seat.castShadow=true;
  function tube(points:THREE.Vector3[],radius:number,material:THREE.Material){const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,radius,6,false),material);scene.add(m);return m;}
  bmo.updateMatrixWorld(true);
  const hand=bmo.localToWorld(new THREE.Vector3(.255,.395,.165));
  const tip=new THREE.Vector3(3.85,.62,3.68);
  tube([hand,hand.clone().lerp(tip,.55).add(new THREE.Vector3(0,.10,0)),tip],.012,wood);
  const floatPoint=new THREE.Vector3(4.0,-.265,4.65);
  // Update a fixed buffer instead of rebuilding a tube each frame. Both line
  // endpoints are exact: the stationary rod tip and the moving float origin.
  const linePositions=new Float32Array(25*3);
  const lineGeometry=new THREE.BufferGeometry();
  lineGeometry.setAttribute('position',new THREE.BufferAttribute(linePositions,3));
  const line=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:'#c8d4c1',transparent:true,opacity:.85}));
  line.name='BMO attached fishing line';line.frustumCulled=false;scene.add(line);
  const bobber=new THREE.Group();bobber.position.copy(floatPoint);scene.add(bobber);
  bobber.name='BMO nibbling bobber';
  const eyes:{o:THREE.Object3D;y:number}[]=[];
  bmo.traverse(o=>{if(o.name.toLowerCase().replace(/[\s_.]/g,'').startsWith('bmoeye'))eyes.push({o,y:o.scale.y});});
  let biteAt=-Infinity;
  for(const [color,y] of [['#e76548',.025],['#f2e7ce',-.018]] as const){const ball=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),new THREE.MeshStandardMaterial({color}));ball.position.y=y;bobber.add(ball);}
  const fish: {root:THREE.Group;tail:THREE.Mesh;phase:number}[]=[];
  for(let i=0;i<5;i++){
    const root=new THREE.Group();scene.add(root);
    const material=new THREE.MeshBasicMaterial({color:['#72aaa8','#74a79a','#9abaaa','#679f9c','#abc3a8'][i],transparent:true,opacity:.34+i*.04,depthWrite:false});
    const body=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),material);body.scale.set(.115+i*.009,.009,.043+i*.002);root.add(body);
    const tail=new THREE.Mesh(new THREE.ConeGeometry(.065,.12,3),material);tail.rotation.z=-Math.PI/2;tail.scale.y=1;tail.scale.z=.17;tail.position.x=-.18;root.add(tail);
    fish.push({root,tail,phase:i*Math.PI*2/5});
  }
  return {bite(time:number){biteAt=time;},update(time:number){
    music.update(time);
    const periodic=time%22;
    const age=Math.min(time-biteAt,periodic>=14?periodic-14:Infinity);
    const response=age>=0&&age<2.4?Math.sin(Math.PI*age/2.4):0;
    const dip=response>0?response*(.025+.018*Math.sin(age*12)**2):0;
    bobber.position.y=floatPoint.y+Math.sin(time*2)*.012-dip;
    const blinkPhase=time%5.7;
    const blink=response>.1?1:blinkPhase<.20?1-.85*Math.sin(blinkPhase/.20*Math.PI):1;
    eyes.forEach(({o,y})=>o.scale.y=y*(1+.45*response)*blink);
    for(let i=0;i<25;i++){
      const u=i/24,v=1-u,index=i*3;
      linePositions[index]=v*v*tip.x+2*v*u*3.95+u*u*bobber.position.x;
      linePositions[index+1]=v*v*tip.y+2*v*u*.22+u*u*bobber.position.y;
      linePositions[index+2]=v*v*tip.z+2*v*u*4.16+u*u*bobber.position.z;
    }
    lineGeometry.attributes.position.needsUpdate=true;
    fish.forEach(({root,tail,phase},i)=>{
      const a=time*(.15+i*.013)+phase;
      const rx=1.05+i*.10,rz=.48+i*.06;
      root.position.set(4.45+Math.cos(a)*rx,-.285+i*.0005,4.65+Math.sin(a)*rz);
      root.rotation.y=Math.atan2(-Math.cos(a)*rz,-Math.sin(a)*rx);
      tail.rotation.y=Math.sin(time*5+phase)*.3;
    });
  }};
}
