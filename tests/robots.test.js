import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import {RobotTeam} from '../js/robot-team.js';
import {crewLayout,rigMarkup,armGeometry,ARM_UPPER,ARM_LOWER,drivePosition,moveBase} from '../js/robots.js';
function ready(task=0){const s=E.newGame(1000),g=s.garages[0];g.crew=[6,6,6,6,6];g.robots=6;g.robotLevel=1;g.job.required.fill(true);g.job.progress=g.job.progress.map((_,i)=>i<task?100:0);return s;}
test('six washers reserve separate body areas and retain individual speed',()=>{
 const s=ready(),team=new RobotTeam();team.step(s,0);assert.equal(team.pending.size,6);
 const actions=[...team.pending.values()].map(p=>p.act);
 for(const [i,a] of actions.entries()){assert.equal(a.seconds,.72);for(const b of actions.slice(i+1))assert.ok(Math.hypot(a.point[0]-b.point[0],a.point[1]-b.point[1])>=50);}
 const result=team.step(s,720);assert.equal(result.done.length,6);assert.equal(s.garages[0].job.surface.wash.length,6);
});
test('five mechanics use five distinct bolts, manual help cannot double count; one moves the part',()=>{
 const s=ready(2),team=new RobotTeam();team.step(s,0);assert.equal(team.pending.size,5);
 assert.equal(new Set([...team.pending.values()].map(p=>p.act.id)).size,5);
 E.turnBolt(s,0);const result=team.step(s,3400);assert.equal(result.done.length,4);assert.equal(E.wheelState(s.garages[0].job).bolts.length,5);
 assert.equal(team.pending.size,1);assert.equal([...team.pending.values()][0].act.move,'remove');
 team.step(s,10400);assert.equal([...team.pending.values()][0].act.move,'mount');
 team.step(s,17400);assert.equal(team.pending.size,5);team.step(s,20800);assert.equal(s.garages[0].job.progress[2],100);
});
test('technicians reserve separate connectors then a single calibration',()=>{
 const s=ready(3),team=new RobotTeam();team.step(s,0);assert.equal(team.pending.size,3);E.connectWire(s,1,1);
 assert.equal(team.step(s,8000).done.length,2);assert.equal(team.pending.size,1);assert.equal([...team.pending.values()][0].act.type,'engine');
});
test('reset cancels work during pause; switching garages discards old reservations',()=>{
 const s=ready(),team=new RobotTeam();team.step(s,0);team.reset();team.step(s,100000);assert.equal(s.garages[0].job.progress[0],0);
 s.garages[1].owned=true;s.active=1;E.createJob(s);team.step(s,200000);assert.equal(team.pending.size,0);assert.equal(s.garages[0].job.progress[0],0);
});
test('thirty robots finish shared jobs, transition professions, and issue one delivery signal',()=>{
 const s=ready(),team=new RobotTeam();let delivered=false;
 for(let time=0;time<300000;time+=100){const result=team.step(s,time);if(result.deliver){delivered=true;break;}}
 assert.ok(delivered);assert.equal(E.taskIndex(s.garages[0].job),-1);assert.equal(team.pending.size,0);
 const money=s.money;const receipt=E.completeJob(s,0,{automatic:true});assert.equal(s.money,money+receipt.amount);assert.equal(E.completeJob(s),null);
});
test('all thirty rigs have distinct visible bases on phone and desktop, fixed arms reach targets after driving',()=>{
 for(const [w,h] of [[320,460],[390,650],[900,600],[1600,850]])for(let task=-1;task<5;task++){
  const layout=crewLayout([6,6,6,6,6],task,w,h);assert.equal(layout.length,30);assert.equal(new Set(layout.map(u=>u.id)).size,30);
  assert.equal(new Set(layout.map(u=>`${u.x},${u.y}`)).size,30);
  for(const u of layout){assert.ok(u.x-34*u.scale>0&&u.x+34*u.scale<w);assert.ok(u.y-61*u.scale>0&&u.y+12*u.scale<h-120);
   const target={x:w*.82,y:u.floor-90},base=drivePosition(u,target),pose=armGeometry({...u,...base},target,u.scale);assert.ok(Math.hypot(pose.tip.x-target.x,pose.tip.y-target.y)<.01);const svg=rigMarkup(u,target,true);assert.ok(!/NaN|Infinity|undefined/.test(svg));assert.ok(svg.includes(`data-robot-id="${u.id}"`));}
 }
});

test('both rigid arm links retain length for near, far and unreachable targets',()=>{
 for(const scale of [.45,.72])for(const target of [{x:0,y:0},{x:200,y:200},{x:200,y:200-34*scale},{x:1600,y:-500}]){
  const pose=armGeometry({x:200,y:200},target,scale);
  assert.ok(Math.abs(Math.hypot(pose.elbow.x-pose.shoulder.x,pose.elbow.y-pose.shoulder.y)-ARM_UPPER*scale)<1e-6);
  assert.ok(Math.abs(Math.hypot(pose.elbow.x-pose.tip.x,pose.elbow.y-pose.tip.y)-ARM_LOWER*scale)<1e-6);
 }
});
test('robot drives at a bounded speed on the floor and cannot work while approaching',()=>{
 const u=crewLayout([1,0,0,0,0],0,900,600)[0],target={x:700,y:300},goal=drivePosition(u,target);let base={x:50,y:u.floor};
 const first=moveBase(base,goal,.05,u.scale);assert.equal(first.y,u.floor);assert.ok(first.x>base.x&&first.x-base.x<=220*u.scale*.05+.001);
 for(let i=0;i<500;i++)base=moveBase(base,goal,.05,u.scale);assert.deepEqual(base,goal);
 const s=ready(),team=new RobotTeam();team.step(s,0,{ready:()=>false});for(let time=100;time<=10000;time+=100)team.step(s,time,{ready:()=>false});assert.equal(s.garages[0].job.progress[0],0);
 for(let time=10100;time<=10800;time+=100)team.step(s,time,{ready:()=>true});assert.ok(s.garages[0].job.progress[0]>0);
});
