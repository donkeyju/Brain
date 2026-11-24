/* =========================================================
   길찾기 (카테고리: 공간지각)
   바둑판 모양 동네 지도 위에서 세 가지 형식으로 놀아요.
   - go         : 찾아가기. 목적지까지 직접 가요 (공사 중인 길은 돌아가요)
   - directions : 길 안내 듣기. "오른쪽 2칸, 위로 1칸" 가면 어디에 도착할지 골라요
   - memory     : 보고 따라가기. 할머니가 걸어간 길을 기억했다가 똑같이 가요
   움직일 때는 할머니 옆에 나타나는 동그라미를 눌러 한 칸씩 가요.
   ========================================================= */
(function () {
  /* 난이도 표
     grid: 갈림길 수 [가로, 세로]   blocks: 공사 중인 길 수   minDist: 찾아가기 최소 거리(칸)
     dirSteps: 길 안내 단계 수   run: 한 번에 가는 칸 수 최대   marks: 지도에 나오는 장소 수(우리 집 포함)
     memLen: 보고 따라가기 길이(칸) */
  const LEVELS = {
    1: { grid: [4, 3], types: ['go', 'directions'],           blocks: 0, minDist: 3, dirSteps: [2, 2], run: 2, marks: 4, memLen: [0, 0] },
    2: { grid: [5, 3], types: ['go', 'directions'],           blocks: 1, minDist: 3, dirSteps: [2, 3], run: 2, marks: 5, memLen: [0, 0] },
    3: { grid: [5, 4], types: ['go', 'directions', 'memory'], blocks: 2, minDist: 4, dirSteps: [3, 3], run: 2, marks: 6, memLen: [4, 5] },
    4: { grid: [6, 4], types: ['go', 'directions', 'memory'], blocks: 3, minDist: 5, dirSteps: [3, 4], run: 3, marks: 6, memLen: [5, 6] },
    5: { grid: [6, 4], types: ['go', 'directions', 'memory'], blocks: 4, minDist: 6, dirSteps: [4, 4], run: 3, marks: 7, memLen: [6, 8] },
  };
  const TYPE_NAME = { go: '찾아가기', directions: '길 안내 듣기', memory: '보고 따라가기' };

  /* 동네 장소 (아이콘은 40x40 그림) */
  const PLACES = [
    { id: 'home', name: '우리 집', icon: '<path d="M6 19 L20 7 L34 19 Z" fill="#D8433B"/><rect x="10" y="19" width="20" height="15" fill="#F6E7C8"/><rect x="17" y="24" width="6" height="10" fill="#8A5A2B"/>' },
    { id: 'senior', name: '경로당', icon: '<path d="M5 18 L20 8 L35 18 Z" fill="#3E7C74"/><rect x="9" y="18" width="22" height="16" fill="#F6E7C8"/><path d="M20 31 l-5-5 a3 3 0 0 1 5-3.6 a3 3 0 0 1 5 3.6 z" fill="#D8433B"/>' },
    { id: 'market', name: '시장', icon: '<rect x="6" y="15" width="28" height="19" fill="#F6E7C8"/><path d="M4 9 h32 v6 a4 4 0 0 1-8 0 a4 4 0 0 1-8 0 a4 4 0 0 1-8 0 a4 4 0 0 1-8 0 z" fill="#D9694F"/><circle cx="14" cy="28" r="4" fill="#D8433B"/><circle cx="22" cy="28" r="4" fill="#F6C83A"/><circle cx="29" cy="29" r="3" fill="#5BA04A"/>' },
    { id: 'pharmacy', name: '약국', icon: '<rect x="7" y="8" width="26" height="26" rx="4" fill="#FFFFFF" stroke="#2E7D4F" stroke-width="2.5"/><path d="M17 13h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="#2E7D4F"/>' },
    { id: 'post', name: '우체국', icon: '<rect x="6" y="11" width="28" height="20" rx="3" fill="#E2A23B"/><path d="M6 12 L20 23 L34 12" stroke="#FFFFFF" stroke-width="2.5" fill="none"/>' },
    { id: 'school', name: '학교', icon: '<rect x="8" y="16" width="24" height="18" fill="#F6E7C8"/><path d="M5 16 L20 9 L35 16 Z" fill="#5B4A8B"/><circle cx="20" cy="23" r="3.6" fill="#FFFFFF" stroke="#5B4A8B" stroke-width="1.6"/><rect x="17" y="28" width="6" height="6" fill="#8A5A2B"/><path d="M20 9 V3" stroke="#5B4A8B" stroke-width="1.5"/><path d="M20 3 h7 v4 h-7 z" fill="#D8433B"/>' },
    { id: 'park', name: '공원', icon: '<circle cx="14" cy="17" r="8" fill="#4E8A47"/><rect x="12.5" y="23" width="3" height="11" fill="#7A5230"/><circle cx="27" cy="14" r="9" fill="#5BA04A"/><rect x="25.5" y="21" width="3" height="13" fill="#7A5230"/>' },
    { id: 'bank', name: '은행', icon: '<path d="M5 15 L20 7 L35 15 Z" fill="#6E7F99"/><rect x="7" y="15" width="26" height="3" fill="#6E7F99"/><rect x="9" y="19" width="3" height="11" fill="#9AA8BD"/><rect x="18.5" y="19" width="3" height="11" fill="#9AA8BD"/><rect x="28" y="19" width="3" height="11" fill="#9AA8BD"/><rect x="6" y="30" width="28" height="4" fill="#6E7F99"/>' },
    { id: 'hospital', name: '병원', icon: '<rect x="8" y="6" width="24" height="28" rx="2" fill="#FFFFFF" stroke="#C8453C" stroke-width="2.5"/><path d="M17.5 11h5v5h5v5h-5v5h-5v-5h-5v-5h5z" fill="#C8453C"/>' },
    { id: 'bath', name: '목욕탕', icon: '<rect x="8" y="16" width="24" height="18" fill="#F6E7C8"/><path d="M5 16 L20 9 L35 16 Z" fill="#7FB2D9"/><path d="M15 26 q-2.5-3 0-6 M20 26 q-2.5-3 0-6 M25 26 q-2.5-3 0-6" stroke="#C8453C" stroke-width="1.8" fill="none"/><path d="M12 28 h16 a8 4.5 0 0 1-16 0z" fill="#C8453C"/>' },
  ];
  const placeSVG = (p, s) => `<svg viewBox="0 0 40 40" width="${s}" height="${s}" aria-hidden="true">${p.icon}</svg>`;
  const WALKER = '<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#FFFFFF" stroke="#1F5F6B" stroke-width="3"/><circle cx="20" cy="22" r="10" fill="#F3CDA9"/><circle cx="13" cy="14" r="4.5" fill="#CFCAC3"/><circle cx="20" cy="11.5" r="5" fill="#CFCAC3"/><circle cx="27" cy="14" r="4.5" fill="#CFCAC3"/><circle cx="16.5" cy="22" r="1.4" fill="#3A2E26"/><circle cx="23.5" cy="22" r="1.4" fill="#3A2E26"/><path d="M17 26 q3 2.5 6 0" stroke="#3A2E26" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';

  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const DIR_WORD = { up: '위로', down: '아래로', left: '왼쪽으로', right: '오른쪽으로' };
  const DIR_SHORT = { up: '위로', down: '아래로', left: '왼쪽', right: '오른쪽' };
  const NUM_WORD = ['', '한', '두', '세', '네'];
  const ARROW = {
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    left: '<path d="M19 12H5M11 6l-6 6 6 6"/>', right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };
  const arrowSVG = (d, s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ARROW[d]}</svg>`;

  /* ---------- 지도 계산 도구 ---------- */
  const edgeKey = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  function makeGrid(C, R) {
    const col = n => n % C, row = n => Math.floor(n / C);
    const step = (n, d) => { const c = col(n) + DIRS[d][0], r = row(n) + DIRS[d][1]; return c >= 0 && c < C && r >= 0 && r < R ? r * C + c : -1; };
    const neighbors = n => Object.keys(DIRS).map(d => step(n, d)).filter(x => x >= 0);
    const manhattan = (a, b) => Math.abs(col(a) - col(b)) + Math.abs(row(a) - row(b));
    function bfs(s, blocked) {
      const dist = Array(C * R).fill(-1), prev = Array(C * R).fill(-1), q = [s];
      dist[s] = 0;
      while (q.length) {
        const n = q.shift();
        for (const m of neighbors(n)) if (dist[m] < 0 && !blocked.has(edgeKey(n, m))) { dist[m] = dist[n] + 1; prev[m] = n; q.push(m); }
      }
      return { dist, prev };
    }
    const pathTo = (prev, t) => { const p = []; for (let n = t; n >= 0; n = prev[n]) p.unshift(n); return p; };
    return { C, R, N: C * R, col, row, step, neighbors, manhattan, bfs, pathTo };
  }
  /* 장소는 갈림길(node) 옆 블록 한 칸에 놓아요. 블록 하나에 장소 하나만. */
  function blocksAround(g, n) {
    const out = [];
    for (const [dc, dr] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
      const bc = g.col(n) + dc, br = g.row(n) + dr;
      if (bc >= 0 && bc < g.C - 1 && br >= 0 && br < g.R - 1) out.push(br * (g.C - 1) + bc);
    }
    return out;
  }
  function place(g, rng, n, usedBlocks) {
    const free = blocksAround(g, n).filter(b => !usedBlocks.has(b));
    if (!free.length) return null;
    const b = free[Math.floor(rng() * free.length)];
    usedBlocks.add(b);
    return b;
  }

  /* ---------- 한 판 만들기 ---------- */
  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed), cfg = LEVELS[level];
    const g = makeGrid(cfg.grid[0], cfg.grid[1]);
    const type = pickType(rng, cfg.types, hist.typeHistory);
    for (let attempt = 0; attempt < 400; attempt++) {
      const usedBlocks = new Set(), usedNodes = new Set(), marks = [];
      const others = shuffle(rng, PLACES.slice(1));
      const addMark = (p, n) => { const b = place(g, rng, n, usedBlocks); if (b === null) return false; marks.push({ place: p, node: n, block: b }); usedNodes.add(n); return true; };
      const start = randInt(rng, 0, g.N - 1);
      if (!addMark(PLACES[0], start)) continue;
      const blocked = new Set();
      const r = { seed, level, type, C: g.C, R: g.R, start };

      if (type === 'go') {
        const far = range(g.N).filter(n => g.manhattan(n, start) >= cfg.minDist);
        if (!far.length) continue;
        r.goal = far[Math.floor(rng() * far.length)];
        if (!addMark(others[0], r.goal)) continue;
        for (let k = 0, t = 0; k < cfg.blocks && t < 60; t++) {       // 공사 중인 길: 지름길 위에 주로 놓아요
          const sp = g.pathTo(g.bfs(start, blocked).prev, r.goal);
          let a, b;
          if (rng() < 0.7 && sp.length > 1) { const i = randInt(rng, 0, sp.length - 2); a = sp[i]; b = sp[i + 1]; }
          else { a = randInt(rng, 0, g.N - 1); const nb = g.neighbors(a); b = nb[Math.floor(rng() * nb.length)]; }
          const key = edgeKey(a, b);
          if (blocked.has(key)) continue;
          blocked.add(key);
          if (g.bfs(start, blocked).dist[r.goal] < 0) { blocked.delete(key); continue; }   // 꼭 갈 수 있게
          k++;
        }
        const res = g.bfs(start, blocked);
        r.shortest = res.dist[r.goal];
        r.answerPath = g.pathTo(res.prev, r.goal);
        r.targetIdx = 1;
      } else if (type === 'directions') {
        const nSteps = randInt(rng, cfg.dirSteps[0], cfg.dirSteps[1]);
        let n = start, prevDir = null, ok = true;
        const steps = [], path = [start];
        for (let s = 0; s < nSteps && ok; s++) {
          const opts = [];
          for (const d of Object.keys(DIRS)) {
            if (d === prevDir || d === OPPOSITE[prevDir]) continue;
            for (let k = 1; k <= cfg.run; k++) {
              let m = n, good = true; const seg = [];
              for (let j = 0; j < k; j++) { m = g.step(m, d); if (m < 0 || path.includes(m) || seg.includes(m)) { good = false; break; } seg.push(m); }
              if (good) opts.push({ d, k, seg });
            }
          }
          if (!opts.length) { ok = false; break; }
          const o = opts[Math.floor(rng() * opts.length)];
          steps.push({ dir: o.d, n: o.k }); path.push(...o.seg); n = o.seg[o.seg.length - 1]; prevDir = o.d;
        }
        if (!ok) continue;
        r.goal = n; r.steps = steps; r.answerPath = path;
        if (!addMark(others[0], r.goal)) continue;
        // 헷갈리기 쉬운 곳(마지막 칸 하나 더/덜, 마지막에 반대로 꺾은 곳)에 다른 장소를 먼저 놓아요
        const last = steps[steps.length - 1], beforeLast = path[path.length - 1 - last.n];
        const near = [g.step(r.goal, last.dir), last.n > 1 ? g.step(r.goal, OPPOSITE[last.dir]) : -1];
        let m = beforeLast; for (let j = 0; j < last.n && m >= 0; j++) m = g.step(m, OPPOSITE[last.dir]);
        near.push(m);
        let oi = 1;
        for (const x of shuffle(rng, near)) if (x >= 0 && !usedNodes.has(x) && marks.length < cfg.marks && addMark(others[oi], x)) oi++;
        r.targetIdx = 1;
      } else {                                                       // memory: 걸어갈 길 만들기 (두 번 이상 꺾기)
        const L = randInt(rng, cfg.memLen[0], cfg.memLen[1]);
        const path = [start]; let n = start, prevDir = null, turns = 0, ok = true;
        for (let s = 0; s < L; s++) {
          const ds = shuffle(rng, Object.keys(DIRS)).filter(d => d !== OPPOSITE[prevDir] && g.step(n, d) >= 0 && !path.includes(g.step(n, d)));
          if (!ds.length) { ok = false; break; }
          const d = ds[0];
          if (prevDir && d !== prevDir) turns++;
          prevDir = d; n = g.step(n, d); path.push(n);
        }
        if (!ok || turns < 2) continue;
        r.goal = n; r.answerPath = path;
        if (!addMark(others[0], r.goal)) continue;
        r.targetIdx = 1;
      }
      // 나머지 장소는 빈 곳에 놓아요
      let oi = marks.length;
      for (let t = 0; t < 80 && marks.length < cfg.marks; t++) {
        const n = randInt(rng, 0, g.N - 1);
        if (usedNodes.has(n)) continue;
        if (addMark(others[oi], n)) oi++;
      }
      if (marks.length < Math.min(cfg.marks, 3)) continue;
      r.marks = marks; r.blocked = [...blocked];
      if (type === 'directions') {
        r.options = shuffle(rng, range(marks.length).slice(1));        // 우리 집 빼고 모두 보기
        r.answerIdx = r.targetIdx; r.answer = [r.targetIdx];
      } else r.answer = r.answerPath;
      r.cap = type === 'go' ? r.shortest * 3 + 4 : r.answerPath.length - 1;
      return r;
    }
    throw new Error('길찾기 문제를 만들지 못했어요');
  }

  /* ---------- 지도 그리기 ---------- */
  const S = { round: null, g: null };
  const U = { path: [], undo: 0, done: false };
  const xy = (r, n) => ({ x: 40 + (n % r.C) * (480 / (r.C - 1)), y: 36 + Math.floor(n / r.C) * (268 / (r.R - 1)) });
  function markPos(r, m) {
    const p = xy(r, m.node), sx = 480 / (r.C - 1), sy = 268 / (r.R - 1);
    const bc = m.block % (r.C - 1), br = Math.floor(m.block / (r.C - 1));
    const qx = bc === m.node % r.C ? 1 : -1, qy = br === Math.floor(m.node / r.C) ? 1 : -1;
    return { x: p.x + qx * Math.min(0.34 * sx, 40), y: p.y + qy * Math.min(0.34 * sy, 36), qx, qy, nx: p.x, ny: p.y };
  }
  function renderMap(r, mode) {
    const g = makeGrid(r.C, r.R); S.g = g; S.round = r;
    const blocked = new Set(r.blocked);
    let roads = '', roadsTop = '', trees = '', bars = '';
    for (let n = 0; n < g.N; n++) {
      for (const m of g.neighbors(n)) {
        if (m < n) continue;
        const a = xy(r, n), b = xy(r, m);
        roads += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
        roadsTop += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
        if (blocked.has(edgeKey(n, m))) {                                    // 공사 중 표시
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, horiz = a.y === b.y;
          bars += `<g transform="translate(${mx} ${my})${horiz ? '' : ' rotate(90)'}"><rect x="-7" y="-20" width="14" height="40" rx="3" fill="#E8743B"/><rect x="-7" y="-10" width="14" height="6" fill="#FFFFFF"/><rect x="-7" y="4" width="14" height="6" fill="#FFFFFF"/></g>`;
        }
      }
    }
    const usedBlocks = new Set(r.marks.map(m => m.block));
    for (let b = 0; b < (r.C - 1) * (r.R - 1); b++) {                     // 빈 블록에는 나무
      if (usedBlocks.has(b)) continue;
      const a = xy(r, Math.floor(b / (r.C - 1)) * r.C + (b % (r.C - 1)));
      const cx = a.x + 240 / (r.C - 1), cy = a.y + 134 / (r.R - 1);
      trees += `<circle cx="${cx - 9}" cy="${cy}" r="9" fill="#A9C98F"/><circle cx="${cx + 8}" cy="${cy - 4}" r="11" fill="#9CC183"/>`;
    }
    const links = r.marks.map(m => { const p = markPos(r, m); return `<line x1="${p.nx}" y1="${p.ny}" x2="${p.x}" y2="${p.y}" stroke="#C9B48E" stroke-width="3" stroke-dasharray="3 4"/>`; }).join('');
    const marksHTML = r.marks.map((m, i) => {
      const p = markPos(r, m), tag = mode === 'pick' && i > 0 ? 'button' : 'div';
      const target = (r.type !== 'directions' && i === r.targetIdx) ? ' target' : '';
      const attrs = tag === 'button' ? `type="button" data-action="pick" data-value="${i}" aria-label="${m.place.name}"` : '';
      return `<${tag} class="rt-mark${p.qy < 0 ? ' up' : ''}${target}${tag === 'button' ? ' pickable pop' : ''}" ${attrs} style="left:${Math.round(p.x)}px;top:${Math.round(p.y - 21)}px">
        <span class="tile">${placeSVG(m.place, 34)}</span><span class="lbl">${m.place.name}</span></${tag}>`;
    }).join('');
    const s = xy(r, r.start);
    $('#arena').innerHTML = `<svg width="560" height="340" viewBox="0 0 560 340" style="position:absolute;left:0;top:0" aria-hidden="true">
      <rect x="0" y="0" width="560" height="340" rx="22" fill="#DCE8CC"/>${trees}
      <g stroke="#E2D4B8" stroke-width="30" stroke-linecap="round">${roads}</g><g stroke="#F8F1E3" stroke-width="24" stroke-linecap="round">${roadsTop}</g>
      ${links}<g id="rt-reveal"></g><g id="rt-trail"></g>${bars}</svg>
      ${marksHTML}<div id="rt-targets"></div>
      <div id="rt-walker" style="left:${s.x}px;top:${s.y}px">${WALKER}</div>`;
  }
  const polyline = (r, nodes, color, w, dash) => nodes.length < 2 ? '' :
    `<polyline points="${nodes.map(n => { const p = xy(r, n); return p.x + ',' + p.y; }).join(' ')}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ''} opacity="0.85"/>`;
  function moveWalker(n, instant) {
    const w = $('#rt-walker'), p = xy(S.round, n);
    w.classList.toggle('anim', !!instant);
    w.style.left = p.x + 'px'; w.style.top = p.y + 'px';
  }
  function showTargets() {             // 갈 수 있는 이웃 갈림길에 동그라미
    const r = S.round, g = S.g, cur = U.path[U.path.length - 1], blocked = new Set(r.blocked);
    $('#rt-targets').innerHTML = U.done ? '' : g.neighbors(cur).filter(m => !blocked.has(edgeKey(cur, m))).map(m => {
      const p = xy(r, m);
      return `<button type="button" class="rt-go" data-action="game" data-op="move" data-value="${m}" aria-label="이쪽으로 가기" style="left:${p.x}px;top:${p.y}px"></button>`;
    }).join('');
    $('#rt-trail').innerHTML = polyline(r, U.path, '#E07B39', 7, '2 10');
    const undo = $('#rt-undo'); if (undo) undo.disabled = U.path.length < 2 || U.done;
  }

  /* 보고 따라가기: 할머니가 걷는 모습 */
  function memFrame(r, slow, t) {
    const t0 = 600 * slow, stepMs = 700 * slow, path = r.answerPath;
    const k = Math.max(0, Math.min(path.length - 1, Math.floor((t - t0) / stepMs)));
    const p = Math.max(0, Math.min(1, (t - t0) / stepMs - k));
    const a = xy(r, path[k]), b = xy(r, path[Math.min(k + 1, path.length - 1)]);
    const w = $('#rt-walker'); w.classList.add('anim');
    w.style.left = (a.x + (b.x - a.x) * p) + 'px'; w.style.top = (a.y + (b.y - a.y) * p) + 'px';
    const pts = path.slice(0, k + 1).map(n => xy(r, n)).concat(t > t0 ? [{ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p }] : []);
    $('#rt-trail').innerHTML = pts.length > 1 ? `<polyline points="${pts.map(q => q.x + ',' + q.y).join(' ')}" fill="none" stroke="#1F5F6B" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 10"/>` : '';
  }

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  const miniMap = (extra) => `<svg width="200" height="96" viewBox="0 0 200 96" style="position:absolute;left:4px;top:4px" aria-hidden="true">
    <rect width="200" height="96" rx="14" fill="#DCE8CC"/><g stroke="#F8F1E3" stroke-width="12" stroke-linecap="round"><line x1="20" y1="22" x2="180" y2="22"/><line x1="20" y1="74" x2="180" y2="74"/><line x1="20" y1="22" x2="20" y2="74"/><line x1="100" y1="22" x2="100" y2="74"/><line x1="180" y1="22" x2="180" y2="74"/></g>${extra || ''}</svg>`;
  registerGame({
    id: 'route', category: 'space', name: '길찾기', short: '동네 지도를 보고<br>길을 찾아가요',
    direct: r => r.type !== 'memory',            // 보고 따라가기만 "보기" 단계가 있어요
    thumb() {
      return miniMap(`<polyline points="20,74 100,74 100,22 180,22" fill="none" stroke="#E07B39" stroke-width="5" stroke-dasharray="2 8" stroke-linecap="round"/>`) +
        `<div style="position:absolute;left:8px;top:58px">${WALKER.replace('width="40" height="40"', 'width="34" height="34"')}</div>
        <div style="position:absolute;left:176px;top:4px;width:36px;height:36px;border-radius:10px;background:#FFFFFF;display:flex;align-items:center;justify-content:center">${placeSVG(PLACES[1], 30)}</div>`;
    },
    ruleCards() {
      return [
        [miniMap(`<polyline points="20,74 100,74 100,22 180,22" fill="none" stroke="#E07B39" stroke-width="5" stroke-dasharray="2 8" stroke-linecap="round"/><rect x="132" y="12" width="14" height="22" rx="3" fill="#E8743B"/>`) +
          `<div style="position:absolute;left:4px;top:60px">${WALKER.replace('width="40" height="40"', 'width="32" height="32"')}</div><div style="position:absolute;left:96px;top:64px;width:34px;height:34px;border-radius:50%;border:3px solid #1F5F6B;background:rgba(255,255,255,.7)"></div>`,
          '동그라미를 눌러<br>한 칸씩 찾아가요'],
        [`<div style="position:absolute;left:40px;right:0;top:6px;display:flex;flex-direction:column;gap:6px;font:700 18px 'Noto Sans KR'">
          <span style="display:flex;align-items:center;gap:6px">${arrowSVG('right', 24, '#B8501A')} 오른쪽 2칸</span><span style="display:flex;align-items:center;gap:6px">${arrowSVG('up', 24, '#B8501A')} 위로 1칸</span>
          <span style="display:flex;align-items:center;gap:6px">→ 어디일까요?</span></div>`, '길 안내를 듣고<br>도착할 곳을 골라요'],
        [miniMap(`<polyline points="20,22 20,74 100,74 100,22" fill="none" stroke="#1F5F6B" stroke-width="5" stroke-dasharray="2 8" stroke-linecap="round"/>`) +
          `<div style="position:absolute;left:84px;top:6px">${WALKER.replace('width="40" height="40"', 'width="32" height="32"')}</div>`,
          '할머니가 간 길을<br>기억해서 따라가요'],
      ];
    },
    ruleTalk: '동네 지도에서 길을 찾아요. 할머니 옆 동그라미를 누르면 한 칸씩 움직여요. 공사 중인 길은 돌아가야 해요. 길 안내를 듣고 도착할 곳을 고르거나, 할머니가 걸어간 길을 기억했다가 똑같이 따라가기도 해요.',
    buildRound,
    readyInfo(r) {
      const cfg = LEVELS[r.level];
      return {
        chip: `문제 ${roundsOf(this)}개`, title: '길찾기를 시작해요',
        sub: '동네 지도를 보고 길을 찾아요.<br>천천히 하셔도 괜찮아요',
        body: `<div style="display:flex;flex-wrap:wrap;gap:8px">${['go', 'directions', 'memory'].map(t => {
          const on = cfg.types.includes(t);
          return `<span class="chip ${on ? 'chip-teal' : ''}" style="height:40px;font-size:19px;${on ? '' : 'opacity:.45'}">${TYPE_NAME[t]}${on ? '' : ' (다음 단계)'}</span>`;
        }).join('')}</div>`,
        talk: '길찾기를 시작해요. 천천히 하셔도 괜찮아요.',
      };
    },
    setup(r) { renderMap(r, 'view'); },
    intro(r) {
      const T = r.marks[r.targetIdx].place;
      return { title: '잘 보세요!', html: `<p>할머니가<br>${T.name}에<br>가는 길이에요</p>`, talk: `할머니가 ${T.name}에 가는 길을 잘 보세요.`, wait: 1600 };
    },
    watchText(r) { return '할머니가 가는 길을<br>기억해 주세요'; },
    resetForPlay(r) { renderMap(r, 'view'); },
    play(r, slow, done) {
      const total = 600 * slow + (r.answerPath.length - 1) * 700 * slow + 700 * slow;
      Runner.run(total, t => memFrame(r, slow, t), done);
    },
    beforeQuestion(r) { $('#rt-trail').innerHTML = ''; moveWalker(r.start, false); return 600; },
    question(r) {
      const T = r.marks[r.targetIdx].place;
      const undo = `<button type="button" class="btn btn-line" data-action="game" data-op="undo" id="rt-undo" style="height:50px;font-size:19px" disabled>${ICON.back} 한 칸 뒤로</button>`;
      if (r.type === 'go') return { chip: TYPE_NAME.go, head: `${T.name}까지<br>가 보세요`, size: 26, sub: '가고 싶은 쪽<br>동그라미를 눌러요', buttons: undo, talk: `${T.name}까지 가 보세요. 가고 싶은 쪽 동그라미를 누르면 한 칸씩 가요.` };
      if (r.type === 'memory') return { chip: TYPE_NAME.memory, head: '같은 길로<br>가 보세요', size: 26, sub: '할머니가 간 길을<br>떠올려요', buttons: undo, talk: `할머니가 ${T.name}에 간 길과 똑같이 가 보세요.` };
      const rows = r.steps.map((s, i) => `<div class="pickRow" style="margin-bottom:6px"><b class="on">${i + 1}</b>${arrowSVG(s.dir, 24, '#B8501A')}<span>${DIR_SHORT[s.dir]} ${s.n}칸</span></div>`).join('');
      return { chip: TYPE_NAME.directions, head: '어디에<br>도착할까요?', size: 26, extra: `<div>${rows}</div>`,
        talk: '우리 집에서 출발해서 ' + r.steps.map(s => `${DIR_WORD[s.dir]} ${NUM_WORD[s.n]} 칸`).join(', ') + ' 가면 어디에 도착할까요?' };
    },
    pickCount() { return 1; },
    enablePicking(r) {
      if (r.type === 'directions') { renderMap(r, 'pick'); return; }
      U.path = [r.start]; U.undo = 0; U.done = false;
      moveWalker(r.start, true);
      showTargets();
    },
    markPicks() {},
    handle(op, v) {
      const r = S.round;
      if (U.done) return;
      if (op === 'move') {
        const n = Number(v);
        U.path.push(n); noteTap(); moveWalker(n, false);
        const steps = U.path.length - 1;
        const finished = r.type === 'go' ? (n === r.goal || steps >= r.cap) : steps >= r.cap;
        if (finished) { U.done = true; showTargets(); later(() => submitAnswer(U.path.slice()), 450); return; }
      } else if (op === 'undo') {
        if (U.path.length < 2) return;
        U.path.pop(); U.undo++; moveWalker(U.path[U.path.length - 1], false);
      }
      showTargets();
    },
    score(r, picks) {
      if (r.type === 'directions') return picks[0] === r.answerIdx ? 100 : 0;
      if (r.type === 'go') return picks[picks.length - 1] === r.goal ? Math.min(100, Math.round(100 * r.shortest / (picks.length - 1))) : 0;
      let ok = 0;                                                       // 보고 따라가기: 같은 칸에 있었던 걸음 수
      for (let i = 1; i < r.answerPath.length; i++) if (picks[i] === r.answerPath[i]) ok++;
      return Math.round(100 * ok / (r.answerPath.length - 1));
    },
    reveal(r, picks) {
      $('#rt-targets') && ($('#rt-targets').innerHTML = '');
      const undo = $('#rt-undo'); if (undo) undo.disabled = true;
      $('#rt-reveal').innerHTML = polyline(r, r.answerPath, '#2E7D4F', 10, '');
      if (r.type === 'directions') {
        $$('#arena .rt-mark').forEach(el => {
          const i = Number(el.dataset.value);
          if (el.tagName === 'BUTTON') { el.disabled = true; el.classList.remove('pop'); }
          el.classList.toggle('right', i === r.answerIdx);
          el.classList.toggle('wrongPick', picks.includes(i) && i !== r.answerIdx);
        });
        return;
      }
      $('#rt-trail').innerHTML = polyline(r, picks, '#E07B39', 6, '2 10');
      $$('#arena .rt-mark.target').forEach(el => el.classList.add('right'));
    },
    revealAfterReview(r, picks) { this.reveal(r, picks); },
    feedback(r, acc) {
      const T = r.marks[r.targetIdx].place;
      let detail;
      if (r.type === 'go') detail = acc === 100 ? '가장 빠른 길로<br>잘 찾아가셨어요' : (acc > 0 ? '잘 도착했어요!<br>초록 길이 더 빨라요' : '괜찮아요!<br>초록 길을 봐 주세요');
      else if (r.type === 'directions') detail = acc === 100 ? '정확하게<br>찾으셨어요' : `초록색 ${T.name}에<br>도착해요`;
      else detail = acc === 100 ? '똑같은 길로<br>잘 가셨어요' : (acc > 0 ? '몇 칸만<br>달랐어요' : '괜찮아요!<br>초록 길을 봐 주세요');
      const was = hasBatchim(T.name.slice(-1)) ? '이에요' : '예요';
      return { detail, talk: r.type === 'directions' ? `정답은 ${T.name}${was}.` : '초록색이 가장 알맞은 길이에요.' };
    },
    detail(r, picks) {
      return {
        gridCols: r.C, gridRows: r.R, start: r.start, goal: r.goal, target: r.marks[r.targetIdx].place.name, blockedCount: r.blocked.length,
        shortest: r.type === 'go' ? r.shortest : '', steps: r.type === 'directions' ? r.steps.map(s => s.dir + s.n) : '',
        routeLength: r.answerPath.length - 1, answerPath: r.answerPath, userPath: r.type === 'directions' ? '' : picks,
        moves: r.type === 'directions' ? '' : picks.length - 1, undoCount: r.type === 'directions' ? '' : U.undo,
        chosen: r.type === 'directions' ? r.marks[picks[0]].place.name : (picks[picks.length - 1] === r.goal ? 'reached' : 'not_reached'),
        places: r.marks.map(m => m.place.name),
      };
    },
    answerKey(r) { return [r.marks[r.targetIdx].place.id]; },
    _test: { buildRound, LEVELS, makeGrid, edgeKey },
  });
})();
