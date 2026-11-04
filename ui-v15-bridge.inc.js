// v15.3 production adapter. Templates supply layout only; all state and actions
// come from this game's existing save, physics and economic functions.
if(window.SpaceUIv15Templates && document.createElement('template').content){
 const tpl=window.SpaceUIv15Templates, icons=window.SpaceUIv15Icons, visual=window.SpaceUIv15Behavior;
 const label=(root,selector,value)=>{const e=q(root,selector);if(!e)return;const n=[...e.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(n)n.textContent=' '+value+' ';};
 const icon=n=>`<svg class="ui-symbol" viewBox="0 0 32 32" fill="none" aria-hidden="true">${icons[n]||icons.star}</svg>`;
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
  stopMusicPreview();visual?.cleanupSelects();const old=$('modal').firstElementChild,holder=document.createElement('template');holder.innerHTML=tpl[name];const root=holder.content.firstElementChild;root.classList.add('active');
  $('modal').replaceChildren(root);$('modal').dataset.screen=name;
  qa(root,'.br-settings-side-note,.br-readout-foot,.sub-footer,.br-head-tag,.micro').forEach(e=>{if(/ДЕМО|DEMO|PREVIEW|ПРОТОТИП|СОХРАНЕНИЕ 01/.test(e.textContent))e.textContent='INFINITI SPACE · v3.39.0';});
  decorate(root);return {root,old};
 }
 showMainMenu=function(paused=false){legacy.menu(paused);const {root}=mount('menu');
  q(root,'.primary.big-play').onclick=()=>g.tutorialDone?resumeGame():showTutorial();q(root,'.quiet-btn').onclick=restartCampaign;
  q(root,'.quiet-btn').removeAttribute('aria-label');
  label(root,'.quiet-btn',L('NEW UNIVERSE','НОВАЯ ВСЕЛЕННАЯ','NUEVO UNIVERSO'));
  label(root,'.primary.big-play',paused||g.time>0?L('CONTINUE','ПРОДОЛЖИТЬ','CONTINUAR'):L('BEGIN EVOLUTION','НАЧАТЬ ЭВОЛЮЦИЮ','COMENZAR EVOLUCIÓN'));
  text(root,'.menu-foot .caption-tag',L('YOUR JOURNEY','ТВОЙ ПУТЬ','TU VIAJE'));text(root,'.menu-foot>span:nth-child(2)',TA[g.tier].epoch);q(root,'.menuprog>div').style.width=stageFraction()*100+'%';text(root,'.menu-foot .mint',Math.round(stageFraction()*100)+'%');text(root,'.menu-foot>span:last-child',`${timeFmt(g.time)} · v3.39.0`);
  const lang=q(root,'#language-control'),popup=q(lang,'#language-popup'),toggle=q(lang,'#lang-toggle');
  const selected=q(lang,`[data-lang="${window.SpaceI18n?.language||'en'}"]`);q(lang,'#current-language-flag').innerHTML=q(selected,'.flag-window').innerHTML;text(lang,'#current-language-code',selected.dataset.lang.toUpperCase());
  toggle.onclick=()=>{popup.hidden=!popup.hidden;toggle.setAttribute('aria-expanded',String(!popup.hidden));};
  root.addEventListener('pointerdown',e=>{if(!lang.contains(e.target)){popup.hidden=true;toggle.setAttribute('aria-expanded','false');}});
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
  text(root,'.br-readout-foot','INFINITI SPACE · v3.39.0');text(root,'.br-settings-foot>span',L('SETTINGS SAVED AUTOMATICALLY','НАСТРОЙКИ СОХРАНЯЮТСЯ АВТОМАТИЧЕСКИ','AJUSTES GUARDADOS AUTOMÁTICAMENTE'));
  q(root,'#set-sound-volume').setAttribute('aria-label',L('Effects volume','Громкость эффектов','Volumen de efectos'));decorate(root);visual?.enhanceSelects(root);
 };
 function showV15Upgrades(){show('');const {root}=mount('upgrades');const render=()=>{
  text(root,'#up-balance',fmt(g.credits));text(root,'.currency small',L('STARDUST','ЗВЁЗДНАЯ ПЫЛЬ','POLVO ESTELAR'));
  qa(root,'.up-row').forEach((row,i)=>{const u=upgrades[i],quote=upgradeQuote(u);text(row,'.up-desc strong',u.name);text(row,'.up-desc small',u.label);text(row,'.up-level',`${g.upgrade[u.id]} / ∞`);text(row,'.up-bonus',L('EFFECTIVE POWER','ЭФФЕКТИВНАЯ СИЛА','POTENCIA EFECTIVA')+' · '+upgradePower(u.id).toFixed(2));const b=q(row,'.purchase');b.textContent=L('BUY','КУПИТЬ','COMPRAR')+` ×${quote.count} · ✦ ${Number.isFinite(quote.cost)?fmt(quote.cost):'∞'}`;b.classList.toggle('insufficient',!quote.count||quote.cost>g.credits);b.disabled=!quote.count||!Number.isFinite(quote.cost)||quote.cost>g.credits;b.onclick=()=>{buy(u.id);render();};});
  qa(root,'[data-quantity]').forEach(b=>{b.classList.toggle('active',String(g.buyAmount)===b.dataset.quantity);b.onclick=()=>{setBuyAmount(b.dataset.quantity);render();};});const input=q(root,'#up-custom-qty');if(document.activeElement!==input)input.value=g.buyAmount==='max'?'':g.buyAmount;input.oninput=()=>{if(input.value&&setBuyAmount(input.value)!==false)render();};translate(root);
 };render();}
 showAchievements=function(){legacy.achievements();const {root}=mount('achievements');const list=q(root,'.br-ach-list');
  list.innerHTML=ACHIEVEMENTS.map(a=>{const [rarity,color]=RARITIES[a[1]],done=!!g.achievements?.[a[0]],progress=done?100:achievementProgress(a);return `<div class="br-ach-row" data-rarity="${rarity}" style="--rarity:${color}"><div class="br-ach-symbol ${rarity}">${icon(({common:'check',uncommon:'star',rare:'compass',epic:'orbit',legendary:'trophy',mythic:'star'})[rarity])}</div><div class="br-ach-copy"><span class="br-ach-rarity ${rarity}">${L(...RARITIES[a[1]][2])}</span><strong>${esc(L(...a[2]))}</strong><small>${fmt(achievementValue(a[3]))} / ${fmt(a[4])} ${goalLabel(a[3])}</small><div class="br-ach-prog" role="progressbar" aria-label="${esc(L(...a[2]))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div></div><b>${progress===100?'100':progress>0&&progress<.01?'&lt;0.01':progress.toFixed(1)}%</b></div>`;}).join('');
  const earned=Object.keys(g.achievements||{}).length;q(root,'.br-ach-big').innerHTML=`${earned}<span>/${ACHIEVEMENTS.length}</span>`;text(root,'.br-ach-summary p',L('Your discoveries and milestones','Твои открытия и достижения','Tus descubrimientos y logros'));
  qa(root,'.br-filter').forEach(b=>b.onclick=()=>{qa(root,'.br-filter').forEach(n=>n.classList.toggle('active',n===b));qa(list,'.br-ach-row').forEach(n=>n.hidden=b.dataset.achFilter!=='all'&&n.dataset.rarity!==b.dataset.achFilter);});
 };
 showBestiary=function(){legacy.bestiary();const {root}=mount('bestiary');const buttons=qa(root,'[data-bestiary]');function select(i){const [id,t,title,desc]=FIELD_GUIDE[i];buttons.forEach((b,j)=>b.classList.toggle('selected',i===j));text(root,'#br-best-number',String(i+1).padStart(2,'0'));text(root,'#br-best-name',L(...title));text(root,'#br-best-desc',L(...desc));text(root,'#br-best-status',g.tier>=t?L('REACHED','ДОСТИГНУТО','ALCANZADO'):L('AHEAD','ВПЕРЕДИ','POR DESCUBRIR'));q(root,'#br-best-visual').className='br-best-planet '+({blackhole:'hole',planet:'rock',galaxy:'galaxy'}[id]||id);}
 buttons.forEach((b,i)=>{b.onclick=()=>select(i);b.children[1].textContent=`${String(i+1).padStart(2,'0')} / ${L(...FIELD_GUIDE[i][2])}`;b.querySelector('b').textContent=g.tier>=FIELD_GUIDE[i][1]?L('REACHED','ДОСТИГНУТО','ALCANZADO'):L('AHEAD','ВПЕРЕДИ','POR DESCUBRIR');});q(root,'.br-best-details>small')?.remove();select(0);
 };
 showStatistics=function(){legacy.statistics();const {root,old}=mount('statistics');const grid=q(root,'.br-stat-grid');grid.replaceChildren(...qa(old,'.stat-list>div'));text(root,'.br-simple-intro>span',`${g.tier+1} / 28 · ${TA[g.tier].name}`);text(root,'.br-simple-intro p',L('Your current journey','Твоё текущее прохождение','Tu viaje actual'));};
 function showV15Evolution(){renderUI(true);show('');const {root}=mount('evolution'),tier=g.tier; text(root,'.overline',`${tier+1} / 28`);text(root,'.page-nav .muted-caps',TA[tier].epoch);const words=TA[tier].name.split(' ');q(root,'.display-heading').innerHTML=esc(words.shift())+'<br><em>'+esc(words.join(' ')||'·')+'</em>';text(root,'.lead',TA[tier].desc);text(root,'.large-progress-label strong',g.endless?L('INFINITE GROWTH','БЕСКОНЕЧНЫЙ РОСТ','CRECIMIENTO INFINITO'):`${TA[Math.min(27,tier+1)].name} · ${Math.round(stageFraction()*100)}%`);q(root,'.progress-bar span').style.width=stageFraction()*100+'%';
  const stages=q(root,'.stage-controls');stages.replaceChildren();for(let i=Math.max(0,tier-1);i<=Math.min(27,tier+1);i++){const b=document.createElement('span');b.className='pill-button '+(i===tier?'active':i>tier?'disabled':'');b.textContent=`${i+1} ${TA[i].name}`;stages.append(b);}
  const recipe=q(root,'.recipe'),req=g.endless?[]:stageRecipe();text(root,'.recipe-head b',`${req.filter(r=>(g.materials[r.type]||0)>=r.amount).length} / ${req.length}`);qa(recipe,'.recipe-row').forEach(n=>n.remove());const foot=q(recipe,'.recipe-foot');
  req.forEach(({type,amount})=>{const m=MATERIALS[type],v=g.materials[type]||0,row=document.createElement('div');row.className='recipe-row';row.innerHTML=`<span class="material-icon ${type==='ore'?'rock':type}" style="--material-color:${m.color}"></span><div>${esc(window.SpaceI18n?.t(m.label)||m.label)}<small>${v>=amount?L('READY','ГОТОВО','LISTO'):L('Still needed: ','Не хватает: ','Faltan: ')+fmt(amount-v)}</small></div><b>${fmt(v)} / ${fmt(amount)}</b><span class="req-dot ${v>=amount?'ready':''}"></span>`;recipe.insertBefore(row,foot);});
  text(foot,'.overline',L('EVOLUTION OBJECTIVES','ЗАДАЧИ ЭВОЛЮЦИИ','OBJETIVOS DE EVOLUCIÓN'));qa(foot,':scope>div:not(.overline)').forEach((row,i)=>{row.innerHTML=esc($('mission-'+(i+1)+'-label').textContent)+'<b>'+esc($('mission-'+(i+1)+'-val').textContent)+'</b>';});
  if(g.endless)text(root,'.recipe-head>span',L('BEYOND THE HORIZON','ЗА ГОРИЗОНТОМ','MÁS ALLÁ DEL HORIZONTE'));translate(root);
 }
 const trackCover=(t,i)=>t.cover?`<img src="${esc(t.cover)}" alt="${esc(t.title)}" loading="lazy" decoding="async" width="360" height="360">`:visual.musicCover(i);
 showMusicShop=function(){legacy.music();const {root,old}=mount('music');text(root,'#music-balance',fmt(g.credits));text(root,'.music-wallet small',L('STARDUST','ЗВЁЗДНАЯ ПЫЛЬ','POLVO ESTELAR'));text(root,'.music-heading p',q(old,'.overlay-copy').textContent);text(root,'.music-eyebrow',L('SOUNDTRACK','САУНДТРЕК','BANDA SONORA')+' / '+MUSIC_TRACKS.length+' '+L('TRACKS','КОМПОЗИЦИЙ','PISTAS'));text(root,'#music-owned-count',`${g.ownedTracks.length} / ${MUSIC_TRACKS.length} `+L('unlocked','открыто','desbloqueadas'));const legend=q(root,'.music-legend');[...legend.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.textContent='');q(root,'.legend-sep')?.remove();
  const list=q(root,'#music-track-list');const subtitles=[L('Ambient · first spark','Эмбиент · первая искра','Ambiente · primera chispa'),L('Pulsar · distant signal','Пульсар · далёкий сигнал','Púlsar · señal lejana'),L('Stellar wind','Звёздный ветер','Viento estelar'),L('Night horizon','Ночной горизонт','Horizonte nocturno'),L('Galactic depth','Галактическая глубина','Profundidad galáctica'),L('Echo of the abyss','Эхо бездны','Eco del abismo'),L('Beyond the horizon','За горизонтом','Más allá del horizonte'),L('The last singularity','Последняя сингулярность','La última singularidad')];
  list.innerHTML=MUSIC_TRACKS.map((t,i)=>{const owned=g.ownedTracks.includes(t.id),chosen=g.activeTrack===t.id,available=t.id===0||!!t.src;return `<article class="music-track-card ${chosen?'selected':''}" data-track-index="${i}"><div class="music-cover">${trackCover(t,i)}<span class="music-cover-index">${String(i+1).padStart(2,'0')} / ${String(MUSIC_TRACKS.length).padStart(2,'0')}</span></div><div class="music-track-meta"><strong>${esc(t.title)}</strong><small>${esc(t.subtitle||subtitles[i]||'')}</small></div><div class="music-track-actions"><span class="music-track-price">${owned?'✓ '+L('UNLOCKED','ОТКРЫТ','ABIERTO'):'✦ '+fmt(t.price)}</span><button class="music-track-preview" data-preview="${i}" aria-label="${esc(L('Listen: ','Слушать: ','Escuchar: ')+t.title)}" ${available?'':'disabled'}>${visual.mediaSVG('play')}</button><button data-music-action="${i}" class="${owned?(chosen?'chosen':'owned'):''}" ${available?'':'disabled'}>${!available?L('COMING SOON','СКОРО','PRÓXIMAMENTE'):owned?(chosen?L('SELECTED','ВЫБРАНО','ELEGIDA'):L('SELECT','ВЫБРАТЬ','ELEGIR')):L('BUY','КУПИТЬ','COMPRAR')}</button></div></article>`;}).join('');
  const activeIndex=Math.max(0,MUSIC_TRACKS.findIndex(t=>t.id===g.activeTrack));q(root,'#music-player-art').innerHTML=trackCover(MUSIC_TRACKS[activeIndex],activeIndex);text(root,'#music-now-title',MUSIC_TRACKS[activeIndex].title);text(root,'#music-now-detail',g.music?L('Playing','Играет','Sonando'):L('Paused','Пауза','Pausa'));q(root,'#music-play-glyph').innerHTML=visual.mediaSVG(g.music?'pause':'play');
  qa(root,'[data-music-action]').forEach(b=>b.onclick=()=>{if(chooseTrack(MUSIC_TRACKS[+b.dataset.musicAction]))showMusicShop();});qa(root,'[data-preview]').forEach(b=>b.onclick=()=>{const t=MUSIC_TRACKS[+b.dataset.preview];if(b.getAttribute('aria-pressed')==='true'){stopMusicPreview();b.innerHTML=visual.mediaSVG('play');b.setAttribute('aria-pressed','false');return;}if(!t.src){chooseTrack(t);showMusicShop();return;}qa(root,'[data-preview]').forEach(n=>{n.innerHTML=visual.mediaSVG('play');n.setAttribute('aria-pressed','false');});b.innerHTML=visual.mediaSVG('pause');b.setAttribute('aria-pressed','true');previewMusicTrack(t,()=>{if(b.isConnected){b.innerHTML=visual.mediaSVG('play');b.setAttribute('aria-pressed','false');}});});

  q(root,'#music-play').onclick=()=>{g.music=!g.music;initAudio();setMusicVolume();save();showMusicShop();};['#music-prev','#music-next'].forEach((sel,i)=>q(root,sel).onclick=()=>{const owned=MUSIC_TRACKS.filter(t=>g.ownedTracks.includes(t.id)&&(t.id===0||t.src)),index=owned.findIndex(t=>t.id===g.activeTrack);if(chooseTrack(owned[(index+(i?1:-1)+owned.length)%owned.length]))showMusicShop();});
  const volume=q(root,'#music-volume');volume.value=Math.round(g.musicVolume*100);volume.oninput=()=>{g.musicVolume=+volume.value/100;setMusicVolume();save();};
  const seek=q(root,'#music-seek'),audio=externalMusic;const syncPlayback=()=>{if(!root.isConnected)return;const duration=audio?.duration;if(Number.isFinite(duration)&&duration>0){seek.disabled=false;seek.max=duration;if(document.activeElement!==seek)seek.value=audio.currentTime;seek.style.setProperty('--val',(audio.currentTime/duration*100)+'%');text(root,'#music-duration',timeFmt(duration));text(root,'#music-position',timeFmt(audio.currentTime));}else{seek.disabled=true;seek.value=0;text(root,'#music-duration','∞');text(root,'#music-position',L('LIVE','ЭФИР','DIRECTO'));}};seek.oninput=()=>{if(audio&&Number.isFinite(audio.duration))audio.currentTime=+seek.value;};if(audio){audio.ontimeupdate=syncPlayback;audio.onloadedmetadata=syncPlayback;audio.ondurationchange=syncPlayback;}syncPlayback();decorate(root);
 };
 // Keep the atlas renderer and all marker editing controls in their live DOM.
 showMap=function(){legacy.map();const {root,old}=mount('map');
  q(root,'.header-right button').setAttribute('aria-label',L('Settings','Настройки','Ajustes'));
  q(root,'#atlas').replaceWith(q(old,'#atlas-canvas'));
  q(root,'#atlas-pin-menu').remove();q(root,'.map-scale').remove();
  const left=q(root,'.map-corner.left');q(left,'.map-stats').replaceWith(q(old,'.atlas-stats'));
  const add=q(old,'#atlas-pin-add');add.className='map-accent-action';add.innerHTML=icon('pin')+' '+L('Place a marker','Поставить метку','Colocar marca');q(left,'#pin-add').replaceWith(add);q(left,'#pin-status').replaceWith(q(old,'#atlas-pin-hint'));
  const details=document.createElement('details');details.className='v15-map-details';const summary=document.createElement('summary');summary.textContent=L('Scale & saved markers','Масштаб и сохранённые метки','Escala y marcas guardadas');details.append(summary,q(old,'.atlas-measures'),q(old,'.atlas-pins'));left.append(details);
  [['#zoom-in','#atlas-zoom-in'],['#zoom-out','#atlas-zoom-out'],['#map-center','#atlas-center']].forEach(([to,from])=>q(root,to).replaceWith(q(old,from)));
  q(root,'.map-threat').replaceChildren(q(old,'#atlas-threat'),q(old,'#atlas-abyss'));
  q(root,'.map-footer .legend').replaceWith(q(old,'.atlas-legend'));atlasFitPlayer();atlas.dirty=true;translate(root);
 };
 const originalPinEditor=openPinEditor;
 openPinEditor=function(px,py,clientX,clientY){
  const root=q($('modal'),'#screen-map');if(!root)return originalPinEditor(px,py,clientX,clientY);closePinEditor();
  const bounds=$('atlas-canvas').getBoundingClientRect(),scale=atlasScale();const pin=g.mapPins.find(p=>Math.hypot(bounds.width/2+(p.x-atlas.x)*scale-px,bounds.height/2+(p.y-atlas.y)*scale-py)<18);
  const world={x:pin?.x??atlas.x+(px-bounds.width/2)/scale,y:pin?.y??atlas.y+(py-bounds.height/2)/scale};
  const holder=document.createElement('template');holder.innerHTML=tpl.map;const editor=q(holder.content,'#atlas-pin-menu');editor.id='pin-editor';editor.hidden=false;editor.setAttribute('aria-modal','false');q(root,'.map-stage').append(editor);decorate(editor);
  editor.setAttribute('aria-label',L('Marker settings','Настройка метки','Ajustes de marca'));q(editor,'#pin-menu-close').setAttribute('aria-label',L('Close','Закрыть','Cerrar'));text(editor,'label[for=pin-name-input]',L('NAME','НАЗВАНИЕ','NOMBRE'));text(editor,'#pin-save',L('SAVE MARKER','СОХРАНИТЬ МЕТКУ','GUARDAR MARCA'));text(editor,'#pin-delete',L('DELETE','УДАЛИТЬ','ELIMINAR'));qa(editor,'[data-pin-color]').forEach((b,i)=>b.setAttribute('aria-label',L(...[['Purple','Фиолетовый','Morado'],['Blue','Голубой','Azul'],['Amber','Янтарный','Ámbar'],['Pink','Розовый','Rosa'],['Green','Зелёный','Verde'],['White','Белый','Blanco']][i])));
  text(editor,'div.pin-menu-label',L('MARKER COLOUR','ЦВЕТ МЕТКИ','COLOR DE MARCA'));text(editor,'.pin-menu-tip',L('Right-click to edit · Use the left button to add','ПКМ — редактировать · Кнопка слева — добавить','Clic derecho para editar · Botón izquierdo para añadir'));q(editor,'#pin-colors').setAttribute('aria-label',L('Marker colour','Цвет метки','Color de marca'));qa(editor,'[data-pin-color]').forEach(b=>b.title=b.getAttribute('aria-label'));
  const input=q(editor,'#pin-name-input');input.placeholder=L('Marker name','Название метки','Nombre de marca');input.value=pin?.name||L('Marker','Метка','Marca')+' '+g.nextPinId;let color=pin?.color||'#a986ff';const palette=qa(editor,'[data-pin-color]');const select=c=>{color=c;palette.forEach(b=>b.classList.toggle('selected',b.dataset.pinColor===c));};palette.forEach(b=>b.onclick=()=>select(b.dataset.pinColor));select(color);
  text(editor,'#pin-menu-coords',`X ${lightYears(world.x)} / Y ${lightYears(world.y)}`);text(editor,'.pin-menu-title',pin?L('EDIT MARKER','ИЗМЕНИТЬ МЕТКУ','EDITAR MARCA'):L('CREATE MARKER','СОЗДАТЬ МЕТКУ','CREAR MARCA'));
  const finish=()=>{closePinEditor();refreshPinPanel();atlas.dirty=true;};q(editor,'#pin-menu-close').onclick=finish;q(editor,'#pin-delete').hidden=!pin;q(editor,'#pin-delete').onclick=()=>{if(pin)removeMapPin(pin.id);finish();};q(editor,'#pin-save').onclick=()=>{const target=pin||addMapPin(world.x,world.y);if(!target){toast(L('Maximum: 64 markers','Максимум: 64 метки','Máximo: 64 marcas'));return;}target.name=input.value.trim().slice(0,32)||L('Marker','Метка','Marca');target.color=color;g.activePin=target.id;save();finish();};
  editor.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();finish();}if(e.key==='Enter'){e.preventDefault();q(editor,'#pin-save').click();}};
  const rect=editor.getBoundingClientRect();editor.style.left=clamp(px+10,8,Math.max(8,bounds.width-rect.width-8))+'px';editor.style.top=clamp(py+8,8,Math.max(8,bounds.height-rect.height-8))+'px';input.focus();input.select();
 };
 showTutorial=function(){show('');const {root}=mount('tutorial');
  const articles=qa(root,'.br-tutorial article');
  text(articles[2],'p',L('Gather mass and the materials in your evolution recipe. M opens the atlas. Right-click to name and colour a marker; on a phone use + Marker. A larger black hole ends your run.','Собирай массу и материалы из рецепта эволюции. M открывает карту. ПКМ создаёт метку с именем и цветом; на телефоне — + Метка. Большая чёрная дыра завершит прохождение.','Reúne masa y los materiales de tu receta. M abre el atlas. Clic derecho crea una marca con nombre y color; en móvil usa + Marca. Un agujero negro mayor termina tu partida.'));
  q(root,'.br-tutorial-done').onclick=()=>{g.tutorialDone=true;save();resumeGame();};
 };
 const oldOpenEvolution=openEvolution;openEvolution=()=>{if($('modal').dataset.screen==='evolution'&&!$('modal').classList.contains('off'))resumeGame();else showV15Evolution();};
 $('btn-evolution').onclick=openEvolution;$('btn-stage-details').onclick=openEvolution;
 function buildHud(){const holder=document.createElement('template');holder.innerHTML=tpl.play;const hud=holder.content.firstElementChild;hud.classList.add('active','v15-hud');$('hud').append(hud);decorate(hud);
 const drawer=q(hud,'#upgrade-drawer');q(hud,'#upgrades-open').onclick=()=>{drawer.classList.toggle('open');q(hud,'#upgrades-open').setAttribute('aria-expanded',String(drawer.classList.contains('open')));};q(hud,'#upgrades-close').onclick=()=>{drawer.classList.remove('open');q(hud,'#upgrades-open').setAttribute('aria-expanded','false');};q(hud,'#upgrades-open').setAttribute('aria-expanded','false');
 qa(drawer,'.drawer-up').forEach(n=>n.remove());upgrades.forEach(u=>{const b=document.createElement('button');b.type='button';b.className='drawer-up';b.dataset.quickUpgrade=u.id;b.onclick=()=>{buy(u.id);refreshV15();};drawer.insertBefore(b,q(drawer,'.drawer-more'));});
 const activate=(id,fn)=>{const b=q(hud,id);b.onclick=()=>{fn();b.style.borderColor='#906BFF';setTimeout(()=>b.style.borderColor='',550);};};activate('#pulse',activatePulse);activate('#dash',activateBoost);q(hud,'#view-mode').remove();
 const cameraToggle=document.createElement('button');cameraToggle.className='v15-camera-toggle';cameraToggle.textContent='− / +';cameraToggle.setAttribute('aria-label',L('Camera controls','Масштаб камеры','Controles de cámara'));cameraToggle.setAttribute('aria-expanded','false');cameraToggle.onclick=()=>{const on=document.body.classList.toggle('v15-camera-open');cameraToggle.setAttribute('aria-expanded',String(on));};hud.append(cameraToggle);
 const info=q(hud,'.evo-status');info.setAttribute('role','button');info.tabIndex=0;info.setAttribute('aria-label',L('Evolution recipe','Рецепт эволюции','Receta de evolución'));info.onclick=e=>{if(!e.target.closest('button'))showV15Evolution();};info.onkeydown=e=>{if(e.key==='Enter')showV15Evolution();};
 return hud;}
 let hud=buildHud();
 const originalRender=renderUI;renderUI=function(...args){originalRender(...args);refreshV15();};
 function refreshV15(){
  qa(hud,'[data-quick-upgrade]').forEach(b=>{const u=upgrades.find(u=>u.id===b.dataset.quickUpgrade),quote=upgradeQuote(u);b.innerHTML='<span>'+esc(u.name)+'</span><b>✦ '+fmt(quote.cost)+'</b>';b.disabled=!quote.count||quote.cost>g.credits;});
  q(hud,'#pulse').dataset.cooling=String(pulseCd>0);q(hud,'#dash').dataset.cooling=String(boostCd>0);
  const visible=$('modal').classList.contains('off');hud.style.display=visible?'block':'none';
  const resources=qa(hud,'.hud-resources strong');resources[0].textContent=$('matter-value').textContent;resources[1].textContent=fmt(g.credits);resources[2].textContent=timeFmt(g.time);
  text(hud,'.hud-resources small',g.endless?L('BLACK HOLE MASS','МАССА ЧЁРНОЙ ДЫРЫ','MASA DEL AGUJERO NEGRO'):L('MATTER','МАТЕРИЯ','MATERIA'));text(hud,'.hud-sub',TA[g.tier].epoch);text(hud,'.world-coords',$('world-subtitle').textContent);
  q(hud,'#mass-number').innerHTML=esc(g.endless?fmt(solarMass()):fmt(g.total))+(g.endless?' <small>M☉</small>':'');text(hud,'#radius-number',$('radius-value').textContent);text(hud,'.mass-details .mass-detail:last-child strong',Math.round(g.viewZoom*100)+'%');
  text(hud,'.evo-title>span:first-child',`${g.tier+1} / 28 · ${TA[g.tier].name}`);text(hud,'.evo-title>span:nth-child(2)',g.endless?'∞':TA[Math.min(27,g.tier+1)].name);text(hud,'.evo-aux b',Math.round(stageFraction()*100)+'%');q(hud,'.progress-bar span').style.width=stageFraction()*100+'%';text(hud,'#player-label-text',TA[g.tier].name);text(hud,'.player-label small',`${g.tier+1} / 28`);text(hud,'#pulse small',$('pulse-cooldown').textContent);text(hud,'#dash small',$('boost-cooldown').textContent);text(hud,'#upgrades-open b',Object.values(g.upgrade).reduce((a,b)=>a+b,0));
 }
 const originalResume=resumeGame;resumeGame=function(){stopMusicPreview();visual?.closeSelect();originalResume();refreshV15();};
 if(TEST_MODE){const b=document.createElement('button');b.className='v15-tester';b.textContent='</>';b.setAttribute('aria-label','Tester panel');b.onclick=()=>testerToggle();document.body.append(b);}
 document.body.classList.add('ui-v15');
 refreshV15();
}
