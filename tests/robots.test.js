import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import {RobotTeam} from '../js/robot-team.js';
import {crewLayout,rigMarkup,armGeometry} from '../js/robots.js';
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
test('all thirty rigs have distinct visible bases on phone and desktop, tools reach exact targets',()=>{
 for(const [w,h] of [[320,460],[390,650],[900,600],[1600,850]])for(let task=-1;task<5;task++){
  const layout=crewLayout([6,6,6,6,6],task,w,h);assert.equal(layout.length,30);assert.equal(new Set(layout.map(u=>u.id)).size,30);
  assert.equal(new Set(layout.map(u=>`${u.x},${u.y}`)).size,30);
  for(const u of layout){assert.ok(u.x-34*u.scale>0&&u.x+34*u.scale<w);assert.ok(u.y-61*u.scale>0&&u.y+12*u.scale<h-120);
   const target={x:w*.82,y:h*.4};assert.deepEqual(armGeometry(u,target,u.scale).tip,target);const svg=rigMarkup(u,target,true);assert.ok(!/NaN|Infinity|undefined/.test(svg));assert.ok(svg.includes(`data-robot-id="${u.id}"`));}
 }
});
