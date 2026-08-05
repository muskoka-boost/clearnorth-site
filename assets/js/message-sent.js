// ClearNorth — the contact confirmation page at /message-sent/.
// The page redirects home on its own via a <meta http-equiv="refresh"> so it works
// with this file absent. All this does is take that timing over so the countdown is
// visible and can be stopped, and fire the conversion event.
(function () {
  // Fired here rather than on submit, for the same reason as the quote page: no
  // navigation is racing the tag, and the only route that reaches this page is a
  // no-JavaScript submit landing on Formspree's _next redirect. (With JavaScript the
  // contact form stays put and shows its success state inline, and fires the event
  // itself, so this never double-counts.)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'cn_contact_submit',
    cn_detail: 'contact form',
    cn_page: location.pathname
  });

  var meta = document.querySelector('meta[http-equiv="refresh"]');
  var seconds = document.querySelector('[data-seconds]');
  var note = document.querySelector('[data-countdown]');
  var stay = document.querySelector('[data-stay]');
  if (!meta || !seconds) return;

  var parts = /(\d+)\s*;\s*url=(.+)/i.exec(meta.getAttribute('content') || '');
  var left = parts ? parseInt(parts[1], 10) : 10;
  var target = parts ? parts[2].trim() : '../';

  // Drop the meta refresh before starting our own clock, otherwise it fires underneath
  // the countdown and "Stay on this page" would not actually keep anyone here.
  meta.parentNode.removeChild(meta);
  seconds.textContent = left;
  if (stay) stay.hidden = false;

  var timer = setInterval(function () {
    left -= 1;
    seconds.textContent = left > 0 ? left : 0;
    if (left > 0) return;
    clearInterval(timer);
    location.replace(target);   // replace: back should not return to this page
  }, 1000);

  if (stay) {
    stay.addEventListener('click', function () {
      clearInterval(timer);
      if (note) note.innerHTML = 'No rush — head to the <a href="' + target + '">home page</a> whenever you are ready.';
      stay.hidden = true;
    });
  }
})();
