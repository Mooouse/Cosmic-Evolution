// v15.3 production adapter. Templates supply layout only; all state and actions
// come from this game's existing save, physics and economic functions.
if(window.SpaceUIv15Templates && document.createElement('template').content){
 const tpl=window.SpaceUIv15Templates, icons=window.SpaceUIv15Icons;
 const icon=n=>`<svg class="ui-symbol" viewBox="0 0 32 32" aria-hidden="true">${icons[n]||icons.star}</svg>`;
 const q=(root,s)=>root.querySelector(s),qa=(root,s)=>[...root.querySelectorAll(s)];
 const text=(root,s,value)=>{const e=q(root,s);if(e)e.textContent=value;};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const legacy={menu:showMainMenu,settings:showSettings,achievements:showAchievements,bestiary:showBestiary,statistics:showStatistics,music:showMusicShop,map:showMap,tutorial:showTutorial};
 function navigate(name){({menu:showMainMenu,play:resumeGame,map:showMap,settings:showSettings,upgrades:showV15Upgrades,evolution:showV15Evolution,achievements:showAchievements,bestiary:showBestiary,statistics:showStatistics,music:showMusicShop,tutorial:showTutorial}[name]||resumeGame)();}
 function translate(root){
  const lang=window.SpaceI18n?.language||'en';if(lang==='ru')return;
  const dictionary=window.SpaceUIv15Dictionary||{};const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){const key=node.nodeValue.trim(),entry=dictionary[key];if(entry)node.nodeValue=node.nodeValue.replace(key,entry[lang==='es'?1:0]);}
  qa(root,'[aria-label],[title]').forEach(e=>['aria-label','title'].forEach(a=>{const v=e.getAttribute(a),entry=dictionary[v];if(entry)e.setAttribute(a,entry[lang==='es'?1:0]);}));
  window.SpaceI18n?.refresh();
 }
 function decorate(root){
  qa(root,'[data-icon]').forEach(e=>e.innerHTML=icon(e.dataset.icon));
  qa(root,'[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
  qa(root,'input[type=range]').forEach(input=>{const sync=()=>{const value=+input.value,min=+input.min||0,max=+input.max||100;input.style.setProperty('--val',`${(value-min)/(max-min)*100}%`);const out=input.parentElement.querySelector('output');if(out)out.textContent=Math.round(value)+'%';};input.addEventListener('input',sync);sync();});
  translate(root);
 }
 function mount(name){
  const old=$('modal').firstElementChild,holder=document.createElement('template');holder.innerHTML=tpl[name];const root=holder.content.firstElementChild;root.classList.add('active');
  $('modal').replaceChildren(root);$('modal').dataset.screen=name;
  qa(root,'.br-settings-side-note,.br-readout-foot,.sub-footer,.br-head-tag,.menu-foot,.micro').forEach(e=>{if(/ДЕМО|DEMO|PREVIEW|ПРОТОТИП|СОХРАНЕНИЕ 01/.test(e.textContent))e.textContent='INFINITI SPACE · v3.38.0';});
  decorate(root);return {root,old};
 }
 showMainMenu=function(paused=false){legacy.menu(paused);const {root}=mount('menu');
  q(root,'.primary.big-play').onclick=()=>g.tutorialDone?resumeGame():showTutorial();q(root,'.quiet-btn').onclick=restartCampaign;
  q(root,'.quiet-btn').removeAttribute('aria-label');
  text(root,'.quiet-btn',L('NEW UNIVERSE','НОВАЯ ВСЕЛЕННАЯ','NUEVO UNIVERSO'));
  text(root,'.primary.big-play',paused||g.time>0?L('CONTINUE','ПРОДОЛЖИТЬ','CONTINUAR'):L('BEGIN EVOLUTION','НАЧАТЬ ЭВОЛЮЦИЮ','COMENZAR EVOLUCIÓN'));
  text(root,'.menu-foot',`${TA[g.tier].name} · ${timeFmt(g.time)} · v3.38.0`);
  const lang=q(root,'#language-control'),popup=q(lang,'#language-popup'),toggle=q(lang,'#lang-toggle');
  const selected=q(lang,`[data-lang="${window.SpaceI18n?.language||'en'}"]`);q(lang,'#current-language-flag').innerHTML=q(selected,'.flag-window').innerHTML;text(lang,'#current-language-code',selected.dataset.lang.toUpperCase());
  toggle.onclick=()=>{popup.hidden=!popup.hidden;toggle.setAttribute('aria-expanded',String(!popup.hidden));};
  lang.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();popup.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}};
  qa(lang,'[data-lang]').forEach(b=>{b.setAttribute('aria-selected',String(b===selected));b.onclick=()=>{window.SpaceI18n.setLanguage(b.dataset.lang);hud.remove();hud=buildHud();showMainMenu(paused);};});
  const sound=q(root,'[data-toggle="sound"]');if(sound)sound.setAttribute('aria-pressed',String(g.sound));if(sound)sound.onclick=()=>{g.sound=!g.sound;save();sound.setAttribute('aria-pressed',String(g.sound));};
 };
 showSettings=function(){legacy.settings();const {root,old}=mount('settings');
  const move=(target,id)=>{const n=q(old,'#'+id);q(root,target).replaceWith(n);return n;};
  move('[data-settings-pane="control"] select:nth-of-type(1)','set-control-mode');
  const controls=qa(root,'[data-settings-pane="control"] .br-option select');const feel=q(old,'#set-flight-feel');controls[1].replaceWith(feel);
  move('#br-quality','set-quality');
  const ranges=qa(root,'.br-slider input');['set-music-volume','set-sound-volume'].forEach((id,i)=>ranges[i].replaceWith(q(old,'#'+id)));
  qa(root,'.br-switch').forEach((button,i)=>{const input=q(old,'#'+['set-music','set-sound','set-particles','set-auto-quality'][i]);button.classList.toggle('active',input.checked);button.setAttribute('aria-checked',String(input.checked));input.hidden=true;button.after(input);button.onclick=()=>{input.checked=!input.checked;input.dispatchEvent(new Event('change',{bubbles:true}));button.classList.toggle('active',input.checked);button.setAttribute('aria-checked',String(input.checked));};});
  qa(root,'[data-settings-tab]').forEach(b=>b.onclick=()=>{qa(root,'[data-settings-tab]').forEach(n=>n.classList.toggle('active',n===b));qa(root,'[data-settings-pane]').forEach(n=>n.classList.toggle('active',n.dataset.settingsPane===b.dataset.settingsTab));});
  q(root,'#br-new-game').onclick=restartCampaign;
  q(root,'[data-settings-pane="graphics"] .br-warning').remove();
  text(root,'.br-controls>div:nth-child(5) kbd','ESC');
  qa(root,'[data-settings-pane="general"] .br-warning,.br-settings-side-note').forEach(n=>n.remove());
  text(root,'.br-readout-foot','INFINITI SPACE · v3.38.0');text(root,'.br-settings-foot>span',L('SETTINGS SAVED AUTOMATICALLY','НАСТРОЙКИ СОХРАНЯЮТСЯ АВТОМАТИЧЕСКИ','AJUSTES GUARDADOS AUTOMÁTICAMENTE'));
  decorate(root);
 };
 function showV15Upgrades(){show('');const {root}=mount('upgrades');const render=()=>{
  text(root,'#up-balance',fmt(g.credits));text(root,'.currency small',L('STARDUST','ЗВЁЗДНАЯ ПЫЛЬ','POLVO ESTELAR'));
  qa(root,'.up-row').forEach((row,i)=>{const u=upgrades[i],quote=upgradeQuote(u);text(row,'.up-desc strong',u.name);text(row,'.up-desc small',u.label);text(row,'.up-level',`${g.upgrade[u.id]} / ∞`);q(row,'.up-bonus')?.remove();const b=q(row,'.purchase');b.textContent=`+${quote.count} · ✦ ${Number.isFinite(quote.cost)?fmt(quote.cost):'∞'}`;b.disabled=!quote.count||!Number.isFinite(quote.cost)||quote.cost>g.credits;b.onclick=()=>{buy(u.id);render();};});
  qa(root,'[data-quantity]').forEach(b=>{b.classList.toggle('active',String(g.buyAmount)===b.dataset.quantity);b.onclick=()=>{setBuyAmount(b.dataset.quantity);render();};});const input=q(root,'#up-custom-qty');if(document.activeElement!==input)input.value=g.buyAmount==='max'?'':g.buyAmount;input.oninput=()=>{if(input.value&&setBuyAmount(input.value)!==false)render();};translate(root);
 };render();}
 showAchievements=function(){legacy.achievements();const {root,old}=mount('achievements');const list=q(root,'.br-ach-list');list.replaceChildren(...qa(old,'.achievement'));qa(list,'.achievement').forEach(n=>{n.classList.add('br-ach-row');n.dataset.rarity=[...n.classList].find(c=>c.startsWith('rarity-'))?.slice(7);n.children[0].className='br-ach-symbol '+n.dataset.rarity;n.children[1].classList.add('br-ach-copy');});
  const earned=Object.keys(g.achievements||{}).length;text(root,'.br-ach-big',`${earned} / ${ACHIEVEMENTS.length}`);text(root,'.br-ach-summary p',L('Your discoveries and milestones','Твои открытия и достижения','Tus descubrimientos y logros'));
  qa(root,'.br-filter').forEach(b=>b.onclick=()=>{qa(root,'.br-filter').forEach(n=>n.classList.toggle('active',n===b));const rarity=b.dataset.achFilter||'all';qa(list,'.achievement').forEach(n=>n.hidden=rarity!=='all'&&n.dataset.rarity!==rarity);});
 };
 showBestiary=function(){legacy.bestiary();const {root}=mount('bestiary');const buttons=qa(root,'[data-bestiary]');function select(i){const [id,t,title,desc]=FIELD_GUIDE[i];buttons.forEach((b,j)=>b.classList.toggle('selected',i===j));text(root,'#br-best-number',String(i+1).padStart(2,'0'));text(root,'#br-best-name',L(...title));text(root,'#br-best-desc',L(...desc));text(root,'#br-best-status',g.tier>=t?L('REACHED','ДОСТИГНУТО','ALCANZADO'):L('AHEAD','ВПЕРЕДИ','POR DESCUBRIR'));q(root,'#br-best-visual').className='br-best-planet '+({blackhole:'hole',planet:'rock',galaxy:'galaxy'}[id]||id);}
 buttons.forEach((b,i)=>{b.onclick=()=>select(i);b.children[1].textContent=`${String(i+1).padStart(2,'0')} / ${L(...FIELD_GUIDE[i][2])}`;b.querySelector('b').textContent=g.tier>=FIELD_GUIDE[i][1]?L('REACHED','ДОСТИГНУТО','ALCANZADO'):L('AHEAD','ВПЕРЕДИ','POR DESCUBRIR');});q(root,'.br-best-details>small')?.remove();select(0);
 };
 showStatistics=function(){legacy.statistics();const {root,old}=mount('statistics');const grid=q(root,'.br-stat-grid');grid.replaceChildren(...qa(old,'.stat-list>div'));text(root,'.br-simple-intro>span',`${g.tier+1} / 28 · ${TA[g.tier].name}`);text(root,'.br-simple-intro p',L('Your current journey','Твоё текущее прохождение','Tu viaje actual'));};
 function showV15Evolution(){renderUI(true);show('');const {root}=mount('evolution');text(root,'.overline',`${g.tier+1} / 28`);text(root,'.page-nav .muted-caps',TA[g.tier].epoch);text(root,'.display-heading',TA[g.tier].name);text(root,'.lead',TA[g.tier].desc);text(root,'.large-progress-label strong',`${TA[Math.min(27,g.tier+1)].name} · ${Math.round(stageFraction()*100)}%`);q(root,'.progress-bar span').style.width=stageFraction()*100+'%';q(root,'.stage-controls').remove();const recipe=q(root,'.recipe');recipe.replaceChildren($('materials-inventory').cloneNode(true),document.querySelector('.mission-panel').cloneNode(true));qa(recipe,'[id]').forEach(n=>n.removeAttribute('id'));}
 showMusicShop=function(){legacy.music();const {root,old}=mount('music');text(root,'#music-balance',fmt(g.credits));text(root,'.music-wallet small',L('STARDUST','ЗВЁЗДНАЯ ПЫЛЬ','POLVO ESTELAR'));text(root,'.music-heading p',q(old,'.overlay-copy').textContent);text(root,'.music-legend',`${g.ownedTracks.length} / ${MUSIC_TRACKS.length}`);const list=q(root,'#music-track-list');qa(old,'.track-row').forEach((row,i)=>{row.classList.add('music-track-card');const art=document.createElement('div');art.className='v15-track-art';art.style.setProperty('--track-hue',String(250+i*22));art.innerHTML=icon('music-note');row.prepend(art);list.append(row);});
  text(root,'#music-now-title',MUSIC_TRACKS.find(t=>t.id===g.activeTrack)?.title||'First Light');text(root,'#music-now-detail',g.music?L('Playing','Играет','Sonando'):L('Paused','Пауза','Pausa'));
  if(g.music)q(root,'#music-play-glyph').innerHTML='<svg class="media-icon" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M8 6h6v20H8zM19 6h6v20h-6z"/></svg>';
  q(root,'#music-play').onclick=()=>{g.music=!g.music;initAudio();setMusicVolume();save();showMusicShop();};['#music-prev','#music-next'].forEach((sel,i)=>q(root,sel).onclick=()=>{const owned=MUSIC_TRACKS.filter(t=>g.ownedTracks.includes(t.id)&&(t.id===0||t.src));const index=owned.findIndex(t=>t.id===g.activeTrack);if(chooseTrack(owned[(index+(i?1:-1)+owned.length)%owned.length]))showMusicShop();});
  const volume=q(root,'#music-volume');volume.value=Math.round(g.musicVolume*100);volume.oninput=()=>{g.musicVolume=+volume.value/100;setMusicVolume();save();};
  const seek=q(root,'#music-seek');const duration=externalMusic?.duration;if(Number.isFinite(duration)&&duration>0){seek.max=duration;seek.value=externalMusic.currentTime;seek.oninput=()=>externalMusic.currentTime=+seek.value;text(root,'#music-duration',timeFmt(duration));text(root,'#music-position',timeFmt(externalMusic.currentTime));}else{q(root,'.music-player-timeline').hidden=true;}
  decorate(root);
 };
 // Keep the atlas renderer and all marker editing controls in their live DOM.
 showMap=function(){legacy.map();const {root,old}=mount('map');
  q(root,'.header-right button').setAttribute('aria-label',L('Settings','Настройки','Ajustes'));
  q(root,'#atlas').replaceWith(q(old,'#atlas-canvas'));
  q(root,'#atlas-pin-menu').remove();q(root,'.map-scale').remove();
  const left=q(root,'.map-corner.left');q(left,'.map-stats').replaceWith(q(old,'.atlas-stats'));
  q(left,'#pin-add').replaceWith(q(old,'#atlas-pin-add'));q(left,'#pin-status').replaceWith(q(old,'#atlas-pin-hint'));
  const details=document.createElement('details');details.className='v15-map-details';const summary=document.createElement('summary');summary.textContent=L('Scale & saved markers','Масштаб и сохранённые метки','Escala y marcas guardadas');details.append(summary,q(old,'.atlas-measures'),q(old,'.atlas-pins'));left.append(details);
  [['#zoom-in','#atlas-zoom-in'],['#zoom-out','#atlas-zoom-out'],['#map-center','#atlas-center']].forEach(([to,from])=>q(root,to).replaceWith(q(old,from)));
  q(root,'.map-threat').replaceChildren(q(old,'#atlas-threat'),q(old,'#atlas-abyss'));
  q(root,'.map-footer .legend').replaceWith(q(old,'.atlas-legend'));atlasFitPlayer();atlas.dirty=true;translate(root);
 };
 showTutorial=function(){show('');const {root}=mount('tutorial');
  const articles=qa(root,'.br-tutorial article');
  text(articles[2],'p',L('Gather mass and the materials in your evolution recipe. M opens the atlas. Right-click to name and colour a marker; on a phone use + Marker. A larger black hole ends your run.','Собирай массу и материалы из рецепта эволюции. M открывает карту. ПКМ создаёт метку с именем и цветом; на телефоне — + Метка. Большая чёрная дыра завершит прохождение.','Reúne masa y los materiales de tu receta. M abre el atlas. Clic derecho crea una marca con nombre y color; en móvil usa + Marca. Un agujero negro mayor termina tu partida.'));
  q(root,'.br-tutorial-done').onclick=()=>{g.tutorialDone=true;save();resumeGame();};
 };
 const oldOpenEvolution=openEvolution;openEvolution=()=>{if($('modal').dataset.screen==='evolution'&&!$('modal').classList.contains('off'))resumeGame();else showV15Evolution();};
 $('btn-evolution').onclick=openEvolution;$('btn-stage-details').onclick=openEvolution;
 function buildHud(){const holder=document.createElement('template');holder.innerHTML=tpl.play;const hud=holder.content.firstElementChild;hud.classList.add('active','v15-hud');$('hud').append(hud);decorate(hud);
 q(hud,'#upgrade-drawer').remove();q(hud,'#upgrades-open').onclick=showV15Upgrades;q(hud,'#pulse').onclick=activatePulse;q(hud,'#dash').onclick=activateBoost;q(hud,'#view-mode').remove();
 return hud;}
 let hud=buildHud();
 const originalRender=renderUI;renderUI=function(...args){originalRender(...args);refreshV15();};
 function refreshV15(){
  const visible=$('modal').classList.contains('off');hud.style.display=visible?'block':'none';
  const resources=qa(hud,'.hud-resources strong');resources[0].textContent=$('matter-value').textContent;resources[1].textContent=fmt(g.credits);resources[2].textContent=timeFmt(g.time);
  text(hud,'.hud-resources small',$('matter-label').textContent);text(hud,'.hud-sub',TA[g.tier].epoch);text(hud,'.world-coords',$('world-subtitle').textContent);
  text(hud,'#mass-number',$('matter-value').textContent);text(hud,'#radius-number',$('radius-value').textContent);text(hud,'.mass-details .mass-detail:last-child strong',Math.round(g.viewZoom*100)+'%');
  text(hud,'.evo-title>span:first-child',`${g.tier+1} / 28 · ${TA[g.tier].name}`);text(hud,'.evo-title>span:nth-child(2)',g.endless?'∞':TA[Math.min(27,g.tier+1)].name);text(hud,'.evo-aux b',Math.round(stageFraction()*100)+'%');q(hud,'.progress-bar span').style.width=stageFraction()*100+'%';text(hud,'#player-label-text',TA[g.tier].name);text(hud,'.player-label small',`${g.tier+1} / 28`);text(hud,'#pulse small',$('pulse-cooldown').textContent);text(hud,'#dash small',$('boost-cooldown').textContent);text(hud,'#upgrades-open b',Object.values(g.upgrade).reduce((a,b)=>a+b,0));
 }
 const originalResume=resumeGame;resumeGame=function(){originalResume();refreshV15();};
 if(TEST_MODE){const b=document.createElement('button');b.className='v15-tester';b.textContent='</>';b.setAttribute('aria-label','Tester panel');b.onclick=()=>testerToggle();document.body.append(b);}
 document.body.classList.add('ui-v15');
 refreshV15();
}
