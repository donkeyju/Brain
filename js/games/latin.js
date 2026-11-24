/* =========================================================
   과일 칸 채우기 (카테고리: 논리력) — 어르신용 쉬운 스도쿠
   규칙은 하나: "한 줄에 같은 과일은 한 번씩만 들어가요."
   "?" 칸 하나에 들어갈 과일을 오른쪽 보기에서 골라요. 봐야 할 줄은 옅은 색으로 칠해 줘요.
   - row   : 한 줄(3칸)만 있어요. 빠진 과일 고르기 (1단계)
   - full  : 3×3 판, "?" 가로줄만 보면 풀려요 (2단계)
   - cross : 가로줄에 빈칸이 하나 더 있어서 세로줄도 같이 봐야 해요 (3단계)
   - chain : 빈칸 2~3개를 차례로 채워요. 하나를 채우면 다음 칸이 풀려요 (4~5단계, 5단계는 4×4)
   ========================================================= */
(function () {
  const { FRUITS, fruitSVG } = window.FruitArt;
  const LEVELS = {
    1: { types: ['row'],           n: 3, steps: 1 },
    2: { types: ['full'],          n: 3, steps: 1 },
    3: { types: ['cross', 'full'], n: 3, steps: 1 },
    4: { types: ['chain', 'cross'], n: 3, steps: 2 },
    5: { types: ['chain'],         n: 4, steps: 3 },
  };
  const TYPE_NAME = { row: '빠진 과일', full: '가로줄 보기', cross: '가로·세로', chain: '차례로' };          // 패널 칩용 (짧게)
  const LONG_NAME = { row: '빠진 과일', full: '가로줄 보기', cross: '가로·세로 보기', chain: '차례로 채우기' }; // 준비 화면용
  // 비슷해 보이는 과일은 한 판에 같이 쓰지 않아요
  const LOOK = { apple: 'red', peach: 'red', melon: 'yellow', banana: 'yellow' };

  // 라틴 방진(줄마다 한 번씩): 기본 모양 (i+j)%n 을 줄·칸·과일 차례를 섞어서 만들어요
  function latin(rng, n) {
    const rows = shuffle(rng, range(n)), cols = shuffle(rng, range(n)), sym = shuffle(rng, range(n));
    return rows.map(i => cols.map(j => sym[(i + j) % n]));
  }
  // 지금 판(null = 빈칸)에서 (r,c)에 들어갈 수 있는 과일 후보
  function candidates(g, r, c, useCol) {
    const n = g[0].length, seen = new Set(g[r].filter(v => v !== null));
    if (useCol) g.forEach(row => { if (row[c] !== null) seen.add(row[c]); });
    return range(n).filter(v => !seen.has(v));
  }

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const type = pickType(rng, cfg.types, hist.typeHistory);
    const n = type === 'row' ? 3 : cfg.n;
    let fr;
    for (let t = 0; t < 50; t++) { fr = shuffle(rng, FRUITS.slice()).slice(0, n); const lk = fr.map(f => LOOK[f.id]).filter(Boolean); if (new Set(lk).size === lk.length) break; }
    for (let attempt = 0; attempt < 500; attempt++) {
      const sol = latin(rng, n);
      if (type === 'row') {
        const c = randInt(rng, 0, n - 1), g = [sol[0].map((v, j) => (j === c ? null : v))];
        return { seed, level, type, n, rows: 1, fruits: fr.map(f => f.id), sol: [sol[0]], start: g, steps: [[0, c]], useCol: false, answer: [sol[0][c]] };
      }
      const g = sol.map(row => row.slice());
      let steps = [];
      if (type === 'full') {
        const r = randInt(rng, 0, n - 1), c = randInt(rng, 0, n - 1);
        g[r][c] = null; steps = [[r, c]];
        // 다른 줄에도 빈칸을 하나 두어 판이 너무 꽉 차 보이지 않게 (풀이에는 상관없어요)
        const r2 = (r + 1) % n, c2 = randInt(rng, 0, n - 1); g[r2][c2] = null;
        if (candidates(g, r, c, false).length !== 1) continue;
      } else if (type === 'cross') {
        // ?칸 가로줄에 빈칸 하나 더, 세로줄에도 빈칸 하나 더 → 가로만, 세로만으로는 안 풀리고 둘을 같이 봐야 풀려요
        const r = randInt(rng, 0, n - 1), c = randInt(rng, 0, n - 1);
        const c2 = (c + randInt(rng, 1, n - 1)) % n, r2 = (r + randInt(rng, 1, n - 1)) % n;
        g[r][c] = null; g[r][c2] = null; g[r2][c] = null;
        if (candidates(g, r, c, false).length < 2) continue;
        const colOnly = range(n).filter(v => !g.some(row => row[c] === v));
        if (colOnly.length < 2) continue;
        if (candidates(g, r, c, true).length !== 1) continue;
        steps = [[r, c]];
      } else {
        // 차례로 채우기: 빈칸을 여러 개 만들고, 매번 "지금 풀 수 있는" 칸을 다음 ?로 정해요
        const holes = shuffle(rng, range(n * n)).slice(0, cfg.steps + (n === 4 ? 3 : 1)).map(k => [Math.floor(k / n), k % n]);
        holes.forEach(([r, c]) => { g[r][c] = null; });
        const work = g.map(row => row.slice()), order = [];
        for (let s = 0; s < cfg.steps; s++) {
          const ready = holes.filter(([r, c]) => work[r][c] === null && candidates(work, r, c, true).length === 1);
          if (!ready.length) break;
          const [r, c] = ready[Math.floor(rng() * ready.length)];
          order.push([r, c]); work[r][c] = sol[r][c];
        }
        if (order.length < cfg.steps) continue;
        steps = order;
      }
      return { seed, level, type, n, rows: n, fruits: fr.map(f => f.id), sol, start: g, steps, useCol: type !== 'full', answer: steps.map(([r, c]) => sol[r][c]) };
    }
    throw new Error('과일 칸 문제를 만들지 못했어요');
  }

  /* ---------- 화면 ---------- */
  const U = { step: 0, grid: null, results: [] };
  const fruitOf = (r, v) => FRUITS.find(f => f.id === r.fruits[v]);
  function render(r, pop) {
    const n = r.n, cell = r.rows === 1 ? 96 : (n === 4 ? 68 : 84), [qr, qc] = r.steps[Math.min(U.step, r.steps.length - 1)];
    const W = n * cell, H = r.rows * cell, top = (330 - H) / 2;
    let cells = '';
    for (let i = 0; i < r.rows; i++) for (let j = 0; j < n; j++) {
      const v = U.grid[i][j], isQ = U.step < r.steps.length && i === qr && j === qc;
      const band = U.step < r.steps.length && (i === qr || (r.useCol && j === qc));
      cells += `<div class="lt2-cell ${band ? 'band' : ''} ${isQ ? 'q' : ''} ${v === null && !isQ ? 'empty' : ''}" data-rc="${i},${j}" style="left:${j * cell}px;top:${i * cell}px;width:${cell}px;height:${cell}px">
        ${v !== null ? fruitSVG(fruitOf(r, v), Math.round(cell * 0.74)) : (isQ ? '<b>?</b>' : '')}</div>`;
    }
    const opts = range(n).map(v => `<button type="button" class="lt2-opt ${pop ? 'pop' : ''}" data-action="game" data-op="pick" data-value="${v}" style="animation-delay:${v * 50}ms">${fruitSVG(fruitOf(r, v), 50)}<span>${fruitOf(r, v).name}</span></button>`).join('');
    $('#arena').innerHTML = `<div class="lt2-grid" style="left:${(330 - W) / 2 + 10}px;top:${top}px;width:${W}px;height:${H}px">${cells}</div>
      <div class="lt2-opts ${n === 4 ? 'four' : ''}">${opts}</div>`;
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  const F = id => FRUITS.find(f => f.id === id);
  const miniRow = (ids, q) => `<div style="display:flex;gap:3px">${ids.map((id, k) => `<span style="width:40px;height:40px;border-radius:8px;background:${k === q ? '#FFF8F2' : '#FBF6EC'};border:2px ${k === q ? 'dashed #B8501A' : 'solid #EFE5D4'};display:flex;align-items:center;justify-content:center;font:900 22px 'Noto Sans KR';color:#B8501A">${k === q ? '?' : fruitSVG(F(id), 32)}</span>`).join('')}</div>`;
  registerGame({
    id: 'latin', category: 'logic', name: '과일 칸 채우기', short: '한 줄에 과일이<br>한 번씩 들어가요', direct: true, rounds: 10,
    thumb() { return `<div style="position:absolute;left:18px;top:8px;display:flex;flex-direction:column;gap:3px">${miniRow(['apple', 'banana', 'grape'], -1)}${miniRow(['grape', 'apple', 'banana'], 2)}</div>`; },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:40px;right:0;top:14px;display:flex;justify-content:center">${miniRow(['apple', 'banana', 'grape'], -1)}</div>`, '한 줄에 과일이<br>한 번씩 있어요'],
        [`<div style="position:absolute;left:40px;right:0;top:14px;display:flex;justify-content:center">${miniRow(['grape', 'apple', 'banana'], 2)}</div>`, '"?"에 빠진 과일을<br>찾아요'],
        [`<div style="position:absolute;left:0;right:0;top:8px;display:flex;justify-content:center"><span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:12px;border:3px solid #2E7D4F;background:#EEF6F0;font:700 18px 'Noto Sans KR'">${fruitSVG(F('banana'), 34)}바나나</span></div>
          <div style="position:absolute;left:104px;top:48px">${ICON.finger}</div>`, '오른쪽에서<br>골라요'],
      ];
    },
    ruleTalk: '한 줄에 같은 과일은 한 번씩만 들어가요. 물음표 칸에 들어갈 과일을 오른쪽에서 골라 주세요. 색칠된 줄을 보면 알 수 있어요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '과일 칸 채우기를 시작해요', sub: '한 줄에 같은 과일은 한 번씩만 들어가요.<br>시간 제한이 없으니 천천히 하셔도 괜찮아요',
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">${cfg.types.map(t => `<span class="chip chip-teal" style="height:40px;font-size:19px">${LONG_NAME[t]}</span>`).join('')}</div>`,
        talk: '과일 칸 채우기를 시작해요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      const sub = r.type === 'row' ? '빠진 과일을<br>골라요' : (r.useCol ? '가로줄과 세로줄을<br>함께 봐요' : '색칠된 가로줄을<br>봐요');
      return { chip: TYPE_NAME[r.type], head: '"?"에 들어갈<br>과일은?', size: 28, sub,
        extra: r.steps.length > 1 ? `<p class="sub" style="margin-top:4px">채울 칸 <b id="lt2-step" style="font-size:24px">1</b> / ${r.steps.length}</p>` : '',
        talk: r.useCol ? '물음표 칸에 들어갈 과일은 무엇일까요? 가로줄과 세로줄을 함께 보세요.' : '물음표 칸에 들어갈 과일은 무엇일까요?' };
    },
    pickCount() { return 1; },
    enablePicking(r) { U.step = 0; U.results = []; U.grid = r.start.map(row => row.slice()); render(r, true); },
    markPicks() {},
    handle(op, v) {
      const r = G.round;
      if (op !== 'pick' || U.step >= r.steps.length) return;
      noteTap();
      const [qr, qc] = r.steps[U.step], right = r.sol[qr][qc];
      U.results.push({ cell: qr + ',' + qc, picked: Number(v), right, ok: Number(v) === right });
      U.grid[qr][qc] = right;                   // 다음 칸을 풀 수 있게 정답을 채워 둬요
      U.step++;
      if (U.step >= r.steps.length) { submitAnswer(U.results.slice()); return; }
      Sound.pop();
      render(r, false);
      const el = $(`#arena .lt2-cell[data-rc="${qr},${qc}"]`); if (el) el.classList.add(U.results[U.results.length - 1].ok ? 'okflash' : 'fixflash');
      const s = $('#lt2-step'); if (s) s.textContent = U.step + 1;
    },
    score(r, res) { return Math.round(100 * res.filter(x => x.ok).length / res.length); },
    reveal(r, res) {
      // 마지막 칸까지 채운 판을 보여주고, 틀린 칸은 주황 테두리로 알려줘요
      render(r, false);
      res.forEach(x => { const el = $(`#arena .lt2-cell[data-rc="${x.cell}"]`); if (el) el.classList.add(x.ok ? 'right' : 'fixed'); });
      const last = res[res.length - 1];
      $$('#arena .lt2-opt').forEach(el => { const k = Number(el.dataset.value); el.disabled = true; el.classList.remove('pop');
        el.classList.toggle('right', k === last.right); el.classList.toggle('wrongPick', k === last.picked && !last.ok); });
    },
    revealAfterReview(r, res) { this.reveal(r, res); },
    feedback(r, acc) {
      const res = G.picks, ok = res.filter(x => x.ok).length;
      const nm = fruitOf(r, res[res.length - 1].right).name;
      if (res.length > 1) return { detail: `${res.length}칸 중 ${ok}칸을<br>맞히셨어요`, talk: acc === 100 ? '모든 칸을 맞게 채우셨어요.' : '주황 테두리 칸이 틀린 칸이에요. 줄마다 과일이 한 번씩 들어가요.' };
      const was = hasBatchim(nm[nm.length - 1]) ? '이에요' : '예요';
      return { detail: acc === 100 ? '정확하게<br>찾으셨어요' : `정답은<br>${nm}${was}`,
        talk: acc === 100 ? `맞아요. ${nm}${was}.` : `${r.useCol ? '가로줄과 세로줄에' : '이 줄에'} 없는 과일은 ${nm}${was}.` };
    },
    detail(r, res) {
      return { gridType: r.type, n: r.n, steps: r.steps.length, useCol: r.useCol, fruits: r.fruits, results: res.map(x => `${x.cell}:${r.fruits[x.picked]}${x.ok ? '' : '→' + r.fruits[x.right]}`),
        okCount: res.filter(x => x.ok).length, blanks: r.start.flat().filter(v => v === null).length };
    },
    answerKey(r) { return [r.type]; },
    _test: { buildRound, LEVELS, candidates },
  });
})();
