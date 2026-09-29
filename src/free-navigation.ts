import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';

/** Time-based free flight; direct look input has no trailing camera spring. */
export class FreeNavigation {
  readonly keys = new Set<string>();
  readonly world = new Octree();
  collisionReady = false;
  private yaw = 0;
  private pitch = 0;
  private sphere = new THREE.Sphere(new THREE.Vector3(), .35);
  private direction = new THREE.Vector3();
  private closest = new THREE.Vector3();
  private normal = new THREE.Vector3();
  private candidates: THREE.Triangle[] = [];
  private transitionState?: {
    fromPosition: THREE.Vector3;
    controlPosition: THREE.Vector3;
    toPosition: THREE.Vector3;
    fromQuaternion: THREE.Quaternion;
    toQuaternion: THREE.Quaternion;
    elapsed: number;
    duration: number;
    onComplete?: () => void;
  };
  readonly camera: THREE.PerspectiveCamera;
  private lower = new THREE.Vector3(-38,.75,-38);
  private upper = new THREE.Vector3(38,24,38);
  constructor(camera: THREE.PerspectiveCamera) {this.camera=camera;}
  get transitioning() { return !!this.transitionState; }
  visit(position: THREE.Vector3, target: THREE.Vector3) {
    this.transitionState=undefined;
    this.keys.clear();
    this.camera.position.copy(position);
    this.camera.lookAt(target);
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = e.y; this.pitch = e.x;
  }
  /** Start one authored camera move. A new move replaces the old one. */
  transition(position: THREE.Vector3, target: THREE.Vector3, duration=1.15, onComplete?: () => void, via?: THREE.Vector3) {
    const destination = new THREE.PerspectiveCamera();
    destination.position.copy(position);
    destination.lookAt(target);
    this.transitionState={
      fromPosition:this.camera.position.clone(),
      controlPosition:(via??this.camera.position.clone().lerp(position,.5).setY(Math.max(this.camera.position.y,position.y)+1.5)).clone(),
      toPosition:position.clone(),
      fromQuaternion:this.camera.quaternion.clone(),
      toQuaternion:destination.quaternion.clone(),
      elapsed:0,
      duration:Math.max(.01,duration),
      onComplete,
    };
    this.keys.clear();
  }
  /** Stop an authored move and make direct input the only camera writer again. */
  cancelTransition() {
    if (!this.transitionState) return;
    this.syncAngles();
    this.transitionState=undefined;
  }
  look(dx: number, dy: number) {
    this.cancelTransition();
    this.yaw -= dx * .003;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * .003, -1.48, 1.48);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
  move(right: number, up: number, forward: number, distance: number) {
    this.cancelTransition();
    if (!this.collisionReady || (!right && !up && !forward) || !distance) return;
    this.direction.set(right, up, -forward).normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw).multiplyScalar(distance);
    const steps = Math.max(1, Math.ceil(Math.abs(distance) / .15));
    this.direction.divideScalar(steps);
    for (let i = 0; i < steps; i++) {
      this.camera.position.add(this.direction);
      this.sphere.center.copy(this.camera.position);
      for (let j = 0; j < 3; j++) {
        this.candidates.length=0;
        this.world.getSphereTriangles(this.sphere,this.candidates);
        let touched=false;
        for(const triangle of this.candidates){
          triangle.closestPointToPoint(this.sphere.center,this.closest);
          this.normal.subVectors(this.sphere.center,this.closest);
          const distance=this.normal.length();
          if(distance>=this.sphere.radius)continue;
          if(distance<1e-8)triangle.getNormal(this.normal);else this.normal.divideScalar(distance);
          this.sphere.center.addScaledVector(this.normal,this.sphere.radius-distance);
          touched=true;
        }
        if(!touched)break;
      }
      this.camera.position.copy(this.sphere.center).clamp(this.lower, this.upper);
    }
  }
  update(dt: number) {
    if (this.transitionState) {
      if (this.keys.size) { this.cancelTransition(); }
      else {
        const move=this.transitionState;
        move.elapsed+=Math.min(dt,.1);
        const t=THREE.MathUtils.clamp(move.elapsed/move.duration,0,1);
        const eased=t*t*(3-2*t);
        const first=new THREE.Vector3().lerpVectors(move.fromPosition,move.controlPosition,eased);
        const second=new THREE.Vector3().lerpVectors(move.controlPosition,move.toPosition,eased);
        this.camera.position.lerpVectors(first,second,eased);
        this.camera.quaternion.slerpQuaternions(move.fromQuaternion,move.toQuaternion,eased);
        if (t>=1) {
          this.syncAngles();
          this.transitionState=undefined;
          move.onComplete?.();
        }
        return;
      }
    }
    const k = this.keys;
    const has = (...codes: string[]) => Number(codes.some(code => k.has(code)));
    this.move(has('KeyD','ArrowRight')-has('KeyA','ArrowLeft'), has('KeyE')-has('KeyQ'), has('KeyW','ArrowUp')-has('KeyS','ArrowDown'), Math.min(dt,.05)*(k.has('ShiftLeft')||k.has('ShiftRight')?9:4));
  }
  private syncAngles() {
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw=e.y; this.pitch=THREE.MathUtils.clamp(e.x,-1.48,1.48);
  }
}
