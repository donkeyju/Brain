/* =========================================================
   숨은 낱말 찾기 (카테고리: 언어력)
   글자판에 낱말이 가로(→)나 세로(↓)로 숨어 있어요. 글자를 차례로 눌러 낱말을 찾아요.
   - 1~3단계: 찾을 낱말을 오른쪽에 보여줘요 (눈으로 찾기)
   - 4~5단계: "과일 3개"처럼 범주만 알려줘요 (머릿속에서 낱말을 떠올리며 찾기)
   낱말은 "단어 맞추기"의 단어 목록(WORD_BANK)을 그대로 써요.
   빈칸 글자는 아무 글자로 채우되, 목록의 다른 낱말이 우연히 생기면 다시 채워요 (정답이 분명하게).
   ========================================================= */
(function () {
  /* 난이도 표
     n: 판 크기(n×n)   k: 숨은 낱말 수   len: 낱말 길이   dirs: h=가로, v=세로   showList: 찾을 낱말을 보여줄지 */
  const LEVELS = {
    1: { n: 3, k: 1, len: [2, 3], dirs: ['h'],      showList: true },
    2: { n: 4, k: 2, len: [2, 3], dirs: ['h'],      showList: true },
    3: { n: 4, k: 2, len: [2, 3], dirs: ['h', 'v'], showList: true },
    4: { n: 5, k: 3, len: [2, 4], dirs: ['h', 'v'], showList: false },
    5: { n: 5, k: 4, len: [2, 4], dirs: ['h', 'v'], showList: false },
  };
  const BANK = WORD_BANK;
  const ALL = new Set(BANK.flatMap(c => c.words));
  const SYL = [...new Set(BANK.flatMap(c => c.words.join('').split('')))];

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const okCats = BANK.filter(c => c.words.filter(w => w.length >= cfg.len[0] && w.length <= Math.min(cfg.len[1], cfg.n)).length >= cfg.k + 2).map(c => c.cat);
    const cat = pickType(rng, okCats, hist.typeHistory);
    const words0 = BANK.find(c => c.cat === cat).words.filter(w => w.length >= cfg.len[0] && w.length <= Math.min(cfg.len[1], cfg.n));
    if (!hist.typeHistory.length || !U.used) U.used = new Set();      // 새 회차마다 "이번에 나온 낱말"을 비워요
    const used = U.used;
    for (let attempt = 0; attempt < 400; attempt++) {
      const pool = shuffle(rng, words0.filter(w => !used.has(w)).concat(words0.filter(w => used.has(w))));
      // 한 낱말이 다른 낱말 안에 들어 있으면(예: 사과 / 사과나무) 헷갈려서 빼요
      const words = [];
      for (const w of pool) { if (words.length >= cfg.k) break; if (!words.some(x => x.includes(w) || w.includes(x))) words.push(w); }
      if (words.length < cfg.k) continue;
      const g = range(cfg.n).map(() => range(cfg.n).map(() => null));
      const place = [];
      let ok = true;
      for (const w of words.slice().sort((a, b) => b.length - a.length)) {
        let done = false;
        for (let t = 0; t < 80 && !done; t++) {
          const dir = cfg.dirs[Math.floor(rng() * cfg.dirs.length)];
          const r0 = randInt(rng, 0, dir === 'v' ? cfg.n - w.length : cfg.n - 1), c0 = randInt(rng, 0, dir === 'h' ? cfg.n - w.length : cfg.n - 1);
          const cells = w.split('').map((_, i) => (dir === 'h' ? [r0, c0 + i] : [r0 + i, c0]));
          if (cells.some(([r, c]) => g[r][c] !== null)) continue;            // 낱말끼리 겹치지 않게
          cells.forEach(([r, c], i) => { g[r][c] = w[i]; });
          place.push({ word: w, dir, cells }); done = true;
        }
        if (!done) { ok = false; break; }
      }
      if (!ok) continue;
      // 빈칸 채우기: 숨은 낱말 글자는 조금 덜 쓰고(눈에 덜 띄게), 우연한 낱말이 생기지 않게
      const targetSyl = new Set(words.join('').split(''));
      for (let t = 0; t < 60; t++) {
        const full = g.map(row => row.map(v => v));
        full.forEach(row => row.forEach((v, j) => { if (v === null) { let s; do { s = SYL[Math.floor(rng() * SYL.length)]; } while (targetSyl.has(s) && rng() < 0.7); row[j] = s; } }));
        if (accidental(full, place).length) continue;
        words.forEach(w => used.add(w)); U.used = used;
        return { seed, level, type: cat, cat, hint: BANK.find(c => c.cat === cat).hint, n: cfg.n, grid: full, place: place.sort((a, b) => words.indexOf(a.word) - words.indexOf(b.word)), showList: cfg.showList, answer: words.slice() };
      }
    }
    throw new Error('숨은 낱말 문제를 만들지 못했어요');
  }
  // 가로·세로로 읽었을 때 목록 낱말이 생기는데, 우리가 숨긴 자리가 아닌 것
  function accidental(g, place) {
    const n = g.length, out = [], key = cells => cells.map(c => c.join(',')).join(' ');
    const planted = new Set(place.map(p => key(p.cells)));
    const lines = [];
    for (let i = 0; i < n; i++) { lines.push(range(n).map(j => [i, j])); lines.push(range(n).map(j => [j, i])); }
    for (const line of lines) for (let a = 0; a < n; a++) for (let b = a + 2; b <= n; b++) {
      const cells = line.slice(a, b), w = cells.map(([r, c]) => g[r][c]).join('');
      if (ALL.has(w) && !planted.has(key(cells))) out.push(w);
    }
    return out;
  }

  /* ---------- 화면 ---------- */
  const U = { sel: [], found: [], wrong: 0, taps: 0, used: null };
  const COLORS = ['#CDE7D6', '#FBE3B5', '#D7E4F5', '#F4D6E0'];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const lastCh = w => w[w.length - 1];
  const hintPhrase = r => r.hint.replace(/(이에요|예요)$/, '').replace('우리 몸의 한 곳', '우리 몸 이름');       // '과일 이름이에요' → '과일 이름'
  function render(r) {
    const n = r.n, cell = n === 3 ? 92 : (n === 4 ? 76 : 62), W = n * cell;
    let s = '';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const fi = r.place.findIndex(p => U.found.includes(p.word) && p.cells.some(c => same(c, [i, j])));
      const sel = U.sel.some(c => same(c, [i, j]));
      s += `<button type="button" class="hd-cell ${sel ? 'sel' : ''} ${fi >= 0 ? 'found' : ''}" data-action="game" data-op="tap" data-value="${i},${j}"
        style="left:${j * cell}px;top:${i * cell}px;width:${cell - 6}px;height:${cell - 6}px;font-size:${Math.round(cell * 0.46)}px;${fi >= 0 ? `background:${COLORS[fi % 4]}` : ''}">${r.grid[i][j]}</button>`;
    }
    $('#arena').innerHTML = `<div class="hd-grid" style="left:${(560 - W) / 2}px;top:${(334 - W) / 2}px;width:${W}px;height:${W}px">${s}</div>`;
    const list = $('#hd-list');
    if (list) list.innerHTML = r.showList ? r.place.map(p => `<span class="hd-word ${U.found.includes(p.word) ? 'done' : ''}">${U.found.includes(p.word) ? ICON.check : ''}${p.word}</span>`).join('')
      : r.place.map(p => `<span class="sp-dot ${U.found.includes(p.word) ? 'on' : ''}"></span>`).join('');
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  const mini = (rows, hl) => `<div style="display:grid;grid-template-columns:repeat(${rows[0].length},30px);gap:3px">${rows.flatMap((row, i) => row.split('').map((ch, j) =>
    `<span style="width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font:900 17px 'Noto Sans KR';background:${hl && hl.some(c => c[0] === i && c[1] === j) ? '#CDE7D6' : '#FFFFFF'};border:2px solid #E4D8C2">${ch}</span>`)).join('')}</div>`;
  registerGame({
    id: 'hidden', category: 'language', name: '숨은 낱말 찾기', short: '글자판에 숨은<br>낱말을 찾아요', direct: true, rounds: 5,
    thumb() { return `<div style="position:absolute;left:30px;top:2px">${mini(['포도강', '마수박', '리나무'], [[1, 1], [1, 2]])}</div>`; },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:44px;top:0">${mini(['포도강', '마수박', '리나무'], null)}</div>`, '글자판에 낱말이<br>숨어 있어요'],
        [`<div style="position:absolute;left:44px;top:0">${mini(['포도강', '마수박', '리나무'], [[1, 1], [1, 2]])}</div>`, '글자를 차례로<br>눌러요'],
        [`<div style="position:absolute;left:0;right:0;top:12px;text-align:center;font:900 22px 'Noto Sans KR'">가로 → 세로 ↓</div>
          <div style="position:absolute;left:0;right:0;top:50px;text-align:center;font:700 16px 'Noto Sans KR';color:#5C5148">왼쪽에서 오른쪽, 위에서 아래</div>`, '찾으면 색이<br>칠해져요'],
      ];
    },
    ruleTalk: '글자판에 낱말이 숨어 있어요. 낱말의 글자를 첫 글자부터 차례로 눌러 주세요. 가로는 왼쪽에서 오른쪽으로, 세로는 위에서 아래로 읽어요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '숨은 낱말 찾기를 시작해요', sub: `낱말 ${cfg.k}개를 찾아요.<br>${cfg.dirs.includes('v') ? '가로(→)와 세로(↓)로 숨어 있어요' : '모두 가로(→)로 숨어 있어요'}`,
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px"><span class="chip chip-teal" style="height:40px;font-size:19px">${cfg.n}×${cfg.n} 글자판</span><span class="chip" style="height:40px;font-size:19px">${cfg.showList ? '찾을 낱말을 보여줘요' : '범주만 알려줘요'}</span></div>`,
        talk: '숨은 낱말 찾기를 시작해요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      const dirs = r.place.some(p => p.dir === 'v') || LEVELS[r.level].dirs.includes('v') ? '가로 →, 세로 ↓' : '가로 →';
      return { chip: r.cat, head: r.showList ? '숨은 낱말을<br>찾아요' : `${hintPhrase(r)}<br>${r.place.length}개를 찾아요`, size: 28, sub: dirs,
        extra: `<div id="hd-list" class="hd-list"></div>`,
        buttons: `<button type="button" class="btn btn-line" data-action="game" data-op="giveup" style="height:52px;font-size:20px">못 찾겠어요</button>`,
        talk: r.showList ? `${r.place.map(p => p.word).join(', ')}${hasBatchim(lastCh(r.place[r.place.length - 1].word)) ? '을' : '를'} 찾아 주세요.` : `${hintPhrase(r)} ${r.place.length}개를 찾아 주세요.` };
    },
    pickCount() { return 1; },
    enablePicking(r) { U.sel = []; U.found = []; U.wrong = 0; U.taps = 0; render(r); },
    markPicks() {},
    handle(op, v) {
      const r = G.round;
      if (op === 'giveup') { submitAnswer({ found: U.found.slice(), wrong: U.wrong, gaveUp: true }); return; }
      if (op !== 'tap') return;
      noteTap(); U.taps++;
      const cell = v.split(',').map(Number);
      // 방금 고른 칸을 다시 누르면 하나 지워요
      if (U.sel.length && same(U.sel[U.sel.length - 1], cell)) { U.sel.pop(); render(r); return; }
      const sel = U.sel.concat([cell]);
      const open = r.place.filter(p => !U.found.includes(p.word));
      const prefixOf = s => open.filter(p => s.length <= p.cells.length && s.every((c, i) => same(c, p.cells[i])));
      const match = prefixOf(sel);
      if (match.length) {
        U.sel = sel;
        const full = match.find(p => p.cells.length === sel.length);
        if (full) {
          U.found.push(full.word); U.sel = []; Sound.pop(); render(r);
          if (U.found.length === r.place.length) later(() => submitAnswer({ found: U.found.slice(), wrong: U.wrong, gaveUp: false }), 500);
          return;
        }
        render(r); return;
      }
      // 이어지지 않는 글자: 살짝 흔들고, 누른 글자가 어떤 낱말의 첫 글자면 거기서 새로 시작해요
      if (U.sel.length) U.wrong++;
      U.sel = prefixOf([cell]).length ? [cell] : [];
      render(r);
      const el = $(`#arena .hd-cell[data-value="${v}"]`); if (el && !U.sel.length) { el.classList.add('shake'); }
    },
    score(r, res) { return Math.round(100 * res.found.length / r.place.length); },
    isRight(r) { return G.picks.found.length === r.place.length; },
    reveal(r, res) {
      U.found = r.place.map(p => p.word); U.sel = []; render(r);
      // 못 찾은 낱말은 주황 테두리로 알려줘요
      r.place.filter(p => !res.found.includes(p.word)).forEach(p => p.cells.forEach(([i, j]) => { const el = $(`#arena .hd-cell[data-value="${i},${j}"]`); if (el) el.classList.add('missed'); }));
      $$('#arena .hd-cell').forEach(el => { el.disabled = true; });
    },
    revealAfterReview(r, res) { this.reveal(r, res); },
    feedback(r, acc) {
      const res = G.picks, n = r.place.length, f = res.found.length, missed = r.place.filter(p => !res.found.includes(p.word)).map(p => p.word);
      return { tone: f === n ? 'good' : (f ? 'half' : 'low'), title: f === n ? '다 찾으셨어요!' : (f ? '아깝네요!' : '아쉬워요'),
        detail: `${n}개 중 ${f}개를<br>찾으셨어요`, talk: f === n ? `${r.place.map(p => p.word).join(', ')}. 모두 찾으셨어요.` : `주황 테두리가 못 찾은 낱말이에요. ${missed.join(', ')}.` };
    },
    detail(r, res) {
      return { category: r.cat, n: r.n, k: r.place.length, showList: r.showList, words: r.place.map(p => `${p.word}@${p.cells[0].join(',')}${p.dir}`),
        found: res.found, missed: r.place.filter(p => !res.found.includes(p.word)).map(p => p.word), wrongTries: res.wrong, gaveUp: res.gaveUp, taps: U.taps,
        grid: r.grid.map(row => row.join('')).join('/') };
    },
    answerKey(r) { return [r.cat]; },
    _test: { buildRound, LEVELS, accidental },
  });
})();
