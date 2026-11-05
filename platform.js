/* CrazyGames SDK v3 bridge. Ads are requested only at explicit game breaks.
   Both disabled SDK and unfilled advertisements leave the game playable. */
(() => {
 'use strict';
 let sdk=null,ready=false,wantsPlay=false,sentPlay=false,loaded=false;
 let loadingReported=false,lastHappy=-Infinity,platformMuted=false,adMuted=false,adBusy=false;
 const api={
  get muted(){return platformMuted||adMuted;},
  get adBusy(){return adBusy;},
  get adsAvailable(){
   const env=sdk?.environment;
   const local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)||
      new URLSearchParams(location.search).get('useLocalSdk')==='true';
   const hosted=/(^|\.)crazygames\.com$/i.test(location.hostname);
   return ready&&!adBusy&&!!sdk?.ad?.requestAd&&env!=='disabled'&&(local||hosted);
  },
  status:'loading',
  playing(value){wantsPlay=!!value;sync();},
  loaded(){loaded=true;sync();},
  happy(){if(ready&&performance.now()-lastHappy>60000){lastHappy=performance.now();call('happytime');}},
  requestAd
 };
 window.SpacePlatform=api;
 function call(name){
  try{sdk?.game?.[name]?.();}catch(_){/* SDK must not interrupt gameplay. */}
 }
 function sync(){
  if(!ready)return;
  if(loaded&&!loadingReported){loadingReported=true;call('loadingStop');}
  if(wantsPlay!==sentPlay){sentPlay=wantsPlay;call(wantsPlay?'gameplayStart':'gameplayStop');}
 }
 function audioChange(){window.dispatchEvent(new Event('space-platform-audio'));}
 function settings(value){platformMuted=!!value?.muteAudio;audioChange();}
 async function requestAd(type){
  if((type!=='rewarded'&&type!=='midgame')||!api.adsAvailable)return false;
  adBusy=true;
  // The caller has already paused gameplay and disabled flight UI.
  return new Promise(resolve=>{
   let finished=false;
   const timeout=setTimeout(()=>settle(false),120000);
   function settle(success){
    if(finished)return;
    finished=true;clearTimeout(timeout);
    adBusy=false;adMuted=false;audioChange();sync();
    resolve(!!success);
   }
   try{
    const callbacks={
     adStarted(){adMuted=true;audioChange();},
     adFinished(){settle(true);},
     adError(){settle(false);}
    };
    const result=sdk.ad.requestAd(type,callbacks);
    if(result&&typeof result.catch==='function')result.catch(()=>settle(false));
   }catch(_){settle(false);}
  });
 }
 async function initialize(){
  try{
   sdk=window.CrazyGames?.SDK;
   if(!sdk)throw Error('SDK unavailable');
   await sdk.init();ready=true;api.status='ready';call('loadingStart');
   settings(sdk.game.settings);
   sdk.game.addSettingsChangeListener?.(settings);
   sync();
  }catch(_){api.status='standalone';}
 }
 if(window.CrazyGames?.SDK)initialize();
 else{
  const script=document.createElement('script');
  script.src='https://sdk.crazygames.com/crazygames-sdk-v3.js';
  script.async=true;script.onload=initialize;
  script.onerror=()=>{api.status='standalone';};
  document.head.append(script);
 }
})();
