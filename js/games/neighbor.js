/* =========================================================
   조건에 맞는 이웃 찾기 (카테고리: 논리력)
   "안경을 쓰고 부채를 든 분은?" 처럼 조건에 꼭 맞는 이웃 한 분을 골라요.
   수건돌리기의 이웃 12명(옷 무늬·소품·손에 든 물건)을 그대로 써요.
   어르신 눈높이: 1~2단계는 조건 하나, 3~4단계는 조건 두 개(그리고), "~하지 않은"은 5단계에서만.
   ========================================================= */
(function () {
  const { ROSTER, personSVG, describe } = window.NeighborArt;
  /* 조건 목록: 사람에게 있는지 확인하는 방법(has)과 말하는 방법들
     pos: ~한 / conn: ~하고 / neg: ~하지 않은 / but: ~했지만 / none: ~은 안 한 */
  const ATTRS = [
    { id: 'hat',     field: 'acc',     has: p => p.acc === 'hat',         pos: '모자를 쓴',           conn: '모자를 쓰고',           neg: '모자를 쓰지 않은',           but: '모자를 썼지만',           none: '모자는 안 쓴' },
    { id: 'glasses', field: 'acc',     has: p => p.acc === 'glasses',     pos: '안경을 쓴',           conn: '안경을 쓰고',           neg: '안경을 쓰지 않은',           but: '안경을 썼지만',           none: '안경은 안 쓴' },
    { id: 'scarf',   field: 'acc',     has: p => p.acc === 'scarf',       pos: '목도리를 한',         conn: '목도리를 하고',         neg: '목도리를 하지 않은',         but: '목도리를 했지만',         none: '목도리는 안 한' },
    { id: 'fan',     field: 'item',    has: p => p.item === 'fan',        pos: '부채를 든',           conn: '부채를 들고',           neg: '부채를 들지 않은',           but: '부채를 들었지만',         none: '부채는 안 든' },
    { id: 'cane',    field: 'item',    has: p => p.item === 'cane',       pos: '지팡이를 짚은',       conn: '지팡이를 짚고',         neg: '지팡이를 짚지 않은',         but: '지팡이를 짚었지만',       none: '지팡이는 안 짚은' },
    { id: 'flower',  field: 'item',    has: p => p.item === 'flower',     pos: '꽃을 든',             conn: '꽃을 들고',             neg: '꽃을 들지 않은',             but: '꽃을 들었지만',           none: '꽃은 안 든' },
    { id: 'bag',     field: 'item',    has: p => p.item === 'bag',        pos: '손가방을 든',         conn: '손가방을 들고',         neg: '손가방을 들지 않은',         but: '손가방을 들었지만',       none: '손가방은 안 든' },
    { id: 'stripe',  field: 'pattern', has: p => p.pattern === 'stripe',  pos: '줄무늬 옷을 입은',    conn: '줄무늬 옷을 입고',      neg: '줄무늬 옷을 입지 않은',      but: '줄무늬 옷을 입었지만',    none: '줄무늬 옷은 안 입은' },
    { id: 'dot',     field: 'pattern', has: p => p.pattern === 'dot',     pos: '물방울무늬 옷을 입은', conn: '물방울무늬 옷을 입고',  neg: '물방울무늬 옷을 입지 않은',  but: '물방울무늬 옷을 입었지만', none: '물방울무늬 옷은 안 입은' },
    { id: 'check',   field: 'pattern', has: p => p.pattern === 'check',   pos: '체크무늬 옷을 입은',  conn: '체크무늬 옷을 입고',    neg: '체크무늬 옷을 입지 않은',    but: '체크무늬 옷을 입었지만',  none: '체크무늬 옷은 안 입은' },
    { id: 'vest',    field: 'pattern', has: p => p.pattern === 'vest',    pos: '조끼를 입은',         conn: '조끼를 입고',           neg: '조끼를 입지 않은',           but: '조끼를 입었지만',         none: '조끼는 안 입은' },
  ];
  /* 난이도 표
     templates: one 조건 하나 / and 두 조건 모두 / not 아닌 사람 / andnot 하나는 맞고 하나는 아닌 사람
     fields: 쓰는 조건 종류   people: 보여주는 이웃 수 */
  const LEVELS = {
    1: { templates: ['one'],                fields: ['acc', 'item'],            people: [4, 4] },
    2: { templates: ['one'],                fields: ['acc', 'item', 'pattern'], people: [5, 5] },
    3: { templates: ['and'],                fields: ['acc', 'item', 'pattern'], people: [5, 5] },
    4: { templates: ['and'],                fields: ['acc', 'item', 'pattern'], people: [6, 7] },
    5: { templates: ['and', 'not', 'andnot'], fields: ['acc', 'item', 'pattern'], people: [5, 6] },
  };
  const TEMPLATE_NAME = { one: '조건 하나', and: '조건 두 개', not: '아닌 분 찾기', andnot: '맞고·아닌 분' };

  function satisfies(t, a, b, p) {
    if (t === 'one') return a.has(p);
    if (t === 'and') return a.has(p) && b.has(p);
    if (t === 'not') return !a.has(p);
    return a.has(p) && !b.has(p);                     // andnot
  }
  /* 조건을 말로: 강조할 부분은 <b>, "않은/안"은 빨간 글씨 */
  function condHTML(t, a, b) {
    const neg = s => s.replace(/(않은|안 [가-힣]+)$/, '<em>$1</em>');
    if (t === 'one') return `<b>${a.pos}</b> 분`;
    if (t === 'and') return `<b>${a.conn}</b><br><b>${b.pos}</b> 분`;
    if (t === 'not') return `<b>${neg(a.neg)}</b> 분`;
    return `<b>${a.but}</b><br><b>${neg(b.none)}</b> 분`;
  }
  const condText = (t, a, b) => condHTML(t, a, b).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const template = pickType(rng, cfg.templates, hist.typeHistory);
    const pool = ATTRS.filter(x => cfg.fields.includes(x.field));
    for (let attempt = 0; attempt < 500; attempt++) {
      const a = pool[Math.floor(rng() * pool.length)];
      const others = pool.filter(x => x.field !== a.field);
      const b = template === 'one' || template === 'not' ? null : others[Math.floor(rng() * others.length)];
      // 조건에 맞는 분(S) 중 한 분을 정답으로, 나머지는 조건에 맞지 않는 분(NS)으로 채워요 → 정답은 꼭 한 분
      const S = ROSTER.filter(p => satisfies(template, a, b, p)), NS = ROSTER.filter(p => !satisfies(template, a, b, p));
      if (!S.length) continue;
      let n = randInt(rng, cfg.people[0], cfg.people[1]);
      if (NS.length < n - 1) { if (NS.length + 1 >= 4) n = NS.length + 1; else continue; }
      const ans = S[Math.floor(rng() * S.length)];
      let rest;
      if (b) {                                    // 헷갈리는 이웃(조건 일부만 맞는 분)을 1~2분 꼭 넣어요
        const nearPool = NS.filter(p => (template === 'and' ? (a.has(p) || b.has(p)) : a.has(p)));
        if (!nearPool.length) continue;
        const nearPick = shuffle(rng, nearPool).slice(0, randInt(rng, 1, Math.min(2, nearPool.length)));
        rest = nearPick.concat(shuffle(rng, NS.filter(p => !nearPick.includes(p))).slice(0, n - 1 - nearPick.length));
      } else rest = shuffle(rng, NS).slice(0, n - 1);
      if (rest.length < n - 1) continue;
      const people = shuffle(rng, [ans].concat(rest));
      const near = b ? people.filter(p => p !== ans && (template === 'and' ? (a.has(p) || b.has(p)) : a.has(p))).length : 0;
      const answerIdx = people.indexOf(ans);
      return { seed, level, type: template, a, b, people, answerIdx, answer: [answerIdx], near };
    }
    throw new Error('조건 문제를 만들지 못했어요');
  }

  /* ---------- 화면 ---------- */
  function render(r) {
    const n = r.people.length, cols = n <= 4 ? n : (n <= 6 ? 3 : 4), rows = Math.ceil(n / cols);
    const cw = Math.floor((560 - (cols - 1) * 12) / cols);
    const ch = Math.min(rows === 1 ? 240 : 999, Math.floor((340 - (rows - 1) * 12) / rows));
    const figH = Math.min(ch - 18, Math.floor((cw - 16) * 100 / 76)), figW = Math.floor(figH * 76 / 100);
    $('#arena').innerHTML = `<div class="nb-grid">${r.people.map((p, k) => `<button type="button" class="pcard pop" data-action="pick" data-value="${k}" aria-label="${describe(p)}"
      style="width:${cw}px;height:${ch}px;animation-delay:${k * 50}ms">${personSVG(p, figW)}</button>`).join('')}</div>`;
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  registerGame({
    id: 'neighbor', category: 'logic', name: '조건 맞는 이웃 찾기', short: '"안경을 쓰고 부채를 든 분"<br>조건에 맞는 분을 찾아요', direct: true, rounds: 10,
    thumb() {
      return at(18, 8, personSVG(ROSTER[1], 56)) + at(82, 8, `<div style="border:3px solid #2E7D4F;border-radius:12px;background:#EEF6F0">${personSVG(ROSTER[7], 56)}</div>`) + at(150, 8, personSVG(ROSTER[0], 56));
    },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:44px;right:8px;top:14px;padding:10px;border-radius:12px;background:#E1EEEE;color:#174852;font:700 17px 'Noto Sans KR';line-height:1.45;text-align:center">안경을 쓰고<br>손가방을 든 분</div>`, '조건을<br>잘 읽어요'],
        [at(20, 0, personSVG(ROSTER[1], 60)) + at(84, 0, personSVG(ROSTER[7], 60)) + at(148, 0, personSVG(ROSTER[0], 60)), '이웃들의 모습을<br>살펴봐요'],
        [at(70, 0, `<div style="border:3px solid #2E7D4F;border-radius:14px;background:#EEF6F0">${personSVG(ROSTER[7], 64)}</div>`) + `<div style="position:absolute;left:118px;top:56px">${ICON.finger}</div>`, '조건에 꼭 맞는<br>분을 눌러요'],
      ];
    },
    ruleTalk: '조건을 잘 읽고, 이웃들 중에서 조건에 꼭 맞는 분 한 분을 골라 주세요. 천천히 하셔도 괜찮아요.',
    buildRound,
    readyInfo() {
      return { chip: `문제 ${roundsOf(this)}개`, title: '이웃 찾기를 시작해요', sub: '조건을 읽고 꼭 맞는 분을 찾아요.<br>시간 제한이 없으니 천천히 하셔도 괜찮아요',
        body: `<div style="padding:10px 16px;border-radius:14px;background:#E1EEEE;color:#174852;font:700 20px 'Noto Sans KR'">예) 모자를 쓴 분은 누구일까요?</div>`,
        talk: '이웃 찾기를 시작해요. 조건을 읽고 꼭 맞는 분을 찾아 주세요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      return { chip: TEMPLATE_NAME[r.type], head: '이런 분은<br>누구일까요?', size: 28,
        extra: `<div class="nb-cond">${condHTML(r.type, r.a, r.b)}</div>`, talk: condText(r.type, r.a, r.b) + '은 누구일까요?' };
    },
    pickCount() { return 1; },
    enablePicking(r) { render(r); },
    markPicks() {},
    score(r, picks) { return picks[0] === r.answerIdx ? 100 : 0; },
    reveal(r, picks) {
      $$('#arena .pcard').forEach(el => {
        const k = Number(el.dataset.value);
        el.disabled = true; el.classList.remove('pop');
        el.classList.toggle('right', k === r.answerIdx);
        el.classList.toggle('wrongPick', picks.includes(k) && k !== r.answerIdx);
      });
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) {
      return { detail: acc === 100 ? '조건에 꼭 맞는<br>분을 찾으셨어요' : '초록 테두리<br>분이 맞아요',
        talk: acc === 100 ? '잘 찾으셨어요.' : `${condText(r.type, r.a, r.b)}은 초록 테두리 분이에요.` };
    },
    detail(r, picks) {
      const chosen = r.people[picks[0]];
      // 틀렸을 때 어느 조건을 놓쳤는지 보려고, 고른 분이 각 조건을 만족했는지도 남겨요
      return {
        template: r.type, condA: r.a.id, condB: r.b ? r.b.id : '', condition: condText(r.type, r.a, r.b), nPeople: r.people.length,
        people: r.people.map(p => p.name), answerName: r.people[r.answerIdx].name, chosenName: chosen.name, nearMissCount: r.near,
        chosenHasA: r.a.has(chosen), chosenHasB: r.b ? r.b.has(chosen) : '',
      };
    },
    answerKey(r) { return [r.people[r.answerIdx].name]; },
    _test: { buildRound, LEVELS, satisfies, condText },
  });
})();
