/* Cosmic Evolution — dependency-free 2D Canvas game. No 3D / external game engines. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('universe');
let ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
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
const TEST_DEFAULTS = Object.freeze({speed:1,gravity:1,loot:1,zoom:1,density:16,showStats:true});
let tester={...TEST_DEFAULTS};
try {
 const savedTester=JSON.parse(localStorage.getItem(TEST_KEY)||'null');
 if(TEST_MODE&&savedTester&&typeof savedTester==='object')for(const k in TEST_DEFAULTS)
  if(typeof savedTester[k]===typeof TEST_DEFAULTS[k])tester[k]=savedTester[k];
 if(TEST_MODE&&savedTester&&!savedTester.densityBalanceV&&tester.density===32)tester.density=16;
}catch(_){}
function saveTester(){try{localStorage.setItem(TEST_KEY,JSON.stringify({...tester,densityBalanceV:2}));}catch(_){}}

const fresh = () => ({version:1,tier:0,matter:0,credits:0,total:0,time:0,collects:0,rare:0,pulses:0,losses:0,unlocks:0,stageCollects:0,stageRare:0,stagePulses:0,upgrade:{gravity:0,speed:0,harvest:0,shield:0},sound:true,particles:true,quality:1,music:true,musicVolume:.30,controlMode:'follow',flightFeel:'smooth',controlV:2,worldX:0,worldY:0,complete:false,endless:false,visited:[],discoveryDiscs:[],exploredBonus:0,endlessGrowth:0,depleted:{},depletedMacro:{},depletedCosmic:{},stageExplored:0,materials:{ore:0,crystal:0,ice:0,gas:0,plasma:0,exotic:0},rebalanceV:3});
let g = fresh();
try {const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
 if(s&&s.version===1&&Number.isFinite(s.tier)&&s.tier>=0&&s.tier<TA.length){
  g={...fresh(),...s,upgrade:{...fresh().upgrade,...s.upgrade},visited:Array.isArray(s.visited)?s.visited:[],discoveryDiscs:Array.isArray(s.discoveryDiscs)?s.discoveryDiscs.filter(d=>Array.isArray(d)&&d.length===3&&d.every(Number.isFinite)):[],exploredBonus:Number.isFinite(s.exploredBonus)?s.exploredBonus:0,depleted:s.depleted&&typeof s.depleted==='object'?s.depleted:{},depletedMacro:s.depletedMacro&&typeof s.depletedMacro==='object'?s.depletedMacro:{},depletedCosmic:s.depletedCosmic&&typeof s.depletedCosmic==='object'?s.depletedCosmic:{},materials:{...fresh().materials,...s.materials}};
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
let W=innerWidth,H=innerHeight,dpr=1,last=performance.now(),running=false,uiTimer=0,saveTimer=0,eventTimer=0;
// Physical size is continuous across all stages, including save/load and evolution.
// Stage boundaries are continuous: end of tier N equals start of tier N+1.
function stageFraction(){return clamp(g.matter/TA[g.tier].required,0,1);}
function radiusAt(tier,fraction){return 13*Math.pow(1.125,tier+clamp(fraction,0,1));}
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
const savedZoom=g.endless?clamp(tester.zoom*(83+27*Math.log2(1+initialRadius/100))/Math.max(1,initialRadius),1e-155,2.5):1;
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
 canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
}
function resize(){W=innerWidth;H=innerHeight;applyResolution();makeSky();}

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
 $('epoch-name').textContent=t.epoch.toUpperCase();$('tier-title').textContent=t.name;$('tier-desc').textContent=t.desc;
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
 if(stats)stats.textContent=`${Math.round(frameFps)} FPS · ${entities.length} объектов · ${loadedChunks.size} секторов · ${Math.floor(player.x/CHUNK)}:${Math.floor(player.y/CHUNK)}`;
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
 if(added>0&&g.stageExplored%20<added)toast(`◈ Исследовано ${fmt(exploredCount())} секторов`);
}
function markHarvested(e){
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
  if((mask&(1<<i))!==0||i>=sectorQuota(info,cx,cy))continue;
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
  entities.push(e);
 }
}
// Cosmic-scale deposits live on their own immutable coordinate grid. A depleted
// world is never recreated, even after a save/load or zoom transition.
function macroKey(cx,cy){return `${cx}:${cy}`;}
function macroNodes(cx,cy){
 const key=macroKey(cx,cy);let saved=macroCache.get(key);if(saved)return saved;
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
   index:i,chunk:key,macro:true,material:blackhole?'exotic':material,kind:blackhole?'blackhole':'matter',holeType,
   grade:18,value:Math.round(12+Math.pow(r/25,1.6)*(blackhole?16:7)),vx:0,vy:0,
   spin:rng()*TAU,twinkle:rng()*TAU,primed:false,dead:false,
   shape:Math.floor(rng()*3),style,palette,hue:230});
 }
 if(macroCache.size>=850){
  const stale=macroCache.keys();for(let i=0;i<96;i++)macroCache.delete(stale.next().value);
 }
 macroCache.set(key,saved);return saved;
}
function streamMacroBodies(){
 if(g.tier<13){macroEntities=[];macroLoaded.clear();return;}
 const cx0=Math.floor(player.x/MACRO_SIZE),cy0=Math.floor(player.y/MACRO_SIZE),active=new Set();
 for(let cy=cy0-2;cy<=cy0+2;cy++)for(let cx=cx0-2;cx<=cx0+2;cx++){
  const key=macroKey(cx,cy);active.add(key);
  if(macroLoaded.has(key))continue;
  macroLoaded.add(key);
  const depleted=(g.depletedMacro[key]||0)>>>0;
  for(const e of macroNodes(cx,cy))if(!(depleted&(1<<e.index)))macroEntities.push({...e});
 }
 for(const key of macroLoaded)if(!active.has(key))macroLoaded.delete(key);
 macroEntities=macroEntities.filter(e=>!e.dead&&(active.has(e.chunk)||e.absorbing));
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

function drawMacro(e,time,zoom,opacity=1){
 const x=(e.x-camera.x)*zoom+W*.5,y=(e.y-camera.y)*zoom+H*.5;
 const radius=e.r*zoom;
 if(x<-radius*1.6-10||x>W+radius*1.6+10||y<-radius*1.6-10||y>H+radius*1.6+10)return false;
 const drawR=clamp(radius*1.15,1.8,112);
 // LOD fades must never turn a whole class of galaxies black.
 const fade=e.absorbing?clamp(1-e.absorbing/.26,0,1):1;
 ctx.save();ctx.globalAlpha=clamp(.67+radius*.018,.66,.97)*clamp(opacity,0,1)*fade;
 if(e.kind==='blackhole'){
  if(drawR<3){ctx.fillStyle=['#69c9ed','#cda1f9','#ffcc8e'][e.holeType||0];ctx.fillRect(x-1,y-1,2,2);}
  else {const cv=blackHoleSprite(e.holeType||0);ctx.drawImage(cv,x-drawR*2,y-drawR*2,drawR*4,drawR*4);}
 }else if(drawR<3){ctx.fillStyle=GALAXY_PALETTES[(e.palette||0)%9][0];ctx.fillRect(x-1.2,y-1.2,2.4,2.4);}
 else {const cv=cosmicSprite(e.material,e.shape,e.style||0,e.palette||0);
  ctx.drawImage(cv,x-drawR*1.4,y-drawR*1.4,drawR*2.8,drawR*2.8);
 }
 ctx.restore();return true;
}
// Stable world-space LOD: ALL sampling anchors to the global origin (0,0).
// Older screen-relative steps made distant galaxies jump whenever a boundary
// or camera zoom changed. Fade across two fixed power-of-two resolutions.
const macroLODCache=new Map();let cosmicHarvestTimer=0,cosmicSceneDirty=false,cosmicNextRedraw=0;
function macroLODNodes(gx,gy,level){
 const key=level+':'+gx+':'+gy;
 let nodes=macroLODCache.get(key);if(nodes)return nodes;
 const stride=2**level;
 const seed=seedHash(gx*37+level*103,gy*71-level*47),rng=chunkRandom(seed);
 const span=MACRO_SIZE*stride;
 const anchorX=(gx+rng()*stride)*MACRO_SIZE,anchorY=(gy+rng()*stride)*MACRO_SIZE;
 nodes=[];const count=2+(seed%4);
 for(let j=0;j<count;j++){
  const a=rng()*TAU,dist=(j===0?0:(.10+.32*rng())*span);
  const rx=anchorX+Math.cos(a)*dist,ry=anchorY+Math.sin(a)*dist;
  const sub=seedHash(gx+j*113,gy-j*191);
  const shape=(sub>>>4)%3,style=(sub>>>7)%8,palette=(sub>>>19)%9;
  const hole=j===0&&(sub%17===0),isUniverse=j===1&&sub%31===0,holeType=(sub>>>13)%3;
  const r=Math.max(30,Math.min(span*.34,span*(.09+rng()*.16)));
  nodes.push({x:rx,y:ry,r,style,palette,shape,holeType,material:hole||isUniverse?'exotic':'gas',kind:hole?'blackhole':isUniverse?'universe':'matter',cosmic:true,level,gx,gy,index:j});
 }
 if(macroLODCache.size>=1400){
  const stale=macroLODCache.keys();for(let i=0;i<220;i++)macroLODCache.delete(stale.next().value);
 }
 macroLODCache.set(key,nodes);return nodes;
}
// Cosmic LOD objects are interactable, even when their sprites come from the
// cached far-field. Harvested identities persist; no giant per-frame physics.
function cosmicLODLevel(){
 const zoom=Math.max(1e-155,camera.zoom);
 const horizontal=Math.ceil(W/(MACRO_SIZE*zoom))+3;
 const vertical=Math.ceil(H/(MACRO_SIZE*zoom))+3;
 return clamp(Math.log2(Math.max(1,Math.sqrt(horizontal*vertical/135))),0,496);
}
// Rendering and harvesting always sample exactly the same world-space LOD.
// Prior versions only harvested a subset of the crossfaded levels and ignored
// level-zero bodies outside the local 5x5 simulation bubble.
function cosmicVisibleLOD(referenceWidth=W,referenceHeight=H){
 const zoom=Math.max(1e-155,camera.zoom);
 const left=Math.floor((camera.x-W*.5/zoom)/MACRO_SIZE)-1;
 const right=Math.ceil((camera.x+W*.5/zoom)/MACRO_SIZE)+1;
 const top=Math.floor((camera.y-H*.5/zoom)/MACRO_SIZE)-1;
 const bottom=Math.ceil((camera.y+H*.5/zoom)/MACRO_SIZE)+1;
 const refCountX=Math.ceil(referenceWidth/(MACRO_SIZE*zoom))+3;
 const refCountY=Math.ceil(referenceHeight/(MACRO_SIZE*zoom))+3;
 const lod=clamp(Math.log2(Math.max(1,Math.sqrt(refCountX*refCountY/135))),0,496);
 const low=Math.floor(lod),fraction=lod-low;
 return {left,right,top,bottom,low,fraction,levels:fraction>.018&&low<496?[low,low+1]:[low]};
}
function harvestCosmicLOD(dt){
 if(!g.endless||g.tier!==TA.length-1)return;
 cosmicHarvestTimer+=dt;
 if(cosmicHarvestTimer<.075)return;
 cosmicHarvestTimer=0;
 const core=blackHoleCoreWorldRadius(),view=cosmicVisibleLOD();
 const contacts=[];
 // All visible LOD proxies are physical: accept an object when its rendered
 // silhouette touches the black horizon, even at extreme camera zoom.
 for(const level of view.levels){
  const stride=2**level,span=MACRO_SIZE*stride;
  const px=Math.floor(player.x/span),py=Math.floor(player.y/span);
  const extent=Math.min(32,Math.ceil(core/span)+3);
  for(let cy=py-extent;cy<=py+extent;cy++)for(let cx=px-extent;cx<=px+extent;cx++){
   const gx=cx*stride,gy=cy*stride;
   const key=level===0?macroKey(gx,gy):`${level}:${gx}:${gy}`;
   if(level===0&&macroLoaded.has(key))continue;
   const bag=level===0?g.depletedMacro:g.depletedCosmic;
   const mask=(bag[key]||0)>>>0;
   for(const e of (level===0?macroNodes(gx,gy):macroLODNodes(gx,gy,level))){
    if(mask&(1<<e.index))continue;
    const dx=player.x-e.x,dy=player.y-e.y;
    const touch=blackHoleTouchDistance(e,core);
    if(Math.abs(dx)>touch||Math.abs(dy)>touch)continue;
    const d2=dx*dx+dy*dy;
    if(d2<=touch*touch)contacts.push({e,bag,key,d2});
   }
  }
 }
 // Old row-major budget repeatedly ate distant cells while nearby galaxies
 // appeared immune. Closest-first prevents this at supermassive scales.
 contacts.sort((a,b)=>a.d2-b.d2);
 let budget=Math.min(60,Math.max(18,Math.round(18+Math.log2(1+core/MACRO_SIZE)*1.8))),changed=false;
 for(const {e,bag,key} of contacts){
  if(budget<=0)break;
  const mask=(bag[key]||0)>>>0;
  if(mask&(1<<e.index))continue;
  bag[key]=(mask|(1<<e.index))>>>0;
  budget--;changed=true;
  const value=Math.min(1e280,Math.max(100,e.value||Math.pow(1+e.r/100,1.45)*40));
  const amount=value*(1+g.upgrade.harvest*.075)*tester.loot;
  g.matter=Math.min(1e290,g.matter+amount);
  g.total=Math.min(1e290,g.total+amount);
  g.stageCollects=Math.min(1e290,g.stageCollects+amount);
  g.credits=Math.min(1e290,g.credits+amount*.4);g.collects++;
  const resource=e.kind==='blackhole'||e.kind==='universe'?'exotic':(e.material||'gas');
  g.materials[resource]=(g.materials[resource]||0)+(resource==='exotic'?3:2);
  g.endlessGrowth=(g.endlessGrowth||0)+Math.log1p(amount)*.0008;
 }
 if(changed){player.targetR=currentRadius();cosmicSceneDirty=true;}
}
function renderMacroBackground(time,referenceWidth=W,referenceHeight=H){
 macroVisibleCount=0;if(g.tier<13)return;
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
     if(mask&(1<<e.index))continue;
     if(drawMacro(e,time,zoom,opacity))macroVisibleCount++;
    }
   }else{
    // Cache the exact same world-anchored proxies; rendering does not
    // reroll their RNG every frame or create thousands of temporary objects.
    const used=(g.depletedCosmic[level+':'+gx+':'+gy]||0)>>>0;
    for(const proxy of macroLODNodes(gx,gy,level)){
     if(used&(1<<proxy.index))continue;
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
let macroBackdrop=null,macroBackdropOld=null,macroFadeStart=0;
function renderMacroField(time){
 macroVisibleCount=0;
 if(g.tier<13)return;
 const worldZoom=Math.max(1e-155,camera.zoom),nearCenter=macroKey(Math.floor(player.x/MACRO_SIZE),Math.floor(player.y/MACRO_SIZE));
 const ratio=macroBackdrop?worldZoom/macroBackdrop.zoom:1;
 let x=0,y=0,ww=0,hh=0;
 if(macroBackdrop){
  ww=macroBackdrop.canvas.width*ratio;hh=macroBackdrop.canvas.height*ratio;
  x=W/2+(macroBackdrop.x-camera.x)*worldZoom-ww/2;
  y=H/2+(macroBackdrop.y-camera.y)*worldZoom-hh/2;
 }
 const refresh=(cosmicSceneDirty&&time>=cosmicNextRedraw)||!macroBackdrop||macroBackdrop.tier!==g.tier||macroBackdrop.width!==W||macroBackdrop.height!==H||
   ratio<.91||ratio>1.12||x>0||y>0||x+ww<W||y+hh<H||
   (macroBackdrop.nearCenter!==nearCenter&&macroBackdrop.level===0);
 if(refresh){
  const realCtx=ctx,realW=W,realH=H;
  const canvas=document.createElement('canvas');
  // 60% surplus scenery around each side. Panning remains pixel-accurate.
  canvas.width=Math.ceil(W*1.62);canvas.height=Math.ceil(H*1.62);
  try{
   ctx=canvas.getContext('2d',{alpha:true});
   W=canvas.width;H=canvas.height;
   ctx.setTransform(1,0,0,1,0,0);
   renderMacroBackground(time,realW,realH);
  }finally{ctx=realCtx;W=realW;H=realH;}
  // Blend new geometry over the previous world-anchored buffer. This avoids
  // galaxies popping in/out during a change of LOD or camera magnification.
  if(macroBackdropOld){macroBackdropOld.canvas.width=0;macroBackdropOld.canvas.height=0;macroBackdropOld=null;}
  macroBackdropOld=macroBackdrop;macroFadeStart=time;
  cosmicSceneDirty=false;cosmicNextRedraw=time+.65;macroBackdrop={canvas,x:camera.x,y:camera.y,zoom:worldZoom,width:W,height:H,
   nearCenter,level:Math.floor(clamp(Math.log2(Math.max(1,Math.sqrt((W/(MACRO_SIZE*worldZoom))*(H/(MACRO_SIZE*worldZoom))/135))),0,496))};
  x=(W-canvas.width)/2;y=(H-canvas.height)/2;ww=canvas.width;hh=canvas.height;
 }
 if(macroBackdropOld){
  const elapsed=time-macroFadeStart;
  if(elapsed<.40){
   const old=macroBackdropOld,r=worldZoom/old.zoom;
   const ow=old.canvas.width*r,oh=old.canvas.height*r;
   const ox=W*.5+(old.x-camera.x)*worldZoom-ow*.5;
   const oy=H*.5+(old.y-camera.y)*worldZoom-oh*.5;
   // Keep the outgoing backdrop at full brightness while fading in the new one.
   // Fading both caused a visible dark pulse on every buffer refresh.
   ctx.save();ctx.globalAlpha=1;
   ctx.drawImage(old.canvas,ox,oy,ow,oh);ctx.restore();
  }else{macroBackdropOld.canvas.width=0;macroBackdropOld.canvas.height=0;macroBackdropOld=null;}
 }
 ctx.save();ctx.globalAlpha=macroBackdropOld?clamp((time-macroFadeStart)/.40,0,1):1;
 // Standard alpha blending avoids over-bright flashes on cache refresh.
 ctx.drawImage(macroBackdrop.canvas,x,y,ww,hh);ctx.restore();
 const zoom=Math.max(1e-155,camera.zoom);
 for(const e of macroEntities)if(drawMacro(e,time,zoom,1))macroVisibleCount++;
}
function streamField(){
 // Physics and individual sprites exist only around the player. The far field uses stars/nebulae.
 // This prevents 4K zoom-outs from loading thousands of gradient/shadow draw calls.
 const cx0=Math.floor(player.x/CHUNK),cy0=Math.floor(player.y/CHUNK);
 const zoom=Math.max(.12,camera.zoom);
 const radius=clamp(Math.ceil(Math.max(W,H)/(2*CHUNK*zoom))+1,4,W*H>2500000?7:8);
 const left=cx0-radius,right=cx0+radius,top=cy0-radius,bottom=cy0+radius;
 const active=new Set();for(let cy=top;cy<=bottom;cy++)for(let cx=left;cx<=right;cx++){
  const k=chunkKey(cx,cy);active.add(k);makeChunk(cx,cy);
 }
 for(const k of loadedChunks)if(!active.has(k))loadedChunks.delete(k);
 entities=entities.filter(e=>!e.dead&&active.has(e.chunk));
 streamMacroBodies();
}
// Render world-anchored low-cost proxies outside the physics bubble. Unlike
// decorative stars these exactly sample the same 32 deterministic sector bodies.
// A harvested body never reappears, even in this low-detail distant view.
function distantSamples(cx,cy){
 const key=chunkKey(cx,cy);
 let result=distantChunkCache.get(key);if(result)return result;
 const info=chunkInfo(cx,cy),rng=chunkRandom(info.seed);result=[];
 for(let i=0;i<32;i++){
  const px=(cx+rng())*CHUNK,py=(cy+rng())*CHUNK;
  const r=rng();let kind=sectorType(info,r);
  if(Math.hypot(px,py)<110)kind='matter';
  const e=spawn(px,py,kind,rng),material=materialFor(info.biome,Math.hypot(cx,cy),rng);
  result.push({x:px,y:py,index:i,kind,material,r:e.r});
 }
 if(distantChunkCache.size>1250)distantChunkCache.clear();
 distantChunkCache.set(key,result);return result;
}
function renderDistantBodies(){
 // At giant scales the real macro deposits replace microscopic dust.
 if(g.tier>=18&&camera.zoom<.13)return;
 const zoom=Math.max(.014,camera.zoom),dx=W*.5/zoom,dy=H*.5/zoom;
 const minX=Math.floor((camera.x-dx)/CHUNK)-1,maxX=Math.floor((camera.x+dx)/CHUNK)+1;
 const minY=Math.floor((camera.y-dy)/CHUNK)-1,maxY=Math.floor((camera.y+dy)/CHUNK)+1;
 const total=(maxX-minX+1)*(maxY-minY+1);
 // Huge fields are represented by stable, procedural nebula knots. No fake
 // physical objects are created or revived; full nodes render at nearer zooms.
 const step=Math.max(1,Math.ceil(Math.sqrt(total/380)));
 const full=total<120?32:total<550?10:4;
 const palette={normal:'#8ebcf4',rich:'#68d4e7',void:'#9ddcf8',nebula:'#a78dee',relic:'#f2bd74',anomaly:'#ca73f3'};
 ctx.save();
 for(let cy=Math.floor(minY/step)*step;cy<=maxY;cy+=step)for(let cx=Math.floor(minX/step)*step;cx<=maxX;cx+=step){
  const key=chunkKey(cx,cy),info=chunkInfo(cx,cy),seed=seedHash(cx,cy);
  const x=(cx+.5-camera.x/CHUNK)*CHUNK*zoom+W*.5;
  const y=(cy+.5-camera.y/CHUNK)*CHUNK*zoom+H*.5;
  if(x<-120||x>W+120||y<-120||y>H+120)continue;
  const color=palette[info.biome];
  const spread=Math.max(1.5,Math.min(57,CHUNK*zoom*step*.55));
  // Distant pinprick stars only: giant translucent ellipses were mistaken for
  // nebulas/resources and made the late-game universe look empty and broken.
  if(!loadedChunks.has(key)&&step>1){
   const fleck=seed%101,theta=((seed>>>9)/0x7fffff)*TAU;
   if(fleck<88){
    ctx.globalAlpha=.25+(seed%17)*.022;ctx.fillStyle=color;
    const a=theta*2,dd=spread*(.15+(seed%37)/56),sz=Math.max(.85,Math.min(2.1,zoom*30));
    ctx.fillRect(x+Math.cos(a)*dd,y+Math.sin(a)*dd,sz,sz);
    if(seed%7<3)ctx.fillRect(x-Math.sin(a)*dd*.6,y+Math.cos(a)*dd*.6,sz*.65,sz*.65);
   }
  }
  if(step!==1||loadedChunks.has(key))continue;
  const mask=(g.depleted[key]||0)>>>0,nodes=distantSamples(cx,cy);
  ctx.fillStyle=color;
  for(let j=0;j<nodes.length;j+=Math.max(1,Math.floor(32/full))){
   const e=nodes[j];if(e.index>=sectorQuota(info,cx,cy)||(mask&(1<<e.index))!==0)continue;
   const sx=(e.x-camera.x)*zoom+W*.5,sy=(e.y-camera.y)*zoom+H*.5;
   if(sx<-8||sy<-8||sx>W+8||sy>H+8)continue;
   ctx.globalAlpha=e.kind==='hazard'?.27:e.kind==='relic'?.82:.66;
   const rad=clamp(e.r*zoom*.8,1,4.2);ctx.fillRect(sx-rad,sy-rad,rad*2,rad*2);
  }
 }
 ctx.restore();
}
function respawn(e){markHarvested(e);e.dead=true;if(e.macro)cosmicSceneDirty=true;}
// Absorption is time-based, not an intermittent physics step. Bodies stay
// fixed in world space until the short shrinking animation completes.
function startAbsorption(e){if(e.dead||e.absorbing)return;e.absorbing=.001;e.absorbOriginX=e.x;e.absorbOriginY=e.y;}
function animateAbsorption(e,dt){
 if(!e.absorbing||e.dead)return false;
 e.absorbing=Math.min(.26,e.absorbing+dt);
 if(e.absorbing>=.26){absorb(e);return true;}
 return true;
}

visitPosition();streamField();
function burst(x,y,n,color='#7ed9ff',scale=1){const cap=g.particles?Math.min(30,n):Math.min(5,n);for(let i=0;i<cap;i++){const a=rand(0,TAU),sp=rand(35,180)*scale;particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rand(.3,.9),max:.9,r:rand(1,3.4)*scale,color});}if(particles.length>420)particles.splice(0,particles.length-420);}
function popText(x,y,text,color='#c7ebff'){texts.push({x,y,text,color,life:1.1});if(texts.length>35)texts.shift();}
function absorb(e){const mat=resourceOf(e);const val=Math.max(1,Math.round(e.value*(1+g.upgrade.harvest*.075)*tester.loot));g.matter=Math.min(1e290,g.matter+val);g.total=Math.min(1e290,g.total+val);g.stageCollects=Math.min(1e290,g.stageCollects+val);g.collects++;if(g.endless)g.endlessGrowth=(g.endlessGrowth||0)+Math.log1p(val)*.0004;
 const gain=mat==='exotic'?3:mat==='plasma'?2:mat==='gas'?2:mat==='crystal'?2:1;
 g.materials[mat]=(g.materials[mat]||0)+gain;
 if((mat==='plasma'||mat==='exotic')&&player.r<CHUNK*4)burst(e.x,e.y,9,MATERIALS[mat].color,.7);
 let credits=e.kind==='relic'?Math.round(val*1.7):Math.max(1,Math.floor(val*.75));g.credits+=credits;if(e.kind==='relic'){g.materials.exotic=(g.materials.exotic||0)+1;g.stageRare++;g.rare++;if(player.r<CHUNK*4)burst(e.x,e.y,22,'#f9d797',.9);pickupFeedback(val,true);}else if(player.r<CHUNK*4&&Math.random()<.24){burst(e.x,e.y,4,MATERIALS[mat].color,.35);}
 // The current physical size reacts to each collected object, not just to a stage transition.
 player.targetR=currentRadius();
 if(e.kind!=='relic')pickupFeedback(val,false);if(player.r<CHUNK*4&&g.particles&&Math.random()<.36)energyArcs.push({x:e.x,y:e.y,toX:player.x,toY:player.y,r:e.r,life:.24,max:.24,color:e.kind==='relic'?'#ffe7af':'#77dfff'});respawn(e);if(!g.complete&&g.matter>=TA[g.tier].required&&missionsDone())evolve();}
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
function activatePulse(){if(!running||pulseCd>0)return;pulseCd=13;g.pulses++;g.stagePulses++;const range=270+g.upgrade.gravity*7;shockwaves.push({x:player.x,y:player.y,r:10,max:1.2,life:1.2,color:'#84dfff',range});for(let e of entities){let dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy);if(d<range){if(e.material==='plasma'||e.material==='exotic'){e.primed=true;burst(e.x,e.y,8,MATERIALS[e.material].color,.6);}if(e.kind==='hazard'){e.kind='matter';e.material='crystal';}else{e.vx+=(player.x-e.x)/(d||1)*Math.max(110,650-d*1.5);e.vy+=(player.y-e.y)/(d||1)*Math.max(110,650-d*1.5);}}}shake=5;toast('◉ ГРАВИТАЦИОННЫЙ ИМПУЛЬС');sound(245,'sine',.55,.055);renderUI();}
function activateBoost(){if(!running||boostCd>0)return;boostCd=6;boostTime=1.15;player.shield=Math.max(player.shield,.7);burst(player.x,player.y,20,'#bd9bff');sound(440,'triangle',.23);}
function update(dt){
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
 const cosmicSpeed=g.endless&&player.r>CHUNK*5
  ? Math.min(1e290,Math.max(ordinarySpeed,140/Math.max(camera.zoom,1e-155)))
  : ordinarySpeed;
 const speed=tester.speed*cosmicSpeed*(boostTime>0?2.5:1);
 // Direct flight stops almost immediately; "smooth" gives optional controlled inertia.
 const response=g.flightFeel==='smooth'?(ax||ay?7:11):(ax||ay?23:34),lerp=1-Math.exp(-dt*response);
 player.vx+=(ax*speed-player.vx)*lerp;player.vy+=(ay*speed-player.vy)*lerp;
 player.x+=player.vx*dt;player.y+=player.vy*dt;visitPosition();player.rotation+=dt*(.13+Math.hypot(player.vx,player.vy)/850);
 if(Math.hypot(player.vx,player.vy)>28&&Math.random()<dt*24){player.trail.push({x:player.x,y:player.y,r:player.r,life:.55});}
 player.trail.forEach(p=>p.life-=dt);player.trail=player.trail.filter(p=>p.life>0).slice(-30);
 let gravRange=Math.max((97+g.upgrade.gravity*7)*tester.gravity,Math.min(player.r*2.8,MACRO_SIZE*20)),collectR=g.endless?blackHoleCoreWorldRadius():Math.min(player.r,MACRO_SIZE*20)+4;
 const giantMode=g.endless&&player.r>CHUNK*5;
 // Fixed collection rate, independent of render FPS or the number of bodies
 // touched by the enormous horizon. This prevents a thousand simultaneous
 // harvests and the audible/visual 'batch' stutter every streaming tick.
 absorptionTokens=giantMode?Math.min(12,absorptionTokens+dt*clamp(60+Math.log10(Math.max(1,player.r/CHUNK))*12,60,130)):0;
 const captureRadius=giantMode?blackHoleCoreWorldRadius():collectR;
 const nearReach=giantMode?captureRadius+MACRO_SIZE:gravRange;
 const nearReachSq=nearReach*nearReach;
 const nearbyObjects=entities.concat(macroEntities);
 // Full deterministic update each frame. Previously only a rotating subset was
 // simulated; objects jumped when their turn in the queue arrived.
 for(const e of nearbyObjects){
  if(e.dead)continue;
  if(animateAbsorption(e,dt))continue;
  let dx=player.x-e.x,dy=player.y-e.y;
  // Broad phase: no sqrt, movement or sound for distant objects.
  const dist2=dx*dx+dy*dy;
  const reach=giantMode?Math.max(nearReach+e.r+20,blackHoleTouchDistance(e,captureRadius)):nearReach+e.r+20;
   if(dist2>reach*reach)continue;
  const dist=Math.sqrt(dist2)||1;
  if(giantMode){
   // Macro deposits are fixed astronomical bodies, not projectiles. Do not
   // pull them across sectors and then restore them on reload.
   if(dist<=blackHoleTouchDistance(e,captureRadius)&&absorptionTokens>=1){startAbsorption(e);absorptionTokens--;}
   continue;
  }
  if((e.kind!=='hazard'||g.tier===TA.length-1)&&
    (e.r<=player.r*.82||(g.tier===TA.length-1&&e.kind==='hazard'))&&
    dist<gravRange*(e.material==='gas'?1.4:1)){
   const pull=(gravRange-dist)/gravRange;
   e.vx+=dx/dist*(150+pull*520)*dt;
   e.vy+=dy/dist*(150+pull*520)*dt;
  }
  e.vx*=Math.exp(-dt*.62);e.vy*=Math.exp(-dt*.62);
  e.x+=e.vx*dt;e.y+=e.vy*dt;e.spin+=dt*.6;e.twinkle+=dt*2.5;
  if(Math.hypot(player.x-e.x,player.y-e.y)<(g.endless?blackHoleTouchDistance(e,collectR):collectR+e.r)){
   if(e.kind==='hazard'){e.kind='matter';e.material='crystal';absorb(e);}
   else if(!g.endless&&e.r>player.r*.82)collideWithGiant(e,dx,dy,dist);
   else absorb(e);
  }
 }
 entities=entities.filter(e=>!e.dead);macroEntities=macroEntities.filter(e=>!e.dead);harvestCosmicLOD(dt);if(streamTimer>.32){streamTimer=0;streamField();}
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
 const zTarget=g.endless?clamp(tester.zoom*(83+27*Math.log2(1+horizonRadius/100))/Math.max(1,horizonRadius),1e-155,2.5):clamp(tester.zoom*1.28/Math.pow(1+player.r/105,1.30),.12,2.5);
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
 const paintedPixels=(e.macro||e.cosmic)
  ? clamp(e.r*zoom*1.15,1.8,112)
  : Math.max(.3,e.r*zoom);
 return core+Math.min(core*.32,paintedPixels*.91/zoom);
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
function sky(t){
 ensureSkyLayer();ctx.drawImage(skyLayer,0,0,W,H);
 for(const s of stars){
  const x=((s.x-camera.x*s.depth*.25)%W+W)%W,y=((s.y-camera.y*s.depth*.25)%H+H)%H;
  const alpha=s.alpha*(.68+.32*Math.sin(t*.65+s.phase));
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
// True gravitational lensing of the existing stars/galaxies. No gas or disk.
let lensInput=null,lensOutput=null,lensInputCtx=null,lensOutputCtx=null;
function renderBlackHoleLensing(){
 if(g.tier!==TA.length-1)return;
 const p=project(player.x,player.y),R=clamp(player.r*camera.zoom,8,Math.max(W,H)*.54);
 // A compact lens, not a giant vortex of stretched galaxies.
 const outer=Math.min(R*2.30,Math.max(W,H)*.85);
 const left=Math.max(0,Math.floor(p.x-outer)),top=Math.max(0,Math.floor(p.y-outer));
 const right=Math.min(W,Math.ceil(p.x+outer)),bottom=Math.min(H,Math.ceil(p.y+outer));
 const width=right-left,height=bottom-top;
 if(width<4||height<4)return;
 // Render near native screen resolution. The former 300px lens texture
 // was enlarged 3-8x on desktop and produced large blocky galaxies.
 // Dynamic quality scaling retains FPS on weaker hardware.
 const qualityTarget=Math.round(clamp(1120*Math.max(.6,performanceScale),700,1250));
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
 lensInputCtx.drawImage(canvas,left*dpr,top*dpr,width*dpr,height*dpr,0,0,sw,sh);
 const a=lensInputCtx.getImageData(0,0,sw,sh).data;
 const warped=lensOutputCtx.createImageData(sw,sh),b=warped.data;
 const sampleX=sw/width,sampleY=sh/height,core=R*BLACK_HOLE_CORE_FRACTION;
 const outerStart=Math.max(core+R*.35,outer-R*.50),outerLength=Math.max(1,outer-outerStart);
 for(let iy=0;iy<sh;iy++)for(let ix=0;ix<sw;ix++){
  const dx=left+(ix+.5)/sampleX-p.x,dy=top+(iy+.5)/sampleY-p.y;
  const d=Math.hypot(dx,dy),idx=(iy*sw+ix)*4;
  if(d<core*.99||d>=outer)continue;
  // A strong, broad lens with smoothly fading edges instead of rays.
  const u=Math.max(0,(d-core)/(R*.76));
  const strength=Math.exp(-Math.pow(u,1.65));
  const border=clamp((outer-d)/Math.max(1,R*.50),0,1);
  const feather=border*border*(3-2*border);
  const bend=R*.34*strength*feather;
  const twist=.040*strength*feather;
  const rr=(d+bend)/d;
  const cosine=Math.cos(twist),sine=Math.sin(twist);
  const sx=(p.x+(dx*cosine-dy*sine)*rr-left)*sampleX-.5;
  const sy=(p.y+(dx*sine+dy*cosine)*rr-top)*sampleY-.5;
  if(sx<0||sy<0||sx>=sw-1||sy>=sh-1)continue;
  const x=Math.floor(sx),y=Math.floor(sy),fx=sx-x,fy=sy-y;
  const p00=(y*sw+x)*4,p01=p00+4,p10=p00+sw*4,p11=p10+4;
  const w00=(1-fx)*(1-fy),w01=fx*(1-fy),w10=(1-fx)*fy,w11=fx*fy;
  b[idx]=a[p00]*w00+a[p01]*w01+a[p10]*w10+a[p11]*w11;
  b[idx+1]=a[p00+1]*w00+a[p01+1]*w01+a[p10+1]*w10+a[p11+1]*w11;
  b[idx+2]=a[p00+2]*w00+a[p01+2]*w01+a[p10+2]*w10+a[p11+2]*w11;
  const fade=Math.min(1,Math.max(0,(outer-d)/outerLength));
  b[idx+3]=Math.round(255*fade*fade*(3-2*fade));
 }
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
  case 27: /* The event-horizon render has its own animated accretion disk. */ break;
 }
 ctx.restore();
}
// Three LOD levels: a cheap pixel at distance, plain discs in the middle,
// detailed shapes close to the player. The object itself is never deleted by LOD.
function renderEntity(e,time){
 const px=(e.x-camera.x)*camera.zoom+W/2,py=(e.y-camera.y)*camera.zoom+H/2;
 const r=e.r*camera.zoom*(e.absorbing?Math.max(.05,1-e.absorbing/.26):1);
 if(px<-r-12||px>W+r+12||py<-r-12||py>H+r+12)return;
 const near=(e.x-player.x)**2+(e.y-player.y)**2<560*560;
 if(g.tier>=18&&camera.zoom<.13&&r<2.25)return;
 if(r<1.6){ctx.fillStyle=e.kind==='hazard'?'#ed6d88':e.kind==='relic'?'#ffd790':MATERIALS[e.material]?.color||'#8bc9ed';ctx.fillRect(px,py,1.8,1.8);return;}
 if(e.kind==='matter'){
  const mat=e.material;
  if(near&&r>=5&&(mat==='crystal'||mat==='ice'||mat==='plasma'||mat==='exotic'||mat==='gas')){
    ctx.save();ctx.translate(px,py);ctx.rotate(e.spin*.25);
    const color=MATERIALS[mat].color;ctx.strokeStyle=color;ctx.fillStyle=color;
    if(mat==='gas'){
      ctx.globalAlpha=.37;for(let i=0;i<4;i++){const x=Math.cos(i*TAU/4)*r*.45,y=Math.sin(i*TAU/4)*r*.45;
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
function renderPlayer(time){const t=TA[g.tier],p=project(player.x,player.y),r=Math.min(player.r*camera.zoom,Math.max(W,H)*.54);ctx.save();
 for(const tr of (g.endless?[]:player.trail)){let q=project(tr.x,tr.y),alpha=tr.life/.55;ctx.fillStyle=cssColor(t.color,alpha*.1);ctx.beginPath();ctx.arc(q.x,q.y,Math.min(Math.max(W,H)*3,tr.r*camera.zoom*(.45+alpha*.3)),0,TAU);ctx.fill();}
 // Gravity field ring and orbiting shards.
 let range=Math.min(Math.max((97+g.upgrade.gravity*7)*tester.gravity,Math.min(player.r*2.8,MACRO_SIZE*20))*camera.zoom,Math.max(W,H)*3);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(player.rotation*.18);if(!g.endless){ctx.strokeStyle=cssColor(t.color,.11);ctx.lineWidth=1.2;ctx.setLineDash([3,9]);ctx.beginPath();ctx.arc(0,0,range,0,TAU);ctx.stroke();ctx.setLineDash([]);}
 let count=g.endless?0:Math.min(18,3+Math.floor(g.tier/2));for(let i=0;i<count;i++){let a=player.rotation*(i%2?1:-1)*(0.65+(i%4)*.08)+i*TAU/count,R=r*(1.8+(i%3)*.24),xx=Math.cos(a)*R,yy=Math.sin(a)*R*.65;ctx.fillStyle=i%3?'#96baf8':'#ffdcaa';ctx.beginPath();ctx.arc(xx,yy,i%5===0?2.6:1.5,0,TAU);ctx.fill();}ctx.restore();
 if(morph&&!g.endless){let f=clamp(morph.time/morph.duration,0,1);ctx.save();ctx.globalAlpha=(1-f)*.94;paintPlayerForm(p.x,p.y,r*(1.12-f*.12),time,morph.from);ctx.restore();ctx.save();ctx.globalAlpha=Math.min(1,f*1.65);paintPlayerForm(p.x,p.y,r*(.52+f*.48),time);ctx.restore();}else paintPlayerForm(p.x,p.y,r,time);
 // Swirling energy currents and magnetic filaments.
 if(g.particles&&!g.endless){ctx.save();ctx.globalAlpha=.18+.10*Math.sin(time*1.5);ctx.strokeStyle=t.color;ctx.lineWidth=1.2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(p.x,p.y,r*(1.7+i*.27),time*.55+i*1.9,time*.55+i*1.9+1.65);ctx.stroke();}ctx.restore();}
 if(player.shield>0&&!g.endless){ctx.strokeStyle=`rgba(132,236,255,${.2+.35*Math.sin(time*16)**2})`;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,r*1.35,0,TAU);ctx.stroke();}
 if(boostTime>0&&!g.endless){ctx.strokeStyle='rgba(187,143,255,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,r*1.55+Math.sin(time*12)*3,0,TAU);ctx.stroke();}
 ctx.restore();}
function renderParticles(){for(const a of energyArcs){const q=project(a.x,a.y),target=project(a.toX??a.x,a.toY??a.y);ctx.save();ctx.globalAlpha=clamp(a.life/a.max,0,1)*.7;ctx.strokeStyle=a.color;ctx.lineWidth=1.25;ctx.beginPath();if(a.toX!==undefined){ctx.moveTo(q.x,q.y);let mx=(q.x+target.x)*.5,my=(q.y+target.y)*.5;ctx.quadraticCurveTo(mx+Math.sin(a.life*40)*14,my-14,target.x,target.y);}else{ctx.arc(q.x,q.y,a.r*camera.zoom*(1.4+(1-a.life/a.max)*4),0,TAU);}ctx.stroke();ctx.restore();}
for(const p of particles){const q=project(p.x,p.y);ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.5,p.r*camera.zoom),0,TAU);ctx.fill();}ctx.globalAlpha=1;for(const s of shockwaves){let q=project(s.x,s.y);ctx.save();ctx.globalAlpha=clamp(s.life/s.max,0,1)*.7;ctx.strokeStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=18;ctx.lineWidth=4*camera.zoom;ctx.beginPath();ctx.arc(q.x,q.y,s.r*camera.zoom,0,TAU);ctx.stroke();ctx.restore();}for(const p of texts){let q=project(p.x,p.y);ctx.save();ctx.globalAlpha=clamp(p.life,0,1);ctx.font='800 13px "Exo 2",sans-serif';ctx.textAlign='center';ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.fillStyle=p.color;ctx.fillText(p.text,q.x,q.y);ctx.restore();}}
function render(time){ctx.setTransform(dpr,0,0,dpr,0,0);sky(time);renderDistantBodies();renderMacroField(time);ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));for(const e of entities)renderEntity(e,time);renderBlackHoleLensing();renderPlayer(time);renderParticles();ctx.restore();if(screenFlash>0){ctx.fillStyle=`rgba(188,215,255,${screenFlash*.14})`;ctx.fillRect(0,0,W,H);}renderTicks++;}
let idleLast=0;
function frame(now){
 requestAnimationFrame(frame);
 if(!running&&now-idleLast<70)return;idleLast=now;
 const elapsed=clamp((now-last)/1000,.001,.08);last=now;
 if(running){
  update(Math.min(elapsed,.05));
  perfSample+=elapsed;perfFrames++;
  if(perfSample>=4){
   frameFps=perfFrames/perfSample;
   if(frameFps<42&&performanceScale>.55){performanceScale=Math.max(.55,performanceScale-.2);applyResolution();}
   else if(frameFps>58&&performanceScale<1){performanceScale=Math.min(1,performanceScale+.1);applyResolution();}
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
function drawAtlas(){
 const canvas=$('atlas-canvas');if(!canvas)return;
 const bounds=canvas.getBoundingClientRect();if(bounds.width<10)return;
 const w=Math.round(bounds.width),h=Math.round(bounds.height),pixelRatio=Math.min(devicePixelRatio||1,1.5);
 if(canvas.width!==Math.floor(w*pixelRatio)||canvas.height!==Math.floor(h*pixelRatio)){canvas.width=Math.floor(w*pixelRatio);canvas.height=Math.floor(h*pixelRatio);}
 const c=canvas.getContext('2d');c.setTransform(pixelRatio,0,0,pixelRatio,0,0);
 c.fillStyle='#06101e';c.fillRect(0,0,w,h);
 const size=27*atlas.zoom,px=atlas.x/CHUNK,py=atlas.y/CHUNK;
 const left=Math.floor(px-w/(2*size))-1,right=Math.ceil(px+w/(2*size))+1,top=Math.floor(py-h/(2*size))-1,bottom=Math.ceil(py+h/(2*size))+1;
 const tiles=(right-left+1)*(bottom-top+1),sampleStep=Math.max(1,Math.ceil(Math.sqrt(tiles/2600)));
 const tileSize=size*sampleStep;
 const colors={normal:'#7d9eb5',rich:'#a9e4bc',nebula:'#c59eff',void:'#9bd9ef',relic:'#f3d58e',anomaly:'#d691ef'};
 // Deterministic underlying biome colors are intentionally faint until explored.
 const startX=Math.floor(left/sampleStep)*sampleStep,startY=Math.floor(top/sampleStep)*sampleStep;
 let exhausted=0;
 for(let cy=startY;cy<=bottom;cy+=sampleStep)for(let cx=startX;cx<=right;cx+=sampleStep){
  const x=w/2+(cx-px)*size,y=h/2+(cy-py)*size;
  const info=chunkInfo(cx,cy);
  c.fillStyle=sampleStep===1?'rgba(12,31,49,.70)':'rgba(21,44,65,.55)';c.fillRect(x,y,tileSize+.5,tileSize+.5);
  if(tileSize>=5){c.strokeStyle='rgba(89,120,154,.12)';c.lineWidth=.7;c.strokeRect(x+.5,y+.5,tileSize,tileSize);}
  if(sampleStep===1){
   const key=chunkKey(cx,cy);if(!visitedChunks.has(key))continue;
   const quota=sectorQuota(info,cx,cy),mask=(g.depleted[key]||0)>>>0;
   const removed=popcount32(mask&(quota===32?0xffffffff:((1<<quota)-1)>>>0));
   const remaining=quota-removed;if(!remaining)exhausted++;
   c.fillStyle=remaining===0?'rgba(82,104,126,.75)':colors[info.biome]+'bb';
   c.fillRect(x+.6,y+.6,Math.max(1,tileSize-1.2),Math.max(1,tileSize-1.2));
  }
 }
 // When the atlas zooms out, sampling biome cells misses the player's visited
 // tiles. Aggregate VISITED coordinates into the same raster bins and draw them
 // on top, independent of which representative tile was sampled above.
 if(sampleStep>1){
  const bins=new Map();
  for(const key of visitedChunks){
   const comma=key.indexOf(',');if(comma<0)continue;
   const cx=Number(key.slice(0,comma)),cy=Number(key.slice(comma+1));
   if(cx<left-sampleStep||cx>right+sampleStep||cy<top-sampleStep||cy>bottom+sampleStep)continue;
   const bx=Math.floor(cx/sampleStep),by=Math.floor(cy/sampleStep),bkey=bx+','+by;
   bins.set(bkey,(bins.get(bkey)||0)+1);
  }
  for(const [key,count] of bins){
   const comma=key.indexOf(','),cx=Number(key.slice(0,comma))*sampleStep,cy=Number(key.slice(comma+1))*sampleStep;
   const x=w/2+(cx-px)*size,y=h/2+(cy-py)*size;
   const strength=clamp(.55+Math.log2(1+count)*.075,.6,1);
   c.globalAlpha=strength;c.fillStyle='#67cdec';
   c.fillRect(x,y,Math.max(2,tileSize),Math.max(2,tileSize));c.globalAlpha=1;
  }
 }
 // The exploration discs are stored geometry, not map artwork. Rasterize
 // their UNION onto aligned sector blocks; never draw overlapping circles.
 const group=Math.pow(2,Math.max(0,Math.ceil(Math.log2(7/size))));
 const groupPx=size*group;
 const baseX=Math.floor(left/group)*group,baseY=Math.floor(top/group)*group;
 const columns=Math.min(220,Math.ceil((right-baseX)/group)+1);
 const rows=Math.min(170,Math.ceil((bottom-baseY)/group)+1);
 const explored=new Uint8Array(columns*rows);
 const discs=Array.isArray(g.discoveryDiscs)?g.discoveryDiscs:[];
 for(const d of discs){
  if(!Array.isArray(d)||d.length!==3)continue;
  const [cx,cy,r]=d;if(![cx,cy,r].every(Number.isFinite)||r<0)continue;
  const minX=Math.max(0,Math.floor((cx-r-baseX)/group)-1),maxX=Math.min(columns-1,Math.floor((cx+r-baseX)/group)+1);
  const minY=Math.max(0,Math.floor((cy-r-baseY)/group)-1),maxY=Math.min(rows-1,Math.floor((cy+r-baseY)/group)+1);
  const r2=r*r;
  for(let gy=minY;gy<=maxY;gy++){
   const y0=baseY+gy*group,y1=y0+group,dy=cy<y0?y0-cy:cy>y1?cy-y1:0;
   if(dy*dy>r2)continue;
   for(let gx=minX;gx<=maxX;gx++){
    const x0=baseX+gx*group,x1=x0+group,dx=cx<x0?x0-cx:cx>x1?cx-x1:0;
    if(dx*dx+dy*dy<=r2)explored[gy*columns+gx]=1;
   }
  }
 }
 c.save();c.fillStyle='#42afcc';c.globalAlpha=group>8?.53:.41;
 for(let gy=0;gy<rows;gy++)for(let gx=0;gx<columns;gx++){
  if(!explored[gy*columns+gx])continue;
  const x=w/2+(baseX+gx*group-px)*size,y=h/2+(baseY+gy*group-py)*size;
  if(x>=w||y>=h||x+groupPx<=0||y+groupPx<=0)continue;
  c.fillRect(x+.25,y+.25,Math.max(.5,groupPx-.5),Math.max(.5,groupPx-.5));
 }
 c.restore();
 // Keep the player's marker small even when its physical horizon covers
 // millions of sectors. Local scale is shown in the separate 11x11 grid.
 const mx=w/2+(player.x-atlas.x)*size/CHUNK,my=h/2+(player.y-atlas.y)*size/CHUNK;
 // Readable local sector grid, independent of atlas zoom. The previous
 // atlas became sub-pixel at 0.008x, hiding every adjacent discovered cell.
 const insetCell=15,insetN=11,insetSize=insetCell*insetN;
 const bx=w-insetSize-16,by=h-insetSize-31;
 c.fillStyle='rgba(4,17,31,.94)';c.fillRect(bx-9,by-22,insetSize+18,insetSize+33);
 c.strokeStyle='rgba(130,210,242,.5)';c.strokeRect(bx-9,by-22,insetSize+18,insetSize+33);
 c.fillStyle='#b1e9ff';c.font='bold 10px Inter,sans-serif';c.fillText('СОСЕДНИЕ СЕКТОРА',bx,by-7);
 const centerCellX=Math.floor(player.x/CHUNK),centerCellY=Math.floor(player.y/CHUNK);
 function exploredCell(cx,cy){
  const key=chunkKey(cx,cy);if(visitedChunks.has(key))return true;
  // A cell touched by the giant horizon is discovered, even without an
  // individual saved key. Test nearest point of its square vs each disc.
  for(const d of g.discoveryDiscs){const nx=clamp(d[0],cx,cx+1),ny=clamp(d[1],cy,cy+1);
   if((nx-d[0])**2+(ny-d[1])**2<=d[2]*d[2])return true;}
  return false;
 }
 let adjacentKnown=0;
 for(let iy=0;iy<insetN;iy++)for(let ix=0;ix<insetN;ix++){
  const cx=centerCellX+ix-5,cy=centerCellY+iy-5;
  const known=exploredCell(cx,cy);if(known)adjacentKnown++;
  const x=bx+ix*insetCell,y=by+iy*insetCell;
  c.fillStyle=known?'rgba(82,208,236,.85)':'rgba(31,54,74,.9)';
  c.fillRect(x+.6,y+.6,insetCell-1.2,insetCell-1.2);
  if(ix===5&&iy===5){c.fillStyle='#fff3b0';c.fillRect(x+5,y+5,5,5);}
 }
 c.fillStyle='#8db5c4';c.font='9px Inter,sans-serif';
 c.fillText(`${adjacentKnown}/121 · масштаб независимый`,bx,by+insetSize+12);
 // Natural black holes are meaningful world locations; mark actual persisted
 // stellar/intermediate/supermassive bodies when zoom permits. Far zoom uses
 // a bounded deterministic cluster marker instead of scanning millions of cells.
 if(g.tier>=13){
  const leftMacro=Math.floor((atlas.x-w*.5/(size/CHUNK))/MACRO_SIZE)-1;
  const rightMacro=Math.ceil((atlas.x+w*.5/(size/CHUNK))/MACRO_SIZE)+1;
  const topMacro=Math.floor((atlas.y-h*.5/(size/CHUNK))/MACRO_SIZE)-1;
  const bottomMacro=Math.ceil((atlas.y+h*.5/(size/CHUNK))/MACRO_SIZE)+1;
  const visibleMacro=Math.max(1,(rightMacro-leftMacro+1)*(bottomMacro-topMacro+1));
  const stride=Math.max(1,2**Math.ceil(Math.log2(Math.max(1,Math.sqrt(visibleMacro/680)))));
  const firstX=Math.floor(leftMacro/stride)*stride,firstY=Math.floor(topMacro/stride)*stride;
  c.save();let drawn=0;
  for(let cy=firstY;cy<=bottomMacro&&drawn<150;cy+=stride)
   for(let cx=firstX;cx<=rightMacro&&drawn<150;cx+=stride){
    // At distant zoom each icon represents an actual seeded region, not
    // a made-up point at the grid intersection.
    const hash=seedHash(cx*47,cy*83);
    if(stride===1&&hash%9!==0)continue;
    if(stride>1&&hash%4!==0)continue;
    const rng=chunkRandom(seedHash(cx*31+731,cy*37-419)^0x9f4e8b21);
    const dx=(cx+(stride===1?.09+rng()*.82:rng()*stride))*MACRO_SIZE;
    const dy=(cy+(stride===1?.09+rng()*.82:rng()*stride))*MACRO_SIZE;
    const scatter=seedHash(cx*37,cy*59);
    const bxWorld=dx+(stride===1?((scatter&0xffff)/65535-.5)*MACRO_SIZE*1.35:0);
    const byWorld=dy+(stride===1?(((scatter>>>16)&0xffff)/65535-.5)*MACRO_SIZE*1.35:0);
    if(stride===1&&((g.depletedMacro[macroKey(cx,cy)]||0)&1))continue;
    const px=w/2+(bxWorld-atlas.x)*size/CHUNK,py=h/2+(byWorld-atlas.y)*size/CHUNK;
    if(px<8||px>w-8||py<8||py>h-8)continue;
    const ht=hash%17===0?2:hash%5===0?1:0;
    const colors=['#79e5f6','#cda6ff','#ffcc8a'];
    c.fillStyle='#02060f';c.strokeStyle=colors[ht];c.lineWidth=1.5;
    c.beginPath();c.arc(px,py,stride===1?4.1:3.0,0,TAU);c.fill();c.stroke();
    drawn++;
   }
  c.restore();
 }
 // The origin is spatial, never a second place to respawn.
 const ox=w/2-atlas.x/CHUNK*size,oy=h/2-atlas.y/CHUNK*size;
 if(ox>=-25&&oy>=-25&&ox<w+25&&oy<h+25){c.strokeStyle='#84adc3';c.lineWidth=1.2;c.beginPath();c.arc(ox,oy,6,0,TAU);c.stroke();c.fillStyle='#a0c5d9';c.font='10px Inter, sans-serif';c.fillText('НАЧАЛО',ox+11,oy-8);}
 if(mx>-18&&mx<w+18&&my>-18&&my<h+18){c.save();c.translate(mx,my);c.shadowColor='#76eaff';c.shadowBlur=15;c.fillStyle='#b7f5ff';c.beginPath();c.moveTo(0,-10);c.lineTo(8,8);c.lineTo(0,4);c.lineTo(-8,8);c.closePath();c.fill();c.restore();}
 c.strokeStyle='rgba(147,200,234,.17)';c.beginPath();c.moveTo(w/2-13,h/2);c.lineTo(w/2+13,h/2);c.moveTo(w/2,h/2-13);c.lineTo(w/2,h/2+13);c.stroke();
 $('atlas-coords').textContent=`X ${Math.floor(atlas.x/CHUNK)} · Y ${Math.floor(atlas.y/CHUNK)} / масштаб ${atlas.zoom<.1?atlas.zoom.toFixed(3):atlas.zoom.toFixed(2)}×`;
 $('atlas-count').textContent=`Исследовано ≈ ${fmt(exploredCount())} секторов · ${sampleStep>1?'Обзор '+sampleStep+'×'+sampleStep+' · ':''}областей чёрной дыры: ${g.discoveryDiscs.length} · рядом ${adjacentKnown}/121`;
 atlas.dirty=false;
}
function showMap(){
 atlas={x:player.x,y:player.y,zoom:1,drag:false,lastX:0,lastY:0,dirty:true};
 show(`<div class="atlas-top"><div><div class="eyebrow">ГАЛАКТИЧЕСКАЯ НАВИГАЦИЯ</div><div class="overlay-title">БЕСКОНЕЧНАЯ КАРТА</div></div><span class="atlas-north">N ↑</span></div>
 <p class="atlas-description">Каждый сектор существует на постоянных координатах. Поглощённая материя не восстанавливается. Исследуй новые области и отдаляй карту до масштаба скоплений галактик.</p>
 <div class="atlas-stats"><span id="atlas-count"></span><span id="atlas-coords"></span></div>
 <div class="atlas-wrap"><canvas id="atlas-canvas" aria-label="Интерактивная процедурная карта галактики — перетаскивайте, чтобы перемещать карту"></canvas><div class="atlas-controls"><button id="atlas-zoom-in" class="atlas-control" title="Приблизить">+</button><button id="atlas-zoom-out" class="atlas-control" title="Отдалить">−</button><button id="atlas-center" class="atlas-control center" title="Показать моё местоположение">⌖</button></div></div>
 <div class="atlas-legend"><span><i class="atlas-mark you"></i>ТЫ</span><span><i class="atlas-mark known"></i>ИЗУЧЕНО</span><span><i class="atlas-mark rich"></i>КРИСТАЛЛЫ</span><span><i class="atlas-mark relic"></i>ПЛАЗМА</span><span style="color:#91d8f9">❄ ЛЁД</span><span style="color:#b49afe">◌ ГАЗ</span><span style="color:#d68af2">✧ ЭКЗОМАТЕРИЯ</span><span><i class="atlas-mark empty"></i>ОПУСТОШЕНО</span><span style="color:#a9e2ff">◉ ЧЁРНЫЕ ДЫРЫ</span></div>
 <div class="atlas-footer"><small>Перетаскивай карту · Колёсико или +/− меняют масштаб вплоть до 0,008× · Дальние сектора отображаются группами</small>${continueButton('ВЕРНУТЬСЯ В КОСМОС')}</div>`);
 $('modal').firstElementChild.classList.add('atlas-card');atlasVisible=true;atlas.dirty=true;attachContinue();
 const cv=$('atlas-canvas');cv.style.touchAction='none';
 cv.addEventListener('pointerdown',ev=>{atlas.drag=true;atlas.lastX=ev.clientX;atlas.lastY=ev.clientY;cv.setPointerCapture(ev.pointerId);});
 cv.addEventListener('pointermove',ev=>{if(!atlas.drag)return;const f=atlasScale();atlas.x-=(ev.clientX-atlas.lastX)/f;atlas.y-=(ev.clientY-atlas.lastY)/f;atlas.lastX=ev.clientX;atlas.lastY=ev.clientY;atlas.dirty=true;});
 cv.addEventListener('pointerup',()=>atlas.drag=false);cv.addEventListener('pointercancel',()=>atlas.drag=false);
 cv.addEventListener('wheel',ev=>{ev.preventDefault();atlas.zoom=clamp(atlas.zoom*(ev.deltaY>0?.82:1.22),.008,4.2);atlas.dirty=true;},{passive:false});
 $('atlas-zoom-in').onclick=()=>{atlas.zoom=clamp(atlas.zoom*1.3,.008,4.2);atlas.dirty=true;};
 $('atlas-zoom-out').onclick=()=>{atlas.zoom=clamp(atlas.zoom/1.3,.008,4.2);atlas.dirty=true;};
 $('atlas-center').onclick=()=>{atlas.x=player.x;atlas.y=player.y;atlas.dirty=true;};
 requestAnimationFrame(drawAtlas);
}
function showPause(){show(`<div class="hero-kicker">ПУТЕШЕСТВИЕ ПРИОСТАНОВЛЕНО</div><div class="overlay-title">ПАУЗА</div><p class="overlay-copy">Твоё место во Вселенной сохранено. Материя и улучшения останутся с тобой.</p><div class="stat-list"><div><strong>${fmt(g.total)}</strong><small>Всего материи</small></div><div><strong>${timeFmt(g.time)}</strong><small>Игровое время</small></div><div><strong>${g.collects}</strong><small>Поглощено объектов</small></div><div><strong>${g.rare}</strong><small>Реликвий найдено</small></div></div><div class="modal-actions">${continueButton()}<button id="pause-map" class="secondary-button">Карта</button></div>`);attachContinue();$('pause-map').onclick=showMap;}
function showSettings(){show(`<div class="eyebrow">ПАРАМЕТРЫ ПОЛЁТА</div><div class="overlay-title">НАСТРОЙКИ</div><div class="settings-line"><span>Управление мышью</span><select id="set-control-mode"><option value="hold" ${g.controlMode==='hold'?'selected':''}>Зажать кнопку и направлять</option><option value="follow" ${g.controlMode==='follow'?'selected':''}>Следовать за курсором</option><option value="keys" ${g.controlMode==='keys'?'selected':''}>Только клавиатура</option></select></div><div class="settings-line"><span>Отклик движения</span><select id="set-flight-feel"><option value="direct" ${g.flightFeel==='direct'?'selected':''}>Точный, без инерции</option><option value="smooth" ${g.flightFeel==='smooth'?'selected':''}>Плавный, с инерцией</option></select></div><p class="overlay-copy" style="text-align:left">WASD / стрелки — точное движение. По умолчанию объект плавно следует за курсором без нажатия. WASD — точное движение, на телефоне — джойстик. E — необязательный импульс, Shift — рывок.</p><div class="settings-line"><span>Кинематографичная космическая музыка</span><input id="set-music" type="checkbox" ${g.music?'checked':''}></div><div class="settings-line"><span>Громкость музыки</span><input id="set-music-volume" type="range" min="0" max="100" value="${Math.round(g.musicVolume*100)}" aria-label="Громкость музыки"></div><p class="overlay-copy" style="text-align:left">Оригинальный саундтрек: медленное органное звучание и пространственный эмбиент. Музыка запускается после нажатия «Играть».</p><div class="settings-line"><span>Звуковые эффекты</span><input id="set-sound" type="checkbox" ${g.sound?'checked':''}></div><div class="settings-line"><span>Частицы и вспышки</span><input id="set-particles" type="checkbox" ${g.particles?'checked':''}></div><div class="settings-line"><span>Качество эффектов</span><select id="set-quality"><option value="1" ${g.quality===1?'selected':''}>Высокое</option><option value="0.5" ${g.quality===.5?'selected':''}>Экономное</option></select></div><p class="overlay-copy" style="text-align:left">M — карта, P — пауза. Схема управления сохраняется между запусками.</p><div class="modal-actions">${continueButton('СОХРАНИТЬ И ИГРАТЬ')}<button class="secondary-button" id="btn-new-universe">НОВАЯ ИГРА</button></div>`);attachContinue();$('btn-new-universe').onclick=restartCampaign;$('set-control-mode').onchange=e=>{g.controlMode=e.target.value;clearFlightInput();save();};$('set-flight-feel').onchange=e=>{g.flightFeel=e.target.value;save();};$('set-music').onchange=e=>{g.music=e.target.checked;initAudio();setMusicVolume();save();};$('set-music-volume').oninput=e=>{g.musicVolume=+e.target.value/100;setMusicVolume();save();};$('set-sound').onchange=e=>{g.sound=e.target.checked;save();};$('set-particles').onchange=e=>{g.particles=e.target.checked;save();};$('set-quality').onchange=e=>{g.quality=Number(e.target.value);performanceScale=1;applyResolution();save();};}
function restartCampaign(){
 if(!confirm('Начать новую Вселенную? Текущий прогресс будет сохранён в резервной копии.'))return;
 try{localStorage.setItem(SAVE_KEY+'-backup',localStorage.getItem(SAVE_KEY)||'');}catch(_){}
 const next=fresh();Object.assign(g,next);visitedChunks.clear();loadedChunks.clear();distantChunkCache.clear();macroLoaded.clear();macroCache.clear();macroLODCache.clear();if(macroBackdrop){macroBackdrop.canvas.width=0;macroBackdrop.canvas.height=0;macroBackdrop=null;}if(macroBackdropOld){macroBackdropOld.canvas.width=0;macroBackdropOld=null;}macroEntities=[];entities=[];
 if(TEST_MODE){Object.assign(tester,TEST_DEFAULTS);saveTester();}
 player.x=0;player.y=0;player.vx=player.vy=0;player.r=player.targetR=radiusAt(0,0);lastReveal={x:Infinity,y:Infinity,r:-Infinity};
 player.trail=[];camera.x=camera.y=0;camera.zoom=1;particles=[];shockwaves=[];energyArcs=[];texts=[];
 screenFlash=0;morph=null;running=true;visitPosition();streamField();save();renderUI(true);testerRefresh();testerToggle(false);
 $('modal').classList.add('off');toast('Новая Вселенная создана · предыдущий прогресс сохранён');
}
function testerRefresh(){
 const panel=$('tester-panel');if(!panel)return;
 $('tester-tier').value=String(g.tier);
 $('tester-credits').value=String(Math.round(g.credits));
 const progress=panel.querySelector('[data-test="progress"]');progress.value=String(Math.round(stageFraction()*100));
 $('test-progress-val').textContent=progress.value+'%';
 for(const k of ['speed','gravity','loot','zoom','density']){
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
Object.defineProperty(window,'CosmicEvolutionDebug',{get:()=>({tier:g.tier,matter:g.matter,playerRadius:player.r,targetRadius:player.targetR,cameraZoom:camera.zoom,total:g.total,credits:g.credits,elapsed:g.time,objects:entities.length,particles:particles.length,playerX:player.x,playerY:player.y,loadedSectors:loadedChunks.size,visitedSectors:exploredCount(),visitedExactSectors:visitedChunks.size,visitedDiscs:g.discoveryDiscs.length,depletedSectors:Object.keys(g.depleted).length,music:g.music,running,progress:g.matter/TA[g.tier].required,forms:TA.length,renderTicks,fps:Math.round(frameFps),renderScale:performanceScale,controlMode:g.controlMode,flightFeel:g.flightFeel,stickActive:stick.active,mouseDown:pointer.down,velocityX:player.vx,velocityY:player.vy,mission:missionReq(),tester:TEST_MODE?{...tester}:null,testMode:TEST_MODE,farSectors:distantChunkCache.size,nearbyCollected:g.collects,activeSoundSources:pickupCount,macroPositions:macroEntities.slice(0,5).map(e=>[e.chunk,e.index,e.x,e.y]),visibleSectorQuota:sectorQuota(chunkInfo(Math.floor(player.x/CHUNK),Math.floor(player.y/CHUNK)),Math.floor(player.x/CHUNK),Math.floor(player.y/CHUNK)),macroVisible:macroVisibleCount,macroActive:macroEntities.length,macroHoles:macroEntities.filter(e=>e.kind==='blackhole').length,galaxyPalettes:GALAXY_PALETTES.length,macroDepleted:Object.keys(g.depletedMacro).length,cosmicDepleted:Object.keys(g.depletedCosmic).length,cosmicHarvestTimer,complete:g.complete,endless:g.endless,baseRadius:radiusAt(g.tier,0),endlessRadiusMultiplier:g.tier===TA.length-1?currentRadius()/radiusAt(g.tier,0):1,atlasZoom:atlas.zoom,materials:{...g.materials},recipe:stageRecipe(),stageExplored:g.stageExplored})});
})();
