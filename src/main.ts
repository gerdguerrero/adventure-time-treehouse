import {setupMusic} from './music.ts';
import * as THREE from 'three';
import {gsap} from 'gsap';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { CameraGesture, type SceneView } from './camera-input.ts';
import { FreeNavigation } from './free-navigation.ts';
import { semanticNodeName } from './semantic-node.ts';
import './style.css';
import {parseMemory, readStorage, writeStorage, automaticPorch, type TimeOfDay, type Place} from './visit-memory.ts';
import {presets, drawVista, vistaCopy, makeLife} from './living-world.ts';

import {makeFishing} from './fishing.ts';
import {makeJakeIdle} from './jake-idle.ts';
import {makeFinnIdle} from './character-idle.ts';
import {InspectionOrbit} from './inspection-orbit.ts';
import {addPondSheen} from './pond-sheen.ts';
import {makeSnail} from './hidden-snail.ts';
import {makeDriftingLeaves} from './wind-leaves.ts';
import {disclosurePanels} from './disclosure-panels.ts';
import {startRenderer} from './renderer-start.ts';

const candidate = 'jake-ear-2026-09-28-r11';
const memory = parseMemory(readStorage('ooo-memory'));
let timeOfDay: TimeOfDay = memory.time;
let manualPorch = false;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('scene');
setupMusic($<HTMLButtonElement>('music-toggle'), $('music-off-mark'), message => showToast(message));
const mobile = () => innerWidth < 650;
// Bound fragment work on high-DPI and large displays while retaining native MSAA.
const hdCapture = new URLSearchParams(location.search).has('demo') && new URLSearchParams(location.search).has('hd');
const renderPixelRatio = () => hdCapture ? 1 : Math.min(devicePixelRatio, 1.25, Math.sqrt(2_000_000 / Math.max(1, innerWidth * innerHeight)));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const debug = new URLSearchParams(location.search).has('debug');
const returningVisitor = !new URLSearchParams(location.search).has('arrival') && readStorage('ooo-arrived') === '1';
let paused = reduced.matches, ready = false, homeOn = automaticPorch(timeOfDay), mode: SceneView = 'clearing';
let telescopeActive = false;
let activePlace:Place|'clearing'='clearing';
let toastTimer = 0;


const renderer = startRenderer(
  () => new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false }),
  $<HTMLButtonElement>('retry'), () => location.reload(), fail,
);
renderer.setPixelRatio(renderPixelRatio());
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
// Lighting and large geometry are stationary. The tiny leaf sway can share a cached shadow.
renderer.shadowMap.autoUpdate = false;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#081b32');
scene.fog = new THREE.Fog('#0b2035', 38, 112);
const camera = new THREE.PerspectiveCamera(29, innerWidth / innerHeight, .1, 230);
const target = new THREE.Vector3(.15, 4.25, 0);
const navigation = new FreeNavigation(camera);
const inspection = new InspectionOrbit();
inspection.configure(new THREE.Vector3(7.65,8.71,31.04),target,.65);
let snailFound=false;
const snail=makeSnail(scene);
function subjectPose(place:Place|'clearing'){
 const portrait=innerWidth<650;
 const poses={clearing:[[7.65,8.71,31.04],[.15,4.25,0]],lookout:[[-4.18,9.85,2.85],[-3.2,portrait?8.88:9.05,-.70]],porch:[[-.10,4.75,4.8],[-.84,portrait?3.63:3.8,1.48]],pond:[[5.3,1.1,6.9],[3.55,portrait?-.28:-.10,3.75]]};
 const [p,t]=poses[place];return {position:new THREE.Vector3().fromArray(p),target:new THREE.Vector3().fromArray(t)};
}
function inspectPlace(place:Place|'clearing',immediate=false,finish?:()=>void){
 const pose=subjectPose(place);inspection.configure(pose.position,pose.target,place==='clearing'?.65:place==='porch'?.24:.35);
 if(immediate||reduced.matches){navigation.visit(pose.position,pose.target);finish?.();}
 else {
  // Pull away from branches before moving between nearby character perches.
  const closeRoute=camera.position.z<10&&pose.position.z<10;
  const via=closeRoute?camera.position.clone().lerp(pose.position,.5).setZ(26).setY(Math.max(camera.position.y,pose.position.y)+.5):undefined;
  navigation.transition(pose.position,pose.target,closeRoute?2.8:1.5,finish,via);
 } 
}
function orbit(yaw:number,elevation:number,zoom=1){
 if(telescopeActive)return;
 if(travelPending){routeSerial++;travelPending=false;captionMotion?.kill();gsap.set($('place-card'),{clearProps:'opacity,visibility,transform'});}
 if(navigation.transitioning){
  const distance=Math.max(1,camera.position.distanceTo(subjectPose(activePlace).target));
  navigation.cancelTransition();inspection.adoptView(camera,distance);
 }
 settleCaption();
 const pose=inspection.move(yaw,elevation,zoom);navigation.visit(pose.position,pose.target);document.body.classList.add('familiar');
}
// Begin a little outside the clearing so Enter can make the arrival feel authored.
navigation.visit(new THREE.Vector3(7.65,8.71,35.5), target);
let qualityScale = 1;
function fitCamera() {
  camera.aspect = innerWidth / innerHeight;
  // Preserve the authored horizontal silhouette on narrow displays, with room for controls.
  camera.fov = Math.max(29, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(11)) / camera.aspect)));
  camera.updateProjectionMatrix();
  fitCaption();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(renderPixelRatio()*qualityScale);
}
// Reserve extra composition space when portrait details expand. Geometry/scale stays unchanged.
function fitCaption() {
  const offset = innerWidth < 650 && !$('place-details').hidden ? 85 : 0;
  if (offset) camera.setViewOffset(innerWidth, innerHeight, 0, offset, innerWidth, innerHeight);
  else camera.clearViewOffset();
}
function setDetails(open: boolean) {
  $('place-details').hidden=!open;
  $('details-toggle').setAttribute('aria-expanded',String(open));
  fitCaption();
}
$('details-toggle').onclick=()=>setDetails($('place-details').hidden === true);
fitCamera();
addEventListener('resize',()=>{fitCamera();if(ready&&!telescopeActive){inspectPlace(activePlace,true);settleCaption();}});

// A quiet sky, using original procedural color rather than a photographic backdrop.
const skyTop={value:new THREE.Color(presets[timeOfDay].top)}, skyHorizon={value:new THREE.Color(presets[timeOfDay].horizon)};
const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms:{skyTop,skyHorizon},
  vertexShader: 'varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',
  fragmentShader: `varying vec3 vWorld; uniform vec3 skyTop; uniform vec3 skyHorizon;
  void main(){float h=normalize(vWorld).y;vec3 c=mix(skyHorizon,skyTop,smoothstep(-.06,.65,h));gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`
}));
scene.add(sky);
const hemisphere=new THREE.HemisphereLight('#b6d1e6', '#526b40', .2);scene.add(hemisphere);
const moon = new THREE.DirectionalLight('#799bea', .1);moon.position.set(-18, 9, 12);scene.add(moon);
const fill = new THREE.DirectionalLight('#b1ceff', 3.2);fill.position.set(4, 12, 6);fill.target.position.set(.7, 6, 0);scene.add(fill, fill.target);
fill.castShadow = true;fill.shadow.mapSize.set(mobile() ? 1024 : 2048, mobile() ? 1024 : 2048);
fill.shadow.radius=2;
Object.assign(fill.shadow.camera, { left: -12, right: 12, top: 15, bottom: -10, near: .1, far: 45 });
fill.shadow.bias = -.00015;fill.shadow.normalBias = .004;
const rim = new THREE.DirectionalLight('#f5b976', .3);rim.position.set(-9, 12, -5);scene.add(rim);
RectAreaLightUniformsLib.init();
function area(color: THREE.ColorRepresentation, intensity: number, w: number, h: number, p: number[], t: number[]) {
  const l = new THREE.RectAreaLight(color, intensity, w, h);l.position.fromArray(p);l.lookAt(new THREE.Vector3().fromArray(t));scene.add(l);return l;
}
const canopyArea=area(new THREE.Color().setRGB(.48,.65,1), 3.2, 7, 7, [4, 11, 6], [.7, 6.5, -.3]);
const warmArea=area(new THREE.Color().setRGB(1,.56,.27), 2, 7, 7, [-9, 12, -5], [0, 4, 0]);
const porchLight = area('#ffab58', 8, 1.2, 1.2, [-.65, 3.8, 2], [-.5, 3, 1]);
const groundArea=area('#ffba6d', 6, 2.2, 2.2, [.4, 2, 3.8], [.4, .6, 1.5]);
const windowPositions = [[.1,8.65,1.75],[-.9,5.05,1.8],[-3.65,4.95,.5],[4.35,6.95,.43],[2.25,4.1,2.35]];
const windowLights=windowPositions.map(p => {const l = new THREE.PointLight('#ffb259', .8, 3.2, 2);l.position.fromArray(p);scene.add(l);return l;});

// The asset already contains contact AO. Render once with native antialiasing.
renderer.info.autoReset=false;
let previousTime = performance.now();
const wind = {value: 0};
const foliage: THREE.Mesh[] = [];
let water: THREE.Mesh | undefined, flags: THREE.Mesh[] = [];
let waterMaterial: THREE.MeshStandardMaterial | undefined;
let model: THREE.Group | undefined;
const windowMaterials=new Map<THREE.MeshStandardMaterial,number>();
let finn:THREE.Object3D|undefined,jake:THREE.Object3D|undefined;
let fishing:ReturnType<typeof makeFishing>|undefined;
let greetingUntil=0;
let jakeIdle:ReturnType<typeof makeJakeIdle>|undefined;
let finnIdle:ReturnType<typeof makeFinnIdle>|undefined;
const driftingLeaves=makeDriftingLeaves(scene);
const life=makeLife(scene);
const loadStart = performance.now();
let loadMs = 0, modelBytes = 0;
function fail(message: string) {$('error-message').textContent = message;$('error').hidden = false;$('loading').hidden = true;}
canvas.addEventListener('webglcontextlost', e => {e.preventDefault();fail('The graphics context was interrupted. Reload to return to the clearing.');});
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
$('loading-text').textContent='Preparing the treehouse and friends…';
const cameoRequest=loader.loadAsync('/models/quiet-cameos.glb').then(value=>({value,error:null}),error=>({value:null,error}));
loader.load('/models/treehouse-collision.glb', gltf => {
  navigation.world.fromGraphNode(gltf.scene);
  navigation.collisionReady = true;
  gltf.scene.traverse(o => {if(o instanceof THREE.Mesh) {o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});
}, undefined, () => announce('Movement could not load. Reload to explore freely.'));

loader.load('/models/treehouse-runtime.glb', async gltf => {
  model = gltf.scene;
  // The authored meadow is finite. A low continuation prevents sky gaps when
  // visitors turn beyond the hero camera, while preserving the pond basin.
  const meadowFloor = new THREE.Mesh(new THREE.CircleGeometry(175, 64), new THREE.MeshStandardMaterial({color: new THREE.Color().setRGB(.116,.207,.145), roughness: 1}));
  meadowFloor.material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );','getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= 0.18;'));
  };
  meadowFloor.material.customProgramCacheKey=()=> 'landscape-local-light-v2';
  meadowFloor.name='Distant meadow continuation';
  meadowFloor.rotation.x=-Math.PI/2;meadowFloor.position.y=-.8;
  scene.add(meadowFloor);
  model.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    const semanticName=semanticNodeName(o,model!);
    o.castShadow = !/Terrain|Ground|Ridge|Water|Path|Grass|Environment/i.test(semanticName);
    o.receiveShadow = true;

    const meshMaterials = Array.isArray(o.material) ? o.material : [o.material];
    meshMaterials.forEach(m=>{if(m instanceof THREE.MeshStandardMaterial && /Window|glow|lantern/i.test(m.name) && m.emissiveIntensity>0)windowMaterials.set(m,m.emissiveIntensity);});
    if (/^Environment|^Water/i.test(semanticName)) {
      meshMaterials.forEach(m=>{
        if(!(m instanceof THREE.MeshStandardMaterial))return;
        m.onBeforeCompile=shader=>{
          // Keep the infinite canopy key off the landscape; local area lights shape the clearing.
          const lights=THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );','getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= 0.18;');
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',lights);
        };
        m.customProgramCacheKey=()=> 'landscape-local-light-v2';
      });
    }
    // At this viewing scale, tinted reflective glass avoids a second full-scene transmission pass.
    meshMaterials.forEach(m => {if(m instanceof THREE.MeshPhysicalMaterial) {m.transmission=0;if(/Window interior/i.test(m.name)){m.metalness=0;m.roughness=.5;m.specularIntensity=.1;}}});
    if (/Foliage_/i.test(semanticName)) {
      foliage.push(o);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(mat => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        mat.side = THREE.DoubleSide;
        mat.onBeforeCompile = shader => {
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace('rectAreaLight = rectAreaLights[ i ];','rectAreaLight = rectAreaLights[ i ]; rectAreaLight.color *= .8;'));
          shader.uniforms.uWindTime = wind;
          shader.vertexShader = 'varying vec3 canopyWorld;\nuniform float uWindTime;\n' + shader.vertexShader;
          shader.fragmentShader='varying vec3 canopyWorld;\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
            float canopyPatch=sin(canopyWorld.x*1.8+sin(canopyWorld.z*2.1))*sin(canopyWorld.y*1.4+canopyWorld.z);
            diffuseColor.rgb *= 1.0 + .055*canopyPatch;`);
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
            vec3 wp=(modelMatrix*vec4(position,1.)).xyz;canopyWorld=wp;
            float weight=clamp(wp.y/10.,0.,1.);
            float gust=.75+.25*sin(uWindTime*.31);
            float sway=sin(uWindTime*.9+wp.y*.45+wp.z*.18)*.055*gust;
            float flutter=sin(uWindTime*3.1+wp.x*8.+wp.z*6.)*.007;
            transformed.x += (sway+flutter)*weight/length(modelMatrix[0].xyz);
            transformed.z += (cos(uWindTime*.75+wp.y*.4)*.025*gust+flutter*.6)*weight/length(modelMatrix[2].xyz);
            transformed.y += sin(uWindTime*1.6+wp.x*3.)*.009*weight/length(modelMatrix[1].xyz);`);
        };
        mat.customProgramCacheKey = () => 'canopy-wind-v3-soft-color';
      });
    }
    if (/^Flag/i.test(semanticName)) {
      flags.push(o);
      meshMaterials.forEach(m=>{if(!(m instanceof THREE.MeshStandardMaterial))return;m.onBeforeCompile=shader=>{shader.uniforms.uWindTime=wind;shader.vertexShader='uniform float uWindTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 wp=(modelMatrix*vec4(position,1.)).xyz;
      transformed.z += sin(uWindTime*1.3+wp.x*8.+wp.y*3.)*.055*clamp((wp.x-4.35)/.85,0.,1.)/length(modelMatrix[2].xyz);`);};m.customProgramCacheKey=()=> 'flag-wind-v1';});
    }
    if (/^Water(?:_|$)/i.test(semanticName)) {
      water = o;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (m instanceof THREE.MeshStandardMaterial && /Pond reflective/i.test(m.name)) {waterMaterial = m;m.roughness = .34;m.metalness = .18;addPondSheen(m,wind);}
    }
  });
  scene.add(model);
  try {
    const result=await cameoRequest;
    if(!result.value)throw result.error;
    const cameos=result.value;
    finn=cameos.scene.getObjectByName('Finn');jake=cameos.scene.getObjectByName('Jake');
    if(!finn||!jake)throw new Error('Missing character roots');
    finn.position.set(-.94,3.165,1.31);finn.scale.setScalar(.78);finn.rotation.y=.12;
    jake.position.set(-3.23,8.704,-.78);jake.scale.setScalar(.66);jake.rotation.y=.12;
    cameos.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    // Tiny animated facial surfaces cannot use the frozen scene shadow map:
    // it imprints striped self-shadow artifacts as Jake's pose changes.
    // Keep directional/area shading and his cast shadow on the seat.
    jake?.traverse(o=>{if(o instanceof THREE.Mesh)o.receiveShadow=false;});
    scene.add(cameos.scene);
    finnIdle=makeFinnIdle(finn);jakeIdle=makeJakeIdle(jake);jakeIdle.update(0,false);
    const bmo=cameos.scene.getObjectByName('BMO');
    if(bmo){
      fishing=makeFishing(scene,bmo);fishing.update(0);
    }

  } catch {fail('Our friends could not load. Check your connection, then try again.');return;}
  updateEnvironment(1);
  renderer.shadowMap.needsUpdate = true;
  $('loading-text').textContent='Finding the light…';
  try{await renderer.compileAsync(scene,camera);}catch{fail('The scene could not be prepared. Try reloading the clearing.');return;}
  loadMs = performance.now() - loadStart;
  ready = true;
  document.body.classList.add('loaded');
  $('loading').hidden=true;
  if (returningVisitor) {
    $('welcome').hidden=true;setWelcomeInert(false);
    inspectPlace('clearing',true);
    canvas.focus({preventScroll:true});
    $('announcement').textContent = 'Welcome back. Choose a place to visit.';
  } else {
    $('welcome').hidden=false;setWelcomeInert(true);
    $('enter-world').focus({preventScroll:true});
    $('announcement').textContent = 'The treehouse is ready. Explore the lookout, pond, or porch light.';
  }

}, e => {modelBytes = Math.max(modelBytes, e.loaded);$('loading-text').textContent='Preparing the treehouse and friends…';}, () => fail('The treehouse asset could not be loaded. Check your connection and try again.'));

// Three small environmental discoveries; no large HUD or obligatory tour.
const points = [
  {id:'lookout', position:new THREE.Vector3(-3.8, 9.05, -.7)},
  {id:'pond', position:new THREE.Vector3(4.45, -.24, 4.6)},
  {id:'home-light', position:new THREE.Vector3(.34, 3.58, 1.6)}
];
const projected = new THREE.Vector3();
function announce(message: string) {$('announcement').textContent = message;}
function showToast(message: string) {
  const toast=$('toast'); toast.textContent=message; toast.classList.add('visible');
  window.clearTimeout(toastTimer); toastTimer=window.setTimeout(()=>toast.classList.remove('visible'),3200);
}
const panels = disclosurePanels([
  {button:$<HTMLButtonElement>('places'),panel:$('places-panel')},
]);
function closePlaces() { panels.close(); }
let captionMotion:gsap.core.Timeline|undefined;
let routeSerial=0;
let captionPending=false;
let travelPending=false;
function settleCaption(){
 if(!captionPending)return;
 captionPending=false;captionMotion?.kill();
 $('place-card').inert=false;
 if(reduced.matches)gsap.set($('place-card'),{clearProps:'opacity,visibility,transform'});
 else captionMotion=gsap.timeline().to($('place-card'),{autoAlpha:1,y:0,duration:.42,ease:'power2.out',clearProps:'opacity,visibility,transform'});
}
function goTo(destination:Place|'clearing',immediate=false){
 const serial=++routeSerial;captionMotion?.kill();navigation.cancelTransition();travelPending=true;
 closePlaces();canvas.focus({preventScroll:true});
 $('toast').classList.remove('visible');
 const reducedMove=reduced.matches||immediate;
 const travel=()=>{
  if(serial!==routeSerial)return;travelPending=false;
  mode=destination==='porch'?'clearing':destination;activePlace=destination;
  document.body.dataset.place=destination;telescopeActive=false;document.body.classList.remove('telescope-mode');
  document.body.classList.add('familiar');setDetails(false);
  $('return-place').hidden=destination==='clearing';$('place-card').hidden=destination==='clearing';
  $('greet').hidden=destination==='clearing';$('porch-toggle').hidden=destination!=='porch';$('ripple-again').hidden=destination!=='pond';$('telescope').hidden=destination!=='lookout';
  const copy={lookout:["JAKE’S LOOKOUT",'A good day for doing nothing.','A quiet seat above the branches.','Sit with Jake'],porch:['ON THE PORCH','One more chapter.','Finn is reading in the quiet. The bookmark can wait.','Say hello to Finn'],pond:["BMO’S POND",'A very patient fisherman.',pondCopy(),'Watch the bobber']};
  if(destination!=='clearing'){
   const [kicker,title,detail,action]=copy[destination];
   $('place-card-kicker').textContent=kicker;$('place-card-title').textContent=title;$('place-card-copy').textContent=detail;$('greet').textContent=action;
  }
  captionPending=true;$('place-card').inert=true;gsap.set($('place-card'),{autoAlpha:0,y:10});
  inspectPlace(destination,reducedMove,()=>{
   if(serial!==routeSerial)return;
   settleCaption();
   if(destination!=='clearing')discover(destination);
   announce(destination==='clearing'?'Back to the clearing.':destination==='porch'?'On the porch with Finn.':destination==='pond'?"By the pond with BMO.":"Up at Jake’s lookout.");
  });
 };
 if(reducedMove||$('place-card').hidden)travel();
 else captionMotion=gsap.timeline().to($('place-card'),{autoAlpha:0,y:5,duration:.16,ease:'power1.in'}).call(travel);
}
function reset(immediate=false) { goTo('clearing',immediate); }
const visitLookout=()=>goTo('lookout');
const visitPond=()=>goTo('pond');
$('lookout').onclick = visitLookout;
const rings: {mesh:THREE.Mesh;born:number;delay:number}[] = [];
function ripple() {
  if(rings.length>15)return;
  for(let i=0;i<3;i++) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(.955,1,80),new THREE.MeshBasicMaterial({color:'#c8f0e5',transparent:true,opacity:0,depthWrite:false,depthTest:false,side:THREE.DoubleSide}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(4.45,-.19,4.6);scene.add(mesh);rings.push({mesh,born:elapsed-(paused?.9:0),delay:i*.4});
  }
  announce('Ripples spread across the pond.');
  
}
$('pond').onclick = visitPond;
function updateLightState() {
  $('porch-toggle').setAttribute('aria-pressed',String(homeOn));$('porch-toggle').textContent=homeOn?'Porch light on':'Porch light off';
  $('light-choice-state').textContent=(homeOn?'On':'Off')+(manualPorch?' · manual until time changes':' · automatic');
  $('home-light').querySelector('.place-label')!.textContent='Finn’s porch';
}
function toggleLight() {manualPorch=true;homeOn=!homeOn;discover('porch');updateLightState();announce(homeOn?'The porch light is on.':'The porch light is dimmed.');showToast(homeOn?'Porch light on':'Porch light dimmed');}
$('home-light').onclick = visitFinn;$('porch-toggle').onclick=toggleLight;
document.querySelectorAll<HTMLButtonElement>('.place-choice').forEach(button=>button.onclick=()=>{const place=button.dataset.place;if(place==='lookout')visitLookout();else if(place==='pond')visitPond();else visitFinn();});
$('enter-world').onclick=()=>{ writeStorage('ooo-arrived','1'); $('welcome').hidden=true;setWelcomeInert(false); if(reduced.matches) inspectPlace('clearing',true); else navigation.transition(new THREE.Vector3(7.65,8.71,31.04),target,1.6,undefined,new THREE.Vector3(10,18,27)); canvas.focus({preventScroll:true});announce('Welcome home. Choose a place to visit.'); };
$('skip-arrival').onclick=()=>{ writeStorage('ooo-arrived','1'); $('welcome').hidden=true;setWelcomeInert(false); inspectPlace('clearing',true); canvas.focus({preventScroll:true}); announce('Arrival skipped. Choose a place to visit.'); };
$('telescope').onclick=()=>{
  telescopeActive=true;
  document.body.classList.add('telescope-mode');
  $('place-card-title').textContent='Through the telescope.';
  $('place-card-copy').textContent=vistaCopy[timeOfDay];drawVista($<HTMLCanvasElement>('vista'),timeOfDay);$('greet').hidden=true;
  $('telescope').hidden=true;$('return-place').focus({preventScroll:true});
  // Keep the visitor on the authored lookout perch. The lens response does the
  // focusing; a risky cut through the existing branch geometry would break the
  // promise of a comfortable, interruptible visit.
  inspectPlace('lookout',true);announce('The Candy Kingdom through the telescope.');
  showToast('Telescope view');
};
$('return-place').onclick=()=>reset();
reduced.addEventListener('change',e=>{paused=e.matches;if(e.matches){if(ready)inspectPlace(activePlace,true);settleCaption();updateEnvironment(1);}});
updateLightState();


// Drag-to-look works without locking the pointer; movement is independent of looking.
const gesture = new CameraGesture();
let sceneTap:{x:number;y:number;pointer:number}|undefined;
const lampRay=new THREE.Raycaster();
const lampHit=new THREE.Vector3();
const porchLampTarget=new THREE.Sphere(new THREE.Vector3(.34,3.58,1.60),.25);
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;sceneTap=gesture.count?undefined:{x:e.clientX,y:e.clientY,pointer:e.pointerId};gesture.start(e.pointerId,e.clientX,e.clientY);canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');canvas.focus({preventScroll:true});});
canvas.addEventListener('pointermove',e=>{
  if(!gesture.count)return;
  const change=gesture.move(e.pointerId,e.clientX,e.clientY,innerWidth,innerHeight);
  orbit(change.yaw,change.elevation,change.zoom);
});
function release(e:PointerEvent){
  if(e.type==='pointerup'&&sceneTap?.pointer===e.pointerId&&Math.hypot(e.clientX-sceneTap.x,e.clientY-sceneTap.y)<6&&ready&&!telescopeActive){
    lampRay.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);
    if(activePlace==='porch'&&lampRay.ray.intersectsSphere(new THREE.Sphere(new THREE.Vector3(-.28,3.60,1.8),.10)))$('find-snail').click();else if(lampRay.ray.intersectSphere(porchLampTarget,lampHit))visitFinn();
  }
  sceneTap=undefined;gesture.end(e.pointerId);if(!gesture.count)canvas.classList.remove('dragging');
}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
canvas.addEventListener('wheel',e=>{e.preventDefault();orbit(0,0,Math.exp(THREE.MathUtils.clamp(e.deltaY,-100,100)*.0015));},{passive:false});
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Equal','Minus'].includes(e.code)){e.preventDefault();orbit(e.code==='ArrowLeft'?-.04:e.code==='ArrowRight'?.04:0,e.code==='ArrowUp'?-.025:e.code==='ArrowDown'?.025:0,e.code==='Equal'?.94:e.code==='Minus'?1.06:1);}if(e.code==='Home'){e.preventDefault();reset();}});
addEventListener('keyup',e=>navigation.keys.delete(e.code));
addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!$('welcome').hidden){$('skip-arrival').click();return;}if(panels.close(true))return;if(!$('place-details').hidden){setDetails(false);$('details-toggle').focus();return;}if(!$('place-card').hidden){reset();return;}reset();});
function clearInput(){gesture.clear();navigation.keys.clear();canvas.classList.remove('dragging');}
addEventListener('blur',clearInput);canvas.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);

// Original, soft procedural smoke; a small atmospheric trace above the bent pipe.
const smokeCanvas=document.createElement('canvas');smokeCanvas.width=64;smokeCanvas.height=64;
const ctx=smokeCanvas.getContext('2d')!;const gradient=ctx.createRadialGradient(32,32,2,32,32,32);gradient.addColorStop(0,'rgba(205,220,232,.35)');gradient.addColorStop(.45,'rgba(173,197,219,.13)');gradient.addColorStop(1,'rgba(170,192,216,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
const smokeTexture=new THREE.CanvasTexture(smokeCanvas);
const smoke=Array.from({length:9},(_,i)=>{const m=new THREE.SpriteMaterial({map:smokeTexture,transparent:true,opacity:.18,depthWrite:false,color:'#b2c5d6'});const p=new THREE.Sprite(m);p.userData.phase=i/9;scene.add(p);return p;});
// Occasional warm fireflies stay near the pond; their motion never drives the camera.
const fireflyGeometry=new THREE.BufferGeometry();const flyPositions=new Float32Array(18*3);fireflyGeometry.setAttribute('position',new THREE.BufferAttribute(flyPositions,3));
const flyMaterial=new THREE.PointsMaterial({color:'#f1d795',size:.025,transparent:true,opacity:.6,depthWrite:false});const flies=new THREE.Points(fireflyGeometry,flyMaterial);scene.add(flies);

const gl=renderer.getContext();
const gpuInfo=gl.getExtension('WEBGL_debug_renderer_info');
const gpuRenderer=gpuInfo?gl.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
let qualityFrames:number[]=[];
const frames:number[]=[];let elapsed=0,frameCount=0,lastReport=0;let minFrame=Infinity,maxFrame=0;
function tick(){
  requestAnimationFrame(tick);
  const now=performance.now();
  const rawDt=(now-previousTime)/1000;previousTime=now;
  const dt=Math.min(rawDt,.1);
  if(document.hidden)return;
  if(!paused)elapsed+=dt;
  navigation.update(dt);
  wind.value=elapsed;
  updateEnvironment(reduced.matches?1:1-Math.exp(-dt*2));
  life.update(elapsed,presets[timeOfDay].night);
  driftingLeaves.update(elapsed);
  if(!paused){
    finnIdle?.update(elapsed,elapsed<greetingUntil);
    fishing?.update(elapsed);
    jakeIdle?.update(elapsed,activePlace==='lookout'&&elapsed<greetingUntil);
    // One clock owns every character moment.
    // Fishing owns BMO's blink and bite reaction together.
  }
  snail.update(elapsed,snailFound);
  // Character poses hold in place when paused, rather than snapping back to rest.
  for(let i=rings.length-1;i>=0;i--){const r=rings[i];const t=elapsed-r.born-r.delay;if(t>4){scene.remove(r.mesh);r.mesh.geometry.dispose();(r.mesh.material as THREE.Material).dispose();rings.splice(i,1);continue;}const scale=Math.max(.03,t*.32);r.mesh.scale.set(scale*1.3,scale*.85,1);(r.mesh.material as THREE.MeshBasicMaterial).opacity=t<0?0:Math.sin(Math.min(1,t/4)*Math.PI)*.85;}
  smoke.forEach(p=>{const a=(elapsed*.09+p.userData.phase)%1;p.position.set(2.15+a*.75,10.72+a*1.65,-.65-a*.22);p.scale.setScalar(.18+a*.55);(p.material as THREE.SpriteMaterial).opacity=Math.sin(a*Math.PI)*.24;});
  for(let i=0;i<18;i++){flyPositions[i*3]=4.4+Math.sin(i*6.1+elapsed*.16)*(1.7+.2*Math.sin(i));flyPositions[i*3+1]=.15+.45*(.5+.5*Math.sin(i*2+elapsed*.4));flyPositions[i*3+2]=4.6+Math.cos(i*3.5+elapsed*.13)*1.5;}
  fireflyGeometry.attributes.position.needsUpdate=true;flyMaterial.opacity=(.35+.12*Math.sin(elapsed*.65))*presets[timeOfDay].night;
  if(ready)points.forEach(p=>{
    projected.copy(p.position).project(camera);
    const el=$(p.id),x=(projected.x*.5+.5)*innerWidth;
    // On short landscape screens, place the pond label at its upper bank,
    // above the footer, so all three discoveries remain reachable.
    const y=(-projected.y*.5+.5)*innerHeight-(innerHeight<500&&p.id==='pond'?55:0);
    el.style.left=`${x}px`;el.style.top=`${y}px`;
    el.style.visibility=activePlace!=='clearing'||telescopeActive||projected.z>1||projected.z< -1||x<22||x>innerWidth-22||y<70||y>innerHeight-90?'hidden':'visible';
  });
  renderer.info.reset();renderer.render(scene,camera);
  // Adapt only after warm-up and sustained slow frames, with a floor and no oscillation.
  if(ready && now-loadStart>5000 && rawDt>0 && rawDt<1){
    qualityFrames.push(rawDt*1000);
    if(qualityFrames.length>=30 && qualityFrames.reduce((a,b)=>a+b,0)>=3000){
      const average=qualityFrames.reduce((a,b)=>a+b,0)/qualityFrames.length;
      if(!hdCapture && average>22 && qualityScale>.55){qualityScale=Math.max(.55,qualityScale*.8);renderer.setPixelRatio(renderPixelRatio()*qualityScale);}
      qualityFrames=[];
    }
  }
  if(ready){const ms=rawDt*1000;frames.push(ms);if(frames.length>600)frames.shift();frameCount++;minFrame=Math.min(minFrame,ms);maxFrame=Math.max(maxFrame,ms);}
  if(debug&&performance.now()-lastReport>1000){lastReport=performance.now();const sorted=[...frames].sort((a,b)=>a-b);const mean=frames.reduce((a,b)=>a+b,0)/Math.max(1,frames.length);$('diagnostics').hidden=false;$('diagnostics').textContent=JSON.stringify({candidate,activePlace,jakeAwake:jakeIdle?.awake,ambientTime:+elapsed.toFixed(3),timeOfDay,manualPorch,discovered:memory.discovered,characters:!!finn&&!!jake,ready,mode,paused,homeOn,loadMs:Math.round(loadMs),modelMB:+(modelBytes/1048576).toFixed(2),fps:+(1000/mean).toFixed(1),frameMsP95:sorted[Math.floor(sorted.length*.95)]?.toFixed(1),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,animatedCanopyPrimitives:foliage.length,animatedFlagPrimitives:flags.length,pondMaterialReady:!!waterMaterial,viewport:[innerWidth,innerHeight],dpr:renderer.getPixelRatio(),camera:camera.position.toArray().map(v=>+v.toFixed(2)),collisionReady:navigation.collisionReady,qualityScale,renderer:gpuRenderer,rings:rings.length,frames:frameCount},null,2);}
}
const tint=new THREE.Color();
tick();













function pondCopy(){return 'BMO is fishing from the bank while little fish circle the pond. '+(automaticPorch(timeOfDay)?'A moonflower opens on the far bank, glowing softly beside the lily pads. Send another ripple through its reflection.':'A pink water flower rests on the far bank. Come back after dusk to see it open.');}
function discover(place:Place){
 if(memory.discovered.includes(place))return;
 memory.discovered.push(place);writeStorage('ooo-memory',JSON.stringify(memory));updateMemory();
 
}
function updateMemory(){
 $('evening-memory').hidden=memory.discovered.length!==3;
 document.querySelectorAll<HTMLButtonElement>('.place-choice').forEach(b=>{const place=b.dataset.place==='home-light'?'porch':b.dataset.place;b.classList.toggle('discovered',memory.discovered.includes(place as Place));});
}
function visitFinn(){goTo('porch');}
$('greet').onclick=()=>{
 if(paused){showToast('Motion is paused by your reduced-motion preference.');return;}
 greetingUntil=elapsed+3.5;
 if(activePlace==='pond'){fishing?.bite(elapsed);announce('BMO has a nibble!');}
 else if(activePlace==='lookout'){jakeIdle?.greet(elapsed);announce('Jake stretches and settles back.');}
 else{finnIdle?.greet(elapsed);announce('Finn looks up from his book.');}
};
$('ripple-again').onclick=ripple;
const hourLabels={day:'Day',golden:'Golden hour',twilight:'Twilight',night:'Deep night'};
const hours:TimeOfDay[]=['day','golden','twilight','night'];
const nextHour=(time:TimeOfDay)=>hours[(hours.indexOf(time)+1)%hours.length];
setTime(timeOfDay,false);
$('time-of-day').onclick=()=>{panels.close();setTime(nextHour(timeOfDay));};
function setTime(next:TimeOfDay,persist=true){
 timeOfDay=next;memory.time=next;manualPorch=false;homeOn=automaticPorch(next);
 document.getElementById('hour-icon')!.setAttribute('href','#time-'+next);
 $('time-of-day').title=hourLabels[next]+' · next: '+hourLabels[nextHour(next)];
 $('time-of-day').setAttribute('aria-label','Time of day: '+hourLabels[next]+'. Switch to '+hourLabels[nextHour(next)]);
 document.body.dataset.time=next;
 document.querySelector('h1')!.textContent={day:'A little daylight',golden:'A golden moment',twilight:'A quiet evening',night:'Beneath the stars'}[next];
 if(persist&&!reduced.matches){
  const title=document.querySelector('h1')!;
  title.getAnimations().forEach(animation=>animation.cancel());
  title.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});
  const icon=$('time-of-day').querySelector('svg')!;
  icon.getAnimations().forEach(animation=>animation.cancel());
  icon.animate([{opacity:.3,transform:'rotate(-25deg) scale(.8)'},{opacity:1,transform:'rotate(0) scale(1)'}],{duration:450,easing:'ease-out'});
 }
 $('world').setAttribute('aria-label','Interactive treehouse · '+presets[next].label);
 if(persist){writeStorage('ooo-memory',JSON.stringify(memory));announce(presets[next].label+' · porch light automatic');}
 updateLightState();updateMemory();drawVista($<HTMLCanvasElement>('vista'),next);
 if(telescopeActive)$('place-card-copy').textContent=vistaCopy[next];else if(mode==='pond')$('place-card-copy').textContent=pondCopy();
 if(reduced.matches)updateEnvironment(1);
}
function updateEnvironment(alpha:number){
 const p=presets[timeOfDay];
 skyTop.value.lerp(tint.set(p.top),alpha);skyHorizon.value.lerp(tint.set(p.horizon),alpha);
 (scene.fog as THREE.Fog).color.lerp(tint.set(p.fog),alpha);
 fill.color.lerp(tint.set(p.key),alpha);fill.intensity=THREE.MathUtils.lerp(fill.intensity,p.power,alpha);
 hemisphere.intensity=THREE.MathUtils.lerp(hemisphere.intensity,p.ambient,alpha);
 rim.intensity=THREE.MathUtils.lerp(rim.intensity,p.rim,alpha);
 canopyArea.color.lerp(tint.set(p.key),alpha);warmArea.intensity=THREE.MathUtils.lerp(warmArea.intensity,timeOfDay==='golden'?4:2,alpha);
 groundArea.intensity=THREE.MathUtils.lerp(groundArea.intensity,automaticPorch(timeOfDay)?6:2,alpha);
 porchLight.intensity=THREE.MathUtils.lerp(porchLight.intensity,homeOn?8:0,alpha);
 renderer.toneMappingExposure=THREE.MathUtils.lerp(renderer.toneMappingExposure,p.exposure,alpha);
 windowLights.forEach(l=>l.intensity=THREE.MathUtils.lerp(l.intensity,p.windows*.8,alpha));
 windowMaterials.forEach((base,m)=>m.emissiveIntensity=THREE.MathUtils.lerp(m.emissiveIntensity,base*p.windows,alpha));
 if(waterMaterial){waterMaterial.emissive.lerp(tint.set(p.pond),alpha);waterMaterial.emissiveIntensity=.45;waterMaterial.color.lerp(tint.set(p.pond),alpha);waterMaterial.roughness=THREE.MathUtils.lerp(waterMaterial.roughness,timeOfDay==='day'?.38:.23,alpha);}
}

function setWelcomeInert(active:boolean){for(const child of $('world').children){if(child instanceof HTMLElement&&child.id!=='welcome'&&child.id!=='announcement')child.inert=active;}}
$('welcome').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const first=$('enter-world'),last=$('skip-arrival');if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});

$('find-snail').onclick=()=>{snailFound=true;showToast('A tiny friend waves hello.');announce('You found the waving snail on Finn’s railing.');};
// Explicit local review controls expose deterministic poses without a hidden automation API.
if(new URLSearchParams(location.search).has('review')){
 const panel=document.createElement('aside');panel.id='review-panel';panel.innerHTML='<label>Pose seconds <input id="review-time" type="number" value="0" min="0" max="120" step="0.5"></label><button id="review-pose">Freeze pose</button><label>Contact view <select id="review-angle"><option>Authored</option><option>Front</option><option>Left</option><option>Right</option><option>Rear</option><option>Overhead</option></select></label><label><input id="review-wire" type="checkbox"> Wireframe architecture</label><label><input id="review-foliage" type="checkbox"> Hide foliage</label>';document.body.append(panel);
 $('review-pose').onclick=()=>{elapsed=Number($<HTMLInputElement>('review-time').value)||0;paused=true;finnIdle?.update(elapsed,false);jakeIdle?.update(elapsed,false);fishing?.update(elapsed);};
 $('review-angle').onchange=()=>{
  const angle=$<HTMLSelectElement>('review-angle').value;if(angle==='Authored'){inspectPlace(activePlace,true);return;}
  const center=activePlace==='lookout'?new THREE.Vector3(-3.23,9.02,-.78):activePlace==='porch'?new THREE.Vector3(-.94,3.64,1.4):new THREE.Vector3(3.18,.11,3.2);
  const radius=activePlace==='pond'?1.8:3.2;
  const direction=angle==='Front'?[0,.6,1]:angle==='Left'?[-1,.45,.1]:angle==='Right'?[1,.45,.1]:angle==='Rear'?[0,.6,-1]:[0,1,.01];
  navigation.visit(center.clone().add(new THREE.Vector3().fromArray(direction).normalize().multiplyScalar(radius)),center);
 };
 $('review-wire').onchange=()=>model?.traverse(o=>{if(o instanceof THREE.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial)m.wireframe=$<HTMLInputElement>('review-wire').checked;}});
 $('review-foliage').onchange=()=>foliage.forEach(o=>o.visible=!$<HTMLInputElement>('review-foliage').checked);
}


// A repeatable showcase route, available only at ?demo. Ordinary entry stays interactive.
let demoTimeline:gsap.core.Timeline|undefined;
let recording:MediaRecorder|undefined;
const demoRequested=new URLSearchParams(location.search).has('demo');
const demoButton=$<HTMLButtonElement>('demo-play');demoButton.hidden=!demoRequested;
const stopDemo=()=>{if(recording?.state==='recording')recording.stop();demoTimeline?.kill();demoTimeline=undefined;document.body.classList.remove('demo-playing');demoButton.textContent='Play 42-second demo';};
demoButton.onclick=()=>{
 if(!ready)return;
 if(demoTimeline){stopDemo();return;}
 $('welcome').hidden=true;setWelcomeInert(false);writeStorage('ooo-arrived','1');
 document.body.classList.add('demo-playing');demoButton.textContent='Stop demo';
 setTime('day',false);updateEnvironment(1);goTo('clearing',true);
 demoTimeline=gsap.timeline({onComplete:stopDemo})
  .call(()=>visitFinn(),[],5).call(()=>{if(!paused)finnIdle?.greet(elapsed);},[],8)
  .call(()=>goTo('lookout'),[],13).call(()=>{if(!paused)jakeIdle?.greet(elapsed);},[],16)
  .call(()=>goTo('pond'),[],22).call(()=>{if(!paused)fishing?.bite(elapsed);},[],25)
  .call(()=>setTime('golden',false),[],29).call(()=>goTo('clearing'),[],32)
  .call(()=>setTime('twilight',false),[],37).call(()=>{},[],42);
};
canvas.addEventListener('pointerdown',stopDemo);
canvas.addEventListener('wheel',stopDemo,{passive:true});
addEventListener('keydown',e=>{if(e.key==='Escape')stopDemo();});
if(new URLSearchParams(location.search).has('capture'))document.body.classList.add('capture');

const recordButton=$<HTMLButtonElement>('demo-record');recordButton.hidden=!demoRequested;
recordButton.onclick=()=>{
 if(!ready||recording?.state==='recording')return;
 if(typeof MediaRecorder==='undefined'||!canvas.captureStream){showToast('Recording is unavailable here. Use Play demo with your screen recorder.');return;}
 stopDemo();
 const stream=canvas.captureStream(30);
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
 if(!mime){stream.getTracks().forEach(track=>track.stop());showToast('WebM recording is unavailable in this browser.');return;}
 const chunks:BlobPart[]=[];
 try{recording=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:hdCapture ? 24_000_000 : 8_000_000});}catch{stream.getTracks().forEach(track=>track.stop());showToast('Recording could not start. Try Play demo with your screen recorder.');return;}
 recording.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 recording.onstop=()=>{
  stream.getTracks().forEach(track=>track.stop());
  const url=URL.createObjectURL(new Blob(chunks,{type:mime}));
  const link=document.createElement('a');link.href=url;link.download='a-quiet-evening-in-ooo.webm';
  if(hdCapture){if(location.hostname==='127.0.0.1' && new URLSearchParams(location.search).has('saveLocal'))fetch('http://127.0.0.1:5182/capture',{method:'POST',body:new Blob(chunks,{type:mime})}).then(r=>{if(r.ok)showToast('HD recording saved to project.');}).catch(()=>showToast('Use Download HD recording to save.'));link.textContent='Download HD recording';link.style.cssText='position:fixed;top:80px;left:24px;z-index:100;background:#132e32;color:white;padding:16px';document.body.append(link);}
  else link.click();
  if(!hdCapture)setTimeout(()=>URL.revokeObjectURL(url),60_000);recording=undefined;recordButton.disabled=false;
 };
 recording.start();recordButton.disabled=true;demoButton.click();
};

// Manual navigation takes precedence over a scheduled showcase beat.
document.addEventListener('click',event=>{
 const button=(event.target as Element).closest('button');
 if(demoTimeline&&button&&button!==demoButton&&button!==recordButton)stopDemo();
},true);
