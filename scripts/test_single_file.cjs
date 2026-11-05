'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async () => {
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];
  page.on('pageerror', e=>errors.push(String(e)));
  // Verify the game works with NO network dependencies beyond this one HTML.
  await page.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith('http://127.0.0.1:8765/'))return route.continue();
    return route.abort();
  });
  await page.goto('http://127.0.0.1:8765/single-file/index.html?tester=1',
   {waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>
   !!window.SpaceMusicTracks && window.SpaceMusicTracks.length===12
   && !!window.SpaceMeta && !!document.querySelector('#modal')
   && !!document.getElementById('universe'),null,{timeout:40000});
  const result=await page.evaluate(()=>({
   tracks:window.SpaceMusicTracks.length,
   allAudioEmbedded:window.SpaceMusicTracks.every(t=>t.src.startsWith('data:audio/mpeg;base64,')),
   allCoversEmbedded:window.SpaceMusicTracks.every(t=>t.cover.startsWith('data:image/jpeg;base64,')),
   firstTrackBase64:window.SpaceMusicTracks[0].src.length,
   canvas:!!document.getElementById('universe').getContext('2d'),
   menuScreen:document.getElementById('modal').dataset.screen,
  }));
  assert.equal(result.tracks,12);
  assert.ok(result.allAudioEmbedded);
  assert.ok(result.allCoversEmbedded);
  assert.ok(result.firstTrackBase64>500000);
  assert.ok(result.canvas);
  await page.waitForTimeout(1500);
  assert.deepEqual(errors,[],'No uncaught page errors');
  console.log('PASS: one HTML, 12 embedded playable-track URLs, covers, styles, JS, and game menu');
  console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});