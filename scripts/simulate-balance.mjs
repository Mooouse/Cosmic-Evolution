// Deterministic, optimistic 24/7 play simulation; a pacing estimate, not a player study.
import * as E from '../js/engine.js';
let s=E.newGame(0),elapsed=0,manualClock=0;const events=[],limit=30*86400,step=30;let evolutions=0;const withEvolution=process.argv.includes('--prestige');
while(elapsed<limit){
 E.tick(s,step);elapsed+=step;manualClock+=step;
 // One manual job/minute for the first hour, then 10 minutes each 4-hour session.
 const active=elapsed<3600||elapsed%(4*3600)<600;
 if(active&&manualClock>=60){manualClock=0;const j=E.createJob(s);j.progress=j.required.map(r=>r?100:0);E.completeJob(s);E.createJob(s);}
 const i=s.active,g=s.garages[i],next=E.GARAGES[i+1];
 for(const a of E.ACHIEVEMENTS)E.claimAchievement(s,a.id);
 if(next&&E.canUnlock(s,i+1)){E.unlock(s,i+1);events.push({garage:next.id,hours:+(elapsed/3600).toFixed(2)});continue;}
 if(!next)break;
 if(withEvolution&&((i===8&&evolutions===0)||(i===12&&evolutions===1))&&E.canPrestige(s)){s=E.evolve(s,elapsed*1000);evolutions++;events.push({evolution:evolutions,hours:+(elapsed/3600).toFixed(2),multiplier:E.multiplier(s)});continue;}
 // Upgrade the active shop to 4 robots, robot level 6, tool level 3; then save.
 if(g.robots<4&&s.money>=E.robotCost(s))E.buyRobot(s);
 else if(g.robots&&g.robotLevel<6&&s.money>=E.robotUpgradeCost(s))E.upgradeRobots(s);
 else {const tool=g.tools.findIndex(v=>v<3);if(tool>=0&&s.money>=E.toolCost(s,tool))E.upgradeTool(s,tool);}
}
console.log(JSON.stringify({strategy:`No ads; ${withEvolution?'two evolutions':'no prestige'}; 24/7 robots; short manual sessions; 4 robots, level 6; tools level 3`,hours:+(elapsed/3600).toFixed(2),lastGarage:E.GARAGES[s.active].id,events},null,2));
