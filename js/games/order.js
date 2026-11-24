/* =========================================================
   숫자 순서대로 누르기 (카테고리: 집중력)
   화면에 흩어진 숫자를 1부터 차례로 눌러요. (치매 검사의 "선 잇기 검사"와 같은 원리)
   - up   : 1 → 2 → 3 … 차례로
   - down : 큰 수부터 거꾸로 (4단계부터)
   - mix  : 숫자와 글자를 번갈아 1 → 가 → 2 → 나 … (5단계)
   틀리게 누르면 살짝 흔들리기만 하고 계속해요. 한참 못 찾으면 다음 것을 살짝 알려줘요(기록에 남겨요).
   기록: 걸린 시간, 잘못 누른 횟수, 알려준 횟수, 숫자마다 걸린 시간
   ========================================================= */
(function () {
  /* 난이도 표
     n: 누를 개수   size: 동그라미 크기(px)   hintMs: 이만큼 못 찾으면 다음 것을 살짝 알려줘요 */
  const LEVELS = {
    1: { types: ['up'],          n: 8,  size: 66, hintMs: 9000 },
    2: { types: ['up'],          n: 10, size: 62, hintMs: 10000 },
    3: { types: ['up'],          n: 12, size: 58, hintMs: 11000 },
    4: { types: ['up', 'down'],  n: 12, size: 56, hintMs: 12000 },
    5: { types: ['up', 'down', 'mix'], n: 14, size: 54, hintMs: 12000 },
  };
  const TYPE_NAME = { up: '작은 수부터', down: '큰 수부터', mix: '번갈아' };          // 패널 칩용 (짧게)
  const LONG_NAME = { up: '작은 수부터', down: '큰 수부터', mix: '숫자·글자 번갈아' }; // 준비 화면용
  const HANGUL = ['가', '나', '다', '라', '마', '바', '사', '아'];
  const AW = 560, AH = 340;

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const type = pickType(rng, cfg.types, hist.typeHistory);
    let labels;
    if (type === 'mix') labels = range(cfg.n).map(k => (k % 2 === 0 ? String(k / 2 + 1) : HANGUL[(k - 1) / 2]));
    else labels = range(cfg.n).map(k => String(k + 1));
    const order = type === 'down' ? labels.slice().reverse() : labels;      // 눌러야 하는 차례
    // 동그라미 자리: 서로 겹치지 않게, 가장자리에서 조금 떨어지게
    const r = cfg.size / 2, minGap = cfg.size * 1.32;
    for (let attempt = 0; attempt < 400; attempt++) {
      const pos = [];
      for (let k = 0; k < cfg.n; k++) {
        let ok = false;
        for (let t = 0; t < 300 && !ok; t++) {
          const x = randInt(rng, r + 6, AW - r - 6), y = randInt(rng, r + 6, AH - r - 6);
          if (pos.every(p => Math.hypot(p.x - x, p.y - y) >= minGap)) { pos.push({ x, y }); ok = true; }
        }
        if (!ok) break;
      }
      if (pos.length < cfg.n) continue;
      // 바로 다음 것이 너무 가까이만 있으면 쉬우니, 차례끼리의 평균 거리가 너무 짧은 배치는 다시 만들어요
      const items = labels.map((label, k) => ({ label, x: pos[k].x, y: pos[k].y }));
      const byLabel = Object.fromEntries(items.map(it => [it.label, it]));
      let dist = 0;
      for (let k = 1; k < order.length; k++) dist += Math.hypot(byLabel[order[k]].x - byLabel[order[k - 1]].x, byLabel[order[k]].y - byLabel[order[k - 1]].y);
      if (dist / (order.length - 1) < 150) continue;
      return { seed, level, type, n: cfg.n, size: cfg.size, hintMs: cfg.hintMs, items, order, answer: order.slice() };
    }
    throw new Error('숫자 자리를 만들지 못했어요');
  }

  /* ---------- 화면 ---------- */
  const U = { next: 0, errors: 0, hints: 0, times: [], wrong: [], hintTimer: 0, lastAt: 0 };
  function nextLabel(r) { return r.order[U.next]; }
  function render(r) {
    const s = r.size;
    $('#arena').innerHTML = `<svg id="no-trail" width="${AW}" height="${AH}" style="position:absolute;left:0;top:0" aria-hidden="true"></svg>` +
      r.items.map(it => `<button type="button" class="no-dot pop" data-action="game" data-op="tap" data-value="${it.label}" aria-label="${it.label}"
        style="left:${it.x - s / 2}px;top:${it.y - s / 2}px;width:${s}px;height:${s}px;font-size:${Math.round(s * (it.label.length > 1 ? 0.44 : 0.5))}px">${it.label}</button>`).join('');
  }
  function updatePanel(r) {
    const el = $('#no-next'); if (el) el.textContent = U.next < r.order.length ? nextLabel(r) : '끝';
    const pr = $('#no-prog'); if (pr) pr.textContent = `${U.next} / ${r.order.length}`;
  }
  function armHint(r) {
    clearTimeout(U.hintTimer);
    U.hintTimer = later(() => {
      if (G.phase !== 'answer' || G.round !== r || U.next >= r.order.length) return;
      const el = $(`#arena .no-dot[data-value="${nextLabel(r)}"]`);
      if (el && !el.classList.contains('hint')) { el.classList.add('hint'); U.hints++; }
    }, r.hintMs);
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  const mini = (labels, done) => `<div style="position:relative;width:150px;height:80px">${labels.map(([l, x, y], k) =>
    `<span style="position:absolute;left:${x}px;top:${y}px;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 20px 'Noto Sans KR';border:3px solid ${k < done ? '#9FC4B1' : '#A3365A'};background:${k < done ? '#E6F2EA' : '#FFFFFF'};color:${k < done ? '#5C8A70' : '#2B2520'}">${l}</span>`).join('')}</div>`;
  registerGame({
    id: 'numorder', category: 'focus', name: '숫자 차례로 누르기', short: '흩어진 숫자를<br>1부터 차례로 눌러요', direct: true, rounds: 5,
    thumb() { return `<div style="position:absolute;left:24px;top:12px">${mini([['1', 0, 36], ['2', 56, 4], ['3', 104, 40], ['4', 40, 0]], 2)}</div>`; },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:44px;top:4px">${mini([['3', 0, 34], ['1', 52, 0], ['4', 96, 36], ['2', 60, 42]], 0)}</div>`, '숫자가 흩어져<br>있어요'],
        [`<div style="position:absolute;left:44px;top:4px">${mini([['3', 0, 34], ['1', 52, 0], ['4', 96, 36], ['2', 60, 42]], 2)}</div>`, '1부터 차례로<br>눌러요'],
        [`<div style="position:absolute;left:0;right:0;top:14px;text-align:center;font:900 22px 'Noto Sans KR';color:#A3365A">빠르고 정확하게</div>
          <div style="position:absolute;left:104px;top:46px">${ICON.finger}</div>`, '틀려도 괜찮아요<br>다시 찾으면 돼요'],
      ];
    },
    ruleTalk: '화면에 숫자가 흩어져 있어요. 1부터 차례로 눌러 주세요. 틀리게 눌러도 괜찮아요. 맞는 숫자를 다시 찾으면 돼요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '숫자 차례로 누르기를 시작해요', sub: `숫자 ${cfg.n}개를 차례로 눌러요.<br>빠르고 정확하게 해 보세요`,
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">${['up', 'down', 'mix'].map(t => { const on = cfg.types.includes(t);
          return `<span class="chip ${on ? 'chip-teal' : ''}" style="height:40px;font-size:19px;${on ? '' : 'opacity:.45'}">${LONG_NAME[t]}${on ? '' : ' (다음 단계)'}</span>`; }).join('')}</div>`,
        talk: '숫자 차례로 누르기를 시작해요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      const how = r.type === 'down' ? `${r.order[0]}부터 거꾸로` : (r.type === 'mix' ? '1, 가, 2, 나 …' : '1부터 차례로');
      const talk = r.type === 'down' ? `이번에는 큰 수부터 거꾸로 눌러 주세요. ${r.order[0]}부터 시작해요.`
        : (r.type === 'mix' ? '숫자와 글자를 번갈아 눌러 주세요. 1, 가, 2, 나 차례예요.' : '1부터 차례로 눌러 주세요.');
      return { chip: TYPE_NAME[r.type], head: how, size: 28,
        sub: `다음 <b id="no-next" class="no-next">${r.order[0]}</b>`, extra: `<p class="sub" style="margin-top:4px">누른 개수 <b id="no-prog">0 / ${r.order.length}</b></p>`, talk };
    },
    pickCount() { return 1; },
    enablePicking(r) {
      Object.assign(U, { next: 0, errors: 0, hints: 0, times: [], wrong: [], lastAt: performance.now() });
      render(r); armHint(r);
    },
    markPicks() {},
    handle(op, v, el) {
      const r = G.round;
      if (op !== 'tap' || U.next >= r.order.length) return;
      const now = performance.now();
      noteTap();
      if (v === nextLabel(r)) {
        U.times.push(Math.round(now - U.lastAt)); U.lastAt = now;
        el.disabled = true; el.classList.remove('hint', 'pop', 'shake'); el.classList.add('done');
        // 지나온 길을 선으로 이어 보여줘요
        if (U.next > 0) {
          const a = r.items.find(it => it.label === r.order[U.next - 1]), b = r.items.find(it => it.label === v);
          $('#no-trail').insertAdjacentHTML('beforeend', `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#9FC4B1" stroke-width="5" stroke-linecap="round"/>`);
        }
        U.next++;
        Sound.pop();
        updatePanel(r);
        if (U.next >= r.order.length) { clearTimeout(U.hintTimer); submitAnswer({ errors: U.errors, hints: U.hints, times: U.times.slice(), wrong: U.wrong.slice() }); return; }
        armHint(r);
      } else {
        U.errors++; U.wrong.push(nextLabel(r) + '→' + v);
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      }
    },
    // 잘못 누른 횟수만큼 조금씩 낮아져요 (n개 중 틀림 e번 → n/(n+e))
    score(r, res) { return Math.round(100 * r.n / (r.n + res.errors)); },
    isRight(r, acc) { return G.picks.errors <= 1 && G.picks.hints === 0; },
    reveal() { $$('#arena .no-dot').forEach(el => { el.disabled = true; }); },
    revealAfterReview() {},
    feedback(r, acc) {
      const res = G.picks, sec = Math.round((G.pickTimes[G.pickTimes.length - 1] - G.answerShownAt) / 100) / 10;
      const good = res.errors <= 1 && res.hints === 0;
      return { tone: good ? 'good' : 'half', title: good ? '잘하셨어요!' : '다 찾으셨어요!',
        detail: `${sec}초 걸렸어요${res.errors ? `<br>${res.errors}번 다시 찾았어요` : ''}`,
        talk: res.errors === 0 ? '한 번도 틀리지 않고 차례로 누르셨어요.' : '끝까지 잘 찾으셨어요.' };
    },
    detail(r, res) {
      const times = res.times;
      return { orderType: r.type, n: r.n, dotSize: r.size, errors: res.errors, hints: res.hints, wrongTaps: res.wrong,
        stepMs: times, meanStepMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length), maxStepMs: Math.max(...times),
        layout: r.items.map(it => `${it.label}@${it.x},${it.y}`) };
    },
    answerKey(r) { return [r.type]; },
    _test: { buildRound, LEVELS },
  });
})();
