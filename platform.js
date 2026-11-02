/* CrazyGames SDK v3. All SDK calls wait for init; standalone hosting stays playable. */
(() => {
 'use strict';
 let sdk=null,ready=false,wantsPlay=false,sentPlay=false,loaded=false,loadingReported=false,lastHappy=-Infinity;
 const api={muted:false,status:'loading',playing(value){wantsPlay=!!value;sync();},loaded(){loaded=true;sync();},happy(){if(ready&&performance.now()-lastHappy>60000){lastHappy=performance.now();call('happytime');}}};
 window.SpacePlatform=api;
 function call(name){try{sdk?.game?.[name]?.();}catch(_){/* SDK must not interrupt gameplay. */}}
 function sync(){
  if(!ready)return;
  if(loaded&&!loadingReported){loadingReported=true;call('loadingStop');}
  if(wantsPlay!==sentPlay){sentPlay=wantsPlay;call(wantsPlay?'gameplayStart':'gameplayStop');}
 }
 function settings(value){api.muted=!!value?.muteAudio;window.dispatchEvent(new Event('space-platform-audio'));}
 async function initialize(){
  try{
   sdk=window.CrazyGames?.SDK;if(!sdk)throw Error('SDK unavailable');
   await sdk.init();ready=true;api.status='ready';call('loadingStart');
   settings(sdk.game.settings);sdk.game.addSettingsChangeListener?.(settings);sync();
  }catch(_){api.status='standalone';}
 }
 if(window.CrazyGames?.SDK)initialize();
 else {const script=document.createElement('script');script.src='https://sdk.crazygames.com/crazygames-sdk-v3.js';script.async=true;script.onload=initialize;script.onerror=()=>{api.status='standalone';};document.head.append(script);}
})();
