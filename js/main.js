const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzT1z4LZUiGiHC2dhViN4i8JU5F4m51UoUzPOcAG7jfEmCR8lYehOk1OzFrYVS1Iv1w/exec';

document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  initScrollReveal();
  initScrollTop();
  renderSegments();
  renderSpeakers();
  renderPricing();
  renderReviews();
  initModal();
});

/* ===== CANVAS — НЕЙРОННАЯ СЕТЬ (connected nodes) ===== */
function initCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, nodes, bokeh, LINK, raf, t = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function rand(a, b) { return a + Math.random() * (b - a); }

  function build() {
    const count = Math.min(150, Math.max(40, Math.round((w * h) / 13000)));
    LINK = w < 760 ? 115 : 155;
    nodes = Array.from({ length: count }, () => {
      const z = Math.random();                       /* глубина: 1 — ближе */
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: rand(-0.18, 0.18) * (0.4 + z),
        vy: rand(-0.18, 0.18) * (0.4 + z),
        z,
        r: 0.6 + z * 2.4,
        gold: Math.random() < 0.14,
        ph: rand(0, Math.PI * 2),
        sp: rand(0.6, 1.8)
      };
    });

    const bcount = w < 760 ? 5 : 11;
    bokeh = Array.from({ length: bcount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: rand(-0.06, 0.06),
      vy: rand(-0.06, 0.06),
      r: rand(40, 130),
      a: rand(0.04, 0.13),
      gold: Math.random() < 0.4,
      ph: rand(0, Math.PI * 2),
      sp: rand(0.3, 0.8)
    }));
  }

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
    mouse.x = mouse.tx = w / 2;
    mouse.y = mouse.ty = h / 2;
    build();
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    const ox = (mouse.x - w / 2) * 0.02;
    const oy = (mouse.y - h / 2) * 0.02;

    /* --- боке (глубина резкости) --- */
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < bokeh.length; i++) {
      const b = bokeh[i];
      b.x += b.vx; b.y += b.vy;
      if (b.x < -b.r) b.x = w + b.r;
      if (b.x > w + b.r) b.x = -b.r;
      if (b.y < -b.r) b.y = h + b.r;
      if (b.y > h + b.r) b.y = -b.r;
      const pa = b.a * (0.7 + 0.3 * Math.sin(t * b.sp + b.ph));
      const col = b.gold ? '120,210,245' : '206,232,248';
      const bx = b.x + ox * 3, by = b.y + oy * 3;
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, b.r);
      g.addColorStop(0, 'rgba(' + col + ',' + pa + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(bx, by, b.r, 0, Math.PI * 2); ctx.fill();
    }

    /* позиции узлов с параллаксом по глубине */
    const px = [], py = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0) n.x = w; if (n.x > w) n.x = 0;
      if (n.y < 0) n.y = h; if (n.y > h) n.y = 0;
      px[i] = n.x + ox * (0.3 + n.z * 1.7);
      py[i] = n.y + oy * (0.3 + n.z * 1.7);
    }

    /* --- связи между близкими узлами --- */
    ctx.globalCompositeOperation = 'source-over';
    const L2 = LINK * LINK;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = px[i] - px[j], dy = py[i] - py[j];
        const d2 = dx * dx + dy * dy;
        if (d2 < L2) {
          const d = Math.sqrt(d2);
          const a = (1 - d / LINK) * 0.30 * (0.4 + (nodes[i].z + nodes[j].z) * 0.3);
          ctx.strokeStyle = 'rgba(125,205,240,' + a + ')';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(px[i], py[i]);
          ctx.lineTo(px[j], py[j]);
          ctx.stroke();
        }
      }
    }

    /* --- свечение узлов --- */
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const tw = 0.6 + 0.4 * Math.sin(t * n.sp + n.ph);
      const r = n.r;
      const col = n.gold ? '120,210,245' : '206,236,252';
      const g = ctx.createRadialGradient(px[i], py[i], 0, px[i], py[i], r * 4.5);
      g.addColorStop(0, 'rgba(' + col + ',' + (0.5 * tw * (0.5 + n.z)) + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px[i], py[i], r * 4.5, 0, Math.PI * 2); ctx.fill();
    }

    /* --- ядра узлов --- */
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const tw = 0.6 + 0.4 * Math.sin(t * n.sp + n.ph);
      ctx.fillStyle = n.gold
        ? 'rgba(190,235,255,' + (0.9 * tw) + ')'
        : 'rgba(255,255,255,' + (0.85 * tw) + ')';
      ctx.beginPath(); ctx.arc(px[i], py[i], n.r * 0.75, 0, Math.PI * 2); ctx.fill();
    }

    t += 0.016;
    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.tx = e.clientX - rect.left;
    mouse.ty = e.clientY - rect.top;
  });

  if (reduce) {
    t = 12; frame(); cancelAnimationFrame(raf);
  } else {
    frame();
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    resize();
    if (!reduce) frame();
  });
}

/* ===== SCROLL REVEAL ===== */
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

/* ===== SCROLL TOP ===== */
function initScrollTop() {
  const btn = document.getElementById('back-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('show', window.scrollY > 500);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ===== SEGMENTS ===== */
function renderSegments() {
  const grid = document.getElementById('segments-grid');
  if (!grid) return;
  grid.innerHTML = segments.map((s, i) => `
    <div class="segment-card reveal reveal-delay-${(i % 3) + 1}">
      <div class="segment-card__num">0${i + 1}</div>
      <h3 class="segment-card__title">${s.title}</h3>
      <p class="segment-card__desc">${s.description}</p>
    </div>
  `).join('');

  document.querySelectorAll('#segments-grid .reveal').forEach(el => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    obs.observe(el);
  });
}

/* ===== SPEAKERS ===== */
function renderSpeakers() {
  const grid = document.getElementById('speakers-grid');
  if (!grid) return;
  grid.innerHTML = speakers.map((s, i) => `
    <div class="speaker-card reveal reveal-delay-${(i % 3) + 1}">
      <div class="speaker-card__photo">
        ${s.photo ? `<img src="${s.photo}" alt="${s.name}" loading="lazy">` : `<span class="speaker-photo-label">ФОТО</span>`}
      </div>
      <div class="speaker-card__body">
        <div class="speaker-card__name">${s.name}${s.name2 ? `<span class="speaker-card__name-sep"> &amp; </span>${s.name2}` : ''}</div>
        <div class="speaker-card__cred">${s.credentials}${s.credentials2 ? `<br><br>${s.credentials2}` : ''}</div>
        <div class="speaker-card__topic">${s.topic}</div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('#speakers-grid .reveal').forEach(el => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.08 });
    obs.observe(el);
  });
}

/* ===== PRICING ===== */
function renderPricing() {
  const grid = document.getElementById('pricing-grid');
  if (!grid) return;
  grid.classList.toggle('pricing__grid--single', pricing.length === 1);
  grid.innerHTML = pricing.map((p, i) => {
    const hlClass = p.highlighted ? 'price-card--hl' : '';
    const promoClass = p.promo ? 'price-card--promo' : '';
    const badgeText = p.badgeText || 'Рекомендуем';
    const badgeClass = p.promo ? 'price-card__badge price-card__badge--promo' : 'price-card__badge';
    const badge = p.highlighted ? `<div class="${badgeClass}">${badgeText}</div>` : '';
    const subNote = p.priceNote
      ? `<div class="price-card__note-sm">${p.priceNote}</div><div class="price-card__note-sm">${p.priceLater}</div>`
      : '';
    const priceSm = p.priceDetail ? `<div class="price-card__note-sm">${p.priceDetail}</div>` : '';
    const lede = p.lede ? `<p class="price-card__lede">${p.lede}</p>` : '';
    const warning = p.note ? `<div class="price-card__warning">${p.note}</div>` : '';
    const useBlueCta = p.pairForm || p.formFormat === 'Очное';
    const btnStyle = useBlueCta ? 'btn--blue' : 'btn--outline';
    const cardId = p.anchorId ? ` id="${p.anchorId}"` : '';
    return `
      <div class="price-card ${hlClass} ${promoClass}"${cardId}>
        ${badge}
        <div class="price-card__title">${p.title}</div>
        <div class="price-card__sub">${p.subtitle}</div>
        ${lede}
        <div class="price-card__price">${p.price}</div>
        ${priceSm}
        ${subNote}
        <div class="price-card__divider"></div>
        <ul class="price-card__feats">
          ${p.features.map(f => `<li class="price-card__feat">${f}</li>`).join('')}
        </ul>
        ${warning}
        <button type="button" class="btn ${btnStyle} js-open-modal" data-plan="${i}">${p.cta || 'Занять место в зале'}</button>
      </div>
    `;
  }).join('');
}


/* ===== REVIEWS ===== */
function renderReviews() {
  const grid = document.getElementById('reviews-grid');
  if (!grid) return;
  grid.innerHTML = reviews.map((r, i) => `
    <div class="testi-card reveal reveal-delay-${(i % 3) + 1}">
      <div class="testi-card__mark">"</div>
      <p class="testi-card__text">${r.text}</p>
      <div class="testi-card__author">${r.author}</div>
    </div>
  `).join('');

  document.querySelectorAll('#reviews-grid .reveal').forEach(el => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    obs.observe(el);
  });
}

/* ===== REGISTRATION MODAL ===== */
function initModal() {
  const overlay = document.getElementById('reg-modal');
  const closeBtn = document.getElementById('modal-close');
  const form = document.getElementById('reg-form');
  const consent = document.getElementById('form-consent');
  const submitBtn = document.getElementById('modal-submit');
  if (!overlay || !form) return;

  let currentPlan = null;

  consent.addEventListener('change', () => {
    submitBtn.disabled = !consent.checked;
  });

  function cleanPayment() {
    const oldPayment = overlay.querySelector('.modal__payment');
    if (oldPayment) oldPayment.remove();
    overlay.classList.remove('modal-overlay--payment');
    const modalEl = overlay.querySelector('.modal');
    if (modalEl) modalEl.classList.remove('modal--has-payment');
  }

  const pairBlock = document.getElementById('modal-pair-fields');
  const legendP1 = document.getElementById('modal-legend-p1');
  const sharedHint = document.getElementById('modal-shared-hint');
  const consentText = document.getElementById('form-consent-text');
  const pairFieldIds = ['form-name2', 'form-email2', 'form-phone2', 'form-social2'];
  const CONSENT_DEFAULT = 'Я согласен на обработку моих персональных данных в соответствии с <a href="https://artlifecourse.getcourse.ru/page4" target="_blank">Условиями</a>';
  const CONSENT_PAIR = 'Мы согласны на обработку персональных данных участников в соответствии с <a href="https://artlifecourse.getcourse.ru/page4" target="_blank">Условиями</a>';

  function setPairFormMode(isPair) {
    if (pairBlock) pairBlock.hidden = !isPair;
    if (legendP1) legendP1.hidden = !isPair;
    if (sharedHint) sharedHint.hidden = !isPair;
    if (consentText) {
      consentText.innerHTML = isPair ? CONSENT_PAIR : CONSENT_DEFAULT;
    }
    document.querySelectorAll('#modal-fs-p1 .modal__label').forEach((el) => {
      const d = el.getAttribute('data-default-label');
      const pl = el.getAttribute('data-pair-label');
      if (d) el.textContent = isPair && pl ? pl : d;
    });
    pairFieldIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.required = isPair && id !== 'form-social2';
    });
  }

  function openModal(planIndex) {
    const p = pricing[planIndex];
    if (!p) return;
    currentPlan = p;
    document.getElementById('modal-title').textContent = p.title;
    document.getElementById('modal-subtitle').textContent = p.subtitle;
    const priceLine = p.modalPriceLine || ('Стоимость участия — ' + p.formPrice);
    document.getElementById('modal-price').textContent = priceLine;
    document.getElementById('form-format').value = p.formFormat;
    document.getElementById('form-price-val').value = p.formPrice;
    form.reset();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Участвовать';
    form.style.display = '';
    cleanPayment();
    setPairFormMode(!!p.pairForm);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeModal();
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.js-open-modal');
    if (btn) {
      e.preventDefault();
      openModal(parseInt(btn.dataset.plan, 10));
    }
  });

  document.querySelectorAll('.js-open-modal-default').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const defaultPlan = pricing.findIndex(p => p.highlighted);
      openModal(defaultPlan >= 0 ? defaultPlan : 1);
    });
  });

  function buildWidgetSrcdoc(plan) {
    const sid = plan.widgetScriptId || '';
    const src = plan.widgetScriptSrc || '';
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_top">
<style>
  html{
    margin:0;
    height:100%;
    overflow:auto;
    -webkit-overflow-scrolling:touch;
  }
  body{
    margin:0;
    min-height:100%;
    box-sizing:border-box;
    padding:14px 14px 48px;
    overflow-x:hidden;
    background:#fff;
    color:#111;
    font:14px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;
  }
  a{color:#0369a1;}
  .gc-loading{color:#666;text-align:center;padding:16px 8px;font-size:14px;}
  .gc-loading.is-hidden{display:none !important;}
</style>
</head><body>
<div class="gc-loading" id="gc-loader" role="status">Загружаем форму оплаты…</div>
<script id="${sid}" src="${src}"></script>
<script>
(function(){
  var el=document.getElementById('gc-loader');
  function hide(){ if(el){ el.classList.add('is-hidden'); el.setAttribute('aria-hidden','true'); } }
  function maybeHide(){
    if(document.querySelector('form input,form select,form textarea,form button')){ hide(); return true; }
    return false;
  }
  window.addEventListener('load',function(){ setTimeout(function(){ maybeHide()||hide(); },400); });
  setTimeout(hide,12000);
  try{
    var ob=new MutationObserver(function(){ if(maybeHide()) ob.disconnect(); });
    ob.observe(document.documentElement,{childList:true,subtree:true});
  }catch(e){}
})();
</script>
</body></html>`;
  }

  function renderPaymentWidget(plan) {
    form.style.display = 'none';
    cleanPayment();
    const modal = overlay.querySelector('.modal');
    const wrap = document.createElement('div');
    wrap.className = 'modal__payment';
    wrap.innerHTML = `
      <div class="modal__payment-head">
        <div class="modal__payment-icon">✓</div>
        <div class="modal__payment-title">Заявка принята</div>
        <p class="modal__payment-text">Осталось оплатить участие. Введите данные в форму оплаты ниже — она сформирует чек и переведёт на страницу оплаты.</p>
      </div>
      <div class="modal__payment-widget" id="modal-payment-widget"></div>
      <p class="modal__payment-fallback">Все поля и кнопка — внутри белой области; при длинной форме прокрутите её или всё окно. Проблемы с оплатой — <a href="mailto:support@anagran.ru">support@anagran.ru</a></p>
    `;
    modal.appendChild(wrap);

    overlay.classList.add('modal-overlay--payment');
    const modalEl = overlay.querySelector('.modal');
    if (modalEl) modalEl.classList.add('modal--has-payment');

    if (plan && plan.widgetScriptSrc) {
      const target = wrap.querySelector('#modal-payment-widget');
      const iframe = document.createElement('iframe');
      iframe.className = 'modal__payment-iframe' + (plan.pairForm ? ' modal__payment-iframe--pair' : '');
      iframe.setAttribute('title', 'Форма оплаты GetCourse');
      iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      iframe.setAttribute(
        'allow',
        'payment *; publickey-credentials-get *; clipboard-write; fullscreen'
      );
      iframe.setAttribute('scrolling', 'yes');
      iframe.srcdoc = buildWidgetSrcdoc(plan);
      target.appendChild(iframe);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';

    const isPair = currentPlan && currentPlan.pairForm;
    const data = {
      name: document.getElementById('form-name').value,
      email: document.getElementById('form-email').value,
      phone: document.getElementById('form-phone').value,
      social: document.getElementById('form-social').value,
      referral: document.getElementById('form-referral').value,
      specialization: document.getElementById('form-spec').value,
      format: document.getElementById('form-format').value,
      price: document.getElementById('form-price-val').value,
      paymentStatus: 'Не подтверждена',
      pairBooking: !!isPair,
      name2: isPair ? document.getElementById('form-name2').value : '',
      email2: isPair ? document.getElementById('form-email2').value : '',
      phone2: isPair ? document.getElementById('form-phone2').value : '',
      social2: isPair ? document.getElementById('form-social2').value : ''
    };

    if (APPS_SCRIPT_URL) {
      try {
        const payload = JSON.stringify(data);
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: 'payload=' + encodeURIComponent(payload)
        });
      } catch (err) {
        console.warn('Sheet submission error:', err);
      }
    }

    renderPaymentWidget(currentPlan);
  });
}
