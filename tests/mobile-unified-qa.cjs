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
  // Simulate the exact live spin class / custom property used in gameplay.
  const spinStyle=await page.locator('#daily-wheel').evaluate(async el=>{
    const picture=el.querySelector('.roulette-disc-svg');
    el.style.setProperty('--wheel-turn','1020deg');
    el.classList.add('spinning');
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    await new Promise(resolve=>setTimeout(resolve,160));
    return {
      parent:getComputedStyle(el).transform,
      child:getComputedStyle(picture).transform,
      circle:getComputedStyle(picture).clipPath,
      mask:getComputedStyle(picture).webkitClipPath,
      borderRadius:getComputedStyle(picture).borderRadius
    };
  });
  assert.equal(spinStyle.parent,'none','Wheel box must NEVER rotate '+format(spinStyle));
  assert.ok(spinStyle.child!=='none'&&spinStyle.child!=='matrix(1, 0, 0, 1, 0, 0)','Only circular SVG artwork should spin '+format(spinStyle));
  assert.ok(spinStyle.circle.includes('circle('),'Spinning artwork must be circularly clipped '+format(spinStyle));
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
  // The map was entered from the main menu, so Back correctly returns
  // to the menu first. Start a real game before inspecting gameplay controls.
  await page.locator('#screen-map [data-page="play"]').first().click({timeout:20000});
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='menu',null,{timeout:15000});
  await page.locator('#screen-menu .primary.big-play').click({timeout:15000});
  if(await page.locator('#tutorial-skip').isVisible())await page.locator('#tutorial-skip').click();
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
  // All HUD pods share one skin and align without any overlay collision.
  const hud=await page.evaluate(()=>{
   const root=document.querySelector('#hud .v15-hud');
   const one=selector=>root.querySelector(selector);
   const many=selector=>[...root.querySelectorAll(selector)].filter(e=>getComputedStyle(e).display!=='none');
   const sample=element=>{
    const r=element.getBoundingClientRect(),c=getComputedStyle(element);
    return {kind:element.className,rect:{top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width},
      bg:c.backgroundImage,bgColor:c.backgroundColor,
      topBorder:c.borderTopWidth,bottomBorder:c.borderBottomWidth,
      borderColor:c.borderTopColor,corner:c.borderTopLeftRadius};
   };
   const header=[one('.hud-left .brand-icon'),...many('.hud-resources>div:not(.hud-time)'),...many('.hud-commands>.icon-btn')];
   return {head:header.map(sample),panel:sample(one('.evo-status')),
    audio:[...many('.quick-audio>.icon-btn')].map(sample),
    audioShell:sample(one('.quick-audio')),
    ability:[...many('.abilities>.ability-btn')].map(sample),viewport:[innerWidth,innerHeight]};
  });
  assert.equal(hud.head.length,6,'Expect 1 brand, 2 resources and 3 top buttons '+format(hud.head));
  assert.equal(hud.audio.length,2,'Expect two secondary audio buttons '+format(hud.audio));
  const all=[...hud.head,...hud.audio,hud.panel,...hud.ability];
  for(const item of all){
   assert.equal(item.topBorder,'2px','Inconsistent HUD outline '+format(item));
   assert.equal(item.bottomBorder,'5px','Inconsistent HUD bevel '+format(item));
   assert.equal(item.corner,'9px','Inconsistent HUD rounded corners '+format(item));
   assert.equal(item.borderColor,hud.head[0].borderColor,'Inconsistent HUD border color '+format(item));
   assert.equal(item.bg,hud.head[0].bg,'Inconsistent HUD background '+format(item));
  }
  const first=hud.head[0].rect;
  for(const item of hud.head){
   assert.ok(Math.abs(item.rect.top-first.top)<=2,'Top HUD row misaligned '+format(hud.head));
   assert.ok(Math.abs(item.rect.height-first.height)<=2,'Top HUD height differs '+format(hud.head));
   assert.ok(item.rect.left>=-1&&item.rect.right<=width+1,'HUD clip at screen edge '+format(item));
  }
  assert.ok(hud.panel.rect.top>=first.bottom+6,'Progress overlaps header '+format(hud));
  assert.ok(hud.audio[0].rect.top>=hud.panel.rect.bottom+8,'Audio buttons overlap progress '+format(hud));
  assert.ok(hud.audio.at(-1).rect.right<=width+1,'Audio controls offscreen '+format(hud));
  assert.equal(hud.audioShell.topBorder,'0px','Audio buttons must not have a second box around them');
  assert.equal(errors.filter(x=>!/playgama|sdk|ads/i.test(x)).length,0,'Page errors '+errors.join('\n').slice(0,500));
  console.log('HUD PASS',width,height,JSON.stringify({header:hud.head.map(x=>x.rect),progress:hud.panel.rect,audio:hud.audio.map(x=>x.rect),spinStyle}));

  console.log('PASS',width,height,format({menu,daily,roulette,wheel,zoomBefore,zoomAfter,abilities}));
 }finally{await context.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{await run(browser,390,844);await run(browser,375,667);await run(browser,430,932);}
 finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
