import * as THREE from 'three';

/** A bounded inspection arc around an authored subject; free flight remains separate. */
export class InspectionOrbit {
  private center = new THREE.Vector3();
  private home = new THREE.Spherical();
  private current = new THREE.Spherical();
  private yawLimit = .4;
  configure(position: THREE.Vector3, target: THREE.Vector3, yawLimit=.4) {
    this.center.copy(target);
    this.home.setFromVector3(position.clone().sub(target));
    this.current.copy(this.home); this.yawLimit=yawLimit;
  }
  /** Take over exactly where an interrupted authored camera is looking. */
  adoptView(camera:THREE.PerspectiveCamera,distance:number){
    const center=camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(Math.max(1,distance)).add(camera.position);
    this.configure(camera.position,center,.4);
  }
  move(yaw: number, elevation: number, zoom=1) {
    this.current.theta=THREE.MathUtils.clamp(this.current.theta+yaw,this.home.theta-this.yawLimit,this.home.theta+this.yawLimit);
    this.current.phi=THREE.MathUtils.clamp(this.current.phi+elevation,Math.max(.01,this.home.phi-.18),Math.min(Math.PI-.01,this.home.phi+.12));
    this.current.radius=THREE.MathUtils.clamp(this.current.radius*zoom,this.home.radius*.82,this.home.radius*1.2);
    return {position:new THREE.Vector3().setFromSpherical(this.current).add(this.center),target:this.center.clone()};
  }
}
