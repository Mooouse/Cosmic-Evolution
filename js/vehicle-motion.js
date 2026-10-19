// Approved images keep their own wheels: circular rim regions rotate over the original art.
const IMAGE_WHEELS={
 'pebble-67':[[235,264,40,57],[685,264,40,57]],
 'kestrel-510':[[258,258,37,54],[690,258,37,54]],
 'firecrest-77':[[199,240,47,65],[706,240,47,65]],
 'tempest-s':[[233,233,49,64],[684,234,49,63]],
 'orfeo-f':[[152,233,59,76],[715,243,56,70]],
};
export function imageWheelSpecs(v){return IMAGE_WHEELS[v.image?.split('/').at(-1).replace(/\.[^.]+$/,'')]||[];}
export function imageWheelMarkup(v,uid){
 const specs=imageWheelSpecs(v);if(!specs.length)return '';
 return `<svg class="wheel-spin-overlay" viewBox="0 0 900 360" aria-hidden="true">${specs.map(([x,y,r,tire],i)=>`<defs><clipPath id="${uid}-wheel-${i}"><circle r="${r}"/></clipPath></defs><g transform="translate(${x} ${y})" clip-path="url(#${uid}-wheel-${i})"><g class="road-wheel" data-wheel-radius="${tire}"><image href="./${v.image}" x="${-x}" y="${-y}" width="900" height="360" preserveAspectRatio="xMidYMid meet"/></g></g>`).join('')}</svg>`;
}
export function motionFrame(kind,elapsed,width,artWidth,{gateMs=380,duration=1600}={}){
 const u=Math.max(0,Math.min(1,(elapsed-gateMs)/duration)),eased=u*u*(3-2*u),travel=(width+artWidth)/2+40;
 return {offset:kind==='in'?(u===1?0:-travel*(1-eased)):travel*eased,distance:travel*eased,done:u===1};
}
export function wheelAngle(distance,artWidth,radius){return distance/(artWidth/900)/radius*180/Math.PI;}
