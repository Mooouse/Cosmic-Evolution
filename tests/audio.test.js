import test from 'node:test';
import assert from 'node:assert/strict';
import {GarageAudio} from '../js/audio.js';
class Param{constructor(){this.value=0;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){assert.ok(v>0);this.value=v;}setTargetAtTime(v){this.value=v;}}
class AudioNode{constructor(c,kind){this.context=c;this.kind=kind;for(const k of ['gain','frequency','detune','Q','threshold','knee','ratio','attack','release','delayTime'])this[k]=new Param();}connect(){}disconnect(){}start(time=0){assert.ok(time>=this.context.currentTime-1e-6);this.context.starts.push({kind:this.kind,time});}stop(time){assert.ok(Number.isFinite(time));}}
class Context{
 constructor(){this.currentTime=0;this.sampleRate=8000;this.destination={};this.starts=[];this.state='suspended';}
 createGain(){return new AudioNode(this,'gain');}createOscillator(){return new AudioNode(this,'oscillator');}createBiquadFilter(){return new AudioNode(this,'filter');}createDelay(){return new AudioNode(this,'delay');}createDynamicsCompressor(){return new AudioNode(this,'compressor');}createBufferSource(){return new AudioNode(this,'noise');}
 createBuffer(channels,length){const data=new Float32Array(length);return {getChannelData:()=>data};}resume(){this.state='running';}suspend(){this.state='suspended';}
}
function setup(t){const previous=globalThis.window;globalThis.window={AudioContext:Context};t.after(()=>{globalThis.window=previous;});let intervals=0;t.mock.method(globalThis,'setInterval',()=>++intervals);return {audio:new GarageAudio({music:.5,sound:.7}),intervals:()=>intervals};}
test('lo-fi scheduler plays keys, bass and drums with one timer and respects the music slider',t=>{
 const {audio,intervals}=setup(t);audio.start();audio.start();assert.equal(intervals(),1);
 for(let i=0;i<1500;i++){audio.context.currentTime=i*.04;audio.music();}assert.ok(audio.step>100);assert.ok(audio.context.starts.some(s=>s.kind==='oscillator'));assert.ok(audio.context.starts.filter(s=>s.kind==='noise').length>100);
 const step=audio.step;audio.settings.music=0;audio.music();assert.equal(audio.step,step);assert.equal(audio.musicBus.gain.value,0);audio.settings.music=.8;audio.context.currentTime+=.5;audio.music();assert.equal(audio.musicBus.gain.value,.8*.45);
});
test('platform mute and advertising pause silence lo-fi; resume avoids a burst of overdue notes',t=>{
 const {audio}=setup(t);audio.setPlatformMute(true);audio.start();assert.equal(audio.master.gain.value,0);audio.music();assert.equal(audio.step,0);audio.setPlatformMute(false);audio.music();assert.ok(audio.step>0);
 audio.pause();const step=audio.step;audio.context.currentTime=300;audio.music();assert.equal(audio.step,step);assert.equal(audio.context.state,'suspended');audio.resume();audio.music();assert.equal(audio.context.state,'running');assert.ok(audio.step-step<=1);audio.setPlatformMute(true);assert.equal(audio.master.gain.value,0);
});
