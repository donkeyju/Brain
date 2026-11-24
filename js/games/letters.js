/* =========================================================
   가나다 떨어지기 (카테고리: 집중력)
   하늘에서 글자가 떨어져요. 땅에 닿기 전에 아래에서 같은 글자 버튼을 눌러요.
   - 1~2단계: 떨어지는 글자와 버튼 색이 같아요 (색으로도 찾을 수 있어요), 가나다 차례 글자
   - 3단계부터: 색 힌트 없이 글자를 읽어야 해요
   - 4~5단계: 비슷하게 생긴 글자(가·카, 다·타, 바·파, 자·차)가 함께 나와요
   한 판 = 글자 6~12개가 떨어지는 한 번. 잡은 비율이 점수예요.
   기록: 잡은 글자 수, 놓친 글자 수, 잘못 누른 횟수, 글자마다 누르기까지 걸린 시간
   ========================================================= */
(function () {
  /* 난이도 표
     btn: 버튼(글자 종류) 수   count: 떨어지는 글자 수   fallMs: 꼭대기에서 땅까지 걸리는 시간
     gapMs: 글자가 나오는 간격   pairs: 비슷한 글자 짝 수   colorHint: 글자와 버튼 색을 맞춰 줄지 */
  const LEVELS = {
    1: { btn: 3, count: 6,  fallMs: 6500, gapMs: 3500, pairs: 0, seq: true,  colorHint: true },
    2: { btn: 4, count: 8,  fallMs: 5800, gapMs: 2700, pairs: 0, seq: true,  colorHint: true },
    3: { btn: 4, count: 10, fallMs: 5200, gapMs: 1900, pairs: 0, seq: false, colorHint: false },
    4: { btn: 5, count: 10, fallMs: 4600, gapMs: 1600, pairs: 1, seq: false, colorHint: false },
    5: { btn: 6, count: 12, fallMs: 4200, gapMs: 1400, pairs: 2, seq: false, colorHint: false },
  };
  const BASE = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
  const PAIRS = [['가', '카'], ['다', '타'], ['바', '파'], ['자', '차']];
  const COLORS = ['#E07A5F', '#5B9BD5', '#6FAE8A', '#E9AE3C', '#9C7BC0', '#D97BA0'];
  const AW = 560, GROUND = 250, TILE = 62;

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    let buttons;
    if (cfg.seq) { const s = randInt(rng, 0, 7 - cfg.btn); buttons = BASE.slice(s, s + cfg.btn); }      // 가나다 차례로 이어진 글자
    else {
      buttons = [];
      shuffle(rng, PAIRS.slice()).slice(0, cfg.pairs).forEach(p => buttons.push(...p));
      for (const ch of shuffle(rng, BASE.slice())) { if (buttons.length >= cfg.btn) break; if (!buttons.includes(ch)) buttons.push(ch); }
      buttons = BASE.filter(ch => buttons.includes(ch));                                                 // 버튼은 가나다 차례로 놓아요
    }
    // 떨어지는 글자 차례: 같은 글자가 세 번 이어지지 않게, 모든 글자가 한 번 이상 나오게
    let seqL;
    for (let t = 0; t < 100; t++) {
      seqL = range(cfg.count).map(() => buttons[Math.floor(rng() * buttons.length)]);
      const triple = seqL.some((c, k) => k >= 2 && c === seqL[k - 1] && c === seqL[k - 2]);
      if (!triple && buttons.every(b => seqL.includes(b))) break;
    }
    // 나오는 시각과 가로 자리 (바로 앞 글자와 겹치지 않게)
    const drops = [];
    let at = 600;
    seqL.forEach((ch, k) => {
      let x;
      for (let t = 0; t < 50; t++) { x = randInt(rng, 16, AW - TILE - 16); if (!drops.length || Math.abs(x - drops[drops.length - 1].x) > TILE * 1.4) break; }
      drops.push({ ch, x, at });
      at += Math.round(cfg.gapMs * (0.85 + rng() * 0.3));
    });
    return { seed, level, type: cfg.pairs ? 'similar' : (cfg.colorHint ? 'color' : 'read'), buttons, drops, fallMs: cfg.fallMs, gapMs: cfg.gapMs, colorHint: cfg.colorHint,
      answer: seqL.slice() };
  }

  /* ---------- 진행 (글자가 떨어지는 동안) ---------- */
  const U = { raf: 0, t: 0, last: 0, live: [], spawned: 0, hits: 0, misses: 0, falses: [], rts: [], heights: [], log: [], finished: false };
  const colorOf = (r, ch) => (r.colorHint ? COLORS[r.buttons.indexOf(ch)] : '#A3365A');
  function render(r) {
    $('#arena').innerHTML = `<div class="lt-sky"></div><div class="lt-ground"></div><div id="lt-drops"></div>
      <div class="lt-btns">${r.buttons.map(ch => `<button type="button" class="lt-btn" data-action="game" data-op="press" data-value="${ch}"
        style="${r.colorHint ? `background:${colorOf(r, ch)};color:#FFFFFF;border-color:${colorOf(r, ch)}` : ''};width:${r.buttons.length > 5 ? 80 : 92}px">${ch}</button>`).join('')}</div>
      <div id="lt-start" class="lt-start">시작해요!</div>`;
  }
  function stopLoop() { cancelAnimationFrame(U.raf); U.raf = 0; }
  function frame(r, now) {
    if (G.phase !== 'answer' || G.round !== r) { stopLoop(); return; }
    if (G.hold) { U.last = now; U.raf = requestAnimationFrame(t => frame(r, t)); return; }   // 나가기 창이 열려 있으면 멈춰요
    // 화면을 잠깐 벗어났다 돌아와도 글자가 한꺼번에 떨어지지 않게, 한 번에 50ms까지만 흘려요
    U.t += Math.min(50, now - U.last); U.last = now;
    const box = $('#lt-drops');
    while (U.spawned < r.drops.length && r.drops[U.spawned].at <= U.t) {
      const d = r.drops[U.spawned], id = 'lt-' + U.spawned;
      box.insertAdjacentHTML('beforeend', `<div class="lt-tile" id="${id}" style="left:${d.x}px;background:${colorOf(r, d.ch)}">${d.ch}</div>`);
      U.live.push({ k: U.spawned, ch: d.ch, born: U.t, el: $('#' + id), y: -TILE });
      U.spawned++;
    }
    for (const L of U.live.slice()) {
      const p = (U.t - L.born) / r.fallMs;
      L.y = -TILE + p * (GROUND - TILE + TILE);
      L.el.style.transform = `translateY(${L.y}px)`;
      if (L.y >= GROUND - TILE) {                     // 땅에 닿았어요 → 놓침
        U.misses++; U.log.push({ k: L.k, ch: L.ch, hit: false });
        L.el.classList.add('missed'); const el = L.el; later(() => el.remove(), 700);
        U.live.splice(U.live.indexOf(L), 1);
      }
    }
    if (U.spawned >= r.drops.length && !U.live.length && !U.finished) {
      U.finished = true; stopLoop();
      later(() => submitAnswer({ hits: U.hits, misses: U.misses, falses: U.falses.slice(), rts: U.rts.slice(), heights: U.heights.slice(), log: U.log.slice() }), 500);
      return;
    }
    U.raf = requestAnimationFrame(t => frame(r, t));
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  const tileMini = (ch, c, extra) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:${c};color:#FFFFFF;font:900 24px 'Noto Sans KR';${extra || ''}">${ch}</span>`;
  const btnMini = (ch, c) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:42px;height:34px;border-radius:10px;background:${c};color:#FFFFFF;font:900 20px 'Noto Sans KR';box-shadow:0 3px 0 rgba(0,0,0,.18)">${ch}</span>`;
  registerGame({
    id: 'letters', category: 'focus', name: '가나다 떨어지기', short: '떨어지는 글자를<br>땅에 닿기 전에 눌러요', direct: true, rounds: 5,
    thumb() {
      return `<div style="position:absolute;left:30px;top:6px">${tileMini('나', COLORS[1])}</div><div style="position:absolute;left:104px;top:22px">${tileMini('가', COLORS[0])}</div>
        <div style="position:absolute;left:18px;bottom:8px;display:flex;gap:6px">${btnMini('가', COLORS[0])}${btnMini('나', COLORS[1])}${btnMini('다', COLORS[2])}</div>`;
    },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:0;right:0;top:2px;display:flex;justify-content:center;gap:18px">${tileMini('나', COLORS[1], 'margin-top:28px')}${tileMini('가', COLORS[0])}</div>`, '하늘에서 글자가<br>떨어져요'],
        [`<div style="position:absolute;left:40px;right:0;top:16px;display:flex;justify-content:center;gap:6px">${btnMini('가', COLORS[0])}${btnMini('나', COLORS[1])}${btnMini('다', COLORS[2])}</div>
          <div style="position:absolute;left:88px;top:44px">${ICON.finger}</div>`, '같은 글자 버튼을<br>눌러요'],
        [`<div style="position:absolute;left:0;right:0;top:10px;display:flex;justify-content:center">${tileMini('다', COLORS[2])}</div>
          <div style="position:absolute;left:30px;right:30px;top:62px;height:10px;border-radius:5px;background:#9CCB7E"></div>`, '땅에 닿기 전에<br>눌러요'],
      ];
    },
    ruleTalk: '하늘에서 글자가 떨어져요. 땅에 닿기 전에 아래에서 같은 글자 버튼을 눌러 주세요. 놓쳐도 괜찮아요. 다음 글자를 잡으면 돼요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '가나다 떨어지기를 시작해요', sub: `글자 ${cfg.count}개가 떨어져요.<br>${cfg.colorHint ? '글자와 버튼 색이 같아요' : '글자를 잘 읽고 눌러요'}`,
        body: `<div style="display:flex;gap:8px">${r.buttons.map(ch => btnMini(ch, colorOf(r, ch))).join('')}</div>`,
        talk: '가나다 떨어지기를 시작해요. 떨어지는 글자와 같은 버튼을 눌러 주세요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      return { chip: r.type === 'similar' ? '비슷한 글자' : '', head: '같은 글자를<br>눌러요', size: 30,
        sub: '땅에 닿기 전에<br>눌러 주세요', extra: `<p class="sub" style="margin-top:6px">잡은 글자 <b id="lt-score" style="font-size:26px;color:#2E7D4F">0</b> / ${r.drops.length}</p>`,
        talk: '시작해요. 떨어지는 글자와 같은 버튼을 눌러 주세요.' };
    },
    pickCount() { return 1; },
    enablePicking(r) {
      stopLoop();
      Object.assign(U, { t: 0, live: [], spawned: 0, hits: 0, misses: 0, falses: [], rts: [], heights: [], log: [], finished: false });
      render(r);
      later(() => { const s = $('#lt-start'); if (s) s.remove(); }, 900);
      later(() => { if (G.phase !== 'answer' || G.round !== r) return; U.last = performance.now(); U.raf = requestAnimationFrame(t => frame(r, t)); }, 300);
    },
    markPicks() {},
    handle(op, ch, el) {
      if (op !== 'press' || U.finished) return;
      noteTap();
      // 같은 글자가 여럿이면 땅에 가장 가까운 것부터 잡아요
      const cand = U.live.filter(L => L.ch === ch).sort((a, b) => b.y - a.y)[0];
      if (!cand) {
        U.falses.push({ ch, at: Math.round(U.t), onScreen: U.live.map(L => L.ch).join('') });
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
        return;
      }
      U.hits++; U.rts.push(Math.round(U.t - cand.born)); U.heights.push(Math.round(Math.max(0, cand.y + TILE) / GROUND * 100));
      U.log.push({ k: cand.k, ch, hit: true });
      cand.el.classList.add('caught'); const e2 = cand.el; later(() => e2.remove(), 450);
      U.live.splice(U.live.indexOf(cand), 1);
      const sc = $('#lt-score'); if (sc) sc.textContent = U.hits;
      Sound.pop();
    },
    score(r, res) { return Math.round(100 * res.hits / r.drops.length); },
    isRight(r) { return G.picks.misses <= 1 && G.picks.falses.length <= 2; },
    reveal() { stopLoop(); $$('#arena .lt-btn').forEach(el => { el.disabled = true; }); },
    revealAfterReview() {},
    feedback(r, acc) {
      const res = G.picks, n = r.drops.length, good = res.misses <= 1 && res.falses.length <= 2;
      return { tone: good ? 'good' : (res.hits ? 'half' : 'low'), title: good ? '잘 잡으셨어요!' : (res.hits ? '아깝네요!' : '아쉬워요'),
        detail: `${n}개 중 ${res.hits}개를<br>잡으셨어요`, talk: good ? '아주 빠르게 잘 잡으셨어요.' : '다음에는 글자가 나오자마자 버튼을 찾아 보세요.' };
    },
    detail(r, res) {
      const avg = a => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : '');
      return { letterType: r.type, buttons: r.buttons.join(''), count: r.drops.length, fallMs: r.fallMs, gapMs: r.gapMs, colorHint: r.colorHint,
        hits: res.hits, misses: res.misses, falsePresses: res.falses.length, falseDetail: res.falses.map(f => f.ch + '(' + f.onScreen + ')'),
        rtMs: res.rts, meanRtMs: avg(res.rts), meanFallPct: avg(res.heights), sequence: r.drops.map(d => d.ch).join(''),
        caught: res.log.sort((a, b) => a.k - b.k).map(x => (x.hit ? 'O' : 'X')).join('') };
    },
    answerKey(r) { return [r.type]; },
    _test: { buildRound, LEVELS },
  });
})();
