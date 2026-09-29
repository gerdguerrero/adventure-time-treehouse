import * as THREE from 'three';

export function makeSnail(scene:THREE.Scene){
  const root=new THREE.Group();root.position.set(-.28,3.5413,1.80);root.scale.setScalar(.65);scene.add(root);
  const gold=new THREE.MeshStandardMaterial({color:'#efcb86',roughness:1});
  const brown=new THREE.MeshStandardMaterial({color:'#ad6047',roughness:1});
  const ink=new THREE.MeshStandardMaterial({color:'#33231b',roughness:1});
  function ball(p:number[],s:number[],m:THREE.Material){const o=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),m);o.position.fromArray(p);o.scale.fromArray(s);root.add(o);return o;}
  ball([0,.04,0],[.13,.045,.065],gold);ball([-.03,.105,0],[.079,.082,.065],brown);
  function line(points:THREE.Vector3[],radius:number,material:THREE.Material,parent:THREE.Object3D=root){
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),48,radius,7,false),material);parent.add(mesh);return mesh;
  }
  const spiral=[];for(let i=0;i<64;i++){const a=i/63*Math.PI*3,r=.008+.050*i/63,dx=Math.cos(a)*r,dy=Math.sin(a)*r;spiral.push(new THREE.Vector3(-.03+dx,.105+dy,.065*Math.sqrt(1-(dx/.079)**2-(dy/.082)**2)+.001));}
  line(spiral,.0024,ink);
  ball([.085,.123,0],[.036,.081,.034],gold);
  for(const x of [.068,.101]){
    line([new THREE.Vector3(x,.187,0),new THREE.Vector3(x+(x<.085?-.008:.006),.237,.001)],.0045,gold);
    ball([x+(x<.085?-.008:.006),.239,.001],[.007,.008,.007],gold);
    ball([x,.162,.030],[.0045,.004,.003],ink);
  }
  line([new THREE.Vector3(.076,.146,.032),new THREE.Vector3(.085,.143,.034),new THREE.Vector3(.094,.146,.032)],.0018,ink);
  const arm=new THREE.Group();arm.position.set(.108,.1,0);root.add(arm);
  line([new THREE.Vector3(0,0,0),new THREE.Vector3(.025,.016,0),new THREE.Vector3(.031,.047,0)],.008,gold,arm);
  return {position:root.position.clone(),update(t:number,found:boolean){arm.rotation.z=found?Math.sin(t*5)*.35:0;}};
}
