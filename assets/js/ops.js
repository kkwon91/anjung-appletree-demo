window.SITE_OPS = {"url":"","site":"anjung","demo":true};
/* ops.js — 관리자(admin/)와 홈페이지를 잇는 다리. 빌드가 맨 앞에 window.SITE_OPS = { url, site, demo } 를 붙인다(site.config.json).
   1) 바로 반영: 관리자에서 저장한 공지 띠·진료시간·임시 휴진을 홈페이지 화면에 그린다.
        운영 모드(url 있음): GET {url}?a=cfg&site={site} → { ok, notice, hours } — 이 탭에 1분 기억(sessionStorage), 답이 없으면 미리 만든 화면 그대로.
        데모 모드(url 없음): 같은 브라우저의 관리자가 남긴 localStorage(anjung_admin_notice · anjung_admin_hours)를 읽는다.
      본문 문장·구조화 데이터는 바꾸지 않는다(운영 담당자가 다시 만들 때 고친다). 진료시간 표가 기본값과 달라졌으면 표 아래에 한 줄 알린다.
   2) 상담 신청: 데모 모드에서는 화면 안내('데모 화면이라 접수되지 않습니다')는 그대로 두고, 이 브라우저에 시험 신청 사본만 남긴다
      (관리자 상담 목록에 '시험'으로 보인다). 운영 모드에서는 사이트 운영 서버 규약 {a:'inq', site, data:{kind:'consult', …}} 로 보내고,
      서버가 저장했다고 답한 뒤에만 '접수했습니다'라고 쓴다.
   3) 방문 기록(사이트 운영 서버 방문 기록 규약 — '준비됨'): 데모(demo:true → body.is-demo)·이 PC 미리보기·?gm=off·로봇·다른 화면 안에서는 아무것도 보내지 않는다. */
(function () {
  'use strict';
  var w = window, d = document;
  var OPS = w.SITE_OPS || {};
  if (!d.body) return;
  if (OPS.demo !== false) d.body.classList.add('is-demo');
  var LIVE = !!OPS.url;

  // ── 1) 바로 반영 ──────────────────────────────────────────────────────────────
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var ORDER = [1, 2, 3, 4, 5, 6, 0];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function korHour(s) { var p = String(s || '0:0').split(':'); var h = +p[0], m = +p[1] || 0; return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + '시' + (m ? ' ' + m + '분' : ''); }
  function korRange(o, c) { var a = korHour(o), b = korHour(c); return a.slice(0, 2) === b.slice(0, 2) ? a + ' ~ ' + b.slice(3) : a + ' ~ ' + b; }
  function today() { var t = new Date(); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); }
  function dateKo(ymd) { var t = new Date(ymd + 'T00:00:00'); return isNaN(t) ? ymd : (t.getMonth() + 1) + '월 ' + t.getDate() + '일(' + DOW[t.getDay()] + ')'; }
  function el(tag, cls, text) { var x = d.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }
  function lsGet(k) { try { var v = w.localStorage.getItem('anjung_admin_' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  function css() {
    if (d.getElementById('ops-style')) return;
    var s = el('style'); s.id = 'ops-style';
    s.textContent = '.ops-band{background:#0870C0;color:#fff;font-size:15px}.ops-band .wrap{display:flex;gap:6px 12px;align-items:center;flex-wrap:wrap;min-height:44px;padding-top:8px;padding-bottom:8px}' +
      '.ops-band b{font-weight:800}.ops-band span{opacity:.92}.ops-band a{color:#fff;font-weight:700;text-underline-offset:3px;display:inline-flex;align-items:center;min-height:32px}' +
      '.hours .ops-sp dt,.hours .ops-sp dd{color:#0870C0}.ops-hours-note{margin:6px 0 0;font-size:14px;color:#0870C0;font-weight:600}';
    d.head.appendChild(s);
  }
  function drawNotice(n) {
    if (!n || !n.on || !n.text) return;
    var t = today();
    if ((n.start && t < n.start) || (n.end && t > n.end)) return;
    css();
    var band = el('div', 'ops-band'); band.setAttribute('role', 'region'); band.setAttribute('aria-label', '병원 공지');
    var wr = el('div', 'wrap');
    wr.appendChild(el('b', '', n.text));
    if (n.more) wr.appendChild(el('span', '', n.more));
    if (n.link) {
      var a = el('a', '', n.linkText || '자세히');
      var rel = (d.querySelector('link[rel=stylesheet][href*="assets/css/site.css"]') || {}).getAttribute ? d.querySelector('link[rel=stylesheet][href*="assets/css/site.css"]').getAttribute('href').replace('assets/css/site.css', '') : '';
      a.href = /^https?:\/\//.test(n.link) || n.link.charAt(0) === '#' ? n.link : rel + n.link;
      if (/^https?:\/\//.test(n.link)) { a.target = '_blank'; a.rel = 'noopener'; }
      wr.appendChild(a);
    }
    band.appendChild(wr);
    var head = d.querySelector('.site-head');
    if (head) head.parentNode.insertBefore(band, head); else d.body.insertBefore(band, d.body.firstChild);
  }
  function drawHours(h) {
    if (!h || !h.days || h.days.length !== 7) return;
    css();
    var sp = (h.special || []).filter(function (x) { return x && x.date && x.date >= today(); });
    Array.prototype.forEach.call(d.querySelectorAll('dl.hours'), function (dl) {
      var html = '';
      ORDER.forEach(function (n) {
        var x = h.days[n]; if (!x || !x.on) return;
        var notes = [];
        if (x.f2) notes.push('2층 ' + korRange(x.f2.o, x.f2.c));
        if (x.ortho) notes.push('교정과 ' + korRange(x.ortho.o, x.ortho.c));
        if (x.noLunch) notes.push('점심시간 없음');
        var main = korRange(x.o, x.c);
        if (x.c > '18:00') { var cut = main.lastIndexOf(' ~ '); main = main.slice(0, cut + 3) + '<span class="late">' + main.slice(cut + 3) + '</span>'; }
        html += '<div><dt>' + DOW[n] + '</dt><dd class="fl">' + esc(x.floor || '전체') + '</dd><dd>' + main + notes.map(function (t) { return '<small>' + esc(t) + '</small>'; }).join('') + '</dd></div>';
      });
      html += '<div><dt>점심</dt><dd class="fl">평일</dd><dd>' + esc(korRange(h.lunch.o, h.lunch.c)) + '</dd></div>';
      html += '<div class="off"><dt>휴진</dt><dd class="fl"></dd><dd>' + esc(h.closed || '') + '</dd></div>';
      sp.forEach(function (x) { html += '<div class="ops-sp"><dt>임시</dt><dd class="fl"></dd><dd>' + esc(dateKo(x.date)) + ' ' + (x.type === 'closed' ? '휴진' : esc(korRange(x.o, x.c)) + ' 진료') + (x.label ? '<small>' + esc(x.label) + '</small>' : '') + '</dd></div>'; });
      dl.innerHTML = html;
      if (!dl.nextElementSibling || !dl.nextElementSibling.classList.contains('ops-hours-note')) {
        var note = el('p', 'ops-hours-note', '진료시간이 바뀌었습니다. 이 표가 가장 새것입니다.');
        dl.parentNode.insertBefore(note, dl.nextSibling);
      }
    });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var drawn = false;
  function draw(cfg) { if (drawn || !cfg) return; drawn = true; drawNotice(cfg.notice); drawHours(cfg.hours); }
  if (!LIVE) {
    draw({ notice: lsGet('notice'), hours: lsGet('hours') });
  } else if (w.fetch) {
    var CK = 'anjung_live_cfg';
    var c = null; try { c = JSON.parse(w.sessionStorage.getItem(CK) || 'null'); } catch (e) { c = null; }
    if (c && c.cfg) draw(c.cfg);
    if (!c || Date.now() - c.t > 60000) {
      w.fetch(OPS.url + '?a=cfg&site=' + encodeURIComponent(OPS.site), { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok) return;
        var cfg = { notice: j.notice || null, hours: j.hours || null };
        try { w.sessionStorage.setItem(CK, JSON.stringify({ t: Date.now(), cfg: cfg })); } catch (e) { /* 기억 못 해도 그린다 */ }
        draw(cfg);
      }).catch(function () { /* 미리 만든 화면 그대로 */ });
    }
  }

  // ── 2) 상담 신청 ─────────────────────────────────────────────────────────────
  function valid(f) { return f.name && f.name.value.trim() && f.tel && /^[0-9-]{9,13}$/.test(f.tel.value.trim()) && f.agree && f.agree.checked; }
  function leadOf(f) {
    return { name: f.name.value.trim().slice(0, 40), phone: f.tel.value.replace(/\D/g, ''), time: f.time ? f.time.value : '', page: location.pathname.replace(/^.*?anjung-appletree-demo/, '').slice(0, 80) || '/', form: f.classList.contains('cform') ? 'consult' : 'cta' };
  }
  d.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !(f.matches('.cta form') || f.matches('form.cform')) || !valid(f)) return;
    var lead = leadOf(f);
    if (!LIVE) {
      // 데모: 화면 안내는 site.js 가 그대로 쓴다. 같은 브라우저의 관리자 데모가 볼 수 있게 사본만 남긴다.
      try {
        var list = JSON.parse(w.localStorage.getItem('anjung_admin_demo_leads') || '[]');
        list.push({ id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: new Date().toISOString(), name: lead.name, phone: lead.phone, time: lead.time, page: lead.page, form: lead.form, status: '신규', memo: '', test: true });
        w.localStorage.setItem('anjung_admin_demo_leads', JSON.stringify(list.slice(-200)));
      } catch (err) { /* 저장소를 못 쓰면 사본 없음 */ }
      return;
    }
    // 운영: 서버가 저장했다고 답한 뒤에만 접수 안내(site.js 의 데모 안내보다 먼저 받는다)
    e.preventDefault(); e.stopImmediatePropagation();
    var msg = f.querySelector('.msg'), btn = f.querySelector('[type=submit]');
    if (btn) btn.disabled = true;
    w.fetch(OPS.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit', body: JSON.stringify({ a: 'inq', site: OPS.site, data: { kind: 'consult', name: lead.name, phone: lead.phone, time: lead.time, page: lead.page, src: lead.form, test: OPS.demo !== false ? 1 : 0 } }) })
      .then(function (r) { return r.json(); }).then(function (j) {
        if (!j || j.ok !== true) throw new Error('fail');
        if (msg) msg.textContent = '상담 신청을 받았습니다. 전화로 연락드리겠습니다.';
        f.reset(); track('form_submit');
      }).catch(function () { if (msg) msg.textContent = '접수하지 못했습니다. 전화 031-683-7575 로 연락해 주세요.'; if (btn) btn.disabled = false; });
  }, true);

  // ── 3) 방문 기록(준비됨) ─────────────────────────────────────────────────────────
  var on = (function () {
    if (!LIVE || d.body.classList.contains('is-demo')) return false;
    try { if (w.top !== w.self) return false; } catch (e) { return false; }
    var l = w.location;
    if ((l.protocol === 'file:' || /^(localhost|127(\.\d+){3}|\[::1\])$/.test(l.hostname)) && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(OPS.url)) return false;
    try { if (/[?&]gm=off(&|$)/.test(l.search)) w.localStorage.setItem('anjung_gm_off', '1'); if (/[?&]gm=on(&|$)/.test(l.search)) w.localStorage.removeItem('anjung_gm_off'); if (w.localStorage.getItem('anjung_gm_off') === '1') return false; } catch (e) { /* 기록은 한다 */ }
    return !/bot|crawl|spider|slurp|headless|lighthouse|preview|monitor/i.test(w.navigator.userAgent || '');
  })();
  var sid = '';
  try { sid = w.sessionStorage.getItem('anjung_ops_sid') || ''; if (!sid) { sid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); w.sessionStorage.setItem('anjung_ops_sid', sid); } } catch (e) { sid = 'x'; }
  var queue = [], timer = 0;
  function flush(leaving) {
    clearTimeout(timer); timer = 0;
    if (!queue.length) return;
    var body = JSON.stringify({ a: 'ev', site: OPS.site, events: queue }); queue = [];
    try { if (leaving && w.navigator.sendBeacon && w.navigator.sendBeacon(OPS.url, new Blob([body], { type: 'text/plain;charset=utf-8' }))) return; w.fetch(OPS.url, { method: 'POST', body: body, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit', keepalive: !!leaving }).catch(function () { /* 통계만 빠짐 */ }); } catch (e) { /* 통계만 빠짐 */ }
  }
  function track(e, x) {
    if (!on) return;
    queue.push({ t: new Date().toISOString(), e: e, s: sid, p: location.pathname.slice(0, 80), x: x || undefined });
    if (!timer) timer = setTimeout(function () { flush(false); }, 4000);
  }
  if (on) {
    var dev = w.matchMedia && w.matchMedia('(max-width: 767px)').matches ? 'm' : 'p';
    try { if (!w.sessionStorage.getItem('anjung_ops_start')) { w.sessionStorage.setItem('anjung_ops_start', '1'); track('start', { d: dev }); } } catch (e) { /* 무시 */ }
    track('pv', { d: dev });
    d.addEventListener('click', function (e) {
      var a = e.target.closest('a, button'); if (!a) return;
      var h = a.getAttribute('href') || '';
      if (/^tel:/.test(h)) track('call');
      else if (/kakao\.com/.test(h)) track('kakao');
      else if (/map\.naver|map\.kakao/.test(h)) track('map');
      else if (a.classList.contains('cta__handle')) track('consult_open');
    });
    d.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('.cta form, form.cform')) { try { if (!w.sessionStorage.getItem('anjung_ops_fs')) { w.sessionStorage.setItem('anjung_ops_fs', '1'); track('form_start'); } } catch (er) { /* 무시 */ } } });
    // 쪽 깊이(10구간 머문 시간·가장 깊이 내려간 곳 %) — 떠날 때 한 건
    var acc = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], maxD = 0, last = Date.now();
    setInterval(function () {
      var now = Date.now(), dt = now - last; last = now;
      if (d.visibilityState === 'hidden' || dt > 5000) return;
      var H = d.documentElement.scrollHeight, top = w.pageYOffset, bot = Math.min(H, top + w.innerHeight);
      maxD = Math.max(maxD, Math.round(bot / H * 100));
      for (var i = 0; i < 10; i++) { var s0 = H * i / 10, s1 = H * (i + 1) / 10; var ov = Math.max(0, Math.min(bot, s1) - Math.max(top, s0)); acc[i] += Math.round(dt * ov / (s1 - s0)); }
    }, 1000);
    var out = function () { if (acc.some(function (v) { return v > 1000; })) { track('depth', { w: acc, m: maxD }); acc = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; } flush(true); };
    w.addEventListener('pagehide', out);
    d.addEventListener('visibilitychange', function () { if (d.visibilityState === 'hidden') out(); });
  }
})();
