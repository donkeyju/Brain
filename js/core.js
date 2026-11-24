'use strict';
/* =========================================================
   core.js - 모든 놀이가 같이 쓰는 도구 모음
   ① 기본 설정·카테고리   ② 난수   ③ 점수 계산
   ④ 기록 저장(Store)     ⑤ 소리   ⑥ 화면 도구   ⑦ 애니메이션(Runner)
   ========================================================= */

const APP_VERSION = '0.12.0';
const ROUNDS_PER_SESSION = 5;     // 한 번에 하는 판 수 (기본값. 놀이마다 rounds: 10 처럼 바꿀 수 있어요)
const roundsOf = g => (g && g.rounds) || ROUNDS_PER_SESSION;
const MAX_LEVEL = 5;

/* ① 카테고리: 홈 화면에 나오는 큰 분류.
   새 놀이는 registerGame({ category: 'memory', ... }) 로 등록하면 자동으로 메뉴에 붙어요. */
const CATEGORIES = [
  { id: 'memory', name: '기억력', desc: '보고, 따라가고,<br>기억하는 놀이', color: '#1F5F6B', bg: '#E1EEEE',
    icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/></svg>' },
  { id: 'focus', name: '집중력', desc: '빠르고 정확하게<br>찾는 놀이', color: '#A3365A', bg: '#FBE8EE',
    icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>' },
  { id: 'calc', name: '계산력', desc: '숫자와 시간을<br>셈하는 놀이', color: '#B8501A', bg: '#FFF1E6',
    icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 7h5M8.5 4.5v5M14 7h5M6 16.5l4 4M10 16.5l-4 4M14 16h5M14 20h5"/></svg>' },
  { id: 'logic', name: '논리력', desc: '규칙과 조건을<br>찾는 놀이', color: '#5B4A8B', bg: '#EEEAF6',
    icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h3.5a2 2 0 1 1 4 0H15v3.5a2 2 0 1 0 0 4V20H4z"/><path d="M15 9V4h5v5h-1.5a2 2 0 1 0-2 0z"/></svg>' },
  { id: 'language', name: '언어력', desc: '낱말과 속담을<br>떠올리는 놀이', color: '#2E7D4F', bg: '#E6F2EA',
    icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H10l-5 4v-4H4z"/><path d="M8 9h8M8 12.5h5"/></svg>' },
  { id: 'space', name: '공간지각', desc: '길과 모양을<br>알아보는 놀이', color: '#8A4F12', bg: '#F8ECD9',
    icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>' },
];
const GAMES = {};                 // 등록된 놀이들
const GAME_ORDER = [];
function registerGame(game) { GAMES[game.id] = game; GAME_ORDER.push(game.id); }
const gamesIn = catId => GAME_ORDER.map(id => GAMES[id]).filter(g => g.category === catId);

/* ② 난수: "씨앗 번호(seed)"가 같으면 항상 같은 순서의 난수가 나와요.
   기록에 seed를 남겨 두면 그 판을 똑같이 다시 만들 수 있어요. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;   // 0 이상 1 미만
  };
}
const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const mod = (a, n) => ((a % n) + n) % n;
const range = n => Array.from({ length: n }, (_, i) => i);
function shuffle(rng, arr) {                 // 카드 섞듯이 순서를 섞어요
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/* 같은 문제 유형이 3판 연속 나오지 않게 골라요 */
function pickType(rng, types, history) {
  let pool = types;
  const last2 = (history || []).slice(-2);
  if (types.length > 1 && last2.length === 2 && last2[0] === last2[1]) pool = types.filter(t => t !== last2[0]);
  return pool[Math.floor(rng() * pool.length)];
}
const newSeed = () => (Date.now() ^ Math.floor(Math.random() * 4294967295)) >>> 0;

/* 한글 도구: 글자를 초성·중성·종성으로 나눠 비슷한 글자 만들기 (말 → 발, 맘), 초성 꺼내기 */
const CHO_LIST = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const SIM_CHO = { 0: [15], 15: [0], 3: [16], 16: [3], 6: [7], 7: [6, 17], 17: [7], 9: [12, 14], 12: [9, 14], 14: [12, 9], 2: [5], 5: [2], 11: [18], 18: [11] };
const SIM_JONG = [0, 1, 4, 8, 16, 21];       // 받침 없음, ㄱ, ㄴ, ㄹ, ㅁ, ㅇ
function hangulParts(ch) {
  const c = ch.charCodeAt(0) - 0xAC00;
  if (c < 0 || c > 11171) return null;
  return { cho: Math.floor(c / 588), jung: Math.floor((c % 588) / 28), jong: c % 28 };
}
const choseong = ch => { const p = hangulParts(ch); return p ? CHO_LIST[p.cho] : ch; };
const hasBatchim = ch => { const p = hangulParts(ch); return !!(p && p.jong); };
function similarSyllable(ch, rng) {
  const p = hangulParts(ch); if (!p) return null;
  const opts = [];
  (SIM_CHO[p.cho] || []).forEach(x => opts.push([x, p.jung, p.jong]));
  SIM_JONG.filter(j => j !== p.jong).forEach(j => opts.push([p.cho, p.jung, j]));
  const [a, b, d] = opts[Math.floor(rng() * opts.length)];
  return String.fromCharCode(0xAC00 + a * 588 + b * 28 + d);
}

/* ③ 점수 계산 (모든 놀이 공통)
   화면에는 감점을 보여주지 않지만, 기록에는 정확도 점수를 그대로 남겨요. */
function orderScore(answer, picks) {          // 두 개를 순서대로 고르는 문제
  if (picks[0] === answer[0] && picks[1] === answer[1]) return 100;   // 순서까지 정확
  if (picks[0] === answer[1] && picks[1] === answer[0]) return 50;    // 둘 다 맞고 순서만 바뀜
  if (picks.some(p => answer.includes(p))) return 25;                 // 하나만 맞음
  return 0;
}
function computeScores(accuracy, replayUsed, level) {
  const replayFactor = replayUsed > 0 ? 0.8 : 1;                      // '한 번 더 보기'를 쓰면 ×0.8
  const trialScore = Math.round(accuracy * replayFactor);
  const levelWeight = Math.round((1 + 0.1 * (level - 1)) * 10) / 10;  // 1단계 1.0 ~ 5단계 1.4
  return { replayFactor, trialScore, levelWeight, weightedScore: Math.round(trialScore * levelWeight) };
}
/* 난이도 자동 조절: 2판 연속 정답 → 한 단계 위, 2판 연속 오답 → 한 단계 아래 */
function adapt(state, right) {
  if (right) { state.streakRight++; state.streakWrong = 0; } else { state.streakWrong++; state.streakRight = 0; }
  let change = 0;
  if (state.streakRight >= 2 && state.level < MAX_LEVEL) { state.level++; change = 1; state.streakRight = 0; }
  else if (state.streakWrong >= 2 && state.level > 1) { state.level--; change = -1; state.streakWrong = 0; }
  return change;
}
/* 판별 기록 → 엑셀용 CSV. 공통 칸 + 놀이마다 다른 칸(detail)을 이어 붙여요 */
const COMMON_COLS = ['trialId', 'sessionId', 'gameId', 'category', 'playerLabel', 'roundNo', 'startedAt', 'answeredAt',
  'level', 'levelAfter', 'questionType', 'seed', 'accuracyScore', 'correct', 'replayUsed', 'reviewCount', 'pauseCount',
  'pauseMs', 'rtFirstMs', 'rtTotalMs', 'trialScore', 'levelWeight', 'weightedScore', 'appVersion'];
function toCSV(rows) {
  const detailCols = [];
  rows.forEach(r => Object.keys(r.detail || {}).forEach(k => { if (!detailCols.includes(k)) detailCols.push(k); }));
  const esc = v => {
    if (v === undefined || v === null) return '';
    if (Array.isArray(v)) v = v.join('|');
    v = String(v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  const head = COMMON_COLS.concat(detailCols.map(k => 'd_' + k));
  const lines = rows.map(r => COMMON_COLS.map(c => esc(r[c])).concat(detailCols.map(k => esc((r.detail || {})[k]))).join(','));
  return '﻿' + [head.join(',')].concat(lines).join('\n');
}
/* 예전(0.3 이하) 수건돌리기 기록을 새 모양으로 맞춰요 */
const LEGACY_TOWEL_KEYS = ['nPeople', 'direction', 'lapSec', 'fakeCount', 'towelCount', 'seatNames', 'choiceOrder', 'answerSeats', 'answerNames', 'chosenSeats', 'chosenNames'];
function normalizeTrial(t) {
  if (t.gameId) return t;
  const detail = {};
  LEGACY_TOWEL_KEYS.forEach(k => { if (k in t) detail[k] = t[k]; });
  return Object.assign({}, t, { gameId: 'towel', category: 'memory', detail });
}
const normalizeSession = s => (s.gameId ? s : Object.assign({}, s, { gameId: 'towel', category: 'memory' }));

/* =========================================================
   ④ 기록 저장(Store)
   - 1순위: Claude 저장소(db)  → 여러 기기에서 이어서 보고, 나중에 분석 가능
   - 2순위: 이 기기 저장(localStorage)
   - 3순위: 임시 저장(새로고침하면 사라짐)
   회사 서버로 옮길 때는 write()와 loadHistory() 두 곳만 바꾸면 돼요.
   ========================================================= */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const withTimeout = (p, ms) => Promise.race([Promise.resolve(p), sleep(ms).then(() => { throw new Error('timeout'); })]);
const safe = (p, ms) => withTimeout(p, ms).catch(() => null);
function upsert(list, item, key) {
  const i = list.findIndex(x => x[key] === item[key]);
  if (i >= 0) list[i] = item; else list.push(item);
}
function mergeById(a, b, key) {
  const map = new Map();
  for (const x of a) map.set(x[key], x);
  for (const x of b) map.set(x[key], x);
  return [...map.values()].sort((x, y) => String(x.startedAt).localeCompare(String(y.startedAt)));
}

const Store = {
  mode: 'memory', db: null, uid: null, downloads: null, ready: false,
  cache: { profile: null, trials: [], sessions: [] },
  queue: Promise.resolve(),
  LS_KEY: 'sugeon-dolligi.v1',          // 예전 이름 그대로 써서 기존 기록을 이어 받아요

  async init() {
    const c = window.claude;
    if (c && typeof c.use === 'function') {
      const [db, user, dl] = await Promise.all([safe(c.use('db'), 10000), safe(c.use('user'), 10000), safe(c.use('downloads'), 10000)]);
      this.downloads = dl || null;
      if (db && user) {
        const uid = await safe(user.id(), 8000);
        if (uid) {
          try {
            const snap = await withTimeout(db.doc('records/' + uid).get(), 10000);
            this.db = db; this.uid = uid; this.mode = 'cloud';
            if (snap.exists) this.cache.profile = Object.assign({}, snap.data());
          } catch (e) { /* 저장소에 닿지 않으면 아래 기기 저장으로 */ }
        }
      }
    }
    if (this.mode !== 'cloud') this.useLocal();
    this.ready = true;
    if (this.mode === 'cloud') this.loadHistory();       // 지난 기록(출제 이력 등)을 뒤에서 불러와요
    for (const s of this.cache.sessions) this.persistSession(s);   // 불러오기 전에 한 판이 있었다면 지금 저장
    for (const t of this.cache.trials) this.persistTrial(t);
  },

  useLocal() {
    try {
      localStorage.setItem(this.LS_KEY + '.test', '1');
      localStorage.removeItem(this.LS_KEY + '.test');
      const saved = JSON.parse(localStorage.getItem(this.LS_KEY) || 'null');
      if (saved) {
        this.cache.profile = this.cache.profile || saved.profile || null;
        this.cache.trials = mergeById((saved.trials || []).map(normalizeTrial), this.cache.trials, 'trialId');
        this.cache.sessions = mergeById((saved.sessions || []).map(normalizeSession), this.cache.sessions, 'sessionId');
      }
      this.mode = 'local';
    } catch (e) { this.mode = 'memory'; }
  },

  saveLocal() {
    if (this.mode !== 'local') return;
    try {
      const c = this.cache;
      localStorage.setItem(this.LS_KEY, JSON.stringify({ profile: c.profile, trials: c.trials.slice(-3000), sessions: c.sessions.slice(-600) }));
    } catch (e) { /* 저장 공간이 꽉 찼거나 막힌 경우: 메모리에는 남아 있어요 */ }
  },

  /* 클라우드 쓰기는 한 번에 하나씩 차례로 */
  write(path, data) {
    if (this.mode !== 'cloud') return;
    const job = async () => {
      if (this.mode !== 'cloud') return;
      try { await this.db.doc(path).set(data); }
      catch (e) {
        if (e && e.code === 'unavailable') {
          await sleep(700 + Math.random() * 800);
          try { await this.db.doc(path).set(data); return; } catch (e2) { e = e2; }
        }
        this.useLocal(); this.saveLocal();      // 쓰기 권한이 없거나 저장소를 못 쓰면 이 기기 저장으로
        toast(this.mode === 'local' ? '기록을 이 기기에 저장할게요' : '기록이 임시로만 남아요');
      }
    };
    this.queue = this.queue.then(job, job);
    return this.queue;
  },
  persistTrial(t) { if (this.mode === 'cloud') this.write('records/' + this.uid + '/trials/' + t.trialId, t); else this.saveLocal(); },
  persistSession(s) { if (this.mode === 'cloud') this.write('records/' + this.uid + '/sessions/' + s.sessionId, s); else this.saveLocal(); },
  saveTrial(t) { upsert(this.cache.trials, t, 'trialId'); if (this.ready) this.persistTrial(t); },
  saveSession(s) { upsert(this.cache.sessions, s, 'sessionId'); if (this.ready) this.persistSession(s); },
  saveProfile(p) {
    this.cache.profile = p;
    if (!this.ready) return;
    if (this.mode === 'cloud') this.write('records/' + this.uid, p); else this.saveLocal();
  },
  /* 기록 화면을 열 때 클라우드에서 최신 기록을 다시 읽어요 */
  async loadHistory() {
    if (this.mode !== 'cloud') return;
    try {
      const base = this.db.doc('records/' + this.uid);
      const [ts, ss] = await Promise.all([
        withTimeout(base.collection('trials').orderBy('startedAt', 'desc').limit(1000).get(), 10000),
        withTimeout(base.collection('sessions').orderBy('startedAt', 'desc').limit(300).get(), 10000),
      ]);
      this.cache.trials = mergeById(ts.docs.map(d => normalizeTrial(d.data())), this.cache.trials, 'trialId');
      this.cache.sessions = mergeById(ss.docs.map(d => normalizeSession(d.data())), this.cache.sessions, 'sessionId');
    } catch (e) { toast('최신 기록을 불러오지 못했어요'); }
  },
};

/* ⑤ 소리: 안내 음성(기기 음성 읽기)과 짧은 효과음 */
const Sound = {
  on: true, ctx: null,
  unlock() {
    try { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) { this.ctx = null; }
  },
  chime(ok) {
    if (!this.on || !this.ctx) return;
    try {
      (ok ? [660, 880] : [440, 392]).forEach((f, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t0 = this.ctx.currentTime + i * 0.16;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
        o.connect(g).connect(this.ctx.destination); o.start(t0); o.stop(t0 + 0.4);
      });
    } catch (e) {}
  },
  pop() {                                       // 과일이 바구니에 쏙 들어갈 때
    if (!this.on || !this.ctx) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t0 = this.ctx.currentTime;
      o.type = 'triangle'; o.frequency.setValueAtTime(520, t0); o.frequency.exponentialRampToValueAtTime(260, t0 + 0.12);
      g.gain.setValueAtTime(0.2, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
      o.connect(g).connect(this.ctx.destination); o.start(t0); o.stop(t0 + 0.16);
    } catch (e) {}
  },
  speak(text) {
    if (!this.on) return;
    try {
      const s = window.speechSynthesis; if (!s) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.9;
      s.speak(u);
    } catch (e) {}
  },
  stop() { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} },
};

/* ⑥ 화면 도구 */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const at = (x, y, html, z) => `<div style="position:absolute;left:${x}px;top:${y}px;${z ? 'z-index:' + z : ''}">${html}</div>`;
function show(id) { $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }
function fit() {
  const s = Math.min(window.innerWidth / 844, window.innerHeight / 390);
  $('#stage').style.transform = 'scale(' + s + ')';
}
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('on'), 2200);
}
const Timers = {
  list: [],
  later(fn, ms) { const id = setTimeout(fn, ms); this.list.push(id); return id; },
  clear() { this.list.forEach(clearTimeout); this.list = []; },
};
const later = (fn, ms) => Timers.later(fn, ms);
const ICON = {
  check: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  replay: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
  pause: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  play: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>',
  arrow: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  half: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  speaker: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  down: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v15"/><path d="M6 13l6 6 6-6"/></svg>',
  finger: '<svg width="40" height="40" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#1F5F6B" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10l5.2.9a2 2 0 0 1 1.6 2.3l-.9 5A3 3 0 0 1 14.9 21H11a3 3 0 0 1-2.4-1.2L5.5 15.6a1.5 1.5 0 0 1 2.2-2L9 15z"/></svg>',
};

/* ⑦ 애니메이션 진행기(Runner)
   놀이는 "t밀리초 때 화면이 어때야 하는지"만 frame(t)로 그리면 돼요.
   멈춤/다시 하기, 진행 막대는 Runner가 알아서 처리해요. */
const Runner = {
  raf: 0, total: 0, start: 0, paused: false, pauseStart: 0, pausedTotal: 0, onFrame: null, done: null,
  get active() { return !!this.onFrame; },
  run(total, onFrame, done) {
    this.stop();
    this.total = total; this.onFrame = onFrame; this.done = done;
    this.start = performance.now(); this.pausedTotal = 0; this.paused = false;
    this.raf = requestAnimationFrame(Runner.tick);
  },
  tick(now) {
    const R = Runner;
    if (!R.onFrame || R.paused) return;
    const t = Math.min(R.total, now - R.start - R.pausedTotal);
    R.onFrame(t);
    const bar = $('#prog'); if (bar) bar.style.width = (t / R.total * 100) + '%';
    if (t >= R.total) { const d = R.done; R.stop(); if (d) d(); return; }
    R.raf = requestAnimationFrame(Runner.tick);
  },
  pause() {
    if (!this.onFrame || this.paused) return false;
    this.paused = true; this.pauseStart = performance.now(); cancelAnimationFrame(this.raf);
    return true;
  },
  resume() {                                  // 멈춰 있던 시간을 돌려줘요
    if (!this.onFrame || !this.paused) return 0;
    const d = performance.now() - this.pauseStart;
    this.pausedTotal += d; this.paused = false;
    this.raf = requestAnimationFrame(Runner.tick);
    return d;
  },
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; this.onFrame = null; this.done = null; this.paused = false; },
};
const easeInOut = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
