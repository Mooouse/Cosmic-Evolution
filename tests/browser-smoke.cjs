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
  const claim=page.locator('#daily-claim');
  assert.equal(await claim.isEnabled(),true,'Fresh tester save has a daily gift');
  await claim.click({timeout:15000});
  await page.waitForFunction(()=>document.getElementById('daily-claim')?.disabled===true,null,{timeout:12000});
  log('PASS: claiming daily gift refreshes calendar');
  // The original bug appeared only AFTER claiming, moving the cursor and
  // rotating the wheel: reproduce that sequence against real hit-testing.
  const tab=page.locator('#rewards-tab-roulette');
  const box=await tab.boundingBox();
  assert.ok(box&&box.width>25&&box.height>20,'Roulette tab must have physical hitbox');
  for(let i=0;i<14;i++){
   await page.mouse.move(box.x+10+(i%4)*Math.min(22,box.width/8),
    box.y+box.height/2+(i%3)*2);
   await page.mouse.wheel(0,i%2?420:-420);
  }
  const top=await page.evaluate(()=>{
   const el=document.querySelector('#rewards-tab-roulette');
   if(!el)return {missing:true};
   const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
   return {tag:hit?.tagName,id:hit?.id,inside:el===hit||el.contains(hit)};
  });
  assert.equal(top.inside,true,'Reward tabs must be physically clickable after wheel and mouse moves: '+JSON.stringify(top));
  await tab.click({timeout:10000});
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='roulette',null,{timeout:12000});
  assert.equal(await page.locator('#daily-spin').isEnabled(),true,
   'One free roulette attempt is unlocked by claiming the daily reward');
  log('PASS: roulette tab works after daily claim + 14 alternating wheel gestures');
  await page.locator('#daily-back').click({timeout:12000});
  await page.locator('#screen-menu').waitFor({state:'visible',timeout:12000});
  log('PASS: Back from rewards opened in menu returns to menu');
  // Enter actual gameplay, open daily rewards using the in-game HUD, then
  // confirm Back really clears the DOM overlay instead of only resuming physics.
  await page.locator('#screen-menu .primary.big-play').click({timeout:10000});
  const tutorial=page.locator('.br-tutorial-done');
  if(await tutorial.isVisible())await tutorial.click({timeout:10000});
  await page.waitForFunction(()=>document.getElementById('modal')?.classList.contains('off'),null,{timeout:15000});
  await page.locator('#hud .daily-hud-button').click({timeout:10000});
  await page.waitForFunction(()=>document.getElementById('modal')?.dataset.screen==='daily',null,{timeout:12000});
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
  assert.equal(await page.locator('#revive-coins').count(),0,'No stardust revival');
  await page.locator('#revive-restart').click({timeout:15000});
  await page.waitForFunction(()=>document.getElementById('modal')?.classList.contains('off'),null,{timeout:18000});
  log('PASS: lethal black-hole collision opens responsive ad-only death screen and restart');
  assert.equal(errors.length,0,'No unhandled JavaScript errors: '+errors.join('\n'));
  log('PASS: ALL REAL-CHROMIUM REWARD/ROULETTE/DEATH SMOKE TESTS');
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
