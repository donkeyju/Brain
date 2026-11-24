/* =========================================================
   장보기 목록 기억 (카테고리: 기억력)
   장보기 목록을 보고 외운 뒤, 가게 선반에서 목록에 있던 물건을 골라요.
   (치매 검사의 "낱말 기억하기"와 같은 능력을 생활 장면으로 연습해요)
   - pick    : 목록에 있던 물건을 모두 골라요
   - missing : 장바구니에 담긴 물건을 보고, 목록에서 빠진 하나를 골라요 (3단계부터)
   보기 단계가 있어서 "다시 보기"(답하기 전)와 "천천히 다시 보기"(답한 뒤)를 쓸 수 있어요.
   ========================================================= */
(function () {
  const { FRUITS, fruitSVG } = window.FruitArt;
  /* 난이도 표
     list: 외울 물건 수   shelf: 선반에 놓인 물건 수   itemMs: 물건 하나를 보여주는 시간
     similar: 목록 물건과 비슷해 보이는 물건을 선반에 먼저 놓을지 */
  const LEVELS = {
    1: { types: ['pick'],            list: 3, shelf: 6,  itemMs: 2200, similar: false },
    2: { types: ['pick'],            list: 4, shelf: 8,  itemMs: 2000, similar: false },
    3: { types: ['pick', 'missing'], list: 4, shelf: 9,  itemMs: 1800, similar: true },
    4: { types: ['pick', 'missing'], list: 5, shelf: 10, itemMs: 1700, similar: true },
    5: { types: ['pick', 'missing'], list: 6, shelf: 12, itemMs: 1600, similar: true },
  };
  const TYPE_NAME = { pick: '목록 물건 고르기', missing: '빠진 물건 찾기' };

  /* ---------- 물건 그림 (과일 8가지 + 장보기 물건 10가지) ---------- */
  const GOODS = {
    milk:   { name: '우유', look: 'white',  svg: '<path d="M18 22 L30 10 L42 22 V54 H18 Z" fill="#FFFFFF" stroke="#9AA7B4" stroke-width="2.5"/><path d="M18 22 H42" stroke="#9AA7B4" stroke-width="2"/><rect x="18" y="30" width="24" height="12" fill="#6FA3D8"/><path d="M30 10 V22" stroke="#9AA7B4" stroke-width="2"/>' },
    bread:  { name: '빵', look: 'brown',    svg: '<path d="M8 36 Q8 18 30 18 Q52 18 52 36 V48 Q52 52 48 52 H12 Q8 52 8 48 Z" fill="#D9A15E"/><path d="M12 30 Q12 22 30 22 Q48 22 48 30" fill="none" stroke="#F0C98E" stroke-width="4" stroke-linecap="round"/><path d="M20 26 L24 34 M30 25 L32 34 M40 26 L38 34" stroke="#B9813F" stroke-width="2.5" stroke-linecap="round"/>' },
    egg:    { name: '달걀', look: 'white',  svg: '<rect x="6" y="38" width="48" height="14" rx="4" fill="#C9B79A"/><ellipse cx="17" cy="34" rx="8" ry="11" fill="#FFF7EA" stroke="#D8C8AE" stroke-width="1.5"/><ellipse cx="30" cy="32" rx="8" ry="11" fill="#FFF7EA" stroke="#D8C8AE" stroke-width="1.5"/><ellipse cx="43" cy="34" rx="8" ry="11" fill="#FFF7EA" stroke="#D8C8AE" stroke-width="1.5"/>' },
    tofu:   { name: '두부', look: 'white',  svg: '<path d="M10 24 L22 16 H50 L50 42 L38 50 H10 Z" fill="#FBF8EF" stroke="#C9C2B2" stroke-width="2"/><path d="M10 24 H38 V50 M38 24 L50 16" fill="none" stroke="#C9C2B2" stroke-width="2"/>' },
    fish:   { name: '생선', look: 'blue',   svg: '<path d="M8 30 Q22 14 40 22 L52 14 V46 L40 38 Q22 46 8 30 Z" fill="#8FB3CF"/><path d="M8 30 Q22 22 40 26" stroke="#B9D2E4" stroke-width="3" fill="none"/><circle cx="17" cy="28" r="2.6" fill="#2B2520"/><path d="M26 22 Q30 30 26 38" stroke="#6E93B1" stroke-width="2" fill="none"/>' },
    carrot: { name: '당근', look: 'orange', svg: '<path d="M22 20 L38 20 L31 56 Q30 58 29 56 Z" fill="#EE8A3C"/><path d="M25 30 H31 M27 40 H32 M28 48 H31" stroke="#C96A23" stroke-width="2" stroke-linecap="round"/><path d="M30 20 Q24 8 20 6 M30 20 Q30 6 32 4 M30 20 Q36 8 42 8" stroke="#5E9B55" stroke-width="3.5" fill="none" stroke-linecap="round"/>' },
    cabbage:{ name: '배추', look: 'green',  svg: '<path d="M18 54 Q12 30 22 10 Q30 4 38 10 Q48 30 42 54 Z" fill="#9CCB7E"/><path d="M24 54 Q20 34 26 14 M36 54 Q40 34 34 14" stroke="#7DB25E" stroke-width="2.5" fill="none"/><path d="M22 54 Q24 40 30 34 Q36 40 38 54 Z" fill="#F4F1DA"/>' },
    onion:  { name: '양파', look: 'brown',  svg: '<path d="M30 14 Q48 26 46 42 Q44 54 30 54 Q16 54 14 42 Q12 26 30 14 Z" fill="#C98A5A"/><path d="M30 16 Q24 34 26 54 M30 16 Q36 34 34 54" stroke="#A86B3E" stroke-width="2" fill="none"/><path d="M30 14 Q28 6 32 2" stroke="#7DB25E" stroke-width="3" fill="none" stroke-linecap="round"/>' },
    potato: { name: '감자', look: 'brown',  svg: '<path d="M10 34 Q8 20 24 18 Q40 14 48 24 Q56 36 44 46 Q30 54 18 48 Q10 44 10 34 Z" fill="#C9A26E"/><circle cx="22" cy="30" r="2" fill="#9C7A49"/><circle cx="36" cy="26" r="2" fill="#9C7A49"/><circle cx="40" cy="40" r="2" fill="#9C7A49"/><circle cx="26" cy="42" r="2" fill="#9C7A49"/>' },
    corn:   { name: '옥수수', look: 'yellow', svg: '<ellipse cx="30" cy="30" rx="11" ry="22" fill="#F2CB4C"/><path d="M22 18 H38 M20 26 H40 M20 34 H40 M22 42 H38 M30 9 V51" stroke="#D9A92A" stroke-width="1.6"/><path d="M19 34 Q10 46 22 56 L28 48 Z M41 34 Q50 46 38 56 L32 48 Z" fill="#7DB25E"/>' },
  };
  const FRUIT_LOOK = { apple: 'red', peach: 'red', tangerine: 'orange', melon: 'yellow', banana: 'yellow', watermelon: 'green', grape: 'purple', pear: 'brown' };
  // 물건 목록: 과일은 FruitArt 그림, 나머지는 위의 그림
  const ITEMS = FRUITS.map(f => ({ id: f.id, name: f.name, look: FRUIT_LOOK[f.id] || f.id, fruit: f }))
    .concat(Object.keys(GOODS).map(id => ({ id, name: GOODS[id].name, look: GOODS[id].look })));
  const byId = id => ITEMS.find(it => it.id === id);
  const itemSVG = (id, size) => { const it = byId(id); return it.fruit ? fruitSVG(it.fruit, size) : `<svg viewBox="0 0 60 60" width="${size}" height="${size}" aria-hidden="true">${GOODS[id].svg}</svg>`; };
  const lastHasBatchim = s => hasBatchim(s[s.length - 1]);

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const type = pickType(rng, cfg.types, hist.typeHistory);
    // 바로 앞 판의 목록과는 겹치지 않게 골라요 (앞 판 기억이 섞이지 않게)
    const prev = new Set(hist.prevAnswers || []);
    const pool = shuffle(rng, ITEMS.map(it => it.id).filter(id => !prev.has(id)));
    const list = pool.slice(0, cfg.list);
    const rest = shuffle(rng, ITEMS.map(it => it.id).filter(id => !list.includes(id)));
    // 비슷해 보이는 물건(같은 색 무리)을 오답으로 먼저 놓아요
    const looks = new Set(list.map(id => byId(id).look));
    const others = cfg.similar ? rest.filter(id => looks.has(byId(id).look)).concat(rest.filter(id => !looks.has(byId(id).look))) : rest;
    const r = { seed, level, type, list, itemMs: cfg.itemMs };
    if (type === 'pick') {
      r.shelf = shuffle(rng, list.concat(others.slice(0, cfg.shelf - cfg.list)));
      r.answer = list.slice();
    } else {
      r.missing = list[Math.floor(rng() * list.length)];
      r.basket = shuffle(rng, list.filter(id => id !== r.missing));
      r.options = shuffle(rng, [r.missing].concat(others.slice(0, cfg.list >= 5 ? 4 : 3)));
      r.answerIdx = r.options.indexOf(r.missing);
      r.answer = [r.answerIdx];
    }
    return r;
  }

  /* ---------- 화면 ---------- */
  const U = { picked: [] };
  function memoHTML(r, shown) {
    return `<div class="gs-memo"><div class="gs-memo-head">장보기 목록</div><div class="gs-memo-list">${r.list.map((id, k) =>
      `<div class="gs-memo-item" style="opacity:${k < shown ? 1 : 0}">${itemSVG(id, 58)}<span>${byId(id).name}</span></div>`).join('')}</div></div>`;
  }
  function shelfHTML(ids, cls, action, oneRow) {
    const perRow = oneRow ? ids.length : Math.ceil(ids.length / 2), w = ids.length > 10 ? 80 : 88;
    const rows = oneRow ? [ids] : [ids.slice(0, perRow), ids.slice(perRow)];
    let k = 0;
    return `<div class="gs-shelf">${rows.map(row => `<div class="gs-row">${row.map(id => { const i = k++;
      return `<button type="button" class="gs-item ${cls}" ${action} data-value="${action.includes('pick') ? i : id}" style="width:${w}px" aria-label="${byId(id).name}">${itemSVG(id, w - 30)}<span>${byId(id).name}</span></button>`; }).join('')}</div><div class="gs-board"></div>`).join('')}</div>`;
  }
  function renderQuestion(r) {
    if (r.type === 'pick') { $('#arena').innerHTML = shelfHTML(r.shelf, 'pop', 'data-action="game" data-op="toggle"'); return; }
    $('#arena').innerHTML = `<div class="gs-basket"><span class="gs-basket-label">장바구니</span>${r.basket.map(id => `<span class="gs-bitem">${itemSVG(id, 44)}<b>${byId(id).name}</b></span>`).join('')}</div>
      <div class="gs-under">${shelfHTML(r.options, 'pop gs-one', 'data-action="pick"', true)}</div>`;
  }
  function markToggles() {
    $$('#arena .gs-item').forEach(el => el.classList.toggle('picked', U.picked.includes(el.dataset.value)));
    const c = $('#gs-count'); if (c) c.textContent = U.picked.length;
    const d = $('#gs-done'); if (d) d.disabled = !U.picked.length;
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  registerGame({
    id: 'shop', category: 'memory', name: '장보기 목록 기억', short: '장보기 목록을 외워서<br>가게에서 골라요', rounds: 5,
    thumb() {
      return `<div style="position:absolute;left:14px;top:10px;width:84px;height:84px;border-radius:8px;background:#FFFDF6;box-shadow:0 2px 0 #E4D8C2;padding:6px;box-sizing:border-box;font:700 12px 'Noto Sans KR';color:#8C6A4A">목록<div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px">${itemSVG('milk', 32)}${itemSVG('apple', 32)}${itemSVG('carrot', 32)}</div></div>
        <div style="position:absolute;left:112px;top:20px;display:flex;gap:4px">${itemSVG('bread', 44)}${itemSVG('fish', 44)}</div>`;
    },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:36px;right:0;top:4px;display:flex;justify-content:center;gap:4px">${itemSVG('milk', 40)}${itemSVG('apple', 40)}${itemSVG('carrot', 40)}</div>
          <div style="position:absolute;left:0;right:0;top:54px;text-align:center;font:700 16px 'Noto Sans KR'">우유, 사과, 당근</div>`, '장보기 목록을<br>외워요'],
        [`<div style="position:absolute;left:36px;right:0;top:10px;display:flex;justify-content:center;gap:4px;padding:4px;background:#F3EBDD;border-radius:10px">${itemSVG('bread', 34)}${itemSVG('apple', 34)}${itemSVG('fish', 34)}${itemSVG('milk', 34)}</div>`, '가게 선반에서<br>찾아요'],
        [`<div style="position:absolute;left:0;right:0;top:8px;display:flex;justify-content:center;gap:6px">${['milk', 'apple', 'carrot'].map(id => `<span style="display:inline-flex;padding:2px;border-radius:10px;border:3px solid #2E7D4F;background:#EEF6F0">${itemSVG(id, 34)}</span>`).join('')}</div>
          <div style="position:absolute;left:104px;top:46px">${ICON.finger}</div>`, '목록 물건을<br>모두 눌러요'],
      ];
    },
    ruleTalk: '장보기 목록을 잘 보고 외워 주세요. 목록이 사라지면 가게 선반에서 목록에 있던 물건을 모두 골라 주세요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '장보기 목록 기억을 시작해요', sub: `물건 ${cfg.list}개를 외워요.<br>소리 내어 따라 읽으면 더 잘 외워져요`,
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">${['pick', 'missing'].map(t => { const on = cfg.types.includes(t);
          return `<span class="chip ${on ? 'chip-teal' : ''}" style="height:40px;font-size:19px;${on ? '' : 'opacity:.45'}">${TYPE_NAME[t]}${on ? '' : ' (다음 단계)'}</span>`; }).join('')}</div>`,
        talk: '장보기 목록 기억을 시작해요. 소리 내어 따라 읽으면 더 잘 외워져요.' };
    },
    setup(r) { $('#arena').innerHTML = memoHTML(r, 0); },
    intro(r, roundNo) {
      return { title: roundNo === 1 ? '시작해요!' : '새 목록이에요', html: `<p>물건 ${r.list.length}개를<br>잘 외워 주세요</p>`, talk: `장보기 목록이 나와요. 물건 ${r.list.length}개를 잘 외워 주세요.`, wait: 1600 };
    },
    watchText() { return '목록을 소리 내어<br>읽어 보세요'; },
    resetForPlay(r) { $('#arena').innerHTML = memoHTML(r, 0); },
    play(r, slow, done) {
      // 물건이 하나씩 나타나고, 다 나온 뒤 잠깐 그대로 보여줘요. 이름도 읽어줘요.
      const step = 900 * slow, total = step * r.list.length + r.itemMs * r.list.length * slow * 0.6;
      let shown = 0;
      Sound.speak(r.list.map(id => byId(id).name).join(', '));
      Runner.run(total, t => {
        const n = Math.min(r.list.length, Math.floor(t / step) + 1);
        if (n !== shown) { shown = n; $$('#arena .gs-memo-item').forEach((el, k) => { el.style.opacity = k < n ? 1 : 0; }); }
      }, done);
    },
    beforeQuestion() { return 300; },
    question(r) {
      if (r.type === 'pick') return { chip: TYPE_NAME.pick, head: '목록에 있던<br>물건을 골라요', size: 28, sub: `고른 물건 <b id="gs-count" style="font-size:26px;color:#2E7D4F">0</b> / ${r.list.length}개`,
        buttons: `<button type="button" class="btn btn-primary" data-action="game" data-op="done" id="gs-done" disabled>${ICON.check} 다 골랐어요</button>`,
        talk: '목록에 있던 물건을 모두 골라 주세요.' };
      return { chip: TYPE_NAME.missing, head: '장바구니에<br>빠진 물건은?', size: 28, sub: '목록에 있었는데<br>안 담긴 것을 골라요', talk: '장바구니를 보세요. 목록에 있었는데 빠진 물건은 무엇일까요?' };
    },
    pickCount() { return 1; },
    enablePicking(r) { U.picked = []; renderQuestion(r); },
    markPicks() {},
    handle(op, v) {
      const r = G.round;
      if (r.type !== 'pick') return;
      if (op === 'toggle') {
        noteTap();
        const k = U.picked.indexOf(v);
        if (k >= 0) U.picked.splice(k, 1); else U.picked.push(v);
        markToggles();
      } else if (op === 'done' && U.picked.length) submitAnswer(U.picked.slice());
    },
    // 고르기: (맞게 고른 수 − 잘못 고른 수) ÷ 목록 수. 빠진 물건: 맞으면 100
    score(r, picks) {
      if (r.type === 'missing') return picks[0] === r.answerIdx ? 100 : 0;
      const hits = picks.filter(id => r.list.includes(id)).length, falses = picks.length - hits;
      return Math.round(100 * Math.max(0, hits - falses) / r.list.length);
    },
    reveal(r, picks) {
      if (r.type === 'missing') {
        $$('#arena .gs-item').forEach(el => { const k = Number(el.dataset.value); el.disabled = true; el.classList.remove('pop');
          el.classList.toggle('right', k === r.answerIdx); el.classList.toggle('wrongPick', picks.includes(k) && k !== r.answerIdx); });
        return;
      }
      if (!$('#arena .gs-item')) { renderQuestion(r); }
      $$('#arena .gs-item').forEach(el => {
        const id = el.dataset.value, inList = r.list.includes(id), chosen = picks.includes(id);
        el.disabled = true; el.classList.remove('pop', 'picked');
        el.classList.toggle('right', inList && chosen);
        el.classList.toggle('missed', inList && !chosen);       // 목록에 있었는데 안 고른 것: 주황 점선
        el.classList.toggle('wrongPick', !inList && chosen);
      });
    },
    revealAfterReview(r, picks) { renderQuestion(r); this.reveal(r, picks); },
    feedback(r, acc) {
      const names = r.list.map(id => byId(id).name).join(', ');
      if (r.type === 'missing') {
        const m = byId(r.missing).name;
        return { detail: acc === 100 ? '정확하게<br>기억하셨어요' : `빠진 것은<br>${m}${lastHasBatchim(m) ? '이에요' : '예요'}`, talk: `목록은 ${names}였어요. 장바구니에 ${m}${lastHasBatchim(m) ? '이' : '가'} 빠졌어요.` };
      }
      const picks = G.picks, hits = picks.filter(id => r.list.includes(id)).length;
      return { tone: acc === 100 ? 'good' : (hits ? 'half' : 'low'), detail: `${r.list.length}개 중 ${hits}개를<br>기억하셨어요`, talk: `목록은 ${names}였어요.` + (acc < 100 ? ' 주황 점선이 빠뜨린 물건이에요.' : '') };
    },
    detail(r, picks) {
      const base = { shopType: r.type, listN: r.list.length, list: r.list.map(id => byId(id).name), showMs: r.itemMs };
      if (r.type === 'missing') return Object.assign(base, { basket: r.basket.map(id => byId(id).name), options: r.options.map(id => byId(id).name), missing: byId(r.missing).name, chosen: byId(r.options[picks[0]]).name });
      const hits = picks.filter(id => r.list.includes(id));
      return Object.assign(base, { shelf: r.shelf.map(id => byId(id).name), picked: picks.map(id => byId(id).name), hits: hits.length, falses: picks.length - hits.length,
        misses: r.list.filter(id => !picks.includes(id)).map(id => byId(id).name), falseLooksLike: picks.filter(id => !r.list.includes(id) && r.list.some(l => byId(l).look === byId(id).look)).length });
    },
    answerKey(r) { return r.list.slice(); },
    _test: { buildRound, LEVELS, ITEMS },
  });
})();
