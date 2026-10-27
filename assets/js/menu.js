// Menu page: section pills that follow the scroll, and a shortlist the
// visitor builds by tapping the plus on a drink. The shortlist lives in this
// browser tab only (sessionStorage) and goes with them to the enquiry form.
(function () {
  'use strict';
  var KEY = 'orpi-shortlist';
  var list = [];
  try { list = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { list = []; }
  if (!Array.isArray(list)) list = [];

  var buttons = Array.prototype.slice.call(document.querySelectorAll('.dk-add'));
  var bar = document.getElementById('sl-bar');
  var panel = document.getElementById('sl-panel');
  var toggle = document.getElementById('sl-toggle');
  var items = document.getElementById('sl-items');
  var count = document.getElementById('sl-n');

  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* private mode: still works for this page */ } }
  function nameOf(btn) { return btn.closest('.dk').getAttribute('data-drink'); }

  function render() {
    buttons.forEach(function (b) {
      var name = nameOf(b);
      var on = list.indexOf(name) !== -1;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + name + (on ? ' from' : ' to') + ' your shortlist');
    });
    count.textContent = String(list.length);
    toggle.lastChild.textContent = ' shortlisted';
    bar.hidden = list.length === 0;
    document.body.classList.toggle('has-sl', list.length > 0);
    if (!list.length) setPanel(false);
    items.innerHTML = '';
    list.forEach(function (name) {
      var li = document.createElement('li');
      var t = document.createElement('span'); t.textContent = name;
      var x = document.createElement('button');
      x.type = 'button'; x.textContent = 'Remove'; x.setAttribute('aria-label', 'Remove ' + name);
      x.addEventListener('click', function () { list = list.filter(function (n) { return n !== name; }); save(); render(); });
      li.appendChild(t); li.appendChild(x); items.appendChild(li);
    });
  }
  function setPanel(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var name = nameOf(b);
      list = list.indexOf(name) === -1 ? list.concat([name]) : list.filter(function (n) { return n !== name; });
      save(); render();
    });
  });
  toggle.addEventListener('click', function () { setPanel(panel.hidden); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setPanel(false); });
  render();

  // ── Section pills follow the scroll ──
  var pills = Array.prototype.slice.call(document.querySelectorAll('.mn-pills a'));
  var row = document.querySelector('.mn-pills-in');
  var byId = {};
  pills.forEach(function (p) { byId[p.getAttribute('href').slice(1)] = p; });
  function mark(id) {
    pills.forEach(function (p) { p.removeAttribute('aria-current'); });
    var p = byId[id];
    if (!p) return;
    p.setAttribute('aria-current', 'true');
    var left = p.offsetLeft - row.clientWidth / 2 + p.clientWidth / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }
  // A tapped pill wins straight away; the scroll it causes doesn't override it.
  var hold = 0;
  pills.forEach(function (p) {
    p.addEventListener('click', function () { hold = Date.now() + 1200; mark(p.getAttribute('href').slice(1)); });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (Date.now() < hold) return;
      entries.forEach(function (en) { if (en.isIntersecting) mark(en.target.id); });
    }, { rootMargin: '-30% 0px -65% 0px' });
    document.querySelectorAll('.mn-sec').forEach(function (s) { io.observe(s); });
  }
})();
