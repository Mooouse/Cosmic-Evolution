// Original procedural lo-fi: 72 BPM, swung eighths, soft electric keys,
// seventh/ninth chords, rounded bass, dusty drums and quiet vinyl texture.
// No external recording or licensed song is used.
export class GarageAudio {
 constructor(settings){this.settings=settings;this.context=null;this.interval=null;this.paused=false;this.step=0;this.nextMusicTime=0;}
 setPlatformMute(muted){this.platformMuted=muted;if(this.master)this.master.gain.setTargetAtTime(muted?0:1,this.context.currentTime,.03);}
 start(){
  try{
   if(!this.context){
    this.context=new (window.AudioContext||window.webkitAudioContext)();
    this.master=this.context.createGain();this.master.gain.value=this.platformMuted?0:1;this.master.connect(this.context.destination);
    this.musicBus=this.context.createGain();this.musicBus.gain.value=this.settings.music*.45;
    const warm=this.context.createBiquadFilter();warm.type='lowpass';warm.frequency.value=3100;warm.Q.value=.35;
    const compressor=this.context.createDynamicsCompressor();compressor.threshold.value=-20;compressor.knee.value=18;compressor.ratio.value=2.5;compressor.attack.value=.02;compressor.release.value=.3;
    this.musicBus.connect(warm);warm.connect(compressor);compressor.connect(this.master);
    this.echo=this.context.createDelay(1);this.echo.delayTime.value=.21;
    const feedback=this.context.createGain();feedback.gain.value=.2;
    const echoFilter=this.context.createBiquadFilter();echoFilter.type='lowpass';echoFilter.frequency.value=1500;
    this.echo.connect(echoFilter);echoFilter.connect(feedback);feedback.connect(this.echo);echoFilter.connect(this.musicBus);
    this.noiseBuffer=this.context.createBuffer(1,this.context.sampleRate*2,this.context.sampleRate);
    const data=this.noiseBuffer.getChannelData(0);let seed=1977;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=((seed>>>0)/4294967296)*2-1;}
    this.vinyl=this.context.createBufferSource();this.vinyl.buffer=this.noiseBuffer;this.vinyl.loop=true;
    const dust=this.context.createBiquadFilter();dust.type='lowpass';dust.frequency.value=800;
    const dustVolume=this.context.createGain();dustVolume.gain.value=.006;
    this.vinyl.connect(dust);dust.connect(dustVolume);dustVolume.connect(this.musicBus);this.vinyl.start();
    this.nextMusicTime=this.context.currentTime+.06;
   }
   this.context.resume();if(!this.interval)this.interval=setInterval(()=>this.music(),40);
  }catch{}
 }
 tone(frequency=440,duration=.08,volume=.15,type='sine',music=false){
  if(!this.context||this.paused||this.platformMuted)return;
  const gain=this.context.createGain(),osc=this.context.createOscillator(),now=this.context.currentTime;
  osc.type=type;osc.frequency.value=frequency;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume*(music?this.settings.music:this.settings.sound),now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(this.master);osc.start(now);osc.stop(now+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 click(){this.tone(320,.06,.12,'triangle');}
 work(type){this.tone(type==='wash'?900:type==='rust'?180:460,.07,.05,type==='rust'?'sawtooth':'triangle');}
 success(){[523,659,784].forEach((n,i)=>setTimeout(()=>this.tone(n,.25,.12),i*90));}
 voice(midi,time,length,volume,type='sine',detune=0,echo=false){
  const c=this.context,osc=c.createOscillator(),gain=c.createGain();osc.type=type;osc.frequency.value=440*2**((midi-69)/12);osc.detune.value=detune;
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.018);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume*.25),time+length*.35);gain.gain.exponentialRampToValueAtTime(.0001,time+length);
  osc.connect(gain);gain.connect(this.musicBus);if(echo){const send=c.createGain();send.gain.value=.14;gain.connect(send);send.connect(this.echo);osc.onended=()=>{osc.disconnect();gain.disconnect();send.disconnect();};}else osc.onended=()=>{osc.disconnect();gain.disconnect();};
  osc.start(time);osc.stop(time+length+.03);
 }
 keys(notes,time,volume=.075){notes.forEach((n,i)=>{const at=time+i*.012;this.voice(n,at,2.5,volume,'sine',i%2?4:-4,true);this.voice(n+12,at,1.1,volume*.13,'triangle',-2);});}
 noise(time,length,volume,frequency,type='highpass'){
  const c=this.context,source=c.createBufferSource(),gain=c.createGain(),filter=c.createBiquadFilter();source.buffer=this.noiseBuffer;filter.type=type;filter.frequency.value=frequency;
  gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.0001,time+length);source.connect(filter);filter.connect(gain);gain.connect(this.musicBus);source.start(time);source.stop(time+length+.01);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 kick(time){
  const c=this.context,osc=c.createOscillator(),gain=c.createGain();osc.frequency.setValueAtTime(125,time);osc.frequency.exponentialRampToValueAtTime(44,time+.13);gain.gain.setValueAtTime(.37,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.27);osc.connect(gain);gain.connect(this.musicBus);osc.start(time);osc.stop(time+.3);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 music(){
  if(!this.context)return;const now=this.context.currentTime;
  this.musicBus.gain.setTargetAtTime(this.settings.music*.45,now,.06);
  if(this.settings.music<=0||this.paused||this.platformMuted){this.nextMusicTime=now+.06;return;}
  if(this.nextMusicTime<now-.2)this.nextMusicTime=now+.03;
  const chords=[[50,57,60,64,65],[43,53,57,59,64],[48,55,59,62,64],[45,55,59,60,64]],roots=[38,31,36,33];
  while(this.nextMusicTime<now+.14){
   const step=this.step%32,bar=Math.floor(step/8),beat=step%8,at=this.nextMusicTime;
   if(beat===0)this.keys(chords[bar],at);
   if(beat===5&&bar%2===1)this.keys(chords[bar].slice(2),at,.035);
   if(beat===0||beat===4||(beat===7&&bar===3))this.kick(at);
   if(beat===2||beat===6){this.noise(at+.012,.14,.16,1300,'bandpass');this.voice(50,at+.009,.12,.055,'triangle');}
   this.noise(at,beat===7?.13:.045,beat%2?.027:.043,4700);
   if(beat===0||beat===3||beat===5)this.voice(roots[bar]+(beat===5?12:0),at+.012,beat===0?.65:.38,.19,'sine');
   if((bar===0&&beat===7)||(bar===2&&beat===5))this.voice(chords[bar][3]+12,at+.025,1.4,.035,'sine',-5,true);
   this.nextMusicTime+=(60/72)*(beat%2?.42:.58);this.step++;
  }
 }
 pause(){this.paused=true;this.context?.suspend();}
 resume(){this.paused=false;this.context?.resume();}
}
