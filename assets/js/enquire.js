// The enquiry form. Posts to the ops app's public enquiry API, which writes
// the enquiry into the Notion Sales Pipeline (status New, follow-up tomorrow),
// records where it came from and alerts the inbox. Same fields and rules as
// book.orpi.events/enquire, so both forms land identically. If the API can't
// be reached, nothing is lost: the visitor gets a ready-written email instead.
(function () {
  'use strict';
  var form = document.getElementById('enquiry');
  if (!form) return;

  var API = form.getAttribute('data-api');
  var EMAIL = 'hello@orpi.events';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var EVENT_TYPES = ['Wedding Reception', 'Mendhi/Sangeet', 'Birthday', 'Corporate', 'Other'];
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
  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'l', 'fbclid'];

  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(window.location.search);
  var shownAt = Date.now();
  var started = false;
  var sending = false;

  // ── Attribution (from this URL, or carried here from the landing page) ──
  var attribution = {};
  ATTR_KEYS.forEach(function (k) { var v = params.get(k); if (v) attribution[k] = v.slice(0, 200); });
  attribution.landing = window.location.href.slice(0, 500);
  var ref = params.get('ref') || (document.referrer && document.referrer.indexOf(window.location.origin) !== 0 ? document.referrer : '');
  attribution.referrer = (ref || '').slice(0, 300);

  function beacon(kind) {
    try {
      var body = JSON.stringify({ kind: kind, page: 'website', attribution: attribution });
      var url = API + '/event';
      if (!(navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' })))) {
        fetch(url, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' }).catch(function () {});
      }
    } catch (e) { /* counts are best-effort */ }
  }
  beacon('form_view');
  form.addEventListener('input', function () { if (!started) { started = true; beacon('form_start'); } }, { once: false });

  // ── Date: exact date, or roughly a month and year ──
  var today = new Date();
  var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  $('f-date').min = iso(today);
  MONTHS.forEach(function (m, i) { var o = document.createElement('option'); o.value = String(i + 1); o.textContent = m; $('f-month').appendChild(o); });
  for (var y = 0; y < 4; y++) { var o = document.createElement('option'); o.value = String(today.getFullYear() + y); o.textContent = String(today.getFullYear() + y); $('f-year').appendChild(o); }
  $('f-nodate').addEventListener('change', function () {
    var no = this.checked;
    $('f-date').hidden = no;
    $('approx').hidden = !no;
    $('date-label').setAttribute('for', no ? 'f-month' : 'f-date');
    $('date-label').textContent = no ? 'Roughly when?' : 'Event date';
  });

  // ── Services: toggle chips ──
  var chips = Array.prototype.slice.call(document.querySelectorAll('#services .chip'));
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      if (!started) { started = true; beacon('form_start'); }
    });
  });
  function pickService(v) { chips.forEach(function (c) { if (c.getAttribute('data-v') === v) c.setAttribute('aria-pressed', 'true'); }); }

  // ── "Who recommended us?" follows the heard-about answer ──
  $('f-heard').addEventListener('change', function () {
    var q = THANK_WHO[this.value];
    $('who-field').hidden = !q;
    if (q) $('who-label').textContent = q;
  });

  // ── Arriving from a package or an occasion ──
  var pkg = params.get('package');
  if (pkg && PACKAGE_SERVICE[pkg]) {
    pickService(PACKAGE_SERVICE[pkg]);
    var asked = $('eq-asked');
    asked.innerHTML = '';
    var span = document.createElement('span');
    span.textContent = pkg === 'Custom' ? 'You’re asking about a custom bar' : 'You’re asking about ' + pkg;
    var x = document.createElement('button');
    x.type = 'button'; x.textContent = 'Remove'; x.className = 'eq-asked-x';
    x.addEventListener('click', function () { pkg = null; asked.hidden = true; });
    asked.appendChild(span); asked.appendChild(x);
    asked.hidden = false;
  } else { pkg = null; }
  var ev = params.get('event');
  if (ev && EVENT_TYPES.indexOf(ev) !== -1) $('f-type').value = ev;

  // ── Drinks shortlisted on the menu page ──
  var shortlist = [];
  try { shortlist = JSON.parse(sessionStorage.getItem('orpi-shortlist') || '[]'); } catch (e) { shortlist = []; }
  if (!Array.isArray(shortlist)) shortlist = [];
  function drawShortlist() {
    var box = $('eq-shortlist'), ul = $('eq-sl-list');
    ul.innerHTML = '';
    shortlist.forEach(function (name, i) {
      var li = document.createElement('li');
      var t = document.createElement('span'); t.textContent = name;
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', 'Remove ' + name); b.innerHTML = '&times;';
      b.addEventListener('click', function () {
        shortlist.splice(i, 1);
        try { sessionStorage.setItem('orpi-shortlist', JSON.stringify(shortlist)); } catch (e) {}
        drawShortlist();
      });
      li.appendChild(t); li.appendChild(b); ul.appendChild(li);
    });
    box.hidden = shortlist.length === 0;
  }
  drawShortlist();

  // ── Submit ──
  function fail(msg, field) {
    var box = $('eq-error');
    box.innerHTML = '';
    box.appendChild(document.createTextNode(msg));
    box.hidden = false;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  function clearErrors() {
    $('eq-error').hidden = true;
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (el) { el.removeAttribute('aria-invalid'); });
  }

  function collect() {
    var noDate = $('f-nodate').checked;
    var month = $('f-month').value, year = $('f-year').value;
    var extra = [];
    if (pkg) extra.push('Package they asked about: ' + pkg + '.');
    if (shortlist.length) extra.push('Drinks shortlisted on the menu: ' + shortlist.join(', ') + '.');
    var notes = $('f-notes').value.trim();
    var joined = (extra.join('\n') + (extra.length && notes ? '\n\n' : '') + notes).slice(0, 1500);
    return {
      name: $('f-name').value.trim(),
      email: $('f-email').value.trim(),
      phone: $('f-phone').value.trim(),
      eventDate: noDate ? '' : $('f-date').value,
      approxMonth: noDate && month && year ? year + '-' + String(month).padStart(2, '0') : '',
      eventType: $('f-type').value,
      guests: $('f-guests').value,
      venue: $('f-venue').value.trim(),
      services: chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; }).map(function (c) { return c.getAttribute('data-v'); }),
      heard: $('f-heard').value,
      referredBy: THANK_WHO[$('f-heard').value] ? $('f-who').value.trim() : '',
      notes: joined,
      marketingOptOut: $('f-optout').checked,
      consentAds: false,
      fbp: '', fbc: '',
      eventId: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      elapsedMs: Date.now() - shownAt,
      attribution: attribution,
      company: form.elements.company.value,
      channel: 'website'
    };
  }

  function validate(d) {
    var digits = d.phone.replace(/\D/g, '');
    if (d.name.length < 2) return fail('Please add your name.', $('f-name'));
    if (digits.length < 7 || digits.length > 15) return fail('Please check your phone number.', $('f-phone'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return fail('Please check your email address.', $('f-email'));
    if (!d.eventType) return fail('Please choose your event type.', $('f-type'));
    if ($('f-nodate').checked) {
      if (!d.approxMonth) return fail('Roughly when is it? Pick a month and a year.', $('f-month'));
    } else {
      if (!d.eventDate) return fail('Please add your event date, or tick “We haven’t fixed a date yet”.', $('f-date'));
      if (d.eventDate < iso(today)) return fail('That date has already passed. Please check it.', $('f-date'));
    }
    if (!d.heard) return fail('Please tell us how you heard about us. It really helps.', $('f-heard'));
    return true;
  }

  function mailtoFor(d) {
    var when = d.eventDate || (d.approxMonth ? 'roughly ' + MONTHS[Number(d.approxMonth.slice(5)) - 1] + ' ' + d.approxMonth.slice(0, 4) : 'not fixed yet');
    var lines = [
      'Name: ' + d.name, 'Phone: ' + d.phone, 'Email: ' + d.email,
      'Event: ' + d.eventType, 'Date: ' + when,
      'Guests: ' + (d.guests || 'not sure yet'), 'Venue: ' + (d.venue || 'not sure yet'),
      'Looking for: ' + (d.services.join(', ') || 'not sure yet'),
      '', d.notes
    ];
    return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Enquiry from ' + d.name) + '&body=' + encodeURIComponent(lines.join('\n'));
  }

  function done(first) {
    form.hidden = true;
    $('done-name').textContent = first ? ', ' + first : '';
    var box = $('eq-done');
    box.hidden = false;
    try { sessionStorage.removeItem('orpi-shortlist'); } catch (e) {}
    box.focus();
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    clearErrors();
    var d = collect();
    if (validate(d) !== true) return;
    sending = true;
    var btn = form.querySelector('.eq-submit');
    btn.disabled = true; btn.textContent = 'Sending…';
    fetch(API + '/enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok || json.error) {
          var err = new Error(json.error || '');
          err.status = res.status;
          throw err;
        }
        done(json.first || d.name.split(' ')[0]);
      });
    }).catch(function (err) {
      sending = false;
      btn.disabled = false; btn.textContent = 'Send enquiry';
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
        a.href = mailtoFor(d); a.textContent = 'email these details to us';
        box.appendChild(a);
        box.appendChild(document.createTextNode(' with one tap, or message us on WhatsApp.'));
      }
      box.hidden = false;
    });
  });
})();
