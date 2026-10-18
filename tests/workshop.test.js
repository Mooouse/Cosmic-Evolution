import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import {surfacePoints} from '../js/surface.js';
function ready(task=0){const s=E.newGame(1000);s.money=1e9;const j=s.garages[0].job;j.required.fill(true);j.progress=j.progress.map((_,i)=>i<task?100:0);return s;}
function hireAll(s){for(let i=0;i<5;i++)E.buySpecialist(s,i);}
function roboticFinish(s){let moves=0,seconds=0;while(E.taskIndex(s.garages[s.active].job)!==-1){const a=E.robotAction(s);assert.ok(a);assert.ok(E.performRobotAction(s,a));seconds+=a.seconds;assert.ok(++moves<1000);}return {moves,seconds};}
test('free strokes follow the body, advance coverage once and survive a save',()=>{
 const s=ready(),j=s.garages[0].job;assert.equal(E.stroke(s,'wash',20,20),false);assert.equal(E.stroke(s,'rust',400,220),false);assert.ok(E.stroke(s,'wash',400,220));const p=j.progress[0];assert.equal(E.stroke(s,'wash',400,220),false);assert.equal(j.progress[0],p);assert.deepEqual(E.restore(E.serialize(s,1000),1000).state.garages[0].job,j);
 for(const [x,y] of surfacePoints())E.stroke(s,'wash',x,y);assert.equal(j.progress[0],100);assert.equal(E.taskIndex(j),1);
});
test('wheel must be unfastened, removed, replaced and fastened; stale robot work cannot repeat a bolt',()=>{
 const s=ready(2),j=s.garages[0].job;E.buySpecialist(s,2);assert.equal(E.movePart(s,'mount'),false);assert.equal(E.movePart(s,'remove'),false);
 const pending=E.robotAction(s);assert.ok(E.turnBolt(s,pending.id));assert.equal(E.performRobotAction(s,pending),false);assert.equal(j.wheelRepair.bolts.length,1);
 for(let i=1;i<5;i++)E.turnBolt(s,i);assert.equal(E.wheelState(j).phase,'remove');assert.ok(E.movePart(s,'remove'));assert.equal(E.movePart(s,'remove'),false);assert.ok(E.movePart(s,'mount'));for(let i=0;i<5;i++)E.turnBolt(s,i);assert.equal(j.progress[2],100);
});
test('engine requires three correctly paired connectors before its live test',()=>{
 const s=ready(3);assert.equal(E.testEngine(s,.5),false);assert.equal(E.connectWire(s,0,1),false);for(let i=0;i<3;i++)assert.ok(E.connectWire(s,i,i));assert.equal(E.connectWire(s,1,1),false);assert.equal(E.testEngine(s,.9),false);for(let i=0;i<3;i++)assert.ok(E.testEngine(s,.5));assert.equal(s.garages[0].job.progress[3],100);
});
test('a full specialist crew performs the same real repairs and earns only one payout',()=>{
 const s=ready();hireAll(s);const before=s.money,result=roboticFinish(s);assert.ok(result.moves>50);const r=E.completeJob(s,0,{automatic:true});assert.equal(s.money,before+r.amount);assert.equal(s.stats.manual,0);assert.equal(s.stats.autoEarned,r.amount);assert.equal(E.completeJob(s),null);
});
test('manual assistance reduces robot work; specialists never perform another profession',()=>{
 const s=ready(2);E.buySpecialist(s,2);for(let i=0;i<5;i++)E.turnBolt(s,i);E.movePart(s,'remove');E.movePart(s,'mount');for(let i=0;i<4;i++)E.turnBolt(s,i);const a=E.robotAction(s);assert.equal(a.id,4);assert.ok(E.performRobotAction(s,a));assert.equal(E.robotAction(s),null);
});
test('visible cooperative garage receives no parallel passive payout; other garages still run',()=>{
 const s=ready();hireAll(s);s.garages[0].completed=16;E.unlock(s,1);hireAll(s);const before=s.money;for(let i=0;i<5;i++)E.tick(s,60,{workingGarage:1});assert.ok(s.money>before);assert.equal(s.garages[1].completed,0);assert.equal(s.garages[1].job.progress[0],0);assert.ok(s.garages[0].completed>16);
});
test('an incomplete offline crew stops at its unstaffed stage without payment',()=>{
 const s=ready();E.buySpecialist(s,0);const before=s.money;E.tick(s,3600,{offline:true});assert.equal(s.money,before);assert.equal(s.garages[0].job.progress[0],100);assert.equal(s.garages[0].job.progress[1],0);assert.equal(E.totalRate(s),0);
});
test('specialists, repair steps and smooth coating persist independently by garage',()=>{
 const s=ready(2);hireAll(s);E.turnBolt(s,0);E.turnBolt(s,1);const raw=E.serialize(s,2000),r=E.restore(raw,2000).state;assert.deepEqual(r.garages[0].crew,[1,1,1,1,1]);assert.deepEqual(r.garages[0].job.wheelRepair.bolts,[0,1]);assert.equal(r.garages[1].robots,0);
 for(const mutate of [j=>j.surface={wash:[[NaN,1,25]]},j=>j.wires=[0,0],j=>j.wheelRepair={phase:'bad',bolts:[],tightened:[]}]){const broken=JSON.parse(raw);mutate(broken.garages[0].job);assert.throws(()=>E.restore(JSON.stringify(broken),2000));}
});
