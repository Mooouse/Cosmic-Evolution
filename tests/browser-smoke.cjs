// Real Chromium interaction tests. Run after npm installs playwright into
// $RUNNER_TEMP/infiniti-browser-test and a local HTTP server serves the repo.
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.INFINITI_SMOKE_URL||'http://127.0.0.1:8765';
const log=(...a)=>process.stdout.write(a.join(' ')+'\n');
(async()=>{
 const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader',
  '--use-gl=angle','--use-angle=swiftshader-webgl'
 ]});
 let errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1100,height:760},deviceScaleFactor:1});
  const page=await context.newPage();
  // The real report came from the RU interface; do not only test EN labels.
  await page.addInitScript(()=>localStorage.setItem('infiniti-space-language','ru'));
  page.on('pageerror',e=>{errors.push(String(e.stack||e));log('PAGE ERROR:',String(e.stack||e).slice(0,1000));});
  page.on('console',m=>{if(m.type()==='error')log('BROWSER CONSOLE:',m.text().slice(0,700));});
  await page.goto(base+'/?tester=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#screen-menu [data-reward-page="roulette"]').waitFor({state:'visible',timeout:45000});
  // A roulette launch from the main menu must immediately present real controls
  // even if the detailed SVG has not decoded yet.
  await page.locator('#screen-menu [data-reward-page="roulette"]').click({timeout:15000});
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='roulette',null,{timeout:12000});
  assert.equal(await page.locator('#daily-back').isVisible(),true);
  assert.equal(await page.locator('#rewards-tab-daily').isVisible(),true);
  log('PASS: roulette opens from main menu');
  // Daily tab, claim a gift, then move the pointer and wheel back and forth.
  await page.locator('#rewards-tab-daily').click({timeout:10000});
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='daily',null,{timeout:12000});
  // Wheel below the calendar BEFORE claiming as well as after it.
  const beforeClaimBox=await page.locator('.daily-calendar').boundingBox();
  for(let n=0;n<8;n++){
   await page.mouse.move(beforeClaimBox.x+beforeClaimBox.width*.5,
    Math.min(740,beforeClaimBox.y+beforeClaimBox.height+18));
   await page.mouse.wheel(0,n%2?900:-900);
  }
  await page.locator('#rewards-tab-roulette').click();
  await page.waitForFunction(()=>document.querySelector('#modal')?.dataset.screen==='roulette');
  await page.locator('#rewards-tab-daily').click();
  const claim=page.locator('#daily-claim');
  assert.equal(await claim.isEnabled(),true,'Fresh tester save has a daily gift');
  await claim.click({timeout:15000});
  await page.waitForFunction(()=>document.getElementById('daily-claim')?.disabled===true,null,{timeout:12000});
  log('PASS: claiming daily gift refreshes calendar');
  // The original bug appeared only AFTER claiming, moving the cursor and
  // rotating the wheel: reproduce that sequence against real hit-testing.
  const tab=page.locator('#rewards-tab-roulette');
  // Unlike the previous test, wheel in the calendar, around the lower claim
  // button, OUTSIDE the dialog and near the tabs. Real pointer trajectories.
  const calendarBox=await page.locator('.daily-calendar').boundingBox();
  const contentBox=await page.locator('.rewards-page-content').boundingBox();
  const box=await tab.boundingBox();
  assert.ok(box&&calendarBox&&contentBox,'Reward panels need real clickable geometry');
  const spots=[
   [calendarBox.x+calendarBox.width*.5,calendarBox.y+calendarBox.height*.5],
   [calendarBox.x+calendarBox.width*.3,calendarBox.y+calendarBox.height*.82],
   [contentBox.x+contentBox.width*.7,contentBox.y+contentBox.height-18],
   [box.x+box.width*.5,box.y+box.height*.5],
   [contentBox.x+18,contentBox.y+18]
  ];
  for(let i=0;i<40;i++){
   const [x,y]=spots[i%spots.length];
   await page.mouse.move(x,y,{steps:8});
   await page.mouse.wheel(0,i%2===0?980:-870);
  }
  const top=await page.evaluate(()=>{
   const el=document.querySelector('#rewards-tab-roulette');
   if(!el)return {missing:true};
   const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
   const modal=document.getElementById('modal');
   return {hitId:hit?.id,hitClass:hit?.className,inside:el===hit||el.contains(hit),
    origin:modal.dataset.dailyOrigin,screen:modal.dataset.screen,
    scroll:{windowY:window.scrollY,document:document.documentElement.scrollTop,
      modal:modal.scrollTop,card:modal.querySelector('.modal-card')?.scrollTop,
      content:modal.querySelector('.rewards-page-content')?.scrollTop,
      menu:document.querySelector('#screen-menu')?.scrollTop},
    hitRect:b,hitHTML:hit?.outerHTML?.slice(0,350)};
  });
  log('WHEEL-SCROLL-HITBOX:',JSON.stringify(top));
  assert.equal(top.inside,true,'Roulette button must remain clickable after scrolling calendar and moving mouse');
  // Recreate the real failure mode: an invisible element mistakenly owns
  // the mouse hit box after wheel scrolling. Screen-coordinate dispatch must
  // reach the correct tab even when elementFromPoint now returns the blocker.
  await page.evaluate(()=>{
   const blocker=document.createElement('div');blocker.id='test-hitbox-obstruction';
   blocker.style.cssText='position:fixed;inset:0;z-index:999999;pointer-events:auto;background:transparent';
   document.querySelector('#modal').append(blocker);
  });
  const trapped=await page.evaluate(()=>{
   const r=document.querySelector('#rewards-tab-roulette').getBoundingClientRect();
   return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.id;
  });
  assert.equal(trapped,'test-hitbox-obstruction','Test must really obstruct browser hit testing');
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='roulette',null,{timeout:12000});
  assert.equal(await page.locator('#test-hitbox-obstruction').count(),0,'Navigation replaces intercepted blocker');
  log('PASS: reward tab survives an invisible full-screen click-stealing layer');
  assert.equal(await page.locator('#daily-spin').isEnabled(),true,
   'One free roulette attempt is unlocked by claiming the daily reward');
  log('PASS: roulette tab works after daily claim + 40 alternating wheel gestures');
  // The user reports that after ACTUALLY SPINNING and returning to the
  // main menu, the Roulette entry silently stops working. The previous
  // test never clicked Spin, so that regression escaped entirely.
  await page.locator('#daily-spin').click({timeout:12000});
  await page.waitForFunction(()=>document.getElementById('daily-spin')?.disabled===true,{timeout:12000});
  log('PASS: first roulette spin accepted');
  await page.locator('#daily-back').click({timeout:12000});
  await page.locator('#screen-menu').waitFor({state:'visible',timeout:12000});
  for(let n=0;n<3;n++){
    // First two reopenings occur while the old 7.35-second animation timers
    // are still pending. A later reentry tests settled state.
    if(n===2)await page.waitForTimeout(7600);
    const entry=page.locator('#screen-menu [data-reward-page="roulette"]');
    const stateBefore=await page.evaluate(()=>{
      const el=document.querySelector('#screen-menu [data-reward-page="roulette"]');
      const rect=el?.getBoundingClientRect();
      const hit=rect&&document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
      return {exists:!!el,disabled:el?.disabled,hit:hit?.outerHTML?.slice(0,200),
        hitIsButton:hit===el||el?.contains(hit),modal:document.querySelector('#modal')?.dataset.screen,
        scroll:document.querySelector('#screen-menu')?.scrollTop};
    });
    log('REOPEN MENU ROULETTE '+n+':',JSON.stringify(stateBefore));
    assert.equal(stateBefore.hitIsButton,true,
      'Main menu Roulette button is blocked after a spin: '+JSON.stringify(stateBefore));
    if(n===1){
      // A stale visual layer should not make the menu entry inert either.
      await page.evaluate(()=>{
       const b=document.createElement('div');b.id='test-menu-obstruction';
       b.style.cssText='position:fixed;inset:0;z-index:999999;pointer-events:auto;background:transparent';
       document.querySelector('#modal').append(b);
      });
      const rect=await entry.boundingBox();assert.ok(rect);
      await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
    }else await entry.click({timeout:12000});
    await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='roulette',null,{timeout:12000});
    assert.equal(await page.locator('#daily-spin').isDisabled(),true,
      'Reopening should show exhausted free spin, not fail to open');
    await page.locator('#daily-back').click({timeout:12000});
    await page.locator('#screen-menu').waitFor({state:'visible',timeout:12000});
  }
  log('PASS: roulette reopens repeatedly from the main menu both DURING and AFTER the spin animation');


  // Let a real spin FINISH while its view remains mounted, then traverse
  // daily -> roulette -> menu -> roulette. Previously timers only expired
  // after leaving the roulette, which missed the completed-spin path.
  await page.evaluate(()=>document.getElementById('tester-unlock-spin').click());
  await page.locator('#screen-menu [data-reward-page="roulette"]').click();
  await page.locator('#daily-spin').click();
  await page.locator('.daily-wheel.finished').waitFor({timeout:15000});
  const spunSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmic-evolution-tester-save-v1')));
  await page.locator('#rewards-tab-daily').click();
  const lower=await page.locator('.daily-claim').boundingBox();
  for(let n=0;n<12;n++){
   await page.mouse.move(lower.x+lower.width*.5,Math.min(740,lower.y+lower.height+12));
   await page.mouse.wheel(0,n%2?1100:-1100);
  }
  await page.locator('#rewards-tab-roulette').click();
  await page.waitForFunction(()=>document.querySelector('#modal')?.dataset.screen==='roulette');
  await page.locator('#daily-back').click();
  await page.locator('#screen-menu [data-reward-page="roulette"]').click();
  await page.waitForFunction(()=>document.querySelector('#modal')?.dataset.screen==='roulette');
  const reopenedSave=await page.evaluate(()=>JSON.parse(localStorage.getItem('cosmic-evolution-tester-save-v1')));
  assert.equal(reopenedSave.daily.spins,spunSave.daily.spins,'Reopening does not grant another spin');
  assert.equal(reopenedSave.credits,spunSave.credits,'Reopening does not grant the prize twice');
  log('PASS: finished spin -> daily -> lower-page wheel -> roulette -> menu -> roulette');

  // Simulate button nodes reconstructed from markup: navigation lives on
  // the ancestor, not in the discarded node's onclick property.
  await page.locator('#rewards-tab-daily').click();
  await page.evaluate(()=>{
   const button=document.getElementById('rewards-tab-roulette');
   button.replaceWith(button.cloneNode(true));
  });
  await page.locator('#rewards-tab-roulette').click();
  await page.waitForFunction(()=>document.querySelector('#modal')?.dataset.screen==='roulette');
  await page.locator('#daily-back').click();
  await page.evaluate(()=>{
   const button=document.querySelector('#screen-menu [data-reward-page="roulette"]');
   button.replaceWith(button.cloneNode(true));
  });
  await page.locator('#screen-menu [data-reward-page="roulette"]').click();
  await page.waitForFunction(()=>document.querySelector('#modal')?.dataset.screen==='roulette');
  await page.locator('#daily-back').click();
  log('PASS: tabs and menu navigation survive replacement of button nodes');

  log('PASS: Back from rewards opened in menu returns to menu');

  // Try the same broken path on the user's likely high-resolution display,
  // as well as a narrow/mobile viewport. Layout and scroll chains differ.
  for(const size of [{width:2560,height:1440},{width:1920,height:1080},
    {width:390,height:740}]){
    await page.setViewportSize(size);
    await page.locator('#screen-menu [data-reward-page="daily"]').click({timeout:10000});
    await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='daily');
    const cal=await page.locator('.daily-calendar').boundingBox();
    assert.ok(cal,'Daily calendar visible at '+JSON.stringify(size));
    for(let n=0;n<20;n++){
      await page.mouse.move(Math.min(size.width-15,cal.x+cal.width*(.25+.5*(n%3)/2)),
        Math.min(size.height-15,cal.y+cal.height*(.25+.5*(n%4)/3)),{steps:4});
      await page.mouse.wheel(0,n%2?880:-890);
    }
    const tab=page.locator('#rewards-tab-roulette');
    const hit=await page.evaluate(()=>{
      const t=document.querySelector('#rewards-tab-roulette'),r=t.getBoundingClientRect();
      const el=document.elementFromPoint(r.left+r.width*.5,r.top+r.height*.5);
      return {id:el?.id,inside:el===t||t.contains(el),
       modalScroll:document.querySelector('#modal')?.scrollTop,
       contentScroll:document.querySelector('.rewards-page-content')?.scrollTop};
    });
    assert.ok(hit.inside,'Roulette tab blocked after wheel at '+JSON.stringify(size)+': '+JSON.stringify(hit));
    await tab.click({timeout:10000});
    await page.waitForFunction(()=>document.querySelector('#modal')?.dataset.screen==='roulette',{timeout:10000});
    await page.locator('#daily-back').click({timeout:10000});
    log('PASS: repeated calendar scrolling and roulette tab at',size.width+'x'+size.height);
  }
  await page.setViewportSize({width:1100,height:760});

  // Enter actual gameplay, open daily rewards using the in-game HUD, then
  // confirm Back really clears the DOM overlay instead of only resuming physics.
  await page.locator('#screen-menu .primary.big-play').click({timeout:10000});
  const tutorial=page.locator('.br-tutorial-done');
  if(await tutorial.isVisible())await tutorial.click({timeout:10000});
  await page.waitForFunction(()=>document.getElementById('modal')?.classList.contains('off'),null,{timeout:15000});
  await page.locator('#hud .daily-hud-button').click({timeout:10000});
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='daily',null,{timeout:12000});
  const gameCalendar=await page.locator('.daily-calendar').boundingBox();
  for(let n=0;n<20;n++){
   await page.mouse.move(gameCalendar.x+gameCalendar.width*.55,
    gameCalendar.y+gameCalendar.height*.5,{steps:3});
   await page.mouse.wheel(0,n%2?560:-650);
  }
  await page.locator('#rewards-tab-roulette').click({timeout:10000});
  await page.waitForFunction(()=>document.querySelector('#modal')?.dataset.screen==='roulette',null,{timeout:12000});
  await page.locator('#rewards-tab-daily').click({timeout:10000});
  await page.waitForFunction(()=>document.querySelector('#modal')?.dataset.screen==='daily',null,{timeout:12000});
  log('PASS: roulette tab remains clickable after wheel in gameplay HUD');
  await page.locator('#daily-back').click({timeout:10000});
  const hidden=await page.evaluate(()=>{
   const m=document.getElementById('modal');
   return {off:m.classList.contains('off'),screen:m.dataset.screen,
    display:getComputedStyle(m).display,children:m.children.length};
  });
  assert.equal(hidden.off,true,JSON.stringify(hidden));
  assert.equal(hidden.display,'none','Back must REMOVE overlay from actual browser hit testing');
  assert.equal(hidden.screen,'play');
  assert.equal(hidden.children,0);
  log('PASS: HUD rewards Back truly closes overlay, restores game controls');
  // Real collision branch in tester mode: go from a rival horizon to the
  // actual death UI, not a mocked page.
  const collision=await page.evaluate(()=>window.InfinitiTestActions?.simulateRivalDeath());
  assert.equal(collision,true,'Tester must reproduce lethal rival-hole collision');
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='death',null,{timeout:15000});
  assert.equal(await page.locator('#revive-restart').isVisible(),true);
  assert.equal(await page.locator('.revive-results-title').isVisible(),true,'Flight results must be visible');
  assert.equal(await page.locator('.revive-stats span').count(),6,'All six stats must be visible');
  assert.equal(await page.locator('#revive-ad').isVisible(),true,'Rewarded revival option is always visible');
  assert.equal(await page.locator('#revive-ad').isEnabled(),true,'Unused rewarded revival is interactive');
  // The CrazyGames SDK can report that ads are available on localhost even
  // though this is a test runner. Force standalone mode to verify the fallback.
  await page.evaluate(()=>Object.defineProperty(window.SpacePlatform,'adsAvailable',{value:false,configurable:true}));
  await page.locator('#revive-ad').click({timeout:10000});
  await page.waitForFunction(()=>document.getElementById('revive-feedback')?.textContent?.includes('CrazyGames'),null,{timeout:3000});
  assert.equal(await page.locator('#revive-coins').count(),0,'No stardust revival');
  await page.locator('#revive-restart').click({timeout:15000});
  await page.waitForFunction(()=>document.getElementById('modal')?.classList.contains('off'),null,{timeout:18000});
  log('PASS: lethal black-hole collision opens responsive ad-only death screen and restart');
  assert.equal(errors.length,0,'No unhandled JavaScript errors: '+errors.join('\n'));
  log('PASS: ALL REAL-CHROMIUM REWARD/ROULETTE/DEATH SMOKE TESTS');
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
