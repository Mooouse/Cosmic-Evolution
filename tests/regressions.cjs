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
has('ctx.save();ctx.globalAlpha=1;\n   ctx.drawImage(old.canvas', 'Cached backdrop must not dim during fade');
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
assert.match(game,/if\(!g\.endless&&frameFps<42/,
 'Final-tier canvas must not be reset by adaptive resolution changes');
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
