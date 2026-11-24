/* =========================================================
   규칙 찾기 (카테고리: 논리력)
   과일이 규칙대로 놓여 있어요. 빈칸(?)에 들어갈 것을 골라요.
   예) 사과 배 사과 배 사과 ? → 배
   어르신 눈높이: 익숙한 과일 그림만 쓰고, 한 번에 한 가지(종류·크기·개수)만 바뀌어요.
   ========================================================= */
(function () {
  const { FRUITS, fruitSVG } = window.FruitArt;
  /* 난이도 표
     types: 나오는 규칙   len: 빈칸 앞뒤로 보여주는 그림 수   blank: 빈칸 위치(end 끝 / endmid 끝·가운데 / any 아무 데나)   opts: 보기 수
     규칙: ab 번갈아 / abc 세 가지 되풀이 / aab, abb, aabb 두 번씩 / size 작은·큰 번갈아 / grow 하나씩 늘어나기 / shrink 하나씩 줄어들기 */
  const LEVELS = {
    1: { types: ['ab'],                                    len: 5, blank: 'end',    opts: 2 },
    2: { types: ['ab', 'abc'],                             len: 5, blank: 'end',    opts: 3 },
    3: { types: ['abc', 'aab', 'abb', 'size'],             len: 6, blank: 'endmid', opts: 3 },
    4: { types: ['aab', 'abb', 'aabb', 'abc', 'grow'],     len: 6, blank: 'any',    opts: 4 },
    5: { types: ['aabb', 'aab', 'abc', 'grow', 'shrink'],  len: 7, blank: 'any',    opts: 4 },
  };
  const UNITS = { ab: [0, 1], abc: [0, 1, 2], aab: [0, 0, 1], abb: [0, 1, 1], aabb: [0, 0, 1, 1] };
  const wa = f => f.name + (f.batchim ? '과' : '와');
  const ga = f => f.name + (f.batchim ? '이' : '가');
  const key = e => `${e.f}-${e.size}-${e.count}`;
  /* 그림이 비슷해 보이는 과일은 한 문제에 같이 쓰지 않아요 (사과·복숭아는 둘 다 붉고 둥글어요) */
  const LOOK = { apple: 'red', peach: 'red', tangerine: 'orange', melon: 'yellow', banana: 'yellow', watermelon: 'green', grape: 'purple', pear: 'tan' };

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const type = pickType(rng, cfg.types, hist.typeHistory);
    // 서로 다른 색 계열의 과일을 골라요 (참외·바나나처럼 비슷한 색은 함께 쓰지 않아요)
    const fr = [];
    for (const i of shuffle(rng, range(FRUITS.length))) { if (!fr.some(j => LOOK[FRUITS[j].id] === LOOK[FRUITS[i].id])) fr.push(i); }
    let seq, rule, total;
    if (UNITS[type]) {
      const unit = UNITS[type];
      total = cfg.len + 1;
      seq = range(total).map(k => ({ f: fr[unit[k % unit.length]], size: 'n', count: 1 }));
      const [A, B, C] = [FRUITS[fr[0]], FRUITS[fr[1]], FRUITS[fr[2]]];
      rule = { ab: `${wa(A)} ${ga(B)} 번갈아 나와요`,
        abc: `${A.name}, ${B.name}, ${C.name} 순서로 되풀이돼요`,
        aab: `${A.name} 두 번, ${B.name} 한 번씩 되풀이돼요`, abb: `${A.name} 한 번, ${B.name} 두 번씩 되풀이돼요`,
        aabb: `${A.name} 두 번, ${B.name} 두 번씩 되풀이돼요` }[type];
    } else if (type === 'size') {
      total = cfg.len + 1;
      const start = rng() < 0.5 ? 's' : 'b';
      seq = range(total).map(k => ({ f: fr[0], size: (k % 2 === 0) === (start === 's') ? 's' : 'b', count: 1 }));
      rule = `작은 ${FRUITS[fr[0]].name}, 큰 ${ga(FRUITS[fr[0]])} 번갈아 나와요`;
    } else {                                                   // grow / shrink: 개수가 하나씩 변해요 (최대 6개)
      total = 5;
      const off = rng() < 0.5 ? 0 : 1;
      const counts = type === 'grow' ? range(total).map(k => 1 + k + off) : range(total).map(k => 6 - k);
      seq = counts.map(c => ({ f: fr[0], size: 'n', count: c }));
      rule = type === 'grow' ? `${ga(FRUITS[fr[0]])} 하나씩 늘어나요` : `${ga(FRUITS[fr[0]])} 하나씩 줄어들어요`;
    }
    // 빈칸 위치: 규칙이 한 번 이상 보인 뒤에만 비워요
    const unitLen = UNITS[type] ? UNITS[type].length : 2;
    let blankIdx = total - 1;
    if (cfg.blank !== 'end' && rng() < (cfg.blank === 'any' ? 0.6 : 0.4)) blankIdx = randInt(rng, Math.min(unitLen + 1, total - 1), total - 1);
    const correct = seq[blankIdx];
    // 보기: 정답 + 줄 안에 나온 다른 것 + (모자라면) 다른 과일
    const cands = [];
    if (type === 'size') cands.push({ f: correct.f, size: correct.size === 's' ? 'b' : 's', count: 1 });
    if (type === 'grow' || type === 'shrink') [-1, 1, 2, -2].forEach(d => { const c = correct.count + d; if (c >= 1 && c <= 7) cands.push({ f: correct.f, size: 'n', count: c }); });
    seq.forEach(e => cands.push(e));
    fr.slice(3).forEach(i => cands.push({ f: i, size: correct.size, count: correct.count }));
    const opts = [correct];
    for (const c of cands) { if (opts.length >= cfg.opts) break; if (!opts.some(o => key(o) === key(c))) opts.push(c); }
    const options = shuffle(rng, opts);
    const answerIdx = options.findIndex(o => key(o) === key(correct));
    return { seed, level, type, seq, blankIdx, options, answerIdx, answer: [answerIdx], rule };
  }

  /* ---------- 화면 ---------- */
  function itemHTML(e, box) {          // box: 칸 크기(px)
    if (e.count > 1 || e.count === 0) {
      const s = Math.floor(box / (e.count > 4 ? 3.2 : 2.3));
      return `<span class="pt-cluster" style="width:${box - 6}px">${range(e.count).map(() => fruitSVG(FRUITS[e.f], s)).join('')}</span>`;
    }
    const s = e.size === 's' ? Math.round(box * 0.46) : (e.size === 'b' ? Math.round(box * 0.86) : Math.round(box * 0.74));
    return fruitSVG(FRUITS[e.f], s);
  }
  function rowHTML(r, reveal) {
    const n = r.seq.length, box = n > 7 ? 58 : (n > 6 ? 62 : 72);
    return `<div class="pt-row">${r.seq.map((e, k) => k === r.blankIdx
      ? `<span class="pt-cell ${reveal ? 'ok' : 'blank'}" style="width:${box}px;height:${box + 6}px">${reveal ? itemHTML(e, box) : '?'}</span>`
      : `<span class="pt-cell" style="width:${box}px;height:${box + 6}px">${itemHTML(e, box)}</span>`).join('')}</div>`;
  }
  function render(r) {
    $('#arena').innerHTML = `<div class="pt-card"><div class="pv-label">규칙을 찾아 보세요</div>${rowHTML(r, false)}</div>
      <div class="wd-opts">${r.options.map((o, k) => `<button type="button" class="wd-opt pt-opt pop" data-action="pick" data-value="${k}" style="width:${r.options.length > 3 ? 112 : 124}px;animation-delay:${k * 60}ms">${itemHTML(o, 96)}</button>`).join('')}</div>`;
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  const mini = (ids, q) => `<div style="display:flex;gap:4px;align-items:center">${ids.map(i => `<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:38px;border-radius:9px;background:#FFFFFF;border:2px solid #EFE5D4">${fruitSVG(FRUITS[i], 26)}</span>`).join('')}${q ? '<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:38px;border-radius:9px;background:#FFF8F2;border:2px dashed #B8501A;color:#B8501A;font:700 20px \'Noto Sans KR\'">?</span>' : ''}</div>`;
  registerGame({
    id: 'pattern', category: 'logic', name: '규칙 찾기', short: '과일이 놓인 규칙을 보고<br>빈칸을 채워요', direct: true, rounds: 10,
    thumb() { return `<div style="position:absolute;left:12px;top:30px">${mini([0, 6, 0, 6, 0], true)}</div>`; },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:36px;top:30px">${mini([0, 6, 0], false)}</div>`, '과일이 규칙대로<br>놓여 있어요'],
        [`<div style="position:absolute;left:44px;top:30px">${mini([0, 6], true)}</div>`, '물음표에 올 것을<br>생각해요'],
        [`<div style="position:absolute;left:0;right:0;top:22px;display:flex;justify-content:center;gap:8px">${[6, 2].map((i, k) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:50px;height:50px;border-radius:12px;background:${k === 0 ? '#EEF6F0' : '#FFFFFF'};border:${k === 0 ? '3px solid #2E7D4F' : '2px solid #CFC3AE'}">${fruitSVG(FRUITS[i], 38)}</span>`).join('')}</div>
          <div style="position:absolute;left:66px;top:60px">${ICON.finger}</div>`, '알맞은 그림을<br>눌러요'],
      ];
    },
    ruleTalk: '과일이 규칙대로 놓여 있어요. 어떤 규칙인지 살펴보고, 물음표 자리에 올 그림을 골라 주세요. 천천히 하셔도 괜찮아요.',
    buildRound,
    readyInfo() {
      return { chip: `문제 ${roundsOf(this)}개`, title: '규칙 찾기를 시작해요', sub: '과일이 놓인 규칙을 찾아요.<br>시간 제한이 없으니 천천히 하셔도 괜찮아요',
        body: mini([0, 6, 0, 6], true), talk: '규칙 찾기를 시작해요. 과일이 놓인 규칙을 찾아 물음표에 올 그림을 골라 주세요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      return { chip: r.type === 'grow' || r.type === 'shrink' ? '개수 규칙' : (r.type === 'size' ? '크기 규칙' : ''), head: '물음표에<br>올 것은?', size: 30,
        sub: '규칙을 보고<br>골라 주세요', talk: '물음표 자리에 올 그림을 골라 주세요.' };
    },
    pickCount() { return 1; },
    enablePicking(r) { render(r); },
    markPicks() {},
    score(r, picks) { return picks[0] === r.answerIdx ? 100 : 0; },
    reveal(r, picks) {
      $('#arena .pt-row').outerHTML = rowHTML(r, true);
      $('#arena .pt-card').insertAdjacentHTML('beforeend', `<div class="pv-mean"><b>규칙</b> ${r.rule}</div>`);
      $$('#arena .wd-opt').forEach(el => {
        const k = Number(el.dataset.value);
        el.disabled = true; el.classList.remove('pop');
        el.classList.toggle('right', k === r.answerIdx);
        el.classList.toggle('wrongPick', picks.includes(k) && k !== r.answerIdx);
      });
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) { return { detail: acc === 100 ? '규칙을 정확히<br>찾으셨어요' : '초록색 그림이<br>정답이에요', talk: r.rule + '.' }; },
    detail(r, picks) {
      const name = e => FRUITS[e.f].name + (e.size === 's' ? '(작은)' : e.size === 'b' ? '(큰)' : '') + (e.count > 1 ? '×' + e.count : '');
      return { patternType: r.type, length: r.seq.length, blankIndex: r.blankIdx, sequence: r.seq.map(name), options: r.options.map(name), chosen: name(r.options[picks[0]]), rule: r.rule };
    },
    answerKey(r) { return [r.type]; },
    _test: { buildRound, LEVELS, key },
  });
})();
