const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwDC7-stmJkyWU3Wo_EEkRcD3UO-dvWaD_NFXYjCjKtKnR-9j6Cp7PUqN0ysM81d7Iu/exec';

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

/* ===== CANVAS — 3D FLOATING MOLECULES ===== */
function initCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, molecules, raf;

  /* --- 3D rotation helpers --- */
  function rotX(p, a) {
    return { x: p.x, y: p.y * Math.cos(a) - p.z * Math.sin(a), z: p.y * Math.sin(a) + p.z * Math.cos(a) };
  }
  function rotY(p, a) {
    return { x: p.x * Math.cos(a) + p.z * Math.sin(a), y: p.y, z: -p.x * Math.sin(a) + p.z * Math.cos(a) };
  }
  function rotZ(p, a) {
    return { x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a), z: p.z };
  }

  /* --- Molecule class --- */
  function Mol(cx, cy, scale) {
    this.cx = cx; this.cy = cy;
    this.vx = (Math.random() - 0.5) * 0.38;
    this.vy = (Math.random() - 0.5) * 0.38;
    this.scale = scale;
    this.ax = Math.random() * Math.PI * 2;
    this.ay = Math.random() * Math.PI * 2;
    this.az = Math.random() * Math.PI * 2;
    this.dax = (Math.random() - 0.5) * 0.014;
    this.day = (Math.random() - 0.5) * 0.011;
    this.daz = (Math.random() - 0.5) * 0.009;
    /* Tetrahedral atom positions (normalised) */
    this.base = [
      { x: 0,     y: 0,      z: 0,     r: 1.0 },
      { x: 0,     y: 0,      z: 1,     r: 0.62 },
      { x: 0.94,  y: 0,      z: -0.33, r: 0.62 },
      { x: -0.47, y:  0.82,  z: -0.33, r: 0.62 },
      { x: -0.47, y: -0.82,  z: -0.33, r: 0.62 },
    ];
  }

  Mol.prototype.project = function () {
    const fov = 5;
    return this.base.map(a => {
      let p = rotX({ x: a.x, y: a.y, z: a.z }, this.ax);
      p = rotY(p, this.ay);
      p = rotZ(p, this.az);
      const d = fov / (fov + p.z);
      return { sx: this.cx + p.x * this.scale * d, sy: this.cy + p.y * this.scale * d,
               sr: a.r * this.scale * 0.22 * d, depth: p.z };
    });
  };

  Mol.prototype.update = function () {
    this.cx += this.vx; this.cy += this.vy;
    this.ax += this.dax; this.ay += this.day; this.az += this.daz;
    const m = this.scale * 2.2;
    if (this.cx < m || this.cx > w - m) this.vx *= -1;
    if (this.cy < m || this.cy > h - m) this.vy *= -1;
  };

  Mol.prototype.draw = function (ctx) {
    const pts = this.project();
    const center = pts[0];
    const sorted = [...pts].sort((a, b) => a.depth - b.depth);

    /* bonds */
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i];
      const alpha = Math.max(0.12, Math.min(0.55, 0.3 + (a.depth + 1) * 0.15));
      ctx.beginPath();
      ctx.moveTo(center.sx, center.sy);
      ctx.lineTo(a.sx, a.sy);
      ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    /* atoms */
    sorted.forEach(atom => {
      const r = Math.max(2.5, atom.sr);
      const alpha = Math.max(0.25, Math.min(0.92, 0.45 + (atom.depth + 1) * 0.22));

      /* outer glow */
      const glow = ctx.createRadialGradient(atom.sx, atom.sy, 0, atom.sx, atom.sy, r * 2.8);
      glow.addColorStop(0, `rgba(14,165,233,${alpha * 0.22})`);
      glow.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(atom.sx, atom.sy, r * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = glow; ctx.fill();

      /* glass sphere */
      const hx = atom.sx - r * 0.33, hy = atom.sy - r * 0.33;
      const grad = ctx.createRadialGradient(hx, hy, r * 0.04, atom.sx, atom.sy, r);
      grad.addColorStop(0,    `rgba(230,248,255,${alpha * 0.75})`);
      grad.addColorStop(0.3,  `rgba(14,165,233,${alpha * 0.82})`);
      grad.addColorStop(0.72, `rgba(3,105,161,${alpha * 0.65})`);
      grad.addColorStop(1,    `rgba(2,25,55,${alpha * 0.45})`);
      ctx.beginPath(); ctx.arc(atom.sx, atom.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = grad; ctx.fill();

      /* rim */
      ctx.beginPath(); ctx.arc(atom.sx, atom.sy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56,189,248,${alpha * 0.38})`;
      ctx.lineWidth = 0.7; ctx.stroke();
    });
  };

  /* --- Subtle background dots --- */
  function makeDots() {
    const count = Math.min(50, Math.floor((w * h) / 18000));
    return Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 0.9 + 0.3,
    }));
  }

  function resize() {
    w = canvas.width  = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }

  function makeMolecules() {
    const count = w < 600 ? 3 : 6;
    const margin = 120;
    molecules = { mols: [], dots: makeDots() };
    for (let i = 0; i < count; i++) {
      const scale = 32 + Math.random() * 28;
      molecules.mols.push(new Mol(
        margin + Math.random() * (w - margin * 2),
        margin + Math.random() * (h - margin * 2),
        scale
      ));
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    /* background dots (very subtle) */
    molecules.dots.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56,189,248,0.18)'; ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    });

    /* molecules */
    molecules.mols.forEach(m => { m.update(); m.draw(ctx); });

    raf = requestAnimationFrame(draw);
  }

  resize();
  makeMolecules();
  draw();

  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    resize();
    makeMolecules();
    draw();
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
        <button type="button" class="btn ${btnStyle} js-open-modal" data-plan="${i}">${p.cta}</button>
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
  html,body{margin:0;padding:0;background:#fff;color:#111;font:14px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;}
  html,body{min-height:100%;}
  body{padding:14px 14px 40px;overflow-x:hidden;}
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
