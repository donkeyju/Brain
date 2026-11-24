/* =========================================================
   수건돌리기 (카테고리: 기억력·주의력)
   술래가 마당을 돌며 몰래 수건을 놓아요 → 이웃들이 섞인 카드로 나오면
   누가 받았는지 "모습"으로 골라요.
   ========================================================= */
(function () {
  /* 난이도 표
     people: 이웃 수 [최소, 최대]   lapSec: 술래가 한 바퀴 도는 시간(초)
     fakes: 놓는 척하는 횟수 [최소, 최대]   types: 나올 수 있는 문제 유형
     (수건은 놓은 뒤 질문이 나올 때까지 계속 보여요) */
  const LEVELS = {
    1: { people: [4, 4], lapSec: 7.5, fakes: [0, 0], types: ['single'] },
    2: { people: [5, 5], lapSec: 6.5, fakes: [0, 1], types: ['single'] },
    3: { people: [6, 6], lapSec: 5.5, fakes: [1, 1], types: ['single', 'first'] },
    4: { people: [6, 6], lapSec: 5.0, fakes: [1, 2], types: ['single', 'first', 'order'] },
    5: { people: [7, 8], lapSec: 4.5, fakes: [1, 2], types: ['single', 'first', 'order'] },
  };
  /* 문제 유형: single 수건 1개 누가? / first 수건 2개 먼저 받은 사람? / order 받은 순서대로 두 명 */

  /* 이웃 12명: 옷 색, 머리 모양, 소품, 옷 무늬, 손에 든 물건 다섯 가지로 구분해요.
     (이름은 화면에 나오지 않고 기록용 ID로만 써요) */
  const ROSTER = [
    { name: '순자', title: '할머니',   color: '남색',   shirt: '#2F4B7C', hair: '#D9D4CD', style: 'perm',  acc: 'none',    pattern: 'stripe', item: 'fan' },
    { name: '영철', title: '할아버지', color: '겨자색', shirt: '#E2A23B', hair: '#8B847C', style: 'short', acc: 'glasses', pattern: 'plain',  item: 'cane' },
    { name: '옥희', title: '할머니',   color: '하늘색', shirt: '#7FB2D9', hair: '#E6E1DA', style: 'bun',   acc: 'scarf',   pattern: 'dot',    item: 'flower' },
    { name: '말순', title: '할머니',   color: '초록색', shirt: '#6E9B6A', hair: '#BDB7AF', style: 'perm',  acc: 'glasses', pattern: 'check',  item: 'bag' },
    { name: '봉수', title: '할아버지', color: '보라색', shirt: '#8A5A8C', hair: '#6E6862', style: 'side',  acc: 'none',    pattern: 'vest',   item: 'none', vest: '#E9DCC4' },
    { name: '덕배', title: '할아버지', color: '청회색', shirt: '#4F7F8F', hair: '#A39C94', style: 'short', acc: 'hat',     pattern: 'stripe', item: 'cane' },
    { name: '금자', title: '할머니',   color: '갈색',   shirt: '#A67C52', hair: '#CFCAC3', style: 'bun',   acc: 'none',    pattern: 'check',  item: 'fan' },
    { name: '만복', title: '할아버지', color: '국방색', shirt: '#5D6B3A', hair: '#E0DBD4', style: 'side',  acc: 'glasses', pattern: 'plain',  item: 'bag' },
    { name: '정희', title: '할머니',   color: '분홍색', shirt: '#E58FA0', hair: '#9C958D', style: 'perm',  acc: 'scarf',   pattern: 'vest',   item: 'flower', vest: '#7A4E5E' },
    { name: '춘식', title: '할아버지', color: '남보라색', shirt: '#3D3A6B', hair: '#CFCAC3', style: 'short', acc: 'scarf', pattern: 'check',  item: 'none' },
    { name: '복례', title: '할머니',   color: '황토색', shirt: '#C9B27A', hair: '#EDE9E3', style: 'bun',   acc: 'glasses', pattern: 'dot',    item: 'cane' },
    { name: '상철', title: '할아버지', color: '청록색', shirt: '#2E7D6E', hair: '#7E776F', style: 'side',  acc: 'hat',     pattern: 'plain',  item: 'fan' },
  ];
  const TAGGER = { name: '술래', title: '', color: '빨간색', shirt: '#D64535', hair: '#6E6862', style: 'short', acc: 'none', pattern: 'plain', item: 'none' };

  /* 모습을 말로 풀어 쓰기 (화면 읽기, 음성 안내에 사용) */
  const WORDS = {
    style: { perm: '뽀글머리', bun: '쪽진 머리', short: '짧은 머리', side: '옆머리만 있는 머리' },
    acc: { none: '', hat: '모자', glasses: '안경', scarf: '노란 목도리' },
    pattern: { plain: '', stripe: '줄무늬', dot: '물방울무늬', check: '체크무늬', vest: '' },
    item: { none: '', fan: '부채', cane: '지팡이', flower: '꽃', bag: '손가방' },
  };
  function describe(p) {
    const clothes = p.pattern === 'vest' ? `${p.color} 옷에 조끼` : `${p.color} ${WORDS.pattern[p.pattern] ? WORDS.pattern[p.pattern] + ' ' : ''}옷`;
    return [clothes, WORDS.style[p.style], WORDS.acc[p.acc], WORDS.item[p.item] ? WORDS.item[p.item] + ' 든 모습' : ''].filter(Boolean).join(', ');
  }

  /* ---------- 이웃 캐릭터 그리기 (SVG) ---------- */
  function isLight(hex) {
    const v = parseInt(hex.slice(1), 16);
    return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) > 150;
  }
  function personSVG(p, w) {
    const h = Math.round(w * 100 / 76);
    const skin = '#F3CDA9', ink = '#3A2E26';
    const mark = isLight(p.shirt) ? 'rgba(43,37,32,0.24)' : 'rgba(255,255,255,0.55)';
    let pattern = '';                                   // 옷 무늬
    if (p.pattern === 'stripe') pattern = `<rect x="11" y="62" width="54" height="4.5" fill="${mark}"/><rect x="7" y="72" width="62" height="4.5" fill="${mark}"/><rect x="7" y="82" width="62" height="4.5" fill="${mark}"/>`;
    if (p.pattern === 'dot') pattern = [[18, 64], [30, 70], [42, 64], [54, 70], [24, 80], [38, 84], [50, 80], [60, 87], [14, 87]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.8" fill="${mark}"/>`).join('');
    if (p.pattern === 'check') pattern = [22, 38, 54].map(x => `<rect x="${x - 1.5}" y="57" width="3" height="37" fill="${mark}"/>`).join('') +
      [66, 80].map(y => `<rect x="8" y="${y - 1.5}" width="60" height="3" fill="${mark}"/>`).join('');
    if (p.pattern === 'vest') pattern = `<path d="M8 74 Q8 56 26 55 L36 80 L36 96 L18 96 Q8 96 8 86 Z" fill="${p.vest}"/><path d="M68 74 Q68 56 50 55 L40 80 L40 96 L58 96 Q68 96 68 86 Z" fill="${p.vest}"/><circle cx="31" cy="88" r="1.8" fill="${ink}"/>`;
    const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${skin}" stroke="rgba(160,110,70,0.4)" stroke-width="1"/>`;
    let item = '';                                      // 손에 든 물건
    if (p.item === 'fan') item = `<path d="M11 74 L1 58 A13 13 0 0 1 21 58 Z" fill="#E8574A"/><path d="M11 74 L5 59 M11 74 L11 56 M11 74 L17 59" stroke="#F7D9D4" stroke-width="1.4"/><rect x="9.8" y="73" width="2.6" height="12" rx="1.2" fill="#7A5230"/>` + hand(11, 82);
    if (p.item === 'cane') item = `<path d="M69 96 L69 60 q0 -8 -8 -8" fill="none" stroke="#7A5230" stroke-width="3.6" stroke-linecap="round"/>` + hand(69, 72);
    if (p.item === 'flower') item = `<path d="M11 88 L11 63" stroke="#4E8A47" stroke-width="2.2"/><path d="M11 78 q-6 -2 -7 -7 q6 0 7 5" fill="#4E8A47"/>` +
      [0, 72, 144, 216, 288].map(a => { const r = a * Math.PI / 180; return `<circle cx="${(11 + 5 * Math.cos(r)).toFixed(1)}" cy="${(59 + 5 * Math.sin(r)).toFixed(1)}" r="3.6" fill="#F28BA8"/>`; }).join('') +
      `<circle cx="11" cy="59" r="2.6" fill="#F6C945"/>` + hand(11, 84);
    if (p.item === 'bag') item = `<path d="M60 81 q6 -10 12 0" fill="none" stroke="#6E2C2A" stroke-width="2.4"/><rect x="57" y="81" width="18" height="15" rx="3.5" fill="#9B3D3A"/><rect x="57" y="86" width="18" height="2.4" fill="#6E2C2A"/>` + hand(66, 80);
    const cap = `<path d="M15 31 A23 23 0 0 1 61 31 q-6 -5 -12 -3 q-6 2 -11 -4 q-5 6 -11 4 q-6 -2 -12 3 z" fill="${p.hair}"/>`;
    let hair = '';                                      // 머리 모양
    if (p.style === 'perm') hair = cap + [[22, 17, 7], [30, 12, 7.5], [38, 10, 8], [46, 12, 7.5], [54, 17, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.hair}"/>`).join('');
    if (p.style === 'bun') hair = `<circle cx="38" cy="9" r="8" fill="${p.hair}"/>` + cap;
    if (p.style === 'short') hair = cap;
    if (p.style === 'side') hair = `<path d="M15.5 37 q-1 -12 7 -17 l2 4 q-5 4 -5 13 z" fill="${p.hair}"/><path d="M60.5 37 q1 -12 -7 -17 l-2 4 q5 4 5 13 z" fill="${p.hair}"/>`;
    let top = '', scarf = '';                           // 소품
    if (p.acc === 'glasses') top = `<g fill="rgba(255,255,255,0.2)" stroke="${ink}" stroke-width="2.4"><circle cx="29" cy="33" r="7.5"/><circle cx="47" cy="33" r="7.5"/></g><path d="M36.5 33 h3" stroke="${ink}" stroke-width="2.4"/>`;
    if (p.acc === 'hat') top = `<path d="M18 21 Q18 5 38 5 Q58 5 58 21 Z" fill="#5B4636"/><rect x="10" y="18" width="56" height="7" rx="3.5" fill="#5B4636"/><rect x="18" y="15" width="40" height="4" fill="#7A604B"/>`;
    if (p.acc === 'scarf') scarf = `<rect x="15" y="50" width="46" height="11" rx="5.5" fill="#F2C14E"/><rect x="42" y="56" width="10" height="17" rx="4" fill="#E9B33A" transform="rotate(14 47 60)"/>`;
    return `<svg class="fig" viewBox="0 0 76 100" width="${w}" height="${h}" aria-hidden="true">
<rect x="6" y="54" width="64" height="42" rx="20" fill="${p.shirt}"/>${pattern}${scarf}
<circle cx="15.5" cy="35" r="4.5" fill="${skin}"/><circle cx="60.5" cy="35" r="4.5" fill="${skin}"/>
<circle cx="38" cy="33" r="23" fill="${skin}"/>${hair}
<circle cx="29" cy="33" r="2.8" fill="${ink}"/><circle cx="47" cy="33" r="2.8" fill="${ink}"/>
<ellipse cx="23" cy="41" rx="4" ry="2.6" fill="#EFA58E"/><ellipse cx="53" cy="41" rx="4" ry="2.6" fill="#EFA58E"/>
<path d="M33 41 Q38 46 43 41" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>${top}${item}</svg>`;
  }
  const towelHTML = (x, y, rot) => `<div class="towel" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)"></div>`;

  /* ---------- 한 판 만들기 (같은 seed → 항상 같은 판) ---------- */
  function seatGeometry(n) {
    const s = n >= 7 ? 0.88 : 1;                         // 사람이 많으면 그림을 조금 작게
    const rx = n >= 7 ? 220 : 210;
    const ry = n <= 5 ? 100 : (n === 6 ? 104 : 108);
    return { s, rx, ry, Rx: rx + 56 * s, Ry: ry + 40 * s + 2 };   // Rx, Ry: 술래가 걷는 길
  }
  function buildRound(level, seed, hist) {
    const rng = mulberry32(seed);
    const cfg = LEVELS[level];
    const n = randInt(rng, cfg.people[0], cfg.people[1]);
    const type = pickType(rng, cfg.types, hist.typeHistory);
    const towelCount = type === 'single' ? 1 : 2;
    const fakeCount = randInt(rng, cfg.fakes[0], cfg.fakes[1]);
    const people = shuffle(rng, ROSTER).slice(0, n);   // 12명 중 n명을 뽑아 자리 배치
    const dir = rng() < 0.5 ? 1 : -1;                   // 1: 시계 방향, -1: 반시계 방향
    const startSeat = randInt(rng, 0, n - 1);
    const u0 = startSeat + 0.5;                         // 술래 출발 위치(두 사람 사이)
    const seatAtPass = k => mod(Math.round(u0 + dir * (k - 0.5)), n);   // k번째로 지나가는 자리
    const prev = hist.prevAnswers || [];
    let events = null;
    for (let attempt = 0; attempt < 400 && !events; attempt++) {
      const strict = attempt < 300;
      let realKs;
      if (towelCount === 1) realKs = [randInt(rng, Math.max(2, Math.ceil(0.8 * n)), Math.max(2, Math.floor(1.6 * n)))];
      else { const k1 = randInt(rng, Math.max(2, Math.ceil(0.5 * n)), Math.max(2, n)); realKs = [k1, k1 + randInt(rng, 2, n - 1)]; }
      const realSeats = realKs.map(seatAtPass);
      if (towelCount === 2 && realSeats[0] === realSeats[1]) continue;
      if (strict && realSeats.some(s => prev.includes(people[s].name))) continue;   // 바로 앞 판 정답과 다른 사람
      const lastK = realKs[realKs.length - 1];
      const used = realKs.slice(), fakeKs = [];
      for (let t = 0; t < 120 && fakeKs.length < fakeCount; t++) {
        const k = randInt(rng, 2, lastK + 2);
        if (used.some(u => Math.abs(u - k) < 2)) continue;
        if (realSeats.includes(seatAtPass(k))) continue;
        used.push(k); fakeKs.push(k);
      }
      if (fakeKs.length < fakeCount) continue;
      events = realKs.map((k, i) => ({ k, kind: 'real', order: i + 1 })).concat(fakeKs.map(k => ({ k, kind: 'fake', order: 0 })))
        .sort((a, b) => a.k - b.k).map(e => Object.assign(e, { d: e.k - 0.5, seat: seatAtPass(e.k) }));
    }
    const realSeats = events.filter(e => e.kind === 'real').sort((a, b) => a.order - b.order).map(e => e.seat);
    const endD = events[events.length - 1].d + n * (0.4 + rng() * 0.35);
    // 정답 카드 순서: 마당 자리와 다르게 섞어요
    let choiceOrder = shuffle(rng, range(n));
    if (choiceOrder.every((v, i) => v === i)) choiceOrder = choiceOrder.slice(1).concat(choiceOrder[0]);
    return { seed, level, n, type, towelCount, fakeCount, dir, u0, people, events, realSeats, endD, choiceOrder, lapSec: cfg.lapSec, geo: seatGeometry(n) };
  }
  function buildTimeline(r, slow) {                     // 걷기 → 멈춤(놓기/놓는 척) → 걷기 …
    const speed = r.n / r.lapSec / slow, PAUSE = 800 * slow;
    const segs = [];
    let t = 700 * slow, d = 0;
    segs.push({ type: 'wait', t0: 0, t1: t, d0: 0, d1: 0 });
    for (const ev of r.events) {
      const dur = (ev.d - d) / speed * 1000;
      segs.push({ type: 'move', t0: t, t1: t + dur, d0: d, d1: ev.d }); t += dur; d = ev.d;
      segs.push({ type: 'pause', t0: t, t1: t + PAUSE, d0: d, d1: d, ev }); t += PAUSE;
    }
    const dur = (r.endD - d) / speed * 1000;
    segs.push({ type: 'move', t0: t, t1: t + dur, d0: d, d1: r.endD });
    return { segs, total: t + dur };
  }

  /* ---------- 마당 그리기 ---------- */
  const CX = 280, CY = 170;
  const angleOfU = (u, n) => -Math.PI / 2 + u * 2 * Math.PI / n;
  const seatPos = (i, r) => { const a = angleOfU(i, r.n); return { x: CX + r.geo.rx * Math.cos(a), y: CY + r.geo.ry * Math.sin(a) }; };
  const towelSpot = (i, r) => { const a = angleOfU(i, r.n); return { x: CX + (r.geo.rx + 60 * r.geo.s) * Math.cos(a), y: CY + (r.geo.ry + 58 * r.geo.s) * Math.sin(a) }; };
  const taggerPos = (d, r) => { const a = angleOfU(r.u0 + r.dir * d, r.n); return { x: CX + r.geo.Rx * Math.cos(a), y: CY + r.geo.Ry * Math.sin(a) }; };
  const S = { handLeft: 0, tx: 0, ty: 0, fired: null, round: null };   // 지금 판의 그림 상태

  function renderRing(r) {
    const g = r.geo, s = g.s;
    const w = Math.round(76 * s), bw = Math.round(88 * s), bh = Math.round(112 * s);
    const topY = CY - g.Ry;
    const ch = r.dir === 1 ? `M${CX - 6} ${topY - 10} L${CX + 6} ${topY} L${CX - 6} ${topY + 10}` : `M${CX + 6} ${topY - 10} L${CX - 6} ${topY} L${CX + 6} ${topY + 10}`;
    let html = `<div id="t-ring"><svg width="560" height="340" viewBox="0 0 560 340" style="position:absolute;left:0;top:0;overflow:visible" aria-hidden="true">
      <ellipse cx="${CX}" cy="${CY}" rx="${g.Rx}" ry="${g.Ry}" fill="none" stroke="#CDB68A" stroke-width="3" stroke-dasharray="4 10" stroke-linecap="round"/>
      <path d="${ch}" fill="none" stroke="#B8501A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div style="position:absolute;left:${CX - g.rx - 30}px;top:${CY - g.ry - 22}px;width:${(g.rx + 30) * 2}px;height:${(g.ry + 22) * 2}px;border-radius:50%;background:#EAD9B8;box-shadow:inset 0 -6px 0 rgba(150,110,60,0.12)"></div>`;
    r.people.forEach((p, i) => {
      const q = seatPos(i, r);
      html += `<div class="seat pop" data-seat="${i}" role="img" aria-label="${describe(p)}"
        style="left:${Math.round(q.x - bw / 2)}px;top:${Math.round(q.y - bh / 2)}px;width:${bw}px;height:${bh}px;z-index:${Math.round(q.y)};animation-delay:${i * 60}ms">${personSVG(p, w)}</div>`;
    });
    html += `<div id="tagger" style="width:${w}px;height:${Math.round(100 * s)}px;opacity:0">${personSVG(TAGGER, w)}
      <div id="handTowel" class="towel" style="left:${Math.round(-12 * s)}px;top:${Math.round(56 * s)}px;transform:rotate(-14deg)"></div></div></div>
      <div id="t-choices"></div>`;
    $('#arena').innerHTML = html;
    $('#arena').classList.remove('choosing');
    placeTagger(0);
  }
  function placeTagger(d) {
    const r = S.round, tg = $('#tagger'); if (!tg) return;
    const q = taggerPos(d, r), s = r.geo.s;
    tg.style.left = Math.round(q.x - 38 * s) + 'px';
    tg.style.top = Math.round(q.y - 50 * s) + 'px';
    tg.style.zIndex = Math.round(q.y) + 1;
    S.tx = q.x; S.ty = q.y;
  }
  function updateHandTowel() {
    const h = $('#handTowel'); if (!h) return;
    h.style.opacity = S.handLeft > 0 ? '1' : '0';
    h.classList.toggle('second', S.handLeft > 1);
  }
  function dropTowel(ev) {        // 술래 손에서 그 사람 뒤로 옮겨져서, 질문이 나올 때까지 그대로 있어요
    const r = S.round, s = r.geo.s;
    S.handLeft--; updateHandTowel();
    const to = towelSpot(ev.seat, r);
    const el = document.createElement('div');
    el.className = 'towel drop';
    el.style.left = Math.round(S.tx - 50 * s) + 'px'; el.style.top = Math.round(S.ty + 6 * s) + 'px';
    el.style.zIndex = 800; el.style.transform = 'rotate(' + (r.dir * 8) + 'deg)';
    $('#t-ring').appendChild(el);
    void el.offsetWidth;                                // 시작 위치를 먼저 적용한 뒤 움직이게 하는 요령
    el.style.left = Math.round(to.x - 22) + 'px'; el.style.top = Math.round(to.y - 15) + 'px';
    later(() => { el.style.zIndex = Math.round(to.y); }, 400);
  }
  function frame(tl, t) {
    const segs = tl.segs;
    const seg = segs.find(x => t < x.t1) || segs[segs.length - 1];
    const p = seg.t1 > seg.t0 ? Math.min(1, Math.max(0, (t - seg.t0) / (seg.t1 - seg.t0))) : 1;
    placeTagger(seg.d0 + (seg.d1 - seg.d0) * p);
    const tg = $('#tagger');
    if (tg) tg.classList.toggle('crouch', seg.type === 'pause' && t < tl.total);
    if (seg.type === 'pause' && !S.fired.has(seg)) {
      S.fired.add(seg);
      if (seg.ev.kind === 'real') dropTowel(seg.ev);    // fake는 몸만 숙여요
    }
  }
  function renderChoices(r) {   // 이번 판 이웃들을 마당과 다른 순서로 보여줘요
    const n = r.n, cols = n <= 4 ? n : (n <= 6 ? 3 : 4), rows = Math.ceil(n / cols);
    const cw = Math.floor((560 - (cols - 1) * 12) / cols);
    const ch = Math.min(rows === 1 ? 240 : 999, Math.floor((340 - (rows - 1) * 12) / rows));
    const figH = Math.min(ch - 18, Math.floor((cw - 16) * 100 / 76));
    const figW = Math.floor(figH * 76 / 100);
    $('#t-choices').innerHTML = r.choiceOrder.map((i, k) => `<button type="button" class="pcard pop" data-action="pick" data-value="${i}" aria-label="${describe(r.people[i])}"
      style="width:${cw}px;height:${ch}px;animation-delay:${k * 50}ms">${personSVG(r.people[i], figW)}</button>`).join('');
  }

  window.NeighborArt = { ROSTER, personSVG, describe };      // 이웃 그림을 다른 놀이(조건 찾기)에서도 써요

  /* ---------- 공통 진행기(app.js)에 알려주는 놀이 정보 ---------- */
  registerGame({
    id: 'towel', category: 'memory', name: '수건돌리기', short: '술래가 몰래 놓은 수건,<br>누가 받았을까요?',
    thumb() {
      return `<div style="position:absolute;left:24px;top:52px;width:200px;height:52px;border-radius:50%;background:#EAD9B8"></div>` +
        at(30, 18, personSVG(ROSTER[0], 52)) + at(92, 6, personSVG(ROSTER[1], 52)) + at(154, 18, personSVG(ROSTER[2], 52)) +
        `<div class="towel" style="left:196px;top:66px;transform:rotate(10deg)"></div>`;
    },
    ruleCards() {
      return [
        [at(66, 0, personSVG(TAGGER, 76)) + towelHTML(128, 58, -12) +
          `<svg width="213" height="100" viewBox="0 0 213 100" style="position:absolute;left:0;top:0" aria-hidden="true"><path d="M150 80 C 190 70, 196 30, 160 18" fill="none" stroke="#CDB68A" stroke-width="3" stroke-dasharray="4 8" stroke-linecap="round"/><path d="M168 12 L158 17 L166 26" fill="none" stroke="#B8501A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
          '술래(빨간 옷)가 수건을<br>들고 빙글빙글 돌아요'],
        [`<div style="position:absolute;left:30px;top:70px;width:160px;height:26px;border-radius:50%;background:#EAD9B8"></div>` + towelHTML(124, 68, 6) + at(60, 0, personSVG(ROSTER[0], 76)) +
          `<span style="position:absolute;left:146px;top:16px;padding:4px 10px;border-radius:12px;background:#FFF1E6;color:#8E3A10;font-size:18px;font-weight:900">몰래!</span>`,
          '한 사람 뒤에<br>살짝 내려놓아요'],
        [`<div style="position:absolute;left:24px;top:4px;width:72px;height:92px;box-sizing:border-box;border:2px solid #EFE5D4;border-radius:14px;background:#FFFFFF"></div>` + at(30, 10, personSVG(ROSTER[2], 60)) +
          `<div style="position:absolute;left:104px;top:0;width:80px;height:100px;box-sizing:border-box;border:3px dashed #1F5F6B;border-radius:16px;background:#FFFFFF"></div>` + at(111, 8, personSVG(ROSTER[3], 66)) +
          `<div style="position:absolute;left:150px;top:56px">${ICON.finger}</div>`,
          '누가 받았는지<br>모습을 보고 골라요'],
      ];
    },
    ruleTalk: '빨간 옷을 입은 술래가 수건을 들고 빙글빙글 돌아요. 한 사람 뒤에 살짝 내려놓아요. 다 돌고 나면 사람들 모습이 섞여서 나와요. 누가 수건을 받았는지 모습을 보고 골라 주세요.',
    buildRound,
    readyInfo(r) {
      const w = r.n <= 5 ? 84 : (r.n === 6 ? 72 : 56);
      return {
        chip: `이웃 ${r.n}명`, title: '오늘 함께할 이웃이에요',
        sub: '옷 무늬, 모자·안경, 들고 있는 물건을<br>잘 봐 두세요. 정답은 모습으로 골라요!',
        body: r.people.map(p => `<div aria-label="${describe(p)}">${personSVG(p, w)}</div>`).join(''),
        talk: '오늘 함께할 이웃이에요. 옷 무늬와 들고 있는 물건을 잘 봐 두세요. 정답은 모습으로 골라요.',
      };
    },
    setup(r) { S.round = r; renderRing(r); },
    intro(r, roundNo) {
      const two = r.towelCount === 2;
      return {
        title: roundNo === 1 ? '시작해요!' : '자리를 바꿨어요',
        html: `<p>${two ? '이번엔 수건이<br><b style="color:#B8501A">2개</b>예요!' : '모습을<br>잘 봐 두세요'}</p>`,
        talk: two ? '이번엔 수건이 두 개예요. 잘 보세요.' : (roundNo === 1 ? '잘 보세요.' : '이웃들이 자리를 바꿨어요. 잘 보세요.'),
        wait: two ? 2200 : 1500,
      };
    },
    watchText(r) { return r.towelCount === 2 ? '수건을 두 번<br>놓아요' : '술래가 몰래<br>수건을 놓아요'; },
    resetForPlay(r) {
      S.round = r;
      $('#arena').classList.remove('choosing');
      $$('#t-ring .towel.drop').forEach(el => el.remove());
      $$('#t-ring .seat').forEach(el => el.classList.remove('right', 'wrongPick', 'pop'));
      S.handLeft = r.towelCount; updateHandTowel();
      placeTagger(0);
      $('#tagger').style.opacity = '1';
    },
    play(r, slow, done) {
      const tl = buildTimeline(r, slow);
      S.fired = new Set();
      Runner.run(tl.total, t => frame(tl, t), done);
    },
    beforeQuestion() { const tg = $('#tagger'); if (tg) tg.style.opacity = '0'; return 450; },
    question(r) {
      if (r.type === 'single') return { head: '누가 수건을<br>받았을까요?', size: 30, sub: '모습을 보고<br>골라 주세요', talk: '누가 수건을 받았을까요? 모습을 보고 골라 주세요.' };
      if (r.type === 'first') return { chip: '수건 2개', head: '먼저 받은<br>사람은<br>누구일까요?', size: 30, sub: '모습을 보고<br>골라 주세요', talk: '수건을 먼저 받은 사람은 누구일까요?' };
      return { chip: '수건 2개', head: '받은 순서대로<br>골라 주세요', size: 28, rows: ['처음 받은 분', '두 번째 받은 분'], talk: '수건을 받은 순서대로 두 분을 골라 주세요.' };
    },
    pickCount(r) { return r.type === 'order' ? 2 : 1; },
    enablePicking(r) { renderChoices(r); $('#arena').classList.add('choosing'); },
    markPicks(r, picks) {
      $$('#t-choices .pcard').forEach(el => {
        el.querySelectorAll('.badge').forEach(b => b.remove());
        const k = picks.indexOf(Number(el.dataset.value));
        el.classList.toggle('picked', k >= 0);
        if (k >= 0 && r.type === 'order') el.insertAdjacentHTML('beforeend', `<span class="badge">${k + 1}</span>`);
      });
    },
    score(r, picks) {
      const a = r.realSeats;
      if (r.type === 'single') return picks[0] === a[0] ? 100 : 0;
      if (r.type === 'first') return picks[0] === a[0] ? 100 : (picks[0] === a[1] ? 50 : 0);
      return orderScore(a, picks);
    },
    reveal(r, picks) {          // 카드에서 정답 공개
      $$('#t-choices .pcard').forEach(el => {
        const i = Number(el.dataset.value), k = r.realSeats.indexOf(i);
        el.disabled = true;
        el.querySelectorAll('.badge').forEach(b => b.remove());
        el.classList.remove('picked', 'pop');
        el.classList.toggle('right', k >= 0);
        el.classList.toggle('wrongPick', picks.includes(i) && k < 0);
        if (k >= 0 && r.towelCount === 2) el.insertAdjacentHTML('beforeend', `<span class="badge" style="background:#2E7D4F">${k + 1}</span>`);
      });
    },
    revealAfterReview(r, picks) {   // 천천히 다시 본 뒤: 마당에서 수건 위치와 받은 사람 표시
      const tg = $('#tagger'); if (tg) tg.style.opacity = '0';
      $$('#t-ring .towel.drop').forEach(el => el.remove());
      r.realSeats.forEach((seat, i) => {
        const q = towelSpot(seat, r);
        $('#t-ring').insertAdjacentHTML('beforeend', `<div class="towel drop" style="left:${Math.round(q.x - 22)}px;top:${Math.round(q.y - 15)}px;z-index:900">${r.towelCount === 2 ? `<span class="badge">${i + 1}</span>` : ''}</div>`);
      });
      $$('#t-ring .seat').forEach(el => {
        const i = Number(el.dataset.seat);
        el.classList.toggle('right', r.realSeats.includes(i));
        el.classList.toggle('wrongPick', picks.includes(i) && !r.realSeats.includes(i));
      });
    },
    feedback(r, acc) {
      const who = q => describe(q) + '의 ' + q.title;
      const A = r.people[r.realSeats[0]], B = r.towelCount === 2 ? r.people[r.realSeats[1]] : null;
      let detail;
      if (r.type === 'single') detail = acc === 100 ? '정확하게<br>기억하셨어요' : '초록 테두리 분이<br>받았어요';
      else if (r.type === 'first') detail = acc === 100 ? '먼저 받은 분을<br>잘 기억하셨어요' : (acc === 50 ? '그분은 두 번째로<br>받았어요' : '초록 1번 분이<br>먼저 받았어요');
      else detail = acc === 100 ? '순서까지<br>정확해요' : (acc === 50 ? '두 분은 맞고<br>순서만 바뀌었어요' : (acc === 25 ? '한 분은<br>맞히셨어요' : '초록 숫자 순서로<br>받았어요'));
      return { detail, talk: (B ? '먼저 받은 분은 ' + who(A) + ', 두 번째는 ' + who(B) : '받은 분은 ' + who(A)) + '이었어요.' };
    },
    detail(r, picks) {
      const names = idx => idx.map(i => r.people[i].name);
      return {
        nPeople: r.n, direction: r.dir === 1 ? 'cw' : 'ccw', lapSec: r.lapSec, fakeCount: r.fakeCount, towelCount: r.towelCount,
        seatNames: names(range(r.n)), choiceOrder: names(r.choiceOrder), answerNames: names(r.realSeats), chosenNames: names(picks),
      };
    },
    answerKey(r) { return r.realSeats.map(i => r.people[i].name); },
    _test: { buildRound, buildTimeline, ROSTER, describe, personSVG },
  });
})();
