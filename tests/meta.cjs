'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');

const source=fs.readFileSync('space-meta.js','utf8');
const context={console,Date,Math,Number};
context.globalThis=context;vm.createContext(context);vm.runInContext(source,context);
const meta=context.SpaceMeta;
assert.ok(meta,'SpaceMeta must exist before game.js starts');
const d0=Date.UTC(2026,10,4,12,0,0),d1=Date.UTC(2026,10,5,12,0,0),d2=Date.UTC(2026,10,6,12,0,0);
const g={tier:0,credits:100,ownedTracks:[1]};
assert.equal(meta.canClaim(g,d0),true);
const first=meta.claim(g,d0);
assert.ok(first.ok&&first.amount>0);assert.equal(first.streak,1);
assert.equal(meta.claim(g,d0).ok,false,'Same day gift cannot be claimed again');
assert.equal(meta.canSpin(g,d0),true);
const wheel=meta.roll(g,[],d0,()=>.01);assert.equal(wheel.ok,true);
assert.equal(meta.roll(g,[],d0,()=>.5).ok,false,'At most one daily spin');
assert.equal(meta.canClaim(g,d1),true);
assert.equal(meta.claim(g,d1).streak,2,'Consecutive days raise streak');
assert.equal(meta.claim(g,d2).streak,3);
assert.equal(meta.state(g).claims,3);
const gap=meta.claim(g,d2+3*86400000);assert.equal(gap.streak,1,'Missing days resets streak');
const paid=[{id:1,title:'Starter',price:0},{id:2,title:'New Wave',price:1200},{id:3,title:'Nebula',price:5000}];
const lucky={tier:12,credits:0,ownedTracks:[1]};
meta.claim(lucky,d0);
const win=meta.roll(lucky,paid,d0,()=>.9999);
assert.equal(win.type,'track');assert.ok([2,3].includes(win.track.id));
assert.ok(lucky.ownedTracks.includes(win.track.id));
assert.equal(lucky.daily.musicWins,1);
const owned={tier:12,credits:0,ownedTracks:[1,2,3]};
meta.claim(owned,d0);const price=meta.roll(owned,paid,d0,()=>.9999);
assert.equal(price.type,'credits');
assert.equal(price.prize,'track-value');
assert.ok([1200,5000].includes(price.amount));
assert.equal(owned.ownedTracks.length,3);
assert.equal(meta.PRIZES.reduce((n,p)=>n+p.weight,0),100,'Wheel sector weights sum to 100');
assert.equal(meta.PRIZES[meta.PRIZES.length-1].weight,.8,'Music is the rarest reward');
const h={x:400,y:0,r:80};
assert.equal(meta.segmentHit(0,0,800,0,h),true);
assert.equal(meta.segmentHit(0,150,800,150,h),false);
const route=meta.planDrift({x:0,y:0,heading:0,speed:20,seconds:3600,
 radius:10,holes:[h],maxHours:12});
assert.ok(route.path.length>8,'Offline drift should plot a meaningful route');
assert.ok(route.path.every(p=>Number.isFinite(p[0])&&Number.isFinite(p[1])));
for(let i=1;i<route.path.length;i++){
 const a=route.path[i-1],b=route.path[i];
 assert.equal(meta.segmentHit(...a,...b,h,1.5),false,'Unattended flight may not intersect a rival horizon');
}
const stored=meta.addRoute([],route.path);
assert.ok(stored.length<=1400&&stored.length>10);
assert.equal(meta.driftReward(100,0,5400),100);
assert.equal(meta.driftReward(100,90,5400),10);
assert.equal(meta.driftReward(100,100,5400),0);
assert.equal(meta.driftReward(100,0,0),0);
console.log('PASS: daily rollover, streak, no duplicate spins, 0.8% music prize, paid-track fallback and drift avoidance');

// Exercise the SDK callbacks with a fake CrazyGames host. Playback remains paused
// and audio muted only during an actual ad; failures never count as finished.
async function testSDK(){
 const original=fs.readFileSync('platform.js','utf8');
 let callbacks=null,adType='',audioEvents=0;
 const sdk={
  environment:'local',
  init:async()=>{},
  ad:{requestAd(type,cb){adType=type;callbacks=cb;}},
  game:{settings:{muteAudio:false},addSettingsChangeListener(){},
   loadingStart(){},loadingStop(){},gameplayStart(){},gameplayStop(){},happytime(){}}
 };
 const window={CrazyGames:{SDK:sdk},dispatchEvent(ev){if(ev.type==='space-platform-audio')audioEvents++;}};
 const ctx={window,location:{hostname:'localhost',search:''},performance:{now:()=>0},
  Event:class Event{constructor(type){this.type=type}},URLSearchParams,setTimeout,clearTimeout};
 vm.createContext(ctx);vm.runInContext(original,ctx);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(window.SpacePlatform.status,'ready');
 assert.equal(window.SpacePlatform.adsAvailable,true);
 const success=window.SpacePlatform.requestAd('rewarded');
 assert.equal(adType,'rewarded');assert.equal(window.SpacePlatform.adBusy,true);
 callbacks.adStarted();assert.equal(window.SpacePlatform.muted,true);
 callbacks.adFinished();assert.equal(await success,true);
 assert.equal(window.SpacePlatform.muted,false);assert.equal(window.SpacePlatform.adBusy,false);
 const failed=window.SpacePlatform.requestAd('rewarded');
 callbacks.adError({code:'unfilled'});assert.equal(await failed,false);
 assert.equal(window.SpacePlatform.muted,false);
 assert.ok(audioEvents>=4,'Audio responds to start, finish and error callbacks');
 const disabled={window:{CrazyGames:{SDK:{...sdk,environment:'disabled'}}},location:{hostname:'mooouse.github.io',search:''},
  performance:{now:()=>0},Event:ctx.Event,URLSearchParams,setTimeout,clearTimeout};
 disabled.window.dispatchEvent=()=>{};
 vm.createContext(disabled);vm.runInContext(original,disabled);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(disabled.window.SpacePlatform.adsAvailable,false,'GitHub Pages fallback has no real advertisements');
 console.log('PASS: CrazyGames SDK v3 callback completion, ad error handling, audio mute and standalone mode');
}
testSDK().catch(e=>{console.error(e);process.exitCode=1;});
