// Coordinates shared by hit-testing and the smooth visual coating, never shown as a grid.
export const BODY = [[55,222],[140,198],[265,133],[510,133],[650,198],[825,220],[842,270],[55,270]];
export const HULL = [[65,200],[180,160],[280,110],[570,120],[700,180],[840,210],[820,270],[90,270]];
export function inside(x,y,space=false){
 const points=space?HULL:BODY;let hit=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [a,b]=points[i],[c,d]=points[j];
  if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
 }return hit;
}
export function bodyPath(space=false){return (space?HULL:BODY).map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ')+'Z';}
const samples=[false,true].map(space=>{const points=[];for(let y=114;y<271;y+=7)for(let x=56;x<843;x+=9){const px=x+(y%3);if(inside(px,y,space))points.push([px,y]);}return points;});
export function surfacePoints(space=false,custom=null){return custom||samples[space?1:0];}
export function strokeRadius(level){return 25+(level-1)*3;}
export function coveredBy(points,marks){return points.reduce((n,[x,y])=>n+Number(marks.some(([a,b,r])=>(a-x)**2+(b-y)**2<=r*r)),0);}
