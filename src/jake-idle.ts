import * as THREE from 'three';

/** Wake for a curious look, then settle back into the authored sleeping pose. */
export function makeJakeIdle(jake:THREE.Object3D){
  const name=(o:THREE.Object3D)=>o.name.toLowerCase().replace(/[\s_.]/g,'');
  let head:THREE.Object3D|undefined;
  const eyes:THREE.Object3D[]=[],closed:THREE.Object3D[]=[];
  const opening={value:1};
  jake.traverse(o=>{
    const n=name(o);
    if(n==='jakesleepyheadpivot')head=o;
    if(n.startsWith('jakeeyewhite')||n.startsWith('jakeeyedarkrim'))eyes.push(o);
    if(n.startsWith('sleepyeyelid'))closed.push(o);
    if(o instanceof THREE.Mesh&&o.userData.capsuleEye){
      // Clip from the top like an eyelid; never squash the white or its outline.
      // Coordinates are relative to each eye's own center in the exported mesh.
      const material=(o.material as THREE.MeshStandardMaterial).clone();
      material.onBeforeCompile=shader=>{
        shader.uniforms.eyeOpening=opening;
        shader.vertexShader='varying float eyeY;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\neyeY=position.y;');
        const centerOffset=Number(o.userData.eyeCenterOffset ?? (n.startsWith('jakeeyewhite')?.005:0));
        const radius=Number(o.userData.eyeRadius ?? .076);
        shader.fragmentShader='uniform float eyeOpening;\nvarying float eyeY;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nif(eyeY+${centerOffset.toFixed(3)}>mix(-${radius.toFixed(3)},${radius.toFixed(3)},eyeOpening))discard;`);
      };
      material.customProgramCacheKey=()=>`jake-lid-r5-${o.userData.eyeCenterOffset ?? 0}-${o.userData.eyeRadius ?? .076}`;
      o.material=material;
    }
  });
  let awake=0;
  let greetAt=-Infinity;
  const original=[...jake.children];
  const arms=[-1,1].map((side,i)=>{
    const pivot=new THREE.Group();pivot.name='Jake gentle stretch shoulder '+i;
    pivot.position.set(side*.29,.60,0);jake.add(pivot);jake.updateWorldMatrix(true,true);
    original.filter(o=>/^(jakerelaxedarm|jakehandonknee)/.test(name(o)) && name(o).endsWith('001')===(i===1)).forEach(o=>pivot.attach(o));
    return {pivot,side};
  });
  const smooth=(v:number)=>{const t=THREE.MathUtils.clamp(v,0,1);return t*t*(3-2*t);};
  return {greet(time:number){greetAt=time;},update(time:number,greeting:boolean){
    const t=time%24;
    awake=smooth((t-12)/.18)*(1-smooth((t-18)/.14));
    if(greeting)awake=1;
    const greetAge=time-greetAt;
    const response=greetAge>0&&greetAge<3.5?Math.sin(Math.PI*greetAge/3.5):0;
    const greeted=smooth(greetAge/.18)*(1-smooth((greetAge-3.3)/.14));
    awake=Math.max(awake,greeted);
    // One quick blink during the awake hold; the shape stays round on either side.
    const blink=smooth((t-15.2)/.065)*(1-smooth((t-15.29)/.105));
    opening.value=awake*(1-blink);
    if(head){head.rotation.x=-.025*awake;head.rotation.y=Math.sin(time*.9)*.025*awake;}
    // Less than six degrees; feet, seated legs, root scale and deck contact stay fixed.
    const stretch=Math.max(response,Math.sin(Math.PI*THREE.MathUtils.clamp((t-13)/4,0,1)));
    arms.forEach(({pivot,side})=>pivot.rotation.z=side*.10*stretch);
    eyes.forEach(o=>o.visible=opening.value>.025);
    closed.forEach(o=>o.visible=opening.value<=.025);
  },get awake(){return awake;},get eyeOpening(){return opening.value;}};
}
