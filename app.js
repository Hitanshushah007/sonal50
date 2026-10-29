/* SONAL — The Golden Issue. A couture magazine for Mom's 50th.
 * Everything personal (letters, photos, notes) is AES-GCM encrypted in c.bin / p/*.bin; the key travels only in the
 * link's #fragment (never sent to GitHub) and is remembered on this device. Wishes go to an Apps Script backend.
 */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animated = !!(G && ST) && !reduce;
  const KEY_STORE = 'sonal50:key';
  const rand = (a, b) => a + Math.random() * (b - a);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  if (animated) { G.registerPlugin(ST); ST.config({ ignoreMobileResize: true }); }
  else document.documentElement.classList.add('no-anim');

  /* ---------------- crypto ---------------- */
  const b64urlBytes = (s) => {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  };
  const importKey = (raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const decrypt = (key, buf) => {
    const b = new Uint8Array(buf);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12));
  };
  async function fetchDecrypt(key, url) {
    // c.bin's name never changes, so always revalidate it; photos are content-addressed and can stay cached
    const r = await fetch(url, { cache: url === 'c.bin' ? 'no-cache' : 'default' });
    if (!r.ok) throw new Error(url + ' → ' + r.status);
    return decrypt(key, await r.arrayBuffer());
  }
  async function wishToken(keyStr) {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('sonal50-wishes:' + keyStr));
    return [...new Uint8Array(d)].slice(0, 16).map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  function keyString() {
    const m = location.hash.replace(/^#/, '').match(/^(?:k=)?([A-Za-z0-9_-]{22,64})$/);
    if (m) {
      try { localStorage.setItem(KEY_STORE, m[1]); } catch (e) { /* private mode */ }
      return m[1];
    }
    try { return localStorage.getItem(KEY_STORE); } catch (e) { return null; }
  }

  /* ---------------- sequin glints (background) ---------------- */
  function startDust() {
    const cv = $('#dust');
    const ctx = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, parts = [], raf = 0;
    const tones = ['#f2d78f', '#fff3cf', '#e8b4a8', '#f6d2c4'];
    const resize = () => {
      w = cv.width = innerWidth * dpr; h = cv.height = innerHeight * dpr;
      const n = Math.round(Math.min(70, innerWidth * innerHeight / 14000));
      parts = Array.from({ length: n }, (_, i) => ({ x: rand(0, w), y: rand(0, h), r: rand(.5, 1.9) * dpr, v: rand(3, 11) * dpr, ph: rand(0, 6.28), tw: rand(.6, 1.6), c: tones[i % 4] }));
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        if (!reduce) { p.y -= p.v / 60; if (p.y < -10) { p.y = h + 10; p.x = rand(0, w); } }
        const tw = .5 + .5 * Math.sin(t / 1000 * p.tw + p.ph);
        ctx.globalAlpha = .2 + .65 * tw * tw;
        ctx.fillStyle = p.c;
        const x = p.x + Math.sin(t / 2400 + p.ph) * 6 * dpr;
        ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, 6.283); ctx.fill();
        if (tw > .92 && p.r > 1.2 * dpr) { ctx.globalAlpha = .5 * tw; ctx.fillRect(x - p.r * 3, p.y - .5, p.r * 6, 1); ctx.fillRect(x - .5, p.y - p.r * 3, 1, p.r * 6); }
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    resize(); addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(draw); });
    raf = requestAnimationFrame(draw);
  }

  /* ---------------- sequins + petals burst ---------------- */
  const confetti = (() => {
    const cv = $('#confetti');
    const ctx = cv.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let parts = [], raf = 0, last = 0;
    const colors = ['#f2d78f', '#e9c977', '#fff3cf', '#c97a82', '#f3dcd6', '#b3304d', '#b38a2e', '#ffffff'];
    const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
    size(); addEventListener('resize', size);
    function tick(t) {
      const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts = parts.filter((p) => p.y < cv.height + 40 && p.life > 0);
      for (const p of parts) {
        p.vx *= (1 - p.drag * dt); p.vy = p.vy * (1 - p.drag * dt) + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.fillStyle = p.c;
        if (p.kind === 0) { ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * .55, 0, 0, 6.283); ctx.fill(); }      // petal
        else if (p.kind === 1) { ctx.beginPath(); ctx.arc(0, 0, p.s * .42, 0, 6.283); ctx.fill(); ctx.globalAlpha *= .6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-p.s * .12, -p.s * .12, p.s * .14, 0, 6.283); ctx.fill(); } // sequin
        else ctx.fillRect(-p.s / 2, -p.s / 5, p.s, p.s / 2.5 * Math.abs(Math.cos(p.rot * 2)) + 1);                   // foil
        ctx.restore();
      }
      if (parts.length) raf = requestAnimationFrame(tick); else { raf = 0; ctx.clearRect(0, 0, cv.width, cv.height); }
    }
    return function burst(x, y, n = 90, spread = 1) {
      if (reduce) return;
      for (let i = 0; i < n; i++) {
        const a = rand(-Math.PI, 0) * spread - (spread - 1) * Math.PI / 2, sp = rand(250, 900) * dpr;
        parts.push({ x: x * dpr, y: y * dpr, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: rand(500, 900) * dpr, drag: rand(1.2, 2.6),
          rot: rand(0, 6), vr: rand(-8, 8), s: rand(6, 13) * dpr, c: colors[i % colors.length], kind: i % 3, life: rand(2.2, 3.6) });
      }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    };
  })();

  /* ---------------- music ---------------- */
  const music = { el: $('#music'), list: [], i: 0, on: false };
  function prepareMusic(list) {
    music.list = list && list.length ? list : ['music/birthday.m4a'];
    music.el.src = music.list[0];
    music.el.addEventListener('ended', () => {
      music.i = music.i + 1 < music.list.length ? music.i + 1 : Math.min(1, music.list.length - 1);   // "Happy Birthday" plays once; the light pieces loop
      music.el.src = music.list[music.i];
      music.el.play().catch(() => setSound(false));
    });
    $('#sound').addEventListener('click', () => (music.on ? pauseMusic() : playMusic()));
  }
  function setSound(on) {
    music.on = on;
    const b = $('#sound');
    b.classList.toggle('is-playing', on); b.classList.toggle('is-muted', !on);
    b.setAttribute('aria-label', on ? 'Pause the music' : 'Play the music');
  }
  function playMusic() { music.el.play().then(() => setSound(true)).catch(() => setSound(false)); }
  function pauseMusic() { music.el.pause(); setSound(false); }

  /* ---------------- pieces ---------------- */
  const goldDefs = `<defs><linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3cf"/><stop offset=".3" stop-color="#e9c977"/><stop offset=".62" stop-color="#b38a2e"/><stop offset=".82" stop-color="#f2d78f"/><stop offset="1" stop-color="#8d6421"/></linearGradient><radialGradient id="seal" cx=".34" cy=".28" r=".85"><stop offset="0" stop-color="#fff6d8"/><stop offset=".32" stop-color="#efd38c"/><stop offset=".7" stop-color="#c39a3c"/><stop offset="1" stop-color="#8d6421"/></radialGradient></defs>`;
  const flipIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>';
  const pos = (p) => (p && p.focus ? `object-position:${Math.round(p.focus[0] * 100)}% ${Math.round(p.focus[1] * 100)}%` : '');
  let lookNo = 0;

  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  function flipCard(p, opts = {}) {
    if (!p || !p.src) return '';
    const wide = p.w > p.h * 1.15;
    const no = opts.no || `Look ${String(++lookNo).padStart(2, '0')}`;
    const where = [p.where, p.year].filter(Boolean).join(' · ');
    const r = opts.r ?? 0;
    return `<figure class="look${wide ? ' is-wide' : ''}${opts.cls ? ' ' + opts.cls : ''}" style="--r:${r}deg" data-r="${r}">
      ${opts.pin === false ? '' : '<span class="look__pin" aria-hidden="true"></span>'}
      ${opts.year ? `<span class="look__year" aria-hidden="true">${esc(p.year || '')}</span>` : ''}
      <button class="look__card" type="button" aria-label="${esc(no + (where ? ', ' + where : ''))}. Tap to read our note." aria-pressed="false">
        <span class="look__face look__front">
          <img src="${p.url || BLANK}" data-src="${esc(p.src)}" alt="${esc(p.alt || where || 'A family photo')}" style="${pos(p)}" decoding="async">
          <span class="look__cap"><span class="look__no">${esc(no.toUpperCase())}</span><span class="look__where">${esc(where)}</span></span>
          <span class="look__hint" aria-hidden="true">${flipIcon}</span>
        </span>
        <span class="look__face look__back" aria-hidden="true">
          <span class="look__note">${esc(p.note || '')}</span>
          <span class="look__sig">${esc(p.sig || opts.sig || '— Hitanshu & Archita')}</span>
        </span>
      </button>
    </figure>`;
  }

  // a starburst seal: 28 points alternating between two radii
  const STAR = Array.from({ length: 56 }, (_, i) => { const a = (i / 56) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 44 : 49.5; return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`; }).join(' ');
  const BARS = '1 2 1 1 3 1 2 1 1 2 3 1 1 2 1 3 1 1 2 1 2 1 1 3 2 1'.split(' ').map(Number);
  function barcode() {
    let x = 0; const rects = BARS.map((w, i) => { const r = i % 2 ? '' : `<rect x="${x}" y="0" width="${w}" height="26"/>`; x += w; return r; }).join('');
    return `<svg viewBox="0 0 ${x} 26" aria-hidden="true">${rects}</svg>`;
  }
  function coverHTML(c, mast) {
    return `<div class="cover">
        <img class="cover__img" src="${c.cover.url}" alt="" style="${pos(c.cover)}">
        <div class="cover__top"><span>No. 50</span><span>30 · 10 · 2026</span></div>
        <div class="cover__head"><p class="cover__mast">${mast}</p>
          <p class="cover__issue">The Golden Jubilee Issue</p>
          <div class="cover__sticker"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="${STAR}" fill="url(#seal)"/><circle cx="50" cy="50" r="37" fill="none" stroke="#7d5815" stroke-width=".9" stroke-dasharray="1.6 2.2"/></svg>
            <span class="cover__sticker-t"><small>turning</small><b>50</b><small>&amp; fabulous</small></span></div>
        </div>
        <div class="cover__lines">
          <p class="cover__line"><b>The Feature</b>Sonal, in focus</p>
          <p class="cover__line"><b>The Stylist-in-Chief</b>How one woman dresses the whole family</p>
          <p class="cover__line"><b>The Lookbook</b>Ten years of looks, love &amp; looking after everyone</p>
        </div>
        <div class="cover__barcode">${barcode()}<span>PRICELESS · OCT 2026</span></div>
        <p class="cover__cue">scroll to turn the page</p>
      </div>`;
  }
  function insideHTML() {
    const rows = [['02', 'The Feature', 'Sonal, in focus'], ['03', 'The Glossary', 'Four names, one icon'], ['04', 'Inside the label', 'Made to measure, 1976'],
      ['05', 'The Stylist-in-Chief', 'She dresses us all'], ['06', 'The Lookbook', 'A decade of looks'], ['07', 'Letters', 'From Hitanshu, Archita & Papa'],
      ['10', 'The Front Row', 'Wishes from the family'], ['11', 'Make a wish', 'Five candles']];
    return `<div class="inside"><p class="inside__k">In this issue</p><p class="inside__h">Contents</p>
      <ol class="inside__list">${rows.map((r) => `<li><span class="inside__n">${r[0]}</span><span><b>${r[1]}</b>${r[2]}</span></li>`).join('')}</ol>
      <p class="inside__f">SONAL · THE GOLDEN ISSUE · NO. 50</p></div>`;
  }
  function pgCover(c) {
    const mast = 'SONAL'.split('').map((l) => `<span>${l}</span>`).join('');
    const front = coverHTML(c, mast), back = insideHTML();
    // the cover is three hinged strips (each a window onto the full cover), so the page can curl as it turns
    const seg = (i, inner) => `<div class="seg" style="--i:${i}">
        <div class="face face--front"><div class="face__in" style="left:calc((100% - .5px) * ${-i})">${front}</div><i class="face__shade"></i><i class="face__gloss"></i></div>
        <div class="face face--back"><div class="face__in" style="left:calc((100% - .5px) * ${-(2 - i)})">${back}</div><i class="face__shade"></i></div>
        ${inner || ''}</div>`;
    return `<div class="turn" id="turn">
      <div class="opening">
        <p class="kicker" data-intro>The Golden Issue · No. 50</p>
        <svg class="fifty" viewBox="0 0 300 190" role="img" aria-label="50">${goldDefs}
          <text class="fifty__fill" x="150" y="170" text-anchor="middle">50</text>
          <text class="fifty__stroke" x="150" y="170" text-anchor="middle">50</text></svg>
        <h2 class="opening__hb" data-intro>Happy Birthday, ${esc(c.mom)}</h2>
        <p class="guj" lang="gu" data-intro>જન્મદિવસની હાર્દિક શુભેચ્છાઓ</p>
        <p class="dates" data-intro>30 · 10 · 1976<span>✦</span>30 · 10 · 2026</p>
        <p class="editor" data-intro>${esc(c.editorNote)}</p>
        ${c.cover.credit ? `<p class="oncover" data-intro><b>On the cover</b> ${esc(c.cover.credit)}</p>` : ''}
      </div>
      <i class="turn__shadow" aria-hidden="true"></i>
      <div class="leaf" id="leaf" role="img" aria-label="The cover: SONAL, the Golden Jubilee Issue — ${esc(c.cover.alt || 'Sonal')}">
        <div class="leaf__flat">${front}</div>${seg(0, seg(1, seg(2)))}</div>
      <i class="peel" aria-hidden="true"><i class="peel__under"></i><i class="peel__flap"><i></i></i></i>
    </div>`;
  }

  function edImg(p, cls) {
    return `<figure class="ed ${cls || ''}" data-ed>
        <div class="ed__frame"><img src="${p.url || BLANK}" data-src="${esc(p.src)}" alt="${esc(p.alt || p.caption || 'Sonal')}" style="${pos(p)}" decoding="async"></div>
        <figcaption class="ed__cap">${p.label ? `<span class="ed__label">${esc(p.label)}</span>` : ''}${esc(p.caption || '')}</figcaption>
      </figure>`;
  }
  function pgFeature(c) {
    const f = c.feature;
    if (!f || !(f.items || []).length) return '';
    const body = f.items.map((it, i) => {
      if (it.quote) return `<p class="quote ed__quote" data-reveal>“${esc(it.quote)}”</p>`;
      if (it.pair) return `<div class="ed__pair">${it.pair.map((p) => edImg(p, 'ed--half')).join('')}</div>`;
      return edImg(it, i === 0 ? 'ed--hero' : (it.layout || ''));
    }).join('');
    return `<section class="pg pg--feature">
      <p class="kicker" data-reveal>${esc(f.kicker)}</p>
      <h2 class="headline" data-reveal>${f.headline}</h2>
      <p class="deck" data-reveal>${esc(f.deck)}</p>
      <div class="ed__flow">${body}</div>
      <p class="pg__folio">SONAL · 02</p>
    </section>`;
  }

  function pgGlossary(c) {
    return `<section class="pg">
      <p class="kicker" data-reveal>The Glossary</p>
      <h2 class="headline" data-reveal>Four names. <em>One icon.</em></h2>
      <dl class="gloss">${(c.glossary || []).map((g) => `<div class="gloss__item"><dt class="gloss__term">${esc(g.term)}${g.guj ? `<b lang="gu">${esc(g.guj)}</b>` : ''}<small>${esc(g.pos || '(n.)')}</small></dt>
          <dd class="gloss__def">${g.def}</dd></div>`).join('')}
      </dl>
      <p class="pg__folio">SONAL · 02</p>
    </section>`;
  }

  const ICON = {
    heart: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h24l-3 13H7z"/><path d="M16 21.5s-4.2-2.6-4.2-5.1a2.2 2.2 0 0 1 4.2-.9 2.2 2.2 0 0 1 4.2.9c0 2.5-4.2 5.1-4.2 5.1z"/></svg>',
    iron: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M5 23h22l-2.5-9H12a7 7 0 0 0-7 7z"/><path d="M14 14V10h8"/><path d="M6 7l20 20M26 7L6 27"/></svg>',
    hanger: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M13 8.5a3 3 0 1 1 4.2 2.7c-1 .5-1.2 1.2-1.2 2.3"/><path d="M16 13.5L4 22.5h24z"/></svg>',
    sun: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="16" cy="16" r="5.5"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></svg>',
  };
  function pgLabel(c) {
    return `<section class="pg pg--blush">
      <p class="kicker" data-reveal>Inside the label</p>
      <h2 class="headline" data-reveal>Made to measure, <em>1976</em></h2>
      <div class="label" data-reveal>
        <span class="label__loop" aria-hidden="true"></span>
        <p class="label__brand">SONAL</p>
        <p class="label__row">Made in India · 30 · 10 · 1976</p>
        <p class="label__big">Size <b>50</b> · one of a kind<br><b>100%</b> pure love<br><b>0%</b> compromise on outfits</p>
        <ul class="label__care">
          <li>${ICON.heart}Handle with love, every single day</li>
          <li>${ICON.iron}Never iron out the laughter lines</li>
          <li>${ICON.hanger}Always the best-dressed in the room</li>
          <li>${ICON.sun}Shines brightest around family</li>
        </ul>
      </div>
      <div class="counts">
        <div class="count" data-reveal><b data-to="50">50</b><span>years</span></div>
        <div class="count" data-reveal><b data-to="600">600</b><span>months</span></div>
        <div class="count" data-reveal><b data-to="18262">18,262</b><span>days</span></div>
        <div class="count" data-reveal><b data-to="1.89" data-dec="2" data-suffix=" bn">1.89 bn</b><span>heartbeats, give or take</span></div>
      </div>
      <p class="deck" data-reveal>…and on every one of those days, somebody in this family was being looked after by you.</p>
      <p class="pg__folio">SONAL · 03</p>
    </section>`;
  }

  function pgStylist(c) {
    const s = c.stylist || {};
    const photos = (s.photos || []).filter((p) => p.src);
    const board = photos.map((p, i) => flipCard(p, { no: p.no || 'Styled by Sonal', r: [-2.5, 2, 1.5, -2][i % 4], cls: photos.length % 2 && i === photos.length - 1 ? 'is-solo' : '' })).join('');
    return `<section class="pg">
      <p class="kicker" data-reveal>Cover story</p>
      <h2 class="headline" data-reveal>The <em>Stylist-in-Chief</em></h2>
      <p class="quote" data-reveal>“In this house, no outfit gets decided <span>without her</span>.”</p>
      <p class="deck" data-reveal>${esc(s.intro || '')}</p>
      <div class="credits" data-reveal><p class="credits__title">Fashion credits</p><ul class="credits-list">${(s.credits || []).map((x) => `<li><span class="role">${esc(x[0])}</span><span class="dots" aria-hidden="true"></span><b>${esc(x[1])}</b></li>`).join('')}</ul></div>
      <div class="swatches" aria-hidden="true" data-reveal><span class="swatch swatch--bandhani" style="--r:-6deg"></span><span class="swatch swatch--zari" style="--r:3deg"></span><span class="swatch swatch--silk" style="--r:-2deg"></span><span class="swatch swatch--leheriya" style="--r:5deg"></span><span class="swatch swatch--brocade" style="--r:-4deg"></span></div>
      ${board ? `<div class="board">${board}</div><p class="tap-tip">${flipIcon}tap a photo to turn it over</p>` : ''}
      <p class="pg__folio">SONAL · 04</p>
    </section>`;
  }

  function pgLookbook(c) {
    const looks = (c.looks || []).filter((p) => p.src);
    if (!looks.length) return '';
    const rs = [-2, 2.5, -1.5, 2, -2.5, 1.5];
    const years = looks.map((p) => +p.year).filter(Boolean);
    const span = years.length ? `${Math.min(...years)} – ${Math.max(...years)}` : '';
    return `<section class="pg pg--blush">
      <p class="kicker" data-reveal>The Lookbook${span ? ' · ' + span : ''}</p>
      <h2 class="headline" data-reveal>A decade of <em>looks</em></h2>
      <p class="deck" data-reveal>Some outfits, some places, and a lot of love. Tap any photo to read what we remember.</p>
      <div class="lookbook"><span class="tape" aria-hidden="true"></span>${looks.map((p, i) => flipCard(p, { r: rs[i % rs.length], year: true })).join('')}</div>
      <p class="pg__folio">SONAL · 05</p>
    </section>`;
  }

  function pgLetter(l, i) {
    const paras = l.body.map((t) => `<p data-line>${esc(t)}</p>`).join('');
    const photo = l.photo && l.photo.src ? `<div class="letter__photo" data-line>${flipCard(l.photo, { no: l.photo.no || 'Pinned to this letter', r: 0, pin: false, sig: '— ' + l.from })}</div>` : '';
    return `<section class="pg${i % 2 ? ' pg--blush' : ''}">
      <p class="kicker" data-reveal>${esc(l.kicker || (i === 0 ? 'Letters to the editor' : 'And one more letter'))}</p>
      <h2 class="headline" data-reveal>From <em>${esc(l.from)}</em></h2>
      <div class="env${animated ? '' : ' is-static'}">
        <div class="env__shell" aria-hidden="true"><div class="env__back"></div><div class="env__front"></div><div class="env__flap"></div><div class="env__seal">${esc(l.from[0])}</div></div>
        <article class="letter${l.paper === 'blush' ? ' letter--blush' : ''}">
          <p class="hi" data-line>${esc(l.salutation)}</p>${paras}
          <p class="bye" data-line>${esc(l.signoff)}</p><p class="sig" data-line>${esc(l.from)}</p>${photo}
        </article>
      </div>
      <p class="pg__folio">SONAL · ${String(6 + i).padStart(2, '0')}</p>
    </section>`;
  }

  function pgWishes(c) {
    return `<section class="pg pg--wine" id="wishes-pg">
      <p class="kicker" data-reveal>The Front Row</p>
      <h2 class="headline" data-reveal>Notes from <em>the front row</em></h2>
      <p class="deck" data-reveal>The best seats belong to the people who love her most. Take yours, and leave her a wish.</p>
      <div class="wishes" id="wishes"><p class="wishes__empty">Bringing in the guests…</p></div>
      <button class="btn btn--gold" type="button" id="wishBtn">Take a front-row seat</button>
      <p class="pg__folio">SONAL · 08</p>
    </section>`;
  }

  function pgFinale(c) {
    const candles = Array.from({ length: 5 }, () => '<span class="candle"><span class="flame"></span></span>').join('');
    const fin = c.finale && c.finale.src ? `<div class="finale__photo">${flipCard(c.finale, { no: c.finale.no || 'The best look', r: 0 })}</div>` : '';
    return `<section class="pg" id="cake-pg">
      <p class="kicker" data-reveal>Make a wish, ${esc(c.mom)}</p>
      <h2 class="headline" data-reveal>Five candles, <em>one for every decade</em></h2>
      <button class="cake" type="button" id="cake" aria-label="Blow out the candles">
        <span class="cake__plate"></span><span class="cake__tier cake__tier--1"></span><span class="cake__tier cake__tier--2"></span>
        <span class="cake__candles">${candles}</span>
      </button>
      <p class="cake__hint" id="cakeHint">Close your eyes, make a wish, then tap the cake.</p>
      <button class="cake__mic" type="button" id="cakeMic">or blow into your phone</button>
      <div class="finale" id="finale" hidden>
        <h2 class="finale__hb">Happy 50th, ${esc(c.mom)}!</h2>
        <p class="guj" lang="gu">જન્મદિવસની હાર્દિક શુભેચ્છાઓ</p>
        ${fin}
        <p class="love">With all our love,<span class="sig">${esc(c.from)}</span></p>
        <button class="btn btn--ghost" type="button" id="again">Read the issue again</button>
        <p class="colophon">${esc(c.credits || '')}</p>
      </div>
      <p class="pg__folio">SONAL · 09</p>
    </section>`;
  }

  function render(c) {
    lookNo = 0;
    const html = pgCover(c) + pgFeature(c) + pgGlossary(c) + pgLabel(c) + pgStylist(c) + pgLookbook(c) + (c.letters || []).map(pgLetter).join('') + pgWishes(c) + pgFinale(c);
    $('#issue').innerHTML = html;
    $$('.pg__folio').forEach((f, i) => { f.textContent = `SONAL · ${String(i + 2).padStart(2, '0')}`; });
    $$('.look__card').forEach((btn) => btn.addEventListener('click', () => flip(btn.closest('.look'))));
  }

  function flip(look) {
    const on = !look.classList.contains('is-flipped');
    look.classList.toggle('is-flipped', on);
    const btn = $('.look__card', look);
    btn.setAttribute('aria-pressed', String(on));
    $('.look__back', look).setAttribute('aria-hidden', String(!on));
    if (on && !look.dataset.sparkled) {
      look.dataset.sparkled = '1';
      const r = look.getBoundingClientRect();
      setTimeout(() => confetti(r.left + r.width / 2, r.top + r.height * .35, 26, .7), 380);
    }
  }

  /* ---------------- opening the gift ---------------- */
  function sizeMini() {
    const gift = $('.gift'), mini = $('.mini'), cover = $('#leaf');
    const g = gift.getBoundingClientRect(), t = cover.getBoundingClientRect();
    const w = g.width * .64, h = w * (t.height / t.width);
    Object.assign(mini.style, { width: `${w}px`, height: `${h}px`, marginLeft: `${-w / 2}px` });
    const mast = $('.mini__mast');
    const big = $('.cover__mast');
    const k = w / t.width;
    mast.style.fontSize = `${parseFloat(getComputedStyle(big).fontSize) * k}px`;
    mast.style.top = `${(big.getBoundingClientRect().top - t.top) * k}px`; mast.style.lineHeight = getComputedStyle(big).lineHeight === 'normal' ? '.9' : `${parseFloat(getComputedStyle(big).lineHeight) * k}px`;
    return { w, h };
  }

  function openGift() {
    playMusic();
    $('#sound').hidden = false;
    if (!animated) { $('#stage').hidden = true; document.body.classList.remove('is-boxed'); setupStatic(); return; }
    sizeMini();
    G.set('.cover__top, .cover__issue, .cover__line', { opacity: 0, y: 12 });
    G.set('.cover__sticker, .cover__cue', { opacity: 0 });
    const tl = G.timeline({ defaults: { ease: 'power2.out' } });
    tl.to('#open, .stage__hint', { opacity: 0, y: 12, duration: .3 })
      .to('.gift__tag', { rotate: 30, y: 90, opacity: 0, duration: .7, ease: 'power2.in' }, '<.05')
      .to('.bow-loop, .bow-knot', { scale: 0, opacity: 0, duration: .45, ease: 'back.in(2)', stagger: .05 }, '<.15')
      .add(() => { const r = $('.gift__bow').getBoundingClientRect(); confetti(r.left, r.top, 36, .6); }, '<.25')
      .to('.bow-tail', { y: 50, opacity: 0, duration: .5, ease: 'power2.in' }, '<')
      .to('.gift__ribbon-v', { scaleY: 0, transformOrigin: '50% 100%', duration: .55, ease: 'power2.in' }, '<.1')
      .to('.gift__ribbon-h', { scaleX: 0, transformOrigin: '100% 50%', duration: .55, ease: 'power2.in' }, '<')
      .to('.gift__lid', { y: -170, x: 40, rotate: -12, opacity: 0, duration: 1, ease: 'power2.inOut' }, '>-.1')
      .set('.gift__tissue', { opacity: 1 }, '<.2')
      .fromTo('.gift__tissue span:first-child', { x: 0 }, { x: '-60%', rotate: -8, opacity: 0, duration: .9 }, '<.2')
      .fromTo('.gift__tissue span:last-child', { x: 0 }, { x: '60%', rotate: 8, opacity: 0, duration: .9 }, '<')
      .to('.stage__kicker, .stage__line', { opacity: 0, y: -16, duration: .5 }, '<')
      .fromTo('.mini', { opacity: 0, y: 40 }, { opacity: 1, y: () => -$('.mini').offsetHeight * .5, duration: 1.1, ease: 'power2.out' }, '<.1');
    tl.add(() => {
      const mini = $('.mini'), a = mini.getBoundingClientRect(), b = $('#leaf').getBoundingClientRect();
      G.set(mini, { zIndex: 20 });
      const t2 = G.timeline({ onComplete: afterOpen });
      t2.to(mini, { x: `+=${b.left - a.left}`, y: `+=${b.top - a.top}`, scale: b.width / a.width, duration: 1.1, ease: 'power3.inOut' })
        .to('.gift__base, .gift__tissue', { opacity: 0, duration: .5 }, '<')
        .to('#stage', { backgroundColor: 'rgba(0,0,0,0)', duration: .9 }, '<.2');
    }, '+=.05');
  }

  function afterOpen() {
    $('#stage').hidden = true;
    document.body.classList.remove('is-boxed');
    const r = $('.cover__sticker').getBoundingClientRect();
    G.timeline()
      .to('.cover__top, .cover__issue, .cover__line', { opacity: 1, y: 0, duration: .7, stagger: .1 })
      .fromTo('.cover__sticker', { scale: 0, rotate: -90 }, { opacity: 1, scale: 1, rotate: -12, duration: .8, ease: 'back.out(2)' }, '-=.4')
      .add(() => confetti(r.left + r.width / 2, r.top + r.height / 2, 60, 1.2), '-=.3')
      .to('.cover__cue', { opacity: 1, duration: .6 });
    setupScrollAnimations();
  }

  /* ---------------- the page turn ---------------- */
  const turnState = { p: 0 };
  const rad = (d) => d * Math.PI / 180;
  function renderTurn(q) {
    const segs = $$('#leaf .seg');
    const e = Math.pow(q, 1.9);   // the edge peels slowly; the page is off screen past ~100°, so the visible part gets most of the scroll
    const th = 180 * e, curl = 72 * Math.sin(Math.PI * q);           // the outer edge leads: the page bends
    const w1 = Math.max(0, th - curl * .55), w3 = Math.min(180, th + curl * .45), w2 = Math.min(Math.max((w1 + w3) / 2, w1), w3);
    const world = [w1, w2, w3], rel = [w1, w2 - w1, w3 - w2];
    const shade = (a) => Math.sin(rad(a)) * (a < 90 ? .55 : .4);      // a tilted page catches less light
    const seam = [world[0], (world[0] + world[1]) / 2, (world[1] + world[2]) / 2, world[2]];
    segs.forEach((sg, i) => {
      sg.style.transform = `rotateY(${-rel[i]}deg)`;
      sg.style.setProperty('--sl', shade(seam[i]).toFixed(3));
      sg.style.setProperty('--sr', shade(seam[i + 1]).toFixed(3));
      sg.style.setProperty('--gl', Math.max(0, Math.sin(rad(world[i] * 2)) * .6).toFixed(3));
    });
    const edge = Math.max(0, (Math.cos(rad(w1)) + Math.cos(rad(w2)) + Math.cos(rad(w3))) / 3);   // where the page's edge falls
    $('#turn').style.setProperty('--shw', `${(edge * 100).toFixed(1)}%`);
    $('#turn').style.setProperty('--sho', (q > 0 ? Math.min(1, Math.sin(rad(Math.min(w2, 90))) * 1.6) * Math.min(1, edge * 3) : 0).toFixed(3));
    $('#turn').classList.toggle('is-turning', q > .004);
  }

  /* ---------------- scroll animations ---------------- */
  function setupScrollAnimations() {
    renderTurn(0);
    // the cover turns like a page, and the golden "50" writes itself underneath
    const stroke = $('.fifty__stroke');
    G.set(stroke, { strokeDasharray: 900, strokeDashoffset: 900 });
    G.set('.fifty__fill', { opacity: 0 });
    G.set('.opening [data-intro]', { opacity: 0, y: 16 });
    let burst = false;
    G.timeline({
      scrollTrigger: {
        trigger: '#turn', start: 'top top', end: '+=140%', pin: true, scrub: .6, anticipatePin: 1,
        onUpdate: (s) => { if (!burst && s.progress > .92) { burst = true; const r = $('.fifty').getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height * .6, 70, 1.4); } },
      },
    })
      .to(turnState, { p: 1, duration: .85, ease: 'none', onUpdate: () => renderTurn(turnState.p) }, 0)
      .to(stroke, { strokeDashoffset: 0, duration: .6, ease: 'none' }, .03)
      .to('.fifty__fill', { opacity: 1, duration: .25 }, .62)
      .to(stroke, { opacity: .25, duration: .2 }, .72)
      .to('.opening [data-intro]', { opacity: 1, y: 0, duration: .25, stagger: .06 }, .22)
      .to({}, { duration: .3 });

    $$('[data-reveal]').forEach((el) => G.from(el, { opacity: 0, y: 26, duration: .9, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
    $$('[data-ed]').forEach((fig) => {
      const img = $('img', fig), cap = $('.ed__cap', fig);
      G.fromTo($('.ed__frame', fig), { clipPath: 'inset(18% 0 0 0)', opacity: 0 }, { clipPath: 'inset(0% 0 0 0)', opacity: 1, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: fig, start: 'top 85%', once: true } });
      G.fromTo(img, { scale: 1.12 }, { scale: 1, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: fig, start: 'top 85%', once: true } });
      if (cap) G.from(cap, { opacity: 0, y: 12, duration: .9, delay: .4, scrollTrigger: { trigger: fig, start: 'top 80%', once: true } });
      if (fig.classList.contains('ed--hero')) G.to(img, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.gloss__item').forEach((el) => G.from(el, { opacity: 0, x: -24, duration: 1, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } }));

    $$('.count b').forEach((b) => {
      const to = +b.dataset.to, dec = +(b.dataset.dec || 0), suf = b.dataset.suffix || '';
      const o = { v: 0 };
      b.textContent = (dec ? (0).toFixed(dec) : '0') + suf;
      ST.create({ trigger: b, start: 'top 90%', once: true, onEnter: () => G.to(o, {
        v: to, duration: 2.2, ease: 'power2.out',
        onUpdate: () => { b.textContent = (dec ? o.v.toFixed(dec) : Math.round(o.v).toLocaleString('en-IN')) + suf; },
      }) });
    });

    // every look swings in on its pin, like a garment hung on a rail
    $$('.board .look, .lookbook .look').forEach((el) => {
      const r = +el.dataset.r || 0;
      G.fromTo(el, { rotate: r + (Math.random() < .5 ? -16 : 16), y: 40, opacity: 0, transformOrigin: '50% -10px' },
        { rotate: r, y: 0, opacity: 1, duration: 1.6, ease: 'elastic.out(1, .55)', scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    });
    // the first card of each board turns over once, to show that they flip
    $$('.board, .lookbook').forEach((box) => {
      const first = $('.look', box);
      if (!first) return;
      ST.create({ trigger: first, start: 'top 60%', once: true, onEnter: () => {
        setTimeout(() => { if (!first.classList.contains('is-flipped')) { first.classList.add('is-flipped'); setTimeout(() => first.classList.remove('is-flipped'), 1700); } }, 1300);
      } });
    });

    $$('.env').forEach(setupEnvelope);
    requestAnimationFrame(() => ST.refresh());
  }

  function setupEnvelope(env) {
    const shell = $('.env__shell', env), flap = $('.env__flap', env), seal = $('.env__seal', env), letter = $('.letter', env);
    const lines = $$(':scope > [data-line]', letter);
    G.set(letter, { clipPath: 'inset(0 0 calc(100% - 150px) 0)', y: 96 });
    G.set(lines.slice(1), { clipPath: 'inset(0 100% 0 0)' });
    const tl = G.timeline({ paused: true });
    tl.to(seal, { scale: 0, rotate: 25, opacity: 0, duration: .35, ease: 'back.in(2)' })
      .to(flap, { rotateX: 180, duration: .7, ease: 'power2.inOut' })
      .set(flap, { zIndex: 1 }, '-=.35')
      .to(letter, { y: -10, duration: .8, ease: 'power2.out' }, '-=.15')
      .to(shell, { y: 120, opacity: 0, duration: .7, ease: 'power2.in' }, '-=.2')
      .to(letter, { y: 0, clipPath: 'inset(0 0 0% 0)', duration: 1.2, ease: 'power2.inOut' }, '-=.4')
      .to(lines.slice(1), { clipPath: 'inset(0 0% 0 0)', duration: 1, stagger: .45, ease: 'power1.inOut' }, '-=.8')
      .add(() => { G.set(letter, { clearProps: 'clipPath' }); G.set(lines, { clearProps: 'clipPath' }); });
    ST.create({ trigger: env, start: 'top 70%', once: true, onEnter: () => tl.play() });
  }

  function setupStatic() {
    $$('.env').forEach((e) => e.classList.add('is-static'));
  }

  /* ---------------- wishes (the front row) ---------------- */
  const wishes = { api: '', token: '', list: [] };
  function wishCard(w, i) {
    const r = ((i * 29) % 5) - 2;
    return `<blockquote class="wish" data-seat="Front row · Seat ${String(i + 1).padStart(2, '0')}" style="--r:${r * .6}deg"><p>${esc(w.text)}</p><footer>${esc(w.name)}${w.rel ? ` <span>· ${esc(w.rel)}</span>` : ''}</footer></blockquote>`;
  }
  function paintWishes() {
    const box = $('#wishes');
    box.innerHTML = wishes.list.length ? wishes.list.map(wishCard).join('') : '<p class="wishes__empty">The front row is waiting. Be the first to take a seat.</p>';
    if (animated) { $$('.wish', box).forEach((el) => G.from(el, { opacity: 0, y: 24, duration: .8, scrollTrigger: { trigger: el, start: 'top 92%', once: true } })); ST.refresh(); }
  }
  async function loadWishes() {
    if (!wishes.api) { paintWishes(); return; }
    try {
      const r = await fetch(`${wishes.api}?api=wishes&t=${wishes.token}`);
      const d = await r.json();
      if (d.ok) wishes.list = d.wishes || [];
    } catch (e) { console.warn('wishes', e); }
    paintWishes();
  }
  function initWishes(api, token) {
    wishes.api = api || ''; wishes.token = token;
    const sheet = $('#sheet'), form = $('#wishForm'), msg = $('#wMsg'), text = $('#wText');
    const open = () => { sheet.hidden = false; msg.textContent = ''; setTimeout(() => $('#wName').focus(), 50); };
    const close = () => { sheet.hidden = true; $('#wishBtn').focus(); };
    $('#wishBtn').addEventListener('click', open);
    $('#wCancel').addEventListener('click', close);
    sheet.addEventListener('click', (e) => { if (e.target === sheet) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) close(); });
    text.addEventListener('input', () => { $('#wCount').textContent = `${text.value.length} / 1200`; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#wName').value.trim(), rel = $('#wRel').value.trim(), body = text.value.trim();
      if (!name || !body) { msg.textContent = 'Please add your name and a few words.'; return; }
      if (!wishes.api) { msg.textContent = "Wishes aren't switched on yet — please try again a little later."; return; }
      const send = $('#wSend'); send.disabled = true; msg.textContent = 'Taking your seat…';
      try {
        const r = await fetch(wishes.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ op: 'wish', t: wishes.token, name, rel, text: body }) });
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || 'failed');
        wishes.list.push(d.wish); form.reset(); $('#wCount').textContent = '0 / 1200';
        close(); paintWishes();
        const last = $$('#wishes .wish').pop();
        if (last) { last.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); setTimeout(() => { const b = last.getBoundingClientRect(); confetti(b.left + b.width / 2, b.top + 20, 50, .9); }, 500); }
      } catch (err) {
        console.warn(err); msg.textContent = "Sorry — that didn't go through. Please check your internet and try again.";
      } finally { send.disabled = false; }
    });
    loadWishes();
  }

  /* ---------------- cake ---------------- */
  let blown = false;
  function blowOut() {
    if (blown) return; blown = true;
    if (!music.on) playMusic();
    const flames = $$('.flame'), hint = $('#cakeHint'), mic = $('#cakeMic');
    hint.textContent = 'Your wish is on its way…'; mic.hidden = true;
    const done = () => {
      const fin = $('#finale'); fin.hidden = false;
      const r = $('#cake').getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + 40, 160, 1.6);
      setTimeout(() => confetti(innerWidth * .2, innerHeight * .4, 70, 1.2), 350);
      setTimeout(() => confetti(innerWidth * .8, innerHeight * .4, 70, 1.2), 650);
      hint.textContent = 'Wish made ✦';
      if (animated) { G.from(fin.children, { opacity: 0, y: 22, duration: .9, stagger: .18, ease: 'power2.out' }); ST.refresh(); }
    };
    if (!animated) { flames.forEach((f) => (f.style.opacity = 0)); done(); return; }
    const tl = G.timeline({ onComplete: done });
    flames.forEach((f, i) => {
      const smoke = document.createElement('span'); smoke.className = 'smoke'; f.parentNode.appendChild(smoke);
      tl.to(f, { scaleY: 1.4, scaleX: .5, skewX: -14, duration: .12, ease: 'power1.in' }, i * .16)
        .to(f, { scale: 0, opacity: 0, duration: .18 }, i * .16 + .12)
        .fromTo(smoke, { opacity: .7, y: 0, scale: 1 }, { opacity: 0, y: -46, x: rand(-8, 8), scale: 3.2, duration: 1.3, ease: 'power1.out' }, i * .16 + .16);
    });
  }
  function relight() {
    blown = false;
    $$('.smoke').forEach((s) => s.remove());
    $$('.flame').forEach((f) => { f.style.cssText = ''; if (animated) G.set(f, { clearProps: 'all' }); });
    $('#finale').hidden = true; $('#cakeMic').hidden = false;
    $('#cakeHint').textContent = 'Close your eyes, make a wish, then tap the cake.';
  }
  async function listenForBlow() {
    const hint = $('#cakeHint'), mic = $('#cakeMic');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser();
      an.fftSize = 1024; src.connect(an);
      const buf = new Float32Array(an.fftSize);
      hint.textContent = 'Now blow on your phone, like it’s the cake!'; mic.hidden = true;
      let loud = 0; const t0 = performance.now();
      const stop = () => { stream.getTracks().forEach((t) => t.stop()); ac.close(); };
      const step = () => {
        an.getFloatTimeDomainData(buf);
        let s = 0; for (const v of buf) s += v * v;
        loud = Math.sqrt(s / buf.length) > .12 ? loud + 1 : Math.max(0, loud - 1);
        if (loud > 8) { stop(); blowOut(); return; }
        if (performance.now() - t0 > 20000) { stop(); hint.textContent = 'No breeze reached me — just tap the cake instead.'; return; }
        if (!blown) requestAnimationFrame(step); else stop();
      };
      step();
    } catch (e) {
      hint.textContent = 'No problem — just tap the cake to blow them out.'; mic.hidden = true;
    }
  }

  /* ---------------- boot ---------------- */
  function showGate() { $('#stage').hidden = true; $('#issue').hidden = true; $('#gate').hidden = false; }
  function photosIn(c) {
    const feat = ((c.feature && c.feature.items) || []).flatMap((it) => it.pair || [it]).filter((it) => !it.quote);
    const out = [c.cover, c.finale, ...feat, ...(c.looks || []), ...((c.stylist && c.stylist.photos) || []), ...(c.letters || []).map((l) => l.photo)];
    return out.filter((p) => p && p.src);
  }
  async function boot() {
    startDust();
    const ks = keyString();
    if (!ks || !(window.crypto && crypto.subtle)) return showGate();
    const btn = $('#open');
    let key, content;
    try {
      key = await importKey(b64urlBytes(ks));
      content = JSON.parse(new TextDecoder().decode(await fetchDecrypt(key, 'c.bin')));
    } catch (e) {
      console.warn('open failed', e);
      try { localStorage.removeItem(KEY_STORE); } catch (_) { /* ignore */ }
      return showGate();
    }
    // the cover must be ready before the box opens; every other photo streams in behind it
    btn.textContent = 'Preparing your gift…';
    const urls = new Map();
    const load = (src) => {
      if (!urls.has(src)) urls.set(src, fetchDecrypt(key, src).then((buf) => URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }))).catch((e) => { console.warn('photo', src, e); return null; }));
      return urls.get(src);
    };
    content.cover.url = await load(content.cover.src);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    render(content);
    $('#issue').hidden = false;
    $('.mini img').src = content.cover.url; $('.mini img').style.cssText = pos(content.cover);
    await Promise.all([$('.cover__img'), $('.mini img')].map((im) => (im.decode ? im.decode().catch(() => {}) : null)));
    const rest = [...new Set(photosIn(content).map((p) => p.src))].filter((src) => src !== content.cover.src);
    (async () => {
      let k = 0;
      const worker = async () => { while (k < rest.length) { const src = rest[k++]; const u = await load(src); if (u) $$(`img[data-src="${src}"]`).forEach((im) => { im.src = u; }); } };
      await Promise.all([worker(), worker(), worker()]);
    })();
    prepareMusic(content.music);
    initWishes(content.wishesApi, await wishToken(ks));
    $('#cake').addEventListener('click', blowOut);
    $('#cakeMic').addEventListener('click', listenForBlow);
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) $('#cakeMic').hidden = true;
    $('#again').addEventListener('click', () => { relight(); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    btn.disabled = false; btn.textContent = 'Untie the ribbon';
    btn.addEventListener('click', openGift, { once: true });
  }
  boot();
})();
