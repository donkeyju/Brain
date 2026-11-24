/* =========================================================
   속담 놀이 (카테고리: 언어력)
   속담 은행(proverb-data.js)에서 한 판에 속담 하나를 꺼내 세 가지 형식으로 물어봐요.
   - blank   : 빈칸 글자 채우기 (글자 블록을 하나씩 눌러 채워요)
   - order   : 어절 순서 맞추기 (말 조각을 순서대로 눌러요)
   - meaning : 뜻 보고 속담 고르기
   보기(관찰) 단계가 없는 "바로 문제" 놀이예요 (direct: true).
   ========================================================= */
(function () {
  /* 난이도 표
     types: 나오는 형식   maxD: 속담 난이도 상한   blankLen: 빈칸 글자 수 [최소, 최대]
     distract: 방해 글자 수   similar: 모양·소리가 비슷한 방해 글자(말↔발 등)
     pos: 빈칸 위치(end 끝 / start 앞 / mid 가운데)   opts: 뜻 보고 고르기 보기 수   words: 순서 맞추기 조각 수 */
  const LEVELS = {
    1: { types: ['blank', 'meaning'],          maxD: 1, blankLen: [2, 3], distract: 1, similar: false, pos: ['end'],                 opts: 2, words: [3, 4] },
    2: { types: ['blank', 'meaning', 'order'], maxD: 1, blankLen: [2, 3], distract: 2, similar: false, pos: ['end', 'start'],        opts: 3, words: [3, 4] },
    3: { types: ['blank', 'meaning', 'order'], maxD: 2, blankLen: [3, 4], distract: 3, similar: false, pos: ['end', 'start', 'mid'], opts: 3, words: [3, 5] },
    4: { types: ['blank', 'meaning', 'order'], maxD: 2, blankLen: [3, 5], distract: 4, similar: true,  pos: ['end', 'start', 'mid'], opts: 4, words: [4, 6] },
    5: { types: ['blank', 'meaning', 'order'], maxD: 3, blankLen: [4, 6], distract: 4, similar: true,  pos: ['end', 'start', 'mid'], opts: 4, words: [4, 7] },
  };
  const TYPE_NAME = { blank: '빈칸 채우기', order: '순서 맞추기', meaning: '뜻 보고 고르기' };

  const words = p => p.t.split(' ');
  const inRange = (n, [a, b]) => n >= a && n <= b;
  const ALL_SYL = [...new Set(PROVERBS.map(p => p.t.replace(/ /g, '')).join(''))];   // 방해 글자 후보
  /* "~다" 뜻풀이를 "~다는 뜻이에요"로 읽기 */
  const meaningTalk = m => (m.endsWith('이다') ? m.slice(0, -2) + '이라는' : m + '는') + ' 뜻이에요.';

  /* 비슷한 글자 만들기(similarSyllable)는 core.js의 한글 도구를 써요 */

  /* 빈칸 후보: 어절 1~2개를 빈칸으로 (속담 전체를 비우지는 않아요) */
  function blankSpans(p, cfg) {
    const ws = words(p), out = [];
    for (let i = 0; i < ws.length; i++) {
      for (let j = i; j <= Math.min(i + 1, ws.length - 1); j++) {
        if (j - i + 1 === ws.length) continue;
        const len = ws.slice(i, j + 1).join('').length;
        const pos = j === ws.length - 1 ? 'end' : (i === 0 ? 'start' : 'mid');
        if (inRange(len, cfg.blankLen) && cfg.pos.includes(pos)) out.push({ i, j, pos });
      }
    }
    return out;
  }

  /* 출제 이력: 최근에 나온 속담은 빼고, 이틀 전에 틀린 속담은 가끔 다시 내요 */
  const myTrials = () => Store.cache.trials.filter(t => t.gameId === 'proverb' && t.detail);
  const recentIds = () => myTrials().slice().sort((a, b) => String(b.answeredAt).localeCompare(String(a.answeredAt))).slice(0, 40).map(t => t.detail.proverbId);
  function reviewIds() {
    const last = new Map();
    myTrials().forEach(t => { const p = last.get(t.detail.proverbId); if (!p || String(t.answeredAt) > String(p.answeredAt)) last.set(t.detail.proverbId, t); });
    return [...last.values()].filter(t => !t.correct && Date.now() - new Date(t.answeredAt).getTime() > 2 * 86400000).map(t => t.detail.proverbId);
  }
  const seenCount = id => myTrials().filter(t => t.detail.proverbId === id).length;
  let sessionUsed = new Set();

  /* ---------- 한 판 만들기 ---------- */
  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    if (!hist.typeHistory || hist.typeHistory.length === 0) sessionUsed = new Set();   // 새 회차 시작
    const type = pickType(rng, cfg.types, hist.typeHistory);
    const fits = p => p.d <= cfg.maxD && (type !== 'order' || inRange(words(p).length, cfg.words)) && (type !== 'blank' || blankSpans(p, cfg).length > 0);
    const recent = new Set(recentIds());
    let pool = PROVERBS.filter(p => fits(p) && !sessionUsed.has(p.id) && !recent.has(p.id));
    if (pool.length < 5) pool = PROVERBS.filter(p => fits(p) && !sessionUsed.has(p.id));
    if (!pool.length) pool = PROVERBS.filter(fits);
    const reviewable = reviewIds().map(id => PROVERBS.find(p => p.id === id)).filter(p => p && fits(p) && !sessionUsed.has(p.id));
    const isReview = reviewable.length > 0 && rng() < 0.25;
    const item = isReview ? reviewable[Math.floor(rng() * reviewable.length)] : pool[Math.floor(rng() * pool.length)];
    sessionUsed.add(item.id);
    const ws = words(item);
    const r = { seed, level, type, item, ws, isReview, seen: seenCount(item.id) };

    if (type === 'blank') {
      const spans = blankSpans(item, cfg);
      r.span = spans[Math.floor(rng() * spans.length)];
      r.answer = [...ws.slice(r.span.i, r.span.j + 1).join('')];      // 정답 글자들
      const dis = [];
      for (let t = 0; t < 200 && dis.length < cfg.distract; t++) {
        const c = cfg.similar && rng() < 0.7 ? similarSyllable(r.answer[Math.floor(rng() * r.answer.length)], rng) : ALL_SYL[Math.floor(rng() * ALL_SYL.length)];
        if (c && !r.answer.includes(c) && !dis.includes(c)) dis.push(c);
      }
      r.distractors = dis;
      r.blocks = shuffle(rng, r.answer.concat(dis));
    } else if (type === 'order') {
      let order = shuffle(rng, range(ws.length));
      if (order.every((v, i) => ws[v] === ws[i])) order = order.slice(1).concat(order[0]);   // 처음부터 맞는 순서는 피해요
      r.tiles = order.map(k => ws[k]);
      r.answer = ws.slice();
    } else {
      const others = [], groups = new Set([item.g]);
      for (const p of shuffle(rng, PROVERBS)) {                       // 뜻이 비슷한 속담은 보기로 함께 내지 않아요
        if (others.length >= cfg.opts - 1) break;
        if (p.id === item.id || groups.has(p.g) || p.d > cfg.maxD + 1) continue;
        others.push(p); groups.add(p.g);
      }
      r.options = shuffle(rng, [item].concat(others));
      r.answerIdx = r.options.indexOf(item);
      r.answer = [r.answerIdx];
    }
    return r;
  }

  /* ---------- 화면 ---------- */
  const S = { round: null };
  const U = { filled: [], used: [], placed: [], edits: 0 };      // 지금 입력 상태
  function resetInput(r) {
    U.filled = r.type === 'blank' ? r.answer.map(() => null) : [];
    U.used = r.type === 'blank' ? r.blocks.map(() => false) : [];
    U.placed = []; U.edits = 0;
  }
  const complete = r => (r.type === 'blank' ? U.filled.every(b => b !== null) : U.placed.length === r.tiles.length);
  const meaningBox = r => `<div class="pv-mean"><b>뜻</b> ${r.item.m}</div>`;

  function sentenceHTML(r, slotFn) {               // 빈칸 자리는 slotFn이 그려요
    const big = r.item.t.replace(/ /g, '').length > 16;
    const fs = big ? 26 : 30, sw = big ? 40 : 46, sh = big ? 48 : 54;
    let k = 0;
    return `<div class="pv-sent" style="font-size:${fs}px">${r.ws.map((w, wi) => {
      if (wi < r.span.i || wi > r.span.j) return `<span class="pv-word">${w}</span>`;
      return `<span class="pv-word">${[...w].map(() => slotFn(k++, sw, sh, fs)).join('')}</span>`;
    }).join('')}</div>`;
  }
  function renderBlank(r, pop) {
    const sent = sentenceHTML(r, (k, sw, sh, fs) => {
      const b = U.filled[k];
      return `<button type="button" class="pv-slot${b !== null ? ' filled' : ''}" data-action="game" data-op="unslot" data-value="${k}" aria-label="${k + 1}번째 빈칸${b !== null ? ', ' + r.blocks[b] : ''}"
        style="width:${sw}px;height:${sh}px;font-size:${fs}px">${b !== null ? r.blocks[b] : ''}</button>`;
    });
    const tray = r.blocks.map((c, i) => `<button type="button" class="pv-block${pop ? ' pop' : ''}" data-action="game" data-op="block" data-value="${i}" ${U.used[i] ? 'disabled' : ''} style="animation-delay:${i * 40}ms">${c}</button>`).join('');
    $('#arena').innerHTML = `<div class="pv-card">${sent}</div><div class="pv-tray">${tray}</div>`;
  }
  function renderOrder(r, pop) {
    const line = U.placed.map((ti, k) => `<button type="button" class="pv-tile placed" data-action="game" data-op="unplace" data-value="${k}">${r.tiles[ti]}</button>`).join('') +
      r.tiles.slice(U.placed.length).map(() => '<span class="pv-ph" aria-hidden="true"></span>').join('');
    const tray = r.tiles.map((w, i) => `<button type="button" class="pv-tile${pop ? ' pop' : ''}" data-action="game" data-op="tile" data-value="${i}" ${U.placed.includes(i) ? 'disabled' : ''} style="animation-delay:${i * 50}ms">${w}</button>`).join('');
    $('#arena').innerHTML = `<div class="pv-card"><div class="pv-label">만든 속담</div><div class="pv-line">${line}</div></div><div class="pv-tray">${tray}</div>`;
  }
  function renderMeaning(r) {
    const h = r.options.length > 3 ? 46 : 56, fs = r.options.length > 3 ? 21 : 23;
    $('#arena').innerHTML = `<div class="pv-card"><div class="pv-label">이런 뜻이에요</div><div class="pv-meaning">${r.item.m}</div></div>
      <div class="pv-opts">${r.options.map((p, k) => `<button type="button" class="pv-opt pop" data-action="pick" data-value="${k}" style="min-height:${h}px;font-size:${fs}px;animation-delay:${k * 60}ms">${p.t}</button>`).join('')}</div>`;
  }
  function renderInput(pop) {
    const r = S.round;
    if (r.type === 'blank') renderBlank(r, pop); else if (r.type === 'order') renderOrder(r, pop); else renderMeaning(r);
    const done = $('#pv-done'); if (done) done.disabled = !complete(r);
  }
  const panelButtons = `<button type="button" class="btn btn-primary" data-action="game" data-op="done" id="pv-done" disabled>${ICON.check} 다 했어요</button>
    <button type="button" class="btn btn-line" data-action="game" data-op="clear" style="height:52px;font-size:20px">처음부터</button>`;

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  registerGame({
    id: 'proverb', category: 'language', name: '속담 놀이', short: '익숙한 속담을<br>떠올려 맞혀요', direct: true,
    thumb() {
      const slot = '<span style="display:inline-block;width:22px;height:26px;margin:0 1px;border:2px dashed #B8501A;border-radius:6px;vertical-align:middle;background:#FFF8F2"></span>';
      const blk = c => `<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:2px solid #CFC3AE;border-radius:8px;background:#FFFFFF;font:700 17px 'Noto Sans KR'">${c}</span>`;
      return `<div style="position:absolute;left:14px;top:10px;font:700 19px 'Noto Sans KR';line-height:1.55;color:#2B2520">가는 말이 고와야<br>오는 ${slot}${slot} 곱다</div>
        <div style="position:absolute;left:14px;bottom:8px;display:flex;gap:6px">${blk('이')}${blk('말')}${blk('발')}</div>`;
    },
    ruleCards() {
      const slot = c => `<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:30px;margin:0 1px;border:2px ${c ? 'solid' : 'dashed'} #B8501A;border-radius:6px;background:#FFF8F2;vertical-align:middle">${c || ''}</span>`;
      const blk = c => `<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:2px solid #CFC3AE;border-radius:9px;background:#FFFFFF;font:700 19px 'Noto Sans KR';box-shadow:0 2px 0 #CFC3AE">${c}</span>`;
      const tile = (w, on) => `<span style="display:inline-flex;align-items:center;height:32px;padding:0 9px;border:2px solid ${on ? '#B8501A' : '#CFC3AE'};border-radius:9px;background:${on ? '#FFF1E6' : '#FFFFFF'};font:700 17px 'Noto Sans KR'">${w}</span>`;
      return [
        [`<div style="position:absolute;left:30px;right:0;top:0;text-align:center;font:700 18px 'Noto Sans KR';line-height:1.6">가는 말이 고와야<br>오는 ${slot('말')}${slot('')} 곱다</div>
          <div style="position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:center;gap:8px">${blk('이')}${blk('발')}</div>`, '빈칸 글자를<br>하나씩 눌러요'],
        [`<div style="position:absolute;left:40px;right:0;top:4px;display:flex;gap:5px">${tile('백지장도', true)}${tile('맞들면', true)}</div>
          <div style="position:absolute;left:0;right:0;bottom:4px;display:flex;justify-content:center;gap:5px">${tile('낫다')}</div>`, '말 조각을<br>순서대로 놓아요'],
        [`<div style="position:absolute;left:44px;right:8px;top:0;padding:6px 10px;border-radius:10px;background:#E1EEEE;color:#174852;font:700 16px 'Noto Sans KR'">힘을 합치면 쉽다</div>
          <div style="position:absolute;left:8px;right:8px;top:44px;padding:5px 10px;border-radius:10px;border:2px solid #2E7D4F;background:#EEF6F0;font:700 15px 'Noto Sans KR'">백지장도 맞들면 낫다</div>
          <div style="position:absolute;left:8px;right:8px;top:76px;padding:4px 10px;border-radius:10px;border:2px solid #EFE5D4;background:#FFFFFF;font:700 15px 'Noto Sans KR'">등잔 밑이 어둡다</div>`, '뜻을 보고<br>속담을 골라요'],
      ];
    },
    ruleTalk: '익숙한 속담으로 놀아요. 빈칸에 들어갈 글자를 하나씩 누르거나, 말 조각을 순서대로 놓거나, 뜻을 보고 알맞은 속담을 골라요. 천천히 하셔도 괜찮아요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return {
        chip: `문제 ${roundsOf(this)}개`, title: '속담 놀이를 시작해요',
        sub: '익숙한 속담을 떠올려 보세요.<br>시간 제한이 없으니 천천히 하셔도 괜찮아요',
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">${['blank', 'order', 'meaning'].map(t => {
          const on = cfg.types.includes(t);
          return `<span class="chip ${on ? 'chip-teal' : ''}" style="height:40px;font-size:19px;${on ? '' : 'opacity:.45'}">${TYPE_NAME[t]}${on ? '' : ' (다음 단계)'}</span>`;
        }).join('')}</div>`,
        talk: '속담 놀이를 시작해요. 시간 제한이 없으니 천천히 하셔도 괜찮아요.',
      };
    },
    setup(r) { S.round = r; $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      const chip = TYPE_NAME[r.type];
      if (r.type === 'blank') return { chip, head: '빈칸 글자를<br>골라 주세요', size: 28, sub: '칸을 누르면 빠져요', buttons: panelButtons, talk: '빈칸에 들어갈 글자를 하나씩 눌러 주세요.' };
      if (r.type === 'order') return { chip, head: '순서대로<br>놓아 주세요', size: 28, sub: '놓은 조각은 누르면 빠져요', buttons: panelButtons, talk: '말 조각을 순서대로 눌러서 속담을 만들어 주세요.' };
      return { chip, head: '이런 뜻의<br>속담은?', size: 30, sub: '아래에서<br>골라 주세요', talk: r.item.m + '. 이런 뜻의 속담은 무엇일까요?' };
    },
    pickCount() { return 1; },
    enablePicking(r) { S.round = r; resetInput(r); renderInput(true); },
    markPicks() {},
    handle(op, v) {                 // 글자·조각 누르기는 놀이가 직접 처리해요
      const r = S.round, i = Number(v);
      if (op === 'block') { if (U.used[i]) return; const k = U.filled.indexOf(null); if (k < 0) return; U.filled[k] = i; U.used[i] = true; noteTap(); }
      else if (op === 'unslot') { const b = U.filled[i]; if (b === null) return; U.filled[i] = null; U.used[b] = false; U.edits++; }
      else if (op === 'tile') { if (U.placed.includes(i)) return; U.placed.push(i); noteTap(); }
      else if (op === 'unplace') { U.placed.splice(i, 1); U.edits++; }
      else if (op === 'clear') { if (U.placed.length || U.filled.some(b => b !== null)) U.edits++; U.filled = U.filled.map(() => null); U.used = U.used.map(() => false); U.placed = []; }
      else if (op === 'done') {
        if (!complete(r)) return;
        submitAnswer(r.type === 'blank' ? U.filled.map(b => r.blocks[b]) : U.placed.map(k => r.tiles[k]));
        return;
      }
      renderInput(false);
    },
    score(r, picks) {
      if (r.type === 'meaning') return picks[0] === r.answerIdx ? 100 : 0;
      const ok = r.answer.filter((a, i) => picks[i] === a).length;     // 제자리에 맞은 글자(조각) 비율
      return Math.round(100 * ok / r.answer.length);
    },
    reveal(r, picks) {
      if (r.type === 'meaning') {
        $$('#arena .pv-opt').forEach(el => {
          const k = Number(el.dataset.value);
          el.disabled = true; el.classList.remove('pop');
          el.classList.toggle('right', k === r.answerIdx);
          el.classList.toggle('wrongPick', picks.includes(k) && k !== r.answerIdx);
        });
        return;
      }
      const right = picks.every((p, i) => p === r.answer[i]);
      if (r.type === 'blank') {
        const sent = sentenceHTML(r, (k, sw, sh, fs) => `<span class="pv-slot ${picks[k] === r.answer[k] ? 'ok' : 'fix'}" style="width:${sw}px;height:${sh}px;font-size:${fs}px">${r.answer[k]}</span>`);
        $('#arena').innerHTML = `<div class="pv-card">${sent}${meaningBox(r)}${right ? '' : `<div class="pv-mine">고르신 글자: <b>${picks.join('')}</b></div>`}</div>`;
      } else {
        $('#arena').innerHTML = `<div class="pv-card"><div class="pv-label">정답</div><div class="pv-line">${r.answer.map((w, i) => `<span class="pv-tile ${picks[i] === w ? 'ok' : 'fix'}">${w}</span>`).join('')}</div>
          ${meaningBox(r)}${right ? '' : `<div class="pv-mine">고르신 순서: <b>${picks.join(' ')}</b></div>`}</div>`;
      }
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) {
      let detail;
      if (r.type === 'blank') detail = acc === 100 ? '속담을 정확히<br>떠올리셨어요' : (acc > 0 ? '몇 글자만<br>달랐어요' : '괜찮아요!<br>정답을 봐 주세요');
      else if (r.type === 'order') detail = acc === 100 ? '순서가<br>딱 맞아요' : (acc > 0 ? '몇 조각만<br>자리가 달랐어요' : '괜찮아요!<br>정답을 봐 주세요');
      else detail = acc === 100 ? '뜻을 정확히<br>아셨어요' : '초록색 속담이<br>정답이에요';
      return { detail, talk: `${r.item.t}. ${meaningTalk(r.item.m)}` };
    },
    detail(r, picks) {
      return {
        proverbId: r.item.id, proverb: r.item.t, difficulty: r.item.d, wordCount: r.ws.length,
        seenBefore: r.seen, firstSeen: r.seen === 0, reviewItem: r.isReview, edits: U.edits,
        blankText: r.type === 'blank' ? r.answer.join('') : '', blankPos: r.type === 'blank' ? r.span.pos : '',
        distractors: r.type === 'blank' ? r.distractors : [], optionIds: r.type === 'meaning' ? r.options.map(p => p.id) : [],
        chosen: r.type === 'meaning' ? String(r.options[picks[0]].id) : (r.type === 'blank' ? picks.join('') : picks.join(' ')),
      };
    },
    answerKey(r) { return [r.item.id]; },
    _test: { buildRound, similarSyllable, blankSpans, LEVELS },
  });
})();
