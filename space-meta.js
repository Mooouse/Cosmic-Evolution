/* Infinity Space: persistent daily rewards, roulette and safe away-flight planning.
   Pure deterministic helpers; rendering and platform SDK stay in game.js. */
(function(root){
 'use strict';
 const DAY_MS=86400000;
 const TAU=Math.PI*2;
 const IS_TESTER=typeof root.location?.search==='string'&&new URLSearchParams(root.location.search).get('tester')==='1';
 let testerRewardMultiplier=1;
 const BASE_PRIZE_WEIGHTS=[29,25,20,13,8,3,1.2,.8];
 function setTesterTuning({rewardMultiplier=1,trackChance=.8}={}){
  if(!IS_TESTER)return false;
  testerRewardMultiplier=clamp(Number(rewardMultiplier)||1,.1,20);
  const chance=clamp(Number(trackChance),.1,25);
  const normalized=finite(chance)?chance:.8;
  PRIZES.forEach((prize,i)=>{
   prize.weight=i===7?normalized:BASE_PRIZE_WEIGHTS[i]*(100-normalized)/99.2;
  });
  return true;
 }

 const finite=x=>Number.isFinite(x);
 const clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
 function dayIndex(now=Date.now()){
  const d=new Date(now);
  return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/DAY_MS);
 }
 function state(g){
  if(!g.daily||typeof g.daily!=='object')g.daily={};
  const d=g.daily;
  d.lastDay=finite(d.lastDay)?d.lastDay:-1;
  d.spinDay=finite(d.spinDay)?d.spinDay:-1;
  d.streak=clamp(Math.floor(Number(d.streak)||0),0,99999);
  d.claims=clamp(Math.floor(Number(d.claims)||0),0,99999);
  d.spins=clamp(Math.floor(Number(d.spins)||0),0,99999);
  d.musicWins=clamp(Math.floor(Number(d.musicWins)||0),0,99999);
  d.adSpinDay=finite(d.adSpinDay)?d.adSpinDay:-1;
  d.adSpinUsedDay=finite(d.adSpinUsedDay)?d.adSpinUsedDay:-1;
  return d;
 }
 function baseReward(g,streak){
  // Grows with progression, but does not grant free evolution matter.
  return Math.round((240+Math.min(streak,30)*85)*Math.pow(1+Math.max(0,g.tier||0),2.2)*testerRewardMultiplier);
 }
 function canClaim(g,now=Date.now()){return state(g).lastDay<dayIndex(now);}
 function canSpin(g,now=Date.now()){
  const d=state(g),day=dayIndex(now);
  return d.lastDay===day&&(d.spinDay!==day||(d.adSpinDay===day&&d.adSpinUsedDay!==day));
 }
 // One additional attempt per day, credited only by a finished rewarded ad.
 function canAdSpin(g,now=Date.now()){
  const d=state(g),day=dayIndex(now);
  return d.lastDay===day&&d.spinDay===day&&d.adSpinDay!==day;
 }
 function grantAdSpin(g,now=Date.now()){
  if(!canAdSpin(g,now))return {ok:false,reason:'unavailable'};
  const d=state(g);d.adSpinDay=dayIndex(now);
  return {ok:true};
 }
 function claim(g,now=Date.now()){
  const d=state(g),today=dayIndex(now);
  if(d.lastDay>=today)return {ok:false,reason:'claimed'};
  d.streak=d.lastDay===today-1?d.streak+1:1;
  const amount=baseReward(g,d.streak);
  g.credits=Math.min(1e290,(g.credits||0)+amount);
  d.lastDay=today;d.claims++;
  return {ok:true,amount,streak:d.streak};
 }
 const PRIZES=[
  {id:'dust-1',weight:29,mult:1,label:'Stardust'},
  {id:'dust-2',weight:25,mult:2,label:'More stardust'},
  {id:'dust-3',weight:20,mult:3,label:'Stardust cache'},
  {id:'dust-5',weight:13,mult:5,label:'Stardust chest'},
  {id:'dust-8',weight:8,mult:8,label:'Large chest'},
  {id:'dust-15',weight:3,mult:15,label:'Royal stardust'},
  {id:'dust-30',weight:1.2,mult:30,label:'Cosmic jackpot'},
  {id:'track',weight:.8,label:'Random music track'}
 ];
 function roll(g,tracks,now=Date.now(),random=Math.random){
  const d=state(g),today=dayIndex(now);
  const normal=d.spinDay!==today,bonus=d.adSpinDay===today&&d.adSpinUsedDay!==today;
  if(d.lastDay!==today||(!normal&&!bonus))return {ok:false,reason:'unavailable'};
  // Consume the appropriate entitlement before any animation/reload.
  if(normal)d.spinDay=today;else d.adSpinUsedDay=today;
  d.spins++;
  let n=clamp(Number(random())||0,0,.999999999)*100,prize=PRIZES[PRIZES.length-1];
  for(const p of PRIZES){n-=p.weight;if(n<0){prize=p;break;}}
  const amountBase=baseReward(g,d.streak);
  if(prize.id==='track'){
   const paid=(tracks||[]).filter(t=>t&&Number(t.price)>0&&t.id!=null);
   const owned=new Set(g.ownedTracks||[]);
   const available=paid.filter(t=>!owned.has(t.id));
   const collection=available.length?available:paid;
   if(!collection.length){return grantCredits(g,d,amountBase*30,'dust-30');}
   const selected=collection[Math.floor(clamp(Number(random())||0,0,.999999)*collection.length)];
   if(available.length){
    g.ownedTracks=[...new Set([...(g.ownedTracks||[]),selected.id])];
    d.musicWins++;
    return {ok:true,type:'track',track:selected,prize:prize.id};
   }
   // Collection complete: prize becomes the actual market cost of that track.
   return grantCredits(g,d,selected.price,'track-value',selected);
  }
  return grantCredits(g,d,amountBase*prize.mult,prize.id);
 }
 function grantCredits(g,d,amount,prize,track){
  amount=Math.max(0,Number(amount)||0);
  g.credits=Math.min(1e290,(g.credits||0)+amount);
  return {ok:true,type:'credits',amount,prize,track:track||null};
 }
 const length=(dx,dy)=>Math.hypot(dx,dy);
 function segmentHit(ax,ay,bx,by,h,margin=1.6){
  if(!h||!finite(h.x)||!finite(h.y)||!finite(h.r)||h.r<=0)return false;
  // Normalize first; giant black holes can have radii beyond safe square magnitudes.
  const r=h.r*margin;
  const x=(ax-h.x)/r,y=(ay-h.y)/r,u=(bx-ax)/r,v=(by-ay)/r;
  const denom=u*u+v*v;
  const t=denom>0?clamp(-(x*u+y*v)/denom,0,1):0;
  return length(x+u*t,y+v*t)<1;
 }
 function safeStep(x,y,heading,distance,holes,radius){
  if(!distance)return {x,y,angle:heading,avoided:false};
  const obstacles=(holes||[]).filter(h=>h&&finite(h.x)&&finite(h.y)&&finite(h.r)&&h.r>0);
  let attempts=0;
  // Tangent and outward-turn candidates preserve useful forward progress.
  const turns=[0,.20,-.20,.45,-.45,.75,-.75,1.08,-1.08,1.42,-1.42,1.75,-1.75,2.2,-2.2,Math.PI];
  for(let div=0;div<=3;div++){
   const stride=distance/Math.pow(2,div);
   for(const turn of turns){
    const angle=heading+turn;
    const nx=x+Math.cos(angle)*stride,ny=y+Math.sin(angle)*stride;
    if(!finite(nx)||!finite(ny))continue;
    if(!obstacles.some(h=>segmentHit(x,y,nx,ny,h,1.55+radius/Math.max(h.r,.00001)))){
     return {x:nx,y:ny,angle,avoided:turn!==0||div!==0};
    }
    attempts++;
   }
  }
  // Never teleport out of a singularity or cross an event horizon unattended.
  return {x,y,angle:heading,avoided:true,blocked:attempts>0};
 }
 function planDrift({x,y,heading=0,speed=0,seconds=0,radius=1,holes=[],maxHours=12}){
  const effective=clamp(Number(seconds)||0,0,maxHours*3600);
  if(!finite(x)||!finite(y)||!finite(speed)||effective<30)
   return {x,y,heading,seconds:0,path:[[x,y]],avoided:0,distance:0};
  const count=Math.min(180,Math.max(2,Math.ceil(effective/180)));
  const segmentSeconds=effective/count;
  const path=[[x,y]];let angle=heading,avoided=0,total=0;
  for(let i=0;i<count;i++){
   // Slow, consistent motion with mild stellar drift, no extra boosts.
   const distance=clamp(speed*segmentSeconds*.24,0,1e250);
   const desired=angle+Math.sin(i*.47+heading)*.075;
   const step=safeStep(x,y,desired,distance,holes,radius);
   if(step.avoided)avoided++;
   const dist=length(step.x-x,step.y-y);
   if(!finite(dist))break;
   total+=dist;x=step.x;y=step.y;
   angle=step.avoided?step.angle:desired;
   path.push([x,y]);
  }
  return {x,y,heading:angle,seconds:effective,path,avoided,distance:total};
 }
 function addRoute(previous,newPoints,maxPoints=1400){
  const route=Array.isArray(previous)?previous.filter(p=>Array.isArray(p)&&p.length===2&&p.every(finite)):[];
  for(const p of newPoints||[]){
   if(!p||!p.every(finite))continue;
   if(route.length&&route[route.length-1][0]===p[0]&&route[route.length-1][1]===p[1])continue;
   route.push([p[0],p[1]]);
  }
  while(route.length>maxPoints){
   const reduced=[route[0]];
   for(let i=2;i<route.length-1;i+=2)reduced.push(route[i]);
   reduced.push(route[route.length-1]);
   route.splice(0,route.length,...reduced);
  }
  return route;
 }
 function driftReward(required,matter,seconds){
  const r=Math.max(0,Number(required)||0),m=Math.max(0,Number(matter)||0);
  // Around 90 minutes unattended can complete a form; never exceed 100%.
  return Math.max(0,Math.min(r-m,r*(seconds/5400)));
 }
 root.SpaceMeta={dayIndex,state,canClaim,canSpin,canAdSpin,grantAdSpin,claim,roll,PRIZES,baseReward,setTesterTuning,
  segmentHit,safeStep,planDrift,addRoute,driftReward};
})(typeof window!=='undefined'?window:globalThis);
