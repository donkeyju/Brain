/* =========================================================
   빈칸에 그림 맞추기 (카테고리: 공간지각)
   동네 그림에서 한 조각이 빠져 있어요. 빠진 자리에 맞는 조각을 보기에서 골라요.
   - other : 오답은 그림의 다른 자리 조각
   - look  : 오답에 "가장자리가 이어지지 않는 조각"이 섞여요
             (하늘과 땅 경계 높이가 다르거나, 길이 끊긴 조각. 옆 조각과 비교하면 알 수 있어요)
   - turn  : 오답에 "거꾸로 돌아간 조각"이 섞여요 (4단계부터)
   그림은 매번 난수로 새로 그려요 (하늘·땅 높이, 길, 집·나무·과일 자리).
   그림 파일 없이 SVG 한 장을 그리고, 조각은 같은 그림을 "창문(viewBox)"으로 잘라 보여줘요.
   ========================================================= */
(function () {
  const { FRUITS, fruitSVG } = window.FruitArt;
  /* 난이도 표
     cols×rows: 조각 수   opts: 보기 수   jitter: 물건이 칸 가운데에서 벗어나는 정도(클수록 가장자리를 살펴야 해요)
     near: 같은 줄(배경이 비슷한) 조각을 오답으로 먼저 써요   angles: 돌아간 조각 각도 */
  const LEVELS = {
    1: { types: ['other'],         cols: 3, rows: 2, opts: 3, jitter: 4,  near: false, angles: [] },
    2: { types: ['other', 'look'], cols: 3, rows: 2, opts: 3, jitter: 8,  near: true,  angles: [] },
    3: { types: ['other', 'look'], cols: 4, rows: 3, opts: 3, jitter: 10, near: true,  angles: [] },
    4: { types: ['look', 'turn'],  cols: 4, rows: 3, opts: 4, jitter: 14, near: true,  angles: [180] },
    5: { types: ['look', 'turn'],  cols: 5, rows: 3, opts: 4, jitter: 18, near: true,  angles: [90, 180, 270] },
  };
  const TYPE_NAME = { other: '빠진 조각', look: '이어지는 조각', turn: '돌아간 조각' };
  const CELL = 100;

  /* ---------- 그림 재료 (100×100 칸 기준 좌표) ---------- */
  const ROOF = { red: '#D9694F', blue: '#5B83B8', green: '#5E9B55', yellow: '#E2A93A' };
  const BALLOON = { red: '#E0574B', blue: '#4E86C9', yellow: '#EFC13E' };
  const KITE = { orange: '#EE8A3C', green: '#4FA36A' };
  const TREE = { round: '#6BAF5B', pine: '#3E8E5A', autumn: '#E9963C' };
  // 물건 이름: 종류_색 (예: house_red). 같은 종류의 다른 색이 "비슷한 조각" 오답이 돼요.
  const SKY = ['sun', 'cloud', 'birds', 'balloon_red', 'balloon_blue', 'balloon_yellow', 'kite_orange', 'kite_green'];
  const LAND = ['house_red', 'house_blue', 'house_green', 'house_yellow', 'tree_round', 'tree_pine', 'tree_autumn'];
  const GROUND = FRUITS.map(f => 'fruit_' + f.id);
    const NAME = { sun: '해', cloud: '구름', birds: '새', balloon: '풍선', kite: '연', house: '집', tree: '나무' };
  const objName = o => { const [k, v] = o.split('_'); return k === 'fruit' ? FRUITS.find(f => f.id === v).name : (k === 'tree' ? { round: '나무', pine: '소나무', autumn: '단풍나무' }[v] : NAME[k]); };

  // 길이 지나가는 칸 찾기: 길(곡선) 위의 점을 촘촘히 찍어 어느 칸에 들어가는지 봐요
  function roadCells(r) {
    const nums = r.road.match(/-?\d+(\.\d+)?/g).map(Number);
    const [x0, y0, ax, ay, bx, by, x1, y1] = nums, hit = {};
    for (let k = 0; k <= 120; k++) {
      const t = k / 120, u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x1;
      const y = u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y1;
      const c = Math.floor(x / CELL), rr = Math.floor(y / CELL);
      if (c >= 0 && rr >= 0 && c < r.cols && rr < r.rows) hit[rr + ',' + c] = (hit[rr + ',' + c] || 0) + 1;
    }
    return Object.keys(hit).filter(k => hit[k] >= 8);     // 길이 조금만 스친 칸은 빼요
  }
  // 물건 하나 그리기. x: 가운데, y: 바닥선(집·나무) 또는 가운데(하늘·과일)
  function objSVG(o, x, y) {
    const [k, v] = o.split('_');
    if (k === 'sun') return `<g>${[0, 45, 90, 135, 180, 225, 270, 315].map(d => { const a = d * Math.PI / 180; return `<line x1="${x + 20 * Math.cos(a)}" y1="${y + 20 * Math.sin(a)}" x2="${x + 28 * Math.cos(a)}" y2="${y + 28 * Math.sin(a)}" stroke="#F2B33D" stroke-width="4" stroke-linecap="round"/>`; }).join('')}<circle cx="${x}" cy="${y}" r="16" fill="#F6C945"/></g>`;
    if (k === 'cloud') return `<g fill="#FFFFFF"><ellipse cx="${x - 14}" cy="${y + 4}" rx="16" ry="11"/><ellipse cx="${x + 2}" cy="${y - 5}" rx="18" ry="15"/><ellipse cx="${x + 18}" cy="${y + 5}" rx="15" ry="10"/><rect x="${x - 28}" y="${y + 2}" width="58" height="12" rx="6"/></g>`;
    if (k === 'birds') return `<g stroke="#3F464D" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M${x - 26} ${y - 2} q7 -9 13 0 q6 -9 13 0"/><path d="M${x + 2} ${y + 12} q6 -8 11 0 q5 -8 11 0"/><path d="M${x - 4} ${y - 18} q5 -6 9 0 q4 -6 9 0"/></g>`;
    if (k === 'balloon') return `<g><path d="M${x} ${y + 20} q-6 10 2 22" stroke="#5C5148" stroke-width="1.8" fill="none"/><ellipse cx="${x}" cy="${y}" rx="15" ry="19" fill="${BALLOON[v]}"/><path d="M${x - 3} ${y + 18} h6 l-3 4 z" fill="${BALLOON[v]}"/><ellipse cx="${x - 6}" cy="${y - 7}" rx="3.5" ry="6" fill="#FFFFFF" opacity="0.4"/></g>`;
    if (k === 'kite') return `<g><path d="M${x} ${y + 22} q8 8 0 14 q-8 6 0 12" stroke="#5C5148" stroke-width="1.8" fill="none"/><path d="M${x} ${y - 24} L${x + 18} ${y} L${x} ${y + 22} L${x - 18} ${y} Z" fill="${KITE[v]}" stroke="#5C5148" stroke-width="1.5"/><path d="M${x} ${y - 24} V${y + 22} M${x - 18} ${y} H${x + 18}" stroke="#FFFFFF" stroke-width="1.5" opacity="0.7"/></g>`;
    if (k === 'house') return `<g><rect x="${x - 26}" y="${y - 36}" width="52" height="36" fill="#FFF4E0" stroke="#B9A98F" stroke-width="1.5"/><path d="M${x - 33} ${y - 34} L${x} ${y - 60} L${x + 33} ${y - 34} Z" fill="${ROOF[v]}"/><rect x="${x + 4}" y="${y - 22}" width="13" height="22" rx="2" fill="#8C6A4A"/><rect x="${x - 19}" y="${y - 27}" width="14" height="12" rx="2" fill="#BFE0F2" stroke="#8C7B66" stroke-width="1.2"/></g>`;
    if (k === 'tree') {
      const c = TREE[v], trunk = `<rect x="${x - 5}" y="${y - 20}" width="10" height="20" rx="2" fill="#8C6A4A"/>`;
      if (v === 'pine') return `<g>${trunk}<path d="M${x} ${y - 62} L${x + 18} ${y - 36} H${x - 18} Z M${x} ${y - 48} L${x + 24} ${y - 18} H${x - 24} Z" fill="${c}"/></g>`;
      return `<g>${trunk}<circle cx="${x}" cy="${y - 38}" r="22" fill="${c}"/><circle cx="${x - 12}" cy="${y - 30}" r="12" fill="${c}"/><circle cx="${x + 12}" cy="${y - 30}" r="12" fill="${c}"/></g>`;
    }
    const f = FRUITS.find(ff => ff.id === v);
    return `<g transform="translate(${x - 30} ${y - 30})">${fruitSVG(f, 60)}</g>`;
  }

  /* 그림 전체(속 내용만). mod로 일부를 바꿔 그려요
     { dy: 하늘·땅 경계를 옮길 만큼 } { noRoad: true } : 빈칸 맞추기의 "가장자리 안 맞는 조각"
     { objs: {칸 번호: 바뀐 물건 또는 null(없앰)}, dx: {칸 번호: 옆으로 옮길 만큼} } : 다른 그림 찾기 */
  function sceneInner(r, mod) {
    const W = r.cols * CELL, H = r.rows * CELL, dy = (mod && mod.dy) || 0, hy = r.horizon + dy;
    let s = `<rect x="0" y="0" width="${W}" height="${hy}" fill="#CFE6F5"/><rect x="0" y="${hy}" width="${W}" height="${H - hy}" fill="#C7E3A8"/>`;
    s += r.hills.map(([cx, rx, ry]) => `<ellipse cx="${cx}" cy="${hy}" rx="${rx}" ry="${ry}" fill="#B3D893"/>`).join('');
    s += `<rect x="0" y="${hy}" width="${W}" height="${H - hy}" fill="#C7E3A8"/>`;
    if (!(mod && mod.noRoad)) s += `<path d="${r.road}" stroke="#EADBC0" stroke-width="22" fill="none" stroke-linecap="round"/><path d="${r.road}" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="7 9" fill="none" opacity="0.8"/>`;
    r.items.forEach((it, i) => {
      const obj = mod && mod.objs && i in mod.objs ? mod.objs[i] : it.obj;
      if (obj) s += objSVG(obj, it.x + ((mod && mod.dx && mod.dx[i]) || 0), it.y + (it.zone === 'land' ? dy : 0));
    });
    return s;
  }
  function pictureSVG(r, width, hole, mark) {
    const W = r.cols * CELL, H = r.rows * CELL, [hr, hc] = r.missing;
    let over = '';
    if (hole) over += `<rect x="${hc * CELL + 2}" y="${hr * CELL + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="6" fill="#FFF8F2" stroke="#B8501A" stroke-width="4" stroke-dasharray="10 7"/><text x="${hc * CELL + 50}" y="${hr * CELL + 66}" text-anchor="middle" font-size="46" font-weight="900" font-family="'Noto Sans KR', sans-serif" fill="#B8501A">?</text>`;
    else over += `<rect x="${hc * CELL + 2}" y="${hr * CELL + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="6" fill="none" stroke="#2E7D4F" stroke-width="6"/>`;
    if (mark) over += `<rect x="${mark[1] * CELL + 3}" y="${mark[0] * CELL + 3}" width="${CELL - 6}" height="${CELL - 6}" rx="6" fill="none" stroke="#5C5148" stroke-width="4" stroke-dasharray="8 6"/>`;
    // 조각 경계를 옅게 보여주면 칸이 몇 개인지 알기 쉬워요
    let grid = '';
    for (let c = 1; c < r.cols; c++) grid += `<line x1="${c * CELL}" y1="0" x2="${c * CELL}" y2="${H}" stroke="#FFFFFF" stroke-width="1.5" opacity="0.6"/>`;
    for (let k = 1; k < r.rows; k++) grid += `<line x1="0" y1="${k * CELL}" x2="${W}" y2="${k * CELL}" stroke="#FFFFFF" stroke-width="1.5" opacity="0.6"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" width="${width}" height="${Math.round(width * H / W)}" style="border-radius:10px;display:block" aria-hidden="true">${sceneInner(r)}${grid}${over}</svg>`;
  }
  // 조각 하나: 그림의 한 칸만 창문처럼 잘라 보여줘요 (돌린 조각은 칸 가운데를 중심으로 돌려요)
  function pieceSVG(r, o, size) {
    const [pr, pc] = o.cell, x = pc * CELL, y = pr * CELL;
    let inner = sceneInner(r, o.mod);
    if (o.angle) inner = `<g transform="rotate(${o.angle} ${x + 50} ${y + 50})">${inner}</g>`;
    return `<svg viewBox="${x} ${y} ${CELL} ${CELL}" width="${size}" height="${size}" style="border-radius:8px;display:block" aria-hidden="true">${inner}</svg>`;
  }

  /* 동네 그림 한 장 만들기 (다른 그림 찾기에서도 써요)
     cols×rows 칸마다 서로 다른 물건 하나: 위 줄 하늘, 가운데 줄 집·나무, 아래 줄 과일 */
  function makeScene(rng, cols, rows, jitter) {
    const W = cols * CELL, H = rows * CELL;
    // 하늘·땅 경계: 2줄 그림은 첫 줄 아래쪽, 3줄 그림은 가운데 줄 아래쪽
    const landRow = rows === 2 ? 0 : 1;
    const horizon = landRow * CELL + randInt(rng, 74, 84);
    const hills = range(randInt(rng, 2, 3)).map(() => [randInt(rng, 0, W), randInt(rng, 60, 110), randInt(rng, 14, 22)]);
    // 길: 아래 가장자리에서 하늘·땅 경계까지 구불구불
    const x0 = randInt(rng, 0.25 * W, 0.75 * W), x1 = randInt(rng, 0.2 * W, 0.8 * W);
    const road = `M${x0} ${H + 10} C${x0 + randInt(rng, -90, 90)} ${H - 0.4 * (H - horizon)}, ${x1 + randInt(rng, -90, 90)} ${horizon + 0.4 * (H - horizon)}, ${x1} ${horizon + 2}`;
    const pools = { sky: shuffle(rng, SKY.slice()), land: shuffle(rng, LAND.slice()), ground: shuffle(rng, GROUND.slice()) };
    if (pools.sky.indexOf('sun') >= cols) { pools.sky.splice(pools.sky.indexOf('sun'), 1); pools.sky.splice(randInt(rng, 0, cols - 1), 0, 'sun'); }   // 해는 늘 보이게
    const items = [];
    for (let rr = 0; rr < rows; rr++) for (let cc = 0; cc < cols; cc++) {
      const zone = rr < landRow ? 'sky' : (rr === landRow ? 'land' : 'ground');
      const obj = pools[zone].shift();
      const jx = randInt(rng, -jitter, jitter), jy = randInt(rng, -jitter, jitter);
      const x = cc * CELL + 50 + jx;
      const y = zone === 'land' ? horizon + randInt(rng, 2, 8) : rr * CELL + (zone === 'sky' ? 48 : 52) + jy;
      items.push({ obj, zone, x, y, row: rr, col: cc });
    }
    return { cols, rows, horizon, hills, road, items };
  }

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const type = pickType(rng, cfg.types, hist.typeHistory);
    const { cols, rows } = cfg;
    for (let attempt = 0; attempt < 100; attempt++) {
      const { horizon, hills, road, items } = makeScene(rng, cols, rows, cfg.jitter);
      const r0 = { cols, rows, road }, roads = roadCells(r0);
      // 빠진 칸 고르기
      let cand = items.map((it, i) => i);
      if (type === 'turn') cand = cand.filter(i => items[i].zone === 'land');          // 하늘·땅이 함께 있는 칸이라 거꾸로 돌리면 확실히 달라요
      if (type === 'look') cand = cand.filter(i => items[i].zone === 'land' || roads.includes(items[i].row + ',' + items[i].col));
      if (!cand.length) continue;
      const mi = cand[Math.floor(rng() * cand.length)], miss = items[mi];
      const opts = [{ kind: 'correct', cell: [miss.row, miss.col], angle: 0 }];
      if (type === 'look') {
        // 땅 경계가 있는 칸은 경계 높이를, 길이 지나는 칸은 길을 바꿔요 (둘 다 되면 둘 중 하나)
        const onRoad = roads.includes(miss.row + ',' + miss.col);
        const useRoad = onRoad && (miss.zone !== 'land' || rng() < 0.5);
        const dy = [-18, -15, 12, 14][Math.floor(rng() * 4)];
        opts.push(useRoad ? { kind: 'look', cell: [miss.row, miss.col], angle: 0, mod: { noRoad: true }, how: 'road' }
          : { kind: 'look', cell: [miss.row, miss.col], angle: 0, mod: { dy }, how: 'horizon' });
      }
      if (type === 'turn') opts.push({ kind: 'turn', cell: [miss.row, miss.col], angle: cfg.angles[Math.floor(rng() * cfg.angles.length)] });
      // 나머지는 그림의 다른 칸. near 단계는 같은 줄(배경이 비슷한) 칸을 먼저 써요
      let others = shuffle(rng, items.filter((_, i) => i !== mi));
      const sameRow = others.filter(it => it.row === miss.row), otherRow = others.filter(it => it.row !== miss.row);
      others = cfg.near ? sameRow.concat(otherRow) : otherRow.concat(sameRow);
      for (const it of others) { if (opts.length >= cfg.opts) break; opts.push({ kind: 'other', cell: [it.row, it.col], angle: 0, obj: it.obj }); }
      const options = shuffle(rng, opts);
      const answerIdx = options.findIndex(o => o.kind === 'correct');
      return { seed, level, type, cols, rows, horizon, hills, road, items, missing: [miss.row, miss.col], missObj: miss.obj, options, answerIdx, answer: [answerIdx] };
    }
    throw new Error('그림 문제를 만들지 못했어요');
  }

  /* ---------- 화면 ---------- */
  const picWidth = r => Math.min(320, Math.round(184 * r.cols / r.rows));
  function render(r) {
    const n = r.options.length, size = n > 3 ? 100 : 108;
    $('#arena').innerHTML = `<div class="pz-card">${pictureSVG(r, picWidth(r), true)}</div>
      <div class="wd-opts">${r.options.map((o, k) => `<button type="button" class="wd-opt pz-opt pop" data-action="pick" data-value="${k}" aria-label="조각 ${k + 1}" style="width:${size + 14}px;height:${size + 14}px;animation-delay:${k * 60}ms">${pieceSVG(r, o, size)}</button>`).join('')}</div>`;
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  window.SceneArt = { CELL, ROOF, BALLOON, KITE, TREE, FRUITS, makeScene, sceneInner, objSVG, objName };
  const DEMO = buildRound(1, 20261124, { typeHistory: [] });
  registerGame({
    id: 'puzzle', category: 'space', name: '빈칸에 그림 맞추기', short: '그림에서 빠진 조각을<br>찾아 맞춰요', direct: true, rounds: 10,
    thumb() { return `<div style="position:absolute;left:14px;top:10px">${pictureSVG(DEMO, 126, true)}</div><div style="position:absolute;left:152px;top:22px;padding:3px;border-radius:10px;border:3px solid #2E7D4F;background:#EEF6F0">${pieceSVG(DEMO, DEMO.options[DEMO.answerIdx], 46)}</div>`; },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:40px;right:0;top:4px;display:flex;justify-content:center">${pictureSVG(DEMO, 120, true)}</div>`, '그림에서 한 조각이<br>빠져 있어요'],
        [`<div style="position:absolute;left:40px;right:0;top:14px;display:flex;justify-content:center;gap:6px">${DEMO.options.map(o => pieceSVG(DEMO, o, 50)).join('')}</div>`, '보기 조각을<br>살펴봐요'],
        [`<div style="position:absolute;left:0;right:0;top:4px;display:flex;justify-content:center">${pictureSVG(DEMO, 120, false)}</div>`, '빈칸에 꼭 맞는<br>조각을 눌러요'],
      ];
    },
    ruleTalk: '동네 그림에서 한 조각이 빠져 있어요. 아래 보기에서 빈칸에 꼭 맞는 조각을 골라 주세요. 그림에 이미 있는 조각이나, 옆 그림과 선이 이어지지 않는 조각은 정답이 아니에요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '빈칸에 그림 맞추기를 시작해요', sub: `그림이 ${cfg.cols * cfg.rows}조각으로 나뉘어 있어요.<br>시간 제한이 없으니 천천히 하셔도 괜찮아요`,
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">${['other', 'look', 'turn'].map(t => { const on = cfg.types.includes(t);
          return `<span class="chip ${on ? 'chip-teal' : ''}" style="height:40px;font-size:19px;${on ? '' : 'opacity:.45'}">${TYPE_NAME[t]}${on ? '' : ' (다음 단계)'}</span>`; }).join('')}</div>`,
        talk: '빈칸에 그림 맞추기를 시작해요. 천천히 하셔도 괜찮아요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      const sub = r.type === 'turn' ? '거꾸로 돌아간<br>조각도 있어요' : (r.type === 'look' ? '옆 그림과 선이<br>이어지는지 봐요' : '그림에 이미 있는<br>조각은 아니에요');
      return { chip: TYPE_NAME[r.type], head: '빈칸에 맞는<br>조각은?', size: 30, sub, talk: '그림에서 빠진 자리에 꼭 맞는 조각을 골라 주세요.' };
    },
    pickCount() { return 1; },
    enablePicking(r) { render(r); },
    markPicks() {},
    score(r, picks) { r.lastPick = r.options[picks[0]]; return picks[0] === r.answerIdx ? 100 : 0; },
    reveal(r, picks) {
      const o = r.options[picks[0]];
      // 빈칸을 채운 그림을 보여주고, 다른 칸 조각을 골랐으면 그 조각의 원래 자리를 점선으로 알려줘요
      $('#arena .pz-card').innerHTML = pictureSVG(r, picWidth(r), false, o.kind === 'other' ? o.cell : null);
      $$('#arena .wd-opt').forEach(el => {
        const k = Number(el.dataset.value);
        el.disabled = true; el.classList.remove('pop');
        el.classList.toggle('right', k === r.answerIdx);
        el.classList.toggle('wrongPick', picks.includes(k) && k !== r.answerIdx);
      });
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) {
      if (acc === 100) return { detail: '꼭 맞는 조각을<br>찾으셨어요', talk: `맞아요. 빈칸에는 ${objName(r.missObj)}가 있는 조각이 들어가요.`.replace(/(.)가 있는/, (m, ch) => (hasBatchim(ch) ? ch + '이 있는' : m)) };
      const o = r.lastPick || {};
      const why = o.kind === 'other' ? '고르신 조각은 그림의 다른 자리, 점선으로 표시한 곳의 조각이에요.'
        : o.kind === 'look' ? (o.how === 'road' ? '고르신 조각에는 길이 없어서 옆 조각의 길과 이어지지 않아요.' : '고르신 조각은 하늘과 땅의 경계 높이가 옆 조각과 맞지 않아요.')
        : '고르신 조각은 거꾸로 돌아간 조각이에요.';
      return { detail: '초록색 조각이<br>정답이에요', talk: why };
    },
    detail(r, picks) {
      const o = r.options[picks[0]];
      const label = x => x.kind === 'correct' ? 'correct' : x.kind === 'turn' ? 'turn:' + x.angle : x.kind === 'look' ? 'look:' + x.how : 'other:' + x.obj;
      return { puzzleType: r.type, cols: r.cols, rows: r.rows, pieces: r.cols * r.rows, missing: r.missing.join(','), missingObj: r.missObj,
        picture: r.items.map(it => it.obj), options: r.options.map(label), chosenKind: o.kind, chosen: label(o) };
    },
    answerKey(r) { return [r.type]; },
    _test: { buildRound, LEVELS, roadCells, sceneInner, pieceSVG },
  });
})();
