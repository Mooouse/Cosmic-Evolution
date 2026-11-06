/* Chromium regression QA: actual touchscreen input, viewport geometry, rewards hit boxes. */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const pause=t=>new Promise(resolve=>setTimeout(resolve,t));
const base='http://127.0.0.1:8765/?tester=1';
const format=o=>JSON.stringify(o);
async function run(browser,width,height){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(String(err)));
 await page.addInitScript(()=>{
  localStorage.setItem('infiniti-space-language','ru');
  localStorage.setItem('cosmic-evolution-tester-save-v1',JSON.stringify({version:1,tier:0,tutorialDone:true,controlMode:'follow',music:false,sound:false,quality:.6,autoQuality:true}));
 });
 try{
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForFunction(()=>document.body.classList.contains('ui-v15')&&!!document.querySelector('#screen-menu .primary.big-play'),null,{timeout:45000});
  // The mobile menu's decorative play icons must stay within the button.
  const menu=await page.locator('#screen-menu .primary.big-play').evaluate(button=>{
   const b=button.getBoundingClientRect();
   return {button:{left:b.left,right:b.right,width:b.width},icons:[...button.querySelectorAll(':scope > span')].map(span=>{
    const a=span.getBoundingClientRect();
    return {left:a.left,right:a.right,width:a.width};
   })};
  });
  assert.ok(menu.button.width>180,'Menu button too narrow '+format(menu));
  assert.ok(menu.icons.length>=2,'Menu icon placeholders missing '+format(menu));
  for(const icon of menu.icons)assert.ok(icon.left>=menu.button.left-1&&icon.right<=menu.button.right+1,'Menu icon spills beyond frame '+format(menu));

  const tester=page.locator('.v15-tester');
  if(await tester.count()){
   assert.equal(await tester.evaluate(e=>getComputedStyle(e).opacity),'0','Tester button still visible');
   await tester.click({timeout:15000});
   const panel=page.locator('#tester-panel');
   assert.ok(await panel.isVisible(),'Invisible tester hotspot must still work');
   await page.locator('#tester-close').click({timeout:15000}); // panel covers the hotspot when open
  }

  // Reward screen: scrollable content, fixed header & tabs, real clickable tabs.
  await page.locator('#screen-menu [data-reward-page="daily"]').click({timeout:25000});
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='daily');
  const checkRewards=async screen=>{
   const sizes=await page.evaluate(()=>{
    const m=document.querySelector('#modal .modal-card');
    const h=document.querySelector('#modal .rewards-header');
    const tabs=document.querySelector('#modal .rewards-tabs');
    const a=document.querySelector('#modal .rewards-page-content');
    const b=m.getBoundingClientRect(),hb=h.getBoundingClientRect(),tb=tabs.getBoundingClientRect(),ab=a.getBoundingClientRect();
    return {card:{top:b.top,bottom:b.bottom},header:{top:hb.top,bottom:hb.bottom},tabs:{top:tb.top,bottom:tb.bottom},
     area:{top:ab.top,bottom:ab.bottom,height:ab.height,scrollHeight:a.scrollHeight,clientHeight:a.clientHeight},
     overflow:getComputedStyle(a).overflowY,mode:getComputedStyle(a).touchAction,viewport:innerHeight};
   });
   assert.ok(sizes.card.top>=-1&&sizes.card.bottom<=sizes.viewport+2,screen+' card clips '+format(sizes));
   assert.ok(sizes.header.bottom<=sizes.tabs.top+8,screen+' header overlaps tabs '+format(sizes));
   assert.ok(sizes.area.top>=sizes.tabs.top&&sizes.area.bottom<=sizes.card.bottom+3,screen+' content escapes dialog '+format(sizes));
   assert.equal(sizes.overflow,'auto',screen+' reward content cannot scroll '+format(sizes));
   assert.ok(sizes.mode.includes('pan-y'),screen+' touch scrolling blocked '+format(sizes));
   return sizes;
  };
  const daily=await checkRewards('daily');
  await page.locator('#rewards-tab-roulette').click({timeout:20000});
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='roulette');
  const roulette=await checkRewards('roulette');
  const wheel=await page.locator('#daily-wheel').evaluate(el=>({
   background:getComputedStyle(el).backgroundColor,
   transform:getComputedStyle(el).transform,
   image:!!el.querySelector('.roulette-disc-svg')
  }));
  assert.equal(wheel.background,'rgba(0, 0, 0, 0)','Dark rotating square still behind wheel '+format(wheel));
  assert.ok(wheel.image,'Roulette image missing');
  await page.locator('#rewards-tab-daily').click({timeout:20000});
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='daily');
  await page.locator('#daily-back').click({timeout:20000});
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='menu');

  // Real pinch gestures using Chrome touch dispatch: zoom and pan map.
  await page.locator('#screen-menu [data-page="map"]').first().click({timeout:20000});
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='map');
  const rect=await page.locator('#atlas-canvas').boundingBox();
  assert.ok(rect?.width>80&&rect?.height>80,'Map canvas missing');
  // The first-stage atlas may start at its hard maximum zoom (12x).
  // Zoom out first, so a successful outward pinch has room to increase it.
  for(let i=0;i<4;i++)await page.locator('#atlas-zoom-out').click();
  const zoomBefore=await page.evaluate(()=>window.CosmicEvolutionDebug.atlasZoom);
  const cdp=await context.newCDPSession(page);
  const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
  const pair=(dx,dy=0)=>[{x:x-dx,y:y+dy,id:1},{x:x+dx,y:y+dy,id:2}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:pair(35)});
  await pause(70);
  for(let d of [52,75,100,125]){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:pair(d)});
   await pause(35);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await pause(120);
  const zoomAfter=await page.evaluate(()=>window.CosmicEvolutionDebug.atlasZoom);
  assert.ok(zoomAfter>zoomBefore*1.1,'Two-finger map zoom failed '+format({zoomBefore,zoomAfter}));

  // Return and verify only one cooldown indicator can be visually present.
  await page.locator('#screen-map [data-page="play"]').first().click({timeout:20000});
  await page.waitForFunction(()=>document.getElementById('modal')?.classList.contains('off'),null,{timeout:30000});
  const abilities=await page.locator('#hud .v15-hud .abilities .ability-btn').evaluateAll(buttons=>buttons.map(b=>({
   indicator:!!b.querySelector('.ability-cooldown-label'),
   indicatorDisplay:getComputedStyle(b.querySelector('.ability-cooldown-label')).display,
   secondary:getComputedStyle(b.querySelector('small')).display,
   title:getComputedStyle(b.querySelector(':scope>span:nth-child(2)')).display,
   visible:getComputedStyle(b).display
  })));
  assert.equal(abilities.length,2,format(abilities));
  for(const a of abilities){
   assert.ok(a.indicator&&a.indicatorDisplay!=='none','Cooldown indicator missing '+format(a));
   assert.equal(a.secondary,'none','Duplicate small cooldown remains '+format(a));
   assert.equal(a.title,'none','Ability label overlays icon '+format(a));
  }
  assert.equal(errors.filter(x=>!/playgama|sdk|ads/i.test(x)).length,0,'Page errors '+errors.join('\n').slice(0,500));
  console.log('PASS',width,height,format({menu,daily,roulette,wheel,zoomBefore,zoomAfter,abilities}));
 }finally{await context.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{await run(browser,390,844);await run(browser,375,667);await run(browser,430,932);}
 finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
