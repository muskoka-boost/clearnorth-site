// ClearNorth — the enquiry form on /contact/.
//
// Progressive enhancement only. With this file absent or blocked the form is a plain
// POST to Formspree and the browser lands on /message-sent/ via the hidden `_next`
// field — a delivered enquiry either way. Everything here only makes it better:
// inline messages instead of browser tooltips, an in-place success state, and a guard
// against double submission.
(function () {
  var form = document.querySelector('[data-cn-contact]');
  if (!form) return;

  var button = form.querySelector('[type="submit"]');
  var buttonText = button ? button.textContent : '';
  var formError = form.querySelector('[data-form-error]');
  var formOk = form.querySelector('[data-form-ok]');

  // `_next` is the no-JavaScript return address and is generated per environment. When
  // JavaScript is running the browser never leaves the page, so the field is unused —
  // but it is still rewritten to the serving origin in case the fetch path is
  // unavailable and the browser posts the form itself after all.
  var next = form.querySelector('input[name="_next"]');
  if (next && window.location.origin) next.value = location.origin + '/message-sent/';

  // The form carries `novalidate` so these messages replace the browser's tooltips,
  // which are unstyled, disappear on the next click and are announced inconsistently.
  // Validity itself still comes from the constraint API — required, type="email" — so
  // the rules live in the HTML and are not restated here.
  var MESSAGES = {
    valueMissing: 'Please fill this in so we can reply.',
    typeMismatch: 'Please check this — it does not look like an email address.'
  };

  function fieldError(field) {
    var v = field.validity;
    if (v.valid) return '';
    if (v.valueMissing) return MESSAGES.valueMissing;
    if (v.typeMismatch) return MESSAGES.typeMismatch;
    return 'Please check this field.';
  }

  function errorNodeFor(field) {
    var id = field.getAttribute('aria-describedby');
    return id ? document.getElementById(id) : null;
  }

  function show(field) {
    var message = fieldError(field);
    var node = errorNodeFor(field);
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (node) {
      node.textContent = message;
      node.classList.toggle('cn-show', !!message);
    }
    return !message;
  }

  var fields = [].slice.call(form.querySelectorAll('[aria-describedby]'));

  fields.forEach(function (field) {
    // Validate on blur, then live once it has been flagged — so nobody is told they
    // are wrong halfway through typing their own email address.
    field.addEventListener('blur', function () { show(field); });
    field.addEventListener('input', function () {
      if (field.getAttribute('aria-invalid') === 'true') show(field);
    });
  });

  function announce(node, message) {
    if (!node) return;
    node.textContent = message;
    node.classList.add('cn-show');
    node.hidden = false;
  }

  var sending = false;

  form.addEventListener('submit', function (ev) {
    if (sending) {                      // a second Enter press while the first is in flight
      ev.preventDefault();
      return;
    }

    var firstBad = null;
    fields.forEach(function (field) { if (!show(field) && !firstBad) firstBad = field; });
    if (firstBad) {
      ev.preventDefault();
      firstBad.focus();
      firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // No fetch means the browser posts the form itself and Formspree redirects to
    // `_next`. Slightly worse, still a delivered enquiry.
    if (!window.fetch || !window.FormData) return;

    ev.preventDefault();
    if (formError) { formError.textContent = ''; formError.classList.remove('cn-show'); }

    sending = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);

      form.reset();
      fields.forEach(function (field) {
        field.setAttribute('aria-invalid', 'false');
        var node = errorNodeFor(field);
        if (node) { node.textContent = ''; node.classList.remove('cn-show'); }
      });

      announce(formOk, 'Thanks — your message is on its way. We usually reply within one business day.');
      if (button) button.hidden = true;   // nothing left to submit

      // Counted here rather than in GTM's form trigger, so it fires only on a response
      // Formspree actually accepted. No field values are sent with it.
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'cn_contact_submit', cn_detail: 'contact form', cn_page: location.pathname });

      formOk.setAttribute('tabindex', '-1');
      formOk.focus();
    }).catch(function () {
      sending = false;
      announce(
        formError,
        'Sorry — that did not send. Please try again, or reach us at 289-943-4395 or booking@clearnorthwc.com.'
      );
      if (button) {
        button.disabled = false;
        button.textContent = buttonText;
      }
    });
  });
})();
