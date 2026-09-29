import type { TimeOfDay } from './visit-memory.ts';
/** One looping source. Preset swaps stop/disconnect the previous source before starting another. */
export class Ambience {
  private context?: AudioContext;
  private source?: AudioBufferSourceNode;
  private gain?: GainNode;
  private buffers = new Map<TimeOfDay, AudioBuffer>();
  get activeSources() { return this.source ? 1 : 0; }
  get state() { return this.context?.state ?? 'not-created'; }
  stop() {
    this.source?.stop(); this.source?.disconnect(); this.source=undefined;
    this.gain?.disconnect(); this.gain=undefined;
    void this.context?.suspend().catch(()=>{});
  }
  play(time: TimeOfDay) {
    this.context ??= new AudioContext();
    const ctx=this.context;
    void ctx.resume().catch(()=>this.stop());
    this.source?.stop();this.source?.disconnect();this.gain?.disconnect();
    let buffer=this.buffers.get(time);
    if(!buffer){
      buffer=ctx.createBuffer(1,ctx.sampleRate*12,ctx.sampleRate);
      const data=buffer.getChannelData(0), night=time==='night'||time==='twilight';
      let breeze=0,phase=0;
      for(let i=0;i<data.length;i++){
        const t=i/ctx.sampleRate;
        breeze=breeze*.985+(Math.random()*2-1)*.015;
        const cycle=t%(night?3:4), pulse=night?Math.max(0,Math.sin(cycle*32)):Math.sin(Math.min(1,cycle/.65)*Math.PI)**2;
        const envelope=night?(cycle<.7?pulse*.022:0):(cycle<.65?pulse*.055:0);
        phase+=Math.PI*2*(night?2800:1700+Math.sin(cycle*9)*650)/ctx.sampleRate;
        data[i]=breeze*(time==='golden'?.22:.3)+Math.sin(phase)*envelope*(time==='golden'?.5:1);
      }
      this.buffers.set(time,buffer);
    }
    this.gain=ctx.createGain();this.gain.gain.value=.16;
    this.source=ctx.createBufferSource();this.source.buffer=buffer;this.source.loop=true;
    this.source.connect(this.gain).connect(ctx.destination);this.source.start();
  }
}
