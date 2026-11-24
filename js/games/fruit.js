/* =========================================================
   과일 떨어지기 (카테고리: 기억력·주의력)
   과일가게 차양 아래에서 과일이 떨어져 바구니에 쏙 들어가요 →
   보자기로 덮고 (높은 단계는 바구니가 자리를 바꾸고) → 어디 있는지 맞혀요.
   ========================================================= */
(function () {
  /* 난이도 표
     fruits: 과일 수 [최소, 최대]  baskets: 바구니 수  mode: seq(하나씩) / simul(동시에)
     path: straight(곧게) / diagonal(비스듬히) / wobble(흔들리며)  swaps: 자리 바꾸기 횟수
     fall: 떨어지는 시간(ms)  mem: 들어간 뒤 덮기 전까지 보여주는 시간(ms)  distinct: 같은 색 계열 과일 피하기 */
  const LEVELS = {
    1: { fruits: [2, 2], baskets: 3, mode: 'seq',   path: 'straight', swaps: [0, 0], fall: 1400, mem: 2600, swapDur: 0,    types: ['where'],                 distinct: true },
    2: { fruits: [3, 3], baskets: 4, mode: 'seq',   path: 'straight', swaps: [0, 0], fall: 1250, mem: 2400, swapDur: 0,    types: ['where', 'what'],         distinct: true },
    3: { fruits: [3, 3], baskets: 4, mode: 'simul', path: 'diagonal', swaps: [0, 0], fall: 1150, mem: 2200, swapDur: 0,    types: ['where', 'what', 'two'],  distinct: true },
    4: { fruits: [4, 4], baskets: 5, mode: 'simul', path: 'diagonal', swaps: [1, 1], fall: 1050, mem: 2000, swapDur: 1300, types: ['where', 'what', 'two'],  distinct: false },
    5: { fruits: [4, 5], baskets: 6, mode: 'simul', path: 'wobble',   swaps: [2, 3], fall: 950,  mem: 1800, swapDur: 1100, types: ['where', 'what', 'two'],  distinct: false },
  };
  /* 문제 유형: where 이 과일은 어느 바구니? / what 이 바구니엔 무엇? / two 두 과일 바구니를 순서대로 */

  /* 과일 8종: 색과 모양이 모두 달라요. batchim: 받침 여부(은/는, 을/를 고르기용) */
  const FRUITS = [
    { id: 'apple', name: '사과', batchim: false, group: 'red' },
    { id: 'tangerine', name: '귤', batchim: true, group: 'orange' },
    { id: 'melon', name: '참외', batchim: false, group: 'yellow' },
    { id: 'banana', name: '바나나', batchim: false, group: 'yellow' },
    { id: 'watermelon', name: '수박', batchim: true, group: 'green' },
    { id: 'grape', name: '포도', batchim: false, group: 'purple' },
    { id: 'peach', name: '복숭아', batchim: false, group: 'pink' },
    { id: 'pear', name: '배', batchim: false, group: 'tan' },
  ];
  const J = {           // 조사 붙이기
    topic: f => f.name + (f.batchim ? '은' : '는'),
    obj: f => f.name + (f.batchim ? '을' : '를'),
    subj: f => f.name + (f.batchim ? '이' : '가'),
    was: f => f.name + (f.batchim ? '이었어요' : '였어요'),
  };

  /* ---------- 과일 그림 (SVG, 60x60 기준) ---------- */
  function fruitSVG(f, size) {
    const hi = '<ellipse cx="21" cy="25" rx="4" ry="6" fill="#FFFFFF" opacity="0.35"/>';
    const leaf = (x, y) => `<path d="M${x} ${y}c4-5 10-6 13-4-3 5-9 6-13 4z" fill="#5BA04A"/>`;
    const stem = (x, y) => `<path d="M${x} ${y}c0-4 1-7 3-9" stroke="#6B4423" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    let g = '';
    if (f.id === 'apple') g = `<path d="M30 17c-4-3-12-4-17 1-6 6-5 18 0 26 4 6 9 9 13 8 2-1 3-1 4-1s2 0 4 1c4 1 9-2 13-8 5-8 6-20 0-26-5-5-13-4-17-1z" fill="#D8433B"/>${stem(30, 17)}${leaf(33, 10)}${hi}`;
    if (f.id === 'tangerine') g = `<circle cx="30" cy="34" r="19" fill="#F39A2B"/>` + [[22, 28], [36, 26], [28, 40], [40, 38], [20, 40], [33, 47]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#D97F17"/>`).join('') + `<circle cx="30" cy="16" r="2.6" fill="#6B8E3A"/>${leaf(31, 15)}${hi}`;
    if (f.id === 'melon') g = `<ellipse cx="30" cy="33" rx="23" ry="17" fill="#F6C83A"/>` + [-12, -4, 4, 12].map(dx => `<path d="M${30 + dx} 17 q${dx * 0.5} 16 0 32" stroke="#FFF6D2" stroke-width="2.6" fill="none"/>`).join('') + `<circle cx="7.5" cy="33" r="2.2" fill="#8DA24A"/><circle cx="52.5" cy="33" r="2.2" fill="#8DA24A"/>${hi}`;
    if (f.id === 'banana') g = `<path d="M9 17 C9 41 30 53 53 42 L50 35 C32 42 18 32 16 15 Z" fill="#F4D23C" stroke="#D9B22A" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 22 C17 36 30 44 47 40" stroke="#E5BF2C" stroke-width="2" fill="none"/><path d="M9 17 L8 11 L15 13 Z" fill="#6B4423"/><rect x="51" y="37" width="5" height="5" rx="1.5" fill="#6B4423"/>`;
    if (f.id === 'watermelon') g = `<circle cx="30" cy="32" r="21" fill="#3E8E3E"/>` + [-11, 0, 11].map(dx => `<path d="M${30 + dx} 12 l-3 6 l3 6 l-3 6 l3 6 l-3 6 l3 6" stroke="#1F5E24" stroke-width="3" fill="none" stroke-linejoin="round"/>`).join('') + `<path d="M30 11 v-4" stroke="#6B4423" stroke-width="2.5" stroke-linecap="round"/>${hi}`;
    if (f.id === 'grape') g = `${stem(30, 14)}${leaf(32, 9)}` + [[20, 22], [30, 21], [40, 22], [25, 31], [35, 31], [20, 40], [30, 40], [40, 40], [25, 49], [35, 49], [30, 57]]
      .filter(([, y]) => y < 57).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.3" fill="#7D4AA0"/><circle cx="${x - 2}" cy="${y - 2}" r="1.6" fill="#FFFFFF" opacity="0.35"/>`).join('');
    if (f.id === 'peach') g = `<path d="M30 15c-12 0-20 9-20 20 0 11 9 19 20 19s20-8 20-19c0-11-8-20-20-20z" fill="#F59BA8"/><path d="M30 16 q-7 18 0 37" stroke="#E07C8C" stroke-width="2" fill="none"/>${leaf(31, 15)}<ellipse cx="20" cy="29" rx="4" ry="6" fill="#FFFFFF" opacity="0.35"/>`;
    if (f.id === 'pear') g = `<path d="M30 12c-5 0-7 5-7 10 0 5-10 9-10 19 0 9 7 14 17 14s17-5 17-14c0-10-10-14-10-19 0-5-2-10-7-10z" fill="#D2B86A"/>` + [[24, 38], [36, 42], [30, 48], [38, 34], [22, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#A88E45"/>`).join('') + `${stem(30, 13)}<ellipse cx="23" cy="36" rx="3.5" ry="5" fill="#FFFFFF" opacity="0.35"/>`;
    return `<svg viewBox="0 0 60 60" width="${size}" height="${size}" aria-hidden="true">${g}</svg>`;
  }
  /* 바구니(뒤쪽, 앞쪽)와 보자기 */
  const BASKET_BACK = '<svg class="layer" width="84" height="58" viewBox="0 0 84 58" aria-hidden="true"><ellipse cx="42" cy="10" rx="38" ry="9" fill="#6B4423"/><path d="M4 10 Q42 -6 80 10" stroke="#9C6B37" stroke-width="4" fill="none"/></svg>';
  const BASKET_FRONT = '<svg class="layer" width="84" height="58" viewBox="0 0 84 58" aria-hidden="true"><path d="M4 10 Q42 26 80 10 L72 52 Q70 58 62 58 L22 58 Q14 58 12 52 Z" fill="#C8955A"/>' +
    [22, 32, 42, 52, 62].map(x => `<path d="M${x} ${x === 42 ? 18 : 17} L${x + (x - 42) * 0.12} 57" stroke="#B68246" stroke-width="2"/>`).join('') +
    '<path d="M9 28 Q42 42 75 28" stroke="#A9773F" stroke-width="2.5" fill="none"/><path d="M11 42 Q42 54 73 42" stroke="#A9773F" stroke-width="2.5" fill="none"/><path d="M4 10 Q42 26 80 10" stroke="#9C6B37" stroke-width="5" fill="none" stroke-linecap="round"/></svg>';
  const CLOTH = '<svg class="cloth" width="96" height="62" viewBox="0 0 96 62" aria-hidden="true"><path d="M4 44 Q0 26 16 20 Q48 6 80 20 Q96 26 92 44 Q72 56 48 51 Q24 56 4 44 Z" fill="#5E7FA8"/>' +
    [[22, 32], [38, 26], [58, 26], [74, 32], [30, 42], [48, 38], [66, 42]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#8FA9C9"/>`).join('') +
    '<path d="M48 17 L35 5 Q33 13 42 19 Z" fill="#4D6C93"/><path d="M48 17 L61 5 Q63 13 54 19 Z" fill="#4D6C93"/><circle cx="48" cy="18" r="6" fill="#4D6C93"/></svg>';
  const basketMini = (w, cloth) => `<div style="position:relative;width:84px;height:92px;transform:scale(${w / 84});transform-origin:0 0">${BASKET_BACK.replace('class="layer"', 'class="layer" style="position:absolute;left:0;top:34px"')}${BASKET_FRONT.replace('class="layer"', 'class="layer" style="position:absolute;left:0;top:34px"')}${cloth ? CLOTH.replace('class="cloth"', 'style="position:absolute;left:-6px;top:6px"') : ''}</div>`;

  /* ---------- 한 판 만들기 (같은 seed → 항상 같은 판) ---------- */
  const W = 560, WAIT_Y = 72, BASKET_TOP = 198, LAND_Y = BASKET_TOP + 14 + 25;
  const slotX = (s, nB) => W * (s + 0.5) / nB;
  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const nF = randInt(rng, cfg.fruits[0], cfg.fruits[1]), nB = cfg.baskets;
    const prev = hist.prevAnswers || [];
    const fruits = [];
    for (const f of shuffle(rng, FRUITS)) {
      if (fruits.length >= nF) break;
      if (cfg.distinct && fruits.some(x => x.group === f.group)) continue;   // 쉬운 단계는 비슷한 색을 피해요
      fruits.push(f);
    }
    const type = pickType(rng, cfg.types, hist.typeHistory);
    const home = shuffle(rng, range(nB)).slice(0, nF);         // home[i]: 과일 i가 들어갈 바구니(처음 자리)
    const startX = cfg.path === 'straight' ? home.map(b => slotX(b, nB))
      : shuffle(rng, range(nF)).map(k => 40 + 480 * (nF === 1 ? 0.5 : k / (nF - 1)));   // 다른 자리에서 비스듬히
    const dropOrder = shuffle(rng, range(nF));
    const stagger = dropOrder.map(() => randInt(rng, 0, 220));
    // 자리 바꾸기: 과일이 든 바구니가 꼭 한 번은 움직이게
    const nSw = randInt(rng, cfg.swaps[0], cfg.swaps[1]);
    const arr = range(nB);                                     // arr[자리] = 그 자리에 있는 바구니 번호
    const swaps = [];
    for (let k = 0; k < nSw; k++) {
      const filled = range(nB).filter(s => home.includes(arr[s]));
      const a = (k === 0 || rng() < 0.7) ? filled[Math.floor(rng() * filled.length)] : randInt(rng, 0, nB - 1);
      let b = randInt(rng, 0, nB - 2); if (b >= a) b++;
      swaps.push({ a, b });
      [arr[a], arr[b]] = [arr[b], arr[a]];
    }
    const fruitSlot = i => arr.indexOf(home[i]);              // 과일 i가 마지막에 있는 자리
    const cand = range(nF).filter(i => !prev.includes(fruits[i].name));
    const pool = cand.length ? cand : range(nF);
    const fa = pool[Math.floor(rng() * pool.length)];
    let fb = randInt(rng, 0, nF - 2); if (fb >= fa) fb++;
    let answer, asked, askSlot = null, options = null;
    if (type === 'where') { asked = [fa]; answer = [fruitSlot(fa)]; }
    else if (type === 'what') { asked = [fa]; askSlot = fruitSlot(fa); answer = [fa]; options = shuffle(rng, range(nF)); }
    else { asked = [fa, fb]; answer = [fruitSlot(fa), fruitSlot(fb)]; }
    return {
      seed, level, type, nF, nB, fruits, home, startX, dropOrder, stagger, swaps, finalArr: arr.slice(),
      finalSlots: range(nF).map(fruitSlot), asked, answer, askSlot, options,
      mode: cfg.mode, path: cfg.path, fall: cfg.fall, mem: cfg.mem, swapDur: cfg.swapDur,
    };
  }
  function buildTimeline(r, slow) {
    const drops = [];
    const t0 = 700 * slow;
    r.dropOrder.forEach((fi, k) => {
      const s = r.mode === 'seq' ? t0 + k * (r.fall + 500) * slow : t0 + r.stagger[k] * slow;
      drops[fi] = { t0: s, t1: s + r.fall * slow };
    });
    const lastLand = Math.max(...drops.map(d => d.t1));
    const coverAt = lastLand + r.mem * slow;                   // 다 들어간 뒤 잠시 보여주고 덮어요
    let st = coverAt + 800 * slow;
    const swaps = r.swaps.map(sw => { const s = Object.assign({}, sw, { t0: st, t1: st + r.swapDur * slow }); st = s.t1 + 350 * slow; return s; });
    const total = (swaps.length ? swaps[swaps.length - 1].t1 : coverAt + 600 * slow) + 500 * slow;
    return { drops, coverAt, swaps, total };
  }

  /* ---------- 놀이판 그리기 ---------- */
  const S = { round: null, fruitEls: [], basketEls: [], landed: [], covered: false };
  function renderArena(r) {
    let awning = '';
    for (let k = 0; k < 14; k++) {
      const c = k % 2 ? '#D9694F' : '#FFF4E8';
      awning += `<rect x="${k * 40}" y="0" width="40" height="30" fill="${c}"/><path d="M${k * 40} 30 a20 12 0 0 0 40 0 z" fill="${c}"/>`;
    }
    let html = `<svg width="560" height="44" viewBox="0 0 560 44" style="position:absolute;left:0;top:-8px" aria-hidden="true">${awning}<rect x="0" y="0" width="560" height="6" fill="#A9472F"/></svg>
      <div style="position:absolute;left:-10px;top:290px;width:580px;height:16px;border-radius:6px;background:#B8875A;box-shadow:0 5px 0 #9A6C43"></div>`;
    for (let id = 0; id < r.nB; id++) {
      html += `<button type="button" class="basket" data-action="pick" data-value="${id}" data-id="${id}" disabled aria-label="바구니"
        style="left:${Math.round(slotX(id, r.nB) - 42)}px;top:${BASKET_TOP}px;z-index:10">${BASKET_BACK}<div class="slot"></div>${BASKET_FRONT}${CLOTH}</button>`;
    }
    r.fruits.forEach((f, i) => {
      html += `<div class="fruit" id="fr-${i}" role="img" aria-label="${f.name}" style="left:${Math.round(r.startX[i] - 25)}px;top:${WAIT_Y - 25}px;z-index:20">${fruitSVG(f, 50)}</div>`;
    });
    html += '<div id="f-ui"></div>';
    $('#arena').innerHTML = html;
    $('#arena').classList.remove('choosing');
    S.round = r; S.covered = false; S.landed = r.fruits.map(() => false);
    S.fruitEls = r.fruits.map((_, i) => $('#fr-' + i));
    S.basketEls = range(r.nB).map(id => $(`#arena .basket[data-id="${id}"]`));
  }
  function layoutBaskets(tl, t) {
    const r = S.round, arr = range(r.nB);
    let moving = null;
    for (const sw of tl.swaps) {
      if (t >= sw.t1) { [arr[sw.a], arr[sw.b]] = [arr[sw.b], arr[sw.a]]; continue; }
      if (t >= sw.t0) moving = { sw, p: easeInOut((t - sw.t0) / (sw.t1 - sw.t0)) };
      break;
    }
    arr.forEach((id, slot) => {
      let x = slotX(slot, r.nB), y = 0, z = 10;
      if (moving && (slot === moving.sw.a || slot === moving.sw.b)) {      // 하나는 높이, 하나는 낮게 지나가요
        const { sw, p } = moving, other = slot === sw.a ? sw.b : sw.a;
        x = slotX(slot, r.nB) + (slotX(other, r.nB) - slotX(slot, r.nB)) * p;
        y = -Math.sin(Math.PI * p) * (slot === sw.a ? 56 : 18);
        z = slot === sw.a ? 9 : 11;
      }
      const el = S.basketEls[id];
      el.style.left = Math.round(x - 42) + 'px'; el.style.top = Math.round(BASKET_TOP + y) + 'px'; el.style.zIndex = z;
    });
  }
  function frame(tl, t) {
    const r = S.round;
    layoutBaskets(tl, t);
    r.fruits.forEach((f, i) => {
      if (S.landed[i]) return;
      const d = tl.drops[i], el = S.fruitEls[i];
      let x = r.startX[i], y = WAIT_Y;
      if (t >= d.t1) {                                        // 바구니 안으로 쏙
        S.landed[i] = true;
        S.basketEls[r.home[i]].querySelector('.slot').appendChild(el);
        el.style.left = '0px'; el.style.top = '0px'; el.style.zIndex = 'auto';   // 바구니 안에서는 보자기 아래로
        Sound.pop();
        return;
      }
      if (t >= d.t0) {
        const p = (t - d.t0) / (d.t1 - d.t0), bx = slotX(r.home[i], r.nB);
        x = r.startX[i] + (bx - r.startX[i]) * easeInOut(p);
        if (r.path === 'wobble') x += Math.sin(p * Math.PI * 3) * 18 * (1 - p);
        y = WAIT_Y + (LAND_Y - WAIT_Y) * p * p;               // 점점 빨라지게(중력)
      }
      el.style.left = Math.round(x - 25) + 'px'; el.style.top = Math.round(y - 25) + 'px';
    });
    if (!S.covered && t >= tl.coverAt) { S.covered = true; S.basketEls.forEach(b => b.classList.add('covered')); }
  }
  const basketAtSlot = slot => S.basketEls[S.round.finalArr[slot]];
  function uncoverAll() { S.basketEls.forEach(b => b.classList.remove('covered', 'pickable', 'picked', 'ask')); }

  window.FruitArt = { FRUITS, fruitSVG, J };                 // 과일 그림을 다른 놀이(규칙 찾기)에서도 써요

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  registerGame({
    id: 'fruit', category: 'memory', name: '과일 떨어지기', short: '과일이 어느 바구니에<br>들어갔을까요?',
    thumb() {
      let aw = '';
      for (let k = 0; k < 8; k++) aw += `<rect x="${k * 30}" y="0" width="30" height="16" fill="${k % 2 ? '#D9694F' : '#FFF4E8'}"/>`;
      return `<svg width="240" height="16" viewBox="0 0 240 16" style="position:absolute;left:0;top:0" aria-hidden="true">${aw}</svg>` +
        at(36, 44, basketMini(54, false)) + at(100, 44, basketMini(54, true)) + at(164, 44, basketMini(54, false)) +
        at(52, 40, fruitSVG(FRUITS[0], 30)) + at(120, 18, fruitSVG(FRUITS[2], 32)) + at(180, 38, fruitSVG(FRUITS[5], 30));
    },
    ruleCards() {
      return [
        [at(36, 2, fruitSVG(FRUITS[0], 44)) + at(128, 14, basketMini(70, false)) +
          `<svg width="213" height="100" viewBox="0 0 213 100" style="position:absolute;left:0;top:0" aria-hidden="true"><path d="M82 22 Q140 2 158 34" fill="none" stroke="#CDB68A" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round"/><path d="M150 30 L159 38 L163 27" fill="none" stroke="#B8501A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
          '과일이 떨어져<br>바구니에 쏙!'],
        [at(30, 8, basketMini(76, true)) + at(112, 8, basketMini(76, true)), '보자기로<br>바구니를 덮어요'],
        [at(66, 8, basketMini(76, true)) + `<div style="position:absolute;left:118px;top:50px">${ICON.finger}</div>` +
          `<div style="position:absolute;left:10px;top:0;width:52px;height:52px;border-radius:50%;background:#FFF1E6;display:flex;align-items:center;justify-content:center">${fruitSVG(FRUITS[2], 40)}</div>`,
          '물어보는 과일이<br>어디 있는지 눌러요'],
      ];
    },
    ruleTalk: '과일이 위에서 떨어져 바구니에 쏙 들어가요. 그다음 보자기로 바구니를 덮어요. 높은 단계에서는 바구니가 자리를 바꿔요. 물어보는 과일이 어느 바구니에 있는지 눌러 주세요.',
    buildRound,
    readyInfo(r) {
      const list = r.fruits.map(f => f.name).join(', ');
      return {
        chip: `과일 ${r.nF}개 · 바구니 ${r.nB}개`, title: '오늘 떨어질 과일이에요',
        sub: '어느 바구니에 들어가는지<br>잘 기억해 주세요',
        body: r.fruits.map(f => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:92px">${fruitSVG(f, 72)}<span style="font-size:20px;font-weight:700">${f.name}</span></div>`).join(''),
        talk: `오늘은 ${list}${r.fruits[r.nF - 1].batchim ? '이' : '가'} 떨어져요. 어느 바구니에 들어가는지 잘 기억해 주세요.`,
      };
    },
    setup(r) { renderArena(r); },
    intro(r, roundNo) {
      const list = r.fruits.map(f => f.name).join(', ');
      return {
        title: roundNo === 1 ? '시작해요!' : '새 과일이에요',
        html: `<div style="display:flex;flex-wrap:wrap;gap:6px">${r.fruits.map(f => fruitSVG(f, 52)).join('')}</div>` +
          (r.swaps.length ? '<p style="font-size:18px;color:#B8501A">덮은 뒤 바구니가<br>움직여요!</p>' : ''),
        talk: `${list}${r.fruits[r.nF - 1].batchim ? '이' : '가'} 떨어져요.` + (r.swaps.length ? ' 덮은 뒤에 바구니가 움직이니 잘 따라가 보세요.' : ' 잘 보세요.'),
        wait: r.swaps.length ? 2600 : 2100,
      };
    },
    watchText(r) { return r.swaps.length ? '덮은 바구니를<br>눈으로 따라가요' : '어느 바구니에<br>들어가는지 보세요'; },
    resetForPlay(r) { renderArena(r); },
    play(r, slow, done) {
      const tl = buildTimeline(r, slow);
      Runner.run(tl.total, t => frame(tl, t), done);
    },
    beforeQuestion() { return 300; },
    question(r) {
      const A = r.fruits[r.asked[0]], B = r.asked[1] !== undefined ? r.fruits[r.asked[1]] : null;
      if (r.type === 'where') return { head: `${fruitSVG(A, 46)}<br>${J.topic(A)}<br>어느 바구니에<br>있을까요?`, size: 28, talk: `${J.topic(A)} 어느 바구니에 있을까요?` };
      if (r.type === 'what') return { head: '이 바구니에는<br>무엇이<br>있을까요?', size: 28, sub: '위에서 과일을<br>골라 주세요', talk: '화살표 바구니에는 무엇이 있을까요? 위에서 과일을 골라 주세요.' };
      const icon = f => `<span style="display:inline-flex;vertical-align:middle">${fruitSVG(f, 28)}</span> ${f.name}`;
      return { chip: '두 개 찾기', head: '순서대로<br>눌러 주세요', size: 28, rows: [icon(A), icon(B)], talk: `${J.obj(A)} 먼저, 그다음 ${J.obj(B)} 찾아 주세요.` };
    },
    pickCount(r) { return r.type === 'two' ? 2 : 1; },
    enablePicking(r) {
      const ui = $('#f-ui');
      if (r.type === 'what') {
        const b = basketAtSlot(r.askSlot);
        b.classList.add('ask');
        ui.innerHTML = `<div id="f-arrow" style="left:${Math.round(slotX(r.askSlot, r.nB) - 20)}px;top:150px">${ICON.down}</div>
          <div id="f-opts">${r.options.map((fi, k) => `<button type="button" class="fopt pop" data-action="pick" data-value="${fi}" style="animation-delay:${k * 50}ms">${fruitSVG(r.fruits[fi], 66)}<span>${r.fruits[fi].name}</span></button>`).join('')}</div>`;
        return;
      }
      r.finalArr.forEach((id, slot) => {                     // 바구니 번호 → 지금 자리 번호로
        const el = S.basketEls[id];
        el.dataset.value = slot; el.disabled = false; el.classList.add('pickable');
        el.setAttribute('aria-label', `왼쪽에서 ${slot + 1}번째 바구니`);
      });
    },
    markPicks(r, picks) {
      S.basketEls.forEach(el => {
        el.querySelectorAll('.badge').forEach(b => b.remove());
        const k = picks.indexOf(Number(el.dataset.value));
        el.classList.toggle('picked', k >= 0 && r.type !== 'what');
        if (k >= 0 && r.type === 'two') el.insertAdjacentHTML('beforeend', `<span class="badge">${k + 1}</span>`);
      });
    },
    score(r, picks) { return r.type === 'two' ? orderScore(r.answer, picks) : (picks[0] === r.answer[0] ? 100 : 0); },
    reveal(r, picks) {          // 보자기를 걷고 정답 표시
      S.basketEls.forEach(el => { el.disabled = true; el.querySelectorAll('.badge').forEach(b => b.remove()); el.classList.remove('right', 'wrongPick'); });
      uncoverAll();
      if (r.type === 'what') {
        basketAtSlot(r.askSlot).classList.add('right');
        $$('#f-opts .fopt').forEach(el => {
          const v = Number(el.dataset.value);
          el.disabled = true; el.classList.remove('pop');
          el.classList.toggle('right', v === r.answer[0]);
          el.classList.toggle('wrongPick', picks.includes(v) && v !== r.answer[0]);
        });
        return;
      }
      r.answer.forEach((slot, k) => {
        const el = basketAtSlot(slot);
        el.classList.add('right');
        if (r.type === 'two') el.insertAdjacentHTML('beforeend', `<span class="badge" style="background:#2E7D4F">${k + 1}</span>`);
      });
      picks.forEach(slot => { if (!r.answer.includes(slot)) basketAtSlot(slot).classList.add('wrongPick'); });
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) {
      const A = r.fruits[r.asked[0]], B = r.asked[1] !== undefined ? r.fruits[r.asked[1]] : null;
      let detail, talk;
      if (r.type === 'where') { detail = acc === 100 ? '정확하게<br>기억하셨어요' : '초록 테두리<br>바구니였어요'; talk = `${J.topic(A)} 초록 테두리 바구니에 있었어요.`; }
      else if (r.type === 'what') { detail = acc === 100 ? '정확하게<br>기억하셨어요' : `정답은<br>${J.was(A)}`; talk = `그 바구니에는 ${J.subj(A)} 있었어요.`; }
      else {
        detail = acc === 100 ? '순서까지<br>정확해요' : (acc === 50 ? '두 바구니는 맞고<br>순서만 바뀌었어요' : (acc === 25 ? '한 바구니는<br>맞히셨어요' : '초록 숫자 순서<br>바구니였어요'));
        talk = `초록 1번 바구니에 ${J.subj(A)}, 2번 바구니에 ${J.subj(B)} 있었어요.`;
      }
      return { detail, talk };
    },
    detail(r, picks) {
      return {
        nFruits: r.nF, nBaskets: r.nB, dropMode: r.mode, path: r.path, swapCount: r.swaps.length,
        fruits: r.fruits.map(f => f.name), homeBaskets: r.home, finalSlots: r.finalSlots,
        askedFruits: r.asked.map(i => r.fruits[i].name), askedSlot: r.askSlot, answer: r.type === 'what' ? [r.fruits[r.answer[0]].name] : r.answer,
        chosen: r.type === 'what' ? picks.map(i => r.fruits[i].name) : picks,
      };
    },
    answerKey(r) { return r.asked.map(i => r.fruits[i].name); },
    _test: { buildRound, buildTimeline, FRUITS, fruitSVG, basketMini },
  });
})();
