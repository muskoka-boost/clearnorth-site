// ClearNorth — quote form on /request-a-quote/. Progressive enhancement only: the form is a
// plain POST to Formspree and works with this file absent or blocked. Everything here
// only makes it nicer — inline validation for the checkbox groups (which HTML cannot
// express), and submitting in the background so the browser never leaves the site.
// Either way the visitor ends up on /quote-submitted/.
(function () {
  var form = document.querySelector('[data-cn-quote]');
  if (!form) return;

  var DONE = '../quote-submitted/';

  var button = form.querySelector('[type="submit"]');
  var buttonText = button ? button.textContent : '';
  var formError = form.querySelector('[data-form-error]');

  // `_next` is where Formspree sends the browser when it posts the form itself. It is
  // hard-coded to the production host in the HTML, since that is the only place a real
  // visitor hits it; rewriting it to whatever host is actually serving the page keeps
  // staging (and any preview host) from bouncing people onto the live site.
  var next = form.querySelector('input[name="_next"]');
  if (next && window.location.origin) {
    next.value = location.origin + '/quote-submitted/';
  }

  // ---- "Other" free-text boxes ----
  // Typing in one ticks the box it belongs to, so nobody loses an answer by filling in
  // the text and leaving the option unchecked. Emptying it again unticks a checkbox,
  // but never a radio — clearing the text is not a choice of some other option.
  [].forEach.call(form.querySelectorAll('[data-ticks]'), function (text) {
    var box = document.getElementById(text.getAttribute('data-ticks'));
    if (!box) return;
    text.addEventListener('input', function () {
      var filled = text.value.trim() !== '';
      if (filled && !box.checked) {
        box.checked = true;
        box.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (!filled && box.checked && box.type === 'checkbox') {
        box.checked = false;
        box.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });

  // ---- required checkbox groups ----
  // `required` on a checkbox demands that one box, not one of the group, so the
  // "pick at least one" rule is enforced here instead.
  var groups = [].slice.call(form.querySelectorAll('[data-req-group]'));

  function checkGroup(group) {
    var boxes = group.querySelectorAll('input[type="checkbox"]');
    var ok = [].some.call(boxes, function (b) { return b.checked; });
    var err = group.querySelector('.cn-err');
    group.classList.toggle('cn-bad', !ok);
    if (err) err.textContent = ok ? '' : group.getAttribute('data-req-group');
    return ok;
  }

  groups.forEach(function (group) {
    group.addEventListener('change', function () {
      if (group.classList.contains('cn-bad')) checkGroup(group);   // clear once satisfied
    });
  });

  function showError(message) {
    if (!formError) return;
    formError.textContent = message;
    formError.classList.add('cn-show');
  }

  form.addEventListener('submit', function (ev) {
    // Native validation has already passed by the time this fires; only the group
    // rules are left to check.
    var bad = null;
    groups.forEach(function (group) { if (!checkGroup(group) && !bad) bad = group; });
    if (bad) {
      ev.preventDefault();
      bad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var first = bad.querySelector('input[type="checkbox"]');
      if (first) first.focus({ preventScroll: true });
      return;
    }

    // No fetch (or no FormData) means the browser posts the form itself and lands on
    // Formspree's own thank-you page. Slightly worse, still a delivered lead.
    if (!window.fetch || !window.FormData) return;

    ev.preventDefault();
    if (formError) formError.classList.remove('cn-show');

    // Blank answers are dropped so the notification email lists only what was filled in.
    var data = new FormData();
    new FormData(form).forEach(function (value, key) {
      if (String(value).trim() !== '') data.append(key, value);
    });

    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }

    fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      // Same destination Formspree's own `_next` redirect uses, so both routes through
      // the form land on one confirmation page — which is where the conversion is
      // counted, and which sends people home from there.
      location.assign(DONE);
    }).catch(function () {
      showError('Sorry — that did not send. Please try again, or reach us at 289-943-4395 or booking@clearnorthwc.com.');
      if (button) {
        button.disabled = false;
        button.textContent = buttonText;
      }
    });
  });
})();
