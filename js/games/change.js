/* =========================================================
   시장 거스름돈 (카테고리: 계산력)
   과일 가게에서 물건값을 셈해요.
   - total  : 모두 얼마예요? (물건값 더하기)
   - change : 거스름돈은 얼마예요? (낸 돈 - 물건값)
   - pay    : 딱 맞게 내기 (지폐·동전을 눌러 값만큼 내기)
   오답 보기에는 어르신이 자주 하는 실수(받아올림·받아내림을 빠뜨린 값)를 섞어요.
   지폐·동전 그림은 진짜 돈과 헷갈리지 않게 단순한 모양으로 그렸어요.
   ========================================================= */
(function () {
  const { FRUITS, fruitSVG } = window.FruitArt;
  /* 난이도 표
     unit: 값의 단위(1000원 → 500원 → 100원)   price: 물건 하나 값 범위   items: 물건 수
     paid: 내는 돈 후보   opts: 보기 수   palette: 딱 맞게 내기에서 쓸 수 있는 돈 */
  const LEVELS = {
    1: { types: ['total', 'change'],        unit: 1000, price: [1000, 5000], items: [2, 2], changeItems: 1, paid: [10000],               opts: 3, palette: [] },
    2: { types: ['total', 'change'],        unit: 500,  price: [1000, 6000], items: [2, 2], changeItems: 1, paid: [5000, 10000],         opts: 3, palette: [] },
    3: { types: ['total', 'change', 'pay'], unit: 500,  price: [1000, 6000], items: [2, 3], changeItems: 1, paid: [10000],               opts: 3, palette: [5000, 1000, 500] },
    4: { types: ['total', 'change', 'pay'], unit: 100,  price: [1200, 4800], items: [2, 2], changeItems: 1, paid: [10000],               opts: 4, palette: [5000, 1000, 500, 100] },
    5: { types: ['total', 'change', 'pay'], unit: 100,  price: [1200, 6800], items: [3, 3], changeItems: 2, paid: [10000, 20000, 50000], opts: 4, palette: [10000, 5000, 1000, 500, 100] },
  };
  const TYPE_NAME = { total: '모두 얼마', change: '거스름돈', pay: '딱 맞게 내기' };
  const won = n => n.toLocaleString('ko-KR') + '원';
  const COUNTER = { 50000: '장', 10000: '장', 5000: '장', 1000: '장', 500: '개', 100: '개' };

  /* 돈 그림 (진짜 돈 모양을 따라 하지 않은 단순한 그림) */
  const BILL = { 50000: ['#F3DD8C', '#C9A63A'], 10000: ['#BFE0B6', '#5E9B55'], 5000: ['#F6C7AE', '#C9734A'], 1000: ['#BCD3EE', '#5B83B8'] };
  function moneySVG(v, scale) {
    const s = scale || 1;
    if (BILL[v]) {
      const [bg, ed] = BILL[v], w = Math.round(112 * s), h = Math.round(54 * s);
      return `<svg viewBox="0 0 112 54" width="${w}" height="${h}" aria-hidden="true"><rect x="1.5" y="1.5" width="109" height="51" rx="7" fill="${bg}" stroke="${ed}" stroke-width="3"/><circle cx="24" cy="27" r="13" fill="${ed}" opacity="0.3"/><text x="66" y="35" text-anchor="middle" font-size="21" font-weight="900" font-family="'Noto Sans KR', sans-serif" fill="#2B2520">${v.toLocaleString('ko-KR')}</text></svg>`;
    }
    const d = Math.round((v >= 500 ? 58 : 48) * s);
    return `<svg viewBox="0 0 60 60" width="${d}" height="${d}" aria-hidden="true"><circle cx="30" cy="30" r="27" fill="${v >= 500 ? '#E3E7EB' : '#D9C6A5'}" stroke="${v >= 500 ? '#9AA3AD' : '#A88B5C'}" stroke-width="3"/><circle cx="30" cy="30" r="20" fill="none" stroke="${v >= 500 ? '#B9C1C9' : '#C2A97E'}" stroke-width="1.5"/><text x="30" y="37" text-anchor="middle" font-size="19" font-weight="900" font-family="'Noto Sans KR', sans-serif" fill="#3F464D">${v}</text></svg>`;
  }
  /* 적은 개수로 내는 방법 (큰 돈부터) */
  function fewestPieces(amount, palette) {
    const out = [];
    let left = amount;
    for (const v of palette.slice().sort((a, b) => b - a)) { while (left >= v) { out.push(v); left -= v; } }
    return left === 0 ? out : null;
  }
  const piecesText = list => {
    const cnt = {}; list.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; });
    return Object.keys(cnt).map(Number).sort((a, b) => b - a).map(v => `${won(v)} ${cnt[v]}${COUNTER[v]}`).join(', ');
  };
  /* 받아올림을 빠뜨린 덧셈 (자리마다 따로 더해서 10을 넘으면 버림) */
  function noCarrySum(list) {
    let res = 0, p = 1;
    const maxLen = Math.max(...list.map(n => String(n).length));
    for (let i = 0; i < maxLen; i++) { res += (list.reduce((a, n) => a + Math.floor(n / p) % 10, 0) % 10) * p; p *= 10; }
    return res;
  }
  function amountOptions(rng, correct, cfg, typical) {
    const u = cfg.unit;
    const cands = typical.concat([correct + 1000, correct - 1000, correct + u, correct - u, correct + 2 * u, correct - 2 * u, correct + 500, correct - 500, correct + 2000]);
    const out = [];
    for (const c of cands) {
      if (out.length >= cfg.opts - 1) break;
      if (c > 0 && c % 100 === 0 && c !== correct && !out.includes(c) && (u === 1000 ? c % 1000 === 0 : true)) out.push(c);
    }
    return shuffle(rng, [correct].concat(out));
  }

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const type = pickType(rng, cfg.types, hist.typeHistory);
    const price = () => randInt(rng, cfg.price[0] / cfg.unit, cfg.price[1] / cfg.unit) * cfg.unit;
    const pickFruits = n => shuffle(rng, range(FRUITS.length)).slice(0, n);
    const r = { seed, level, type };
    if (type === 'total') {
      const n = randInt(rng, cfg.items[0], cfg.items[1]);
      r.items = pickFruits(n).map(f => ({ f, price: price() }));
      r.correct = r.items.reduce((a, it) => a + it.price, 0);
      // 백 원 자리에서 받아올림을 빠뜨리면 천 원이 모자라게 나와요 (1,700 + 5,300 → 6,000)
      const hundreds = r.items.reduce((a, it) => a + it.price % 1000, 0);
      r.options = amountOptions(rng, r.correct, cfg, hundreds >= 1000 ? [r.correct - 1000] : []);
    } else if (type === 'change') {
      for (let t = 0; t < 50; t++) {
        r.items = pickFruits(cfg.changeItems).map(f => ({ f, price: price() }));
        r.total = r.items.reduce((a, it) => a + it.price, 0);
        const can = cfg.paid.filter(p => p > r.total);
        if (can.length) { r.paid = can[Math.floor(rng() * can.length)]; break; }
      }
      r.correct = r.paid - r.total;
      // 받아내림을 빠뜨리면 천 원이 더 많게 나오는 실수가 흔해요 (10,000 - 6,300 → 4,700)
      r.options = amountOptions(rng, r.correct, cfg, r.total % 1000 ? [r.correct + 1000] : []);
    } else {
      r.items = pickFruits(1).map(f => ({ f, price: price() }));
      r.correct = r.items[0].price;
      r.palette = cfg.palette;
      r.fewest = fewestPieces(r.correct, cfg.palette);
    }
    if (r.options) { r.answerIdx = r.options.indexOf(r.correct); r.answer = [r.answerIdx]; } else r.answer = [r.correct];
    return r;
  }

  /* ---------- 화면 ---------- */
  const U = { list: [] };
  const itemCard = it => `<div class="cg-item">${fruitSVG(FRUITS[it.f], 58)}<span class="cg-name">${FRUITS[it.f].name}</span><span class="cg-tag">${won(it.price)}</span></div>`;
  const awning = () => { let s = ''; for (let k = 0; k < 14; k++) s += `<rect x="${k * 40}" y="0" width="40" height="16" fill="${k % 2 ? '#D9694F' : '#FFF4E8'}"/>`; return `<svg width="560" height="16" viewBox="0 0 560 16" style="position:absolute;left:0;top:0;border-radius:22px 22px 0 0" aria-hidden="true">${s}</svg>`; };
  function shopHTML(r) {
    if (r.type === 'total') return `<div class="cg-row">${r.items.map(itemCard).join('<span class="cg-plus">+</span>')}</div>`;
    if (r.type === 'change') {
      const bills = fewestPieces(r.paid, [50000, 10000, 5000, 1000]);
      return `<div class="cg-row">${r.items.map(itemCard).join('<span class="cg-plus">+</span>')}
        <div class="cg-paid"><span class="cg-small">낸 돈</span><span class="cg-bills">${bills.map(v => moneySVG(v, 0.9)).join('')}</span><b>${won(r.paid)}</b></div></div>`;
    }
    return `<div class="cg-row">${itemCard(r.items[0])}<div class="cg-tray"><span class="cg-small">계산대에 낸 돈</span>
      <div class="cg-placed">${U.list.length ? U.list.map((v, k) => `<button type="button" class="cg-piece" data-action="game" data-op="remove" data-value="${k}" aria-label="${won(v)} 빼기">${moneySVG(v, 0.62)}</button>`).join('') : '<span class="cg-empty">아래 돈을 눌러 내 보세요</span>'}</div>
      <div class="cg-sum">지금 낸 돈 <b>${won(U.list.reduce((a, v) => a + v, 0))}</b></div></div></div>`;
  }
  function render(r, pop) {
    let bottom;
    if (r.type === 'pay') bottom = `<div class="cg-palette">${r.palette.map(v => `<button type="button" class="cg-money" data-action="game" data-op="add" data-value="${v}" aria-label="${won(v)}">${moneySVG(v, BILL[v] ? 0.9 : 1)}</button>`).join('')}</div>`;
    else bottom = `<div class="tr-opts ${r.options.length > 3 ? 'grid' : ''}">${r.options.map((o, k) => `<button type="button" class="tr-opt${pop ? ' pop' : ''}" data-action="pick" data-value="${k}" style="animation-delay:${k * 60}ms">${won(o)}</button>`).join('')}</div>`;
    $('#arena').innerHTML = `<div class="cg-card">${awning()}${shopHTML(r)}</div>${bottom}`;
    const done = $('#cg-done'); if (done) done.disabled = !U.list.length;
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  registerGame({
    id: 'change', category: 'calc', name: '시장 거스름돈', short: '과일 가게에서<br>물건값과 거스름돈을 셈해요', direct: true, rounds: 8,
    thumb() {
      return `<div style="position:absolute;left:14px;top:14px;display:flex;align-items:center;gap:8px">${fruitSVG(FRUITS[0], 44)}<span style="padding:2px 8px;border-radius:8px;background:#F6C945;font:900 16px 'Noto Sans KR'">2,500원</span></div>
        <div style="position:absolute;left:14px;bottom:10px;display:flex;align-items:center;gap:6px">${moneySVG(10000, 0.6)}${moneySVG(500, 0.6)}${moneySVG(100, 0.6)}</div>`;
    },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:40px;right:0;top:4px;display:flex;justify-content:center;align-items:center;gap:6px">${fruitSVG(FRUITS[0], 40)}<b style="font-size:22px">+</b>${fruitSVG(FRUITS[5], 40)}</div>
          <div style="position:absolute;left:0;right:0;top:56px;text-align:center;font:900 20px 'Noto Sans KR'">모두 얼마?</div>`, '물건값을<br>모두 더해요'],
        [`<div style="position:absolute;left:40px;right:0;top:8px;display:flex;justify-content:center">${moneySVG(10000, 0.8)}</div>
          <div style="position:absolute;left:0;right:0;top:60px;text-align:center;font:900 20px 'Noto Sans KR'">거스름돈은?</div>`, '낸 돈에서<br>물건값을 빼요'],
        [`<div style="position:absolute;left:0;right:0;top:12px;display:flex;justify-content:center;align-items:center;gap:6px">${moneySVG(1000, 0.6)}${moneySVG(1000, 0.6)}${moneySVG(500, 0.75)}</div>
          <div style="position:absolute;left:104px;top:50px">${ICON.finger}</div>`, '돈을 눌러<br>딱 맞게 내요'],
      ];
    },
    ruleTalk: '과일 가게에서 셈을 해요. 물건값을 모두 더하거나, 거스름돈을 구하거나, 지폐와 동전을 눌러 딱 맞게 돈을 내요. 천천히 하셔도 괜찮아요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '시장 거스름돈을 시작해요', sub: '과일 가게에서 셈을 해요.<br>시간 제한이 없으니 천천히 하셔도 괜찮아요',
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">${['total', 'change', 'pay'].map(t => { const on = cfg.types.includes(t);
          return `<span class="chip ${on ? 'chip-teal' : ''}" style="height:40px;font-size:19px;${on ? '' : 'opacity:.45'}">${TYPE_NAME[t]}${on ? '' : ' (다음 단계)'}</span>`; }).join('')}</div>`,
        talk: '시장 거스름돈을 시작해요. 천천히 하셔도 괜찮아요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      const names = r.items.map(it => `${FRUITS[it.f].name} ${won(it.price)}`).join(', ');
      if (r.type === 'total') return { chip: TYPE_NAME.total, head: '모두<br>얼마일까요?', size: 30, sub: '물건값을<br>더해 보세요', talk: `${names}. 모두 얼마일까요?` };
      if (r.type === 'change') return { chip: TYPE_NAME.change, head: '거스름돈은<br>얼마일까요?', size: 28, sub: '낸 돈에서<br>물건값을 빼요', talk: `${names}. ${won(r.paid)}을 냈어요. 거스름돈은 얼마일까요?` };
      return { chip: TYPE_NAME.pay, head: `${won(r.correct)}을<br>내 보세요`, size: 26, sub: '낸 돈을 누르면<br>다시 빠져요',
        buttons: `<button type="button" class="btn btn-primary" data-action="game" data-op="done" id="cg-done" disabled>${ICON.check} 다 냈어요</button>
          <button type="button" class="btn btn-line" data-action="game" data-op="clear" style="height:52px;font-size:20px">처음부터</button>`,
        talk: `${FRUITS[r.items[0].f].name}는 ${won(r.correct)}이에요. 아래 돈을 눌러서 딱 맞게 내 보세요.`.replace(/(.)는 /, (m, ch) => (hasBatchim(ch) ? ch + '은 ' : m)) };
    },
    pickCount() { return 1; },
    enablePicking(r) { U.list = []; U.edits = 0; render(r, true); },
    markPicks() {},
    handle(op, v) {
      const r = G.round;
      if (op === 'add') { U.list.push(Number(v)); noteTap(); }
      else if (op === 'remove') { U.list.splice(Number(v), 1); U.edits++; }
      else if (op === 'clear') { if (U.list.length) U.edits++; U.list = []; }
      else if (op === 'done') { if (U.list.length) submitAnswer(U.list.slice()); return; }
      render(r, false);
    },
    score(r, picks) {
      if (r.type === 'pay') return picks.reduce((a, v) => a + v, 0) === r.correct ? 100 : 0;
      return picks[0] === r.answerIdx ? 100 : 0;
    },
    reveal(r, picks) {
      if (r.type === 'pay') {
        const sum = picks.reduce((a, v) => a + v, 0);
        $$('#arena .cg-piece, #arena .cg-money').forEach(el => { el.disabled = true; });
        const tray = $('#arena .cg-sum');
        if (tray) tray.innerHTML = `지금 낸 돈 <b style="color:${sum === r.correct ? '#2E7D4F' : '#B8501A'}">${won(sum)}</b>`;
        $('#arena').insertAdjacentHTML('beforeend', `<div class="pv-mean cg-how"><b>이렇게 내면 딱 맞아요</b> ${piecesText(r.fewest)}</div>`);
        const pal = $('#arena .cg-palette'); if (pal) pal.style.visibility = 'hidden';
        return;
      }
      $$('#arena .tr-opt').forEach(el => {
        const k = Number(el.dataset.value);
        el.disabled = true; el.classList.remove('pop');
        el.classList.toggle('right', k === r.answerIdx);
        el.classList.toggle('wrongPick', picks.includes(k) && k !== r.answerIdx);
      });
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) {
      if (r.type === 'pay') {
        return { detail: acc === 100 ? '딱 맞게<br>내셨어요' : `${won(r.correct)}을<br>내야 해요`, talk: `${won(r.correct)}은 ${piecesText(r.fewest)}로 낼 수 있어요.` };
      }
      const how = r.type === 'total' ? `${r.items.map(it => won(it.price)).join(' 더하기 ')}은 ${won(r.correct)}이에요.` : `${won(r.paid)}에서 ${won(r.total)}을 빼면 ${won(r.correct)}이에요.`;
      return { detail: acc === 100 ? '정확하게<br>계산하셨어요' : `정답은<br>${won(r.correct)}이에요`, talk: how };
    },
    detail(r, picks) {
      const base = { calcType: r.type, items: r.items.map(it => FRUITS[it.f].name + ':' + it.price), correct: r.correct };
      if (r.type === 'pay') {
        const sum = picks.reduce((a, v) => a + v, 0);
        return Object.assign(base, { paidPieces: picks, paidSum: sum, diff: sum - r.correct, pieces: picks.length, fewestPieces: r.fewest.length, edits: U.edits || 0 });
      }
      return Object.assign(base, { paid: r.paid || '', options: r.options, chosen: r.options[picks[0]], diff: r.options[picks[0]] - r.correct });
    },
    answerKey(r) { return [r.type]; },
    _test: { buildRound, LEVELS, noCarrySum, fewestPieces },
  });
})();
