// Visual functions from the approved v15.3 reference; no demo state or audio.
(()=>{'use strict';
function musicCover(i){const t={title:i===0?'First Light':'Transmission '+String(i+1).padStart(2,'0'),hue:[252,278,226,308,199,267,17,330][i%8],kind:i%8},h=t.hue,s=100+i*23;
 const points=Array.from({length:19},(_,j)=>{const x=(j*47+s*3)%300,y=(j*89+s)%300,r=(j%3===0?1.4:.7);return `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${j%3===0?.55:.28}"/>`}).join('');
 const art=[
 `<ellipse cx="154" cy="66" rx="104" ry="33" fill="none" stroke="#d9b6ff" stroke-width="4" transform="rotate(-23 154 66)" opacity=".75"/><circle cx="154" cy="66" r="39" fill="#090720" stroke="#ae80f5" stroke-width="3"/><path d="M74 90 Q150 50 240 34" stroke="#e9d6ff" stroke-width="3" fill="none" opacity=".8"/>`,
 `<path d="M0 68 Q55 9 108 69 T213 68 T316 64" stroke="#e7d6ff" stroke-width="7" fill="none" opacity=".65"/><path d="M0 90 Q60 36 111 91 T215 90 T315 85" stroke="#b88afe" stroke-width="2.4" fill="none"/><circle cx="151" cy="67" r="13" fill="#f1d8ff"/>`,
 `<path d="M18 90 C79 3 198 137 282 25" fill="none" stroke="#b4e8ff" stroke-width="10" opacity=".5"/><path d="M0 106 C74 20 184 148 300 30" fill="none" stroke="#e1f4ff" stroke-width="2.5"/><circle cx="130" cy="62" r="14" fill="#aab9ff"/>`,
 `<circle cx="150" cy="70" r="40" fill="#02020b" stroke="#f6a2e6" stroke-width="2"/><circle cx="150" cy="70" r="61" fill="none" stroke="#cc6cdb" stroke-width="7" opacity=".3"/><ellipse cx="150" cy="70" rx="100" ry="22" fill="none" stroke="#edb9e2" stroke-width="3" transform="rotate(16 150 70)"/>`,
 `<path d="M55 95 Q126 10 202 62 Q236 85 271 31" stroke="#a5ffe9" stroke-width="12" opacity=".3" fill="none"/><path d="M55 95 Q126 10 202 62 Q236 85 271 31" stroke="#c4fff5" stroke-width="2.7" fill="none"/><circle cx="193" cy="61" r="23" fill="#65c7ce"/>`,
 `<ellipse cx="150" cy="64" rx="105" ry="42" fill="none" stroke="#e9caff" stroke-width="2.5" transform="rotate(29 150 64)"/><circle cx="150" cy="64" r="33" fill="#030109" stroke="#bf88ff" stroke-width="5"/><circle cx="150" cy="64" r="53" fill="none" stroke="#9a6bfc" stroke-width="8" opacity=".25"/>`,
 `<path d="M0 105 88 39 120 80 184 16 217 76 300 25" fill="none" stroke="#ffc5a0" stroke-width="4"/><circle cx="185" cy="19" r="14" fill="#ffe6c8"/><circle cx="85" cy="41" r="6" fill="#ffb16d"/>`,
 `<path d="M42 113 Q138 -14 244 113" fill="none" stroke="#f1a8ff" stroke-width="2"/><path d="M62 102 Q149 -27 236 102" fill="none" stroke="#d680e8" stroke-width="6" opacity=".45"/><ellipse cx="153" cy="63" rx="31" ry="27" fill="#03010a" stroke="#edb6ff" stroke-width="3"/><circle cx="153" cy="63" r="4" fill="#ffe3ff"/>`
 ][t.kind];
 return `<svg viewBox="0 0 300 300" role="img" aria-label="Обложка: ${t.title}" preserveAspectRatio="xMidYMid meet"><defs><radialGradient id="m${i}g" cx="55%" cy="48%"><stop stop-color="hsl(${h} 60% 31%)"/><stop offset="1" stop-color="hsl(${h} 55% 7%)"/></radialGradient><radialGradient id="m${i}gl"><stop stop-color="white" stop-opacity=".65"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient></defs><rect width="300" height="300" fill="url(#m${i}g)"/><path d="M22 22h256v256H22z" stroke="white" stroke-opacity=".15" stroke-width="1.2" fill="none"/>${points}<circle cx="156" cy="150" r="100" fill="url(#m${i}gl)" opacity=".20"/><g transform="translate(0 85) scale(1 1.0)">${art}</g><path d="M27 248h52" stroke="white" stroke-width="2" stroke-opacity=".28"/><path d="M221 50h52" stroke="white" stroke-width="2" stroke-opacity=".28"/></svg>`;
}
function mediaSVG(which){
 const art={
  play:'<path fill="currentColor" d="M11 5.5c0-1.5 1.6-2.4 2.9-1.5l15 10c1.4.9 1.4 3 0 3.9l-15 10c-1.3.9-2.9 0-2.9-1.5Z"/>',
  pause:'<rect x="8" y="6" width="6.5" height="20" rx="1.2" fill="currentColor"/><rect x="19" y="6" width="6.5" height="20" rx="1.2" fill="currentColor"/>',
  prev:'<rect x="5" y="7" width="3.8" height="18" rx=".8" fill="currentColor"/><path d="M24.5 7.2v17.6c0 1.1-1.2 1.7-2.1 1.1L9.8 17.1a1.4 1.4 0 0 1 0-2.2L22.4 6c.9-.6 2.1 0 2.1 1.2Z" fill="currentColor"/>',
  next:'<rect x="23.2" y="7" width="3.8" height="18" rx=".8" fill="currentColor"/><path d="M7.5 7.2v17.6c0 1.1 1.2 1.7 2.1 1.1l12.6-8.8a1.4 1.4 0 0 0 0-2.2L9.6 6c-.9-.6-2.1 0-2.1 1.2Z" fill="currentColor"/>'
 };return `<svg class="media-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${art[which]||art.play}</svg>`;
}
const customSelects=[];
let openSelect=null;
function closeSelect(refocus=false){
 if(!openSelect)return;
 const state=openSelect;openSelect=null;
 state.menu.hidden=true;state.trigger.setAttribute('aria-expanded','false');state.root.classList.remove('is-open');
 if(refocus)state.trigger.focus();
}
function updateSelect(state){
 // Marker lists are rebuilt when a pin is created, edited or deleted.
 // Rebuild only when the native options change; never leave stale dropdown items.
 const options=[...state.native.options];
 const fingerprint=JSON.stringify(options.map(o=>[o.value,o.textContent,o.disabled]));
 if(state.optionsFingerprint!==fingerprint){
  state.optionsFingerprint=fingerprint;
  state.list.replaceChildren();
  options.forEach((opt,i)=>{
   const b=document.createElement('button');b.type='button';b.className='game-select-item';b.setAttribute('role','option');b.disabled=opt.disabled;
   const label=document.createElement('span');label.textContent=opt.textContent;
   const tick=document.createElement('span');tick.className='game-select-check';tick.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.4 12 13 4.8"/></svg>';
   b.append(label,tick);
   b.onclick=()=>{state.native.selectedIndex=i;state.native.dispatchEvent(new Event('change',{bubbles:true}));updateSelect(state);closeSelect(true);};
   state.list.append(b);
  });
 }
 const opt=state.native.options[state.native.selectedIndex];
 state.value.textContent=opt?opt.textContent:'Выбрать';
 state.trigger.disabled=state.native.disabled;
 state.root.classList.toggle('is-disabled',state.native.disabled);
 state.list.querySelectorAll('button').forEach((b,i)=>{
  b.classList.toggle('is-selected',i===state.native.selectedIndex);
  b.setAttribute('aria-selected',String(i===state.native.selectedIndex));
 });
}
function enhanceSelects(scope){for(const native of scope.querySelectorAll('select')){if(native.dataset.v15Select)return;native.dataset.v15Select='1';
 const root=document.createElement('div');root.className='game-select';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='game-select-trigger';trigger.setAttribute('aria-label',native.getAttribute('aria-label')||'Выбрать');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
 const value=document.createElement('span');value.className='game-select-value';trigger.append(value);
 const chevron=document.createElement('span');chevron.className='game-select-chevron';chevron.innerHTML='<svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 5 5 6 5-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"/></svg>';trigger.append(chevron);
 root.append(trigger);native.after(root);native.classList.add('native-select-visually-hidden');
 const menu=document.createElement('div');menu.className='game-select-pop';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',native.getAttribute('aria-label')||'Список');menu.hidden=true;
 const list=document.createElement('div');list.className='game-select-options';menu.append(list);document.body.append(menu);
 const state={root,trigger,value,chevron,native,menu,list};customSelects.push(state);
 function place(){const r=trigger.getBoundingClientRect();let roomBelow=innerHeight-r.bottom;let height=Math.min(300,native.options.length*51+15);const above=roomBelow<height+15&&r.top>height+15;
  menu.style.left=Math.max(8,Math.min(r.left,innerWidth-r.width-8))+'px';menu.style.top=(above?r.top-height-6:r.bottom+6)+'px';menu.style.width=r.width+'px';menu.style.maxHeight=Math.max(120,innerHeight-24)+'px';}
 trigger.addEventListener('click',()=>{if(native.disabled)return;if(openSelect===state){closeSelect();return;}closeSelect();openSelect=state;state.menu.hidden=false;state.root.classList.add('is-open');state.trigger.setAttribute('aria-expanded','true');updateSelect(state);place();});
 trigger.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Enter',' ','Home','End','Escape'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(e.key==='Escape'){closeSelect(true);return;}if(!openSelect){trigger.click();}if(!openSelect)return;const selected=[...list.querySelectorAll('button')];const curr=selected.indexOf(document.activeElement);const idx=(curr>=0?curr:native.selectedIndex);
  if(e.key==='Home')selected[0]?.focus();else if(e.key==='End')selected.at(-1)?.focus();else if(e.key==='ArrowDown')selected[(idx+1)%selected.length]?.focus();else if(e.key==='ArrowUp')selected[(idx-1+selected.length)%selected.length]?.focus();else if(['Enter',' '].includes(e.key))selected[Math.max(0,native.selectedIndex)]?.click();});
 list.addEventListener('keydown',e=>{const opts=[...list.querySelectorAll('button')];const i=opts.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeSelect(true)}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();opts[(i+(e.key==='ArrowDown'?1:opts.length-1))%opts.length]?.focus()}});
 state.observer=new MutationObserver(()=>updateSelect(state));state.observer.observe(native,{attributes:true,attributeFilter:['disabled'],childList:true,subtree:true,characterData:true});native.addEventListener('change',()=>updateSelect(state));
 updateSelect(state);
}
}
document.addEventListener('pointerdown',e=>{if(openSelect&&!openSelect.menu.contains(e.target)&&!openSelect.root.contains(e.target))closeSelect()});
window.addEventListener('scroll',()=>closeSelect(),true);
window.addEventListener('resize',()=>closeSelect());


function cleanupSelects(){closeSelect();customSelects.splice(0).forEach(s=>{s.observer.disconnect();s.menu.remove();});}
window.SpaceUIv15Behavior={musicCover,mediaSVG,enhanceSelects,cleanupSelects,closeSelect};
})();
