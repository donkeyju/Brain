/* =========================================================
   같은 모양 찾기 (카테고리: 공간지각)
   네모 블록으로 만든 모양을 보고, 보기에서 똑같은 모양을 골라요.
   - same   : 돌리지 않은 그대로의 모양 (1~2단계는 이것만)
   - turn   : 보기를 돌려 놓았어요. 돌려 보면 같은 모양을 골라요 (3단계부터)
   - mirror : 돌린 모양 + 거울처럼 뒤집힌 오답이 섞여요 (5단계만)
   오답은 "블록 하나만 자리가 다른 모양"이라 잘 살펴봐야 해요.
   모양은 칸(행, 열)의 목록으로 저장해요. 예) [[0,0],[0,1],[1,1]] = ㄱ자 비슷한 모양
   ========================================================= */
(function () {
  /* 난이도 표
     n: 판 크기(n×n 칸)   cells: 블록 수 범위   opts: 보기 수   angles: 돌리는 각도(시계 방향) */
  const LEVELS = {
    1: { types: ['same'],            n: 3, cells: [3, 4], opts: 3, angles: [] },
    2: { types: ['same'],            n: 3, cells: [4, 5], opts: 3, angles: [] },
    3: { types: ['same', 'turn'],    n: 3, cells: [4, 5], opts: 3, angles: [90, 270] },
    4: { types: ['same', 'turn'],    n: 4, cells: [5, 6], opts: 4, angles: [90, 180, 270] },
    5: { types: ['turn', 'mirror'],  n: 4, cells: [5, 6], opts: 4, angles: [90, 180, 270] },
  };
  const TYPE_NAME = { same: '똑같은 모양', turn: '돌린 모양', mirror: '돌린 모양' };
  const COLORS = [['#E07A5F', '#B85A42'], ['#5B9BD5', '#3E73A6'], ['#6FAE8A', '#4C8565'], ['#E9AE3C', '#B98318'], ['#9C7BC0', '#76579A']];

  /* ---------- 모양 다루기 도구 ---------- */
  const key = cells => cells.map(([r, c]) => r + ',' + c).sort().join(' ');
  const has = (cells, r, c) => cells.some(([a, b]) => a === r && b === c);
  // 시계 방향 90도 돌리기: (행, 열) → (열, n-1-행)
  const rot90 = (cells, n) => cells.map(([r, c]) => [c, n - 1 - r]);
  const rotate = (cells, n, deg) => { let out = cells; for (let k = 0; k < (deg / 90) % 4; k++) out = rot90(out, n); return out; };
  const mirror = (cells, n) => cells.map(([r, c]) => [r, n - 1 - c]);
  // 왼쪽 위로 붙여서 비교 (자리만 옮긴 모양은 같은 모양)
  const norm = cells => { const mr = Math.min(...cells.map(x => x[0])), mc = Math.min(...cells.map(x => x[1])); return key(cells.map(([r, c]) => [r - mr, c - mc])); };
  // 돌려서 같아지면 같은 모양으로 봐요
  const canon = cells => [0, 90, 180, 270].map(d => norm(rotate(cells, 8, d))).sort()[0];
  const connected = cells => {
    if (!cells.length) return false;
    const seen = new Set([key([cells[0]])]), stack = [cells[0]];
    while (stack.length) {
      const [r, c] = stack.pop();
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = (r + dr) + ',' + (c + dc);
        if (has(cells, r + dr, c + dc) && !seen.has(k)) { seen.add(k); stack.push([r + dr, c + dc]); }
      }
    }
    return seen.size === cells.length;
  };
  // 이웃한 칸을 하나씩 붙여 가며 모양을 만들어요
  function growShape(rng, n, count) {
    const cells = [[randInt(rng, 0, n - 1), randInt(rng, 0, n - 1)]];
    while (cells.length < count) {
      const cand = [];
      cells.forEach(([r, c]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const a = r + dr, b = c + dc;
        if (a >= 0 && b >= 0 && a < n && b < n && !has(cells, a, b) && !has(cand, a, b)) cand.push([a, b]);
      }));
      cells.push(cand[Math.floor(rng() * cand.length)]);
    }
    return cells;
  }
  // 블록 하나만 다른 자리로 옮긴 모양 (나머지는 그대로)
  function moveOne(rng, cells, n) {
    for (let t = 0; t < 40; t++) {
      const i = Math.floor(rng() * cells.length), rest = cells.filter((_, k) => k !== i);
      if (!connected(rest)) continue;
      const cand = [];
      rest.forEach(([r, c]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const a = r + dr, b = c + dc;
        if (a >= 0 && b >= 0 && a < n && b < n && !has(rest, a, b) && !(a === cells[i][0] && b === cells[i][1])) cand.push([a, b]);
      }));
      if (cand.length) return rest.concat([cand[Math.floor(rng() * cand.length)]]);
    }
    return null;
  }

  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const type = pickType(rng, cfg.types, hist.typeHistory);
    for (let attempt = 0; attempt < 300; attempt++) {
      const target = growShape(rng, cfg.n, randInt(rng, cfg.cells[0], cfg.cells[1]));
      const tc = canon(target);
      // 한 줄로 쭉 늘어선 모양은 너무 쉬워서 빼요
      if (new Set(target.map(x => x[0])).size === 1 || new Set(target.map(x => x[1])).size === 1) continue;
      // 돌리는 문제는 돌려도 똑같아 보이는 모양(대칭)을 빼요
      if (type !== 'same' && [90, 180, 270].some(d => norm(rotate(target, cfg.n, d)) === norm(target))) continue;
      const mir = mirror(target, cfg.n);
      if (type === 'mirror' && canon(mir) === tc) continue;          // 뒤집어도 같은 모양이면 거울 오답이 안 돼요
      const angle = type === 'same' ? 0 : cfg.angles[Math.floor(rng() * cfg.angles.length)];
      const turnAny = () => (type === 'same' ? 0 : [0, 90, 180, 270][Math.floor(rng() * 4)]);
      const opts = [{ kind: 'correct', base: target, angle }];
      const used = new Set([tc]);
      if (type === 'mirror') { opts.push({ kind: 'mirror', base: mir, angle: turnAny() }); used.add(canon(mir)); }
      for (let t = 0; t < 60 && opts.length < cfg.opts; t++) {
        const m = moveOne(rng, target, cfg.n);
        if (!m) continue;
        const mc = canon(m);
        if (used.has(mc) || (type === 'mirror' && canon(mirror(m, cfg.n)) === tc)) continue;
        used.add(mc); opts.push({ kind: 'moved', base: m, angle: turnAny() });
      }
      if (opts.length < cfg.opts) continue;
      const options = shuffle(rng, opts).map(o => ({ kind: o.kind, angle: o.angle, cells: rotate(o.base, cfg.n, o.angle) }));
      const answerIdx = options.findIndex(o => o.kind === 'correct');
      return { seed, level, type, n: cfg.n, target, angle, options, answerIdx, answer: [answerIdx], color: Math.floor(rng() * COLORS.length) };
    }
    throw new Error('모양 문제를 만들지 못했어요');
  }

  /* ---------- 화면 ---------- */
  // 판(n×n)에 블록을 칠해서 그려요. 빈 칸은 옅은 네모로 보여서 자리를 비교하기 쉬워요.
  function shapeSVG(cells, n, size, color) {
    const [fill, edge] = COLORS[color];
    let s = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const on = has(cells, r, c);
      s += `<rect x="${c * 10 + 0.6}" y="${r * 10 + 0.6}" width="8.8" height="8.8" rx="1.6" fill="${on ? fill : '#F3EBDD'}" ${on ? `stroke="${edge}" stroke-width="0.9"` : ''}/>`;
      if (on) s += `<rect x="${c * 10 + 2}" y="${r * 10 + 2}" width="3.2" height="1.6" rx="0.8" fill="#FFFFFF" opacity="0.45"/>`;
    }
    return `<svg class="sh-svg" viewBox="-0.5 -0.5 ${n * 10 + 1} ${n * 10 + 1}" width="${size}" height="${size}" aria-hidden="true">${s}</svg>`;
  }
  function render(r) {
    const w = r.options.length > 3 ? 118 : 128;
    $('#arena').innerHTML = `<div class="sh-card"><span class="sh-label">이 모양</span>${shapeSVG(r.target, r.n, 172, r.color)}
        ${r.type !== 'same' ? `<span class="sh-turn">보기는 돌려 놓았어요</span>` : ''}</div>
      <div class="wd-opts">${r.options.map((o, k) => `<button type="button" class="wd-opt sh-opt pop" data-action="pick" data-value="${k}" aria-label="보기 ${k + 1}" style="width:${w}px;height:${w}px;animation-delay:${k * 60}ms">${shapeSVG(o.cells, r.n, w - 18, r.color)}</button>`).join('')}</div>`;
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  const DEMO = [[0, 0], [1, 0], [1, 1], [2, 1]];
  registerGame({
    id: 'shape', category: 'space', name: '같은 모양 찾기', short: '블록 모양을 보고<br>똑같은 모양을 골라요', direct: true, rounds: 10,
    thumb() {
      return `<div style="position:absolute;left:14px;top:14px;display:flex;align-items:center;gap:12px">${shapeSVG(DEMO, 3, 72, 1)}
        <span style="font:900 26px 'Noto Sans KR';color:#5C5148">=</span>${shapeSVG(rotate(DEMO, 3, 90), 3, 56, 1)}</div>`;
    },
    ruleCards() {
      return [
        [`<div style="position:absolute;left:0;right:0;top:2px;display:flex;justify-content:center">${shapeSVG(DEMO, 3, 84, 1)}</div>`, '블록 모양을<br>잘 봐요'],
        [`<div style="position:absolute;left:40px;right:0;top:12px;display:flex;justify-content:center;gap:8px">${shapeSVG(DEMO, 3, 54, 1)}${shapeSVG(moveOne(mulberry32(7), DEMO, 3), 3, 54, 1)}</div>`, '블록 하나 자리가<br>다른 것도 있어요'],
        [`<div style="position:absolute;left:0;right:0;top:6px;display:flex;justify-content:center"><span style="display:inline-flex;padding:4px;border-radius:12px;border:3px solid #2E7D4F;background:#EEF6F0">${shapeSVG(DEMO, 3, 62, 1)}</span></div>
          <div style="position:absolute;left:104px;top:50px">${ICON.finger}</div>`, '똑같은 모양을<br>눌러요'],
      ];
    },
    ruleTalk: '블록으로 만든 모양을 잘 보세요. 아래 보기에서 똑같은 모양을 골라 주세요. 블록 하나만 자리가 다른 모양도 있으니 잘 살펴보세요. 단계가 오르면 보기를 돌려 놓기도 해요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return { chip: `문제 ${roundsOf(this)}개`, title: '같은 모양 찾기를 시작해요', sub: '블록 모양을 보고 똑같은 것을 골라요.<br>시간 제한이 없으니 천천히 하셔도 괜찮아요',
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">${[['same', '똑같은 모양'], ['turn', '돌린 모양'], ['mirror', '뒤집힌 모양 섞임']].map(([t, nm]) => { const on = cfg.types.includes(t);
          return `<span class="chip ${on ? 'chip-teal' : ''}" style="height:40px;font-size:19px;${on ? '' : 'opacity:.45'}">${nm}${on ? '' : ' (다음 단계)'}</span>`; }).join('')}</div>`,
        talk: '같은 모양 찾기를 시작해요. 천천히 하셔도 괜찮아요.' };
    },
    setup() { $('#arena').innerHTML = ''; },
    intro() { return { title: '', html: '', talk: '', wait: 0 }; },
    watchText() { return ''; },
    resetForPlay() {},
    play(r, slow, done) { done(); },
    beforeQuestion() { return 0; },
    question(r) {
      if (r.type === 'same') return { chip: TYPE_NAME.same, head: '똑같은 모양을<br>찾아 보세요', size: 28, sub: '블록 하나하나<br>자리를 살펴요', talk: '위의 모양과 똑같은 것을 골라 주세요.' };
      return { chip: TYPE_NAME.turn, head: '돌려 보면 같은<br>모양은?', size: 28, sub: r.type === 'mirror' ? '뒤집힌 모양은<br>달라요' : '머릿속으로<br>돌려 보세요',
        talk: '보기를 돌려 놓았어요. 돌려 보면 위의 모양과 똑같은 것을 골라 주세요.' };
    },
    pickCount() { return 1; },
    enablePicking(r) { render(r); },
    markPicks() {},
    score(r, picks) { r.lastKind = r.options[picks[0]].kind; return picks[0] === r.answerIdx ? 100 : 0; },   // 고른 보기 종류는 설명할 때 써요
    reveal(r, picks) {
      $$('#arena .wd-opt').forEach(el => {
        const k = Number(el.dataset.value);
        el.disabled = true; el.classList.remove('pop');
        el.classList.toggle('right', k === r.answerIdx);
        el.classList.toggle('wrongPick', picks.includes(k) && k !== r.answerIdx);
      });
      // 돌린 문제는 정답 보기를 원래 방향으로 천천히 돌려서 보여줘요
      if (r.angle) {
        const svg = $(`#arena .wd-opt[data-value="${r.answerIdx}"] .sh-svg`);
        const back = r.angle === 270 ? 90 : -r.angle;
        later(() => { if (svg) svg.style.transform = `rotate(${back}deg)`; }, 350);
      }
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) {
      const kind = r.lastKind;
      const why = kind === 'mirror' ? ' 고르신 모양은 거울에 비친 것처럼 뒤집힌 모양이에요.' : (kind === 'moved' ? ' 고르신 모양은 블록 하나의 자리가 달라요.' : '');
      if (acc === 100) return { detail: '같은 모양을<br>찾으셨어요', talk: r.angle ? '맞아요. 돌려 보면 똑같은 모양이에요.' : '맞아요. 똑같은 모양이에요.' };
      return { detail: '초록색이<br>같은 모양이에요', talk: (r.angle ? '초록색 모양을 돌려 보면 위의 모양과 똑같아요.' : '초록색 모양이 위의 모양과 똑같아요.') + why };
    },
    detail(r, picks) {
      const o = r.options[picks[0]];
      return { shapeType: r.type, gridN: r.n, blocks: r.target.length, target: key(r.target), angle: r.angle,
        options: r.options.map(x => x.kind + '@' + x.angle), chosenKind: o.kind, chosenAngle: o.angle };
    },
    answerKey(r) { return [r.type]; },
    _test: { buildRound, LEVELS, canon, rotate, mirror, norm, key },
  });
})();
