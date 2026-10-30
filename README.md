# Cosmic Evolution — From Dust to Infinity

A complete **2D HTML5 Canvas** cosmic growth game. The old Garage Evolution source files have been replaced on the main branch, as requested. No 3D models, no build step, no heavy engine, no external gameplay dependencies.

## Play

Open `index.html` in a browser, or use GitHub Pages. Controls: mouse or touch drag to move, WASD/arrow keys to steer, `E` gravitational pulse, `Shift`/`Space` dash, `M` live infinite-space atlas, `P` pause.

## Systems implemented

- Procedural starfield and nebula rendering, multi-layer parallax, orbit effects, energy trails, screen shake, particles, impact and evolution effects.
- Gravity and absorption physics, rare relics, hazards, active pulse and boost abilities.
- **28 evolution forms**, dust to universe, in six distinct epochs; stage objectives and stage-specific mass requirements.
- Four permanent upgrades with geometric cost scaling; stage-based resource economy.
- Auto-save using localStorage, settings, survival stats, **interactive infinite atlas** with draggable coordinates/zoom, and completion screen.
- Spatially deterministic sectors: resources do not refill when revisited. Collected objects stay removed after reload. Endless exploration is necessary for further progression.
- Unique 28-stage visual changes are animated in place, without world-position resets. Ambient cinematic original WebAudio score, adjustable volume, and redesigned navigation controls.
- Responsive keyboard, pointer, and mobile touch controls.
- Static deployment; no advertisements, trackers, or cloud calls. Google Fonts are optional; the game falls back to local fonts offline.

## World persistence and navigation

The old 28-stage-list map has been replaced with a procedural atlas. Press **M** to view the real sector grid and position, pan with mouse/touch, zoom with the mouse wheel or +/- buttons, recenter with the target button. Sectors with more matter, relics, voids and nebulas are computed from the world seed. Objects in each sector have stable identities; harvested bodies are recorded as compact 32-bit bitmasks. A consumed resource **never respawns**, even after leaving a region or reloading the game; the player must keep exploring. The finite browser storage limit may eventually be reached on extremely large expeditions; if saving fails the console warns. Existing saves are migrated to the new world representation without resetting progress, although depletion from before the update cannot be reconstructed.

## Progression / game length

The content and high growth costs of later forms are meant to create a long-term **10+ hour target campaign**. Real playtime depends on skill, route, upgrade strategy, and device performance. **This is a design target, not a verified minimum**; it requires full playtesting and balance passes before a guarantee of a ten-hour minimum can be made.

Progress is saved under `cosmic-evolution-save-v1` in local browser storage. To reset during testing, remove that localStorage key in your browser console.

## Deploy

All game files are static. The included GitHub Actions workflow runs a syntax/smoke test and deploys the root folder to GitHub Pages. On GitHub, set **Settings → Pages → Build and deployment → Source: GitHub Actions** if it isn't already selected. The workflow retains its deploy artifacts for one day, and removes the temporary archive following successful publication, to reduce artifact storage usage.


## Обновление баланса и производительности (2026-10-30)

- Ограничена активная область физических объектов вокруг игрока; дальний космос отрисовывается как фоновое звёздное поле.
- Убрано дорогое освещение для далёких объектов; сгруппированы уровни детализации и закэшированы свечения и туманности.
- Уменьшена плотность внутренних пикселей на дисплеях 2K/4K, добавлено автоматическое снижение разрешения при падении FPS.
- Для продвижения нужны материальные ресурсы, находки и исследование большого количества **новых** секторов. Расчётная цель кампании — 10+ часов, подлежит игровому тестированию и дальнейшему балансу.
- Сохранения старой версии импортируются с сохранением относительного прогресса в текущем этапе. Сохранённые координаты и информация об истощённых секторах не сбрасываются.
- В меню настроек и после финала доступна **Новая игра** с подтверждением: прежнее сохранение резервируется в localStorage под `cosmic-evolution-save-v1-backup`.


## Исправления и панель тестирования (v2.3)

- Восстановлено стабильное расположение объектов при повторной генерации сектора: RNG проходит каждый индекс независимо от битовой маски добытого ресурса. Ничего собранное не появляется снова.
- Пустые края видимой Вселенной теперь показывают лёгкие процедурные дальние объекты, точно привязанные к координатам и записям о добыче. Физика рассчитывается только поблизости для сохранения FPS.
- В разреженных секторах увеличена доля поглощаемой материи. Реальных ресурсов по-прежнему конечное число в каждом секторе.
- Новая игра: кнопка ↺ в верхней панели, подтверждение и резервная копия локального сохранения перед полным сбросом открытых секторов, валюты и этапов.
- Тестерский режим: откройте `?tester=1` в конце адреса GitHub Pages и нажмите кнопку ⚒ или клавишу F2. В нём отдельное сохранение `cosmic-evolution-tester-save-v1`, не затрагивающее прохождение обычного игрока. Можно изменять стадию, прогресс, валюту, скорость, гравитацию, добычу, масштаб и плотность объектов, менять сектор, выполнять задания, видеть FPS. Можно скопировать обычное сохранение в тестовое.
- Внимание: `?tester=1` — удобный режим тестирования, **не защищённая авторизацией** панель. Любой человек с тестерской ссылкой может открыть её в своём браузере, но не изменит чужие локальные сохранения.

## Версия 2.4 — динамические месторождения и синтез

- Масса растёт постепенно; пороги уменьшены, вместо пустого гринда для каждой формы нужен небольшой рецепт материалов и исследование новых секторов.
- Материалы: минералы, кристаллы, лёд, газ, плазма, экзоматерия. Цветные регионы карты соответствуют разным месторождениям.
- Газ втягивается с увеличенной дистанции; плазму и экзоматерию нужно активировать гравитационным импульсом (E), после чего можно поглотить.
- Камера отдаляется значительно сильнее к поздним этапам. Далёкие сектора рисуются экономными процедурными фоновыми образованиями; они декоративны, не являются ресурсами и не возрождают собранную материю.
- Сохранения старых версий переносятся с сохранением относительного прогресса текущей формы.
- Существующая тестерская панель (ссылка ?tester=1, F2) поддерживается, тестер может выполнять рецепты и задания текущей стадии.


### Версия 2.5: масштабные космические ресурсы и исправленный финал
На поздних этапах настоящие процедурные скопления заполняют пространство и могут поглощаться. Их координаты постоянны, а собранные скопления остаются удалёнными после перезапуска. Убраны декоративные гигантские овалы. «Исследовать дальше» теперь открывает бесконечный режим без повторяющегося финального окна.
