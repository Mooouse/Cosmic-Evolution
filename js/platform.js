// CrazyGames HTML5 SDK v3 integration. Reference documentation in docs/CRAZYGAMES.md.
// The public GitHub Pages build uses local storage; CrazyGames uses SDK.data exclusively.
export const SDK_URL='https://sdk.crazygames.com/crazygames-sdk-v3.js';
export class CrazyPlatform {
 constructor(){this.sdk=null;this.environment='disabled';this.playing=false;this.muted=false;this.adBlocked=false;this.adsDisabled=false;this.adPending=false;this.lastRewardedAt=0;this.onMute=()=>{};this.onAdStart=()=>{};this.onAdEnd=()=>{};this.loadError=null;}
 get active(){return !!this.sdk&&['crazygames','local'].includes(this.environment);}
 get cloud(){return this.active&&this.environment==='crazygames';}
 async initialize(sdk){
  if(!sdk)return this;
  try{await sdk.init();if(this.closed)return this;this.sdk=sdk;this.environment=sdk.environment||'disabled';if(!this.active)return this;
   this.call('loadingStart');this.setMuted(!!sdk.game.settings?.muteAudio);
   sdk.game.addSettingsChangeListener?.(settings=>this.setMuted(!!settings.muteAudio));
   // Adblock detection does not block initialization or the ability to play.
   Promise.resolve().then(()=>sdk.ad.hasAdblock()).then(value=>{this.adBlocked=value===true;}).catch(()=>{});
  }catch(error){this.loadError=error;this.sdk=null;this.environment='disabled';}
  return this;
 }
 call(method){if(!this.active)return;try{const result=this.sdk.game[method]?.();result?.catch?.(()=>{});}catch{}}
 setMuted(muted){this.muted=muted;this.onMute(muted);}
 loadingComplete(){this.call('loadingStop');}
 setGameplay(playing){if(this.playing===playing)return;this.playing=playing;this.call(playing?'gameplayStart':'gameplayStop');}
 celebrate(){this.call('happytime');}
 read(key){if(this.cloudExpected&&!this.active)throw Error('CrazyGames SDK unavailable; cloud save protected');if(this.cloud)return this.sdk.data.getItem(key);return window.localStorage.getItem(key);}
 write(key,value){if(this.cloudExpected&&!this.active)throw Error('CrazyGames SDK unavailable; cloud save protected');if(this.cloud){this.sdk.data.setItem(key,value);return;}window.localStorage.setItem(key,value);}
 get canReward(){return this.active&&!this.adBlocked&&!this.adsDisabled&&!this.adPending&&Date.now()-this.lastRewardedAt>=90000;}
 requestRewarded({timeoutMs=120000}={}){
  if(!this.canReward)return Promise.resolve({completed:false,reason:'unavailable'});
  this.adPending=true;
  return new Promise(resolve=>{let settled=false,started=false,timer;const done=(completed,reason)=>{if(settled)return;settled=true;clearTimeout(timer);this.adPending=false;if(completed)this.lastRewardedAt=Date.now();if(reason==='adsDisabledBasicLaunch'||reason==='adblock')this.adsDisabled=true;this.onAdEnd();resolve({completed,reason});};
   timer=setTimeout(()=>done(false,'timeout'),timeoutMs);
   try{this.sdk.ad.requestAd('rewarded',{
    adStarted:()=>{if(settled||started)return;started=true;this.onAdStart();},
    adFinished:()=>done(true,'finished'),
    adError:error=>done(false,error?.code||error?.reason||'failed'),
   });}catch(error){done(false,error?.code||'failed');}
  });
 }
}
async function fetchSDK(){
 if(window.CrazyGames?.SDK)return window.CrazyGames.SDK;
 return new Promise(resolve=>{let finished=false;const script=document.createElement('script');script.src=SDK_URL;script.async=true;const end=value=>{if(finished)return;finished=true;clearTimeout(timer);resolve(value);};const timer=setTimeout(()=>end(null),6000);script.onload=()=>end(window.CrazyGames?.SDK||null);script.onerror=()=>end(null);document.head.appendChild(script);});
}
export async function initPlatform(){
 const p=new CrazyPlatform();p.cloudExpected=/(^|\.)crazygames\.com$/i.test(window.location.hostname)||/^https:\/\/([a-z0-9-]+\.)*crazygames\.com[/:]/i.test(document.referrer);const sdk=await fetchSDK();
 if(sdk){let timer;await Promise.race([p.initialize(sdk),new Promise(resolve=>{timer=setTimeout(()=>{p.closed=true;p.loadError=Error('SDK initialization timed out');resolve();},10000);})]);clearTimeout(timer);}
 // Never switch storage providers after gameplay has started following a timeout.
 if(p.loadError){p.sdk=null;p.environment='disabled';}
 return p;
}
