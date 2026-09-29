import * as THREE from 'three';

/** Animate the authored seated pose around real joints; keep the stool contact fixed. */
export function makeFinnIdle(finn: THREE.Object3D) {
  const original = [...finn.children];
  const name = (o: THREE.Object3D) => o.name.toLowerCase().replace(/[\s_.]/g, '');
  function joint(label: string, position: THREE.Vector3, select: (o: THREE.Object3D) => boolean) {
    const pivot = new THREE.Group();
    pivot.name = label; pivot.position.copy(position); finn.add(pivot);
    finn.updateWorldMatrix(true, true);
    original.filter(select).forEach(o => pivot.attach(o));
    return pivot;
  }
  const head = joint('Finn reading neck', new THREE.Vector3(0, .82, 0),
    o => /^(bearhood|hoodear|faceopening|finndoteye|finngentlesmile)/.test(name(o)));
  const knees = [-1, 1].map((side, i) => joint('Finn swinging knee ' + i,
    new THREE.Vector3(side * .14, .34, .13),
    o => /^(bareshins|whitesock|roundedblackshoe)/.test(name(o)) && name(o).endsWith('001') === (i === 1)));
  const eyes = original.filter(o => name(o).startsWith('finndoteye')).map(o => ({o, y:o.scale.y}));
  // A narrow loose leaf clears the fixed hands at x=±.163. The spine runs
  // front-to-back in glTF coordinates (Blender Z-up becomes Three Y-up).
  const pagePivot = new THREE.Group();
  pagePivot.name = 'Finn turning page spine';
  // r9 page blocks sit at y=.49 and slope down outward by .17 rad.
  // Their extrapolated upper surface reaches y=.5163 at the binding.
  // The leaf starts exactly at its pivot, with a small bound spine joining
  // both blocks; no detached inner strip or reversed resting slope.
  pagePivot.position.set(0, .5172, .345);
  const pageMaterial=new THREE.MeshStandardMaterial({color:'#d9cf9c',roughness:1});
  const page = new THREE.Mesh(new THREE.BoxGeometry(.12, .0015, .205),pageMaterial);
  page.name = 'Finn loose turning leaf';page.position.x=.06;
  const binding=new THREE.Mesh(new THREE.BoxGeometry(.018,.018,.205),pageMaterial);
  binding.name='Finn book bound spine';binding.position.set(0,.5085,.345);finn.add(binding);
  pagePivot.add(page);finn.add(pagePivot);
  let greetAt = -Infinity;
  return {
    greet(time: number) { greetAt = time; },
    update(time: number, greeting: boolean) {
      const look = Math.sin(Math.PI * THREE.MathUtils.clamp((time-greetAt)/3.5,0,1));
      // Looking down at a page alternates with glancing across the clearing.
      head.rotation.x = (.09 + Math.sin(time * .7) * .14)*(1-look)-.055*look;
      head.rotation.y = Math.sin(time * .43) * (greeting ? .30 : .18)*(1-look);
      head.rotation.z = Math.sin(time * .61) * .035;
      knees.forEach((k, i) => k.rotation.x = Math.sin(time * 1.9 + i * 1.5) * .19);
      const blinkPhase = time % 5.3;
      const blink = blinkPhase < .22 ? 1 - .88 * Math.sin(blinkPhase / .22 * Math.PI) : 1;
      eyes.forEach(({o, y}) => o.scale.y = y * blink);
      const phase = time % 18;
      const turn = THREE.MathUtils.smoothstep(phase, 8, 10.4);
      pagePivot.rotation.z = -.17 + (Math.PI+.34)*turn;
      // Hide the leaf briefly between cycles so resetting never sweeps backwards.
      page.visible = phase > .3 && phase < 17.7;
    },
  };
}
