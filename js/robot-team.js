import * as E from './engine.js?v=0.2.3';

// One reservation per physical robot. Individual speed avoids multiplying crew output twice.
export class RobotTeam {
 constructor(){this.reset();}
 reset(){this.pending=new Map();this.job=null;this.index=-1;this.deliveryAt=null;}
 step(state,now,{ready}={}){
  const index=state.active,g=state.garages[index],j=g.job,done=[];
  if(j!==this.job||index!==this.index){this.reset();this.job=j;this.index=index;}
  if(!j||!E.crewCount(g))return {done,deliver:false};
  for(const [id,p] of this.pending){
   if(p.act.task!==E.taskIndex(j)){this.pending.delete(id);continue;}
   let complete=now>=p.due;
   if(ready){const elapsed=Math.max(0,Math.min(100,now-p.last));p.last=now;if(ready(id,p))p.remaining-=elapsed;complete=p.remaining<=0;}
   if(complete){this.pending.delete(id);const before=E.taskIndex(j);if(E.performRobotAction(state,p.act))done.push({act:p.act,before});}
  }
  const task=E.taskIndex(j);
  for(const [id,p] of this.pending)if(p.act.task!==task)this.pending.delete(id);
  if(task<0){this.deliveryAt??=now+2000;return {done,deliver:now>=this.deliveryAt};}
  this.deliveryAt=null;
  for(let unit=0;unit<E.crew(g)[task];unit++){
   const id=`${task}-${unit}`;if(this.pending.has(id))continue;
   const act=E.robotAction(state,index,{individual:true,reserved:[...this.pending.values()].map(p=>p.act)});
   if(act)this.pending.set(id,{act,start:now,due:now+Math.max(250,act.seconds*1000),last:now,remaining:Math.max(250,act.seconds*1000)});
  }
  return {done,deliver:false};
 }
}
