/* Infiniti Space — dependency-free 2D Canvas game. No 3D / external game engines. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('universe');
// Present only complete frames. The old low-latency front buffer exposed
// intermediate clears and readbacks from the gravitational lens.
const screenCtx=canvas.getContext('2d',{alpha:false,desynchronized:false});
const frameCanvas=document.createElement('canvas');
const frameCtx=frameCanvas.getContext('2d',{alpha:false});
let ctx=screenCtx;window.SpaceI18n?.context(screenCtx);window.SpaceI18n?.context(frameCtx);
const TAU = Math.PI * 2;
// The painted black disk, its lens and its physical absorption use one radius.
const BLACK_HOLE_CORE_FRACTION = .245;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rand = (a,b) => a + Math.random()*(b-a);
const choose = a => a[Math.floor(Math.random()*a.length)];
function numberSuffix(group){
 const names=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];
 if(group<names.length)return names[group];
 // Continue through the full finite Number range instead of freezing at T.
 const index=group-names.length;
 return String.fromCharCode(97+Math.floor(index/26))+String.fromCharCode(97+index%26);
}
function fmt(value){
 if(!Number.isFinite(value))return '0';
 const n=Math.abs(value),sign=value<0?'−':'';
 if(n<10000)return Math.floor(value).toLocaleString(typeof window!=='undefined'&&window.SpaceI18n?.language||'ru-RU');
 let group=Math.floor(Math.log10(n)/3),scaled=n/10**(group*3);
 if(Number(scaled.toFixed(2))>=1000){group++;scaled=n/10**(group*3);}
 return sign+scaled.toFixed(2)+numberSuffix(group);
}
const timeFmt = sec => {let h=Math.floor(sec/3600),m=Math.floor(sec/60)%60,s=Math.floor(sec)%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`};
const TA = [
 ['Космическая пыль','Рождение материи','Каждый великий мир начинается с одной частицы.','dust','#72d8ff'],
 ['Микрометеор','Рождение материи','Собери первые осколки древнего космоса.','rock','#87caff'],
 ['Каменный обломок','Рождение материи','Гравитация становится ощутимой.','rock','#b5bfd7'],
 ['Хондрит','Рождение материи','Материя соединяется в прочное ядро.','rock','#c1b6ad'],
 ['Астероид','Рождение материи','Ты уже опасен для космической пыли.','rock','#aaa8b2'],
 ['Крупный астероид','Рождение материи','Сотни осколков образуют твой путь.','rock','#bc987d'],
 ['Планетезималь','Планетарная эра','Первые шаги к настоящей планете.','rock','#94adcc'],
 ['Карликовая планета','Планетарная эра','Вокруг ядра появляются спутники.','planet','#baa3ed'],
 ['Ледяной мир','Планетарная эра','Холодные океаны света и льда.','planet','#90deef'],
 ['Океаническая планета','Планетарная эра','Голубое сердце далёкого космоса.','planet','#3dbbdb'],
 ['Каменная планета','Планетарная эра','Горы и континенты на твоей поверхности.','planet','#79c4b2'],
 ['Газовый гигант','Планетарная эра','Потоки материи создают гигантские бури.','gas','#efbd9e'],
 ['Ледяной гигант','Планетарная эра','Мощная гравитация удерживает целые кольца.','gas','#83b7f5'],
 ['Коричневый карлик','Звёздная эра','В ядре пробуждается древнее тепло.','star','#e88978'],
 ['Красный карлик','Звёздная эра','Первый настоящий звёздный свет.','star','#ff9a73'],
 ['Звезда','Звёздная эра','Ты освещаешь космическую пустоту.','star','#ffdb90'],
 ['Красный гигант','Звёздная эра','Тысячи миров исчезают в сиянии.','star','#ff9a6d'],
 ['Сверхгигант','Звёздная эра','Свет твоего ядра виден за парсеки.','star','#8ac5ff'],
 ['Гипергигант','Звёздная эра','Вещество и энергия подчиняются тебе.','star','#a9a1ff'],
 ['Звёздная туманность','Галактическая эра','Рождение новых светил в твоих потоках.','nebula','#ac80f9'],
 ['Звёздное скопление','Галактическая эра','Ты управляешь тысячами сияющих звёзд.','cluster','#85b4ff'],
 ['Звёздная система','Галактическая эра','Планеты и орбиты вокруг общего ядра.','cluster','#82d8eb'],
 ['Протогалактика','Галактическая эра','Спиральные рукава начинают вращение.','galaxy','#ae90ff'],
 ['Спиральная галактика','Галактическая эра','Миллиарды звёзд формируют твой мир.','galaxy','#b5a1ff'],
 ['Группа галактик','Сверхмасштаб','Отдельные галактики становятся пылинками.','cluster','#a6b9ff'],
 ['Скопление галактик','Сверхмасштаб','Ты притягиваешь целые галактические миры.','cluster','#8de6f3'],
 ['Космическая паутина','Сверхмасштаб','Нити гравитации соединяют всё сущее.','web','#bf9bff'],
 ['БЕСКОНЕЧНАЯ ЧЁРНАЯ ДЫРА','Бесконечность','Поглощай всё вокруг: горизонт событий продолжает расти.','blackhole','#ffb269']
].map((a,i)=>({name:a[0],epoch:a[1],desc:a[2],type:a[3],color:a[4],required:Math.round(180+100*Math.pow(i+1,1.47))}));
// More simultaneous catches, with proportional rewards per consumed object.
const BH_FEAST=2.5,BH_REWARD_SCALE=1/BH_FEAST;
const upgrades = [
 {id:'gravity',name:'Гравитация',label:'Радиус притяжения',glyph:'◎',base:35,growth:1.26,max:80},
 {id:'speed',name:'Движение',label:'Скорость полёта',glyph:'➤',base:50,growth:1.29,max:60},
 {id:'harvest',name:'Синтез материи',label:'Бонус к поглощению',glyph:'✦',base:65,growth:1.31,max:65},
 {id:'shield',name:'Стабильность',label:'Защита от опасностей',glyph:'⬡',base:80,growth:1.28,max:45}
];
const MATERIALS={ore:{label:'Минералы',symbol:'⬡',color:'#64c7ff'},crystal:{label:'Кристаллы',symbol:'◆',color:'#48f0ff'},ice:{label:'Лёд',symbol:'❄',color:'#8df5ff'},gas:{label:'Газ',symbol:'◌',color:'#b68aff'},plasma:{label:'Плазма',symbol:'✺',color:'#ffb34d'},exotic:{label:'Экзоматерия',symbol:'✧',color:'#ec75ff'}};
const MATERIAL_KEYS=Object.keys(MATERIALS);
function stageRecipe(t=g.tier){
 // Gradually introduce one new resource every epoch. No deliberately huge mass caps.
 const types=['ore'];if(t>=4)types.push('crystal');if(t>=8)types.push('ice');
 if(t>=12)types.push('gas');if(t>=17)types.push('plasma');if(t>=22)types.push('exotic');
 const recent=types.slice(-Math.min(3,types.length));
 return recent.map((type,i)=>({type,amount:Math.max(1,Math.round((2+t*.18)*(i===0?1:.64)))}));
}
const TEST_MODE = new URLSearchParams(location.search).get('tester')==='1';
const SAVE_KEY = TEST_MODE?'cosmic-evolution-tester-save-v1':'cosmic-evolution-save-v1';
const TEST_KEY = 'cosmic-evolution-tester-v1';
const TEST_DEFAULTS = Object.freeze({speed:1,gravity:1,loot:1,zoom:1,ring:1,density:16,showStats:true});
let tester={...TEST_DEFAULTS};
try {
 const savedTester=JSON.parse(localStorage.getItem(TEST_KEY)||'null');
 if(TEST_MODE&&savedTester&&typeof savedTester==='object')for(const k in TEST_DEFAULTS)
  if(typeof savedTester[k]===typeof TEST_DEFAULTS[k])tester[k]=savedTester[k];
 if(TEST_MODE&&savedTester&&!savedTester.densityBalanceV&&tester.density===32)tester.density=16;
}catch(_){}
function saveTester(){try{localStorage.setItem(TEST_KEY,JSON.stringify({...tester,densityBalanceV:2}));}catch(_){}}

const fresh = () => ({version:1,tier:0,matter:0,credits:0,total:0,time:0,awaySince:0,drift:{route:[],seconds:0,totalDistance:0,visits:0,last:null},daily:{lastDay:-1,spinDay:-1,streak:0,claims:0,spins:0,musicWins:0},awaitingReturnEvolution:false,reviveUsed:false,collects:0,rare:0,pulses:0,losses:0,unlocks:0,stageCollects:0,stageRare:0,stagePulses:0,upgrade:{gravity:0,speed:0,harvest:0,shield:0},sound:true,particles:true,quality:1,autoQuality:false,autoQualityV:1,buyAmount:1,music:true,musicVolume:.30,soundVolume:.7,achievements:{},bestChain:0,bestiary:{},tutorialDone:false,ownedTracks:[],activeTrack:null,controlMode:'follow',flightFeel:'smooth',mobileMode:'fixed',headingAngle:0,viewZoom:1,controlV:2,worldX:0,worldY:0,mapPins:[],nextPinId:1,activePin:null,abyssConsumed:{},abyssPositions:{},freeFlights:{},flightEpoch:0,complete:false,endless:false,visited:[],discoveryDiscs:[],exploredBonus:0,endlessGrowth:0,depleted:{},depletedMacro:{},depletedCosmic:{},stageExplored:0,materials:{ore:0,crystal:0,ice:0,gas:0,plasma:0,exotic:0},rebalanceV:3});
let g = fresh();
try {const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
 if(s&&s.version===1&&Number.isFinite(s.tier)&&s.tier>=0&&s.tier<TA.length){
  g={...fresh(),...s,upgrade:{...fresh().upgrade,...s.upgrade},visited:Array.isArray(s.visited)?s.visited:[],discoveryDiscs:Array.isArray(s.discoveryDiscs)?s.discoveryDiscs.filter(d=>Array.isArray(d)&&d.length===3&&d.every(Number.isFinite)):[],exploredBonus:Number.isFinite(s.exploredBonus)?s.exploredBonus:0,depleted:s.depleted&&typeof s.depleted==='object'?s.depleted:{},depletedMacro:s.depletedMacro&&typeof s.depletedMacro==='object'?s.depletedMacro:{},depletedCosmic:s.depletedCosmic&&typeof s.depletedCosmic==='object'?s.depletedCosmic:{},materials:{...fresh().materials,...s.materials}};
  // Switch legacy automatic defaults off once; preserve subsequent manual choices.
  if(s.autoQualityV!==1){g.autoQuality=false;g.autoQualityV=1;}
  if(!Number.isFinite(s.flightEpoch))g.flightEpoch=g.time;
  // One-time control migration: old saves defaulted to 'hold/direct'. New
  // players and existing players get smooth cursor follow unless they later choose otherwise.
  if(s.controlV!==2){g.controlMode='follow';g.flightFeel='smooth';g.controlV=2;}
  // The last stage is now truly endless, including previous completed saves.
  if(g.tier===TA.length-1){g.endless=true;g.complete=true;if(!Number.isFinite(g.matter))g.matter=0;}
  // Respect the percentage of old stage progress instead of shrinking players after the rebalance.
  if(s.rebalanceV!==3){
   const oldReq=s.rebalanceV===2?Math.round(250+210*Math.pow(g.tier+1,2.18)):Math.round(110+45*Math.pow(g.tier,1.68));
   g.matter=Math.round(clamp(g.matter/oldReq,0,1)*TA[g.tier].required);
   // Existing players get a little starter material, preventing a hard lock on upgrade.
   const previous=stageRecipe(g.tier);for(const entry of previous)g.materials[entry.type]=Math.max(g.materials[entry.type]||0,Math.floor(entry.amount*.25));
   g.rebalanceV=3;
  }
 }
}catch(_){/* storage may be unavailable */}
for(const u of upgrades)g.upgrade[u.id]=Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(Number(g.upgrade[u.id])||0)));
g.buyAmount=g.buyAmount==='max'?'max':Math.max(1,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(Number(g.buyAmount)||1)));
function normaliseMapPins(value){
 if(!Array.isArray(value))return [];
 const ids=new Set();
 return value.filter(p=>p&&Number.isSafeInteger(p.id)&&p.id>0&&!ids.has(p.id)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(ids.add(p.id),true)).slice(0,64)
  .map(p=>({id:p.id,x:p.x,y:p.y,zoom:clamp(Number(p.zoom)||1,1e-155,12),name:String(p.name||'Метка').slice(0,32),color:/^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#7ddcff'}));
}
g.freeFlights=Object.fromEntries(Object.entries(g.freeFlights||{}).filter(([key,e])=>e&&[e.x,e.y,e.vx,e.vy,e.flightTime,e.r].every(Number.isFinite)&&e.r>0&&(typeof e.chunk==='string'||(e.cosmic&&Number.isFinite(e.gx)&&Number.isFinite(e.gy)))&&Number.isInteger(e.index)&&e.index>=0&&e.index<32));
g.viewZoom=Number.isFinite(g.viewZoom)?clamp(g.viewZoom,.05,10):1;
globalThis.SpaceMeta?.state(g);
if(!g.drift||typeof g.drift!=='object')g.drift={route:[],seconds:0,totalDistance:0,visits:0,last:null};
if(!Array.isArray(g.drift.route))g.drift.route=[];
g.awaySince=Number.isFinite(g.awaySince)?Math.max(0,g.awaySince):0;
g.awaitingReturnEvolution=!!g.awaitingReturnEvolution;g.reviveUsed=!!g.reviveUsed;

g.mapPins=normaliseMapPins(g.mapPins);
g.nextPinId=Math.max(1,...g.mapPins.map(p=>p.id+1));
if(!g.mapPins.some(p=>p.id===g.activePin))g.activePin=null;
let W=innerWidth,H=innerHeight,dpr=1,last=performance.now(),running=false,menuVisible=false,uiTimer=0,saveTimer=0,eventTimer=0;
// Physical size is continuous across all stages, including save/load and evolution.
// Stage boundaries are continuous: end of tier N equals start of tier N+1.
function stageFraction(){return clamp(g.matter/TA[g.tier].required,0,1);}
function radiusAt(tier,fraction){return 13*Math.pow(1.65,tier+clamp(fraction,0,1));}
// Nominal scale belongs to physics; manual camera zoom never changes forces or speed.
function physicsZoom(){const r=Math.max(1,player.r);return clamp(g.endless?(83+27*Math.log2(1+r/100))/r:Math.min(145,16+14*Math.log2(1+r/13))/r,1e-155,32);}
function canAbsorbBody(e){return g.endless||e.r<=player.r;}
function solarMass(){return Math.min(1e290,blackHoleCoreWorldRadius()/CHUNK*(9.4607304725808e12/2.95325));}
function campaignZoom(radius){return clamp(tester.zoom*(g.viewZoom||1)*Math.min(145,16+14*Math.log2(1+radius/13))/Math.max(1,radius),1e-155,32);}
function currentRadius(){
 const base=radiusAt(g.tier,stageFraction());
 if(g.tier===TA.length-1){
  // True unbounded physical growth. Absorbed mass is persistent and there is no
  // artificial cap. Logarithmic camera scaling keeps the growing horizon visible.
  const mass=Math.max(0,Math.min(1e290,Number(g.matter)||0));const bonus=Math.max(0,Number(g.endlessGrowth)||0);
  return radiusAt(g.tier,0)*Math.exp(.38*Math.log1p(mass/TA[g.tier].required)+.28*Math.log1p(bonus));
 }
 return base;
}
const initialRadius=currentRadius();
let player={x:Number.isFinite(g.worldX)?g.worldX:0,y:Number.isFinite(g.worldY)?g.worldY:0,vx:0,vy:0,r:initialRadius,targetR:initialRadius,rotation:0,shield:0,trail:[]};
// Loading a saved giant black hole must start at its correct camera scale.
// Animating from 1x to microscopic zoom would rebuild hundreds of LOD levels.
const savedZoom=g.endless?clamp(tester.zoom*(g.viewZoom||1)*(83+27*Math.log2(1+initialRadius/100))/Math.max(1,initialRadius),1e-155,2.5):campaignZoom(initialRadius);
let camera={x:player.x,y:player.y,zoom:savedZoom};
let entities=[],particles=[],shockwaves=[],texts=[],stars=[],nebula=[],energyArcs=[];let morph=null,screenFlash=0,streamTimer=0;const CHUNK=480;const loadedChunks=new Set();const visitedChunks=new Set(Array.isArray(g.visited)?g.visited:[]);if(!g.depleted||typeof g.depleted!=='object')g.depleted={};const WORLD_SEED=0x17aba37;const distantChunkCache=new Map();const MACRO_SIZE=3200,MACRO_COUNT=9;const macroCache=new Map(),macroSpriteCache=new Map(),macroLoaded=new Set();let macroEntities=[];let macroVisibleCount=0;if(!g.depletedMacro||typeof g.depletedMacro!=='object')g.depletedMacro={};
// Manual flight: the cursor must NOT steer the ship until the user holds click.
// Touch input uses the independent floating-stick surface, never mouse hover.
let keys=new Set(),pointer={x:W/2,y:H/2,active:false,down:false,type:'mouse',id:null};
const stick={active:false,id:null,x:0,y:0};let mobileControls=null;
if(!['fixed','floating','gyro','direction'].includes(g.mobileMode))g.mobileMode='fixed';
g.headingAngle=Number.isFinite(g.headingAngle)?Math.atan2(Math.sin(g.headingAngle),Math.cos(g.headingAngle)):0;
g.mobileSensitivity=clamp(Number(g.mobileSensitivity)||1,.5,2);
if(!['hold','follow','keys','direction'].includes(g.controlMode))g.controlMode='follow';
if(!['direct','smooth'].includes(g.flightFeel))g.flightFeel='smooth';
function clearFlightInput(){mobileControls?.reset();pointer.active=false;pointer.down=false;pointer.id=null;stick.active=false;stick.id=null;stick.x=stick.y=0;stick.originX=stick.originY=null;const thumb=$('stick-thumb'),pad=$('flight-stick'),marker=$('flight-marker');if(thumb)thumb.style.transform='translate(-50%, -50%)';if(pad)pad.classList.remove('engaged');if(marker)marker.classList.remove('visible');}
function updateFlightMarker(){const mark=$('flight-marker');if(!mark)return;mark.style.left=pointer.x+'px';mark.style.top=pointer.y+'px';mark.classList.toggle('visible',running&&pointer.type==='mouse'&&!['keys','direction'].includes(g.controlMode)&&(pointer.down||g.controlMode==='follow')&&!atlasVisible);}
function updateStickPosition(e){
 const pad=$('flight-stick'),rect=pad.getBoundingClientRect(),maxDist=Math.min(rect.width,rect.height)*.36;
 let dx=e.clientX-(stick.originX??rect.left+rect.width/2),dy=e.clientY-(stick.originY??rect.top+rect.height/2),len=Math.hypot(dx,dy);
 if(len>maxDist){dx*=maxDist/len;dy*=maxDist/len;len=maxDist;}
 const dead=5,power=Math.max(0,(len-dead)/(maxDist-dead));stick.x=len?dx/len*power:0;stick.y=len?dy/len*power:0;
 $('stick-thumb').style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}
function setupFlightStick(){const pad=$('flight-stick');
 pad.addEventListener('pointerdown',e=>{if(mobileControls?.isPhone()&&g.mobileMode!=='fixed')return;if(!running||stick.active||e.button!==0)return;e.preventDefault();e.stopPropagation();stick.active=true;stick.id=e.pointerId;stick.originX=e.clientX;stick.originY=e.clientY;pad.classList.add('engaged');pad.setPointerCapture(e.pointerId);updateStickPosition(e);});
 pad.addEventListener('pointermove',e=>{if(stick.active&&stick.id===e.pointerId){e.preventDefault();updateStickPosition(e);}});
 const release=e=>{if(stick.id!==e.pointerId)return;stick.active=false;stick.id=null;stick.originX=stick.originY=null;stick.x=stick.y=0;pad.classList.remove('engaged');$('stick-thumb').style.transform='translate(-50%, -50%)';};
 pad.addEventListener('pointerup',release);pad.addEventListener('pointercancel',release);pad.addEventListener('lostpointercapture',release);
}
setupFlightStick();
// Persistent, rotatable heading control shared by desktop and phone.
const headingDial=document.createElement('div');
headingDial.id='direction-control';headingDial.className='flight-direction';headingDial.tabIndex=0;
headingDial.setAttribute('role','slider');headingDial.setAttribute('aria-valuemin','0');
headingDial.setAttribute('aria-valuemax','359');
headingDial.setAttribute('aria-label','Flight heading');
headingDial.innerHTML='<div class="direction-dial-ring"><span class="direction-crosshair" aria-hidden="true"></span><svg class="direction-arrow" viewBox="0 0 100 100" aria-hidden="true"><path d="M19 50H76" stroke="currentColor" stroke-width="8" stroke-linecap="round"/><path d="M62 34L81 50L62 66" stroke="currentColor" stroke-width="8" stroke-linejoin="round" fill="none"/><circle cx="50" cy="50" r="7" fill="#f0eaff"/></svg></div><small class="direction-caption">DIRECTION</small>';
$('hud').append(headingDial);
function syncHeadingControl(){
 const phone=mobileControls?.isPhone()||false;
 const active=phone?g.mobileMode==='direction':g.controlMode==='direction';
 document.body.classList.toggle('heading-mode',active);
 headingDial.style.setProperty('--heading-angle',g.headingAngle+'rad');
 const degrees=(Math.round(g.headingAngle*180/Math.PI)%360+360)%360;
 headingDial.setAttribute('aria-valuenow',String(degrees));
 headingDial.setAttribute('aria-valuetext',degrees+'°');
 headingDial.querySelector('.direction-caption').textContent=(window.SpaceI18n?.language==='ru'?'НАПРАВЛЕНИЕ':window.SpaceI18n?.language==='es'?'DIRECCIÓN':'DIRECTION')+' · '+degrees+'°';
}
function setHeadingAngle(angle){
 if(!Number.isFinite(angle))return;
 g.headingAngle=Math.atan2(Math.sin(angle),Math.cos(angle));
 syncHeadingControl();
}
let headingPointer=null;
function aimHeading(e){
 const b=headingDial.querySelector('.direction-dial-ring').getBoundingClientRect();
 const dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2;
 if(Math.hypot(dx,dy)>7)setHeadingAngle(Math.atan2(dy,dx));
}
headingDial.addEventListener('pointerdown',e=>{
 if(!running||e.button!==0)return;
 e.preventDefault();e.stopPropagation();headingPointer=e.pointerId;
 try{headingDial.setPointerCapture(e.pointerId);}catch(_){}
 aimHeading(e);
});
headingDial.addEventListener('pointermove',e=>{if(headingPointer===e.pointerId){e.preventDefault();aimHeading(e);}});
const stopHeading=e=>{if(headingPointer!==e.pointerId)return;headingPointer=null;save();};
['pointerup','pointercancel','lostpointercapture'].forEach(type=>headingDial.addEventListener(type,stopHeading));
headingDial.addEventListener('keydown',e=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
 e.preventDefault();e.stopPropagation();
 const step=e.key==='ArrowLeft'?-Math.PI/12:e.key==='ArrowRight'?Math.PI/12:0;
 if(step)setHeadingAngle(g.headingAngle+step);
 else setHeadingAngle(e.key==='ArrowUp'?-Math.PI/2:Math.PI/2);
 save();
});
window.addEventListener('resize',syncHeadingControl);
let pulseCd=0,boostCd=0,boostTime=0,shake=0,renderTicks=0;const BOOST_DURATION=2.5;
function boostMultiplier(time=boostTime){
 if(time<=0)return 1;
 const elapsed=BOOST_DURATION-time;
 // Smoothstep ramp up 0.45s and ramp down 0.65s to avoid a sudden speed jerk.
 const ease=t=>{const u=clamp(t,0,1);return u*u*(3-2*u);};
 return 1+1.5*ease(elapsed/.45)*ease(time/.65);
}let atlasVisible=false,atlas={x:0,y:0,zoom:1,drag:false,lastX:0,lastY:0,dirty:true};
let externalMusic=null,musicPreview=null,musicPreviewTimer=null;let soundCtx=null;let musicMaster=null,musicFX=null,musicLoop=null,musicNext=0,musicBeat=0;
let pickupSoundAt=-1e9,pickupCount=0,pickupValue=0,pickupDisplayAt=-1e9;
let absorptionTokens=0;
let harvestChain=0,harvestChainTime=0;
function chainMultiplier(){return g.tier<13?1+Math.min(1,Math.floor(harvestChain/4)*.25):1;}
function advanceHarvestChain(){
 if(g.tier>=13)return 1;
 harvestChain=harvestChainTime>0?harvestChain+1:1;harvestChainTime=5;g.bestChain=Math.max(g.bestChain||0,harvestChain);
 if(harvestChain%4===0){
  const color=harvestChain>=12?'#ffd6a0':'#86eaff';
  shockwaves.push({x:player.x,y:player.y,r:player.r,life:.7,max:.7,color,range:110});
  sound(330+Math.min(12,harvestChain)*22,'sine',.18,.012);
 }
 return chainMultiplier();
}
function ordinaryGravityRadius(){const power=upgradePower('gravity');return Math.max((g.tier<4?165:116.4)+power*7,player.r*3.36)*tester.gravity*(1+Math.max(0,power-80)*.01);}
function pickupFeedback(value,rare=false){
 pickupCount++;pickupValue+=value;
 const now=performance.now();
 // Never produce dozens of layered high-frequency tones when a galaxy is eaten.
 if(g.sound&&now-pickupSoundAt>420){
  pickupSoundAt=now;
  sound(g.endless?190:rare?430:310,'sine',.085,g.endless?.004:.009);
 }
 // One compact feedback number per cluster; no individual floating labels.
 if(now-pickupDisplayAt>650&&player.r<CHUNK*4){
  popText(player.x,player.y-player.r*1.3,`+${pickupValue<10?pickupValue.toLocaleString(typeof window!=='undefined'&&window.SpaceI18n?.language||'ru-RU',{maximumFractionDigits:1}):fmt(pickupValue)}`,'#b7e9fc');
  pickupValue=0;pickupCount=0;pickupDisplayAt=now;
 }
 if(player.r>=CHUNK*4){pickupValue=0;pickupCount=0;}
}


const cssColor = (h,a) => h.startsWith('#')?`rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${a})`:`rgba(119,190,255,${a})`;
function sound(freq=350,type='sine',duration=.075,vol=.045){if(!g.sound||window.SpacePlatform?.muted||g.soundVolume===0)return;try{soundCtx??=new (window.AudioContext||window.webkitAudioContext)();if(soundCtx.state==='suspended')soundCtx.resume();const osc=soundCtx.createOscillator(),gain=soundCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,soundCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.63),soundCtx.currentTime+duration);gain.gain.setValueAtTime(Math.max(.0001,vol*(g.soundVolume??.7)),soundCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,soundCtx.currentTime+duration);osc.connect(gain);gain.connect(soundCtx.destination);osc.start();osc.stop(soundCtx.currentTime+duration+.01);}catch(_){}}
// Original procedurally composed cinematic space ambient — not the film soundtrack.
const musicChords=[[45,52,57,60,64],[41,48,53,57,60],[38,45,50,53,57],[43,50,55,59,62],[40,496,52,55,59],[36,43,48,52,55]];
const hz=midi=>440*Math.pow(2,(midi-69)/12);
function initAudio(){
 try{
  soundCtx??=new (window.AudioContext||window.webkitAudioContext)();
  if(soundCtx.state==='suspended')soundCtx.resume();
  if(!musicMaster){
   musicMaster=soundCtx.createGain();musicMaster.gain.value=0;
   musicFX=soundCtx.createBiquadFilter();musicFX.type='lowpass';musicFX.frequency.value=1900;
   const delay=soundCtx.createDelay(1);delay.delayTime.value=.36;
   const feedback=soundCtx.createGain();feedback.gain.value=.18;
   const wet=soundCtx.createGain();wet.gain.value=.24;
   musicFX.connect(musicMaster);musicFX.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(musicMaster);musicMaster.connect(soundCtx.destination);
  }
  setMusicVolume();
  if(!musicLoop){musicBeat=0;musicNext=soundCtx.currentTime+.12;musicLoop=setInterval(scheduleMusic,120);}
 }catch(_){/* Audio may be unsupported */}
}
function setMusicVolume(){const audible=g.music&&!window.SpacePlatform?.muted;
 if(musicMaster&&soundCtx)musicMaster.gain.setTargetAtTime(0,soundCtx.currentTime,.12);
 if(externalMusic){externalMusic.volume=audible?g.musicVolume:0;if(audible&&!musicPreview){if(externalMusic.paused)externalMusic.play().catch(()=>{});}else externalMusic.pause();}
 if(musicPreview)musicPreview.volume=window.SpacePlatform?.muted?0:g.musicVolume;
}
function stopMusicPreview(){clearTimeout(musicPreviewTimer);musicPreviewTimer=null;if(musicPreview){musicPreview.pause();musicPreview=null;}setMusicVolume();}
function previewMusicTrack(track,onEnd){if(!track?.src||!g.ownedTracks.includes(track.id))return false;stopMusicPreview();const sample=new Audio(track.src);musicPreview=sample;sample.preload='metadata';const finish=()=>{if(musicPreview!==sample)return;stopMusicPreview();onEnd?.();};sample.onended=finish;sample.onerror=finish;setMusicVolume();sample.play().catch(finish);musicPreviewTimer=setTimeout(finish,15000);}

function playVoice(note,when,duration,level=.08,type='triangle'){
 if(!soundCtx||!musicFX)return;
 const o=soundCtx.createOscillator(),o2=soundCtx.createOscillator(),gain=soundCtx.createGain();
 o.type=type;o.frequency.setValueAtTime(hz(note),when);o2.type='sine';o2.frequency.setValueAtTime(hz(note)*1.0024,when);
 gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(level,when+.13);gain.gain.setTargetAtTime(.0001,when+duration*.57,Math.max(.15,duration*.2));
 o.connect(gain);o2.connect(gain);gain.connect(musicFX);o.start(when);o2.start(when);o.stop(when+duration+1.3);o2.stop(when+duration+1.3);
}
function scheduleMusic(){}

function startMusic(){const t=MUSIC_TRACKS.find(t=>t.id===g.activeTrack&&g.ownedTracks.includes(t.id));if(!t){if(externalMusic)externalMusic.pause();externalMusic=null;g.activeTrack=null;}else if(!externalMusic){externalMusic=new Audio(t.src);externalMusic.loop=true;}initAudio();setMusicVolume();}
addEventListener('space-platform-audio',()=>setMusicVolume());
function save(){g.worldX=player.x;g.worldY=player.y;try{localStorage.setItem(SAVE_KEY,JSON.stringify(g));}catch(_){toastStorageWarning();}}
let storageWarned=false;function toastStorageWarning(){if(!storageWarned){storageWarned=true;console.warn('Infiniti Space: сохранение мира не помещается в localStorage');}}

function makeSky(){
 skyLayer=null;skyDepthLayers=[];
 const rng=chunkRandom(0x73a9f),colors=['#eaf1ff','#c6d9ff','#fff0d4','#fff9ef'];
 stars=Array.from({length:Math.min(520,Math.max(140,Math.floor(W*H/4100)))},()=>{
  return {x:rng()*W,y:rng()*H,r:1,
   alpha:.82+rng()*.18,depth:.5+rng()*.45,color:colors[Math.floor(rng()*colors.length)]};
 });
 nebula=Array.from({length:8},()=>({x:rng()*W,y:H*(.72-.45*rng()),r:180+rng()*Math.min(W,H)*.4,h:210+rng()*35,a:.018+rng()*.025}));
}
let performanceScale=1,frameFps=60,perfSample=0,perfFrames=0,skyLayer=null,skyLayerEpoch=-1,skyDepthLayers=[];
function updateAdaptiveQuality(fps){
 if(g.autoQuality===false){performanceScale=1;return;}
 if(fps<42&&performanceScale>.55)performanceScale=Math.max(.55,performanceScale-.1);
 else if(fps>58&&performanceScale<1)performanceScale=Math.min(1,performanceScale+.05);
}
function setAutoQuality(enabled){
 g.autoQuality=enabled;
 performanceScale=1;perfSample=0;perfFrames=0;
 applyResolution();
 if(atlasVisible)atlas.dirty=true;
 save();
}
function applyResolution(){
 const base=Math.min(devicePixelRatio||1,W*H>=2200000?.87:1.25);
 const effective=base*(g.quality===.5?.75:1)*performanceScale;
 dpr=g.autoQuality===false?(devicePixelRatio||1):Math.max(.65,effective);
 const pixelWidth=Math.max(1,Math.round(W*dpr));
 const pixelHeight=Math.max(1,Math.round(H*dpr));
 if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;}
 if(frameCanvas.width!==pixelWidth||frameCanvas.height!==pixelHeight){frameCanvas.width=pixelWidth;frameCanvas.height=pixelHeight;}
 screenCtx.setTransform(1,0,0,1,0,0);
 frameCtx.setTransform(dpr,0,0,dpr,0,0);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
function resize(){W=innerWidth;H=innerHeight;applyResolution();makeSky();if(atlasVisible)atlas.dirty=true;}

addEventListener('resize',resize);resize();
function toast(message,kind=''){let el=document.createElement('div');el.className=`toast ${kind}`;el.textContent=message;$('toast-root').append(el);setTimeout(()=>el.remove(),3100);}
// Campaign target: roughly one minute of active gathering per form.
// Requirements are distance and discovery goals, not artificial AFK timers.
function missionReq(){return {rare:0,explore:Math.min(3,1+Math.floor(g.tier/10)),collect:Math.round(TA[g.tier].required*.45)};}
function recipeDone(){return stageRecipe().every(({type,amount})=>(g.materials[type]||0)>=amount);}
function missionsDone(){const m=missionReq();return g.stageCollects>=m.collect&&recipeDone()&&g.stageExplored>=m.explore;}
function spendRecipe(){for(const r of stageRecipe())g.materials[r.type]=Math.max(0,(g.materials[r.type]||0)-r.amount);}
function resourceOf(e){return e.material||'ore';}

function upgradePower(id){
 const level=g.upgrade[id]||0,limit=upgrades.find(u=>u.id===id).max;
 return level<=limit?level:limit+.1*Math.log2(1+level-limit);
}
function upgradeCost(u,level=g.upgrade[u.id]){
 if(level<u.max)return Math.round(u.base*Math.pow(u.growth,level));
 const log=Math.log(u.base)+u.max*Math.log(u.growth)+Math.log(8)+(level-u.max)*Math.log(u.growth*1.6);
 return log>Math.log(Number.MAX_VALUE)?Infinity:Math.exp(log);
}
function upgradeTotalCost(u,start,count){
 if(!Number.isSafeInteger(count)||count<1||start+count>Number.MAX_SAFE_INTEGER)return Infinity;
 let cost=0;
 const ordinary=Math.min(count,Math.max(0,u.max-start));
 for(let i=0;i<ordinary;i++)cost+=upgradeCost(u,start+i);
 const extra=count-ordinary;
 if(extra){
  const level=start+ordinary,logRatio=Math.log(u.growth*1.6),n=extra*logRatio;
  const logSum=Math.log(u.base)+u.max*Math.log(u.growth)+Math.log(8)+(level-u.max)*logRatio+(n>50?n:Math.log(Math.expm1(n)))-Math.log(Math.expm1(logRatio));
  if(logSum>Math.log(Number.MAX_VALUE))return Infinity;
  cost+=Math.exp(logSum);
 }
 return cost;
}
function upgradeQuote(u,amount=g.buyAmount){
 const start=g.upgrade[u.id];
 if(amount!=='max'){
  const count=Number(amount);
  return {count:Number.isSafeInteger(count)&&count>0?count:0,cost:upgradeTotalCost(u,start,count)};
 }
 let lo=0,hi=1,limit=Number.MAX_SAFE_INTEGER-start;
 while(hi<limit&&upgradeTotalCost(u,start,hi)<=g.credits){lo=hi;hi=Math.min(limit,hi*2);}
 if(hi&&upgradeTotalCost(u,start,hi)<=g.credits)lo=hi;
 else while(hi-lo>1){const mid=lo+Math.floor((hi-lo)/2);if(upgradeTotalCost(u,start,mid)<=g.credits)lo=mid;else hi=mid;}
 return {count:lo,cost:lo?upgradeTotalCost(u,start,lo):0};
}
function setBuyAmount(amount){
 if(amount!=='max'&&(!Number.isSafeInteger(Number(amount))||Number(amount)<1))return;
 g.buyAmount=amount==='max'?'max':Number(amount);save();renderUI(true);
}
function buy(id){
 const u=upgrades.find(x=>x.id===id);if(!u)return;
 const quote=upgradeQuote(u);
 if(!quote.count||!Number.isFinite(quote.cost)||quote.cost>g.credits){toast('Недостаточно звёздной пыли');return;}
 g.credits=Math.max(0,g.credits-quote.cost);g.upgrade[id]+=quote.count;
 sound(590,'triangle',.13);burst(player.x,player.y,20,'#81e5ec',1);renderUI(true);save();
}
function flightSpeed(){
 const power=upgradePower('speed');
 const ordinarySpeed=(230+Math.min(190,power*5.2))*(1+Math.log2(1+player.r/25)*.38);
 const cosmicSpeed=player.r>CHUNK*5?Math.min(1e290,Math.max(ordinarySpeed,140/physicsZoom())):ordinarySpeed;
 return tester.speed*cosmicSpeed*(g.endless?8.5*(1+power*.01):1+Math.max(0,power-60)*.01);
}
function uiIcon(name){
 const shapes={"map": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"m16 8-2.5 5.5L8 16l2.5-5.5Z\"/>", "gravity": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><ellipse cx=\"12\" cy=\"12\" rx=\"10\" ry=\"6\" transform=\"rotate(-35 12 12)\"/>", "speed": "<path d=\"m13 3-9 11h7l-1 7 10-12h-8Z\"/>", "harvest": "<path d=\"m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z\"/>", "shield": "<path d=\"m12 3 8 3v6c0 4-5 7-8 9-3-2-8-5-8-9V6Z\"/><path d=\"m8 12 3 3 5-6\"/>", "music": "<path d=\"M9 18V5l11-2v13M9 9l11-2\"/><ellipse cx=\"6\" cy=\"18\" rx=\"3\" ry=\"2\"/><ellipse cx=\"17\" cy=\"16\" rx=\"3\" ry=\"2\"/>", "playlist": "<rect x=\"3\" y=\"4\" width=\"14\" height=\"15\" rx=\"2\"/><path d=\"M7 8h6M7 12h6M7 16h4M20 8v10\"/><circle cx=\"18\" cy=\"18\" r=\"2\"/>", "mute": "<path d=\"M9 18v-5m0-6V5l11-2v13M13 8l7-1M3 3l18 18\"/><ellipse cx=\"6\" cy=\"18\" rx=\"3\" ry=\"2\"/>", "pause": "<path d=\"M8 5v14M16 5v14\" stroke-width=\"3\"/>", "settings": "<path d=\"M4 7h16M4 17h16\"/><circle cx=\"9\" cy=\"7\" r=\"3\" fill=\"#0b2031\"/><circle cx=\"16\" cy=\"17\" r=\"3\" fill=\"#0b2031\"/>", "tester": "<path d=\"m8 4-5 8 5 8M16 4l5 8-5 8M14 4l-4 16\"/>", "arrow": "<path d=\"M4 12h16m-6-6 6 6-6 6\"/>", "close": "<path d=\"m6 6 12 12M6 18 18 6\"/>", "chevron": "<path d=\"m14 6-6 6 6 6\"/>", "expand": "<path d=\"M7 17 18 6M7 6h11v11\"/>", "plus": "<path d=\"M12 5v14M5 12h14\"/>", "minus": "<path d=\"M5 12h14\"/>", "center": "<circle cx=\"12\" cy=\"12\" r=\"6\"/><path d=\"M12 2v5m0 10v5M2 12h5m10 0h5\"/>", "achievements": "<path d=\"M8 3h8v5a4 4 0 0 1-8 0ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v6m-4 3h8m-6-3h4\"/>", "statistics": "<path d=\"M4 20V4m0 16h17M9 16v-5m5 5V7m5 9V3\"/>", "upgrades": "<path d=\"M5 19v-6m7 6V5m7 14v-9M2 13h6m1-8h6m1 5h6\"/>"};
 return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.arrow}</svg>`;
}
function populateUpgrades(){const root=$('upgrades');root.textContent='';for(const u of upgrades){let b=document.createElement('button');b.className='upgrade';b.dataset.upgrade=u.id;b.addEventListener('click',()=>buy(u.id));b.innerHTML=`<span class="upgrade-icon">${uiIcon(u.id)}</span><span class="upgrade-description"><strong>${u.name}</strong><small>${u.label} · <span class="upgrade-level"></span></small></span><span class="upgrade-cost"><span class="upgrade-price"></span><small>✦ цена</small></span>`;root.append(b);}}
populateUpgrades();
for(const button of document.querySelectorAll('[data-buy-amount]'))button.onclick=()=>setBuyAmount(button.dataset.buyAmount);
$('upgrade-amount').oninput=e=>{if(e.target.value.trim())setBuyAmount(e.target.value);};
$('upgrade-amount').onblur=e=>{e.target.value=g.buyAmount==='max'?'':String(g.buyAmount);};
function renderUI(force=false){
 $('matter-value').textContent=g.endless?fmt(solarMass())+' M☉':fmt(g.total);$('matter-label').textContent=g.endless?L('BLACK HOLE MASS','МАССА ЧЁРНОЙ ДЫРЫ','MASA DEL AGUJERO NEGRO'):L('MATTER','МАТЕРИЯ','MATERIA');$('radius-value').textContent=lightYears(g.endless?blackHoleCoreWorldRadius():player.r);$('credit-value').textContent=fmt(g.credits);$('time-value').textContent=timeFmt(g.time);
 const t=TA[g.tier],next=TA[g.tier+1],progress=clamp(g.matter/t.required,0,1);
 $('tier-number').innerHTML=`${String(g.tier+1).padStart(2,'0')} <span>/ ${TA.length}</span>`;
 $('epoch-name').textContent=t.epoch.toUpperCase();$('tier-title').textContent=t.name;$('tier-desc').textContent=g.tier<13?(harvestChainTime>0?`ЦЕПОЧКА: ${harvestChain} · ${harvestChainTime.toFixed(1)} с`:t.desc+' Собирай цепочки и закручивай потоки материи.'):t.desc;
 $('hud-stage').innerHTML=`${String(g.tier+1).padStart(2,'0')} <small>/ ${TA.length}</small>`;
 $('current-form').textContent=t.name;$('next-form').textContent=g.endless?'ГОРИЗОНТ СОБЫТИЙ РАСТЁТ ∞':next?.name??'БЕСКОНЕЧНОСТЬ';
 if(g.endless){
  const rank=Math.log2(1+Math.max(0,g.matter)/t.required),sub=(rank%1)*100;
  $('progress-fill').style.width=sub.toFixed(1)+'%';
  $('progress-percent').textContent=`∞ ${fmt(solarMass())} M☉`;
 }else{
  $('progress-fill').style.width=(progress*100).toFixed(1)+'%';
  $('progress-percent').textContent=progress>=1&&!missionsDone()?'ВЫПОЛНИ ЗАДАЧИ':Math.round(progress*100)+'%';
 }
 const m=missionReq(),cs=g.endless?[true,true,true]:[g.stageCollects>=m.collect,recipeDone(),g.stageExplored>=m.explore];
 $('mission-1-label').textContent=g.endless?'Поглощено в чёрную дыру':'Нарасти массу';$('mission-1-val').textContent=g.endless?fmt(solarMass())+' M☉':`${fmt(g.stageCollects)}/${fmt(m.collect)}`;
 $('mission-2-label').textContent=g.endless?'Радиус горизонта событий':'Собери рецепт';$('mission-2-val').textContent=g.endless?lightYears(blackHoleCoreWorldRadius()):`${stageRecipe().filter(({type,amount})=>(g.materials[type]||0)>=amount).length}/${stageRecipe().length}`;
 $('mission-3-label').textContent=g.endless?'Исследованная площадь':'Исследуй пространство';$('mission-3-val').textContent=g.endless?fmt(exploredCount())+' св. лет²':`${fmt(g.stageExplored)}/${fmt(m.explore)} св. лет²`;
 const matRoot=$('materials-inventory');if(matRoot){
  const active=g.endless?[]:stageRecipe();matRoot.innerHTML=active.map(({type,amount})=>{
   const v=g.materials[type]||0,d=MATERIALS[type];return `<div class="material-row ${v>=amount?'ready':''}"><span style="color:${d.color}">${d.symbol}</span><span>${d.label}</span><b>${fmt(v)} / ${fmt(amount)}</b></div>`;
  }).join('');
  $('resource-hint').textContent=g.endless?'Все виды материи поглощаются автоматически':stageRecipe().map(r=>MATERIALS[r.type].label).join(' · ');
 }
 cs.forEach((ok,i)=>{const e=$(`mission-${i+1}`);e.classList.toggle('done',ok);e.querySelector('.mission-mark').textContent=ok?'✓':'◇';});$('mission-done').textContent=cs.filter(Boolean).length+'/3';
 $('upgrade-bulk-label').textContent=L('Levels per purchase','Уровней за покупку','Niveles por compra');
 $('upgrade-bulk-help').textContent=L('Beyond the former caps: ×8 price, faster cost growth and smaller bonuses.','После прежних максимумов: цена ×8, далее быстрый рост цен и меньшие прибавки.','Tras los límites anteriores: precio ×8, costes crecientes y mejoras menores.');
 $('upgrade-amount').setAttribute('aria-label',L('Number of levels to buy','Количество уровней для покупки','Cantidad de niveles para comprar'));
 if(document.activeElement!==$('upgrade-amount'))$('upgrade-amount').value=g.buyAmount==='max'?'':String(g.buyAmount);
 for(const button of document.querySelectorAll('[data-buy-amount]'))button.setAttribute('aria-pressed',String(String(g.buyAmount)===button.dataset.buyAmount));
 for(const u of upgrades){
  const b=$('upgrades').querySelector(`[data-upgrade="${u.id}"]`),lvl=g.upgrade[u.id],q=upgradeQuote(u);
  b.querySelector('.upgrade-level').textContent=L('lv. ','ур. ','niv. ')+fmt(lvl)+' / ∞';
  b.querySelector('.upgrade-price').textContent=Number.isFinite(q.cost)?fmt(q.cost):'∞';
  b.querySelector('.upgrade-cost small').textContent=q.count?'+'+fmt(q.count)+' '+L('levels','ур.','niv.')+' · ✦':L('Not enough ✦','Не хватает ✦','Faltan ✦');
  b.title=(lvl>=u.max?L('Endless upgrade · smaller bonus per level','Бесконечное улучшение · меньшая прибавка за уровень','Mejora infinita · menor aumento por nivel'):L('Standard levels up to ','Обычные уровни до ','Niveles normales hasta ')+u.max);
  b.disabled=!q.count||!Number.isFinite(q.cost)||g.credits<q.cost;
 }

 $('pulse-cooldown').textContent=pulseCd>0?pulseCd.toFixed(1)+'с':'E · ГОТОВ';$('boost-cooldown').textContent=boostCd>0?boostCd.toFixed(1)+'с':'SHIFT · ГОТОВ';
 $('pulse-fill').style.transform=`scaleX(${clamp(1-pulseCd/13,0,1)})`;$('boost-fill').style.transform=`scaleX(${clamp(1-boostCd/6,0,1)})`;
 $('zoom-label').textContent=`ДИАМЕТР ${lightYears(2*(g.endless?blackHoleCoreWorldRadius():player.r))} · КАМЕРА ${camera.zoom<.01?camera.zoom.toExponential(2):camera.zoom.toFixed(2)}× · ОБЗОР ${Math.round((g.viewZoom||1)*100)}%`;
 if($('btn-music').dataset.music!==String(g.music)){$('btn-music').innerHTML=uiIcon(g.music?'music':'mute');$('btn-music').dataset.music=String(g.music);}$('btn-music').setAttribute('aria-label',g.music?'Выключить музыку':'Включить музыку');const sx=Math.floor(player.x/CHUNK),sy=Math.floor(player.y/CHUNK);$('world-label').textContent=`${t.epoch.toUpperCase()} · НЕИЗВЕДАННАЯ ВСЕЛЕННАЯ`;$('world-subtitle').textContent=`X ${lightYears(player.x)} · Y ${lightYears(player.y)} · ${BIOME_NAMES[chunkInfo(sx,sy).biome]} · ИЗУЧЕНО ${fmt(exploredCount())} св. лет²`;
 const stats=$('tester-stats');
 if(stats)stats.textContent=`${Math.round(frameFps)} FPS · ${lensBackend.toUpperCase()} · ${entities.length} объектов · ${loadedChunks.size} областей · X ${lightYears(player.x)} · Y ${lightYears(player.y)}`;
 if(force)save();window.SpaceI18n?.refresh();
}
// World is deterministic: the same sector always has the same matter, even after a restart.
// 32 fixed objects per sector allow a single 32-bit bitmask to remember everything harvested.
function spawn(x,y,forced,rng=Math.random){
 const kind=forced||(rng()<.045?'relic':'matter');
 const angle=rng()*TAU,speed=0; // Uncollected bodies never drift or move randomly between visits.
 return {x,y,vx:0,vy:0,kind,r:kind==='hazard'?20+rng()*12:kind==='relic'?9+rng()*4:3+rng()*6,
 spin:rng()*TAU,twinkle:rng()*TAU,value:kind==='relic'?17+rng()*15:.75+rng()*2.15,
 hue:kind==='hazard'?2+rng()*28:kind==='relic'?38+rng()*22:[185,195,205,225,255,275][Math.floor(rng()*6)],dead:false};
}
function seedHash(a,b){let x=Math.imul(a,374761393)^Math.imul(b,668265263)^WORLD_SEED;x=Math.imul(x^(x>>>13),1274126177);return (x^(x>>>16))>>>0;}
function chunkRandom(seed){return ()=>{seed+=0x6D2B79F5;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function chunkKey(x,y){return `${x},${y}`;}
// Slow, deterministic orbital drift. Shared by map, sprites and physics;
// saved game time reproduces the same positions after reload. Captured bodies
// leave this path and keep their actual gravitational trajectory.
const RESOURCE_STREAMS=[{x:76,y:32},{x:-54,y:81},{x:-88,y:-27},{x:31,y:-67}];
function resourceViews(x,y){return RESOURCE_STREAMS.map((v,stream)=>({x:x-v.x*(g.time-(g.flightEpoch||0)),y:y-v.y*(g.time-(g.flightEpoch||0)),stream}));}
function flightKey(e){return absorptionKey(e);}
function freeFlightAt(e){
 const t=Math.max(0,g.time-e.flightTime);
 return {...e,x:e.x+e.vx*t,y:e.y+e.vy*t,motionVX:e.vx,motionVY:e.vy};
}
function rememberFlight(e){
 e.freeFlight=true;
 const {captureBag,...record}=e;
 g.freeFlights[flightKey(e)]={...record,gravityBound:false,flightTime:g.time};
 absorbingMacroKeys.add(flightKey(e));
}
function driftBody(e){
 if(e.gravityBound||e.absorbing||e.gathering)return e;
 const flight=g.freeFlights?.[flightKey(e)];if(flight)return freeFlightAt(flight);
 if(!e.macro&&!e.cosmic){
  const v=RESOURCE_STREAMS[(e.index||0)%RESOURCE_STREAMS.length],originX=e.originX??e.x,originY=e.originY??e.y;
  return {...e,originX,originY,x:originX+v.x*(g.time-(g.flightEpoch||0)),y:originY+v.y*(g.time-(g.flightEpoch||0)),motionVX:v.x,motionVY:v.y};
 }
 const seed=seedHash((e.index||0)+((e.style||0)*31),(e.grade||0)+(e.level||0)*73);
 const phase=(seed%6283)/1000,omega=.035+(seed%17)*.001;
 const amplitude=e.macro||e.cosmic?e.r*.42:Math.max(110,e.r*9);
 const t=g.time*omega,originX=e.originX??e.x,originY=e.originY??e.y;
 return {...e,originX,originY,
  x:originX+(Math.sin(phase+t)-Math.sin(phase))*amplitude,
  y:originY+(Math.cos(phase+t*.73)-Math.cos(phase))*amplitude*.7,
  motionVX:Math.cos(phase+t)*amplitude*omega,
  motionVY:-Math.sin(phase+t*.73)*amplitude*.7*omega*.73};
}
const BIOME_NAMES={normal:'ПОЯС АСТЕРОИДОВ',rich:'КРИСТАЛЬНЫЙ ПОЯС',nebula:'ГАЗОВАЯ ТУМАННОСТЬ',void:'ЛЕДЯНОЙ ПОТОК',relic:'ЗВЁЗДНЫЙ ФРОНТ',anomaly:'ТЁМНАЯ МАТЕРИЯ'};
function chunkInfo(cx,cy){
 const seed=seedHash(cx,cy),region=seedHash(Math.floor(cx/6),Math.floor(cy/6)),h=region%100;
 const biome=h<17?'nebula':h<35?'rich':h<49?'void':h<68?'relic':h<79?'anomaly':'normal';
 return {biome,seed};
}
function materialFor(biome,dist,rng){
 const roll=rng();if(roll<.22)return 'ice';const d=(roll-.22)/.78;
 if(biome==='rich')return d<.58?'crystal':'ore';
 if(biome==='void')return d<.62?'ice':'ore';
 if(biome==='nebula')return d<.72?'gas':'ore';
 if(biome==='relic')return d<.58?(dist>15?'plasma':'crystal'):'ore';
 if(biome==='anomaly')return d<.38&&dist>35?'exotic':d<.67?'plasma':'ore';
 return d<.11?'crystal':'ore';
}
function sectorType(info,r){
 const h=info.biome;
 return h==='relic'?(r<.14?'relic':'matter'):
  h==='anomaly'?(r<.10?'relic':'matter'):
  r<.055?'relic':'matter';
}

// Exact sector reveals at ordinary sizes and compact permanent disc footprints for
// giant bodies. Avoid iterating millions of cells when the horizon spans a galaxy.
let lastReveal={x:Infinity,y:Infinity,r:-Infinity};
function exploredCount(){return Math.round(visitedChunks.size+(g.exploredBonus||0));}
function visitPosition(force=false){
 const x=player.x,y=player.y,r=Math.max(0,player.r);
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(r))return;
 const step=r>5*CHUNK?Math.max(CHUNK,r*.50):Math.max(30,Math.min(CHUNK*.22,r*.19));
 const growStep=r>5*CHUNK?Math.max(CHUNK*.1,r*.10):step;
 if(!force&&Math.hypot(x-lastReveal.x,y-lastReveal.y)<step&&Math.abs(r-lastReveal.r)<growStep)return;
 lastReveal={x,y,r};
 const cx=x/CHUNK,cy=y/CHUNK,rad=r/CHUNK;
 if(rad>5){
  // A long flight is stored as circles, not as an enormous unbounded tile array.
  const discs=g.discoveryDiscs;
  const covering=discs.some(d=>Math.hypot(d[0]-cx,d[1]-cy)+rad<=d[2]);
  if(!covering){
   let removedArea=0;
   for(let i=discs.length-1;i>=0;i--){const d=discs[i];if(Math.hypot(d[0]-cx,d[1]-cy)+d[2]<=rad){removedArea+=d[2]*d[2]*Math.PI;discs.splice(i,1);}}
   const nearest=discs.reduce((m,d)=>Math.min(m,Math.hypot(d[0]-cx,d[1]-cy)),Infinity);
   const incremental=discs.length===0?Math.PI*rad*rad:Math.min(Math.PI*rad*rad,Math.PI*Math.max(0,rad*rad-(Math.max(0,rad-nearest)*Math.max(0,rad-nearest))));
   g.exploredBonus=Math.min(1e14,(g.exploredBonus||0)+Math.max(1,incremental-removedArea*.3));
   g.stageExplored+=Math.max(1,Math.round(Math.min(incremental,1e12)));
   discs.push([cx,cy,rad]);
  }
  return;
 }
 const minX=Math.floor(cx-rad)-1,maxX=Math.floor(cx+rad)+1;
 const minY=Math.floor(cy-rad)-1,maxY=Math.floor(cy+rad)+1;
 let added=0;
 for(let yy=minY;yy<=maxY;yy++)for(let xx=minX;xx<=maxX;xx++){
  const nearestX=clamp(cx,xx,xx+1),nearestY=clamp(cy,yy,yy+1);
  if((nearestX-cx)**2+(nearestY-cy)**2>rad*rad)continue;
  const key=chunkKey(xx,yy);if(visitedChunks.has(key))continue;
  visitedChunks.add(key);g.visited.push(key);added++;
 }
 g.stageExplored=(g.stageExplored||0)+added;

}
function markHarvested(e){
 if(e.captureBag&&e.captureKey!==undefined){e.captureBag[e.captureKey]=((e.captureBag[e.captureKey]||0)|(1<<e.index))>>>0;return;}
 if(e.chunk!==undefined&&Number.isInteger(e.index)){
  const bit=(1<<e.index)>>>0;const bag=e.macro?g.depletedMacro:g.depleted;bag[e.chunk]=((bag[e.chunk]||0)|bit)>>>0;
 }
}
// Permanent sector capacity: fewer bodies, but larger and more valuable as
// exploration advances. Slots (0..31) are unchanged so old depleted masks work.
function sectorQuota(info,cx,cy){
 const base={normal:10,rich:13,nebula:10,void:8,relic:10,anomaly:7}[info.biome];
 const variation=(seedHash(cx+73,cy-41)%5)-2;
 return clamp(Math.round((base+variation)*tester.density/16),2,32);
}
function makeChunk(cx,cy){
 const key=chunkKey(cx,cy);if(loadedChunks.has(key))return;loadedChunks.add(key);
 const info=chunkInfo(cx,cy),rng=chunkRandom(info.seed),mask=(g.depleted[key]||0)>>>0;
 for(let i=0;i<32;i++){
  const px=(cx+rng())*CHUNK,py=(cy+rng())*CHUNK;
  const r=rng();let kind=sectorType(info,r);
  // Starting area is accessible without early fatal hazards.
  if(Math.hypot(px,py)<110)kind='matter';
  // Always advance RNG for every index (including harvested ones). Otherwise,
  // depleted bodies silently shift all later positions when the sector reloads.
  let e=spawn(px,py,kind,rng);
  const dist=Math.hypot(cx,cy);e.material=materialFor(info.biome,dist,rng);if(i===1)e.material='ice';
  if((mask&(1<<i))!==0||i>=sectorQuota(info,cx,cy)||absorbingMacroKeys.has(`0:${key}:${i}`))continue;
  e.chunk=key;e.index=i;
  // Regions farther from the origin contain physically larger, richer bodies.
  // Grade depends only on sector coordinates, never on player tier, so revisits stay consistent.
  const grade=clamp(Math.floor(Math.log(1+dist/3)/Math.log(1.46)),0,27);
  const sizeMultiplier=Math.pow(1.125,grade);
  e.grade=grade;
  e.r*=sizeMultiplier*(i%17===0?1.45:1);
  // Larger bodies carry much more matter, not just a renamed particle.
  e.value*=1+Math.pow(Math.max(1,e.r/5),1.55)*.42;
  if(info.biome==='rich')e.value*=2.1;
  if(e.material==='gas'||e.material==='exotic')e.hue=285;
  if(e.material==='plasma')e.hue=18;
  if(e.material==='ice')e.hue=195;
  if(e.material==='crystal')e.hue=252;
  if(e.r/player.r>=.025)entities.push(driftBody(e));
 }
}
// Cosmic-scale deposits live on their own immutable coordinate grid. A depleted
// world is never recreated, even after a save/load or zoom transition.
function macroKey(cx,cy){return `${cx}:${cy}`;}
function macroNodes(cx,cy){
 const key=macroKey(cx,cy);let saved=macroCache.get(key);if(saved)return saved.map(driftBody);
 const rng=chunkRandom(seedHash(cx*31+731,cy*37-419)^0x9f4e8b21),biome=chunkInfo(cx*6,cy*6).biome;
 saved=[];
 for(let i=0;i<MACRO_COUNT;i++){
  const x=(cx+.09+rng()*.82)*MACRO_SIZE,y=(cy+.09+rng()*.82)*MACRO_SIZE;
  const macroDistance=Math.hypot(cx,cy);
  const worldScale=1+Math.min(2.8,Math.pow(macroDistance/6,.62)*.6);
  const r=(i===0?65+Math.pow(rng(),.7)*370:18+Math.pow(rng(),1.5)*118)*worldScale;
  const roll=rng(),material=i===1?'ice':biome==='anomaly'?(roll<.5?'exotic':'plasma'):
   biome==='nebula'?(roll<.55?'gas':'exotic'):
   biome==='void'?(roll<.6?'ice':'crystal'):
   biome==='relic'?(roll<.55?'plasma':'exotic'):
   biome==='rich'?(roll<.6?'crystal':'ore'):
   roll<.22?'gas':roll<.42?'crystal':'ore';
  const identity=seedHash(cx*47+i*103,cy*83-i*197);
  const scatter=seedHash(cx*37+i*211,cy*59-i*137);
  const scatterX=((scatter&0xffff)/65535-.5)*MACRO_SIZE*1.35;
  const scatterY=(((scatter>>>16)&0xffff)/65535-.5)*MACRO_SIZE*1.35;
  const blackhole=i===0&&identity%9===0;
  const holeType=identity%17===0?2:identity%5===0?1:0; // stellar, intermediate, supermassive
  const style=(identity>>>8)%8,palette=(identity>>>17)%9;
  saved.push({x:x+scatterX,y:y+scatterY,r:blackhole?r*(holeType===2?1.7:holeType===1?1.2:.85):r,
   index:i,chunk:key,macro:true,material:blackhole?'exotic':material,kind:'matter',holeType,
   grade:18,value:Math.round(12+Math.pow(r/25,1.6)*(blackhole?16:7)),vx:0,vy:0,
   spin:rng()*TAU,twinkle:rng()*TAU,primed:false,dead:false,
   shape:Math.floor(rng()*3),style,palette,hue:230});
 }
 if(macroCache.size>=850){
  const stale=macroCache.keys();for(let i=0;i<96;i++)macroCache.delete(stale.next().value);
 }
 macroCache.set(key,saved);return saved.map(driftBody);
}
function streamMacroBodies(){
 if(MACRO_SIZE*camera.zoom<2||!Number.isSafeInteger(Math.floor(player.x/MACRO_SIZE))||!Number.isSafeInteger(Math.floor(player.y/MACRO_SIZE))){macroEntities=macroEntities.filter(e=>(e.absorbing||e.gravityBound)&&!e.dead);macroLoaded.clear();return;}
 const cx0=Math.floor(player.x/MACRO_SIZE),cy0=Math.floor(player.y/MACRO_SIZE),active=new Set();
 for(let iy=-2;iy<=2;iy++)for(let ix=-2;ix<=2;ix++){
  const cx=cx0+ix,cy=cy0+iy;
  const key=macroKey(cx,cy);active.add(key);
  if(macroLoaded.has(key))continue;
  macroLoaded.add(key);
  const depleted=(g.depletedMacro[key]||0)>>>0;
  for(const e of macroNodes(cx,cy))if(!(depleted&(1<<e.index))&&!absorbingMacroKeys.has(absorptionKey(e)))macroEntities.push({...e});
 }
 for(const key of macroLoaded)if(!active.has(key))macroLoaded.delete(key);
 macroEntities=macroEntities.filter(e=>!e.dead&&((!e.freeFlight&&active.has(e.chunk))||e.absorbing||e.gravityBound));
}
const GALAXY_PALETTES=[
 ['#43caff','#9eeaff','#fff3c6'],['#a56aff','#e4a0ff','#fff5ef'],
 ['#ffad4a','#ffe1a0','#fff8e8'],['#39f4d9','#8cafff','#e7fffa'],
 ['#ff69b1','#ffaceb','#fff3c5'],['#e2e8fa','#a4bbda','#f5f9ff'],
 ['#9ed18a','#e2f5ae','#fff6e0'],['#68a0ff','#8bdee8','#f6d2fd'],
 ['#ffc4a5','#e8a0ff','#d6fcff']
];
function cosmicSprite(material,shape,style=0,palette=0){
 const key=shape+':'+style+':'+palette;
 let cv=macroSpriteCache.get(key);if(cv)return cv;
 cv=document.createElement('canvas');cv.width=cv.height=224;
 const c=cv.getContext('2d'),colors=GALAXY_PALETTES[palette%GALAXY_PALETTES.length];
 c.scale(224/160,224/160);
 const rng=chunkRandom(seedHash(shape*101+style,style*163+palette*37));
 const halo=c.createRadialGradient(80,80,0,80,80,78);
 halo.addColorStop(0,colors[2]+'dd');halo.addColorStop(.12,colors[0]+'af');
 halo.addColorStop(.45,colors[1]+'88');halo.addColorStop(1,'#00000000');
 c.fillStyle=halo;c.globalAlpha=1;c.fillRect(0,0,160,160);c.globalAlpha=1;
 c.save();c.translate(80,80);c.rotate(shape*.35+style*.42);
 // Distinct silhouettes: grand-design spiral, barred, irregular, elliptical,
 // ring, lenticular, dwarf, and interacting double galaxy.
 const spiral=style===0||style===1||style===2||style===7;
 const count=style===3?360:style===4?320:style===6?210:290;
 for(let i=0;i<count;i++){
  const t=rng(),arm=i%((style===1)?2:3),side=rng()-.5;
  let x,y;
  if(spiral){const twist=(style===1?4.6:3.6)*t+arm*TAU/(style===1?2:3);
   const rr=(6+t*62)+(rng()-.5)*(style===7?23:13);
   x=Math.cos(twist)*rr;y=Math.sin(twist)*rr*(style===2?.53:.79);
   if(style===7&&i%3===0){x+=20;y-=11;}
  }else if(style===4){let a=rng()*TAU,r=43+(rng()-.5)*14;x=Math.cos(a)*r;y=Math.sin(a)*r*.79;}
  else if(style===5){x=(rng()-.5)*125;y=(rng()-.5)*36;}
  else if(style===6){const a=rng()*TAU,r=Math.sqrt(rng())*29;x=Math.cos(a)*r;y=Math.sin(a)*r*.74;}
  else {const a=rng()*TAU,r=Math.sqrt(rng())*67;x=Math.cos(a)*r;y=Math.sin(a)*r*(style===3?.55:1);}
  // Bake soft overlapping arm light into the sprite once, not per frame.
  c.globalAlpha=.22;c.fillStyle=colors[0];c.beginPath();c.arc(x,y,4.5,0,TAU);c.fill();
  c.globalAlpha=.30;c.fillStyle=colors[1];c.beginPath();c.arc(x,y,2.8,0,TAU);c.fill();
  const radius=(i%11===0?1.8:.7)+rng()*(style===6?1.0:1.5);
  c.globalAlpha=.85+rng()*.15;c.fillStyle=colors[(i+Math.floor(rng()*4))%3];
  c.beginPath();c.arc(x,y,radius,0,TAU);c.fill();
 }
 // Galactic bar, central bulge and luminous star clusters.
 if(style===1||style===5){c.globalAlpha=.3;c.strokeStyle=colors[1];c.lineWidth=4;
  c.beginPath();c.moveTo(-30,0);c.lineTo(30,0);c.stroke();}
 const nucleus=c.createRadialGradient(0,0,0,0,0,style===6?15:23);
 nucleus.addColorStop(0,'#fffef5');nucleus.addColorStop(.26,'#fff9ed');nucleus.addColorStop(.55,colors[2]+'b0');nucleus.addColorStop(1,colors[1]+'00');
 c.globalAlpha=1;c.fillStyle=nucleus;c.beginPath();c.arc(0,0,style===6?15:23,0,TAU);c.fill();
 for(let i=0;i<165;i++){
  const angle=rng()*TAU,rr=Math.sqrt(rng())*67;
  const px=Math.cos(angle)*rr,py=Math.sin(angle)*rr*.72;
  const flicker=rng();c.globalAlpha=.8+flicker*.2;
  c.fillStyle=flicker>.78?'#fffaf0':colors[i%3];
  c.fillRect(px,py,.45+rng()*1.15,.45+rng()*1.15);
 }
 c.restore();c.globalAlpha=1;
 // Bounded incremental eviction prevents a complete re-render of hundreds of
 // expensive galaxy textures during gameplay (the previous major FPS spike).
 if(macroSpriteCache.size>=245){
  const stale=macroSpriteCache.keys();for(let i=0;i<32;i++)macroSpriteCache.delete(stale.next().value);
 }
 macroSpriteCache.set(key,cv);return cv;
}
const lensHoleSpriteCache=new Map();
function blackHoleSprite(type=0){
 if(lensHoleSpriteCache.has(type))return lensHoleSpriteCache.get(type);
 const cv=document.createElement('canvas');cv.width=cv.height=128;
 const c=cv.getContext('2d');
 const grad=c.createRadialGradient(64,64,10,64,64,62);
 grad.addColorStop(0,'rgba(1,2,5,1)');grad.addColorStop(.35,'rgba(1,2,5,1)');
 grad.addColorStop(.42,'rgba(18,25,33,.90)');grad.addColorStop(.5,'rgba(156,172,181,.18)');
 grad.addColorStop(.67,'rgba(47,64,83,.09)');grad.addColorStop(1,'rgba(0,0,0,0)');
 c.fillStyle=grad;c.fillRect(0,0,128,128);
 lensHoleSpriteCache.set(type,cv);return cv;
}

// The same physical body keeps its identity as the observer grows or zooms.
function bodyType(radius){
 if(radius<radiusAt(6,0))return 'asteroid';
 if(radius<radiusAt(8,0))return 'moon';
 if(radius<radiusAt(11,0))return 'planet';
 if(radius<radiusAt(13,0))return 'gasgiant';
 if(radius<radiusAt(19,0))return 'star';
 if(radius<radiusAt(22,0))return 'system';
 if(radius<radiusAt(25,0))return 'galaxy';
 return 'cluster';
}
function ordinaryBodyValue(e){
 const grade=clamp(Math.floor(Math.log(Math.max(13,e.r)/13)/Math.log(1.65)),0,27);
 return Math.max(2,Math.round(TA[grade].required*.035*Math.min(1,(e.r/player.r/.4)**1.5)));
}
const bodySpriteCache=new Map();
function bodySprite(e){
 const type=bodyType(e.r),style=e.style||0,palette=(e.palette||0)%9;
 if(type==='galaxy')return cosmicSprite(e.material,e.shape,style,palette);
 const key=type+':'+palette+':'+style;
 if(bodySpriteCache.has(key))return bodySpriteCache.get(key);
 const cv=document.createElement('canvas');cv.width=cv.height=256;
 const previous=ctx;ctx=cv.getContext('2d');
 const colors=['#d6b99b','#80b5ee','#f5c374','#55dce0','#ef95c1','#e0eeff','#b5d784','#68b2ff','#eea17b'];
 const color=colors[palette],rng=chunkRandom(style*93+palette*791+173);
 try{
  if(type==='asteroid')paintRock(128,128,88,color,style*.3,5);
  else if(type==='moon'){
   const shade=ctx.createRadialGradient(94,88,1,128,128,98);shade.addColorStop(0,'#d4d6da');shade.addColorStop(.5,color);shade.addColorStop(1,'#252b3b');ctx.fillStyle=shade;ctx.beginPath();ctx.arc(128,128,88,0,TAU);ctx.fill();
   for(let i=0;i<16;i++){const a=rng()*TAU,r=Math.sqrt(rng())*67;ctx.fillStyle='rgba(27,31,42,.24)';ctx.beginPath();ctx.arc(128+Math.cos(a)*r,128+Math.sin(a)*r,3+rng()*9,0,TAU);ctx.fill();}
  }
  else if(type==='planet'||type==='gasgiant'){
   const halo=ctx.createRadialGradient(128,128,83,128,128,100);halo.addColorStop(0,color+'65');halo.addColorStop(1,color+'00');ctx.fillStyle=halo;ctx.fillRect(0,0,256,256);
   paintPlanet(128,128,88,color,type==='gasgiant');
   if(type==='gasgiant'){ctx.strokeStyle=color+'80';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(128,128,118,26,-.3,0,TAU);ctx.stroke();}
  }else if(type==='star')paintStar(128,128,38,['#ff9c70','#ffe8a6','#a4cfff'][palette%3]);
  else if(type==='system'){
   paintStar(128,128,22,'#ffd49a');
   for(let i=0;i<42;i++){const a=rng()*TAU,r=28+rng()*72;glowDot(128+Math.cos(a)*r,128+Math.sin(a)*r*.7,1+rng()*3,i%3?'#a8cfff':'#ffe3b4',.3);}
  }else{
   for(let i=0;i<7;i++){const a=rng()*TAU,r=i?25+rng()*62:0,sz=20+rng()*27;const sprite=cosmicSprite(e.material,i%3,(style+i)%8,palette);ctx.drawImage(sprite,128+Math.cos(a)*r-sz,128+Math.sin(a)*r*.8-sz,sz*2,sz*2);}
  }
 }finally{ctx=previous;}
 bodySpriteCache.set(key,cv);return cv;
}

function macroOpacity(e,radius,opacity){
 // Size-relative culling is for microscopic debris, not a dimmer for galaxies.
 // Keep LOD transitions smooth; full absorption still fades via absorptionLight.
 const scaleFade=g.endless?1:clamp((e.r/player.r-.025)/.025,0,1);
 return (g.endless?1:clamp(.86+radius*.012,.86,1))*Math.sqrt(clamp(opacity,0,1))*scaleFade;
}
function drawMacro(e,time,zoom,opacity=1){
 const x=(e.x-camera.x)*zoom+W*.5,y=(e.y-camera.y)*zoom+H*.5;
 const radius=e.r*zoom;
 if(radius<.65||e.r/player.r<.025)return false;
 if(x<-radius*1.6-10||x>W+radius*1.6+10||y<-radius*1.6-10||y>H+radius*1.6+10)return false;
 const drawR=Math.min(radius,Math.max(W,H)*2)*(e.absorbScale??1);
 // LOD fades must never turn a whole class of galaxies black.
 const fade=absorptionLight(e); // Preserve the previous ring image; fade only after full entry.
 ctx.save();ctx.globalAlpha=macroOpacity(e,radius,opacity)*fade;
 if(e.kind==='blackhole'){
  if(drawR<3){ctx.fillStyle=['#69c9ed','#cda1f9','#ffcc8e'][e.holeType||0];ctx.fillRect(x-1,y-1,2,2);}
  else {const cv=blackHoleSprite(e.holeType||0);ctx.drawImage(cv,x-drawR*2,y-drawR*2,drawR*4,drawR*4);}
 }else if(drawR<3){ctx.fillStyle=GALAXY_PALETTES[(e.palette||0)%9][0];ctx.fillRect(x-1.2,y-1.2,2.4,2.4);}
 else {const cv=bodySprite(e);
  ctx.drawImage(cv,x-drawR*1.4,y-drawR*1.4,drawR*2.8,drawR*2.8);
 }
 ctx.restore();return true;
}
// Stable world-space LOD: ALL sampling anchors to the global origin (0,0).
// Older screen-relative steps made distant galaxies jump whenever a boundary
// or camera zoom changed. Fade across two fixed power-of-two resolutions.
const cosmicAbsorptions=[],absorbingMacroKeys=new Set(Object.keys(g.freeFlights));
function absorptionKey(e){return `${e.level||0}:${e.chunk??(e.level?`${e.level}:${e.gx}:${e.gy}`:macroKey(e.gx,e.gy))}:${e.index}`;}
const macroLODCache=new Map();let cosmicHarvestTimer=0,cosmicSceneDirty=false,cosmicNextRedraw=0;
function macroLODNodes(gx,gy,level){
 const key=level+':'+gx+':'+gy;
 let nodes=macroLODCache.get(key);if(nodes)return nodes.map(driftBody);
 const stride=2**level;
 // Hash local cell indices, never enormous world coordinates. At scale
 // 10^60+ hashing gx as a float collapses many distinct galaxies to one seed.
 const cellX=Math.round(gx/stride),cellY=Math.round(gy/stride);
 const seed=seedHash(cellX*37+level*103,cellY*71-level*47),rng=chunkRandom(seed);
 const span=MACRO_SIZE*stride;
 const anchorX=(gx+rng()*stride)*MACRO_SIZE,anchorY=(gy+rng()*stride)*MACRO_SIZE;
 nodes=[];const count=2+(seed%4);
 for(let j=0;j<count;j++){
  const a=rng()*TAU,dist=(j===0?0:(.10+.32*rng())*span);
  const rx=anchorX+Math.cos(a)*dist,ry=anchorY+Math.sin(a)*dist;
  const sub=seedHash(cellX+j*113,cellY-j*191);
  const shape=(sub>>>4)%3,style=(sub>>>7)%8,palette=(sub>>>19)%9;
  const hole=j===0&&(sub%17===0),isUniverse=j===1&&sub%31===0,holeType=(sub>>>13)%3;
  const r=Math.max(30,Math.min(span*.34,span*(j===0?.09+rng()*.16:.028+rng()*.065)));
  nodes.push({x:rx,y:ry,r,style,palette,shape,holeType,material:MATERIAL_KEYS[(sub+level)%MATERIAL_KEYS.length],kind:isUniverse?'universe':'matter',cosmic:true,level,gx,gy,index:j});
 }
 if(macroLODCache.size>=1400){
  const stale=macroLODCache.keys();for(let i=0;i<220;i++)macroLODCache.delete(stale.next().value);
 }
 macroLODCache.set(key,nodes);return nodes.map(driftBody);
}
// Cosmic LOD objects are interactable, even when their sprites come from the
// cached far-field. Harvested identities persist; no giant per-frame physics.
function cosmicLODLevel(){
 const zoom=Math.max(1e-155,camera.zoom);
 const horizontal=Math.ceil(W/(MACRO_SIZE*zoom))+3;
 const vertical=Math.ceil(H/(MACRO_SIZE*zoom))+3;
 return clamp(Math.log2(Math.max(1,Math.sqrt(horizontal*vertical/36))),0,496);
}
// Rendering and harvesting always sample exactly the same world-space LOD.
// Prior versions only harvested a subset of the crossfaded levels and ignored
// level-zero bodies outside the local 5x5 simulation bubble.
function cosmicViewAt(x,y,width,height,zoom,referenceWidth=width,referenceHeight=height){
 zoom=Math.max(1e-155,zoom);
 const left=Math.floor((x-width*.5/zoom)/MACRO_SIZE)-1;
 const right=Math.ceil((x+width*.5/zoom)/MACRO_SIZE)+1;
 const top=Math.floor((y-height*.5/zoom)/MACRO_SIZE)-1;
 const bottom=Math.ceil((y+height*.5/zoom)/MACRO_SIZE)+1;
 const refCountX=Math.ceil(referenceWidth/(MACRO_SIZE*zoom))+3;
 const refCountY=Math.ceil(referenceHeight/(MACRO_SIZE*zoom))+3;
 const lod=clamp((Math.log2(refCountX)+Math.log2(refCountY)-Math.log2(36))*.5,0,496);
 const low=Math.floor(lod),fraction=lod-low;
 return {left,right,top,bottom,low,fraction,levels:fraction>.018&&low<496?[low,low+1]:[low]};
}
function cosmicVisibleLOD(referenceWidth=W,referenceHeight=H){
 return cosmicViewAt(camera.x,camera.y,W,H,camera.zoom,referenceWidth,referenceHeight);
}
function blackHoleGravityRadius(){
 const zoom=physicsZoom(),core=blackHoleCoreWorldRadius();
 return core+Math.max(216,core*zoom*2.64)*(1+upgradePower('gravity')*.012)*tester.gravity*7/zoom;
}
function applyBlackHoleGravity(e,dt){
 if(e.freeFlight&&g.freeFlights[flightKey(e)])Object.assign(e,freeFlightAt(g.freeFlights[flightKey(e)]));
 const zoom=physicsZoom(),dx=(player.x-e.x)*zoom,dy=(player.y-e.y)*zoom,d=Math.hypot(dx,dy);
 const core=blackHoleCoreWorldRadius(),touch=blackHoleTouchDistance(e,core)*zoom;
 const range=blackHoleGravityRadius()*zoom+touch-core*zoom;
 if(d>range){e.gravityBound=false;return !!e.freeFlight;}
 const strength=clamp(1-d/Math.max(1,range),0,1),acceleration=(308*strength+1400*strength*strength)*4*2.4*7;
 const ax=dx/Math.max(d,.001)*acceleration/zoom,ay=dy/Math.max(d,.001)*acceleration/zoom;
 e.vx=(e.motionVX||0)+ax*dt;e.vy=(e.motionVY||0)+ay*dt;
 e.x+=ax*dt*dt*.5;e.y+=ay*dt*dt*.5;e.motionVX=e.vx;e.motionVY=e.vy;
 e.gravityBound=true;rememberFlight(e);
 if(Math.hypot(player.x-e.x,player.y-e.y)*zoom<=touch)startAbsorption(e);
 return true;
}

function harvestCosmicLOD(dt){
 cosmicHarvestTimer+=dt;
 if(cosmicHarvestTimer<.075)return;
 cosmicHarvestTimer=0;
 if(cosmicAbsorptions.length>=240)return;
 const core=g.endless?blackHoleCoreWorldRadius():player.r,gravity=g.endless?blackHoleGravityRadius():ordinaryGravityRadius(),view=cosmicVisibleLOD();
 const contacts=[];
 // Select exactly the rendered LOD levels; only force/range use physicsZoom.
 // Promote visible LOD proxies when they enter the gravitational field,
 // before their rendered silhouette reaches the event horizon.
 for(const level of view.levels){
  const stride=2**level,span=MACRO_SIZE*stride;
  const px=Math.floor(player.x/span),py=Math.floor(player.y/span);
  const extent=Math.min(32,Math.ceil(gravity/span)+3);
  for(let iy=-extent;iy<=extent;iy++)for(let ix=-extent;ix<=extent;ix++){
   const cx=px+ix,cy=py+iy;
   const gx=cx*stride,gy=cy*stride;
   const key=level===0?macroKey(gx,gy):`${level}:${gx}:${gy}`;
   if(level===0&&macroLoaded.has(key))continue;
   const bag=level===0?g.depletedMacro:g.depletedCosmic;
   const mask=(bag[key]||0)>>>0;
   for(const e of (level===0?macroNodes(gx,gy):macroLODNodes(gx,gy,level))){
    if((mask&(1<<e.index))||absorbingMacroKeys.has(absorptionKey(e))||e.r/player.r<.025)continue;
    const dx=player.x-e.x,dy=player.y-e.y;
    const touch=g.endless?gravity+blackHoleTouchDistance(e,core)-core:gravity+e.r;
    if(Math.abs(dx)>touch||Math.abs(dy)>touch)continue;
    const d2=dx*dx+dy*dy;
    if(d2<=touch*touch)contacts.push({e,bag,key,d2,opacity:level===view.low?1-view.fraction:view.fraction});
   }
  }
 }
 // Old row-major budget repeatedly ate distant cells while nearby galaxies
 // appeared immune. Closest-first prevents this at supermassive scales.
 contacts.sort((a,b)=>a.d2-b.d2);
 let budget=Math.min(125,Math.max(45,Math.round(45+Math.log2(1+core/MACRO_SIZE)*4.5)));
 for(const {e,bag,key,opacity} of contacts){
  if(budget<=0||cosmicAbsorptions.length>=240)break;
  if((bag[key]||0)&(1<<e.index)||absorbingMacroKeys.has(absorptionKey(e)))continue;
  if(opacity<.025)continue;
  // Attraction does not deplete a sector; wait until the whole body is inside.
  const body={...e,cosmic:true,captureBag:bag,captureKey:key,captureOpacity:opacity};
  body.gravityBound=canAbsorbBody(body);body.vx=body.vy=0;
  absorbingMacroKeys.add(absorptionKey(body));cosmicAbsorptions.push(body);budget--;
 }
}
function promoteAbyssMatter(){
 if(!g.endless||!abyssPhysical.length||cosmicAbsorptions.length>=240)return;
 const view=cosmicVisibleLOD();let budget=42;
 for(const level of view.levels){
  const opacity=level===view.low?1-view.fraction:view.fraction;if(opacity<.025)continue;
  const stride=2**level,firstX=Math.floor(view.left/stride)*stride,firstY=Math.floor(view.top/stride)*stride;
  const columns=Math.min(36,Math.ceil((view.right-firstX)/stride)+1),rows=Math.min(28,Math.ceil((view.bottom-firstY)/stride)+1);
  for(let iy=0;iy<rows;iy++)for(let ix=0;ix<columns;ix++){
   const gx=firstX+ix*stride,gy=firstY+iy*stride,key=level===0?macroKey(gx,gy):`${level}:${gx}:${gy}`;
   if(level===0&&macroLoaded.has(key))continue;
   const bag=level===0?g.depletedMacro:g.depletedCosmic,mask=(bag[key]||0)>>>0;
   for(const e of (level===0?macroNodes(gx,gy):macroLODNodes(gx,gy,level))){
    if(budget<=0||cosmicAbsorptions.length>=240)return;
    if((mask&(1<<e.index))||absorbingMacroKeys.has(absorptionKey(e)))continue;
    if(!abyssPhysical.some(h=>Math.hypot(e.x-h.x,e.y-h.y)<h.r*5))continue;
    const body={...e,cosmic:true,gravityBound:true,rivalBound:true,vx:0,vy:0,captureBag:bag,captureKey:key,captureOpacity:opacity};
    absorbingMacroKeys.add(absorptionKey(body));cosmicAbsorptions.push(body);budget--;
   }
  }
 }
}
function blackHoleBodyValue(e){
 const ratio=clamp(e.r/blackHoleCoreWorldRadius(),0,2);
 return Math.min(1e280,Math.max(1,(g.matter+TA[g.tier].required)*Math.expm1(Math.log1p(ratio*ratio*.012)/(.38*2))));
}
function finishCosmicAbsorption(e){
 const bag=e.captureBag,key=e.captureKey,mask=(bag[key]||0)>>>0;
 if(mask&(1<<e.index)){e.dead=true;delete g.freeFlights[flightKey(e)];return;}
 bag[key]=(mask|(1<<e.index))>>>0;
 const value=blackHoleBodyValue(e);
 const amount=value*(1+upgradePower('harvest')*.075)*tester.loot*.1*BH_REWARD_SCALE;
 g.matter=Math.min(1e290,g.matter+amount);g.total=Math.min(1e290,g.total+amount);
 g.stageCollects=Math.min(1e290,g.stageCollects+amount);
 g.credits=Math.min(1e290,g.credits+amount*.4);g.collects++;
 const resource=e.kind==='blackhole'||e.kind==='universe'?'exotic':(e.material||'gas');
 g.materials[resource]=(g.materials[resource]||0)+(resource==='exotic'?.3:.2);
 g.endlessGrowth=(g.endlessGrowth||0)+Math.log1p(amount)*.0008;
 e.dead=true;delete g.freeFlights[flightKey(e)];player.targetR=currentRadius();cosmicSceneDirty=true;
}

function renderMacroBackground(time,referenceWidth=W,referenceHeight=H){
 macroVisibleCount=0;
 const zoom=Math.max(1e-155,camera.zoom);
 const {left,right,top,bottom,low,fraction}=cosmicVisibleLOD(referenceWidth,referenceHeight);
 ctx.save();
 function renderLevel(level,opacity){
  if(opacity<.025)return;
  const stride=2**level,startX=Math.floor(left/stride)*stride,startY=Math.floor(top/stride)*stride;
  const countX=Math.min(32,Math.ceil((right-startX)/stride)+1),countY=Math.min(24,Math.ceil((bottom-startY)/stride)+1);
  for(let iy=0;iy<countY;iy++)for(let ix=0;ix<countX;ix++){
   const gx=startX+ix*stride,gy=startY+iy*stride;
   if(level===0){
    const key=macroKey(gx,gy);if(macroLoaded.has(key))continue;
    const mask=(g.depletedMacro[key]||0)>>>0;
    for(const e of macroNodes(gx,gy)){
     if((mask&(1<<e.index))||absorbingMacroKeys.has(absorptionKey(e)))continue;
     if(drawMacro(e,time,zoom,opacity))macroVisibleCount++;
    }
   }else{
    // Cache the exact same world-anchored proxies; rendering does not
    // reroll their RNG every frame or create thousands of temporary objects.
    const used=(g.depletedCosmic[level+':'+gx+':'+gy]||0)>>>0;
    for(const proxy of macroLODNodes(gx,gy,level)){
     if((used&(1<<proxy.index))||absorbingMacroKeys.has(absorptionKey(proxy)))continue;
     if(drawMacro(proxy,time,zoom,opacity))macroVisibleCount++;
    }
   }
  }
 }
 renderLevel(low,1-fraction);
 if(fraction>.018&&low<496)renderLevel(low+1,fraction);
 ctx.restore();
}
// Freeze the distant scene into a large, reusable world-aligned Canvas buffer.
// Every galaxy retains its exact colors, outline and coordinates. Only close
// physical bodies are drawn every frame. This avoids thousands of drawImage
// operations per frame on giant black holes and high-DPI screens.
let macroBackdrop=null,macroBackdropOld=null,macroFadeStart=0,macroBlend=null;
function renderMacroField(time){
 macroVisibleCount=0;
 // Reuse cached sprites, but project live positions every frame. A cached
 // backdrop would freeze their orbital motion until the next camera change.
 renderMacroBackground(time);
 for(const e of macroEntities)if(!e.dead&&drawMacro(e,time,camera.zoom,1))macroVisibleCount++;
 for(const e of cosmicAbsorptions)if(!e.dead)drawMacro(e,time,camera.zoom,e.captureOpacity);
}

function streamField(){
 // Below one sector per two pixels, only the visible cosmic LOD is useful.
 // Never increment astronomical world indices: x + 1 can equal x.
 if(CHUNK*camera.zoom<2||!Number.isSafeInteger(Math.floor(player.x/CHUNK))||!Number.isSafeInteger(Math.floor(player.y/CHUNK))){
  entities=entities.filter(e=>(e.absorbing||e.gravityBound)&&!e.dead);loadedChunks.clear();streamMacroBodies();streamFreeFlights();return;
 }
 // Keep physics bounded; stationary resources use the SAME viewport-wide layer
 // inside and outside this bubble at every endless-stage zoom.
 // This prevents 4K zoom-outs from loading thousands of gradient/shadow draw calls.
 const zoom=Math.max(.12,camera.zoom);
 const radius=clamp(Math.ceil(Math.max(W,H)/(2*CHUNK*zoom))+1,4,W*H>2500000?7:8);
 const active=new Set();
 for(const view of resourceViews(player.x,player.y)){
  const cx0=Math.floor(view.x/CHUNK),cy0=Math.floor(view.y/CHUNK);
  for(let iy=-radius;iy<=radius;iy++)for(let ix=-radius;ix<=radius;ix++){
   const cx=cx0+ix,cy=cy0+iy,k=chunkKey(cx,cy);active.add(k);makeChunk(cx,cy);
  }
 }
 for(const k of loadedChunks)if(!active.has(k))loadedChunks.delete(k);
 entities=entities.filter(e=>!e.dead&&(e.absorbing||e.gathering||e.gravityBound||(!e.freeFlight&&active.has(e.chunk))));
 streamMacroBodies();streamFreeFlights();
}
function streamFreeFlights(){
 const extent=Math.hypot(W,H)/Math.max(1e-155,camera.zoom);
 for(let i=cosmicAbsorptions.length-1;i>=0;i--){
  const e=cosmicAbsorptions[i];
  if(!e.absorbing&&!e.gathering&&!e.rivalBound&&(e.r/player.r<.025||(!e.gravityBound&&Math.hypot(e.x-camera.x,e.y-camera.y)>extent+e.r))){
   cosmicAbsorptions.splice(i,1);if(!e.freeFlight)absorbingMacroKeys.delete(absorptionKey(e));
  }
 }
 const present=new Set([...entities,...macroEntities,...cosmicAbsorptions].map(flightKey));
 for(const [key,record] of Object.entries(g.freeFlights)){
  if(present.has(key)||record.r/player.r<.025)continue;
  const e=freeFlightAt(record);
  if(Math.hypot(e.x-camera.x,e.y-camera.y)>extent+e.r)continue;
  if(e.captureKey)e.captureBag=e.level?g.depletedCosmic:g.depletedMacro;
  (e.captureKey?cosmicAbsorptions:e.macro?macroEntities:entities).push(e);
 }
}
// Render world-anchored low-cost proxies outside the physics bubble. Unlike
// decorative stars these exactly sample the same 32 deterministic sector bodies.
// A harvested body never reappears, even in this low-detail distant view.
function distantSamples(cx,cy){
 const key=chunkKey(cx,cy);
 let result=distantChunkCache.get(key);if(result)return result.map(driftBody);
 const info=chunkInfo(cx,cy),rng=chunkRandom(info.seed);result=[];
 for(let i=0;i<32;i++){
  const px=(cx+rng())*CHUNK,py=(cy+rng())*CHUNK;
  const r=rng();let kind=sectorType(info,r);
  if(Math.hypot(px,py)<110)kind='matter';
  const e=spawn(px,py,kind,rng);let material=materialFor(info.biome,Math.hypot(cx,cy),rng);if(i===1)material='ice';
  if(i===1)e.material='ice';
  const grade=clamp(Math.floor(Math.log(1+Math.hypot(cx,cy)/3)/Math.log(1.46)),0,27);
  const radius=e.r*Math.pow(1.125,grade)*(i%17===0?1.45:1);
  const value=e.value*(1+Math.pow(Math.max(1,radius/5),1.55)*.42)*(info.biome==='rich'?2.1:1);
  result.push({...e,x:px,y:py,index:i,chunk:key,kind,material,r:radius,value,grade});
 }
 if(distantChunkCache.size>1250)distantChunkCache.clear();
 distantChunkCache.set(key,result);return result.map(driftBody);
}
// One world-anchored dust layer across the whole viewport. Its coverage never
// depends on the square physics streaming bubble. Sampling is bounded in 4K.
function cosmicDustView(centerX=camera.x,centerY=camera.y){
 const zoom=Math.max(1e-155,camera.zoom),cell=CHUNK*zoom;
 if(cell<2)return null;
 const nx=W/cell+4,ny=H/cell+4;
 const lod=Math.max(0,Math.log2(Math.sqrt(nx*ny/96))),level=Math.floor(lod);
 const step=2**level,blend=lod-level;
 const left=Math.floor((centerX-W*.5/zoom)/CHUNK/step)*step-step;
 const top=Math.floor((centerY-H*.5/zoom)/CHUNK/step)*step-step;
 return {zoom,cell,step,blend,left,top,columns:Math.ceil(W/cell/step)+4,rows:Math.ceil(H/cell/step)+4};
}
function dustRepresentative(gx,gy,step){
 let x=gx,y=gy;
 for(let size=step;size>1;size/=2){
  const seed=seedHash(x/size+Math.log2(size)*97,y/size-311),half=size/2;
  x+=(seed&1)*half;y+=((seed>>>1)&1)*half;
 }
 return {x,y};
}
function dustSample(gx,gy,view){
 const {step,blend}=view,body=dustRepresentative(gx,gy,step);
 const parent=dustRepresentative(Math.floor(gx/(step*2))*step*2,Math.floor(gy/(step*2))*step*2,step*2);
 const f=blend*blend*(3-2*blend);
 return {...body,weight:body.x===parent.x&&body.y===parent.y?1:1-f};
}
function promoteCosmicDust(){
 if(!g.endless)return;
 let budget=64;
 for(const source of resourceViews(camera.x,camera.y)){
 const view=cosmicDustView(source.x,source.y);if(!view)return;
 const {zoom,step,left,top,columns,rows}=view,range=blackHoleGravityRadius()*zoom;
 for(let iy=0;iy<rows&&budget>0;iy++)for(let ix=0;ix<columns&&budget>0;ix++){
  const gx=left+ix*step,gy=top+iy*step,sample=dustSample(gx,gy,view);
  if(sample.weight<.04)continue;
  const cx=sample.x,cy=sample.y,key=chunkKey(cx,cy);
  if(loadedChunks.has(key))continue;
  const quota=sectorQuota(chunkInfo(cx,cy),cx,cy),mask=(g.depleted[key]||0)>>>0;
  for(const e of distantSamples(cx,cy)){
   if(budget<=0)break;
   if(e.index%4!==source.stream||e.index>=quota||(mask&(1<<e.index))||absorbingMacroKeys.has(absorptionKey(e)))continue;
   if(e.r/player.r<.025||e.r*zoom<.65)continue;
   if(Math.hypot(e.x-player.x,e.y-player.y)*zoom>range+e.r*zoom&&!abyssPhysical.some(h=>Math.hypot(e.x-h.x,e.y-h.y)<h.r*5))continue;
   const body={...e,vx:0,vy:0,gravityBound:true};
   absorbingMacroKeys.add(absorptionKey(body));entities.push(body);budget--;
  }
 }
 }
}

function renderCosmicDust(){
 for(const source of resourceViews(camera.x,camera.y)){
 const view=cosmicDustView(source.x,source.y);if(!view)return;
 const {zoom,cell,step,left,top,columns,rows}=view;
 const opacity=clamp((cell-2)/14,0,1)*.72;
 ctx.save();ctx.globalAlpha=opacity;
 for(let iy=0;iy<rows;iy++)for(let ix=0;ix<columns;ix++){
  const gx=left+ix*step,gy=top+iy*step;
  // Select a stable actual sector within each group, not a decorative refill.
  const sample=dustSample(gx,gy,view);ctx.globalAlpha=opacity*sample.weight;
  if(sample.weight<.001)continue;
  const cx=sample.x,cy=sample.y,key=chunkKey(cx,cy);
  const info=chunkInfo(cx,cy),quota=sectorQuota(info,cx,cy),mask=(g.depleted[key]||0)>>>0;
  if(!g.endless&&loadedChunks.has(key))continue;
  for(const e of distantSamples(cx,cy)){
   if(e.index%4!==source.stream||(!g.endless&&loadedChunks.has(key))||e.index>=quota||(mask&(1<<e.index))||absorbingMacroKeys.has(absorptionKey(e)))continue;
   const x=(e.x-camera.x)*zoom+W*.5,y=(e.y-camera.y)*zoom+H*.5;
   if(x<0||y<0||x>W||y>H||e.r*zoom<.65||e.r/player.r<.025)continue;
   if(zoom>=.13){renderEntity(e,0,true);continue;}
   const r=clamp(e.r*zoom*.65,.65,2.8);
   ctx.fillStyle=MATERIALS[e.material]?.color||'#9bbddd';
   ctx.fillRect(x-r,y-r,r*2,r*2);
  }
 }
 ctx.restore();
 }
}

function renderDistantBodies(){renderCosmicDust();}

function respawn(e){delete g.freeFlights[flightKey(e)];markHarvested(e);absorbingMacroKeys.delete(absorptionKey(e));e.dead=true;if(e.macro)cosmicSceneDirty=true;}
// Contact starts continuous inward motion. Removal and reward happen only
// after the ENTIRE rendered body is behind the opaque event horizon.
function startAbsorption(e){
 if(e.dead||e.absorbing)return;
 e.absorbing=.000001;e.absorbScale=1;e.absorbOriginX=e.x;e.absorbOriginY=e.y;
 e.absorbDuration=clamp(.85+Math.hypot(e.x-player.x,e.y-player.y)*physicsZoom()/420,.85,1.6);
 if(e.chunk!==undefined||e.cosmic)absorbingMacroKeys.add(absorptionKey(e));
}
function absorptionLight(e){
 const t=clamp((e.lensFade||0)/.28,0,1);
 return 1-t*t*(3-2*t);
}
function animateAbsorption(e,dt){
 if(!e.absorbing||e.dead)return false;
 e.absorbing+=dt;
 const progress=clamp(e.absorbing/e.absorbDuration,0,1),travel=progress*progress;
 e.x=e.absorbOriginX+(player.x-e.absorbOriginX)*travel;
 e.y=e.absorbOriginY+(player.y-e.absorbOriginY)*travel;
 e.absorbScale=1-.999*travel;
 const zoom=Math.max(1e-155,camera.zoom),core=blackHoleCoreWorldRadius()*zoom;
 const fullRadius=(e.macro||e.cosmic?Math.min(e.r*zoom,Math.max(W,H)*2)*(e.kind==='blackhole'?2:1.4):Math.max(2,e.r*zoom*2))*e.absorbScale;
 const fullyInside=Math.hypot(e.x-player.x,e.y-player.y)*zoom+fullRadius<=core*.96;
 // Keep the old, complete source image for the Einstein ring. Once the whole
 // body is hidden, let its lensed light die smoothly before deleting it.
 if(fullyInside)e.lensFade=(e.lensFade||0)+dt;
 if(fullyInside&&e.lensFade>=.28){
  if(e.captureBag)finishCosmicAbsorption(e);else absorb(e);
  if(e.chunk!==undefined||e.cosmic)absorbingMacroKeys.delete(absorptionKey(e));
 }
 return true;
}

visitPosition();streamField();
// Permanent, lethal landmarks. Their coordinates/radii are independent of
// camera zoom, player growth and atlas LOD; origin lies outside every field.
const ABYSS_BASE=CHUNK*24,ABYSS_STEP=64;
let abyssPhysical=[],abyssVisual=[],abyssTimer=0,abyssNotice='';
// A small fixed catalogue, not a grid or a zoom-dependent set of proxies.
// There are only 1–3 irregularly placed landmarks per vast logarithmic band.
function buildAbyssCatalogue(){
 const catalogue=[];
 const names=['ЭРЕБ','НИКТА','ЛЕВИАФАН','НЕМЕЗИДА','ТАРТАР','ХАОС','КРОНОС','АНАНКЕ','МОРОС','ГИПЕРИОН','ОБЛИВИОН','АХЕРОН','СТИГИЯ','ТЕНЕБРИС','НОКС','УМБРА','АБАДДОН','АПОФИС','ЭРРА','ФОБОС','ДЕЙМОС','ОФИОН','АСТРЕЙ','КЕРБЕР','ЛЕТА','ФЛЕГЕТОН','ОРКУС','МОРФЕЙ','КТОН','СИГИЛ','НИХИЛЬ','ЭХО'];
 const titles=['ТИХИЙ ПРЕДЕЛ','ПАДШИЙ СВЕТ','ПОСЛЕДНИЙ РАССВЕТ','ВЕЧНАЯ НОЧЬ','ТЁМНЫЙ ВЕНЕЦ','ЗАБЫТАЯ ЭПОХА','ПУСТОЕ НЕБО','КРАЙ БЕСКОНЕЧНОСТИ'];
 for(let level=0;level<=80;level++){
  const rng=chunkRandom(seedHash(level+917,314159)^0x62b9d14f),base=ABYSS_BASE*ABYSS_STEP**level;
  const count=level===0?3:1+Math.floor(rng()*3),band=[];
  for(let i=0;i<count;i++){
   let h;
   for(let attempt=0;attempt<32;attempt++){
    const angle=rng()*TAU,distance=base*(18+rng()*39),r=base*(.65+rng()*1.25);
    h={x:Math.cos(angle)*distance,y:Math.sin(angle)*distance,r,level,id:`abyss:${level}:${i}`,
     name:(rng(),names[((level*3+i)*17)%names.length]+' — '+titles[Math.floor((level*3+i)/names.length)])};
    if(band.every(other=>Math.hypot(other.x-h.x,other.y-h.y)>Math.max(other.r,h.r)*12))break;
   }
   band.push(h);catalogue.push(Object.freeze(h));
  }
 }
 return Object.freeze(catalogue);
}
const ABYSS_CATALOGUE=buildAbyssCatalogue();
g.abyssConsumed=Object.fromEntries(ABYSS_CATALOGUE.filter(h=>g.abyssConsumed?.[h.id]===true).map(h=>[h.id,true]));
g.abyssPositions=Object.fromEntries(ABYSS_CATALOGUE.filter(h=>!g.abyssConsumed[h.id]&&Array.isArray(g.abyssPositions?.[h.id])&&g.abyssPositions[h.id].length===2&&g.abyssPositions[h.id].every(Number.isFinite)).map(h=>[h.id,g.abyssPositions[h.id]]));
function livingAbysses(){
 return ABYSS_CATALOGUE.filter(h=>!g.abyssConsumed[h.id]).map(h=>{
  const p=g.abyssPositions[h.id];return p?{...h,x:p[0],y:p[1]}:h;
 });
}
function canEatAbyss(h){return g.endless&&h.r<blackHoleCoreWorldRadius();}
function finishAbyssAbsorption(h){
 if(g.abyssConsumed[h.id])return;
 const ratio=clamp(h.r/blackHoleCoreWorldRadius(),0,1);
 const amount=Math.min(1e280,Math.max(100,(g.matter+TA[g.tier].required)*Math.expm1(Math.log1p(ratio*ratio)/(2*.38))))*.1;
 g.abyssConsumed[h.id]=true;delete g.abyssPositions[h.id];
 g.matter=Math.min(1e290,g.matter+amount);g.total=Math.min(1e290,g.total+amount);
 g.stageCollects=Math.min(1e290,g.stageCollects+amount);g.credits=Math.min(1e290,g.credits+amount*.4);
 g.collects++;g.materials.exotic+=1;player.targetR=currentRadius();
 abyssVisual=abyssVisual.filter(b=>b.id!==h.id);abyssTimer=0;atlas.dirty=true;
 toast(`◉ ПОГЛОЩЕНА ${h.name} · +${fmt(amount)} МАТЕРИИ`);save();
}
function attractSmallerAbyss(h,dt){
 const saved=g.abyssPositions[h.id];if(saved)h={...h,x:saved[0],y:saved[1]};
 const core=blackHoleCoreWorldRadius(),dx=player.x-h.x,dy=player.y-h.y,d=Math.hypot(dx,dy);
 const range=blackHoleGravityRadius()+h.r;if(d>range)return;
 // Exact world radius: no minimum sprite size, no vanishing at first contact.
 const speed=2.4*Math.max(core*3.08,896/physicsZoom())*(.3+.7*(1-clamp(d/range,0,1)));
 const travel=Math.min(d,speed*dt),fraction=d>0?travel/d:0;
 h={...h,x:h.x+dx*fraction,y:h.y+dy*fraction};
 g.abyssPositions[h.id]=[h.x,h.y];
 const visual=abyssVisual.findIndex(b=>b.id===h.id);if(visual>=0)abyssVisual[visual]=h;
 if(Math.hypot(h.x-player.x,h.y-player.y)+h.r<=core)finishAbyssAbsorption(h);
}
function abyssCandidates(x,y,extent=0,minRadius=0){
 // No size cutoff: even subpixel landmarks keep their identity on the atlas.
 // World rendering can cull pixels; neither zoom nor LOD creates new holes.
 return livingAbysses().filter(h=>Math.hypot(h.x-x,h.y-y)<=extent+h.r*7);
}
// Offline drift runs once when the player returns. No physics objects are spawned
// while the tab is closed and, crucially, NO evolution or death can occur.
let awayReport=null,awaitingAd=false,pendingDeath=g.pendingDeath||null;
function beginAway(){
 if(awaitingAd||window.SpacePlatform?.adBusy||pendingDeath||!g.time||g.awaySince)return;
 g.awaySince=Date.now();save();
}
function completeAway(){
 if(!g.awaySince||awaitingAd||window.SpacePlatform?.adBusy||pendingDeath)return null;
 const elapsed=Date.now()-g.awaySince;g.awaySince=0;
 if(elapsed<45000){save();return null;}
 const meta=window.SpaceMeta;if(!meta){save();return null;}
 const safeHoles=livingAbysses().filter(h=>!canEatAbyss(h));
 const heading=Number.isFinite(g.drift.heading)?g.drift.heading:
  Math.hypot(player.vx,player.vy)>10?Math.atan2(player.vy,player.vx):g.headingAngle||0;
 const path=meta.planDrift({x:player.x,y:player.y,heading,speed:flightSpeed(),
  seconds:elapsed/1000,radius:player.r,holes:safeHoles,maxHours:12});
 g.drift.route=meta.addRoute(g.drift.route,path.path);
 g.drift.seconds=(g.drift.seconds||0)+path.seconds;
 g.drift.totalDistance=(g.drift.totalDistance||0)+path.distance;
 g.drift.visits=(g.drift.visits||0)+1;g.drift.heading=path.heading;
 player.x=path.x;player.y=path.y;player.vx=player.vy=0;
 player.trail.length=0;camera.x=path.x;camera.y=path.y;
 // Collect real progression currency through a *bounded* offline estimate.
 // The simulator has no entity collisions and never unlocks a stage.
 const gain=g.endless?Math.min(1e280,Math.max(100,g.matter)*path.seconds/65000):
  meta.driftReward(TA[g.tier].required,g.matter,path.seconds);
 const before=g.matter;
 g.matter=Math.min(1e290,g.endless?g.matter+gain:Math.min(TA[g.tier].required,g.matter+gain));
 const earned=Math.max(0,g.matter-before);
 g.total=Math.min(1e290,g.total+earned);
 g.stageCollects=Math.min(1e290,g.stageCollects+earned);
 g.credits=Math.min(1e290,g.credits+earned*.12);
 if(!g.endless&&earned>0){
  const fraction=earned/Math.max(1,TA[g.tier].required);
  for(const need of stageRecipe()){
   g.materials[need.type]=Math.min(1e290,(g.materials[need.type]||0)+need.amount*fraction*.9);
  }
 }
 let discoveries=0;
 for(const p of path.path){
  if(!p||!p.every(Number.isFinite))continue;
  const x=Math.floor(p[0]/CHUNK),y=Math.floor(p[1]/CHUNK);
  const key=chunkKey(x,y);
  if(visitedChunks.has(key))continue;
  visitedChunks.add(key);g.visited.push(key);discoveries++;
 }
 g.stageExplored=(g.stageExplored||0)+discoveries;
 if(!g.endless&&g.matter>=TA[g.tier].required)g.awaitingReturnEvolution=true;
 g.worldX=player.x;g.worldY=player.y;
 player.targetR=currentRadius();
 g.drift.last={seconds:path.seconds,gain:earned,credits:earned*.12,
  distance:path.distance,avoided:path.avoided,discoveries,at:Date.now()};
 awayReport=g.drift.last;lastReveal={x:Infinity,y:Infinity,r:-Infinity};
 atlas.dirty=true;refreshAbysses();save();
 return awayReport;
}
function resumeFromAway(){
 if(g.awaitingReturnEvolution){g.awaitingReturnEvolution=false;save();}
}
function drawDriftRoute(c,w,h,scale){
 const route=g.drift?.route;
 if(!Array.isArray(route)||route.length<2)return;
 c.save();c.lineWidth=2.7;c.setLineDash([9,5]);
 c.strokeStyle='rgba(164,113,255,.95)';c.shadowBlur=12;c.shadowColor='#a876ff';
 c.beginPath();
 let connected=false;
 for(const point of route){
  const px=w/2+(point[0]-atlas.x)*scale,py=h/2+(point[1]-atlas.y)*scale;
  if(!Number.isFinite(px)||!Number.isFinite(py)){connected=false;continue;}
  // Keep path continuity across view boundaries; browser clips canvas itself.
  if(!connected)c.moveTo(px,py);else c.lineTo(px,py);connected=true;
 }
 c.stroke();c.setLineDash([]);
 const end=route[route.length-1],x=w/2+(end[0]-atlas.x)*scale,y=h/2+(end[1]-atlas.y)*scale;
 if(Number.isFinite(x)&&Number.isFinite(y)){
  c.fillStyle='#dfbfff';c.strokeStyle='#322052';c.lineWidth=2;
  c.beginPath();c.arc(x,y,6,0,TAU);c.fill();c.stroke();
 }
 c.restore();
}
function atlasFocusDrift(){
 const route=g.drift?.route;if(!route?.length)return;
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const [x,y] of route){if(!Number.isFinite(x)||!Number.isFinite(y))continue;
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 if(!Number.isFinite(minX))return;
 const bounds=$('atlas-canvas')?.getBoundingClientRect();if(!bounds)return;
 const width=Math.max(CHUNK*2,maxX-minX),height=Math.max(CHUNK*2,maxY-minY);
 atlas.x=(minX+maxX)/2;atlas.y=(minY+maxY)/2;
 atlas.zoom=clamp(Math.min(bounds.width/width,bounds.height/height)*.77*CHUNK/27,1e-155,12);
 atlas.focusTween=null;atlas.dirty=true;
}
function nearestAbyss(){
 let nearest=null,distance=Infinity;
 for(const h of livingAbysses()){
  if(h.r<player.r*18)continue;
  const d=Math.hypot(h.x-player.x,h.y-player.y)-h.r;
  if(d<distance){nearest=h;distance=d;}
 }
 return nearest;
}
function abyssPull(h,x,y,speed){
 const dx=h.x-x,dy=h.y-y,d=Math.hypot(dx,dy),q=d/h.r;
 if(q>=5||d===0)return {x:0,y:0};
 const influence=clamp((5-q)/4,0,1),v=speed*25.2*influence*influence;
 return {x:dx/d*v,y:dy/d*v};
}
function crossesAbyss(h,x0,y0,x1,y1){
 // Normalise before squaring: even 1e140-world-unit horizons remain finite.
 const ax=(x0-h.x)/h.r,ay=(y0-h.y)/h.r,bx=(x1-h.x)/h.r,by=(y1-h.y)/h.r;
 const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
 const t=length>0?clamp(-(ax*dx+ay*dy)/length,0,1):0;
 return Math.hypot(ax+dx*t,ay+dy*t)<=1;
}
function refreshAbysses(){
 abyssPhysical=abyssCandidates(player.x,player.y,Math.max(g.endless?blackHoleGravityRadius():player.r,Math.hypot(player.vx,player.vy)*.4));
 const zoom=Math.max(1e-155,camera.zoom);
 abyssVisual=abyssCandidates(camera.x,camera.y,Math.hypot(W,H)/zoom,2/zoom);
}
function updateAbysses(dt,speed,oldX,oldY){
 abyssTimer-=dt;if(abyssTimer<=0){abyssTimer=.18;refreshAbysses();}
 let strongest=null,strongestPull=0;
 for(const h of abyssPhysical){
  if(g.abyssConsumed[h.id])continue;
  if(canEatAbyss(h)){attractSmallerAbyss(h,dt);continue;}
  const pull=abyssPull(h,player.x,player.y,speed),force=Math.hypot(pull.x,pull.y);
  player.x+=pull.x*dt;player.y+=pull.y*dt;
  if(force>strongestPull){strongest=h;strongestPull=force;}
  if(crossesAbyss(h,oldX,oldY,player.x,player.y)){dieInAbyss(h);return false;}
 }
 const ahead=strongest||abyssPhysical.filter(h=>!g.abyssConsumed[h.id]&&!canEatAbyss(h)).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)/a.r-Math.hypot(b.x-player.x,b.y-player.y)/b.r)[0];
 const warning=$('abyss-warning');
 const notice=strongest?`⚠ ${strongest.name} · ГРАВИТАЦИОННЫЙ ЗАХВАТ · До горизонта ${lightYears(Math.max(0,Math.hypot(strongest.x-player.x,strongest.y-player.y)-strongest.r))} · Риск потери текущего полёта`:ahead?`⚠ ВПЕРЕДИ ${ahead.name} · До горизонта ${lightYears(Math.max(0,Math.hypot(ahead.x-player.x,ahead.y-player.y)-ahead.r))} · Смертельная чёрная дыра`:'';
 if(notice!==abyssNotice){abyssNotice=notice;warning.textContent=notice;warning.hidden=!notice;}
 return true;
}
function pullBodyIntoAbyss(e,dt){
 if(e.dead)return true;
 for(const h of abyssPhysical){
  if(g.abyssConsumed[h.id]||canEatAbyss(h))continue;
  const d=Math.hypot(h.x-e.x,h.y-e.y);if(d>h.r*5)continue;
  const zoom=physicsZoom(),pull=abyssPull(h,e.x,e.y,180/zoom);
  const x=e.x,y=e.y;e.x+=pull.x*dt;e.y+=pull.y*dt;
  // Keep a single live image while the rival moves it out of its sector.
  e.gravityBound=true;e.rivalBound=true;e.absorbing=0;absorbingMacroKeys.add(absorptionKey(e));
  if(crossesAbyss(h,x,y,e.x,e.y)){
   if(e.captureBag)e.captureBag[e.captureKey]=((e.captureBag[e.captureKey]||0)|(1<<e.index))>>>0;
   else markHarvested(e);
   e.dead=true;delete g.freeFlights[flightKey(e)];absorbingMacroKeys.delete(absorptionKey(e));cosmicSceneDirty=true;return true;
  }
  return true;
 }
 e.rivalBound=false;return false;
}
function paintAbyss(c,x,y,r,w,h){
 if(r<1||x+r*1.3<0||y+r*1.3<0||x-r*1.3>w||y-r*1.3>h)return;
 c.save();c.globalAlpha=1;
 if(r>Math.max(w,h)*32){
  // Locally a gigantic horizon is a wall. Avoid astronomical canvas arcs.
  const dx=w/2-x,dy=h/2-y,d=Math.hypot(dx,dy),nx=dx/(d||1),ny=dy/(d||1);
  const edgeX=x+nx*r,edgeY=y+ny*r,span=Math.hypot(w,h)*4;
  if(d+span<r){c.fillStyle='#010205';c.fillRect(0,0,w,h);}
  else if(d-span<r){
   c.translate(edgeX,edgeY);c.rotate(Math.atan2(ny,nx));
   c.fillStyle='#010205';c.fillRect(-span,-span,span,span*2);
   const light=c.createLinearGradient(0,0,65,0);light.addColorStop(0,'rgba(201,221,241,.5)');light.addColorStop(1,'rgba(85,116,160,0)');
   c.fillStyle=light;c.fillRect(0,-span,65,span*2);
  }
  c.restore();return;
 }
 const glow=c.createRadialGradient(x,y,r*.96,x,y,r*1.28);
 glow.addColorStop(0,'rgba(0,0,0,1)');glow.addColorStop(.14,'rgba(207,222,235,.42)');glow.addColorStop(.33,'rgba(116,145,174,.16)');glow.addColorStop(1,'rgba(77,100,150,0)');
 c.fillStyle=glow;c.beginPath();c.arc(x,y,r*1.28,0,TAU);c.fill();
 c.fillStyle='#010205';c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
 c.strokeStyle='rgba(222,232,245,.65)';c.lineWidth=Math.max(.8,Math.min(2,r*.008));c.stroke();
 c.strokeStyle='rgba(136,164,195,.16)';c.lineWidth=1;
 c.beginPath();c.ellipse(x,y,r*1.17,r*1.07,-.25,0,TAU);c.stroke();
 c.restore();
}
function renderAbysses(){
 const zoom=Math.max(1e-155,camera.zoom);
 for(const h of abyssVisual){
  if(g.abyssConsumed[h.id])continue;
  const p=project(h.x,h.y);ctx.save();
  // Our opaque horizon hides the swallowed portion continuously.
  if(canEatAbyss(h)){
   const me=project(player.x,player.y),core=blackHoleCoreWorldRadius()*zoom;
   ctx.beginPath();ctx.rect(0,0,W,H);ctx.moveTo(me.x+core,me.y);ctx.arc(me.x,me.y,core,0,TAU);ctx.clip('evenodd');
  }
  paintAbyss(ctx,p.x,p.y,h.r*zoom,W,H);ctx.restore();
 }
 const h=abyssPhysical.filter(b=>!g.abyssConsumed[b.id]&&!canEatAbyss(b)).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)/a.r-Math.hypot(b.x-player.x,b.y-player.y)/b.r)[0];
 if(h){
  const p=project(h.x,h.y);
  if(p.x<45||p.y<115||p.x>W-45||p.y>H-175){
    const angle=Math.atan2(p.y-H/2,p.x-W/2);
    const safeLeft=W<=800?Math.min(177,W*.45):300,safeRight=W-48;
    const minY=W<=800?165:130,maxY=Math.max(minY+20,H-(W<=800?185:155));
    const x=clamp(W/2+Math.cos(angle)*W*.38,safeLeft,safeRight);
    const y=clamp(H/2+Math.sin(angle)*H*.34,minY,maxY);
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    ctx.shadowColor='#ffb4c5';ctx.shadowBlur=22;
    ctx.fillStyle='rgba(228,96,132,.22)';ctx.beginPath();ctx.arc(0,0,25,0,TAU);ctx.fill();
    ctx.strokeStyle='#ffb4c5';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,23,0,TAU);ctx.stroke();
    ctx.fillStyle='#ffe3e9';ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(-10,-12);ctx.lineTo(-5,0);ctx.lineTo(-10,12);ctx.closePath();ctx.fill();ctx.restore();
    ctx.save();ctx.font='800 12px Inter,sans-serif';ctx.textAlign='center';
    const label=h.name,ww=Math.min(192,Math.max(92,ctx.measureText(label).width+20)),tx=clamp(x-ww/2,7,W-ww-7);
    const labelY=clamp(y+34,10,H-35);
    ctx.fillStyle='rgba(28,10,30,.92)';ctx.strokeStyle='#df91ac';ctx.lineWidth=1;
    ctx.fillRect(tx,labelY,ww,25);ctx.strokeRect(tx+.5,labelY+.5,ww-1,24);
    ctx.fillStyle='#ffe0ea';ctx.fillText(label,tx+ww/2,labelY+17,ww-10);ctx.restore();
   }

 }
}
function atlasShowAbyss(){
 const h=nearestAbyss();if(!h)return;
 const bounds=$('atlas-canvas').getBoundingClientRect();
 const left=Math.min(player.x,h.x-h.r*1.6),right=Math.max(player.x,h.x+h.r*1.6);
 const top=Math.min(player.y,h.y-h.r*1.6),bottom=Math.max(player.y,h.y+h.r*1.6);
 atlas.x=(left+right)/2;atlas.y=(top+bottom)/2;
 atlas.zoom=clamp(Math.min(bounds.width/(right-left),bounds.height/(bottom-top))*.8*CHUNK/27,1e-155,12);atlas.dirty=true;
}
function testerVisitAbyss(){
 const h=nearestAbyss();if(!h)return;
 player.x=h.x-h.r*5.3;player.y=h.y;player.vx=player.vy=0;
 camera.x=player.x;camera.y=player.y;abyssTimer=0;clearFlightInput();
 testerRemakeNearby();refreshAbysses();save();testerToggle(false);showMap();atlasShowAbyss();
 toast('Снаружи поля притяжения. Вход за горизонт уничтожит тестовый прогресс.');
}

function burst(x,y,n,color='#7ed9ff',scale=1){const cap=g.particles?Math.min(30,n):Math.min(5,n);for(let i=0;i<cap;i++){const a=rand(0,TAU),sp=rand(35,180)*scale;particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rand(.3,.9),max:.9,r:rand(1,3.4)*scale,color});}if(particles.length>420)particles.splice(0,particles.length-420);}
function popText(x,y,text,color='#c7ebff'){texts.push({x,y,text,color,life:1.1});if(texts.length>35)texts.shift();}
// Per-form calibration: comparable-sized bodies matter; dust never grants a flat
// percentage of a planet/galaxy. No elapsed-time gate or passive mass income.
// Lower real rewards per body: progression is earned by collecting resources,
// recipes and discoveries — never by waiting out a timer. Calibration targets
// 10+ minutes to the final form under normal play, rather than a guaranteed cap.
// Early dust stays approachable; middle/late eras need many more real captures.
const CAMPAIGN_YIELD=[.036,.044,.052,.059,.061,.066,.070,.075,.080,.077,.066,.064,.062,.060,.058,.061,.066,.061,.060,.058,.057,.055,.054,.053,.052,.052,.050];
function campaignBodyValue(e){
 const ratio=clamp(e.r/Math.max(1,player.r),0,.95);
 return TA[g.tier].required*CAMPAIGN_YIELD[g.tier]*ratio*ratio;
}
function absorb(e){advanceHarvestChain();const mat=resourceOf(e);const boost=(1+upgradePower('harvest')*.075)*tester.loot;const val=g.endless?Math.max(1,Math.round(blackHoleBodyValue(e)*boost))*.1*BH_REWARD_SCALE:campaignBodyValue(e)*boost;g.matter=Math.min(1e290,g.matter+val);g.total=Math.min(1e290,g.total+val);g.stageCollects=Math.min(1e290,g.stageCollects+val);g.collects++;if(g.endless)g.endlessGrowth=(g.endlessGrowth||0)+Math.log1p(val)*.0004;
 const gain=mat==='exotic'?3:mat==='plasma'?2:mat==='gas'?2:mat==='crystal'?2:1;
 g.materials[mat]=(g.materials[mat]||0)+gain*(g.endless?.1*BH_REWARD_SCALE:1);
 if(!g.endless&&(mat==='plasma'||mat==='exotic')&&player.r<CHUNK*4)burst(e.x,e.y,9,MATERIALS[mat].color,.7);
 let credits=val*(e.kind==='relic'?1.7:.75);g.credits+=credits;if(e.kind==='relic'){g.materials.exotic=(g.materials.exotic||0)+.1;g.stageRare++;g.rare++;if(!g.endless&&player.r<CHUNK*4)burst(e.x,e.y,22,'#f9d797',.9);pickupFeedback(val,true);}else if(!g.endless&&player.r<CHUNK*4&&Math.random()<.24){burst(e.x,e.y,4,MATERIALS[mat].color,.35);}
 // The current physical size reacts to each collected object, not just to a stage transition.
 player.targetR=currentRadius();
 if(e.kind!=='relic')pickupFeedback(val,false);if(!g.endless&&player.r<CHUNK*4&&g.particles&&Math.random()<.36)energyArcs.push({x:e.x,y:e.y,toX:player.x,toY:player.y,r:e.r,life:.24,max:.24,color:e.kind==='relic'?'#ffe7af':'#77dfff'});respawn(e);if(!g.complete&&g.matter>=TA[g.tier].required&&missionsDone())evolve();}
// Bodies larger than you stay in the universe; avoid them until you outgrow them.
function applyGiantPull(dt,speed){
 if(g.endless)return;
 let fx=0,fy=0;
 for(const e of [...entities,...macroEntities,...cosmicAbsorptions]){
  if(e.dead||e.absorbing||canAbsorbBody(e))continue;
  const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy),range=e.r+player.r*4;
  if(d<=0||d>=range)continue;
  const force=speed*.9*(1-d/range)**2;
  fx+=dx/d*force;fy+=dy/d*force;
 }
 const length=Math.hypot(fx,fy),limit=speed*.65,k=length>limit?limit/length:1;
 player.vx+=fx*k*dt;player.vy+=fy*k*dt;
}
function collideWithGiant(e,dx,dy,dist){
 if(g.tier===TA.length-1||player.shield>0)return;
 const ux=dx/(dist||1),uy=dy/(dist||1);
 player.x+=ux*3;player.y+=uy*3;player.vx+=ux*130;player.vy+=uy*130;
 player.shield=.9;shake=5;
 const lost=0; // Contact redirects flight; oversized obstacles no longer tax stage progress.
 g.matter=Math.max(0,g.matter-lost);g.losses++;
 popText(player.x,player.y-player.r,'СЛИШКОМ БОЛЬШОЙ','#ffaba9');
 sound(135,'triangle',.16,.022);
}
function impact(e){if(g.tier===TA.length-1){e.kind='matter';e.material='plasma';e.value=Math.max(15,e.value||0);absorb(e);return;}if(player.shield>0){respawn(e);return;}const reduction=(1-Math.min(g.upgrade.shield,45)*.018)/(1+Math.max(0,upgradePower('shield')-45)*.018),lost=Math.ceil(Math.min(g.matter*.09,TA[g.tier].required*.028)*reduction);g.matter=Math.max(0,g.matter-lost);g.losses++;player.shield=1.3;shake=14;burst(player.x,player.y,30,'#ff777a');popText(player.x,player.y,`−${lost} МАТЕРИИ`,'#ff9f9b');sound(112,'sawtooth',.3,.065);respawn(e);}
function evolve(){
 if(g.complete||g.awaitingReturnEvolution)return;
 if(g.tier===TA.length-1){g.complete=true;g.endless=true;save();return;}
 const before=g.tier;
 spendRecipe();g.tier++;g.unlocks++;g.matter=0;g.stageCollects=0;g.stageRare=0;g.stagePulses=0;g.stageExplored=0;
 if(g.tier===TA.length-1){g.complete=true;g.endless=true;}
 // Never alter world coordinates, velocity, camera center or nearby sectors on evolution.
 morph={from:before,time:0,duration:2.1};screenFlash=.9;
 // No size reset on evolution: the new tier begins exactly where the previous ended.
 player.targetR=currentRadius();player.shield=3;shake=6;
 shockwaves.push({x:player.x,y:player.y,r:12,life:2.2,max:2.2,color:TA[g.tier].color,range:210});
 burst(player.x,player.y,100,TA[g.tier].color,2.1);
 energyArcs.push({x:player.x,y:player.y,life:2.2,max:2.2,r:player.r*2.5,color:TA[g.tier].color});
 popText(player.x,player.y-70,TA[g.tier].name.toUpperCase(),TA[g.tier].color);
 toast(`✦ НОВАЯ ФОРМА: ${TA[g.tier].name.toUpperCase()}`,'golden');sound(440,'triangle',.6,.055);
 renderUI(true);
}
function flashAbilityButton(id){
 const b=document.querySelector('#hud .v15-hud #'+id);if(!b)return;
 b.classList.remove('ability-fired');
 void b.offsetWidth; // replay animation even for keyboard activation
 b.classList.add('ability-fired');
 setTimeout(()=>b.classList.remove('ability-fired'),650);
}
function activatePulse(){
 if(!running||pulseCd>0)return;pulseCd=13;flashAbilityButton('pulse');g.pulses++;g.stagePulses++;
 const range=Math.max(270+upgradePower('gravity')*7,ordinaryGravityRadius()*1.25);
 shockwaves.push({x:player.x,y:player.y,r:player.r,max:1.2,life:1.2,color:'#84dfff',range});
 for(const e of [...entities,...macroEntities,...cosmicAbsorptions]){
  if(e.dead||e.absorbing||e.gathering||!canAbsorbBody(e))continue;
  const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);if(d>=range||!d)continue;
  if(e.kind==='hazard'){e.kind='matter';e.material='crystal';}
  const impulse=1100/Math.min(1,physicsZoom())*(1-d/range)*Math.min(1,(player.r/e.r)**2);
  e.vx=(e.motionVX||0)+dx/d*impulse;e.vy=(e.motionVY||0)+dy/d*impulse;
  e.motionVX=e.vx;e.motionVY=e.vy;rememberFlight(e);
 }
 shake=5;toast('◉ ГРАВИТАЦИОННЫЙ ИМПУЛЬС');sound(245,'sine',.55,.055);renderUI();
}
function activateBoost(){if(!running||boostCd>0)return;boostCd=6;flashAbilityButton('dash');boostTime=BOOST_DURATION;player.shield=Math.max(player.shield,.7);burst(player.x,player.y,20,'#bd9bff');sound(440,'triangle',.23);}
// A finite field changes momentum; it does not attach a body to the player.
// driftBody/freeFlightAt already advanced the inertial position to this time.
function deflectResource(e,dt,range){
 if(!canAbsorbBody(e)){e.gravityBound=false;return false;}
 const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);
 const inside=d<range&&d>0;
 e.gravityBound=inside;
 if(!inside)return false;
 const q=clamp(1-d/range,0,1),acceleration=2016*(g.tier<4?1.5:1)/Math.min(1,physicsZoom())*q*q*Math.min(1,(player.r/e.r)**2);
 const ax=dx/d*acceleration,ay=dy/d*acceleration;
 e.vx=(e.motionVX||0)+ax*dt;e.vy=(e.motionVY||0)+ay*dt;
 e.x+=ax*dt*dt*.5;e.y+=ay*dt*dt*.5;
 e.motionVX=e.vx;e.motionVY=e.vy;
 rememberFlight(e);return true;
}
function gatherBody(e,dt){
 if(!e.gathering)return false;
 e.gathering+=dt;
 const t=clamp(e.gathering/.55,0,1),ease=t*t*(3-2*t);
 const dx=e.gatherX-player.x,dy=e.gatherY-player.y,angle=t*Math.PI*.85;
 const x=dx*Math.cos(angle)-dy*Math.sin(angle),y=dx*Math.sin(angle)+dy*Math.cos(angle);
 e.x=player.x+x*(1-ease);e.y=player.y+y*(1-ease);e.absorbScale=1-ease*.98;
 if(t>=1)absorb(e);
 return true;
}
function update(dt){
 harvestChainTime=Math.max(0,harvestChainTime-dt);if(harvestChainTime===0)harvestChain=0;
 g.time+=dt;saveTimer+=dt;eventTimer+=dt;streamTimer+=dt;screenFlash=Math.max(0,screenFlash-dt*.8);if(morph){morph.time+=dt;if(morph.time>=morph.duration)morph=null;}pulseCd=Math.max(0,pulseCd-dt);boostCd=Math.max(0,boostCd-dt);boostTime=Math.max(0,boostTime-dt);player.shield=Math.max(0,player.shield-dt);shake=Math.max(0,shake-dt*30);
 let ax=0,ay=0;
 if(keys.has('w')||keys.has('arrowup'))ay-=1;if(keys.has('s')||keys.has('arrowdown'))ay+=1;
 if(keys.has('a')||keys.has('arrowleft'))ax-=1;if(keys.has('d')||keys.has('arrowright'))ax+=1;
 let mag=Math.hypot(ax,ay);
 if(mag>0){ax/=Math.max(1,mag);ay/=Math.max(1,mag);}
 else if((mobileControls?.isPhone()?g.mobileMode:g.controlMode)==='direction'){ax=Math.cos(g.headingAngle);ay=Math.sin(g.headingAngle);}
 else if(mobileControls?.isPhone()&&g.mobileMode!=='fixed'){const v=mobileControls.vector(dt);ax=v.x;ay=v.y;}
 else if(stick.active){ax=stick.x;ay=stick.y;}
 else if(!['keys','direction'].includes(g.controlMode)&&pointer.type==='mouse'&&pointer.active&&(pointer.down||g.controlMode==='follow')){
  const dx=pointer.x-W*.5,dy=pointer.y-H*.5,dist=Math.hypot(dx,dy);
  const strength=clamp((dist-18)/115,0,1);
  if(dist>0){ax=dx/dist*strength;ay=dy/dist*strength;}
 }
 player.targetR=currentRadius();
 player.r+=(player.targetR-player.r)*(1-Math.exp(-dt*4.5));
 const speed=flightSpeed()*boostMultiplier();
 // Direct flight stops almost immediately; "smooth" gives optional controlled inertia.
 const response=g.flightFeel==='smooth'?(ax||ay?7:11):(ax||ay?23:34),lerp=1-Math.exp(-dt*response);
 player.vx+=(ax*speed-player.vx)*lerp;player.vy+=(ay*speed-player.vy)*lerp;
 applyGiantPull(dt,speed);
 const oldX=player.x,oldY=player.y;
 player.x+=player.vx*dt;player.y+=player.vy*dt;
 if(!updateAbysses(dt,speed,oldX,oldY))return;
 visitPosition();player.rotation+=dt*(.13+Math.hypot(player.vx,player.vy)/850);
 if(Math.hypot(player.vx,player.vy)>28&&Math.random()<dt*24){player.trail.push({x:player.x,y:player.y,r:player.r,life:.55});}
 player.trail.forEach(p=>p.life-=dt);player.trail=player.trail.filter(p=>p.life>0).slice(-30);
 let gravRange=ordinaryGravityRadius(),collectR=g.endless?blackHoleCoreWorldRadius():player.r+(g.tier<4?10:4);
 const giantMode=g.endless&&player.r>CHUNK*5;
 // Fixed collection rate, independent of render FPS or the number of bodies
 // touched by the enormous horizon. This prevents a thousand simultaneous
 // harvests and the audible/visual 'batch' stutter every streaming tick.
 absorptionTokens=giantMode?Math.min(30,absorptionTokens+dt*clamp(150+Math.log10(Math.max(1,player.r/CHUNK))*30,150,325)):0;
 const captureRadius=giantMode?blackHoleCoreWorldRadius():collectR;
 const nearReach=giantMode?captureRadius+MACRO_SIZE:gravRange;
 const nearReachSq=nearReach*nearReach;
 const nearbyObjects=entities.concat(macroEntities,g.endless?[]:cosmicAbsorptions);
 // Full deterministic update each frame. Previously only a rotating subset was
 // simulated; objects jumped when their turn in the queue arrived.
 for(const e of nearbyObjects){
  if(e.dead)continue;
  if(!e.absorbing&&!e.gathering&&!e.gravityBound&&e.r/player.r<.025)continue;
  if(gatherBody(e,dt))continue;
  if(!e.absorbing&&!e.rivalBound&&!(g.endless&&e.gravityBound)){
   if(e.freeFlight)Object.assign(e,freeFlightAt(g.freeFlights[flightKey(e)]||{...e,flightTime:g.time}));
   else if(!e.gravityBound){
    if(!e.macro&&!e.cosmic){
     const v=RESOURCE_STREAMS[(e.index||0)%4];e.originX??=e.x;e.originY??=e.y;
     e.x=e.originX+v.x*(g.time-(g.flightEpoch||0));e.y=e.originY+v.y*(g.time-(g.flightEpoch||0));e.motionVX=v.x;e.motionVY=v.y;
    }else Object.assign(e,driftBody(e));
   }
  }
  if(pullBodyIntoAbyss(e,dt))continue;
  if(animateAbsorption(e,dt))continue;
  if(g.endless){applyBlackHoleGravity(e,dt);continue;}
  const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy);
  deflectResource(e,dt,gravRange*(e.material==='gas'?1.4:1));
  e.spin+=dt*.6;e.twinkle+=dt*2.5;
  if(Math.hypot(player.x-e.x,player.y-e.y)<(g.endless?blackHoleTouchDistance(e,collectR):collectR+e.r)){
   if(g.endless){startAbsorption(e);continue;}
   if(e.kind==='hazard'&&canAbsorbBody(e)){e.kind='matter';e.material='crystal';absorb(e);}
   else if(!canAbsorbBody(e))collideWithGiant(e,dx,dy,dist);
   else {e.gathering=.000001;e.gatherX=e.x;e.gatherY=e.y;e.gravityBound=true;absorbingMacroKeys.add(flightKey(e));}
  }
 }
 entities=entities.filter(e=>!e.dead);macroEntities=macroEntities.filter(e=>!e.dead);
 for(let i=cosmicAbsorptions.length-1;i>=0;i--){if(!g.endless){if(cosmicAbsorptions[i].dead)cosmicAbsorptions.splice(i,1);continue;}if(pullBodyIntoAbyss(cosmicAbsorptions[i],dt)){if(cosmicAbsorptions[i].dead)cosmicAbsorptions.splice(i,1);continue;}if(!animateAbsorption(cosmicAbsorptions[i],dt))applyBlackHoleGravity(cosmicAbsorptions[i],dt);if(cosmicAbsorptions[i].dead)cosmicAbsorptions.splice(i,1);}
 harvestCosmicLOD(dt);if(streamTimer>.32){streamTimer=0;streamField();promoteCosmicDust();promoteAbyssMatter();}
 // No random refill events: only unexplored, persistent sectors supply new matter.
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*2);p.vy*=Math.exp(-dt*2);p.life-=dt;}
 particles=particles.filter(p=>p.life>0);
 for(const p of shockwaves){p.life-=dt;p.r+=(p.range||700)*dt;}shockwaves=shockwaves.filter(p=>p.life>0);for(const arc of energyArcs)arc.life-=dt;energyArcs=energyArcs.filter(arc=>arc.life>0);
 texts.forEach(p=>{p.y-=dt*28;p.life-=dt;});texts=texts.filter(p=>p.life>0);
 // Tasty-Planet-style zoom: the camera follows physical size rather than abstract levels.
 // It deliberately zooms out slower than the body grows, so screen size also increases.
 // Early stages keep the familiar camera. The endless black hole zooms out
 // only as needed to keep its horizon visible, with no hard size ceiling.
 const horizonRadius=Math.max(player.r,player.targetR);
 const zTarget=g.endless?clamp(tester.zoom*(g.viewZoom||1)*(83+27*Math.log2(1+horizonRadius/100))/Math.max(1,horizonRadius),1e-155,2.5):campaignZoom(horizonRadius);
 const zoomResponse=g.endless?2.4:2;
 const ratioZ=clamp(zTarget/Math.max(camera.zoom,1e-155),1e-10,1e10);
 camera.zoom*=Math.exp(Math.log(ratioZ)*(1-Math.exp(-dt*zoomResponse)));
 camera.x+=(player.x-camera.x)*(1-Math.exp(-dt*5));camera.y+=(player.y-camera.y)*(1-Math.exp(-dt*5));
 uiTimer+=dt;if(uiTimer>.3){uiTimer=0;if(!g.endless&&!g.awaitingReturnEvolution&&g.matter>=TA[g.tier].required&&missionsDone())evolve();renderUI();checkProgression();}
 if(saveTimer>12){saveTimer=0;save();}
}
function project(x,y){return {x:(x-camera.x)*camera.zoom+W/2,y:(y-camera.y)*camera.zoom+H/2};}
function blackHoleCoreWorldRadius(){return player.r*BLACK_HOLE_CORE_FRACTION;}
function blackHoleTouchDistance(e,core=blackHoleCoreWorldRadius()){
 return core+e.r*((e.macro||e.cosmic)?(e.kind==='blackhole'?.90:1.12):1);
}

const dotCache=new Map();
function glowDot(x,y,r,color,intensity=1){
 if(r<1.7){ctx.fillStyle=color;ctx.fillRect(x-r*.5,y-r*.5,Math.max(1,r),Math.max(1,r));return;}
 // Reuse a small pre-painted light halo. This avoids per-object Canvas shadowBlur.
 let key=color;if(dotCache.size>100)dotCache.clear();
 let sprite=dotCache.get(key);
 if(!sprite){const cv=document.createElement('canvas');cv.width=cv.height=48;const c=cv.getContext('2d');
  const grad=c.createRadialGradient(24,24,1,24,24,24);
  grad.addColorStop(0,'#ffffff');grad.addColorStop(.28,color);grad.addColorStop(.54,color);grad.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=grad;c.fillRect(0,0,48,48);sprite=cv;dotCache.set(key,sprite);}
 const sr=Math.min(90,r*(1.7+intensity*.25));ctx.drawImage(sprite,x-sr,y-sr,sr*2,sr*2);
}
// Deep stars and faint galactic haze are painted once per resize/era.
// Keep fine stars at display resolution: downsampled pinpoints look like fog.
function ensureSkyLayer(){
 if(skyLayer&&skyLayerEpoch===g.tier&&skyLayer.width===frameCanvas.width&&skyLayer.height===frameCanvas.height)return;
 const previous=skyDepthLayers;
 skyDepthLayers=[{seed:0x8361a,density:.4,depth:.035,brightness:.6},{seed:0x41c078,density:.75,depth:.19,brightness:1}].map((layer,i)=>({
  ...layer,canvas:makeSkyDepthTexture(layer.seed,layer.density),x:previous[i]?.x||0,y:previous[i]?.y||0
 }));
 skyLayer=skyDepthLayers[0].canvas;skyLayerEpoch=g.tier;
}
function makeSkyDepthTexture(seed,density){
 const skyLayer=document.createElement('canvas');skyLayer.width=frameCanvas.width;skyLayer.height=frameCanvas.height;
 const c=skyLayer.getContext('2d'),rng=chunkRandom(seed);
 // Thousands of bright single-render-pixel stars, baked at the exact frame size.
 // Integer coordinates prevent subpixel coverage from making the stars dim.
 c.setTransform(1,0,0,1,0,0);
 const count=Math.min(72000,Math.max(4500,Math.floor(W*H/48)))*density;
 // Each association has a coherent hue, several knots and a curved outline.
 // Most stars belong to associations; sparse field stars leave dark gaps.
 const palettes=[['#a54dff','#c675ff','#d9a2ff'],['#35aaff','#60c6ff','#8ddbff'],
  ['#ff53b9','#ff7bd4','#ff9cde'],['#ffac3d','#ffc660','#ffdc8b'],
  ['#7860ff','#a18aff','#beadff']];
 const groups=Array.from({length:9},(_,i)=>{
  const angle=rng()*TAU,rx=W*(.055+rng()*.095)*1.65,ry=H*(.025+rng()*.045)*1.65;
  return {x:W*(.08+rng()*.84),y:H*(.09+rng()*.82),rx,ry,
   cos:Math.cos(angle),sin:Math.sin(angle),bend:(rng()-.5)*2.3,palette:palettes[i%palettes.length],
   knots:Array.from({length:3},()=>({x:(rng()-.5)*2.3,y:(rng()-.5)*1.1}))};
 });
 // Soft unresolved starlight follows the same irregular knots, so group hues
 // remain readable when a monitor or adaptive rendering downsamples the points.
 c.save();c.scale(skyLayer.width/W,skyLayer.height/H);
 for(const group of groups)for(const knot of group.knots){
  const u=knot.x*group.rx,v=(knot.y+Math.sin(knot.x*1.9)*group.bend)*group.ry;
  const cx=((group.x+u*group.cos-v*group.sin)%W+W)%W,cy=((group.y+u*group.sin+v*group.cos)%H+H)%H;
  const rx=group.rx*.85,ry=group.ry*1.1,bound=Math.max(rx,ry)*1.6;
  // Wrap each glow with its stars so tiled edges never expose a seam.
  for(let iy=-1;iy<=1;iy++)for(let ix=-1;ix<=1;ix++){
   const x=cx+ix*W,y=cy+iy*H;if(x+bound<0||x-bound>W||y+bound<0||y-bound>H)continue;
   c.save();c.translate(x,y);c.transform(group.cos,group.sin,-group.sin,group.cos,0,0);c.scale(rx,ry);
   const light=c.createRadialGradient(0,0,0,0,0,1.6);
   light.addColorStop(0,group.palette[0]+'24');light.addColorStop(.5,group.palette[0]+'0e');light.addColorStop(1,group.palette[0]+'00');
   c.fillStyle=light;c.fillRect(-1.6,-1.6,3.2,3.2);c.restore();
  }
 }
 c.restore();
 const gaussian=()=>Math.sqrt(-2*Math.log(Math.max(1e-8,rng())))*Math.cos(rng()*TAU);
 for(let i=0;i<count;i++){
  let x,y,color;
  if(rng()<.94){
   const group=groups[Math.floor(rng()*groups.length)],knot=group.knots[Math.floor(rng()*3)];
   const along=knot.x+gaussian()*.55;
   const across=knot.y+gaussian()*.6+Math.sin(along*1.9)*group.bend;
   const u=along*group.rx,v=across*group.ry;
   x=group.x+u*group.cos-v*group.sin;y=group.y+u*group.sin+v*group.cos;
   color=rng()<.025?'#f5f0ff':group.palette[Math.floor(rng()*group.palette.length)];
  }else{x=rng()*W;y=rng()*H;color=['#e4edff','#ffffff','#fff2d9','#d4e7ff'][i%4];}
  c.globalAlpha=.94+rng()*.06;c.fillStyle=color;
  c.fillRect(Math.floor(((x%W+W)%W)*skyLayer.width/W),Math.floor(((y%H+H)%H)*skyLayer.height/H),1,1);
 }
 c.globalAlpha=1;return skyLayer;
}
function drawSkyDepthLayer(layer,dx,dy){
 // Bounded screen-space offsets remain precise even at astronomical coordinates.
 layer.x=((layer.x-dx*layer.depth)%W+W)%W;
 layer.y=((layer.y-dy*layer.depth)%H+H)%H;
 const scale=Math.pow(g.viewZoom||1,layer.depth*.35),tw=W*scale,th=H*scale;
 const ox=((layer.x*scale+(W-tw)*.5)%tw+tw)%tw,oy=((layer.y*scale+(H-th)*.5)%th+th)%th;
 ctx.save();ctx.globalAlpha=layer.brightness;ctx.imageSmoothingEnabled=false;
 for(let y=oy-th;y<H;y+=th)for(let x=ox-tw;x<W;x+=tw){
  const left=Math.round(x*dpr)/dpr,top=Math.round(y*dpr)/dpr;
  ctx.drawImage(layer.canvas,left,top,Math.round((x+tw)*dpr)/dpr-left,Math.round((y+th)*dpr)/dpr-top);
 }
 ctx.restore();
}

function cometPath(rng){
 const a=rng()*TAU,ux=Math.cos(a),uy=Math.sin(a),span=Math.hypot(W,H)*.75;
 const offset=(rng()-.5)*Math.min(W,H)*.7,cx=W/2-uy*offset,cy=H/2+ux*offset;
 return {fromX:cx-ux*span,fromY:cy-uy*span,dx:ux*span*2,dy:uy*span*2};
}
let backgroundComets=[],nextBackgroundComet=4,lastCometTime=0,cometSequence=0,cometSprite=null;
function renderBackgroundComets(){
 if(g.time<lastCometTime){backgroundComets=[];nextBackgroundComet=g.time+4;}
 lastCometTime=g.time;
 if(g.time>=nextBackgroundComet){
  const rng=chunkRandom(0x7c09+cometSequence++*7919),duration=7+rng()*4;
  backgroundComets.push({born:g.time,duration,...cometPath(rng),length:110+rng()*130});
  nextBackgroundComet=g.time+8+rng()*8;
 }
 backgroundComets=backgroundComets.filter(c=>g.time-c.born<c.duration);
 for(const comet of backgroundComets)drawBackgroundComet(comet,g.time);
}
// The same needle-thin light profile is used in flight and in the menu.
function drawBackgroundComet(comet,time){
 if(!cometSprite){
  cometSprite=document.createElement('canvas');cometSprite.width=512;cometSprite.height=16;
  const c=cometSprite.getContext('2d'),tail=c.createLinearGradient(0,0,504,0);
  tail.addColorStop(0,'#b5dfff00');tail.addColorStop(.35,'#c0e3ff18');tail.addColorStop(.8,'#d7f0ff80');tail.addColorStop(1,'#f5fcffff');
  // A faint sheath around a subpixel taper, not a broad triangular plume.
  c.fillStyle=tail;c.globalAlpha=.18;c.fillRect(0,6,504,4);c.globalAlpha=1;
  c.beginPath();c.moveTo(0,8);c.lineTo(504,7);c.lineTo(504,9);c.closePath();c.fill();
  const head=c.createRadialGradient(504,8,0,504,8,4);
  head.addColorStop(0,'#ffffff');head.addColorStop(.25,'#edfaff');head.addColorStop(1,'#bce6ff00');
  c.fillStyle=head;c.fillRect(500,4,8,8);
 }
 const t=(time-comet.born)/comet.duration,x=comet.fromX+comet.dx*t,y=comet.fromY+comet.dy*t;
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(comet.dy,comet.dx));
 ctx.globalAlpha=Math.max(0,Math.min(1,t*8,(1-t)*8))*.9;
 // Fixed 8 CSS pixels for the whole glow; the luminous tail itself is 1 px.
 ctx.drawImage(cometSprite,-comet.length,-4,comet.length,8);ctx.restore();
}
let menuComets=[],nextMenuComet=0,lastMenuCometTime=-1,menuCometSequence=0;
function renderMenuComets(time){
 if(lastMenuCometTime<0||time<lastMenuCometTime||time-lastMenuCometTime>1){menuComets=[];nextMenuComet=time;}
 lastMenuCometTime=time;
 if(time>=nextMenuComet){
  const rng=chunkRandom(0x5ab8+menuCometSequence++*7919);
  const first=menuComets.length===0,duration=7+rng()*4;
  menuComets.push({born:time-(first?1.4:0),duration,...cometPath(rng),length:100+rng()*180});
  nextMenuComet=time+1.8+rng()*2;
 }
 menuComets=menuComets.filter(c=>time-c.born<c.duration).slice(-6);
 for(const comet of menuComets)drawBackgroundComet(comet,time);
}

let skyCameraX=camera.x,skyCameraY=camera.y;
function sky(t){
 // Integrate screen-space motion; raw world-coordinate modulo becomes random
 // at astronomical scales and makes the entire starfield sparkle/jump.
 const skyDX=clamp((camera.x-skyCameraX)*camera.zoom,-W,W);
 const skyDY=clamp((camera.y-skyCameraY)*camera.zoom,-H,H);
 skyCameraX=camera.x;skyCameraY=camera.y;
 ensureSkyLayer();ctx.fillStyle='#02040b';ctx.fillRect(0,0,W,H);
 for(const layer of skyDepthLayers)drawSkyDepthLayer(layer,skyDX,skyDY);
 for(const s of stars){
  const x=s.x=((s.x-skyDX*s.depth)%W+W)%W,y=s.y=((s.y-skyDY*s.depth)%H+H)%H;
  // Stars in vacuum shine steadily; no synchronized twinkling or stage dimming.
  ctx.globalAlpha=s.alpha;ctx.fillStyle=s.color;
  ctx.fillRect(Math.round(x*dpr)/dpr,Math.round(y*dpr)/dpr,1/dpr,1/dpr);
 }
 ctx.globalAlpha=1;
}
function paintRock(x,y,r,color,spin=0,craters=5){ctx.save();ctx.translate(x,y);ctx.rotate(spin);ctx.beginPath();for(let k=0;k<11;k++){let a=k/11*TAU,R=r*(.85+.09*Math.sin(k*4.17+spin));if(k===0)ctx.moveTo(Math.cos(a)*R,Math.sin(a)*R);else ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);}ctx.closePath();let grad=ctx.createRadialGradient(-r*.4,-r*.5,1,0,0,r*1.1);grad.addColorStop(0,'#dce8fa');grad.addColorStop(.25,color);grad.addColorStop(1,'#526887');ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle='rgba(188,211,238,.48)';ctx.lineWidth=1.2;ctx.stroke();for(let j=0;j<craters;j++){const a=j*2.4+spin*.1,R=r*(.15+.38*((j*7)%5)/5),cr=r*(.07+(j%3)*.03);ctx.fillStyle='rgba(27,35,64,.27)';ctx.beginPath();ctx.arc(Math.cos(a)*R,Math.sin(a)*R,cr,0,TAU);ctx.fill();}ctx.restore();}
function paintPlanet(x,y,r,color,gas=false){ctx.save();const gr=ctx.createRadialGradient(x-r*.38,y-r*.45,1,x,y,r*1.1);gr.addColorStop(0,'#edfbff');gr.addColorStop(.23,color);gr.addColorStop(.75,color);gr.addColorStop(1,'#304f85');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.clip();for(let k=0;k<5;k++){ctx.beginPath();ctx.ellipse(x+Math.sin(k*3.2)*r*.45,y-r*.75+k*r*.37,r*1.2,r*(gas?.12:.10),-.12,0,TAU);ctx.fillStyle=gas?'rgba(241,218,194,.20)':'rgba(120,239,220,.2)';ctx.fill();}ctx.restore();}
function paintStar(x,y,r,color){ctx.save();let halo=ctx.createRadialGradient(x,y,r*.25,x,y,r*2.6);halo.addColorStop(0,cssColor(color,.5));halo.addColorStop(.4,cssColor(color,.27));halo.addColorStop(1,cssColor(color,0));ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*2.6,0,TAU);ctx.fill();ctx.shadowColor=color;ctx.shadowBlur=r*1.3;let gr=ctx.createRadialGradient(x-r*.23,y-r*.25,0,x,y,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(.33,'#fff8c8');gr.addColorStop(.75,color);gr.addColorStop(1,cssColor(color,.65));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();}
function paintGalaxy(x,y,r,color,time){ctx.save();ctx.translate(x,y);ctx.rotate(time*.035);const glow=ctx.createRadialGradient(0,0,1,0,0,r*1.7);glow.addColorStop(0,cssColor(color,.22));glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,r*1.7,0,TAU);ctx.fill();for(let arm=0;arm<3;arm++){ctx.beginPath();for(let n=0;n<75;n++){let d=n/75*r*1.24,a=arm*TAU/3+n*.075;let xx=Math.cos(a)*d,yy=Math.sin(a)*d*.58;if(n===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.strokeStyle=cssColor(color,.65);ctx.lineWidth=Math.max(1,r*.13);ctx.lineCap='round';ctx.stroke();for(let n=0;n<29;n++){let d=(n+3)/32*r*1.1,a=arm*TAU/3+n*.18;ctx.fillStyle=n%4?'rgba(200,219,255,.65)':'#ffffff';ctx.beginPath();ctx.arc(Math.cos(a)*d,Math.sin(a)*d*.58,Math.max(.6,r*.025),0,TAU);ctx.fill();}}glowDot(0,0,r*.2,'#f9e8ff',1.2);ctx.restore();}
function paintBody(x,y,r,kind,color,time,shadow=true){if(shadow){ctx.save();ctx.fillStyle='rgba(0,0,0,.19)';ctx.beginPath();ctx.ellipse(x+3,y+r*.8,r*.75,r*.25,0,0,TAU);ctx.fill();ctx.restore();}
 if(kind==='dust'){glowDot(x,y,r*.7,color,2);glowDot(x-r*.13,y-r*.2,r*.2,'#ffffff',1.3);}else if(kind==='rock')paintRock(x,y,r,color,time*.1);else if(kind==='planet'||kind==='gas')paintPlanet(x,y,r,color,kind==='gas');else if(kind==='star')paintStar(x,y,r,color);else if(kind==='nebula'){paintGalaxy(x,y,r,color,time);glowDot(x,y,r*.28,color,1);}else if(kind==='galaxy')paintGalaxy(x,y,r,color,time);else if(kind==='cluster'||kind==='web'||kind==='universe'){paintGalaxy(x,y,r*1.1,color,time);ctx.save();for(let i=0;i<11;i++){let a=i*TAU/11+time*.06,R=r*(.75+.2*(i%3));glowDot(x+Math.cos(a)*R,y+Math.sin(a)*R*.68,r*.045,i%3?'#a3d7ff':'#ffddab',.5);}ctx.restore();}else glowDot(x,y,r,color);}
// A different silhouette and surface treatment for all 28 evolution stages.
// Organic accretion texture, generated once per variant. All hot-path drawing
// is image blitting; no evenly-spaced vector arcs or costly live gradients.
const accretionTextures=new Map();
// v3.6: cached, layered turbulent accretion art; no vector rings.
function getAccretionTexture(type=2){
 type=Math.max(0,Math.min(2,type|0));
 const cached=accretionTextures.get(type);if(cached)return cached;
 const S=type===2?720:480,C=S*.5,U=S*.255;
 const cv=document.createElement('canvas');cv.width=cv.height=S;
 const c=cv.getContext('2d',{willReadFrequently:true});
 const img=c.createImageData(S,S),data=img.data;
 const colors=[[[99,190,255],[207,237,255],[55,87,189]],[[199,114,255],[255,216,244],[89,84,200]],[[255,147,57],[255,239,185],[104,125,246]]];
 const col=colors[type],seed=1934+type*9931;
 const hash=(a,b)=>{let x=Math.imul(a+seed,374761393)^Math.imul(b-seed,668265263);
  x=Math.imul(x^(x>>>13),1274126177);return((x^(x>>>16))>>>0)/4294967295;};
 const noise=(x,y)=>{const a=Math.floor(x),b=Math.floor(y);let fx=x-a,fy=y-b;
  fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
  return (hash(a,b)*(1-fx)+hash(a+1,b)*fx)*(1-fy)+
    (hash(a,b+1)*(1-fx)+hash(a+1,b+1)*fx)*fy;};
 const sm=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
 const gaussian=x=>Math.exp(-x*x);
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){
  const px=(x-C)/U,py=(y-C)/U;
  const r=Math.hypot(px,py),theta=Math.atan2(py,px);
  if(r>2.02)continue;
  const ux=px*.94+py*.342,uy=(-px*.342+py*.94)/.405;
  const er=Math.hypot(ux,uy),a=Math.atan2(uy,ux);
  const s0=noise(ux*2.1+Math.cos(a)*.7,uy*2.0+Math.sin(a)*.5);
  const s1=noise(ux*6.3+2*s0,uy*6.8-1.7*s0);
  const s2=noise(ux*17+2*s1,uy*17-1.6*s1);
  const s3=noise(ux*44,uy*45);
  const warp=(s0-.5)*.32+(s1-.5)*.15;
  const q=er+warp;
  const disk=sm(.69,.91,q)*(1-sm(1.56,1.98,q));
  const filament=Math.pow(sm(.18,.78,s1*.52+s2*.35+s0*.19),1.12);
  const clumpy=.43+.44*s0+.35*s1+.15*s2+.08*s3;
  const approaching=clamp(1.17-.49*ux+.08*uy,.48,1.6);
  const innerHot=1-sm(1.02,1.92,er);
  const hotKnots=Math.pow(Math.max(0,noise(a*3.8+er*4.5,er*8.6)-.56)*2.8,1.9);
  const flux=disk*clumpy*(.68+.38*filament+.47*hotKnots)*approaching;
  const lensRadius=.59+.029*(s0-.5)+.02*(s2-.5);
  const lens=gaussian((r-lensRadius)/(.042+.011*s1))*(py<.13?1:.44)*(.58+.5*s1);
  const farGlow=gaussian((r-1.03)/.54)*(.055+.065*s0);
  const plasma=clamp(flux*.93+lens*.78+farGlow,0,1.25);
  const edge=sm(.465,.545,r);
  const hueMix=clamp(.10+.32*innerHot+.29*hotKnots,0,.82);
  const cool=clamp((er-1.43)*.53+(1-s0)*.11,0,.47);
  const intensity=clamp(.22+plasma*.77,0,1.07);
  const alpha=clamp((plasma*.82+farGlow*.55)*edge,0,.91);
  const i=(y*S+x)*4;
  for(let channel=0;channel<3;channel++){
   const warm=col[0][channel]*(1-hueMix)+col[1][channel]*hueMix;
   const v=(warm*(1-cool)+col[2][channel]*cool)*intensity;
   data[i+channel]=Math.round(clamp(v,0,255));
  }
  data[i+3]=Math.round(alpha*255);
  if(r<.527){const darkness=1-sm(.467,.528,r);
   data[i]=2;data[i+1]=2;data[i+2]=7;
   data[i+3]=Math.max(data[i+3],Math.round(255*darkness));}
 }
 c.putImageData(img,0,0);
 const rng=chunkRandom(seedHash(type*11+37,type*13+118));
 c.globalCompositeOperation='screen';
 for(let j=0;j<(type===2?5100:2650);j++){
  const a=rng()*TAU,rr=.83+Math.pow(rng(),.8)*1.05;
  const cloud=noise(Math.cos(a)*rr*6,Math.sin(a)*rr*6);
  if(rng()>.4+cloud*.4)continue;
  const ux=Math.cos(a)*rr,uy=Math.sin(a)*rr*.405;
  const X=C+(ux*.94-uy*.342)*U,Y=C+(ux*.342+uy*.94)*U;
  if(X<2||Y<2||X>S-2||Y>S-2)continue;
  const hot=clamp((1.5-ux*.52)*(.25+rng()*.75),.1,1.8);
  c.globalAlpha=clamp(hot*.65*(.45+cloud*.4),.07,.92);
  c.fillStyle=rng()>.87?'#ffffff':type===2?'#ffe1a4':type===1?'#f5c0ff':'#c0eaff';
  const d=.3+Math.pow(rng(),5)*2.1;c.fillRect(X,Y,d,d);
 }
 c.globalCompositeOperation='source-over';c.globalAlpha=1;
 accretionTextures.set(type,cv);return cv;
}
// The GPU samples the completed world buffer directly. There is no per-frame
// getImageData/readback or million-pixel JavaScript loop on the normal path.
const EINSTEIN_RING_SCALE=2.05;
function einsteinRingScale(){return EINSTEIN_RING_SCALE*clamp(Number(tester.ring)||1,.6,2.5);}
// Signed inverse lens equation: a source behind the centre becomes a ring,
// with a reversed secondary image between that ring and the opaque horizon.
// This warps the actual scene; it never paints an artificial luminous torus.
function lensSourceRadius(d,R,outer){
 const core=R*BLACK_HOLE_CORE_FRACTION,einstein=core*einsteinRingScale();
 const border=clamp((outer-d)/Math.max(1,R*.50),0,1);
 return d-einstein*einstein/Math.max(core*.99,d)*border*border*(3-2*border);
}
let gpuLens=null,gpuLensUnavailable=false,lensBackend='pending';
function initGpuLens(){
 if(gpuLensUnavailable)return null;
 const surface=document.createElement('canvas');
 const gl=surface.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
 if(!gl){gpuLensUnavailable=true;console.warn('Infiniti Space: WebGL unavailable, using Canvas lens');return null;}
 const shader=(type,source)=>{
  const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw new Error('Lens shader: '+message);}
  return sh;
 };
 const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}');
 const fragment=shader(gl.FRAGMENT_SHADER,`
 precision highp float;
 varying vec2 uv;
 uniform sampler2D scene;
 uniform vec2 viewport;
 uniform vec2 center;
 uniform float radius;
 uniform float outerRadius;
 uniform float ringScale;
 void main(){
  vec2 pixel=vec2(uv.x,1.-uv.y)*viewport;
  vec2 delta=pixel-center;
  float d=length(delta),core=radius*${BLACK_HOLE_CORE_FRACTION};
  vec4 original=texture2D(scene,uv);
  if(d<core*.99||d>=outerRadius){gl_FragColor=original;return;}
  float border=clamp((outerRadius-d)/max(1.,radius*.50),0.,1.);
  float einstein=core*ringScale;
  float sourceRadius=d-einstein*einstein/max(core*.99,d)*border*border*(3.-2.*border);
  vec2 source=(center+delta*(sourceRadius/max(.000001,d)))/viewport;
  if(source.x<0.||source.y<0.||source.x>1.||source.y>1.){gl_FragColor=original;return;}
  float outerStart=max(core+radius*.35,outerRadius-radius*.50);
  float f=clamp((outerRadius-d)/max(1.,outerRadius-outerStart),0.,1.);
  float edge=min(min(source.x*viewport.x,(1.-source.x)*viewport.x),min(source.y*viewport.y,(1.-source.y)*viewport.y));
  float edgeBlend=smoothstep(0.,max(8.,radius*.12),edge);
  gl_FragColor=mix(original,texture2D(scene,vec2(source.x,1.-source.y)),f*f*(3.-2.*f)*edgeBlend);
 }
 `);
 const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
 gl.deleteShader(vertex);gl.deleteShader(fragment);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Lens shader linking failed');
 gl.useProgram(program);
 const vertices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.uniform1i(gl.getUniformLocation(program,'scene'),0);
 const upload=document.createElement('canvas'),uploadCtx=upload.getContext('2d',{alpha:false});
 const state={surface,gl,upload,uploadCtx,width:0,height:0,maxSize:gl.getParameter(gl.MAX_TEXTURE_SIZE),
  viewport:gl.getUniformLocation(program,'viewport'),center:gl.getUniformLocation(program,'center'),
  ring:gl.getUniformLocation(program,'ringScale'),radius:gl.getUniformLocation(program,'radius'),outer:gl.getUniformLocation(program,'outerRadius')};
 surface.addEventListener('webglcontextlost',event=>{event.preventDefault();gpuLensUnavailable=true;gpuLens=null;});
 surface.addEventListener('webglcontextrestored',()=>{gpuLensUnavailable=false;gpuLens=null;});
 return state;
}
function renderGpuLens(p,R,outer){
 try{
  const state=gpuLens||(gpuLens=initGpuLens());if(!state)return false;
  const {gl,surface}=state;
  if(gl.isContextLost())return false;
  // Keep the world/front buffer sharp. Scale only the expensive lens upload
  // on high-DPI or slow devices, reusing the same texture between frames.
  const lensScale=g.autoQuality===false?dpr:Math.min(dpr,1.5)*Math.max(.7,performanceScale);
  const width=Math.min(frameCanvas.width,state.maxSize,Math.max(Math.min(900,W),Math.round(W*lensScale)));
  const height=Math.max(1,Math.round(width*H/W));if(height>state.maxSize)return false;
  let source=frameCanvas;
  if(width!==frameCanvas.width||height!==frameCanvas.height){
   if(state.upload.width!==width||state.upload.height!==height){state.upload.width=width;state.upload.height=height;}
   state.uploadCtx.drawImage(frameCanvas,0,0,width,height);source=state.upload;
  }
  if(state.width!==width||state.height!==height){
   state.width=surface.width=width;state.height=surface.height=height;
   gl.viewport(0,0,state.width,state.height);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
  }else gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
  gl.uniform2f(state.viewport,W,H);gl.uniform2f(state.center,p.x,p.y);
  gl.uniform1f(state.ring,einsteinRingScale());gl.uniform1f(state.radius,R);gl.uniform1f(state.outer,outer);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  // Consume the WebGL drawing buffer synchronously, before the browser can
  // discard it. The opaque horizon is still painted afterwards on frameCtx.
  ctx.drawImage(surface,0,0,W,H);lensBackend='gpu';return true;
 }catch(error){gpuLensUnavailable=true;gpuLens=null;console.warn('Infiniti Space: Canvas lens fallback',error.message);return false;}
}
// True gravitational lensing of the existing stars/galaxies. No gas or disk.
let lensInput=null,lensOutput=null,lensInputCtx=null,lensOutputCtx=null;
let blackHoleLensRetryAt=0,lensPixels=null;
const LUT=4096,ratioLut=new Float32Array(LUT+1),opacityLut=new Float32Array(LUT+1);
function buildLensPixelMap(sw,sh,left,top,sampleX,sampleY,px,py,core,outer,lutStep,ratioLut,opacityLut,scale,R,reuse){
 const {sqrt,min,max,floor,round}=Math,LUT=ratioLut.length-1,size=sw*sh;
 const clamp=(v,a,b)=>max(a,min(b,v));
 const map=reuse&&reuse.offset.length===size?reuse:{offset:new Int32Array(size),fx:new Float32Array(size),fy:new Float32Array(size),alpha:new Uint8Array(size)};
 map.offset.fill(-1);
 for(let iy=0;iy<sh;iy++)for(let ix=0;ix<sw;ix++){
  const dx=left+(ix+.5)/sampleX-px,dy=top+(iy+.5)/sampleY-py;
  const d=sqrt(dx*dx+dy*dy),idx=iy*sw+ix;
  if(d<core*.99||d>=outer)continue;
  const lookup=d/lutStep,k=min(LUT-1,floor(lookup)),t=lookup-k;
  const rr=ratioLut[k]+(ratioLut[k+1]-ratioLut[k])*t;
  const sx=(px+dx*rr-left)*sampleX-.5;
  const sy=(py+dy*rr-top)*sampleY-.5;
  if(sx<0||sy<0||sx>=sw-1||sy>=sh-1)continue;
  const x=floor(sx),y=floor(sy),fx=sx-x,fy=sy-y;
  map.offset[idx]=(y*sw+x)*4;map.fx[idx]=fx;map.fy[idx]=fy;
  const edge=clamp(min(sx,sy,sw-1-sx,sh-1-sy)/max(8*scale,R*.12*scale),0,1);
  map.alpha[idx]=round(255*opacityLut[k]*edge*edge*(3-2*edge));
 }
 return map;
}
function warpLensPixels(a,b,sw,sh,left,top,sampleX,sampleY,px,py,core,outer,lutStep,ratioLut,opacityLut,scale,R,mapping){
 const map=mapping||buildLensPixelMap(sw,sh,left,top,sampleX,sampleY,px,py,core,outer,lutStep,ratioLut,opacityLut,scale,R);
 const {offset,fx,fy,alpha}=map,stride=sw*4;
 for(let i=0;i<offset.length;i++){
  const p00=offset[i];if(p00<0)continue;
  const p01=p00+4,p10=p00+stride,p11=p10+4,idx=i*4,x=fx[i],y=fy[i];
  const w00=(1-x)*(1-y),w01=x*(1-y),w10=(1-x)*y,w11=x*y;
  b[idx]=a[p00]*w00+a[p01]*w01+a[p10]*w10+a[p11]*w11;
  b[idx+1]=a[p00+1]*w00+a[p01+1]*w01+a[p10+1]*w10+a[p11+1]*w11;
  b[idx+2]=a[p00+2]*w00+a[p01+2]*w01+a[p10+2]*w10+a[p11+2]*w11;
  b[idx+3]=alpha[i];
 }
}
let lensPixelMap=null,lensPixelMapKey='';
function renderBlackHoleLensing(target=null){
 if(!target&&g.tier!==TA.length-1)return;
 const p=target?.p||project(player.x,player.y),R=target?.R??Math.max(.01,player.r*camera.zoom);
 // The Einstein ring stays proportional to the actual black horizon.
 const outer=target?.outer??Math.min(R*2.30,Math.max(W,H)*.85);
 if(renderGpuLens(p,R,outer))return;
 lensBackend='cpu';
 const left=Math.max(0,Math.floor(p.x-outer)),top=Math.max(0,Math.floor(p.y-outer));
 const right=Math.min(W,Math.ceil(p.x+outer)),bottom=Math.min(H,Math.ceil(p.y+outer));
 const width=right-left,height=bottom-top;
 if(width<4||height<4)return;
 // Render near native screen resolution. The former 300px lens texture
 // was enlarged 3-8x on desktop and produced large blocky galaxies.
 // Dynamic quality scaling retains FPS on weaker hardware.
 const qualityTarget=Math.round(clamp(
  (W*H>=4000000?1450:1250)*Math.max(.7,performanceScale),900,1750
 ));
 const scale=g.autoQuality===false?dpr:Math.min(1,qualityTarget/Math.max(width,height));
 const sw=Math.max(1,Math.round(width*scale)),sh=Math.max(1,Math.round(height*scale));
 if(!lensInput){
  lensInput=document.createElement('canvas');lensOutput=document.createElement('canvas');
  lensInputCtx=lensInput.getContext('2d',{willReadFrequently:true});
  lensOutputCtx=lensOutput.getContext('2d');
 }
 if(lensInput.width!==sw||lensInput.height!==sh){
  lensInput.width=lensOutput.width=sw;lensInput.height=lensOutput.height=sh;
 }
 // The lens must sample the fully drawn BACK buffer, never the visible one.
 lensInputCtx.drawImage(frameCanvas,left*dpr,top*dpr,width*dpr,height*dpr,0,0,sw,sh);
 const a=lensInputCtx.getImageData(0,0,sw,sh).data;
 if(!lensPixels||lensPixels.width!==sw||lensPixels.height!==sh)lensPixels=lensOutputCtx.createImageData(sw,sh);
 const warped=lensPixels,b=warped.data;b.fill(0);
 const sampleX=sw/width,sampleY=sh/height,core=R*BLACK_HOLE_CORE_FRACTION;
 const outerStart=Math.max(core+R*.35,outer-R*.50),outerLength=Math.max(1,outer-outerStart);
 // Precompute the radial lens once per frame. At native HD resolutions,
 // recomputing the radial mapping for every pixel is needlessly expensive.
 const lutStep=outer/LUT;
 for(let k=0;k<=LUT;k++){
  const d=k*lutStep;
  const f=clamp((outer-d)/outerLength,0,1);
  ratioLut[k]=lensSourceRadius(d,R,outer)/Math.max(1e-6,d);
  opacityLut[k]=f*f*(3-2*f);
 }
 // Geometry is independent of the scene. Reuse subpixel-quantized lookup
 // coordinates, but sample the NEW moving scene every frame (never freeze light).
 const mapKey=[sw,sh,width,height,Math.round((p.x-left)*2),Math.round((p.y-top)*2),Math.round(R*2),Math.round(outer*2),einsteinRingScale()].join(':');
 if(mapKey!==lensPixelMapKey){
  lensPixelMap=buildLensPixelMap(sw,sh,left,top,sampleX,sampleY,p.x,p.y,core,outer,lutStep,ratioLut,opacityLut,scale,R,lensPixelMap);lensPixelMapKey=mapKey;
 }
 warpLensPixels(a,b,sw,sh,left,top,sampleX,sampleY,p.x,p.y,core,outer,lutStep,ratioLut,opacityLut,scale,R,lensPixelMap);
 lensOutputCtx.putImageData(warped,0,0);
 ctx.save();ctx.imageSmoothingEnabled=true;
 ctx.drawImage(lensOutput,left,top,width,height);ctx.restore();
}
let rivalLensRetryAt=0;
const rivalLensMaps=new Map();
function rivalLensTargets(){
 const targets=[],zoom=Math.max(1e-155,camera.zoom),screen=Math.max(W,H);
 for(const h of abyssVisual){
  if(g.abyssConsumed[h.id])continue;
  const p=project(h.x,h.y),core=h.r*zoom;
  if(!Number.isFinite(core)||core<5||core>screen*32)continue;
  const R=core/BLACK_HOLE_CORE_FRACTION,outer=Math.min(R*2.30,core+screen*.85);
  const nearest=Math.hypot(Math.max(0,-p.x,p.x-W),Math.max(0,-p.y,p.y-H));
  const farthest=Math.hypot(Math.max(Math.abs(p.x),Math.abs(p.x-W)),Math.max(Math.abs(p.y),Math.abs(p.y-H)));
  if(nearest>=outer||farthest<core)continue;
  targets.push({id:h.id,p,R,outer,priority:Math.abs(Math.hypot(p.x-W/2,p.y-H/2)-core)});
 }
 // The catalogue is sparse. Bound simultaneous full-screen distortion work.
 return targets.sort((a,b)=>a.priority-b.priority).slice(0,2);
}
function renderRivalLensing(){
 const targets=rivalLensTargets(),active=new Set(targets.map(h=>h.id));
 for(const id of rivalLensMaps.keys())if(!active.has(id))rivalLensMaps.delete(id);
 for(const target of targets){
  const playerMap=lensPixelMap,playerKey=lensPixelMapKey;
  const saved=rivalLensMaps.get(target.id);
  lensPixelMap=saved?.map||null;lensPixelMapKey=saved?.key||'';
  try{renderBlackHoleLensing(target);}
  finally{
   rivalLensMaps.set(target.id,{map:lensPixelMap,key:lensPixelMapKey});
   lensPixelMap=playerMap;lensPixelMapKey=playerKey;
  }
 }
}

function paintBlackHole(x,y,r,time){
 const R=Math.max(.01,r),core=R*BLACK_HOLE_CORE_FRACTION;
 ctx.save();
 ctx.globalAlpha=1;
 ctx.globalCompositeOperation='source-over';
 // Stable, cool illumination outside the horizon. No pulse, orange ring or disk.
 const halo=ctx.createRadialGradient(x,y,core*.88,x,y,core*1.92);
 halo.addColorStop(0,'rgba(1,2,5,1)');
 halo.addColorStop(.31,'rgba(1,2,5,1)');
 halo.addColorStop(.47,'rgba(153,209,255,.22)');
 halo.addColorStop(.63,'rgba(122,180,255,.13)');
 halo.addColorStop(.82,'rgba(93,134,218,.045)');
 halo.addColorStop(1,'rgba(60,95,168,0)');
 ctx.fillStyle=halo;
 ctx.beginPath();ctx.arc(x,y,core*1.92,0,TAU);ctx.fill();
 // Always opaque, always the same radius; lensing affects only the background.
 ctx.fillStyle='#010205';ctx.beginPath();ctx.arc(x,y,core,0,TAU);ctx.fill();
 ctx.restore();
}

function paintPlayerForm(x,y,r,time,tier=g.tier){
 const t=TA[tier],phase=time*.42;
 ctx.save();
 if(tier<=6){
  if(tier===0){for(let i=0;i<6;i++){let a=i*TAU/6+time*.22;glowDot(x+Math.cos(a)*r*(.7+i*.12),y+Math.sin(a)*r*(.7+i*.12),Math.max(1,r*.07),t.color,.4);}glowDot(x,y,r*.45,'#d6f9ff',1.3);}
  else paintRock(x,y,r,t.color,phase,1+Math.min(7,tier));
  if(tier===3||tier===4){for(let i=0;i<tier;i++){let a=i*2.4;glowDot(x+Math.cos(a)*r*.48,y+Math.sin(a)*r*.48,Math.max(1,r*.045),'#edc49b',.3);}}
  if(tier>=5){ctx.strokeStyle=cssColor(t.color,.5);ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r*1.18,-.6,2.9);ctx.stroke();}
  if(tier===6){glowDot(x,y,r*.24,'#ddf8ff',.6);}
 }else if(tier<=12){
  paintPlanet(x,y,r,t.color,tier>=11);
  ctx.save();ctx.translate(x,y);
  if(tier===7){for(let i=0;i<2;i++)glowDot(Math.cos(phase+i*3)*r*1.5,Math.sin(phase+i*3)*r*.6,r*.17,'#dce2ff',.5);}
  if(tier===8){ctx.fillStyle='rgba(243,254,255,.78)';ctx.beginPath();ctx.ellipse(0,-r*.69,r*.67,r*.21,-.3,0,TAU);ctx.fill();}
  if(tier===9){ctx.strokeStyle='#7af2ff';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,r*.05*i,r*.48+i*2.5,-2.7,-.5);ctx.stroke();}}
  if(tier===10){ctx.fillStyle='#76e3a5';for(let i=0;i<4;i++){let a=i*1.63;ctx.beginPath();ctx.ellipse(Math.cos(a)*r*.43,Math.sin(a)*r*.45,r*.19,r*.1,a,0,TAU);ctx.fill();}}
  if(tier===11){ctx.strokeStyle='#ffd2a4';ctx.lineWidth=3;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(-r*.72,i*r*.22);ctx.quadraticCurveTo(0,i*r*.17+r*.1,r*.72,i*r*.22);ctx.stroke();}}
  if(tier===12){ctx.strokeStyle='#dcf8ff';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,r*1.8,r*.42,-.18,0,TAU);ctx.stroke();}
  ctx.restore();
 }else if(tier<=18){
  const rays=tier===13?7:tier===14?11:tier===15?12:tier===16?18:tier===17?22:28;
  ctx.save();ctx.translate(x,y);ctx.rotate(phase*.35);
  for(let i=0;i<rays;i++){const a=i*TAU/rays,R=r*(tier>=17?1.9:1.5);ctx.strokeStyle=cssColor(t.color,tier>=17?.34:.25);ctx.lineWidth=(tier===18?2.1:1.8);ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.9,Math.sin(a)*r*.9);ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);ctx.stroke();}
  ctx.restore();paintStar(x,y,r,t.color);
  if(tier===18){ctx.save();ctx.strokeStyle='#cde4ff';ctx.lineWidth=1.5;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(x,y,r*(1.4+i*.14),time*.26+i,3.2+time*.26+i);ctx.stroke();}ctx.restore();}
 }else if(tier<=27){
  if(tier===19){ctx.globalAlpha=.9;paintGalaxy(x,y,r*1.38,t.color,time);ctx.globalAlpha=1;glowDot(x,y,r*.2,'#fff7ff');}
  else if(tier===20){for(let i=0;i<13;i++){let a=i*2.399+phase;let R=Math.sqrt(i/13)*r*1.1;glowDot(x+Math.cos(a)*R,y+Math.sin(a)*R,r*(i%3===0?.18:.1),i%2?'#ffe6b7':t.color,.32);}glowDot(x,y,r*.18,'#ffffff');}
  else if(tier===21){paintStar(x,y,r*.46,'#ffedbb');ctx.strokeStyle=cssColor(t.color,.6);for(let i=1;i<=3;i++){ctx.beginPath();ctx.ellipse(x,y,r*(.55+i*.36),r*(.32+i*.17),-.3,0,TAU);ctx.stroke();let a=phase*(1.3/i)+i;glowDot(x+Math.cos(a)*r*(.55+i*.36),y+Math.sin(a)*r*(.32+i*.17),Math.max(2,r*.07),i===1?'#8befff':'#edc9ff',.4);}}
  else if(tier===22){ctx.globalAlpha=1;paintGalaxy(x,y,r*.83,t.color,time);ctx.globalAlpha=1;}
  else if(tier===23){paintGalaxy(x,y,r*1.3,t.color,time);}
  else if(tier===24||tier===25){const num=tier===24?3:6;for(let i=0;i<num;i++){let a=i*TAU/num+phase*.17;let radius=r*(tier===24?.64:.88);paintGalaxy(x+Math.cos(a)*radius,y+Math.sin(a)*radius*.8,r*(tier===24?.45:.30),i%2?'#79dff7':t.color,time+i);}}
  else if(tier===26){const nodes=[];for(let i=0;i<13;i++){let a=i*2.399+phase*.07;nodes.push([x+Math.cos(a)*r*(.3+i*.08),y+Math.sin(a)*r*(.25+i*.05)]);}ctx.strokeStyle='rgba(182,145,255,.6)';ctx.lineWidth=1.3;for(let i=0;i<nodes.length-2;i++){ctx.beginPath();ctx.moveTo(...nodes[i]);ctx.lineTo(...nodes[(i+5)%nodes.length]);ctx.stroke();}for(const [nx,ny]of nodes)glowDot(nx,ny,r*.09,'#d3c9ff',.5);}
  else paintBlackHole(x,y,r,time);
 }
 // Each individual stage adds distinctive silhouettes and surface features, not only new colors.
 paintEvolutionDetails(x,y,r,time,tier);
 ctx.restore();
}
function paintEvolutionDetails(x,y,r,time,tier){
 const pulse=Math.sin(time*.9),rot=time*.18;
 ctx.save();ctx.translate(x,y);ctx.lineCap='round';ctx.lineJoin='round';
 function dot(px,py,rad,col){ctx.fillStyle=col;ctx.beginPath();ctx.arc(px,py,rad,0,TAU);ctx.fill();}
 function strokePath(points,col,width=1.8,close=false){ctx.strokeStyle=col;ctx.lineWidth=width;ctx.beginPath();points.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));if(close)ctx.closePath();ctx.stroke();}
 function moon(angle,distance,size,color){dot(Math.cos(angle)*distance,Math.sin(angle)*distance*.65,size,color);dot(Math.cos(angle)*distance-size*.22,Math.sin(angle)*distance*.65-size*.22,size*.3,'#ffffffaa');}
 function orbit(rx,ry,angle,col,width=2){ctx.save();ctx.rotate(angle);ctx.strokeStyle=col;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,TAU);ctx.stroke();ctx.restore();}
 function spark(a,rr,size,col){const px=Math.cos(a)*rr,py=Math.sin(a)*rr;strokePath([[px-Math.cos(a)*size,py-Math.sin(a)*size],[px+Math.cos(a)*size,py+Math.sin(a)*size]],col,Math.max(.7,size*.26));}
 switch(tier){
  case 0: for(let i=0;i<5;i++)moon(rot*.9+i*TAU/5,r*(1.1+i*.12),r*.07,'#b1f4ff');break;
  case 1: for(let i=0;i<3;i++){const a=.9+i*2.14;dot(Math.cos(a)*r*.44,Math.sin(a)*r*.43,r*.09,'#a0c1db');}break;
  case 2: for(let i=0;i<4;i++)moon(rot+i*TAU/4,r*1.18,r*.13,i%2?'#b5c8df':'#8995b4');break;
  case 3: for(let i=0;i<11;i++){let a=i*2.399,rr=r*(.18+.53*(i%4)/4);dot(Math.cos(a)*rr,Math.sin(a)*rr,r*.05,i%3?'#e5d5ba':'#524d63');}break;
  case 4: for(let i=0;i<3;i++){dot(Math.cos(i*2.3)*r*.4,Math.sin(i*2.3)*r*.4,r*.16,'#5b6477');dot(Math.cos(i*2.3)*r*.4-r*.025,Math.sin(i*2.3)*r*.4-r*.03,r*.09,'#9eaab9');}break;
  case 5: for(let i=0;i<8;i++)moon(rot*(i%2?1:-1)+i*TAU/8,r*(1.4+i%2*.23),r*(.07+(i%3)*.025),'#bd9d82');break;
  case 6: for(let i=0;i<5;i++){let a=i*TAU/5;strokePath([[0,0],[Math.cos(a)*r*.43,Math.sin(a)*r*.43],[Math.cos(a+.2)*r*.83,Math.sin(a+.2)*r*.83]],'#f3ad7d',Math.max(1.4,r*.055));}break;
  case 7: for(let i=0;i<5;i++){let a=i*2.48;dot(Math.cos(a)*r*.59,Math.sin(a)*r*.59,r*.10,'#847ca7');}moon(rot*1.9,r*1.75,r*.20,'#dbe6f5');break;
  case 8: for(let i=0;i<7;i++){const a=i*TAU/7;strokePath([[Math.cos(a)*r*.4,Math.sin(a)*r*.4],[Math.cos(a+.22)*r*.79,Math.sin(a+.22)*r*.79]],'#d7faff',Math.max(1.5,r*.07));}dot(-r*.27,-r*.25,r*.11,'#ffffffaa');break;
  case 9: for(let i=0;i<4;i++){let yy=(-.58+i*.36)*r;strokePath([[-r*.68,yy],[-r*.33,yy-r*.08],[r*.24,yy+r*.06],[r*.66,yy-r*.04]],'#adeeff',Math.max(1.4,r*.065));}break;
  case 10: for(let i=0;i<3;i++){let a=i*2.3+.6;const px=Math.cos(a)*r*.4,py=Math.sin(a)*r*.4;ctx.fillStyle=i%2?'#6ce5aa':'#4eaf81';ctx.beginPath();ctx.moveTo(px-r*.25,py-r*.11);ctx.lineTo(px-r*.05,py-r*.25);ctx.lineTo(px+r*.27,py-r*.07);ctx.lineTo(px+r*.18,py+r*.20);ctx.lineTo(px-r*.1,py+r*.17);ctx.closePath();ctx.fill();}break;
  case 11: ctx.strokeStyle='#ffe3bf';ctx.lineWidth=Math.max(2,r*.08);ctx.beginPath();ctx.ellipse(r*.28,r*.08,r*.21,r*.12,-.3,0,TAU);ctx.stroke();dot(r*.28,r*.08,r*.07,'#b96154');break;
  case 12: orbit(r*1.75,r*.45,-.23,'#c9e8ffbb',r*.12);orbit(r*1.9,r*.49,-.23,'#a5d4f9aa',r*.035);break;
  case 13: for(let i=0;i<5;i++)strokePath([[-r*.58,(-.6+i*.3)*r],[r*.58,(-.5+i*.3)*r]],'#b94a49aa',Math.max(1,r*.08));break;
  case 14: for(let i=0;i<14;i++)spark(i*TAU/14+rot,r*(1.14+.08*pulse),r*.22,'#ffb091');break;
  case 15: for(let i=0;i<3;i++){ctx.strokeStyle='#ffe6a4aa';ctx.lineWidth=Math.max(1,r*.055);ctx.beginPath();let a=i*TAU/3+rot;ctx.arc(Math.cos(a)*r*.65,Math.sin(a)*r*.65,r*.65,a-1,a+1.2);ctx.stroke();}break;
  case 16: for(let i=0;i<8;i++){let a=i*2.399;strokePath([[Math.cos(a)*r*.25,Math.sin(a)*r*.25],[Math.cos(a+.3)*r*.65,Math.sin(a+.3)*r*.65]],'#c5403e',Math.max(1,r*.07));}break;
  case 17: for(let i=0;i<4;i++)spark(i*TAU/4+rot*.15,r*1.48,r*.64,'#b5ebff');break;
  case 18: for(let i=0;i<12;i++)spark(i*TAU/12+rot*.12,r*(1.45+.08*pulse),r*.35,i%2?'#f1dcff':'#89d5ff');break;
  case 19: for(let i=0;i<5;i++){let a=i*TAU/5+rot*.12;dot(Math.cos(a)*r*.85,Math.sin(a)*r*.66,r*.23,i%2?'#d68fff66':'#82b9ff66');}break;
  case 20: for(let i=0;i<17;i++){let a=i*2.399+rot*.15,rr=r*(.28+.78*Math.sqrt(i/17));dot(Math.cos(a)*rr,Math.sin(a)*rr*.8,r*(i%6===0?.085:.034),i%3?'#dcf3ff':'#ffd5a4');}break;
  case 21: for(let i=0;i<4;i++)moon(rot*(1.1/(i+1))+i*TAU/4,r*(.8+i*.28),r*(.07+i*.018),['#7bd5f4','#d8b5c7','#d8bd9b','#9fdab0'][i]);break;
  case 22: for(let i=0;i<2;i++){const a=rot+i*Math.PI;for(let j=0;j<12;j++)moon(a+j*.22,r*(.28+j*.055),Math.max(1,r*.024),'#e6bbff');}break;
  case 23: for(let i=0;i<4;i++){const a=rot*.3+i*TAU/4;for(let j=0;j<13;j++)moon(a+j*.19,r*(.15+j*.075),Math.max(1,r*.023),'#c8dfff');}break;
  case 24: for(let i=0;i<3;i++)orbit(r*(.6+i*.31),r*(.22+i*.12),rot*.08+i*.8,'#b4d6ff77',Math.max(1,r*.013));break;
  case 25: for(let i=0;i<5;i++){let a=rot*.09+i*TAU/5;orbit(r*(.35+i*.15),r*(.2+i*.1),a,'#b7daff55',Math.max(.9,r*.012));}break;
  case 26: for(let i=0;i<9;i++){let a=i*2.399;moon(a,r*(.28+(i%4)*.26),r*.055,'#d8c7ff');}break;
  case 27: /* Opaque event horizon is rendered in the final compositor pass. */ break;
 }
 ctx.restore();
}
// Three LOD levels: a cheap pixel at distance, plain discs in the middle,
// detailed shapes close to the player. The object itself is never deleted by LOD.
function renderEntity(e,time,staticDust=false){
 ctx.save();ctx.globalAlpha*=absorptionLight(e);
 paintEntity(e,time,staticDust);ctx.restore();
}
function paintEntity(e,time,staticDust=false){
 const px=(e.x-camera.x)*camera.zoom+W/2,py=(e.y-camera.y)*camera.zoom+H/2;
 const r=e.r*camera.zoom*(e.absorbScale??1);
 if(px<-r-12||px>W+r+12||py<-r-12||py>H+r+12)return;
 const near=(e.x-player.x)**2+(e.y-player.y)**2<560*560;
 if(g.endless&&!staticDust&&!e.gravityBound&&!e.absorbing&&!e.freeFlight)return;
 if(r<.65||e.r/player.r<.025)return;
 ctx.globalAlpha*=clamp((r-.65)/.85,0,1);
 if(r<1.6){ctx.fillStyle=e.kind==='hazard'?'#ed6d88':e.kind==='relic'?'#ffd790':MATERIALS[e.material]?.color||'#8bc9ed';ctx.fillRect(px,py,1.8,1.8);return;}
 if(e.kind==='matter'){
  const mat=e.material;
  if(near&&r>=5&&(mat==='crystal'||mat==='ice'||mat==='plasma'||mat==='exotic'||mat==='gas')){
    ctx.save();ctx.translate(px,py);ctx.rotate(e.spin*.25);
    const color=MATERIALS[mat].color;ctx.strokeStyle=color;ctx.fillStyle=color;
    if(mat==='gas'){
      ctx.globalAlpha*=.62;for(let i=0;i<4;i++){const x=Math.cos(i*TAU/4)*r*.45,y=Math.sin(i*TAU/4)*r*.45;
      ctx.beginPath();ctx.arc(x,y,r*.55,0,TAU);ctx.fill();}
    }else if(mat==='plasma'){
      ctx.lineWidth=Math.max(1,r*.13);for(let i=0;i<6;i++){const a=i*TAU/6+e.spin*.08;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.25,Math.sin(a)*r*.25);ctx.lineTo(Math.cos(a+.14)*r*1.25,Math.sin(a+.14)*r*1.25);ctx.stroke();}
      ctx.beginPath();ctx.arc(0,0,r*.45,0,TAU);ctx.fill();
    }else{
      const n=mat==='crystal'?6:mat==='ice'?8:5;ctx.beginPath();
      for(let i=0;i<n;i++){const a=i*TAU/n;const R=r*(mat==='exotic'&&i%2?.54:1);if(!i)ctx.moveTo(Math.cos(a)*R,Math.sin(a)*R);else ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);}
      ctx.closePath();ctx.fill();ctx.lineWidth=1.4;ctx.strokeStyle='#effcff';ctx.stroke();
      ctx.beginPath();ctx.moveTo(-r*.35,-r*.12);ctx.lineTo(0,r*.5);ctx.lineTo(r*.35,-r*.12);ctx.stroke();
    }ctx.restore();return;
  }
  const color=MATERIALS[e.material]?.color||(e.hue===285?'#ac8df4':e.hue<210?'#6dccfa':e.hue<250?'#93a4e9':'#b7a0f3');
  if(!near||r<6){ctx.fillStyle=color;ctx.beginPath();ctx.arc(px,py,Math.max(1.5,r*.77),0,TAU);ctx.fill();return;}
  if(e.grade>=12&&r>13)paintPlanet(px,py,r,color,e.grade>=17);
  else if(e.grade>=5&&r>10)paintRock(px,py,r,color,e.spin*.08,3);
  else glowDot(px,py,r*.85,color,.4);
 }else if(e.kind==='relic'){
  ctx.save();ctx.translate(px,py);ctx.rotate(e.spin);
  ctx.fillStyle='#ffe0a0';ctx.beginPath();
  for(let i=0;i<8;i++){let a=i*TAU/8,rr=i%2?r*.50:r;if(i===0)ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);else ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}
  ctx.closePath();ctx.fill();ctx.restore();
 }else{
  ctx.save();ctx.translate(px,py);ctx.rotate(e.spin*.5);ctx.fillStyle='#d3577b';
  ctx.beginPath();for(let i=0;i<10;i++){let a=i*TAU/10,R=r*(i%2?.72:1.02);if(i===0)ctx.moveTo(Math.cos(a)*R,Math.sin(a)*R);else ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);}
  ctx.closePath();ctx.fill();ctx.restore();
 }
}
function renderPlayer(time){
 // At the final tier the black hole uses a dedicated, always-opaque final
 // compositor pass. Never blend it with evolution morphs or other particles.
 if(g.tier===TA.length-1)return;
 const t=TA[g.tier],p=project(player.x,player.y),r=player.r*camera.zoom;ctx.save();
 for(const tr of (g.endless?[]:player.trail)){let q=project(tr.x,tr.y),alpha=tr.life/.55;ctx.fillStyle=cssColor(t.color,alpha*.1);ctx.beginPath();ctx.arc(q.x,q.y,Math.min(Math.max(W,H)*3,tr.r*camera.zoom*(.45+alpha*.3)),0,TAU);ctx.fill();}
 // Gravity field ring and orbiting shards.
 let range=Math.min(ordinaryGravityRadius()*camera.zoom,Math.max(W,H)*3);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(player.rotation*.18);if(!g.endless&&g.tier>=7){ctx.strokeStyle=cssColor(t.color,.11);ctx.lineWidth=1.2;ctx.setLineDash([3,9]);ctx.beginPath();ctx.arc(0,0,range,0,TAU);ctx.stroke();ctx.setLineDash([]);}
 let count=g.endless?0:Math.min(18,3+Math.floor(g.tier/2));for(let i=0;i<count;i++){let a=player.rotation*(i%2?1:-1)*(0.65+(i%4)*.08)+i*TAU/count,R=r*(1.8+(i%3)*.24),xx=Math.cos(a)*R,yy=Math.sin(a)*R*.65;ctx.fillStyle=i%3?'#96baf8':'#ffdcaa';ctx.beginPath();ctx.arc(xx,yy,i%5===0?2.6:1.5,0,TAU);ctx.fill();}ctx.restore();
 if(morph&&!g.endless){let f=clamp(morph.time/morph.duration,0,1);ctx.save();ctx.globalAlpha=(1-f)*.94;paintPlayerForm(p.x,p.y,r*(1.12-f*.12),time,morph.from);ctx.restore();ctx.save();ctx.globalAlpha=Math.min(1,f*1.65);paintPlayerForm(p.x,p.y,r*(.52+f*.48),time);ctx.restore();}else paintPlayerForm(p.x,p.y,r,time);
 // Swirling energy currents and magnetic filaments.
 if(g.particles&&!g.endless&&g.tier>=7){ctx.save();ctx.globalAlpha=.18+.10*Math.sin(time*1.5);ctx.strokeStyle=t.color;ctx.lineWidth=1.2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(p.x,p.y,r*(1.7+i*.27),time*.55+i*1.9,time*.55+i*1.9+1.65);ctx.stroke();}ctx.restore();}
 if(player.shield>0&&!g.endless){ctx.strokeStyle=`rgba(132,236,255,${.2+.35*Math.sin(time*16)**2})`;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,r*1.35,0,TAU);ctx.stroke();}
 if(boostTime>0&&!g.endless){ctx.strokeStyle='rgba(187,143,255,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,r*1.55+Math.sin(time*12)*3,0,TAU);ctx.stroke();}
 ctx.restore();}
function renderGatherFlow(time){
 if(g.endless||g.tier>=13)return;
 const bound=entities.filter(e=>e.gravityBound&&!e.dead&&Math.hypot(e.x-player.x,e.y-player.y)<ordinaryGravityRadius()*1.3).length;
 if(!bound&&harvestChainTime===0)return;
 const p=project(player.x,player.y),r=player.r*camera.zoom;
 const strength=clamp(bound/5+harvestChain/18,.15,1)*Math.min(1,Math.max(bound?1:0,harvestChainTime));
 ctx.save();ctx.translate(p.x,p.y);ctx.globalCompositeOperation='lighter';
 const color=harvestChain>=12?'#ffd4a0':'#8be4ff';
 for(let arm=0;arm<4;arm++){
  const start=time*.85+arm*TAU/4;
  ctx.strokeStyle=color;ctx.globalAlpha=strength*.25;ctx.lineWidth=1;ctx.beginPath();
  for(let i=0;i<=20;i++){
   const t=i/20,a=start+t*1.7,rr=r*(1.1+t*2.2),x=Math.cos(a)*rr,y=Math.sin(a)*rr*.78;
   if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }ctx.stroke();
  const a=start+1.7,rr=r*3.3;ctx.globalAlpha=strength*.75;
  glowDot(Math.cos(a)*rr,Math.sin(a)*rr*.78,1.8,color,.3);
 }
 ctx.restore();
}
function renderParticles(){for(const a of energyArcs){const q=project(a.x,a.y),target=project(a.toX??a.x,a.toY??a.y);ctx.save();ctx.globalAlpha=clamp(a.life/a.max,0,1)*.7;ctx.strokeStyle=a.color;ctx.lineWidth=1.25;ctx.beginPath();if(a.toX!==undefined){ctx.moveTo(q.x,q.y);let mx=(q.x+target.x)*.5,my=(q.y+target.y)*.5;ctx.quadraticCurveTo(mx+Math.sin(a.life*40)*14,my-14,target.x,target.y);}else{ctx.arc(q.x,q.y,a.r*camera.zoom*(1.4+(1-a.life/a.max)*4),0,TAU);}ctx.stroke();ctx.restore();}
for(const p of particles){const q=project(p.x,p.y);ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.5,p.r*camera.zoom),0,TAU);ctx.fill();}ctx.globalAlpha=1;for(const s of shockwaves){let q=project(s.x,s.y);ctx.save();ctx.globalAlpha=clamp(s.life/s.max,0,1)*.7;ctx.strokeStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=18;ctx.lineWidth=4*camera.zoom;ctx.beginPath();ctx.arc(q.x,q.y,s.r*camera.zoom,0,TAU);ctx.stroke();ctx.restore();}for(const p of texts){let q=project(p.x,p.y);ctx.save();ctx.globalAlpha=clamp(p.life,0,1);ctx.font='800 13px "Exo 2",sans-serif';ctx.textAlign='center';ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.fillStyle=p.color;ctx.fillText(p.text,q.x,q.y);ctx.restore();}}
// The menu has its own cached sky and lens geometry; it never advances gameplay.
let menuBackdrop=null,menuBackdropKey='',menuLensMap=null,menuLensKey='',menuLensRetryAt=0;
function menuBlackHoleGeometry(){
 const p={x:W*(W<=560?.77:.76),y:H*(W<=560?.36:.54)};
 const R=.85*Math.min(W*.48,H*.72),outer=Math.min(R*2.30,W*.63);
 return {p,R,outer};
}
function renderMenuScene(time){
 const key=[frameCanvas.width,frameCanvas.height,W,H].join(':');
 if(menuBackdropKey!==key){menuBackdrop=makeSkyDepthTexture(0x638ab,1.2);menuBackdropKey=key;}
 ctx.fillStyle='#02040b';ctx.fillRect(0,0,W,H);
 const dx=(time*4)%W,dy=(time*1.3)%H;
 for(let y=-dy;y<H;y+=H)for(let x=-dx;x<W;x+=W)ctx.drawImage(menuBackdrop,x,y,W,H);
 const target=menuBlackHoleGeometry(),{p,R}=target;
 renderMenuComets(time);
 const previousMap=lensPixelMap,previousKey=lensPixelMapKey;
 lensPixelMap=menuLensMap;lensPixelMapKey=menuLensKey;
 try{
  if(time>=menuLensRetryAt){renderBlackHoleLensing(target);menuLensMap=lensPixelMap;menuLensKey=lensPixelMapKey;}
 }catch(_){menuLensRetryAt=time+2;}
 finally{lensPixelMap=previousMap;lensPixelMapKey=previousKey;}
 // The horizon remains opaque even if the browser temporarily loses its lens.
 paintBlackHole(p.x,p.y,R,time);
}
function render(time){
 // The public Canvas retains the previous complete frame throughout every
 // expensive readback, galaxy repaint, and lensing pass.
 ctx=frameCtx;
 ctx.setTransform(dpr,0,0,dpr,0,0);
 // Restore the compositing baseline every frame; otherwise a previous
 // effect can accidentally carry semi-transparency onto the next frame.
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 if(menuVisible){renderMenuScene(time);}else{
 sky(time);renderBackgroundComets();
 ctx.save();renderDistantBodies();renderMacroField(time);ctx.restore();
 ctx.save();
 if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));
 ctx.save();
 for(const e of entities)renderEntity(e,time);
 ctx.restore();
 // A temporary Canvas readback failure must not abort this frame before
 // drawing the opaque horizon. Keep the lens optional, not the black hole.
 if(time>=blackHoleLensRetryAt){
  if(time>=rivalLensRetryAt){try{renderRivalLensing();}catch(_){rivalLensMaps.clear();rivalLensRetryAt=time+2;}}
  try{renderBlackHoleLensing();}
  catch(_){blackHoleLensRetryAt=time+2;}
 }
 renderGatherFlow(time);renderPlayer(time);renderParticles();
 ctx.restore();
 if(screenFlash>0&&!g.endless){ctx.fillStyle=`rgba(188,215,255,${screenFlash*.14})`;ctx.fillRect(0,0,W,H);}
 // Compositing invariant: the event horizon is drawn after every distortion,
 // light effect and entity. It can never fade behind the background.
 if(g.tier===TA.length-1){
  const p=project(player.x,player.y);
  const r=Math.max(.01,player.r*camera.zoom);
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  paintBlackHole(p.x,p.y,r,time);
  ctx.restore();
 }
 renderAbysses();renderWaypoint();
 }
 // Atomic presentation: the screen never sees a partially completed frame.
 // Do not reset canvas.width/height or use a desynchronized front context.
 screenCtx.save();
 screenCtx.setTransform(1,0,0,1,0,0);
 screenCtx.globalAlpha=1;
 screenCtx.globalCompositeOperation='copy';
 screenCtx.drawImage(frameCanvas,0,0);
 screenCtx.restore();
 ctx=screenCtx;
 renderTicks++;
}
let idleLast=0;
function frame(now){
 requestAnimationFrame(frame);
 if(!running&&now-idleLast<(menuVisible||atlas.focusTween?33:70))return;idleLast=now;
 const elapsed=clamp((now-last)/1000,.001,.08);last=now;
 if(running){
  update(Math.min(elapsed,.05));
  perfSample+=elapsed;perfFrames++;
  if(perfSample>=1.5){
   frameFps=perfFrames/perfSample;
   // Recreating the primary Canvas resets all pixels, producing a visible
   // on/off pulse on the largest black hole. Leave its output resolution stable
   // and adjust only the CPU fallback lens resolution on heavier frames.
   updateAdaptiveQuality(frameFps);
   perfSample=0;perfFrames=0;
  }
 }
 render(now/1000);
 if(atlasVisible){updateAtlasMotion(elapsed);if(atlas.dirty)drawAtlas();}
}
requestAnimationFrame(frame);
// One shared shell keeps navigation and resume behavior consistent across every screen.
function setNavigationState(screen){
 for(const [id,name] of [['btn-menu','menu'],['btn-pause','menu'],['btn-map','map'],['btn-settings','settings']])$(id).setAttribute('aria-pressed',String(screen===name));
}
let navigateOverlayBack=null;
function toggleOverlay(screen,open){
 const modal=$('modal');
 if(!modal.classList.contains('off')&&modal.dataset.screen===screen){
  if(screen!=='menu'&&navigateOverlayBack)navigateOverlayBack();
  else resumeGame();
 }else open();
}
function resumeGame(){closePinEditor();clearFlightInput();menuVisible=false;setNavigationState('');atlasVisible=false;running=true;window.SpacePlatform?.playing(true);startMusic();$('modal').classList.add('off');last=performance.now();}
function show(html){
 clearFlightInput();menuVisible=false;setNavigationState('');atlasVisible=false;running=false;window.SpacePlatform?.playing(false);
 $('evolution-panel').classList.add('hidden');
 $('modal').dataset.screen='panel';
 $('modal').innerHTML=`<div class="modal-card"><button id="panel-close" class="panel-close" aria-label="Вернуться в игру">${uiIcon('close')}</button>${html}</div>`;
 $('modal').classList.remove('off');$('panel-close').onclick=resumeGame;save();
}
function continueButton(label='ПРОДОЛЖИТЬ'){return `<button class="primary-button" id="btn-continue">${label} <span>${uiIcon('arrow')}</span></button>`;}
function attachContinue(){const b=$('btn-continue');if(b)b.onclick=resumeGame;}
function openEvolution(){
 if(!$('evolution-panel').classList.contains('hidden')){$('evolution-panel').classList.add('hidden');return;}
 resumeGame();renderUI();$('evolution-panel').classList.remove('hidden');
 if(W<=800)$('sidebar').classList.remove('mobile-open');
}
function showStatistics(){
 show(`<div class="eyebrow">ТВОЙ ПУТЬ В КОСМОСЕ</div><div class="overlay-title">СТАТИСТИКА</div><p class="overlay-copy">${TA[g.tier].name} · форма ${g.tier+1} из ${TA.length}</p><div class="stat-list"><div><strong>${fmt(g.total)}</strong><small>Собрано материи</small></div><div><strong>${timeFmt(g.time)}</strong><small>Время в космосе</small></div><div><strong>${fmt(g.collects)}</strong><small>Поглощено объектов</small></div><div><strong>${fmt(g.rare)}</strong><small>Найдено реликвий</small></div><div><strong>${fmt(exploredCount())}</strong><small>Исследовано, св. лет²</small></div><div><strong>${lightYears(2*(g.endless?blackHoleCoreWorldRadius():player.r))}</strong><small>Текущий диаметр</small></div></div><div class="modal-actions">${continueButton()}</div>`);attachContinue();
}
// Progression, field guide and audio catalogue share the existing save.
const L=(en,ru,es)=>({en,ru,es}[window.SpaceI18n?.language||'en']||en);
const RARITIES=[
 ['common','#9fb7cd',['Common','Обычное','Común']],['uncommon','#66e4a6',['Uncommon','Необычное','Poco común']],
 ['rare','#66c9ff',['Rare','Редкое','Raro']],['epic','#bc8aff',['Epic','Эпическое','Épico']],
 ['legendary','#ffc871',['Legendary','Легендарное','Legendario']],['mythic','#ff79ba',['Mythic','Мифическое','Mítico']]
];
const ACHIEVEMENTS=[
 ['spark',0,['First spark','Первая искра','Primera chispa'],'collects',1],
 ['hundred',0,['Appetite for space','Космический аппетит','Apetito espacial'],'collects',100],
 ['worlds',1,['A thousand worlds','Тысяча миров','Mil mundos'],'collects',1000],
 ['collector',3,['World collector','Коллекционер миров','Coleccionista de mundos'],'collects',100000],
 ['million',4,['A million encounters','Миллион встреч','Un millón de encuentros'],'collects',1e6],
 ['chain4',0,['In the flow','В потоке','En la corriente'],'bestChain',4],
 ['chain12',2,['Orbital dance','Орбитальный танец','Danza orbital'],'bestChain',12],
 ['chain50',3,['Unbroken orbit','Непрерывная орбита','Órbita sin fin'],'bestChain',50],
 ['planet',1,['A world of your own','Собственный мир','Tu propio mundo'],'tier',7],
 ['star',2,['Let there be light','Да будет свет','Que se haga la luz'],'tier',15],
 ['galaxy',3,['Island of stars','Остров звёзд','Isla de estrellas'],'tier',23],
 ['horizon',4,['Beyond the horizon','За горизонтом','Más allá del horizonte'],'tier',27],
 ['explorer',1,['Cosmic voyager','Космический странник','Viajero cósmico'],'explored',100],
 ['cartographer',3,['Cartographer','Картограф','Cartógrafo'],'explored',1e6],
 ['atlas',5,['Atlas of infinity','Атлас бесконечности','Atlas del infinito'],'explored',1e30],
 ['relic10',1,['Relic hunter','Охотник за реликвиями','Cazador de reliquias'],'rare',10],
 ['relic1000',3,['Ancient archive','Древний архив','Archivo ancestral'],'rare',1000],
 ['pulse100',2,['Gravity conductor','Повелитель гравитации','Director de gravedad'],'pulses',100],
 ['abyss1',4,['Devour the abyss','Поглотить бездну','Devorar el abismo'],'holes',1],
 ['abyss10',5,['Singularity sovereign','Властелин сингулярности','Soberano de la singularidad'],'holes',10],
 ['mass12',3,['Trillion suns','Триллион солнц','Un billón de soles'],'solar',1e12],
 ['mass30',4,['Beyond imagination','За гранью воображения','Más allá de la imaginación'],'solar',1e30],
 ['mass60',5,['Impossible horizon','Невозможный горизонт','Horizonte imposible'],'solar',1e60],
 ['mass100',5,['Googol suns','Гугол солнц','Un gúgol de soles'],'solar',1e100],
 ['dust30',5,['Stardust empire','Империя звёздной пыли','Imperio de polvo estelar'],'credits',1e30],

 ['tracks2',2,['Radio operator','Радиооператор','Operador de radio'],'tracks',2],
 ['tracks5',3,['Cosmic playlist','Космический плейлист','Lista cósmica'],'tracks',5],
 ['tracksall',5,['Complete soundtrack','Полная музыкальная коллекция','Banda sonora completa'],'tracks',12],
 ['daily3',2,['Regular visitor','Постоянный путешественник','Visitante habitual'],'dailyClaims',3],
 ['daily7',3,['A week among stars','Неделя среди звёзд','Una semana entre estrellas'],'dailyStreak',7],
 ['daily30',4,['Orbit of habit','Орбита привычки','Órbita de hábito'],'dailyClaims',30],
 ['rouletteTrack',5,['Song of fortune','Песня удачи','Canción de la fortuna'],'musicWins',1],
];
function achievementValue(key){if(key==='tracks')return g.ownedTracks?.length||0;
 if(key==='dailyClaims')return g.daily?.claims||0;
 if(key==='dailyStreak')return g.daily?.streak||0;
 if(key==='musicWins')return g.daily?.musicWins||0;
 return key==='solar'?(g.endless?solarMass():0):key==='holes'?Object.keys(g.abyssConsumed).length:key==='explored'?exploredCount():Math.max(0,g[key]||0);}
function achievementProgress(a){return clamp(achievementValue(a[3])/a[4]*100,0,100);}
function goalLabel(key){return ({collects:L('objects','объектов','objetos'),bestChain:L('chain','цепочка','cadena'),tier:L('evolution stage','стадия','etapa'),explored:L('ly² explored','св. лет² изучено','al² explorados'),rare:L('relics','реликвий','reliquias'),pulses:L('pulses','импульсов','pulsos'),holes:L('black holes','чёрных дыр','agujeros negros'),solar:'M☉',credits:L('stardust','звёздной пыли','polvo estelar'),
 tracks:L('tracks','треков','pistas'),
 dailyClaims:L('daily gifts','подарков','regalos'),
 dailyStreak:L('days in a row','дней подряд','días seguidos'),
 musicWins:L('roulette tracks','треков с рулетки','pistas de ruleta')})[key];}
let achievementQueue=[],achievementToastAt=-10,requirementNotice='',requirementNoticeAt=-100;
function checkProgression(){
 g.achievements??={};
 for(const a of ACHIEVEMENTS)if(!g.achievements[a[0]]&&achievementProgress(a)>=100){g.achievements[a[0]]=true;achievementQueue.push(a);save();}
 if(achievementQueue.length&&g.time-achievementToastAt>4.5){achievementToastAt=g.time;celebrateAchievement(achievementQueue.shift());}
 if(g.endless||g.matter<TA[g.tier].required){requirementNotice='';return;}
 const missing=stageRecipe().filter(r=>(g.materials[r.type]||0)<r.amount);
 const explore=Math.max(0,missionReq().explore-g.stageExplored),collect=Math.max(0,missionReq().collect-g.stageCollects);
 const key=g.tier+':'+missing.map(r=>r.type).join(',')+':'+(explore>0)+':'+(collect>0);
 if(key!==requirementNotice&&g.time-requirementNoticeAt>8){
  requirementNotice=key;requirementNoticeAt=g.time;
  const items=missing.map(r=>`${window.SpaceI18n?.t(MATERIALS[r.type].label)||MATERIALS[r.type].label}: ${Math.ceil((r.amount-g.materials[r.type])*10)/10}`);
  if(explore)items.push(`${L('Explore','Исследуй','Explora')}: ${fmt(explore)} ${L('ly²','св. лет²','al²')}`);
  if(collect)items.push(`${L('Collect','Собери','Recoge')}: ${fmt(collect)}`);
  if(items.length)toast(L('Mass ready. Still needed: ','Масса набрана. Не хватает: ','Masa lista. Falta: ')+items.join(' · '),'requirements');
 }
}
function celebrateAchievement(a){
 const [key,color,label]=RARITIES[a[1]],el=document.createElement('div');
 el.className=`achievement-unlock rarity-${key}`;el.style.setProperty('--rarity',color);el.setAttribute('role','status');
 el.innerHTML=`<span class="achievement-seal">✦</span><div><small>${L(...label)} · ${L('ACHIEVEMENT','ДОСТИЖЕНИЕ','LOGRO')}</small><strong>${L(...a[2])}</strong></div><span class="achievement-rays" aria-hidden="true"></span>`;
 $('toast-root').append(el);setTimeout(()=>el.remove(),4300);
 for(let i=0;i<=a[1];i++)setTimeout(()=>sound(330*2**((i*3+a[1])/12),a[1]>3?'triangle':'sine',.25+a[1]*.05,.02),i*120);
 if(a[1]>=4)window.SpacePlatform?.happy();
}
function showAchievements(){
 const earned=Object.keys(g.achievements||{}).length;
 show(`<div class="eyebrow">${L('THE RECORD OF YOUR JOURNEY','ИСТОРИЯ ТВОЕГО ПУТИ','EL REGISTRO DE TU VIAJE')}</div><div class="overlay-title">${L('ACHIEVEMENTS','ДОСТИЖЕНИЯ','LOGROS')} <small>${earned}/${ACHIEVEMENTS.length}</small></div><div class="achievement-list">${ACHIEVEMENTS.map(a=>{
  const rarity=RARITIES[a[1]],done=!!g.achievements?.[a[0]],progress=done?100:achievementProgress(a),percent=progress===100?'100':progress>0&&progress<.01?'<0.01':progress.toFixed(1);
  return `<div class="achievement ${done?'earned':''} rarity-${rarity[0]}" style="--rarity:${rarity[1]}"><span>✦</span><div><small class="rarity-label">${L(...rarity[2])}</small><strong>${L(...a[2])}</strong><small>${fmt(achievementValue(a[3]))} / ${fmt(a[4])} ${goalLabel(a[3])}</small><div class="achievement-progress" role="progressbar" aria-label="${L(...a[2])}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div></div><b>${percent}%</b></div>`;
 }).join('')}</div><div class="modal-actions">${continueButton()}</div>`);attachContinue();
}
const FIELD_GUIDE=[
 ['rock',0,['Asteroids & moons','Астероиды и спутники','Asteroides y lunas'],['Small rocky bodies carry minerals, crystals and ice. Cross their paths to capture them; a close pass changes their trajectory.','Малые каменные тела несут минералы, кристаллы и лёд. Пересекай их траекторию: близкий пролёт меняет направление движения.','Los cuerpos rocosos contienen minerales, cristales y hielo. Cruza su trayectoria para capturarlos; un paso cercano cambia su rumbo.']],
 ['planet',7,['Rocky & ocean worlds','Каменные и океанические миры','Mundos rocosos y oceánicos'],['Planets are larger reservoirs of matter. You can absorb bodies up to your own radius. Bigger bodies pull you instead.','Планеты — крупные запасы материи. Можно поглощать тела не больше своего радиуса. Более крупные тела притягивают тебя.','Los planetas son grandes reservas de materia. Puedes absorber cuerpos de hasta tu radio. Los mayores te atraen a ti.']],
 ['ice',8,['Ice worlds','Ледяные миры','Mundos helados'],['Ice is needed from stage 9. Look for cyan bodies. Ice also occurs in every region, not only in cold clouds.','Лёд нужен с 9-й стадии. Ищи голубые тела. Он встречается во всех областях, а не только в холодных облаках.','El hielo se necesita desde la etapa 9. Busca cuerpos cian. Aparece en todas las regiones, no solo en nubes frías.']],
 ['gas',11,['Gas giants','Газовые гиганты','Gigantes gaseosos'],['Vast atmospheres supply gas. Their gravity bends the flight of smaller bodies. Boost to escape a larger neighbour.','Огромные атмосферы дают газ. Гравитация искривляет полёт малых тел. Используй рывок, чтобы уйти от крупного соседа.','Sus enormes atmósferas aportan gas. Su gravedad curva el vuelo de cuerpos menores. Usa el impulso para escapar.']],
 ['star',13,['Stars & plasma','Звёзды и плазма','Estrellas y plasma'],['Stars are luminous plasma spheres. Their colours reflect different temperatures; the game compresses astronomical scales for play.','Звёзды — светящиеся плазменные шары. Их цвета связаны с температурой; игра условно сжимает астрономические масштабы.','Las estrellas son esferas de plasma luminoso. El color refleja su temperatura; el juego comprime las escalas astronómicas.']],
 ['galaxy',22,['Galaxies & clusters','Галактики и скопления','Galaxias y cúmulos'],['Billions of stars form galaxies. The atlas reveals their scale before you reach them. A black hole draws the whole body behind its horizon.','Миллиарды звёзд образуют галактики. Карта заранее показывает их масштаб. Чёрная дыра втягивает всё тело за горизонт событий.','Miles de millones de estrellas forman galaxias. El atlas muestra su escala por adelantado. Un agujero negro absorbe todo el cuerpo tras su horizonte.']],
 ['blackhole',27,['Black holes: mass & radius','Чёрные дыры: масса и радиус','Agujeros negros: masa y radio'],['M☉ means one solar mass. Mass is not size: radius is shown separately in light-years (ly). For a non-rotating black hole, the Schwarzschild radius is about 2.953 km per M☉. This game uses that relation as a scale model. Its lensing ring is an optical effect, not the event horizon. Smaller black holes are prey; entering a larger horizon resets your run.','M☉ — одна масса Солнца. Масса не является размером: радиус отдельно показан в световых годах. Для невращающейся дыры радиус Шварцшильда — примерно 2,953 км на M☉. Игра использует эту связь как модель масштаба. Кольцо искажения — оптический эффект, а не горизонт событий. Меньшие дыры — добыча; вход за горизонт большей дыры обнуляет прохождение.','M☉ significa una masa solar. La masa no es el tamaño: el radio se muestra aparte en años luz (al). Para un agujero negro sin rotación, el radio de Schwarzschild es de unos 2,953 km por M☉. El juego usa esta relación como modelo de escala. El anillo es un efecto óptico, no el horizonte. Puedes devorar agujeros menores; entrar en uno mayor reinicia la partida.']]
];
// The field guide includes every playable form, all collectible resources and
// rare phenomena in addition to the seven original astronomical chapters.
const FORM_NAME_EN=["Cosmic dust","Micrometeor","Rock fragment","Chondrite","Asteroid","Large asteroid","Planetesimal","Dwarf planet","Ice world","Ocean planet","Rocky planet","Gas giant","Ice giant","Brown dwarf","Red dwarf","Star","Red giant","Supergiant","Hypergiant","Stellar nebula","Star cluster","Star system","Protogalaxy","Spiral galaxy","Galaxy group","Galaxy cluster","Cosmic web","Infinite black hole"];
const FORM_NAME_ES=["Polvo cósmico","Micrometeorito","Fragmento rocoso","Condrita","Asteroide","Asteroide grande","Planetesimal","Planeta enano","Mundo helado","Planeta oceánico","Planeta rocoso","Gigante gaseoso","Gigante helado","Enana marrón","Enana roja","Estrella","Gigante roja","Supergigante","Hipergigante","Nebulosa estelar","Cúmulo estelar","Sistema estelar","Protogalaxia","Galaxia espiral","Grupo de galaxias","Cúmulo galáctico","Red cósmica","Agujero negro infinito"];
const RESOURCE_NOTES={
 ore:['Common mineral matter found in small asteroids.','Основные минералы, встречающиеся в астероидах и каменных мирах.','Minerales abundantes en asteroides y mundos rocosos.'],
 crystal:['Precise crystal fragments become important during asteroid evolution.','Кристаллы помогают формировать более сложные тела с пятой стадии.','Fragmentos cristalinos necesarios durante la evolución de los asteroides.'],
 ice:['Frozen worlds and drifting comets carry water ice.','Лёд встречается не только возле ледяных планет, но и в потоках космической материи.','El hielo se encuentra también en corrientes de materia cósmica.'],
 gas:['A raw material of giant atmospheres and protostars.','Газ необходим для массивных атмосфер и формирования звёзд.','Gas imprescindible en grandes atmósferas y protoestrellas.'],
 plasma:['Hot ionized matter is collected in stellar epochs.','Раскалённая плазма приходит вместе со звёздами и их энергией.','Plasma caliente que se recoge en etapas estelares.'],
 exotic:['Rare exotic material at galaxy-sized scales.','Экзоматерия — редкий материал поздних галактических эпох.','Materia exótica que aparece en las épocas galácticas.']
};
const RESOURCE_FIRST_TIER={ore:0,crystal:4,ice:8,gas:12,plasma:17,exotic:22};
FIELD_GUIDE.push(...TA.map((stage,i)=>[
 'form-'+i,i,[FORM_NAME_EN[i],stage.name,FORM_NAME_ES[i]],
 ['Form '+(i+1)+' of 28. '+({dust:'A scattering of luminous grains.',rock:'A solid body shaped by countless impacts.',planet:'A growing world with terrain and satellites.',gas:'A giant with churning atmospheric layers.',star:'Hot matter radiates energy through stellar space.',nebula:'Enormous clouds where new stars are born.',cluster:'Gravity binds many separate celestial systems.',galaxy:'Billions of stars form spiral structures.',web:'Cosmic filaments connect distant galaxy clusters.',blackhole:'An event horizon draws entire worlds inward.'}[stage.type]||'Explore the next cosmic scale.'),
  stage.desc,
  'Forma '+(i+1)+' de 28. '+({dust:'Partículas luminosas.',rock:'Roca formada por impactos.',planet:'Un mundo con superficie y satélites.',gas:'Un gigante de gas.',star:'Una estrella radiante.',nebula:'Nubes de estrellas.',cluster:'Muchos cuerpos ligados.',galaxy:'Miles de millones de estrellas.',web:'Filamentos cósmicos.',blackhole:'Un horizonte que absorbe mundos.'}[stage.type]||'Explora la siguiente etapa.')],i
]));
FIELD_GUIDE.push(...MATERIAL_KEYS.map(type=>[
 'resource-'+type,RESOURCE_FIRST_TIER[type],
 [({ore:'Minerals',crystal:'Crystals',ice:'Ice',gas:'Gas',plasma:'Plasma',exotic:'Exotic matter'})[type],MATERIALS[type].label,
  ({ore:'Minerales',crystal:'Cristales',ice:'Hielo',gas:'Gas',plasma:'Plasma',exotic:'Materia exótica'})[type]],
 RESOURCE_NOTES[type],null
]));
FIELD_GUIDE.push(
 ['comet',0,['Background comets','Фоновые кометы','Cometas de fondo'],['Comet trails cross the distant starfield and show the direction of cosmic motion.','Кометы оставляют тонкие световые следы на фоне огромной Вселенной.','Los cometas dibujan rastros luminosos en el universo.'],null],
 ['gravity',2,['Gravity and capture','Гравитация и поглощение','Gravedad y captura'],['Smaller objects fall toward you; bigger bodies pull you away.','Объекты меньше тебя притягиваются, а массивные соседи способны изменить твой полёт.','Los objetos pequeños caen hacia ti; los grandes te atraen.'],null],
 ['lensing',19,['Gravitational lensing','Гравитационное линзирование','Lente gravitacional'],['A black hole bends the light behind it; the optical ring is outside its true horizon.','Чёрная дыра искривляет свет позади себя. Видимое кольцо искажения не является горизонтом событий.','Un agujero negro curva la luz; su anillo óptico no es el horizonte.'],null],
 ['rival',27,['Ancient giant black holes','Древние гигантские чёрные дыры','Agujeros negros gigantes'],['Supermassive rivals are visible from afar. Devour smaller horizons; evade larger ones.','Сверхмассивные соперники видны издалека. Меньшие горизонты можно поглотить, большие — смертельно опасны.','Los rivales supermasivos se ven desde lejos. Devora los menores y evita los mayores.'],null]
);
// Render a real miniature of the playable form, not an unrelated generic
// sphere; stage preview drawings never change game state or current tier.
function paintStagePortrait(canvas,tier){
 if(!canvas)return;
 const size=clamp(Number(canvas.dataset.size)||92,64,180),w=size,h=size,center=size/2,scale=1.5;
 canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
 const c=canvas.getContext('2d');if(!c)return;
 c.setTransform(scale,0,0,scale,0,0);
 const bg=c.createRadialGradient(center,center-3,7,center,center,size*.7);
 bg.addColorStop(0,'#342454');bg.addColorStop(.67,'#1a1131');bg.addColorStop(1,'#100b22');
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 for(let i=0;i<19;i++){const x=(i*47+17)%size,y=(i*31+13)%size;
  c.fillStyle=i%4===0?'#a9d9ff':'#7962a8';c.fillRect(x,y,1.1,1.1);
 }
 const old=ctx;ctx=c;
 try{
  if(tier===TA.length-1)paintAbyss(c,center,center,size*.265,w,h);
  else paintPlayerForm(center,center,size*(tier>=23?.23:tier>=19?.22:.255),2.4,tier);
 }finally{ctx=old;}
}
function showBestiary(){
 show(`<div class="eyebrow">${L('FIELD GUIDE / 07 ENTRIES','СПРАВОЧНИК / 07 ЗАПИСЕЙ','GUÍA / 07 ENTRADAS')}</div><div class="overlay-title">${L('COSMIC BESTIARY','КОСМИЧЕСКИЙ БЕСТИАРИЙ','BESTIARIO CÓSMICO')}</div><div class="bestiary-grid">${FIELD_GUIDE.map(([id,t,title,desc])=>`<article class="bestiary-entry"><div class="bestiary-orb orb-${id}" aria-hidden="true"></div><div><small>${g.tier>=t?L('REACHED','ДОСТИГНУТО','ALCANZADO'):L('AHEAD','ВПЕРЕДИ','POR DESCUBRIR')} · ${String(t+1).padStart(2,'0')}</small><h3>${L(...title)}</h3><p>${L(...desc)}</p></div></article>`).join('')}</div><p class="overlay-copy">${L('Number scale: K = 10³ · M = 10⁶ · B = 10⁹ · T = 10¹² · Qa = 10¹⁵. After Dc the scale continues with aa, ab… Every step is ×1000.','Сокращения: K = 10³ · M = 10⁶ · B = 10⁹ · T = 10¹² · Qa = 10¹⁵. После Dc идут aa, ab… Каждый шаг — ×1000.','Escala: K = 10³ · M = 10⁶ · B = 10⁹ · T = 10¹² · Qa = 10¹⁵. Después de Dc sigue aa, ab… Cada paso es ×1000.')}</p><div class="modal-actions">${continueButton()}</div>`);attachContinue();
}
let tutorialStep=0;
function showTutorial(step=0){
 tutorialStep=step;
 const steps=[
  [L('01 / FIND YOUR ORBIT','01 / НАЙДИ СВОЮ ОРБИТУ','01 / ENCUENTRA TU ÓRBITA'),L('Move with WASD, arrow keys or the cursor. On a phone, use the joystick. Approach smaller objects: your gravity catches them automatically.','Двигайся WASD, стрелками или курсором. На телефоне — джойстиком. Подлетай к мелким телам: гравитация подхватит их автоматически.','Muévete con WASD, flechas o el cursor. En el móvil usa el joystick. Acércate a cuerpos pequeños: tu gravedad los captura automáticamente.')],
  [L('02 / READ THE CURRENT','02 / ПОЧУВСТВУЙ ПОТОК','02 / LEE LA CORRIENTE'),L('Bigger bodies attract you. Use Dash (Shift) to escape and Pulse (E) to draw in edible objects. The wheel or +/− controls only the camera.','Большие тела притягивают тебя. Рывок (Shift) поможет уйти, импульс (E) притянет доступную добычу. Колёсико и +/− меняют только камеру.','Los cuerpos mayores te atraen. Usa Acelerón (Shift) para escapar y Pulso (E) para atraer presas. La rueda y +/− solo controlan la cámara.')],
  [L('03 / EVOLVE & EXPLORE','03 / РАСТИ И ИССЛЕДУЙ','03 / EVOLUCIONA Y EXPLORA'),L('Open the evolution card for your recipe. Gather mass, materials and explore. The atlas (M) shows giants ahead. Right-click to name and colour a waypoint; on mobile use + Marker. A larger black hole ends your run.','Открой карточку эволюции: там рецепт. Собирай массу, материалы и исследуй космос. Карта (M) заранее покажет гигантов. ПКМ создаёт метку с именем и цветом; на телефоне — + Метка. Большая чёрная дыра завершит прохождение.','Abre la tarjeta de evolución para ver la receta. Reúne masa y materiales y explora. El atlas (M) revela gigantes. Clic derecho crea una marca con nombre y color; en móvil usa + Marca. Un agujero negro mayor termina tu partida.')]
 ];
 show(`<div class="eyebrow">${L('QUICK FLIGHT SCHOOL','МИНИ-ОБУЧЕНИЕ','ESCUELA DE VUELO')}</div><div class="tutorial-orbit" aria-hidden="true">${uiIcon(['gravity','speed','map'][step])}</div><div class="overlay-title">${steps[step][0]}</div><p class="overlay-copy">${steps[step][1]}</p><label class="settings-line"><span>Language / Язык / Idioma</span>${languageSelect()}</label><div class="tutorial-dots">${[0,1,2].map(i=>`<i class="${i===step?'active':''}"></i>`).join('')}</div><div class="modal-actions"><button id="tutorial-next" class="primary-button">${step===2?L('START FLIGHT','НАЧАТЬ ПОЛЁТ','COMENZAR VUELO'):L('NEXT','ДАЛЬШЕ','SIGUIENTE')}</button><button id="tutorial-skip" class="secondary-button">${L('SKIP','ПРОПУСТИТЬ','SALTAR')}</button></div>`);
 $('modal').dataset.screen='tutorial';
 const finish=()=>{g.tutorialDone=true;save();resumeGame();};
 $('panel-close').onclick=finish;$('tutorial-skip').onclick=finish;$('tutorial-next').onclick=()=>step===2?finish():showTutorial(step+1);
 $('set-language').onchange=e=>{window.SpaceI18n.setLanguage(e.target.value);renderUI();showTutorial(step);};
}
function languageSelect(){return `<select id="set-language" aria-label="Language / Язык / Idioma">${[['en','English'],['ru','Русский'],['es','Español']].map(([id,name])=>`<option value="${id}" ${window.SpaceI18n?.language===id?'selected':''}>${name}</option>`).join('')}</select>`;}
const MUSIC_TRACKS=window.SpaceMusicTracks||[];
const STARTER_TRACK=MUSIC_TRACKS[0]||null;
// The first real song is the permanent free starter track. Older saves also
// receive it, without changing a previously selected purchased song.
g.ownedTracks=[...new Set([...(STARTER_TRACK?[STARTER_TRACK.id]:[]),...(Array.isArray(g.ownedTracks)?g.ownedTracks:[])])].filter(id=>MUSIC_TRACKS.some(t=>t.id===id));
if(!g.ownedTracks.includes(g.activeTrack))g.activeTrack=STARTER_TRACK?.id??g.ownedTracks[0]??null;

function chooseTrack(track){
 if(!track?.src||!MUSIC_TRACKS.includes(track))return false;stopMusicPreview();
 g.ownedTracks??=[];
 if(!g.ownedTracks.includes(track.id)){
  if(g.credits<track.price){toast('Недостаточно звёздной пыли');return false;}
  g.credits-=track.price;g.ownedTracks.push(track.id);
 }
 g.activeTrack=track.id;g.music=true;if(externalMusic){externalMusic.pause();externalMusic=null;}
 if(track.src){externalMusic=new Audio(track.src);externalMusic.loop=true;externalMusic.play().catch(()=>{});}
 startMusic();save();return true;
}
function showMusicShop(){
 show(`<div class="eyebrow">${L('SIGNALS FROM THE VOID','СИГНАЛЫ ИЗ ПУСТОТЫ','SEÑALES DEL VACÍO')}</div><div class="overlay-title">${L('MUSIC COLLECTION','КОЛЛЕКЦИЯ МУЗЫКИ','COLECCIÓN DE MÚSICA')}</div><p class="overlay-copy">${L('Unlock tracks with stardust to listen. Purchased tracks remain yours after death and in a new universe.','Купи треки за звёздную пыль, чтобы слушать их. Покупки сохраняются после смерти и в новой Вселенной.','Compra pistas con polvo estelar para escucharlas. Se conservan tras morir y en un nuevo universo.')}</p><div class="track-list">${MUSIC_TRACKS.map(t=>`<div class="track-row"><span>${String(t.id+1).padStart(2,'0')}</span><div><strong>${t.title}</strong><small>${t.id===STARTER_TRACK?.id?L('Free · base soundtrack','Бесплатно · базовый трек','Gratis · pista básica'):`✦ ${fmt(t.price)}`}</small></div><button class="secondary-button" data-track="${t.id}" ${!t.src?'disabled':''}>${!t.src?L('COMING SOON','СКОРО','PRÓXIMAMENTE'):g.activeTrack===t.id?L('PLAYING','ИГРАЕТ','SONANDO'):g.ownedTracks.includes(t.id)?L('PLAY','СЛУШАТЬ','ESCUCHAR'):L('UNLOCK','КУПИТЬ','DESBLOQUEAR')}</button></div>`).join('')}</div><div class="modal-actions">${continueButton()}</div>`);attachContinue();document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{if(chooseTrack(MUSIC_TRACKS.find(t=>t.id===+b.dataset.track)))showMusicShop();});
}
// Daily login gift plus one wheel spin per calendar day. Roulette prizes are
// granted atomically before the visual spin and remain owned after any death.
let dailyOrigin='menu';
function dailyReturn(){
 const from=dailyOrigin;
 dailyOrigin='menu';
 if(from==='play')resumeGame();else showMainMenu(true);
}
function showDailyRewards(origin){
 dailyOrigin=origin||($('modal').classList.contains('off')?'play':'menu');
 const meta=window.SpaceMeta;if(!meta)return;
 const state=meta.state(g),today=meta.dayIndex(),canClaim=meta.canClaim(g),canSpin=meta.canSpin(g);
 const claimedToday=state.lastDay===today;
 const todayStreak=claimedToday?state.streak:(state.lastDay===today-1?state.streak+1:1);
 const todayReward=meta.baseReward(g,todayStreak);
 const futureDays=Array.from({length:7},(_,i)=>{
  const active=i===0,amount=meta.baseReward(g,todayStreak+i);
  const timing=active?L('TODAY','СЕГОДНЯ','HOY'):i===1?
   L('TOMORROW','ЗАВТРА','MAÑANA'):L('IN ','ЧЕРЕЗ ','EN ')+i+L(' DAYS',' ДН.',' DÍAS');
  const stateText=active?(claimedToday?L('CLAIMED','ПОЛУЧЕНО','RECOGIDO'):
   L('AVAILABLE','ДОСТУПНО','DISPONIBLE')):L('UPCOMING','ВПЕРЕДИ','PRÓXIMO');
  return '<div class="daily-day'+(active?' daily-day-current':'')+(active&&claimedToday?' daily-day-claimed':'')+'">'+
   '<div class="daily-day-head"><small>'+timing+'</small><span>'+(active&&claimedToday?'✓':active?'●':'○')+'</span></div>'+
   '<strong>'+L('DAY ','ДЕНЬ ','DÍA ')+(todayStreak+i)+'</strong>'+
   '<div class="daily-day-reward"><i>✦</i><b>'+fmt(amount)+'</b></div>'+
   '<div class="daily-day-state">'+stateText+'</div></div>';
 }).join('');
 const prizeRows=meta.PRIZES.map(p=>{
  const track=p.id==='track';
  const label=track?L('RANDOM TRACK','СЛУЧАЙНЫЙ ТРЕК','PISTA ALEATORIA'):'✦ '+fmt(todayReward*p.mult);
  const detail=track?
   L('Or its price if owned','Или его цена при полной коллекции','O su precio si la colección está completa'):
   '×'+p.mult+' '+L('daily gift','ежедневного подарка','regalo diario');
  return '<div class="daily-wheel-legend-item" data-prize="'+p.id+'">'+
   '<i aria-hidden="true"></i><span><b>'+label+'</b><small>'+detail+'</small></span>'+
   '<strong>'+String(p.weight).replace('.',',')+'%</strong></div>';
 }).join('');
 show('<div class="daily-screen">'+
  '<header class="daily-header"><div><div class="daily-eyebrow">'+
  L('DAILY COSMIC REWARDS','КОСМИЧЕСКИЕ НАГРАДЫ','RECOMPENSAS CÓSMICAS')+'</div>'+
  '<h2>'+L('A gift every day','Подарок каждый день','Un regalo cada día')+'</h2>'+
  '<p>'+L('Log in daily to grow your streak. Claim a gift to unlock one roulette spin per day.','Заходи каждый день, увеличивай серию, получай подарок и открывай одну попытку в рулетке.','Entra a diario, aumenta tu racha, recibe un regalo y desbloquea un giro al día.')+'</p></div>'+
  '<button type="button" id="daily-back" class="daily-back">'+L('← BACK','← НАЗАД','← VOLVER')+'</button></header>'+
  '<div class="daily-streak"><span>'+L('LOGIN STREAK','СЕРИЯ ВХОДОВ','RACHA DIARIA')+'</span><strong>✦ '+state.streak+' '+
  L('days','дн.','días')+'</strong><span>'+L('Gifts claimed','Подарков получено','Regalos recogidos')+': '+state.claims+'</span>'+
  '<span>'+L('Spins played','Прокруток','Giros')+': '+state.spins+'</span></div>'+
  '<div class="daily-layout"><section class="daily-week-panel"><div class="daily-section-title"><div>'+
  '<small>01 / '+L('LOGIN CALENDAR','КАЛЕНДАРЬ','CALENDARIO')+'</small><h3>'+
  L('Your next 7 rewards','Следующие 7 наград','Tus próximos 7 regalos')+'</h3></div></div>'+
  '<div class="daily-calendar">'+futureDays+'</div>'+
  '<p class="daily-calendar-note">'+L('Preview assumes consecutive logins at your current evolution stage. Missing a day resets the streak.','Суммы рассчитаны для текущего этапа эволюции при ежедневном входе. Пропуск дня сбрасывает серию.','Los importes suponen ingresos consecutivos en tu etapa actual. Un día perdido reinicia la racha.')+'</p>'+
  '<button type="button" id="daily-claim" class="daily-claim" '+(canClaim?'':'disabled')+'>'+
  (canClaim?L('✦ CLAIM TODAY · ','✦ ЗАБРАТЬ СЕГОДНЯ · ','✦ RECOGER HOY · ')+'✦ '+fmt(todayReward):
   L('✓ TODAY’S GIFT CLAIMED','✓ СЕГОДНЯШНЯЯ НАГРАДА ПОЛУЧЕНА','✓ REGALO DE HOY RECOGIDO'))+'</button></section>'+
  '<section class="daily-roulette-panel"><div class="daily-section-title"><div>'+
  '<small>02 / '+L('LUCKY SPIN','РУЛЕТКА','RULETA')+'</small><h3>'+
  L('Cosmic roulette','Космическая рулетка','Ruleta cósmica')+'</h3></div>'+
  '<span class="daily-spin-frequency">'+L('1 SPIN / DAY','1 РАЗ В ДЕНЬ','1 GIRO / DÍA')+'</span></div>'+
  '<div class="daily-wheel-summary">'+L('The wheel follows the real odds. The list shows exactly what each prize gives.','Сектора соответствуют реальным шансам. Справа указаны точные награды и вероятность.','Los sectores representan las probabilidades reales. A la derecha están los premios y sus opciones.')+'</div>'+
  '<div class="daily-roulette-body"><div class="daily-wheel-stage"><div class="daily-wheel-pointer" aria-hidden="true">▼</div>'+
  '<div class="daily-wheel" id="daily-wheel" role="img" aria-label="'+L('Weighted prize roulette','Рулетка с вероятностями наград','Ruleta de premios ponderados')+'">'+
  '<div class="daily-wheel-center"><span>✦</span><small>IS</small></div></div>'+
  '<div class="daily-wheel-caption">'+L('8 PRIZES','8 НАГРАД','8 PREMIOS')+'</div></div>'+
  '<div class="daily-wheel-legend">'+prizeRows+'</div></div>'+
  '<div class="daily-prize-note">♫ '+L('Ultra-rare: random unowned track (0.8%); if all are owned, receive a track’s price.','Сверхредкий приз: случайный непроданный трек (0,8%); если все куплены — его стоимость.','Ultra raro: pista sin comprar (0,8%); si tienes todas, recibes su precio.')+'</div>'+
  '<div id="daily-result" class="daily-result" role="status" aria-live="polite">'+
  (canClaim?L('First claim your gift on the left.','Сначала забери подарок слева.','Primero recoge tu regalo a la izquierda.'):
   canSpin?L('Everything is ready. Spin to win one prize!','Всё готово! Крути и получай один приз.','¡Todo listo! Gira para ganar un premio.'):
   L('Your spin is used. Come back tomorrow!','Попытка использована. Возвращайся завтра!','Ya has girado. ¡Vuelve mañana!'))+'</div>'+
  '<button type="button" id="daily-spin" class="daily-spin" '+(canSpin?'':'disabled')+'>'+
  (canSpin?L('✦ SPIN FOR A PRIZE','✦ КРУТИТЬ РУЛЕТКУ','✦ GIRAR PARA GANAR'):
   L('NEXT SPIN TOMORROW','СЛЕДУЮЩАЯ ПОПЫТКА ЗАВТРА','PRÓXIMO GIRO MAÑANA'))+'</button></section></div></div>');
 $('modal').dataset.screen='daily';
 $('modal').dataset.dailyOrigin=dailyOrigin;
 // Keep the main-menu black hole and comets behind the overlay when opened from menu.
 menuVisible=dailyOrigin==='menu';
 if(menuVisible)setNavigationState('menu');
 $('panel-close').onclick=dailyReturn;
 $('daily-back').onclick=dailyReturn;
 $('daily-claim').onclick=()=>{
  const result=meta.claim(g);if(!result.ok)return;
  save();checkProgression();showDailyRewards(dailyOrigin);
  toast(L('Daily gift: ','Ежедневная награда: ','Regalo diario: ')+'✦ '+fmt(result.amount));
 };
 $('daily-spin').onclick=()=>{
  const result=meta.roll(g,MUSIC_TRACKS);
  if(!result.ok)return;
  save();checkProgression();
  const spin=$('daily-spin');spin.disabled=true;
  spin.textContent=L('SPINNING…','ВРАЩАЕТСЯ…','GIRANDO…');
  $('daily-claim').disabled=true;
  const wheel=$('daily-wheel'),resultBox=$('daily-result');
  resultBox.textContent=L('The wheel is spinning…','Рулетка вращается…','La ruleta está girando…');
  resultBox.classList.remove('daily-result-win');
  const sectorId=result.prize==='track-value'?'track':result.prize;
  let cumulative=0,sectorCenter=0;
  for(const prize of meta.PRIZES){
   if(prize.id===sectorId){sectorCenter=cumulative+prize.weight/2;break;}
   cumulative+=prize.weight;
  }
  // The weighted dial starts at 12 o'clock, matching the actual roll probabilities.
  wheel.style.setProperty('--wheel-turn',(1800+360-sectorCenter*3.6)+'deg');
  wheel.classList.add('spinning');
  const message=result.type==='track'?
   L('NEW TRACK','НОВЫЙ ТРЕК','PISTA NUEVA')+': '+result.track.title:
   '✦ '+fmt(result.amount)+(result.prize==='track-value'?
    ' · '+L('Complete collection: track price','Все треки куплены: стоимость трека','Colección completa: precio de la pista'):'');
  sound(590,'triangle',.20,.04);
  setTimeout(()=>{
   if(!wheel.isConnected||!resultBox.isConnected)return;
   wheel.classList.add('finished');
   const tile=$('modal').querySelector('.daily-wheel-legend-item[data-prize="'+sectorId+'"]');
   if(tile)tile.classList.add('daily-wheel-winner');
   resultBox.textContent=message;resultBox.classList.add('daily-result-win');
   spin.textContent=L('COME BACK TOMORROW','ВОЗВРАЩАЙСЯ ЗАВТРА','VUELVE MAÑANA');
   sound(790,'sine',.16,.03);
  },2450);
 };
}
function showMainMenu(paused=false){
 show(`<div class="menu-scene-label" aria-hidden="true">SINGULARITY / ∞</div><div class="menu-content"><div class="hero-kicker">${paused?'ПОЛЁТ ПРИОСТАНОВЛЕН':'ОТ ЧАСТИЦЫ ДО БЕСКОНЕЧНОСТИ'}</div><h1>INFINITI<br><span>SPACE</span></h1><p class="modal-lead">Твоя гравитация. Твоя эволюция.<br>Бесконечная Вселенная впереди.</p><nav class="menu-nav" aria-label="Главное меню"><button id="btn-start" class="primary-button">${paused||g.time>0?'ПРОДОЛЖИТЬ ПУТЕШЕСТВИЕ':'НАЧАТЬ ЭВОЛЮЦИЮ'} <span>${uiIcon('arrow')}</span></button><button id="menu-map"><span>${uiIcon('map')}</span>Карта Вселенной <small>M</small></button><button id="menu-achievements"><span>${uiIcon('achievements')}</span>Достижения <small>${uiIcon('expand')}</small></button><button id="menu-bestiary"><span>${uiIcon('map')}</span>${L('Bestiary','Бестиарий','Bestiario')} <small>${uiIcon('expand')}</small></button><button id="menu-statistics"><span>${uiIcon('statistics')}</span>Статистика <small>${uiIcon('expand')}</small></button><button id="menu-settings"><span>${uiIcon('settings')}</span>Настройки <small>${uiIcon('expand')}</small></button></nav><div class="menu-save"><span class="live-dot"></span>${g.time>10?`${TA[g.tier].name} · ${timeFmt(g.time)} · автосохранение`:'28 форм эволюции · свободное исследование'}</div></div><div class="menu-footer"><span>WASD — полёт · Колёсико — масштаб · E — импульс</span><span>v3.45.0 / INFINITI SPACE</span></div>`);
 menuVisible=true;setNavigationState('menu');$('modal').dataset.screen='menu';$('modal').firstElementChild.classList.add('menu-card');
 $('btn-start').onclick=()=>g.tutorialDone?resumeGame():showTutorial();$('menu-map').onclick=showMap;
 const dailyMenuBtn=document.createElement('button');dailyMenuBtn.id='menu-daily';
 dailyMenuBtn.innerHTML='✦ '+L('Daily rewards & roulette','Ежедневные награды и рулетка','Recompensas y ruleta');
 dailyMenuBtn.onclick=()=>showDailyRewards('menu');
 $('menu-map').parentElement.insertBefore(dailyMenuBtn,$('menu-map').nextSibling);
 $('menu-bestiary').onclick=showBestiary;$('menu-achievements').onclick=showAchievements;$('menu-statistics').onclick=showStatistics;$('menu-settings').onclick=showSettings;
}
// The atlas reads the exact same deterministic sector data as gameplay; it is not an evolution-level menu.
function popcount32(x){x=x>>>0;x=x-((x>>>1)&0x55555555);x=(x&0x33333333)+((x>>>2)&0x33333333);return (((x+(x>>>4))&0x0F0F0F0F)*0x01010101)>>>24;}
function atlasScale(){return 27*atlas.zoom/CHUNK;}
// One navigation cell represents one light-year; world coordinates/save IDs stay unchanged.
function lightYears(worldDistance){return atlasNumber(worldDistance/CHUNK)+' св. лет';}
function atlasNumber(value){
 const n=Math.abs(value);
 if(n>=10000)return fmt(value);
 if(n>0&&n<.001)return value.toExponential(2).replace('e+',' × 10^').replace('e-',' × 10^-');
 return value.toLocaleString(typeof window!=='undefined'&&window.SpaceI18n?.language||'ru-RU',{maximumFractionDigits:n<1?3:n<100?1:0});
}
function atlasNiceDistance(value){
 const power=10**Math.floor(Math.log10(Math.max(1e-155,value))),fraction=value/power;
 return (fraction>=5?5:fraction>=2?2:1)*power;
}
function atlasFitZoom(w,h){
 return clamp(Math.min(w/W,h/H)*.72*camera.zoom*CHUNK/27,1e-155,12);
}
function atlasFitPlayer(animate=false){
 const bounds=$('atlas-canvas').getBoundingClientRect();
 const zoom=atlasFitZoom(bounds.width,bounds.height);
 if(animate){atlas.focusTween={x:atlas.x,y:atlas.y,z:atlas.zoom,toX:player.x,toY:player.y,toZ:zoom,t:0};}
 else {atlas.x=player.x;atlas.y=player.y;atlas.zoom=zoom;atlas.focusTween=null;}atlas.dirty=true;
}
function updateAtlasMotion(dt){
 const f=atlas.focusTween;if(!f)return;f.t=Math.min(1,f.t+dt/.8);const t=f.t*f.t*(3-2*f.t);
 atlas.x=f.x*(1-t)+f.toX*t;atlas.y=f.y*(1-t)+f.toY*t;atlas.zoom=Math.exp(Math.log(f.z)*(1-t)+Math.log(f.toZ)*t);atlas.dirty=true;
 if(f.t>=1)atlas.focusTween=null;
}
function changeAtlasZoom(factor,anchorX,anchorY){
 atlas.focusTween=null;
 const bounds=$('atlas-canvas').getBoundingClientRect(),before=atlasScale();
 atlas.zoom=clamp(atlas.zoom*factor,1e-155,12);
 const after=atlasScale();
 if(anchorX!==undefined){
  atlas.x+=(anchorX-bounds.width/2)*(1/before-1/after);
  atlas.y+=(anchorY-bounds.height/2)*(1/before-1/after);
 }
 atlas.dirty=true;
}
function atlasAbyssMarkers(x,y,w,h,scale){
 const result=[];
 for(const body of abyssCandidates(x,y,Math.hypot(w,h)/scale)){
  const px=w/2+(body.x-x)*scale,py=h/2+(body.y-y)*scale,r=body.r*scale;
  if(px+r<0||py+r<0||px-r>w||py-r>h)continue;
  const group=r<4?result.find(m=>m.r<4&&Math.hypot(m.x-px,m.y-py)<14):null;
  if(group)group.bodies.push(body);
  else result.push({x:px,y:py,r,bodies:[body]});
 }
 return result;
}
function atlasFocusHoles(bodies){
 const bounds=$('atlas-canvas').getBoundingClientRect();
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(const h of bodies){left=Math.min(left,h.x-h.r*2);right=Math.max(right,h.x+h.r*2);top=Math.min(top,h.y-h.r*2);bottom=Math.max(bottom,h.y+h.r*2);}
 atlas.x=(left+right)/2;atlas.y=(top+bottom)/2;
 atlas.zoom=clamp(Math.min(bounds.width/(right-left),bounds.height/(bottom-top))*.8*CHUNK/27,1e-155,12);atlas.dirty=true;
}
function addMapPin(x,y,zoom=atlas.zoom){
 if(!Number.isFinite(x)||!Number.isFinite(y)||g.mapPins.length>=64)return null;
 const id=g.nextPinId++,pin={id,x,y,zoom:clamp(zoom,1e-155,12),name:L('Marker','Метка','Marca')+` ${id}`,color:'#7ddcff'};
 g.mapPins.push(pin);g.activePin=id;save();return pin;
}
function removeMapPin(id){
 g.mapPins=g.mapPins.filter(p=>p.id!==id);
 if(g.activePin===id)g.activePin=g.mapPins.length?g.mapPins[g.mapPins.length-1].id:null;
 save();
}
function refreshPinPanel(){
 const list=$('atlas-pin-list');if(!list)return;
 list.replaceChildren();
 const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=g.mapPins.length?'Выбери метку':'Нет меток';list.append(placeholder);
 for(const pin of g.mapPins){const option=document.createElement('option');option.value=String(pin.id);option.textContent=pin.name;option.dataset.noTranslate='';list.append(option);}
 list.value=g.activePin?String(g.activePin):'';
 const pin=g.mapPins.find(p=>p.id===g.activePin);
 $('atlas-pin-name').value=pin?.name||'';$('atlas-pin-name').disabled=!pin;
 $('atlas-pin-go').disabled=!pin;$('atlas-pin-delete').disabled=!pin;
 $('atlas-pin-add').setAttribute('aria-pressed',String(!!atlas.placingPin));
 $('atlas-pin-hint').textContent=atlas.placingPin?'Нажми на карту, чтобы поставить метку.':L('Right-click: create or edit a marker. On touch: + Marker, then tap the map.','ПКМ: создать или изменить метку. На телефоне: + Метка, затем точка на карте.','Clic derecho: crear o editar marca. En móvil: + Marca y toca el mapa.');
 $('atlas-canvas').style.cursor=atlas.placingPin?'crosshair':'grab';
}
function closePinEditor(){$('pin-editor')?.remove();}
function openPinEditor(px,py,clientX,clientY){
 closePinEditor();atlas.drag=false;atlas.focusTween=null;
 const bounds=$('atlas-canvas').getBoundingClientRect(),scale=atlasScale();
 const pin=g.mapPins.find(p=>Math.hypot(bounds.width/2+(p.x-atlas.x)*scale-px,bounds.height/2+(p.y-atlas.y)*scale-py)<18);
 const x=atlas.x+(px-bounds.width/2)/scale,y=atlas.y+(py-bounds.height/2)/scale;
 const el=document.createElement('form');el.id='pin-editor';el.className='pin-editor';el.setAttribute('aria-label',L('Map marker','Метка на карте','Marca del mapa'));
 el.innerHTML=`<strong>${pin?L('EDIT MARKER','ИЗМЕНИТЬ МЕТКУ','EDITAR MARCA'):L('CREATE MARKER','СОЗДАТЬ МЕТКУ','CREAR MARCA')}</strong><label>${L('Name','Название','Nombre')}<input id="pin-editor-name" data-no-translate maxlength="32" required></label><label class="pin-color-line">${L('Colour','Цвет','Color')}<input id="pin-editor-color" type="color" value="${pin?.color||'#7ddcff'}"></label><div><button class="primary-button" type="submit">${pin?L('Save','Сохранить','Guardar'):L('Create','Создать','Crear')}</button>${pin?`<button type="button" id="pin-editor-delete" class="secondary-button">${L('Delete','Удалить','Eliminar')}</button>`:''}<button type="button" id="pin-editor-cancel" class="secondary-button">${L('Cancel','Отмена','Cancelar')}</button></div>`;
 $('modal').append(el);$('pin-editor-name').value=pin?.name||L('Marker','Метка','Marca')+' '+g.nextPinId;
 el.style.left=clamp(clientX,12,Math.max(12,W-292))+'px';el.style.top=clamp(clientY,90,Math.max(90,H-265))+'px';
 const finish=()=>{closePinEditor();refreshPinPanel();atlas.dirty=true;};
 el.onsubmit=ev=>{ev.preventDefault();const name=$('pin-editor-name').value.trim().slice(0,32);if(!name)return;
  const target=pin||addMapPin(x,y);if(!target){toast('На карте уже 64 метки');return;}
  target.name=name;target.color=$('pin-editor-color').value;g.activePin=target.id;save();finish();
 };
 $('pin-editor-cancel').onclick=finish;if(pin)$('pin-editor-delete').onclick=()=>{removeMapPin(pin.id);finish();};
 el.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();finish();}};
 $('pin-editor-name').focus();$('pin-editor-name').select();
}
function atlasContextMenu(ev){
 ev.preventDefault();
 const bounds=$('atlas-canvas').getBoundingClientRect();
 atlas.drag=false;atlas.placingPin=false;
 openPinEditor(ev.clientX-bounds.left,ev.clientY-bounds.top,ev.clientX,ev.clientY);
}
function atlasMapClick(px,py){
 const bounds=$('atlas-canvas').getBoundingClientRect(),scale=atlasScale();
 if(atlas.placingPin){
  atlas.placingPin=false;refreshPinPanel();
  openPinEditor(px,py,bounds.left+px,bounds.top+py);return;
 }
 closePinEditor();
 const pin=g.mapPins.find(p=>Math.hypot(bounds.width/2+(p.x-atlas.x)*scale-px,bounds.height/2+(p.y-atlas.y)*scale-py)<14);
 if(pin){g.activePin=pin.id;save();refreshPinPanel();atlas.dirty=true;return;}
 const marker=atlasAbyssMarkers(atlas.x,atlas.y,bounds.width,bounds.height,scale).find(m=>Math.hypot(m.x-px,m.y-py)<Math.max(12,m.r));
 if(marker)atlasFocusHoles(marker.bodies);
}
// Persistent markers are all drawn. Close marks are clustered with a visible
// count rather than hidden beneath whichever marker was saved last.
function drawMapPins(c,w,h,scale){
 const groups=[];
 for(const pin of g.mapPins){
  const x=w/2+(pin.x-atlas.x)*scale,y=h/2+(pin.y-atlas.y)*scale;
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<-20||y<-20||x>w+20||y>h+20)continue;
  const neighbor=groups.find(g=>Math.hypot(g.x-x,g.y-y)<24);
  if(neighbor){neighbor.pins.push(pin);continue;}
  groups.push({x,y,pins:[pin]});
 }
 c.save();c.textBaseline='middle';c.font='800 12px Inter,sans-serif';
 for(const {x,y,pins} of groups){
  const pin=pins.find(p=>p.id===g.activePin)||pins[0],active=pins.some(p=>p.id===g.activePin),color=pin.color||'#a986ff';
  const r=active?15:13;
  c.save();c.shadowBlur=18;c.shadowColor=color;c.lineWidth=active?3.2:2.5;
  c.fillStyle='rgba(17,9,34,.95)';c.strokeStyle=color;
  c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.fill();c.stroke();
  c.fillStyle=color;c.beginPath();c.arc(x,y,4,0,TAU);c.fill();c.restore();
  if(pins.length>1){c.save();c.font='900 11px Inter,sans-serif';c.fillStyle='#fff';
    c.textAlign='center';c.fillText(String(pins.length),x,y+.5);c.restore();}
  const title=pins.length>1?pin.name+' +'+(pins.length-1):pin.name;
  const labelW=Math.min(178,Math.max(65,c.measureText(title).width+20));
  const lx=clamp(x+18,4,Math.max(4,w-labelW-4)),ly=clamp(y-13,4,Math.max(4,h-28));
  c.fillStyle='rgba(21,11,37,.96)';c.strokeStyle=active?'#d5b8ff':color;c.lineWidth=1.3;
  c.fillRect(lx,ly,labelW,26);c.strokeRect(lx+.5,ly+.5,labelW-1,25);
  c.textAlign='left';c.fillStyle='#f8eaff';c.fillText(title,lx+9,ly+13,labelW-16);
 }
 c.restore();
}
function renderWaypoint(){
 if(!g.mapPins.length)return;
 const groups=[],margin=38,top=120,bottom=Math.max(top+30,H-135);
 // Show every saved marker in the flight view, including those off-screen.
 for(const pin of g.mapPins){
  const p=project(pin.x,pin.y);if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;
  const angle=Math.atan2(p.y-H/2,p.x-W/2);
  const outside=p.x<margin||p.y<top||p.x>W-margin||p.y>bottom;
  const x=outside?clamp(W/2+Math.cos(angle)*W*.42,margin,W-margin):p.x;
  const y=outside?clamp(H/2+Math.sin(angle)*H*.34,top,bottom):p.y;
  const neighbor=groups.find(g=>Math.hypot(g.x-x,g.y-y)<35);
  if(neighbor){neighbor.pins.push(pin);continue;}
  groups.push({x,y,angle,outside,pins:[pin]});
 }
 ctx.save();ctx.textBaseline='middle';ctx.font='800 11px Inter,sans-serif';
 for(const group of groups){
  const {x,y,pins,angle,outside}=group,active=pins.some(p=>p.id===g.activePin);
  const pin=pins.find(p=>p.id===g.activePin)||pins[0],color=pin.color||'#a986ff',r=active?15:13;
  ctx.save();ctx.translate(x,y);ctx.shadowBlur=18;ctx.shadowColor=color;
  ctx.fillStyle='rgba(17,9,34,.96)';ctx.strokeStyle=color;ctx.lineWidth=active?3.2:2.4;
  ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle=color;ctx.beginPath();
  if(outside){ctx.rotate(angle);ctx.moveTo(9,0);ctx.lineTo(-5,-6);ctx.lineTo(-5,6);}
  else{ctx.moveTo(0,-9);ctx.lineTo(9,0);ctx.lineTo(0,9);ctx.lineTo(-9,0);}
  ctx.closePath();ctx.fill();ctx.restore();
  const title=pins.length>1?pin.name+' +'+(pins.length-1):pin.name;
  const label=title+' · '+lightYears(Math.hypot(pin.x-player.x,pin.y-player.y));
  const ww=Math.min(185,Math.max(85,ctx.measureText(label).width+17));
  const lx=clamp(x-ww/2,5,Math.max(5,W-ww-5)),ly=clamp(y+18,top+8,Math.max(top+8,H-28));
  ctx.fillStyle='rgba(18,10,33,.94)';ctx.strokeStyle=color;ctx.lineWidth=1.2;
  ctx.fillRect(lx,ly,ww,24);ctx.strokeRect(lx+.5,ly+.5,ww-1,23);
  ctx.textAlign='center';ctx.fillStyle='#f9edff';ctx.fillText(label,lx+ww/2,ly+12,ww-12);
 }
 ctx.restore();
}
let atlasExplorationSurface=null;
function drawAtlas(){
 const surface=$('atlas-canvas');if(!surface)return;
 const bounds=surface.getBoundingClientRect();if(bounds.width<10)return;
 const w=Math.round(bounds.width),h=Math.round(bounds.height),pixelRatio=g.autoQuality===false?(devicePixelRatio||1):Math.min(devicePixelRatio||1,1.5);
 if(surface.width!==Math.floor(w*pixelRatio)||surface.height!==Math.floor(h*pixelRatio)){surface.width=Math.floor(w*pixelRatio);surface.height=Math.floor(h*pixelRatio);}
 const c=surface.getContext('2d'),scale=atlasScale();window.SpaceI18n?.context(c);
 const projectMap=(x,y)=>({x:w/2+(x-atlas.x)*scale,y:h/2+(y-atlas.y)*scale});
 c.setTransform(pixelRatio,0,0,pixelRatio,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
 c.fillStyle='#0b0a1c';c.fillRect(0,0,w,h);
 // Exploration footprints stay in their real world coordinates at every scale.
 // Paint exploration onto one opaque mask, then composite it ONCE. Overlapping
 // discovered discs used to stack hundreds of translucent purple fills and wash
 // out the entire map (particularly near the infinite black-hole stage).
 const explored=atlasExplorationSurface??(atlasExplorationSurface=document.createElement('canvas'));
 if(explored.width!==w||explored.height!==h){explored.width=w;explored.height=h;}
 const mc=explored.getContext('2d');mc.clearRect(0,0,w,h);
 mc.fillStyle='#76519c';
 for(const d of g.discoveryDiscs){
  const q=projectMap(d[0]*CHUNK,d[1]*CHUNK),r=d[2]*CHUNK*scale;
  if(!Number.isFinite(r)||r<=0||q.x+r<0||q.x-r>w||q.y+r<0||q.y-r>h)continue;
  if(r>Math.hypot(w,h)+Math.hypot(q.x-w/2,q.y-h/2)){mc.fillRect(0,0,w,h);continue;}
  mc.beginPath();mc.arc(q.x,q.y,r,0,TAU);mc.fill();
 }
 const sectorPx=CHUNK*scale;
 mc.fillStyle='#9a77be';
 for(const key of visitedChunks){
  const comma=key.indexOf(','),cx=Number(key.slice(0,comma)),cy=Number(key.slice(comma+1));
  const p=projectMap(cx*CHUNK,cy*CHUNK);
  if(p.x+sectorPx<0||p.y+sectorPx<0||p.x>w||p.y>h)continue;
  mc.fillRect(p.x,p.y,Math.max(1,sectorPx),Math.max(1,sectorPx));
 }
 c.globalAlpha=.16;c.drawImage(explored,0,0,w,h);c.globalAlpha=1;
 // Adaptive grid uses fixed world units and bounded local loop counters.
 const gridWorld=atlasNiceDistance(105/scale/CHUNK)*CHUNK,gridPx=gridWorld*scale;
 const gridX=Math.floor((atlas.x-w/2/scale)/gridWorld),gridY=Math.floor((atlas.y-h/2/scale)/gridWorld);
 c.strokeStyle='rgba(162,132,220,.10)';c.lineWidth=1;c.beginPath();
 for(let i=0;i<Math.ceil(w/gridPx)+2;i++){const x=w/2+((gridX+i)*gridWorld-atlas.x)*scale;c.moveTo(x,0);c.lineTo(x,h);}
 for(let i=0;i<Math.ceil(h/gridPx)+2;i++){const y=h/2+((gridY+i)*gridWorld-atlas.y)*scale;c.moveTo(0,y);c.lineTo(w,y);}
 c.stroke();
 function plotBody(e,opacity=1){
  const p=projectMap(e.x,e.y);if(p.x<-20||p.y<-20||p.x>w+20||p.y>h+20)return;
  const r=clamp(e.r*scale*.35,1.5,18)*(e.absorbScale??1);
  c.globalAlpha=clamp(opacity,0,1)*.8;
  // Muted star-cloud silhouettes instead of flat coloured counters.
  const sprite=e.kind==='blackhole'?blackHoleSprite(e.holeType||0):bodySprite(e);
  c.drawImage(sprite,p.x-r*1.8,p.y-r*1.8,r*3.6,r*3.6);
 }
 { // Atlas visibility depends on map scale, never on the evolution stage.
  const view=cosmicViewAt(atlas.x,atlas.y,w,h,scale);
  for(const level of view.levels){
   const opacity=level===view.low?1-view.fraction:view.fraction;if(opacity<.025)continue;
   const stride=2**level,firstX=Math.floor(view.left/stride)*stride,firstY=Math.floor(view.top/stride)*stride;
   const columns=Math.min(36,Math.ceil((view.right-firstX)/stride)+1),rows=Math.min(28,Math.ceil((view.bottom-firstY)/stride)+1);
   for(let iy=0;iy<rows;iy++)for(let ix=0;ix<columns;ix++){
    const gx=firstX+ix*stride,gy=firstY+iy*stride,key=level===0?macroKey(gx,gy):`${level}:${gx}:${gy}`;
    const mask=((level===0?g.depletedMacro:g.depletedCosmic)[key]||0)>>>0;
    for(const e of (level===0?macroNodes(gx,gy):macroLODNodes(gx,gy,level))){
     if((mask&(1<<e.index))||absorbingMacroKeys.has(absorptionKey(e)))continue;
     plotBody(e,opacity);
    }
   }
  }
  for(const e of macroEntities)if(e.gravityBound||e.absorbing)plotBody(e);
  for(const e of cosmicAbsorptions)if(!e.dead)plotBody(e,e.captureOpacity);
  const live=new Set([...macroEntities,...cosmicAbsorptions].map(flightKey));
  for(const [key,e] of Object.entries(g.freeFlights))if((e.macro||e.cosmic)&&!live.has(key))plotBody(freeFlightAt(e),e.captureOpacity??1);
 }
 c.globalAlpha=1;
 const mapPlayer=projectMap(player.x,player.y),labelRects=[{x:mapPlayer.x-30,y:mapPlayer.y-38,w:135,h:68}];
 // Keep text away from controls and from other map labels.
 const canvasBox=surface.getBoundingClientRect();
 for(const selector of ['.map-corner.left','.map-corner.right','.map-threat']){
  const el=$('screen-map')?.querySelector(selector);if(!el||!el.offsetWidth)continue;
  const rect=el.getBoundingClientRect();labelRects.push({x:rect.left-canvasBox.left-9,y:rect.top-canvasBox.top-9,w:rect.width+18,h:rect.height+18});
 }
 labelRects.push({x:0,y:h-65,w:250,h:65});
 const maxHoleLabels=Math.max(2,Math.min(7,Math.floor(w/220)));let holeLabels=0;
 for(const marker of atlasAbyssMarkers(atlas.x,atlas.y,w,h,scale)){
  const {x,y,r,bodies}=marker,h0=bodies[0];
  if(r>=4)paintAbyss(c,x,y,r,w,h);
  else {c.fillStyle='#010205';c.strokeStyle='#a2b3c4';c.lineWidth=1;c.beginPath();c.arc(x,y,3,0,TAU);c.fill();c.stroke();}
  if(holeLabels>=maxHoleLabels||r<6)continue;
  const label=bodies.length>1?`ЧЁРНЫЕ ДЫРЫ ×${bodies.length}`:h0.name+(canEatAbyss(h0)?' · ДОБЫЧА':'');
  c.font='600 10px Inter,sans-serif';
  const detail=bodies.length===1&&r>=8,ww=Math.max(c.measureText(label).width,detail?165:0)+8,hh=detail?29:16;
  let placement=null;
  for(const offset of [-Math.max(4,r)-23,Math.max(4,r)+18,-Math.max(4,r)-44,Math.max(4,r)+40]){
   for(const dx of [8,-ww-8]){
    const candidate={x:clamp(x+dx,10,w-ww-10),y:clamp(y+offset,17,h-80),w:ww,h:hh};
    if(labelRects.every(q=>candidate.x>q.x+q.w||candidate.x+ww<q.x||candidate.y>q.y+q.h||candidate.y+hh<q.y)){placement=candidate;break;}
   }
   if(placement)break;
  }
  if(placement){holeLabels++;const {x:tx,y:ty}=placement;labelRects.push(placement);c.fillStyle='#dce6ee';c.fillText(label,tx,ty);
   if(detail){c.font='9px Inter,sans-serif';c.fillStyle='#ab8588';c.fillText(`ГОРИЗОНТ ${lightYears(h0.r*2)}`,tx,ty+13);}
  }
 }
 const playerPoint=projectMap(player.x,player.y);
 // Both the event horizon and gravity field are drawn at their TRUE map size.
 const isBlackHole=TA[g.tier].type==='blackhole';
 const bodyRadius=(isBlackHole?blackHoleCoreWorldRadius():player.r)*scale;
 const gravityRadius=(isBlackHole?blackHoleGravityRadius():ordinaryGravityRadius())*scale;
 if(Number.isFinite(gravityRadius)&&gravityRadius<Math.max(w,h)*20){
  c.strokeStyle='rgba(173,145,255,.48)';c.lineWidth=1;c.setLineDash([5,6]);
  c.beginPath();c.arc(playerPoint.x,playerPoint.y,gravityRadius,0,TAU);c.stroke();c.setLineDash([]);
 }
 if(Number.isFinite(bodyRadius)&&bodyRadius<Math.max(w,h)*20&&bodyRadius>1){
  c.strokeStyle=isBlackHole?'rgba(255,215,170,.75)':'rgba(198,174,255,.72)';
  c.lineWidth=1.3;c.beginPath();c.arc(playerPoint.x,playerPoint.y,bodyRadius,0,TAU);c.stroke();
 }
 // Render the current form in TRUE world units. Do not cap the radius to a
 // 10–26 px avatar: zooming the map must change the physical silhouette.
 // Keep only a separate locator when the form is genuinely subpixel.
 if(Number.isFinite(bodyRadius)&&bodyRadius>=.5){
  if(isBlackHole){
   paintAbyss(c,playerPoint.x,playerPoint.y,bodyRadius,w,h);
  }else if(bodyRadius<Math.max(w,h)*32){
   const previousCtx=ctx;ctx=c;
   try{paintPlayerForm(playerPoint.x,playerPoint.y,bodyRadius,0,g.tier);}
   finally{ctx=previousCtx;}
  }else{
   // A planet/galaxy larger than the entire atlas becomes a local surface.
   // Draw the true disk intersection without astronomical-radius paths.
   const diagonal=Math.hypot(w,h),dx=w*.5-playerPoint.x,dy=h*.5-playerPoint.y,d=Math.hypot(dx,dy);
   c.save();c.fillStyle=TA[g.tier].color;
   if(d+diagonal<bodyRadius){c.fillRect(0,0,w,h);}
   else if(d-diagonal<bodyRadius){
    const nx=dx/(d||1),ny=dy/(d||1),edgeX=playerPoint.x+nx*bodyRadius,edgeY=playerPoint.y+ny*bodyRadius;
    c.translate(edgeX,edgeY);c.rotate(Math.atan2(ny,nx));
    c.fillRect(-diagonal*3,-diagonal*3,diagonal*3,diagonal*6);
   }
   c.restore();
  }
 }else if(Number.isFinite(bodyRadius)){
  // This crosshair identifies position only; it is NOT an enlarged body.
  c.save();c.strokeStyle='rgba(222,195,255,.82)';c.lineWidth=1;
  c.beginPath();c.moveTo(playerPoint.x-4,playerPoint.y);c.lineTo(playerPoint.x+4,playerPoint.y);
  c.moveTo(playerPoint.x,playerPoint.y-4);c.lineTo(playerPoint.x,playerPoint.y+4);c.stroke();c.restore();
 }
 // The rectangular frame is the actual camera footprint, not a fixed inset.
 const viewCenter=projectMap(camera.x,camera.y),viewW=W/camera.zoom*scale,viewH=H/camera.zoom*scale;
 c.strokeStyle='rgba(179,143,241,.7)';c.lineWidth=1;
 if(Number.isFinite(viewW)&&Number.isFinite(viewH)&&viewW<5*w&&viewH<5*h){
  c.strokeRect(viewCenter.x-viewW/2,viewCenter.y-viewH/2,viewW,viewH);
 }else{
  c.setLineDash([4,7]);c.strokeRect(1,1,w-2,h-2);c.setLineDash([]);
 }
 if(playerPoint.x>=0&&playerPoint.y>=0&&playerPoint.x<=w&&playerPoint.y<=h){
  c.font='800 11px Inter,sans-serif';c.fillStyle='#fff3d6';
  const markerLabel=L('YOU','ТЫ','TÚ')+' · '+TA[g.tier].name;
  const tx=clamp(playerPoint.x+Math.min(34,Math.max(0,bodyRadius)+10),8,Math.max(8,w-130));
  c.fillText(markerLabel,tx,clamp(playerPoint.y-Math.min(30,Math.max(0,bodyRadius))-10,14,h-15),130);
 }
 const origin=projectMap(0,0);
 if(Math.hypot(origin.x-playerPoint.x,origin.y-playerPoint.y)>35&&origin.x>15&&origin.y>15&&origin.x<w-70&&origin.y<h-20){
  c.strokeStyle='#a18dbb';c.beginPath();c.arc(origin.x,origin.y,4,0,TAU);c.stroke();
  c.fillStyle='#ac98c7';c.font='10px Inter,sans-serif';c.fillText('НАЧАЛО',origin.x+9,origin.y-7);
 }
 drawDriftRoute(c,w,h,scale);drawMapPins(c,w,h,scale);
 // Scale bar uses the same light-year conversion as coordinates, sizes and waypoints.
 const barSectors=atlasNiceDistance(Math.min(150,w*.28)/sectorPx),barPx=barSectors*sectorPx;
 c.fillStyle='rgba(25,16,43,.96)';c.fillRect(12,h-59,Math.max(172,barPx+32),47);
 c.strokeStyle='#765496';c.lineWidth=1;c.strokeRect(12.5,h-58.5,Math.max(172,barPx+32)-1,46);c.strokeStyle='#c6a5f5';c.lineWidth=2;c.beginPath();c.moveTo(24,h-24);c.lineTo(24+barPx,h-24);
 c.moveTo(24,h-29);c.lineTo(24,h-19);c.moveTo(24+barPx,h-29);c.lineTo(24+barPx,h-19);c.stroke();
 c.fillStyle='#e7d6ff';c.font='600 11px Inter,sans-serif';c.fillText(`${lightYears(barSectors*CHUNK)}`,24,h-38);
 $('atlas-diameter').textContent=lightYears((g.endless?blackHoleCoreWorldRadius():player.r)*2);
 $('atlas-viewport').textContent=lightYears(W/camera.zoom);
 $('atlas-span').textContent=lightYears(w/scale);
 $('atlas-coords').textContent=`X ${lightYears(atlas.x)} · Y ${lightYears(atlas.y)}`;
 $('atlas-count').textContent=`Исследовано ≈ ${fmt(exploredCount())} св. лет²`;
 atlas.dirty=false;
}
function showMap(){
 atlas={x:player.x,y:player.y,zoom:1,drag:false,lastX:0,lastY:0,dirty:true};
 show(`<div class="atlas-top"><div><div class="eyebrow">ГАЛАКТИЧЕСКАЯ НАВИГАЦИЯ</div><div class="overlay-title">КАРТА ВСЕЛЕННОЙ</div></div><span class="atlas-north">N ↑</span></div>
 <div class="atlas-measures"><div><small>${g.endless?'ДИАМЕТР ГОРИЗОНТА':'ТВОЙ ДИАМЕТР'}</small><strong id="atlas-diameter"></strong></div><div><small>ШИРИНА ИГРОВОГО ЭКРАНА</small><strong id="atlas-viewport"></strong></div><div><small>ШИРИНА КАРТЫ</small><strong id="atlas-span"></strong></div></div>
 <div class="atlas-danger-bar"><span id="atlas-threat"></span><button id="atlas-abyss" class="secondary-button">ОБЗОР ГИГАНТОВ ↗</button></div>
 <div class="atlas-pins"><button id="atlas-pin-add" class="secondary-button" aria-pressed="false">＋ МЕТКА</button><select id="atlas-pin-list" aria-label="Метки на карте"></select><input data-no-translate id="atlas-pin-name" aria-label="Название метки" maxlength="32" placeholder="Название метки"><button id="atlas-pin-edit" class="secondary-button">${L('EDIT','ИЗМЕНИТЬ','EDITAR')}</button><button id="atlas-pin-go" class="secondary-button">К МЕТКЕ</button><button id="atlas-pin-delete" class="secondary-button" aria-label="Удалить выбранную метку">УДАЛИТЬ</button></div><div id="atlas-pin-hint" class="atlas-pin-hint" aria-live="polite"></div>
 <div class="atlas-stats"><span id="atlas-count"></span><span id="atlas-coords"></span></div>
 <div class="atlas-wrap"><canvas id="atlas-canvas" aria-label="Карта Вселенной: реальный масштаб, горизонт событий и видимая область"></canvas><div class="atlas-controls"><button id="atlas-zoom-in" class="atlas-control" title="Приблизить" aria-label="Приблизить карту"><span class="zoom-glyph zoom-glyph-plus" aria-hidden="true"></span></button><button id="atlas-zoom-out" class="atlas-control" title="Отдалить" aria-label="Отдалить карту"><span class="zoom-glyph zoom-glyph-minus" aria-hidden="true"></span></button><button id="atlas-center" class="atlas-control center" title="Мой масштаб" aria-label="Мой масштаб">${uiIcon('center')}</button></div></div>
 <div class="atlas-legend"><span><i class="atlas-mark you"></i>ГОРИЗОНТ / ТВОЙ РАЗМЕР</span><span class="gravity-key">◌ ПРИТЯЖЕНИЕ</span><span>▭ ИГРОВОЙ ЭКРАН</span><span><i class="atlas-mark known"></i>ИЗУЧЕНО</span><span>✦ ГАЛАКТИКИ</span><span class="abyss-key">◉ МЕНЬШЕ ТЕБЯ — ДОБЫЧА · БОЛЬШЕ — ОПАСНОСТЬ</span></div>
 <div class="atlas-footer"><small>Перетаскивай карту · ПКМ — метка · Колёсико / + / − — масштаб · ⌖ — вернуться к своему размеру. Расстояния и диаметры — в световых годах. Площадь — в квадратных световых годах.</small>${continueButton('ВЕРНУТЬСЯ В КОСМОС')}</div>`);
 setNavigationState('map');$('modal').dataset.screen='map';$('modal').firstElementChild.classList.add('atlas-card');atlasVisible=true;attachContinue();
 const cv=$('atlas-canvas');cv.style.touchAction='none';atlasFitPlayer();
 cv.addEventListener('contextmenu',atlasContextMenu);
 cv.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;atlas.focusTween=null;atlas.drag=true;atlas.moved=false;atlas.downX=atlas.lastX=ev.clientX;atlas.downY=atlas.lastY=ev.clientY;cv.setPointerCapture(ev.pointerId);});
 cv.addEventListener('pointermove',ev=>{if(!atlas.drag)return;if(Math.hypot(ev.clientX-atlas.downX,ev.clientY-atlas.downY)>6)atlas.moved=true;if(atlas.placingPin||!atlas.moved)return;const scale=atlasScale();atlas.x-=(ev.clientX-atlas.lastX)/scale;atlas.y-=(ev.clientY-atlas.lastY)/scale;atlas.lastX=ev.clientX;atlas.lastY=ev.clientY;atlas.dirty=true;});
 cv.addEventListener('pointerup',ev=>{if(atlas.drag&&!atlas.moved){const box=cv.getBoundingClientRect();atlasMapClick(ev.clientX-box.left,ev.clientY-box.top);}atlas.drag=false;});cv.addEventListener('pointercancel',()=>atlas.drag=false);
 cv.addEventListener('wheel',ev=>{ev.preventDefault();const box=cv.getBoundingClientRect();changeAtlasZoom(Math.exp(-clamp(ev.deltaY,-300,300)*.002),ev.clientX-box.left,ev.clientY-box.top);},{passive:false});
 $('atlas-zoom-in').onclick=()=>changeAtlasZoom(1.4);
 $('atlas-zoom-out').onclick=()=>changeAtlasZoom(1/1.4);
 $('atlas-center').onclick=()=>atlasFitPlayer(true);
 $('atlas-abyss').onclick=atlasShowAbyss;
 $('atlas-pin-add').onclick=()=>{atlas.placingPin=!atlas.placingPin;refreshPinPanel();};
 $('atlas-pin-list').onchange=ev=>{g.activePin=Number(ev.target.value)||null;save();refreshPinPanel();atlas.dirty=true;};
 $('atlas-pin-name').onchange=ev=>{const p=g.mapPins.find(p=>p.id===g.activePin);if(p){p.name=ev.target.value.trim().slice(0,32)||`Метка ${p.id}`;save();refreshPinPanel();atlas.dirty=true;}};
 $('atlas-pin-edit').onclick=()=>{const p=g.mapPins.find(p=>p.id===g.activePin);if(!p)return;const b=cv.getBoundingClientRect(),z=atlasScale();openPinEditor(b.width/2+(p.x-atlas.x)*z,b.height/2+(p.y-atlas.y)*z,W/2,H/2);};$('atlas-pin-delete').onclick=()=>{removeMapPin(g.activePin);refreshPinPanel();atlas.dirty=true;};
 $('atlas-pin-go').onclick=()=>{const p=g.mapPins.find(p=>p.id===g.activePin);if(p){atlas.x=p.x;atlas.y=p.y;atlas.zoom=p.zoom;atlas.dirty=true;}};
 const routeButton=document.createElement('button');routeButton.type='button';
 routeButton.className='secondary-button drift-route-button';
 routeButton.textContent=L('Show drift route','Маршрут дрейфа','Ruta de deriva');
 routeButton.disabled=(g.drift?.route?.length||0)<2;
 routeButton.onclick=atlasFocusDrift;
 $('atlas-pin-add').parentElement.append(routeButton);
 refreshPinPanel();
 const giant=nearestAbyss();
 $('atlas-threat').textContent=giant?`${giant.name} · диаметр ${lightYears(giant.r*2)} · ${atlasNumber(giant.r/(g.endless?blackHoleCoreWorldRadius():player.r))} раз больше тебя. При гибели звёздная пыль и покупки сохраняются.`:'За горизонтом сверхмассивной дыры весь прогресс теряется.';
 requestAnimationFrame(drawAtlas);
}

function showPause(){showMainMenu(true);}

function showSettings(){show(`<label class="settings-line"><span>Language / Язык / Idioma</span>${languageSelect()}</label><div class="eyebrow">ПАРАМЕТРЫ ПОЛЁТА</div><div class="overlay-title">НАСТРОЙКИ</div><div class="settings-line"><span>Управление мышью</span><select id="set-control-mode"><option value="hold" ${g.controlMode==='hold'?'selected':''}>Зажать кнопку и направлять</option><option value="follow" ${g.controlMode==='follow'?'selected':''}>Следовать за курсором</option><option value="keys" ${g.controlMode==='keys'?'selected':''}>Только клавиатура</option></select></div><div class="settings-line"><span>Отклик движения</span><select id="set-flight-feel"><option value="direct" ${g.flightFeel==='direct'?'selected':''}>Точный, без инерции</option><option value="smooth" ${g.flightFeel==='smooth'?'selected':''}>Плавный, с инерцией</option></select></div><p class="overlay-copy" style="text-align:left">WASD / стрелки — точное движение. По умолчанию объект плавно следует за курсором без нажатия. WASD — точное движение, на телефоне — джойстик. E — необязательный импульс, Shift — рывок.</p><div class="settings-line"><span>Кинематографичная космическая музыка</span><input id="set-music" type="checkbox" ${g.music?'checked':''}></div><div class="settings-line"><span>Громкость музыки</span><input id="set-music-volume" type="range" min="0" max="100" value="${Math.round(g.musicVolume*100)}" aria-label="Громкость музыки"></div><p class="overlay-copy" style="text-align:left">Оригинальный саундтрек: медленное органное звучание и пространственный эмбиент. Музыка запускается после нажатия «Играть».</p><div class="settings-line"><span>Звуковые эффекты</span><input id="set-sound" type="checkbox" ${g.sound?'checked':''}></div><label class="settings-line"><span>${L('Effects volume','Громкость эффектов','Volumen de efectos')}</span><input id="set-sound-volume" type="range" min="0" max="100" value="${Math.round((g.soundVolume??.7)*100)}"></label><div class="settings-line"><span>Частицы и вспышки</span><input id="set-particles" type="checkbox" ${g.particles?'checked':''}></div><label class="settings-line"><span>${L('Automatic graphics reduction','Автоматическое снижение графики','Reducción gráfica automática')}</span><input id="set-auto-quality" type="checkbox" ${g.autoQuality!==false?'checked':''}></label><p class="overlay-copy" style="text-align:left">${L('Off: full screen resolution and full-resolution black hole distortion, even at low FPS.','Выключено: полное разрешение экрана и искажения чёрных дыр, даже при низком FPS.','Desactivado: resolución completa de pantalla y distorsión de agujeros negros, incluso con pocos FPS.')}</p><div class="settings-line"><span>Качество эффектов</span><select id="set-quality" ${g.autoQuality===false?'disabled':''}><option value="1" ${g.autoQuality===false||g.quality===1?'selected':''}>Высокое</option><option value="0.5" ${g.autoQuality!==false&&g.quality===.5?'selected':''}>Экономное</option></select></div><p class="overlay-copy" style="text-align:left">M — карта, P — пауза. Схема управления сохраняется между запусками.</p><div class="modal-actions"><button id="settings-music" class="secondary-button">${L('Music collection','Коллекция музыки','Colección de música')}</button><button id="settings-tutorial" class="secondary-button">${L('Flight tutorial','Обучение','Tutorial de vuelo')}</button>${continueButton('СОХРАНИТЬ И ИГРАТЬ')}<button class="secondary-button" id="btn-new-universe">НОВАЯ ИГРА</button></div>`);$('modal').dataset.screen='settings';setNavigationState('settings');attachContinue();$('set-language').onchange=e=>{window.SpaceI18n.setLanguage(e.target.value);renderUI();showSettings();};$('settings-music').onclick=showMusicShop;$('settings-tutorial').onclick=()=>showTutorial();$('set-sound-volume').oninput=e=>{g.soundVolume=+e.target.value/100;save();};$('btn-new-universe').onclick=restartCampaign;$('set-control-mode').onchange=e=>{g.controlMode=e.target.value;clearFlightInput();syncHeadingControl();save();};$('set-flight-feel').onchange=e=>{g.flightFeel=e.target.value;save();};$('set-music').onchange=e=>{g.music=e.target.checked;initAudio();setMusicVolume();save();};$('set-music-volume').oninput=e=>{g.musicVolume=+e.target.value/100;setMusicVolume();save();};$('set-sound').onchange=e=>{g.sound=e.target.checked;save();};$('set-particles').onchange=e=>{g.particles=e.target.checked;save();};$('set-auto-quality').onchange=e=>{setAutoQuality(e.target.checked);$('set-quality').disabled=!e.target.checked;$('set-quality').value=String(e.target.checked?g.quality:1);};$('set-quality').onchange=e=>{g.quality=Number(e.target.value);performanceScale=1;applyResolution();save();};}
function resetCampaignState(resetModifiers=false){
 achievementQueue=[];achievementToastAt=-10;requirementNotice='';requirementNoticeAt=-100;if(externalMusic){externalMusic.pause();externalMusic=null;}
 const preferences={sound:g.sound,music:g.music,musicVolume:g.musicVolume,soundVolume:g.soundVolume,tutorialDone:g.tutorialDone,quality:g.quality,autoQuality:g.autoQuality,buyAmount:g.buyAmount,particles:g.particles,controlMode:g.controlMode,flightFeel:g.flightFeel,mobileMode:g.mobileMode,mobileSensitivity:g.mobileSensitivity,headingAngle:g.headingAngle,credits:Math.max(0,Number(g.credits)||0),ownedTracks:[...(g.ownedTracks||[])],activeTrack:g.activeTrack,achievements:{...g.achievements},bestiary:{...g.bestiary},daily:{...g.daily},drift:{...g.drift,route:[...(g.drift?.route||[])]}};
 cosmicAbsorptions.length=0;absorbingMacroKeys.clear();
 const next=fresh();Object.assign(g,next,preferences);pendingDeath=null;g.pendingDeath=null;visitedChunks.clear();loadedChunks.clear();distantChunkCache.clear();macroLoaded.clear();macroCache.clear();macroLODCache.clear();if(macroBackdrop){macroBackdrop.canvas.width=0;macroBackdrop.canvas.height=0;macroBackdrop=null;}if(macroBackdropOld){macroBackdropOld.canvas.width=0;macroBackdropOld=null;}macroEntities=[];entities=[];
 if(resetModifiers&&TEST_MODE){Object.assign(tester,TEST_DEFAULTS);saveTester();}
 player.x=0;player.y=0;player.vx=player.vy=0;player.r=player.targetR=radiusAt(0,0);lastReveal={x:Infinity,y:Infinity,r:-Infinity};
 player.trail=[];camera.x=camera.y=0;camera.zoom=1;particles=[];shockwaves=[];energyArcs=[];texts=[];
 harvestChain=0;harvestChainTime=0;screenFlash=0;morph=null;running=false;abyssTimer=0;abyssPhysical=[];abyssVisual=[];abyssNotice='';$('abyss-warning').hidden=true;clearFlightInput();pulseCd=boostCd=boostTime=0;visitPosition();streamField();save();renderUI(true);testerRefresh();testerToggle(false);
}
function dieInAbyss(h){
 if(pendingDeath)return;
 const safe={id:h.id,name:h.name,x:h.x,y:h.y,r:h.r};
 pendingDeath={hole:safe,mass:fmt(g.total),duration:timeFmt(g.time),coinsCost:Math.max(100,Math.ceil((g.credits||0)*.15)),triedAd:false};
 g.pendingDeath=pendingDeath;
 g.awaySince=0;
 g.losses++;
 showDeathOffer();
}
function showDeathOffer(){
 if(!pendingDeath)return;
 const d=pendingDeath,eligible=!g.reviveUsed,ads=!!window.SpacePlatform?.adsAvailable;
 const offeredAd=eligible&&ads?
  '<button id="revive-ad" type="button" class="revive-ad">'+L('▶ WATCH AD · REVIVE','▶ РЕКЛАМА · ВОЗРОДИТЬСЯ','▶ VER ANUNCIO · REVIVIR')+'</button>':
  eligible?'<p class="ad-note">'+L('Video revival is available on CrazyGames when ads are enabled.','Возрождение за рекламу доступно на CrazyGames при включённой рекламе.','El anuncio para revivir está disponible en CrazyGames cuando hay anuncios.')+'</p>':'';
 show('<div class="revive-screen"><div class="revive-eyebrow">'+
  L('EVENT HORIZON CROSSED','ГОРИЗОНТ СОБЫТИЙ ПЕРЕСЕЧЁН','HORIZONTE CRUZADO')+'</div>'+
  '<h2>'+L('SWALLOWED BY THE VOID','ПОГЛОЩЁН БЕЗДНОЙ','DEVORADO POR EL VACÍO')+'</h2>'+
  '<p>'+L('The black hole pulled you beyond its horizon. Choose how to continue.','Чёрная дыра затянула тебя за горизонт. Выбери, как продолжить.','El agujero negro te absorbió. Elige cómo continuar.')+'</p>'+
  '<div class="revive-stats"><span>'+L('MASS','МАССА','MASA')+' <strong>'+d.mass+'</strong></span><span>'+
  L('FLIGHT TIME','ВРЕМЯ ПОЛЁТА','TIEMPO')+' <strong>'+d.duration+'</strong></span></div>'+
  '<div class="revive-actions">'+offeredAd+
  (eligible?'<button id="revive-coins" type="button" class="revive-coins" '+(g.credits>=d.coinsCost?'':'disabled')+'>'+
   L('REVIVE FOR STARDUST','ВОЗРОДИТЬСЯ ЗА ПЫЛЬ','REVIVIR CON POLVO')+' · ✦ '+fmt(d.coinsCost)+'</button>':'')+
  '<button id="revive-restart" type="button" class="revive-restart">'+
  L('START NEW JOURNEY','НАЧАТЬ ЗАНОВО','NUEVO VIAJE')+'</button></div>'+
  '<small>'+L('One revival per run. Reviving preserves your progress. Starting over preserves stardust and owned music.','Одно возрождение за прохождение. При возрождении прогресс сохраняется. При новой игре остаются звёздная пыль и музыка.','Una reanimación por partida. Revivir conserva el progreso; empezar de nuevo conserva polvo y música.')+'</small>'+
  '<div class="revive-feedback" id="revive-feedback" aria-live="polite"></div></div>');
 $('modal').dataset.screen='death';$('panel-close').onclick=()=>{$('revive-restart').click();};
 $('revive-restart').onclick=async()=>{
  if(awaitingAd)return;
  awaitingAd=true;
  const actions=[...document.querySelectorAll('.revive-actions button')];
  actions.forEach(b=>b.disabled=true);
  // A midgame ad fits the run-ending break; never while actively flying.
  if(!d.triedAd&&window.SpacePlatform?.adsAvailable)await window.SpacePlatform.requestAd('midgame');
  resetCampaignState(false);
  awaitingAd=false;resumeGame();
  toast(L('New journey started · soundtrack and stardust saved','Новое путешествие · музыка и пыль сохранены','Nuevo viaje · música y polvo conservados'));
 };
 const revive=()=>{
  if(!pendingDeath||g.reviveUsed)return;
  const hole=pendingDeath.hole;
  const dx=player.x-hole.x,dy=player.y-hole.y,distance=Math.hypot(dx,dy);
  const angle=distance>.0001?Math.atan2(dy,dx):(g.headingAngle||0);
  const safe=Math.max(hole.r*6.7,hole.r+player.r*8);
  player.x=hole.x+Math.cos(angle)*safe;
  player.y=hole.y+Math.sin(angle)*safe;
  player.vx=Math.cos(angle)*flightSpeed()*.8;
  player.vy=Math.sin(angle)*flightSpeed()*.8;
  player.shield=9;camera.x=player.x;camera.y=player.y;
  g.reviveUsed=true;g.pendingDeath=null;pendingDeath=null;
  abyssTimer=0;refreshAbysses();atlas.dirty=true;
  save();resumeGame();
  toast(L('Revived! Your journey continues.','Возрождение! Путешествие продолжается.','¡Has revivido! El viaje continúa.'));
 };
 const coin=$('revive-coins');if(coin)coin.onclick=()=>{
  if(awaitingAd||g.credits<d.coinsCost)return;
  g.credits-=d.coinsCost;revive();
 };
 const ad=$('revive-ad');
 if(ad)ad.onclick=async()=>{
  if(awaitingAd||!window.SpacePlatform?.adsAvailable)return;
  awaitingAd=true;d.triedAd=true;
  const buttons=[...document.querySelectorAll('.revive-actions button')];buttons.forEach(b=>b.disabled=true);
  $('revive-feedback').textContent=L('Ad request in progress…','Загрузка рекламы…','Cargando anuncio…');
  const completed=await window.SpacePlatform.requestAd('rewarded');
  awaitingAd=false;
  if(completed){revive();return;}
  if(!pendingDeath)return;
  buttons.forEach(b=>b.disabled=b.id==='revive-coins'&&g.credits<d.coinsCost);
  $('revive-feedback').textContent=L('No ad was shown. You can still revive for stardust or start over.','Реклама недоступна. Можно возродиться за пыль или начать заново.','Anuncio no disponible. Puedes revivir con polvo o empezar otra vez.');
  // No adFinished event means no free revival, even if an adblocker was active.
  ad.disabled=true;
 };
}
function restartCampaign(){
 if(!confirm(window.SpaceI18n?.t('Начать новую Вселенную? Текущий прогресс будет сохранён в резервной копии.')||'Начать новую Вселенную? Текущий прогресс будет сохранён в резервной копии.'))return;
 try{localStorage.setItem(SAVE_KEY+'-backup',localStorage.getItem(SAVE_KEY)||'');}catch(_){}
 resetCampaignState(true);running=true;
 $('modal').classList.add('off');toast('Новая Вселенная создана · предыдущий прогресс сохранён');
}

function testerRefresh(){
 const panel=$('tester-panel');if(!panel)return;
 $('tester-tier').value=String(g.tier);
 if(document.activeElement!==$('tester-credits'))$('tester-credits').value=String(Math.round(g.credits));
 const progress=panel.querySelector('[data-test="progress"]');progress.value=String(Math.round(stageFraction()*100));
 $('test-progress-val').textContent=progress.value+'%';
 for(const k of ['speed','gravity','loot','zoom','ring','density']){
  const input=panel.querySelector(`[data-test="${k}"]`),label=panel.querySelector(`[data-test-value="${k}"]`);
  input.value=tester[k];label.textContent=k==='density'?`${tester[k]}/32`:`${tester[k]}×`;
 }
}
function testerToggle(force){
 if(!TEST_MODE)return;
 const panel=$('tester-panel'),open=force===undefined?panel.classList.contains('hidden'):!!force;
 panel.classList.toggle('hidden',!open);
 panel.setAttribute('aria-hidden',String(!open));
 $('btn-tester').setAttribute('aria-pressed',String(open));
 if(open)testerRefresh();
}
function testerSetTier(tier){
 const next=clamp(Math.round(tier),0,TA.length-1),from=g.tier;
 if(next===from)return;
 g.tier=next;g.complete=next===TA.length-1;g.endless=next===TA.length-1;g.matter=0;g.stageCollects=0;g.stageRare=0;g.stagePulses=0;g.stageExplored=0;
 morph={from,time:0,duration:1.5};player.targetR=currentRadius();
 player.r=player.targetR;screenFlash=.5;
 // Test jumps must not finish a previous form's in-flight digestion with the
 // new form's rewards. Restore unconsumed identities to their world layer.
 for(const e of [...entities,...macroEntities,...cosmicAbsorptions])if(e.absorbing||e.gathering)delete g.freeFlights[flightKey(e)];
 cosmicAbsorptions.length=0;absorbingMacroKeys.clear();for(const key of Object.keys(g.freeFlights))absorbingMacroKeys.add(key);
 camera.zoom=g.endless?clamp(tester.zoom*(g.viewZoom||1)*(83+27*Math.log2(1+player.r/100))/Math.max(1,player.r),1e-155,2.5):campaignZoom(player.r);
 testerRemakeNearby();
 burst(player.x,player.y,35,TA[next].color);
 renderUI(true);testerRefresh();
}
function testerRemakeNearby(){
 loadedChunks.clear();entities=[];distantChunkCache.clear();macroLoaded.clear();macroEntities=[];streamField();
}
function testerInit(){
 if(!TEST_MODE){$('btn-tester').hidden=true;return;}
 const tier=$('tester-tier');
 TA.forEach((form,index)=>{const option=document.createElement('option');option.value=String(index);
 option.textContent=`${index+1}. ${form.name}`;tier.append(option);});
 $('btn-tester').onclick=()=>testerToggle();
 $('tester-close').onclick=()=>testerToggle(false);
 tier.onchange=()=>testerSetTier(Number(tier.value));
 $('tester-credits').onchange=ev=>{g.credits=clamp(Number(ev.target.value)||0,0,1e12);renderUI(true);testerRefresh();};
 document.querySelectorAll('#tester-panel [data-test]').forEach(input=>{
  input.oninput=()=>{
   const key=input.dataset.test,value=Number(input.value);
   if(!Number.isFinite(value))return;
   if(key==='progress'){g.matter=Math.round(TA[g.tier].required*value/100);
    player.targetR=currentRadius();
    $('test-progress-val').textContent=value+'%';}
   else if(Object.hasOwn(TEST_DEFAULTS,key)){
    const previous=tester[key];tester[key]=key==='density'?Math.round(value):value;
    panelValue(key,tester[key]);
    if(key==='density'&&previous!==tester[key])testerRemakeNearby();
    saveTester();
   }
   renderUI();save();
  };
 });
 $('tester-missions').onclick=()=>{const m=missionReq();
  g.stageCollects=Math.max(g.stageCollects,m.collect);g.stageRare=Math.max(g.stageRare,m.rare);
  g.stageExplored=Math.max(g.stageExplored,m.explore);for(const r of stageRecipe())g.materials[r.type]=Math.max(g.materials[r.type]||0,r.amount);renderUI(true);toast('Рецепт и задачи выполнены');};
 $('tester-next').onclick=()=>testerSetTier(g.tier+1);
 $('tester-jump').onclick=()=>{player.x+=CHUNK*10;player.vx=player.vy=0;camera.x=player.x;camera.y=player.y;
  visitPosition();testerRemakeNearby();renderUI(true);toast('Перемещение на 10 св. лет (тест)');};
 $('tester-abyss').onclick=testerVisitAbyss;
 $('tester-reset-mods').onclick=()=>{
  Object.assign(tester,TEST_DEFAULTS);saveTester();testerRemakeNearby();testerRefresh();
  toast('Тестовые множители сброшены');};
 $('tester-new-game').onclick=restartCampaign;
 $('tester-copy-save').onclick=()=>{
  if(!confirm(window.SpaceI18n?.t('Скопировать основное прохождение в тестерское? Текущий тестовый прогресс будет заменён.')||'Скопировать основное прохождение в тестерское? Текущий тестовый прогресс будет заменён.'))return;
  try{const data=localStorage.getItem('cosmic-evolution-save-v1');if(!data){toast('Основное сохранение не найдено');return;}localStorage.setItem(SAVE_KEY,data);location.reload();}
  catch(_){toast('Не удалось скопировать сохранение');}
 };
 $('camera-minus').onclick=()=>{g.viewZoom=clamp(g.viewZoom/1.25,.05,10);save();};$('camera-plus').onclick=()=>{g.viewZoom=clamp(g.viewZoom*1.25,.05,10);save();};
$('btn-new-game').onclick=restartCampaign;
}
function panelValue(key,v){
 const label=document.querySelector(`#tester-panel [data-test-value="${key}"]`);
 if(label)label.textContent=key==='density'?`${v}/32`:`${v}×`;
}
testerInit();
$('camera-minus').onclick=()=>{g.viewZoom=clamp(g.viewZoom/1.25,.05,10);save();};$('camera-plus').onclick=()=>{g.viewZoom=clamp(g.viewZoom*1.25,.05,10);save();};
$('btn-new-game').onclick=restartCampaign;
function showFinal(){show(`<div class="hero-kicker">28 / 28 ФОРМ ОТКРЫТО</div><div class="overlay-title">БЕСКОНЕЧНАЯ ЧЁРНАЯ ДЫРА</div><p class="overlay-copy">От одинокой частицы до бесконечного космоса. Теперь горизонт событий растёт бесконечно.</p><div class="stat-list"><div><strong>${timeFmt(g.time)}</strong><small>Время прохождения</small></div><div><strong>${fmt(g.total)}</strong><small>Поглощено материи</small></div><div><strong>${fmt(g.collects)}</strong><small>Космических объектов</small></div><div><strong>${g.rare}</strong><small>Найдено реликвий</small></div></div><p class="overlay-copy">Поглощай материю и продолжай увеличиваться без предела!</p><div class="modal-actions"><button class="primary-button" id="btn-endless">ИССЛЕДОВАТЬ ДАЛЬШЕ →</button><button class="secondary-button" id="btn-new-universe">НОВАЯ ИГРА</button></div>`);$('btn-endless').onclick=()=>{g.complete=true;g.endless=true;running=true;save();startMusic();$('modal').classList.add('off');last=performance.now();toast('∞ БЕСКОНЕЧНОЕ ИССЛЕДОВАНИЕ');};$('btn-new-universe').onclick=restartCampaign;}
$('btn-menu').onclick=()=>toggleOverlay('menu',showMainMenu);
$('btn-evolution').onclick=openEvolution;$('btn-stage-details').onclick=openEvolution;$('btn-evolution-close').onclick=()=>{$('evolution-panel').classList.add('hidden');};
mobileControls=window.SpaceMobileControls?.create({pad:$('flight-stick'),thumb:$('stick-thumb'),canvas,isRunning:()=>running,getMode:()=>g.mobileMode,getSensitivity:()=>g.mobileSensitivity,onStatus:()=>document.dispatchEvent(new Event('space-mobile-status')),onPinch:ratio=>{g.viewZoom=clamp((g.viewZoom||1)*ratio,.05,10);},onPinchEnd:()=>save(),onFallback:()=>{g.mobileMode='fixed';mobileControls.configure();save();toast(L('Tilt unavailable: joystick enabled','Наклон недоступен: включён стик','Inclinación no disponible: joystick activado'));}});
mobileControls?.configure();
syncHeadingControl();
// v15.3 production adapter. Templates supply layout only; all state and actions
// come from this game's existing save, physics and economic functions.
if(window.SpaceUIv15Templates && document.createElement('template').content){
 const tpl=window.SpaceUIv15Templates, icons=window.SpaceUIv15Icons, visual=window.SpaceUIv15Behavior;
 const label=(root,selector,value)=>{const e=q(root,selector);if(!e)return;const n=[...e.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(n)n.textContent=' '+value+' ';};
 const icon=n=>`<svg class="ui-symbol" viewBox="0 0 32 32" fill="none" aria-hidden="true">${icons[n]||icons.star}</svg>`;
 const q=(root,s)=>root.querySelector(s),qa=(root,s)=>[...root.querySelectorAll(s)];
 const text=(root,s,value)=>{const e=q(root,s);if(e)e.textContent=value;};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const legacy={menu:showMainMenu,settings:showSettings,achievements:showAchievements,bestiary:showBestiary,statistics:showStatistics,music:showMusicShop,map:showMap,tutorial:showTutorial};
 // Keep a screen history rather than hard-coding "Back" to the main menu.
 // The history records where a page was opened, including in-game shortcuts.
 const navigationStack=[];
 let restoringScreen=false;
 function currentScreen(){return $('modal').classList.contains('off')?'play':$('modal').dataset.screen||'menu';}
 function enterScreen(name){
  if(restoringScreen)return;
  if(name==='menu'){navigationStack.length=0;return;}
  const previous=currentScreen();
  if(previous!==name)navigationStack.push(previous==='panel'?'menu':previous);
 }
 function navigate(name){
  if(name==='upgrades'){resumeGame();const toggle=q(hud,'#upgrades-open');if(toggle&&!toggle.getAttribute('aria-expanded')?.includes('true'))toggle.click();return;}
  ({menu:showMainMenu,play:resumeGame,map:showMap,settings:showSettings,evolution:showV15Evolution,achievements:showAchievements,bestiary:showBestiary,statistics:showStatistics,music:showMusicShop,tutorial:showTutorial}[name]||resumeGame)();
 }
 function navigateBack(){
  const destination=navigationStack.pop()||'menu';
  restoringScreen=true;
  try{navigate(destination);}finally{restoringScreen=false;}
 }
 navigateOverlayBack=navigateBack;
 function translate(root){
  const lang=window.SpaceI18n?.language||'en';if(lang==='ru')return;
  const dictionary=window.SpaceUIv15Dictionary||{};const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){const key=node.nodeValue.trim(),entry=dictionary[key];if(entry)node.nodeValue=node.nodeValue.replace(key,entry[lang==='es'?1:0]);}
  qa(root,'[aria-label],[title]').forEach(e=>['aria-label','title'].forEach(a=>{const v=e.getAttribute(a),entry=dictionary[v];if(entry)e.setAttribute(a,entry[lang==='es'?1:0]);}));
  window.SpaceI18n?.refresh();
 }
 function decorate(root){
  qa(root,'[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));
  qa(root,'[data-page]').forEach(b=>b.onclick=()=>(
   b.matches('.back,.br-head-back,.br-foot-secondary')?navigateBack():navigate(b.dataset.page)
  ));
  qa(root,'input[type=range]').forEach(input=>{const sync=()=>{const value=+input.value,min=+input.min||0,max=+input.max||100;input.style.setProperty('--val',`${(value-min)/(max-min)*100}%`);const out=input.parentElement.querySelector('output');if(out)out.textContent=Math.round(value)+'%';};input.addEventListener('input',sync);sync();});
  translate(root);
 }
 function mount(name){
  stopMusicPreview();visual?.cleanupSelects();const old=$('modal').firstElementChild,holder=document.createElement('template');holder.innerHTML=tpl[name];const root=holder.content.firstElementChild;root.classList.add('active');
  $('modal').replaceChildren(root);$('modal').dataset.screen=name;
  qa(root,'.br-settings-side-note,.br-readout-foot,.sub-footer,.br-head-tag,.micro').forEach(e=>{if(/ДЕМО|DEMO|PREVIEW|ПРОТОТИП|СОХРАНЕНИЕ 01/.test(e.textContent))e.textContent='INFINITI SPACE · v3.45.0';});
  decorate(root);return {root,old};
 }
 showMainMenu=function(paused=false){enterScreen('menu');legacy.menu(paused);const {root}=mount('menu');
  q(root,'.primary.big-play').onclick=()=>g.tutorialDone?resumeGame():showTutorial();q(root,'.quiet-btn').onclick=restartCampaign;
  const dailyBtn=document.createElement('button');dailyBtn.type='button';dailyBtn.className='daily-menu-link';
  const dailyReady=window.SpaceMeta?.canClaim(g),rouletteReady=window.SpaceMeta?.canSpin(g);
  dailyBtn.innerHTML='<span class="daily-link-icon">✦</span><span class="daily-link-copy"><strong>'+
   L('DAILY REWARDS & ROULETTE','ЕЖЕДНЕВНЫЕ НАГРАДЫ И РУЛЕТКА','REGALOS Y RULETA')+'</strong><small>'+
   (dailyReady?L('Your gift is ready · 1 free spin','Подарок доступен · 1 бесплатная попытка','Regalo disponible · 1 giro gratis'):
    rouletteReady?L('Your roulette spin is ready','Рулетка готова к запуску','Tu giro está disponible'):
    L('Come back tomorrow for a new gift','Завтра будет новый подарок','Vuelve mañana por otro regalo'))+
   '</small></span><span class="daily-link-status">'+
   (dailyReady||rouletteReady?L('READY','ГОТОВО','LISTO'):'↗')+'</span>';
  dailyBtn.onclick=()=>showDailyRewards('menu');
  const menuGrid=q(root,'.menu-grid');menuGrid.prepend(dailyBtn);
  // Use the exact same playlist glyph as the in-game music collection button.
  const collectionIcon=q(menuGrid,'[data-page="music"] > span:first-child');
  if(collectionIcon){collectionIcon.removeAttribute('data-icon');collectionIcon.innerHTML=uiIcon('playlist');}
  if(window.SpaceMeta?.canClaim(g))dailyBtn.classList.add('daily-new');
  q(root,'.quiet-btn').removeAttribute('aria-label');
  label(root,'.quiet-btn',L('NEW UNIVERSE','НОВАЯ ВСЕЛЕННАЯ','NUEVO UNIVERSO'));
  label(root,'.primary.big-play',paused||g.time>0?L('CONTINUE','ПРОДОЛЖИТЬ','CONTINUAR'):L('BEGIN EVOLUTION','НАЧАТЬ ЭВОЛЮЦИЮ','COMENZAR EVOLUCIÓN'));
  text(root,'.menu-foot .caption-tag',L('YOUR JOURNEY','ТВОЙ ПУТЬ','TU VIAJE'));text(root,'.menu-foot>span:nth-child(2)',TA[g.tier].epoch);q(root,'.menuprog>div').style.width=stageFraction()*100+'%';text(root,'.menu-foot .mint',Math.round(stageFraction()*100)+'%');text(root,'.menu-foot>span:last-child',`${timeFmt(g.time)} · v3.45.0`);
  const lang=q(root,'#language-control'),popup=q(lang,'#language-popup'),toggle=q(lang,'#lang-toggle');
  const selected=q(lang,`[data-lang="${window.SpaceI18n?.language||'en'}"]`);q(lang,'#current-language-flag').innerHTML=q(selected,'.flag-window').innerHTML;text(lang,'#current-language-code',selected.dataset.lang.toUpperCase());
  toggle.onclick=()=>{popup.hidden=!popup.hidden;toggle.setAttribute('aria-expanded',String(!popup.hidden));};
  root.addEventListener('pointerdown',e=>{if(!lang.contains(e.target)){popup.hidden=true;toggle.setAttribute('aria-expanded','false');}});
  lang.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();popup.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}};
  qa(lang,'[data-lang]').forEach(b=>{b.setAttribute('aria-selected',String(b===selected));b.onclick=()=>{window.SpaceI18n.setLanguage(b.dataset.lang);hud.remove();hud=buildHud();showMainMenu(paused);};});
  const sound=q(root,'[data-toggle="sound"]');
   if(sound){
    const sync=()=>{const on=g.music||g.sound;sound.setAttribute('aria-pressed',String(on));sound.setAttribute('aria-label',on?L('Mute all audio','Выключить весь звук','Silenciar todo'):L('Enable all audio','Включить весь звук','Activar audio'));sound.innerHTML=uiIcon(on?'music':'mute');};
    sync();
    sound.onclick=()=>{const on=!(g.music||g.sound);g.music=on;g.sound=on;initAudio();setMusicVolume();save();sync();refreshV15();};
   }
 };
 function phoneModeLabel(mode){return ({fixed:L('Fixed joystick','Фиксированный стик','Joystick fijo'),floating:L('Floating joystick','Плавающий стик','Joystick flotante'),gyro:L('Gyroscope','Гироскоп','Giroscopio'),direction:L('Cruise arrow','Стрелка направления','Flecha de rumbo')})[mode];}
 // Compact animated diagrams show what each steering option really does.
 function controlMini(mode){
  return '<span class="control-mini" data-preview-mode="'+mode+'" aria-hidden="true"><i class="control-mini-orbit"></i><i class="control-mini-path"></i><i class="control-mini-ship"></i><i class="control-mini-arrow"></i><i class="control-mini-touch"></i></span>';
 }
 function phoneStatus(){return ({off:L('Tap Enable, then hold your phone comfortably.','Нажми «Включить» и держи телефон в удобном положении.','Pulsa Activar y sujeta el teléfono cómodamente.'),permission:L('Waiting for sensor permission…','Ожидается разрешение на датчики…','Esperando permiso de sensores…'),calibrating:L('Hold still for calibration…','Держи телефон неподвижно для калибровки…','Mantén el teléfono quieto para calibrar…'),ready:L('Ready. Tilt gently to fly; return to neutral to stop steering.','Готово. Наклоняй телефон для полёта; верни в исходное положение, чтобы перестать разгоняться.','Listo. Inclina suavemente para volar y vuelve al centro para dejar de acelerar.'),denied:L('Sensor permission denied. Joystick restored.','Доступ к датчикам не разрешён. Включён обычный стик.','Permiso denegado. Joystick restaurado.'),unavailable:L('No sensor data. Joystick restored.','Данные датчиков недоступны. Включён обычный стик.','No hay datos de sensores. Joystick restaurado.')})[mobileControls?.status||'off'];}
 function refreshPhoneSettings(){
  syncHeadingControl();
  const root=$('modal');qa(root,'[data-phone-mode]').forEach(b=>{const on=b.dataset.phoneMode===g.mobileMode;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));});
  const panel=q(root,'.phone-gyro-settings');if(panel)panel.hidden=g.mobileMode!=='gyro';text(root,'.phone-sensor-status',phoneStatus());
  const enable=q(root,'#phone-gyro-enable');if(enable){enable.disabled=mobileControls?.status==='permission';enable.textContent=mobileControls?.enabled?L('Calibrate','Калибровать','Calibrar'):L('Enable gyroscope','Включить гироскоп','Activar giroscopio');}
  const quick=document.querySelector('.phone-gyro-quick');if(quick){quick.hidden=!mobileControls?.isPhone()||g.mobileMode!=='gyro';quick.textContent=mobileControls?.enabled?L('⊕ Recenter','⊕ Калибровка','⊕ Centrar'):L('⊕ Enable tilt','⊕ Включить наклон','⊕ Activar inclinación');}
 }
 function decoratePhoneSettings(root){
  if(!mobileControls?.isPhone())return;
  const pane=q(root,'[data-settings-pane=control]');q(pane,'#set-control-mode').closest('.br-option').hidden=true;q(pane,'.br-controls').hidden=true;
  text(root,'[data-settings-tab=control] small',L('TOUCH · TILT','КАСАНИЯ · НАКЛОН','TÁCTIL · INCLINACIÓN'));
  text(pane,'.br-pane-title p',L('Phone controls are saved separately from desktop controls.','Управление телефоном настраивается отдельно от компьютера.','Los controles del móvil se guardan por separado.'));
  const section=document.createElement('section');section.className='phone-mode-settings';section.innerHTML=`<h4>${L('PHONE FLIGHT','ПОЛЁТ НА ТЕЛЕФОНЕ','VUELO EN MÓVIL')}</h4><div class="phone-mode-grid">${['fixed','floating','gyro','direction'].map((mode,i)=>`<button type="button" data-phone-mode="${mode}"><span>${icon(['compass','orbit','star','arrow-right'][i])}</span><strong>${phoneModeLabel(mode)}</strong><small>${[L('Steer with the lower-right stick.','Стик внизу справа.','Joystick abajo a la derecha.'),L('Touch empty space and drag to steer.','Коснись свободного места и веди пальцем.','Toca el espacio libre y arrastra.'),L('Tilt your phone to steer.','Управляй наклоном телефона.','Inclina el teléfono para dirigir.'),L('Set the arrow once; keep flying until you turn it.','Поверни стрелку — полёт продолжается, пока не сменишь направление.','Gira la flecha: seguirás volando hasta cambiar el rumbo.')][i]}</small>${controlMini(mode)}</button>`).join('')}</div><div class="phone-gyro-settings"><label for="phone-gyro-sensitivity">${L('Tilt sensitivity','Чувствительность наклона','Sensibilidad')} <span id="phone-sensitivity-value"></span></label><input id="phone-gyro-sensitivity" type="range" min="50" max="200" step="5" value="${Math.round(g.mobileSensitivity*100)}"><button id="phone-gyro-enable" type="button"></button><p class="phone-sensor-status" role="status" aria-live="polite"></p></div>`;
  pane.querySelector('.br-pane-title').after(section);
  const gestureTip=document.createElement('p');gestureTip.className='phone-gesture-tip';
  gestureTip.textContent=L('Pinch two fingers on empty space to zoom the camera. This works with every steering mode.','Своди или разводи два пальца на свободном месте для масштабирования камеры. Работает при любом управлении.','Junta o separa dos dedos en el espacio libre para acercar o alejar la cámara. Funciona con todos los modos.');
  section.querySelector('.phone-mode-grid').after(gestureTip);
  qa(section,'[data-phone-mode]').forEach(b=>b.onclick=()=>{g.mobileMode=b.dataset.phoneMode;clearFlightInput();mobileControls.configure();save();refreshPhoneSettings();});
  const sensitivity=q(section,'#phone-gyro-sensitivity'),sync=()=>{g.mobileSensitivity=+sensitivity.value/100;text(section,'#phone-sensitivity-value',g.mobileSensitivity.toFixed(2)+'×');sensitivity.style.setProperty('--val',((+sensitivity.value-50)/150*100)+'%');save();};sensitivity.oninput=sync;sync();
  q(section,'#phone-gyro-enable').onclick=()=>{if(mobileControls.enabled)mobileControls.calibrate();else mobileControls.enable();refreshPhoneSettings();};refreshPhoneSettings();
 }
 document.addEventListener('space-mobile-status',refreshPhoneSettings);

 showSettings=function(){enterScreen('settings');legacy.settings();const {root,old}=mount('settings');
  const move=(target,id)=>{const n=q(old,'#'+id);q(root,target).replaceWith(n);return n;};
  const controlSelect=move('[data-settings-pane="control"] select:nth-of-type(1)','set-control-mode');
  const cruiseOption=document.createElement('option');cruiseOption.value='direction';cruiseOption.textContent=L('Cruise arrow · continuous flight','Стрелка · постоянный полёт','Flecha · vuelo continuo');
  controlSelect.append(cruiseOption);controlSelect.value=g.controlMode;
  const controlPreview=document.createElement('div');controlPreview.className='control-selection-preview';controlPreview.setAttribute('aria-live','polite');
  controlSelect.closest('.br-option').append(controlPreview);
  const controlDescriptions={
   hold:L('Hold the mouse button to steer. Release to slow down.','Удерживай кнопку мыши для полёта, отпусти — остановишься.','Mantén pulsado el ratón para avanzar, suelta para parar.'),
   follow:L('The object follows the cursor smoothly.','Объект плавно следует за курсором.','El objeto sigue suavemente al cursor.'),
   keys:L('Use WASD or the arrow keys in any keyboard layout.','WASD и стрелки работают при любой раскладке.','Usa WASD o las flechas con cualquier idioma.'),
   direction:L('Turn the arrow or click the game field. Flight never stops until you change direction.','Поверни стрелку или щёлкни по полю. Полёт продолжается без удержания.','Gira la flecha o pulsa el campo. Vuelas sin mantener el botón.')
  };
  const previewControl=()=>{const mode=controlSelect.value;controlPreview.innerHTML=controlMini(mode)+'<div class="control-selection-desc"><strong>'+L('CONTROL PREVIEW','ПРЕДПРОСМОТР УПРАВЛЕНИЯ','VISTA PREVIA')+'</strong><small>'+controlDescriptions[mode]+'</small></div>';syncHeadingControl();};
  controlSelect.addEventListener('change',previewControl);previewControl();
  const controls=qa(root,'[data-settings-pane="control"] .br-option select');const feel=q(old,'#set-flight-feel');controls[1].replaceWith(feel);
  move('#br-quality','set-quality');
  const ranges=qa(root,'.br-slider input');['set-music-volume','set-sound-volume'].forEach((id,i)=>ranges[i].replaceWith(q(old,'#'+id)));
  qa(root,'.br-switch').forEach((button,i)=>{const input=q(old,'#'+['set-music','set-sound','set-particles','set-auto-quality'][i]);button.classList.toggle('active',input.checked);button.setAttribute('aria-checked',String(input.checked));input.hidden=true;button.after(input);button.onclick=()=>{input.checked=!input.checked;input.dispatchEvent(new Event('change',{bubbles:true}));button.classList.toggle('active',input.checked);button.setAttribute('aria-checked',String(input.checked));};});
  qa(root,'[data-settings-tab]').forEach(b=>b.onclick=()=>{qa(root,'[data-settings-tab]').forEach(n=>n.classList.toggle('active',n===b));qa(root,'[data-settings-pane]').forEach(n=>n.classList.toggle('active',n.dataset.settingsPane===b.dataset.settingsTab));});
  q(root,'#br-new-game').onclick=restartCampaign;
  q(root,'[data-settings-pane="graphics"] .br-warning').remove();
  text(root,'.br-controls>div:nth-child(5) kbd','ESC');
  qa(root,'[data-settings-pane="general"] .br-warning,.br-settings-side-note').forEach(n=>n.remove());
  text(root,'.br-readout-foot','INFINITI SPACE · v3.45.0');text(root,'.br-settings-foot>span',L('SETTINGS SAVED AUTOMATICALLY','НАСТРОЙКИ СОХРАНЯЮТСЯ АВТОМАТИЧЕСКИ','AJUSTES GUARDADOS AUTOMÁTICAMENTE'));
  q(root,'#set-sound-volume').setAttribute('aria-label',L('Effects volume','Громкость эффектов','Volumen de efectos'));decorate(root);visual?.enhanceSelects(root);decoratePhoneSettings(root);
 };
 function showV15Upgrades(){enterScreen('upgrades');show('');const {root}=mount('upgrades');const render=()=>{
  text(root,'#up-balance',fmt(g.credits));text(root,'.currency small',L('STARDUST','ЗВЁЗДНАЯ ПЫЛЬ','POLVO ESTELAR'));
  qa(root,'.up-row').forEach((row,i)=>{const u=upgrades[i],quote=upgradeQuote(u);text(row,'.up-desc strong',u.name);text(row,'.up-desc small',u.label);text(row,'.up-level',`${g.upgrade[u.id]} / ∞`);text(row,'.up-bonus',L('EFFECTIVE POWER','ЭФФЕКТИВНАЯ СИЛА','POTENCIA EFECTIVA')+' · '+upgradePower(u.id).toFixed(2));const b=q(row,'.purchase');b.textContent=L('BUY','КУПИТЬ','COMPRAR')+` ×${quote.count} · ✦ ${Number.isFinite(quote.cost)?fmt(quote.cost):'∞'}`;b.classList.toggle('insufficient',!quote.count||quote.cost>g.credits);b.disabled=!quote.count||!Number.isFinite(quote.cost)||quote.cost>g.credits;b.onclick=()=>{buy(u.id);render();};});
  qa(root,'[data-quantity]').forEach(b=>{b.classList.toggle('active',String(g.buyAmount)===b.dataset.quantity);b.onclick=()=>{setBuyAmount(b.dataset.quantity);render();};});const input=q(root,'#up-custom-qty');if(document.activeElement!==input)input.value=g.buyAmount==='max'?'':g.buyAmount;input.oninput=()=>{if(input.value&&setBuyAmount(input.value)!==false)render();};translate(root);
 };render();}
 showAchievements=function(){enterScreen('achievements');legacy.achievements();const {root}=mount('achievements');const list=q(root,'.br-ach-list');
  list.innerHTML=ACHIEVEMENTS.map(a=>{const [rarity,color]=RARITIES[a[1]],done=!!g.achievements?.[a[0]],progress=done?100:achievementProgress(a);return `<div class="br-ach-row" data-rarity="${rarity}" style="--rarity:${color}"><div class="br-ach-symbol ${rarity}">${icon(({common:'check',uncommon:'star',rare:'compass',epic:'orbit',legendary:'trophy',mythic:'star'})[rarity])}</div><div class="br-ach-copy"><span class="br-ach-rarity ${rarity}">${L(...RARITIES[a[1]][2])}</span><strong>${esc(L(...a[2]))}</strong><small>${fmt(achievementValue(a[3]))} / ${fmt(a[4])} ${goalLabel(a[3])}</small><div class="br-ach-prog" role="progressbar" aria-label="${esc(L(...a[2]))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div></div><b>${progress===100?'100':progress>0&&progress<.01?'&lt;0.01':progress.toFixed(1)}%</b></div>`;}).join('');
  const earned=Object.keys(g.achievements||{}).length;q(root,'.br-ach-big').innerHTML=`${earned}<span>/${ACHIEVEMENTS.length}</span>`;text(root,'.br-ach-summary p',L('Your discoveries and milestones','Твои открытия и достижения','Tus descubrimientos y logros'));
  qa(root,'.br-filter').forEach(b=>b.onclick=()=>{qa(root,'.br-filter').forEach(n=>n.classList.toggle('active',n===b));qa(list,'.br-ach-row').forEach(n=>n.hidden=b.dataset.achFilter!=='all'&&n.dataset.rarity!==b.dataset.achFilter);});
 };
 showBestiary=function(){
  enterScreen('bestiary');legacy.bestiary();
  const {root}=mount('bestiary'),list=q(root,'.br-best-list');
  const header=q(root,'.br-head .br-serial');
  if(header)header.textContent=L('FIELD GUIDE / ','ПОЛЕВОЙ СПРАВОЧНИК / ','GUÍA / ')+FIELD_GUIDE.length+' '+L('ENTRIES','ЗАПИСЕЙ','ENTRADAS');
  // Replace the seven original template rows; otherwise they remain as dead controls.
  list.replaceChildren();
  const buttons=[];
  FIELD_GUIDE.forEach(([id,t,title,desc,formTier],i)=>{
   const b=document.createElement('button');
   b.type='button';b.className='br-best-row';b.dataset.bestiary=String(i);
   const category=Number.isInteger(formTier)?TA[formTier].type:id;
   const orb=document.createElement('span');
   orb.className='br-best-bubble '+({planet:'rock',blackhole:'hole',nebula:'galaxy',cluster:'galaxy',web:'galaxy'}[category]||category);
   orb.style.setProperty('--orb-color',TA[Math.min(27,t)]?.color||'#aa89ff');
   const label=document.createElement('span');label.textContent=String(i+1).padStart(2,'0')+' / '+L(...title);
   const state=document.createElement('b');state.textContent=g.tier>=t?L('REACHED','ОТКРЫТО','ALCANZADO'):L('AHEAD','ВПЕРЕДИ','POR DESCUBRIR');
   b.append(orb,label,state);list.append(b);buttons.push(b);
  });
  const original=q(root,'#br-best-visual'),portrait=document.createElement('canvas');
  portrait.id='br-best-visual';portrait.className='br-best-portrait';
  portrait.dataset.size='144';portrait.setAttribute('role','img');
  original.replaceWith(portrait);
  const details=q(root,'.br-best-details');
  q(root,'.br-best-details>small')?.remove();
  const facts=document.createElement('div');facts.className='br-best-facts';details.append(facts);
  const select=i=>{
   const [id,t,title,desc,formTier]=FIELD_GUIDE[i],isForm=Number.isInteger(formTier);
   buttons.forEach((b,j)=>{b.classList.toggle('selected',i===j);b.setAttribute('aria-pressed',String(i===j));});
   text(root,'#br-best-number',String(i+1).padStart(2,'0'));
   text(root,'#br-best-name',L(...title));text(root,'#br-best-desc',L(...desc));
   text(root,'#br-best-status',g.tier>=t?L('REACHED','ДОСТИГНУТО','ALCANZADO'):L('AHEAD','ВПЕРЕДИ','POR DESCUBRIR'));
   const previewTier=isForm?formTier:id==='rock'?4:id==='planet'?10:id==='ice'?8:id==='galaxy'?23:id==='blackhole'?27:t;
   paintStagePortrait(portrait,Math.min(27,previewTier));
   portrait.setAttribute('aria-label',L(...title));
   facts.replaceChildren();
   const texts=isForm?[
    L('ERA','ЭПОХА','ERA')+': '+TA[t].epoch,
    L('STAGE','СТАДИЯ','ETAPA')+': '+(t+1)+' / '+TA.length,
    L('RECIPE','РЕЦЕПТ','RECETA')+': '+stageRecipe(t).map(r=>MATERIALS[r.type].label).join(' · ')
   ]:[
    L('FIRST ENCOUNTER','ПЕРВОЕ ЗНАКОМСТВО','PRIMER ENCUENTRO')+': '+(t+1)+' / '+TA.length,
    L('COSMIC FIELD GUIDE','КОСМИЧЕСКИЙ СПРАВОЧНИК','GUÍA CÓSMICA')
   ];
   texts.forEach(str=>{const item=document.createElement('span');item.textContent=str;facts.append(item);});
  };
  buttons.forEach((b,i)=>b.onclick=()=>select(i));
  const initial=7+g.tier;select(initial<FIELD_GUIDE.length?initial:0);
  list.scrollTop=Math.max(0,buttons[initial]?.offsetTop-list.offsetTop-110||0);
 };
 showStatistics=function(){enterScreen('statistics');legacy.statistics();const {root,old}=mount('statistics');const grid=q(root,'.br-stat-grid');grid.replaceChildren(...qa(old,'.stat-list>div'));text(root,'.br-simple-intro>span',`${g.tier+1} / 28 · ${TA[g.tier].name}`);text(root,'.br-simple-intro p',L('Your current journey','Твоё текущее прохождение','Tu viaje actual'));};
 function showV15Evolution(){
  enterScreen('evolution');renderUI(true);show('');
  const {root}=mount('evolution'),tier=g.tier,stage=TA[tier],next=TA[tier+1];
  const content=q(root,'.evolution-content');content.replaceChildren();content.classList.add('evo-v2');
  text(root,'.page-nav .muted-caps',L('EVOLUTION / ','ЭВОЛЮЦИЯ / ','EVOLUCIÓN / ')+stage.epoch);
  // A simple answer to the three questions: What am I? What is next? What is missing?
  const summary=document.createElement('section');summary.className='evo-v2-summary';
  const current=document.createElement('article');current.className='evo-v2-current';
  current.innerHTML='<div class="evo-v2-kicker">'+L('CURRENT FORM','ТЕКУЩАЯ ФОРМА','FORMA ACTUAL')+' · '+String(tier+1).padStart(2,'0')+' / 28</div>'+
   '<div class="evo-v2-current-row"><canvas class="evo-v2-current-portrait" data-size="134" aria-label="'+esc(stage.name)+'"></canvas><div class="evo-v2-current-copy"><small>'+esc(stage.epoch)+'</small><h2>'+esc(stage.name)+'</h2><p>'+esc(stage.desc)+'</p></div></div>'+
   '<div class="evo-v2-mass-head"><span>'+L('MASS GATHERED','СОБРАНО МАТЕРИИ','MATERIA RECOGIDA')+'</span><b></b></div><div class="evo-v2-meter" role="progressbar"><i></i></div>'+
   '<div class="evo-v2-next"><span>'+L('NEXT FORM','СЛЕДУЮЩАЯ ФОРМА','SIGUIENTE FORMA')+'</span><canvas class="evo-v2-next-portrait" data-size="64"></canvas><strong></strong></div>';
  paintStagePortrait(q(current,'.evo-v2-current-portrait'),tier);
  const massGoal=q(current,'.evo-v2-mass-head b');
  const massPercent=g.endless?100:Math.round(stageFraction()*100);
  massGoal.textContent=g.endless?L('ENDLESS','БЕСКОНЕЧНО','INFINITO'):fmt(Math.min(g.matter,stage.required))+' / '+fmt(stage.required)+' · '+massPercent+'%';
  q(current,'.evo-v2-meter').setAttribute('aria-valuenow',String(massPercent));
  q(current,'.evo-v2-meter').setAttribute('aria-valuemin','0');
  q(current,'.evo-v2-meter').setAttribute('aria-valuemax','100');
  q(current,'.evo-v2-meter i').style.width=massPercent+'%';
  text(current,'.evo-v2-next strong',next?next.name:L('INFINITE BLACK HOLE','БЕСКОНЕЧНАЯ ЧЁРНАЯ ДЫРА','AGUJERO NEGRO INFINITO'));
  paintStagePortrait(q(current,'.evo-v2-next-portrait'),Math.min(tier+1,TA.length-1));
  const goals=document.createElement('article');goals.className='evo-v2-goals';
  const goalHeading=document.createElement('div');goalHeading.className='evo-v2-goals-header';
  goalHeading.innerHTML='<h3>'+L('WHAT IS LEFT TO DO?','ЧТО НУЖНО ДЛЯ ЭВОЛЮЦИИ?','¿QUÉ FALTA PARA EVOLUCIONAR?')+'</h3>'+
   '<p>'+L('Finish the goals below. Evolution happens immediately — no countdowns.','Выполни условия ниже, и форма изменится сразу. Никаких таймеров.','Completa estos objetivos. Evolucionas al instante, sin temporizador.')+'</p>';
  goals.append(goalHeading);
  const goalList=document.createElement('div');goalList.className='evo-v2-goal-list';goals.append(goalList);
  function addGoal(label,currentValue,requiredValue){
   const complete=currentValue>=requiredValue;
   const row=document.createElement('div');row.className='evo-v2-goal'+(complete?' done':'');
   const mark=document.createElement('span');mark.className='evo-v2-goal-mark';mark.textContent=complete?'✓':'○';
   const title=document.createElement('span');title.className='evo-v2-goal-title';title.textContent=label;
   const count=document.createElement('b');count.textContent=fmt(Math.min(currentValue,requiredValue))+' / '+fmt(requiredValue);
   row.append(mark,title,count);goalList.append(row);
  }
  if(g.endless){
   const note=document.createElement('p');note.className='evo-v2-endless';note.textContent=L(
    'You reached the final stage. Continue collecting real celestial bodies; your black hole grows without a limit.',
    'Ты достиг последней формы. Поглощай реальные объекты — чёрная дыра может расти бесконечно.',
    'Llegaste a la forma final. Sigue absorbiendo cuerpos reales para crecer sin límites.');
   goalList.append(note);
  }else{
   const objectives=missionReq();
   addGoal(L('Matter','Материя','Materia'),g.matter,stage.required);
   addGoal(L('Collected this stage','Собрано за стадию','Recogido en esta etapa'),g.stageCollects,objectives.collect);
   addGoal(L('Explored areas','Исследованные области','Zonas exploradas'),g.stageExplored,objectives.explore);
   for(const requirement of stageRecipe()){
    addGoal(L('Resource: ','Ресурс: ','Recurso: ')+(window.SpaceI18n?.t(MATERIALS[requirement.type].label)||MATERIALS[requirement.type].label),
     g.materials[requirement.type]||0,requirement.amount);
   }
  }
  summary.append(current,goals);content.append(summary);
  // Clear pathway browser: one consistent 28-stage grid with an inspect panel.
  const gallery=document.createElement('section');gallery.className='evo-v2-gallery';
  const top=document.createElement('div');top.className='evo-v2-gallery-head';
  top.innerHTML='<div><small>'+L('THE FULL JOURNEY','ПОЛНЫЙ ПУТЬ','EL VIAJE COMPLETO')+'</small><h3>'+L('ALL 28 EVOLUTION FORMS','ВСЕ 28 СТАДИЙ ЭВОЛЮЦИИ','LAS 28 ETAPAS DE EVOLUCIÓN')+'</h3></div>';
  const filters=document.createElement('div');filters.className='evo-v2-filters';
  for(const [id,label] of [['all',L('All 28','Все 28','Las 28')],['past',L('Completed','Пройденные','Completadas')],['future',L('Ahead','Будущие','Futuras')]]){
   const button=document.createElement('button');button.type='button';button.dataset.filter=id;button.textContent=label;filters.append(button);
  }
  top.append(filters);gallery.append(top);
  const workspace=document.createElement('div');workspace.className='evo-v2-workspace';
  const list=document.createElement('div');list.className='evo-v2-form-grid';
  list.setAttribute('role','group');list.setAttribute('aria-label',L('Evolution stages','Стадии эволюции','Etapas de evolución'));
  const inspector=document.createElement('aside');inspector.className='evo-v2-inspector';
  inspector.innerHTML='<div class="evo-v2-inspector-top"><small></small><canvas data-size="148" aria-label="Form preview"></canvas><h4></h4><span class="evo-v2-inspector-era"></span><p></p></div><button type="button" class="evo-v2-back-current">'+L('SHOW MY FORM','ПОКАЗАТЬ МОЮ ФОРМУ','MOSTRAR MI FORMA')+'</button>';
  const cards=[];
  for(let i=0;i<TA.length;i++){
   const form=TA[i],card=document.createElement('button');card.type='button';
   card.className='evo-v2-form-card '+(i<tier?'past':i===tier?'current':'future');
   card.dataset.tier=String(i);card.dataset.status=i<tier?'past':i===tier?'current':'future';
   card.setAttribute('aria-current',i===tier?'step':'false');
   card.style.setProperty('--stage-color',form.color);
   const portrait=document.createElement('canvas');portrait.dataset.size='72';
   const info=document.createElement('span');info.className='evo-v2-card-info';
   const number=document.createElement('small');number.textContent=String(i+1).padStart(2,'0')+' / 28';
   const name=document.createElement('strong');name.textContent=form.name;
   const status=document.createElement('em');status.textContent=i<tier?L('COMPLETED','ПРОЙДЕНО','COMPLETADA'):i===tier?L('YOU ARE HERE','ТЫ ЗДЕСЬ','ESTÁS AQUÍ'):L('FUTURE','БУДУЩАЯ','FUTURA');
   info.append(number,name,status);card.append(portrait,info);list.append(card);cards.push(card);
   paintStagePortrait(portrait,i);
  }
  function inspect(i){
   cards.forEach((card,j)=>card.setAttribute('aria-pressed',String(j===i)));
   const form=TA[i];
   text(inspector,'small',String(i+1).padStart(2,'0')+' / 28 · '+(i<tier?L('COMPLETED','ПРОЙДЕНО','COMPLETADA'):i===tier?L('CURRENT','ТЕКУЩАЯ','ACTUAL'):L('COMING UP','ВПЕРЕДИ','POR VENIR')));
   text(inspector,'h4',form.name);text(inspector,'.evo-v2-inspector-era',form.epoch);
   text(inspector,'p',form.desc);paintStagePortrait(q(inspector,'canvas'),i);
   inspector.classList.toggle('inspecting-future',i>tier);
  }
  cards.forEach((card,i)=>card.onclick=()=>inspect(i));
  q(inspector,'.evo-v2-back-current').onclick=()=>{
   setFilter('all');inspect(tier);
   const card=cards[tier];card.scrollIntoView({block:'nearest',behavior:'smooth'});
  };
  function setFilter(id){
   qa(filters,'button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===id)));
   cards.forEach(card=>card.hidden=id==='past'?card.dataset.status==='future':id==='future'?card.dataset.status==='past':false);
   // The current form is shown in every category for orientation.
  }
  qa(filters,'button').forEach(button=>button.onclick=()=>setFilter(button.dataset.filter));
  workspace.append(list,inspector);gallery.append(workspace);content.append(gallery);
  setFilter('all');inspect(tier);
  list.scrollTop=Math.max(0,cards[tier].offsetTop-list.offsetTop-24);
 }
 const trackCover=(t,i)=>t.cover?`<img src="${esc(t.cover)}" alt="${esc(t.title)}" loading="lazy" decoding="async" width="360" height="360">`:visual.musicCover(i);
 showMusicShop=function(){enterScreen('music');legacy.music();const {root,old}=mount('music');text(root,'#music-balance',fmt(g.credits));text(root,'.music-wallet small',L('STARDUST','ЗВЁЗДНАЯ ПЫЛЬ','POLVO ESTELAR'));text(root,'.music-heading p',q(old,'.overlay-copy').textContent);text(root,'.music-eyebrow',L('SOUNDTRACK','САУНДТРЕК','BANDA SONORA')+' / '+MUSIC_TRACKS.length+' '+L('TRACKS','КОМПОЗИЦИЙ','PISTAS'));text(root,'#music-owned-count',`${g.ownedTracks.length} / ${MUSIC_TRACKS.length} `+L('unlocked','открыто','desbloqueadas'));const legend=q(root,'.music-legend');[...legend.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.textContent='');q(root,'.legend-sep')?.remove();
  const list=q(root,'#music-track-list');const subtitles=[L('Ambient · first spark','Эмбиент · первая искра','Ambiente · primera chispa'),L('Pulsar · distant signal','Пульсар · далёкий сигнал','Púlsar · señal lejana'),L('Stellar wind','Звёздный ветер','Viento estelar'),L('Night horizon','Ночной горизонт','Horizonte nocturno'),L('Galactic depth','Галактическая глубина','Profundidad galáctica'),L('Echo of the abyss','Эхо бездны','Eco del abismo'),L('Beyond the horizon','За горизонтом','Más allá del horizonte'),L('The last singularity','Последняя сингулярность','La última singularidad')];
  list.innerHTML=MUSIC_TRACKS.map((t,i)=>{const owned=g.ownedTracks.includes(t.id),chosen=g.activeTrack===t.id,available=!!t.src;return `<article class="music-track-card ${chosen?'selected':''}" data-track-index="${i}"><div class="music-cover">${trackCover(t,i)}<span class="music-cover-index">${String(i+1).padStart(2,'0')} / ${String(MUSIC_TRACKS.length).padStart(2,'0')}</span></div><div class="music-track-meta"><strong>${esc(t.title)}</strong><small>${esc(t.subtitle||subtitles[i]||'')}</small></div><div class="music-track-actions"><span class="music-track-price">${i===0?L('FREE · BASE TRACK','БЕСПЛАТНО · БАЗОВЫЙ','GRATIS · PISTA BÁSICA'):owned?'✓ '+L('UNLOCKED','ОТКРЫТ','ABIERTO'):'✦ '+fmt(t.price)}</span><button class="music-track-preview" data-preview="${i}" aria-label="${esc(L('Listen: ','Слушать: ','Escuchar: ')+t.title)}" ${owned&&available?'':'disabled'}>${visual.mediaSVG('play')}</button><button data-music-action="${i}" class="${owned?(chosen?'chosen':'owned'):''}" ${available?'':'disabled'}>${!available?L('COMING SOON','СКОРО','PRÓXIMAMENTE'):owned?(chosen?L('SELECTED','ВЫБРАНО','ELEGIDA'):L('SELECT','ВЫБРАТЬ','ELEGIR')):L('BUY','КУПИТЬ','COMPRAR')}</button></div></article>`;}).join('');
  const activeIndex=MUSIC_TRACKS.findIndex(t=>t.id===g.activeTrack&&g.ownedTracks.includes(t.id)),active=MUSIC_TRACKS[activeIndex];q(root,'#music-player-art').innerHTML=active?trackCover(active,activeIndex):'';text(root,'#music-now-title',active?active.title:L('No track selected','Трек не выбран','Sin pista seleccionada'));text(root,'#music-now-detail',active?(g.music?L('Playing','Играет','Sonando'):L('Paused','Пауза','Pausa')):L('Purchase a track to listen','Купи трек для прослушивания','Compra una pista para escuchar'));q(root,'#music-play-glyph').innerHTML=visual.mediaSVG(active&&g.music?'pause':'play');['#music-play','#music-prev','#music-next'].forEach(sel=>q(root,sel).disabled=!active);

  qa(root,'[data-music-action]').forEach(b=>b.onclick=()=>{if(chooseTrack(MUSIC_TRACKS[+b.dataset.musicAction]))showMusicShop();});qa(root,'[data-preview]').forEach(b=>b.onclick=()=>{const t=MUSIC_TRACKS[+b.dataset.preview];if(!g.ownedTracks.includes(t.id))return;if(b.getAttribute('aria-pressed')==='true'){stopMusicPreview();b.innerHTML=visual.mediaSVG('play');b.setAttribute('aria-pressed','false');return;}if(!t.src){chooseTrack(t);showMusicShop();return;}qa(root,'[data-preview]').forEach(n=>{n.innerHTML=visual.mediaSVG('play');n.setAttribute('aria-pressed','false');});b.innerHTML=visual.mediaSVG('pause');b.setAttribute('aria-pressed','true');previewMusicTrack(t,()=>{if(b.isConnected){b.innerHTML=visual.mediaSVG('play');b.setAttribute('aria-pressed','false');}});});

  q(root,'#music-play').onclick=()=>{g.music=!g.music;initAudio();setMusicVolume();save();showMusicShop();};['#music-prev','#music-next'].forEach((sel,i)=>q(root,sel).onclick=()=>{const owned=MUSIC_TRACKS.filter(t=>g.ownedTracks.includes(t.id)&&(t.src)),index=owned.findIndex(t=>t.id===g.activeTrack);if(chooseTrack(owned[(index+(i?1:-1)+owned.length)%owned.length]))showMusicShop();});
  const volume=q(root,'#music-volume');volume.value=Math.round(g.musicVolume*100);volume.oninput=()=>{g.musicVolume=+volume.value/100;setMusicVolume();save();};
  const seek=q(root,'#music-seek'),audio=externalMusic;const syncPlayback=()=>{if(!root.isConnected)return;const duration=audio?.duration;if(Number.isFinite(duration)&&duration>0){seek.disabled=false;seek.max=duration;if(document.activeElement!==seek)seek.value=audio.currentTime;seek.style.setProperty('--val',(audio.currentTime/duration*100)+'%');text(root,'#music-duration',timeFmt(duration));text(root,'#music-position',timeFmt(audio.currentTime));}else{seek.disabled=true;seek.value=0;text(root,'#music-duration','—');text(root,'#music-position','00:00');}};seek.oninput=()=>{if(audio&&Number.isFinite(audio.duration))audio.currentTime=+seek.value;};if(audio){audio.ontimeupdate=syncPlayback;audio.onloadedmetadata=syncPlayback;audio.ondurationchange=syncPlayback;}syncPlayback();decorate(root);
 };
 // Keep the atlas renderer and all marker editing controls in their live DOM.
 showMap=function(){enterScreen('map');legacy.map();const {root,old}=mount('map');
  q(root,'.header-right button').setAttribute('aria-label',L('Settings','Настройки','Ajustes'));
  q(root,'#atlas').replaceWith(q(old,'#atlas-canvas'));
  q(root,'#atlas-pin-menu').remove();q(root,'.map-scale').remove();
  const left=q(root,'.map-corner.left');q(left,'.map-stats').replaceWith(q(old,'.atlas-stats'));
  const add=q(old,'#atlas-pin-add');add.className='map-accent-action';add.innerHTML=icon('pin')+' '+L('Place a marker','Поставить метку','Colocar marca');q(left,'#pin-add').replaceWith(add);q(left,'#pin-status').replaceWith(q(old,'#atlas-pin-hint'));
  const details=document.createElement('details');details.className='v15-map-details';const summary=document.createElement('summary');summary.textContent=L('Scale & saved markers','Масштаб и сохранённые метки','Escala y marcas guardadas');details.append(summary,q(old,'.atlas-measures'),q(old,'.atlas-pins'));left.append(details);
  // This select is moved from the legacy modal after mount(). Style it here.
  visual?.enhanceSelects(details);
  [['#zoom-in','#atlas-zoom-in'],['#zoom-out','#atlas-zoom-out'],['#map-center','#atlas-center']].forEach(([to,from])=>q(root,to).replaceWith(q(old,from)));
  q(root,'.map-threat').replaceChildren(q(old,'#atlas-threat'),q(old,'#atlas-abyss'));
  q(root,'.map-footer .legend').replaceWith(q(old,'.atlas-legend'));atlasFitPlayer();atlas.dirty=true;translate(root);
 };
 const originalPinEditor=openPinEditor;
 openPinEditor=function(px,py,clientX,clientY){
  const root=q($('modal'),'#screen-map');if(!root)return originalPinEditor(px,py,clientX,clientY);closePinEditor();
  const bounds=$('atlas-canvas').getBoundingClientRect(),scale=atlasScale();const pin=g.mapPins.find(p=>Math.hypot(bounds.width/2+(p.x-atlas.x)*scale-px,bounds.height/2+(p.y-atlas.y)*scale-py)<18);
  const world={x:pin?.x??atlas.x+(px-bounds.width/2)/scale,y:pin?.y??atlas.y+(py-bounds.height/2)/scale};
  const holder=document.createElement('template');holder.innerHTML=tpl.map;const editor=q(holder.content,'#atlas-pin-menu');editor.id='pin-editor';editor.hidden=false;editor.setAttribute('aria-modal','false');q(root,'.map-stage').append(editor);decorate(editor);
  editor.setAttribute('aria-label',L('Marker settings','Настройка метки','Ajustes de marca'));q(editor,'#pin-menu-close').setAttribute('aria-label',L('Close','Закрыть','Cerrar'));text(editor,'label[for=pin-name-input]',L('NAME','НАЗВАНИЕ','NOMBRE'));text(editor,'#pin-save',L('SAVE MARKER','СОХРАНИТЬ МЕТКУ','GUARDAR MARCA'));text(editor,'#pin-delete',L('DELETE','УДАЛИТЬ','ELIMINAR'));qa(editor,'[data-pin-color]').forEach((b,i)=>b.setAttribute('aria-label',L(...[['Purple','Фиолетовый','Morado'],['Blue','Голубой','Azul'],['Amber','Янтарный','Ámbar'],['Pink','Розовый','Rosa'],['Green','Зелёный','Verde'],['White','Белый','Blanco']][i])));
  text(editor,'div.pin-menu-label',L('MARKER COLOUR','ЦВЕТ МЕТКИ','COLOR DE MARCA'));text(editor,'.pin-menu-tip',L('Right-click to edit · Use the left button to add','ПКМ — редактировать · Кнопка слева — добавить','Clic derecho para editar · Botón izquierdo para añadir'));q(editor,'#pin-colors').setAttribute('aria-label',L('Marker colour','Цвет метки','Color de marca'));qa(editor,'[data-pin-color]').forEach(b=>b.title=b.getAttribute('aria-label'));
  const input=q(editor,'#pin-name-input');input.placeholder=L('Marker name','Название метки','Nombre de marca');input.value=pin?.name||L('Marker','Метка','Marca')+' '+g.nextPinId;let color=pin?.color||'#a986ff';const palette=qa(editor,'[data-pin-color]');const select=c=>{color=c;palette.forEach(b=>b.classList.toggle('selected',b.dataset.pinColor===c));};palette.forEach(b=>b.onclick=()=>select(b.dataset.pinColor));select(color);
  text(editor,'#pin-menu-coords',`X ${lightYears(world.x)} / Y ${lightYears(world.y)}`);text(editor,'.pin-menu-title',pin?L('EDIT MARKER','ИЗМЕНИТЬ МЕТКУ','EDITAR MARCA'):L('CREATE MARKER','СОЗДАТЬ МЕТКУ','CREAR MARCA'));
  const finish=()=>{closePinEditor();refreshPinPanel();atlas.dirty=true;};q(editor,'#pin-menu-close').onclick=finish;q(editor,'#pin-delete').hidden=!pin;q(editor,'#pin-delete').onclick=()=>{if(pin)removeMapPin(pin.id);finish();};q(editor,'#pin-save').onclick=()=>{const target=pin||addMapPin(world.x,world.y);if(!target){toast(L('Maximum: 64 markers','Максимум: 64 метки','Máximo: 64 marcas'));return;}target.name=input.value.trim().slice(0,32)||L('Marker','Метка','Marca');target.color=color;g.activePin=target.id;save();finish();};
  editor.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();finish();}if(e.key==='Enter'){e.preventDefault();q(editor,'#pin-save').click();}};
  const rect=editor.getBoundingClientRect();editor.style.left=clamp(px+10,8,Math.max(8,bounds.width-rect.width-8))+'px';editor.style.top=clamp(py+8,8,Math.max(8,bounds.height-rect.height-8))+'px';input.focus();input.select();
 };
 showTutorial=function(){enterScreen('tutorial');show('');const {root}=mount('tutorial');
  const articles=qa(root,'.br-tutorial article');
  text(articles[2],'p',L('Gather mass and the materials in your evolution recipe. M opens the atlas. Right-click to name and colour a marker; on a phone use + Marker. A larger black hole ends your run.','Собирай массу и материалы из рецепта эволюции. M открывает карту. ПКМ создаёт метку с именем и цветом; на телефоне — + Метка. Большая чёрная дыра завершит прохождение.','Reúne masa y los materiales de tu receta. M abre el atlas. Clic derecho crea una marca con nombre y color; en móvil usa + Marca. Un agujero negro mayor termina tu partida.'));
  q(root,'.br-tutorial-done').onclick=()=>{g.tutorialDone=true;save();resumeGame();};
 };
 const oldOpenEvolution=openEvolution;openEvolution=()=>{if($('modal').dataset.screen==='evolution'&&!$('modal').classList.contains('off'))resumeGame();else showV15Evolution();};
 $('btn-evolution').onclick=openEvolution;$('btn-stage-details').onclick=openEvolution;
 function buildHud(){const holder=document.createElement('template');holder.innerHTML=tpl.play;const hud=holder.content.firstElementChild;hud.classList.add('active','v15-hud');$('hud').append(hud);decorate(hud);
 const drawer=q(hud,'#upgrade-drawer'),upgradeToggle=q(hud,'#upgrades-open'),upgradeClose=q(drawer,'#upgrades-close');
 upgradeClose.innerHTML=uiIcon('close');
 upgradeClose.setAttribute('aria-label',L('Close upgrades','Закрыть улучшения','Cerrar mejoras'));
 upgradeClose.setAttribute('title',upgradeClose.getAttribute('aria-label'));
 q(drawer,'.drawer-more').remove();
 drawer.classList.add('quick-upgrades');drawer.classList.remove('open');
 upgradeToggle.setAttribute('aria-expanded','false');
 const setUpgradesOpen=on=>{drawer.classList.toggle('open',on);upgradeToggle.setAttribute('aria-expanded',String(on));};
 upgradeToggle.onclick=()=>setUpgradesOpen(!drawer.classList.contains('open'));
 upgradeClose.onclick=()=>setUpgradesOpen(false);
 q(drawer,'.drawer-head strong').textContent=L('UPGRADES','УЛУЧШЕНИЯ','MEJORAS');
 const bulk=document.createElement('div');bulk.className='quick-upgrade-qty';bulk.setAttribute('role','group');bulk.setAttribute('aria-label',L('Purchase quantity','Количество уровней','Cantidad de compra'));
 bulk.innerHTML=['1','10','100','max'].map(v=>'<button type="button" data-quick-qty="'+v+'">'+(v==='max'?'MAX':'×'+v)+'</button>').join('');
 drawer.insertBefore(bulk,q(drawer,'.drawer-head').nextSibling);
 qa(bulk,'[data-quick-qty]').forEach(b=>b.onclick=()=>{setBuyAmount(b.dataset.quickQty);refreshV15();});
 qa(drawer,'.drawer-up').forEach(n=>n.remove());
 upgrades.forEach(u=>{const b=document.createElement('button');b.type='button';b.className='drawer-up';b.dataset.quickUpgrade=u.id;b.onclick=()=>{buy(u.id);refreshV15();};drawer.append(b);});
 const soundControls=document.createElement('div');soundControls.className='quick-audio';
 soundControls.innerHTML=
  '<button type="button" class="icon-btn" data-audio-action="collection" aria-label="'+L('Music collection','Коллекция музыки','Colección de música')+'" title="'+L('Music collection','Коллекция музыки','Colección de música')+'">'+uiIcon('playlist')+'</button>'+
  '<button type="button" class="icon-btn" data-audio-action="mute" aria-label="'+L('Mute all sounds','Выключить весь звук','Silenciar todo')+'" title="'+L('Mute all sounds','Выключить весь звук','Silenciar todo')+'">'+uiIcon('music')+'</button>';
 q(hud,'.hud-commands').prepend(soundControls);
 const dailyShortcut=document.createElement('button');dailyShortcut.type='button';
 dailyShortcut.className='icon-btn daily-hud-button';dailyShortcut.innerHTML='✦';
 dailyShortcut.title=L('Daily rewards','Ежедневные награды','Recompensas diarias');
 dailyShortcut.setAttribute('aria-label',dailyShortcut.title);
 dailyShortcut.onclick=()=>showDailyRewards('play');
 q(hud,'.hud-commands').prepend(dailyShortcut);
 q(soundControls,'[data-audio-action="collection"]').onclick=()=>navigate('music');
 q(soundControls,'[data-audio-action="mute"]').onclick=()=>{const enabled=!(g.music||g.sound);g.music=enabled;g.sound=enabled;initAudio();setMusicVolume();save();refreshV15();};
 const activate=(id,fn)=>{const b=q(hud,id);b.onclick=fn;
  const badge=document.createElement('span');badge.className='ability-cooldown-label';
  badge.setAttribute('aria-live','off');b.append(badge);
 };activate('#pulse',activatePulse);activate('#dash',activateBoost);q(hud,'#view-mode').remove();
 // No duplicate camera toggle: desktop uses wheel / existing zoom buttons; phone uses two-finger pinch.

 const info=q(hud,'.evo-status');info.setAttribute('role','button');info.tabIndex=0;info.setAttribute('aria-label',L('Evolution recipe','Рецепт эволюции','Receta de evolución'));info.onclick=e=>{if(!e.target.closest('button'))showV15Evolution();};info.onkeydown=e=>{if(e.key==='Enter')showV15Evolution();};
 const tiltButton=document.createElement('button');tiltButton.className='phone-gyro-quick';tiltButton.hidden=true;tiltButton.onclick=()=>{if(mobileControls?.enabled)mobileControls.calibrate();else mobileControls?.enable();refreshPhoneSettings();};hud.append(tiltButton);
 return hud;}
 let hud=buildHud();
 const originalRender=renderUI;renderUI=function(...args){originalRender(...args);refreshV15();};
 function refreshV15(){
  refreshPhoneSettings();
  qa(hud,'[data-quick-upgrade]').forEach(b=>{const u=upgrades.find(u=>u.id===b.dataset.quickUpgrade),quote=upgradeQuote(u);b.innerHTML='<span>'+esc(u.name)+'<small>LVL '+fmt(g.upgrade[u.id])+'</small></span><b>'+((quote.count&&Number.isFinite(quote.cost))?'✦ '+fmt(quote.cost):'—')+'</b>';b.disabled=!quote.count||!Number.isFinite(quote.cost)||quote.cost>g.credits;});
   qa(hud,'[data-quick-qty]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.quickQty===String(g.buyAmount))));
   const mute=q(hud,'[data-audio-action="mute"]');
   if(mute){const audible=g.music||g.sound;mute.setAttribute('aria-pressed',String(audible));mute.setAttribute('aria-label',audible?L('Mute all sounds','Выключить весь звук','Silenciar todo'):L('Enable all sounds','Включить весь звук','Activar sonido'));mute.title=mute.getAttribute('aria-label');mute.innerHTML=uiIcon(audible?'music':'mute');}
  for(const [id,remaining,duration,hotkey] of [['pulse',pulseCd,13,'E'],['dash',boostCd,6,'Shift']]){
   const btn=q(hud,'#'+id),cooling=remaining>.02;
   btn.dataset.cooling=String(cooling);
   btn.setAttribute('aria-label',id==='pulse'?L('Gravity pulse','Гравитационный импульс','Pulso gravitatorio'):L('Dash','Рывок','Impulso'));
   btn.setAttribute('aria-description',cooling?L('Cooldown','Перезарядка','Recarga')+' '+remaining.toFixed(1)+' s':L('Ready','Готово','Listo')+' · '+hotkey);
   btn.style.setProperty('--ability-ready',Math.round((1-remaining/duration)*100)+'%');
   const badge=q(btn,'.ability-cooldown-label');
   if(badge)badge.textContent=cooling?remaining.toFixed(1)+'с':L('READY','ГОТОВО','LISTO');
  }
  const visible=$('modal').classList.contains('off');hud.style.display=visible?'block':'none';
  const resources=qa(hud,'.hud-resources strong');resources[0].textContent=$('matter-value').textContent;resources[1].textContent=fmt(g.credits);resources[2].textContent=timeFmt(g.time);
  text(hud,'.hud-resources small',g.endless?L('BLACK HOLE MASS','МАССА ЧЁРНОЙ ДЫРЫ','MASA DEL AGUJERO NEGRO'):L('MATTER','МАТЕРИЯ','MATERIA'));text(hud,'.hud-sub',TA[g.tier].epoch);text(hud,'.world-coords',$('world-subtitle').textContent);
  q(hud,'#mass-number').innerHTML=esc(g.endless?fmt(solarMass()):fmt(g.total))+(g.endless?' <small>M☉</small>':'');text(hud,'#radius-number',$('radius-value').textContent);text(hud,'.mass-details .mass-detail:last-child strong',Math.round(g.viewZoom*100)+'%');
  text(hud,'.evo-title>span:first-child',`${g.tier+1} / 28 · ${TA[g.tier].name}`);text(hud,'.evo-title>span:nth-child(2)',g.endless?'∞':TA[Math.min(27,g.tier+1)].name);text(hud,'.evo-aux b',Math.round(stageFraction()*100)+'%');q(hud,'.progress-bar span').style.width=stageFraction()*100+'%';text(hud,'#player-label-text',TA[g.tier].name);text(hud,'.player-label small',`${g.tier+1} / 28`);text(hud,'#pulse small',$('pulse-cooldown').textContent);text(hud,'#dash small',$('boost-cooldown').textContent);
 }
 const originalResume=resumeGame;resumeGame=function(){resumeFromAway();navigationStack.length=0;stopMusicPreview();visual?.closeSelect();originalResume();refreshV15();};
 if(TEST_MODE){const b=document.createElement('button');b.className='v15-tester';b.textContent='</>';b.setAttribute('aria-label','Tester panel');b.onclick=()=>testerToggle();document.body.append(b);}
 document.body.classList.add('ui-v15');
 refreshV15();
}

if(g.pendingDeath){pendingDeath=g.pendingDeath;showDeathOffer();}
else{completeAway();showMainMenu();}
// Start the selected (free by default) soundtrack on the main menu.
// Browsers can reject audible autoplay until a real input event; retry on
// user activation so the first click/tap/keypress starts the music.
startMusic();
function unlockMusicFromGesture(){
 if(!g.music||window.SpacePlatform?.muted||musicPreview)return;
 if(!externalMusic)startMusic();
 else if(externalMusic.paused)setMusicVolume();
}
document.addEventListener('pointerdown',unlockMusicFromGesture,{capture:true,passive:true});
document.addEventListener('pointerup',unlockMusicFromGesture,{capture:true,passive:true});
document.addEventListener('keydown',unlockMusicFromGesture,{capture:true});
window.SpacePlatform?.loaded();
$('btn-music').onclick=()=>{g.music=!g.music;initAudio();setMusicVolume();renderUI(true);};$('btn-map').onclick=()=>toggleOverlay('map',showMap);$('btn-pause').onclick=()=>toggleOverlay('menu',showPause);$('btn-settings').onclick=()=>toggleOverlay('settings',showSettings);
$('btn-pulse').onclick=activatePulse;$('btn-boost').onclick=activateBoost;
$('btn-sidebar').onclick=()=>{if(W<=800){$('sidebar').classList.remove('mobile-open')}else $('sidebar').classList.add('collapsed');$('btn-show-sidebar').classList.remove('hidden');};
$('btn-show-sidebar').onclick=()=>{if(W<=800)$('sidebar').classList.add('mobile-open');else $('sidebar').classList.remove('collapsed');$('btn-show-sidebar').classList.add('hidden');};
if(W<=800)$('btn-show-sidebar').classList.remove('hidden');
function onWorldWheel(ev){
 if(!running||atlasVisible||ev.ctrlKey||!Number.isFinite(ev.deltaY))return;
 ev.preventDefault();
 const pixels=ev.deltaY*(ev.deltaMode===1?16:ev.deltaMode===2?H:1);
 g.viewZoom=clamp((g.viewZoom||1)*Math.exp(-clamp(pixels,-240,240)*.002),.05,10);
 // The normal camera follows this target smoothly; autosave/pagehide persist it.
}
canvas.addEventListener('wheel',onWorldWheel,{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointermove',e=>{
 if(e.pointerType!=='mouse')return;
 if(pointer.down&&e.pointerId!==pointer.id)return;
 pointer.x=e.clientX;pointer.y=e.clientY;pointer.type='mouse';
 pointer.active=pointer.down||g.controlMode==='follow';if(g.controlMode==='direction'&&pointer.down)setHeadingAngle(Math.atan2(e.clientY-H/2,e.clientX-W/2));updateFlightMarker();
});
canvas.addEventListener('pointerdown',e=>{
 if(!running||e.button!==0)return;
 if(e.pointerType!=='mouse')return; // Mobile uses the dedicated joystick.
 pointer.down=true;pointer.active=true;pointer.id=e.pointerId;pointer.type='mouse';pointer.x=e.clientX;pointer.y=e.clientY;
 if(g.controlMode==='direction')setHeadingAngle(Math.atan2(e.clientY-H/2,e.clientX-W/2));
 try{canvas.setPointerCapture(e.pointerId);}catch(_){}updateFlightMarker();
});
const releaseMouse=e=>{if(e.pointerId!==pointer.id)return;pointer.down=false;pointer.id=null;pointer.active=g.controlMode==='follow';if(g.controlMode==='direction')save();updateFlightMarker();};
canvas.addEventListener('pointerup',releaseMouse);
canvas.addEventListener('pointercancel',releaseMouse);
canvas.addEventListener('lostpointercapture',releaseMouse);
canvas.addEventListener('pointerleave',()=>{if(!pointer.down){pointer.active=false;updateFlightMarker();}});
// Map physical key positions, not the characters produced by EN/RU/ES layouts.
function physicalKey(e){
 const codes={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',KeyE:'e',KeyM:'m',KeyP:'p',Space:' ',ShiftLeft:'shift',ShiftRight:'shift',ArrowUp:'arrowup',ArrowDown:'arrowdown',ArrowLeft:'arrowleft',ArrowRight:'arrowright',Escape:'escape',F2:'f2'};
 return codes[e.code]||e.key.toLowerCase();
}
addEventListener('keydown',e=>{const k=physicalKey(e);
 if(k==='f2'&&TEST_MODE){e.preventDefault();testerToggle();return;}
 if(e.target instanceof HTMLElement&&e.target.closest('input, select, textarea, [contenteditable="true"]'))return;
 if(['arrowup','arrowleft','arrowright','arrowdown',' '].includes(k))e.preventDefault();
 keys.add(k);
 if(!e.repeat){if(k==='e')activatePulse();if(k==='shift'||k===' ')activateBoost();if(k==='p')toggleOverlay('menu',showPause);if(k==='escape'){if(running)showPause();else if($('modal').dataset.screen!=='menu'&&navigateOverlayBack)navigateOverlayBack();else resumeGame();}if(k==='m')toggleOverlay('map',showMap);}
});
addEventListener('keyup',e=>keys.delete(physicalKey(e)));
addEventListener('blur',()=>{keys.clear();clearFlightInput();if(running)showPause();});
addEventListener('pagehide',()=>{beginAway();save();});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){beginAway();if(running)showPause();}
 else if(!awaitingAd&&!window.SpacePlatform?.adBusy){
  const report=completeAway();
  if(report){showMainMenu(true);toast(L('Drift complete · route saved on the map','Дрейф завершён · маршрут сохранён на карте','Deriva completada · ruta guardada en el mapa'));}
 }
});
renderUI();
// Developer-friendly deterministic smoke checks may inspect this read-only snapshot.
Object.defineProperty(window,'CosmicEvolutionDebug',{get:()=>({tier:g.tier,matter:g.matter,playerRadius:player.r,targetRadius:player.targetR,cameraZoom:camera.zoom,total:g.total,credits:g.credits,elapsed:g.time,objects:entities.length,particles:particles.length,playerX:player.x,playerY:player.y,loadedSectors:loadedChunks.size,visitedSectors:exploredCount(),visitedExactSectors:visitedChunks.size,visitedDiscs:g.discoveryDiscs.length,depletedSectors:Object.keys(g.depleted).length,music:g.music,running,progress:g.matter/TA[g.tier].required,forms:TA.length,renderTicks,fps:Math.round(frameFps),renderScale:performanceScale,autoQuality:g.autoQuality!==false,pixelRatio:dpr,controlMode:g.controlMode,flightFeel:g.flightFeel,stickActive:stick.active,mouseDown:pointer.down,velocityX:player.vx,velocityY:player.vy,mission:missionReq(),tester:TEST_MODE?{...tester}:null,testMode:TEST_MODE,farSectors:distantChunkCache.size,nearbyCollected:g.collects,activeSoundSources:pickupCount,macroPositions:macroEntities.slice(0,5).map(e=>[e.chunk,e.index,e.x,e.y]),visibleSectorQuota:sectorQuota(chunkInfo(Math.floor(player.x/CHUNK),Math.floor(player.y/CHUNK)),Math.floor(player.x/CHUNK),Math.floor(player.y/CHUNK)),lensBackend,absorbingGalaxies:cosmicAbsorptions.length,macroVisible:macroVisibleCount,macroActive:macroEntities.length,macroHoles:macroEntities.filter(e=>e.kind==='blackhole').length,galaxyPalettes:GALAXY_PALETTES.length,macroDepleted:Object.keys(g.depletedMacro).length,cosmicDepleted:Object.keys(g.depletedCosmic).length,cosmicHarvestTimer,complete:g.complete,endless:g.endless,baseRadius:radiusAt(g.tier,0),endlessRadiusMultiplier:g.tier===TA.length-1?currentRadius()/radiusAt(g.tier,0):1,atlasZoom:atlas.zoom,materials:{...g.materials},recipe:stageRecipe(),stageExplored:g.stageExplored})});
})();
