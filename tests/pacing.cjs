// Optional pacing probe: nearest edible target, no upgrades, 10 Hz.
// Rival-hole death is disabled to isolate gathering; this is not human playtesting.
// Run with @napi-rs/canvas installed, or CANVAS_MODULE set to its absolute path.
const {createCanvas}=require(process.env.CANVAS_MODULE || '@napi-rs/canvas');
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const base=fs.readFileSync(require('path').join(__dirname,'../game.js'),'utf8');
function run(tier,matter,x,frames){
 const nodes=new Map();
 function node(){return {firstElementChild:{classList:{add(){},remove(){}}},style:{setProperty(){}},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},append(){},appendChild(){},setAttribute(){},addEventListener(){},querySelector(){return node()},querySelectorAll(){return []},getBoundingClientRect(){return{width:100,height:100,left:0,top:0}}};}
 function canvas(){const c=createCanvas(1920,1080),get=c.getContext.bind(c);c.getContext=(type,options)=>type==='2d'?get(type,options):null;c.addEventListener=()=>{};return c;}
 nodes.set('universe',canvas());const map=canvas();map.getBoundingClientRect=()=>({width:1100,height:550,left:0,top:0});nodes.set('atlas-canvas',map);
 const data=process.env.RESUME?JSON.parse(fs.readFileSync(process.env.RESUME,'utf8')):{version:1,tier,matter,worldX:x,worldY:x,rebalanceV:3,music:false,sound:false};
 const box={console,performance,URLSearchParams,location:{search:''},innerWidth:1920,innerHeight:1080,devicePixelRatio:1,
  localStorage:{getItem:k=>k==='cosmic-evolution-save-v1'?JSON.stringify(data):null,setItem(){}},requestAnimationFrame(){},addEventListener(){},setTimeout(){},setInterval(){},clearInterval(){},HTMLElement:function(){},
  document:{hidden:false,addEventListener(){},querySelectorAll(){return []},querySelector(){return node()},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:type=>type==='canvas'?canvas():node()}};
 box.checkpoint=state=>process.env.CHECKPOINT_DIR && fs.writeFileSync(require('path').join(process.env.CHECKPOINT_DIR,'balance-checkpoint-'+state.tier+'.json'),JSON.stringify(state));box.window=box;vm.createContext(box);
 const code=base.replace(/\}\)\(\);\s*$/,`window.test={run(){updateAbysses=()=>true;running=true;g.particles=false;g.controlMode='keys';let lastTier=g.tier,start=g.time;const results=[];for(let i=0;i<10*3600&&g.tier<27;i++){keys.clear();const candidates=entities.concat(macroEntities,cosmicAbsorptions).filter(e=>!e.dead&&!e.absorbing&&e.r/player.r>=.025&&canAbsorbBody(e));let target=null,best=Infinity;for(const e of candidates){const d=Math.hypot(e.x-player.x,e.y-player.y);if(d<best){best=d;target=e;}}const dx=target?target.x-player.x:1,dy=target?target.y-player.y:0;if(Math.abs(dx)>player.r*.1)keys.add(dx>0?'d':'a');if(Math.abs(dy)>player.r*.1)keys.add(dy>0?'s':'w');update(.1);if(g.tier!==lastTier){results.push({tier:lastTier,seconds:+(g.time-start).toFixed(2)});console.log(JSON.stringify(results.at(-1)));lastTier=g.tier;start=g.time;checkpoint({...g,worldX:player.x,worldY:player.y});}if(g.time-start>180){console.log('STUCK',g.tier,g.matter/TA[g.tier].required,g.materials,g.stageExplored);break;}}return results;}};})();`);
 vm.runInContext(code,box,{timeout:10000});const result=box.test.run();assert.equal(result.length,27-(data.tier||0),'Every campaign transition must complete');for(const row of result)assert.ok(row.seconds>=25 && row.seconds<=120,JSON.stringify(row));console.log('Total seconds:',result.reduce((sum,row)=>sum+row.seconds,0));
}
run(0,0,0,0);
