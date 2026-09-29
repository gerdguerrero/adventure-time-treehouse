import * as THREE from 'three';
import type { TimeOfDay } from './visit-memory.ts';
export const presets = {
 day: {label:'Day', top:'#619bbd', horizon:'#c7dbcf', fog:'#9bb8ac', key:'#fff1ce', power:3.5, ambient:1.5, rim: .35, windows:.06, pond:'#57989c', exposure:1.1, night:0},
 golden: {label:'Golden Hour', top:'#526e99', horizon:'#e3a363', fog:'#b59579', key:'#ffc179', power:3.4, ambient:.8, rim:1.5, windows:.3, pond:'#9d9470', exposure:1.08, night:0},
 twilight: {label:'Twilight', top:'#030b20', horizon:'#132d47', fog:'#0b2035', key:'#b1ceff', power:3.2, ambient:.2, rim:.3, windows:1, pond:'#184d62', exposure:1.05, night:.7},
 night: {label:'Deep Night', top:'#01030d', horizon:'#071429', fog:'#061326', key:'#7f9fcf', power:2.15, ambient:.17, rim:.12, windows:1.2, pond:'#102c4c', exposure:1, night:1},
};
/** Hand-drawn telescope vista: a separate landscape, rather than a filter on the boat. */
export function drawVista(canvas: HTMLCanvasElement, time: TimeOfDay) {
 const c=canvas.getContext('2d')!;canvas.width=900;canvas.height=900;
 const p=presets[time], sky=c.createLinearGradient(0,0,0,900);sky.addColorStop(0,p.top);sky.addColorStop(.7,p.horizon);sky.addColorStop(1,p.fog);c.fillStyle=sky;c.fillRect(0,0,900,900);
 if(time==='night'||time==='twilight') {
  for(let i=0;i<100;i++){const x=(i*173.7)%900,y=(i*79.3)%600;c.globalAlpha=.3+(i%5)*.13;c.fillStyle='#f5ecd6';c.beginPath();c.arc(x,y,i%9===0?2.4:1.1,0,Math.PI*2);c.fill();}c.globalAlpha=1;
  if(time==='night') {const stars=[[235,370],[330,280],[438,310],[485,220],[590,260],[660,190]];c.strokeStyle='#adcae37a';c.lineWidth=1.5;c.beginPath();stars.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();stars.forEach(([x,y])=>{c.fillStyle='#fff3cf';c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();});}
 }
 if(time==='day'||time==='golden'){c.fillStyle=time==='day'?'#fff5cd':'#ffda95';c.beginPath();c.arc(600,time==='day'?220:535,time==='day'?36:61,0,Math.PI*2);c.fill();}
 ['#688a88','#406767','#21494c'].forEach((color,layer)=>{c.fillStyle=(time==='night'?['#192c42','#132236','#091b2c']:time==='twilight'?['#36465d','#27394d','#162d3b']:time==='golden'?['#a68170','#795e5c','#3e5051']:[color,color,color])[layer];c.beginPath();c.moveTo(0,900);for(let x=0;x<=900;x+=10)c.lineTo(x,570+layer*83+Math.sin(x*.007+layer*2)*42+Math.sin(x*.019+layer)*18);c.lineTo(900,900);c.fill();});
 // A winding river and distant settlement make the same landscape recognizable at every hour.
 c.strokeStyle=time==='golden'?'#d4a16a':time==='day'?'#a2c6be':'#3a566a';c.lineWidth=9;c.beginPath();c.moveTo(500,668);c.bezierCurveTo(410,730,660,746,510,900);c.stroke();
 drawCandyKingdom(c,time);

}
export const vistaCopy: Record<TimeOfDay,string> = {
 day:'The Candy Kingdom: a frosting crown, wafer-cone towers and pink candy trees beyond the hills.',
 golden:'Golden light catches the Candy Kingdom’s frosting towers. A sweet little world beyond our own.',
 twilight:'The Candy Kingdom’s windows glow beneath its frosting crown. It must be nearly supper time.',
 night:'The Candy Kingdom sleeps beneath the Little Ladle. Even candy castles need a quiet night.',
};
export function makeLife(scene: THREE.Scene) {
 const birds=new THREE.Group();scene.add(birds);
 for(let i=0;i<5;i++){
  const g=new THREE.Group();const material=new THREE.MeshBasicMaterial({color:'#233d48',side:THREE.DoubleSide});
  for(const side of [-1,1]){const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(side*.16,.14,side*.34,.025);shape.quadraticCurveTo(side*.16,.075,0,-.025);const wing=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);g.add(wing);}
  birds.add(g);
 }
 const flower=new THREE.Group();flower.position.set(5.72,-.19,4.95);scene.add(flower);
 const petals:THREE.Mesh[]=[];
 const m=new THREE.MeshStandardMaterial({color:'#f0c8df',emissive:'#bb72a1',emissiveIntensity:.02,roughness:.75});
 for(let i=0;i<7;i++){const petal=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),m);const a=i*Math.PI*2/7;petal.scale.set(.07,.035,.15);petal.position.set(Math.sin(a)*.10,.025,Math.cos(a)*.10);petal.rotation.y=a;flower.add(petal);petals.push(petal);}
 const center=new THREE.Mesh(new THREE.SphereGeometry(.055,12,8),new THREE.MeshStandardMaterial({color:'#f4d68a',emissive:'#f4d68a',emissiveIntensity:.3}));center.position.y=.04;flower.add(center);
 return {update(elapsed:number,night:number){birds.visible=night<.3;birds.children.forEach((b,i)=>{b.position.set(Math.sin(elapsed*.045+i*.19)*19,12+i*.23+Math.sin(elapsed*.3+i)*.22,-12+Math.cos(elapsed*.045+i*.19)*8);b.children.forEach((w,j)=>w.rotation.y=Math.sin(elapsed*3+i)*.35*(j===0?-1:1));});petals.forEach(p=>p.scale.y=.035+night*.07);m.emissiveIntensity=.03+night*1.4;}};
}

/** Original small illustration after Ghostshrimp's Candy Kingdom establishing background.
 * Recognition anchors: tiered cream/pink keep, wafer spires, frosting cloud, candy trees.
 */
function drawCandyKingdom(c:CanvasRenderingContext2D,time:TimeOfDay){
 const night=time==='night'||time==='twilight';
 const cream=night?'#ada6b8':'#f6e4b2',pink=night?'#9d789c':'#e6a0bb',red=night?'#744b75':'#be637c';
 c.save();c.translate(450,635);
 // Candy-tree ring behind the walled keep.
 for(let i=0;i<17;i++){const x=(i-8)*28,y=40+Math.cos(i*.8)*16;c.fillStyle=night?'#665e80':'#c780ad';c.fillRect(x-2,y-32,4,38);c.beginPath();c.ellipse(x,y-39,15,23,0,0,Math.PI*2);c.fill();}
 c.fillStyle=red;c.beginPath();c.ellipse(0,52,172,43,0,0,Math.PI*2);c.fill();
 c.fillStyle=cream;c.fillRect(-153,7,306,45);c.beginPath();c.ellipse(0,7,153,22,0,0,Math.PI*2);c.fill();
 for(let i=-6;i<=6;i++){c.fillStyle=pink;c.beginPath();c.ellipse(i*23,33,7,12,0,0,Math.PI*2);c.fill();}
 const tower=(x:number,y:number,w:number,h:number,cone:boolean)=>{
  c.fillStyle=red;c.fillRect(x-w/2-4,y-h+9,w+8,h);c.fillStyle=cream;c.fillRect(x-w/2,y-h,w,h);
  c.fillStyle=pink;c.beginPath();c.ellipse(x,y-h,w/2+4,7,0,0,Math.PI*2);c.fill();
  for(let j=-1;j<=1;j++){c.fillStyle=night?'#f0ca89':red;c.beginPath();c.ellipse(x+j*w*.23,y-h*.52,3,7,0,0,Math.PI*2);c.fill();}
  if(cone){c.fillStyle=night?'#b99a82':'#d79c54';c.beginPath();c.moveTo(x-w*.65,y-h);c.lineTo(x,y-h-w*1.45);c.lineTo(x+w*.65,y-h);c.closePath();c.fill();c.strokeStyle=cream;c.lineWidth=1;for(let k=1;k<5;k++){const yy=y-h-k*w*.24,ww=w*.65*(1-k*.24/1.45);c.beginPath();c.moveTo(x-ww,yy);c.lineTo(x+ww,yy);c.stroke();}}
 };
 tower(-116,17,22,68,true);tower(112,17,23,94,true);tower(-67,5,33,91,true);tower(64,6,34,115,true);
 tower(0,10,92,70,false);tower(7,-55,62,55,false);tower(3,-105,31,81,false);
 // Wide frosting crown atop the skinny central tower.
 c.strokeStyle=red;c.lineWidth=5;for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(3,-183);c.quadraticCurveTo(i*18,-178,i*21,-207);c.stroke();}
 c.fillStyle=cream;for(let i=-3;i<=3;i++){c.beginPath();c.ellipse(i*19,-211-Math.cos(i)*10,18,15+((i+3)%3)*3,-.3,0,Math.PI*2);c.fill();}
 c.fillStyle=red;c.beginPath();c.roundRect(-13,21,26,32,[13,13,0,0]);c.fill();
 c.strokeStyle=pink;c.lineWidth=5;c.beginPath();c.moveTo(-6,54);c.bezierCurveTo(-50,85,-110,62,-122,102);c.stroke();
 for(const x of [-169,166]){c.strokeStyle=cream;c.lineWidth=3;c.beginPath();c.moveTo(x,55);c.lineTo(x,16);c.stroke();c.fillStyle='#91c5bd';c.beginPath();c.arc(x,13,10,0,Math.PI*2);c.fill();c.strokeStyle=cream;c.beginPath();c.arc(x,13,5,0,Math.PI*2);c.stroke();}
 c.restore();
}
