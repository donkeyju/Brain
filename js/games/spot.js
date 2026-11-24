/* =========================================================
   다른 그림 찾기 (카테고리: 집중력)
   똑같아 보이는 동네 그림 두 장에서 다른 곳을 찾아 눌러요.
   그림은 "빈칸에 그림 맞추기"의 동네 그림을 다시 써요 (window.SceneArt).
   다른 곳의 종류
   - gone  : 한쪽 그림에만 물건이 없어요
   - color : 색이 달라요 (지붕·풍선·연 색, 나무 종류)
   - swap  : 다른 물건으로 바뀌었어요 (사과 → 포도, 해 → 구름)
   - move  : 물건 자리가 옆으로 조금 옮겨졌어요 (4단계부터)
   두 그림 중 어느 쪽을 눌러도 돼요. 다 찾으면 저절로 끝나고, "못 찾겠어요"로 끝낼 수도 있어요.
   ========================================================= */
(function () {
  const { CELL, ROOF, BALLOON, KITE, TREE, FRUITS, makeScene, sceneInner } = window.SceneArt;
  /* 난이도 표
     cols×rows: 그림 칸 수   k: 다른 곳 수   kinds: 나올 수 있는 다른 곳 종류 */
  const LEVELS = {
    1: { cols: 3, rows: 2, k: 1, kinds: ['gone', 'swap'],                 jitter: 4 },
    2: { cols: 3, rows: 2, k: 2, kinds: ['gone', 'swap', 'color'],        jitter: 6 },
    3: { cols: 4, rows: 3, k: 3, kinds: ['gone', 'swap', 'color'],        jitter: 8 },
    4: { cols: 4, rows: 3, k: 3, kinds: ['color', 'swap', 'move', 'gone'], jitter: 10 },
    5: { cols: 5, rows: 3, k: 4, kinds: ['color', 'move', 'swap', 'gone'], jitter: 12 },
  };
  const KIND_NAME = { gone: '없어진 것', color: '색이 다른 것', swap: '바뀐 것', move: '자리가 옮겨진 것' };
  const LOOKS = { apple: 'red', peach: 'red', tangerine: 'orange', melon: 'yellow', banana: 'yellow', watermelon: 'green', grape: 'purple', pear: 'tan' };

  // 색이 다른 것: 같은 종류의 다른 색 / 바뀐 것: 같은 줄에 어울리는 다른 물건 (그림에 없는 것)
  function colorVariants(o) {
    const [k, v] = o.split('_');
    const pick = (tbl, pre) => Object.keys(tbl).filter(x => x !== v).map(x => pre + x);
    if (k === 'house') return pick(ROOF, 'house_');
    if (k === 'balloon') return pick(BALLOON, 'balloon_');
    if (k === 'kite') return pick(KITE, 'kite_');
    if (k === 'tree') return pick(TREE, 'tree_');
    return [];
  }
  function swapVariants(o, zone, used) {
    const [k, v] = o.split('_');
    let pool;
    if (zone === 'sky') pool = ['sun', 'cloud', 'birds', 'balloon_red', 'kite_orange'];
    else if (zone === 'land') pool = k === 'house' ? ['tree_round', 'tree_pine'] : ['house_red', 'house_blue'];
    else pool = FRUITS.filter(f => LOOKS[f.id] !== LOOKS[v]).map(f => 'fruit_' + f.id);   // 확실히 다르게 생긴 과일로
    return pool.filter(x => x.split('_')[0] !== k || (k === 'fruit' && x !== o)).filter(x => !used.has(x));
  }

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    for (let attempt = 0; attempt < 100; attempt++) {
      const sc = makeScene(rng, cfg.cols, cfg.rows, cfg.jitter);
      const used = new Set(sc.items.map(it => it.obj));
      const diffs = [], objs = {}, dx = {};
      // 다른 곳은 서로 떨어진 칸에서 골라요 (붙어 있으면 헷갈려요)
      for (const i of shuffle(rng, range(sc.items.length))) {
        if (diffs.length >= cfg.k) break;
        const it = sc.items[i];
        if (diffs.some(d => Math.abs(sc.items[d.idx].row - it.row) + Math.abs(sc.items[d.idx].col - it.col) < 2)) continue;
        const kinds = shuffle(rng, cfg.kinds.slice());
        let made = null;
        for (const kind of kinds) {
          if (kind === 'gone') made = { kind, to: null };
          else if (kind === 'color') { const v = colorVariants(it.obj).filter(x => !used.has(x)); if (v.length) made = { kind, to: v[Math.floor(rng() * v.length)] }; }
          else if (kind === 'swap') { const v = swapVariants(it.obj, it.zone, used); if (v.length) made = { kind, to: v[Math.floor(rng() * v.length)] }; }
          else if (kind === 'move') made = { kind, shift: (rng() < 0.5 ? -1 : 1) * randInt(rng, 24, 30) };
          if (made) break;
        }
        if (!made) continue;
        if (made.to !== undefined) { objs[i] = made.to; if (made.to) used.add(made.to); } else dx[i] = made.shift;
        diffs.push(Object.assign({ idx: i, from: it.obj }, made));
      }
      if (diffs.length < cfg.k) continue;
      // 어느 그림을 바꿀지: 왼쪽·오른쪽 섞어서
      const side = diffs.map(() => (rng() < 0.5 ? 'L' : 'R'));
      const type = diffs.some(d => d.kind === 'move') ? 'move' : (diffs.some(d => d.kind === 'color') ? 'color' : 'basic');
      return { seed, level, type, scene: sc, cols: cfg.cols, rows: cfg.rows, diffs, side,
        answer: diffs.map(d => d.idx) };
    }
    throw new Error('다른 그림 문제를 만들지 못했어요');
  }
  // 바뀐 곳을 왼쪽·오른쪽 그림에 나눠 넣어요
  function mods(r) {
    const L = { objs: {}, dx: {} }, R = { objs: {}, dx: {} };
    r.diffs.forEach((d, k) => {
      const m = r.side[k] === 'L' ? L : R;
      if (d.kind === 'move') m.dx[d.idx] = d.shift; else m.objs[d.idx] = d.to;
    });
    return [L, R];
  }

  /* ---------- 화면 ---------- */
  const U = { found: [], wrong: [], taps: [], gaveUp: false };
  const picW = r => (r.cols / r.rows > 1.4 ? 272 : 262);
  function pic(r, mod, side) {
    const W = r.cols * CELL, H = r.rows * CELL, w = picW(r);
    return `<div class="sp-pic" data-side="${side}" style="width:${w}px;height:${Math.round(w * H / W)}px">
      <svg viewBox="0 0 ${W} ${H}" width="${w}" height="${Math.round(w * H / W)}" style="display:block;border-radius:12px" aria-hidden="true">${sceneInner(r.scene, mod)}<g class="sp-marks"></g></svg>
      <button type="button" class="sp-hit" data-action="game" data-op="tap" data-value="${side}" aria-label="${side === 'L' ? '왼쪽' : '오른쪽'} 그림 누르기"></button></div>`;
  }
  function render(r) {
    const [mL, mR] = mods(r);
    $('#arena').innerHTML = `<div class="sp-row">${pic(r, mL, 'L')}${pic(r, mR, 'R')}</div>
      <div class="sp-found" id="sp-found">${r.diffs.map(() => '<span class="sp-dot"></span>').join('')}</div>`;
    // 누른 자리(손가락 위치)를 기억해 두었다가 handle에서 써요
    $$('#arena .sp-hit').forEach(b => b.addEventListener('pointerdown', e => { U.pt = { clientX: e.clientX, clientY: e.clientY }; }));
  }
  // 다른 곳 표시: 두 그림 모두에 동그라미
  function markDiff(r, d, color, dash) {
    const it = r.scene.items[d.idx];
    const cx = it.x + (d.kind === 'move' ? d.shift / 2 : 0), cy = it.zone === 'land' ? it.y - 30 : it.y;
    const rad = d.kind === 'move' ? 50 : 42;
    $$('#arena .sp-marks').forEach(g => g.insertAdjacentHTML('beforeend',
      `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${color}" stroke-width="7" ${dash ? 'stroke-dasharray="12 9"' : ''} class="sp-ring"/>`));
  }
  function updateFound(r) {
    $$('#sp-found .sp-dot').forEach((el, k) => el.classList.toggle('on', k < U.found.length));
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  const DEMO = buildRound(2, 777, { typeHistory: [] });
  const miniPair = (w, ring) => { const [mL, mR] = mods(DEMO), W = DEMO.cols * CELL, H = DEMO.rows * CELL;
    const one = m => `<svg viewBox="0 0 ${W} ${H}" width="${w}" height="${Math.round(w * H / W)}" style="border-radius:6px" aria-hidden="true">${sceneInner(DEMO.scene, m)}${ring ? DEMO.diffs.map(d => { const it = DEMO.scene.items[d.idx]; return `<circle cx="${it.x}" cy="${it.zone === 'land' ? it.y - 30 : it.y}" r="42" fill="none" stroke="#2E7D4F" stroke-width="8"/>`; }).join('') : ''}</svg>`;
    return `<div style="display:flex;gap:6px">${one(mL)}${one(mR)}</div>`; };
  registerGame({
    id: 'spot', category: 'focus', name: '다른 그림 찾기', short: '두 그림에서<br>다른 곳을 찾아요', direct: true, rounds: 5,
    thumb() { return `<div style="position:absolute;left:12px;top:22px">${miniPair(96, false)}</div>`; },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:36px;right:0;top:12px;display:flex;justify-content:center">${miniPair(70, false)}</div>`, '두 그림이<br>조금 달라요'],
        [`<div style="position:absolute;left:36px;right:0;top:12px;display:flex;justify-content:center">${miniPair(70, true)}</div>`, '다른 곳을 찾아<br>눌러요'],
        [`<div style="position:absolute;left:0;right:0;top:18px;display:flex;justify-content:center;gap:6px">${[1, 1, 0].map(on => `<span style="width:22px;height:22px;border-radius:50%;border:3px solid #2E7D4F;background:${on ? '#2E7D4F' : '#FFFFFF'}"></span>`).join('')}</div>
          <div style="position:absolute;left:0;right:0;top:56px;text-align:center;font:700 16px 'Noto Sans KR'">다 찾으면 끝나요</div>`, '못 찾겠으면<br>알려 드려요'],
      ];
    },
    ruleTalk: '똑같아 보이는 그림 두 장이 있어요. 서로 다른 곳을 찾아서 눌러 주세요. 어느 그림을 눌러도 괜찮아요. 못 찾겠으면 못 찾겠어요 버튼을 누르세요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '다른 그림 찾기를 시작해요', sub: `다른 곳이 ${cfg.k}군데 있어요.<br>시간 제한이 없으니 천천히 찾아보세요`,
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">${['gone', 'swap', 'color', 'move'].map(t => { const on = cfg.kinds.includes(t);
          return `<span class="chip ${on ? 'chip-teal' : ''}" style="height:40px;font-size:19px;${on ? '' : 'opacity:.45'}">${KIND_NAME[t]}</span>`; }).join('')}</div>`,
        talk: '다른 그림 찾기를 시작해요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      return { chip: '', head: `다른 곳<br>${r.diffs.length}군데`, size: 30, sub: '찾으면 그 자리를<br>눌러 주세요',
        buttons: `<button type="button" class="btn btn-line" data-action="game" data-op="giveup" style="height:56px;font-size:21px">못 찾겠어요</button>`,
        talk: `두 그림에서 다른 곳 ${r.diffs.length}군데를 찾아 눌러 주세요.` };
    },
    pickCount() { return 1; },
    enablePicking(r) { Object.assign(U, { found: [], wrong: [], taps: [], gaveUp: false }); render(r); },
    markPicks() {},
    handle(op, side, el) {
      const r = G.round;
      if (op === 'giveup') { U.gaveUp = true; submitAnswer({ found: U.found.slice(), wrong: U.wrong.slice(), gaveUp: true }); return; }
      if (op !== 'tap') return;
      // 누른 자리(그림 좌표)를 구해서 가장 가까운 "다른 곳"과 비교해요
      const e = U.pt || window.event || { clientX: 0, clientY: 0 }, box = el.getBoundingClientRect();
      U.pt = null;
      const W = r.cols * CELL, H = r.rows * CELL;
      const gx = (e.clientX - box.left) / box.width * W, gy = (e.clientY - box.top) / box.height * H;
      noteTap();
      const hit = r.diffs.find(d => {
        if (U.found.includes(d.idx)) return false;
        const it = r.scene.items[d.idx], cy = it.zone === 'land' ? it.y - 30 : it.y;
        const cx = it.x + (d.kind === 'move' ? d.shift / 2 : 0);
        return Math.hypot(gx - cx, gy - cy) <= (d.kind === 'move' ? 62 : 54);     // 손가락이 굵어도 맞게 넉넉히
      });
      U.taps.push({ side, x: Math.round(gx), y: Math.round(gy), hit: hit ? hit.idx : null, at: Math.round(performance.now() - G.answerShownAt) });
      if (hit) {
        U.found.push(hit.idx); markDiff(r, hit, '#2E7D4F'); updateFound(r); Sound.pop();
        if (U.found.length === r.diffs.length) later(() => submitAnswer({ found: U.found.slice(), wrong: U.wrong.slice(), gaveUp: false }), 600);
      } else {
        // 이미 찾은 곳을 다시 누른 건 틀림으로 세지 않아요
        const again = r.diffs.some(d => U.found.includes(d.idx) && Math.hypot(gx - r.scene.items[d.idx].x, gy - r.scene.items[d.idx].y) <= 54);
        if (!again) {
          U.wrong.push([Math.round(gx), Math.round(gy)]);
          $$('#arena .sp-marks').forEach(g => g.insertAdjacentHTML('beforeend', `<g class="sp-x" opacity="0.85"><path d="M${gx - 12} ${gy - 12} L${gx + 12} ${gy + 12} M${gx + 12} ${gy - 12} L${gx - 12} ${gy + 12}" stroke="#8C8177" stroke-width="6" stroke-linecap="round"/></g>`));
          const xs = $$('#arena .sp-x'); later(() => xs.forEach(x => x.remove()), 700);
        }
      }
    },
    score(r, res) { return Math.round(100 * res.found.length / r.diffs.length); },
    isRight(r) { return G.picks.found.length === r.diffs.length; },
    reveal(r, res) {
      // 못 찾은 곳은 주황 점선으로 알려줘요
      r.diffs.filter(d => !res.found.includes(d.idx)).forEach(d => markDiff(r, d, '#E0803A', true));
      $$('#arena .sp-hit').forEach(el => { el.disabled = true; });
    },
    revealAfterReview() {},
    feedback(r, acc) {
      const res = G.picks, n = r.diffs.length, f = res.found.length;
      const missed = r.diffs.filter(d => !res.found.includes(d.idx)).map(d => KIND_NAME[d.kind]);
      return { tone: f === n ? 'good' : (f ? 'half' : 'low'), title: f === n ? '다 찾으셨어요!' : (f ? '아깝네요!' : '아쉬워요'),
        detail: `${n}군데 중 ${f}군데를<br>찾으셨어요`,
        talk: f === n ? '다른 곳을 모두 찾으셨어요.' : `주황색 점선이 못 찾은 곳이에요. ${missed.join(', ')}이 있었어요.` };
    },
    detail(r, res) {
      return { diffType: r.type, cols: r.cols, rows: r.rows, nDiffs: r.diffs.length, found: res.found.length, wrongTaps: res.wrong.length, gaveUp: res.gaveUp,
        diffs: r.diffs.map((d, k) => `${d.kind}:${d.from}${d.to !== undefined ? '→' + (d.to || '없음') : '→옆' + d.shift}@${r.side[k]}`),
        foundKinds: res.found.map(i => r.diffs.find(d => d.idx === i).kind), missedKinds: r.diffs.filter(d => !res.found.includes(d.idx)).map(d => d.kind),
        tapLog: U.taps.map(t => `${t.side}${t.x},${t.y}${t.hit !== null ? '✓' : ''}@${t.at}`) };
    },
    answerKey(r) { return [r.type]; },
    _test: { buildRound, LEVELS, mods },
  });
})();
