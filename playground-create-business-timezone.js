/**
 * On the Create business API page, prefill the playground request body's `timezone`
 * with the visitor's IANA zone (same behavior as Create business in the app).
 * Scoped to #api-playground-input; path-gated so other pages stay untouched.
 *
 * Mintlify loads every `.js` in the content directory on all pages — keep work minimal off-page.
 */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  function pageActive() {
    var p =
      (document.documentElement &&
        document.documentElement.getAttribute('data-current-path')) ||
      (typeof location !== 'undefined' ? location.pathname : '') ||
      '';
    return p.indexOf('/endpoint/create-business') !== -1 || /create-business\/?$/.test(p);
  }

  var tz =
    (typeof Intl !== 'undefined' &&
      Intl.DateTimeFormat &&
      Intl.DateTimeFormat().resolvedOptions().timeZone) ||
    'America/New_York';

  var done = false;
  var pollId = null;
  var lastPath = '';

  function clearPoll() {
    if (pollId != null) {
      clearInterval(pollId);
      pollId = null;
    }
  }

  function setNativeValue(el, value) {
    var proto = window.HTMLTextAreaElement && window.HTMLTextAreaElement.prototype;
    if (!proto) {
      el.value = value;
      return;
    }
    var desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && typeof desc.set === 'function') desc.set.call(el, value);
    else el.value = value;
  }

  function findEditor() {
    var root = document.getElementById('api-playground-input');
    if (!root) return null;
    var ta = root.querySelector('textarea.inputarea');
    if (ta && ta.value && ta.value.indexOf('"businessOwnership"') !== -1) return ta;
    var list = root.querySelectorAll('textarea');
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.value && t.value.indexOf('"businessOwnership"') !== -1) return t;
    }
    return null;
  }

  function patch() {
    if (done || !pageActive()) return;
    var el = findEditor();
    if (!el) return;
    var raw = el.value;
    if (!raw) return;
    try {
      var j = JSON.parse(raw);
      if (!j || typeof j !== 'object') return;
      if (typeof j.businessOwnership !== 'string') return;
      if (j.timezone === tz) {
        done = true;
        return;
      }
      j.timezone = tz;
      var next = JSON.stringify(j, null, 2);
      if (next === raw) {
        done = true;
        return;
      }
      setNativeValue(el, next);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      try {
        el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
      } catch (e) {}
      done = true;
    } catch (e) {}
  }

  function schedulePoll() {
    clearPoll();
    var n = 0;
    pollId = setInterval(function () {
      if (!pageActive()) {
        clearPoll();
        done = false;
        return;
      }
      patch();
      if (done || ++n > 80) clearPoll();
    }, 150);
    setTimeout(clearPoll, 15000);
  }

  function kick() {
    if (!pageActive()) {
      done = false;
      clearPoll();
      return;
    }
    done = false;
    patch();
    schedulePoll();
  }

  function onReady() {
    lastPath =
      (document.documentElement &&
        document.documentElement.getAttribute('data-current-path')) ||
      '';
    kick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  try {
    new MutationObserver(function () {
      var p =
        (document.documentElement &&
          document.documentElement.getAttribute('data-current-path')) ||
        '';
      if (p === lastPath) return;
      lastPath = p;
      kick();
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-current-path'],
    });
  } catch (e) {}

  try {
    new MutationObserver(function () {
      if (pageActive() && !done) patch();
    }).observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
})();
