/** A single opt-in soundtrack, independent of scene and time changes. */
export function setupMusic(button: HTMLButtonElement, offMark: HTMLElement, notify: (message:string)=>void) {
 const audio = new Audio('/audio/easy-lemon.mp3');
 audio.preload='none'; audio.loop=true; audio.volume=0.3;
 const sync=()=>{
  const playing=!audio.paused;
  button.setAttribute('aria-pressed',String(playing));
  button.setAttribute('aria-label',playing?'Pause Easy Lemon music':'Play Easy Lemon music');
  button.title=playing?'Pause music':'Play music';
  offMark.style.display=playing?'none':'';
 };
 audio.addEventListener('play',sync); audio.addEventListener('pause',sync);
 audio.addEventListener('error',()=>{audio.pause();sync();notify('Music could not load. Try again in a moment.');});
 button.addEventListener('click',async()=>{
  if(!audio.paused){audio.pause();return;}
  button.disabled=true;
  try {await audio.play(); if(document.hidden)audio.pause();}
  catch {sync();notify('Music could not start. Tap the music note to try again.');}
  finally {button.disabled=false;}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();});
 window.addEventListener('pagehide',()=>audio.pause());
 sync();
}
