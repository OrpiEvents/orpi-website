// ORPI website: navigation, the occasions list, and carrying ad/link
// attribution (utm_*, l, fbclid) from the landing page through to the
// enquiry form. Nothing is stored on the visitor's device for this: the
// parameters ride along on the links to /enquire.
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

  // ── Occasions: the photo follows the row you're on (desktop) ──
  var list = document.querySelector('.occ-list');
  if (list) {
    var rows = Array.prototype.slice.call(list.querySelectorAll('.occ'));
    var pics = Array.prototype.slice.call(document.querySelectorAll('.occ-media img'));
    var activate = function (row) {
      rows.forEach(function (r) { r.classList.toggle('on', r === row); });
      var i = Number(row.getAttribute('data-img'));
      pics.forEach(function (p, k) { p.classList.toggle('on', k === i); });
    };
    rows.forEach(function (row) {
      row.addEventListener('pointerenter', function () { activate(row); });
      row.addEventListener('focusin', function () { activate(row); });
    });
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
