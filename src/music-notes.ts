import * as THREE from 'three';

/** Sparse, hand-drawn musical notes: visual humming, independent of optional audio. */
export function makeMusicNotes(scene:THREE.Scene,origin:THREE.Vector3,size=1){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const c=canvas.getContext('2d')!;
  c.strokeStyle='#fff1af';c.fillStyle='#fff1af';c.lineWidth=9;c.lineCap='round';
  c.beginPath();c.ellipse(44,91,17,12,-.35,0,Math.PI*2);c.fill();
  c.beginPath();c.moveTo(59,88);c.lineTo(59,25);c.bezierCurveTo(80,27,87,43,76,55);c.stroke();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const notes=Array.from({length:3},(_,i)=>{
    const m=new THREE.SpriteMaterial({map:texture,transparent:true,opacity:0,depthWrite:false,color:i===1?'#a8e0cc':'#ffe5a3'});
    const sprite=new THREE.Sprite(m);sprite.scale.setScalar(.25*size);scene.add(sprite);return sprite;
  });
  return {update(time:number){notes.forEach((note,i)=>{
    const age=(time+i*1.2)%9;
    note.visible=age<3.8;
    note.position.set(origin.x+(Math.sin(age*1.2+i)*.12+age*.075)*size,origin.y+age*.23*size,origin.z);
    note.material.opacity=age<3.8?Math.sin(age/3.8*Math.PI)*.82:0;
    note.material.rotation=Math.sin(age*1.4+i)*.15;
  });}};
}
