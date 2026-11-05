'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const game = fs.readFileSync('game.js','utf8');
const page = fs.readFileSync('index.html','utf8');
function has(phrase,why){assert.ok(game.includes(phrase),why)}
function lacks(phrase,why){assert.ok(!game.includes(phrase),why)}
has('const qualityTarget=Math.round(clamp(', 'High-resolution adaptive lens target missing');
has('const LUT=4096', 'Fast radial lens lookup table missing');
has('ratioLut[k]', 'Lens must sample a precomputed warp');
lacks('const scale=Math.min(1,300/', 'Never shrink lens to 300 px');
has('Math.min(R*2.30', 'Broad lensing effect was lost');
has('const fade=', 'Non-lens fades should stay controlled');
has("renderMacroBackground(time);", "Moving galaxies must be rendered from current positions");
has('0,496', 'LOD must support astronomical world sizes');
has('low<496', 'LOD interpolation must also support astronomical sizes');
has('Math.max(1e-155,camera.zoom)', 'Camera must support extremely small zoom');
has('140/physicsZoom()', 'Movement must scale with physical size, never manual camera zoom');
has('const cellX=Math.round(gx/stride)', 'Very large cosmic coordinates must not be hashed directly');
has('const extent=Math.min(32,', 'Cosmic horizon sector sweep regressed');
has('let budget=Math.min(125,', 'Cosmic feast throughput regressed');
has('function blackHoleTouchDistance(', 'Rendered horizon-contact physics missing');
lacks('e.r>radius*.92', 'Oversized galaxy collision filter must remain removed');
const version=page.match(/game\.js\?v=(\d+)\.(\d+)\.(\d+)/);
assert.ok(version,'Game script must have a versioned cache key');
assert.ok(Number(version[1])>3||(Number(version[1])===3&&Number(version[2])>=11),
 'Published game cache key must not regress below 3.11');
const gameVersion=version.slice(1).join('.');
const themeVersion=page.match(/ui-v15-hotfix\.css\?v=(\d+\.\d+\.\d+)/);
assert.ok(themeVersion&&themeVersion[1]===gameVersion,
 'Game and UI cache versions must match so GitHub Pages never serves stale assets');
assert.ok(game.includes('list.replaceChildren();'),
 'The expanded bestiary must remove all seven inactive template entries');
assert.ok(game.includes('FIELD_GUIDE.push(...TA.map'),
 'The bestiary must contain portraits for every evolution stage');
// Execute the actual collision helpers from game.js at astronomical scales,
// rather than testing a duplicated formula that might drift from the game.
const begin = game.indexOf('function blackHoleCoreWorldRadius(){');
const end = game.indexOf('\nconst dotCache=', begin);
assert.ok(begin>0&&end>begin, 'Collision helper boundaries have changed');
const snippet=game.slice(begin,end);
for(const zoom of [1e-3,1e-15,1e-60,1e-110]){
 const context={
  camera:{zoom}, player:{r:450/zoom},W:1920,H:1080,
  BLACK_HOLE_CORE_FRACTION:.245,
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v))
 };
 vm.createContext(context);
 vm.runInContext(snippet,context,{timeout:1000});
 const core=vm.runInContext('blackHoleCoreWorldRadius()',context);
 const small={r:12/zoom,macro:true,kind:'matter'};
 const giant={r:1400/zoom,cosmic:true,kind:'matter'};
 const smallTouch=vm.runInContext('blackHoleTouchDistance({r:12/camera.zoom,macro:true,kind:"matter"},blackHoleCoreWorldRadius())',context);
 const giantTouch=vm.runInContext('blackHoleTouchDistance({r:1400/camera.zoom,cosmic:true,kind:"matter"},blackHoleCoreWorldRadius())',context);
 assert.ok(Number.isFinite(core)&&core>0, 'Finite positive event horizon');
 assert.ok(smallTouch>core&&giantTouch>smallTouch,'Galaxy should be collectable when its drawn edge reaches horizon');
 assert.ok(Math.abs(core*zoom-110.25)<.00001,'Painted event horizon and physical collision disagree');
 const cameraSpeed=140/zoom;
 assert.ok(Math.abs(cameraSpeed*zoom-140)<.000001,'Movement ceases at extreme camera zoom');
}
// Regression: the black-hole core may never be a transient overlay.
// Inspect both render order and actual opaque output at different times.
assert.match(game,/if\(g\.tier===TA\.length-1\)return;\s*const t=TA\[g\.tier\]/,
 'Do not paint final black hole via ordinary player morphs');
assert.match(game,/renderPlayer\(time\);renderParticles\(\);[\s\S]*?paintBlackHole\(p\.x,p\.y,r,time\);/,
 'Black-hole core must be composited AFTER particles and other effects');
assert.ok(!game.slice(game.indexOf('function frame(now){'),game.indexOf('function show(html)')).includes('applyResolution()'),
 'Animation loop must not resize the visible canvas');
assert.match(game,/try\{renderBlackHoleLensing\(\);\}[\s\S]*?catch\(_\)\{blackHoleLensRetryAt=/,
 'Failed lensing must not abort drawing the event horizon');
const beginBlack=game.indexOf('function paintBlackHole(x,y,r,time){');
const endBlack=game.indexOf('\nfunction paintPlayerForm(',beginBlack);
assert.ok(beginBlack>0&&endBlack>beginBlack,'Cannot locate final black-hole painter');
const paintSnippet=game.slice(beginBlack,endBlack);
function traceBlackHole(time){
 const recorded=[];
 const ctx={
  globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:null,
  save(){recorded.push(['save'])},restore(){recorded.push(['restore'])},
  createRadialGradient(){const stops=[];return {addColorStop(p,color){stops.push([p,color])}}},
  beginPath(){},arc(x,y,r){recorded.push(['arc',x,y,r])},
  fill(){recorded.push(['fill',this.fillStyle,this.globalAlpha])}
 };
 const sandbox={ctx,W:1920,H:1080,TAU:Math.PI*2,BLACK_HOLE_CORE_FRACTION:.245,
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
 vm.createContext(sandbox);
 vm.runInContext(paintSnippet,sandbox,{timeout:1000});
 vm.runInContext('paintBlackHole(960,540,220,'+time+')',sandbox,{timeout:1000});
 return recorded.filter(x=>x[0]==='arc'||x[0]==='fill');
}
const paintedA=traceBlackHole(0),paintedB=traceBlackHole(10000);
assert.equal(JSON.stringify(paintedA),JSON.stringify(paintedB),
 'Black-hole core or halo changed over time');
assert.ok(paintedA.some(x=>x[0]==='fill'&&x[1]==='#010205'&&x[2]===1),
 'Black-hole core must remain completely opaque');
console.log('PASS: opaque event horizon stays stable over time and remains visible if lens fails');


// Whole-screen flicker regression: the front canvas must receive one
// COMPLETE frame, after background, lensing, particles and final black hole.
has("desynchronized:false", "Front canvas must not expose partially painted frames");
has("const frameCanvas=document.createElement('canvas')", "Separate full-frame drawing surface missing");
has("lensInputCtx.drawImage(frameCanvas", "Lensing must read the back buffer, not the visible screen");
lacks("lensInputCtx.drawImage(canvas,", "Reading an actively presented canvas can flicker");
const startRender=game.indexOf("function render(time){");
const stopRender=game.indexOf("\nlet idleLast=0;",startRender);
assert.ok(startRender>0&&stopRender>startRender,"Cannot find atomic renderer");
const renderCode=game.slice(startRender,stopRender);
function traceFrame(lensFails=false){
 const calls=[];
 const mockCtx=label=>({
  stateStack:[],
  setTransform(){calls.push(label+":transform")},
  save(){this.stateStack.push([this.globalAlpha,this.globalCompositeOperation])},
  restore(){const state=this.stateStack.pop();if(state){this.globalAlpha=state[0];this.globalCompositeOperation=state[1];}},
  globalAlpha:1,globalCompositeOperation:"source-over",
  drawImage(){calls.push(label+":present")}
 });
 const screenCtx=mockCtx("front"),frameCtx=mockCtx("back");
 const universe={
  ctx:screenCtx,screenCtx,frameCtx,frameCanvas:{},menuVisible:false,
  dpr:1,W:1920,H:1080,g:{tier:27},TA:Array(28),
  sky(){calls.push("sky")},renderBackgroundComets(){calls.push("comet")},renderDistantBodies(){calls.push("distant")},
  renderMacroField(){calls.push("macro")},renderEntity(){calls.push("entity")},
  renderRivalLensing(){calls.push("rivalLens")},rivalLensMaps:new Map(),rivalLensRetryAt:0,renderBlackHoleLensing(){calls.push("lens");if(lensFails)throw new Error("canvas readback failed")},
  clipPlayerHorizon(){calls.push("occlusion")},renderWaypoint(){},renderGatherFlow(){},renderAbysses(){calls.push("abysses")},renderPlayer(){calls.push("player")},renderAccretionStreams(){calls.push("accretion")},renderParticles(){calls.push("particles")},
  paintBlackHole(){calls.push("blackhole")},project(){return{x:960,y:540}},
  player:{x:0,y:0,r:200},camera:{zoom:1},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  screenFlash:0,shake:0,entities:[{}],blackHoleLensRetryAt:0,renderTicks:0,
  rand:()=>0
 };
 vm.createContext(universe);
 vm.runInContext(renderCode,universe,{timeout:1000});
 vm.runInContext("render(1)",universe,{timeout:1000});
 assert.equal(universe.ctx,screenCtx,"Renderer must restore front context between frames");
 assert.equal(calls.filter(x=>x==="front:present").length,1,"Exactly one frame presentation permitted");
 assert.ok(calls.indexOf("front:present")>calls.indexOf("blackhole"),"Screen must not present before black hole painted");
 assert.ok(calls.indexOf("front:present")>calls.indexOf("particles"),"Screen must not present before particle pass");
 assert.equal(screenCtx.globalCompositeOperation,"source-over","Front context state must be restored");
 return calls;
}
const restoredFrame=traceFrame(false);
assert.ok(restoredFrame.indexOf('distant')<restoredFrame.indexOf('lens'));
assert.ok(!restoredFrame.includes('occlusion'),'Previous ring must sample the complete scene');
traceFrame(true);
console.log("PASS: complete atomic screen frames and lens-readback failure isolation");

console.log('PASS: lens resolution, fast lens lookup, stable backdrop, 4 astronomical zoom levels, LOD, galaxy collision and movement');

// Orbital galaxies need their current positions on every frame, without
// allocating large backdrop canvases or restarting a crossfade.
const cacheStart=game.indexOf('let macroBackdrop=null');
const cacheEnd=game.indexOf('\nfunction streamField()',cacheStart);
let backdropBuilds=0,canvasAllocations=0;
const cacheSandbox={g:{tier:25},camera:{zoom:.1},macroEntities:[],cosmicAbsorptions:[],
 renderMacroBackground(){backdropBuilds++},drawMacro:()=>true,
 document:{createElement(){canvasAllocations++;throw Error('No per-frame canvases')}}};
vm.createContext(cacheSandbox);vm.runInContext(game.slice(cacheStart,cacheEnd),cacheSandbox);
for(let i=0;i<180;i++)cacheSandbox.renderMacroField(i/60);
assert.equal(backdropBuilds,180,'Free galaxies must keep moving with a stationary camera');
assert.equal(canvasAllocations,0,'Reuse sprite textures; allocate no backdrop canvases');
console.log('PASS: moving galaxy field redraws with cached sprites, without backdrop allocations');

// A real world index above 2^53 cannot be incremented by one. These used to
// lock the main thread forever even though the microscopic bodies are invisible.
const streamStart=game.indexOf('function streamField(){');
const streamEnd=game.indexOf('\n// Render world-anchored',streamStart);
const macroStart=game.indexOf('function streamMacroBodies(){');
const macroEnd=game.indexOf('\nconst GALAXY_PALETTES',macroStart);
for(const x of [1e20,-1e20,1e100,-1e100]){
 const sim={player:{x,y:x},camera:{zoom:1e-30},g:{tier:27,freeFlights:{}},W:1920,H:1080,cosmicAbsorptions:[],flightKey:()=>"unused",CHUNK:480,MACRO_SIZE:3200,
  entities:[{}],macroEntities:[{}],loadedChunks:new Set(['old']),macroLoaded:new Set(['old'])};
 vm.createContext(sim);
 vm.runInContext(game.slice(macroStart,macroEnd)+'\n'+game.slice(streamStart,streamEnd),sim);
 vm.runInContext('streamField()',sim,{timeout:100});
 assert.equal(sim.entities.length,0);assert.equal(sim.macroEntities.length,0);
 assert.equal(sim.loadedChunks.size,0);assert.equal(sim.macroLoaded.size,0);
}
has('if(renderGpuLens(p,R,outer))return;', 'GPU path must bypass CPU pixel readback');
has("surface.addEventListener('webglcontextlost'", 'GPU context loss must permit stable fallback');
has('state.width!==width||state.height!==height', 'GPU texture should only be allocated when dimensions change');
console.log('PASS: huge-coordinate streaming terminates; GPU-first lens with loss recovery');

const absorptionStart=game.indexOf('function startAbsorption(e){');
const absorptionEnd=game.indexOf('\nvisitPosition();streamField();',absorptionStart);
for(const zoom of [1,1e-3,1e-60,1e-110]){
 let rewards=0;
 const e={x:210/zoom,y:0,r:100/zoom,macro:true,index:0,chunk:'test'};
 const sim={e,physicsZoom:()=>zoom,camera:{zoom},player:{x:0,y:0,r:450/zoom},W:1920,H:1080,
 BLACK_HOLE_CORE_FRACTION:.245,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
 absorbingMacroKeys:new Set(),absorptionKey:()=> 'test',
 absorb(body){body.dead=true;rewards++},finishCosmicAbsorption(body){body.dead=true;rewards++}};
 vm.createContext(sim);sim.physicsZoom??=()=>sim.camera.zoom;vm.runInContext(snippet+'\n'+game.slice(absorptionStart,absorptionEnd),sim);
 vm.runInContext('startAbsorption(e);animateAbsorption(e,.05)',sim);
 assert.equal(rewards,0,'Touching the horizon must not award/remove a galaxy');
 assert.ok(e.x<210/zoom&&e.x>0,'Galaxy must actually move inward');
 assert.ok(e.absorbScale>.98,'Galaxy must not instantly collapse on first contact');
 for(let i=0;i<150&&!e.dead;i++)vm.runInContext('animateAbsorption(e,1/60)',sim);
 assert.equal(rewards,1,'Full absorption must finish and reward exactly once');
 const drawnRadius=100*1.4*e.absorbScale;
 assert.ok(Math.hypot(e.x,e.y)*zoom+drawnRadius<=110.25*.96,
  'The complete galaxy must be inside the black disk before deletion');
 vm.runInContext('animateAbsorption(e,1/60)',sim);assert.equal(rewards,1);
}
lacks('1-e.absorbing/.26', 'Contact must not fade/shrink galaxies out in place');
console.log('PASS: galaxies travel fully inside the horizon before reward/removal at four scales');

// Gravity must act before contact and have identical screen-space motion at
// ordinary and astronomical scales, including the former x9 cutoff.
const upgradePrelude=game.slice(game.indexOf('const upgrades ='),game.indexOf('const MATERIALS='))+game.slice(game.indexOf('function upgradePower('),game.indexOf('function upgradeCost('));
const gravityCode=upgradePrelude+game.slice(game.indexOf('function blackHoleGravityRadius(){'),game.indexOf('\nfunction harvestCosmicLOD'));
let firstMotion;
for(const zoom of [1,.08,1e-15,1e-60,1e-110]){
 const e={x:1000/zoom,y:0,r:30/zoom,cosmic:true,index:0,level:2,gx:0,gy:0};
 const sim={e,physicsZoom:()=>zoom,camera:{zoom},player:{x:0,y:0,r:450/zoom,vx:0,vy:0},W:1920,H:1080,
  BLACK_HOLE_CORE_FRACTION:.245,g:{time:0,freeFlights:{},upgrade:{gravity:0}},tester:{gravity:1},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),absorbingMacroKeys:new Set(),absorptionKey:()=> 'fixture',
  startAbsorption(){throw Error('Gravity test body is still outside the event horizon')}};
 vm.createContext(sim);sim.physicsZoom??=()=>sim.camera.zoom;vm.runInContext(snippet+'\n'+game.slice(game.indexOf('const RESOURCE_STREAMS='),game.indexOf('const BIOME_NAMES='))+'\n'+gravityCode,sim);
 const radius=vm.runInContext('blackHoleGravityRadius()',sim);
 vm.runInContext('for(let i=0;i<6;i++){g.time+=1/60;applyBlackHoleGravity(e,1/60)}',sim);
 const movement=1000-e.x*zoom;
 assert.ok(movement>.5,'Galaxies outside contact must move toward the black hole');
 if(firstMotion===undefined)firstMotion=movement;else assert.ok(Math.abs(movement-firstMotion)<1e-7,'Gravity speed must not vanish as zoom shrinks');
 sim.g.upgrade.gravity=40;
 assert.ok(vm.runInContext('blackHoleGravityRadius()',sim)>radius,'Gravity upgrades must affect cosmic bodies');
}
console.log('PASS: pre-contact gravity and upgrades work at five zoom scales');

const dustStart=game.indexOf('function cosmicDustView(');
const dustEnd=game.indexOf('\nfunction renderDistantBodies()',dustStart);
for(const [W,H,zoom] of [[1920,1080,.08],[3840,2160,.025],[390,844,.08]]){
 const points=[];
 const sim={W,H,CHUNK:480,camera:{zoom,x:11000,y:-7000},player:{r:30/zoom},g:{endless:true,depleted:{}},loadedChunks:new Set(),resourceViews:()=>[{x:11000,y:-7000,stream:0}],
  ctx:{save(){},restore(){},fillRect(x,y){points.push([x,y])}},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),seedHash:()=>0,
  chunkKey:(x,y)=>`${x},${y}`,chunkInfo:()=>({}),sectorQuota:()=>1,
  MATERIALS:{ore:{color:'#abc'}},absorbingMacroKeys:new Set(),absorptionKey:e=>e.chunk,
  distantSamples:(cx,cy)=>[{x:(cx+.5)*480,y:(cy+.5)*480,r:2/zoom,index:0,chunk:`${cx},${cy}`,material:'ore'}]};
 vm.createContext(sim);vm.runInContext(game.slice(dustStart,dustEnd),sim);
 const view=vm.runInContext('cosmicDustView()',sim);
 assert.ok(view.columns*view.rows<600,'Dust sampling must stay bounded on 4K');
 vm.runInContext('renderCosmicDust()',sim);
 for(const [sx,sy] of [[0,0],[1,0],[0,1],[1,1]]){
  assert.ok(points.some(([x,y])=>(sx?x>W*.7:x<W*.3)&&(sy?y>H*.7:y<H*.3)),
   'Dust must cover every viewport corner, outside the physics square');
 }
}
console.log('PASS: dust covers all four corners on desktop, 4K and mobile');

const mapHelpers=game.slice(game.indexOf('function atlasScale(){'),game.indexOf('\nfunction atlasFitPlayer('));
for(const zoom of [1,.08,1e-30,1e-110]){
 const sim={W:1920,H:1080,CHUNK:480,camera:{zoom},atlas:{zoom:1},clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
 vm.createContext(sim);vm.runInContext(mapHelpers,sim);
 vm.runInContext('atlas.zoom=atlasFitZoom(1100,550)',sim);
 const scale=vm.runInContext('atlasScale()',sim);
 assert.ok(1920/zoom*scale<1100&&1080/zoom*scale<550,'Map must fit actual camera footprint at every size');
 assert.ok(450/zoom*.245*scale>10,'Black hole must remain visible when opening the map');
 const length=vm.runInContext('atlasNiceDistance(150/atlasScale()/CHUNK)*CHUNK*atlasScale()',sim);
 assert.ok(length>40&&length<=150.000001,'Scale bar must be readable across world exponents');
}
console.log('PASS: map fits real viewport and horizon; readable scale at four exponents');

// Far dust enters physics too, and a repeated sampling tick cannot spawn a
// second copy of the same sector slot.
{
 const active=new Set(),entities=[];
 const sim={W:1920,H:1080,CHUNK:480,camera:{zoom:.08,x:0,y:0},player:{x:0,y:0,r:100},
  resourceViews:()=>[{x:0,y:0,stream:0}],g:{endless:true,depleted:{}},abyssPhysical:[],loadedChunks:new Set(),absorbingMacroKeys:active,entities,
  seedHash:()=>0,chunkKey:(x,y)=>`${x},${y}`,chunkInfo:()=>({}),sectorQuota:()=>1,
  blackHoleGravityRadius:()=>1e8,absorptionKey:e=>`${e.chunk}:${e.index}`,
  distantSamples:(cx,cy)=>[{x:(cx+.5)*480,y:(cy+.5)*480,r:10,index:0,chunk:`${cx},${cy}`,material:'ore',value:10}]};
 vm.createContext(sim);vm.runInContext(game.slice(dustStart,dustEnd),sim);
 for(let i=0;i<10;i++)vm.runInContext('promoteCosmicDust()',sim);
 assert.ok(entities.length>64,'Particles outside the local streaming square must be promoted');
 const count=entities.length;
 vm.runInContext('promoteCosmicDust()',sim);
 assert.equal(entities.length,count,'Repeated sampling must not duplicate active dust');
 assert.equal(new Set(entities.map(e=>`${e.chunk}:${e.index}`)).size,count);
}
console.log('PASS: distant dust becomes physical without duplicate sector slots');

// The real inverse lens equation must form an Einstein ring, rather than
// simply shifting all samples outwards (which never produces a donut).
const lensStart=game.indexOf('const EINSTEIN_RING_SCALE=');
const lensStop=game.indexOf('let gpuLens=',lensStart);
const lensBox={tester:{ring:1},BLACK_HOLE_CORE_FRACTION:.245,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
vm.createContext(lensBox);
vm.runInContext(game.slice(lensStart,lensStop),lensBox);
for(const R of [8,80,300,1000]){
 const outer=R*2.3,ring=R*.245*2.05;
 const sample=d=>lensBox.lensSourceRadius(d,R,outer);
 assert.ok(Math.abs(sample(ring))<1e-9,'Aligned source must map to a ring outside the horizon');
 assert.ok(sample(ring*.85)<0&&sample(ring*1.15)>0,'Lens must have inner reversed and outer primary images');
 assert.ok(Math.abs(sample(outer)-outer)<1e-9,'Lens outer edge must join the unwarped scene');
 for(let i=0;i<100;i++)assert.ok(Number.isFinite(sample(R*.245+i*outer/100)));
 // A small aligned disk appears all around the ring: its angular extent is
 // magnified while the radial width remains finite, at every player size.
 assert.ok(Math.abs(sample(ring+R*.01))<R*.025);
 assert.ok(Math.abs(sample(ring-R*.01))<R*.025);
 const derivative=(sample(outer)-sample(outer-R*1e-5))/(R*1e-5);
 assert.ok(Math.abs(derivative-1)<.001,'No seam at lens boundary');
}
console.log('PASS: Einstein ring, reversed inner image, scale invariance and seamless outer edge');

// Ring control changes the mapping immediately and stays outside the horizon.
for(const factor of [.6,1,1.8,2.5]){
 lensBox.tester.ring=factor;
 const R=200,ring=R*.245*2.05*factor;
 assert.ok(ring>R*.245);
 assert.ok(Math.abs(lensBox.lensSourceRadius(ring,R,R*2.3))<1e-8);
}
console.log('PASS: tester ring size works from 0.6x through 2.5x');

// The middle zoom band (including roughly 3x player size) used to fall back
// to the square streaming patch. Execute the actual render dispatch there.
const distantStart=game.indexOf('function renderDistantBodies(){');
const distantStop=game.indexOf('\nfunction respawn(',distantStart);
for(const zoom of [.4,.25,.19,.13,.08]){
 let calls=0;const box={g:{endless:true},camera:{zoom},renderCosmicDust(){calls++}};
 vm.createContext(box);vm.runInContext(game.slice(distantStart,distantStop),box);
 box.renderDistantBodies();assert.equal(calls,1,'Every endless zoom must use viewport-wide resources');
}
console.log('PASS: viewport-wide resources also render through the 3x-size zoom band');

// Execute generation and gravity at ordinary and extreme coordinates.
const abyssStart=game.indexOf('const ABYSS_BASE=');
const abyssStop=game.indexOf('function refreshAbysses()',abyssStart);
const seedStart=game.indexOf('function seedHash('),seedStop=game.indexOf('\nfunction chunkInfo(',seedStart);
const abyssBox={g:{abyssConsumed:{},abyssPositions:{}},CHUNK:480,TAU:Math.PI*2,WORLD_SEED:0x17aba37,player:{x:0,y:0,r:300},
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
vm.createContext(abyssBox);
vm.runInContext(game.slice(seedStart,seedStop)+game.slice(abyssStart,abyssStop),abyssBox);
const nearest=abyssBox.nearestAbyss();assert.ok(nearest&&nearest.r>300*20);
assert.ok(Math.hypot(nearest.x,nearest.y)>nearest.r*5,'Spawn must be outside the danger field');
const original=JSON.stringify(nearest);assert.equal(JSON.stringify(abyssBox.nearestAbyss()),original);
for(const radius of [1e4,1e50,1e110,1e140]){
 const h={x:radius*10,y:-radius*10,r:radius};
 const far=abyssBox.abyssPull(h,h.x+radius*6,h.y,200);
 assert.equal(far.x,0);assert.equal(far.y,0);
 const pull=abyssBox.abyssPull(h,h.x+radius*2,h.y,200);
 assert.ok(pull.x<0&&Number.isFinite(pull.x));
 assert.ok(abyssBox.crossesAbyss(h,h.x-radius*2,h.y,h.x+radius*2,h.y),'Fast flight cannot tunnel through horizon');
 assert.ok(!abyssBox.crossesAbyss(h,h.x-radius*2,h.y+radius*2,h.x+radius*2,h.y+radius*2));
 abyssBox.player={x:radius*10,y:-radius*10,r:radius/50};
 const large=abyssBox.nearestAbyss();assert.ok(large&&Number.isFinite(large.r));
 const bodies=abyssBox.abyssCandidates(h.x,h.y,radius*5,radius/100);
 assert.ok(bodies.length<1000,'Landmark query must stay bounded');
 assert.equal(new Set(bodies.map(e=>e.id)).size,bodies.length);
}
console.log('PASS: permanent giant landmarks, safe origin, attraction and swept lethal collision up to 1e140');

// Death pauses the run for an optional ad or stardust revival;
// restart resets evolution while retaining meta progression.
const resetStart=game.indexOf('function resetCampaignState('),resetStop=game.indexOf('\nfunction dieInAbyss(',resetStart);
const deathStart=resetStop+1,deathStop=game.indexOf('\nfunction showDeathOffer(',deathStart);
const freshStart=game.indexOf('const fresh ='),freshStop=game.indexOf('\nlet g =',freshStart);
const resetNode={classList:{add(){}},hidden:false};let savedDeath=null,deathScreen='';
const resetBox={achievementQueue:[],achievementToastAt:0,requirementNotice:'',requirementNoticeAt:0,externalMusic:null,
 g:{ownedTracks:[2,5],activeTrack:5,achievements:{first:123},bestiary:{planet:true},tier:27,total:1e12,time:7200,matter:1e12,credits:999999,upgrade:{gravity:80},materials:{exotic:55},sound:false,music:false,musicVolume:.2,quality:.5,autoQuality:false,particles:false,controlMode:'keys',flightFeel:'direct',daily:{lastDay:100,claims:5,spins:3},drift:{route:[[1,2],[3,4]]},losses:0},
 cosmicAbsorptions:[{}],absorbingMacroKeys:new Set(['taken']),visitedChunks:new Set(['1,1']),loadedChunks:new Set(['1,1']),distantChunkCache:new Map(),macroLoaded:new Set(),macroCache:new Map(),macroLODCache:new Map(),macroBackdrop:null,macroBackdropOld:null,macroEntities:[{}],entities:[{}],
 TEST_MODE:false,tester:{ring:1.5},player:{x:123,y:456,r:1e20,vx:200,vy:300},camera:{x:123,y:456,zoom:1e-10},particles:[{}],shockwaves:[{}],energyArcs:[{}],texts:[{}],radiusAt:()=>13,
 $:()=>resetNode,visitPosition(){},streamField(){},renderUI(){},testerRefresh(){},testerToggle(){},clearFlightInput(){},
 fmt:String,timeFmt:String,continueButton:()=>'<button>НАЧАТЬ С НУЛЯ</button>',attachContinue(){},
 pendingDeath:null,showDeathOffer(){deathScreen='ПОГЛОЩЁН БЕЗДНОЙ';resetBox.save();},
 save(){savedDeath=JSON.parse(JSON.stringify(resetBox.g))},show(html){deathScreen=html},
 running:true,pulseCd:13,boostCd:6,boostTime:1,abyssTimer:0,abyssPhysical:[],abyssVisual:[],abyssNotice:'',lastReveal:{}};
vm.createContext(resetBox);
vm.runInContext(game.slice(freshStart,freshStop)+game.slice(resetStart,resetStop)+game.slice(deathStart,deathStop),resetBox);
resetBox.dieInAbyss({id:'ancient',name:'ЭРЕБ',x:100,y:100,r:400});
assert.equal(savedDeath.tier,27,'Do not destroy the run before the user chooses a revival');
assert.ok(savedDeath.pendingDeath&&savedDeath.pendingDeath.hole.name==='ЭРЕБ');
assert.equal(savedDeath.losses,1);
assert.ok(deathScreen.includes('ПОГЛОЩЁН БЕЗДНОЙ'));
resetBox.resetCampaignState(false);
assert.equal(savedDeath.tier,0);assert.equal(savedDeath.matter,0);assert.equal(savedDeath.credits,999999);
assert.equal(savedDeath.upgrade.gravity,0);assert.equal(savedDeath.materials.exotic,0);
assert.equal(Object.keys(savedDeath.depleted).length,0);assert.equal(resetBox.cosmicAbsorptions.length,0);
assert.equal(resetBox.player.x,0);assert.equal(resetBox.player.vx,0);assert.equal(resetBox.camera.zoom,1);
assert.equal(resetBox.running,false);assert.equal(resetBox.boostCd,0);
assert.equal(savedDeath.autoQuality,false);assert.equal(savedDeath.music,false);assert.equal(savedDeath.controlMode,'keys');
assert.equal(resetBox.tester.ring,1.5);
assert.equal(savedDeath.pendingDeath,null);
assert.deepEqual(savedDeath.ownedTracks,[2,5]);assert.equal(savedDeath.activeTrack,5);
assert.deepEqual(savedDeath.achievements,{first:123});assert.deepEqual(savedDeath.bestiary,{planet:true});
assert.equal(savedDeath.daily.claims,5);assert.equal(savedDeath.drift.route.length,2);
resetBox.resetCampaignState(true);assert.equal(savedDeath.credits,999999,'new universe also retains stardust');
assert.deepEqual(savedDeath.ownedTracks,[2,5]);assert.equal(savedDeath.activeTrack,5);
console.log('PASS: death offers revival before resetting; restarting preserves stardust, music, daily rewards, route and achievements');

// A rival consumes matter without awarding it to the player or reviving it.
const rivalStart=game.indexOf('function pullBodyIntoAbyss('),rivalStop=game.indexOf('function paintAbyss(',rivalStart);
let rivalMarks=0;
const rivalBox={physicsZoom:()=>1,g:{abyssConsumed:{},freeFlights:{}},flightKey:e=>e.index,canEatAbyss:()=>false,abyssPhysical:[{x:0,y:0,r:1000}],camera:{zoom:1},absorbingMacroKeys:new Set(),
 abyssPull:abyssBox.abyssPull,crossesAbyss:abyssBox.crossesAbyss,absorptionKey:e=>e.index,
 markHarvested(){rivalMarks++},cosmicSceneDirty:false};
vm.createContext(rivalBox);vm.runInContext(game.slice(rivalStart,rivalStop),rivalBox);
const matter={x:1100,y:0,index:1};assert.ok(rivalBox.pullBodyIntoAbyss(matter,.01));
assert.ok(matter.x<1100&&!matter.dead,'Rival attracts before contact');
assert.ok(rivalBox.pullBodyIntoAbyss(matter,.5));assert.equal(matter.dead,true);assert.equal(rivalMarks,1);
rivalBox.pullBodyIntoAbyss(matter,.5);assert.equal(rivalMarks,1);
const bag={},galaxy={x:1001,y:0,index:4,captureBag:bag,captureKey:'galaxy'};
rivalBox.pullBodyIntoAbyss(galaxy,.5);assert.equal(bag.galaxy,1<<4);
console.log('PASS: rival gravity consumes dust and distant galaxies exactly once without rewards');

// Catalogue identities survive every zoom; nearby subpixel holes form an
// explicitly counted group, never a newly generated replacement object.
const catalogue=abyssBox.buildAbyssCatalogue();
assert.ok(catalogue.length>=81&&catalogue.length<=243);
assert.equal(JSON.stringify(abyssBox.buildAbyssCatalogue()),JSON.stringify(catalogue));
for(let level=0;level<=80;level++){
 const band=catalogue.filter(h=>h.level===level);assert.ok(band.length>=1&&band.length<=3);
 for(const h of band){
  assert.ok(Math.hypot(h.x,h.y)>h.r*5);
  for(const other of band)if(other!==h)assert.ok(Math.hypot(other.x-h.x,other.y-h.y)>Math.max(other.r,h.r)*12);
 }
}
const markerStart=game.indexOf('function atlasAbyssMarkers('),markerStop=game.indexOf('function atlasFocusHoles(',markerStart);
const markerBox={abyssCandidates:abyssBox.abyssCandidates};vm.createContext(markerBox);
vm.runInContext(game.slice(markerStart,markerStop),markerBox);
const tracked=catalogue[0];
for(const radiusPx of [200,20,3,.1,.00001]){
 const markers=markerBox.atlasAbyssMarkers(tracked.x,tracked.y,1100,550,radiusPx/tracked.r);
 const found=markers.flatMap(m=>m.bodies).filter(h=>h.id===tracked.id);
 assert.equal(found.length,1,'A zoomed-out landmark must remain represented exactly once');
 assert.equal(JSON.stringify(found[0]),JSON.stringify(tracked));
}
assert.ok(!game.includes("kind:blackhole?'blackhole'"));
assert.ok(!game.includes("kind:hole?'blackhole'"));
console.log('PASS: sparse non-grid catalogue; same named holes stay on map from 200 px to subpixel scales');

// Pins retain world coordinates, labels, IDs and preferred zoom in the save.
const normalStart=game.indexOf('function normaliseMapPins('),normalStop=game.indexOf('\ng.mapPins=',normalStart);
const pinStart=game.indexOf('function addMapPin('),pinStop=game.indexOf('function refreshPinPanel(',pinStart);
let pinSaves=0;
const pinBox={L:en=>en,g:{mapPins:[],nextPinId:1,activePin:null},atlas:{zoom:.01},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),save(){pinSaves++}};
vm.createContext(pinBox);vm.runInContext(game.slice(normalStart,normalStop)+game.slice(pinStart,pinStop),pinBox);
const firstPin=pinBox.addMapPin(123,-456,.01),farPin=pinBox.addMapPin(1e120,-1e120,1e-120);
firstPin.name='Путь к Эребу';const loadedPins=pinBox.normaliseMapPins(JSON.parse(JSON.stringify(pinBox.g.mapPins)));
assert.equal(JSON.stringify(loadedPins),JSON.stringify(pinBox.g.mapPins));
assert.equal(loadedPins[1].x,1e120);assert.equal(pinBox.g.activePin,farPin.id);
pinBox.removeMapPin(farPin.id);assert.equal(pinBox.g.activePin,firstPin.id);assert.equal(pinBox.g.mapPins.length,1);
assert.ok(pinSaves>=3);
assert.equal(pinBox.normaliseMapPins([{id:1,x:NaN,y:0},{id:2,x:1,y:2},{id:2,x:3,y:4}]).length,1);
console.log('PASS: map pins persist exact world coordinates across reload; invalid/duplicate saves rejected');

// Reproduce the v3.17 bug: rival attraction returned true for a LIVE body,
// and the outer update loop mistakenly removed it from the active collection.
const activeLoopStart=game.indexOf(' for(let i=cosmicAbsorptions.length-1;i>=0;i--)',game.indexOf('function update(dt){'));
const activeLoopStop=game.indexOf('\n harvestCosmicLOD(',activeLoopStart);
const moving={x:1100,y:0,index:8};
const rivalLoop={g:{endless:true},cosmicAbsorptions:[moving],dt:.01,pullBodyIntoAbyss:rivalBox.pullBodyIntoAbyss,
 animateAbsorption(){throw new Error('Rival owns this body')},applyBlackHoleGravity(){throw new Error('Rival owns this body')}};
vm.createContext(rivalLoop);vm.runInContext(game.slice(activeLoopStart,activeLoopStop),rivalLoop);
assert.equal(rivalLoop.cosmicAbsorptions.length,1);assert.ok(moving.x<1100&&!moving.dead);
rivalLoop.dt=.5;vm.runInContext(game.slice(activeLoopStart,activeLoopStop),rivalLoop);
assert.equal(rivalLoop.cosmicAbsorptions.length,0);assert.equal(moving.dead,true);
console.log('PASS: rival-bound matter remains visible and simulated until actually consumed');

// Adjacent dust LODs share the same representative sector. Only the other
// sectors smoothly fade, rather than the entire field rerolling at a zoom step.
const sampleStart=game.indexOf('function dustRepresentative('),sampleStop=game.indexOf('function promoteCosmicDust()',sampleStart);
const sampleBox={seedHash:abyssBox.seedHash};vm.createContext(sampleBox);vm.runInContext(game.slice(sampleStart,sampleStop),sampleBox);
for(const step of [1,2,4,8,16])for(const gx of [-8*step,0,12*step]){
 const gy=-4*step,parent=sampleBox.dustRepresentative(gx,gy,step*2);
 let visible=0;
 for(let iy=0;iy<2;iy++)for(let ix=0;ix<2;ix++){
  const s=sampleBox.dustSample(gx+ix*step,gy+iy*step,{step,blend:1});
  if(s.weight>0){visible++;assert.equal(s.x,parent.x);assert.equal(s.y,parent.y);}
 }
 assert.equal(visible,1);
}
assert.ok(!game.slice(game.indexOf('function visitPosition('),game.indexOf('function markHarvested(')).includes('toast('));
console.log('PASS: no dust-field reroll at zoom boundaries; exploration notifications removed');

// Returning the v3.17 ring must not reintroduce a step in source brightness.
const fadeBox={clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};vm.createContext(fadeBox);
vm.runInContext(game.slice(game.indexOf('function absorptionLight('),game.indexOf('function animateAbsorption(')),fadeBox);
let previous=1;
for(let i=0;i<=28;i++){
 const brightness=fadeBox.absorptionLight({lensFade:i/100});
 assert.ok(brightness<=previous&&brightness>=0);
 assert.ok(previous-brightness<.06,'Hidden source light must not blink off');previous=brightness;
}
assert.equal(fadeBox.absorptionLight({}),1,'Contact alone must retain the former lens image');
assert.equal(fadeBox.absorptionLight({lensFade:.28}),0,'Delete only after lensed light is zero');
console.log('PASS: restored ring source fades continuously to zero after full entry');

// Smaller holes are real consumable bodies. Their location survives reload,
// and their permanent ID leaves both map and world after a single reward.
const prey=catalogue[0],core=prey.r*2;
let holeSaves=0;
Object.assign(abyssBox,{g:{endless:true,abyssConsumed:{},abyssPositions:{},matter:10000,total:10000,stageCollects:0,credits:0,collects:0,materials:{exotic:0},tier:27},
 player:{x:prey.x+core*1.6,y:prey.y,r:core/.245},camera:{zoom:60/core},
 physicsZoom:()=>60/core,blackHoleCoreWorldRadius:()=>core,blackHoleGravityRadius:()=>core*4,
 TA:Array.from({length:28},()=>({required:10000})),currentRadius:()=>12345,
 atlas:{dirty:false},toast(){},save(){holeSaves++},fmt:String});
assert.equal(abyssBox.canEatAbyss(prey),true);
assert.equal(abyssBox.canEatAbyss({...prey,r:core}),false,'Equal-size holes remain dangerous');
abyssBox.attractSmallerAbyss(prey,.005);
const pos1=abyssBox.g.abyssPositions[prey.id][0];
abyssBox.attractSmallerAbyss(prey,.005);
const pos2=abyssBox.g.abyssPositions[prey.id][0];
assert.ok(pos2>pos1&&pos1>prey.x,'Do not reset movement to the stale catalogue coordinate');
assert.equal(abyssBox.g.collects,0,'First contact must not reward or remove');
const restoredHoleState=JSON.parse(JSON.stringify(abyssBox.g));abyssBox.g=restoredHoleState;
const restored=abyssBox.abyssCandidates(prey.x,prey.y,core*10).find(h=>h.id===prey.id);
assert.equal(restored.x,pos2,'Moved hole position must survive saved-state reload');
for(let i=0;i<300&&!abyssBox.g.abyssConsumed[prey.id];i++)abyssBox.attractSmallerAbyss(prey,1/60);
assert.equal(abyssBox.g.abyssConsumed[prey.id],true);
assert.equal(abyssBox.g.collects,1);assert.ok(abyssBox.g.matter>10000);assert.equal(holeSaves,1);
abyssBox.finishAbyssAbsorption(prey);assert.equal(abyssBox.g.collects,1);
assert.ok(!abyssBox.abyssCandidates(prey.x,prey.y,core*10).some(h=>h.id===prey.id));
console.log('PASS: smaller holes move, persist and disappear only after full absorption; single reward');

// One time-based path shared by generation and active physics at any scale.
const driftCode=game.slice(game.indexOf('const RESOURCE_STREAMS='),game.indexOf('const BIOME_NAMES='));
const driftBox={g:{time:0,freeFlights:{}},absorptionKey:e=>String(e.index),seedHash:abyssBox.seedHash};vm.createContext(driftBox);vm.runInContext(driftCode,driftBox);
for(const r of [6,300,1e100]){
 const source={x:r*10,y:-r*3,r,index:7,cosmic:r>1e3};
 const p0=driftBox.driftBody(source);driftBox.g.time=7;
 const p1=driftBox.driftBody(source),p2=driftBox.driftBody(p0);
 assert.equal(p1.x,p2.x);assert.equal(p1.y,p2.y);
 assert.ok(Math.hypot(p1.x-p0.x,p1.y-p0.y)>0);
 driftBox.g.time=7+1/60;const p3=driftBox.driftBody(p1);
 assert.ok(Math.hypot(p3.x-p1.x,p3.y-p1.y)<Math.max(r*.01,3),'No frame-to-frame jumps');
 const caught={...p1,gravityBound:true};assert.equal(driftBox.driftBody(caught),caught);
 driftBox.g.time=0;
}
// Evolution is driven solely by actual collected mass, materials and exploration.
{
 const gate={
  g:{tier:0,endless:false,complete:false,matter:280,unlocks:0,stageCollects:12,stageRare:0,stagePulses:0,stageExplored:0},
  TA:Array.from({length:28},(_,i)=>({required:280,name:'Form '+i,color:'#b8a5f8'})),
  player:{x:0,y:0,r:10,targetR:10,shield:0},morph:null,screenFlash:0,shake:0,
  shockwaves:[],energyArcs:[],spent:0,
  spendRecipe(){},currentRadius(){return 12},burst(){},popText(){},toast(){},sound(){},renderUI(){}
 };
 gate.spendRecipe=()=>{gate.spent++};
 vm.createContext(gate);
 const start=game.indexOf('function evolve(){'),end=game.indexOf('function flashAbilityButton(',start);
 assert.ok(start>0&&end>start,'Evolution function must be directly testable');
 vm.runInContext(game.slice(start,end),gate);
 gate.evolve();
 assert.equal(gate.g.tier,1,'A ready form must evolve immediately without a timer');
 assert.equal(gate.spent,1,'Evolution must still spend the recipe exactly once');
 assert.equal(gate.g.matter,0,'Evolution resets matter while preserving position and mass scale');
}
assert.ok(!game.includes('MIN_STAGE_SECONDS')&&!game.includes('stageElapsed'),
 'Evolution must never be locked behind an artificial countdown');
assert.ok(!game.includes('renderAccretionStreams('),
 'Do not simulate fake decorative black-hole debris');
assert.ok(game.includes('*tester.gravity*7/zoom'),
 'Black-hole gravity reach must be multiplied by seven');
assert.ok(game.includes('*4*2.4*7'),
 'Black-hole gravitational pull must be multiplied by seven');
const campaignYields=game.match(/const CAMPAIGN_YIELD=\[([^\]]+)\]/);
assert.ok(campaignYields,'Campaign yield array missing');
const yields=campaignYields[1].split(',').map(Number);
assert.equal(yields.length,27);
assert.ok(yields.every(x=>x>0&&x<=.08),'Slow progression via earned resources, not an elapsed-time gate');
assert.ok(yields[8]<.65/6,'Former large mid-game reward spike must be eliminated');
const evoScreen=game.slice(game.indexOf('function showV15Evolution(){'),game.indexOf('const trackCover=',game.indexOf('function showV15Evolution(){')));
assert.ok(evoScreen.includes('evo-v2-summary')&&evoScreen.includes('evo-v2-goals')&&evoScreen.includes('evo-v2-form-grid'),
 'Evolution screen must explain the current form, resource goals and stage history');
const stagesCode=game.slice(game.indexOf('function showV15Evolution(){'),game.indexOf('const trackCover=',game.indexOf('function showV15Evolution(){')));
assert.ok(stagesCode.includes('for(let i=0;i<TA.length;i++)'), 'All 28 evolution forms must be visible');
assert.ok(game.includes("FIELD_GUIDE.push(...TA.map"), 'All current and future forms must be in the bestiary');
assert.ok(game.includes("flashAbilityButton('pulse')")&&game.includes("flashAbilityButton('dash')"), 'Keyboard abilities must animate their buttons');
const mapCode=game.slice(game.indexOf('function drawAtlas(){'),game.indexOf('function showMap(){'));
assert.ok(!mapCode.includes('clamp(bodyRadius,10,26)'), 'Atlas must not clamp the physical player radius to a fixed-size avatar');
assert.ok(mapCode.includes('paintAbyss(c,playerPoint.x,playerPoint.y,bodyRadius,w,h)'), 'Black-hole map core must use original physical radius');
assert.ok(mapCode.includes('paintPlayerForm(playerPoint.x,playerPoint.y,bodyRadius,0,g.tier)'), 'Non-black-hole forms must use original physical map radius');
assert.ok(!mapCode.includes('avatarRadius'), 'Map label must not refer to removed avatarRadius (was crashing the whole map render)');
const mapPinsCode=game.slice(game.indexOf('function drawMapPins(c,w,h,scale){'),game.indexOf('let atlasExplorationSurface=null;'));
assert.ok(mapPinsCode.includes('for(const pin of g.mapPins)'), 'Atlas and in-flight HUD must render all saved markers');
assert.ok(!mapPinsCode.includes("const pin=g.mapPins.find(p=>p.id===g.activePin);if(!pin)return;"), 'Only rendering the active pin hides other saved waypoints');
assert.ok(mapPinsCode.includes('pins.length>1'), 'Overlapping saved markers should be clustered with a visible count');

const selectBehavior=fs.readFileSync('ui-v15-behaviors.js','utf8');
assert.ok(game.includes('visual?.enhanceSelects(details)'), 'Marker picker must use the game-themed dropdown');
assert.ok(selectBehavior.includes("childList:true,subtree:true,characterData:true"), 'Marker dropdown options must refresh after adding and renaming pins');

assert.ok(!mapCode.includes('g.tier>=13'),'Galaxies must be on the map from the first form');
console.log('PASS: moving bodies agree across map/physics/reload; captured bodies leave orbital paths');

// The visual opening changes may not accelerate evolution or award extra mass.
const reqBox={};vm.createContext(reqBox);
vm.runInContext(game.slice(game.indexOf('const TA = ['),game.indexOf('const upgrades = ['))+'globalThis.forms=TA',reqBox);
for(let tier=0;tier<28;tier++)assert.equal(reqBox.forms[tier].required,Math.round(180+100*Math.pow(tier+1,1.47)));
const absorbCode=game.slice(game.indexOf('function absorb(e){'),game.indexOf('// Bodies larger than you'));
assert.ok(!absorbCode.includes('*advanceHarvestChain()'));
assert.ok(!absorbCode.includes('*chainMultiplier()'));
console.log('PASS: visual chains preserve the existing evolution costs and material rewards');

// Grazing a finite field bends a trajectory; it must not become a homing missile.
const flightBox={physicsZoom:()=>1,canAbsorbBody:e=>e.r<=20,camera:{zoom:1},g:{time:0,freeFlights:{}},player:{x:0,y:0,r:20},
 absorbed:0,absorbingMacroKeys:new Set(),absorptionKey:e=>e.chunk+':'+e.index,
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),seedHash:abyssBox.seedHash};
vm.createContext(flightBox);
vm.runInContext(game.slice(game.indexOf('const RESOURCE_STREAMS='),game.indexOf('const BIOME_NAMES='))+
 game.slice(game.indexOf('function deflectResource('),game.indexOf('function gatherBody(')),flightBox);
function flyby(fps){
 flightBox.g={time:0,freeFlights:{}};
 let e={x:-200,y:94,r:5,index:0,chunk:'test',vx:100,vy:0,motionVX:100,motionVY:0,flightTime:0,freeFlight:true};
 flightBox.g.freeFlights['test:0']={...e};
 let seenField=false,lastVelocity;
 for(let i=0;i<fps*6;i++){
  flightBox.g.time=(i+1)/fps;e=flightBox.freeFlightAt(flightBox.g.freeFlights['test:0']);
  seenField=flightBox.deflectResource(e,1/fps,100)||seenField;
  if(i===fps*5-1)lastVelocity=[e.motionVX,e.motionVY];
 }
 assert.ok(seenField,'Fixture must enter the gravity field');
 assert.ok(e.x>200&&e.y<94&&!e.gravityBound,'Grazing body must bend and escape');
 assert.deepEqual([e.motionVX,e.motionVY],lastVelocity,'No drag or attraction after escape');
 const saved=JSON.parse(JSON.stringify(flightBox.g));flightBox.g=saved;
 const restored=flightBox.freeFlightAt(saved.freeFlights['test:0']);
 assert.equal(restored.x,e.x);assert.equal(restored.y,e.y);
 return e;
}
const path30=flyby(30),path120=flyby(120);
assert.ok(Math.hypot(path30.x-path120.x,path30.y-path120.y)<3,'Trajectory must remain close across frame rates');
flightBox.g={time:0,freeFlights:{}};
for(let i=0;i<4;i++){
 const original={x:200,y:300,index:i,r:5};
 const a=flightBox.driftBody(original);flightBox.g.time=10;const b=flightBox.driftBody(original);
 const speed=Math.hypot(b.x-a.x,b.y-a.y)/10;
 assert.ok(speed>=70&&speed<=100,'Initial resources need noticeable flight speed');
 const source=flightBox.resourceViews(b.x,b.y)[i];
 assert.equal(source.x,original.x);assert.equal(source.y,original.y);
 flightBox.g.time=0;
}
const entityPainter=game.slice(game.indexOf('function renderEntity('),game.indexOf('function paintEntity('));
assert.ok(!entityPainter.includes('stroke'),'No motion lines attached to small resources');
console.log('PASS: fast free flight, grazing deflection, inertial escape, save/reload and 30/120 Hz agreement');

// The stronger field captures near passes, while truly distant flybys retain
// their unmodified velocity. Both must stay stable at astronomical zoom.
for(const zoom of [1,1e-60]){
 const sim={physicsZoom:()=>zoom,camera:{zoom},player:{x:0,y:0,r:450/zoom,vx:0,vy:0},W:1920,H:1080,
  BLACK_HOLE_CORE_FRACTION:.245,g:{time:0,freeFlights:{},upgrade:{gravity:0}},tester:{gravity:1},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),absorbingMacroKeys:new Set(),absorptionKey:()=> 'grazing',
  captures:0,startAbsorption(){sim.captures++;}};
 vm.createContext(sim);sim.physicsZoom??=()=>sim.camera.zoom;
 vm.runInContext(snippet+'\n'+game.slice(game.indexOf('const RESOURCE_STREAMS='),game.indexOf('const BIOME_NAMES='))+'\n'+gravityCode,sim);
 const range=sim.blackHoleGravityRadius();
 const outside={x:-500/zoom,y:range*1.1,r:6/zoom,cosmic:true,index:0,level:2,gx:0,gy:0,
  vx:250/zoom,vy:0,motionVX:250/zoom,motionVY:0,freeFlight:true,flightTime:0};
 sim.g.freeFlights.grazing={...outside};
 for(let i=0;i<120;i++){sim.g.time=(i+1)/60;sim.applyBlackHoleGravity(outside,1/60);}
 assert.ok(!outside.gravityBound,'A genuinely distant body must remain outside the stronger field');
 assert.equal(outside.motionVX,250/zoom,'Outside the field there must be no acceleration');
 const near={x:-250/zoom,y:range*.9,r:6/zoom,cosmic:true,index:1,level:2,gx:0,gy:0,
  vx:0,vy:0,motionVX:0,motionVY:0,freeFlight:false,flightTime:0};
 const initialDist=Math.hypot(near.x,near.y);
 for(let i=0;i<30;i++){sim.g.time=(i+1)/60;sim.applyBlackHoleGravity(near,1/60);if(sim.captures)break;}
 assert.ok(Math.hypot(near.x,near.y)<initialDist,'7x field must pull near passes inward');
}
console.log('PASS: 7x black-hole gravity attracts near passes; remote flybys preserve velocity');

// Physical scale, appearance and useful food evolve together without tier gates.
const scaleBox={TA:reqBox.forms,player:{r:13},tester:{zoom:1},g:{tier:0,matter:0},
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),blackHoleCoreWorldRadius(){return scaleBox.player.r*.245}};
vm.createContext(scaleBox);
vm.runInContext(game.slice(game.indexOf('function radiusAt('),game.indexOf('function currentRadius('))+
 game.slice(game.indexOf('function bodyType('),game.indexOf('const bodySpriteCache='))+
 game.slice(game.indexOf('function blackHoleBodyValue('),game.indexOf('function finishCosmicAbsorption(')),scaleBox);
for(let t=0;t<27;t++){
 assert.equal(scaleBox.radiusAt(t,1),scaleBox.radiusAt(t+1,0),'No size jump at evolution');
 const radius=scaleBox.radiusAt(t,0),zoom=scaleBox.campaignZoom(radius);
 assert.ok(radius*zoom>=29&&radius*zoom<=145.01,'Camera must follow campaign growth');
 scaleBox.player.r=radius;
 assert.ok(scaleBox.ordinaryBodyValue({r:radius*.6})<reqBox.forms[t].required*.05,'One body must not skip a stage');
}
for(const [tier,type] of [[4,'asteroid'],[7,'moon'],[9,'planet'],[12,'gasgiant'],[16,'star'],[20,'system'],[23,'galaxy'],[26,'cluster']]){
 const radius=scaleBox.radiusAt(tier,0);
 for(const playerTier of [0,12,27]){scaleBox.g.tier=playerTier;assert.equal(scaleBox.bodyType(radius),type,'Body identity must not depend on player stage');}
}
for(const r of [1e6,1e30,1e110]){
 scaleBox.player.r=r;scaleBox.g={tier:27,matter:1e12};
 const value=scaleBox.blackHoleBodyValue({r:r*.1});assert.ok(Number.isFinite(value)&&value>0&&value<1e10,'Cosmic reward must not explode with coordinate units');
}
assert.ok(!game.slice(game.indexOf('function streamMacroBodies('),game.indexOf('const GALAXY_PALETTES=')).includes('g.tier<'));
assert.ok(!game.slice(game.indexOf('function renderMacroBackground('),game.indexOf('function streamField(')).includes('g.tier<'));

// A moon/planet in the distant field becomes physical before black-hole evolution,
// moves fully into the player, and marks its exact persistent deposit as depleted.
const promotion={physicsZoom:()=>1,canAbsorbBody:e=>e.r<=1000,cosmicViewAt:()=>({levels:[1],low:1,fraction:0}),g:{endless:false,depletedMacro:{},depletedCosmic:{}},player:{r:1000,x:0,y:0},
 cosmicHarvestTimer:0,cosmicAbsorptions:[],absorbingMacroKeys:new Set(),macroLoaded:new Set(),MACRO_SIZE:3200,
 ordinaryGravityRadius:()=>2800,cosmicVisibleLOD:()=>({levels:[1],low:1,fraction:0}),
 macroLODNodes:(gx,gy)=>gx===0&&gy===0?[{x:200,y:0,r:300,cosmic:true,level:1,gx,gy,index:0,material:'ice'}]:[],
 absorptionKey:e=>`${e.level}:${e.gx}:${e.gy}:${e.index}`,
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
vm.createContext(promotion);
vm.runInContext(game.slice(game.indexOf('function harvestCosmicLOD('),game.indexOf('function promoteAbyssMatter('))+
 game.slice(game.indexOf('function gatherBody('),game.indexOf('function update(dt)'))+
 game.slice(game.indexOf('function markHarvested('),game.indexOf('// Permanent sector capacity')),promotion);
vm.runInContext('harvestCosmicLOD(.1);harvestCosmicLOD(.1)',promotion);
assert.equal(promotion.cosmicAbsorptions.length,1,'One physical copy per body');
const food=promotion.cosmicAbsorptions[0];food.gathering=.000001;food.gatherX=food.x;food.gatherY=food.y;
let received=0;promotion.absorb=e=>{received++;promotion.markHarvested(e);e.dead=true;};
promotion.gatherBody(food,.25);assert.equal(received,0);assert.ok(food.x<200);
promotion.gatherBody(food,.31);assert.equal(received,1);assert.equal(promotion.g.depletedCosmic['1:0:0'],1);
console.log('PASS: continuous physical progression, fixed body classes, bounded rewards and pre-hole cosmic collection');

// The CPU hot loop keeps the exact bilinear lens equation and transparent edges.
const pixelBox={};vm.createContext(pixelBox);
vm.runInContext(game.slice(game.indexOf('function buildLensPixelMap('),game.indexOf('function renderBlackHoleLensing(')),pixelBox);
const side=24,input=new Uint8ClampedArray(side*side*4),output=new Uint8ClampedArray(input.length);
for(let i=0;i<input.length;i+=4){input[i]=i%251;input[i+1]=(i*3)%253;input[i+2]=123;input[i+3]=255;}
const identity=new Float32Array(4097).fill(1),opaque=new Float32Array(4097).fill(1);
pixelBox.warpLensPixels(input,output,side,side,0,0,1,1,12,12,2,20,20/4096,identity,opaque,1,8);
for(const [x,y] of [[6,8],[14,8],[8,16],[17,15]]){
 const i=(y*side+x)*4;assert.equal(output[i],input[i]);assert.equal(output[i+1],input[i+1]);assert.equal(output[i+2],123);
}
assert.equal(output[(12*side+12)*4+3],0,'Horizon remains a separate opaque compositor pass');
console.log('PASS: optimized pixel sampler retains bilinear values and horizon isolation');
const cachedPixels=pixelBox.buildLensPixelMap(side,side,0,0,1,1,12,12,2,20,20/4096,identity,opaque,1,8);
const sameStorage=pixelBox.buildLensPixelMap(side,side,0,0,1,1,12,12,2,20,20/4096,identity,opaque,1,8,cachedPixels);
assert.equal(sameStorage,cachedPixels,'Lens geometry arrays must be reused');
const beforePixel=output[(8*side+6)*4];input[(8*side+6)*4]=beforePixel>127?0:255;
pixelBox.warpLensPixels(input,output,side,side,0,0,1,1,12,12,2,20,20/4096,identity,opaque,1,8,cachedPixels);
assert.notEqual(output[(8*side+6)*4],beforePixel,'Cached geometry must still sample the current moving scene');
console.log('PASS: cached lens geometry reuses storage without freezing scene pixels');
const jumpBox={g:{tier:27,freeFlights:{old:{},fly:{}}},TA:reqBox.forms,player:{x:0,y:0,r:1e20},camera:{zoom:1e-20},tester:{zoom:1},
 entities:[{id:'old',absorbing:1}],macroEntities:[],cosmicAbsorptions:[{id:'capture',gathering:.2}],absorbingMacroKeys:new Set(['old','fly','capture']),
 clamp:scaleBox.clamp,currentRadius:()=>2000,campaignZoom:()=>.06,flightKey:e=>e.id,burst(){},renderUI(){},testerRefresh(){}};
jumpBox.testerRemakeNearby=()=>{jumpBox.remade=true};
vm.createContext(jumpBox);vm.runInContext(game.slice(game.indexOf('function testerSetTier('),game.indexOf('function testerRemakeNearby(')),jumpBox);
jumpBox.testerSetTier(10);assert.equal(jumpBox.cosmicAbsorptions.length,0);assert.equal(jumpBox.camera.zoom,.06);
assert.equal(jumpBox.g.freeFlights.old,undefined);assert.ok(jumpBox.g.freeFlights.fly);assert.equal(jumpBox.absorbingMacroKeys.has('capture'),false);
assert.equal(jumpBox.remade,true);console.log('PASS: tester stage jumps reframe immediately and clear old digestion, preserving free flight');

// Manual zoom is a wide, persistent offset from auto framing, not a world reset.
const wheelBox={g:{viewZoom:1},running:true,atlasVisible:false,H:1080,clamp:scaleBox.clamp};
vm.createContext(wheelBox);vm.runInContext(game.slice(game.indexOf('function onWorldWheel('),game.indexOf("canvas.addEventListener('wheel',onWorldWheel")),wheelBox);
let prevented=0;
const wheel=(deltaY,deltaMode=0,ctrlKey=false)=>wheelBox.onWorldWheel({deltaY,deltaMode,ctrlKey,preventDefault(){prevented++}});
wheel(-100);assert.ok(wheelBox.g.viewZoom>1&&wheelBox.g.viewZoom<1.25);
for(let i=0;i<40;i++)wheel(-100);assert.equal(wheelBox.g.viewZoom,10);
for(let i=0;i<40;i++)wheel(100);assert.equal(wheelBox.g.viewZoom,.05);
wheelBox.g.viewZoom=1;wheel(-5,1);const lineZoom=wheelBox.g.viewZoom;
wheelBox.g.viewZoom=1;wheel(-80);assert.equal(wheelBox.g.viewZoom,lineZoom,'Line/pixel wheels agree');
for(const mode of ['paused','map','browser']){
 wheelBox.g.viewZoom=1;wheelBox.running=mode!=='paused';wheelBox.atlasVisible=mode==='map';const before=prevented;
 wheel(-100,0,mode==='browser');assert.equal(wheelBox.g.viewZoom,1);assert.equal(prevented,before);
}
for(const tier of [0,10,22]){
 scaleBox.g.viewZoom=1;const normal=scaleBox.campaignZoom(scaleBox.radiusAt(tier,0));
 for(const offset of [.1,.4,1.25,2.5,10]){scaleBox.g.viewZoom=offset;assert.ok(Math.abs(scaleBox.campaignZoom(scaleBox.radiusAt(tier,0))/normal-offset)<1e-10);}
}
scaleBox.g.viewZoom=1;
vm.runInContext(upgradePrelude+game.slice(game.indexOf('function ordinaryGravityRadius('),game.indexOf('function pickupFeedback(')),scaleBox);
scaleBox.g.upgrade={gravity:0};scaleBox.tester.gravity=1;
scaleBox.g.tier=5;for(const radius of [13,500,1e8]){scaleBox.player.r=radius;assert.ok(Math.abs(scaleBox.ordinaryGravityRadius()/(Math.max(97,radius*2.8))-1.2)<1e-10);}
const brightBox={g:{endless:true},player:{r:1e8},clamp:scaleBox.clamp};vm.createContext(brightBox);
vm.runInContext(game.slice(game.indexOf('function macroOpacity('),game.indexOf('function drawMacro(')),brightBox);
assert.equal(brightBox.macroOpacity({r:3e6},20,1),1,'A visible galaxy must not become translucent relative to a giant hole');
assert.ok(brightBox.macroOpacity({r:3e6},20,.5)>.7);assert.equal(brightBox.macroOpacity({r:3e6},20,0),0,'LOD endpoints stay seamless');
console.log('PASS: wheel range/unit normalization/UI isolation, wider base fields, bright giant-hole galaxies');

// Compact suffixes continue past T and remain bounded up to maximum finite mass.
const numberBox={CHUNK:480};vm.createContext(numberBox);
vm.runInContext(game.slice(game.indexOf('function numberSuffix('),game.indexOf('const timeFmt'))+
 game.slice(game.indexOf('function lightYears('),game.indexOf('function atlasNiceDistance(')),numberBox);
for(const [n,expected] of [[1e12,'1.00T'],[1e15,'1.00Qa'],[1e18,'1.00Qi'],[1e21,'1.00Sx'],[1e24,'1.00Sp'],[1e33,'1.00Dc'],[1e36,'1.00aa'],[1e39,'1.00ab'],[999999.99,'1.00M'],[2236251538096.98e12,'2.24Sp']])assert.equal(numberBox.fmt(n),expected);
for(let exponent=12;exponent<=306;exponent+=3){
 const text=numberBox.fmt(1.2345*10**exponent);assert.ok(text.length<=9&&!text.includes('Infinity'));
 if(exponent<306)assert.notEqual(numberBox.numberSuffix(exponent/3),numberBox.numberSuffix(exponent/3+1));
}
assert.ok(numberBox.fmt(Number.MAX_VALUE).length<12);assert.equal(numberBox.fmt(NaN),'0');
assert.equal(numberBox.lightYears(480),'1 св. лет');assert.equal(numberBox.lightYears(-960),'-2 св. лет');
assert.equal(numberBox.lightYears(480e15),'1.00Qa св. лет');
assert.ok(numberBox.lightYears(.000001).includes('10^-'));
const uiCode=game.slice(game.indexOf('function renderUI('),game.indexOf('function spawn('));
assert.ok(uiCode.includes('lightYears(blackHoleCoreWorldRadius())'),'Displayed hole radius must use its visible horizon');
assert.ok(!uiCode.includes(' секторов')&&!uiCode.includes('СЕКТОР ${'));
assert.ok(!game.includes("+' сект.'")&&!game.includes('} сект.'));
console.log('PASS: suffixes through 1e308, rounding boundaries, signed light-years, consistent physical HUD/map units');

// v3.27: the requested stronger field, while tangential escape remains tested above.
flightBox.g={time:0,freeFlights:{}};
const forceProbe={x:50,y:0,r:5,index:99,chunk:'probe',motionVX:0,motionVY:0};
flightBox.deflectResource(forceProbe,.01,100);
assert.ok(Math.abs(forceProbe.motionVX+5.04)<1e-9,'Ordinary pull must be four times the previous 1.26 impulse');
const rivalProbe=abyssBox.abyssPull({x:0,y:0,r:1000},2000,0,100);
assert.ok(Math.abs(rivalProbe.x+1417.5)<1e-8,'Rival holes must receive the same fourfold increase');

// Campaign yield tracks relative area; black-hole economy keeps fractional rewards.
const lootBox={g:{endless:false,complete:false,tier:0,matter:0,total:0,stageCollects:0,collects:0,credits:0,materials:{ore:0},upgrade:{harvest:0},particles:false},
 player:{x:0,y:0,r:13},tester:{loot:1},CHUNK:480,TA:[{required:280}],
 advanceHarvestChain(){},resourceOf:()=> 'ore',radiusAt:()=>1000,ordinaryBodyValue:()=>100,blackHoleBodyValue:()=>100,BH_REWARD_SCALE:.4,
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),currentRadius:()=>13,pickupFeedback(){},respawn(){},missionsDone:()=>false,burst(){},MATERIALS:{ore:{color:'#fff'}},energyArcs:[]};
vm.createContext(lootBox);vm.runInContext(upgradePrelude+game.slice(game.indexOf('const CAMPAIGN_YIELD='),game.indexOf('function absorb(e)'))+absorbCode,lootBox);
for(let i=0;i<100;i++)lootBox.absorb({value:1,r:6.5,kind:'matter'});
assert.ok(Math.abs(lootBox.g.matter-100*280*.036*.25)<1e-8);
assert.ok(Math.abs(lootBox.g.credits-100*280*.036*.25*.75)<1e-8);
assert.ok(Math.abs(lootBox.g.materials.ore-100)<1e-8);
lootBox.g.endless=true;const beforeLoot=lootBox.g.matter;lootBox.absorb({kind:'matter'});
assert.ok(Math.abs(lootBox.g.matter-beforeLoot-4)<1e-8,'2.5x capture rate must pay 2.5x less for each black-hole catch');

// Comets are sparse decorative effects driven by game time, with one cached sprite.
let cometAllocations=0;
const cometGradient={addColorStop(){}};
const cometCtx=new Proxy({createLinearGradient:()=>cometGradient,createRadialGradient:()=>cometGradient},{get:(o,k)=>k in o?o[k]:()=>{}});
const cometBox={TAU:Math.PI*2,g:{time:0},W:1920,H:1080,ctx:cometCtx,document:{createElement(){cometAllocations++;return {getContext:()=>cometCtx}}}};
vm.createContext(cometBox);
vm.runInContext(game.match(/function chunkRandom\([^]*?\n\}/)[0]+game.slice(game.indexOf('function cometPath('),game.indexOf('\nlet skyCameraX=')),cometBox);
cometBox.renderBackgroundComets();assert.equal(cometAllocations,0);
cometBox.g.time=4;cometBox.renderBackgroundComets();assert.equal(cometAllocations,1);
assert.equal(vm.runInContext('backgroundComets.length',cometBox),1);
const nextComet=vm.runInContext('nextBackgroundComet',cometBox);assert.ok(nextComet>=12&&nextComet<=20);
cometBox.g.time=nextComet;cometBox.renderBackgroundComets();assert.equal(cometAllocations,1);
for(let time=Math.ceil(nextComet)+1;time<120;time++){cometBox.g.time=time;cometBox.renderBackgroundComets();assert.ok(vm.runInContext('backgroundComets.length',cometBox)<=2);}
assert.equal(cometAllocations,1,'More frequent comets still reuse one texture');
cometBox.g.time=0;cometBox.renderBackgroundComets();assert.equal(vm.runInContext('backgroundComets.length',cometBox),0);
console.log('PASS: gravity, balanced cosmic rewards, reduced campaign yields and cached comets');

// Catalogue holes use their true horizon radius with the player's lens equation.
const rivalLensBox={W:1920,H:1080,BLACK_HOLE_CORE_FRACTION:.245,camera:{zoom:.5},g:{abyssConsumed:{}},
 abyssVisual:[{id:'near',x:1100,y:500,r:160},{id:'far',x:1e8,y:1e8,r:10},{id:'tiny',x:200,y:200,r:1}],
 project:(x,y)=>({x,y}),lensPixelMap:{player:true},lensPixelMapKey:'player',calls:[],
 renderBlackHoleLensing(target){rivalLensBox.calls.push(target);rivalLensBox.lensPixelMap={rival:true};rivalLensBox.lensPixelMapKey='rival'}};
vm.createContext(rivalLensBox);
vm.runInContext(game.slice(game.indexOf('const rivalLensMaps='),game.indexOf('function paintBlackHole(')),rivalLensBox);
const targets=rivalLensBox.rivalLensTargets();assert.equal(targets.length,1);
assert.equal(targets[0].R*.245,80,'Other holes must distort relative to their actual visible horizon');
rivalLensBox.renderRivalLensing();assert.equal(rivalLensBox.calls.length,1);
assert.equal(rivalLensBox.lensPixelMapKey,'player');assert.ok(rivalLensBox.lensPixelMap.player);
rivalLensBox.g.abyssConsumed.near=true;assert.equal(rivalLensBox.rivalLensTargets().length,0);
console.log('PASS: rival holes reuse player lens with true radius, visibility culling and isolated geometry caches');

// Parallax layers cover the viewport continuously at both wheel extremes.
const skyRects=[],skyDepthBox={W:1366,H:768,dpr:.87,g:{viewZoom:1},ctx:{save(){},restore(){},drawImage(_c,x,y,w,h){skyRects.push({x,y,w,h})}}};
vm.createContext(skyDepthBox);
vm.runInContext(game.slice(game.indexOf('function drawSkyDepthLayer('),game.indexOf('\nlet backgroundComets=')),skyDepthBox);
for(const zoom of [.1,1,10])for(const offset of [-100000,0,1365.5]){
 skyDepthBox.g.viewZoom=zoom;skyRects.length=0;
 const layer={canvas:{},x:offset,y:-offset,depth:.19,brightness:1};
 skyDepthBox.drawSkyDepthLayer(layer,123,-57);
 assert.ok(layer.x>=0&&layer.x<1366&&layer.y>=0&&layer.y<768);
 assert.ok(skyRects.length<=9,'Layer rendering must stay bounded at wide zoom');
 for(const x of [.5,100,683,1365.5])for(const y of [.5,100,384,767.5])
  assert.ok(skyRects.some(r=>x>=r.x-.6&&x<=r.x+r.w+.6&&y>=r.y-.6&&y<=r.y+r.h+.6),'No uncovered viewport corners or tile seams');
}
skyDepthBox.g.viewZoom=1;
const farSky={canvas:{},x:500,y:300,depth:.035,brightness:.6},nearSky={...farSky,depth:.19};
skyDepthBox.drawSkyDepthLayer(farSky,100,0);skyDepthBox.drawSkyDepthLayer(nearSky,100,0);
assert.ok(500-nearSky.x>(500-farSky.x)*5,'Near clusters must shift visibly faster than distant clusters');
console.log('PASS: independent sky depth, bounded scrolling and seamless viewport coverage at 10–1000%');

// Every way out of an overlay must release the atlas and resume one simulation.
{
 const nodes=new Map();
 const el=id=>{if(!nodes.has(id)){const classes=new Set();nodes.set(id,{setAttribute(){},dataset:{},innerHTML:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)}});}return nodes.get(id);};
 const ui={window:{},closePinEditor(){},$:el,running:true,atlasVisible:true,last:0,performance:{now:()=>123},clears:0,music:0,saves:0};
 ui.clearFlightInput=()=>ui.clears++;ui.startMusic=()=>ui.music++;ui.save=()=>ui.saves++;
 vm.createContext(ui);vm.runInContext(game.slice(game.indexOf('function uiIcon(name){'),game.indexOf('function populateUpgrades(){')),ui);vm.runInContext(game.slice(game.indexOf('function setNavigationState(screen){'),game.indexOf('function openEvolution(){')),ui);
 ui.show('<p>Settings</p>');assert.equal(ui.running,false);assert.equal(ui.atlasVisible,false);assert.equal(el('modal').dataset.screen,'panel');assert.ok(el('evolution-panel').classList.contains('hidden'));
 for(const close of [()=>ui.resumeGame(),()=>el('panel-close').onclick(),()=>{ui.attachContinue();el('btn-continue').onclick();}]){
  ui.running=false;ui.atlasVisible=true;close();assert.equal(ui.running,true);assert.equal(ui.atlasVisible,false);assert.ok(el('modal').classList.contains('off'));assert.equal(ui.last,123);
 }
 let opened=0;
 const openMap=()=>{opened++;ui.show('Map');el('modal').dataset.screen='map';ui.atlasVisible=true;};
 ui.toggleOverlay('map',openMap);assert.equal(opened,1);assert.equal(ui.running,false);
 ui.toggleOverlay('map',openMap);assert.equal(opened,1);assert.equal(ui.running,true);assert.equal(ui.atlasVisible,false);
 for(const name of ['settings','menu']){const open=()=>{opened++;ui.show(name);el('modal').dataset.screen=name;ui.menuVisible=name==='menu';};ui.toggleOverlay(name,open);assert.equal(ui.running,false);ui.toggleOverlay(name,open);assert.equal(ui.running,true);assert.equal(ui.menuVisible,false);}
 console.log('PASS: shared overlays toggle closed without reopening; menu/map/settings exits resume game');
}

// The menu lenses a moving sky without advancing or replacing the saved world.
{
 const calls=[],world={time:123,matter:456};
 const ui={W:1366,H:900,frameCanvas:{width:1366,height:900},g:world,menuBackdrop:null,menuBackdropKey:'',menuLensMap:null,menuLensKey:'',menuLensRetryAt:0,lensPixelMap:{world:true},lensPixelMapKey:'world',
 ctx:{fillRect(){calls.push('sky')},drawImage(){calls.push('tile')}},makeSkyDepthTexture(){calls.push('bake');return{};},renderMenuComets(time){calls.push(['comets',time])},renderBlackHoleLensing(t){calls.push('lens');ui.lensPixelMap={menu:true};ui.lensPixelMapKey='menu';if(ui.fail)throw Error('lens unavailable');},paintBlackHole(){calls.push('horizon')},update(){throw Error('Menu must not simulate gameplay')}};
 vm.createContext(ui);vm.runInContext(game.slice(game.indexOf('function menuBlackHoleGeometry(){'),game.indexOf('function render(time){')),ui);
 const saved=ui.lensPixelMap;ui.renderMenuScene(1);const a=calls.find(x=>Array.isArray(x));ui.renderMenuScene(2);
 assert.equal(calls.filter(x=>x==='bake').length,1);assert.equal(ui.lensPixelMap,saved);assert.equal(ui.lensPixelMapKey,'world');assert.equal(world.time,123);assert.equal(world.matter,456);assert.ok(calls.indexOf('lens')<calls.indexOf('horizon'));
 const positions=calls.filter(x=>Array.isArray(x));assert.notDeepEqual(positions[0],positions[1]);assert.ok(calls.findIndex(x=>Array.isArray(x)&&x[0]==='comets')<calls.indexOf('lens'));assert.ok(!game.slice(game.indexOf('function renderMenuScene(time){'),game.indexOf('function render(time){')).includes('paintGalaxy('));
 ui.fail=true;ui.renderMenuScene(3);assert.equal(calls.at(-1),'horizon');assert.equal(ui.lensPixelMap,saved);
 for(const [w,h] of [[390,844],[1920,1080],[2560,1440]]){ui.W=w;ui.H=h;const t=ui.menuBlackHoleGeometry();assert.ok(t.R>0&&t.p.x<w&&t.p.y<h);}
 console.log('PASS: cached moving menu sky, real lens before opaque horizon, failure isolation and untouched save');
}

// Menu cadence is independent of saved game time and shares the thin cached sprite.
{
 const gameTime=cometBox.g.time;let peak=0,count=0;
 for(let time=0;time<30;time+=.1){cometBox.renderMenuComets(time);peak=Math.max(peak,vm.runInContext('menuComets.length',cometBox));}
 count=vm.runInContext('menuCometSequence',cometBox);assert.ok(count>=8&&count<=17);assert.ok(peak>=2&&peak<=6);assert.equal(cometBox.g.time,gameTime);assert.equal(cometAllocations,1);
 cometBox.renderMenuComets(1000);assert.equal(vm.runInContext('menuComets.length',cometBox),1,'Returning to menu must not replay a backlog');
 const draws=[];cometBox.ctx=new Proxy({drawImage(...args){draws.push(args)}},{get:(o,k)=>k in o?o[k]:()=>{}});
 for(const length of [100,280])cometBox.drawBackgroundComet({born:0,duration:10,fromX:0,fromY:0,dx:100,dy:20,length},5);
 assert.ok(draws.every(args=>args[4]===8),'Comet thickness must not grow with tail length');
 console.log('PASS: frequent independent menu comets, bounded population, one shared thin sprite');
}

// Right-click opens an editor at canvas-local coordinates; no save before confirmation.
{
 let prevented=0,opened;
 const box={atlas:{drag:true,placingPin:true},openPinEditor(...args){opened=args},$:()=>({getBoundingClientRect:()=>({left:30,top:90,width:1000,height:600})})};
 vm.createContext(box);vm.runInContext(game.slice(game.indexOf('function atlasContextMenu('),game.indexOf('function atlasMapClick(')),box);
 box.atlasContextMenu({clientX:680,clientY:340,preventDefault(){prevented++}});
 assert.equal(prevented,1);assert.deepEqual(opened,[650,250,680,340]);assert.equal(box.atlas.drag,false);assert.equal(box.atlas.placingPin,false);
 console.log('PASS: right-click opens marker editor without creating or saving a marker');
}

// v3.36: manual zoom must not change physical horizon, range, force, pulse or flight speed.
{
 const helper=game.slice(game.indexOf('function physicsZoom(){'),game.indexOf('function campaignZoom('));
 const ordinary=game.slice(game.indexOf('function ordinaryGravityRadius('),game.indexOf('function pickupFeedback('));
 const force=game.slice(game.indexOf('function deflectResource('),game.indexOf('function gatherBody('));
 const giant=game.slice(game.indexOf('function applyGiantPull('),game.indexOf('function collideWithGiant('));
 for(const endless of [false,true]){
  const results=[];
  for(const manualZoom of [.1,1,10]){
   const r=endless?1e20:30;
   const b={g:{endless,tier:endless?27:2,upgrade:{gravity:0},freeFlights:{},viewZoom:manualZoom},player:{x:0,y:0,r,vx:0,vy:0},camera:{zoom:manualZoom/r},tester:{gravity:1},CHUNK:480,BLACK_HOLE_CORE_FRACTION:.245,clamp:scaleBox.clamp,rememberFlight(){},startAbsorption(){},entities:[],macroEntities:[],cosmicAbsorptions:[]};
   vm.createContext(b);vm.runInContext(helper+snippet+gravityCode+ordinary+force+giant,b);
   const range=endless?b.blackHoleGravityRadius():b.ordinaryGravityRadius(),e={x:range*.8,y:0,r:r*.1,motionVX:0,motionVY:0};
   if(endless)b.applyBlackHoleGravity(e,.01);else b.deflectResource(e,.01,range);
   results.push([b.physicsZoom(),b.blackHoleCoreWorldRadius(),range,e.vx,e.x]);
   if(!endless){
    const large={x:r*2,y:0,r:r*1.2,motionVX:33,motionVY:4};
    assert.equal(b.deflectResource(large,.1,range),false);assert.equal(large.motionVX,33);assert.equal(large.x,r*2);
    b.entities=[large];b.applyGiantPull(.1,250);assert.ok(b.player.vx>0&&b.player.vy===0,'Inedible body attracts player instead');
   }
  }
  assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
 }
 const pulse=game.slice(game.indexOf('function activatePulse('),game.indexOf('function activateBoost('));
 assert.ok(pulse.includes('!canAbsorbBody(e)'));assert.ok(!pulse.includes('camera.zoom'));
 const update=game.slice(game.indexOf('function update(dt)'),game.indexOf('function project('));
 assert.ok(update.includes('flightSpeed()'));assert.ok(game.slice(game.indexOf('function flightSpeed('),game.indexOf('function uiIcon(')).includes('140/physicsZoom()'));assert.ok(!update.includes('140/Math.max(camera.zoom'));
 assert.ok(game.includes('boostTime=2.5'));
 console.log('PASS: real forces and horizon identical at 10%, 100%, 1000% zoom; giants pull player and pulse ignores inedible bodies');
}
{
 const b={};vm.createContext(b);vm.runInContext(game.slice(game.indexOf('function materialFor('),game.indexOf('function sectorType(')),b);
 for(const biome of ['normal','rich','void','nebula','relic','anomaly']){
  let ice=0;for(let i=0;i<1000;i++)if(b.materialFor(biome,50,()=>i/1000)==='ice')ice++;
  assert.ok(ice>=220,`${biome} must provide ice`);
 }
 const angles=new Set();for(let i=0;i<200;i++){const c=cometBox.cometPath(abyssBox.chunkRandom(i+1));angles.add(Math.floor((Math.atan2(c.dy,c.dx)+Math.PI)/(Math.PI/4)));}
 assert.equal(angles.size,8,'Comets must cover all eight direction octants');
 console.log('PASS: every biome supplies ice; comet paths span 360 degrees');
}
{
 const b={atlas:{x:1000,y:-500,zoom:2},player:{x:0,y:0},atlasFitZoom:()=>.2,$:()=>({getBoundingClientRect:()=>({width:1000,height:500})})};
 vm.createContext(b);vm.runInContext(game.slice(game.indexOf('function atlasFitPlayer('),game.indexOf('function changeAtlasZoom(')),b);
 b.atlasFitPlayer(true);assert.equal(b.atlas.x,1000);b.updateAtlasMotion(.4);assert.ok(b.atlas.x>0&&b.atlas.x<1000);assert.ok(b.atlas.zoom>.2&&b.atlas.zoom<2);
 b.updateAtlasMotion(.4);assert.equal(b.atlas.x,0);assert.ok(Math.abs(b.atlas.zoom-.2)<1e-12);assert.equal(b.atlas.focusTween,null);
 console.log('PASS: recenter interpolates position and logarithmic zoom, then reaches exact target');
}
{
 let saves=0;const notices=[];
 const b={window:{SpaceI18n:{language:'en',t:s=>s}},MIN_STAGE_SECONDS:600/27,g:{tier:0,time:0,stageElapsed:25,collects:1,achievements:{},abyssConsumed:{},materials:{ice:0},matter:100},clamp:scaleBox.clamp,TA:[{required:100}],stageRecipe:()=>[{type:'ice',amount:3}],MATERIALS:{ice:{label:'Ice'}},missionReq:()=>({explore:0,collect:0}),exploredCount:()=>0,solarMass:()=>1e100,fmt:String,save(){saves++},toast(t){notices.push(t)}};
 b.g.stageExplored=0;b.g.stageCollects=100;
 vm.createContext(b);vm.runInContext(game.slice(game.indexOf('const L='),game.indexOf('function celebrateAchievement('))+'\nglobalThis.catalogue=ACHIEVEMENTS;globalThis.rarity=RARITIES;',b);
 let celebrations=0;b.celebrateAchievement=()=>celebrations++;
 b.checkProgression();assert.equal(b.g.achievements.spark,true);assert.equal(celebrations,1);assert.equal(saves,1);assert.equal(notices.length,1);assert.ok(notices[0].includes('Ice: 3'));
 b.g.time=20;b.checkProgression();assert.equal(celebrations,1);assert.equal(notices.length,1,'No repeated missing-material spam');
 b.g=JSON.parse(JSON.stringify(b.g));b.checkProgression();assert.equal(saves,1,'Reload cannot award twice');
 assert.ok(b.catalogue.length>=25&&b.rarity.length===6);assert.ok(b.catalogue.some(a=>a[3]==='solar'&&a[4]>=1e100));
 for(const a of b.catalogue)assert.ok(b.achievementProgress(a)>=0&&b.achievementProgress(a)<=100);
 console.log('PASS: persistent one-time awards, six rarities, extreme goals, bounded percentages and missing-ice notification without spam');
}
{
 const textNodes=[{nodeValue:'Карта Вселенной',parentElement:{closest:()=>false}}],values={};
 const doc={body:{querySelectorAll:()=>[]},documentElement:{},createTreeWalker(){let i=0;return{nextNode:()=>textNodes[i++]||null}}};
 const b={document:doc,NodeFilter:{SHOW_TEXT:4},localStorage:{getItem:()=>null,setItem:(k,v)=>values[k]=v},MutationObserver:class{observe(){}},queueMicrotask(){}};b.window=b;vm.createContext(b);vm.runInContext(fs.readFileSync('i18n.js','utf8'),b);
 assert.equal(b.SpaceI18n.language,'en');assert.equal(textNodes[0].nodeValue,'Universe map');
 b.SpaceI18n.setLanguage('es');assert.equal(textNodes[0].nodeValue,'Mapa del universo');
 b.SpaceI18n.setLanguage('ru');assert.equal(textNodes[0].nodeValue,'Карта Вселенной');
 textNodes[0].nodeValue='Гравитация';b.SpaceI18n.setLanguage('en');assert.equal(textNodes[0].nodeValue,'Gravity');
 assert.equal(values['infiniti-space-language'],'en');
 console.log('PASS: English default, Spanish and Russian switching, dynamic text and saved language');
}
(async()=>{
 const calls=[];let release;const ready=new Promise(resolve=>release=resolve);
 const b={performance:{now:()=>1000},Event:class{},dispatchEvent(){},CrazyGames:{SDK:{init(){calls.push('init');return ready},game:{settings:{muteAudio:true},addSettingsChangeListener(f){this.listener=f},loadingStart(){calls.push('loadingStart')},loadingStop(){calls.push('loadingStop')},gameplayStart(){calls.push('start')},gameplayStop(){calls.push('stop')}}}}};b.window=b;
 vm.createContext(b);vm.runInContext(fs.readFileSync('platform.js','utf8'),b);b.SpacePlatform.loaded();b.SpacePlatform.playing(true);assert.deepEqual(calls,['init']);
 release();await ready;await new Promise(setImmediate);assert.deepEqual(calls,['init','loadingStart','loadingStop','start']);assert.equal(b.SpacePlatform.muted,true);
 b.SpacePlatform.playing(true);b.SpacePlatform.playing(false);b.SpacePlatform.playing(false);assert.equal(calls.filter(x=>x==='stop').length,1);
 b.CrazyGames.SDK.game.listener({muteAudio:false});assert.equal(b.SpacePlatform.muted,false);
 console.log('PASS: CrazyGames initializes before lifecycle calls, deduplicates events and honours platform mute');
})().catch(e=>{console.error(e);process.exitCode=1});

// Full fidelity must survive slow frames, economy presets and a reload.
{
 let saved=null;
 const surface=()=>({width:0,height:0,setTransform(){},drawImage(){}});
 const q={g:{quality:.5,autoQuality:true},performanceScale:.55,perfSample:1,perfFrames:15,W:2560,H:1440,devicePixelRatio:2,dpr:1,canvas:surface(),frameCanvas:surface(),screenCtx:surface(),frameCtx:surface(),ctx:surface(),atlasVisible:false,save(){saved=JSON.parse(JSON.stringify(q.g));}};
 vm.createContext(q);
 vm.runInContext(game.slice(game.indexOf('function updateAdaptiveQuality('),game.indexOf('function resize(){')),q);
 q.setAutoQuality(false);
 assert.equal(q.dpr,2);assert.equal(q.canvas.width,5120);assert.equal(q.performanceScale,1);assert.equal(q.perfSample,0);
 for(let i=0;i<100;i++)q.updateAdaptiveQuality(12);
 assert.equal(q.performanceScale,1,'Low FPS must not override the user');
 q.g=JSON.parse(JSON.stringify(saved));q.applyResolution();assert.equal(q.dpr,2,'Full fidelity persists through save/reload');
 for(const density of [1,2,3]){q.devicePixelRatio=density;q.applyResolution();assert.equal(q.dpr,density);}
 q.setAutoQuality(true);q.updateAdaptiveQuality(20);assert.ok(q.performanceScale<1,'Opting back in restores adaptation');
 q.setAutoQuality(false);q.devicePixelRatio=2;q.applyResolution();
 // Execute GPU rendering against a recording GL facade.
 const gl={isContextLost:()=>false,viewport(){},texImage2D(){},texSubImage2D(){},uniform2f(){},uniform1f(){},drawArrays(){}};
 Object.assign(q,{gpuLens:{gl,surface:surface(),maxSize:16384,width:0,height:0,upload:surface(),uploadCtx:surface()},einsteinRingScale:()=>1.5,console});
 vm.runInContext(game.slice(game.indexOf('function renderGpuLens('),game.indexOf('// True gravitational lensing')),q);
 assert.equal(q.renderGpuLens({x:1280,y:720},200,500),true);
 assert.equal(q.gpuLens.width,5120);assert.equal(q.gpuLens.height,2880);
 // Capture the actual CPU readback dimensions before allocating pixel arrays.
 let readback;const stop=new Error('captured CPU dimensions');
 Object.assign(q,{renderGpuLens:()=>false,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lensInput:surface(),lensOutput:surface(),lensInputCtx:{drawImage(){},getImageData(x,y,w,h){readback=[w,h];throw stop;}}});
 vm.runInContext(game.slice(game.indexOf('function renderBlackHoleLensing('),game.indexOf('let rivalLensRetryAt=')),q);
 assert.throws(()=>q.renderBlackHoleLensing({p:{x:1280,y:720},R:400,outer:700}),e=>e===stop);
 assert.deepEqual(readback,[2800,2800],'CPU fallback keeps native pixel density too');
}
console.log('PASS: graphics reduction can be fully disabled; low FPS cannot override native resolution on GPU or CPU');

// Drawing and gravity must enumerate the same LOD identities at manual zooms
// and viewport sizes, without deriving force/range from the display zoom.
{
 const viewCode=game.slice(game.indexOf('function cosmicViewAt('),game.indexOf('function blackHoleGravityRadius('));
 const harvestCode=game.slice(game.indexOf('function harvestCosmicLOD('),game.indexOf('function promoteAbyssMatter('));
 const renderCode=game.slice(game.indexOf('function renderMacroBackground('),game.indexOf('// Freeze the distant scene'));
 for(const r of [1e5,1e30,1e110])for(const [W,H] of [[1920,1080],[3840,2160],[390,844]])for(const manual of [.1,1,10]){
  const nominal=(83+27*Math.log2(1+r/100))/r,zoom=nominal*manual,drawn=new Set();
  const key=e=>`${e.level}:${e.gx}:${e.gy}:${e.index}`;
  const b={W,H,MACRO_SIZE:3200,player:{x:0,y:0,r},camera:{x:0,y:0,zoom},g:{endless:true,depletedMacro:{},depletedCosmic:{}},
   clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),cosmicHarvestTimer:0,cosmicAbsorptions:[],absorbingMacroKeys:new Set(),macroLoaded:new Set(),
   blackHoleCoreWorldRadius:()=>r*.245,blackHoleGravityRadius:()=>r*2,blackHoleTouchDistance:e=>r*.245+e.r,
   canAbsorbBody:()=>true,physicsZoom:()=>nominal,absorptionKey:key,macroKey:(x,y)=>`${x},${y}`,
   ctx:{save(){},restore(){}},drawMacro(e,t,z,opacity){if(opacity>=.025)drawn.add(key(e));return true;},
   macroLODNodes:(gx,gy,level)=>gx===0&&gy===0?[{x:r*.3,y:0,r:r*.05,level,gx,gy,index:0}]:[],
   macroNodes:(gx,gy)=>gx===0&&gy===0?[{x:r*.3,y:0,r:r*.05,level:0,gx,gy,index:0,chunk:'0,0'}]:[]};
  vm.createContext(b);vm.runInContext(viewCode+harvestCode+renderCode,b);
  b.renderMacroBackground(0);b.harvestCosmicLOD(.1);b.harvestCosmicLOD(.1);
  assert.ok(drawn.size>0);
  assert.deepEqual(new Set(b.cosmicAbsorptions.map(key)),drawn,`Unresponsive drawn LOD at radius ${r}, zoom ${manual}, viewport ${W}x${H}`);
  assert.equal(b.cosmicAbsorptions.length,drawn.size,'No duplicate physical copies');
 }
}
// A visibly enlarged small resource, and already captured debris that becomes
// small as the player grows, must both continue through the real update loop.
{
 const start=game.indexOf(' for(const e of nearbyObjects){',game.indexOf('function update(dt){'));
 const code=game.slice(start,game.indexOf(' entities=entities.filter',start));
 const tinyVisible={x:10,y:0,r:3,index:0,originX:10,originY:0};
 const captured={x:10,y:0,r:1,gravityBound:true};
 const calls=[];
 const b={g:{endless:true,time:1,flightEpoch:0},player:{r:100},nearbyObjects:[tinyVisible,captured],dt:.016,physicsZoom:()=>.1,
  RESOURCE_STREAMS:[{x:0,y:0}],gatherBody:()=>false,pullBodyIntoAbyss:()=>false,animateAbsorption:()=>false,
  applyBlackHoleGravity(e){calls.push(e);}};
 vm.createContext(b);vm.runInContext(code,b);
 assert.deepEqual(calls,[tinyVisible,captured]);
}
console.log('PASS: every rendered LOD is eligible for gravity across zooms and screens; visible small and captured debris stay simulated');

// Endless upgrade pricing, bulk atomicity and softened returns.
{
 const code=game.slice(game.indexOf('const upgrades ='),game.indexOf('const MATERIALS='))+game.slice(game.indexOf('function upgradePower('),game.indexOf('function uiIcon('));
 let saves=0;const b={g:{upgrade:{gravity:0,speed:0,harvest:0,shield:0},credits:0,buyAmount:1,endless:false},player:{r:1e8},CHUNK:480,tester:{speed:1},physicsZoom:()=>.00001,
 toast(){},sound(){},burst(){},renderUI(){},save(){saves++;}};
 vm.createContext(b);vm.runInContext(code+'\nitems=upgrades;',b);
 for(const u of b.items){
  for(const level of [0,u.max-1,u.max,u.max+10]){
   b.g.upgrade[u.id]=level;
   for(const count of [1,3,10,100]){
    let sum=0;for(let i=0;i<count;i++)sum+=b.upgradeCost(u,level+i);
    assert.ok(Math.abs(b.upgradeTotalCost(u,level,count)/sum-1)<1e-11,'Bulk price equals all successive level prices');
   }
  }
  b.g.upgrade[u.id]=u.max;const p0=b.upgradePower(u.id);
  b.g.upgrade[u.id]++;const p1=b.upgradePower(u.id);b.g.upgrade[u.id]++;const p2=b.upgradePower(u.id);
  assert.ok(p1>p0&&p1-p0<.11&&p2>p1&&p2-p1<p1-p0,'Small diminishing gains beyond old cap');
  assert.ok(b.upgradeCost(u,u.max)>b.upgradeCost(u,u.max-1)*8,'Price jump at endless boundary');
  b.g.upgrade[u.id]=u.max-2;b.g.buyAmount=7;b.g.credits=b.upgradeTotalCost(u,u.max-2,7);
  b.buy(u.id);assert.equal(b.g.upgrade[u.id],u.max+5);assert.equal(b.g.credits,0);
  b.g.buyAmount=100;const before=b.g.upgrade[u.id];b.buy(u.id);assert.equal(b.g.upgrade[u.id],before,'Unaffordable bundle never partly charges');
  b.g.credits=b.upgradeTotalCost(u,before,12)*1.001;b.g.buyAmount='max';
  assert.equal(b.upgradeQuote(u).count,12);b.buy(u.id);assert.equal(b.g.upgrade[u.id],before+12);assert.ok(b.g.credits>=0);
  const costly=b.upgradeTotalCost(u,1000000000,1000000000);assert.equal(costly,Infinity,'Huge requests exit immediately without overflow/loops');
  b.g.upgrade[u.id]=u.max;b.g.credits=1e290;const q=b.upgradeQuote(u);assert.ok(q.count>100&&Number.isFinite(q.cost)&&q.cost<=b.g.credits);
  assert.ok(b.upgradeTotalCost(u,u.max,q.count+1)>b.g.credits);
 }
 b.g.upgrade.speed=0;b.g.endless=false;const oldBase=b.flightSpeed();b.g.endless=true;assert.equal(b.flightSpeed(),oldBase*8.5);
 b.g.upgrade.speed=60;const atCap=b.flightSpeed();b.g.upgrade.speed=61;assert.ok(b.flightSpeed()>atCap);
 assert.ok(saves>=8);
}
// Catalogue names are unique and deterministic; the world identities stay stable.
{
 const b={g:{abyssConsumed:{},abyssPositions:{}},CHUNK:480,TAU:Math.PI*2,WORLD_SEED:0x17aba37,player:{x:0,y:0,r:300},clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
 vm.createContext(b);vm.runInContext(game.slice(seedStart,seedStop)+game.slice(abyssStart,abyssStop)+'\nlist=ABYSS_CATALOGUE;',b);
 assert.equal(new Set(b.list.map(h=>h.name)).size,b.list.length);
 assert.deepEqual(JSON.parse(JSON.stringify(b.buildAbyssCatalogue())),JSON.parse(JSON.stringify(b.list)));
}
console.log('PASS: endless upgrades, exact bulk quotes, MAX affordability, diminished gains, 10x base black-hole flight and unique permanent names');

// A tiny body cannot buy the same progress as a near-peer at any campaign tier.
for(let tier=0;tier<27;tier++){
 lootBox.g.tier=tier;lootBox.TA[tier]={required:1000};lootBox.g.endless=false;
 const tiny=lootBox.campaignBodyValue({r:.13}),peer=lootBox.campaignBodyValue({r:6.5});
 assert.ok(peer>tiny*2000);assert.ok(peer<1000*.25);assert.ok(Number.isFinite(tiny)&&tiny>0);
}
console.log('PASS: all 27 campaign forms have size-weighted rewards without a flat progress floor');
