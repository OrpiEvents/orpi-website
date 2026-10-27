// Homepage drinks: a random few of our cocktails and sober serves, live from
// the Drinks Library in Notion. The booking app publishes the approved ones at
// /api/public/drinks and resizes the illustrations through /_next/image, so
// anything Punit approves in Notion turns up here on its own. If the booking
// app can't be reached, the drinks already on the page stay as they are.
(function () {
  'use strict';
  var section = document.getElementById('drinks');
  if (!section || !window.fetch) return;

  var API = section.getAttribute('data-api');
  var COUNT = 4;
  var lists = { cocktail: document.getElementById('favs-cocktail'), sober: document.getElementById('favs-sober') };
  var more = document.getElementById('fav-more');
  var button = document.getElementById('fav-shuffle');
  var pools = { cocktail: [], sober: [] };
  var shown = { cocktail: [], sober: [] };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function shuffled(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Four at random, avoiding the ones just shown and spreading the base
  // spirits, so a shuffle never lands on four vodka martinis.
  function pick(kind) {
    var pool = pools[kind];
    var unseen = pool.filter(function (d) { return shown[kind].indexOf(d.id) === -1; });
    var candidates = shuffled(unseen.length >= COUNT ? unseen : pool);
    var out = [], bases = {};
    candidates.forEach(function (d) {
      if (out.length < COUNT && !(d.base && bases[d.base])) { out.push(d); if (d.base) bases[d.base] = true; }
    });
    candidates.forEach(function (d) { if (out.length < COUNT && out.indexOf(d) === -1) out.push(d); });
    shown[kind] = out.map(function (d) { return d.id; });
    return out;
  }

  function picture(path, width) {
    return API + '/_next/image?url=' + encodeURIComponent(path) + '&w=' + width + '&q=85';
  }

  function card(d) {
    var li = document.createElement('li');
    li.className = 'fav';
    var img = document.createElement('img');
    img.src = picture(d.image, 384);
    img.srcset = [256, 384, 640].map(function (w) { return picture(d.image, w) + ' ' + w + 'w'; }).join(', ');
    img.sizes = '(max-width: 899px) 44vw, 22vw';
    img.width = 480; img.height = 480;
    img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    var name = document.createElement('h4');
    name.textContent = d.name;
    li.appendChild(img);
    li.appendChild(name);
    if (d.base) {
      var base = document.createElement('p');
      base.className = 'fav-base';
      base.textContent = d.base;
      li.appendChild(base);
    }
    return li;
  }

  function draw(kind) {
    var ul = lists[kind];
    if (!ul || !pools[kind].length) return;
    var items = pick(kind);
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    ul.classList.remove('favs-text');
    items.forEach(function (d) { ul.appendChild(card(d)); });
  }

  function drawAll(fade) {
    var uls = [lists.cocktail, lists.sober].filter(Boolean);
    if (!fade || reduceMotion) { draw('cocktail'); draw('sober'); return; }
    uls.forEach(function (ul) { ul.classList.add('is-swapping'); });
    setTimeout(function () {
      draw('cocktail'); draw('sober');
      uls.forEach(function (ul) { ul.classList.remove('is-swapping'); });
    }, 180);
  }

  var controller = window.AbortController ? new AbortController() : null;
  var timer = controller && setTimeout(function () { controller.abort(); }, 8000);
  fetch(API + '/api/public/drinks', controller ? { signal: controller.signal } : {})
    .then(function (res) { return res.ok ? res.json() : { drinks: [] }; })
    .then(function (data) {
      if (timer) clearTimeout(timer);
      (data && Array.isArray(data.drinks) ? data.drinks : []).forEach(function (d) {
        if (d && pools[d.kind] && d.id && d.name && typeof d.image === 'string' && d.image.charAt(0) === '/') pools[d.kind].push(d);
      });
      // Too few to rotate: keep what's on the page for that row.
      if (pools.cocktail.length < COUNT) pools.cocktail = [];
      if (pools.sober.length < 2) pools.sober = [];
      if (!pools.cocktail.length && !pools.sober.length) return;
      drawAll(false);
      if (more && (pools.cocktail.length > COUNT || pools.sober.length > COUNT)) more.hidden = false;
    })
    .catch(function () { /* the drinks already on the page stay */ });

  if (button) button.addEventListener('click', function () { drawAll(true); });
})();
