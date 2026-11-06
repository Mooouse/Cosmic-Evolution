'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const size of [[1280,720],[390,844],[844,390]]){
   const [width,height]=size,phone=width<900;
   const ctx=await browser.newContext({viewport:{width,height},hasTouch:phone,isMobile:phone,deviceScaleFactor:1});
   const page=await ctx.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('http://127.0.0.1:8765/?tester=1',{waitUntil:'domcontentloaded',timeout:80000});
   await page.waitForFunction(()=>!!window.InfinityArtQA&&!!window.CosmicEvolutionDebug,null,{timeout:55000});
   const stats=await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=1000;c.height=760;
    const tick=performance.now();
    const out=window.InfinityArtQA.drawGallery(c);
    const renderTime=performance.now()-tick;
    const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let colorful=0,bright=0,opaque=0;
    for(let i=0;i<pixels.length;i+=32){
     if(Math.max(pixels[i],pixels[i+1],pixels[i+2])-Math.min(pixels[i],pixels[i+1],pixels[i+2])>25)colorful++;
     if(pixels[i]+pixels[i+1]+pixels[i+2]>420)bright++;
     if(pixels[i+3]>250)opaque++;
    }
    return {textures:out,renderTime,colorful,bright,opaque,version:document.querySelector('script[src*="game.js?v="]')?.getAttribute('src'),sample:c.toDataURL('image/jpeg',.69).split(',')[1]};
   });
   const {sample,...numbers}=stats;
   assert.ok(stats.colorful>1800,'Baked particles and planets must not be featureless '+JSON.stringify(numbers));
   assert.ok(stats.bright>900,'New celestial art too dark '+JSON.stringify(numbers));
   assert.ok(stats.renderTime<5000,'Artwork creation froze the browser '+JSON.stringify(numbers));
   assert.ok(stats.textures.matter>=6&&stats.textures.rocks>=5&&stats.textures.planets>=9,
    'Expected varied materials, rocks and planets '+JSON.stringify(numbers));
   assert.ok(stats.version.includes('3.59.8'),'New game bundle not loaded');
   if(width===1280)console.log('ART_GALLERY_JPEG_BASE64:'+sample);
   // Ensure a fresh run keeps using the same cached textures and no runtime error.
   await page.waitForTimeout(1000);
   const after=await page.evaluate(()=>{
     const c=document.createElement('canvas');c.width=1000;c.height=760;
     const now=performance.now(),result=window.InfinityArtQA.drawGallery(c);
     return {elapsed:performance.now()-now,textures:result,renderTicks:window.CosmicEvolutionDebug.renderTicks};
   });
   assert.ok(after.elapsed<800,'Repeated sprite blits should be cheap '+JSON.stringify(after));
   assert.equal(errors.length,0,'Runtime JS errors: '+errors.slice(0,4).join(' | '));
   console.log('PASS CELESTIAL ART '+width+'x'+height+' '+JSON.stringify({...numbers,repeatMs:after.elapsed,ticks:after.renderTicks}));
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
