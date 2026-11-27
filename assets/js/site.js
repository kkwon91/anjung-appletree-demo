// 안중사과나무치과 데모 — 움직임은 첫 화면 사진 넘김 하나(P01). 나머지는 단추 반응만. 추적 코드 없음.
(() => {
  // P01 변형: 사진판 넘김(멈춤·이전·다음, 탭 숨김이면 멈춤, 움직임 끄기면 자동 넘김 없음)
  const root = document.querySelector('[data-hero]');
  if (root) {
    const slides = [...root.querySelectorAll('.hero__slide')];
    const cap = root.querySelector('.hero__cap'), cur = root.querySelector('.hero__cur'), bar = root.querySelector('.hero__line b');
    const toggle = root.querySelector('[data-act=toggle]');
    const int = +root.dataset.interval || 6500; root.style.setProperty('--int', int + 'ms');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = 0, timer = null, playing = !still && slides.length > 1;
    const show = (n) => {
      slides[i].classList.remove('is-on'); slides[i].setAttribute('aria-hidden', 'true');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-on'); slides[i].removeAttribute('aria-hidden');
      cap.textContent = slides[i].dataset.cap || ''; cur.textContent = String(i + 1).padStart(2, '0');
      root.classList.remove('is-run'); void bar.offsetWidth; if (playing) root.classList.add('is-run');
    };
    const run = () => { clearInterval(timer); if (playing) timer = setInterval(() => show(i + 1), int); };
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
      if (act === 'next') show(i + 1);
      if (act === 'prev') show(i - 1);
      if (act === 'toggle') { playing = !playing; toggle.textContent = playing ? '멈춤' : '재생'; toggle.setAttribute('aria-label', playing ? '자동 넘김 멈춤' : '자동 넘김 재생'); show(i); }
      run();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearInterval(timer); else run(); });
    // 손가락으로 밀어 넘기기(가로로 40px 넘게 밀면) — 세로 스크롤은 그대로(touch-action: pan-y)
    const frame = root.querySelector('.hero__frame'); let x0 = null, y0 = null;
    frame.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
    frame.addEventListener('pointerup', (e) => {
      if (x0 === null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { show(i + (dx < 0 ? 1 : -1)); run(); }
    });
    frame.addEventListener('pointercancel', () => { x0 = null; });
    if (!playing) toggle.textContent = '재생';
    show(0); run();
  }

  // P12 주소 복사
  document.querySelectorAll('.p12__copy').forEach((b) => b.addEventListener('click', async () => {
    const t = b.parentElement.querySelector('[data-addr]').textContent.trim();
    try { await navigator.clipboard.writeText(t); b.textContent = '복사했습니다'; } catch { b.textContent = '복사 안 됨'; }
    setTimeout(() => (b.textContent = '주소 복사'), 1800);
  }));

  // P14 ② 접는 상담 띠 — 데모라 보내지 않는다(서버 저장 응답 뒤에만 '접수'라고 말함)
  const cta = document.querySelector('.cta');
  if (cta) {
    const handle = cta.querySelector('.cta__handle'), form = cta.querySelector('form'), btn = form.querySelector('[type=submit]'), msg = form.querySelector('.msg');
    const label = handle.querySelector('i');
    handle.addEventListener('click', () => { const o = cta.classList.toggle('is-open'); handle.setAttribute('aria-expanded', o); label.textContent = o ? '닫기' : '열기'; if (o) form.querySelector('input').focus(); });
    const ok = () => form.name.value.trim() && /^[0-9-]{9,13}$/.test(form.tel.value.trim()) && form.agree.checked;
    form.addEventListener('input', () => { btn.disabled = !ok(); });
    form.addEventListener('submit', (e) => { e.preventDefault(); if (!ok()) return; msg.innerHTML = '데모 화면이라 신청이 접수되지 않습니다. 상담은 전화 <span class="nw">031-683-7575</span>나 카카오톡으로 해 주세요. 넣으신 이름과 연락처는 시험 기록으로 <span class="nw">이 브라우저에만</span> 남습니다.'; });
  }

  // P13 휴대폰: 예약·오시는 길 구간이 보이면 하단 막대를 내림, 지금 쪽 탭을 가운데로
  const act = document.querySelector('.m-act'); const hideOn = document.querySelectorAll('[data-act-hide]');
  if (act && hideOn.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(() => {
      const v = [...hideOn].some((el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight * 0.8 && r.bottom > 0; });
      act.classList.toggle('is-away', v);
    }, { threshold: [0, 0.2] });
    hideOn.forEach((el) => io.observe(el));
  }
  const curTab = document.querySelector('.m-tabs [aria-current]');
  if (curTab && curTab.parentElement.scrollWidth > curTab.parentElement.clientWidth) curTab.parentElement.scrollLeft = curTab.offsetLeft - 40;
})();

// 상담 신청 쪽(P14 방식): 받는 주소(data-endpoint)가 없으면 보내지 않고, 데모라 접수되지 않는다고만 알린다
(() => {
  const f = document.querySelector('.cform'); if (!f) return;
  const btn = f.querySelector('[type=submit]'), msg = f.querySelector('.msg');
  const ok = () => f.name.value.trim() && /^[0-9-]{9,13}$/.test(f.tel.value.trim()) && f.agree.checked;
  f.addEventListener('input', () => { btn.disabled = !ok(); });
  f.addEventListener('change', () => { btn.disabled = !ok(); });
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); if (!ok()) return;
    const url = f.dataset.endpoint;
    if (!url) { msg.innerHTML = '데모 화면이라 신청이 접수되지 않습니다. 상담은 전화 <span class="nw">031-683-7575</span>나 카카오톡으로 해 주세요. 넣으신 이름과 연락처는 시험 기록으로 <span class="nw">이 브라우저에만</span> 남습니다.'; return; }
    try { const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: f.name.value.trim(), tel: f.tel.value.trim(), time: f.time.value }) }); msg.textContent = r.ok ? '접수했습니다. 전화로 연락드리겠습니다.' : '접수하지 못했습니다. 전화로 연락해 주세요.'; } catch { msg.textContent = '접수하지 못했습니다. 전화로 연락해 주세요.'; }
  });
})();
// 쪽 안 메뉴: 지금 쪽 칸이 보이게
(() => { const cur = document.querySelector('.subnav [aria-current]'); if (!cur) return; const ul = cur.closest('ul'), li = cur.parentElement; const right = li.offsetLeft - ul.offsetLeft + li.offsetWidth; if (right > ul.clientWidth) ul.scrollLeft = right - ul.clientWidth + 24; })();

// 휴대폰: 아래로 내리면 머리글의 로고 줄을 접고 메뉴 탭 줄만 남긴다. 위로 올리거나 맨 위 근처면 다시 편다(CSS .site-head.is-up — 1023px 이하에서만 움직임)
(() => {
  const head = document.querySelector('.site-head'); if (!head) return;
  let last = scrollY, busy = false;
  addEventListener('scroll', () => {
    if (busy) return; busy = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      if (y > 200 && y > last + 6) head.classList.add('is-up'); else if (y < last - 6 || y < 120) head.classList.remove('is-up');
      last = y; busy = false;
    });
  }, { passive: true });
})();

// 진료시간 표: 오늘 요일 줄에 '오늘' 표시(한국 시간 기준). 공휴일·임시 휴진은 알 수 없으므로 '진료 중'이라고 단정하지 않는다
(() => {
  const day = '일월화수목금토'[new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).getDay()];
  const mark = () => document.querySelectorAll('dl.hours').forEach((dl) => {
    dl.querySelectorAll(':scope > div').forEach((row) => {
      const dt = row.querySelector('dt'); if (!dt) return;
      const off = row.classList.contains('off');
      row.classList.toggle('is-today', day === '일' ? off : !off && dt.textContent.trim() === day);
    });
  });
  mark();
  // 관리자 '바로 반영'(ops.js)이 표를 다시 그리면 다시 표시한다
  if ('MutationObserver' in window) document.querySelectorAll('dl.hours').forEach((dl) => new MutationObserver(mark).observe(dl, { childList: true }));
})();
