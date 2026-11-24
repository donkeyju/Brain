/* =========================================================
   흉내말 맞추기 (카테고리: 언어력)
   "강아지가 ○○ 짖어요"처럼 문장의 빈칸에 알맞은 흉내말(소리·모양을 흉내 내는 말)을 골라요.
   - fill : 문장 빈칸에 맞는 흉내말 고르기
   - who  : "꿀꿀"은 누구의 소리일까요? (5단계)
   흉내말 목록은 mimic-data.js(MIMIC_BANK)에 있어요.
   같은 문장에 둘 다 맞을 수 있는 말(보슬보슬·주룩주룩)은 같은 묶음이라 함께 보기로 나오지 않아요.
   ========================================================= */
(function () {
  /* 난이도 표
     domains: 나오는 영역(동물 소리 / 사물·자연 소리 / 모양·움직임)
     opts: 보기 수   near: 같은 영역의 말을 오답으로 먼저 써요(더 헷갈려요) */
  const LEVELS = {
    1: { types: ['fill'],        domains: ['animal'],                  opts: 3, near: false },
    2: { types: ['fill'],        domains: ['animal', 'sound'],         opts: 3, near: false },
    3: { types: ['fill'],        domains: ['animal', 'sound', 'move'], opts: 3, near: true },
    4: { types: ['fill'],        domains: ['animal', 'sound', 'move'], opts: 4, near: true },
    5: { types: ['fill', 'who'], domains: ['animal', 'sound', 'move'], opts: 4, near: true },
  };
  const BANK = MIMIC_BANK.map((it, i) => Object.assign({ id: i, groups: [].concat(it.g) }, it));
  const DOMAIN_NAME = { animal: '동물 소리', sound: '사물·자연 소리', move: '모양·움직임' };
  const clash = (a, b) => a.a === b.a || a.groups.some(g => b.groups.includes(g));     // 같은 묶음이면 오답으로 쓰지 않아요

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const type = pickType(rng, cfg.types, hist.typeHistory);
    if (!hist.typeHistory.length || !U.used) U.used = new Set();              // 새 회차마다 "이번에 나온 문장"을 비워요
    let pool = BANK.filter(it => cfg.domains.includes(it.d) && (type === 'fill' || it.who));
    const fresh = pool.filter(it => !U.used.has(it.id));
    if (fresh.length) pool = fresh;
    const q = pool[Math.floor(rng() * pool.length)];
    U.used.add(q.id);
    if (type === 'who') {
      const others = shuffle(rng, BANK.filter(it => it.who && it.who !== q.who && !clash(it, q))).slice(0, cfg.opts - 1).map(it => it.who);
      const options = shuffle(rng, [q.who].concat(others));
      return { seed, level, type, q: q.id, options, answerIdx: options.indexOf(q.who), answer: [options.indexOf(q.who)] };
    }
    const cand = shuffle(rng, BANK.filter(it => !clash(it, q)));
    const same = cand.filter(it => it.d === q.d), diff = cand.filter(it => it.d !== q.d);
    const order = cfg.near ? same.concat(diff) : diff.concat(same);
    const picked = [];
    for (const it of order) { if (picked.length >= cfg.opts - 1) break; if (!picked.some(p => clash(p, it))) picked.push(it); }
    const options = shuffle(rng, [q.a].concat(picked.map(it => it.a)));
    return { seed, level, type, q: q.id, options, answerIdx: options.indexOf(q.a), answer: [options.indexOf(q.a)], near: picked.filter(it => it.d === q.d).length };
  }

  /* ---------- 화면 ---------- */
  const U = { used: null };
  const Q = r => BANK[r.q];
  const sentenceHTML = (r, fill) => {
    const it = Q(r);
    if (r.type === 'who') return `<span class="mm-word">"${it.a}"</span><br><span class="mm-small">누구의 소리일까요?</span>`;
    const [a, b] = it.s.split('○○');
    return `${a}<span class="mm-blank ${fill ? 'filled' : ''}">${fill ? it.a : '?'}</span>${b}`;
  };
  function render(r) {
    const four = r.options.length > 3;
    $('#arena').innerHTML = `<div class="mm-card"><span class="mm-tag">${DOMAIN_NAME[Q(r).d]}</span><div class="mm-sentence" id="mm-s">${sentenceHTML(r, false)}</div></div>
      <div class="mm-opts ${four ? 'four' : ''}">${r.options.map((o, k) => `<button type="button" class="wd-opt mm-opt pop" data-action="pick" data-value="${k}" style="animation-delay:${k * 60}ms">${o}</button>`).join('')}</div>`;
  }
  const spoken = r => (r.type === 'who' ? `${Q(r).a}. 누구의 소리일까요?` : Q(r).s.replace('○○', '무엇') + '?');

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  const miniCard = (text, blank, fill) => `<div style="display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:12px;background:#FFFFFF;border:2px solid #EFE5D4;font:700 17px 'Noto Sans KR';white-space:nowrap">${text}<span style="display:inline-flex;align-items:center;justify-content:center;min-width:46px;height:28px;border-radius:8px;border:2px ${fill ? 'solid #2E7D4F' : 'dashed #B8501A'};background:${fill ? '#EEF6F0' : '#FFF8F2'};color:${fill ? '#1E5E39' : '#B8501A'};font-weight:900">${blank}</span></div>`;
  registerGame({
    id: 'mimic', category: 'language', name: '흉내말 맞추기', short: '소리와 모양을<br>흉내 내는 말을 골라요', direct: true, rounds: 10,
    thumb() { return `<div style="position:absolute;left:14px;top:18px">${miniCard('강아지가', '멍멍', true)}</div><div style="position:absolute;left:30px;top:62px">${miniCard('비가', '?', false)}</div>`; },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:36px;right:0;top:20px;display:flex;justify-content:center">${miniCard('강아지가', '?', false)}</div>`, '문장에 빈칸이<br>있어요'],
        [`<div style="position:absolute;left:36px;right:0;top:18px;display:flex;justify-content:center;gap:6px;font:900 20px 'Noto Sans KR'"><span>멍멍</span><span>야옹</span><span>꿀꿀</span></div>`, '알맞은 흉내말을<br>골라요'],
        [`<div style="position:absolute;left:0;right:0;top:20px;display:flex;justify-content:center">${miniCard('강아지가', '멍멍', true)}</div>`, '소리 내어 읽어<br>보세요'],
      ];
    },
    ruleTalk: '문장의 빈칸에 알맞은 흉내말을 골라 주세요. 강아지가 멍멍 짖어요처럼, 소리나 모양을 흉내 내는 말이에요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '흉내말 맞추기를 시작해요', sub: '문장에 알맞은 흉내말을 골라요.<br>소리 내어 읽으면 더 재미있어요',
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">${['animal', 'sound', 'move'].map(d => { const on = cfg.domains.includes(d);
          return `<span class="chip ${on ? 'chip-teal' : ''}" style="height:40px;font-size:19px;${on ? '' : 'opacity:.45'}">${DOMAIN_NAME[d]}${on ? '' : ' (다음 단계)'}</span>`; }).join('')}</div>`,
        talk: '흉내말 맞추기를 시작해요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      if (r.type === 'who') return { chip: '누구의 소리', head: '누구의<br>소리일까요?', size: 30, sub: '소리를 흉내 내어<br>읽어 보세요', talk: spoken(r) };
      return { chip: DOMAIN_NAME[Q(r).d], head: '빈칸에 맞는<br>말은?', size: 30, sub: '문장을 소리 내어<br>읽어 보세요', talk: spoken(r) };
    },
    pickCount() { return 1; },
    enablePicking(r) { render(r); },
    markPicks() {},
    score(r, picks) { return picks[0] === r.answerIdx ? 100 : 0; },
    reveal(r, picks) {
      const s = $('#mm-s'); if (s && r.type === 'fill') s.innerHTML = sentenceHTML(r, true);
      $$('#arena .wd-opt').forEach(el => {
        const k = Number(el.dataset.value);
        el.disabled = true; el.classList.remove('pop');
        el.classList.toggle('right', k === r.answerIdx);
        el.classList.toggle('wrongPick', picks.includes(k) && k !== r.answerIdx);
      });
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) {
      const it = Q(r), full = r.type === 'who' ? `${it.who}${hasBatchim(it.who[it.who.length - 1]) ? '이' : '가'} ${it.a} 소리를 내요.` : it.s.replace('○○', it.a) + '.';
      const ans = r.type === 'who' ? it.who : it.a, was = hasBatchim(ans[ans.length - 1]) ? '이에요' : '예요';
      return { detail: acc === 100 ? '알맞은 말을<br>고르셨어요' : `정답은<br>${ans}${was}`, talk: full };
    },
    detail(r, picks) {
      const it = Q(r);
      return { mimicType: r.type, domain: it.d, sentence: it.s, answerWord: r.type === 'who' ? it.who : it.a, options: r.options, chosen: r.options[picks[0]], nearOptions: r.near || 0 };
    },
    answerKey(r) { return [r.type]; },
    _test: { buildRound, LEVELS, BANK, clash },
  });
})();
