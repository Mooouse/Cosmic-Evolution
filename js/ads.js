/** Register a production adapter after the publishing platform's SDK loads:
 * window.GarageAds = { isAvailable: () => true,
 *   showRewarded: async ({placement, rewardId}) => ({completed: true}) };
 * Resolve completed=true ONLY after the platform confirms a watched ad.
 * Rejection, cancellation, timeout and ad blockers never grant a reward.
 * The game never simulates a watched ad or rewards a timer.
 */
let busy=false;
export function adsAvailable(){try{return !!window.GarageAds&&typeof window.GarageAds.showRewarded==='function'&&window.GarageAds.isAvailable?.()===true;}catch{return false;}}
export async function showRewarded(placement,rewardId){
 if(busy||!adsAvailable())return {completed:false,reason:'unavailable'};busy=true;let timer;
 try {const result=await Promise.race([Promise.resolve(window.GarageAds.showRewarded({placement,rewardId})),new Promise(resolve=>{timer=setTimeout(()=>resolve({completed:false,reason:'timeout'}),120000);})]);return {completed:result?.completed===true};}
 catch{return {completed:false,reason:'failed'};}
 finally{clearTimeout(timer);busy=false;}
}
