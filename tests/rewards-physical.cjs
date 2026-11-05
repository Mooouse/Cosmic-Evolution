'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.INFINITI_DIAG_URL||'https://mooouse.github.io/Infiniti-Space/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:false,args:['--no-sandbox','--disable-dev-shm-usage']});
 console.log('BROWSER',browser.version(),process.platform);
 let failed=false;
 try{
  for(const config of [
   {width:1280,height:720,dpr:1},
   {width:1707,height:960,dpr:1.5},
   {width:2560,height:1440,dpr:1}
  ]){
   const context=await browser.newContext({viewport:{width:config.width,height:config.height},deviceScaleFactor:config.dpr});
   const page=await context.newPage();
   await page.addInitScript(()=>{
    localStorage.setItem('infiniti-space-language','ru');
    window.__rewardTrace=[];
    for(const type of ['pointerdown','pointerup','click','wheel']){
     window.addEventListener(type,e=>{
      window.__rewardTrace.push({type,id:e.target?.id,tag:e.target?.tagName,
       cls:typeof e.target?.className==='string'?e.target.className:'',
       x:e.clientX,y:e.clientY,button:e.button,screen:document.querySelector('#modal')?.dataset.screen});
      if(window.__rewardTrace.length>35)window.__rewardTrace.shift();
     },{capture:true,passive:true});
    }
   });
   page.on('pageerror',e=>console.log('PAGEERROR',String(e)));
   page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});
   const dump=()=>page.evaluate(()=>({
    build:[...document.scripts].find(s=>s.src.includes('/game.js'))?.src,
    viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio,scale:visualViewport?.scale},
    screen:document.querySelector('#modal')?.dataset.screen,
    off:document.querySelector('#modal')?.className,
    focus:document.activeElement?.outerHTML?.slice(0,200),
    trace:window.__rewardTrace,
    controls:[...document.querySelectorAll('#modal button')].filter(b=>b.id.includes('daily')||b.id.includes('rewards')||b.dataset.rewardPage).map(b=>{
     const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
     return {id:b.id,page:b.dataset.rewardPage,disabled:b.disabled,handler:typeof b.onclick,
      rect:[r.x,r.y,r.width,r.height],hit:hit?.outerHTML?.slice(0,180)};
    }),
    scrolls:[document.documentElement,document.body,document.querySelector('#modal'),document.querySelector('.modal-card'),document.querySelector('.rewards-page-content')].filter(Boolean).map(e=>({id:e.id,cls:e.className,top:e.scrollTop,h:e.clientHeight,full:e.scrollHeight})),
    frames:[...document.querySelectorAll('iframe')].map(f=>({src:f.src,rect:f.getBoundingClientRect().toJSON()}))
   }));
   async function click(selector,screen){
    const r=await page.evaluate(sel=>{
     const e=document.querySelector(sel);if(!e)throw Error('Missing '+sel);
     const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
    },selector);
    assert.ok(r.x>0&&r.x<config.width&&r.y>0&&r.y<config.height,'Off-screen '+selector+' '+JSON.stringify(r));
    await page.mouse.move(r.x,r.y,{steps:5});
    await page.mouse.down();await page.waitForTimeout(70);await page.mouse.up();
    if(screen)await page.waitForFunction(s=>document.querySelector('#modal')?.dataset.screen===s,screen,{timeout:5000});
    await page.waitForTimeout(120);
   }
   async function scrollDaily(){
    const spots=await page.evaluate(()=>{
     const c=document.querySelector('.daily-calendar').getBoundingClientRect();
     const b=document.querySelector('#daily-claim').getBoundingClientRect();
     return [[c.x+c.width*.5,c.bottom+14],[b.x+b.width*.5,b.bottom+16],
      [innerWidth*.5,innerHeight-8],[c.x+c.width*.7,c.y+c.height*.7]];
    });
    for(let i=0;i<24;i++){
     const p=spots[i%spots.length];
     await page.mouse.move(Math.min(config.width-5,p[0]),Math.min(config.height-5,p[1]),{steps:4});
     await page.mouse.wheel(0,i%2?700:-700);
    }
   }
   try{
    await page.goto(base+'?tester=1&diagnostic=physical',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>document.querySelector('#screen-menu [data-reward-page="daily"]'),null,{timeout:45000});
    console.log('START',JSON.stringify(config),(await dump()).build);
    await click('#screen-menu [data-reward-page="daily"]','daily');
    await scrollDaily();
    await click('#rewards-tab-roulette','roulette');
    await click('#rewards-tab-daily','daily');
    await click('#daily-claim');
    await scrollDaily();
    await click('#rewards-tab-roulette','roulette');
    await click('#daily-spin');
    await page.waitForTimeout(8000);
    await click('#rewards-tab-daily','daily');
    await scrollDaily();
    await click('#rewards-tab-roulette','roulette');
    await click('#daily-back','menu');
    await click('#screen-menu [data-reward-page="roulette"]','roulette');
    await click('#daily-back','menu');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('#screen-menu [data-reward-page="daily"]'),null,{timeout:45000});
    await click('#screen-menu [data-reward-page="daily"]','daily');
    await scrollDaily();
    await click('#rewards-tab-roulette','roulette');
    await click('#daily-back','menu');
    await click('#screen-menu [data-reward-page="roulette"]','roulette');
    console.log('PASS PHYSICAL',JSON.stringify(config));
   }catch(e){
    failed=true;console.log('FAIL PHYSICAL',JSON.stringify(config),String(e));
    console.log('DIAGNOSTIC',JSON.stringify(await dump()));
   }
   await context.close();
  }
 }finally{await browser.close();}
 if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
