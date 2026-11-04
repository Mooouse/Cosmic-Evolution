/* Phone-only input. Desktop mouse/keyboard handlers remain in game.js. */
(function(global){
 'use strict';
 function isPhone(){return (global.navigator?.maxTouchPoints||0)>0&&global.matchMedia?.('(pointer: coarse)').matches&&Math.min(global.screen?.width||global.innerWidth,global.screen?.height||global.innerHeight)<=600;}
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const angleDelta=(a,b)=>((a-b+540)%360)-180;
 function tiltVector(beta,gamma,base,angle,sensitivity=1){
  const dx=angleDelta(gamma,base.gamma),dy=angleDelta(beta,base.beta),r=angle*Math.PI/180;
  let x=dx*Math.cos(r)+dy*Math.sin(r),y=dy*Math.cos(r)-dx*Math.sin(r),len=Math.hypot(x,y);
  const power=clamp((len-2)/(20/clamp(sensitivity,.5,2)),0,1);
  return len?{x:x/len*power,y:y/len*power}:{x:0,y:0};
 }
 function create({pad,thumb,canvas,isRunning,getMode,getSensitivity,onStatus,onFallback}){
  const state={enabled:false,status:'off',neutral:null,beta:0,gamma:0,last:0,x:0,y:0,targetX:0,targetY:0,pointer:null,originX:0,originY:0,timer:null,request:0};
  const mode=()=>getMode()||'fixed';
  const now=()=>global.performance.now();
  const angle=()=>global.screen?.orientation?.angle??global.orientation??0;
  function report(status){state.status=status;onStatus?.(status);}
  function release(){state.pointer=null;state.targetX=state.targetY=state.x=state.y=0;pad.classList.remove('engaged');thumb.style.transform='translate(-50%, -50%)';}
  function reset(){release();state.neutral=null;}
  function calibrate(){state.neutral=null;state.x=state.y=0;if(state.enabled)report('calibrating');}
  function onOrientation(e){
   if(!state.enabled||!isPhone()||mode()!=='gyro'||!Number.isFinite(e.beta)||!Number.isFinite(e.gamma))return;
   state.beta=e.beta;state.gamma=e.gamma;state.last=now();
   if(!state.neutral){state.neutral={beta:e.beta,gamma:e.gamma};clearTimeout(state.timer);state.timer=null;report('ready');}
  }
  function stop(){state.request++;clearTimeout(state.timer);state.timer=null;global.removeEventListener('deviceorientation',onOrientation);state.enabled=false;reset();report('off');}
  function fallback(status){stop();onFallback?.(status);report(status);}
  async function enable(){
   if(!isPhone()||mode()!=='gyro')return false;
   const API=global.DeviceOrientationEvent;
   if(!global.isSecureContext||!API){fallback('unavailable');return false;}
   const request=++state.request;report('permission');
   try{
    // iOS requires this call to originate directly from a player's tap.
    if(typeof API.requestPermission==='function'&&await API.requestPermission()!=='granted'){if(request===state.request)fallback('denied');return false;}
    if(request!==state.request||mode()!=='gyro'||!isPhone())return false;
    state.enabled=true;state.neutral=null;state.last=0;
    global.removeEventListener('deviceorientation',onOrientation);global.addEventListener('deviceorientation',onOrientation,{passive:true});
    report('calibrating');state.timer=setTimeout(()=>{if(state.enabled&&!state.neutral)fallback('unavailable');},5000);return true;
   }catch(_){if(request===state.request)fallback('denied');return false;}
  }
  function configure(){
   const phone=isPhone();global.document.body.classList.toggle('phone-controls',phone);
   global.document.body.classList.toggle('mobile-floating',phone&&mode()==='floating');global.document.body.classList.toggle('mobile-gyro',phone&&mode()==='gyro');
   reset();if(!phone||mode()!=='gyro')stop();else if(!state.enabled)report('off');
  }
  function move(e){
   if(e.pointerId!==state.pointer)return;
   e.preventDefault();const radius=pad.getBoundingClientRect().width*.36,dx=e.clientX-state.originX,dy=e.clientY-state.originY,len=Math.hypot(dx,dy),power=clamp((len-5)/(radius-5),0,1),limit=Math.min(radius,len);
   state.targetX=len?dx/len*power:0;state.targetY=len?dy/len*power:0;
   thumb.style.transform=`translate(calc(-50% + ${len?dx/len*limit:0}px), calc(-50% + ${len?dy/len*limit:0}px))`;
  }
  canvas.addEventListener('pointerdown',e=>{
   if(!isPhone()||mode()!=='floating'||!isRunning()||e.pointerType!=='touch'||state.pointer!==null)return;
   e.preventDefault();state.pointer=e.pointerId;state.originX=e.clientX;state.originY=e.clientY;
   const r=pad.getBoundingClientRect().width/2||72;
   pad.style.setProperty('--stick-x',clamp(e.clientX,r+8,global.innerWidth-r-8)+'px');pad.style.setProperty('--stick-y',clamp(e.clientY,r+8,global.innerHeight-r-8)+'px');
   pad.classList.add('engaged');canvas.setPointerCapture(e.pointerId);move(e);
  });
  canvas.addEventListener('pointermove',move,{passive:false});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>canvas.addEventListener(type,e=>{if(e.pointerId===state.pointer)release();}));
  global.addEventListener('orientationchange',calibrate);global.screen?.orientation?.addEventListener?.('change',calibrate);
  function vector(dt){
   if(!isPhone()||!isRunning())return {x:0,y:0};
   if(mode()==='floating')return {x:state.targetX,y:state.targetY};
   if(mode()!=='gyro'||!state.enabled||!state.neutral||now()-state.last>700){state.x=state.y=0;return {x:0,y:0};}
   const v=tiltVector(state.beta,state.gamma,state.neutral,angle(),getSensitivity());const k=1-Math.exp(-Math.min(dt,.1)*12);state.x+=(v.x-state.x)*k;state.y+=(v.y-state.y)*k;
   return {x:state.x,y:state.y};
  }
  return {isPhone,configure,reset,calibrate,enable,vector,get status(){return state.status;},get enabled(){return state.enabled;}};
 }
 global.SpaceMobileControls={isPhone,tiltVector,create};
})(window);
