/* 안중사과나무치과 관리자 — 바탕: 도구 · 저장(데모=이 브라우저 / 운영=사이트 운영 서버) · 상담 신청 · 화면 전환
   설정 js/config.js → window.AA_OPS = { url, site, demo }  (빌드가 site.config.json 에서 만든다)
   - url 빈 값 = 데모 모드: '데모로 둘러보기'(비밀번호 없음). 고친 값·시험 신청은 이 브라우저 localStorage 에만.
   - url 있음 = 운영 모드: 공용 사이트 운영 서버 규약
       POST text/plain JSON {a:'login', site, id, pw} → {ok, token}(12시간, 이 창에만)
       {a:'admin', site, token, op:'inqList'|'inqStatus'|'inqMemo'|'inqPhone'|'inqDelete'|'cfgGet'|'cfgSet'|'cfgRequest'|'evStats', …}
   지금 값의 바탕(홈페이지에 나가 있는 글자)은 js/seed.js(window.AA_SEED — 빌드가 data/*.json·빌드된 쪽에서 뽑음). 예시·가짜 자료는 없다. */
(function () {
  'use strict';
  var w = window, d = document;
  var C = w.AA_OPS || {};
  var AA = w.AA = { views: {}, actions: {}, seed: w.AA_SEED || {}, mode: C.url ? 'ops' : 'demo', site: C.site || 'anjung', demoSite: C.demo !== false };

  AA.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  AA.clone = function (v) { return v == null ? v : JSON.parse(JSON.stringify(v)); };
  AA.same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  AA.fmt = {
    dt: function (iso) { var t = new Date(iso); if (isNaN(t)) return ''; return t.getFullYear() + '.' + pad(t.getMonth() + 1) + '.' + pad(t.getDate()) + ' ' + pad(t.getHours()) + ':' + pad(t.getMinutes()); },
    date: function (ymd) { var t = new Date(ymd + 'T00:00:00'); if (isNaN(t)) return ymd; return (t.getMonth() + 1) + '월 ' + t.getDate() + '일(' + '일월화수목금토'[t.getDay()] + ')'; },
  };
  /** '14:00' → '오후 2시', '09:30' → '오전 9시 30분' */
  AA.korHour = function (s) { var p = String(s || '0:0').split(':'); var h = +p[0], m = +p[1] || 0; return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + '시' + (m ? ' ' + m + '분' : ''); };
  /** 시간 범위 — 오전·오후가 같으면 뒤쪽은 빼고 쓴다(원본 '오후 2시 ~ 8시' 꼴) */
  AA.korRange = function (o, c) { var a = AA.korHour(o), b = AA.korHour(c); return a.slice(0, 2) === b.slice(0, 2) ? a + ' ~ ' + b.slice(3) : a + ' ~ ' + b; };
  AA.today = function () { var t = new Date(); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); };
  AA.toast = function (msg) { var t = d.getElementById('ad-toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(AA.toast.t); AA.toast.t = setTimeout(function () { t.classList.remove('is-on'); }, 2600); };

  // ── 이 브라우저 저장소(데모 모드의 저장 · 홈페이지 연결 스크립트 assets/js/ops.js 가 같은 키를 읽는다) ─────────
  var P = 'anjung_admin_';
  var LS = AA.ls = {
    get: function (k, def) { try { var v = w.localStorage.getItem(P + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set: function (k, v) { try { w.localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { w.localStorage.removeItem(P + k); } catch (e) { /* 무시 */ } },
  };

  // ── 운영 서버 ─────────────────────────────────────────────────────────────────
  var TOK = 'anjung_admin_token';
  function post(body, ms) {
    if (!C.url) return Promise.reject(new Error('no-server'));
    body.site = AA.site;
    var ctl = typeof w.AbortController === 'function' ? new w.AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, ms || 20000) : 0;
    return w.fetch(C.url, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(t); return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }
  function token() { var v = ''; try { v = w.sessionStorage.getItem(TOK) || ''; } catch (e) { /* 없음 */ } return Number(v.split('.')[0]) > Date.now() ? v : ''; }
  AA.remote = {
    login: function (id, pw) { return post({ a: 'login', id: id, pw: pw }).then(function (r) { if (r && r.ok && r.token) { try { w.sessionStorage.setItem(TOK, r.token); } catch (e) { /* 메모리 없음 */ } } return r || { ok: false }; }); },
    admin: function (op, x) {
      var t = token(); if (!t) return Promise.reject(new Error('login'));
      return post(Object.assign({ a: 'admin', token: t, op: op }, x || {}), 30000).then(function (r) {
        if (r && r.err === 'login') { AA.session.out(); throw new Error('login'); }
        if (!r || !r.ok) throw new Error((r && r.err) || 'fail');
        return r;
      });
    },
  };

  // ── 들어오기 ──────────────────────────────────────────────────────────────────
  AA.session = {
    on: function () { if (AA.mode === 'demo') { try { return w.sessionStorage.getItem('anjung_admin_demo') === '1'; } catch (e) { return false; } } return !!token(); },
    demoIn: function () { try { w.sessionStorage.setItem('anjung_admin_demo', '1'); } catch (e) { /* 탭 저장소 없음 */ } },
    out: function () { try { w.sessionStorage.removeItem('anjung_admin_demo'); w.sessionStorage.removeItem(TOK); } catch (e) { /* 무시 */ } },
  };

  // ── 고친 값(메뉴마다 한 묶음) ────────────────────────────────────────────────────────
  //   live  = 저장하면 홈페이지가 바로 읽는다(진료시간·휴진 / 공지 띠)
  //   build = 반영 대기 → 반영 요청 → 운영 담당자가 확인한 뒤 홈페이지를 다시 만든다(의료진 / 진료 쪽 문구 / 병원 정보)
  //   note  = 관리자 화면끼리만(AI 검색 질문 목록 / 글자 맞추기 점검표)
  var NAMES = ['hours', 'notice', 'doctors', 'pages', 'hospital', 'aeo', 'checks'];
  var KIND = { hours: 'live', notice: 'live', doctors: 'build', pages: 'build', hospital: 'build', aeo: 'note', checks: 'note' };
  AA.LABEL = { hours: '진료시간·휴진', notice: '공지 띠', doctors: '의료진', pages: '진료 쪽 문구', hospital: '병원 정보', aeo: 'AI 검색 노출', checks: '글자 맞추기 점검표' };
  AA.KIND = KIND;
  var S = AA.store = { docs: {}, request: null, loaded: false };
  S.load = function () {
    if (AA.mode === 'demo') {
      NAMES.forEach(function (n) { S.docs[n] = LS.get('doc_' + n, null) || { v: null, rev: '', pub: '' }; });
      S.request = LS.get('request', null);
      S.loaded = true;
      return Promise.resolve();
    }
    return AA.remote.admin('cfgGet').then(function (r) {
      S.docs = {};
      NAMES.forEach(function (n) { var x = (r.docs || {})[n] || {}; S.docs[n] = { v: x.v == null ? null : x.v, rev: x.rev || '', pub: x.pub || '', by: x.by || '' }; });
      S.request = r.request || null;
      S.loaded = true;
    });
  };
  S.get = function (n) { var x = S.docs[n]; return x && x.v != null ? AA.clone(x.v) : null; };
  /** 저장 — 데모: 이 브라우저 / 운영: 서버(알고 있던 판을 함께 보내 다른 창에서 먼저 고쳤으면 거절된다) */
  S.set = function (n, v) {
    var x = S.docs[n] || (S.docs[n] = { v: null, rev: '', pub: '' });
    var at = new Date().toISOString();
    if (AA.mode === 'demo') {
      x.v = v == null ? null : AA.clone(v); x.rev = at; x.at = at;
      LS.set('doc_' + n, x);
      if (KIND[n] === 'live') { if (v == null) LS.del(n); else LS.set(n, v); }   // 홈페이지 연결 스크립트가 읽는 값
      paintPub();
      return Promise.resolve(true);
    }
    return AA.remote.admin('cfgSet', { key: n, value: v, base: x.rev || '' }).then(function (r) {
      x.v = v == null ? null : AA.clone(v); x.rev = r.rev || at; paintPub(); return true;
    }, function (e) {
      if (e && e.message === 'conflict') { AA.toast('다른 창에서 먼저 고친 내용이 있어 새로 불러왔습니다'); return S.load().then(function () { AA.render(); return false; }); }
      AA.toast('저장하지 못했습니다. 인터넷 연결을 확인해 주세요'); return false;
    });
  };
  /** 반영을 기다리는 메뉴 */
  S.pending = function () { return NAMES.filter(function (n) { var x = S.docs[n]; return KIND[n] === 'build' && x && x.rev && x.rev !== x.pub; }); };
  S.requested = function (n) { var q = S.request, x = S.docs[n]; return !!(q && x && (q.keys || []).indexOf(n) > -1 && String(q.at) >= String(x.rev)); };
  S.sendRequest = function (memo) {
    var keys = S.pending();
    if (!keys.length) return Promise.reject(new Error('none'));
    if (AA.mode === 'demo') { S.request = { at: new Date().toISOString(), memo: memo, keys: keys, by: '데모' }; LS.set('request', S.request); paintPub(); return Promise.resolve(S.request); }
    return AA.remote.admin('cfgRequest', { memo: memo }).then(function (r) { S.request = r.request || null; paintPub(); return S.request; });
  };

  // ── 상담 신청 ────────────────────────────────────────────────────────────────
  //   데모: 공개 쪽 연결 스크립트가 이 브라우저에 남긴 시험 신청(anjung_admin_demo_leads) / 운영: 서버 inq*
  var ST = { '신규': '새 신청', '연락함': '연락함', '완료': '완료' };
  AA.ST = ST;
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function fmtPhone(v) { v = digits(v); if (v.length === 11) return v.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3'); if (v.length === 10) return v.replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, '$1-$2-$3'); return v; }
  function norm(r) {
    return { id: String(r.id || ''), at: r.at || new Date().toISOString(), name: String(r.name || '(이름 없음)').slice(0, 40), phone: fmtPhone(r.phone || r.tel), time: String(r.time || ''),
      page: String(r.page || ''), form: String(r.form || ''), status: ST[r.status] ? r.status : '신규', memo: String(r.memo || ''), test: !!r.test };
  }
  var L = AA.leads = { cache: [], state: 'idle' };
  L.load = function () {
    if (AA.mode === 'demo') { L.cache = (LS.get('demo_leads', []) || []).map(norm).sort(function (a, b) { return b.at < a.at ? -1 : 1; }); L.state = 'ok'; return Promise.resolve(); }
    L.state = 'loading';
    return AA.remote.admin('inqList').then(function (r) { L.cache = (r.inquiries || []).map(norm).sort(function (a, b) { return b.at < a.at ? -1 : 1; }); L.state = 'ok'; }, function () { L.state = 'error'; });
  };
  function saveDemo() { LS.set('demo_leads', L.cache.slice().reverse()); }
  L.get = function (id) { return L.cache.filter(function (x) { return x.id === id; })[0]; };
  L.setStatus = function (id, st) {
    var x = L.get(id); if (!x || !ST[st]) return Promise.resolve(false);
    var prev = x.status; x.status = st;
    if (AA.mode === 'demo') { saveDemo(); return Promise.resolve(true); }
    return AA.remote.admin('inqStatus', { id: id, status: st }).then(function () { return true; }, function () { x.status = prev; AA.toast('서버에 저장하지 못했습니다'); return false; });
  };
  L.setMemo = function (id, memo) {
    var x = L.get(id); if (!x) return Promise.resolve(false);
    if (AA.mode === 'demo') { x.memo = memo; saveDemo(); return Promise.resolve(true); }
    return AA.remote.admin('inqMemo', { id: id, memo: memo }).then(function () { x.memo = memo; return true; }, function () { AA.toast('서버에 저장하지 못했습니다'); return false; });
  };
  L.del = function (id) {
    if (AA.mode === 'demo') { L.cache = L.cache.filter(function (x) { return x.id !== id; }); saveDemo(); return Promise.resolve(true); }
    return AA.remote.admin('inqDelete', { id: id }).then(function () { L.cache = L.cache.filter(function (x) { return x.id !== id; }); return true; });
  };
  /** 연락처 보기 — 운영 모드에서는 서버에 열람 기록이 남는다 */
  L.reveal = function (id) { return AA.mode === 'demo' ? Promise.resolve(true) : AA.remote.admin('inqPhone', { id: id }).then(function () { return true; }); };
  L.csv = function (list) {
    var q = function (s) { s = String(s == null ? '' : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var rows = [['받은 때', '이름', '연락처', '연락받기 좋은 시간', '신청한 곳', '상태', '메모', '구분']].concat(list.map(function (x) { return [AA.fmt.dt(x.at), x.name, x.phone, x.time, x.page, ST[x.status], x.memo, x.test ? '시험' : '']; }));
    return '﻿' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n');
  };

  // ── 화면 ─────────────────────────────────────────────────────────────────────
  var main = function () { return d.getElementById('ad-main'); };
  var ROUTES = { dashboard: '대시보드', leads: '상담 신청', visits: '방문 분석', hours: '진료시간·휴진', notice: '공지 띠', doctors: '의료진', pages: '진료 쪽 문구', hospital: '병원 정보', aeo: 'AI 검색 노출' };
  AA.route = function () { var m = /^#\/([a-z]+)/.exec(w.location.hash || ''); return m && ROUTES[m[1]] ? m[1] : 'dashboard'; };
  AA.render = function () {
    var r = AA.route();
    d.getElementById('ad-where').textContent = ROUTES[r];
    Array.prototype.forEach.call(d.querySelectorAll('.ad-nav a'), function (a) { if (a.getAttribute('data-route') === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var view = AA.views[r];
    main().innerHTML = view ? view() : '';
    d.title = ROUTES[r] + ' | 안중사과나무치과 관리자';
    if (view && view.after) view.after(main());
    badges(); paintPub();
  };
  function badges() {
    var n = L.cache.filter(function (x) { return x.status === '신규'; }).length;
    var b = d.querySelector('[data-count="leads"]'); if (b) b.textContent = n ? String(n) : '';
  }
  AA.badges = badges;
  function paintPub() {
    var b = d.getElementById('ad-pub'); if (!b) return;
    var p = S.loaded ? S.pending() : [];
    b.hidden = !p.length;
    b.textContent = '홈페이지 반영 대기 ' + p.length;
  }
  AA.paintPub = paintPub;
  /** 화면 위쪽 안내 한 줄 — 이 화면의 저장이 홈페이지에 어떻게 나가는지 */
  AA.pubNote = function (n) {
    var k = KIND[n], txt;
    if (k === 'live') txt = '저장하면 <b>홈페이지에 바로 반영</b>됩니다.' + (AA.mode === 'demo' ? ' 데모 모드에서는 이 브라우저로 여는 데모 홈페이지에만 보입니다.' : ' (길어도 1분)');
    else if (k === 'note') txt = '이 화면의 내용은 관리자 화면끼리만 나눕니다. 홈페이지에는 나가지 않습니다.';
    else if (S.pending().indexOf(n) > -1) txt = '<b>홈페이지 반영 대기</b> — 저장한 내용은 운영 담당자가 확인한 뒤 홈페이지에 반영합니다. ' + (S.requested(n) ? '반영 요청을 보냈습니다(' + AA.esc(AA.fmt.dt(S.request.at)) + ').' : '<button class="ad-linkbtn" type="button" data-act="pub-open">반영 요청 보내기</button>');
    else txt = '저장하면 <b>홈페이지 반영 대기</b>가 됩니다. 운영 담당자가 확인한 뒤 홈페이지를 다시 만들어 반영합니다.';
    return '<p class="ad-note" data-pub-note="' + n + '">' + txt + '</p>';
  };

  // 반영 요청 서랍
  AA.layer = function (html) { var l = d.getElementById('ad-layer'); l.innerHTML = html ? '<div class="ad-dim" data-act="layer-close"></div><section class="ad-drawer" role="dialog" aria-modal="true" aria-labelledby="ad-drawer-h">' + html + '</section>' : ''; if (html) { var f = l.querySelector('textarea,button'); if (f) f.focus(); } };
  AA.actions['layer-close'] = function () { AA.layer(''); };
  AA.actions['pub-open'] = function () {
    var p = S.pending();
    AA.layer('<h2 id="ad-drawer-h">홈페이지 반영을 기다리는 변경</h2>' +
      '<p class="ad-note">진료시간·휴진과 공지 띠는 저장하면 바로 반영됩니다. 아래 메뉴는 화면 글자와 검색·AI 가 읽는 구조화 데이터(JSON-LD)를 함께 바꾸고 의료광고 표현을 확인해야 해서, 운영 담당자가 확인한 뒤 홈페이지를 다시 만들어 반영합니다.</p>' +
      (p.length ? '<ul class="ad-publist">' + p.map(function (n) { var x = S.docs[n]; return '<li><a href="#/' + n + '" data-act="layer-close">' + AA.esc(AA.LABEL[n]) + '</a><span>' + AA.esc(AA.fmt.dt(x.rev)) + (S.requested(n) ? ' · 요청함' : '') + '</span></li>'; }).join('') + '</ul>' +
        '<label class="ad-field"><span class="ad-field__label">운영 담당자에게 남길 말(선택)</span><textarea class="ad-input" id="pub-memo" rows="3" maxlength="500"></textarea></label>' : '<p class="ad-empty">반영을 기다리는 변경이 없습니다.</p>') +
      (AA.mode === 'demo' ? '<p class="ad-hint">데모 모드에서는 요청이 이 브라우저에만 남고 운영 담당자에게 가지 않습니다.</p>' : '') +
      '<div class="ad-drawer__foot"><button class="ad-btn ad-btn--line" type="button" data-act="layer-close">닫기</button>' + (p.length ? '<button class="ad-btn ad-btn--ink" type="button" data-act="pub-send">반영 요청 보내기</button>' : '') + '</div>');
  };
  AA.actions['pub-send'] = function () {
    var memo = (d.getElementById('pub-memo') || {}).value || '';
    S.sendRequest(memo).then(function () { AA.layer(''); AA.toast('반영 요청을 보냈습니다'); AA.render(); }, function () { AA.toast('요청을 보내지 못했습니다'); });
  };
  AA.actions['nav-open'] = function () { d.body.classList.add('nav-on'); d.querySelector('.ad-scrim').hidden = false; };
  AA.actions['nav-close'] = function () { d.body.classList.remove('nav-on'); d.querySelector('.ad-scrim').hidden = true; };
  AA.actions.logout = function () { AA.session.out(); w.location.hash = ''; boot(); };
  AA.actions['demo-in'] = function () { AA.session.demoIn(); boot(); };

  d.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var f = AA.actions[el.getAttribute('data-act')]; if (!f) return;
    if (el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href').charAt(0) !== '#') return;
    if (el.tagName !== 'A') e.preventDefault();
    f(el, e);
  });
  w.addEventListener('hashchange', function () { if (AA.session.on()) { AA.actions['nav-close'](); AA.render(); main().focus(); } });
  // 다른 탭(데모 홈페이지)에서 시험 신청이 들어오면 목록을 새로 그린다
  w.addEventListener('storage', function (e) { if (AA.mode === 'demo' && e.key === P + 'demo_leads' && AA.session.on()) L.load().then(AA.render); });

  function boot() {
    var on = AA.session.on();
    d.getElementById('ad-login').hidden = on;
    d.getElementById('ad-app').hidden = !on;
    if (!on) {
      d.getElementById('ad-login-demo').hidden = AA.mode !== 'demo';
      d.getElementById('ad-login-form').hidden = AA.mode === 'demo';
      return;
    }
    d.getElementById('ad-mode').innerHTML = AA.mode === 'demo' ? '<b>데모 모드</b> — 고친 내용과 시험 신청은 이 브라우저에만 남습니다.' : '상담 신청과 고친 내용은 사이트 운영 서버에 저장됩니다.';
    main().innerHTML = '<p class="ad-empty">불러오는 중…</p>';
    Promise.all([S.load(), L.load()]).then(AA.render, function () { main().innerHTML = '<p class="ad-empty">운영 서버에서 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.</p>'; });
  }
  var form = d.getElementById('ad-login-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = d.getElementById('ad-login-err'); err.hidden = true;
    AA.remote.login(form.id.value.trim(), form.pw.value).then(function (r) {
      if (r.ok) { form.pw.value = ''; boot(); return; }
      err.textContent = r.err === 'locked' ? '여러 번 틀려 잠시 잠겼습니다. 10분 뒤 다시 해 주세요.' : '아이디나 비밀번호가 맞지 않습니다.'; err.hidden = false;
    }, function () { err.textContent = '운영 서버에 연결하지 못했습니다.'; err.hidden = false; });
  });
  AA.boot = boot;
  d.addEventListener('DOMContentLoaded', boot);
})();
