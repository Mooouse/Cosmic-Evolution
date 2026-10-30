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

## Версия 2.4 — динамические месторождения и синтез

- Масса растёт постепенно; пороги уменьшены, вместо пустого гринда для каждой формы нужен небольшой рецепт материалов и исследование новых секторов.
- Материалы: минералы, кристаллы, лёд, газ, плазма, экзоматерия. Цветные регионы карты соответствуют разным месторождениям.
- Газ втягивается с увеличенной дистанции; плазму и экзоматерию нужно активировать гравитационным импульсом (E), после чего можно поглотить.
- Камера отдаляется значительно сильнее к поздним этапам. Далёкие сектора рисуются экономными процедурными фоновыми образованиями; они декоративны, не являются ресурсами и не возрождают собранную материю.
- Сохранения старых версий переносятся с сохранением относительного прогресса текущей формы.
- Существующая тестерская панель (ссылка ?tester=1, F2) поддерживается, тестер может выполнять рецепты и задания текущей стадии.


### Версия 2.5 — поздняя Вселенная и бесконечное исследование
- На поздних стадиях (с 14-й) появляются постоянные крупномасштабные месторождения: звёздные скопления и галактические ядра с реальными радиусами поглощения.
- Добытые месторождения сохраняются по координатам в `depletedMacro` и не восстанавливаются.
- Убраны огромные декоративные овалы. Далёкие объекты рендерятся из повторно используемых 2D-спрайтов.
- Сложившиеся на максимальном уровне пользователи после «Исследовать дальше» остаются в бесконечном режиме без повторения финального окна.

### Версия 2.6 — масштаб Tasty Planet и стабильная добыча
- Камера следует физическому размеру тела и существенно менее агрессивно уменьшает масштаб (поздние формы остаются хорошо видны); переход сглажен.
- Близкие сектора подгружаются автоматически по масштабу камеры: от 9×9 до 17×17 вместо фиксированных 7×7. За пределами активной физики продолжает работать детерминированное LOD-отображение.
- Мелких ресурсов в секторах гораздо меньше (обычно 5–15 вместо 32). Отдельные слоты генерации и битмаски истощения сохранены для совместимости с прогрессом.
- Крупные тела встречаются в дальних регионах; их радиус и количество добываемой материи взаимосвязаны, как в играх о поглощении. Макроместорождений стало 9 вместо 16 на клетку, зато размер закономерно возрастает с расстоянием от центра карты.
- Интерактивная карта считает опустошённые сектора по реальному количеству объектов, а не по прежним 32 слотам.
- Тестерская панель: базовая плотность 16/32 (≈ прежнего количества меньше), допускается регулировка вплоть до 32.


### Версия 2.7 — переработанное управление
- По умолчанию WASD/стрелки реагируют сразу и быстро останавливают космическое тело. Направление мышью работает только при удержании левой кнопки, поэтому движение курсора по интерфейсу больше не заставляет игрока улетать.
- На сенсорных экранах появляется отдельный левый аналоговый джойстик; справа остаются кнопки импульса и рывка.
- В настройках доступны схемы мыши: «зажать кнопку», классическое следование за курсором и «только клавиатура», а также выбор между точным и плавным откликом. Выбор сохраняется в игровом сейве.
- Рывок, импульс, карта, тестерский режим и сохранения продолжают работать.


### Версия 2.8 — бесконечная чёрная дыра
- Управление по умолчанию: плавно следовать за курсором без удержания мыши. Настройки управления по-прежнему доступны; старые сохранения получают новый стандарт один раз.
- Все виды ресурсов добываются автоматически при поглощении. E — необязательный импульс для ускорения сбора и очистки препятствий.
- Последняя, 28-я форма — **Бесконечная чёрная дыра** со световым кольцом и вращающимся аккреционным диском. На этом этапе физический радиус растёт без искусственного верхнего ограничения, новая материя приносит рост.
- На 28-м этапе красные препятствия больше не отнимают массу и поглощаются автоматически. Крупные тела остаются недоступными, пока чёрная дыра не выросла достаточно.
- Достижение последней формы включает бесконечную экспедицию без финальной блокировки/повторяющегося окна. Сохранения уже завершивших игру автоматически продолжаются на 28-м этапе.
- Атлас: минимальный масштаб уменьшен до 0,008× (ранее 0,28×). При далёком отдалении сектора рисуются группами — фиксированный бюджет прорисовки предотвращает зависания.


### Версия 3.0 — устойчивые галактики, плавное поглощение, читаемая карта
- Дальние галактики выбираются по глобальной мировой сетке, а не от левого верхнего угла камеры. При смене детализации два фиксированных уровня плавно смешиваются — позиции не прыгают.
- В бесконечном режиме крупные тела не телепортируются и не перемещаются рывками: поглощение использует короткую анимацию уменьшения с ограниченной частотой запуска (60–130 ресурсов/с).
- Звук добычи ограничен одним тихим сигналом примерно раз в 420 мс, независимо от числа поглощений; высокочастотный спам устранён.
- На карте появился читаемый локальный обзор 11×11 соседних секторов, который не меняется при увеличении или уменьшении основной карты. Все старые области и секторы остаются исследованными.
- При экстремальном росте ограничены ресурсоёмкие параметры физики и размер рисуемой чёрной дыры без сброса массы, прогресса и накопленного размера.
- Для воспроизводимого тестирования достаточно `node --check game.js`; также проверены симулированные кадры на стадиях 1 и 28 и на нескольких величинах бесконечной массы. Полное измерение FPS в настоящем браузере остаётся отдельной задачей.


## 3.2 — Galaxy field art and black holes

- Macro galaxies are now drawn in eight shapes and nine color palettes, with a persistent seeded identity.
- At extreme zoom, distant clusters are positioned within stable world-space supercells instead of at aligned square-grid corners.
- Previously hostile red stars are replaced by ordinary collectible crystal matter (no red hazard damage).
- Three natural black hole types exist as harvestable world objects, marked on the map. Their depletion persists in the existing bitmask.
- The final player black hole has a multiring tilted accretion disk, gravitational lens arcs and a photon ring, all drawn in 2D Canvas.


### Версия 3.3 — GPU-friendly отрисовка и переработанная чёрная дыра
- Удалён сброс всего кэша сложных спрайтов галактик после достижения лимита; используется ограниченный постепенный LRU-подобный сброс, предотвращающий постоянную регенерацию текстур.
- Дальние процедурные скопления кешируются в фиксированных мировых координатах и повторно используются между кадрами без перерасчёта RNG. Цвета, размеры и положения галактик сохранены.
- Главная чёрная дыра и три природные формы используют процедурно запечённую текстуру турбулентного аккреционного диска (цветовые градиенты, зерно, доплеровская асимметрия и неровное фотонное кольцо) вместо ровных нарисованных дуг. Генерация происходит однократно на вариант; каждый кадр выполняется только drawImage.
- Система сохранения ресурсов и бесконечной карты не изменена.

- Дальний слой космоса собирается в отдельном Canvas-буфере с запасом по краям кадра. При небольшом движении и изменении масштаба он повторно используется без пересоздания тысяч текстур. Близкие поглощаемые объекты рисуются отдельно каждый кадр.
- Камера бесконечной чёрной дыры при загрузке сохранения сразу принимает правильный масштаб, не прогоняя десятки дорогих LOD-переходов.


### 3.4 — визуал и настоящая космическая добыча
- Чёткие спрайты разных галактик, с кэшированием и буфером дальнего космоса.
- Новый чёрный горизонт событий и асимметричный аккреционный диск без векторных полос.
- На больших масштабах галактики, вселенные и чёрные дыры являются поглощаемыми объектами с постоянным ID; добыча сохраняется в depletedCosmic.
- Ограничена частота обработки крупномасштабной добычи и переотрисовки фона.


### Версия 3.5 — визуал и поглощение без скачков
Единые уровни детализации для космической отрисовки и поглощения (включая дальние секторы), плавное изменение масштаба и перекрытие буферов. Новая закэшированная текстура аккреционного диска с турбулентным газом, неравномерным свечением и тёмным горизонтом событий. Сохранения совместимы.


### 3.6 — Black-hole visual rebuild
- Rebuilt the main black-hole art with a clear horizon, slanted turbulent amber plasma and uneven gravitational glow. The expensive texture is generated and cached once per variant.
- A small number of moving hot particles provides animation without large vector rings.
- Galaxy collection, rendering optimizations, exploration and saves remain unchanged.
