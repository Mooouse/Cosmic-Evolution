// All coordinates use the same 900 × 360 artwork frame as cleaning hit testing.
export const IMAGE_GROUND={
 'pebble-67':321,'kestrel-510':312,'firecrest-77':306,'tempest-s':297,'orfeo-f':313,
};
export function tireBaseline(vehicle){
 if(vehicle.image){const id=vehicle.image.split('/').at(-1).replace(/\.[^.]+$/,'');return IMAGE_GROUND[id]??320;}
 return 273+(['suv','boxsuv'].includes(vehicle.body)?49:['super','hyper','wedge'].includes(vehicle.body)?44:42)+1;
}
export function floorLine(width,height){return height-(width<600?215:180);}
export function vehiclePlacement(vehicle,width,height){
 const ground=floorLine(width,height),baseline=vehicle.kind==='ship'?286:tireBaseline(vehicle);
 const artWidth=Math.min(1100,width*(width<600?1.04:.91),Math.max(220,(ground-82)*900/(baseline-80)));
 return {ground,width:artWidth,height:artWidth*.4,left:(width-artWidth)/2,top:ground-baseline*artWidth/900,baseline};
}
