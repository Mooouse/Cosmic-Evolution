/* Regression: coalesce dozens of real notifications into one viewport-safe card,
   with achievements prioritized and no blocked gameplay controls. */
'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const sizes=[
 {width:1440,height:900,mobile:false},
 {width:390,height:844,mobile:true},
 {width:375,height:667,mobile:true},
 {width:844,height:390,mobile:true},
 {width:568,height:320,mobile:true}
];
const longText='A very long notification / Много очень длинных уведомлений о поглощении галактик и материалов / Материя, изменения направления гравитационного поля, невероятно длинные слова: '+('гравитационно-космологический'.repeat(9));
const rectIntersect=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
async function test(browser,info){
 const {width,height,mobile}=info;
 const context=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.addInitScript(()=>{
   localStorage.setItem('infiniti-space-language','en');
   localStorage.setItem('cosmic-evolution-tester-save-v1',JSON.stringify({
    version:1,tier:0,tutorialDone:true,controlMode:'follow',
    mobileMode:'fixed',music:false,sound:false,quality:.6,autoQuality:true
   }));
  });
  await page.goto('http://127.0.0.1:8765/?tester=1',{waitUntil:'domcontentloaded',timeout:80000});
  await page.waitForFunction(()=>!!window.InfinitiNoticeQA&&document.body.classList.contains('ui-v15'),null,{timeout:50000});
  await page.locator('#screen-menu .primary.big-play').first().click({timeout:25000});
  if(await page.locator('#tutorial-skip').isVisible())await page.locator('#tutorial-skip').click();
  await page.waitForFunction(()=>document.getElementById('modal')?.classList.contains('off'),null,{timeout:30000});
  await page.evaluate(text=>{
   document.getElementById('toast-root').replaceChildren();
   for(let i=0;i<75;i++)window.InfinitiNoticeQA.toast('Collected '+i+' objects');
   for(let i=0;i<15;i++)window.InfinitiNoticeQA.toast(text);
  },longText);
  await pause(70);
  const sample=await page.evaluate(()=>{
   const root=document.getElementById('toast-root');
   const toRect=e=>{let r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
   const cards=[...root.children].filter(e=>getComputedStyle(e).display!=='none');
   return {
    root:toRect(root),cards:cards.map(e=>({rect:toRect(e),
     scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,
     text:e.textContent,tag:e.className,overflow:getComputedStyle(e).overflow})),
    counter:root.querySelector('.toast-count')?.textContent,
    parentPointer:getComputedStyle(root).pointerEvents,
    cardPointer:cards.map(e=>getComputedStyle(e).pointerEvents),
    width:innerWidth,height:innerHeight,
    styleLoaded:[...document.styleSheets].some(x=>x.href?.includes('notification-system.css?v=3.59.7'))
   };
  });
  assert.ok(sample.styleLoaded,'Dedicated stylesheet not loaded');
  assert.equal(sample.cards.length,1,'Unbounded toasts after 90 events '+JSON.stringify(sample));
  assert.equal(sample.counter,'+89','Events did not coalesce '+JSON.stringify(sample));
  assert.equal(sample.parentPointer,'none','Notification container blocks taps');
  assert.ok(sample.cardPointer.every(x=>x==='none'),'Notice blocks taps');
  assert.ok(sample.root.left>=-1&&sample.root.right<=width+1,'Root out of viewport '+JSON.stringify(sample));
  assert.ok(sample.root.top>=0&&sample.root.bottom<=height+1,'Root beyond vertical viewport '+JSON.stringify(sample));
  assert.ok(sample.root.width<=width*.75,'Notifications take too much screen width '+JSON.stringify(sample));
  const card=sample.cards[0];
  assert.ok(card.rect.left>=-1&&card.rect.right<=width+1,'Long message overflows horizontal viewport '+JSON.stringify(card));
  assert.ok(card.rect.top>=0&&card.rect.bottom<=height+1,'Long message overflows vertical viewport '+JSON.stringify(card));
  assert.ok(card.scrollWidth<=card.clientWidth+2,'Text extends beyond message card '+JSON.stringify(card));
  const center={left:width*.36,right:width*.64,top:height*.35,bottom:height*.73};
  assert.equal(rectIntersect(card.rect,center),0,'Notification obscures the gameplay center '+JSON.stringify({card,center}));
  // Achievements are high priority; ordinary events do not build a second stack.
  await page.evaluate(()=>{
   window.InfinitiNoticeQA.achievement();
   for(let i=0;i<40;i++)window.InfinitiNoticeQA.toast('Event while achievement active '+i);
  });
  await pause(120);
  const achievement=await page.evaluate(()=>{
    const root=document.getElementById('toast-root');
    const kids=[...root.children];
    const a=kids.find(x=>x.classList.contains('achievement-unlock'));
    const box=a?.getBoundingClientRect();
    return {count:kids.length,hasAchievement:!!a,
     box:box?{left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width}:null,
     pointer:a?getComputedStyle(a).pointerEvents:null};
  });
  assert.equal(achievement.count,1,'Achievement stacked with ordinary toasts '+JSON.stringify(achievement));
  assert.equal(achievement.hasAchievement,true,'Achievement was displaced by spam');
  assert.ok(achievement.box.left>=0&&achievement.box.right<=width+1,'Achievement out of viewport '+JSON.stringify(achievement));
  assert.ok(achievement.box.bottom<=height+1,'Achievement exceeds viewport height '+JSON.stringify(achievement));
  assert.equal(achievement.pointer,'none','Achievement blocks controls');
  if(mobile&&width===390){
   await page.waitForFunction(()=>document.getElementById('toast-root').textContent.includes('Event while achievement active'),null,{timeout:9500});
   const after=await page.evaluate(()=>({
    count:document.getElementById('toast-root').children.length,
    text:document.getElementById('toast-root').textContent
   }));
   assert.ok(after.count<=1,'Deferred messages create a new stack '+JSON.stringify(after));
   assert.ok(after.text.includes('Event while achievement active'),'Deferred notice lost '+JSON.stringify(after));
  }
  const important=errors.filter(s=>!/Playgama|Ads|SDK|Failed to fetch/i.test(s));
  assert.equal(important.length,0,'Runtime errors '+important.slice(0,3).join(' | '));
  console.log('PASS NOTIFICATIONS '+width+'x'+height+' '+JSON.stringify({
   root:sample.root,card:card.rect,achievement:achievement.box,count:sample.counter
  }));
 }finally{await context.close();}
}
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const info of sizes)await test(b,info);}
 finally{await b.close();}
})().catch(err=>{console.error(err.stack||err);process.exit(1)});
