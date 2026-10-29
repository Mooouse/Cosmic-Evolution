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
].map((a,i)=>({name:a[0],epoch:a[1],desc:a[2],type:a[3],color:a[4],required:Math.round(110+45*Math.pow(i,1.68))}));
const upgrades = [
 {id:'gravity',name:'Гравитация',label:'Радиус притяжения',glyph:'◎',base:35,growth:1.26,max:80},
 {id:'speed',name:'Движение',label:'Скорость полёта',glyph:'➤',base:50,growth:1.29,max:60},
 {id:'harvest',name:'Синтез материи',label:'Бонус к поглощению',glyph:'✦',base:65,growth:1.31,max:65},
 {id:'shield',name:'Стабильность',label:'Защита от опасностей',glyph:'⬡',base:80,growth:1.28,max:45}
];
const SAVE_KEY = 'cosmic-evolution-save-v1';
const fresh = () => ({version:1,tier:0,matter:0,credits:0,total:0,time:0,collects:0,rare:0,pulses:0,losses:0,unlocks:0,stageCollects:0,stageRare:0,stagePulses:0,upgrade:{gravity:0,speed:0,harvest:0,shield:0},sound:true,particles:true,quality:1,complete:false});
let g = fresh();
try {const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(s&&s.version===1&&Number.isFinite(s.tier)&&s.tier>=0&&s.tier<TA.length)g={...fresh(),...s,upgrade:{...fresh().upgrade,...s.upgrade}};}catch(_){/* storage may be unavailable */}
let W=innerWidth,H=innerHeight,dpr=1,last=performance.now(),running=false,uiTimer=0,saveTimer=0,eventTimer=0;
let player={x:0,y:0,vx:0,vy:0,r:23,rotation:0,shield:0,trail:[]};
let camera={x:0,y:0,zoom:1};
let entities=[],particles=[],shockwaves=[],texts=[],stars=[],nebula=[];
let keys=new Set(),pointer={x:W/2,y:H/2,active:false,down:false,type:'mouse'};
let pulseCd=0,boostCd=0,boostTime=0,shake=0,renderTicks=0;
let soundCtx=null;
const cssColor = (h,a) => h.startsWith('#')?`rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${a})`:`rgba(119,190,255,${a})`;
function sound(freq=350,type='sine',duration=.075,vol=.045){if(!g.sound)return;try{soundCtx??=new (window.AudioContext||window.webkitAudioContext)();if(soundCtx.state==='suspended')soundCtx.resume();const osc=soundCtx.createOscillator(),gain=soundCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,soundCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.63),soundCtx.currentTime+duration);gain.gain.setValueAtTime(vol,soundCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,soundCtx.currentTime+duration);osc.connect(gain);gain.connect(soundCtx.destination);osc.start();osc.stop(soundCtx.currentTime+duration+.01);}catch(_){}}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(g));}catch(_){}}
function makeSky(){stars=Array.from({length:Math.min(410,Math.max(180,Math.floor(W*H/3800)))},()=>({x:Math.random()*W,y:Math.random()*H,r:rand(.3,1.75),alpha:rand(.2,1),depth:rand(.08,.48),phase:rand(0,TAU)}));nebula=Array.from({length:7},()=>({x:rand(0,W),y:rand(0,H),r:rand(190,380),h:choose([212,240,265,288,194]),a:rand(.045,.095),depth:rand(.02,.12)}));}
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);makeSky();}
addEventListener('resize',resize);resize();
function toast(message,kind=''){let el=document.createElement('div');el.className=`toast ${kind}`;el.textContent=message;$('toast-root').append(el);setTimeout(()=>el.remove(),3100);}
function missionReq(){return {rare:1+Math.floor(g.tier/5),pulse:2+Math.floor(g.tier/6),collect:Math.round(TA[g.tier].required*.32)}}
function missionsDone(){const m=missionReq();return g.stageCollects>=m.collect&&g.stageRare>=m.rare&&g.stagePulses>=m.pulse;}
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
 const m=missionReq(),cs=[g.stageCollects>=m.collect,g.stageRare>=m.rare,g.stagePulses>=m.pulse];
 $('mission-1-label').textContent='Поглощай материю';$('mission-1-val').textContent=`${fmt(g.stageCollects)}/${fmt(m.collect)}`;
 $('mission-2-label').textContent='Найди реликвии';$('mission-2-val').textContent=`${g.stageRare}/${m.rare}`;
 $('mission-3-label').textContent='Используй импульс';$('mission-3-val').textContent=`${g.stagePulses}/${m.pulse}`;
 cs.forEach((ok,i)=>{const e=$(`mission-${i+1}`);e.classList.toggle('done',ok);e.querySelector('.mission-mark').textContent=ok?'✓':'◇';});$('mission-done').textContent=cs.filter(Boolean).length+'/3';
 for(const u of upgrades){let b=$('upgrades').querySelector(`[data-upgrade="${u.id}"]`),lvl=g.upgrade[u.id],c=upgradeCost(u);b.querySelector('.upgrade-level').textContent=`ур. ${lvl}/${u.max}`;b.querySelector('.upgrade-price').textContent=lvl>=u.max?'MAX':fmt(c);b.disabled=g.credits<c||lvl>=u.max;}
 $('pulse-cooldown').textContent=pulseCd>0?pulseCd.toFixed(1)+'с':'E · ГОТОВ';$('boost-cooldown').textContent=boostCd>0?boostCd.toFixed(1)+'с':'SHIFT · ГОТОВ';
 $('pulse-fill').style.transform=`scaleX(${clamp(1-pulseCd/13,0,1)})`;$('boost-fill').style.transform=`scaleX(${clamp(1-boostCd/6,0,1)})`;
 $('zoom-label').textContent=`МАСШТАБ ${fmt(Math.pow(4.2,g.tier))}×`;
 $('world-label').textContent=t.epoch.toUpperCase();$('world-subtitle').textContent=`СЕКТОР ${String(g.tier+1).padStart(2,'0')} / ${TA.length}`;
 if(force)save();
}
function spawn(x,y,forced){let danger=Math.random()<(.054+Math.min(.05,g.tier*.001)),rare=Math.random()<.042;let kind=forced|| (danger?'hazard':rare?'relic':'matter');let angle=rand(0,TAU),speed=rand(2,12);return {x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,kind,r:kind==='hazard'?rand(20,32):kind==='relic'?rand(9,13):rand(3,9),spin:rand(0,TAU),twinkle:rand(0,TAU),value:kind==='relic'?rand(17,32):rand(.75,2.9),hue:kind==='hazard'?rand(2,30):kind==='relic'?rand(38,60):choose([185,195,205,225,255,275]),dead:false};}
function resetField(){entities=[];let range=Math.max(W,H)*.88+200;for(let i=0;i<(W<800?170:270);i++){let a=rand(0,TAU),d=rand(90,range);entities.push(spawn(player.x+Math.cos(a)*d,player.y+Math.sin(a)*d));}eventTimer=0;}
resetField();
function respawn(e){let a=rand(0,TAU),d=Math.max(W,H)*rand(.77,1.13)+160;Object.assign(e,spawn(player.x+Math.cos(a)*d,player.y+Math.sin(a)*d));}
function burst(x,y,n,color='#7ed9ff',scale=1){const cap=g.particles?Math.min(30,n):Math.min(5,n);for(let i=0;i<cap;i++){const a=rand(0,TAU),sp=rand(35,180)*scale;particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rand(.3,.9),max:.9,r:rand(1,3.4)*scale,color});}if(particles.length>420)particles.splice(0,particles.length-420);}
function popText(x,y,text,color='#c7ebff'){texts.push({x,y,text,color,life:1.1});if(texts.length>35)texts.shift();}
function absorb(e){const val=Math.max(1,Math.round(e.value*(1+g.upgrade.harvest*.075)));g.matter+=val;g.total+=val;g.stageCollects+=val;g.collects++;let credits=e.kind==='relic'?Math.round(val*1.7):Math.max(1,Math.floor(val*.75));g.credits+=credits;if(e.kind==='relic'){g.stageRare++;g.rare++;burst(e.x,e.y,22,'#f9d797',.9);popText(e.x,e.y,'+'+val+' ✦','#ffe4a2');sound(700,'sine',.18,.02);}else if(Math.random()<.24){burst(e.x,e.y,4,'#8bdcfb',.35);}
 if(Math.random()<.08)popText(e.x,e.y,'+'+val);respawn(e);if(g.matter>=TA[g.tier].required&&missionsDone())evolve();}
function impact(e){if(player.shield>0){respawn(e);return;}const reduction=Math.max(.15,1-g.upgrade.shield*.018),lost=Math.ceil(Math.min(g.matter*.09,TA[g.tier].required*.028)*reduction);g.matter=Math.max(0,g.matter-lost);g.losses++;player.shield=1.3;shake=14;burst(player.x,player.y,30,'#ff777a');popText(player.x,player.y,`−${lost} МАТЕРИИ`,'#ff9f9b');sound(112,'sawtooth',.3,.065);respawn(e);}
function evolve(){if(g.tier===TA.length-1){g.complete=true;running=false;save();showFinal();return;}const prev=TA[g.tier].name;g.tier++;g.unlocks++;g.matter=0;g.stageCollects=0;g.stageRare=0;g.stagePulses=0;player.r=23+Math.min(15,g.tier*.56);player.shield=3;shake=20;shockwaves.push({x:player.x,y:player.y,r:12,life:2.2,max:2.2,color:TA[g.tier].color});burst(player.x,player.y,90,TA[g.tier].color,2.6);popText(player.x,player.y,TA[g.tier].name.toUpperCase(),TA[g.tier].color);toast(`✦ НОВАЯ ФОРМА: ${TA[g.tier].name.toUpperCase()}`,'golden');sound(440,'triangle',.6,.055);resetField();renderUI(true);}
function activatePulse(){if(!running||pulseCd>0)return;pulseCd=13;g.pulses++;g.stagePulses++;const range=270+g.upgrade.gravity*7;shockwaves.push({x:player.x,y:player.y,r:10,max:1.2,life:1.2,color:'#84dfff',range});for(let e of entities){let dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy);if(d<range){if(e.kind==='hazard'){burst(e.x,e.y,18,'#ffb6a5');e.kind='relic';e.r=11;e.value=30+g.tier*2;}else{e.vx+=(player.x-e.x)/(d||1)*Math.max(110,650-d*1.5);e.vy+=(player.y-e.y)/(d||1)*Math.max(110,650-d*1.5);}}}shake=5;toast('◉ ГРАВИТАЦИОННЫЙ ИМПУЛЬС');sound(245,'sine',.55,.055);renderUI();}
function activateBoost(){if(!running||boostCd>0)return;boostCd=6;boostTime=1.15;player.shield=Math.max(player.shield,.7);burst(player.x,player.y,20,'#bd9bff');sound(440,'triangle',.23);}
function update(dt){
 g.time+=dt;saveTimer+=dt;eventTimer+=dt;pulseCd=Math.max(0,pulseCd-dt);boostCd=Math.max(0,boostCd-dt);boostTime=Math.max(0,boostTime-dt);player.shield=Math.max(0,player.shield-dt);shake=Math.max(0,shake-dt*30);
 let ax=0,ay=0;if(keys.has('w')||keys.has('arrowup'))ay-=1;if(keys.has('s')||keys.has('arrowdown'))ay+=1;if(keys.has('a')||keys.has('arrowleft'))ax-=1;if(keys.has('d')||keys.has('arrowright'))ax+=1;
 if(ax===0&&ay===0&&pointer.active){ax=(pointer.x-W/2)/Math.max(100,W*.26);ay=(pointer.y-H/2)/Math.max(100,H*.29);if(Math.hypot(ax,ay)<.11)ax=ay=0;}
 let mag=Math.hypot(ax,ay);if(mag>0){ax/=mag;ay/=mag;}
 const speed=(230+Math.min(190,g.upgrade.speed*5.2))*(boostTime>0?2.5:1),lerp=1-Math.exp(-dt*9);player.vx+=(ax*speed-player.vx)*lerp;player.vy+=(ay*speed-player.vy)*lerp;
 player.x+=player.vx*dt;player.y+=player.vy*dt;player.rotation+=dt*(.13+Math.hypot(player.vx,player.vy)/850);
 if(Math.hypot(player.vx,player.vy)>28&&Math.random()<dt*24){player.trail.push({x:player.x,y:player.y,r:player.r,life:.55});}
 player.trail.forEach(p=>p.life-=dt);player.trail=player.trail.filter(p=>p.life>0).slice(-30);
 let gravRange=97+g.upgrade.gravity*7,collectR=player.r+7;
 for(const e of entities){let dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy)||1;
   if(e.kind!=='hazard'&&dist<gravRange){const pull=(gravRange-dist)/gravRange;e.vx+=dx/dist*(150+pull*520)*dt;e.vy+=dy/dist*(150+pull*520)*dt;}
   e.vx*=Math.exp(-dt*.62);e.vy*=Math.exp(-dt*.62);e.x+=e.vx*dt;e.y+=e.vy*dt;e.spin+=dt*.6;e.twinkle+=dt*2.5;
   if(dist<collectR+e.r){e.kind==='hazard'?impact(e):absorb(e);}
   else if(dist>Math.max(W,H)*1.95+360)respawn(e);
 }
 if(eventTimer>115){eventTimer=0;let a=rand(0,TAU),x=player.x+Math.cos(a)*420,y=player.y+Math.sin(a)*420;for(let i=0;i<10;i++)entities.push(spawn(x+rand(-95,95),y+rand(-95,95),'relic'));toast('✦ АНОМАЛИЯ: СКОПЛЕНИЕ РЕЛИКВИЙ','golden');}
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*2);p.vy*=Math.exp(-dt*2);p.life-=dt;}
 particles=particles.filter(p=>p.life>0);
 for(const p of shockwaves){p.life-=dt;p.r+=(p.range||700)*dt;}shockwaves=shockwaves.filter(p=>p.life>0);
 texts.forEach(p=>{p.y-=dt*28;p.life-=dt;});texts=texts.filter(p=>p.life>0);
 const zTarget=clamp(1.10-(g.tier*.012),.78,1.1);camera.zoom+=(zTarget-camera.zoom)*(1-Math.exp(-dt*3.5));camera.x+=(player.x-camera.x)*(1-Math.exp(-dt*5));camera.y+=(player.y-camera.y)*(1-Math.exp(-dt*5));
 uiTimer+=dt;if(uiTimer>.16){uiTimer=0;renderUI();}
 if(saveTimer>12){saveTimer=0;save();}
}
function project(x,y){return {x:(x-camera.x)*camera.zoom+W/2,y:(y-camera.y)*camera.zoom+H/2};}
function glowDot(x,y,r,color,intensity=1){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=r*2.2*intensity;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();}
function sky(t){
 let epoch=g.tier;let bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,epoch>=22?'#09071b':'#040b1c');bg.addColorStop(.55,epoch>=19?'#0e0a29':'#090c24');bg.addColorStop(1,'#02040d');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 for(const n of nebula){const x=((n.x-camera.x*n.depth*.19)% (W+800)+(W+800))%(W+800)-400;const y=((n.y-camera.y*n.depth*.19)% (H+800)+(H+800))%(H+800)-400;let grad=ctx.createRadialGradient(x,y,0,x,y,n.r);grad.addColorStop(0,`hsla(${n.h+(epoch%6)*7},95%,56%,${n.a})`);grad.addColorStop(.55,`hsla(${n.h},88%,43%,${n.a*.35})`);grad.addColorStop(1,`hsla(${n.h},88%,43%,0)`);ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,n.r,0,TAU);ctx.fill();}
 for(const s of stars){const x=((s.x-camera.x*s.depth*.25)%W+W)%W,y=((s.y-camera.y*s.depth*.25)%H+H)%H;const alpha=s.alpha*(.68+.32*Math.sin(t*.65+s.phase));ctx.fillStyle=`rgba(183,210,255,${alpha})`;ctx.beginPath();ctx.arc(x,y,s.r,0,TAU);ctx.fill();if(s.r>1.4&&alpha>.7){ctx.strokeStyle=`rgba(132,192,255,${alpha*.18})`;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();}}
 // Subtle infinitely tiled navigation grid, almost invisible at dust scale.
 ctx.save();ctx.strokeStyle='rgba(106,137,214,.045)';ctx.lineWidth=1;let tile=155;let ox=((-camera.x*camera.zoom)%tile+tile)%tile;let oy=((-camera.y*camera.zoom)%tile+tile)%tile;for(let x=ox;x<W;x+=tile){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=oy;y<H;y+=tile){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.restore();
}
function paintRock(x,y,r,color,spin=0,craters=5){ctx.save();ctx.translate(x,y);ctx.rotate(spin);ctx.beginPath();for(let k=0;k<11;k++){let a=k/11*TAU,R=r*(.85+.09*Math.sin(k*4.17+spin));if(k===0)ctx.moveTo(Math.cos(a)*R,Math.sin(a)*R);else ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);}ctx.closePath();let grad=ctx.createRadialGradient(-r*.4,-r*.5,1,0,0,r*1.1);grad.addColorStop(0,'#dce8fa');grad.addColorStop(.25,color);grad.addColorStop(1,'#384058');ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle='rgba(188,211,238,.48)';ctx.lineWidth=1.2;ctx.stroke();for(let j=0;j<craters;j++){const a=j*2.4+spin*.1,R=r*(.15+.38*((j*7)%5)/5),cr=r*(.07+(j%3)*.03);ctx.fillStyle='rgba(27,35,64,.27)';ctx.beginPath();ctx.arc(Math.cos(a)*R,Math.sin(a)*R,cr,0,TAU);ctx.fill();}ctx.restore();}
function paintPlanet(x,y,r,color,gas=false){ctx.save();if(r>18){ctx.strokeStyle='rgba(146,209,255,.28)';ctx.lineWidth=2.8;ctx.beginPath();ctx.ellipse(x,y,r*1.58,r*.45,-.3,0,TAU);ctx.stroke();}const gr=ctx.createRadialGradient(x-r*.38,y-r*.45,1,x,y,r*1.1);gr.addColorStop(0,'#edfbff');gr.addColorStop(.23,color);gr.addColorStop(.75,color);gr.addColorStop(1,'#1b2a59');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.clip();for(let k=0;k<5;k++){ctx.beginPath();ctx.ellipse(x+Math.sin(k*3.2)*r*.45,y-r*.75+k*r*.37,r*1.2,r*(gas?.12:.10),-.12,0,TAU);ctx.fillStyle=gas?'rgba(241,218,194,.20)':'rgba(120,239,220,.2)';ctx.fill();}ctx.restore();}
function paintStar(x,y,r,color){ctx.save();let halo=ctx.createRadialGradient(x,y,r*.25,x,y,r*2.6);halo.addColorStop(0,cssColor(color,.35));halo.addColorStop(.4,cssColor(color,.17));halo.addColorStop(1,cssColor(color,0));ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*2.6,0,TAU);ctx.fill();ctx.shadowColor=color;ctx.shadowBlur=r*1.3;let gr=ctx.createRadialGradient(x-r*.23,y-r*.25,0,x,y,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(.33,'#fff8c8');gr.addColorStop(.75,color);gr.addColorStop(1,cssColor(color,.65));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();}
function paintGalaxy(x,y,r,color,time){ctx.save();ctx.translate(x,y);ctx.rotate(time*.035);const glow=ctx.createRadialGradient(0,0,1,0,0,r*1.7);glow.addColorStop(0,cssColor(color,.22));glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,r*1.7,0,TAU);ctx.fill();for(let arm=0;arm<3;arm++){ctx.beginPath();for(let n=0;n<75;n++){let d=n/75*r*1.24,a=arm*TAU/3+n*.075;let xx=Math.cos(a)*d,yy=Math.sin(a)*d*.58;if(n===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);}ctx.strokeStyle=cssColor(color,.38);ctx.lineWidth=Math.max(1,r*.13);ctx.lineCap='round';ctx.stroke();for(let n=0;n<29;n++){let d=(n+3)/32*r*1.1,a=arm*TAU/3+n*.18;ctx.fillStyle=n%4?'rgba(200,219,255,.65)':'#ffffff';ctx.beginPath();ctx.arc(Math.cos(a)*d,Math.sin(a)*d*.58,Math.max(.6,r*.025),0,TAU);ctx.fill();}}glowDot(0,0,r*.2,'#f9e8ff',1.2);ctx.restore();}
function paintBody(x,y,r,kind,color,time,shadow=true){if(shadow){ctx.save();ctx.fillStyle='rgba(0,0,0,.19)';ctx.beginPath();ctx.ellipse(x+3,y+r*.8,r*.75,r*.25,0,0,TAU);ctx.fill();ctx.restore();}
 if(kind==='dust'){glowDot(x,y,r*.7,color,2);glowDot(x-r*.13,y-r*.2,r*.2,'#ffffff',1.3);}else if(kind==='rock')paintRock(x,y,r,color,time*.1);else if(kind==='planet'||kind==='gas')paintPlanet(x,y,r,color,kind==='gas');else if(kind==='star')paintStar(x,y,r,color);else if(kind==='nebula'){paintGalaxy(x,y,r,color,time);glowDot(x,y,r*.28,color,1);}else if(kind==='galaxy')paintGalaxy(x,y,r,color,time);else if(kind==='cluster'||kind==='web'||kind==='universe'){paintGalaxy(x,y,r*1.1,color,time);ctx.save();for(let i=0;i<11;i++){let a=i*TAU/11+time*.06,R=r*(.75+.2*(i%3));glowDot(x+Math.cos(a)*R,y+Math.sin(a)*R*.68,r*.045,i%3?'#a3d7ff':'#ffddab',.5);}ctx.restore();}else glowDot(x,y,r,color);}
function renderEntity(e,time){const p=project(e.x,e.y),r=e.r*camera.zoom;if(p.x<-90||p.x>W+90||p.y<-90||p.y>H+90)return;
 if(e.kind==='matter'){let color=`hsl(${e.hue} 96% ${64+Math.sin(e.twinkle)*8}%)`;glowDot(p.x,p.y,r*.87,color,.65);ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.arc(p.x-r*.15,p.y-r*.15,Math.max(.55,r*.23),0,TAU);ctx.fill();}
 else if(e.kind==='relic'){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(e.spin);ctx.shadowBlur=15;ctx.shadowColor='#ffd88b';ctx.fillStyle='#ffe3a0';ctx.beginPath();for(let i=0;i<8;i++){let a=i*TAU/8,rr=i%2?r*.55:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.restore();}
 else{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(e.spin*.5);ctx.shadowColor='#e45575';ctx.shadowBlur=13;ctx.fillStyle='#842f53';ctx.strokeStyle='#f27187';ctx.lineWidth=1.6;ctx.beginPath();for(let i=0;i<10;i++){let a=i*TAU/10,R=r*(i%2?.74:1.03);if(i===0)ctx.moveTo(Math.cos(a)*R,Math.sin(a)*R);else ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);}ctx.closePath();ctx.fill();ctx.stroke();glowDot(-r*.12,-r*.12,r*.17,'#ffbe8d',.3);ctx.restore();}}
function renderPlayer(time){const t=TA[g.tier],p=project(player.x,player.y),r=player.r*camera.zoom;ctx.save();
 for(const tr of player.trail){let q=project(tr.x,tr.y),alpha=tr.life/.55;ctx.fillStyle=cssColor(t.color,alpha*.1);ctx.beginPath();ctx.arc(q.x,q.y,tr.r*camera.zoom*(.45+alpha*.3),0,TAU);ctx.fill();}
 // Gravity field ring and orbiting shards.
 let range=(97+g.upgrade.gravity*7)*camera.zoom;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(player.rotation*.18);ctx.strokeStyle=cssColor(t.color,.11);ctx.lineWidth=1.2;ctx.setLineDash([3,9]);ctx.beginPath();ctx.arc(0,0,range,0,TAU);ctx.stroke();ctx.setLineDash([]);
 let count=Math.min(18,3+Math.floor(g.tier/2));for(let i=0;i<count;i++){let a=player.rotation*(i%2?1:-1)*(0.65+(i%4)*.08)+i*TAU/count,R=r*(1.8+(i%3)*.24),xx=Math.cos(a)*R,yy=Math.sin(a)*R*.65;ctx.fillStyle=i%3?'#96baf8':'#ffdcaa';ctx.beginPath();ctx.arc(xx,yy,i%5===0?2.6:1.5,0,TAU);ctx.fill();}ctx.restore();
 paintBody(p.x,p.y,r,t.type,t.color,time,false);
 if(player.shield>0){ctx.strokeStyle=`rgba(132,236,255,${.2+.35*Math.sin(time*16)**2})`;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,r*1.35,0,TAU);ctx.stroke();}
 if(boostTime>0){ctx.strokeStyle='rgba(187,143,255,.5)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,r*1.55+Math.sin(time*12)*3,0,TAU);ctx.stroke();}
 ctx.restore();}
function renderParticles(){for(const p of particles){const q=project(p.x,p.y);ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(q.x,q.y,Math.max(.5,p.r*camera.zoom),0,TAU);ctx.fill();}ctx.globalAlpha=1;for(const s of shockwaves){let q=project(s.x,s.y);ctx.save();ctx.globalAlpha=clamp(s.life/s.max,0,1)*.7;ctx.strokeStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=18;ctx.lineWidth=4*camera.zoom;ctx.beginPath();ctx.arc(q.x,q.y,s.r*camera.zoom,0,TAU);ctx.stroke();ctx.restore();}for(const p of texts){let q=project(p.x,p.y);ctx.save();ctx.globalAlpha=clamp(p.life,0,1);ctx.font='800 13px "Exo 2",sans-serif';ctx.textAlign='center';ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.fillStyle=p.color;ctx.fillText(p.text,q.x,q.y);ctx.restore();}}
function render(time){ctx.setTransform(dpr,0,0,dpr,0,0);sky(time);ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));for(const e of entities)renderEntity(e,time);renderPlayer(time);renderParticles();ctx.restore();renderTicks++;}
function frame(now){let dt=clamp((now-last)/1000,0,.05);last=now;if(running)update(dt);render(now/1000);requestAnimationFrame(frame);}requestAnimationFrame(frame);
function show(html){$('modal').innerHTML=`<div class="modal-card">${html}</div>`;$('modal').classList.remove('off');running=false;save();}
function continueButton(label='ПРОДОЛЖИТЬ'){return `<button class="primary-button" id="btn-continue">${label} <span>→</span></button>`;}
function attachContinue(){const b=$('btn-continue');if(b)b.onclick=()=>{running=true;$('modal').classList.add('off');last=performance.now();};}
function showMap(){let items=TA.map((t,i)=>`<div class="map-item ${i<g.tier?'unlocked':''} ${i===g.tier?'current':''}"><strong>${String(i+1).padStart(2,'0')}</strong><small>${i<=g.tier?t.name:'???'}</small></div>`).join('');show(`<div class="eyebrow">ПУТЬ ОТ ПЫЛИНКИ ДО БЕСКОНЕЧНОСТИ</div><div class="overlay-title">КАРТА ЭВОЛЮЦИИ</div><p class="overlay-copy">28 форм космического роста в 6 больших эпохах. Открыто ${g.tier+1} из 28.</p><div class="map-grid">${items}</div>${continueButton()}`);attachContinue();}
function showPause(){show(`<div class="hero-kicker">ПУТЕШЕСТВИЕ ПРИОСТАНОВЛЕНО</div><div class="overlay-title">ПАУЗА</div><p class="overlay-copy">Твоё место во Вселенной сохранено. Материя и улучшения останутся с тобой.</p><div class="stat-list"><div><strong>${fmt(g.total)}</strong><small>Всего материи</small></div><div><strong>${timeFmt(g.time)}</strong><small>Игровое время</small></div><div><strong>${g.collects}</strong><small>Поглощено объектов</small></div><div><strong>${g.rare}</strong><small>Реликвий найдено</small></div></div><div class="modal-actions">${continueButton()}<button id="pause-map" class="secondary-button">Карта</button></div>`);attachContinue();$('pause-map').onclick=showMap;}
function showSettings(){show(`<div class="eyebrow">ПАРАМЕТРЫ ПОЛЁТА</div><div class="overlay-title">НАСТРОЙКИ</div><div class="settings-line"><span>Звуковые эффекты</span><input id="set-sound" type="checkbox" ${g.sound?'checked':''}></div><div class="settings-line"><span>Частицы и вспышки</span><input id="set-particles" type="checkbox" ${g.particles?'checked':''}></div><div class="settings-line"><span>Качество эффектов</span><select id="set-quality"><option value="1" ${g.quality===1?'selected':''}>Стандартное</option><option value="0.5" ${g.quality===.5?'selected':''}>Экономное</option></select></div><p class="overlay-copy" style="text-align:left">Управление: мышь / пальцем или WASD; E — импульс, Shift / пробел — рывок, M — карта, P — пауза.</p><div class="modal-actions">${continueButton('СОХРАНИТЬ И ИГРАТЬ')}</div>`);attachContinue();$('set-sound').onchange=e=>{g.sound=e.target.checked;save();};$('set-particles').onchange=e=>{g.particles=e.target.checked;save();};$('set-quality').onchange=e=>{g.quality=Number(e.target.value);save();};}
function showFinal(){show(`<div class="hero-kicker">28 / 28 ФОРМ ОТКРЫТО</div><div class="overlay-title">ТЫ СТАЛ ВСЕЛЕННОЙ</div><p class="overlay-copy">От одинокой частицы до бесконечного космоса. Ты завершил путь Cosmic Evolution.</p><div class="stat-list"><div><strong>${timeFmt(g.time)}</strong><small>Время прохождения</small></div><div><strong>${fmt(g.total)}</strong><small>Поглощено материи</small></div><div><strong>${fmt(g.collects)}</strong><small>Космических объектов</small></div><div><strong>${g.rare}</strong><small>Найдено реликвий</small></div></div><p class="overlay-copy">Поздравляем с завершением космической эволюции!</p><button class="primary-button" id="btn-endless">ИССЛЕДОВАТЬ ДАЛЬШЕ →</button>`);$('btn-endless').onclick=()=>{running=true;$('modal').classList.add('off');last=performance.now();};}
$('btn-start').onclick=()=>{running=true;$('modal').classList.add('off');last=performance.now();if(!g.time)toast('✦ ИССЛЕДУЙ КОСМОС · ПОГЛОЩАЙ МАТЕРИЮ');};if(g.time>10)$('btn-start').innerHTML='ПРОДОЛЖИТЬ ПУТЕШЕСТВИЕ <span>→</span>';
$('btn-map').onclick=showMap;$('btn-pause').onclick=()=>running?showPause():(running=true,$('modal').classList.add('off'));$('btn-settings').onclick=showSettings;
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
Object.defineProperty(window,'CosmicEvolutionDebug',{get:()=>({tier:g.tier,matter:g.matter,total:g.total,credits:g.credits,elapsed:g.time,objects:entities.length,particles:particles.length,running,progress:g.matter/TA[g.tier].required,forms:TA.length,renderTicks})});
})();
