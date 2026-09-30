import * as THREE from 'three';
/** Sparse, short blinks and a barely perceptible contented mouth movement. */
export function facePose(time:number,reduced=false){
 if(reduced)return {blink:1,gaze:0,mouth:1};
 const t=((time%11)+11)%11;
 const pulse=(center:number,width:number)=>Math.max(0,1-Math.abs(t-center)/width);
 const blink=1-.88*Math.max(pulse(3.1,.13),pulse(8.4,.14));
 return {blink,gaze:Math.sin(time*.44)*.004,mouth:1+Math.sin(time*1.1)*.035};
}
export function makeNeptrFace(root:THREE.Object3D){
 const eyes:THREE.Object3D[]=[],pupils:THREE.Object3D[]=[];
 root.traverse(o=>{if(/^NEPTR_side_eye_/.test(o.name))eyes.push(o);if(/^Side[ _]eye[ _]pupil/.test(o.name))pupils.push(o);});
 const mouth=root.getObjectByName('NEPTR_side_mouth');
 const eyeScales=eyes.map(o=>o.scale.clone()),gazePositions=pupils.map(o=>o.position.clone());
 return {update(time:number,reduced:boolean){const p=facePose(time,reduced);
 eyes.forEach((o,i)=>{o.scale.copy(eyeScales[i]);o.scale.y*=p.blink;});
 pupils.forEach((o,i)=>{o.position.copy(gazePositions[i]);o.position.z+=p.gaze;});
 if(mouth)mouth.scale.y=p.mouth;
 }};
}
