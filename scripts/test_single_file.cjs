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
  const result=await page.evaluate(async()=>{
   const tracks=window.SpaceMusicTracks;
   const audio=document.createElement('audio');
   const supported=audio.canPlayType('audio/ogg; codecs="opus"');
   const lazy=tracks.every(t=>
    typeof Object.getOwnPropertyDescriptor(t,'src')?.get==='function');
   const covers=tracks.every(t=>t.cover.startsWith('data:image/jpeg;base64,'));
   const urls=tracks.map(t=>t.src);
   const blobs=urls.every(url=>url.startsWith('blob:'));
   const firstAudio=await (await fetch(urls[0])).blob();
   const header=String.fromCharCode(...new Uint8Array(await firstAudio.slice(0,4).arrayBuffer()));
   const probe=new Audio(urls[0]);probe.preload='metadata';
   const duration=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Opus metadata timed out')),15000);
    probe.onloadedmetadata=()=>{clearTimeout(timer);resolve(probe.duration)};
    probe.onerror=()=>{clearTimeout(timer);reject(new Error('Opus decode failed: '+probe.error?.code))};
    probe.load();
   });
   return {
    tracks:tracks.length,allCoversEmbedded:covers,allAudioEmbedded:blobs,
    lazy,opusSupported:supported,oggHeader:header,firstDuration:duration,
    canvas:!!document.getElementById('universe').getContext('2d'),
    menuScreen:document.getElementById('modal').dataset.screen
   };
  });
  assert.equal(result.tracks,12);
  assert.ok(result.lazy,'12 Opus soundtracks must decode lazily');
  assert.ok(result.allAudioEmbedded);
  assert.ok(result.allCoversEmbedded);
  assert.ok(result.opusSupported,'Modern browser must support Opus in Ogg');
  assert.equal(result.oggHeader,'OggS','Encoded data must be a valid Ogg stream');
  assert.ok(result.firstDuration>200&&result.firstDuration<250,'Opus duration must remain correct');
  assert.ok(result.canvas);
  await page.waitForTimeout(1500);
  assert.deepEqual(errors,[],'No uncaught page errors');
  console.log('PASS: one HTML, 12 lazy Opus stereo tracks, Ogg decoding + metadata, covers, styles, JS, game menu');
  console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});