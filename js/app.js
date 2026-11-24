'use strict';
/* =========================================================
   app.js - 화면 흐름
   처음(카테고리) → 놀이 고르기 → 규칙 → 준비(3,2,1) → 놀이 5판 → 결과
   어떤 놀이든 같은 흐름으로 진행하고, 놀이마다 다른 부분은
   각 놀이 파일(games/*.js)이 알려준 함수로 처리해요.
   ========================================================= */

/* 지금 상태 */
const G = {
  playerLabel: '', levels: {}, game: null, catId: null, q: null,
  session: null, roundNo: 0, round: null, phase: 'idle',
  picks: [], pickTimes: [], answerShownAt: 0, trialStartedAt: '', lastTrial: null,
  replayUsed: 0, reviewCount: 0, pauseCount: 0, pauseMs: 0,
  hist: { typeHistory: [], prevAnswers: [] }, streakRight: 0, streakWrong: 0,
  sessionStarted: false, recFilter: 'all',
};
const levelOf = id => G.levels[id] || 1;
/* 이번 판이 "바로 문제"인지: 놀이 전체(direct: true) 또는 판마다(direct: r => ...) 정할 수 있어요 */
const isDirect = () => (typeof G.game.direct === 'function' ? G.game.direct(G.round) : !!G.game.direct);

/* ---------- 처음 화면: 카테고리 ---------- */
function renderHome() {
  $('#cat-cards').innerHTML = CATEGORIES.map(c => {
    const n = gamesIn(c.id).length;
    return `<button type="button" class="cat-card${n ? '' : ' soon'}" data-action="${n ? 'openCat' : 'soon'}" data-value="${c.id}" style="border-color:${n ? c.bg : '#EFE5D4'}">
      <span class="ico" style="background:${c.bg};color:${c.color}">${c.icon}</span>
      <span class="txt"><span class="name" style="color:${c.color}">${c.name}</span>
      <span class="desc">${c.desc}</span>
      <span class="chip" style="background:${n ? c.bg : '#EFE5D4'};color:${n ? c.color : '#5C5148'}">${n ? '놀이 ' + n + '개' : '준비 중'}</span></span></button>`;
  }).join('');
  updateSoundBtn();
}
function goHome() { G.phase = 'idle'; renderHome(); show('s-home'); }
function updateSoundBtn() {
  $('#sound-label').textContent = Sound.on ? '소리 켜짐' : '소리 꺼짐';
  $('#btn-sound').setAttribute('aria-pressed', String(Sound.on));
}

/* ---------- 놀이 고르기 ---------- */
function openCategory(catId) {
  const c = CATEGORIES.find(x => x.id === catId);
  G.catId = catId;
  $('#cat-title').textContent = c.name;
  $('#cat-title').style.color = c.color;
  $('#game-cards').classList.toggle('four', gamesIn(catId).length >= 4);      // 놀이가 4개면 한 줄에 4칸
  $('#game-cards').innerHTML = gamesIn(catId).map(g => `<button type="button" class="card-btn" data-action="openGame" data-value="${g.id}">
      <span class="thumb">${g.thumb()}</span>
      <span class="name"${g.name.length > 7 ? ' style="font-size:23px;white-space:nowrap"' : ''}>${g.name}</span>
      <span class="desc">${g.short}</span>
      <span class="foot chip chip-teal">지금 ${levelOf(g.id)}단계</span></button>`).join('') + (gamesIn(catId).length >= 3 ? '' :
    '<div class="card-btn soon" style="align-items:center;justify-content:center;text-align:center"><span class="desc">새 놀이가<br>곧 생겨요</span></div>');
  show('s-cat');
}

/* ---------- 규칙 안내 ---------- */
function openGame(id) {
  G.game = GAMES[id];
  $('#rule-game').textContent = G.game.name;
  $('#rule-cards').innerHTML = G.game.ruleCards().map(([pic, text], i) =>
    `<div class="rcard"><span class="num">${i + 1}</span><div class="pic">${pic}</div><p>${text}</p></div>`).join('');
  show('s-rule');
  if (matchMedia('(pointer: coarse)').matches) {         // 휴대폰이면 전체 화면 + 가로 고정 시도
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    }
  }
  Sound.speak(G.game.ruleTalk);
}

/* ---------- 한 번(5판) 시작 ---------- */
function startSession() {
  Timers.clear(); Runner.stop();
  const g = G.game, now = new Date();
  G.session = {
    sessionId: 's' + now.getTime().toString(36) + Math.floor(Math.random() * 1296).toString(36),
    gameId: g.id, category: g.category, startedAt: now.toISOString(), startLevel: levelOf(g.id),
  };
  G.roundNo = 0; G.hist = { typeHistory: [], prevAnswers: [] }; G.streakRight = 0; G.streakWrong = 0;
  G.sessionStarted = true;
  Store.saveSession(sessionSummary(false));
  prepareRound();
  const info = g.readyInfo(G.round);
  $('#ready-chip').textContent = `${G.round.level}단계 · ${info.chip}`;
  $('#ready-title').textContent = info.title;
  $('#ready-sub').innerHTML = info.sub;
  $('#ready-body').innerHTML = info.body;
  show('s-ready');
  Sound.speak(info.talk);
  let c = 3;
  $('#count').textContent = c;
  const tick = () => { c--; if (c <= 0) { startRound(); return; } $('#count').textContent = c; later(tick, 1100); };
  later(tick, 2200);
}
function prepareRound() {
  G.roundNo++;
  G.round = G.game.buildRound(levelOf(G.game.id), newSeed(), G.hist);
  G.picks = []; G.pickTimes = []; G.replayUsed = 0; G.reviewCount = 0; G.pauseCount = 0; G.pauseMs = 0; G.lastTrial = null;
}
const chipHTML = extra => `<span class="chip${extra ? ' chip-warm' : ''}">${G.roundNo} / ${roundsOf(G.game)}판${extra ? ' · ' + extra : ''}</span>`;
function setPanel(html) { $('#panel').innerHTML = html; }

function startRound() {
  Timers.clear(); Runner.stop();
  show('s-play');
  G.phase = 'intro';
  G.trialStartedAt = new Date().toISOString();
  G.game.setup(G.round, G.roundNo);
  if (isDirect()) { showQuestion(); return; }     // 속담처럼 "보기" 단계가 없는 놀이는 바로 문제
  const it = G.game.intro(G.round, G.roundNo);
  setPanel(`${chipHTML()}<h2 style="font-size:36px">${it.title}</h2>${it.html}`);
  Sound.speak(it.talk);
  later(() => watch(1), it.wait);
}

/* 보기: slow=1 보통, 1.6 = 천천히 다시 보기 */
function watch(slow) {
  G.phase = slow > 1 ? 'review' : 'watch';
  G.game.resetForPlay(G.round);
  watchPanel();
  G.game.play(G.round, slow, () => (slow > 1 ? afterReview() : onWatchDone()));
}
function watchPanel() {
  setPanel(`${chipHTML()}<h2 style="font-size:40px;color:#B8501A">${G.phase === 'review' ? '천천히 볼게요' : '잘 보세요!'}</h2>
    <p>${G.game.watchText(G.round)}</p><div class="grow"></div>
    <span class="note" style="text-align:left">진행 중</span><div class="bar"><i id="prog"></i></div>
    <button type="button" class="btn btn-line" data-action="pause">${ICON.pause} 잠깐 쉬기</button>`);
}
function onWatchDone() {
  G.phase = 'toQuestion';
  later(showQuestion, G.game.beforeQuestion(G.round));
}

/* ---------- 질문 ---------- */
function showQuestion() {
  const g = G.game, r = G.round;
  G.phase = 'answer'; G.picks = []; G.pickTimes = [];
  G.q = g.question(r);
  g.enablePicking(r);
  const left = 1 - G.replayUsed;
  setPanel(`${chipHTML(G.q.chip)}<h2 style="font-size:${G.q.size || 30}px">${G.q.head}</h2>
    ${G.q.sub ? `<p class="sub">${G.q.sub}</p>` : ''}${G.q.extra || ''}<div id="pickRows">${G.q.rows ? pickRowsHTML() : ''}</div><div class="grow"></div>
    ${G.q.buttons || ''}${isDirect() ? '' : `<button type="button" class="btn btn-line" data-action="replay" ${left > 0 ? '' : 'disabled'}>${ICON.replay} 한 번 더 보기</button>
    <span class="note">${left > 0 ? '다시 보기 1번 남았어요' : '다시 보기를 다 썼어요'}</span>`}`);
  Sound.speak(G.q.talk);
  G.answerShownAt = performance.now();
}
function pickRowsHTML() {   // 두 개를 순서대로 고르는 문제: 무엇을 골랐는지는 숨기고 "골랐어요"만
  return G.q.rows.map((label, i) => {
    const on = G.picks[i] !== undefined;
    return `<div class="pickRow"><b class="${on ? 'on' : ''}">${i + 1}</b><span ${on ? '' : 'class="sub"'}>${on ? '골랐어요' : label}</span></div>`;
  }).join('');
}
function onPick(v) {
  if (G.phase !== 'answer') return;
  const g = G.game, r = G.round, need = g.pickCount(r), now = performance.now();
  if (need === 1) { G.picks = [v]; G.pickTimes = [now]; g.markPicks(r, G.picks); evaluate(); return; }
  const last = G.picks[G.picks.length - 1];
  if (last === v) { G.picks.pop(); G.pickTimes.pop(); }           // 방금 고른 것을 다시 누르면 취소
  else if (!G.picks.includes(v)) { G.picks.push(v); G.pickTimes.push(now); }
  g.markPicks(r, G.picks);
  const rows = $('#pickRows'); if (rows) rows.innerHTML = pickRowsHTML();
  if (G.picks.length === need) { G.phase = 'locking'; later(evaluate, 450); }
}

/* 놀이가 스스로 입력을 다룰 때 쓰는 도구 (속담 놀이의 글자·조각 누르기) */
function noteTap() { if (G.phase === 'answer') G.pickTimes.push(performance.now()); }
function submitAnswer(picks) {
  if (G.phase !== 'answer') return;
  G.pickTimes.push(performance.now());
  G.picks = picks;
  evaluate();
}

/* ---------- 채점 + 기록 ---------- */
function evaluate() {
  const g = G.game, r = G.round, S = G.session;
  G.phase = 'feedback';
  const accuracy = g.score(r, G.picks), right = g.isRight ? g.isRight(r, accuracy) : accuracy === 100;   // 잡기 놀이처럼 "거의 다"를 맞음으로 보는 놀이는 isRight로 정해요
  const st = { level: levelOf(g.id), streakRight: G.streakRight, streakWrong: G.streakWrong };
  const levelBefore = st.level;
  const change = adapt(st, right);
  G.levels[g.id] = st.level; G.streakRight = st.streakRight; G.streakWrong = st.streakWrong;
  const sc = computeScores(accuracy, G.replayUsed, r.level);
  // ▶ 판별 원자료: 화면에서는 감점 없이 보여주지만, 기록에는 모두 남겨요
  const trial = Object.assign({
    trialId: S.sessionId + '-r' + G.roundNo, sessionId: S.sessionId, gameId: g.id, category: g.category,
    playerLabel: G.playerLabel, roundNo: G.roundNo, startedAt: G.trialStartedAt, answeredAt: new Date().toISOString(),
    level: levelBefore, levelAfter: st.level, questionType: r.type, seed: r.seed,
    accuracyScore: accuracy, correct: right, replayUsed: G.replayUsed, reviewCount: 0,
    pauseCount: G.pauseCount, pauseMs: Math.round(G.pauseMs),
    rtFirstMs: Math.round(G.pickTimes[0] - G.answerShownAt),
    rtTotalMs: Math.round(G.pickTimes[G.pickTimes.length - 1] - G.answerShownAt),
  }, sc, { appVersion: APP_VERSION, detail: g.detail(r, G.picks) });
  G.lastTrial = trial;
  Store.saveTrial(trial);
  Store.saveSession(sessionSummary(false));
  if (change !== 0) saveProfile();
  G.hist.typeHistory.push(r.type);
  G.hist.prevAnswers = g.answerKey(r);
  g.reveal(r, G.picks);
  Sound.chime(right);
  feedbackPanel(accuracy, change);
}
function feedbackPanel(acc, change) {
  const fb = G.game.feedback(G.round, acc);
  let title = '아쉬워요', color = '#B8501A', icon = ICON.replay;
  const tone = fb.tone || (acc === 100 ? 'good' : (acc > 0 ? 'half' : 'low'));   // 놀이가 제목·느낌을 정할 수도 있어요
  if (tone === 'good') { title = '맞았어요!'; color = '#2E7D4F'; icon = ICON.check; }
  else if (tone === 'half') { title = '아깝네요!'; icon = ICON.half; }
  if (fb.title) title = fb.title;
  const lvl = change > 0 ? '다음 판은 조금 어려워져요' : (change < 0 ? '다음 판은 조금 쉽게 할게요' : '');
  const last = G.roundNo >= roundsOf(G.game);
  setPanel(`${chipHTML()}
    <div class="titleRow"><span class="okIcon" style="background:${color}">${icon}</span><h2 style="font-size:28px;color:${color};white-space:nowrap">${title}</h2></div>
    <p>${fb.detail}</p>${lvl ? `<span class="lvl">${lvl}</span>` : ''}<div class="grow"></div>
    ${isDirect() ? '' : `<button type="button" class="btn btn-line" data-action="review" style="height:52px;font-size:20px">${ICON.replay} 천천히 다시 보기</button>`}
    <button type="button" class="btn btn-primary" data-action="next">${last ? '결과 보기' : '다음 판'} ${ICON.arrow}</button>`);
  Sound.speak(title.replace('!', '') + '. ' + fb.detail.replace(/<br>/g, ' ') + '. ' + fb.talk);
}
function afterReview() {
  if (G.lastTrial) {                 // 천천히 다시 본 횟수도 기록에 더해요
    G.lastTrial = Object.assign({}, G.lastTrial, { reviewCount: G.reviewCount });
    Store.saveTrial(G.lastTrial);
  }
  G.phase = 'feedback';
  G.game.revealAfterReview(G.round, G.picks);
  feedbackPanel(G.lastTrial ? G.lastTrial.accuracyScore : 0, 0);
}
function nextRound() {
  Timers.clear();
  if (G.roundNo >= roundsOf(G.game)) { finishSession(); return; }
  prepareRound();
  startRound();
}

/* ---------- 한 번(5판) 요약 ---------- */
function sessionSummary(completed) {
  const S = G.session;
  const ts = Store.cache.trials.filter(t => t.sessionId === S.sessionId);
  const mean = arr => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
  return {
    sessionId: S.sessionId, gameId: S.gameId, category: S.category, playerLabel: G.playerLabel,
    startedAt: S.startedAt, endedAt: new Date().toISOString(), completed,
    startLevel: S.startLevel, endLevel: levelOf(S.gameId), maxLevel: ts.reduce((m, t) => Math.max(m, t.level), S.startLevel),
    nTrials: ts.length, correctCount: ts.filter(t => t.correct).length,
    sessionScore: mean(ts.map(t => t.trialScore)), weightedScore: mean(ts.map(t => t.weightedScore)),
    meanRtMs: mean(ts.map(t => t.rtTotalMs)), replayTotal: ts.reduce((a, t) => a + t.replayUsed, 0),
    reviewTotal: ts.reduce((a, t) => a + (t.reviewCount || 0), 0), pauseTotal: ts.reduce((a, t) => a + t.pauseCount, 0),
    device: { w: window.innerWidth, h: window.innerHeight, touch: matchMedia('(pointer: coarse)').matches },
    appVersion: APP_VERSION,
  };
}
function saveProfile() {
  Store.saveProfile({ levels: Object.assign({}, G.levels), level: levelOf('towel'), playerLabel: G.playerLabel, soundOn: Sound.on, updatedAt: new Date().toISOString(), appVersion: APP_VERSION });
}
function finishSession() {
  G.phase = 'idle'; G.sessionStarted = false;
  const sum = sessionSummary(true);
  Store.saveSession(sum);
  saveProfile();
  const ts = Store.cache.trials.filter(t => t.sessionId === G.session.sessionId).sort((a, b) => a.roundNo - b.roundNo);
  $('#result-game').textContent = G.game.name;
  $('#result-line').innerHTML = `${ts.length}판 중 <span style="color:#2E7D4F">${sum.correctCount}판</span>을 맞히셨어요`;
  $('#marks').classList.toggle('many', ts.length > 5);
  $('#marks').innerHTML = ts.map(t => {
    const ok = t.accuracyScore === 100, part = !ok && t.accuracyScore > 0;
    const style = ok ? 'background:#2E7D4F;color:#FFFFFF' : 'background:#FFFFFF;border:3px solid #B8501A;color:#B8501A';
    return `<div class="m"><div class="dot" style="${style}">${ok ? ICON.check : (part ? ICON.half : ICON.replay)}</div>${t.roundNo}판</div>`;
  }).join('');
  $('#result-info').textContent = `지금 ${levelOf(G.game.id)}단계예요` + (sum.endLevel > sum.startLevel ? ' · 오늘 한 단계 올라갔어요!' : '');
  show('s-result');
  Sound.speak(`오늘도 수고하셨어요. ${ts.length}판 중 ${sum.correctCount}판을 맞히셨어요.`);
}
function quitSession(then) {
  Runner.stop(); Timers.clear();
  if (G.session && G.sessionStarted) Store.saveSession(sessionSummary(false));   // 중간에 그만둔 것도 기록
  G.sessionStarted = false; G.phase = 'idle';
  then();
}

/* ---------- 잠깐 쉬기 ---------- */
function pauseGame(auto) {
  if (G.phase !== 'watch' && G.phase !== 'review') return;
  if (!Runner.pause()) return;
  G.pauseCount++;
  setPanel(`${chipHTML()}<h2 style="font-size:40px">쉬는 중</h2>
    <p>${auto ? '화면을 벗어나서<br>잠깐 멈췄어요' : '준비되면<br>눌러 주세요'}</p><div class="grow"></div>
    <button type="button" class="btn btn-primary" data-action="resume">${ICON.play} 다시 하기</button>
    <button type="button" class="btn btn-gray" data-action="quit">그만하기</button>`);
}
function resumeGame() { G.pauseMs += Runner.resume(); watchPanel(); }

/* ---------- 보호자용 기록 ---------- */
async function openRecords() {
  show('s-records');
  renderRecords();
  await Store.loadHistory();
  renderRecords();
}
function renderRecords() {
  const modeText = { cloud: '클라우드에 저장 중', local: '이 기기에 저장 중', memory: '임시 저장 (새로고침하면 사라져요)' };
  $('#store-chip').textContent = Store.ready ? modeText[Store.mode] : '불러오는 중…';
  $('#btn-csv-save').hidden = !Store.downloads;
  const f = G.recFilter;
  // 놀이가 많아져서 카테고리 차례로 한 줄에 놓고 옆으로 밀어 보게 했어요
  $('#rec-filters').innerHTML = [['all', '전체']].concat(CATEGORIES.flatMap(c => gamesIn(c.id).map(g => [g.id, g.name]))).map(([id, name]) =>
    `<button type="button" class="btn btn-gray ${f === id ? 'on' : ''}" data-action="filter" data-value="${id}" aria-pressed="${f === id}">${name}</button>`).join('');
  const ts = Store.cache.trials.filter(t => f === 'all' || t.gameId === f);
  const ss = Store.cache.sessions.filter(s => f === 'all' || s.gameId === f).sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
  const done = ss.filter(s => s.completed && s.sessionScore !== null).slice(0, 5);
  const avg = done.length ? Math.round(done.reduce((a, s) => a + s.sessionScore, 0) / done.length) : '-';
  const recent = ts.slice(-25);
  const rt = recent.length ? (recent.reduce((a, t) => a + t.rtTotalMs, 0) / recent.length / 1000).toFixed(1) + '초' : '-';
  const lv = f === 'all' ? GAME_ORDER.map(id => `${GAMES[id].name.split(' ')[0]} ${levelOf(id)}`).join(' · ') : levelOf(f) + '단계';
  $('#stats').innerHTML = `
    <div class="stat"><small>지금 단계</small><b style="font-size:${f === 'all' ? 16 : 20}px">${lv}</b></div>
    <div class="stat"><small>최근 5회 평균 점수 (100점 기준)</small><b>${avg}</b></div>
    <div class="stat"><small>최근 25판 평균 반응 시간</small><b>${rt}</b></div>
    <div class="stat"><small>쌓인 기록</small><b>${ss.length}회 · ${ts.length}판</b></div>
    <label for="playerLabel">참여자 표시 (예: 101호 어르신)</label>
    <input id="playerLabel" type="text" maxlength="30">`;
  $('#playerLabel').value = G.playerLabel;
  const fmt = iso => { const d = new Date(iso); return isNaN(d) ? '-' : `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  $('#rec-table').innerHTML = ss.length ? `<table>
    <thead><tr><th>날짜</th><th>놀이</th><th>판</th><th>맞힘</th><th>점수</th><th>가중</th><th>반응(초)</th><th>다시보기</th><th>단계</th><th>완료</th></tr></thead>
    <tbody>${ss.map(s => `<tr><td>${fmt(s.startedAt)}</td><td>${GAMES[s.gameId] ? GAMES[s.gameId].name : esc(s.gameId)}</td><td>${s.nTrials}</td><td>${s.correctCount}</td>
      <td>${s.sessionScore ?? '-'}</td><td>${s.weightedScore ?? '-'}</td><td>${s.meanRtMs ? (s.meanRtMs / 1000).toFixed(1) : '-'}</td>
      <td>${(s.replayTotal || 0) + (s.reviewTotal || 0)}</td><td>${s.startLevel}→${s.endLevel}</td><td>${s.completed ? '예' : '중단'}</td></tr>`).join('')}</tbody></table>`
    : '<div class="empty">아직 기록이 없어요. 한 판 해 보세요!</div>';
}
const filteredTrials = () => Store.cache.trials.filter(t => G.recFilter === 'all' || t.gameId === G.recFilter);
async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg || '복사했어요'); }
  catch (e) { $('#copyText').value = text; $('#copyBox').classList.add('on'); }
}

/* ---------- 버튼 처리: data-action 이름으로 할 일을 찾아요 ---------- */
const ACTIONS = {
  openCat(el) { openCategory(el.dataset.value); },
  soon() { toast('곧 새 놀이가 생겨요'); },
  openGame(el) { openGame(el.dataset.value); },
  backCat() { openCategory(G.game.category); },
  listen() { Sound.speak(G.game.ruleTalk); },
  ruleOk() { startSession(); },
  sound() { Sound.on = !Sound.on; if (!Sound.on) Sound.stop(); updateSoundBtn(); saveProfile(); },
  skipCount() { Timers.clear(); startRound(); },
  pause() { pauseGame(false); },
  resume() { resumeGame(); },
  quit() { quitSession(goHome); },
  pick(el) { onPick(Number(el.dataset.value)); },
  game(el) { if (G.phase === 'answer' && G.game.handle) G.game.handle(el.dataset.op, el.dataset.value, el); },
  replay() {
    if (G.phase !== 'answer' || G.replayUsed >= 1) return;
    G.replayUsed++; G.picks = [];
    watch(1);
  },
  review() { if (G.phase !== 'feedback') return; G.reviewCount++; watch(1.6); },
  next() { if (G.phase === 'feedback') nextRound(); },
  again() { startSession(); },
  other() { quitSession(() => openCategory(G.game.category)); },
  home() { quitSession(goHome); },
  records() { openRecords(); },
  filter(el) { G.recFilter = el.dataset.value; renderRecords(); },
  brag() {
    const s = Store.cache.sessions.find(x => G.session && x.sessionId === G.session.sessionId);
    const text = s ? `오늘 ${G.game.name} 두뇌 놀이에서 ${s.nTrials}판 중 ${s.correctCount}판을 맞혔어요! 지금 ${levelOf(G.game.id)}단계예요.` : '오늘 두뇌 놀이를 했어요!';
    copyText(text, '자랑 글을 복사했어요. 문자에 붙여 넣어 보내세요');
  },
  async csvSave() {
    if (!Store.downloads) return;
    try { await Store.downloads.save({ filename: `brain-${G.recFilter}-trials.csv`, data: toCSV(filteredTrials()) }); toast('파일을 저장했어요'); }
    catch (e) { if (!e || e.code !== 'declined') toast('파일을 저장하지 못했어요. 복사를 이용해 주세요'); }
  },
  csvCopy() { copyText(toCSV(filteredTrials())); },
  jsonCopy() { copyText(JSON.stringify({ profile: Store.cache.profile, sessions: Store.cache.sessions, trials: Store.cache.trials }, null, 2)); },
  closeCopy() { $('#copyBox').classList.remove('on'); },
  rotateOk() { document.body.classList.add('force-portrait'); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  Sound.unlock();
  const fn = ACTIONS[el.dataset.action];
  if (fn) fn(el);
});
document.addEventListener('change', e => {
  if (e.target.id === 'playerLabel') { G.playerLabel = e.target.value.trim().slice(0, 30); saveProfile(); toast('참여자 표시를 저장했어요'); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(true); });   // 다른 앱으로 가면 잠깐 멈춤
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 200));

/* ---------- 시작! ---------- */
fit();
goHome();
Store.init().then(() => {
  const p = Store.cache.profile;
  if (p && !G.sessionStarted) {               // 지난번 단계와 설정을 이어서
    if (p.levels && typeof p.levels === 'object') Object.keys(p.levels).forEach(k => { const v = p.levels[k]; if (v >= 1 && v <= MAX_LEVEL) G.levels[k] = v; });
    else if (p.level >= 1 && p.level <= MAX_LEVEL) G.levels.towel = p.level;      // 예전 기록(수건돌리기만 있던 때)
    if (typeof p.playerLabel === 'string') G.playerLabel = p.playerLabel;
    if (typeof p.soundOn === 'boolean') Sound.on = p.soundOn;
  }
  if ($('#s-home').classList.contains('on')) renderHome();
  if ($('#s-cat').classList.contains('on') && G.catId) openCategory(G.catId);
});
