export type SceneView = 'clearing' | 'lookout' | 'pond';
/** Shared drag and pinch tracking for mouse and touch. */
export class CameraGesture {
  private points=new Map<number,{x:number;y:number}>();
  private pinch=0;
  get count(){return this.points.size;}
  start(id:number,x:number,y:number){this.points.set(id,{x,y});this.pinch=this.distance();}
  move(id:number,x:number,y:number,width:number,height:number){
    const old=this.points.get(id);const result={yaw:0,elevation:0,zoom:1};if(!old)return result;
    this.points.set(id,{x,y});
    if(this.points.size===1){result.yaw=-(x-old.x)/Math.max(width,1)*1.8;result.elevation=-(y-old.y)/Math.max(height,1)*.65;}
    else if(this.points.size===2){const next=this.distance();if(this.pinch>0)result.zoom=this.pinch/next;this.pinch=next;}
    return result;
  }
  end(id:number){this.points.delete(id);this.pinch=this.distance();}
  clear(){this.points.clear();this.pinch=0;}
  private distance(){if(this.points.size!==2)return 0;const [a,b]=[...this.points.values()];return Math.max(8,Math.hypot(a.x-b.x,a.y-b.y));}
}
