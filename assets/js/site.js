// ORPI website: navigation, the occasions list, the reviews by the Get a
// quote buttons, and carrying ad/link attribution (utm_*, l, fbclid) from the
// landing page through to the enquiry form. Nothing is stored on the
// visitor's device for this: the parameters ride along on the links to
// /enquire.
(function () {
  'use strict';

  // ── Mobile menu ──────────────────────────────────────────
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('mobile-menu');
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
    document.body.classList.toggle('menu-open', open);
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.matchMedia('(min-width: 1080px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  // ── Occasions: the photo and a review follow the row you're on (desktop) ──
  var list = document.querySelector('.occ-list');
  if (list) {
    var rows = Array.prototype.slice.call(list.querySelectorAll('.occ'));
    var pics = Array.prototype.slice.call(document.querySelectorAll('.occ-media img'));
    // Each row's review is copied beside the photo so it changes with it. The
    // copies are hidden from screen readers, which read each row's own.
    var shelf = document.querySelector('.occ-rvs');
    var cards = rows.map(function (row) {
      var rv = row.querySelector('.occ-rv');
      if (!shelf || !rv) return null;
      var card = rv.cloneNode(true);
      card.classList.toggle('on', row.classList.contains('on'));
      shelf.appendChild(card);
      return card;
    });
    var activate = function (row) {
      rows.forEach(function (r, k) {
        r.classList.toggle('on', r === row);
        if (cards[k]) cards[k].classList.toggle('on', r === row);
      });
      var i = Number(row.getAttribute('data-img'));
      pics.forEach(function (p, k) { p.classList.toggle('on', k === i); });
    };
    rows.forEach(function (row) {
      row.addEventListener('pointerenter', function () { activate(row); });
      row.addEventListener('focusin', function () { activate(row); });
    });
  }

  // ── A short review by the Get a quote buttons (computers) ──
  // Resting the mouse on a button marked data-nudge, or reaching it with the
  // keyboard, shows one line from a real review above it, for the moment
  // someone's deciding (Ruds, 29 Oct 2026). The lines come from
  // _src/reviews.json through the page. Each button keeps its line and the
  // buttons take turns, so one visit sees different ones. Esc closes it.
  // Phones don't get it: a tap goes straight to the form, and the reviews
  // through the page do the work there.
  var poolEl = document.getElementById('rv-nudges');
  var pool = [];
  try { pool = JSON.parse(poolEl ? poolEl.textContent : '[]') || []; } catch (e) { pool = []; }
  if (pool.length) {
    for (var s = pool.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var t = pool[s]; pool[s] = pool[j]; pool[j] = t;
    }
    var mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
    var tip = document.createElement('div');
    tip.className = 'nudge';
    tip.setAttribute('aria-hidden', 'true');
    tip.hidden = true;
    tip.innerHTML = '<p class="nudge-q"></p><p class="nudge-by"></p>';
    document.body.appendChild(tip);
    var turn = 0, openTimer = 0, closeTimer = 0, current = null, dismissed = null;
    var hide = function () {
      clearTimeout(openTimer); clearTimeout(closeTimer);
      current = null;
      tip.classList.remove('on');
      tip.hidden = true;
    };
    var show = function (btn) {
      clearTimeout(closeTimer);
      if (current === btn) return;
      if (!btn._rvLine) { btn._rvLine = pool[turn % pool.length]; turn++; }
      tip.firstChild.textContent = btn._rvLine.q;
      tip.lastChild.textContent = btn._rvLine.by;
      // Dark on light surfaces, light on dark ones.
      tip.classList.toggle('light', !!btn.closest('.dark, .hero, .cta, .nav, .feature'));
      tip.classList.remove('on');
      tip.hidden = false;
      // Above the button, or below it when the sticky bar would cover it.
      var r = btn.getBoundingClientRect();
      var nav = document.querySelector('.nav');
      var navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
      var top = r.top - 10 - tip.offsetHeight;
      var below = top < navBottom + 8;
      if (below) top = r.bottom + 10;
      var room = document.documentElement.clientWidth - 16 - tip.offsetWidth;
      tip.style.top = Math.round(top) + 'px';
      tip.style.left = Math.round(Math.max(16, Math.min(r.left, room))) + 'px';
      tip.classList.toggle('below', below);
      current = btn;
      tip.classList.add('on');
    };
    // It opens once the mouse rests on the button, so it never flashes up as
    // the pointer passes over or the page scrolls underneath it.
    var rest = function (btn, e) {
      if (e.pointerType !== 'mouse' || !mouse.matches || dismissed === btn) return;
      clearTimeout(closeTimer);
      if (current === btn) return;
      clearTimeout(openTimer);
      openTimer = setTimeout(function () { show(btn); }, 260);
    };
    Array.prototype.forEach.call(document.querySelectorAll('[data-nudge]'), function (btn) {
      if (btn.hasAttribute('aria-current')) return;
      btn.addEventListener('pointerenter', function (e) { rest(btn, e); });
      btn.addEventListener('pointermove', function (e) { rest(btn, e); });
      btn.addEventListener('pointerleave', function (e) {
        if (e.pointerType !== 'mouse') return;
        if (dismissed === btn) dismissed = null;
        clearTimeout(openTimer);
        closeTimer = setTimeout(hide, 160);
      });
      btn.addEventListener('focus', function () {
        var keyboard = false;
        try { keyboard = btn.matches(':focus-visible'); } catch (err) { keyboard = false; }
        if (keyboard) show(btn);
      });
      btn.addEventListener('blur', function () { if (current === btn) hide(); });
      btn.addEventListener('click', hide);
    });
    // The pointer can move onto the review without it closing.
    tip.addEventListener('pointerenter', function () { clearTimeout(closeTimer); });
    tip.addEventListener('pointerleave', function () { closeTimer = setTimeout(hide, 160); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && current) { dismissed = current; hide(); }
    });
    window.addEventListener('scroll', function () { clearTimeout(openTimer); if (current) hide(); }, { passive: true });
    window.addEventListener('resize', function () { if (current) hide(); });
  }

  // ── Pause the hero's moving glass when it's off screen ──
  var glass = document.querySelector('.hero-bg');
  if (glass && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { glass.classList.toggle('paused', !en.isIntersecting); });
    }).observe(glass);
  }

  // ── Attribution: pass campaign parameters on to the enquiry page ──
  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'l', 'fbclid'];
  var here = new URLSearchParams(window.location.search);
  var carry = new URLSearchParams();
  KEYS.forEach(function (k) { var v = here.get(k); if (v) carry.set(k, v.slice(0, 200)); });
  var ref = document.referrer;
  if (ref && ref.indexOf(window.location.origin) !== 0) carry.set('ref', ref.slice(0, 300));
  if (Array.from(carry.keys()).length) {
    document.querySelectorAll('a[href^="/enquire"]').forEach(function (a) {
      var url = new URL(a.getAttribute('href'), window.location.origin);
      carry.forEach(function (v, k) { if (!url.searchParams.has(k)) url.searchParams.set(k, v); });
      a.setAttribute('href', url.pathname + url.search + url.hash);
    });
  }
})();
