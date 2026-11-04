'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('mobile-controls.js','utf8');
function make(phone=true){
 const listeners={},canvasEvents={},classes=new Set();let clock=1000,timer=null,mode='gyro',running=true,sensitivity=1,fallback=null,requests=0;
 const global={navigator:{maxTouchPoints:phone?5:0},matchMedia:()=>({matches:phone}),screen:{width:390,height:844,orientation:{angle:0,addEventListener(){}}},innerWidth:390,innerHeight:844,isSecureContext:true,performance:{now:()=>clock},document:{body:{classList:{toggle(c,on){on?classes.add(c):classes.delete(c)}}}},DeviceOrientationEvent:{requestPermission:async()=>{requests++;return 'granted'}},addEventListener(n,fn){listeners[n]=fn},removeEventListener(n,fn){if(listeners[n]===fn)delete listeners[n]}};
 const context={window:global,setTimeout(fn){timer=fn;return 1},clearTimeout(){timer=null}};vm.runInNewContext(source,context);
 const pad={classList:{add(c){classes.add(c)},remove(c){classes.delete(c)}},style:{setProperty(){}},getBoundingClientRect:()=>({width:144})},thumb={style:{}},canvas={addEventListener(n,fn){canvasEvents[n]=fn},setPointerCapture(){}};
 const controller=global.SpaceMobileControls.create({pad,thumb,canvas,isRunning:()=>running,getMode:()=>mode,getSensitivity:()=>sensitivity,onFallback:s=>{fallback=s;mode='fixed'},onStatus(){}});
 return {global,controller,listeners,canvasEvents,classes,get requests(){return requests},get fallback(){return fallback},get mode(){return mode},set mode(v){mode=v},set running(v){running=v},advance(t){clock+=t},timeout(){timer?.()}};
}
(async()=>{
 const desktop=make(false);assert.equal(await desktop.controller.enable(),false);assert.equal(desktop.requests,0);assert.equal(desktop.listeners.deviceorientation,undefined);
 const s=make();s.controller.configure();assert.equal(s.requests,0,'Do not ask for permission automatically');await s.controller.enable();assert.equal(s.requests,1);s.listeners.deviceorientation({beta:null,gamma:null});assert.equal(s.controller.status,'calibrating');
 s.listeners.deviceorientation({beta:40,gamma:5});assert.equal(s.controller.status,'ready');assert.equal(s.controller.vector(.1).x,0);
 s.listeners.deviceorientation({beta:40,gamma:25});let v=s.controller.vector(.1);assert.ok(v.x>.4&&Math.abs(v.y)<.001);
 s.controller.calibrate();s.listeners.deviceorientation({beta:40,gamma:25});assert.equal(s.controller.vector(.1).x,0);
 s.global.screen.orientation.angle=90;s.controller.calibrate();s.listeners.deviceorientation({beta:40,gamma:5});s.listeners.deviceorientation({beta:60,gamma:5});v=s.controller.vector(.1);assert.ok(v.x>.4&&Math.abs(v.y)<.001,'Landscape axes rotate');
 s.advance(800);assert.equal(s.controller.vector(.1).x,0,'Stale data cannot steer');s.running=false;assert.equal(s.controller.vector(.1).y,0);s.running=true;
 const denied=make();denied.global.DeviceOrientationEvent.requestPermission=async()=> 'denied';assert.equal(await denied.controller.enable(),false);assert.equal(denied.mode,'fixed');assert.equal(denied.fallback,'denied');
 const missing=make();await missing.controller.enable();missing.timeout();assert.equal(missing.mode,'fixed');assert.equal(missing.fallback,'unavailable');
 const f=make();f.mode='floating';f.controller.configure();const event=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',preventDefault(){}});f.canvasEvents.pointerdown(event(1,100,300));assert.equal(f.controller.vector(.1).x,0);f.canvasEvents.pointermove(event(1,200,300));assert.equal(f.controller.vector(.1).x,1);f.canvasEvents.pointerdown(event(2,50,50));f.canvasEvents.pointermove(event(2,0,0));assert.equal(f.controller.vector(.1).x,1);f.canvasEvents.pointercancel(event(1,200,300));assert.equal(f.controller.vector(.1).x,0);
 console.log('PASS: phone-only activation, explicit permission, calibration, landscape axes, stale sensor cutoff, denial/timeout fallback, floating-stick ownership and cancellation');
})().catch(e=>{console.error(e);process.exitCode=1});
