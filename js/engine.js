import { CARS, SHIPS } from './vehicles.js?v=0.2.0';
import {inside,surfacePoints,strokeRadius} from './surface.js?v=0.2.0';
const coverageCache=new WeakMap();

export const SAVE_KEY = 'garage-evolution.save.v1';
export const OFFLINE_CAP = 8 * 3600;
export const GARAGES = [
  ['backyard','earth',0,180,0,0,'#dca36f',27,35],
  ['route66','earth',1,650,9000,16,'#d98858',23,47],
  ['harbor','earth',2,2400,85000,35,'#6cbdc4',47,30],
  ['alpine','earth',3,8500,650000,65,'#81a4da',51,42],
  ['tokyo','earth',4,32000,4800000,100,'#bd8ae2',85,45],
  ['desert','earth',5,125000,28000000,150,'#d6b176',62,56],
  ['riviera','earth',6,480000,150000000,220,'#6bd6c6',50,49],
  ['apex','earth',7,1900000,800000000,300,'#d2bd70',34,64],
  ['moon','space',0,8000000,4200000000,400,'#aebace',12,62],
  ['mercury','space',1,34000000,23000000000,500,'#b99580',23,35],
  ['venus','space',2,150000000,125000000000,620,'#e2bb77',33,65],
  ['mars','space',3,650000000,700000000000,750,'#d98570',44,39],
  ['jupiter','space',4,2900000000,3800000000000,900,'#d2ac86',56,61],
  ['saturn','space',5,13000000000,21000000000000,1100,'#c7b78c',69,32],
  ['uranus','space',6,60000000000,115000000000000,1300,'#81d0d4',79,62],
  ['neptune','space',7,280000000000,650000000000000,1550,'#6c8ed9',89,36],
  ['titan','space',8,1300000000000,3500000000000000,1800,'#d4a66c',65,77],
].map(([id,world,tier,reward,cost,contracts,color,x,y], index)=>({id,world,tier,reward,cost,contracts,color,x,y,index}));

export const TASKS = ['wash','rust','wheel','engine','paint'];
export const PAINTS = ['#c9d1ce','#b94f3f','#447f91','#648d72','#bca35c','#7865a0','#222c36','#e7dfca'];
export const ACHIEVEMENTS = [
 ['first','manual',1,250],['washed10','washed',10,1200],['rust1000','rust',1000,4000],
 ['mechanic','engines',25,18000],['wheels','wheels',50,45000],['painter','painted',50,65000],
 ['fleet','restored',100,100000],['collector','discovered',50,250000],['robots','robotsBought',10,500000],
 ['empire','garages',8,3000000],['space','ships',1,10000000],['million','earned',1000000,100000],
 ['devoted','dailyClaims',7,3000000],['evolution','prestiges',1,100000],['master','restored',1000,100000000],
 ['all','discovered',200,5000000000],['planets','garages',17,1000000000000],['veteran','playSeconds',86400,20000000],
].map(([id,stat,target,reward])=>({id,stat,target,reward}));

const counters = ['manual','restored','washed','rust','wheels','engines','painted','ships','robotsBought','earned','spent','offlineEarned','autoEarned','dailyClaims','prestiges','playSeconds','adsWatched','perfectHits'];
export function newGarage(owned=false) { return {owned,tools:[1,1,1,1,1],robots:0,robotLevel:1,autoProgress:0,autoSerial:0,completed:0,earnings:0,job:null}; }
export function newGame(now=Date.now()) {
  const s = {version:1,money:300,runEarned:0,prestige:0,active:0,settings:{language:'en',sound:.65,music:.3,reducedMotion:false},garages:GARAGES.map((g,i)=>newGarage(i===0)),stats:Object.fromEntries(counters.map(k=>[k,0])),collection:{},claimed:[],daily:{lastDay:null,streak:0},lastSeen:now,started:now,serial:0,receipt:null,tutorial:true};
  createJob(s,0); return s;
}
export function rng(seed) { let x=seed|0;return ()=>{x=(Math.imul(x,1664525)+1013904223)|0;return (x>>>0)/4294967296;}; }
export function vehicleById(id) { return [...CARS,...SHIPS].find(v=>v.id===id); }
export function multiplier(s) { return 1 + s.prestige * .25; }
export function reward(s,index=s.active) { return Math.round(GARAGES[index].reward*multiplier(s)); }
export function pool(index) {const g=GARAGES[index]; return (g.world==='earth'?CARS:SHIPS).filter(v=>v.tier===g.tier);}
export function createJob(s,index=s.active) {
  const g=s.garages[index]; if (!g?.owned || g.job) return g?.job;
  const vehicles=pool(index), serial=s.serial++, vehicle=vehicles[g.completed%vehicles.length];
  const random=rng(serial*1009+index*7919+42);
  const required=[true,true,random()>.2,random()>.3,random()>.25];
  if(serial===0) required.fill(true);
  g.job={id:`${s.started}-${serial}`,vehicleId:vehicle.id,required,progress:[0,0,0,0,0],cells:{wash:[],rust:[],paint:[]},color:vehicle.color||PAINTS[0],bolts:[],engineHits:0,started:Date.now()};
  discover(s,vehicle.id); return g.job;
}
export function discover(s,id,completed=0) { const c=s.collection[id]||(s.collection[id]={seen:0,repaired:0}); c.seen++;c.repaired+=completed; }
export function taskIndex(job) { return job.required.findIndex((r,i)=>r&&job.progress[i]<100); }
export function jobProgress(job) { if(!job)return 0;const n=job.required.filter(Boolean).length;return job.progress.reduce((a,p,i)=>a+(job.required[i]?p:0),0)/n; }
export function addMoney(s,amount,source='manual') { if(!Number.isFinite(amount)||amount<0)return;s.money+=amount;s.runEarned+=amount;s.stats.earned+=amount;if(source==='offline')s.stats.offlineEarned+=amount;if(source==='auto')s.stats.autoEarned+=amount; }
export function pay(s,amount) {if(!Number.isFinite(amount)||amount<0||s.money+1e-6<amount)return false;s.money=Math.max(0,s.money-amount);s.stats.spent+=amount;return true;}
export function toolCost(s,task,index=s.active) {return Math.round(GARAGES[index].reward*3*Math.pow(1.85,s.garages[index].tools[task]-1));}
export function upgradeTool(s,task,index=s.active) {const g=s.garages[index];if(!g?.owned||!Number.isInteger(task)||task<0||task>4||g.tools[task]>=10)return false;if(!pay(s,toolCost(s,task,index)))return false;g.tools[task]++;return true;}
export function robotCost(s,index=s.active) {return Math.round(GARAGES[index].reward*5*Math.pow(2.25,s.garages[index].robots));}
export function buyRobot(s,index=s.active) {const g=s.garages[index];if(!g?.owned||g.robots>=6||!pay(s,robotCost(s,index)))return false;g.robots++;s.stats.robotsBought++;return true;}
export function crew(g){return g.crew||Array(5).fill(g.robots);}
export function crewCount(g){return crew(g).reduce((a,b)=>a+b,0);}
export function specialistCost(s,task,index=s.active){return Math.round(GARAGES[index].reward*1.2*Math.pow(2.25,crew(s.garages[index])[task]));}
export function buySpecialist(s,task,index=s.active){
 const g=s.garages[index];if(!g?.owned||!Number.isInteger(task)||task<0||task>4||crew(g)[task]>=6||!pay(s,specialistCost(s,task,index)))return false;
 g.crew=[...crew(g)];g.crew[task]++;g.robots=Math.max(...g.crew);s.stats.robotsBought++;return true;
}
export function robotUpgradeCost(s,index=s.active) {return Math.round(GARAGES[index].reward*8*Math.pow(2,s.garages[index].robotLevel-1));}
export function upgradeRobots(s,index=s.active) {const g=s.garages[index];if(!g?.owned||!g.robots||g.robotLevel>=10)return false;const price=Math.round(GARAGES[index].reward*8*2**(g.robotLevel-1));if(!pay(s,price))return false;g.robotLevel++;return true;}
export function robotCycle(s,index) {const g=s.garages[index];const avg=g.tools.reduce((a,b)=>a+b,0)/5;return 240/(1+(g.robotLevel-1)*.2+(avg-1)*.05);}
export function garageRate(s,index) {const g=s.garages[index];return g.owned?reward(s,index)*Math.min(...crew(g))/robotCycle(s,index):0;}
export function totalRate(s) {return GARAGES.reduce((n,g)=>n+garageRate(s,g.index),0);}
export function brush(s,type,cell,index=s.active) {
 const g=s.garages[index],j=g?.job,ti=TASKS.indexOf(type);if(!j||ti<0||taskIndex(j)!==ti||!j.cells[type]||!Number.isInteger(cell)||cell<0||cell>=60)return false;
 if(j.cells[type].includes(cell))return false;j.cells[type].push(cell);
 const before=j.progress[ti];j.progress[ti]=Math.min(100,j.cells[type].length*(100/60)*(1+(g.tools[ti]-1)*.22));
 if(type==='rust')s.stats.rust+=j.progress[ti]-before;
 return true;
}
export function bolt(s,id,index=s.active) {const j=s.garages[index]?.job;if(!j||taskIndex(j)!==2||id!==j.bolts.length||id<0||id>=5)return false;j.bolts.push(id);j.progress[2]=j.bolts.length*20;return true;}
export function stroke(s,type,x,y,index=s.active){
 const g=s.garages[index],j=g?.job,ti=TASKS.indexOf(type),space=GARAGES[index]?.world==='space';
 if(!j||![0,1,4].includes(ti)||taskIndex(j)!==ti||![x,y].every(Number.isFinite)||!inside(x,y,space))return false;
 j.surface ||= {};const marks=j.surface[type] ||= j.cells[type].map(c=>[Math.round(100+c%12*63.33),166+Math.floor(c/12)*23,32]);
 const r=strokeRadius(g.tools[ti]);if(marks.some(([a,b,rad])=>(a-x)**2+(b-y)**2<16&&rad>=r)||marks.length>=5000)return false;
 const points=surfacePoints(space,vehicleById(j.vehicleId).surfacePoints);let covered=coverageCache.get(marks);
 if(!covered){covered=new Set();points.forEach(([px,py],i)=>{if(marks.some(([a,b,rad])=>(a-px)**2+(b-py)**2<=rad*rad))covered.add(i);});coverageCache.set(marks,covered);}
 marks.push([Math.round(x),Math.round(y),r]);points.forEach(([px,py],i)=>{if((x-px)**2+(y-py)**2<=r*r)covered.add(i);});const coverage=covered.size/points.length;
 const before=j.progress[ti];j.progress[ti]=Math.max(before,coverage>=.97?100:coverage*100);
 if(type==='rust')s.stats.rust+=j.progress[ti]-before;return true;
}
export function wheelState(j){return j.wheelRepair||{phase:'loosen',bolts:[],tightened:[]};}
export function turnBolt(s,id,index=s.active){
 const j=s.garages[index]?.job;if(!j||taskIndex(j)!==2||!Number.isInteger(id)||id<0||id>4)return false;
 const w=j.wheelRepair ||= wheelState(j);if(!['loosen','tighten'].includes(w.phase))return false;
 const bolts=w.phase==='loosen'?w.bolts:w.tightened;if(bolts.includes(id))return false;bolts.push(id);
 j.progress[2]=Math.max(j.progress[2],w.phase==='loosen'?bolts.length*5:60+bolts.length*8);
 if(bolts.length===5)w.phase=w.phase==='loosen'?'remove':'done';return true;
}
export function movePart(s,move,index=s.active){
 const j=s.garages[index]?.job;if(!j||taskIndex(j)!==2)return false;const w=j.wheelRepair ||= wheelState(j);
 if(move==='remove'&&w.phase==='remove'){w.phase='mount';j.progress[2]=Math.max(j.progress[2],40);return true;}
 if(move==='mount'&&w.phase==='mount'){w.phase='tighten';j.progress[2]=Math.max(j.progress[2],60);return true;}return false;
}
export function connectWire(s,from,to,index=s.active){
 const j=s.garages[index]?.job;if(!j||taskIndex(j)!==3||!Number.isInteger(from)||from<0||from>2||from!==to)return false;
 const wires=j.wires ||= [];if(wires.includes(from))return false;wires.push(from);return true;
}
export function testEngine(s,quality,index=s.active){const j=s.garages[index]?.job;if(!j||j.wires?.length!==3)return false;return engineHit(s,quality,index);}
export function robotAction(s,index=s.active){
 const g=s.garages[index],j=g?.job;if(!j)return null;const ti=taskIndex(j);if(ti<0)return {type:'deliver',task:ti,seconds:2};
 const count=crew(g)[ti];if(!count)return null;let act;
 if([0,1,4].includes(ti)){
  const type=TASKS[ti],marks=j.surface?.[type]||j.cells[type].map(c=>[100+c%12*63.33,166+Math.floor(c/12)*23,32]);
  const points=surfacePoints(GARAGES[index].world==='space',vehicleById(j.vehicleId).surfacePoints);const point=points.find(([x,y])=>!marks.some(([a,b,r])=>(x-a)**2+(y-b)**2<=r*r));
  if(!point)return null;act={type:'stroke',point,seconds:.72};
 }else if(ti===2){const w=wheelState(j);if(['loosen','tighten'].includes(w.phase)){const used=w.phase==='loosen'?w.bolts:w.tightened;act={type:'bolt',id:[0,1,2,3,4].find(i=>!used.includes(i)),phase:w.phase,seconds:3.4};}else act={type:'part',move:w.phase,seconds:7};
 }else{const wires=j.wires||[];act=wires.length<3?{type:'wire',id:[0,1,2].find(i=>!wires.includes(i)),seconds:8}:{type:'engine',hit:j.engineHits,seconds:8};}
 return {...act,task:ti,seconds:act.seconds/(count*(1+(g.robotLevel-1)*.2))};
}
export function performRobotAction(s,act,index=s.active){
 const j=s.garages[index]?.job;if(!j||taskIndex(j)!==act.task||!crew(s.garages[index])[act.task])return false;
 if(act.type==='stroke')return stroke(s,TASKS[act.task],...act.point,index);
 if(act.type==='bolt'&&wheelState(j).phase===act.phase)return turnBolt(s,act.id,index);
 if(act.type==='part')return movePart(s,act.move,index);
 if(act.type==='wire')return connectWire(s,act.id,act.id,index);
 if(act.type==='engine'&&j.engineHits===act.hit)return testEngine(s,.5,index);return false;
}
export function engineHit(s,quality,index=s.active) {const g=s.garages[index],j=g?.job;if(!j||taskIndex(j)!==3||!Number.isFinite(quality)||quality<0||quality>1)return false;const tolerance=.1+(g.tools[3]-1)*.012;if(Math.abs(quality-.5)>tolerance)return false;j.engineHits++;j.progress[3]=Math.max(j.progress[3],Math.min(100,j.engineHits*100/3));s.stats.perfectHits++;return true;}
export function completeJob(s,index=s.active,{automatic=false,source=automatic?'auto':'manual'}={}) {
 const g=s.garages[index],j=g?.job;if(!j||taskIndex(j)!==-1)return null;
 const amount=reward(s,index);addMoney(s,amount,source);g.earnings+=amount;g.completed++;if(!automatic)s.stats.manual++;s.stats.restored++;
 if(j.required[0])s.stats.washed++;if(j.required[2])s.stats.wheels++;if(j.required[3])s.stats.engines++;if(j.required[4])s.stats.painted++;if(GARAGES[index].world==='space')s.stats.ships++;
 s.collection[j.vehicleId].repaired++;s.receipt={id:j.id,vehicleId:j.vehicleId,amount,garage:index,doubled:false};g.job=null;return s.receipt;
}
function backgroundWork(s,index,seconds,offline){
 const g=s.garages[index];let income=0;const receipt=s.receipt;
 while(seconds>1e-6){const j=createJob(s,index),ti=taskIndex(j);if(ti<0){const r=completeJob(s,index,{automatic:!j.helped,source:offline?'offline':'auto'});income+=r.amount;g.autoSerial++;continue;}
  const n=crew(g)[ti];if(!n)break;const stageSeconds=robotCycle(s,index)/5/n,remaining=(100-j.progress[ti])/100*stageSeconds,used=Math.min(seconds,remaining),before=j.progress[ti];
  const target=remaining-used<1e-6?100:Math.min(100,before+used/stageSeconds*100);
  if([0,1,4].includes(ti)&&target<100){let attempts=0;while(j.progress[ti]<target&&attempts++<160){const act=robotAction(s,index);if(!act||!performRobotAction(s,act,index))break;}}
  else{j.progress[ti]=target;if(ti===1)s.stats.rust+=j.progress[ti]-before;}
  seconds-=used;if(taskIndex(j)===-1){const r=completeJob(s,index,{automatic:!j.helped,source:offline?'offline':'auto'});income+=r.amount;g.autoSerial++;}
 }
 createJob(s,index);s.receipt=receipt;return income;
}
export function tick(s,seconds,{offline=false,workingGarage=null}={}) {
 if(!Number.isFinite(seconds)||seconds<=0)return 0;seconds=Math.min(seconds,offline?OFFLINE_CAP:60);let income=0;
 if(!offline)s.stats.playSeconds+=seconds;
 s.garages.forEach((g,index)=>{if(!g.owned||g.robots===0||!offline&&index===workingGarage)return;if(g.crew){income+=backgroundWork(s,index,seconds,offline);return;}g.autoProgress+=seconds*g.robots/robotCycle(s,index);const count=Math.floor(g.autoProgress);if(count<1)return;g.autoProgress-=count;g.completed+=count;const earned=count*reward(s,index);g.earnings+=earned;income+=earned;addMoney(s,earned,offline?'offline':'auto');s.stats.restored+=count;s.stats.washed+=count;s.stats.rust+=count*100;s.stats.wheels+=count;s.stats.engines+=count;s.stats.painted+=count;if(GARAGES[index].world==='space')s.stats.ships+=count;
 const vehicles=pool(index);const whole=Math.floor(count/vehicles.length),extra=count%vehicles.length;
 vehicles.forEach((v,i)=>{const distance=(i-g.autoSerial%vehicles.length+vehicles.length)%vehicles.length;const n=whole+(distance<extra?1:0);if(n){const c=s.collection[v.id]||(s.collection[v.id]={seen:0,repaired:0});c.seen+=n;c.repaired+=n;}});g.autoSerial+=count;});return income;
}
export function canUnlock(s,index) {if(index<=0||index>=GARAGES.length||s.garages[index].owned)return false;return s.garages[index-1].owned&&s.garages[index-1].completed>=GARAGES[index].contracts&&s.money>=GARAGES[index].cost;}
export function unlock(s,index) {if(!canUnlock(s,index)||!pay(s,GARAGES[index].cost))return false;s.garages[index].owned=true;s.active=index;createJob(s,index);return true;}
export function travel(s,index) {if(!s.garages[index]?.owned)return false;s.active=index;createJob(s,index);return true;}
export function achievementProgress(s,a) {if(a.stat==='discovered')return Object.keys(s.collection).length;if(a.stat==='garages')return s.garages.filter(g=>g.owned).length;return s.stats[a.stat]||0;}
export function claimAchievement(s,id) {const a=ACHIEVEMENTS.find(a=>a.id===id);if(!a||s.claimed.includes(id)||achievementProgress(s,a)<a.target)return false;s.claimed.push(id);addMoney(s,a.reward,'achievement');return true;}
export function dayNumber(now=Date.now()) {const d=new Date(now);return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000);}
export function dailyInfo(s,now=Date.now()) {const day=dayNumber(now),available=s.daily.lastDay===null||day>s.daily.lastDay;const streak=s.daily.lastDay===day-1?s.daily.streak%7:0;const next=available?streak+1:s.daily.streak;const best=Math.max(...s.garages.map((g,i)=>g.owned?i:0));return {available,day,streak:next,amount:Math.round(reward(s,best)*(2+next*.75)*(next===7?2:1))};}
export function claimDaily(s,now=Date.now()) {const d=dailyInfo(s,now);if(!d.available)return 0;s.daily={lastDay:d.day,streak:d.streak};s.stats.dailyClaims++;addMoney(s,d.amount,'daily');return d.amount;}
export function prestigeGain(s) {return Math.floor(Math.sqrt(s.runEarned/10000000));}
export function canPrestige(s) {return s.garages[4].owned&&prestigeGain(s)>0;}
export function evolve(s,now=Date.now()) {if(!canPrestige(s))return false;const next=newGame(now);next.prestige=s.prestige+prestigeGain(s);next.settings={...s.settings};next.stats={...s.stats,prestiges:s.stats.prestiges+1};next.collection=structuredClone(s.collection);next.claimed=[...s.claimed];next.daily={...s.daily};next.tutorial=false;next.started=s.started;next.serial=s.serial;next.garages[0].job=null;createJob(next,0);return next;}
export function applyAdReward(s,receiptId) {const r=s.receipt;if(!r||r.id!==receiptId||r.doubled)return false;r.doubled=true;s.stats.adsWatched++;addMoney(s,r.amount,'ad');s.garages[r.garage].earnings+=r.amount;return true;}
export function serialize(s,now=Date.now()) {return JSON.stringify({...s,lastSeen:now});}
export function restore(raw,now=Date.now()) {
 const s=JSON.parse(raw);if(!s||s.version!==1||!Array.isArray(s.garages)||s.garages.length!==GARAGES.length)throw Error('Unsupported save');
 for(const key of ['money','runEarned','prestige','active','lastSeen','started','serial'])if(!Number.isFinite(s[key])||s[key]<0)throw Error('Invalid save');
 if(!Number.isInteger(s.active)||s.active>=GARAGES.length||!s.garages[s.active].owned)throw Error('Invalid garage');
 if(!s.settings||!['en','ru','es'].includes(s.settings.language)||!s.stats||!s.collection||!Array.isArray(s.claimed)||!s.daily)throw Error('Invalid save');
 for(const k of counters)if(!Number.isFinite(s.stats[k])||s.stats[k]<0)throw Error('Invalid stats');
 for(const k of ['sound','music'])if(!Number.isFinite(s.settings[k])||s.settings[k]<0||s.settings[k]>1)throw Error('Invalid settings');
 for(const [i,g] of s.garages.entries()){
   if(!Array.isArray(g.tools)||g.tools.length!==5||g.tools.some(n=>!Number.isInteger(n)||n<1||n>10)||!Number.isInteger(g.robots)||g.robots<0||g.robots>6||!Number.isInteger(g.robotLevel)||g.robotLevel<1||g.robotLevel>10)throw Error('Invalid upgrades');
   for(const k of ['autoProgress','autoSerial','completed','earnings'])if(!Number.isFinite(g[k])||g[k]<0)throw Error('Invalid garage state');
   if(g.owned&&i>0&&!s.garages[i-1].owned)throw Error('Invalid progression');
   if(g.crew&&(!Array.isArray(g.crew)||g.crew.length!==5||g.crew.some(n=>!Number.isInteger(n)||n<0||n>6)||g.robots!==Math.max(...g.crew)))throw Error('Invalid crew');
   if(g.job){const j=g.job;if(!pool(i).some(v=>v.id===j.vehicleId)||!Array.isArray(j.progress)||j.progress.length!==5||j.progress.some(p=>!Number.isFinite(p)||p<0||p>100)||!Array.isArray(j.required)||j.required.length!==5||!j.cells||!Array.isArray(j.bolts))throw Error('Invalid job');for(const k of ['wash','rust','paint'])if(!Array.isArray(j.cells[k])||j.cells[k].some(c=>!Number.isInteger(c)||c<0||c>=60))throw Error('Invalid cells');
    if(j.surface){if(typeof j.surface!=='object'||Array.isArray(j.surface))throw Error('Invalid coating');for(const [type,marks] of Object.entries(j.surface))if(!['wash','rust','paint'].includes(type)||!Array.isArray(marks)||marks.length>5000||marks.some(m=>!Array.isArray(m)||m.length!==3||m.some(v=>!Number.isFinite(v))||m[0]<0||m[0]>900||m[1]<0||m[1]>360||m[2]<1||m[2]>80))throw Error('Invalid coating');}
    if(j.wheelRepair){const w=j.wheelRepair;if(!['loosen','remove','mount','tighten','done'].includes(w.phase)||[w.bolts,w.tightened].some(a=>!Array.isArray(a)||new Set(a).size!==a.length||a.some(n=>!Number.isInteger(n)||n<0||n>4)))throw Error('Invalid repair');}
    if(j.wires&&(!Array.isArray(j.wires)||new Set(j.wires).size!==j.wires.length||j.wires.some(n=>!Number.isInteger(n)||n<0||n>2)))throw Error('Invalid wiring');
   }
 }
 for(const [id,c] of Object.entries(s.collection))if(!vehicleById(id)||!Number.isFinite(c.seen)||!Number.isFinite(c.repaired)||c.seen<0||c.repaired<0)throw Error('Invalid collection');
 if(s.receipt&&(!vehicleById(s.receipt.vehicleId)||!Number.isFinite(s.receipt.amount)||s.receipt.amount<0||!Number.isInteger(s.receipt.garage)||!s.garages[s.receipt.garage]?.owned))throw Error('Invalid receipt');
 const elapsed=Math.max(0,(now-s.lastSeen)/1000),offlineIncome=tick(s,elapsed,{offline:true});s.lastSeen=now;createJob(s,s.active);return {state:s,offlineIncome,elapsed:Math.min(elapsed,OFFLINE_CAP)};
}
