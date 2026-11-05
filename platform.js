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
   if(!ready||adBusy)return false;
   // In disabled mode even reading SDK.ad can throw sdkDisabled.
   // Check the environment BEFORE touching any advertising module.
   try{return sdkEnabled()&&typeof sdk.ad?.requestAd==='function';}
   catch(_){return false;}
  },
  status:'loading',
  playing(value){wantsPlay=!!value;sync();},
  loaded(){loaded=true;sync();},
  happy(){if(ready&&performance.now()-lastHappy>60000){lastHappy=performance.now();call('happytime');}},
  requestAd
 };
 window.SpacePlatform=api;
 function sdkEnabled(){
  try{return sdk?.environment==='local'||sdk?.environment==='crazygames';}
  catch(_){return false;}
 }
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
   await sdk.init();
   // GitHub Pages completes init in "disabled" mode. It must remain a
   // standalone game; reading SDK.game/settings in this mode also throws.
   if(!sdkEnabled()){sdk=null;api.status='standalone';return;}
   ready=true;api.status='ready';call('loadingStart');
   settings(sdk.game.settings);
   sdk.game.addSettingsChangeListener?.(settings);
   sync();
  }catch(_){ready=false;sdk=null;api.status='standalone';}
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
