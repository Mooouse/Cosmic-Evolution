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
has('const outer=Math.min(R*2.30', 'Broad lensing effect was lost');
has('const fade=', 'Non-lens fades should stay controlled');
has("mix.globalCompositeOperation='lighter';mix.globalAlpha=blend", 'Backdrop interpolation must sum weighted premultiplied pixels offscreen');
has('0,496', 'LOD must support astronomical world sizes');
has('low<496', 'LOD interpolation must also support astronomical sizes');
has('Math.max(1e-155,camera.zoom)', 'Camera must support extremely small zoom');
has('140/Math.max(camera.zoom,1e-155)', 'Black-hole movement must be speed-scaled to pixels');
has('const cellX=Math.round(gx/stride)', 'Very large cosmic coordinates must not be hashed directly');
has('const extent=Math.min(32,', 'Cosmic horizon sector sweep regressed');
has('let budget=Math.min(60,', 'Cosmic digestion budget regressed');
has('function blackHoleTouchDistance(', 'Rendered horizon-contact physics missing');
lacks('e.r>radius*.92', 'Oversized galaxy collision filter must remain removed');
const version=page.match(/game\.js\?v=(\d+)\.(\d+)\.(\d+)/);
assert.ok(version,'Game script must have a versioned cache key');
assert.ok(Number(version[1])>3||(Number(version[1])===3&&Number(version[2])>=11),
 'Published game cache key must not regress below 3.11');
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
  ctx:screenCtx,screenCtx,frameCtx,frameCanvas:{},
  dpr:1,W:1920,H:1080,g:{tier:27},TA:Array(28),
  sky(){calls.push("sky")},renderDistantBodies(){calls.push("distant")},
  renderMacroField(){calls.push("macro")},renderEntity(){calls.push("entity")},
  renderBlackHoleLensing(){calls.push("lens");if(lensFails)throw new Error("canvas readback failed")},
  renderPlayer(){calls.push("player")},renderParticles(){calls.push("particles")},
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
traceFrame(false);
traceFrame(true);
console.log("PASS: complete atomic screen frames and lens-readback failure isolation");

console.log('PASS: lens resolution, fast lens lookup, stable backdrop, 4 astronomical zoom levels, LOD, galaxy collision and movement');

// Execute the real backdrop lifecycle. Missing `tier` metadata previously
// invalidated it on EVERY frame; text-presence tests did not catch that.
const cacheStart=game.indexOf('let macroBackdrop=null');
const cacheEnd=game.indexOf('\nfunction streamField()',cacheStart);
let backdropBuilds=0,canvasAllocations=0;
const paintContext=()=>({globalAlpha:1,globalCompositeOperation:'source-over',
 setTransform(){},clearRect(){},drawImage(){}});
const cacheSandbox={W:1920,H:1080,g:{tier:25},TA:Array(28),camera:{x:0,y:0,zoom:.001},player:{x:0,y:0},
 ctx:paintContext(),macroVisibleCount:0,macroEntities:[],MACRO_SIZE:3200,
 cosmicSceneDirty:false,cosmicNextRedraw:0,macroKey:(x,y)=>`${x}:${y}`,
 cosmicVisibleLOD:()=>({low:2}),renderMacroBackground(){backdropBuilds++},drawMacro:()=>true,
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),document:{createElement(){canvasAllocations++;const ctx=paintContext();return{width:0,height:0,getContext:()=>ctx}}}};
vm.createContext(cacheSandbox);vm.runInContext(game.slice(cacheStart,cacheEnd),cacheSandbox);
for(let i=0;i<180;i++)vm.runInContext(`renderMacroField(${i/60})`,cacheSandbox,{timeout:100});
assert.equal(backdropBuilds,1,'A stationary scene must build its backdrop once, not every frame');
cacheSandbox.cosmicSceneDirty=true;vm.runInContext('renderMacroField(3)',cacheSandbox);
assert.equal(backdropBuilds,2,'Harvesting must invalidate the backdrop');
for(let i=0;i<10;i++){
 cacheSandbox.cosmicSceneDirty=true;vm.runInContext(`renderMacroField(${4+i})`,cacheSandbox);
}
assert.equal(canvasAllocations,3,'Two backdrop buffers plus one blend buffer must be reused');
cacheSandbox.g.tier=26;vm.runInContext('renderMacroField(15)',cacheSandbox);
assert.equal(backdropBuilds,13,'Changing tier must refresh the backdrop once');
console.log('PASS: 180 stationary frames reuse one backdrop; refreshed buffers recycle');

// A real world index above 2^53 cannot be incremented by one. These used to
// lock the main thread forever even though the microscopic bodies are invisible.
const streamStart=game.indexOf('function streamField(){');
const streamEnd=game.indexOf('\n// Render world-anchored',streamStart);
const macroStart=game.indexOf('function streamMacroBodies(){');
const macroEnd=game.indexOf('\nconst GALAXY_PALETTES',macroStart);
for(const x of [1e20,-1e20,1e100,-1e100]){
 const sim={player:{x,y:x},camera:{zoom:1e-30},g:{tier:27},CHUNK:480,MACRO_SIZE:3200,
  entities:[{}],macroEntities:[{}],loadedChunks:new Set(['old']),macroLoaded:new Set(['old'])};
 vm.createContext(sim);
 vm.runInContext(game.slice(macroStart,macroEnd)+'\n'+game.slice(streamStart,streamEnd),sim);
 vm.runInContext('streamField()',sim,{timeout:100});
 assert.equal(sim.entities.length,0);assert.equal(sim.macroEntities.length,0);
 assert.equal(sim.loadedChunks.size,0);assert.equal(sim.macroLoaded.size,0);
}
has('if(renderGpuLens(p,R,outer))return;', 'GPU path must bypass CPU pixel readback');
has("surface.addEventListener('webglcontextlost'", 'GPU context loss must permit stable fallback');
has('state.width!==frameCanvas.width', 'GPU texture should only be allocated when dimensions change');
console.log('PASS: huge-coordinate streaming terminates; GPU-first lens with loss recovery');

const absorptionStart=game.indexOf('function startAbsorption(e){');
const absorptionEnd=game.indexOf('\nvisitPosition();streamField();',absorptionStart);
for(const zoom of [1,1e-3,1e-60,1e-110]){
 let rewards=0;
 const e={x:210/zoom,y:0,r:100/zoom,macro:true,index:0,chunk:'test'};
 const sim={e,camera:{zoom},player:{x:0,y:0,r:450/zoom},W:1920,H:1080,
 BLACK_HOLE_CORE_FRACTION:.245,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
 absorbingMacroKeys:new Set(),absorptionKey:()=> 'test',
 absorb(body){body.dead=true;rewards++},finishCosmicAbsorption(body){body.dead=true;rewards++}};
 vm.createContext(sim);vm.runInContext(snippet+'\n'+game.slice(absorptionStart,absorptionEnd),sim);
 vm.runInContext('startAbsorption(e);animateAbsorption(e,.05)',sim);
 assert.equal(rewards,0,'Touching the horizon must not award/remove a galaxy');
 assert.ok(e.x<210/zoom&&e.x>0,'Galaxy must actually move inward');
 assert.ok(e.absorbScale>.98,'Galaxy must not instantly collapse on first contact');
 for(let i=0;i<150&&!e.dead;i++)vm.runInContext('animateAbsorption(e,1/60)',sim);
 assert.equal(rewards,1,'Full absorption must finish and reward exactly once');
 const drawnRadius=112*1.4*e.absorbScale;
 assert.ok(Math.hypot(e.x,e.y)*zoom+drawnRadius<=110.25*.96,
  'The complete galaxy must be inside the black disk before deletion');
 vm.runInContext('animateAbsorption(e,1/60)',sim);assert.equal(rewards,1);
}
lacks('1-e.absorbing/.26', 'Contact must not fade/shrink galaxies out in place');
console.log('PASS: galaxies travel fully inside the horizon before reward/removal at four scales');

// Gravity must act before contact and have identical screen-space motion at
// ordinary and astronomical scales, including the former x9 cutoff.
const gravityCode=game.slice(game.indexOf('function blackHoleGravityRadius(){'),game.indexOf('\nfunction harvestCosmicLOD'));
let firstMotion;
for(const zoom of [1,.08,1e-15,1e-60,1e-110]){
 const e={x:400/zoom,y:0,r:80/zoom,cosmic:true,index:0,level:2,gx:0,gy:0};
 const sim={e,camera:{zoom},player:{x:0,y:0,r:450/zoom,vx:0,vy:0},W:1920,H:1080,
  BLACK_HOLE_CORE_FRACTION:.245,g:{upgrade:{gravity:0}},tester:{gravity:1},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),absorbingMacroKeys:new Set(),absorptionKey:()=> 'fixture',
  startAbsorption(){throw Error('Gravity test body is still outside the event horizon')}};
 vm.createContext(sim);vm.runInContext(snippet+'\n'+gravityCode,sim);
 const radius=vm.runInContext('blackHoleGravityRadius()',sim);
 vm.runInContext('for(let i=0;i<15;i++)applyBlackHoleGravity(e,1/60)',sim);
 const movement=400-e.x*zoom;
 assert.ok(movement>1,'Galaxies outside contact must move toward the black hole');
 if(firstMotion===undefined)firstMotion=movement;else assert.ok(Math.abs(movement-firstMotion)<1e-7,'Gravity speed must not vanish as zoom shrinks');
 sim.g.upgrade.gravity=40;
 assert.ok(vm.runInContext('blackHoleGravityRadius()',sim)>radius,'Gravity upgrades must affect cosmic bodies');
}
console.log('PASS: pre-contact gravity and upgrades work at five zoom scales');

const dustStart=game.indexOf('function cosmicDustView(){');
const dustEnd=game.indexOf('\nfunction renderDistantBodies()',dustStart);
for(const [W,H,zoom] of [[1920,1080,.08],[3840,2160,.025],[390,844,.08]]){
 const points=[];
 const sim={W,H,CHUNK:480,camera:{zoom,x:11000,y:-7000},g:{depleted:{}},
  ctx:{save(){},restore(){},fillRect(x,y){points.push([x,y])}},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),seedHash:()=>0,
  chunkKey:(x,y)=>`${x},${y}`,chunkInfo:()=>({}),sectorQuota:()=>1,
  MATERIALS:{ore:{color:'#abc'}},absorbingMacroKeys:new Set(),absorptionKey:e=>e.chunk,
  distantSamples:(cx,cy)=>[{x:(cx+.5)*480,y:(cy+.5)*480,r:8,index:0,chunk:`${cx},${cy}`,material:'ore'}]};
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

const mapHelpers=game.slice(game.indexOf('function atlasScale(){'),game.indexOf('\nfunction atlasFitPlayer(){'));
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
 const sim={W:1920,H:1080,CHUNK:480,camera:{zoom:.08,x:0,y:0},player:{x:0,y:0},
  g:{endless:true,depleted:{}},loadedChunks:new Set(),absorbingMacroKeys:active,entities,
  seedHash:()=>0,chunkKey:(x,y)=>`${x},${y}`,chunkInfo:()=>({}),sectorQuota:()=>1,
  blackHoleGravityRadius:()=>1e8,absorptionKey:e=>`${e.chunk}:${e.index}`,
  distantSamples:(cx,cy)=>[{x:(cx+.5)*480,y:(cy+.5)*480,r:8,index:0,chunk:`${cx},${cy}`,material:'ore',value:10}]};
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
const lensBox={BLACK_HOLE_CORE_FRACTION:.245,clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};
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
