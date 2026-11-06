'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const sizes=[[844,390],[932,430],[667,375],[736,414],[568,320]];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const show=o=>JSON.stringify(o);
const overlaps=(a,b)=>{
 const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
 const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 return w*h;
};
async function check(browser,width,height){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await ctx.newPage();
 const errors=[];
 page.on('pageerror',err=>errors.push(String(err)));
 await page.addInitScript(()=>{
  localStorage.setItem('infiniti-space-language','en');
  localStorage.setItem('cosmic-evolution-tester-save-v1',JSON.stringify({
   version:1,tier:0,tutorialDone:true,controlMode:'follow',
   mobileMode:'fixed',music:false,sound:false,quality:.6,autoQuality:true
  }));
 });
 try {
  await page.goto('http://127.0.0.1:8765/?tester=1',{waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForFunction(()=>document.body.classList.contains('ui-v15'),null,{timeout:50000});
  const start=page.locator('#screen-menu .primary.big-play').first();
  await start.waitFor({state:'visible',timeout:25000});
  await start.click({timeout:15000});
  if(await page.locator('#tutorial-skip').isVisible())await page.locator('#tutorial-skip').click();
  await page.waitForFunction(()=>document.getElementById('modal')?.classList.contains('off'),null,{timeout:20000});
  await sleep(180);
  const layout=await page.evaluate(()=>{
   const root=document.querySelector('#hud .v15-hud');
   const get=selector=>Array.from(document.querySelectorAll(selector)).filter(e=>{
    const c=getComputedStyle(e);return c.display!=='none'&&c.visibility!=='hidden'&&c.opacity!=='0';
   });
   const r=e=>{
    const q=e.getBoundingClientRect();
    return {left:q.left,right:q.right,top:q.top,bottom:q.bottom,width:q.width,height:q.height,
     selector:e.id?('#'+e.id):('.'+String(e.className).split(' ')[0])};
   };
   return {
    width:innerWidth,height:innerHeight,landscape:matchMedia('(orientation:landscape)').matches,
    pointer:matchMedia('(pointer:coarse)').matches,
    header:get('#hud .v15-hud .hud-top .hud-left .brand-icon, #hud .v15-hud .hud-top .hud-resources>div:not(.hud-time), #hud .v15-hud .hud-top .hud-commands>.icon-btn').map(r),
    progress:get('#hud .v15-hud .evo-status').map(r),
    audio:get('#hud .v15-hud .quick-audio>.icon-btn').map(r),
    ability:get('#hud .v15-hud .abilities>.ability-btn').map(r),
    upgrades:get('#hud .v15-hud .upgrade-pull').map(r),
    camera:get('#hud .v15-hud .v15-camera-toggle').map(r),
    stick:get('#hud #flight-stick').map(r),
    direction:get('#hud #direction-control').map(r),
    alert:get('#abyss-warning:not([hidden])').map(r),
    modalOff:document.getElementById('modal').classList.contains('off'),
    version:[...document.styleSheets].some(s=>s.href&&s.href.includes('mobile-ui-polish.css?v=3.59.6'))
   };
  });
  assert.ok(layout.landscape&&layout.pointer,'Incorrect landscape touch test '+show(layout));
  assert.ok(layout.modalOff&&layout.version,'Game should use v3.59.6 styles '+show(layout));
  assert.equal(layout.header.length,6,'Missing top HUD controls '+show(layout));
  assert.equal(layout.progress.length,1);
  assert.equal(layout.audio.length,2,'Music buttons not both present');
  assert.equal(layout.ability.length,2,'Abilities not both present');
  assert.equal(layout.upgrades.length,1);
  const headerTop=layout.header[0].top,headerBottom=layout.header[0].bottom;
  for(const h of layout.header){
   assert.ok(h.width>=29&&h.height>=30,'Tiny header hit target '+show(h));
   assert.ok(Math.abs(h.top-headerTop)<2,'Inconsistent header top alignment '+show(layout.header));
   assert.ok(Math.abs(h.bottom-headerBottom)<2,'Inconsistent header bottom alignment '+show(layout.header));
  }
  const all=[...layout.header,...layout.progress,...layout.audio,...layout.ability,...layout.upgrades,...layout.camera,...layout.stick,...layout.direction];
  for(const i of all){
   assert.ok(i.left>=-1&&i.right<=width+1,'HUD off the horizontal viewport '+show(i));
   assert.ok(i.top>=-2&&i.bottom<=height+2,'HUD off the vertical viewport '+show(i));
  }
  const progress=layout.progress[0];
  assert.ok(progress.top>=headerBottom+3,'Progress overlaps top row '+show(layout));
  assert.ok(progress.width<width*.58,'Full-width evolution panel in landscape '+show(progress));
  assert.ok(progress.height<=44,'Oversized landscape evolution panel '+show(progress));
  for(const a of layout.audio)assert.ok(overlaps(a,progress)<2,'Audio controls cover progress '+show({a,progress}));
  for(const a of layout.upgrades)assert.ok(overlaps(a,progress)<2,'Upgrades cover progress '+show({a,progress}));
  for(const a of layout.camera)assert.ok(overlaps(a,progress)<2,'Camera toggle covers progress '+show({a,progress}));
  assert.ok(layout.ability.every(a=>a.bottom>=height-55),'Abilities float in middle of screen '+show(layout.ability));
  assert.ok(Math.abs(layout.ability[0].top-layout.ability[1].top)<=2,'Landscape abilities stacked vertically '+show(layout.ability));
  if(layout.stick.length)assert.ok(layout.stick[0].width<=110,'Joystick blocks too much gameplay '+show(layout.stick));
  // Central playfield must be completely free of HUD. The margin of 5px
  // protects mouse/touch controls from hidden visual overlays too.
  const center={left:width*.36,right:width*.64,top:height*.32,bottom:height*.73};
  for(const box of all)assert.equal(overlaps(box,center),0,'HUD blocks gameplay center '+show({box,center}));
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
   // Header buttons, map and sound controls, progression and abilities
   // never share hit targets or painted rectangles.
   assert.ok(overlaps(all[i],all[j])<=2,'HUD elements overlap '+show({a:all[i],b:all[j]}));
  }
  const critical=errors.filter(s=>!/Playgama|SDK|Ads|Failed to fetch/i.test(s));
  assert.ok(critical.length===0,'JS runtime error '+critical.slice(0,3).join('\n'));
  console.log('LANDSCAPE PASS '+width+'x'+height+' '+show({
   top:headerTop,headerBottom,progress,audio:layout.audio,ability:layout.ability,
   stick:layout.stick,direction:layout.direction
  }));
  if((width===844&&height===390)||(width===568&&height===320)){
   const jpeg=await page.screenshot({type:'jpeg',quality:65,animations:'disabled'});
   console.log('LANDSCAPE_SCREENSHOT_'+width+'x'+height+'='+jpeg.toString('base64'));
  }
 }finally{await ctx.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage',
   '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const [w,h] of sizes)await check(browser,w,h);}
 finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
