/* Cosmic Evolution — dependency-free 2D Canvas game. No 3D / external game engines. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('universe');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const TAU = Math.PI * 2;
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
 ['ВСЕЛЕННАЯ','Бесконечность','От одной частицы — до всего, что существует.','universe','#e0cbff']
].map((a,i)=>({name:a[0],epoch:a[1],desc:a[2],type:a[3],color:a[4],required:Math.round(250+210*Math.pow(i+1,2.18))}));
const upgrades = [
 {id:'gravity',name:'Гравитация',label:'Радиус притяжения',glyph:'◎',base:35,growth:1.26,max:80},
 {id:'speed',name:'Движение',label:'Скорость полёта',glyph:'➤',base:50,growth:1.29,max:60},
 {id:'harvest',name:'Синтез материи',label:'Бонус к поглощению',glyph:'✦',base:65,growth:1.31,max:65},
 {id:'shield',name:'Стабильность',label:'Защита от опасностей',glyph:'⬡',base:80,growth:1.28,max:45}
];
const SAVE_KEY = 'cosmic-evolution-save-v1';
const fresh = () => ({version:1,tier:0,matter:0,credits:0,total:0,time:0,collects:0,rare:0,pulses:0,losses:0,unlocks:0,stageCollects:0,stageRare:0,stagePulses:0,upgrade:{gravity:0,speed:0,harvest:0,shield:0},sound:true,particles:true,quality:1,music:true,musicVolume:.30,worldX:0,worldY:0,complete:false,visited:[],depleted:{},stageExplored:0,rebalanceV:2});
let g = fresh();
try {const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
 if(s&&s.version===1&&Number.isFinite(s.tier)&&s.tier>=0&&s.tier<TA.length){
  g={...fresh(),...s,upgrade:{...fresh().upgrade,...s.upgrade},visited:Array.isArray(s.visited)?s.visited:[],depleted:s.depleted&&typeof s.depleted==='object'?s.depleted:{}};
  // Respect the percentage of old stage progress instead of shrinking players after the rebalance.
  if(s.rebalanceV!==2){
   const oldReq=Math.round(110+45*Math.pow(g.tier,1.68));
   g.matter=Math.round(clamp(g.matter/oldReq,0,1)*TA[g.tier].required);
   g.rebalanceV=2;
  }
 }
}catch(_){/* storage may be unavailable */}
let W=innerWidth,H=innerHeight,dpr=1,last=performance.now(),running=false,uiTimer=0,saveTimer=0,eventTimer=0;
// Physical size is continuous across all stages, including save/load and evolution.
// Stage boundaries are continuous: end of tier N equals start of tier N+1.
function stageFraction(){return clamp(g.matter/TA[g.tier].required,0,1);}
function radiusAt(tier,fraction){return 13*Math.pow(1.125,tier+clamp(fraction,0,1));}
const initialRadius=radiusAt(g.tier,stageFraction());
let player={x:Number.isFinite(g.worldX)?g.worldX:0,y:Number.isFinite(g.worldY)?g.worldY:0,vx:0,vy:0,r:initialRadius,targetR:initialRadius,rotation:0,shield:0,trail:[]};
let camera={x:player.x,y:player.y,zoom:1};
let entities=[],particles=[],shockwaves=[],texts=[],stars=[],nebula=[],energyArcs=[];let morph=null,screenFlash=0,streamTimer=0;const CHUNK=480;const loadedChunks=new Set();const visitedChunks=new Set(Array.isArray(g.visited)?g.visited:[]);if(!g.depleted||typeof g.depleted!=='object')g.depleted={};const WORLD_SEED=0x17aba37;
let keys=new Set(),pointer={x:W/2,y:H/2,active:false,down:false,type:'mouse'};
let pulseCd=0,boostCd=0,boostTime=0,shake=0,renderTicks=0;let atlasVisible=false,atlas={x:0,y:0,zoom:1,drag:false,lastX:0,lastY:0,dirty:true};
let soundCtx=null;let musicMaster=null,musicFX=null,musicLoop=null,musicNext=0,musicBeat=0;
const cssColor = (h,a) => h.startsWith('#')?`rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${a})`:`rgba(119,190,255,${a})`;
function sound(freq=350,type='sine',duration=.075,vol=.045){if(!g.sound)return;try{soundCtx??=new (window.AudioContext||window.webkitAudioContext)();if(soundCtx.state==='suspended')soundCtx.resume();const osc=soundCtx.createOscillator(),gain=soundCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,soundCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.63),soundCtx.currentTime+duration);gain.gain.setValueAtTime(vol,soundCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,soundCtx.currentTime+duration);osc.connect(gain);gain.connect(soundCtx.destination);osc.start();osc.stop(soundCtx.currentTime+duration+.01);}catch(_){}}
// Original procedurally composed cinematic space ambient — not the film soundtrack.
const musicChords=[[45,52,57,60,64],[41,48,53,57,60],[38,45,50,53,57],[43,50,55,59,62],[40,47,52,55,59],[36,43,48,52,55]];
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
function missionReq(){return {rare:Math.round(6+g.tier*4.5),explore:Math.round(120+130*g.tier),collect:Math.round(TA[g.tier].required*.22)}}
function missionsDone(){const m=missionReq();return g.stageCollects>=m.collect&&g.stageRare>=m.rare&&g.stageExplored>=m.explore;}
function upgradeCost(u){return Math.round(u.base*Math.pow(u.growth,g.upgrade[u.id]));}
function buy(id){const u=upgrades.find(x=>x.id===id);if(!u)return;const cost=upgradeCost(u);if(g.upgrade[id]>=u.max||g.credits<cost){toast('Недостаточно звёздной пыли');return;}g.credits-=cost;g.upgrade[id]++;sound(590,'triangle',.13);burst(player.x,player.y,20,'#81e5ec',1);renderUI(true);save();}
function populateUpgrades(){const root=$('upgrades');root.textContent='';for(const u of upgrades){let b=document.createElement('button');b.className='upgrade';b.dataset.upgrade=u.id;b.addEventListener('click',()=>buy(u.id));b.innerHTML=`<span class="upgrade-icon">${u.glyph}</span><span class="upgrade-description"><strong>${u.name}</strong><small>${u.label} · <span class="upgrade-level"></span></small></span><span class="upgrade-cost"><span class="upgrade-price"></span><small>✦ цена</small></span>`;root.append(b);}}
populateUpgrades();
function renderUI(force=false){
 $('matter-value').textContent=fmt(g.total);$('credit-value').textContent=fmt(g.credits);$('time-value').textContent=timeFmt(g.time);
 const t=TA[g.tier],next=TA[g.tier+1],progress=clamp(g.matter/t.required,0,1);
 $('tier-number').innerHTML=`${String(g.tier+1).padStart(2,'0')} <span>/ ${TA.length}</span>`;
 $('epoch-name').textContent=t.epoch.toUpperCase();$('tier-title').textContent=t.name;$('tier-desc').textContent=t.desc;
 $('current-form').textContent=t.name;$('next-form').textContent=next?.name??'ЭВОЛЮЦИЯ ЗАВЕРШЕНА';
 $('progress-fill').style.width=(progress*100).toFixed(1)+'%';$('progress-percent').textContent=progress>=1&&!missionsDone()?'ВЫПОЛНИ ЗАДАЧИ':Math.round(progress*100)+'%';
 const m=missionReq(),cs=[g.stageCollects>=m.collect,g.stageRare>=m.rare,g.stageExplored>=m.explore];
 $('mission-1-label').textContent='Поглощай материю';$('mission-1-val').textContent=`${fmt(g.stageCollects)}/${fmt(m.collect)}`;
 $('mission-2-label').textContent='Найди реликвии';$('mission-2-val').textContent=`${g.stageRare}/${m.rare}`;
 $('mission-3-label').textContent='Открой новые секторы';$('mission-3-val').textContent=`${g.stageExplored}/${m.explore}`;
 cs.forEach((ok,i)=>{const e=$(`mission-${i+1}`);e.classList.toggle('done',ok);e.querySelector('.mission-mark').textContent=ok?'✓':'◇';});$('mission-done').textContent=cs.filter(Boolean).length+'/3';
 for(const u of upgrades){let b=$('upgrades').querySelector(`[data-upgrade="${u.id}"]`),lvl=g.upgrade[u.id],c=upgradeCost(u);b.querySelector('.upgrade-level').textContent=`ур. ${lvl}/${u.max}`;b.querySelector('.upgrade-price').textContent=lvl>=u.max?'MAX':fmt(c);b.disabled=g.credits<c||lvl>=u.max;}
 $('pulse-cooldown').textContent=pulseCd>0?pulseCd.toFixed(1)+'с':'E · ГОТОВ';$('boost-cooldown').textContent=boostCd>0?boostCd.toFixed(1)+'с':'SHIFT · ГОТОВ';
 $('pulse-fill').style.transform=`scaleX(${clamp(1-pulseCd/13,0,1)})`;$('boost-fill').style.transform=`scaleX(${clamp(1-boostCd/6,0,1)})`;
 $('zoom-label').textContent=`РАЗМЕР ${player.r.toFixed(1)} · КАМЕРА ${camera.zoom.toFixed(2)}×`;
 $('btn-music').textContent=g.music?'♫':'♪̸';$('btn-music').setAttribute('aria-label',g.music?'Выключить музыку':'Включить музыку');const sx=Math.floor(player.x/CHUNK),sy=Math.floor(player.y/CHUNK);$('world-label').textContent=`${t.epoch.toUpperCase()} · НЕИЗВЕДАННАЯ ВСЕЛЕННАЯ`;$('world-subtitle').textContent=`СЕКТОР ${sx} : ${sy}  ·  ОТКРЫТО ${visitedChunks.size}`;
 if(force)save();
}
// World is deterministic: the same sector always has the same matter, even after a restart.
// 32 fixed objects per sector allow a single 32-bit bitmask to remember everything harvested.
function spawn(x,y,forced,rng=Math.random){
 const kind=forced||(rng()<.06?'hazard':rng()<.045?'relic':'matter');
 const angle=rng()*TAU,speed=0; // Uncollected bodies never drift or move randomly between visits.
 return {x,y,vx:0,vy:0,kind,r:kind==='hazard'?20+rng()*12:kind==='relic'?9+rng()*4:3+rng()*6,
 spin:rng()*TAU,twinkle:rng()*TAU,value:kind==='relic'?17+rng()*15:.75+rng()*2.15,
 hue:kind==='hazard'?2+rng()*28:kind==='relic'?38+rng()*22:[185,195,205,225,255,275][Math.floor(rng()*6)],dead:false};
}
function seedHash(a,b){let x=Math.imul(a,374761393)^Math.imul(b,668265263)^WORLD_SEED;x=Math.imul(x^(x>>>13),1274126177);return (x^(x>>>16))>>>0;}
function chunkRandom(seed){return ()=>{seed+=0x6D2B79F5;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function chunkKey(x,y){return `${x},${y}`;}
function chunkInfo(cx,cy){let seed=seedHash(cx,cy),h=seed%100;return {biome:h<11?'nebula':h<26?'rich':h<35?'void':h<41?'relic':'normal',seed};}
function visitPosition(){
 const cx=Math.floor(player.x/CHUNK),cy=Math.floor(player.y/CHUNK),key=chunkKey(cx,cy);
 if(!visitedChunks.has(key)){visitedChunks.add(key);g.visited.push(key);g.stageExplored=(g.stageExplored||0)+1;if(g.stageExplored%10===0)toast(`◈ Открыто ${g.stageExplored} новых секторов`);}
}
function markHarvested(e){
 if(e.chunk!==undefined&&Number.isInteger(e.index)){
  const bit=(1<<e.index)>>>0;g.depleted[e.chunk]=((g.depleted[e.chunk]||0)|bit)>>>0;
 }
}
function makeChunk(cx,cy){
 const key=chunkKey(cx,cy);if(loadedChunks.has(key))return;loadedChunks.add(key);
 const info=chunkInfo(cx,cy),rng=chunkRandom(info.seed),mask=(g.depleted[key]||0)>>>0;
 for(let i=0;i<32;i++){
  const px=(cx+rng())*CHUNK,py=(cy+rng())*CHUNK;
  const r=rng(),v=rng();let kind=info.biome==='void'?(r<.10?'matter':r<.16?'relic':'hazard'):
       info.biome==='relic'?(r<.24?'relic':r<.29?'hazard':'matter'):
       info.biome==='rich'?(r<.08?'relic':r<.13?'hazard':'matter'):
       info.biome==='nebula'?(r<.075?'relic':r<.11?'hazard':'matter'):
       r<.038?'relic':r<.10?'hazard':'matter';
  // Starting area is accessible without early fatal hazards.
  if(Math.hypot(px,py)<110)kind='matter';
  if((mask&(1<<i))!==0)continue;
  let e=spawn(px,py,kind,rng);e.chunk=key;e.index=i;
  // Regions farther from the origin contain physically larger, richer bodies.
  // Grade depends only on sector coordinates, never on player tier, so revisits stay consistent.
  const dist=Math.hypot(cx,cy),grade=clamp(Math.floor(Math.log(1+dist/3)/Math.log(1.46)),0,27);
  const sizeMultiplier=Math.pow(1.125,grade);
  e.grade=grade;
  e.r*=sizeMultiplier*(i%17===0?1.45:1);
  e.value*=1+Math.pow(sizeMultiplier,1.65)*.42;
  if(info.biome==='rich')e.value*=2.1;
  if(info.biome==='nebula')e.hue=285;
  entities.push(e);
 }
}
function streamField(){
 // Physics and individual sprites exist only around the player. The far field uses stars/nebulae.
 // This prevents 4K zoom-outs from loading thousands of gradient/shadow draw calls.
 const cx0=Math.floor(player.x/CHUNK),cy0=Math.floor(player.y/CHUNK),radius=3;
 const left=cx0-radius,right=cx0+radius,top=cy0-radius,bottom=cy0+radius;
 const active=new Set();for(let cy=top;cy<=bottom;cy++)for(let cx=left;cx<=right;cx++){
  const k=chunkKey(cx,cy);active.add(k);makeChunk(cx,cy);
 }
 for(const k of loadedChunks)if(!active.has(k))loadedChunks.delete(k);
 entities=entities.filter(e=>!e.dead&&active.has(e.chunk));
}
function respawn(e){markHarvested(e);e.dead=true;}
visitPosition();streamField();
function burst(x,y,n,color='#7ed9ff',scale=1){const cap=g.particles?Math.min(30,n):Math.min(5,n);for(let i=0;i<cap;i++){const a=rand(0,TAU),sp=rand(35,180)*scale;particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rand(.3,.9),max:.9,r:rand(1,3.4)*scale,color});}if(particles.length>420)particles.splice(0,particles.length-420);}
function popText(x,y,text,color='#c7ebff'){texts.push({x,y,text,color,life:1.1});if(texts.length>35)texts.shift();}
function absorb(e){const val=Math.max(1,Math.round(e.value*(1+g.upgrade.harvest*.075)));g.matter+=val;g.total+=val;g.stageCollects+=val;g.collects++;let credits=e.kind==='relic'?Math.round(val*1.7):Math.max(1,Math.floor(val*.75));g.credits+=credits;if(e.kind==='relic'){g.stageRare++;g.rare++;burst(e.x,e.y,22,'#f9d797',.9);popText(e.x,e.y,'+'+val+' ✦','#ffe4a2');sound(700,'sine',.18,.02);}else if(Math.random()<.24){burst(e.x,e.y,4,'#8bdcfb',.35);}
 // The current physical size reacts to each collected object, not just to a stage transition.
 player.targetR=radiusAt(g.tier,stageFraction());
 if(Math.random()<.08)popText(e.x,e.y,'+'+val);if(g.particles&&Math.random()<.36)energyArcs.push({x:e.x,y:e.y,toX:player.x,toY:player.y,r:e.r,life:.24,max:.24,color:e.kind==='relic'?'#ffe7af':'#77dfff'});respawn(e);if(g.matter>=TA[g.tier].required&&missionsDone())evolve();}
// Bodies larger than you stay in the universe; avoid them until you outgrow them.
function collideWithGiant(e,dx,dy,dist){
 if(player.shield>0)return;
 const ux=dx/(dist||1),uy=dy/(dist||1);
 player.x+=ux*3;player.y+=uy*3;player.vx+=ux*130;player.vy+=uy*130;
 player.shield=.9;shake=5;
 const lost=Math.ceil(Math.min(g.matter*.035,TA[g.tier].required*.009));
 g.matter=Math.max(0,g.matter-lost);g.losses++;
 popText(player.x,player.y-player.r,'СЛИШКОМ БОЛЬШОЙ','#ffaba9');
 sound(135,'triangle',.16,.022);
}
function impact(e){if(player.shield>0){respawn(e);return;}const reduction=Math.max(.15,1-g.upgrade.shield*.018),lost=Math.ceil(Math.min(g.matter*.09,TA[g.tier].required*.028)*reduction);g.matter=Math.max(0,g.matter-lost);g.losses++;player.shield=1.3;shake=14;burst(player.x,player.y,30,'#ff777a');popText(player.x,player.y,`−${lost} МАТЕРИИ`,'#ff9f9b');sound(112,'sawtooth',.3,.065);respawn(e);}
function evolve(){
 if(g.tier===TA.length-1){g.complete=true;running=false;save();showFinal();return;}
 const before=g.tier;
 g.tier++;g.unlocks++;g.matter=0;g.stageCollects=0;g.stageRare=0;g.stagePulses=0;g.stageExplored=0;
 // Never alter world coordinates, velocity, camera center or nearby sectors on evolution.
 morph={from:before,time:0,duration:2.1};screenFlash=.9;
 // No size reset on evolution: the new tier begins exactly where the previous ended.
 player.targetR=radiusAt(g.tier,0);player.shield=3;shake=6;
 shockwaves.push({x:player.x,y:player.y,r:12,life:2.2,max:2.2,color:TA[g.tier].color,range:210});
 burst(player.x,player.y,100,TA[g.tier].color,2.1);
 energyArcs.push({x:player.x,y:player.y,life:2.2,max:2.2,r:player.r*2.5,color:TA[g.tier].color});
 popText(player.x,player.y-70,TA[g.tier].name.toUpperCase(),TA[g.tier].color);
 toast(`✦ НОВАЯ ФОРМА: ${TA[g.tier].name.toUpperCase()}`,'golden');sound(440,'triangle',.6,.055);
 renderUI(true);
}
function activatePulse(){if(!running||pulseCd>0)return;pulseCd=13;g.pulses++;g.stagePulses++;const range=270+g.upgrade.gravity*7;shockwaves.push({x:player.x,y:player.y,r:10,max:1.2,life:1.2,color:'#84dfff',range});for(let e of entities){let dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy);if(d<range){if(e.kind==='hazard'){burst(e.x,e.y,18,'#ffb6a5');e.kind='relic';e.r=11;e.value=30+g.tier*2;}else{e.vx+=(player.x-e.x)/(d||1)*Math.max(110,650-d*1.5);e.vy+=(player.y-e.y)/(d||1)*Math.max(110,650-d*1.5);}}}shake=5;toast('◉ ГРАВИТАЦИОННЫЙ ИМПУЛЬС');sound(245,'sine',.55,.055);renderUI();}
function activateBoost(){if(!running||boostCd>0)return;boostCd=6;boostTime=1.15;player.shield=Math.max(player.shield,.7);burst(player.x,player.y,20,'#bd9bff');sound(440,'triangle',.23);}
function update(dt){
 g.time+=dt;saveTimer+=dt;eventTimer+=dt;streamTimer+=dt;screenFlash=Math.max(0,screenFlash-dt*.8);if(morph){morph.time+=dt;if(morph.time>=morph.duration)morph=null;}pulseCd=Math.max(0,pulseCd-dt);boostCd=Math.max(0,boostCd-dt);boostTime=Math.max(0,boostTime-dt);player.shield=Math.max(0,player.shield-dt);shake=Math.max(0,shake-dt*30);
 let ax=0,ay=0;if(keys.has('w')||keys.has('arrowup'))ay-=1;if(keys.has('s')||keys.has('arrowdown'))ay+=1;if(keys.has('a')||keys.has('arrowleft'))ax-=1;if(keys.has('d')||keys.has('arrowright'))ax+=1;
 if(ax===0&&ay===0&&pointer.active){ax=(pointer.x-W/2)/Math.max(100,W*.26);ay=(pointer.y-H/2)/Math.max(100,H*.29);if(Math.hypot(ax,ay)<.11)ax=ay=0;}
 let mag=Math.hypot(ax,ay);if(mag>0){ax/=mag;ay/=mag;}
 player.targetR=radiusAt(g.tier,stageFraction());
 player.r+=(player.targetR-player.r)*(1-Math.exp(-dt*4.5));
 const speed=(230+Math.min(190,g.upgrade.speed*5.2))*(1+Math.log2(1+player.r/25)*.35)*(boostTime>0?2.5:1),lerp=1-Math.exp(-dt*9);player.vx+=(ax*speed-player.vx)*lerp;player.vy+=(ay*speed-player.vy)*lerp;
 player.x+=player.vx*dt;player.y+=player.vy*dt;visitPosition();player.rotation+=dt*(.13+Math.hypot(player.vx,player.vy)/850);
 if(Math.hypot(player.vx,player.vy)>28&&Math.random()<dt*24){player.trail.push({x:player.x,y:player.y,r:player.r,life:.55});}
 player.trail.forEach(p=>p.life-=dt);player.trail=player.trail.filter(p=>p.life>0).slice(-30);
 let gravRange=Math.max(97+g.upgrade.gravity*7,player.r*2.8),collectR=player.r+4;
 for(const e of entities){let dx=player.x-e.x,dy=player.y-e.y,dist2=dx*dx+dy*dy;
   const reach=gravRange+e.r+80;if(dist2>reach*reach)continue;
   const dist=Math.sqrt(dist2)||1;
   if(e.kind!=='hazard'&&e.r<=player.r*.82&&dist<gravRange){const pull=(gravRange-dist)/gravRange;e.vx+=dx/dist*(150+pull*520)*dt;e.vy+=dy/dist*(150+pull*520)*dt;}
   e.vx*=Math.exp(-dt*.62);e.vy*=Math.exp(-dt*.62);e.x+=e.vx*dt;e.y+=e.vy*dt;e.spin+=dt*.6;e.twinkle+=dt*2.5;
   if(Math.hypot(player.x-e.x,player.y-e.y)<collectR+e.r){
     if(e.kind==='hazard')impact(e);
     else if(e.r>player.r*.82)collideWithGiant(e,dx,dy,dist);
     else absorb(e);
   }
   // Objects outside the viewport are unloaded by streamField, never marked as consumed.
 }
 entities=entities.filter(e=>!e.dead);if(streamTimer>.32){streamTimer=0;streamField();}
 // No random refill events: only unexplored, persistent sectors supply new matter.
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*2);p.vy*=Math.exp(-dt*2);p.life-=dt;}
 particles=particles.filter(p=>p.life>0);
 for(const p of shockwaves){p.life-=dt;p.r+=(p.range||700)*dt;}shockwaves=shockwaves.filter(p=>p.life>0);for(const arc of energyArcs)arc.life-=dt;energyArcs=energyArcs.filter(arc=>arc.life>0);
 texts.forEach(p=>{p.y-=dt*28;p.life-=dt;});texts=texts.filter(p=>p.life>0);
 // Tasty-Planet-style zoom: the camera follows physical size rather than abstract levels.
 // It deliberately zooms out slower than the body grows, so screen size also increases.
 const zTarget=clamp(1.45/Math.pow(1+player.r/70,.62),.25,1.25);camera.zoom+=(zTarget-camera.zoom)*(1-Math.exp(-dt*3.5));camera.x+=(player.x-camera.x)*(1-Math.exp(-dt*5));camera.y+=(player.y-camera.y)*(1-Math.exp(-dt*5));
 uiTimer+=dt;if(uiTimer>.3){uiTimer=0;renderUI();}
 if(saveTimer>12){saveTimer=0;save();}
}
function project(x,y){return {x:(x-camera.x)*camera.zoom+W/2,y:(y-camera.y)*camera.zoom+H/2};}
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
  else{const halo=ctx.createRadialGradient(x,y,0,x,y,r*2.1);halo.addColorStop(0,'#ffffff');halo.addColorStop(.2,'#c3a8ff');halo.addColorStop(.55,'rgba(74,80,210,.30)');halo.addColorStop(1,'rgba(36,42,90,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*2.1,0,TAU);ctx.fill();for(let i=0;i<5;i++){ctx.strokeStyle=i%2?'#9fcaff':'#e1c6ff';ctx.globalAlpha=.65;ctx.lineWidth=1.7;ctx.beginPath();ctx.ellipse(x,y,r*(.8+i*.23),r*(.34+i*.15),phase*.1+i*.7,0,TAU);ctx.stroke();}ctx.globalAlpha=1;glowDot(x,y,r*.25,'#ffffff');}
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
  case 27: for(let i=0;i<6;i++){let a=i*TAU/6+rot*.1;orbit(r*(.45+i*.20),r*(.30+i*.13),a,'#ebd3ff66',Math.max(1,r*.016));}break;
 }
 ctx.restore();
}
// Three LOD levels: a cheap pixel at distance, plain discs in the middle,
// detailed shapes close to the player. The object itself is never deleted by LOD.
function renderEntity(e,time){
 const px=(e.x-camera.x)*camera.zoom+W/2,py=(e.y-camera.y)*camera.zoom+H/2;
 const r=e.r*camera.zoom;
 if(px<-r-12||px>W+r+12||py<-r-12||py>H+r+12)return;
 const near=(e.x-player.x)**2+(e.y-player.y)**2<560*560;
 if(r<1.6){ctx.fillStyle=e.kind==='hazard'?'#ed6d88':e.kind==='relic'?'#ffd790':'#8bc9ed';ctx.fillRect(px,py,1.8,1.8);return;}
 if(e.kind==='matter'){
  const color=e.hue===285?'#ac8df4':e.hue<210?'#6dccfa':e.hue<250?'#93a4e9':'#b7a0f3';
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
function renderPlayer(time){const t=TA[g.tier],p=project(player.x,player.y),r=player.r*camera.zoom;ctx.save();
 for(const tr of player.trail){let q=project(tr.x,tr.y),alpha=tr.life/.55;ctx.fillStyle=cssColor(t.color,alpha*.1);ctx.beginPath();ctx.arc(q.x,q.y,tr.r*camera.zoom*(.45+alpha*.3),0,TAU);ctx.fill();}
 // Gravity field ring and orbiting shards.
 let range=Math.max(97+g.upgrade.gravity*7,player.r*2.8)*camera.zoom;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(player.rotation*.18);ctx.strokeStyle=cssColor(t.color,.11);ctx.lineWidth=1.2;ctx.setLineDash([3,9]);ctx.beginPath();ctx.arc(0,0,range,0,TAU);ctx.stroke();ctx.setLineDash([]);
 let count=Math.min(18,3+Math.floor(g.tier/2));for(let i=0;i<count;i++){let a=player.rotation*(i%2?1:-1)*(0.65+(i%4)*.08)+i*TAU/count,R=r*(1.8+(i%3)*.24),xx=Math.cos(a)*R,yy=Math.sin(a)*R*.65;ctx.fillStyle=i%3?'#96baf8':'#ffdcaa';ctx.beginPath();ctx.arc(xx,yy,i%5===0?2.6:1.5,0,TAU);ctx.fill();}ctx.restore();
 if(morph){let f=clamp(morph.time/morph.duration,0,1);ctx.save();ctx.globalAlpha=(1-f)*.94;paintPlayerForm(p.x,p.y,r*(1.12-f*.12),time,morph.from);ctx.restore();ctx.save();ctx.globalAlpha=Math.min(1,f*1.65);paintPlayerForm(p.x,p.y,r*(.52+f*.48),time);ctx.restore();}else paintPlayerForm(p.x,p.y,r,time);
 // Swirling energy currents and magnetic filaments.
 if(g.particles){ctx.save();ctx.globalAlpha=.18+.10*Math.sin(time*1.5);ctx.strokeStyle=t.color;ctx.lineWidth=1.2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(p.x,p.y,r*(1.7+i*.27),time*.55+i*1.9,time*.55+i*1.9+1.65);ctx.stroke();}ctx.restore();}
 if(player.shield>0){ctx.strokeStyle=`rgba(132,236,255,${.2+.35*Math.sin(time*16)**2})`;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,r*1.35,0,TAU);ctx.stroke();}
 if(boostTime>0){ctx.strokeStyle='rgba(187,143,255,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,r*1.55+Math.sin(time*12)*3,0,TAU);ctx.stroke();}
 ctx.restore();}
function renderParticles(){for(const a of energyArcs){const q=project(a.x,a.y),target=project(a.toX??a.x,a.toY??a.y);ctx.save();ctx.globalAlpha=clamp(a.life/a.max,0,1)*.7;ctx.strokeStyle=a.color;ctx.lineWidth=1.25;ctx.beginPath();if(a.toX!==undefined){ctx.moveTo(q.x,q.y);let mx=(q.x+target.x)*.5,my=(q.y+target.y)*.5;ctx.quadraticCurveTo(mx+Math.sin(a.life*40)*14,my-14,target.x,target.y);}else{ctx.arc(q.x,q.y,a.r*camera.zoom*(1.4+(1-a.life/a.max)*4),0,TAU);}ctx.stroke();ctx.restore();}
for(const p of particles){const q=project(p.x,p.y);ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.5,p.r*camera.zoom),0,TAU);ctx.fill();}ctx.globalAlpha=1;for(const s of shockwaves){let q=project(s.x,s.y);ctx.save();ctx.globalAlpha=clamp(s.life/s.max,0,1)*.7;ctx.strokeStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=18;ctx.lineWidth=4*camera.zoom;ctx.beginPath();ctx.arc(q.x,q.y,s.r*camera.zoom,0,TAU);ctx.stroke();ctx.restore();}for(const p of texts){let q=project(p.x,p.y);ctx.save();ctx.globalAlpha=clamp(p.life,0,1);ctx.font='800 13px "Exo 2",sans-serif';ctx.textAlign='center';ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.fillStyle=p.color;ctx.fillText(p.text,q.x,q.y);ctx.restore();}}
function render(time){ctx.setTransform(dpr,0,0,dpr,0,0);sky(time);ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));for(const e of entities)renderEntity(e,time);renderPlayer(time);renderParticles();ctx.restore();if(screenFlash>0){ctx.fillStyle=`rgba(188,215,255,${screenFlash*.14})`;ctx.fillRect(0,0,W,H);}renderTicks++;}
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
function show(html){atlasVisible=false;$('modal').innerHTML=`<div class="modal-card">${html}</div>`;$('modal').classList.remove('off');running=false;save();}
function continueButton(label='ПРОДОЛЖИТЬ'){return `<button class="primary-button" id="btn-continue">${label} <span>→</span></button>`;}
function attachContinue(){const b=$('btn-continue');if(b)b.onclick=()=>{atlasVisible=false;running=true;startMusic();$('modal').classList.add('off');last=performance.now();};}
// The atlas reads the exact same deterministic sector data as gameplay; it is not an evolution-level menu.
function popcount32(x){x=x>>>0;x=x-((x>>>1)&0x55555555);x=(x&0x33333333)+((x>>>2)&0x33333333);return (((x+(x>>>4))&0x0F0F0F0F)*0x01010101)>>>24;}
function atlasScale(){return 27*atlas.zoom/CHUNK;}
function drawAtlas(){
 const canvas=$('atlas-canvas');if(!canvas)return;const bounds=canvas.getBoundingClientRect();if(bounds.width<10)return;
 const w=Math.round(bounds.width),h=Math.round(bounds.height),pixelRatio=Math.min(devicePixelRatio||1,1.5);
 if(canvas.width!==Math.floor(w*pixelRatio)||canvas.height!==Math.floor(h*pixelRatio)){canvas.width=Math.floor(w*pixelRatio);canvas.height=Math.floor(h*pixelRatio);}
 const c=canvas.getContext('2d');c.setTransform(pixelRatio,0,0,pixelRatio,0,0);
 c.fillStyle='#06101e';c.fillRect(0,0,w,h);
 const size=27*atlas.zoom,px=atlas.x/CHUNK,py=atlas.y/CHUNK;
 const left=Math.floor(px-w/(2*size))-1,right=Math.ceil(px+w/(2*size))+1,top=Math.floor(py-h/(2*size))-1,bottom=Math.ceil(py+h/(2*size))+1;
 const colors={normal:'#7d9eb5',rich:'#a9e4bc',nebula:'#c59eff',void:'#ea969a',relic:'#f3d58e'};
 let exhausted=0,charted=0;
 for(let cy=top;cy<=bottom;cy++)for(let cx=left;cx<=right;cx++){
  const x=w/2+(cx-px)*size,y=h/2+(cy-py)*size,key=chunkKey(cx,cy),surveyed=visitedChunks.has(key),info=chunkInfo(cx,cy),removed=popcount32(g.depleted[key]||0),remaining=32-removed;
  if(surveyed)charted++;if(removed>=32)exhausted++;
  c.strokeStyle=surveyed?'rgba(122,186,215,.22)':'rgba(91,127,169,.095)';c.lineWidth=.8;c.strokeRect(x+.5,y+.5,size,size);
  if(surveyed){c.fillStyle=removed>=32?'rgba(75,93,114,.15)':info.biome==='rich'?'rgba(74,166,121,.12)':info.biome==='nebula'?'rgba(148,105,218,.13)':info.biome==='relic'?'rgba(218,174,88,.12)':'rgba(55,113,153,.09)';c.fillRect(x+1,y+1,size-2,size-2);}
  if(size>=9){const col=colors[info.biome];let d=Math.max(1,Math.min(3.7,size*.125));c.globalAlpha=surveyed?Math.max(.15,remaining/32):.13;c.fillStyle=remaining===0?'#52677c':col;c.beginPath();c.arc(x+size*.5,y+size*.5,d,0,TAU);c.fill();c.globalAlpha=1;}
  if(surveyed&&remaining>0&&size>=25){c.fillStyle=colors[info.biome];c.globalAlpha=.52;for(let j=0;j<3;j++){let seed=seedHash(cx+j*7,cy-j*3),xx=x+(seed%70+15)/100*size,yy=y+((seed>>>8)%70+15)/100*size;c.fillRect(xx,yy,1.4,1.4);}c.globalAlpha=1;}
 }
 // Spawn is an actual origin marker, never a teleport destination.
 const ox=w/2-atlas.x/CHUNK*size,oy=h/2-atlas.y/CHUNK*size;
 if(ox>=-25&&oy>=-25&&ox<w+25&&oy<h+25){c.strokeStyle='#84adc3';c.lineWidth=1.2;c.beginPath();c.arc(ox,oy,6,0,TAU);c.stroke();c.fillStyle='#a0c5d9';c.font='10px Inter, sans-serif';c.fillText('НАЧАЛО',ox+11,oy-8);}
 const mx=w/2+(player.x-atlas.x)*size/CHUNK,my=h/2+(player.y-atlas.y)*size/CHUNK;
 if(mx>-18&&mx<w+18&&my>-18&&my<h+18){c.save();c.translate(mx,my);c.shadowColor='#76eaff';c.shadowBlur=19;c.fillStyle='#b7f5ff';c.beginPath();c.moveTo(0,-10);c.lineTo(8,8);c.lineTo(0,4);c.lineTo(-8,8);c.closePath();c.fill();c.restore();}
 // Coordinate axes remain visible at every zoom level.
 c.strokeStyle='rgba(147,200,234,.17)';c.beginPath();c.moveTo(w/2-13,h/2);c.lineTo(w/2+13,h/2);c.moveTo(w/2,h/2-13);c.lineTo(w/2,h/2+13);c.stroke();
 $('atlas-coords').textContent=`X ${Math.floor(atlas.x/CHUNK)} · Y ${Math.floor(atlas.y/CHUNK)}  /  масштаб ${atlas.zoom.toFixed(1)}×`;
 $('atlas-count').textContent=`Исследовано ${visitedChunks.size} · Опустошённых секторов: ${Object.values(g.depleted).filter(v=>((v>>>0)===0xffffffff)).length}`;
 atlas.dirty=false;
}
function showMap(){
 atlas={x:player.x,y:player.y,zoom:1,drag:false,lastX:0,lastY:0,dirty:true};
 show(`<div class="atlas-top"><div><div class="eyebrow">ГАЛАКТИЧЕСКАЯ НАВИГАЦИЯ</div><div class="overlay-title">БЕСКОНЕЧНАЯ КАРТА</div></div><span class="atlas-north">N ↑</span></div>
 <p class="atlas-description">Каждый сектор существует на постоянных координатах. Поглощённая материя не восстанавливается — ищи новые месторождения дальше от пройденного маршрута.</p>
 <div class="atlas-stats"><span id="atlas-count"></span><span id="atlas-coords"></span></div>
 <div class="atlas-wrap"><canvas id="atlas-canvas" aria-label="Интерактивная процедурная карта галактики — перетаскивайте, чтобы перемещать карту"></canvas><div class="atlas-controls"><button id="atlas-zoom-in" class="atlas-control" title="Приблизить">+</button><button id="atlas-zoom-out" class="atlas-control" title="Отдалить">−</button><button id="atlas-center" class="atlas-control center" title="Показать моё местоположение">⌖</button></div></div>
 <div class="atlas-legend"><span><i class="atlas-mark you"></i>ТЫ</span><span><i class="atlas-mark known"></i>ИЗУЧЕНО</span><span><i class="atlas-mark rich"></i>БОГАТЫЙ СЕКТОР</span><span><i class="atlas-mark relic"></i>РЕЛИКВИИ</span><span><i class="atlas-mark empty"></i>ОПУСТОШЕНО</span></div>
 <div class="atlas-footer"><small>Перетаскивай карту · Колёсико или +/− меняют масштаб · Тёмные области ещё не исследованы</small>${continueButton('ВЕРНУТЬСЯ В КОСМОС')}</div>`);
 $('modal').firstElementChild.classList.add('atlas-card');atlasVisible=true;atlas.dirty=true;attachContinue();
 const cv=$('atlas-canvas');cv.style.touchAction='none';
 cv.addEventListener('pointerdown',ev=>{atlas.drag=true;atlas.lastX=ev.clientX;atlas.lastY=ev.clientY;cv.setPointerCapture(ev.pointerId);});
 cv.addEventListener('pointermove',ev=>{if(!atlas.drag)return;const f=atlasScale();atlas.x-=(ev.clientX-atlas.lastX)/f;atlas.y-=(ev.clientY-atlas.lastY)/f;atlas.lastX=ev.clientX;atlas.lastY=ev.clientY;atlas.dirty=true;});
 cv.addEventListener('pointerup',()=>atlas.drag=false);cv.addEventListener('pointercancel',()=>atlas.drag=false);
 cv.addEventListener('wheel',ev=>{ev.preventDefault();atlas.zoom=clamp(atlas.zoom*(ev.deltaY>0?.82:1.22),.28,4.2);atlas.dirty=true;},{passive:false});
 $('atlas-zoom-in').onclick=()=>{atlas.zoom=clamp(atlas.zoom*1.3,.28,4.2);atlas.dirty=true;};
 $('atlas-zoom-out').onclick=()=>{atlas.zoom=clamp(atlas.zoom/1.3,.28,4.2);atlas.dirty=true;};
 $('atlas-center').onclick=()=>{atlas.x=player.x;atlas.y=player.y;atlas.dirty=true;};
 requestAnimationFrame(drawAtlas);
}
function showPause(){show(`<div class="hero-kicker">ПУТЕШЕСТВИЕ ПРИОСТАНОВЛЕНО</div><div class="overlay-title">ПАУЗА</div><p class="overlay-copy">Твоё место во Вселенной сохранено. Материя и улучшения останутся с тобой.</p><div class="stat-list"><div><strong>${fmt(g.total)}</strong><small>Всего материи</small></div><div><strong>${timeFmt(g.time)}</strong><small>Игровое время</small></div><div><strong>${g.collects}</strong><small>Поглощено объектов</small></div><div><strong>${g.rare}</strong><small>Реликвий найдено</small></div></div><div class="modal-actions">${continueButton()}<button id="pause-map" class="secondary-button">Карта</button></div>`);attachContinue();$('pause-map').onclick=showMap;}
function showSettings(){show(`<div class="eyebrow">ПАРАМЕТРЫ ПОЛЁТА</div><div class="overlay-title">НАСТРОЙКИ</div><div class="settings-line"><span>Кинематографичная космическая музыка</span><input id="set-music" type="checkbox" ${g.music?'checked':''}></div><div class="settings-line"><span>Громкость музыки</span><input id="set-music-volume" type="range" min="0" max="100" value="${Math.round(g.musicVolume*100)}" aria-label="Громкость музыки"></div><p class="overlay-copy" style="text-align:left">Оригинальный саундтрек: медленное органное звучание и пространственный эмбиент. Музыка запускается после нажатия «Играть».</p><div class="settings-line"><span>Звуковые эффекты</span><input id="set-sound" type="checkbox" ${g.sound?'checked':''}></div><div class="settings-line"><span>Частицы и вспышки</span><input id="set-particles" type="checkbox" ${g.particles?'checked':''}></div><div class="settings-line"><span>Качество эффектов</span><select id="set-quality"><option value="1" ${g.quality===1?'selected':''}>Высокое</option><option value="0.5" ${g.quality===.5?'selected':''}>Экономное</option></select></div><p class="overlay-copy" style="text-align:left">Управление: мышь / пальцем или WASD; E — импульс, Shift / пробел — рывок, M — карта, P — пауза.</p><div class="modal-actions">${continueButton('СОХРАНИТЬ И ИГРАТЬ')}<button class="secondary-button" id="btn-new-universe">НОВАЯ ИГРА</button></div>`);attachContinue();$('btn-new-universe').onclick=restartCampaign;$('set-music').onchange=e=>{g.music=e.target.checked;initAudio();setMusicVolume();save();};$('set-music-volume').oninput=e=>{g.musicVolume=+e.target.value/100;setMusicVolume();save();};$('set-sound').onchange=e=>{g.sound=e.target.checked;save();};$('set-particles').onchange=e=>{g.particles=e.target.checked;save();};$('set-quality').onchange=e=>{g.quality=Number(e.target.value);performanceScale=1;applyResolution();save();};}
function restartCampaign(){
 if(!confirm('Начать новую Вселенную? Текущий прогресс будет сохранён в резервной копии.'))return;
 try{localStorage.setItem(SAVE_KEY+'-backup',localStorage.getItem(SAVE_KEY)||'');}catch(_){}
 const next=fresh();Object.assign(g,next);visitedChunks.clear();loadedChunks.clear();entities=[];
 player.x=0;player.y=0;player.vx=player.vy=0;player.r=player.targetR=radiusAt(0,0);
 player.trail=[];camera.x=camera.y=0;camera.zoom=1;particles=[];shockwaves=[];energyArcs=[];texts=[];
 screenFlash=0;morph=null;running=true;visitPosition();streamField();save();renderUI(true);
 $('modal').classList.add('off');toast('Новая Вселенная создана · предыдущий прогресс сохранён');
}
function showFinal(){show(`<div class="hero-kicker">28 / 28 ФОРМ ОТКРЫТО</div><div class="overlay-title">ТЫ СТАЛ ВСЕЛЕННОЙ</div><p class="overlay-copy">От одинокой частицы до бесконечного космоса. Ты завершил путь Cosmic Evolution.</p><div class="stat-list"><div><strong>${timeFmt(g.time)}</strong><small>Время прохождения</small></div><div><strong>${fmt(g.total)}</strong><small>Поглощено материи</small></div><div><strong>${fmt(g.collects)}</strong><small>Космических объектов</small></div><div><strong>${g.rare}</strong><small>Найдено реликвий</small></div></div><p class="overlay-copy">Поздравляем с завершением космической эволюции!</p><div class="modal-actions"><button class="primary-button" id="btn-endless">ИССЛЕДОВАТЬ ДАЛЬШЕ →</button><button class="secondary-button" id="btn-new-universe">НОВАЯ ИГРА</button></div>`);$('btn-endless').onclick=()=>{running=true;$('modal').classList.add('off');last=performance.now();};$('btn-new-universe').onclick=restartCampaign;}
$('btn-start').onclick=()=>{running=true;startMusic();$('modal').classList.add('off');last=performance.now();if(!g.time)toast('✦ ИССЛЕДУЙ КОСМОС · ПОГЛОЩАЙ МАТЕРИЮ');};if(g.time>10)$('btn-start').innerHTML='ПРОДОЛЖИТЬ ПУТЕШЕСТВИЕ <span>→</span>';
$('btn-music').onclick=()=>{g.music=!g.music;initAudio();setMusicVolume();renderUI(true);};$('btn-map').onclick=showMap;$('btn-pause').onclick=()=>running?showPause():(running=true,$('modal').classList.add('off'));$('btn-settings').onclick=showSettings;
$('btn-pulse').onclick=activatePulse;$('btn-boost').onclick=activateBoost;
$('btn-sidebar').onclick=()=>{if(W<=800){$('sidebar').classList.remove('mobile-open')}else $('sidebar').classList.add('collapsed');$('btn-show-sidebar').classList.remove('hidden');};
$('btn-show-sidebar').onclick=()=>{if(W<=800)$('sidebar').classList.add('mobile-open');else $('sidebar').classList.remove('collapsed');$('btn-show-sidebar').classList.add('hidden');};
if(W<=800)$('btn-show-sidebar').classList.remove('hidden');
canvas.addEventListener('pointermove',e=>{pointer.x=e.clientX;pointer.y=e.clientY;pointer.type=e.pointerType;pointer.active=e.pointerType==='mouse'||pointer.down;});
canvas.addEventListener('pointerdown',e=>{pointer.down=true;pointer.active=true;pointer.x=e.clientX;pointer.y=e.clientY;try{canvas.setPointerCapture(e.pointerId)}catch(_){}});
canvas.addEventListener('pointerup',()=>{pointer.down=false;if(pointer.type!=='mouse')pointer.active=false;});
canvas.addEventListener('pointercancel',()=>{pointer.down=false;pointer.active=false;});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowleft','arrowright','arrowdown',' '].includes(k))e.preventDefault();keys.add(k);if(!e.repeat){if(k==='e')activatePulse();if(k==='shift'||k===' ')activateBoost();if(k==='p'||k==='escape'){if(running)showPause();else{running=true;$('modal').classList.add('off');}}if(k==='m')showMap();}});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{keys.clear();pointer.active=false;if(running)showPause();});
addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden){save();if(running)showPause();}});
renderUI();
// Developer-friendly deterministic smoke checks may inspect this read-only snapshot.
Object.defineProperty(window,'CosmicEvolutionDebug',{get:()=>({tier:g.tier,matter:g.matter,playerRadius:player.r,targetRadius:player.targetR,cameraZoom:camera.zoom,total:g.total,credits:g.credits,elapsed:g.time,objects:entities.length,particles:particles.length,playerX:player.x,playerY:player.y,loadedSectors:loadedChunks.size,visitedSectors:visitedChunks.size,depletedSectors:Object.keys(g.depleted).length,music:g.music,running,progress:g.matter/TA[g.tier].required,forms:TA.length,renderTicks,fps:Math.round(frameFps),renderScale:performanceScale,mission:missionReq()})});
})();