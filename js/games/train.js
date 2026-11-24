/* =========================================================
   기차 시간 계산 (카테고리: 계산력)
   기차역 시간표로 시간을 셈해요.
   - clock    : 시계 읽기 (바늘 시계를 보고 몇 시인지)
   - arrive   : 도착 시각 (출발 시각 + 걸리는 시간)
   - duration : 걸린 시간 (도착 시각 - 출발 시각)
   - compare  : 먼저 도착하는 기차 (빨간 기차와 파란 기차)
   시각은 어르신께 익숙한 "오전·오후 ○시 ○분"으로 보여줘요.
   ========================================================= */
(function () {
  /* 난이도 표
     step: 시각의 분 단위(30분 → 15분 → 10분 → 5분)   durStep: 걸리는 시간 단위   dur: 걸리는 시간 범위(분)
     opts: 보기 수   noon: 낮 12시를 넘나드는 문제 허용   gap: 먼저 도착 문제의 최소 시간 차(분) */
  const LEVELS = {
    1: { types: ['clock', 'arrive'],                          step: 30, durStep: 60, dur: [60, 180],  opts: 3, noon: false, gap: 30 },
    2: { types: ['clock', 'arrive', 'duration'],              step: 15, durStep: 30, dur: [30, 180],  opts: 3, noon: false, gap: 30 },
    3: { types: ['clock', 'arrive', 'duration', 'compare'],   step: 10, durStep: 10, dur: [30, 150],  opts: 3, noon: false, gap: 20 },
    4: { types: ['arrive', 'duration', 'compare', 'clock'],   step: 5,  durStep: 5,  dur: [25, 150],  opts: 4, noon: false, gap: 10 },
    5: { types: ['arrive', 'duration', 'compare'],            step: 5,  durStep: 5,  dur: [35, 200],  opts: 4, noon: true,  gap: 5 },
  };
  const TYPE_NAME = { clock: '시계 읽기', arrive: '도착 시각', duration: '걸린 시간', compare: '먼저 도착' };

  /* 시각은 "자정부터 몇 분"으로 셈해요 (예: 오전 10시 20분 = 620) */
  function fmt(t, withAmPm) {
    const h24 = Math.floor(t / 60) % 24, m = t % 60, h12 = h24 % 12 || 12;
    return `${withAmPm === false ? '' : (h24 < 12 ? '오전 ' : '오후 ')}${h12}시${m ? ' ' + m + '분' : ''}`;
  }
  const fmtDur = d => { const h = Math.floor(d / 60), m = d % 60; return `${h ? h + '시간' : ''}${h && m ? ' ' : ''}${m ? m + '분' : ''}`; };
  const isWas = s => (hasBatchim(s[s.length - 1]) ? '이에요' : '예요');
  const crossesNoon = (a, b) => !(b < 720 || a >= 780);           // 오전→오후로 넘어가거나 12시대를 지나는지

  /* 바늘 시계 그림 */
  function clockSVG(t, size, numbers) {
    const h = (Math.floor(t / 60) % 12) + (t % 60) / 60, m = t % 60;
    const hand = (deg, len, w, c) => { const a = (deg - 90) * Math.PI / 180; return `<line x1="50" y1="50" x2="${50 + len * Math.cos(a)}" y2="${50 + len * Math.sin(a)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`; };
    let marks = '';
    for (let k = 1; k <= 12; k++) {
      const a = (k * 30 - 90) * Math.PI / 180;
      marks += numbers ? `<text x="${50 + 36 * Math.cos(a)}" y="${50 + 36 * Math.sin(a) + 5}" text-anchor="middle" font-size="13" font-weight="700" font-family="'Noto Sans KR', sans-serif" fill="#2B2520">${k}</text>`
        : `<line x1="${50 + 40 * Math.cos(a)}" y1="${50 + 40 * Math.sin(a)}" x2="${50 + 45 * Math.cos(a)}" y2="${50 + 45 * Math.sin(a)}" stroke="#5C5148" stroke-width="3"/>`;
    }
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true"><circle cx="50" cy="50" r="47" fill="#FFFFFF" stroke="#5C5148" stroke-width="4"/>${marks}
      ${hand(h * 30, 24, 6, '#2B2520')}${hand(m * 6, 36, 4, '#B8501A')}<circle cx="50" cy="50" r="4" fill="#2B2520"/></svg>`;
  }
  const TRAIN = c => `<svg viewBox="0 0 60 48" width="60" height="48" aria-hidden="true"><rect x="8" y="4" width="44" height="34" rx="9" fill="${c}"/><rect x="14" y="10" width="14" height="12" rx="3" fill="#FFFFFF"/><rect x="32" y="10" width="14" height="12" rx="3" fill="#FFFFFF"/><circle cx="18" cy="30" r="3" fill="#F6C945"/><circle cx="42" cy="30" r="3" fill="#F6C945"/><circle cx="18" cy="43" r="4.5" fill="#3F464D"/><circle cx="42" cy="43" r="4.5" fill="#3F464D"/></svg>`;

  function timeOptions(rng, correct, cfg, typical, isDur) {
    const s = Math.max(5, Math.min(cfg.step, 10));
    const cands = typical.concat([correct + 60, correct - s, correct - 60, correct + s, correct + 2 * s, correct - 2 * s, correct + 30, correct - 30]);
    const out = [];
    for (const c of cands) {
      if (out.length >= cfg.opts - 1) break;
      const ok = isDur ? c > 0 : (c >= 6 * 60 && c <= 21 * 60);
      if (ok && c !== correct && !out.includes(c)) out.push(c);
    }
    return shuffle(rng, [correct].concat(out));
  }
  /* 시계 읽기 보기: 긴바늘·짧은바늘을 바꿔 읽은 시각, 시를 하나 더 읽은 시각 같은 흔한 실수 */
  function clockOptions(rng, t, cfg) {
    const h = Math.floor(t / 60) % 12 || 12, m = t % 60;
    const typical = [];
    const swapH = Math.round(m / 5) || 12, swapM = (h % 12) * 5;
    if (m % 5 === 0) typical.push(swapH * 60 + swapM);
    if (m >= 30) typical.push(((h % 12) + 1) * 60 + m);
    const cands = typical.concat([t + cfg.step, t - cfg.step, t + 60, t - 60]).map(x => ((x % 720) + 720) % 720 || 720);
    const out = [];
    for (const c of cands) { if (out.length >= cfg.opts - 1) break; if (c !== (t % 720 || 720) && !out.includes(c)) out.push(c); }
    return shuffle(rng, [t % 720 || 720].concat(out));
  }

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const type = pickType(rng, cfg.types, hist.typeHistory);
    const pickTime = (lo, hi, step) => randInt(rng, Math.ceil(lo / step), Math.floor(hi / step)) * step;
    const pickDur = () => pickTime(cfg.dur[0], cfg.dur[1], cfg.durStep);
    const r = { seed, level, type };
    for (let attempt = 0; attempt < 200; attempt++) {
      if (type === 'clock') {
        r.t = pickTime(60, 12 * 60 - cfg.step, cfg.step);
        r.options = clockOptions(rng, r.t, cfg); r.correct = r.t % 720 || 720;
        break;
      }
      const start = pickTime(7 * 60, 17 * 60, cfg.step), d = pickDur(), end = start + d;
      if (end > 20 * 60) continue;
      if (!cfg.noon && crossesNoon(start, end)) continue;
      if (cfg.noon && rng() < 0.5 && !crossesNoon(start, end)) continue;   // 5단계는 절반쯤 낮 12시를 넘나들게
      r.start = start; r.dur = d; r.end = end; r.carry = (start % 60) + (d % 60) >= 60;
      if (type === 'arrive') {
        r.correct = end;
        r.options = timeOptions(rng, end, cfg, r.carry ? [end - 60] : [], false);   // 받아올림을 빠뜨린 시각
      } else if (type === 'duration') {
        r.correct = d;
        r.options = timeOptions(rng, d, cfg, end % 60 < start % 60 ? [d + 60] : [], true);   // 시끼리·분끼리 따로 뺀 실수
      } else {
        const gap = pickTime(cfg.gap, cfg.gap + 40, 5) * (rng() < 0.5 ? 1 : -1);
        r.blueArrive = end + gap;
        if (r.blueArrive < start + 20 || r.blueArrive > 20 * 60) continue;
        if (!cfg.noon && crossesNoon(start, r.blueArrive)) continue;
        r.options = ['red', 'blue'];
        r.correct = end < r.blueArrive ? 'red' : 'blue';
      }
      break;
    }
    r.answerIdx = r.options.indexOf(r.correct); r.answer = [r.answerIdx];
    return r;
  }

  /* ---------- 화면 ---------- */
  const row = (label, clockT, text, blank) => `<div class="tr-row"><span class="tr-label">${label}</span>${clockT !== null ? clockSVG(clockT, 46, false) : '<span class="tr-noclock"></span>'}
    <span class="tr-time ${blank ? 'blank' : ''}">${text}</span></div>`;
  function boardHTML(r, reveal) {
    const show = (t, b) => (b && !reveal ? '?' : fmt(t));
    if (r.type === 'clock') return `<div class="tr-big">${clockSVG(r.t, 200, true)}</div>`;
    if (r.type === 'arrive') return row('출발', r.start, fmt(r.start)) + row('걸리는 시간', null, fmtDur(r.dur)) + row('도착', reveal ? r.end : null, show(r.end, true), !reveal);
    if (r.type === 'duration') return row('출발', r.start, fmt(r.start)) + row('도착', r.end, fmt(r.end)) + row('걸린 시간', null, reveal ? fmtDur(r.dur) : '?', !reveal);
    return `<div class="tr-train">${TRAIN('#D64535')}<div><b>빨간 기차</b><span>${fmt(r.start)} 출발 · ${fmtDur(r.dur)} 걸려요${reveal ? ` → <b>${fmt(r.end)} 도착</b>` : ''}</span></div></div>
      <div class="tr-train">${TRAIN('#3E6FB0')}<div><b>파란 기차</b><span>${fmt(r.blueArrive)}에 도착해요</span></div></div>`;
  }
  function optLabel(r, o) {
    if (r.type === 'clock') return fmt(o, false);
    if (r.type === 'duration') return fmtDur(o);
    if (r.type === 'compare') return o === 'red' ? `${TRAIN('#D64535')}빨간 기차` : `${TRAIN('#3E6FB0')}파란 기차`;
    return fmt(o, LEVELS[r.level].noon);
  }
  function render(r) {
    $('#arena').innerHTML = `<div class="tr-card${r.type === 'compare' ? ' cmp' : ''}"><div class="tr-head">${TRAIN('#1F5F6B').replace('width="60" height="48"', 'width="34" height="28"')} 기차역 시간표</div>${boardHTML(r, false)}</div>
      <div class="tr-opts ${r.options.length > 3 || r.type === 'compare' ? 'grid' : ''}">${r.options.map((o, k) => `<button type="button" class="tr-opt pop" data-action="pick" data-value="${k}" style="animation-delay:${k * 60}ms">${optLabel(r, o)}</button>`).join('')}</div>`;
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  registerGame({
    id: 'train', category: 'calc', name: '기차 시간 계산', short: '기차역 시간표로<br>시각과 시간을 셈해요', direct: true, rounds: 8,
    thumb() { return `<div style="position:absolute;left:14px;top:10px">${clockSVG(620, 80, false)}</div><div style="position:absolute;left:110px;top:24px">${TRAIN('#D64535')}</div>`; },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:0;right:0;top:0;display:flex;justify-content:center">${clockSVG(9 * 60 + 30, 96, true)}</div>`, '시계를 보고<br>몇 시인지 알아요'],
        [`<div style="position:absolute;left:36px;right:0;top:10px;display:flex;flex-direction:column;gap:6px;font:700 17px 'Noto Sans KR'"><span>출발 10시 20분</span><span>+ 1시간 10분</span><span style="color:#B8501A">도착은 몇 시?</span></div>`, '출발과 걸리는 시간으로<br>도착 시각을 셈해요'],
        [`<div style="position:absolute;left:0;right:0;top:12px;display:flex;justify-content:center;gap:10px">${TRAIN('#D64535')}${TRAIN('#3E6FB0')}</div>
          <div style="position:absolute;left:0;right:0;top:68px;text-align:center;font:700 16px 'Noto Sans KR'">누가 먼저 도착할까?</div>`, '어느 기차가<br>먼저 오는지 셈해요'],
      ];
    },
    ruleTalk: '기차역 시간표로 시간을 셈해요. 시계를 읽거나, 출발 시각과 걸리는 시간으로 도착 시각을 구해요. 어느 기차가 먼저 도착하는지도 맞혀 보세요. 천천히 하셔도 괜찮아요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '기차 시간 계산을 시작해요', sub: '시계와 시간표를 보고 셈해요.<br>시간 제한이 없으니 천천히 하셔도 괜찮아요',
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">${['clock', 'arrive', 'duration', 'compare'].map(t => { const on = cfg.types.includes(t);
          return `<span class="chip ${on ? 'chip-teal' : ''}" style="height:40px;font-size:19px;${on ? '' : 'opacity:.45'}">${TYPE_NAME[t]}</span>`; }).join('')}</div>`,
        talk: '기차 시간 계산을 시작해요. 천천히 하셔도 괜찮아요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      if (r.type === 'clock') return { chip: TYPE_NAME.clock, head: '시계는<br>몇 시일까요?', size: 28, sub: '짧은바늘은 시,<br>긴바늘은 분이에요', talk: '시계가 가리키는 시각은 몇 시일까요?' };
      if (r.type === 'arrive') return { chip: TYPE_NAME.arrive, head: '몇 시에<br>도착할까요?', size: 28, sub: '출발 시각에<br>걸리는 시간을 더해요', talk: `${fmt(r.start)}에 출발해서 ${fmtDur(r.dur)} 걸려요. 몇 시에 도착할까요?` };
      if (r.type === 'duration') return { chip: TYPE_NAME.duration, head: '얼마나<br>걸렸을까요?', size: 28, sub: '도착 시각에서<br>출발 시각을 빼요', talk: `${fmt(r.start)}에 출발해서 ${fmt(r.end)}에 도착했어요. 얼마나 걸렸을까요?` };
      return { chip: TYPE_NAME.compare, head: '어느 기차가<br>먼저 올까요?', size: 28, sub: '빨간 기차의 도착<br>시각을 먼저 셈해요',
        talk: `빨간 기차는 ${fmt(r.start)}에 출발해서 ${fmtDur(r.dur)} 걸려요. 파란 기차는 ${fmt(r.blueArrive)}에 도착해요. 어느 기차가 먼저 도착할까요?` };
    },
    pickCount() { return 1; },
    enablePicking(r) { render(r); },
    markPicks() {},
    score(r, picks) { return picks[0] === r.answerIdx ? 100 : 0; },
    reveal(r, picks) {
      const card = $('#arena .tr-card');
      card.innerHTML = card.querySelector('.tr-head').outerHTML + boardHTML(r, true);
      $$('#arena .tr-opt').forEach(el => {
        const k = Number(el.dataset.value);
        el.disabled = true; el.classList.remove('pop');
        el.classList.toggle('right', k === r.answerIdx);
        el.classList.toggle('wrongPick', picks.includes(k) && k !== r.answerIdx);
      });
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) {
      let ans, talk;
      if (r.type === 'clock') { ans = fmt(r.t, false); talk = `시계는 ${ans}를 가리켜요.`.replace(/(.)를 가리켜요/, (m, ch) => (hasBatchim(ch) ? ch + '을 가리켜요' : m)); }
      else if (r.type === 'arrive') { ans = fmt(r.end, LEVELS[r.level].noon); talk = `${fmt(r.start)}에 출발해서 ${fmtDur(r.dur)} 걸리면 ${fmt(r.end)}에 도착해요.`; }
      else if (r.type === 'duration') { ans = fmtDur(r.dur); talk = `${fmt(r.start)}부터 ${fmt(r.end)}까지 ${fmtDur(r.dur)} 걸려요.`; }
      else { ans = r.correct === 'red' ? '빨간 기차' : '파란 기차'; talk = `빨간 기차는 ${fmt(r.end)}에, 파란 기차는 ${fmt(r.blueArrive)}에 도착해요. ${ans}가 먼저예요.`; }
      return { detail: acc === 100 ? '정확하게<br>셈하셨어요' : `정답은<br>${ans}${isWas(ans)}`, talk };
    },
    detail(r, picks) {
      const o = r.options[picks[0]];
      return {
        timeType: r.type, start: r.start ?? '', duration: r.dur ?? '', end: r.end ?? '', clockTime: r.t ?? '', blueArrive: r.blueArrive ?? '',
        correct: r.correct, options: r.options, chosen: o, carryNeeded: r.carry ?? '', crossNoon: r.start !== undefined ? crossesNoon(r.start, r.blueArrive || r.end) : '',
        diffMin: typeof o === 'number' ? o - r.correct : '',
      };
    },
    answerKey(r) { return [r.type]; },
    _test: { buildRound, LEVELS, fmt, fmtDur, crossesNoon },
  });
})();
