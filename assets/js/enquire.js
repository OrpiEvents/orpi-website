// The enquiry form, one question at a time, as the booking app's own form
// (book.orpi.events/enquire; Ruds, 27 and 30 Oct 2026): most visitors are on a
// phone, and a long page of fields put people off before they'd typed
// anything. Easy questions first, contact details last; answers are kept on
// the visitor's phone if they leave halfway; each step reached is counted, so
// Growth in the ops app shows where people stop (the same funnel as the app's
// form). Posts to the ops app's public enquiry API, which writes the enquiry
// into the Notion Sales Pipeline and alerts the inbox. Same fields and rules
// as the app's form, so both land identically. If the API can't be reached,
// nothing is lost: the visitor gets a ready-written email instead.
(function () {
  'use strict';
  var form = document.getElementById('enquiry');
  if (!form) return;

  var API = form.getAttribute('data-api');
  var EMAIL = 'hello@orpi.events';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var STEPS = ['type', 'date', 'size', 'services', 'heard', 'details'];
  // The Pipeline's names (lib/tracking.js in the ops app) and how we say them.
  var EVENT_TYPES = [['Wedding Reception', 'Wedding'], ['Mehndi/Sangeet', 'Mehndi or Sangeet'], ['Birthday', 'Birthday'], ['Corporate', 'Corporate'], ['Other', 'Other']];
  var SERVICES = [
    ['Full Bar (ORPI supplies alcohol)', 'Full Bar', 'We bring everything, drinks included'],
    ['Bar Only (Client supplies alcohol)', 'Bar Only', 'You supply the alcohol, we do the rest'],
    ['Cocktail Experience', 'Cocktail Experience', 'Signature cocktails made to order'],
    ['Welcome Drinks', 'Welcome Drinks', 'A drink in hand as guests arrive'],
    ['Mocktails Only', 'Mocktails Only', 'Alcohol-free, made properly'],
    ['Custom', 'Not sure yet', 'We’ll help you work it out']
  ];
  var HEARD = [['instagram', 'Instagram'], ['event', 'Saw ORPI at an event'], ['referral', 'A friend or family recommendation'], ['previous', 'We’ve worked with ORPI before'], ['venue', 'Our venue'], ['planner', 'Our wedding planner'], ['google', 'Google'], ['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['show', 'A wedding show'], ['other', 'Somewhere else']];
  var THANK_WHO = { referral: 'Who recommended us?', previous: 'Which event did we do for you?', venue: 'Which venue?', planner: 'Which planner?', event: 'Which event did you see us at?' };
  // Package names on the site → the Pipeline's service types.
  var PACKAGE_SERVICE = {
    'Premium': 'Full Bar (ORPI supplies alcohol)',
    'Ultimate': 'Full Bar (ORPI supplies alcohol)',
    'Cocktail Experience': 'Cocktail Experience',
    'Welcome Drinks': 'Welcome Drinks',
    'Bar Only': 'Bar Only (Client supplies alcohol)',
    'Custom': 'Custom'
  };
  var OLD_EVENT = { 'Mendhi/Sangeet': 'Mehndi/Sangeet' };   // links written before the rename
  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'l', 'fbclid'];
  var DRAFT_KEY = 'orpi_enquiry_draft_site';

  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(window.location.search);
  var shownAt = Date.now();
  var started = false;
  var sending = false;
  var reached = {};

  // The answers so far.
  var f = { eventType: '', eventDate: '', noDate: false, month: '', year: '', guests: '', venue: '', services: [], heard: '', referredBy: '', name: '', phone: '', email: '', notes: '', optOut: false };
  var step = 0;

  // ── Attribution (from this URL, or carried here from the landing page) ──
  var attribution = {};
  ATTR_KEYS.forEach(function (k) { var v = params.get(k); if (v) attribution[k] = v.slice(0, 200); });
  attribution.landing = window.location.href.slice(0, 500);
  var ref = params.get('ref') || (document.referrer && document.referrer.indexOf(window.location.origin) !== 0 ? document.referrer : '');
  attribution.referrer = (ref || '').slice(0, 300);

  function beacon(kind, page) {
    try {
      var body = JSON.stringify({ kind: kind, page: page || 'website', attribution: attribution });
      var url = API + '/event';
      if (!(navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' })))) {
        fetch(url, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' }).catch(function () {});
      }
    } catch (e) { /* counts are best-effort */ }
  }
  beacon('form_view');
  function touched() { if (!started) { started = true; beacon('form_start'); } }

  function readDraft() { try { var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); return d && d.f ? d : null; } catch (e) { return null; } }
  function writeDraft(d) { try { if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); else localStorage.removeItem(DRAFT_KEY); } catch (e) { /* private mode */ } }

  // ── Tiles ──
  function tile(label, note, on, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'eq-tile';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    var t = document.createElement('span'); t.className = 'eq-tile-t'; t.textContent = label; b.appendChild(t);
    if (note) { var n = document.createElement('span'); n.className = 'eq-tile-n'; n.textContent = note; b.appendChild(n); }
    b.addEventListener('click', onClick);
    return b;
  }
  function drawTiles() {
    var box = $('t-type'); box.innerHTML = '';
    EVENT_TYPES.forEach(function (e) { box.appendChild(tile(e[1], '', f.eventType === e[0], function () { pickAndGo('eventType', e[0]); })); });
    box = $('t-services'); box.innerHTML = '';
    SERVICES.forEach(function (s) {
      box.appendChild(tile(s[1], s[2], f.services.indexOf(s[0]) !== -1, function () {
        touched();
        var i = f.services.indexOf(s[0]);
        if (i === -1) f.services.push(s[0]); else f.services.splice(i, 1);
        render();
      }));
    });
    box = $('t-heard'); box.innerHTML = '';
    HEARD.forEach(function (h) { box.appendChild(tile(h[1], '', f.heard === h[0], function () { pickAndGo('heard', h[0]); })); });
  }

  // ── Date fields ──
  var today = new Date();
  var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  $('f-date').min = iso(today);
  MONTHS.forEach(function (m, i) { var o = document.createElement('option'); o.value = String(i + 1); o.textContent = m; $('f-month').appendChild(o); });
  for (var y = 0; y < 4; y++) { var o = document.createElement('option'); o.value = String(today.getFullYear() + y); o.textContent = String(today.getFullYear() + y); $('f-year').appendChild(o); }
  $('f-nodate').addEventListener('click', function () { touched(); f.noDate = !f.noDate; render(); });

  // Typed fields keep f up to date.
  [['f-date', 'eventDate'], ['f-month', 'month'], ['f-year', 'year'], ['f-guests', 'guests'], ['f-venue', 'venue'], ['f-who', 'referredBy'], ['f-name', 'name'], ['f-phone', 'phone'], ['f-email', 'email'], ['f-notes', 'notes']].forEach(function (p) {
    var el = $(p[0]);
    el.addEventListener('input', function () { touched(); f[p[1]] = el.value; hideError(); render(true); });
    el.addEventListener('change', function () { f[p[1]] = el.value; render(true); });
  });
  $('f-optout').addEventListener('change', function () { f.optOut = this.checked; render(true); });

  // ── Arriving from a package or an occasion ──
  var pkg = params.get('package');
  var ev = params.get('event');
  ev = OLD_EVENT[ev] || ev;

  // ── Errors ──
  function fail(msg) {
    var box = $('eq-error');
    box.innerHTML = '';
    box.appendChild(document.createTextNode(msg));
    box.hidden = false;
  }
  function hideError() { $('eq-error').hidden = true; }

  function check(k) {
    if (k === 'type' && !f.eventType) return 'Pick the one closest to your event.';
    if (k === 'date' && !f.noDate && !f.eventDate) return 'Add your date, or choose “We haven’t fixed a date yet”.';
    if (k === 'date' && !f.noDate && f.eventDate < iso(today)) return 'That date has already passed. Please check it.';
    if (k === 'date' && f.noDate && (!f.month || !f.year)) return 'Roughly when is it? Pick a month and year.';
    if (k === 'heard' && !f.heard) return 'Please pick one. It really helps us.';
    if (k === 'details') {
      if (f.name.trim().length < 2) return 'Please add your name.';
      var digits = f.phone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) return 'Please check your phone number.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) return 'Please check your email address.';
    }
    return '';
  }

  function go(n) {
    step = Math.max(0, Math.min(n, STEPS.length - 1));
    hideError();
    render();
    var q = form.querySelector('.eq-step[data-step="' + STEPS[step] + '"] .eq-q');
    if (q && started) q.focus({ preventScroll: true });
    var card = $('enquiry-card');
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function next() {
    var err = check(STEPS[step]);
    if (err) return fail(err);
    if (STEPS[step] === 'details') return submit();
    go(step + 1);
  }
  // A tile that answers the whole question moves straight on.
  function pickAndGo(k, v) {
    touched();
    f[k] = v;
    hideError();
    render();
    if (k === 'heard' && THANK_WHO[v]) { $('f-who').focus(); return; }
    setTimeout(next, 180);
  }
  $('eq-back').addEventListener('click', function () { go(step - 1); });
  form.addEventListener('submit', function (e) { e.preventDefault(); next(); });

  // ── Draw the current step ──
  function render(fieldsOnly) {
    var key = STEPS[step];
    if (!fieldsOnly) {
      Array.prototype.forEach.call(form.querySelectorAll('.eq-step'), function (s) { s.hidden = s.getAttribute('data-step') !== key; });
      var bar = form.querySelector('.eq-progress');
      bar.setAttribute('aria-valuenow', String(step + 1));
      bar.setAttribute('aria-label', 'Question ' + (step + 1) + ' of ' + STEPS.length);
      bar.firstElementChild.style.width = ((step + 1) / STEPS.length * 100) + '%';
      $('eq-count').textContent = (step + 1) + ' of ' + STEPS.length;
      $('eq-back').hidden = step === 0;
      $('eq-kicker').hidden = step > 0;
      drawTiles();
      // Date: exact, or a month and year.
      $('exact-date').hidden = f.noDate;
      $('approx').hidden = !f.noDate;
      $('f-nodate').textContent = f.noDate ? 'I know the exact date' : 'We haven’t fixed a date yet';
      // "Who recommended us?" follows the answer.
      var who = THANK_WHO[f.heard];
      $('who-field').hidden = !who;
      if (who) $('who-label').textContent = who;
      // Count each step the first time it's reached (the app's funnel names).
      if (!reached[key]) { reached[key] = true; if (step > 0) beacon('form_step', 'enquire/' + key); }
    }
    $('fine-offers').hidden = f.optOut;
    // The button: none where a tile moves on, Skip where nothing's given yet.
    var btn = $('eq-next');
    btn.hidden = key === 'type' || (key === 'heard' && !THANK_WHO[f.heard]);
    if (key === 'details') btn.textContent = sending ? 'Sending…' : 'Send enquiry';
    else if ((key === 'size' && !f.guests && !f.venue) || (key === 'services' && !f.services.length)) btn.textContent = 'Skip';
    else btn.textContent = 'Continue';
    if (started || step > 0) writeDraft({ f: f, step: step, pkg: pkg || '' });
  }

  function fill() {
    $('f-date').value = f.eventDate; $('f-month').value = f.month; $('f-year').value = f.year;
    $('f-guests').value = f.guests; $('f-venue').value = f.venue; $('f-who').value = f.referredBy;
    $('f-name').value = f.name; $('f-phone').value = f.phone; $('f-email').value = f.email;
    $('f-notes').value = f.notes; $('f-optout').checked = f.optOut;
  }

  function showAsked() {
    if (!pkg || !PACKAGE_SERVICE[pkg]) { pkg = null; return; }
    var asked = $('eq-asked');
    asked.innerHTML = '';
    var span = document.createElement('span');
    span.textContent = pkg === 'Custom' ? 'You’re asking about a custom bar' : 'You’re asking about ' + pkg;
    var x = document.createElement('button');
    x.type = 'button'; x.textContent = 'Remove'; x.className = 'eq-asked-x';
    x.addEventListener('click', function () {
      var i = f.services.indexOf(PACKAGE_SERVICE[pkg]);
      if (i !== -1) f.services.splice(i, 1);
      pkg = null; asked.hidden = true; render();
    });
    asked.appendChild(span); asked.appendChild(x);
    asked.hidden = false;
  }

  // ── Start: a saved draft, else what the link asked for ──
  var d = readDraft();
  if (d) {
    for (var k in f) if (Object.prototype.hasOwnProperty.call(d.f, k)) f[k] = d.f[k];
    if (!Array.isArray(f.services)) f.services = [];
    step = Math.min(Math.max(0, d.step | 0), STEPS.length - 1);
    if (!pkg && d.pkg) pkg = d.pkg;
  }
  if (pkg && PACKAGE_SERVICE[pkg] && f.services.indexOf(PACKAGE_SERVICE[pkg]) === -1) f.services.push(PACKAGE_SERVICE[pkg]);
  if (ev && EVENT_TYPES.some(function (e) { return e[0] === ev; }) && !f.eventType) { f.eventType = ev; if (step === 0) step = 1; }
  showAsked();
  fill();
  render();

  // ── Send ──
  function payload() {
    var notes = f.notes.trim();
    var extra = pkg ? 'Package they asked about: ' + pkg + '.' : '';
    return {
      name: f.name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      eventDate: f.noDate ? '' : f.eventDate,
      approxMonth: f.noDate && f.month && f.year ? f.year + '-' + String(f.month).padStart(2, '0') : '',
      eventType: f.eventType,
      guests: f.guests,
      venue: f.venue.trim(),
      services: f.services.slice(),
      heard: f.heard,
      referredBy: THANK_WHO[f.heard] ? f.referredBy.trim() : '',
      notes: (extra + (extra && notes ? '\n\n' : '') + notes).slice(0, 1500),
      marketingOptOut: f.optOut,
      consentAds: false,
      fbp: '', fbc: '',
      eventId: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      elapsedMs: Date.now() - shownAt,
      attribution: attribution,
      company: form.elements.company.value,
      channel: 'website'
    };
  }

  function mailtoFor(p) {
    var when = p.eventDate || (p.approxMonth ? 'roughly ' + MONTHS[Number(p.approxMonth.slice(5)) - 1] + ' ' + p.approxMonth.slice(0, 4) : 'not fixed yet');
    var lines = [
      'Name: ' + p.name, 'Phone: ' + p.phone, 'Email: ' + p.email,
      'Event: ' + p.eventType, 'Date: ' + when,
      'Guests: ' + (p.guests || 'not sure yet'), 'Venue: ' + (p.venue || 'not sure yet'),
      'Looking for: ' + (p.services.join(', ') || 'not sure yet'),
      '', p.notes
    ];
    return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Enquiry from ' + p.name) + '&body=' + encodeURIComponent(lines.join('\n'));
  }

  function done(first) {
    writeDraft(null);
    form.hidden = true;
    $('done-name').textContent = first ? ', ' + first : '';
    var box = $('eq-done');
    box.hidden = false;
    box.focus();
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function submit() {
    if (sending) return;
    var p = payload();
    sending = true;
    render(true);
    $('eq-next').disabled = true;
    fetch(API + '/enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok || json.error) {
          var err = new Error(json.error || '');
          err.status = res.status;
          throw err;
        }
        done(json.first || p.name.split(' ')[0]);
      });
    }).catch(function (err) {
      sending = false;
      $('eq-next').disabled = false;
      render(true);
      var box = $('eq-error');
      box.innerHTML = '';
      // A 4xx with a message is something to fix in the form (e.g. a phone
      // number). Anything else (no connection, the server down, too many
      // tries) gets a one-tap email so the enquiry still reaches us.
      var fixable = err && err.status && err.status < 500 && err.status !== 429 && err.message;
      if (fixable) {
        box.appendChild(document.createTextNode(err.message));
      } else {
        box.appendChild(document.createTextNode((err && err.status && err.message ? err.message : 'We couldn’t send that just now.') + ' Nothing’s lost: '));
        var a = document.createElement('a');
        a.href = mailtoFor(p); a.textContent = 'email these details to us';
        box.appendChild(a);
        box.appendChild(document.createTextNode(' with one tap, or message us on WhatsApp.'));
      }
      box.hidden = false;
    });
  }
})();
