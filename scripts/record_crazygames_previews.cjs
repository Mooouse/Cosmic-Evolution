// Records actual Infiniti Space canvas gameplay. No generated or misleading frames.
// Uses built-in game tester controls on a separate, throwaway browser profile.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8765';
const out=path.resolve('video-export');
fs.mkdirSync(out,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function run(width,height,label){
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage','--use-gl=angle',
  '--use-angle=swiftshader','--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'
 ]});
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
 const page=await ctx.newPage();
 const errors=[];
 page.on('pageerror',err=>errors.push(String(err)));
 page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,400))});
 try {
  await page.addInitScript(()=>{
   localStorage.setItem('infiniti-space-language','en');
   localStorage.setItem('cosmic-evolution-tester-save-v1',JSON.stringify({
    version:1,tier:0,tutorialDone:true,controlMode:'follow',mobileMode:'fixed',
    music:false,musicVolume:0,sound:false,viewZoom:1
   }));
  });
  await page.goto(base+'/?tester=1',{waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForFunction(()=>!!document.getElementById('tester-tier')?.options.length,
   null,{timeout:65000});
  // Start game naturally through its UI, but with the one-time tutorial cleared.
  const candidate=page.locator('#screen-menu .primary.big-play, #btn-start, [data-action="play"]').first();
  await candidate.waitFor({state:'visible',timeout:25000});
  await candidate.click({timeout:15000});
  if(await page.locator('#tutorial-skip').isVisible())await page.locator('#tutorial-skip').click();
  await page.waitForFunction(()=>document.getElementById('modal')?.classList.contains('off'),null,{timeout:20000});
  await page.evaluate(()=>{document.getElementById('universe').style.cursor='none'});
  const setTier=async value=>page.evaluate(value=>{
    const select=document.getElementById('tester-tier');
    select.value=String(value);
    select.dispatchEvent(new Event('change',{bubbles:true}));
    const panel=document.getElementById('tester-panel');
    panel.classList.add('hidden');panel.setAttribute('aria-hidden','true');
   },value);
  await setTier(10);
  await pause(1200);
  const settings=await page.evaluate(()=>{
   const c=document.getElementById('universe');
   const stream=c.captureStream(24);
   const options=['video/webm;codecs=vp8','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
   if(!options)throw Error('No WebM encoder');
   const recorder=new MediaRecorder(stream,{mimeType:options,videoBitsPerSecond:4500000});
   const chunks=[];
   const done=new Promise((resolve,reject)=>{
    recorder.onerror=e=>reject(e.error||new Error('recorder error'));
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
    recorder.onstop=()=>resolve();
   });
   window.__captureRec={recorder,chunks,done,stream};
   recorder.start(500);
   return {options,canvas:[c.width,c.height],menu:document.getElementById('modal').dataset.screen};
  });
  console.log('REC '+label,JSON.stringify(settings));
  const segments=[{tier:10,duration:3800},{tier:16,duration:4000},{tier:23,duration:4000},{tier:27,duration:6000}];
  for(let si=0;si<segments.length;si++){
   const segment=segments[si];
   if(si>0)await setTier(segment.tier);
   const until=Date.now()+segment.duration;
   let n=0;
   while(Date.now()<until){
    const t=Date.now()/1000;
    // Moving the pointer controls actual movement and gravity within the game.
    const x=width*(.5+.35*Math.cos(t*.65+si));
    const y=height*(.5+.27*Math.sin(t*.5+si));
    await page.mouse.move(x,y);
    if(n++%6===0)await page.keyboard.press('e');
    await pause(420);
   }
   await page.screenshot({path:path.join(out,label+'-tier'+segment.tier+'.jpg'),type:'jpeg',quality:78});
   console.log(label,'stage',segment.tier,'done');
  }
  const base64=await page.evaluate(async()=>{
    const {recorder,done,chunks,stream}=window.__captureRec;
    recorder.stop();await done;
    stream.getTracks().forEach(track=>track.stop());
    const blob=new Blob(chunks,{type:'video/webm'});
    return await new Promise((resolve,reject)=>{
     const reader=new FileReader();
     reader.onload=()=>resolve(reader.result.split(',')[1]);
     reader.onerror=()=>reject(reader.error);
     reader.readAsDataURL(blob);
    });
  });
  const webm=path.join(out,label+'.webm');
  fs.writeFileSync(webm,Buffer.from(base64,'base64'));
  const target=path.join(out,label+'.mp4');
  cp.execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',webm,
   '-an','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p',
   '-movflags','+faststart','-r','24',target],{stdio:'inherit'});
  const ff=cp.execFileSync('ffprobe',['-v','error','-show_entries',
   'format=duration,size','-of','json',target],{encoding:'utf8'});
  console.log('VIDEO CREATED '+label,ff.trim());
  if(errors.length)throw Error('Page errors: '+errors.join('|').slice(0,1000));
 }finally{await browser.close()}
}
(async()=>{
 await run(1920,1080,'Infiniti_Space_Gameplay_1920x1080');
 await run(1080,1620,'Infiniti_Space_Gameplay_1080x1620');
})().catch(e=>{console.error(e);process.exit(1)});
