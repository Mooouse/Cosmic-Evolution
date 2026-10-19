import test from 'node:test';
import assert from 'node:assert/strict';
import {CARS,SHIPS,vehicleSVG} from '../js/vehicles.js';
import {vehiclePlacement,tireBaseline,floorLine} from '../js/workshop-layout.js';
import {crewLayout,drivePosition,armGeometry} from '../js/robots.js';
import {surfacePoints} from '../js/surface.js';
import {imageWheelSpecs,imageWheelMarkup,motionFrame,wheelAngle} from '../js/vehicle-motion.js';
test('all 112 cars place their tyre contact on the floor on wide and narrow screens',()=>{
 for(const [w,h] of [[320,460],[390,740],[900,440],[900,600],[1600,820]])for(const v of CARS){const p=vehiclePlacement(v,w,h);assert.ok(Math.abs(p.top+tireBaseline(v)*p.width/900-floorLine(w,h))<1e-8);assert.ok(p.width<=w*1.04);}
});
test('every cleaning point is reachable by driving, without lengthening an arm',()=>{
 for(const [w,h] of [[320,460],[390,740],[900,440],[1600,820]])for(const v of [...CARS,...SHIPS]){
  const p=vehiclePlacement(v,w,h),u=crewLayout([1,0,0,0,0],0,w,h)[0];
  for(const [x,y] of surfacePoints(v.kind==='ship',v.surfacePoints).filter((_,i)=>i%20===0)){
   const target={x:p.left+x*p.width/900,y:p.top+y*p.width/900},base=drivePosition(u,target),pose=armGeometry({...u,...base},target,u.scale);
   assert.ok(Math.hypot(pose.tip.x-target.x,pose.tip.y-target.y)<.01,`${v.name} ${w} ${x},${y}`);
  }
 }
});
test('all cars have two rotating wheels and spacecraft have none',()=>{
 for(const v of CARS){const markup=v.image?imageWheelMarkup(v,'test'):vehicleSVG(v);assert.equal((markup.match(/class="road-wheel"/g)||[]).length,2);if(v.image)assert.equal(imageWheelSpecs(v).length,2);}
 for(const v of SHIPS)assert.ok(!vehicleSVG(v).includes('road-wheel'));
});
test('door opens before movement; entry is from left, exit is through right; rotation follows distance',()=>{
 const width=900,artWidth=800;
 for(const kind of ['in','out']){const a=motionFrame(kind,0,width,artWidth),b=motionFrame(kind,300,width,artWidth),c=motionFrame(kind,1980,width,artWidth);assert.equal(a.offset,b.offset);assert.equal(b.distance,0);assert.ok(c.done);if(kind==='in'){assert.ok(a.offset<-(width+artWidth)/2);assert.equal(c.offset,0);}else{assert.equal(a.offset,0);assert.ok(c.offset>(width+artWidth)/2);}}
 assert.ok(Math.abs(wheelAngle(2*Math.PI*50,900,50)-360)<1e-9);assert.equal(wheelAngle(0,900,50),0);
});
