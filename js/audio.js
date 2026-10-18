// Procedural original audio: no external files, licensed music or autoplay.
export class GarageAudio {
 constructor(settings){this.settings=settings;this.context=null;this.interval=null;this.note=0;this.paused=false;}
 setPlatformMute(muted){this.platformMuted=muted;if(this.master)this.master.gain.value=muted?0:1;}
 start(){try{if(!this.context){this.context=new (window.AudioContext||window.webkitAudioContext)();this.master=this.context.createGain();this.master.connect(this.context.destination);this.master.gain.value=this.platformMuted?0:1;}this.context.resume();if(!this.interval)this.interval=setInterval(()=>this.music(),430);}catch{}}
 tone(frequency=440,duration=.08,volume=.15,type='sine',music=false){if(!this.context||this.paused||this.platformMuted)return;const gain=this.context.createGain(),osc=this.context.createOscillator(),now=this.context.currentTime;osc.type=type;osc.frequency.value=frequency;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume*(music?this.settings.music:this.settings.sound),now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(this.master);osc.start(now);osc.stop(now+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
 click(){this.tone(320,.06,.12,'triangle');}
 work(type){this.tone(type==='wash'?900:type==='rust'?180:460,.07,.05,type==='rust'?'sawtooth':'triangle');}
 success(){[523,659,784].forEach((n,i)=>setTimeout(()=>this.tone(n,.25,.12),i*90));}
 music(){if(this.settings.music<=0||this.paused)return;const notes=[130.81,164.81,196,261.63,146.83,174.61,220,293.66,110,164.81,220,261.63,98,146.83,196,246.94];this.tone(notes[this.note++%notes.length],.75,.07,'sine',true);}
 pause(){this.paused=true;this.context?.suspend();}
 resume(){this.paused=false;this.context?.resume();}
}
