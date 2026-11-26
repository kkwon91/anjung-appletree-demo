/* 안중사과나무치과 관리자 — 메뉴 화면(대시보드 · 상담 신청 · 방문 분석 · 진료시간·휴진 · 공지 띠 · 의료진 · 진료 쪽 문구 · 병원 정보 · AI 검색 노출)
   지금 값의 바탕은 AA.seed(홈페이지에 나가 있는 글자). 예시 상담·예시 숫자·예시 그래프·예시 초안은 넣지 않는다 — 없으면 빈 상태. */
(function () {
  'use strict';
  var w = window, d = document;
  var AA = w.AA, esc = AA.esc, S = AA.store, L = AA.leads, SEED = AA.seed;
  var V = AA.views, A = AA.actions;
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var ORDER = [1, 2, 3, 4, 5, 6, 0];
  var head = function (title, lead, n) { return '<header class="ad-head"><h1>' + esc(title) + '</h1>' + (lead ? '<p>' + lead + '</p>' : '') + '</header>' + (n ? AA.pubNote(n) : ''); };
  var empty = function (t) { return '<p class="ad-empty">' + t + '</p>'; };
  var cur = function (n, def) { var v = S.get(n); return v == null ? AA.clone(def) : v; };

  // ───────────────────────────── 대시보드(실제 저장 건수만)
  V.dashboard = function () {
    var c = { '신규': 0, '연락함': 0, '완료': 0 };
    L.cache.forEach(function (x) { c[x.status]++; });
    var p = S.pending();
    var h = S.get('hours'), nt = S.get('notice');
    var sp = (h && h.special || []).filter(function (x) { return x.date >= AA.today(); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var noticeOn = nt && nt.on && nt.text && (!nt.end || nt.end >= AA.today());
    var card = function (k, v, sub, href) { return '<a class="ad-card" href="' + href + '"><span class="ad-card__k">' + esc(k) + '</span><b class="ad-card__v">' + v + '</b><span class="ad-card__s">' + sub + '</span></a>'; };
    return head('대시보드', AA.mode === 'demo' ? '데모 모드입니다. 아래 숫자는 이 브라우저에 저장된 것만 셉니다.' : '') +
      '<div class="ad-cards">' +
        card('새 상담 신청', c['신규'] + '<small>건</small>', '연락함 ' + c['연락함'] + ' · 완료 ' + c['완료'], '#/leads') +
        card('홈페이지 반영 대기', p.length + '<small>개 메뉴</small>', p.length ? esc(p.map(function (n) { return AA.LABEL[n]; }).join(' · ')) : '기다리는 변경 없음', '#/' + (p[0] || 'pages')) +
        card('진료시간·휴진', h ? '바꿈' : '원래대로', sp.length ? '임시 휴진·단축 ' + sp.length + '건 · 가장 가까운 날 ' + esc(AA.fmt.date(sp[0].date)) : '임시 휴진·단축 없음', '#/hours') +
        card('공지 띠', noticeOn ? '켜짐' : '꺼짐', noticeOn ? esc(nt.text) : '홈페이지 맨 위 공지 없음', '#/notice') +
      '</div>' +
      '<section class="ad-panel"><h2>방문 분석 <span class="ad-tag">준비됨</span></h2><p>' + (AA.demoSite ? '지금은 데모 주소라 방문 기록을 보내지 않습니다. 실제 주소로 옮긴 날부터 쌓입니다.' : '방문 기록이 쌓이면 ‘방문 분석’에서 볼 수 있습니다.') + ' <a href="#/visits">무엇을 재는지 보기</a></p></section>';
  };

  // ───────────────────────────── 상담 신청
  var filter = 'all', shown = {};
  function mask(p) { return p.replace(/^(\d{2,3})-(\d{3,4})-(\d{4})$/, '$1-****-$3'); }
  V.leads = function () {
    var all = L.cache;
    var cnt = { all: all.length, '신규': 0, '연락함': 0, '완료': 0 };
    all.forEach(function (x) { cnt[x.status]++; });
    var list = filter === 'all' ? all : all.filter(function (x) { return x.status === filter; });
    var tabs = [['all', '전체'], ['신규', '새 신청'], ['연락함', '연락함'], ['완료', '완료']].map(function (t) { return '<button type="button" class="ad-tab" data-act="lead-filter" data-f="' + t[0] + '"' + (filter === t[0] ? ' aria-pressed="true"' : '') + '>' + t[1] + ' <span>' + cnt[t[0]] + '</span></button>'; }).join('');
    var rows = list.map(function (x) {
      var phone = shown[x.id] ? '<a href="tel:' + esc(x.phone.replace(/\D/g, '')) + '">' + esc(x.phone) + '</a>' : esc(mask(x.phone)) + ' <button class="ad-linkbtn" type="button" data-act="lead-reveal" data-id="' + esc(x.id) + '">보기</button>';
      return '<div class="ad-row" data-id="' + esc(x.id) + '">' +
        '<span class="c-at" data-k="받은 때">' + esc(AA.fmt.dt(x.at)) + '</span>' +
        '<span class="c-name" data-k="이름"><b>' + esc(x.name) + '</b>' + (x.test ? '<span class="ad-tag" title="이 브라우저에서 넣은 시험 신청">시험</span>' : '') + '</span>' +
        '<span class="c-phone" data-k="연락처">' + phone + '</span>' +
        '<span class="c-time" data-k="연락받기 좋은 시간">' + esc(x.time || '—') + '</span>' +
        '<span class="c-page" data-k="신청한 곳">' + esc(x.form === 'cta' ? '상담 띠' : x.form === 'consult' ? '상담 신청 쪽' : '') + (x.page ? '<small>' + esc(x.page) + '</small>' : '') + '</span>' +
        '<span class="c-st" data-k="상태"><select class="ad-input ad-input--sm" data-lead-status aria-label="상태">' + Object.keys(AA.ST).map(function (k) { return '<option value="' + k + '"' + (x.status === k ? ' selected' : '') + '>' + AA.ST[k] + '</option>'; }).join('') + '</select></span>' +
        '<span class="c-memo" data-k="메모"><input class="ad-input ad-input--sm" data-lead-memo maxlength="300" value="' + esc(x.memo) + '" aria-label="메모" placeholder="통화 내용 등"></span>' +
        '<span class="c-del"><button class="ad-linkbtn ad-linkbtn--warn" type="button" data-act="lead-del" data-id="' + esc(x.id) + '">지우기</button></span>' +
      '</div>';
    }).join('');
    var none = AA.mode === 'demo'
      ? '아직 들어온 상담 신청이 없습니다. 실제 주소로 옮긴 날부터 쌓입니다.<br>데모 모드에서는 이 브라우저로 연 데모 홈페이지의 상담 띠나 ‘상담 신청’ 쪽에서 넣은 시험 신청이 여기에 보입니다.'
      : (L.state === 'error' ? '운영 서버에서 목록을 불러오지 못했습니다.' : '아직 들어온 상담 신청이 없습니다.');
    return head('상담 신청', '연락한 뒤 상태와 메모를 남겨 두면 다른 담당자도 이어서 볼 수 있습니다.' + (AA.mode === 'demo' ? ' 데모 모드의 신청은 모두 <b>시험 신청</b>입니다.' : '')) +
      '<div class="ad-bar"><div class="ad-tabs" role="group" aria-label="상태로 거르기">' + tabs + '</div><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="leads-csv"' + (list.length ? '' : ' disabled') + '>CSV 내려받기</button></div>' +
      (list.length ? '<div class="ad-rows ad-rows--leads"><div class="ad-row ad-row--head" aria-hidden="true"><span>받은 때</span><span>이름</span><span>연락처</span><span>연락받기 좋은 시간</span><span>신청한 곳</span><span>상태</span><span>메모</span><span></span></div>' + rows + '</div>' : empty(none));
  };
  V.leads.after = function (root) {
    root.addEventListener('change', function (e) {
      var row = e.target.closest('.ad-row'); if (!row) return;
      var id = row.getAttribute('data-id');
      if (e.target.hasAttribute('data-lead-status')) L.setStatus(id, e.target.value).then(function (ok) { if (ok) { AA.toast('상태를 ‘' + AA.ST[e.target.value] + '’(으)로 바꿨습니다'); AA.badges(); } });
      if (e.target.hasAttribute('data-lead-memo')) L.setMemo(id, e.target.value.trim()).then(function (ok) { if (ok) AA.toast('메모를 저장했습니다'); });
    });
  };
  A['lead-filter'] = function (el) { filter = el.getAttribute('data-f'); AA.render(); };
  A['lead-reveal'] = function (el) { var id = el.getAttribute('data-id'); L.reveal(id).then(function () { shown[id] = true; AA.render(); }); };
  A['lead-del'] = function (el) { var id = el.getAttribute('data-id'); var x = L.get(id); if (!x || !w.confirm('‘' + x.name + '’ 신청을 지울까요? 되돌릴 수 없습니다.')) return; L.del(id).then(function () { AA.toast('지웠습니다'); AA.render(); }); };
  A['leads-csv'] = function () {
    var list = filter === 'all' ? L.cache : L.cache.filter(function (x) { return x.status === filter; });
    var blob = new Blob([L.csv(list)], { type: 'text/csv;charset=utf-8' });
    var a = d.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'anjung-consult-' + AA.today() + '.csv';
    d.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  // ───────────────────────────── 방문 분석(준비됨 — 사이트 운영 서버 방문 기록 규약)
  V.visits = function () {
    var what = ['새 방문(들어온 곳: 검색·AI 답·네이버·카카오 등, PC·휴대폰)', '본 쪽', '상담 띠를 연 횟수 · 신청서를 쓰기 시작한 횟수 · 신청 완료(서버가 저장한 뒤, 시험 신청 제외)', '전화 · 카카오톡 · 지도 앱 단추를 누른 횟수', '쪽마다 어디까지 내려 읽었는지(10구간, 머문 시간)'];
    return head('방문 분석', '홈페이지에서 상담 신청까지 어디서 빠지는지, 쪽마다 어디까지 읽는지를 보는 화면입니다.') +
      '<section class="ad-panel"><h2>지금 상태 <span class="ad-tag">준비됨</span></h2><p>' + (AA.demoSite ? '지금은 데모 주소라 방문 기록을 보내지 않습니다. 실제 주소로 옮긴 날부터 쌓입니다.' : '방문 기록을 받는 중입니다. 기록이 쌓이는 대로 아래에 횟수가 나옵니다.') + '</p></section>' +
      '<section class="ad-panel"><h2>재는 것</h2><ul class="ad-list">' + what.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      '<p class="ad-hint">이름·연락처·적은 내용·주소의 ? 뒤는 보내지 않고, 쿠키를 쓰지 않습니다. 방문 번호는 탭을 닫으면 사라지는 값입니다. 병원 직원은 주소 끝에 ?gm=off 를 붙여 한 번 열면 그 브라우저의 방문을 빼고 셉니다.</p></section>' +
      '<div id="ad-visits"></div>';
  };
  V.visits.after = function (root) {
    if (AA.mode === 'demo' || AA.demoSite) return;
    var box = root.querySelector('#ad-visits');
    AA.remote.admin('evStats', { days: 30 }).then(function (r) {
      var t = r.totals || {};
      var keys = Object.keys(t);
      box.innerHTML = '<section class="ad-panel"><h2>최근 30일</h2>' + (keys.length ? '<dl class="ad-dl">' + keys.map(function (k) { return '<div><dt>' + esc(k) + '</dt><dd>' + esc(t[k]) + '</dd></div>'; }).join('') + '</dl>' : '<p>아직 기록이 없습니다.</p>') + '</section>';
    }, function () { box.innerHTML = empty('방문 기록을 불러오지 못했습니다.'); });
  };

  // ───────────────────────────── 진료시간·휴진(바로 반영)
  function hoursNow() { return cur('hours', SEED.hours); }
  function timeIn(name, v, label) { return '<input class="ad-input ad-input--time" type="time" step="1800" name="' + name + '" value="' + esc(v || '') + '" aria-label="' + esc(label) + '">'; }
  function rangeIn(prefix, r, label) { return '<span class="ad-range">' + timeIn(prefix + '-o', r && r.o, label + ' 시작') + '<span>~</span>' + timeIn(prefix + '-c', r && r.c, label + ' 끝') + '</span>'; }
  function hoursPreview(h) {
    var rows = ORDER.filter(function (n) { return h.days[n] && h.days[n].on; }).map(function (n) {
      var x = h.days[n]; var notes = [];
      if (x.f2) notes.push('2층 ' + AA.korRange(x.f2.o, x.f2.c));
      if (x.ortho) notes.push('교정과 ' + AA.korRange(x.ortho.o, x.ortho.c));
      if (x.noLunch) notes.push('점심시간 없음');
      return '<tr><th>' + DOW[n] + '</th><td>' + esc(x.floor) + '</td><td>' + esc(AA.korRange(x.o, x.c)) + notes.map(function (t) { return '<small>' + esc(t) + '</small>'; }).join('') + '</td></tr>';
    }).join('');
    var sp = (h.special || []).filter(function (x) { return x.date >= AA.today(); });
    return '<table class="ad-table ad-table--preview"><tbody>' + rows +
      '<tr><th>점심</th><td>평일</td><td>' + esc(AA.korRange(h.lunch.o, h.lunch.c)) + '</td></tr>' +
      '<tr><th>휴진</th><td></td><td>' + esc(h.closed) + '</td></tr>' +
      sp.map(function (x) { return '<tr class="is-sp"><th>' + esc(AA.fmt.date(x.date)) + '</th><td></td><td>' + (x.type === 'closed' ? '휴진' : esc(AA.korRange(x.o, x.c)) + ' 단축 진료') + (x.label ? '<small>' + esc(x.label) + '</small>' : '') + '</td></tr>'; }).join('') +
      '</tbody></table>';
  }
  V.hours = function () {
    var h = hoursNow();
    var day = function (n) {
      var x = h.days[n] || { on: false, floor: '전체', o: '09:00', c: '18:00' };
      return '<div class="ad-hrow" data-dow="' + n + '">' +
        '<span class="h-day">' + DOW[n] + '</span>' +
        '<label class="h-on"><input type="checkbox" name="on"' + (x.on ? ' checked' : '') + '> 진료</label>' +
        '<span class="h-fl"><select class="ad-input ad-input--sm" name="floor" aria-label="' + DOW[n] + '요일 진료 층">' + ['전체', '2층', '3층'].map(function (f) { return '<option' + (x.floor === f ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select></span>' +
        '<span class="h-t">' + rangeIn('t', x, DOW[n] + '요일 진료') + '</span>' +
        '<span class="h-x"><span class="h-f2"><label><input type="checkbox" name="f2on"' + (x.f2 ? ' checked' : '') + '> 2층 따로</label>' + rangeIn('f2', x.f2, DOW[n] + '요일 2층') + '</span>' +
        '<span class="h-or"><label><input type="checkbox" name="oron"' + (x.ortho ? ' checked' : '') + '> 교정과</label>' + rangeIn('or', x.ortho, DOW[n] + '요일 교정과') + '</span>' +
        '<label class="h-nl"><input type="checkbox" name="nolunch"' + (x.noLunch ? ' checked' : '') + '> 점심시간 없음</label></span>' +
      '</div>';
    };
    var sp = (h.special || []).map(function (x, i) {
      return '<div class="ad-sprow" data-i="' + i + '"><input class="ad-input ad-input--sm" type="date" name="date" value="' + esc(x.date) + '" aria-label="날짜">' +
        '<select class="ad-input ad-input--sm" name="type" aria-label="종류"><option value="closed"' + (x.type === 'closed' ? ' selected' : '') + '>휴진</option><option value="hours"' + (x.type === 'hours' ? ' selected' : '') + '>단축 진료</option></select>' +
        rangeIn('sp', x, '단축 진료') + '<input class="ad-input ad-input--sm" name="label" maxlength="40" value="' + esc(x.label || '') + '" placeholder="안내 한 줄(선택)" aria-label="안내 한 줄">' +
        '<button class="ad-linkbtn ad-linkbtn--warn" type="button" data-act="sp-del" data-i="' + i + '">빼기</button></div>';
    }).join('');
    return head('진료시간·휴진', '층마다 진료하는 요일과 시간이 다릅니다. 요일별 기본 시간과 임시 휴진·단축 진료일을 고칩니다.', 'hours') +
      '<form id="hours-form" class="ad-form" novalidate>' +
        '<div class="ad-hrows"><div class="ad-hrow ad-hrow--head" aria-hidden="true"><span>요일</span><span>진료</span><span>진료 층</span><span>진료시간</span><span>층·과별 시간</span></div>' + ORDER.map(day).join('') + '</div>' +
        '<div class="ad-grid2"><label class="ad-field"><span class="ad-field__label">평일 점심시간</span>' + rangeIn('lunch', h.lunch, '점심시간') + '</label>' +
        '<label class="ad-field"><span class="ad-field__label">휴진 안내</span><input class="ad-input" name="closed" maxlength="40" value="' + esc(h.closed) + '"></label></div>' +
        '<h2 class="ad-h2">임시 휴진·단축 진료일</h2>' + (sp ? '<div class="ad-sprows">' + sp + '</div>' : '<p class="ad-hint">정해 둔 날이 없습니다.</p>') +
        '<p><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="sp-add">날짜 더하기</button></p>' +
        '<p class="ad-err" id="hours-err" role="alert" hidden></p>' +
        '<div class="ad-actions"><button class="ad-btn ad-btn--ink" type="submit">저장</button>' + (S.get('hours') ? '<button class="ad-btn ad-btn--line" type="button" data-act="hours-reset">원래대로</button>' : '') + '</div>' +
      '</form>' +
      '<h2 class="ad-h2">홈페이지에 보일 진료시간</h2>' + hoursPreview(h);
  };
  function readHours(f) {
    var h = hoursNow(); var err = [];
    var rng = function (el, p) { var o = el.querySelector('[name="' + p + '-o"]').value, c = el.querySelector('[name="' + p + '-c"]').value; return o && c ? { o: o, c: c } : null; };
    Array.prototype.forEach.call(f.querySelectorAll('.ad-hrow[data-dow]'), function (el) {
      var n = +el.getAttribute('data-dow');
      var t = rng(el, 't');
      var x = { dow: n, on: el.querySelector('[name=on]').checked, floor: el.querySelector('[name=floor]').value, o: t ? t.o : '', c: t ? t.c : '', f2: el.querySelector('[name=f2on]').checked ? rng(el, 'f2') : null, ortho: el.querySelector('[name=oron]').checked ? rng(el, 'or') : null, noLunch: el.querySelector('[name=nolunch]').checked };
      if (x.on && (!t || t.o >= t.c)) err.push(DOW[n] + '요일 진료시간을 확인해 주세요');
      [['f2', '2층'], ['ortho', '교정과']].forEach(function (k) { if (x.on && el.querySelector('[name=' + (k[0] === 'f2' ? 'f2on' : 'oron') + ']').checked && (!x[k[0]] || x[k[0]].o >= x[k[0]].c)) err.push(DOW[n] + '요일 ' + k[1] + ' 시간을 확인해 주세요'); });
      h.days[n] = x;
    });
    var lu = rng(f, 'lunch'); if (!lu || lu.o >= lu.c) err.push('점심시간을 확인해 주세요'); else h.lunch = lu;
    h.closed = f.closed.value.trim() || SEED.hours.closed;
    h.special = Array.prototype.map.call(f.querySelectorAll('.ad-sprow'), function (el) {
      var x = { date: el.querySelector('[name=date]').value, type: el.querySelector('[name=type]').value, label: el.querySelector('[name=label]').value.trim() };
      var r = rng(el, 'sp'); if (x.type === 'hours') { if (!r || r.o >= r.c) err.push((x.date || '날짜') + ' 단축 진료 시간을 확인해 주세요'); else { x.o = r.o; x.c = r.c; } }
      if (!x.date) err.push('임시 휴진·단축 날짜를 넣어 주세요');
      return x;
    }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    return { h: h, err: err };
  }
  V.hours.after = function (root) {
    var f = root.querySelector('#hours-form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = readHours(f); var box = root.querySelector('#hours-err');
      if (r.err.length) { box.textContent = r.err.join(' · '); box.hidden = false; return; }
      S.set('hours', AA.same(r.h, SEED.hours) ? null : r.h).then(function (ok) { if (ok) { AA.toast('저장했습니다. 홈페이지에 바로 반영됩니다'); AA.render(); } });
    });
  };
  A['sp-add'] = function () { var f = d.getElementById('hours-form'); var r = readHours(f); r.h.special.push({ date: '', type: 'closed', label: '' }); tempHours = r.h; renderTemp(); };
  A['sp-del'] = function (el) { var f = d.getElementById('hours-form'); var r = readHours(f); r.h.special.splice(+el.getAttribute('data-i'), 1); tempHours = r.h; renderTemp(); };
  var tempHours = null;
  function renderTemp() { var keep = hoursNow; hoursNow = function () { return tempHours; }; AA.render(); hoursNow = keep; tempHours = null; }
  A['hours-reset'] = function () { if (!w.confirm('진료시간을 홈페이지에 처음 실린 값으로 되돌릴까요?')) return; S.set('hours', null).then(function () { AA.toast('원래대로 되돌렸습니다'); AA.render(); }); };

  // ───────────────────────────── 공지 띠(바로 반영)
  V.notice = function () {
    var n = cur('notice', { on: false, text: '', more: '', link: '', linkText: '', start: '', end: '' });
    return head('공지 띠', '홈페이지 모든 쪽 맨 위에 한 줄 공지를 띄웁니다. 휴진·진료시간 변경처럼 꼭 알려야 할 것만 짧게 씁니다.', 'notice') +
      '<form id="notice-form" class="ad-form" novalidate>' +
        '<label class="ad-check"><input type="checkbox" name="on"' + (n.on ? ' checked' : '') + '> 공지 띠 켜기</label>' +
        '<label class="ad-field"><span class="ad-field__label">문구 <small data-count-for="text">' + n.text.length + ' / 60</small></span><input class="ad-input" name="text" maxlength="60" value="' + esc(n.text) + '" placeholder="예: 12월 25일(목)은 휴진합니다"></label>' +
        '<label class="ad-field"><span class="ad-field__label">덧말(선택) <small data-count-for="more">' + (n.more || '').length + ' / 60</small></span><input class="ad-input" name="more" maxlength="60" value="' + esc(n.more) + '"></label>' +
        '<div class="ad-grid2"><label class="ad-field"><span class="ad-field__label">링크 주소(선택)</span><input class="ad-input" name="link" value="' + esc(n.link) + '" placeholder="예: visit/ 또는 https://…"></label>' +
        '<label class="ad-field"><span class="ad-field__label">링크 글자</span><input class="ad-input" name="linkText" maxlength="12" value="' + esc(n.linkText) + '" placeholder="자세히"></label></div>' +
        '<div class="ad-grid2"><label class="ad-field"><span class="ad-field__label">보이기 시작하는 날(선택)</span><input class="ad-input" type="date" name="start" value="' + esc(n.start) + '"></label>' +
        '<label class="ad-field"><span class="ad-field__label">마지막 날(선택)</span><input class="ad-input" type="date" name="end" value="' + esc(n.end) + '"></label></div>' +
        '<p class="ad-err" id="notice-err" role="alert" hidden></p>' +
        '<div class="ad-actions"><button class="ad-btn ad-btn--ink" type="submit">저장</button></div>' +
      '</form>' +
      '<h2 class="ad-h2">미리 보기</h2><div class="ad-band" id="notice-pv"></div>';
  };
  V.notice.after = function (root) {
    var f = root.querySelector('#notice-form'), pv = root.querySelector('#notice-pv');
    var read = function () { return { on: f.on.checked, text: f.text.value.trim(), more: f.more.value.trim(), link: f.link.value.trim(), linkText: f.linkText.value.trim(), start: f.start.value, end: f.end.value }; };
    var paint = function () {
      var n = read();
      pv.innerHTML = n.text ? '<b>' + esc(n.text) + '</b>' + (n.more ? ' <span>' + esc(n.more) + '</span>' : '') + (n.link ? ' <u>' + esc(n.linkText || '자세히') + '</u>' : '') : '<span class="ad-hint">문구를 넣으면 여기에 보입니다.</span>';
      pv.classList.toggle('is-off', !n.on);
      Array.prototype.forEach.call(root.querySelectorAll('[data-count-for]'), function (c) { c.textContent = (f[c.getAttribute('data-count-for')].value || '').length + ' / 60'; });
    };
    f.addEventListener('input', paint); paint();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = read(), box = root.querySelector('#notice-err'), err = [];
      if (n.on && !n.text) err.push('켜려면 문구를 넣어 주세요');
      if (n.start && n.end && n.end < n.start) err.push('마지막 날이 시작하는 날보다 앞입니다');
      if (n.link && !/^(https?:\/\/|[a-z0-9-]+\/|#)/i.test(n.link)) err.push('링크는 https:// 로 시작하거나 visit/ 처럼 홈페이지 안 주소로 넣어 주세요');
      if (err.length) { box.textContent = err.join(' · '); box.hidden = false; return; }
      S.set('notice', n.on || n.text ? n : null).then(function (ok) { if (ok) { AA.toast(n.on ? '저장했습니다. 홈페이지 맨 위에 바로 보입니다' : '저장했습니다. 공지 띠는 꺼져 있습니다'); AA.render(); } });
    });
  };

  // ───────────────────────────── 의료진(반영 대기)
  V.doctors = function () {
    var list = cur('doctors', SEED.doctors);
    var block = function (x, i) {
      return '<fieldset class="ad-doc" data-i="' + i + '"><legend>' + esc(x.name) + '</legend>' +
        '<div class="ad-grid3"><label class="ad-field"><span class="ad-field__label">직함</span><input class="ad-input" name="title" value="' + esc(x.title) + '"></label>' +
        '<label class="ad-field"><span class="ad-field__label">주요 진료</span><input class="ad-input" name="main" value="' + esc(x.main || '') + '" placeholder="정해지면 넣기"></label>' +
        '<label class="ad-field"><span class="ad-field__label">전문의 표시</span><input class="ad-input" name="specialist" value="' + esc(x.specialist || '') + '" placeholder="보건복지부 인증 전문의만"></label></div>' +
        '<label class="ad-field"><span class="ad-field__label">한 줄 약력</span><input class="ad-input" name="short" value="' + esc(x.short) + '"></label>' +
        '<div class="ad-groups">' + x.groups.map(function (g, j) { return '<label class="ad-field" data-g="' + j + '"><span class="ad-field__label"><input class="ad-input ad-input--sm" name="gh" value="' + esc(g.h) + '" aria-label="약력 묶음 이름"></span><textarea class="ad-input" name="gi" rows="' + Math.max(2, g.items.length) + '" aria-label="' + esc(g.h) + ' — 한 줄에 하나">' + esc(g.items.join('\n')) + '</textarea></label>'; }).join('') + '</div>' +
      '</fieldset>';
    };
    return head('의료진', '네 분의 직함·주요 진료·약력을 고칩니다. 약력은 한 줄에 하나씩 적습니다. 주요 진료는 병원에서 정한 것만 넣습니다(‘전문 진료’라고 쓰지 않습니다).', 'doctors') +
      '<form id="doc-form" class="ad-form" novalidate>' + list.map(block).join('') +
      '<div class="ad-actions"><button class="ad-btn ad-btn--ink" type="submit">저장</button>' + (S.get('doctors') ? '<button class="ad-btn ad-btn--line" type="button" data-act="doc-reset">원래대로</button>' : '') + '</div></form>';
  };
  V.doctors.after = function (root) {
    root.querySelector('#doc-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var list = cur('doctors', SEED.doctors);
      Array.prototype.forEach.call(e.target.querySelectorAll('.ad-doc'), function (fs) {
        var x = list[+fs.getAttribute('data-i')];
        ['title', 'main', 'specialist', 'short'].forEach(function (k) { var v = fs.querySelector('[name=' + k + ']').value.trim(); x[k] = v || (k === 'main' || k === 'specialist' ? null : x[k]); });
        x.groups = Array.prototype.map.call(fs.querySelectorAll('[data-g]'), function (g) { return { h: g.querySelector('[name=gh]').value.trim(), items: g.querySelector('[name=gi]').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) }; }).filter(function (g) { return g.h && g.items.length; });
      });
      S.set('doctors', AA.same(list, SEED.doctors) ? null : list).then(function (ok) { if (ok) { AA.toast(S.get('doctors') ? '저장했습니다 — 홈페이지 반영 대기' : '바뀐 곳이 없습니다'); AA.render(); } });
    });
  };
  A['doc-reset'] = function () { if (!w.confirm('의료진을 홈페이지에 실린 값으로 되돌릴까요?')) return; S.set('doctors', null).then(AA.render); };

  // ───────────────────────────── 진료 쪽 문구(반영 대기 — 의료광고 검수·본문=JSON-LD 일치)
  var pagePick = '';
  function wordHits(text) {
    var out = [];
    (SEED.words || []).forEach(function (r) { (r.patterns || []).forEach(function (p) { var m; try { m = new RegExp(p).exec(text); } catch (e) { m = null; } if (m && r.negationAfter) { try { if (new RegExp(r.negationAfter).test(text.slice(m.index + m[0].length, m.index + m[0].length + 12))) m = null; } catch (e) { m = m; } } if (m) out.push({ level: r.level, rule: r.rule, hit: m[0] }); }); });
    return out;
  }
  V.pages = function () {
    var pages = SEED.pages || [];
    if (!pagePick || !pages.some(function (p) { return p.path === pagePick; })) pagePick = pages.length ? pages[0].path : '';
    var base = pages.filter(function (p) { return p.path === pagePick; })[0];
    var all = cur('pages', {});
    var x = all[pagePick] || { lead: base ? base.lead : '', faq: base ? AA.clone(base.faq) : [] };
    var edited = Object.keys(all);
    var opts = pages.map(function (p) { return '<option value="' + esc(p.path) + '"' + (p.path === pagePick ? ' selected' : '') + '>' + esc(p.h1) + (edited.indexOf(p.path) > -1 ? ' — 고침' : '') + '</option>'; }).join('');
    return head('진료 쪽 문구', '진료 쪽의 첫 문단과 자주 묻는 질문을 고칩니다.', 'pages') +
      '<p class="ad-hint">진료 쪽 문구는 저장해도 바로 바뀌지 않습니다. 의료광고 표현을 확인하고, 화면 글자와 검색·AI 가 읽는 구조화 데이터(JSON-LD)를 함께 맞춰야 해서 운영 담당자가 확인한 뒤 반영합니다.</p>' +
      (base ? '<form id="page-form" class="ad-form" novalidate>' +
        '<label class="ad-field"><span class="ad-field__label">쪽 고르기</span><select class="ad-input" name="path">' + opts + '</select></label>' +
        '<p class="ad-hint"><a href="../' + esc(pagePick) + '" target="_blank" rel="noopener">지금 홈페이지에서 이 쪽 보기</a></p>' +
        '<label class="ad-field"><span class="ad-field__label">첫 문단 <small data-len>' + x.lead.length + '자</small></span><textarea class="ad-input" name="lead" rows="5">' + esc(x.lead) + '</textarea></label>' +
        '<p class="ad-field__hint">첫 문장만 떼어 읽어도 답이 되게 씁니다. 굵은 글씨는 운영 담당자가 반영할 때 정합니다.</p>' +
        '<h2 class="ad-h2">자주 묻는 질문</h2><div class="ad-faq">' + x.faq.map(function (q, i) { return '<div class="ad-faq__item" data-i="' + i + '"><input class="ad-input" name="q" value="' + esc(q.q) + '" aria-label="질문 ' + (i + 1) + '"><textarea class="ad-input" name="a" rows="3" aria-label="답 ' + (i + 1) + '">' + esc(q.a) + '</textarea><button class="ad-linkbtn ad-linkbtn--warn" type="button" data-act="faq-del" data-i="' + i + '">빼기</button></div>'; }).join('') + '</div>' +
        '<p><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="faq-add">질문 더하기</button></p>' +
        '<div id="page-check"></div>' +
        '<div class="ad-actions"><button class="ad-btn ad-btn--ink" type="submit">이 쪽 저장</button>' + (all[pagePick] ? '<button class="ad-btn ad-btn--line" type="button" data-act="page-reset">이 쪽 원래대로</button>' : '') + '</div>' +
      '</form>' : empty('고칠 진료 쪽이 없습니다.'));
  };
  function readPage(f) { return { lead: f.lead.value.trim(), faq: Array.prototype.map.call(f.querySelectorAll('.ad-faq__item'), function (el) { return { q: el.querySelector('[name=q]').value.trim(), a: el.querySelector('[name=a]').value.trim() }; }) }; }
  var pageTemp = null;
  V.pages.after = function (root) {
    var f = root.querySelector('#page-form'); if (!f) return;
    if (pageTemp) { f.lead.value = pageTemp.lead; pageTemp = null; }
    var box = root.querySelector('#page-check');
    var check = function () {
      var x = readPage(f);
      f.querySelector('[data-len]').textContent = x.lead.length + '자';
      var hits = wordHits([x.lead].concat(x.faq.map(function (q) { return q.q + ' ' + q.a; })).join('\n'));
      box.innerHTML = hits.length ? '<div class="ad-warn"><b>확인이 필요한 표현</b><ul>' + hits.map(function (h) { return '<li>‘' + esc(h.hit) + '’ — ' + esc(h.rule) + (h.level === '높음' ? ' <span class="ad-tag ad-tag--warn">고쳐야 함</span>' : '') + '</li>'; }).join('') + '</ul></div>' : '<p class="ad-ok">의료광고 금칙어 점검에 걸린 표현이 없습니다.</p>';
      return hits;
    };
    f.addEventListener('input', check); check();
    f.path.addEventListener('change', function () { pagePick = f.path.value; AA.render(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var x = readPage(f);
      if (!x.lead) { AA.toast('첫 문단을 비울 수 없습니다'); return; }
      if (x.faq.some(function (q) { return !q.q || !q.a; })) { AA.toast('질문과 답을 모두 채우거나 그 줄을 빼 주세요'); return; }
      if (check().some(function (h) { return h.level === '높음'; })) { AA.toast('‘고쳐야 함’ 표현을 고친 뒤 저장해 주세요'); return; }
      var base = (SEED.pages || []).filter(function (p) { return p.path === pagePick; })[0];
      var all = cur('pages', {});
      if (AA.same(x, { lead: base.lead, faq: base.faq })) delete all[pagePick]; else all[pagePick] = x;
      S.set('pages', Object.keys(all).length ? all : null).then(function (ok) { if (ok) { AA.toast(all[pagePick] ? '저장했습니다 — 홈페이지 반영 대기' : '바뀐 곳이 없습니다'); AA.render(); } });
    });
  };
  A['faq-add'] = function () { var f = d.getElementById('page-form'); var x = readPage(f); x.faq.push({ q: '', a: '' }); tempPage(x); };
  A['faq-del'] = function (el) { var f = d.getElementById('page-form'); var x = readPage(f); x.faq.splice(+el.getAttribute('data-i'), 1); tempPage(x); };
  function tempPage(x) { var all = S.docs.pages; var keep = all ? AA.clone(all.v) : null; var v = AA.clone(keep || {}); v[pagePick] = x; S.docs.pages = Object.assign({}, all || { rev: '', pub: '' }, { v: v }); AA.render(); S.docs.pages.v = keep; }
  A['page-reset'] = function () { var all = cur('pages', {}); delete all[pagePick]; S.set('pages', Object.keys(all).length ? all : null).then(AA.render); };

  // ───────────────────────────── 병원 정보(반영 대기) + 글자 맞추기 점검표
  var H_FIELDS = [['name', '홈페이지에 쓰는 이름'], ['alt', '다른 이름(로고·상호, 쉼표로)'], ['address', '주소'], ['tel', '전화'], ['fax', '팩스'], ['email', '이메일'], ['kakao', '카카오톡 채널 주소'], ['kakaoId', '카카오톡 아이디'], ['blog', '블로그'], ['youtube', '유튜브'], ['instagram', '인스타그램(쉼표로)'], ['naverPlace', '네이버 플레이스 주소'], ['naverBooking', '네이버 예약 주소'], ['google', '구글 비즈니스 프로필 주소']];
  function hospNow() { return cur('hospital', SEED.hospital); }
  var CHECK_ROWS = [['name', '이름'], ['address', '주소'], ['tel', '전화'], ['hours', '진료시간'], ['kakao', '카카오톡 채널']];
  var norm = function (s) { return String(s || '').replace(/[\s·.,\-()]/g, '').toLowerCase(); };
  V.hospital = function () {
    var h = hospNow();
    var ck = cur('checks', {});
    var siteVal = { name: h.name, address: h.address, tel: h.tel, hours: '화·목·금 오후 8시 · 토 오후 2시 · 일·공휴일 휴진', kakao: h.kakaoId };
    var stOf = function (k, src) { var v = (ck[k] || {})[src]; if (!v) return '<span class="ad-st">확인 전</span>'; return norm(v) === norm(siteVal[k]) ? '<span class="ad-st is-ok">같음</span>' : '<span class="ad-st is-diff">다름</span>'; };
    return head('병원 정보', '이름·주소·전화·채널 주소를 고칩니다. 같은 글자가 홈페이지 여러 곳과 구조화 데이터에 함께 들어가 있어 확인한 뒤 반영합니다.', 'hospital') +
      '<form id="hosp-form" class="ad-form" novalidate><div class="ad-grid2">' + H_FIELDS.map(function (f) { return '<label class="ad-field"><span class="ad-field__label">' + esc(f[1]) + '</span><input class="ad-input" name="' + f[0] + '" value="' + esc(h[f[0]] || '') + '"' + (/naver|google/.test(f[0]) && !h[f[0]] ? ' placeholder="정해지면 넣기"' : '') + '></label>'; }).join('') + '</div>' +
      '<div class="ad-actions"><button class="ad-btn ad-btn--ink" type="submit">저장</button>' + (S.get('hospital') ? '<button class="ad-btn ad-btn--line" type="button" data-act="hosp-reset">원래대로</button>' : '') + '</div></form>' +
      '<h2 class="ad-h2">네이버 플레이스·구글 프로필과 글자 맞추기</h2>' +
      '<p class="ad-hint">AI 답변과 지도 검색은 홈페이지·네이버 플레이스·구글 프로필의 글자가 같을 때 같은 병원으로 묶습니다. 플레이스와 프로필에 적힌 그대로 옮겨 적으면 같은지 바로 표시합니다. 지금은 대외 공식 이름(확인 질문 1)과 플레이스·프로필 주소(확인 질문 6) 답을 받기 전입니다.</p>' +
      '<form id="check-form" class="ad-table-wrap"><table class="ad-table ad-table--check"><thead><tr><th>항목</th><th>홈페이지</th><th>네이버 플레이스</th><th>구글 프로필</th></tr></thead><tbody>' +
      CHECK_ROWS.map(function (r) { var c = ck[r[0]] || {}; return '<tr><th>' + esc(r[1]) + '</th><td>' + esc(siteVal[r[0]]) + '</td>' + ['naver', 'google'].map(function (src) { return '<td><input class="ad-input ad-input--sm" name="' + r[0] + '.' + src + '" value="' + esc(c[src] || '') + '" aria-label="' + esc(r[1]) + ' — ' + (src === 'naver' ? '네이버 플레이스' : '구글 프로필') + '">' + stOf(r[0], src) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table><div class="ad-actions"><button class="ad-btn ad-btn--line" type="submit">점검표 저장</button></div></form>';
  };
  V.hospital.after = function (root) {
    root.querySelector('#hosp-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var h = hospNow();
      H_FIELDS.forEach(function (f) { h[f[0]] = e.target[f[0]].value.trim(); });
      S.set('hospital', AA.same(h, SEED.hospital) ? null : h).then(function (ok) { if (ok) { AA.toast(S.get('hospital') ? '저장했습니다 — 홈페이지 반영 대기' : '바뀐 곳이 없습니다'); AA.render(); } });
    });
    root.querySelector('#check-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var ck = {};
      Array.prototype.forEach.call(e.target.querySelectorAll('input'), function (i) { var p = i.name.split('.'); if (i.value.trim()) (ck[p[0]] = ck[p[0]] || {})[p[1]] = i.value.trim(); });
      S.set('checks', Object.keys(ck).length ? ck : null).then(function (ok) { if (ok) { AA.toast('점검표를 저장했습니다'); AA.render(); } });
    });
  };
  A['hosp-reset'] = function () { if (!w.confirm('병원 정보를 홈페이지에 실린 값으로 되돌릴까요?')) return; S.set('hospital', null).then(AA.render); };

  // ───────────────────────────── AI 검색 노출(측정 전)
  V.aeo = function () {
    var a = cur('aeo', SEED.aeo);
    return head('AI 검색 노출', '환자가 ChatGPT·Gemini·네이버 AI 브리핑 같은 AI 에 물을 때 답에 병원 이름과 홈페이지 링크가 나오는지 질문별로 보는 화면입니다.', 'aeo') +
      '<section class="ad-panel"><h2>측정 결과 <span class="ad-tag">측정 전</span></h2><p>아직 측정하지 않았습니다. 홈페이지를 실제 주소로 옮기고 검색 로봇이 읽기 시작한 뒤 측정을 시작하면, 질문마다 답에 병원 이름·홈페이지 링크가 나왔는지가 여기에 쌓입니다.</p></section>' +
      '<form id="aeo-form" class="ad-form" novalidate><h2 class="ad-h2">잴 질문</h2><p class="ad-hint">병원 홈페이지에 적힌 사실(위치·진료·진료시간·주차)에서 뽑은 질문입니다. 한 줄에 하나씩 고칠 수 있습니다.</p>' +
      '<textarea class="ad-input" name="q" rows="' + Math.max(6, a.questions.length + 1) + '" aria-label="잴 질문 — 한 줄에 하나">' + esc(a.questions.join('\n')) + '</textarea>' +
      '<h2 class="ad-h2">물어볼 곳</h2><div class="ad-checks">' + ['ChatGPT', 'Gemini', '네이버 AI 브리핑', 'Claude', 'Perplexity'].map(function (e) { return '<label class="ad-check"><input type="checkbox" name="e" value="' + e + '"' + (a.engines.indexOf(e) > -1 ? ' checked' : '') + '> ' + e + '</label>'; }).join('') + '</div>' +
      '<div class="ad-actions"><button class="ad-btn ad-btn--ink" type="submit">저장</button></div></form>';
  };
  V.aeo.after = function (root) {
    root.querySelector('#aeo-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var a = { questions: e.target.q.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean), engines: Array.prototype.filter.call(e.target.querySelectorAll('[name=e]'), function (i) { return i.checked; }).map(function (i) { return i.value; }) };
      S.set('aeo', AA.same(a, SEED.aeo) ? null : a).then(function (ok) { if (ok) { AA.toast('저장했습니다'); AA.render(); } });
    });
  };
})();
