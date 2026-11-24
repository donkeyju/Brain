/* =========================================================
   단어 맞추기 (카테고리: 언어력)
   단어 목록(word-data.js)에서 단어 하나를 골라 글자 한두 개를 빈칸으로 만들고,
   보기 중에서 알맞은 글자를 골라요. 예) 기 러 ○ → [기] [거] [구]
   단어·빈칸 위치·오답 보기를 모두 난수로 정해서 문제가 계속 새로 나와요 (조합형).
   ========================================================= */
(function () {
  /* 난이도 표
     len: 단어 글자 수 [최소, 최대]   pos: 빈칸 위치(end 끝 / start 앞 / mid 가운데)
     blanks: 빈칸 글자 수(2는 4글자 이상 단어에서만)   opts: 보기 수
     hint: cho(범주 + 첫소리) / cat(범주만) / none(없음)
     distract: far(첫소리가 다른 글자) / random(아무 글자) / similar(모양·소리가 비슷한 글자 섞기) */
  const LEVELS = {
    1: { len: [2, 3], pos: ['end'],                 blanks: 1, opts: 3, hint: 'cho',  distract: 'far' },
    2: { len: [2, 3], pos: ['end', 'start'],        blanks: 1, opts: 3, hint: 'cat',  distract: 'random' },
    3: { len: [3, 4], pos: ['end', 'start', 'mid'], blanks: 1, opts: 4, hint: 'cat',  distract: 'random' },
    4: { len: [3, 4], pos: ['end', 'start', 'mid'], blanks: 1, opts: 4, hint: 'cat',  distract: 'similar' },
    5: { len: [3, 4], pos: ['end', 'start', 'mid'], blanks: 2, opts: 4, hint: 'none', distract: 'similar' },
  };
  const ENTRIES = WORD_BANK.flatMap(c => c.words.map(w => ({ w, cat: c.cat, hint: c.hint })));
  const ALLSET = new Set(ENTRIES.map(e => e.w));
  const ALL_SYL = [...new Set(ENTRIES.map(e => e.w).join(''))];
  const inRange = (n, [a, b]) => n >= a && n <= b;

  /* 빈칸 후보 */
  function blankCandidates(w, cfg) {
    const nb = cfg.blanks === 2 && w.length >= 4 ? 2 : 1, out = [];
    for (let i = 0; i + nb <= w.length; i++) {
      const pos = i + nb === w.length ? 'end' : (i === 0 ? 'start' : 'mid');
      if (cfg.pos.includes(pos)) out.push({ i, nb, pos });
    }
    return out;
  }
  /* 정답이 둘이 되는 문제 막기 ①: 보이는 글자가 같은 다른 단어가 있으면 그 빈칸은 쓰지 않아요
     (힌트가 있으면 같은 범주 안에서, 힌트가 없으면 전체 목록에서 확인) */
  function ambiguous(e, c, scope) {
    return ENTRIES.some(o => o.w !== e.w && o.w.length === e.w.length && (scope === 'all' || o.cat === e.cat) &&
      [...e.w].every((ch, k) => (k >= c.i && k < c.i + c.nb) || o.w[k] === ch));
  }
  /* 오답 보기 만들기
     정답이 둘이 되는 문제 막기 ②: 오답 글자를 넣었을 때 목록에 있는 다른 단어가 되면 빼요 (사과 문제에 "자" → 사자 X) */
  function makeDistractors(rng, e, c, correct, cfg) {
    const out = [], need = cfg.opts - 1;
    const ok = d => d && d !== correct && !out.includes(d) && !ALLSET.has(e.w.slice(0, c.i) + d + e.w.slice(c.i + c.nb));
    const randSyl = () => ALL_SYL[Math.floor(rng() * ALL_SYL.length)];
    for (let t = 0; t < 400 && out.length < need; t++) {
      let d;
      if (c.nb === 1) {
        if (cfg.distract === 'similar' && rng() < 0.7) d = similarSyllable(correct, rng);
        else d = randSyl();
        if (cfg.distract === 'far' && d && (choseong(d) === choseong(correct) || out.some(x => choseong(x) === choseong(d)))) continue;
      } else {                                                 // 2글자 빈칸: 한 글자만 비슷하게 바꾸거나 둘 다 바꾸기
        const k = rng() < 0.5 ? 0 : 1;
        const sub = cfg.distract === 'similar' && rng() < 0.7 ? similarSyllable(correct[k], rng) : randSyl();
        d = rng() < 0.7 ? (k === 0 ? sub + correct[1] : correct[0] + sub) : randSyl() + randSyl();
      }
      if (ok(d)) out.push(d);
    }
    return out;
  }

  /* 출제 이력: 같은 회차에 같은 단어 X, 최근 30판에 나온 단어는 우선 빼요 */
  const myTrials = () => Store.cache.trials.filter(t => t.gameId === 'word' && t.detail);
  const recentWords = () => new Set(myTrials().slice().sort((a, b) => String(b.answeredAt).localeCompare(String(a.answeredAt))).slice(0, 30).map(t => t.detail.word));
  const seenCount = w => myTrials().filter(t => t.detail.word === w).length;
  let sessionUsed = new Set();

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    if (!hist.typeHistory || hist.typeHistory.length === 0) sessionUsed = new Set();
    const scope = cfg.hint === 'none' ? 'all' : 'cat';
    const recent = recentWords();
    let pool = ENTRIES.filter(e => inRange(e.w.length, cfg.len) && !sessionUsed.has(e.w) && !recent.has(e.w));
    if (pool.length < 10) pool = ENTRIES.filter(e => inRange(e.w.length, cfg.len) && !sessionUsed.has(e.w));
    for (let attempt = 0; attempt < 300; attempt++) {
      const e = pool[Math.floor(rng() * pool.length)];
      const cands = blankCandidates(e.w, cfg).filter(c => !ambiguous(e, c, scope));
      if (!cands.length) continue;
      const c = cands[Math.floor(rng() * cands.length)];
      const correct = e.w.substr(c.i, c.nb);
      const dis = makeDistractors(rng, e, c, correct, cfg);
      if (dis.length < cfg.opts - 1) continue;
      const options = shuffle(rng, [correct].concat(dis));
      sessionUsed.add(e.w);
      return {
        seed, level, type: c.nb === 2 ? 'blank2' : 'blank1', entry: e, word: e.w, blankI: c.i, nb: c.nb, pos: c.pos,
        correct, options, answerIdx: options.indexOf(correct), answer: [options.indexOf(correct)], hint: cfg.hint, seen: seenCount(e.w),
      };
    }
    throw new Error('단어 문제를 만들지 못했어요');
  }

  /* ---------- 화면 ---------- */
  const inBlank = (r, k) => k >= r.blankI && k < r.blankI + r.nb;
  function wordHTML(r, reveal) {
    const n = r.word.length, size = n >= 4 ? 84 : 96, fs = n >= 4 ? 52 : 58;
    return `<div class="wd-word">${[...r.word].map((ch, k) => {
      if (!inBlank(r, k)) return `<span class="wd-box" style="width:${size}px;height:${size + 8}px;font-size:${fs}px">${ch}</span>`;
      const inner = reveal ? ch : (r.hint === 'cho' ? `<i>${choseong(ch)}</i>` : '?');
      return `<span class="wd-box ${reveal ? 'ok' : 'blank'}" style="width:${size}px;height:${size + 8}px;font-size:${fs}px">${inner}</span>`;
    }).join('')}</div>`;
  }
  function hintHTML(r) {
    if (r.hint === 'none') return '<span class="chip">힌트 없이 맞혀 보세요</span>';
    return `<span class="chip chip-teal" style="height:38px;font-size:20px">${r.entry.hint}</span>` +
      (r.hint === 'cho' ? '<span class="chip chip-warm" style="height:38px;font-size:20px">빈칸의 첫소리를 보여 드려요</span>' : '');
  }
  function render(r) {
    const w = r.nb === 2 ? 150 : 110;
    $('#arena').innerHTML = `<div class="wd-card"><div class="wd-hints">${hintHTML(r)}</div>${wordHTML(r, false)}</div>
      <div class="wd-opts">${r.options.map((o, k) => `<button type="button" class="wd-opt pop" data-action="pick" data-value="${k}" style="width:${w}px;animation-delay:${k * 60}ms">${o}</button>`).join('')}</div>`;
  }
  const isWas = w => (hasBatchim(w[w.length - 1]) ? '이에요' : '예요');

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  const box = (c, dashed) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:42px;height:46px;border:2px ${dashed ? 'dashed #B8501A' : 'solid #CFC3AE'};border-radius:10px;background:${dashed ? '#FFF8F2' : '#FFFFFF'};font:700 26px 'Noto Sans KR'">${c}</span>`;
  registerGame({
    id: 'word', category: 'language', name: '단어 맞추기', short: '빈칸에 들어갈 글자를<br>골라 단어를 완성해요', direct: true,
    rounds: 10,                      // 금방 끝나서 한 번에 10문제
    thumb() {
      return `<div style="position:absolute;left:14px;top:14px;display:flex;gap:6px">${box('기')}${box('러')}${box('?', true)}</div>
        <div style="position:absolute;left:14px;bottom:10px;display:flex;gap:6px;opacity:.85">${['기', '거', '구'].map(c => `<span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border:2px solid #CFC3AE;border-radius:9px;background:#FFFFFF;font:700 19px 'Noto Sans KR'">${c}</span>`).join('')}</div>`;
    },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:36px;right:0;top:20px;display:flex;justify-content:center;gap:6px">${box('기')}${box('러')}${box('?', true)}</div>`, '빈칸이 있는<br>단어가 나와요'],
        [`<div style="position:absolute;left:40px;right:0;top:14px;display:flex;flex-direction:column;align-items:center;gap:8px"><span class="chip chip-teal" style="height:34px">새 이름이에요</span><span class="chip chip-warm" style="height:34px">첫소리 ㄱ</span></div>`, '힌트를 보고<br>떠올려요'],
        [`<div style="position:absolute;left:0;right:0;top:20px;display:flex;justify-content:center;gap:8px">${['기', '거', '구'].map((c, i) => `<span style="display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border:${i === 0 ? '3px solid #2E7D4F' : '2px solid #CFC3AE'};border-radius:12px;background:${i === 0 ? '#EEF6F0' : '#FFFFFF'};font:700 24px 'Noto Sans KR'">${c}</span>`).join('')}</div>
          <div style="position:absolute;left:58px;top:56px">${ICON.finger}</div>`, '알맞은 글자를<br>눌러요'],
      ];
    },
    ruleTalk: '빈칸이 있는 단어가 나와요. 힌트를 보고 어떤 단어인지 떠올린 다음, 빈칸에 들어갈 글자를 눌러 주세요. 천천히 하셔도 괜찮아요.',
    buildRound,
    readyInfo(r) {
      return {
        chip: `문제 ${roundsOf(this)}개`, title: '단어 맞추기를 시작해요',
        sub: '빈칸에 들어갈 글자를 골라 단어를 완성해요.<br>시간 제한이 없으니 천천히 하셔도 괜찮아요',
        body: `<div style="display:flex;gap:8px;align-items:center">${box('참')}${box('?', true)}<span style="font-size:20px;font-weight:700;margin-left:8px;color:#5C5148">→ 참외</span></div>`,
        talk: '단어 맞추기를 시작해요. 빈칸에 들어갈 글자를 골라 주세요.',
      };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      const talkHint = r.hint === 'none' ? '' : r.entry.hint + '. ';
      return { chip: r.nb === 2 ? '두 글자 빈칸' : '', head: '빈칸에 들어갈<br>글자는?', size: 28,
        sub: r.hint === 'none' ? '아래에서<br>골라 주세요' : '힌트를 보고<br>골라 주세요', talk: talkHint + '빈칸에 들어갈 글자를 골라 주세요.' };
    },
    pickCount() { return 1; },
    enablePicking(r) { render(r); },
    markPicks() {},
    score(r, picks) { return picks[0] === r.answerIdx ? 100 : 0; },
    reveal(r, picks) {
      $('#arena .wd-word').outerHTML = wordHTML(r, true);
      $$('#arena .wd-opt').forEach(el => {
        const k = Number(el.dataset.value);
        el.disabled = true; el.classList.remove('pop');
        el.classList.toggle('right', k === r.answerIdx);
        el.classList.toggle('wrongPick', picks.includes(k) && k !== r.answerIdx);
      });
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) {
      return {
        detail: acc === 100 ? '단어를 정확히<br>떠올리셨어요' : '초록색 글자가<br>정답이에요',
        talk: `정답은 ${r.word}${isWas(r.word)}.`,
      };
    },
    detail(r, picks) {
      return {
        word: r.word, wordCategory: r.entry.cat, length: r.word.length, blankIndex: r.blankI, blankCount: r.nb, blankPos: r.pos,
        correct: r.correct, options: r.options, chosen: r.options[picks[0]], hint: r.hint, seenBefore: r.seen, firstSeen: r.seen === 0,
      };
    },
    answerKey(r) { return [r.word]; },
    _test: { buildRound, LEVELS, ENTRIES, ambiguous, blankCandidates, ALLSET },
  });
})();
