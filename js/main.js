/* TODO: после настройки Apps Script вставьте сюда URL веб-приложения */
const APPS_SCRIPT_URL = '';

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
        <div class="speaker-card__name">${s.name}</div>
        <div class="speaker-card__cred">${s.credentials}</div>
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
    const badge   = p.highlighted ? '<div class="price-card__badge">Рекомендуем</div>' : '';
    const subNote = p.priceNote
      ? `<div class="price-card__note-sm">${p.priceNote}</div><div class="price-card__note-sm">${p.priceLater}</div>`
      : '';
    const warning = p.note ? `<div class="price-card__warning">${p.note}</div>` : '';
    const btnStyle = p.highlighted ? 'btn--blue' : 'btn--ghost';
    return `
      <div class="price-card ${hlClass}">
        ${badge}
        <div class="price-card__title">${p.title}</div>
        <div class="price-card__sub">${p.subtitle}</div>
        <div class="price-card__price">${p.price}</div>
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

  consent.addEventListener('change', () => {
    submitBtn.disabled = !consent.checked;
  });

  function openModal(planIndex) {
    const p = pricing[planIndex];
    if (!p) return;
    document.getElementById('modal-title').textContent = p.title;
    document.getElementById('modal-subtitle').textContent = p.subtitle;
    document.getElementById('modal-price').textContent = 'Стоимость участия — ' + p.formPrice;
    document.getElementById('form-format').value = p.formFormat;
    document.getElementById('form-price-val').value = p.formPrice;
    document.getElementById('form-payment-url').value = p.paymentUrl || '#';
    form.reset();
    submitBtn.disabled = true;
    overlay.querySelector('.modal__form').style.display = '';
    const success = overlay.querySelector('.modal__success');
    if (success) success.remove();
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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';

    const data = {
      name: document.getElementById('form-name').value,
      email: document.getElementById('form-email').value,
      phone: document.getElementById('form-phone').value,
      social: document.getElementById('form-social').value,
      referral: document.getElementById('form-referral').value,
      specialization: document.getElementById('form-spec').value,
      format: document.getElementById('form-format').value,
      price: document.getElementById('form-price-val').value
    };

    const paymentUrl = document.getElementById('form-payment-url').value;

    if (APPS_SCRIPT_URL) {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } catch (err) {
        console.warn('Sheet submission error:', err);
      }
    }

    if (paymentUrl && paymentUrl !== '#') {
      window.location.href = paymentUrl;
    } else {
      form.style.display = 'none';
      const modal = overlay.querySelector('.modal');
      const successDiv = document.createElement('div');
      successDiv.className = 'modal__success';
      successDiv.innerHTML = `
        <div class="modal__success-icon">✓</div>
        <div class="modal__success-title">Заявка отправлена!</div>
        <p class="modal__success-text">Спасибо за регистрацию. Ссылка на оплату будет доступна в ближайшее время.</p>
      `;
      modal.appendChild(successDiv);
    }
  });
}
