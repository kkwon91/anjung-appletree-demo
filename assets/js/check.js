// 2분 자가진단(/check/) — 불편한 곳 → 질문 다섯 개(한 화면에 하나) → '기다리지 마세요' → 결과.
// 자료는 쪽 안 <script id="ck-data">(data/check.json 에서 근거·메모를 뺀 것), 계기판 그림은 <template id="ck-gauge">(빌드 때 그린 손그림 SVG).
// 답은 이 변수(st) 안에만 있다 — 보내지 않고, localStorage·sessionStorage·쿠키·주소에 싣지 않는다. 추적 코드 없음.
// 움직임은 화면 넘김과 바늘 한 번뿐이고, prefers-reduced-motion 이면 둘 다 없이 바로 보여 준다(check.css).
(() => {
  const root = document.querySelector('[data-ck]');
  const dataEl = document.getElementById('ck-data');
  if (!root || !dataEl) return;
  let D;
  try { D = JSON.parse(dataEl.textContent); } catch (e) { return; }
  const live = document.getElementById('ck-live');
  const tpl = document.getElementById('ck-gauge');
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // 두세 문장짜리 안내는 문장마다 한 줄씩 세운다(쪽 첫 문단과 같은 방식 — site.css .sn). 11-27: 급한 증상 안내가 '공휴일은 ⏎ 휴진합니다'처럼 문장 가운데서 꺾였다
  const sn = (s) => String(s).split(/(?<=[.!?]) /).map((x) => `<span class="sn">${esc(x)}</span>`).join(' ');
  const telNw = (s) => s.replace(/0\d{1,2}-\d{3,4}-\d{4}/g, (m) => `<span class="nw">${m}</span>`);
  const AREA = {};
  D.areas.forEach((a) => { AREA[a.id] = a; });
  const LV = D.levels;
  const C = D.contact;
  const ICON = {
    tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    talk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4c4.4 0 8 2.9 8 6.5S16.4 17 12 17c-.7 0-1.4-.1-2-.2L6 19l.9-3.3C5.1 14.6 4 12.7 4 10.5 4 6.9 7.6 4 12 4z"/></svg>',
    note: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>',
  };
  const STEPS = 6; // 질문 다섯 + 마지막 확인 하나

  let st;
  const reset = () => { st = { screen: 'area', area: null, i: 0, ans: {}, flags: {} }; };
  reset();
  document.documentElement.classList.add('ck-on');

  // ── 점수
  function result() {
    const a = AREA[st.area];
    let s = 0, floor = 1;
    const said = [];
    a.questions.forEach((q, qi) => {
      const k = st.ans[q.id]; if (k == null) return;
      const o = q.opts[k]; s += o.s;
      if (o.atLeast) floor = Math.max(floor, o.atLeast);
      if (o.s > 0) said.push({ q, o, qi });
    });
    const urgent = D.flags.items.filter((f) => st.flags[f.id]);
    const base = LV.find((l) => s >= l.min && s <= l.max) || LV[LV.length - 1];
    const n = Math.max(base.n, floor, urgent.length ? 3 : 1);
    const lv = LV.find((l) => l.n === n);
    const span = 180 / LV.length;
    // 바늘: 합으로 정한 단계면 그 칸 안에서 점수만큼, 답 하나·급한 증상으로 올린 단계면 칸 앞쪽
    const frac = n === base.n ? Math.min(0.85, Math.max(0.15, (s - lv.min + 0.5) / (lv.max - lv.min + 1))) : 0.3;
    said.sort((x, y) => y.o.s - x.o.s || x.qi - y.qi);
    // byUrgent: 점수·답 하나로는 3단계가 아닌데 '기다리지 마세요' 증상 때문에만 3단계가 된 경우 — 영역의 3단계 글("불편이 크거나 여러 곳…")은 고르지 않은 답을 말하게 되므로 쓰지 않는다
    return { a, s, n, lv, urgent, said, angle: Math.round(((n - 1) * span + span * frac) * 10) / 10, raised: n > base.n, byUrgent: urgent.length > 0 && Math.max(base.n, floor) < 3 };
  }

  // ── 화면 조각
  const progress = (step, label) => `<div class="ck-prog"><p class="ck-prog__t"><b>${esc(AREA[st.area].name)}</b><span>${esc(label)}</span></p><ol class="ck-prog__bar" aria-hidden="true">${Array.from({ length: STEPS }, (_, i) => `<li class="${i < step ? 'is-done' : i === step ? 'is-cur' : ''}"></li>`).join('')}</ol></div>`;
  const scale = (cur) => `<ol class="ck-scale">${LV.map((l) => `<li${cur === l.n ? ' class="is-on"' : ''}><i>${l.n}</i>${esc(l.short)}</li>`).join('')}</ol>`;

  function areaHtml() {
    return `<div class="ck-stage">
  <h2 class="ck-h" tabindex="-1">불편한 곳을 고르세요</h2>
  <p class="ck-sub">가장 신경&nbsp;쓰이는&nbsp;곳 하나를 고르면 질문&nbsp;다섯&nbsp;개가 이어집니다.</p>
  <ul class="ck-areas">${D.areas.map((a) => `<li><button type="button" data-area="${a.id}"><b>${esc(a.name)}</b><span>${esc(a.hint)}</span></button></li>`).join('')}</ul>
  <p class="ck-priv">답은 이 화면 안에서만 계산하고, 보내거나 저장하지 않습니다.</p>
</div>`;
  }
  function qHtml() {
    const a = AREA[st.area], q = a.questions[st.i], k = st.ans[q.id];
    return `<form class="ck-stage" data-form="q" novalidate>
  ${progress(st.i, `질문 ${st.i + 1} / ${a.questions.length}`)}
  <fieldset class="ck-fs" aria-labelledby="ck-qh">
    <h2 class="ck-h" id="ck-qh" tabindex="-1">${esc(q.q)}</h2>
    <div class="ck-opts">${q.opts.map((o, j) => `<label class="ck-opt"><input type="radio" name="ck-q" value="${j}"${k === j ? ' checked' : ''}><span>${esc(o.t)}</span></label>`).join('')}</div>
  </fieldset>
  <div class="ck-nav"><button type="button" class="btn btn--line" data-prev>이전</button><button type="submit" class="btn btn--ink"${k == null ? ' disabled' : ''}>다음</button></div>
</form>`;
  }
  const flagGo = (n) => (n ? `${n}개 골라 결과 보기` : '없어요 · 결과 보기');
  function flagsHtml() {
    const F = D.flags, n = F.items.filter((f) => st.flags[f.id]).length;
    return `<form class="ck-stage" data-form="f" novalidate>
  ${progress(STEPS - 1, '마지막 확인')}
  <fieldset class="ck-fs" aria-labelledby="ck-fh" aria-describedby="ck-fl">
    <h2 class="ck-h" id="ck-fh" tabindex="-1">${esc(F.h)}</h2>
    <p class="ck-sub" id="ck-fl">${esc(F.lead)}</p>
    <div class="ck-opts ck-opts--check">${F.items.map((f) => `<label class="ck-opt"><input type="checkbox" name="${f.id}"${st.flags[f.id] ? ' checked' : ''}><span>${esc(f.t)}</span></label>`).join('')}</div>
  </fieldset>
  <div class="ck-nav"><button type="button" class="btn btn--line" data-prev>이전</button><button type="submit" class="btn btn--ink" data-go>${flagGo(n)}</button></div>
</form>`;
  }
  // 오늘 진료시간 한 줄 — 쪽에 실린 진료시간 표(clinic.json)에서. 요일은 한국 시간으로(site.js 의 '오늘' 표시와 같게), 층·덧붙임도 표와 같은 말로 싣는다
  function todayLine() {
    const d = '일월화수목금토'[new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getDay()];
    const row = D.hours.rows.find((r) => r.day === d);
    if (!row) return `<span class="sn">오늘(${d}요일)은 휴진입니다.</span> ${sn(D.flags.afterHours)}`;
    const lunch = d === '토' ? '' : `&nbsp;· <span class="nw">점심&nbsp;${esc(D.hours.lunch.replace(/^평일\s*/, ''))}</span>`;
    const note = row.note && row.note.length ? `(${row.note.map((n) => `<span class="nw">${esc(n)}</span>`).join(', ')})` : '';
    const only = row.floor && row.floor !== '전체' ? `<span class="sn">오늘(${d}요일)은 <b><span class="nw">${esc(row.floor)}만</span> 진료</b>합니다.</span> ` : '';
    const hours = `<span class="sn">${only ? '' : `오늘(${d}요일) 진료 `}<span class="nw">${esc(row.text)}</span>${note}${lunch}.</span>`;
    return `${only}${hours} <span class="sn">공휴일은 휴진합니다.</span> ${sn(D.flags.afterHours)}`;
  }
  // 진료 안내 링크: 셋 이상이면 끝 두 개를 한 칸에 묶는다(끝 줄에 링크 하나만 떨어지지 않게 — 사이트의 lib.mjs flowLis 와 같은 방식)
  const linkLis = (L) => { const li = ([t, h]) => `<a href="${esc(h)}">${esc(t)}</a>`; return L.length < 3 ? L.map((x) => `<li>${li(x)}</li>`).join('') : L.slice(0, -2).map((x) => `<li>${li(x)}</li>`).join('') + `<li class="flow-end">${L.slice(-2).map(li).join('')}</li>`; };
  function resultHtml(r) {
    const a = r.a, F = D.flags;
    const urgent = r.urgent.length ? `<div class="ck-urgent">
    <h2 class="ck-h ck-urgent__h" tabindex="-1">${esc(F.resultH)}</h2>
    <p class="ck-urgent__picked">${r.urgent.map((f) => esc(f.t)).join('&nbsp;· ')}</p>
    <p>${sn(F.resultText)}</p>
    <p class="ck-urgent__today">${todayLine()}</p>
    <a class="btn btn--ink" href="tel:${C.tel}">${ICON.tel}전화 ${C.tel}</a>
  </div>` : '';
    const said = r.said.length ? `<div class="ck-said">
    <h3 class="ck-h3">진찰 때 말씀하실 답</h3>
    <ul>${r.said.map(({ q, o }) => `<li><p class="ck-said__q">${esc(q.q)}</p><p class="ck-said__a">${esc(o.t)}${o.atLeast && o.atLeast === r.n && r.raised ? '<span class="ck-said__up">이 답으로 단계가 올라갔습니다</span>' : ''}</p>${o.note ? `<p class="ck-said__n">${sn(o.note)}</p>` : ''}</li>`).join('')}</ul>
  </div>` : '';
    return `<div class="ck-stage ck-res">
  ${urgent}
  <div class="ck-res__top">
    <figure class="ck-res__fig" data-gauge></figure>
    <div class="ck-res__txt">
      <p class="ck-res__k">${esc(a.name)} · <span class="nw">${r.n}단계</span></p>
      <h2 class="ck-h ck-res__h" tabindex="-1">${esc(r.lv.label)}</h2>
      <p class="ck-res__p">${sn(r.byUrgent ? F.raisedText : a.results[r.lv.id])}</p>
      ${a.extra && !r.byUrgent ? `<p class="ck-res__p">${esc(a.extra)}</p>` : ''}
      <p class="ck-note">${sn(D.notice)}</p>
    </div>
  </div>
  ${said}
  <div class="ck-res__go">
    <h3 class="ck-h3">진료 안내</h3>
    <ul class="ck-links">${linkLis(a.links)}</ul>
  </div>
  <div class="ck-res__call">
    <h3 class="ck-h3">상담</h3>
    <div class="btns"><a class="btn btn--ink" href="tel:${C.tel}">${ICON.tel}전화 ${C.tel}</a><a class="btn btn--kakao" href="${esc(C.kakao)}" target="_blank" rel="noopener">${ICON.talk}카카오톡 상담</a><a class="btn btn--line" href="${esc(C.consult)}">${ICON.note}상담 신청</a></div>
    <p class="ck-priv"><span class="sn">상담 신청에는 오늘 고른 답이 넘어가지&nbsp;않습니다.</span> <span class="sn">통화하실 때 위&nbsp;답을 말씀해&nbsp;주세요.</span></p>
  </div>
  <p class="ck-again"><button type="button" data-restart>처음부터 다시</button><button type="button" data-redo>${esc(a.name)} 다시 답하기</button></p>
</div>`;
  }

  // ── 그리기
  let first = true;
  function render(dir, instant) {
    let html = '', r = null;
    if (st.screen === 'area') html = areaHtml();
    else if (st.screen === 'q') html = qHtml();
    else if (st.screen === 'flags') html = flagsHtml();
    else { r = result(); html = resultHtml(r); }
    root.innerHTML = html;
    const stage = root.firstElementChild;
    if (!first && !still()) { stage.classList.add('ck-in'); if (dir === 'back') stage.classList.add('ck-in--back'); }
    if (r) drawGauge(stage.querySelector('[data-gauge]'), r);
    if (live) live.textContent = r ? `결과: ${r.a.name} ${r.n}단계, ${r.lv.label}.${r.urgent.length ? ' ' + D.flags.resultH + '.' : ''}` : '';
    if (!first) {
      bringIntoView(instant);
      const h = stage.querySelector('.ck-h[tabindex]');
      if (h) h.focus({ preventScroll: true });
    }
    first = false;
  }
  function drawGauge(fig, r) {
    if (!fig || !tpl) return;
    const svg = tpl.content.firstElementChild.cloneNode(true);
    svg.setAttribute('data-level', String(r.n));
    fig.appendChild(svg);
    fig.insertAdjacentHTML('beforeend', scale(r.n));
    const nd = svg.querySelector('.ck-g__needle');
    if (!nd) return;
    if (still()) { nd.style.transform = `rotate(${r.angle}deg)`; return; }
    nd.style.transform = 'rotate(0deg)';
    requestAnimationFrame(() => requestAnimationFrame(() => { nd.classList.add('is-go'); nd.style.transform = `rotate(${r.angle}deg)`; }));
  }
  // 넘긴 화면의 맨 위가 머리글 바로 아래에 오게(이미 보이면 그대로) — 휴대폰 아래 고정 막대 뒤로 단추가 가려지지 않게
  function bringIntoView(instant) {
    const head = document.querySelector('.site-head'), bar = document.querySelector('.m-act');
    const hb = head ? Math.max(0, head.getBoundingClientRect().bottom) : 0;
    const bh = bar && getComputedStyle(bar).display !== 'none' && !bar.classList.contains('is-away') ? bar.offsetHeight : 0;
    const r = root.getBoundingClientRect();
    if (r.top < hb + 4 || r.bottom > innerHeight - bh - 8) scrollBy({ top: r.top - hb - 16, behavior: instant || still() ? 'auto' : 'smooth' });
  }

  // ── 움직임(누름·키보드)
  const start = (id, instant) => { reset(); st.area = id; st.screen = 'q'; render(undefined, instant); };
  const next = () => {
    const a = AREA[st.area];
    if (st.screen === 'q') { if (st.ans[a.questions[st.i].id] == null) return; if (st.i < a.questions.length - 1) st.i += 1; else st.screen = 'flags'; }
    else if (st.screen === 'flags') st.screen = 'result';
    render();
  };
  const prev = () => {
    if (st.screen === 'q') { if (st.i > 0) st.i -= 1; else { reset(); } }
    else if (st.screen === 'flags') { st.screen = 'q'; st.i = AREA[st.area].questions.length - 1; }
    render('back');
  };
  let lastPointer = 0, timer = 0;
  root.addEventListener('pointerdown', () => { lastPointer = Date.now(); });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t || !root.contains(t)) return;
    if (t.dataset.area) start(t.dataset.area);
    else if (t.hasAttribute('data-prev')) { clearTimeout(timer); prev(); }
    else if (t.hasAttribute('data-restart')) { reset(); render('back'); }
    else if (t.hasAttribute('data-redo')) start(st.area);
  });
  root.addEventListener('change', (e) => {
    const inp = e.target;
    if (st.screen === 'q' && inp.name === 'ck-q') {
      const q = AREA[st.area].questions[st.i];
      st.ans[q.id] = Number(inp.value);
      root.querySelector('[type=submit]').disabled = false;
      // 손가락·마우스로 고르면 잠깐 보여 주고 넘긴다. 키보드(화살표)로 고를 때는 넘기지 않고 Enter·'다음'을 기다린다
      if (Date.now() - lastPointer < 800) { clearTimeout(timer); timer = setTimeout(() => { if (st.screen === 'q' && AREA[st.area].questions[st.i] === q) next(); }, 280); }
    } else if (st.screen === 'flags' && inp.type === 'checkbox') {
      st.flags[inp.name] = inp.checked;
      const n = D.flags.items.filter((f) => st.flags[f.id]).length;
      root.querySelector('[data-go]').textContent = flagGo(n);
    }
  });
  root.addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); next(); });

  // 홈 진입 구간의 영역 링크(check/#ck-a-잇몸 등)로 들어오면 그 영역부터 — 주소의 #은 바로 지운다
  const fromHash = () => {
    const m = /^#ck-a-([a-z]+)$/.exec(location.hash);
    if (!m || !AREA[m[1]]) return false;
    history.replaceState(null, '', location.pathname + location.search);
    first = false; start(m[1], true);
    // 브라우저가 # 자리(아래 문항 목록)로 먼저 내려가 있으므로 앱 자리로 바로 올린다. 그림·글꼴이 늦게 들어와 자리가 밀리면 load 때 한 번 더
    if (document.readyState !== 'complete') addEventListener('load', () => bringIntoView(true), { once: true });
    return true;
  };
  if (!fromHash()) render();
  addEventListener('hashchange', fromHash);
})();
