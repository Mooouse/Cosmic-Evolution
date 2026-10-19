export const ROBOT_COLORS=['#64d5fa','#f7b260','#8ae0b6','#c1a0ff','#fb8fac'];
const n=x=>Number(x.toFixed(2));
export function crewLayout(counts,task,width,height){
 const mobile=width<600,units=[],parked=counts.reduce((sum,c,r)=>sum+(r===task?0:c),0),cols=Math.min(mobile?8:14,Math.max(1,parked));let dock=0;
 counts.forEach((count,role)=>{for(let unit=0;unit<count;unit++){
  const active=role===task,slot=dock,scale=active?(mobile?.65:.9):(mobile?.36:.48);
  const x=active?width*(.09+.82*(unit+.5)/count):width*(.06+.88*(slot%cols+.5)/cols);
  const y=active?height-(mobile?181:150):100+Math.floor(slot/cols)*(mobile?29:38);
  if(!active)dock++;units.push({id:`${role}-${unit}`,role,unit,x,y,scale,active});
 }});return units;
}
// Telescopic forearm reaches the real work point, even across a wide vehicle.
export function armGeometry(base,target,scale=1,bend=1){
 const shoulder={x:base.x,y:base.y-34*scale},dx=target.x-shoulder.x,dy=target.y-shoulder.y,d=Math.hypot(dx,dy)||1;
 const bow=Math.min(66*scale,d*.28);
 return {shoulder,elbow:{x:shoulder.x+dx*.46-dy/d*bow*bend,y:Math.max(62,shoulder.y+dy*.46+dx/d*bow*bend)},tip:target};
}
function tool(role,working,paint){
 const fx=working?' tool-live':'';
 if(role===0||role===4)return `<g><path d="M-31-9h16v13h-7l-3 10h-7Z" fill="#91a5b6" stroke="#172838" stroke-width="2"/>${role===4?'<rect x="-30" y="-23" width="13" height="14" rx="3" fill="#e9eff3"/>':'<path d="M-31 8q-15 8-17 20" fill="none" stroke="#41677e" stroke-width="4"/>'}<path d="M-15-4h6v7h-6Z" fill="#d4e2ed"/><path class="tool-effect${fx}" d="m-9-2 17-10v24L-9 2Z" fill="${role===0?'#9cddff':paint}" opacity=".5"/><path class="tool-effect${fx}" d="m-5 0 14 0m-12-4 10-5m-10 13 10 5" stroke="${role===0?'#e0f6ff':paint}" stroke-width="1.6"/></g>`;
 if(role===1)return `<rect x="-30" y="-7" width="25" height="14" rx="4" fill="#768b9f"/><circle cx="0" cy="0" r="11" fill="#273d50" stroke="#c8d6df" stroke-width="4"/><path class="tool-effect${fx}" d="m8-7 14-12m-10 21 17 5m-21 2 10 14" stroke="#ffd98a" stroke-width="2"/>`;
 if(role===2)return '<path d="M-32-5h20v10h-20Z" fill="#879db1" stroke="#263c50" stroke-width="2"/><circle r="10" fill="#182b3d" stroke="#d1e2ed" stroke-width="4"/><path d="m-4-5 8 0 3 5-3 5h-8l-3-5Z" fill="#8ae0b6"/>';
 return `<path d="M-29-7h17v14h-17Z" fill="#8f9aab" stroke="#22364a" stroke-width="2"/><path d="M-12 0H0" stroke="#e6b879" stroke-width="4"/><path class="tool-effect${fx}" d="m-2-7 5-7m2 12 8-3m-8 9 5 7" stroke="#d7b2ff" stroke-width="2"/>`;
}
export function rigMarkup(u,target,working=false,paint='#fb8fac'){
 const c=ROBOT_COLORS[u.role],s=u.scale,{shoulder:a,elbow:b,tip:t}=armGeometry(u,target,s,u.unit%2?1:-1);
 const points=`${n(a.x)},${n(a.y)} ${n(b.x)},${n(b.y)} ${n(t.x)},${n(t.y)}`;
 const angle=Math.atan2(t.y-b.y,t.x-b.x)*180/Math.PI;
 return `<g data-robot-id="${u.id}" class="industrial-rig ${working?'is-working':''}" style="--rig-color:${c}">
 <g transform="translate(${n(u.x)} ${n(u.y)}) scale(${s})"><ellipse cy="9" rx="39" ry="9" fill="#07121a55"/><rect x="-34" y="-11" width="68" height="23" rx="11" fill="#172734" stroke="#678397" stroke-width="2"/>${[-23,-8,8,23].map(x=>`<circle cx="${x}" cy="1" r="6" fill="#3f596c" stroke="#91a9b9" stroke-width="1.5"/>`).join('')}<path d="M-27-12-21-27H21L27-12Z" fill="${c}" stroke="#233e51" stroke-width="3"/><path d="M-16-25v-15h32v15" fill="#546f84" stroke="#b2c7d5" stroke-width="2"/><rect x="-13" y="-20" width="26" height="6" rx="2" fill="#142d3e"/><circle cx="19" cy="-18" r="3" fill="${working?'#d9fff1':c}"/><text x="0" y="-14.5" font-size="6" text-anchor="middle" fill="#d8eaf3" font-family="monospace">${['WASH','SAND','MECH','TECH','PAINT'][u.role]} ${u.unit+1}</text></g>
 <path class="arm-cable" d="M${n(a.x)} ${n(a.y)} Q${n(b.x-12*s)} ${n(b.y+18*s)} ${n(t.x-12*s)} ${n(t.y+8*s)}" fill="none" stroke="#182c3c" stroke-width="${4*s}"/>
 <polyline class="arm-outline" points="${points}" fill="none" stroke="#132a3c" stroke-width="${17*s}" stroke-linecap="round" stroke-linejoin="round"/>
 <path class="arm-upper" d="M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}" stroke="${c}" stroke-width="${11*s}" stroke-linecap="round"/>
 <path class="arm-forearm" d="M${n(b.x)} ${n(b.y)}L${n(t.x)} ${n(t.y)}" stroke="#a4bbcc" stroke-width="${8*s}" stroke-linecap="round"/>
 <path class="arm-sleeve" d="M${n(b.x)} ${n(b.y)}L${n(b.x+(t.x-b.x)*.5)} ${n(b.y+(t.y-b.y)*.5)}" stroke="${c}" stroke-width="${12*s}" stroke-linecap="round"/>
 ${[a,b].map(p=>`<circle class="arm-joint" cx="${n(p.x)}" cy="${n(p.y)}" r="${9*s}" fill="#d0dce5" stroke="#2c465b" stroke-width="${3*s}"/><circle class="arm-joint" cx="${n(p.x)}" cy="${n(p.y)}" r="${3*s}" fill="#506c83"/>`).join('')}
 <g class="rig-tool" transform="translate(${n(t.x)} ${n(t.y)}) rotate(${n(angle)}) scale(${s})">${tool(u.role,working,paint)}</g></g>`;
}
export function robotSVG(task,mini=false){return `<svg class="worker-svg ${mini?'mini-worker':''}" viewBox="0 0 175 150" aria-hidden="true">${rigMarkup({id:`preview-${task}`,role:task,unit:0,x:57,y:125,scale:1.15},{x:145,y:48},false)}</svg>`;}

const bindings=new WeakMap();
export function setRigPose(node,u,target,working){
 let refs=bindings.get(node);if(!refs){refs={};for(const k of ['cable','outline','upper','forearm','sleeve'])refs[k]=node.querySelector('.arm-'+k);refs.joints=[...node.querySelectorAll('.arm-joint')];refs.tool=node.querySelector('.rig-tool');bindings.set(node,refs);}
 const s=u.scale,{shoulder:a,elbow:b,tip:t}=armGeometry(u,target,s,u.unit%2?1:-1);
 refs.cable.setAttribute('d',`M${n(a.x)} ${n(a.y)} Q${n(b.x-12*s)} ${n(b.y+18*s)} ${n(t.x-12*s)} ${n(t.y+8*s)}`);
 refs.outline.setAttribute('points',`${n(a.x)},${n(a.y)} ${n(b.x)},${n(b.y)} ${n(t.x)},${n(t.y)}`);
 refs.upper.setAttribute('d',`M${n(a.x)} ${n(a.y)}L${n(b.x)} ${n(b.y)}`);
 refs.forearm.setAttribute('d',`M${n(b.x)} ${n(b.y)}L${n(t.x)} ${n(t.y)}`);
 refs.sleeve.setAttribute('d',`M${n(b.x)} ${n(b.y)}L${n(b.x+(t.x-b.x)*.5)} ${n(b.y+(t.y-b.y)*.5)}`);
 refs.joints.forEach((el,i)=>{const p=i<2?a:b;el.setAttribute('cx',n(p.x));el.setAttribute('cy',n(p.y));});
 refs.tool.setAttribute('transform',`translate(${n(t.x)} ${n(t.y)}) rotate(${n(Math.atan2(t.y-b.y,t.x-b.x)*180/Math.PI)}) scale(${s})`);
 node.classList.toggle('is-working',working);
}
