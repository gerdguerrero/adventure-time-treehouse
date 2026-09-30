import * as THREE from 'three';
const smooth=(a:number)=>{a=THREE.MathUtils.clamp(a,0,1);return THREE.MathUtils.clamp(a*a*a*(a*(a*6-15)+10),0,1);};
/** Extend, inspect/cool, and retract the same pie. Reset happens inside the shut oven. */
export function piePhase(time:number,reduced=false){
 const t=((time%18)+18)%18;
 if(reduced)return {door:0,flight:1,visible:true,steam:0};
 const flight=smooth((t-4)/2.4)*(1-smooth((t-12)/2.4));
 return {door:smooth((t-2.5)/1.1)*(1-smooth((t-15)/1.1)),flight,visible:true,steam:smooth((t-6.4)/.8)*(1-smooth((t-10.8)/1.1))};
}
export function makePieWorkshop(neptr:THREE.Object3D){
 const group=new THREE.Group();group.name='NEPTR pie workshop';neptr.add(group);
 const wood=new THREE.MeshStandardMaterial({color:'#846548',roughness:.95}),tin=new THREE.MeshStandardMaterial({color:'#778680',roughness:.7});
 function box(p:number[],s:number[]){const m=new THREE.Mesh(new THREE.BoxGeometry(...s as [number,number,number]),wood);m.position.set(...p as [number,number,number]);m.castShadow=true;m.receiveShadow=true;group.add(m);}
 // Serving surface aligns with the oven floor, so the pie never floats or drops.
 box([-.23,.435,0.85],[.8,.065,.65]);for(const x of [-.53,.07])for(const z of [.63,1.08])box([x,.21,z],[.055,.42,.055]);
 const pie=new THREE.Group();group.add(pie);
 const tray=new THREE.Mesh(new THREE.CylinderGeometry(.20,.16,.035,20),tin);pie.add(tray);
 const crust=new THREE.MeshStandardMaterial({color:'#d3a35f',roughness:.95});
 const dome=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),crust);dome.scale.set(.18,.055,.18);dome.position.y=.035;pie.add(dome);
 const edge=new THREE.Mesh(new THREE.TorusGeometry(.176,.014,6,24),crust);edge.rotation.x=Math.PI/2;edge.position.y=.025;pie.add(edge);
 const dark=new THREE.MeshStandardMaterial({color:'#956334'});
 for(let i=-1;i<=1;i++){const vent=new THREE.Mesh(new THREE.BoxGeometry(.008,.003,.065),dark);vent.position.set(i*.05,.089,0);vent.rotation.y=-.3;pie.add(vent);}
 pie.traverse(o=>{if(o instanceof THREE.Mesh)o.castShadow=true;});
 // Two nested drawer slides carry a full-width serving shelf; rigid parts never stretch.
 const rails:Array<{mesh:THREE.Mesh;stage:number;x:number}>=[];
 for(const x of [-.39,-.07])for(let stage=0;stage<3;stage++){
  const m=new THREE.Mesh(new THREE.BoxGeometry(.035-stage*.006,.022,.34),tin);
  m.castShadow=true;group.add(m);rails.push({mesh:m,stage,x});
 }
 const carriage=new THREE.Mesh(new THREE.BoxGeometry(.40,.025,.41),tin);carriage.castShadow=true;group.add(carriage);
 const steam=Array.from({length:3},()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial({color:'#ece6cf',transparent:true,opacity:0,depthWrite:false}));group.add(m);return m;});
 const door=neptr.getObjectByName('NEPTR_door');
 return {update(time:number,reduced:boolean){
  const p=piePhase(time,reduced);if(door)door.rotation.y=-p.door*1.8;
  const z=THREE.MathUtils.lerp(.02,0.85,p.flight);
  pie.visible=p.visible;pie.position.set(-.23,reduced?.49:.542,z);
  rails.forEach(({mesh,stage,x})=>{mesh.visible=!reduced;mesh.position.set(x,.479+stage*.003,.10+stage*.27*p.flight);});
  carriage.visible=!reduced;carriage.position.set(-.23,.509,z);
  steam.forEach((m,i)=>{const age=(((time%18)*.45+i/3)%1);m.visible=p.steam>0&&!reduced;m.position.set(-.23+Math.sin(age*4+i)*.04,.622+age*.30,0.85);m.scale.setScalar(.025+age*.04);(m.material as THREE.MeshBasicMaterial).opacity=.14*Math.sin(age*Math.PI)*p.steam;});
 }};
}
