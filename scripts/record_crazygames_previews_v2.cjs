// Record the actual browser viewport (Canvas + DOM HUD), not the canvas alone.
// Test motion at the center of the frame to reject slideshow-like recordings.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve('video-export'),rawDir=path.resolve('video-export-v2-raw');
fs.mkdirSync(root,{recursive:true});fs.mkdirSync(rawDir,{recursive:true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const ff=args=>cp.execFileSync('ffmpeg',args,{encoding:'utf8',maxBuffer:16*1024*1024});
const specs=[
 {name:'Infiniti_Space_Gameplay_1920x1080',width:1280,height:720,outW:1920,outH:1080},
 {name:'Infiniti_Space_Gameplay_1080x1620',width:720,height:1080,outW:1080,outH:1620}
];
async function capture(spec){
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage','--use-gl=angle',
  '--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'
 ]});
 let context;
 try {
  context=await browser.newContext({
   viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,
   recordVideo:{dir:rawDir,size:{width:spec.width,height:spec.height}}
  });
  const page=await context.newPage(),errors=[];const video=page.video();
  page.on('pageerror',e=>errors.push(String(e).slice(0,500)));
  await page.addInitScript(()=>{
   localStorage.setItem('infiniti-space-language','en');
   localStorage.setItem('cosmic-evolution-tester-save-v1',JSON.stringify({
    version:1,tier:0,tutorialDone:true,controlMode:'follow',
    music:false,sound:false,particles:false,autoQuality:true,
    quality:.6,viewZoom:1
   }));
  });
  await page.goto('http://127.0.0.1:8765/?tester=1',
   {waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForFunction(()=>document.getElementById('tester-tier')?.options?.length>20,
   null,{timeout:80000});
  const play=page.locator('#screen-menu .primary.big-play, #btn-start').first();
  await play.waitFor({state:'visible',timeout:35000});await play.click({timeout:20000});
  if(await page.locator('#tutorial-skip').isVisible())await page.locator('#tutorial-skip').click();
  await page.waitForFunction(()=>document.getElementById('modal')?.classList.contains('off'),null,{timeout:30000});
  await page.addStyleTag({content:'*, *::before, *::after{cursor:none!important}'});
  const tier=async next=>page.evaluate(next=>{
   const el=document.getElementById('tester-tier');el.value=String(next);
   el.dispatchEvent(new Event('change',{bubbles:true}));
   const panel=document.getElementById('tester-panel');
   panel.classList.add('hidden');panel.setAttribute('aria-hidden','true');
  },next);
  await tier(15);await pause(900);
  const actual=await page.evaluate(()=>({
   canvas:!!document.getElementById('universe'),
   hud:!!document.getElementById('hud'),
   screen:document.getElementById('modal')?.dataset.screen,
   viewport:[innerWidth,innerHeight]
  }));
  assert.equal(actual.screen,'play','Gameplay must be active');
  assert.equal(actual.hud,true,'Real HUD must be visible');
  console.log('RECORDING',spec.name,JSON.stringify(actual));
  const scenes=[{tier:15,duration:4200},{tier:23,duration:8900},{tier:27,duration:4400}];
  let cycles=0;
  for(const scene of scenes){
   await tier(scene.tier);
   const until=Date.now()+scene.duration;
   while(Date.now()<until){
    const clock=Date.now()/1000;
    await page.mouse.move(spec.width*(.54+.3*Math.cos(clock*.8)),spec.height*(.5+.26*Math.sin(clock*.64)));
    if(cycles++%9===0)await page.keyboard.press('e');
    await pause(110);
   }
   console.log('SEGMENT',spec.name,scene.tier,'done');
  }
  await page.close();
  const output=path.join(rawDir,spec.name+'.webm');await video.saveAs(output);
  await context.close();context=null;
  console.log('RAW',spec.name,fs.statSync(output).size,'bytes');
  if(errors.length)console.warn('PAGE ERRORS:',errors.slice(0,3));
  return output;
 }finally{
  if(context)await context.close().catch(()=>{});
  await browser.close();
 }
}
function getDuration(file){
 const res=cp.spawnSync('ffmpeg',['-hide_banner','-i',file],{encoding:'utf8',maxBuffer:2*1024*1024});
 const m=res.stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
 if(!m)throw Error('Missing video duration: '+res.stderr.slice(0,500));
 return +m[1]*3600+(+m[2])*60+(+m[3]);
}
function measureMotion(file){
 const list=ff(['-hide_banner','-loglevel','error','-i',file,
  '-vf','crop=iw*0.58:ih*0.63:iw*0.21:ih*0.18,scale=160:90',
  '-f','framemd5','-']).split('\n').filter(x=>x&&!x.startsWith('#'));
 const hashes=list.map(x=>x.split(',').pop()?.trim());
 let changes=0,hold=0,longest=0;
 for(let i=1;i<hashes.length;i++){
  if(hashes[i]===hashes[i-1]){hold++;longest=Math.max(longest,hold)}
  else{hold=0;changes++}
 }
 return {frames:hashes.length,changed:changes,fps:changes/Math.max(1,hashes.length/25),maxStillSeconds:longest/25};
}
function encode(src,spec){
 const dest=path.join(root,spec.name+'.mp4');
 const inputDuration=getDuration(src);
 const length=17.0;
 const start=Math.max(0,inputDuration-length-.18);
 ff(['-hide_banner','-loglevel','error','-y','-ss',start.toFixed(3),
  '-i',src,'-t',String(length),'-an','-vf',
  'scale='+spec.outW+':'+spec.outH+':flags=lanczos,fps=25',
  '-c:v','libx264','-preset','faster','-crf','21',
  '-pix_fmt','yuv420p','-movflags','+faststart',dest]);
 const duration=getDuration(dest),size=fs.statSync(dest).size;
 assert.ok(duration>=16.2&&duration<=18.1,JSON.stringify({duration,inputDuration,start}));
 assert.ok(size>100000&&size<50_000_000,JSON.stringify({size}));
 const motion=measureMotion(dest);
 console.log('FINAL',spec.name,JSON.stringify({duration,size,motion}));
 assert.ok(motion.frames>350,'Video is too short');
 assert.ok(motion.fps>=7,'Video gameplay too jerky: '+JSON.stringify(motion));
 assert.ok(motion.maxStillSeconds<1.0,'Video contains frozen frames: '+JSON.stringify(motion));
 ff(['-hide_banner','-loglevel','error','-y','-ss','10','-i',dest,
  '-frames:v','1',path.join(root,spec.name+'-frame.jpg')]);
}
(async()=>{
 for(const spec of specs)encode(await capture(spec),spec);
 console.log('PASS: Authentic gameplay, full HUD, visible motion in 16:9 and 2:3');
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
