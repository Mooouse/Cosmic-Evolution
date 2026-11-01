/* Cosmic Evolution — dependency-free 2D Canvas game. No 3D / external game engines. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('universe');
// Present only complete frames. The old low-latency front buffer exposed
// intermediate clears and readbacks from the gravitational lens.
const screenCtx=canvas.getContext('2d',{alpha:false,desynchronized:false});
const frameCanvas=document.createElement('canvas');
const frameCtx=frameCanvas.getContext('2d',{alpha:false});
let ctx=screenCtx;
const TAU = Math.PI * 2;
// The painted black disk, its lens and its physical absorption use one radius.
const BLACK_HOLE_CORE_FRACTION = .245;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rand = (a,b) => a + Math.random()*(b-a);
const choose = a => a[Math.floor(Math.random()*a.length)];
const fmt = n => !Number.isFinite(n)?'0':n>=1e12?(n/1e12).toFixed(2)+'T':n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(2)+'M':n>=10000?(n/1000).toFixed(1)+'K':Math.floor(n).toLocaleString('ru-RU');
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
const upgrades = [
 {id:'gravity',name:'Гравитация',label:'Радиус притяжения',glyph:'◎',base:35,growth:1.26,max:80},
 {id:'speed',name:'Движение',label:'Скорость полёта',glyph:'➤',base:50,growth:1.29,max:60},
 {id:'harvest',name:'Синтез материи',label:'Бонус к поглощению',glyph:'✦',base:65,growth:1.31,max:65},
 {id:'shield',name:'Стабильность',label:'Защита от опасностей',glyph:'⬡',base:80,growth:1.28,max:45}
];
const MATERIALS={ore:{label:'Минералы',symbol:'⬡',color:'#8ebcf4'},crystal:{label:'Кристаллы',symbol:'◆',color:'#75e3f5'},ice:{label:'Лёд',symbol:'❄',color:'#a2eaff'},gas:{label:'Газ',symbol:'◌',color:'#b6a8fa'},plasma:{label:'Плазма',symbol:'✺',color:'#ffba77'},exotic:{label:'Экзоматерия',symbol:'✧',color:'#df95f7'}};
const MATERIAL_KEYS=Object.keys(MATERIALS);
function stageRecipe(t=g.tier){
 // Gradually introduce one new resource every epoch. No deliberately huge mass caps.
 const types=['ore'];if(t>=4)types.push('crystal');if(t>=8)types.push('ice');
 if(t>=12)types.push('gas');if(t>=17)types.push('plasma');if(t>=22)types.push('exotic');
 const recent=types.slice(-Math.min(3,types.length));
 return recent.map((type,i)=>({type,amount:Math.round((3+t*1.25)*(i===0?1:.64))}));
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

const fresh = () => ({version:1,tier:0,matter:0,credits:0,total:0,time:0,collects:0,rare:0,pulses:0,losses:0,unlocks:0,stageCollects:0,stageRare:0,stagePulses:0,upgrade:{gravity:0,speed:0,harvest:0,shield:0},sound:true,particles:true,quality:1,music:true,musicVolume:.30,controlMode:'follow',flightFeel:'smooth',controlV:2,worldX:0,worldY:0,mapPins:[],nextPinId:1,activePin:null,abyssConsumed:{},abyssPositions:{},freeFlights:{},flightEpoch:0,complete:false,endless:false,visited:[],discoveryDiscs:[],exploredBonus:0,endlessGrowth:0,depleted:{},depletedMacro:{},depletedCosmic:{},stageExplored:0,materials:{ore:0,crystal:0,ice:0,gas:0,plasma:0,exotic:0},rebalanceV:3});
let g = fresh();
try {const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
 if(s&&s.version===1&&Number.isFinite(s.tier)&&s.tier>=0&&s.tier<TA.length){
  g={...fresh(),...s,upgrade:{...fresh().upgrade,...s.upgrade},visited:Array.isArray(s.visited)?s.visited:[],discoveryDiscs:Array.isArray(s.discoveryDiscs)?s.discoveryDiscs.filter(d=>Array.isArray(d)&&d.length===3&&d.every(Number.isFinite)):[],exploredBonus:Number.isFinite(s.exploredBonus)?s.exploredBonus:0,depleted:s.depleted&&typeof s.depleted==='object'?s.depleted:{},depletedMacro:s.depletedMacro&&typeof s.depletedMacro==='object'?s.depletedMacro:{},depletedCosmic:s.depletedCosmic&&typeof s.depletedCosmic==='object'?s.depletedCosmic:{},materials:{...fresh().materials,...s.materials}};
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
function normaliseMapPins(value){
 if(!Array.isArray(value))return [];
 const ids=new Set();
 return value.filter(p=>p&&Number.isSafeInteger(p.id)&&p.id>0&&!ids.has(p.id)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(ids.add(p.id),true)).slice(0,64)
  .map(p=>({id:p.id,x:p.x,y:p.y,zoom:clamp(Number(p.zoom)||1,1e-155,12),name:String(p.name||'Метка').slice(0,32)}));
}
g.freeFlights=Object.fromEntries(Object.entries(g.freeFlights||{}).filter(([key,e])=>e&&[e.x,e.y,e.vx,e.vy,e.flightTime,e.r].every(Number.isFinite)&&e.r>0&&(typeof e.chunk==='string'||(e.cosmic&&Number.isFinite(e.gx)&&Number.isFinite(e.gy)))&&Number.isInteger(e.index)&&e.index>=0&&e.index<32));
g.mapPins=normaliseMapPins(g.mapPins);
g.nextPinId=Math.max(1,...g.mapPins.map(p=>p.id+1));
if(!g.mapPins.some(p=>p.id===g.activePin))g.activePin=null;
let W=innerWidth,H=innerHeight,dpr=1,last=performance.now(),running=false,uiTimer=0,saveTimer=0,eventTimer=0;
// Physical size is continuous across all stages, including save/load and evolution.
// Stage boundaries are continuous: end of tier N equals start of tier N+1.
function stageFraction(){return clamp(g.matter/TA[g.tier].required,0,1);}
function radiusAt(tier,fraction){return 13*Math.pow(1.65,tier+clamp(fraction,0,1));}
function campaignZoom(radius){return clamp(tester.zoom*Math.min(145,16+14*Math.log2(1+radius/13))/Math.max(1,radius),1e-155,2.5);}
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
const savedZoom=g.endless?clamp(tester.zoom*(83+27*Math.log2(1+initialRadius/100))/Math.max(1,initialRadius),1e-155,2.5):campaignZoom(initialRadius);
let camera={x:player.x,y:player.y,zoom:savedZoom};
let entities=[],particles=[],shockwaves=[],texts=[],stars=[],nebula=[],energyArcs=[];let morph=null,screenFlash=0,streamTimer=0;const CHUNK=480;const loadedChunks=new Set();const visitedChunks=new Set(Array.isArray(g.visited)?g.visited:[]);if(!g.depleted||typeof g.depleted!=='object')g.depleted={};const WORLD_SEED=0x17aba37;const distantChunkCache=new Map();const MACRO_SIZE=3200,MACRO_COUNT=9;const macroCache=new Map(),macroSpriteCache=new Map(),macroLoaded=new Set();let macroEntities=[];let macroVisibleCount=0;if(!g.depletedMacro||typeof g.depletedMacro!=='object')g.depletedMacro={};
// Manual flight: the cursor must NOT steer the ship until the user holds click.
// Touch input uses the independent floating-stick surface, never mouse hover.
let keys=new Set(),pointer={x:W/2,y:H/2,active:false,down:false,type:'mouse',id:null};
const stick={active:false,id:null,x:0,y:0};
if(!['hold','follow','keys'].includes(g.controlMode))g.controlMode='follow';
if(!['direct','smooth'].includes(g.flightFeel))g.flightFeel='smooth';
function clearFlightInput(){pointer.active=false;pointer.down=false;pointer.id=null;stick.active=false;stick.id=null;stick.x=stick.y=0;const thumb=$('stick-thumb'),pad=$('flight-stick'),marker=$('flight-marker');if(thumb)thumb.style.transform='translate(-50%, -50%)';if(pad)pad.classList.remove('engaged');if(marker)marker.classList.remove('visible');}
function updateFlightMarker(){const mark=$('flight-marker');if(!mark)return;mark.style.left=pointer.x+'px';mark.style.top=pointer.y+'px';mark.classList.toggle('visible',running&&pointer.type==='mouse'&&g.controlMode!=='keys'&&(pointer.down||g.controlMode==='follow')&&!atlasVisible);}
function updateStickPosition(e){const pad=$('flight-stick'),rect=pad.getBoundingClientRect();let dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2);const maxDist=Math.min(rect.width,rect.height)*.36,len=Math.hypot(dx,dy);if(len>maxDist){dx*=maxDist/len;dy*=maxDist/len;}stick.x=dx/maxDist;stick.y=dy/maxDist;const thumb=$('stick-thumb');thumb.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;}
function setupFlightStick(){const pad=$('flight-stick');pad.addEventListener('pointerdown',e=>{if(!running)return;e.preventDefault();e.stopPropagation();stick.active=true;stick.id=e.pointerId;pad.classList.add('engaged');pad.setPointerCapture(e.pointerId);updateStickPosition(e);});pad.addEventListener('pointermove',e=>{if(stick.active&&stick.id===e.pointerId){e.preventDefault();updateStickPosition(e);}});const release=e=>{if(stick.id!==e.pointerId)return;stick.active=false;stick.id=null;stick.x=stick.y=0;pad.classList.remove('engaged');$('stick-thumb').style.transform='translate(-50%, -50%)';};pad.addEventListener('pointerup',release);pad.addEventListener('pointercancel',release);pad.addEventListener('lostpointercapture',release);}
setupFlightStick();
let pulseCd=0,boostCd=0,boostTime=0,shake=0,renderTicks=0;let atlasVisible=false,atlas={x:0,y:0,zoom:1,drag:false,lastX:0,lastY:0,dirty:true};
let soundCtx=null;let musicMaster=null,musicFX=null,musicLoop=null,musicNext=0,musicBeat=0;
let pickupSoundAt=-1e9,pickupCount=0,pickupValue=0,pickupDisplayAt=-1e9;
let absorptionTokens=0;
let harvestChain=0,harvestChainTime=0;
function chainMultiplier(){return g.tier<13?1+Math.min(1,Math.floor(harvestChain/4)*.25):1;}
function advanceHarvestChain(){
 if(g.tier>=13)return 1;
 harvestChain=harvestChainTime>0?harvestChain+1:1;harvestChainTime=5;
 if(harvestChain%4===0){
  const color=harvestChain>=12?'#ffd6a0':'#86eaff';
  shockwaves.push({x:player.x,y:player.y,r:player.r,life:.7,max:.7,color,range:110});
  sound(330+Math.min(12,harvestChain)*22,'sine',.18,.012);
 }
 return chainMultiplier();
}
function ordinaryGravityRadius(){return Math.max(97+g.upgrade.gravity*7,player.r*2.8)*tester.gravity;}
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
  popText(player.x,player.y-player.r*1.3,`+${fmt(Math.round(pickupValue))}`,'#b7e9fc');
  pickupValue=0;pickupCount=0;pickupDisplayAt=now;
 }
 if(player.r>=CHUNK*4){pickupValue=0;pickupCount=0;}
}


const cssColor = (h,a) => h.startsWith('#')?`rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${a})`:`rgba(119,190,255,${a})`;
function sound(freq=350,type='sine',duration=.075,vol=.045){if(!g.sound)return;try{soundCtx??=new (window.AudioContext||window.webkitAudioContext)();if(soundCtx.state==='suspended')soundCtx.resume();const osc=soundCtx.createOscillator(),gain=soundCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,soundCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.63),soundCtx.currentTime+duration);gain.gain.setValueAtTime(vol,soundCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,soundCtx.currentTime+duration);osc.connect(gain);gain.connect(soundCtx.destination);osc.start();osc.stop(soundCtx.currentTime+duration+.01);}catch(_){}}
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
function setMusicVolume(){if(musicMaster&&soundCtx)musicMaster.gain.setTargetAtTime(g.music?g.musicVolume*.42:0,soundCtx.currentTime,.12);}
function playVoice(note,when,duration,level=.08,type='triangle'){
 if(!soundCtx||!musicFX)return;
 const o=soundCtx.createOscillator(),o2=soundCtx.createOscillator(),gain=soundCtx.createGain();
 o.type=type;o.frequency.setValueAtTime(hz(note),when);o2.type='sine';o2.frequency.setValueAtTime(hz(note)*1.0024,when);
 gain.gain.setValueAtTime(.0001,when);gain.gain.linearRampToValueAtTime(level,when+.13);gain.gain.setTargetAtTime(.0001,when+duration*.57,Math.max(.15,duration*.2));
 o.connect(gain);o2.connect(gain);gain.connect(musicFX);o.start(when);o2.start(when);o.stop(when+duration+1.3);o2.stop(when+duration+1.3);
}
function scheduleMusic(){
 if(!soundCtx||!musicMaster)return;
 if(soundCtx.state==='suspended')return;
 const beat=.78;
 while(musicNext<soundCtx.currentTime+.4){
  let step=musicBeat%32, section=Math.floor(musicBeat/32), chord=musicChords[section%musicChords.length];
  if(step%8===0){playVoice(chord[0]-12,musicNext,7.0,.055,'sine');for(let j=1;j<5;j++)playVoice(chord[j],musicNext+j*.055,6.5,.013,'triangle');}
  if(step%2===0){let sequence=[0,2,3,1,4,2,1,3,0,1,3,4,2,3,1,2];let k=sequence[Math.floor(step/2)];playVoice(chord[k]+12,musicNext,1.20,step%8===0?.040:.025,'sine');}
  if(step===24||step===28)playVoice(chord[3]+24,musicNext,2.1,.020,'sine');
  musicNext+=beat;musicBeat++;
 }
}
function startMusic(){initAudio();setMusicVolume();}
function save(){g.worldX=player.x;g.worldY=player.y;try{localStorage.setItem(SAVE_KEY,JSON.stringify(g));}catch(_){toastStorageWarning();}}
let storageWarned=false;function toastStorageWarning(){if(!storageWarned){storageWarned=true;console.warn('Cosmic Evolution: сохранение мира не помещается в localStorage');}}

function makeSky(){skyLayer=null;stars=Array.from({length:Math.min(410,Math.max(180,Math.floor(W*H/3800)))},()=>({x:Math.random()*W,y:Math.random()*H,r:rand(.3,1.75),alpha:rand(.2,1),depth:rand(.08,.48),phase:rand(0,TAU)}));nebula=Array.from({length:7},()=>({x:rand(0,W),y:rand(0,H),r:rand(190,380),h:choose([212,240,265,288,194]),a:rand(.045,.095),depth:rand(.02,.12)}));}
let performanceScale=1,frameFps=60,perfSample=0,perfFrames=0,skyLayer=null,skyLayerEpoch=-1;
function applyResolution(){
 const base=Math.min(devicePixelRatio||1,W*H>=2200000?.87:1.25);
 const effective=base*(g.quality===.5?.75:1)*performanceScale;
 dpr=Math.max(.65,effective);
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
// The campaign is tuned for many hours of exploring fresh, non-respawning sectors.
// Requirements are distance and discovery goals, not artificial AFK timers.
function missionReq(){return {rare:0,explore:Math.round(3+Math.min(24,g.tier*1.1)),collect:Math.round(TA[g.tier].required*.45)};}
function recipeDone(){return stageRecipe().every(({type,amount})=>(g.materials[type]||0)>=amount);}
function missionsDone(){const m=missionReq();return g.stageCollects>=m.collect&&recipeDone()&&g.stageExplored>=m.explore;}
function spendRecipe(){for(const r of stageRecipe())g.materials[r.type]=Math.max(0,(g.materials[r.type]||0)-r.amount);}
function resourceOf(e){return e.material||'ore';}

function upgradeCost(u){return Math.round(u.base*Math.pow(u.growth,g.upgrade[u.id]));}
function buy(id){const u=upgrades.find(x=>x.id===id);if(!u)return;const cost=upgradeCost(u);if(g.upgrade[id]>=u.max||g.credits<cost){toast('Недостаточно звёздной пыли');return;}g.credits-=cost;g.upgrade[id]++;sound(590,'triangle',.13);burst(player.x,player.y,20,'#81e5ec',1);renderUI(true);save();}
function populateUpgrades(){const root=$('upgrades');root.textContent='';for(const u of upgrades){let b=document.createElement('button');b.className='upgrade';b.dataset.upgrade=u.id;b.addEventListener('click',()=>buy(u.id));b.innerHTML=`<span class="upgrade-icon">${u.glyph}</span><span class="upgrade-description"><strong>${u.name}</strong><small>${u.label} · <span class="upgrade-level"></span></small></span><span class="upgrade-cost"><span class="upgrade-price"></span><small>✦ цена</small></span>`;root.append(b);}}
populateUpgrades();
function renderUI(force=false){
 $('matter-value').textContent=fmt(g.total);$('credit-value').textContent=fmt(g.credits);$('time-value').textContent=timeFmt(g.time);
 const t=TA[g.tier],next=TA[g.tier+1],progress=clamp(g.matter/t.required,0,1);
 $('tier-number').innerHTML=`${String(g.tier+1).padStart(2,'0')} <span>/ ${TA.length}</span>`;
 $('epoch-name').textContent=t.epoch.toUpperCase();$('tier-title').textContent=t.name;$('tier-desc').textContent=g.tier<13?(harvestChainTime>0?`ЦЕПОЧКА: ${harvestChain} · ${harvestChainTime.toFixed(1)} с`:t.desc+' Собирай цепочки и закручивай потоки материи.'):t.desc;
 $('current-form').textContent=t.name;$('next-form').textContent=g.endless?'ГОРИЗОНТ СОБЫТИЙ РАСТЁТ ∞':next?.name??'БЕСКОНЕЧНОСТЬ';
 if(g.endless){
  const rank=Math.log2(1+Math.max(0,g.matter)/t.required),sub=(rank%1)*100;
  $('progress-fill').style.width=sub.toFixed(1)+'%';
  $('progress-percent').textContent=`∞ РОСТ · ×${(currentRadius()/radiusAt(g.tier,0)).toFixed(2)} РАДИУС`;
 }else{
  $('progress-fill').style.width=(progress*100).toFixed(1)+'%';
  $('progress-percent').textContent=progress>=1&&!missionsDone()?'ВЫПОЛНИ ЗАДАЧИ':Math.round(progress*100)+'%';
 }
 const m=missionReq(),cs=g.endless?[true,true,true]:[g.stageCollects>=m.collect,recipeDone(),g.stageExplored>=m.explore];
 $('mission-1-label').textContent=g.endless?'Поглощено в чёрную дыру':'Нарасти массу';$('mission-1-val').textContent=g.endless?fmt(g.matter):`${fmt(g.stageCollects)}/${fmt(m.collect)}`;
 $('mission-2-label').textContent=g.endless?'Радиус горизонта событий':'Собери рецепт';$('mission-2-val').textContent=g.endless?fmt(Math.round(player.r)):`${stageRecipe().filter(({type,amount})=>(g.materials[type]||0)>=amount).length}/${stageRecipe().length}`;
 $('mission-3-label').textContent=g.endless?'Исследовано секторов':'Исследуй сектора';$('mission-3-val').textContent=g.endless?fmt(exploredCount()):`${g.stageExplored}/${m.explore}`;
 const matRoot=$('materials-inventory');if(matRoot){
  const active=g.endless?[]:stageRecipe();matRoot.innerHTML=active.map(({type,amount})=>{
   const v=g.materials[type]||0,d=MATERIALS[type];return `<div class="material-row ${v>=amount?'ready':''}"><span style="color:${d.color}">${d.symbol}</span><span>${d.label}</span><b>${fmt(v)} / ${fmt(amount)}</b></div>`;
  }).join('');
  $('resource-hint').textContent=g.endless?'Все виды материи поглощаются автоматически':stageRecipe().map(r=>MATERIALS[r.type].label).join(' · ');
 }
 cs.forEach((ok,i)=>{const e=$(`mission-${i+1}`);e.classList.toggle('done',ok);e.querySelector('.mission-mark').textContent=ok?'✓':'◇';});$('mission-done').textContent=cs.filter(Boolean).length+'/3';
 for(const u of upgrades){let b=$('upgrades').querySelector(`[data-upgrade="${u.id}"]`),lvl=g.upgrade[u.id],c=upgradeCost(u);b.querySelector('.upgrade-level').textContent=`ур. ${lvl}/${u.max}`;b.querySelector('.upgrade-price').textContent=lvl>=u.max?'MAX':fmt(c);b.disabled=g.credits<c||lvl>=u.max;}
 $('pulse-cooldown').textContent=pulseCd>0?pulseCd.toFixed(1)+'с':'E · ГОТОВ';$('boost-cooldown').textContent=boostCd>0?boostCd.toFixed(1)+'с':'SHIFT · ГОТОВ';
 $('pulse-fill').style.transform=`scaleX(${clamp(1-pulseCd/13,0,1)})`;$('boost-fill').style.transform=`scaleX(${clamp(1-boostCd/6,0,1)})`;
 $('zoom-label').textContent=`РАЗМЕР ${player.r.toFixed(1)} · КАМЕРА ${camera.zoom<.01?camera.zoom.toExponential(2):camera.zoom.toFixed(2)}×`;
 $('btn-music').textContent=g.music?'♫':'♪̸';$('btn-music').setAttribute('aria-label',g.music?'Выключить музыку':'Включить музыку');const sx=Math.floor(player.x/CHUNK),sy=Math.floor(player.y/CHUNK);$('world-label').textContent=`${t.epoch.toUpperCase()} · НЕИЗВЕДАННАЯ ВСЕЛЕННАЯ`;$('world-subtitle').textContent=`СЕКТОР ${sx} : ${sy}  ·  ${BIOME_NAMES[chunkInfo(sx,sy).biome]}  ·  ОТКРЫТО ${fmt(exploredCount())}`;
 const stats=$('tester-stats');
 if(stats)stats.textContent=`${Math.round(frameFps)} FPS · ${lensBackend.toUpperCase()} · ${entities.length} объектов · ${loadedChunks.size} секторов · ${Math.floor(player.x/CHUNK)}:${Math.floor(player.y/CHUNK)}`;
 if(force)save();
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
 const d=rng();
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
  const dist=Math.hypot(cx,cy);e.material=materialFor(info.biome,dist,rng);
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
  const r=(i<4?65+Math.pow(rng(),.7)*370:18+rng()*118)*worldScale;
  const roll=rng(),material=biome==='anomaly'?(roll<.5?'exotic':'plasma'):
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
 ['#6ac9fa','#b5e6ff','#fff0bd'],['#9c80ff','#e1aeff','#fff3e5'],
 ['#ffb56c','#ffdeb8','#f6f0e0'],['#64e6d6','#9aafff','#e1fbf5'],
 ['#fd87b7','#fab3e5','#fff0bb'],['#e2e8fa','#a4bbda','#f5f9ff'],
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
 halo.addColorStop(.45,colors[1]+'31');halo.addColorStop(1,'#00000000');
 c.fillStyle=halo;c.globalAlpha=.52;c.fillRect(0,0,160,160);c.globalAlpha=1;
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
  const radius=(i%11===0?1.8:.5)+rng()*(style===6?1.0:1.5);
  c.globalAlpha=.40+rng()*.55;c.fillStyle=colors[(i+Math.floor(rng()*4))%3];
  c.beginPath();c.arc(x,y,radius,0,TAU);c.fill();
 }
 // Galactic bar, central bulge and luminous star clusters.
 if(style===1||style===5){c.globalAlpha=.3;c.strokeStyle=colors[1];c.lineWidth=4;
  c.beginPath();c.moveTo(-30,0);c.lineTo(30,0);c.stroke();}
 const nucleus=c.createRadialGradient(0,0,0,0,0,style===6?15:23);
 nucleus.addColorStop(0,'#fffef5');nucleus.addColorStop(.26,colors[2]+'ed');nucleus.addColorStop(1,colors[1]+'00');
 c.globalAlpha=.91;c.fillStyle=nucleus;c.beginPath();c.arc(0,0,style===6?15:23,0,TAU);c.fill();
 for(let i=0;i<165;i++){
  const angle=rng()*TAU,rr=Math.sqrt(rng())*67;
  const px=Math.cos(angle)*rr,py=Math.sin(angle)*rr*.72;
  const flicker=rng();c.globalAlpha=.22+flicker*.75;
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
 const colors=['#b5a69a','#899cbd','#cfad7b','#72c3c4','#c293a9','#c6d2df','#9bac87','#769bcc','#c58e79'];
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

function drawMacro(e,time,zoom,opacity=1){
 const x=(e.x-camera.x)*zoom+W*.5,y=(e.y-camera.y)*zoom+H*.5;
 const radius=e.r*zoom;
 if(radius<.65||e.r/player.r<.025)return false;
 if(x<-radius*1.6-10||x>W+radius*1.6+10||y<-radius*1.6-10||y>H+radius*1.6+10)return false;
 const drawR=Math.min(radius,Math.max(W,H)*2)*(e.absorbScale??1);
 // LOD fades must never turn a whole class of galaxies black.
 const fade=absorptionLight(e); // Preserve the previous ring image; fade only after full entry.
 ctx.save();ctx.globalAlpha=clamp(.67+radius*.018,.66,.97)*clamp(opacity,0,1)*fade*clamp((e.r/player.r-.025)/.025,0,1);
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
  const r=Math.max(30,Math.min(span*.34,span*(.09+rng()*.16)));
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
 const zoom=Math.max(1e-155,camera.zoom),core=blackHoleCoreWorldRadius();
 return core+Math.max(180,core*zoom*2.2)*(1+g.upgrade.gravity*.012)*tester.gravity/zoom;
}
function applyBlackHoleGravity(e,dt){
 if(e.freeFlight&&g.freeFlights[flightKey(e)])Object.assign(e,freeFlightAt(g.freeFlights[flightKey(e)]));
 const zoom=Math.max(1e-155,camera.zoom),dx=(player.x-e.x)*zoom,dy=(player.y-e.y)*zoom,d=Math.hypot(dx,dy);
 const core=blackHoleCoreWorldRadius(),touch=blackHoleTouchDistance(e,core)*zoom;
 const range=blackHoleGravityRadius()*zoom+touch-core*zoom;
 if(d>range){e.gravityBound=false;return !!e.freeFlight;}
 const strength=clamp(1-d/Math.max(1,range),0,1),acceleration=220*strength+1000*strength*strength;
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
 if(cosmicAbsorptions.length>=160)return;
 const core=g.endless?blackHoleCoreWorldRadius():player.r,gravity=g.endless?blackHoleGravityRadius():ordinaryGravityRadius(),view=cosmicVisibleLOD();
 const contacts=[];
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
 let budget=Math.min(60,Math.max(18,Math.round(18+Math.log2(1+core/MACRO_SIZE)*1.8)));
 for(const {e,bag,key,opacity} of contacts){
  if(budget<=0||cosmicAbsorptions.length>=160)break;
  if((bag[key]||0)&(1<<e.index)||absorbingMacroKeys.has(absorptionKey(e)))continue;
  if(opacity<.025)continue;
  // Attraction does not deplete a sector; wait until the whole body is inside.
  const body={...e,cosmic:true,captureBag:bag,captureKey:key,captureOpacity:opacity};
  body.gravityBound=true;body.vx=body.vy=0;
  absorbingMacroKeys.add(absorptionKey(body));cosmicAbsorptions.push(body);budget--;
 }
}
function promoteAbyssMatter(){
 if(!g.endless||!abyssPhysical.length||cosmicAbsorptions.length>=160)return;
 const view=cosmicVisibleLOD();let budget=24;
 for(const level of view.levels){
  const opacity=level===view.low?1-view.fraction:view.fraction;if(opacity<.025)continue;
  const stride=2**level,firstX=Math.floor(view.left/stride)*stride,firstY=Math.floor(view.top/stride)*stride;
  const columns=Math.min(36,Math.ceil((view.right-firstX)/stride)+1),rows=Math.min(28,Math.ceil((view.bottom-firstY)/stride)+1);
  for(let iy=0;iy<rows;iy++)for(let ix=0;ix<columns;ix++){
   const gx=firstX+ix*stride,gy=firstY+iy*stride,key=level===0?macroKey(gx,gy):`${level}:${gx}:${gy}`;
   if(level===0&&macroLoaded.has(key))continue;
   const bag=level===0?g.depletedMacro:g.depletedCosmic,mask=(bag[key]||0)>>>0;
   for(const e of (level===0?macroNodes(gx,gy):macroLODNodes(gx,gy,level))){
    if(budget<=0||cosmicAbsorptions.length>=160)return;
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
 const amount=value*(1+g.upgrade.harvest*.075)*tester.loot;
 g.matter=Math.min(1e290,g.matter+amount);g.total=Math.min(1e290,g.total+amount);
 g.stageCollects=Math.min(1e290,g.stageCollects+amount);
 g.credits=Math.min(1e290,g.credits+amount*.4);g.collects++;
 const resource=e.kind==='blackhole'||e.kind==='universe'?'exotic':(e.material||'gas');
 g.materials[resource]=(g.materials[resource]||0)+(resource==='exotic'?3:2);
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
  const e=spawn(px,py,kind,rng),material=materialFor(info.biome,Math.hypot(cx,cy),rng);
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
 e.absorbDuration=clamp(.85+Math.hypot(e.x-player.x,e.y-player.y)*camera.zoom/420,.85,1.6);
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
 const catalogue=[],names=['ЭРЕБ','НИКТА','БЕЗДНА','ЛЕВИАФАН','ГОЛИАФ','ХАОС'];
 for(let level=0;level<=80;level++){
  const rng=chunkRandom(seedHash(level+917,314159)^0x62b9d14f),base=ABYSS_BASE*ABYSS_STEP**level;
  const count=level===0?3:1+Math.floor(rng()*3),band=[];
  for(let i=0;i<count;i++){
   let h;
   for(let attempt=0;attempt<32;attempt++){
    const angle=rng()*TAU,distance=base*(18+rng()*39),r=base*(.65+rng()*1.25);
    h={x:Math.cos(angle)*distance,y:Math.sin(angle)*distance,r,level,id:`abyss:${level}:${i}`,
     name:names[Math.floor(rng()*names.length)]+' '+(level+1)+' · '+(i+1)};
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
 const amount=Math.min(1e280,Math.max(100,(g.matter+TA[g.tier].required)*Math.expm1(Math.log1p(ratio*ratio)/(2*.38))));
 g.abyssConsumed[h.id]=true;delete g.abyssPositions[h.id];
 g.matter=Math.min(1e290,g.matter+amount);g.total=Math.min(1e290,g.total+amount);
 g.stageCollects=Math.min(1e290,g.stageCollects+amount);g.credits=Math.min(1e290,g.credits+amount*.4);
 g.collects++;g.materials.exotic+=10;player.targetR=currentRadius();
 abyssVisual=abyssVisual.filter(b=>b.id!==h.id);abyssTimer=0;atlas.dirty=true;
 toast(`◉ ПОГЛОЩЕНА ${h.name} · +${fmt(amount)} МАТЕРИИ`);save();
}
function attractSmallerAbyss(h,dt){
 const saved=g.abyssPositions[h.id];if(saved)h={...h,x:saved[0],y:saved[1]};
 const core=blackHoleCoreWorldRadius(),dx=player.x-h.x,dy=player.y-h.y,d=Math.hypot(dx,dy);
 const range=blackHoleGravityRadius()+h.r;if(d>range)return;
 // Exact world radius: no minimum sprite size, no vanishing at first contact.
 const speed=Math.max(core*.55,160/Math.max(1e-155,camera.zoom))*(.3+.7*(1-clamp(d/range,0,1)));
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
 const influence=clamp((5-q)/4,0,1),v=speed*4.5*influence*influence;
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
 const notice=strongest?`⚠ ${strongest.name} · ГРАВИТАЦИОННЫЙ ЗАХВАТ · До горизонта ${atlasNumber(Math.max(0,Math.hypot(strongest.x-player.x,strongest.y-player.y)-strongest.r)/CHUNK)} сект. · Вход = потеря всего прогресса`:ahead?`⚠ ВПЕРЕДИ ${ahead.name} · До горизонта ${atlasNumber(Math.max(0,Math.hypot(ahead.x-player.x,ahead.y-player.y)-ahead.r)/CHUNK)} сект. · Смертельная чёрная дыра`:'';
 if(notice!==abyssNotice){abyssNotice=notice;warning.textContent=notice;warning.hidden=!notice;}
 return true;
}
function pullBodyIntoAbyss(e,dt){
 if(e.dead)return true;
 for(const h of abyssPhysical){
  if(g.abyssConsumed[h.id]||canEatAbyss(h))continue;
  const d=Math.hypot(h.x-e.x,h.y-e.y);if(d>h.r*5)continue;
  const zoom=Math.max(1e-155,camera.zoom),pull=abyssPull(h,e.x,e.y,180/zoom);
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
  if(p.x<30||p.y<100||p.x>W-30||p.y>H-130){
   const angle=Math.atan2(p.y-H/2,p.x-W/2),x=W/2+Math.cos(angle)*W*.36,y=H/2+Math.sin(angle)*H*.30;
   ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#d6a8b4';
   ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-7,-5);ctx.lineTo(-4,0);ctx.lineTo(-7,5);ctx.closePath();ctx.fill();ctx.restore();
   ctx.save();ctx.fillStyle='#c1a8b5';ctx.font='10px Inter,sans-serif';ctx.textAlign='center';ctx.fillText(h.name,x,y+20);ctx.restore();
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
function absorb(e){advanceHarvestChain();const mat=resourceOf(e);const val=Math.max(1,Math.round((g.endless?blackHoleBodyValue(e):player.r>radiusAt(6,0)?Math.min(e.value??Infinity,ordinaryBodyValue(e)):(e.value??ordinaryBodyValue(e)))*(1+g.upgrade.harvest*.075)*tester.loot));g.matter=Math.min(1e290,g.matter+val);g.total=Math.min(1e290,g.total+val);g.stageCollects=Math.min(1e290,g.stageCollects+val);g.collects++;if(g.endless)g.endlessGrowth=(g.endlessGrowth||0)+Math.log1p(val)*.0004;
 const gain=mat==='exotic'?3:mat==='plasma'?2:mat==='gas'?2:mat==='crystal'?2:1;
 g.materials[mat]=(g.materials[mat]||0)+gain;
 if(!g.endless&&(mat==='plasma'||mat==='exotic')&&player.r<CHUNK*4)burst(e.x,e.y,9,MATERIALS[mat].color,.7);
 let credits=e.kind==='relic'?Math.round(val*1.7):Math.max(1,Math.floor(val*.75));g.credits+=credits;if(e.kind==='relic'){g.materials.exotic=(g.materials.exotic||0)+1;g.stageRare++;g.rare++;if(!g.endless&&player.r<CHUNK*4)burst(e.x,e.y,22,'#f9d797',.9);pickupFeedback(val,true);}else if(!g.endless&&player.r<CHUNK*4&&Math.random()<.24){burst(e.x,e.y,4,MATERIALS[mat].color,.35);}
 // The current physical size reacts to each collected object, not just to a stage transition.
 player.targetR=currentRadius();
 if(e.kind!=='relic')pickupFeedback(val,false);if(!g.endless&&player.r<CHUNK*4&&g.particles&&Math.random()<.36)energyArcs.push({x:e.x,y:e.y,toX:player.x,toY:player.y,r:e.r,life:.24,max:.24,color:e.kind==='relic'?'#ffe7af':'#77dfff'});respawn(e);if(!g.complete&&g.matter>=TA[g.tier].required&&missionsDone())evolve();}
// Bodies larger than you stay in the universe; avoid them until you outgrow them.
function collideWithGiant(e,dx,dy,dist){
 if(g.tier===TA.length-1||player.shield>0)return;
 const ux=dx/(dist||1),uy=dy/(dist||1);
 player.x+=ux*3;player.y+=uy*3;player.vx+=ux*130;player.vy+=uy*130;
 player.shield=.9;shake=5;
 const lost=Math.ceil(Math.min(g.matter*.035,TA[g.tier].required*.009));
 g.matter=Math.max(0,g.matter-lost);g.losses++;
 popText(player.x,player.y-player.r,'СЛИШКОМ БОЛЬШОЙ','#ffaba9');
 sound(135,'triangle',.16,.022);
}
function impact(e){if(g.tier===TA.length-1){e.kind='matter';e.material='plasma';e.value=Math.max(15,e.value||0);absorb(e);return;}if(player.shield>0){respawn(e);return;}const reduction=Math.max(.15,1-g.upgrade.shield*.018),lost=Math.ceil(Math.min(g.matter*.09,TA[g.tier].required*.028)*reduction);g.matter=Math.max(0,g.matter-lost);g.losses++;player.shield=1.3;shake=14;burst(player.x,player.y,30,'#ff777a');popText(player.x,player.y,`−${lost} МАТЕРИИ`,'#ff9f9b');sound(112,'sawtooth',.3,.065);respawn(e);}
function evolve(){
 if(g.complete)return;
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
function activatePulse(){
 if(!running||pulseCd>0)return;pulseCd=13;g.pulses++;g.stagePulses++;
 const range=Math.max(270+g.upgrade.gravity*7,ordinaryGravityRadius()*1.25);
 shockwaves.push({x:player.x,y:player.y,r:player.r,max:1.2,life:1.2,color:'#84dfff',range});
 for(const e of [...entities,...macroEntities,...cosmicAbsorptions]){
  if(e.dead||e.absorbing||e.gathering)continue;
  const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);if(d>=range||!d)continue;
  if(e.kind==='hazard'){e.kind='matter';e.material='crystal';}
  const impulse=220/Math.min(1,Math.max(1e-155,camera.zoom))*(1-d/range)*Math.min(1,(player.r/e.r)**2);
  e.vx=(e.motionVX||0)+dx/d*impulse;e.vy=(e.motionVY||0)+dy/d*impulse;
  e.motionVX=e.vx;e.motionVY=e.vy;rememberFlight(e);
 }
 shake=5;toast('◉ ГРАВИТАЦИОННЫЙ ИМПУЛЬС');sound(245,'sine',.55,.055);renderUI();
}
function activateBoost(){if(!running||boostCd>0)return;boostCd=6;boostTime=1.15;player.shield=Math.max(player.shield,.7);burst(player.x,player.y,20,'#bd9bff');sound(440,'triangle',.23);}
// A finite field changes momentum; it does not attach a body to the player.
// driftBody/freeFlightAt already advanced the inertial position to this time.
function deflectResource(e,dt,range){
 const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy);
 const inside=d<range&&d>0;
 e.gravityBound=inside;
 if(!inside)return false;
 const q=clamp(1-d/range,0,1),acceleration=360/Math.min(1,Math.max(1e-155,camera.zoom))*q*q*Math.min(1,(player.r/e.r)**2);
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
 else if(stick.active){ax=stick.x;ay=stick.y;}
 else if(g.controlMode!=='keys'&&pointer.type==='mouse'&&pointer.active&&(pointer.down||g.controlMode==='follow')){
  const dx=pointer.x-W*.5,dy=pointer.y-H*.5,dist=Math.hypot(dx,dy);
  const strength=clamp((dist-18)/115,0,1);
  if(dist>0){ax=dx/dist*strength;ay=dy/dist*strength;}
 }
 player.targetR=currentRadius();
 player.r+=(player.targetR-player.r)*(1-Math.exp(-dt*4.5));
 const ordinarySpeed=(230+Math.min(190,g.upgrade.speed*5.2))*(1+Math.log2(1+player.r/25)*.38);
 // In the endless universe, movement must be based on *screen pixels*, not a
 // fixed count of world units. Previously the player became effectively
 // stationary once the camera zoom fell below 1e-12.
 const cosmicSpeed=player.r>CHUNK*5
  ? Math.min(1e290,Math.max(ordinarySpeed,140/Math.max(camera.zoom,1e-155)))
  : ordinarySpeed;
 const speed=tester.speed*cosmicSpeed*(boostTime>0?2.5:1);
 // Direct flight stops almost immediately; "smooth" gives optional controlled inertia.
 const response=g.flightFeel==='smooth'?(ax||ay?7:11):(ax||ay?23:34),lerp=1-Math.exp(-dt*response);
 player.vx+=(ax*speed-player.vx)*lerp;player.vy+=(ay*speed-player.vy)*lerp;
 const oldX=player.x,oldY=player.y;
 player.x+=player.vx*dt;player.y+=player.vy*dt;
 if(!updateAbysses(dt,speed,oldX,oldY))return;
 visitPosition();player.rotation+=dt*(.13+Math.hypot(player.vx,player.vy)/850);
 if(Math.hypot(player.vx,player.vy)>28&&Math.random()<dt*24){player.trail.push({x:player.x,y:player.y,r:player.r,life:.55});}
 player.trail.forEach(p=>p.life-=dt);player.trail=player.trail.filter(p=>p.life>0).slice(-30);
 let gravRange=ordinaryGravityRadius(),collectR=g.endless?blackHoleCoreWorldRadius():player.r+4;
 const giantMode=g.endless&&player.r>CHUNK*5;
 // Fixed collection rate, independent of render FPS or the number of bodies
 // touched by the enormous horizon. This prevents a thousand simultaneous
 // harvests and the audible/visual 'batch' stutter every streaming tick.
 absorptionTokens=giantMode?Math.min(12,absorptionTokens+dt*clamp(60+Math.log10(Math.max(1,player.r/CHUNK))*12,60,130)):0;
 const captureRadius=giantMode?blackHoleCoreWorldRadius():collectR;
 const nearReach=giantMode?captureRadius+MACRO_SIZE:gravRange;
 const nearReachSq=nearReach*nearReach;
 const nearbyObjects=entities.concat(macroEntities,g.endless?[]:cosmicAbsorptions);
 // Full deterministic update each frame. Previously only a rotating subset was
 // simulated; objects jumped when their turn in the queue arrived.
 for(const e of nearbyObjects){
  if(e.dead)continue;
  if(!e.absorbing&&!e.gathering&&(e.r/player.r<.025||e.r*camera.zoom<.65))continue;
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
   if(e.kind==='hazard'){e.kind='matter';e.material='crystal';absorb(e);}
   else if(!g.endless&&e.r>player.r*.82)collideWithGiant(e,dx,dy,dist);
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
 const zTarget=g.endless?clamp(tester.zoom*(83+27*Math.log2(1+horizonRadius/100))/Math.max(1,horizonRadius),1e-155,2.5):campaignZoom(horizonRadius);
 const zoomResponse=g.endless?2.4:2;
 const ratioZ=clamp(zTarget/Math.max(camera.zoom,1e-155),1e-10,1e10);
 camera.zoom*=Math.exp(Math.log(ratioZ)*(1-Math.exp(-dt*zoomResponse)));
 camera.x+=(player.x-camera.x)*(1-Math.exp(-dt*5));camera.y+=(player.y-camera.y)*(1-Math.exp(-dt*5));
 uiTimer+=dt;if(uiTimer>.3){uiTimer=0;renderUI();}
 if(saveTimer>12){saveTimer=0;save();}
}
function project(x,y){return {x:(x-camera.x)*camera.zoom+W/2,y:(y-camera.y)*camera.zoom+H/2};}
function blackHoleCoreWorldRadius(){
 const zoom=Math.max(1e-155,camera.zoom);
 // Account for the visual size cap: nothing should disappear outside the black disk.
 const paintedRadius=clamp(player.r*zoom,8,Math.max(W,H)*.54);
 return paintedRadius*BLACK_HOLE_CORE_FRACTION/zoom;
}
// True screen-size contact, including the minimum size of distant cached
// galaxy sprites. At extreme magnification ordinary world radii disagree
// with painted artwork, which previously made those galaxies untouchable.
function blackHoleTouchDistance(e,core=blackHoleCoreWorldRadius()){
 const zoom=Math.max(1e-155,camera.zoom);
 if(e.macro||e.cosmic){
  const spriteRadius=Math.min(e.r*zoom,Math.max(W,H)*2);
  // Collide with the *drawn* silhouette, even when a galaxy looks
  // larger than the player. A cap tied to core size made giant bodies
  // untouchable despite visibly overlapping the black horizon.
  return core+spriteRadius*(e.kind==='blackhole'?.90:1.12)/zoom;
 }
 return core+Math.max(.3,e.r*zoom)/zoom;
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
// Nebula gradients are expensive on large displays. Paint them once per era/resize.
function ensureSkyLayer(){
 if(skyLayer&&skyLayerEpoch===g.tier)return;
 skyLayer=document.createElement('canvas');
 // Low resolution is sufficient for blurred gas clouds.
 skyLayer.width=Math.max(1,Math.round(W*.50));skyLayer.height=Math.max(1,Math.round(H*.50));
 const c=skyLayer.getContext('2d');c.scale(skyLayer.width/W,skyLayer.height/H);
 let epoch=g.tier,bg=c.createLinearGradient(0,0,W,H);
 bg.addColorStop(0,epoch>=22?'#09071b':'#040b1c');
 bg.addColorStop(.55,epoch>=19?'#0e0a29':'#090c24');bg.addColorStop(1,'#02040d');
 c.fillStyle=bg;c.fillRect(0,0,W,H);
 for(const n of nebula){
  const grad=c.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r);
  grad.addColorStop(0,`hsla(${n.h+(epoch%6)*7},95%,56%,${n.a})`);
  grad.addColorStop(.55,`hsla(${n.h},88%,43%,${n.a*.35})`);
  grad.addColorStop(1,`hsla(${n.h},88%,43%,0)`);
  c.fillStyle=grad;c.beginPath();c.arc(n.x,n.y,n.r,0,TAU);c.fill();
 }
 skyLayerEpoch=epoch;
}
let skyCameraX=camera.x,skyCameraY=camera.y;
function sky(t){
 // Integrate screen-space motion; raw world-coordinate modulo becomes random
 // at astronomical scales and makes the entire starfield sparkle/jump.
 const skyDX=clamp((camera.x-skyCameraX)*camera.zoom,-W,W);
 const skyDY=clamp((camera.y-skyCameraY)*camera.zoom,-H,H);
 skyCameraX=camera.x;skyCameraY=camera.y;
 ensureSkyLayer();ctx.drawImage(skyLayer,0,0,W,H);
 for(const s of stars){
  const x=s.x=((s.x-skyDX*s.depth*.25)%W+W)%W,y=s.y=((s.y-skyDY*s.depth*.25)%H+H)%H;
  const alpha=s.alpha*(g.endless?.8:(.68+.32*Math.sin(t*.65+s.phase)));
  ctx.fillStyle=`rgba(183,210,255,${alpha})`;
  if(s.r<1.1)ctx.fillRect(x,y,1.4,1.4);else{ctx.beginPath();ctx.arc(x,y,s.r,0,TAU);ctx.fill();}
 }
}
function paintRock(x,y,r,color,spin=0,craters=5){ctx.save();ctx.translate(x,y);ctx.rotate(spin);ctx.beginPath();for(let k=0;k<11;k++){let a=k/11*TAU,R=r*(.85+.09*Math.sin(k*4.17+spin));if(k===0)ctx.moveTo(Math.cos(a)*R,Math.sin(a)*R);else ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);}ctx.closePath();let grad=ctx.createRadialGradient(-r*.4,-r*.5,1,0,0,r*1.1);grad.addColorStop(0,'#dce8fa');grad.addColorStop(.25,color);grad.addColorStop(1,'#384058');ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle='rgba(188,211,238,.48)';ctx.lineWidth=1.2;ctx.stroke();for(let j=0;j<craters;j++){const a=j*2.4+spin*.1,R=r*(.15+.38*((j*7)%5)/5),cr=r*(.07+(j%3)*.03);ctx.fillStyle='rgba(27,35,64,.27)';ctx.beginPath();ctx.arc(Math.cos(a)*R,Math.sin(a)*R,cr,0,TAU);ctx.fill();}ctx.restore();}
function paintPlanet(x,y,r,color,gas=false){ctx.save();const gr=ctx.createRadialGradient(x-r*.38,y-r*.45,1,x,y,r*1.1);gr.addColorStop(0,'#edfbff');gr.addColorStop(.23,color);gr.addColorStop(.75,color);gr.addColorStop(1,'#1b2a59');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.clip();for(let k=0;k<5;k++){ctx.beginPath();ctx.ellipse(x+Math.sin(k*3.2)*r*.45,y-r*.75+k*r*.37,r*1.2,r*(gas?.12:.10),-.12,0,TAU);ctx.fillStyle=gas?'rgba(241,218,194,.20)':'rgba(120,239,220,.2)';ctx.fill();}ctx.restore();}
function paintStar(x,y,r,color){ctx.save();let halo=ctx.createRadialGradient(x,y,r*.25,x,y,r*2.6);halo.addColorStop(0,cssColor(color,.35));halo.addColorStop(.4,cssColor(color,.17));halo.addColorStop(1,cssColor(color,0));ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*2.6,0,TAU);ctx.fill();ctx.shadowColor=color;ctx.shadowBlur=r*1.3;let gr=ctx.createRadialGradient(x-r*.23,y-r*.25,0,x,y,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(.33,'#fff8c8');gr.addColorStop(.75,color);gr.addColorStop(1,cssColor(color,.65));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();}
function paintGalaxy(x,y,r,color,time){ctx.save();ctx.translate(x,y);ctx.rotate(time*.035);const glow=ctx.createRadialGradient(0,0,1,0,0,r*1.7);glow.addColorStop(0,cssColor(color,.22));glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,r*1.7,0,TAU);ctx.fill();for(let arm=0;arm<3;arm++){ctx.beginPath();for(let n=0;n<75;n++){let d=n/75*r*1.24,a=arm*TAU/3+n*.075;let xx=Math.cos(a)*d,yy=Math.sin(a)*d*.58;if(n===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.strokeStyle=cssColor(color,.38);ctx.lineWidth=Math.max(1,r*.13);ctx.lineCap='round';ctx.stroke();for(let n=0;n<29;n++){let d=(n+3)/32*r*1.1,a=arm*TAU/3+n*.18;ctx.fillStyle=n%4?'rgba(200,219,255,.65)':'#ffffff';ctx.beginPath();ctx.arc(Math.cos(a)*d,Math.sin(a)*d*.58,Math.max(.6,r*.025),0,TAU);ctx.fill();}}glowDot(0,0,r*.2,'#f9e8ff',1.2);ctx.restore();}
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
 if(!gl){gpuLensUnavailable=true;console.warn('Cosmic Evolution: WebGL unavailable, using Canvas lens');return null;}
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
  const lensScale=Math.min(dpr,1.5)*Math.max(.7,performanceScale);
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
 }catch(error){gpuLensUnavailable=true;gpuLens=null;console.warn('Cosmic Evolution: Canvas lens fallback',error.message);return false;}
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
function renderBlackHoleLensing(){
 if(g.tier!==TA.length-1)return;
 const p=project(player.x,player.y),R=clamp(player.r*camera.zoom,8,Math.max(W,H)*.54);
 // The Einstein ring stays proportional to the actual black horizon.
 const outer=Math.min(R*2.30,Math.max(W,H)*.85);
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
 const scale=Math.min(1,qualityTarget/Math.max(width,height));
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
function paintBlackHole(x,y,r,time){
 const R=clamp(r,8,Math.max(W,H)*.54),core=R*BLACK_HOLE_CORE_FRACTION;
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
  if(tier===1||tier===2){ctx.fillStyle='#d8f5ff';ctx.beginPath();ctx.moveTo(x-r*1.15,y);ctx.lineTo(x-r*.22,y-r*.26);ctx.lineTo(x-r*.22,y+r*.26);ctx.fill();}
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
  if(tier===19){ctx.globalAlpha=.6;paintGalaxy(x,y,r*1.38,t.color,time);ctx.globalAlpha=1;glowDot(x,y,r*.2,'#fff7ff');}
  else if(tier===20){for(let i=0;i<13;i++){let a=i*2.399+phase;let R=Math.sqrt(i/13)*r*1.1;glowDot(x+Math.cos(a)*R,y+Math.sin(a)*R,r*(i%3===0?.18:.1),i%2?'#ffe6b7':t.color,.32);}glowDot(x,y,r*.18,'#ffffff');}
  else if(tier===21){paintStar(x,y,r*.46,'#ffedbb');ctx.strokeStyle=cssColor(t.color,.6);for(let i=1;i<=3;i++){ctx.beginPath();ctx.ellipse(x,y,r*(.55+i*.36),r*(.32+i*.17),-.3,0,TAU);ctx.stroke();let a=phase*(1.3/i)+i;glowDot(x+Math.cos(a)*r*(.55+i*.36),y+Math.sin(a)*r*(.32+i*.17),Math.max(2,r*.07),i===1?'#8befff':'#edc9ff',.4);}}
  else if(tier===22){ctx.globalAlpha=.65;paintGalaxy(x,y,r*.83,t.color,time);ctx.globalAlpha=1;}
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
  case 1: strokePath([[-r*2.2,r*.5],[-r*1.45,r*.2],[-r*.72,0]],'#8ce9ff',r*.19);spark(-1.2,r*1.05,r*.25,'#effaff');break;
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
      ctx.globalAlpha*=.37;for(let i=0;i<4;i++){const x=Math.cos(i*TAU/4)*r*.45,y=Math.sin(i*TAU/4)*r*.45;
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
 const t=TA[g.tier],p=project(player.x,player.y),r=Math.min(player.r*camera.zoom,Math.max(W,H)*.54);ctx.save();
 for(const tr of (g.endless?[]:player.trail)){let q=project(tr.x,tr.y),alpha=tr.life/.55;ctx.fillStyle=cssColor(t.color,alpha*.1);ctx.beginPath();ctx.arc(q.x,q.y,Math.min(Math.max(W,H)*3,tr.r*camera.zoom*(.45+alpha*.3)),0,TAU);ctx.fill();}
 // Gravity field ring and orbiting shards.
 let range=Math.min(ordinaryGravityRadius()*camera.zoom,Math.max(W,H)*3);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(player.rotation*.18);if(!g.endless){ctx.strokeStyle=cssColor(t.color,.11);ctx.lineWidth=1.2;ctx.setLineDash([3,9]);ctx.beginPath();ctx.arc(0,0,range,0,TAU);ctx.stroke();ctx.setLineDash([]);}
 let count=g.endless?0:Math.min(18,3+Math.floor(g.tier/2));for(let i=0;i<count;i++){let a=player.rotation*(i%2?1:-1)*(0.65+(i%4)*.08)+i*TAU/count,R=r*(1.8+(i%3)*.24),xx=Math.cos(a)*R,yy=Math.sin(a)*R*.65;ctx.fillStyle=i%3?'#96baf8':'#ffdcaa';ctx.beginPath();ctx.arc(xx,yy,i%5===0?2.6:1.5,0,TAU);ctx.fill();}ctx.restore();
 if(morph&&!g.endless){let f=clamp(morph.time/morph.duration,0,1);ctx.save();ctx.globalAlpha=(1-f)*.94;paintPlayerForm(p.x,p.y,r*(1.12-f*.12),time,morph.from);ctx.restore();ctx.save();ctx.globalAlpha=Math.min(1,f*1.65);paintPlayerForm(p.x,p.y,r*(.52+f*.48),time);ctx.restore();}else paintPlayerForm(p.x,p.y,r,time);
 // Swirling energy currents and magnetic filaments.
 if(g.particles&&!g.endless){ctx.save();ctx.globalAlpha=.18+.10*Math.sin(time*1.5);ctx.strokeStyle=t.color;ctx.lineWidth=1.2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(p.x,p.y,r*(1.7+i*.27),time*.55+i*1.9,time*.55+i*1.9+1.65);ctx.stroke();}ctx.restore();}
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
function render(time){
 // The public Canvas retains the previous complete frame throughout every
 // expensive readback, galaxy repaint, and lensing pass.
 ctx=frameCtx;
 ctx.setTransform(dpr,0,0,dpr,0,0);
 // Restore the compositing baseline every frame; otherwise a previous
 // effect can accidentally carry semi-transparency onto the next frame.
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 sky(time);
 ctx.save();renderDistantBodies();renderMacroField(time);ctx.restore();
 ctx.save();
 if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));
 ctx.save();
 for(const e of entities)renderEntity(e,time);
 ctx.restore();
 // A temporary Canvas readback failure must not abort this frame before
 // drawing the opaque horizon. Keep the lens optional, not the black hole.
 if(time>=blackHoleLensRetryAt){
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
  const r=clamp(player.r*camera.zoom,8,Math.max(W,H)*.54);
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  paintBlackHole(p.x,p.y,r,time);
  ctx.restore();
 }
 renderAbysses();renderWaypoint();
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
 if(!running&&now-idleLast<70)return;idleLast=now;
 const elapsed=clamp((now-last)/1000,.001,.08);last=now;
 if(running){
  update(Math.min(elapsed,.05));
  perfSample+=elapsed;perfFrames++;
  if(perfSample>=1.5){
   frameFps=perfFrames/perfSample;
   // Recreating the primary Canvas resets all pixels, producing a visible
   // on/off pulse on the largest black hole. Leave its output resolution stable
   // and adjust only the CPU fallback lens resolution on heavier frames.
   if(frameFps<42&&performanceScale>.55)performanceScale=Math.max(.55,performanceScale-.1);
   else if(frameFps>58&&performanceScale<1)performanceScale=Math.min(1,performanceScale+.05);
   perfSample=0;perfFrames=0;
  }
 }
 render(now/1000);
 if(atlasVisible&&atlas.dirty)drawAtlas();
}
requestAnimationFrame(frame);
function show(html){clearFlightInput();atlasVisible=false;$('modal').innerHTML=`<div class="modal-card">${html}</div>`;$('modal').classList.remove('off');running=false;save();}
function continueButton(label='ПРОДОЛЖИТЬ'){return `<button class="primary-button" id="btn-continue">${label} <span>→</span></button>`;}
function attachContinue(){const b=$('btn-continue');if(b)b.onclick=()=>{clearFlightInput();atlasVisible=false;running=true;startMusic();$('modal').classList.add('off');last=performance.now();};}
// The atlas reads the exact same deterministic sector data as gameplay; it is not an evolution-level menu.
function popcount32(x){x=x>>>0;x=x-((x>>>1)&0x55555555);x=(x&0x33333333)+((x>>>2)&0x33333333);return (((x+(x>>>4))&0x0F0F0F0F)*0x01010101)>>>24;}
function atlasScale(){return 27*atlas.zoom/CHUNK;}
function atlasNumber(value){
 const n=Math.abs(value);
 if(n>=1e7||n>0&&n<.001)return value.toExponential(2).replace('e+',' × 10^').replace('e-',' × 10^-');
 return value.toLocaleString('ru-RU',{maximumFractionDigits:n<1?3:n<100?1:0});
}
function atlasNiceDistance(value){
 const power=10**Math.floor(Math.log10(Math.max(1e-155,value))),fraction=value/power;
 return (fraction>=5?5:fraction>=2?2:1)*power;
}
function atlasFitZoom(w,h){
 return clamp(Math.min(w/W,h/H)*.72*camera.zoom*CHUNK/27,1e-155,12);
}
function atlasFitPlayer(){
 const bounds=$('atlas-canvas').getBoundingClientRect();
 atlas.x=player.x;atlas.y=player.y;atlas.zoom=atlasFitZoom(bounds.width,bounds.height);atlas.dirty=true;
}
function changeAtlasZoom(factor,anchorX,anchorY){
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
 const id=g.nextPinId++,pin={id,x,y,zoom:clamp(zoom,1e-155,12),name:`Метка ${id}`};
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
 for(const pin of g.mapPins){const option=document.createElement('option');option.value=String(pin.id);option.textContent=pin.name;list.append(option);}
 list.value=g.activePin?String(g.activePin):'';
 const pin=g.mapPins.find(p=>p.id===g.activePin);
 $('atlas-pin-name').value=pin?.name||'';$('atlas-pin-name').disabled=!pin;
 $('atlas-pin-go').disabled=!pin;$('atlas-pin-delete').disabled=!pin;
 $('atlas-pin-add').setAttribute('aria-pressed',String(!!atlas.placingPin));
 $('atlas-pin-hint').textContent=atlas.placingPin?'Нажми на карту, чтобы поставить метку.':'Метки сохраняются. Нажми на метку, чтобы выбрать её; на дыру — чтобы приблизить.';
 $('atlas-canvas').style.cursor=atlas.placingPin?'crosshair':'grab';
}
function atlasMapClick(px,py){
 const bounds=$('atlas-canvas').getBoundingClientRect(),scale=atlasScale();
 if(atlas.placingPin){
  const pin=addMapPin(atlas.x+(px-bounds.width/2)/scale,atlas.y+(py-bounds.height/2)/scale);
  if(!pin)toast('На карте уже 64 метки');
  atlas.placingPin=false;refreshPinPanel();atlas.dirty=true;return;
 }
 const pin=g.mapPins.find(p=>Math.hypot(bounds.width/2+(p.x-atlas.x)*scale-px,bounds.height/2+(p.y-atlas.y)*scale-py)<14);
 if(pin){g.activePin=pin.id;save();refreshPinPanel();atlas.dirty=true;return;}
 const marker=atlasAbyssMarkers(atlas.x,atlas.y,bounds.width,bounds.height,scale).find(m=>Math.hypot(m.x-px,m.y-py)<Math.max(12,m.r));
 if(marker)atlasFocusHoles(marker.bodies);
}
function drawMapPins(c,w,h,scale){
 for(const pin of g.mapPins){
  const x=w/2+(pin.x-atlas.x)*scale,y=h/2+(pin.y-atlas.y)*scale;
  if(x<0||y<0||x>w||y>h)continue;
  c.save();c.strokeStyle=pin.id===g.activePin?'#e7dfb4':'#93b6c2';c.fillStyle='#111c28';c.lineWidth=1.5;
  c.beginPath();c.moveTo(x,y-6);c.lineTo(x+5,y);c.lineTo(x,y+6);c.lineTo(x-5,y);c.closePath();c.fill();c.stroke();
  c.fillStyle=pin.id===g.activePin?'#e7dfb4':'#afc6d1';c.font='11px Inter,sans-serif';c.textAlign=x>w-150?'right':'left';
  c.fillText(pin.name,x+(x>w-150?-10:10),clamp(y-9,13,h-13));c.restore();
 }
}
function renderWaypoint(){
 const pin=g.mapPins.find(p=>p.id===g.activePin);if(!pin)return;
 const p=project(pin.x,pin.y),angle=Math.atan2(p.y-H/2,p.x-W/2);
 const outside=p.x<40||p.y<110||p.x>W-40||p.y>H-130;
 const x=outside?W/2+Math.cos(angle)*W*.38:p.x,y=outside?H/2+Math.sin(angle)*H*.32:p.y;
 ctx.save();ctx.strokeStyle='#d2c99b';ctx.fillStyle='#d2c99b';ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+4,y);ctx.lineTo(x,y+5);ctx.lineTo(x-4,y);ctx.closePath();ctx.stroke();
 ctx.font='10px Inter,sans-serif';ctx.textAlign='center';ctx.fillText(pin.name+' · '+atlasNumber(Math.hypot(pin.x-player.x,pin.y-player.y)/CHUNK)+' сект.',x,y+19);ctx.restore();
}
function drawAtlas(){
 const surface=$('atlas-canvas');if(!surface)return;
 const bounds=surface.getBoundingClientRect();if(bounds.width<10)return;
 const w=Math.round(bounds.width),h=Math.round(bounds.height),pixelRatio=Math.min(devicePixelRatio||1,1.5);
 if(surface.width!==Math.floor(w*pixelRatio)||surface.height!==Math.floor(h*pixelRatio)){surface.width=Math.floor(w*pixelRatio);surface.height=Math.floor(h*pixelRatio);}
 const c=surface.getContext('2d'),scale=atlasScale();
 const projectMap=(x,y)=>({x:w/2+(x-atlas.x)*scale,y:h/2+(y-atlas.y)*scale});
 c.setTransform(pixelRatio,0,0,pixelRatio,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
 c.fillStyle='#050b17';c.fillRect(0,0,w,h);
 // Exploration footprints stay in their real world coordinates at every scale.
 c.fillStyle='rgba(40,124,153,.18)';
 for(const d of g.discoveryDiscs){
  const q=projectMap(d[0]*CHUNK,d[1]*CHUNK),r=d[2]*CHUNK*scale;
  if(q.x+r<0||q.x-r>w||q.y+r<0||q.y-r>h)continue;
  if(r>Math.hypot(w,h)+Math.hypot(q.x-w/2,q.y-h/2)){c.fillRect(0,0,w,h);continue;}
  c.beginPath();c.arc(q.x,q.y,r,0,TAU);c.fill();
 }
 const sectorPx=CHUNK*scale;
 c.fillStyle='rgba(70,174,194,.35)';
 for(const key of visitedChunks){
  const comma=key.indexOf(','),cx=Number(key.slice(0,comma)),cy=Number(key.slice(comma+1));
  const p=projectMap(cx*CHUNK,cy*CHUNK);
  if(p.x+sectorPx<0||p.y+sectorPx<0||p.x>w||p.y>h)continue;
  c.fillRect(p.x,p.y,Math.max(1,sectorPx),Math.max(1,sectorPx));
 }
 // Adaptive grid uses fixed world units and bounded local loop counters.
 const gridWorld=atlasNiceDistance(105/scale/CHUNK)*CHUNK,gridPx=gridWorld*scale;
 const gridX=Math.floor((atlas.x-w/2/scale)/gridWorld),gridY=Math.floor((atlas.y-h/2/scale)/gridWorld);
 c.strokeStyle='rgba(114,172,204,.13)';c.lineWidth=1;c.beginPath();
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
 const mapPlayer=projectMap(player.x,player.y),labelRects=[{x:mapPlayer.x-8,y:mapPlayer.y-21,w:65,h:26}];
 for(const marker of atlasAbyssMarkers(atlas.x,atlas.y,w,h,scale)){
  const {x,y,r,bodies}=marker,h0=bodies[0];
  if(r>=4)paintAbyss(c,x,y,r,w,h);
  else {c.fillStyle='#010205';c.strokeStyle='#a2b3c4';c.lineWidth=1;c.beginPath();c.arc(x,y,3,0,TAU);c.fill();c.stroke();}
  const label=bodies.length>1?`ДЫРЫ: ${bodies.length} · ПРИБЛИЗИТЬ`:h0.name+(canEatAbyss(h0)?' · МОЖНО ПОГЛОТИТЬ':'');
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
  if(placement){const {x:tx,y:ty}=placement;labelRects.push(placement);c.fillStyle='#dce6ee';c.fillText(label,tx,ty);
   if(detail){c.font='9px Inter,sans-serif';c.fillStyle='#ab8588';c.fillText(`ГОРИЗОНТ ${atlasNumber(h0.r*2/CHUNK)} сект.`,tx,ty+13);}
  }
 }
 const playerPoint=projectMap(player.x,player.y);
 // Both the event horizon and gravity field are drawn at their TRUE map size.
 const bodyRadius=(g.endless?blackHoleCoreWorldRadius():player.r)*scale;
 const gravityRadius=(g.endless?blackHoleGravityRadius():ordinaryGravityRadius())*scale;
 if(gravityRadius<Math.max(w,h)*20){
  c.strokeStyle='rgba(173,145,255,.65)';c.lineWidth=1;c.setLineDash([5,6]);
  c.beginPath();c.arc(playerPoint.x,playerPoint.y,gravityRadius,0,TAU);c.stroke();c.setLineDash([]);
 }
 if(bodyRadius<Math.max(w,h)*20){
  c.fillStyle=g.endless?'#010205':'#9ce9ff';c.strokeStyle='#9ce9ff';c.lineWidth=1.5;
  c.beginPath();c.arc(playerPoint.x,playerPoint.y,bodyRadius,0,TAU);c.fill();c.stroke();
 }
 // The rectangular frame is the actual camera footprint, not a fixed inset.
 const viewCenter=projectMap(camera.x,camera.y),viewW=W/camera.zoom*scale,viewH=H/camera.zoom*scale;
 c.strokeStyle='rgba(132,224,242,.8)';c.lineWidth=1;c.strokeRect(viewCenter.x-viewW/2,viewCenter.y-viewH/2,viewW,viewH);
 if(playerPoint.x>=0&&playerPoint.y>=0&&playerPoint.x<=w&&playerPoint.y<=h){
  c.fillStyle='#f1f8ff';c.beginPath();c.arc(playerPoint.x,playerPoint.y,2.5,0,TAU);c.fill();
  c.font='600 10px Inter,sans-serif';c.fillText('ТЫ',playerPoint.x+Math.max(9,bodyRadius+7),playerPoint.y-5);
 }
 const origin=projectMap(0,0);
 if(Math.hypot(origin.x-playerPoint.x,origin.y-playerPoint.y)>35&&origin.x>15&&origin.y>15&&origin.x<w-70&&origin.y<h-20){
  c.strokeStyle='#9caebf';c.beginPath();c.arc(origin.x,origin.y,4,0,TAU);c.stroke();
  c.fillStyle='#91a5b9';c.font='10px Inter,sans-serif';c.fillText('НАЧАЛО',origin.x+9,origin.y-7);
 }
 drawMapPins(c,w,h,scale);
 // Always-readable scale bar, in real sectors (not invented light-years).
 const barSectors=atlasNiceDistance(Math.min(150,w*.28)/sectorPx),barPx=barSectors*sectorPx;
 c.fillStyle='rgba(4,11,23,.94)';c.fillRect(12,h-59,Math.max(172,barPx+32),47);
 c.strokeStyle='#d0eaf5';c.lineWidth=2;c.beginPath();c.moveTo(24,h-24);c.lineTo(24+barPx,h-24);
 c.moveTo(24,h-29);c.lineTo(24,h-19);c.moveTo(24+barPx,h-29);c.lineTo(24+barPx,h-19);c.stroke();
 c.fillStyle='#c6e3f0';c.font='600 11px Inter,sans-serif';c.fillText(`${atlasNumber(barSectors)} сект.`,24,h-38);
 $('atlas-diameter').textContent=atlasNumber((g.endless?blackHoleCoreWorldRadius():player.r)*2/CHUNK)+' сект.';
 $('atlas-viewport').textContent=atlasNumber(W/camera.zoom/CHUNK)+' сект.';
 $('atlas-span').textContent=atlasNumber(w/scale/CHUNK)+' сект.';
 $('atlas-coords').textContent=`X ${atlasNumber(atlas.x/CHUNK)} · Y ${atlasNumber(atlas.y/CHUNK)}`;
 $('atlas-count').textContent=`Исследовано ≈ ${atlasNumber(exploredCount())} секторов`;
 atlas.dirty=false;
}
function showMap(){
 atlas={x:player.x,y:player.y,zoom:1,drag:false,lastX:0,lastY:0,dirty:true};
 show(`<div class="atlas-top"><div><div class="eyebrow">ГАЛАКТИЧЕСКАЯ НАВИГАЦИЯ</div><div class="overlay-title">МАСШТАБ ВСЕЛЕННОЙ</div></div><span class="atlas-north">N ↑</span></div>
 <div class="atlas-measures"><div><small>${g.endless?'ДИАМЕТР ГОРИЗОНТА':'ТВОЙ ДИАМЕТР'}</small><strong id="atlas-diameter"></strong></div><div><small>ШИРИНА ИГРОВОГО ЭКРАНА</small><strong id="atlas-viewport"></strong></div><div><small>ШИРИНА КАРТЫ</small><strong id="atlas-span"></strong></div></div>
 <div class="atlas-danger-bar"><span id="atlas-threat"></span><button id="atlas-abyss" class="secondary-button">ОБЗОР ГИГАНТОВ ↗</button></div>
 <div class="atlas-pins"><button id="atlas-pin-add" class="secondary-button" aria-pressed="false">＋ МЕТКА</button><select id="atlas-pin-list" aria-label="Метки на карте"></select><input id="atlas-pin-name" aria-label="Название метки" maxlength="32" placeholder="Название метки"><button id="atlas-pin-go" class="secondary-button">К МЕТКЕ</button><button id="atlas-pin-delete" class="secondary-button" aria-label="Удалить выбранную метку">УДАЛИТЬ</button></div><div id="atlas-pin-hint" class="atlas-pin-hint" aria-live="polite"></div>
 <div class="atlas-stats"><span id="atlas-count"></span><span id="atlas-coords"></span></div>
 <div class="atlas-wrap"><canvas id="atlas-canvas" aria-label="Карта Вселенной: реальный масштаб, горизонт событий и видимая область"></canvas><div class="atlas-controls"><button id="atlas-zoom-in" class="atlas-control" title="Приблизить" aria-label="Приблизить карту">+</button><button id="atlas-zoom-out" class="atlas-control" title="Отдалить" aria-label="Отдалить карту">−</button><button id="atlas-center" class="atlas-control center" title="Мой масштаб" aria-label="Мой масштаб">⌖</button></div></div>
 <div class="atlas-legend"><span><i class="atlas-mark you"></i>ГОРИЗОНТ / ТВОЙ РАЗМЕР</span><span class="gravity-key">◌ ПРИТЯЖЕНИЕ</span><span>▭ ИГРОВОЙ ЭКРАН</span><span><i class="atlas-mark known"></i>ИЗУЧЕНО</span><span>✦ ГАЛАКТИКИ</span><span class="abyss-key">◉ МЕНЬШЕ ТЕБЯ — ДОБЫЧА · БОЛЬШЕ — ОПАСНОСТЬ</span></div>
 <div class="atlas-footer"><small>Перетаскивай карту · Колёсико / + / − — масштаб · ⌖ — вернуться к своему размеру. Все расстояния — в секторах мира.</small>${continueButton('ВЕРНУТЬСЯ В КОСМОС')}</div>`);
 $('modal').firstElementChild.classList.add('atlas-card');atlasVisible=true;attachContinue();
 const cv=$('atlas-canvas');cv.style.touchAction='none';atlasFitPlayer();
 cv.addEventListener('pointerdown',ev=>{atlas.drag=true;atlas.moved=false;atlas.downX=atlas.lastX=ev.clientX;atlas.downY=atlas.lastY=ev.clientY;cv.setPointerCapture(ev.pointerId);});
 cv.addEventListener('pointermove',ev=>{if(!atlas.drag)return;if(Math.hypot(ev.clientX-atlas.downX,ev.clientY-atlas.downY)>6)atlas.moved=true;if(atlas.placingPin||!atlas.moved)return;const scale=atlasScale();atlas.x-=(ev.clientX-atlas.lastX)/scale;atlas.y-=(ev.clientY-atlas.lastY)/scale;atlas.lastX=ev.clientX;atlas.lastY=ev.clientY;atlas.dirty=true;});
 cv.addEventListener('pointerup',ev=>{if(atlas.drag&&!atlas.moved){const box=cv.getBoundingClientRect();atlasMapClick(ev.clientX-box.left,ev.clientY-box.top);}atlas.drag=false;});cv.addEventListener('pointercancel',()=>atlas.drag=false);
 cv.addEventListener('wheel',ev=>{ev.preventDefault();const box=cv.getBoundingClientRect();changeAtlasZoom(Math.exp(-clamp(ev.deltaY,-300,300)*.002),ev.clientX-box.left,ev.clientY-box.top);},{passive:false});
 $('atlas-zoom-in').onclick=()=>changeAtlasZoom(1.4);
 $('atlas-zoom-out').onclick=()=>changeAtlasZoom(1/1.4);
 $('atlas-center').onclick=atlasFitPlayer;
 $('atlas-abyss').onclick=atlasShowAbyss;
 $('atlas-pin-add').onclick=()=>{atlas.placingPin=!atlas.placingPin;refreshPinPanel();};
 $('atlas-pin-list').onchange=ev=>{g.activePin=Number(ev.target.value)||null;save();refreshPinPanel();atlas.dirty=true;};
 $('atlas-pin-name').onchange=ev=>{const p=g.mapPins.find(p=>p.id===g.activePin);if(p){p.name=ev.target.value.trim().slice(0,32)||`Метка ${p.id}`;save();refreshPinPanel();atlas.dirty=true;}};
 $('atlas-pin-delete').onclick=()=>{removeMapPin(g.activePin);refreshPinPanel();atlas.dirty=true;};
 $('atlas-pin-go').onclick=()=>{const p=g.mapPins.find(p=>p.id===g.activePin);if(p){atlas.x=p.x;atlas.y=p.y;atlas.zoom=p.zoom;atlas.dirty=true;}};
 refreshPinPanel();
 const giant=nearestAbyss();
 $('atlas-threat').textContent=giant?`${giant.name} · диаметр ${atlasNumber(giant.r*2/CHUNK)} сект. · в ${atlasNumber(giant.r/(g.endless?blackHoleCoreWorldRadius():player.r))} раз больше тебя. За горизонтом весь прогресс теряется.`:'За горизонтом сверхмассивной дыры весь прогресс теряется.';
 requestAnimationFrame(drawAtlas);
}

function showPause(){show(`<div class="hero-kicker">ПУТЕШЕСТВИЕ ПРИОСТАНОВЛЕНО</div><div class="overlay-title">ПАУЗА</div><p class="overlay-copy">Твоё место во Вселенной сохранено. Материя и улучшения останутся с тобой.</p><div class="stat-list"><div><strong>${fmt(g.total)}</strong><small>Всего материи</small></div><div><strong>${timeFmt(g.time)}</strong><small>Игровое время</small></div><div><strong>${g.collects}</strong><small>Поглощено объектов</small></div><div><strong>${g.rare}</strong><small>Реликвий найдено</small></div></div><div class="modal-actions">${continueButton()}<button id="pause-map" class="secondary-button">Карта</button></div>`);attachContinue();$('pause-map').onclick=showMap;}
function showSettings(){show(`<div class="eyebrow">ПАРАМЕТРЫ ПОЛЁТА</div><div class="overlay-title">НАСТРОЙКИ</div><div class="settings-line"><span>Управление мышью</span><select id="set-control-mode"><option value="hold" ${g.controlMode==='hold'?'selected':''}>Зажать кнопку и направлять</option><option value="follow" ${g.controlMode==='follow'?'selected':''}>Следовать за курсором</option><option value="keys" ${g.controlMode==='keys'?'selected':''}>Только клавиатура</option></select></div><div class="settings-line"><span>Отклик движения</span><select id="set-flight-feel"><option value="direct" ${g.flightFeel==='direct'?'selected':''}>Точный, без инерции</option><option value="smooth" ${g.flightFeel==='smooth'?'selected':''}>Плавный, с инерцией</option></select></div><p class="overlay-copy" style="text-align:left">WASD / стрелки — точное движение. По умолчанию объект плавно следует за курсором без нажатия. WASD — точное движение, на телефоне — джойстик. E — необязательный импульс, Shift — рывок.</p><div class="settings-line"><span>Кинематографичная космическая музыка</span><input id="set-music" type="checkbox" ${g.music?'checked':''}></div><div class="settings-line"><span>Громкость музыки</span><input id="set-music-volume" type="range" min="0" max="100" value="${Math.round(g.musicVolume*100)}" aria-label="Громкость музыки"></div><p class="overlay-copy" style="text-align:left">Оригинальный саундтрек: медленное органное звучание и пространственный эмбиент. Музыка запускается после нажатия «Играть».</p><div class="settings-line"><span>Звуковые эффекты</span><input id="set-sound" type="checkbox" ${g.sound?'checked':''}></div><div class="settings-line"><span>Частицы и вспышки</span><input id="set-particles" type="checkbox" ${g.particles?'checked':''}></div><div class="settings-line"><span>Качество эффектов</span><select id="set-quality"><option value="1" ${g.quality===1?'selected':''}>Высокое</option><option value="0.5" ${g.quality===.5?'selected':''}>Экономное</option></select></div><p class="overlay-copy" style="text-align:left">M — карта, P — пауза. Схема управления сохраняется между запусками.</p><div class="modal-actions">${continueButton('СОХРАНИТЬ И ИГРАТЬ')}<button class="secondary-button" id="btn-new-universe">НОВАЯ ИГРА</button></div>`);attachContinue();$('btn-new-universe').onclick=restartCampaign;$('set-control-mode').onchange=e=>{g.controlMode=e.target.value;clearFlightInput();save();};$('set-flight-feel').onchange=e=>{g.flightFeel=e.target.value;save();};$('set-music').onchange=e=>{g.music=e.target.checked;initAudio();setMusicVolume();save();};$('set-music-volume').oninput=e=>{g.musicVolume=+e.target.value/100;setMusicVolume();save();};$('set-sound').onchange=e=>{g.sound=e.target.checked;save();};$('set-particles').onchange=e=>{g.particles=e.target.checked;save();};$('set-quality').onchange=e=>{g.quality=Number(e.target.value);performanceScale=1;applyResolution();save();};}
function resetCampaignState(resetModifiers=false){
 const preferences={sound:g.sound,music:g.music,musicVolume:g.musicVolume,quality:g.quality,particles:g.particles,controlMode:g.controlMode,flightFeel:g.flightFeel};
 cosmicAbsorptions.length=0;absorbingMacroKeys.clear();
 const next=fresh();Object.assign(g,next,preferences);visitedChunks.clear();loadedChunks.clear();distantChunkCache.clear();macroLoaded.clear();macroCache.clear();macroLODCache.clear();if(macroBackdrop){macroBackdrop.canvas.width=0;macroBackdrop.canvas.height=0;macroBackdrop=null;}if(macroBackdropOld){macroBackdropOld.canvas.width=0;macroBackdropOld=null;}macroEntities=[];entities=[];
 if(resetModifiers&&TEST_MODE){Object.assign(tester,TEST_DEFAULTS);saveTester();}
 player.x=0;player.y=0;player.vx=player.vy=0;player.r=player.targetR=radiusAt(0,0);lastReveal={x:Infinity,y:Infinity,r:-Infinity};
 player.trail=[];camera.x=camera.y=0;camera.zoom=1;particles=[];shockwaves=[];energyArcs=[];texts=[];
 harvestChain=0;harvestChainTime=0;screenFlash=0;morph=null;running=false;abyssTimer=0;abyssPhysical=[];abyssVisual=[];abyssNotice='';$('abyss-warning').hidden=true;clearFlightInput();pulseCd=boostCd=boostTime=0;visitPosition();streamField();save();renderUI(true);testerRefresh();testerToggle(false);
}
function dieInAbyss(h){
 const mass=fmt(g.total),duration=timeFmt(g.time);
 resetCampaignState(false);
 // Save the reset immediately: reload cannot restore the lost run.
 save();
 show(`<div class="eyebrow">ГОРИЗОНТ ПЕРЕСЕЧЁН</div><div class="overlay-title">ПОГЛОЩЁН БЕЗДНОЙ</div><p class="overlay-copy">${h.name} поглотила тебя. Вся материя, улучшения, формы эволюции и исследованная карта этого прохождения потеряны.</p><div class="stat-list"><div><strong>${mass}</strong><small>Потеряно материи</small></div><div><strong>${duration}</strong><small>Длительность прохождения</small></div></div><p class="overlay-copy">Новая Вселенная начинается с космической пыли.</p>${continueButton('НАЧАТЬ С НУЛЯ')}`);
 attachContinue();
}
function restartCampaign(){
 if(!confirm('Начать новую Вселенную? Текущий прогресс будет сохранён в резервной копии.'))return;
 try{localStorage.setItem(SAVE_KEY+'-backup',localStorage.getItem(SAVE_KEY)||'');}catch(_){}
 resetCampaignState(true);running=true;
 $('modal').classList.add('off');toast('Новая Вселенная создана · предыдущий прогресс сохранён');
}

function testerRefresh(){
 const panel=$('tester-panel');if(!panel)return;
 $('tester-tier').value=String(g.tier);
 $('tester-credits').value=String(Math.round(g.credits));
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
 camera.zoom=g.endless?clamp(tester.zoom*(83+27*Math.log2(1+player.r/100))/Math.max(1,player.r),1e-155,2.5):campaignZoom(player.r);
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
  visitPosition();testerRemakeNearby();renderUI(true);toast('Перемещение в новый сектор (тест)');};
 $('tester-abyss').onclick=testerVisitAbyss;
 $('tester-reset-mods').onclick=()=>{
  Object.assign(tester,TEST_DEFAULTS);saveTester();testerRemakeNearby();testerRefresh();
  toast('Тестовые множители сброшены');};
 $('tester-new-game').onclick=restartCampaign;
 $('tester-copy-save').onclick=()=>{
  if(!confirm('Скопировать основное прохождение в тестерское? Текущий тестовый прогресс будет заменён.'))return;
  try{const data=localStorage.getItem('cosmic-evolution-save-v1');if(!data){toast('Основное сохранение не найдено');return;}localStorage.setItem(SAVE_KEY,data);location.reload();}
  catch(_){toast('Не удалось скопировать сохранение');}
 };
 $('btn-new-game').onclick=restartCampaign;
}
function panelValue(key,v){
 const label=document.querySelector(`#tester-panel [data-test-value="${key}"]`);
 if(label)label.textContent=key==='density'?`${v}/32`:`${v}×`;
}
testerInit();
$('btn-new-game').onclick=restartCampaign;
function showFinal(){show(`<div class="hero-kicker">28 / 28 ФОРМ ОТКРЫТО</div><div class="overlay-title">БЕСКОНЕЧНАЯ ЧЁРНАЯ ДЫРА</div><p class="overlay-copy">От одинокой частицы до бесконечного космоса. Теперь горизонт событий растёт бесконечно.</p><div class="stat-list"><div><strong>${timeFmt(g.time)}</strong><small>Время прохождения</small></div><div><strong>${fmt(g.total)}</strong><small>Поглощено материи</small></div><div><strong>${fmt(g.collects)}</strong><small>Космических объектов</small></div><div><strong>${g.rare}</strong><small>Найдено реликвий</small></div></div><p class="overlay-copy">Поглощай материю и продолжай увеличиваться без предела!</p><div class="modal-actions"><button class="primary-button" id="btn-endless">ИССЛЕДОВАТЬ ДАЛЬШЕ →</button><button class="secondary-button" id="btn-new-universe">НОВАЯ ИГРА</button></div>`);$('btn-endless').onclick=()=>{g.complete=true;g.endless=true;running=true;save();startMusic();$('modal').classList.add('off');last=performance.now();toast('∞ БЕСКОНЕЧНОЕ ИССЛЕДОВАНИЕ');};$('btn-new-universe').onclick=restartCampaign;}
$('btn-start').onclick=()=>{running=true;startMusic();$('modal').classList.add('off');last=performance.now();if(!g.time)toast('✦ ИССЛЕДУЙ КОСМОС · ПОГЛОЩАЙ МАТЕРИЮ');};if(g.time>10)$('btn-start').innerHTML='ПРОДОЛЖИТЬ ПУТЕШЕСТВИЕ <span>→</span>';
$('btn-music').onclick=()=>{g.music=!g.music;initAudio();setMusicVolume();renderUI(true);};$('btn-map').onclick=showMap;$('btn-pause').onclick=()=>running?showPause():(running=true,$('modal').classList.add('off'));$('btn-settings').onclick=showSettings;
$('btn-pulse').onclick=activatePulse;$('btn-boost').onclick=activateBoost;
$('btn-sidebar').onclick=()=>{if(W<=800){$('sidebar').classList.remove('mobile-open')}else $('sidebar').classList.add('collapsed');$('btn-show-sidebar').classList.remove('hidden');};
$('btn-show-sidebar').onclick=()=>{if(W<=800)$('sidebar').classList.add('mobile-open');else $('sidebar').classList.remove('collapsed');$('btn-show-sidebar').classList.add('hidden');};
if(W<=800)$('btn-show-sidebar').classList.remove('hidden');
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointermove',e=>{
 if(e.pointerType!=='mouse')return;
 if(pointer.down&&e.pointerId!==pointer.id)return;
 pointer.x=e.clientX;pointer.y=e.clientY;pointer.type='mouse';
 pointer.active=pointer.down||g.controlMode==='follow';updateFlightMarker();
});
canvas.addEventListener('pointerdown',e=>{
 if(!running||e.button!==0)return;
 if(e.pointerType!=='mouse')return; // Mobile uses the dedicated joystick.
 pointer.down=true;pointer.active=true;pointer.id=e.pointerId;pointer.type='mouse';pointer.x=e.clientX;pointer.y=e.clientY;
 try{canvas.setPointerCapture(e.pointerId);}catch(_){}updateFlightMarker();
});
const releaseMouse=e=>{if(e.pointerId!==pointer.id)return;pointer.down=false;pointer.id=null;pointer.active=g.controlMode==='follow';updateFlightMarker();};
canvas.addEventListener('pointerup',releaseMouse);
canvas.addEventListener('pointercancel',releaseMouse);
canvas.addEventListener('lostpointercapture',releaseMouse);
canvas.addEventListener('pointerleave',()=>{if(!pointer.down){pointer.active=false;updateFlightMarker();}});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();
 if(k==='f2'&&TEST_MODE){e.preventDefault();testerToggle();return;}
 if(e.target instanceof HTMLElement&&e.target.closest('input, select, textarea'))return;
 if(['arrowup','arrowleft','arrowright','arrowdown',' '].includes(k))e.preventDefault();keys.add(k);if(!e.repeat){if(k==='e')activatePulse();if(k==='shift'||k===' ')activateBoost();if(k==='p'||k==='escape'){if(running)showPause();else{running=true;$('modal').classList.add('off');}}if(k==='m')showMap();}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{keys.clear();clearFlightInput();if(running)showPause();});
addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden){save();if(running)showPause();}});
renderUI();
// Developer-friendly deterministic smoke checks may inspect this read-only snapshot.
Object.defineProperty(window,'CosmicEvolutionDebug',{get:()=>({tier:g.tier,matter:g.matter,playerRadius:player.r,targetRadius:player.targetR,cameraZoom:camera.zoom,total:g.total,credits:g.credits,elapsed:g.time,objects:entities.length,particles:particles.length,playerX:player.x,playerY:player.y,loadedSectors:loadedChunks.size,visitedSectors:exploredCount(),visitedExactSectors:visitedChunks.size,visitedDiscs:g.discoveryDiscs.length,depletedSectors:Object.keys(g.depleted).length,music:g.music,running,progress:g.matter/TA[g.tier].required,forms:TA.length,renderTicks,fps:Math.round(frameFps),renderScale:performanceScale,controlMode:g.controlMode,flightFeel:g.flightFeel,stickActive:stick.active,mouseDown:pointer.down,velocityX:player.vx,velocityY:player.vy,mission:missionReq(),tester:TEST_MODE?{...tester}:null,testMode:TEST_MODE,farSectors:distantChunkCache.size,nearbyCollected:g.collects,activeSoundSources:pickupCount,macroPositions:macroEntities.slice(0,5).map(e=>[e.chunk,e.index,e.x,e.y]),visibleSectorQuota:sectorQuota(chunkInfo(Math.floor(player.x/CHUNK),Math.floor(player.y/CHUNK)),Math.floor(player.x/CHUNK),Math.floor(player.y/CHUNK)),lensBackend,absorbingGalaxies:cosmicAbsorptions.length,macroVisible:macroVisibleCount,macroActive:macroEntities.length,macroHoles:macroEntities.filter(e=>e.kind==='blackhole').length,galaxyPalettes:GALAXY_PALETTES.length,macroDepleted:Object.keys(g.depletedMacro).length,cosmicDepleted:Object.keys(g.depletedCosmic).length,cosmicHarvestTimer,complete:g.complete,endless:g.endless,baseRadius:radiusAt(g.tier,0),endlessRadiusMultiplier:g.tier===TA.length-1?currentRadius()/radiusAt(g.tier,0):1,atlasZoom:atlas.zoom,materials:{...g.materials},recipe:stageRecipe(),stageExplored:g.stageExplored})});
})();
