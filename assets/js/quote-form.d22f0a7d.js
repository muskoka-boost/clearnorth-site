// ClearNorth — quote form on /booking/. Progressive enhancement only: the form is a
// plain POST to Formspree and works with this file absent or blocked. Everything here
// only makes it nicer — inline validation for the checkbox groups (which HTML cannot
// express), an in-page thank-you instead of Formspree's redirect, and a conversion
// event for GTM.
(function () {
  var form = document.querySelector('[data-cn-quote]');
  if (!form) return;

  var button = form.querySelector('[type="submit"]');
  var buttonText = button ? button.textContent : '';
  var formError = form.querySelector('[data-form-error]');

  function push(event, detail) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: event, cn_detail: detail, cn_page: location.pathname });
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

  function reveal(el) {
    // The scroll-reveal CSS hides fresh children of a section block until site.js marks
    // them in. Anything injected after that pass has to mark itself, or it stays invisible.
    el.classList.add('cn-in');
    [].forEach.call(el.querySelectorAll('*'), function (kid) { kid.classList.add('cn-in'); });
  }

  function thankYou() {
    var panel = document.createElement('div');
    panel.setAttribute('role', 'status');
    panel.style.cssText = 'text-align:center;padding:26px 6px';
    panel.innerHTML =
      '<div style="width:64px;height:64px;margin:0 auto 20px;border-radius:18px;background:#fcebee;' +
      'display:flex;align-items:center;justify-content:center;font-size:28px;color:#c8102e">✓</div>' +
      '<h3 style="font-family:\'Space Grotesk\',sans-serif;font-size:24px;margin:0 0 10px">Thanks — your request is in.</h3>' +
      '<p style="font-size:15px;line-height:1.7;color:#3f3f46;margin:0 auto;max-width:420px">' +
      'We have your details and will get back to you with a free, no-obligation quote, usually within one ' +
      'business day. Need us sooner? Call <a href="tel:2899434395">289-943-4395</a>.</p>';

    form.replaceWith(panel);
    reveal(panel);
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      push('cn_quote_submit', 'booking form');
      thankYou();
    }).catch(function () {
      showError('Sorry — that did not send. Please try again, or reach us at 289-943-4395 or booking@clearnorthwc.com.');
      if (button) {
        button.disabled = false;
        button.textContent = buttonText;
      }
    });
  });
})();
