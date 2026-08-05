// ClearNorth — scroll reveal, mobile nav, FAQ accordion. Progressive enhancement only.
(function () {
  // ---- scroll reveal ----
  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pick the level that animates. A section block holding several children (a card
  // grid, a feature row) reveals child-by-child so it cascades; anything else reveals
  // as a single unit. Whichever level is NOT animating is un-hidden immediately —
  // it's a wrapper, so showing it early is invisible while its contents stay hidden.
  // Driven by exactly the selector the CSS hides, so the two can never disagree.
  // (A previous version walked section.firstElementChild instead, which left the
  // second column of every two-column section — What we do, Reviews, Instagram —
  // hidden by the CSS but never revealed, i.e. invisible for good.)
  var LVL1 = 'section:not(:first-of-type) > div > *';
  var LVL2 = 'section:not(:first-of-type) > div > * > *';

  var targets = [];
  var claimed = new Set();

  [].forEach.call(document.querySelectorAll(LVL1), function (block) {
    var kids = [].slice.call(block.children);
    if (kids.length >= 2 && block.tagName === 'DIV') {
      block.classList.add('cn-in');             // wrapper shows now, cards animate
      kids.forEach(function (k) { claimed.add(k); targets.push(k); });
    } else {
      claimed.add(block);
      targets.push(block);
      kids.forEach(function (k) { k.classList.add('cn-in'); });
    }
  });

  // Safety net: anything the CSS hid that the pass above did not classify gets shown.
  // Nothing may ever be left hidden just because the markup nested unexpectedly.
  [].forEach.call(document.querySelectorAll(LVL2), function (el) {
    if (!claimed.has(el) && !el.classList.contains('cn-in')) el.classList.add('cn-in');
  });

  if (!('IntersectionObserver' in window) || reduce || !targets.length) {
    root.classList.remove('cn-anim');   // show everything, no animation
    window.__cnReveal = true;
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    // Disarm the head failsafe only once the observer actually delivers. Running
    // is not the same as working — in environments that never composite frames
    // (hidden tabs, some webviews, prerenders) callbacks are never delivered, and
    // disarming on script-start alone would leave the page permanently blank.
    window.__cnReveal = true;

    // Everything in a section crosses the threshold at the same moment, so without
    // this the whole block arrives in one lump. Cascade the batch top-to-bottom.
    // e.boundingClientRect comes from the observer, so reading it costs no reflow.
    var hits = [];
    entries.forEach(function (e) { if (e.isIntersecting) hits.push(e); });
    hits.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });

    hits.forEach(function (e, i) {
      e.target.style.transitionDelay = Math.min(i, 8) * 100 + 'ms';
      e.target.classList.add('cn-in');
      io.unobserve(e.target);
    });
  }, {
    // Positive bottom margin starts the transition just *before* the element
    // scrolls into view, so it reads as immediate rather than late. A negative
    // margin here waits until you are already past it, which looks laggy.
    rootMargin: '0px 0px 8% 0px',
    threshold: 0
  });

  [].forEach.call(targets, function (t) { io.observe(t); });
})();

// ---- conversion events for GTM/GA4 ----
// Pushes to the dataLayer so the container can build GA4 events from real actions.
// Trigger in GTM on the Custom Event names: cn_phone_click / cn_email_click / cn_quote_click.
(function () {
  function push(event, detail) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: event, cn_detail: detail, cn_page: location.pathname });
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';

    if (href.indexOf('tel:') === 0) return push('cn_phone_click', href.replace('tel:', ''));
    if (href.indexOf('mailto:') === 0) return push('cn_email_click', href.replace('mailto:', ''));

    // any link into the quote flow (paths are relative, so match the segment
    // rather than a leading slash)
    if (/(^|\/)request-a-quote\/?$/.test(href) || /quote/i.test(a.textContent || '')) {
      push('cn_quote_click', (a.textContent || '').trim().slice(0, 40));
    }
  }, true);
})();

(function () {
  var btn = document.querySelector('.cn-mobile-btn');
  var nav = document.querySelector('.cn-mobile-nav');
  if (btn && nav) {
    nav.id = nav.id || 'cn-mobile-nav';
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // single-open accordion, matching the original component's behaviour
  var items = [].slice.call(document.querySelectorAll('.cn-faq'));
  items.forEach(function (item, i) {
    var q = item.querySelector('.cn-faq-q');
    var a = item.querySelector('.cn-faq-a');
    if (!q || !a) return;
    a.id = 'cn-faq-a-' + i;
    q.setAttribute('aria-controls', a.id);
    q.setAttribute('aria-expanded', i === 0 ? 'true' : 'false');
    if (i === 0) item.classList.add('open');
    q.addEventListener('click', function () {
      var willOpen = !item.classList.contains('open');
      items.forEach(function (other) {
        other.classList.remove('open');
        var oq = other.querySelector('.cn-faq-q');
        if (oq) oq.setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();
