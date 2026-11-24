/* =========================================================
   벌집 숫자 만들기 (카테고리: 계산력)
   벌집 칸에 숫자가 적혀 있어요. 숫자 2~3개를 골라 더해서 목표 수를 만들어요.
   예) 55 만들기 → 20 + 35
   - 1단계: 10, 20, 30처럼 십 단위 숫자 두 개
   - 2단계: 5 단위 숫자 / 3단계: 아무 숫자(받아올림이 생기게)
   - 4~5단계: 숫자 세 개를 더해요
   맞는 방법이 여러 개면 어느 것이든 정답이에요.
   ========================================================= */
(function () {
  /* 난이도 표
     cells: 벌집 칸 수   unit: 숫자 단위   range: 숫자 범위   k: 골라야 할 개수   carry: 일의 자리 받아올림이 꼭 생기게 */
  const LEVELS = {
    1: { cells: 6,  unit: 10, range: [10, 80], k: 2, carry: false },
    2: { cells: 7,  unit: 5,  range: [5, 45],  k: 2, carry: false },
    3: { cells: 7,  unit: 1,  range: [11, 49], k: 2, carry: true },
    4: { cells: 9,  unit: 5,  range: [5, 60],  k: 3, carry: false },
    5: { cells: 10, unit: 1,  range: [3, 39],  k: 3, carry: true },
  };
  // 벌집 모양: 줄마다 칸 수 (가운데 줄은 반 칸씩 엇갈려요)
  const SHAPES = { 6: [3, 3], 7: [2, 3, 2], 9: [3, 3, 3], 10: [3, 4, 3] };
  const R = 46, HW = Math.sqrt(3) * R;       // 육각형 반지름과 너비

  // 숫자 뒤 조사: 끝소리로 정해요 (55 → 오십오 → "를", 30 → 삼십 → "을")
  const numB = n => n % 10 === 0 || ![2, 4, 5, 9].includes(n % 10);      // 끝소리에 받침이 있는지
  const objJosa = n => (numB(n) ? '을' : '를');
  const J = (n, withB, noB) => n + (numB(n) ? withB : noB);               // J(55, '이에요', '예요') → 55예요
  const combos = (arr, k, start = 0, cur = [], out = []) => {
    if (cur.length === k) { out.push(cur.slice()); return out; }
    for (let i = start; i < arr.length; i++) { cur.push(i); combos(arr, k, i + 1, cur, out); cur.pop(); }
    return out;
  };

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const num = () => randInt(rng, cfg.range[0] / cfg.unit, cfg.range[1] / cfg.unit) * cfg.unit;
    for (let attempt = 0; attempt < 300; attempt++) {
      const sol = range(cfg.k).map(num);
      if (new Set(sol).size < cfg.k) continue;
      if (cfg.carry && sol.reduce((a, n) => a + n % 10, 0) < 10) continue;      // 받아올림이 생기는 문제
      const target = sol.reduce((a, b) => a + b, 0);
      if (level === 1 && target > 90) continue;
      // 나머지 칸: 정답과 헷갈리게 "하나만 바꾸면 거의 맞는" 숫자를 섞어요
      const nums = sol.slice();
      // 같은 방향으로 바꿔야 "둘 다 바꾸면 다시 맞는" 답이 생기지 않아요
      const sign = rng() < 0.5 ? 1 : -1, near = [sol[0] + cfg.unit * sign, sol[1] + 10 * sign];
      for (const n of near) if (n > 0 && !nums.includes(n) && nums.length < cfg.cells) nums.push(n);
      for (let t = 0; t < 200 && nums.length < cfg.cells; t++) { const n = num(); if (!nums.includes(n)) nums.push(n); }
      if (nums.length < cfg.cells) continue;
      const cells = shuffle(rng, nums);
      const sols = combos(cells, cfg.k).filter(c => c.reduce((a, i) => a + cells[i], 0) === target);
      if (sols.length > (cfg.k === 3 ? 3 : 2)) continue;                           // 답이 너무 많으면 싱거워요
      return { seed, level, type: 'k' + cfg.k, k: cfg.k, cells, target, solution: sols[0], solutions: sols.length, answer: sols[0].map(i => cells[i]) };
    }
    throw new Error('벌집 문제를 만들지 못했어요');
  }

  /* ---------- 화면 ---------- */
  const U = { sel: [], edits: 0 };
  function layout(n) {
    const rows = SHAPES[n], out = [], maxCols = Math.max(...rows);
    const H = (rows.length - 1) * 1.5 * R + 2 * R, top = (330 - H) / 2;
    const even = rows.every(c => c === rows[0]);                      // 줄마다 칸 수가 같으면 반 칸씩 엇갈려 벌집처럼
    rows.forEach((cnt, ri) => {
      const rowW = cnt * HW, left = (560 - rowW) / 2 + (even ? (ri % 2 ? HW / 4 : -HW / 4) : 0);
      for (let c = 0; c < cnt; c++) out.push({ x: left + c * HW, y: top + ri * 1.5 * R });
    });
    return out;
  }
  function render(r) {
    const pos = layout(r.cells.length);
    $('#arena').innerHTML = `<div class="hn-hive">${r.cells.map((n, i) => `<button type="button" class="hn-cell pop" data-action="game" data-op="tap" data-value="${i}"
      style="left:${pos[i].x}px;top:${pos[i].y}px;width:${HW - 6}px;height:${2 * R - 6}px;animation-delay:${i * 40}ms" aria-label="${n}"><span>${n}</span></button>`).join('')}</div>`;
    update(r);
  }
  function update(r) {
    $$('#arena .hn-cell').forEach(el => el.classList.toggle('on', U.sel.includes(Number(el.dataset.value))));
    const sum = U.sel.reduce((a, i) => a + r.cells[i], 0);
    const s = $('#hn-sum'); if (s) s.innerHTML = U.sel.length ? `${U.sel.map(i => r.cells[i]).join(' + ')} = <b>${sum}</b>` : '<b>0</b>';
    const d = $('#hn-done'); if (d) d.disabled = U.sel.length !== r.k;
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  const hexMini = (n, on, x, y) => `<span style="position:absolute;left:${x}px;top:${y}px;width:40px;height:44px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:${on ? '#D9901A' : '#F6C945'};display:flex;align-items:center;justify-content:center;font:900 17px 'Noto Sans KR';color:${on ? '#FFFFFF' : '#5C3D10'}">${n}</span>`;
  registerGame({
    id: 'honey', category: 'calc', name: '벌집 숫자 만들기', short: '벌집 숫자를 골라<br>목표 수를 만들어요', direct: true, rounds: 8,
    thumb() { return `<div style="position:absolute;left:20px;top:8px;width:140px;height:90px">${hexMini(20, true, 0, 0)}${hexMini(35, false, 42, 0)}${hexMini(10, false, 84, 0)}${hexMini(15, false, 21, 34)}${hexMini(35, true, 63, 34)}</div>`; },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:0;right:0;top:14px;text-align:center;font:900 30px 'Noto Sans KR';color:#B8501A">55 만들기</div>`, '만들 수를<br>봐요'],
        [`<div style="position:absolute;left:44px;top:2px;width:140px;height:80px">${hexMini(20, true, 0, 0)}${hexMini(30, false, 42, 0)}${hexMini(35, true, 21, 34)}</div>`, '벌집 숫자를<br>골라 더해요'],
        [`<div style="position:absolute;left:0;right:0;top:20px;text-align:center;font:900 24px 'Noto Sans KR'">20 + 35 = <span style="color:#2E7D4F">55</span></div>`, '합이 맞으면<br>성공이에요'],
      ];
    },
    ruleTalk: '벌집 칸에 숫자가 적혀 있어요. 숫자를 골라 더해서 만들 수와 같게 만들어 주세요. 고른 칸을 다시 누르면 빠져요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '벌집 숫자 만들기를 시작해요', sub: `숫자 ${cfg.k}개를 골라 더해요.<br>시간 제한이 없으니 천천히 하셔도 괜찮아요`,
        body: `<div style="display:flex;gap:8px"><span class="chip chip-teal" style="height:40px;font-size:19px">숫자 ${cfg.k}개 더하기</span><span class="chip" style="height:40px;font-size:19px">${cfg.unit === 1 ? '아무 숫자' : cfg.unit + ' 단위 숫자'}</span></div>`,
        talk: '벌집 숫자 만들기를 시작해요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      return { chip: `숫자 ${r.k}개`, head: `<span class="hn-target">${r.target}</span>${objJosa(r.target)} 만들어요`, size: 24,
        extra: `<p class="sub hn-sumline" id="hn-sum"><b>0</b></p>`,      // 몇 개 고르는지는 위 칩(숫자 2개)에 있어요
        buttons: `<button type="button" class="btn btn-primary" data-action="game" data-op="done" id="hn-done" disabled>${ICON.check} 다 골랐어요</button>
          <button type="button" class="btn btn-line" data-action="game" data-op="clear" style="height:48px;font-size:19px">처음부터</button>`,
        talk: `${r.target}${objJosa(r.target)} 만들어요. 벌집 숫자 ${r.k}개를 골라 더해 보세요.` };
    },
    pickCount() { return 1; },
    enablePicking(r) { U.sel = []; U.edits = 0; render(r); },
    markPicks() {},
    handle(op, v) {
      const r = G.round;
      if (op === 'tap') {
        const i = Number(v), k = U.sel.indexOf(i);
        noteTap();
        if (k >= 0) { U.sel.splice(k, 1); U.edits++; }
        else if (U.sel.length < r.k) U.sel.push(i);
        else { U.sel.shift(); U.sel.push(i); U.edits++; }            // 다 골랐는데 또 누르면 가장 먼저 고른 것과 바꿔요
        update(r);
      } else if (op === 'clear') { if (U.sel.length) U.edits++; U.sel = []; update(r); }
      else if (op === 'done' && U.sel.length === r.k) submitAnswer(U.sel.slice());
    },
    score(r, picks) { return picks.reduce((a, i) => a + r.cells[i], 0) === r.target ? 100 : 0; },
    reveal(r, picks) {
      const ok = this.score(r, picks) === 100, show = ok ? picks : r.solution;
      $$('#arena .hn-cell').forEach(el => {
        const i = Number(el.dataset.value);
        el.disabled = true; el.classList.remove('pop', 'on');
        el.classList.toggle('right', show.includes(i));
        el.classList.toggle('wrongPick', !ok && picks.includes(i) && !show.includes(i));
      });
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) {
      const picks = G.picks, sum = picks.reduce((a, i) => a + r.cells[i], 0), how = r.solution.map(i => r.cells[i]).join(' 더하기 ');
      const last = list => list[list.length - 1];
      if (acc === 100) { const v = picks.map(i => r.cells[i]); return { detail: `${v.join(' + ')}<br>= ${r.target}`, talk: `맞아요. ${v.join(' 더하기 ')}${numB(last(v)) ? '은' : '는'} ${J(r.target, '이에요', '예요')}.` }; }
      const sv = r.solution.map(i => r.cells[i]);
      return { detail: `고른 수의 합은<br>${J(sum, '이에요', '예요')}`, talk: `${how}${objJosa(last(sv))} 더하면 ${J(r.target, '이', '가')} 돼요. 초록색 칸이에요.` };
    },
    detail(r, picks) {
      const vals = picks.map(i => r.cells[i]), sum = vals.reduce((a, b) => a + b, 0);
      return { k: r.k, cells: r.cells, target: r.target, picked: vals, sum, diff: sum - r.target, solutions: r.solutions,
        carry: r.answer.reduce((a, n) => a + n % 10, 0) >= 10, edits: U.edits };
    },
    answerKey(r) { return [r.type]; },
    _test: { buildRound, LEVELS, objJosa, combos },
  });
})();
