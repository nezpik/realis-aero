// Realis Aero settings: staged until Apply, with an inert preview, locked
// settings that show their owner, pointer-free reordering and find.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var DEFAULTS = { theme: 'system', density: 'auto', transparency: false, language: 'en', order: ['alerts', 'readings', 'table'], warnings: true };
  var KEYS = ['theme', 'density', 'transparency', 'language', 'order', 'warnings'];
  var NAME = { theme: 'Theme', density: 'Density', transparency: 'Reduced transparency', language: 'Language', order: 'Panel order', warnings: 'Notify on warnings' };
  var SCOPE = { theme: 'your profile on every device', density: 'this device only', transparency: 'this device only', language: 'your profile on every device', order: 'your profile on every device', warnings: 'your profile on every device' };
  var LABEL = {
    theme: { system: 'System', light: 'Light', dark: 'Dark', outdoor: 'Outdoor' },
    density: { auto: 'Automatic', comfortable: 'Comfortable', compact: 'Compact', touch: 'Touch' },
    language: { en: 'English', fr: 'Français', ar: 'العربية' },
    transparency: { true: 'Reduced', false: 'Standard' }, warnings: { true: 'On', false: 'Off' }
  };
  var PANELS = { alerts: 'Alerts', readings: 'Readings', table: 'Table' };
  var T = {
    en: { live: 'Live · 14:02:31', degraded: 'Degraded · 71% of expected', name: 'Heat pump 2', setpoint: 'Setpoint', row: 'Inverter 2', maintenance: 'Maintenance', apply: 'Apply', cancel: 'Cancel' },
    fr: { live: 'En direct · 14:02:31', degraded: 'Dégradé · 71 % du prévu', name: 'Pompe à chaleur 2', setpoint: 'Consigne', row: 'Onduleur 2', maintenance: 'Maintenance', apply: 'Appliquer', cancel: 'Annuler' },
    ar: { live: 'مباشر · 14:02:31', degraded: 'متدهور · 71% من المتوقع', name: 'مضخة حرارية 2', setpoint: 'القيمة المطلوبة', row: 'العاكس 2', maintenance: 'صيانة', apply: 'تطبيق', cancel: 'إلغاء' }
  };
  var copy = function (o) { return JSON.parse(JSON.stringify(o)); };
  var same = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
  var say = function (t) { $('set-status').textContent = t; };
  function load() { try { var v = JSON.parse(localStorage.getItem('ra.settings')); if (v) return Object.assign(copy(DEFAULTS), v); } catch (e) { /* defaults */ } return copy(DEFAULTS); }
  var applied = load(), staged = copy(applied);
  var show = function (k, v) { return k === 'order' ? v.map(function (id) { return PANELS[id]; }).join(', ') : (LABEL[k] ? LABEL[k][String(v)] : String(v)); };
  var changed = function () { return KEYS.filter(function (k) { return !same(staged[k], applied[k]); }); };
  var plural = function (n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };

  // A disabled control stays focusable and its reason is its description.
  function setDisabled(btn, off, why) {
    btn.setAttribute('aria-disabled', String(off));
    var id = 'why-' + btn.id, el = document.getElementById(id);
    if (off) {
      btn.dataset.why = why;
      if (!el) { el = document.createElement('span'); el.id = id; el.className = 'sr-only'; btn.after(el); }
      el.textContent = why; btn.setAttribute('aria-describedby', id);
    } else { delete btn.dataset.why; btn.removeAttribute('aria-describedby'); if (el) el.remove(); }
  }
  function applyToRoot(s) {
    var r = document.documentElement;
    if (s.theme === 'system') r.removeAttribute('data-theme'); else r.dataset.theme = s.theme;
    if (s.density === 'auto') r.removeAttribute('data-density'); else r.dataset.density = s.density;
    if (s.transparency) r.dataset.reducedTransparency = 'true'; else r.removeAttribute('data-reduced-transparency');
    r.lang = s.language; r.dir = s.language === 'ar' ? 'rtl' : 'ltr';
  }

  function renderOrder() {
    var list = $('order'), focus = document.activeElement && document.activeElement.closest && document.activeElement.closest('#order') ? document.activeElement.id : null;
    list.innerHTML = staged.order.map(function (id) {
      return '<li class="order__row" data-id="' + id + '"><span>' + PANELS[id] + '</span><span class="cols__btns">'
        + '<button class="btn btn--secondary" type="button" id="up-' + id + '" aria-label="Move ' + PANELS[id] + ' up">Up</button>'
        + '<button class="btn btn--secondary" type="button" id="down-' + id + '" aria-label="Move ' + PANELS[id] + ' down">Down</button></span></li>';
    }).join('');
    staged.order.forEach(function (id, i) {
      setDisabled($('up-' + id), i === 0, PANELS[id] + ' is already first.');
      setDisabled($('down-' + id), i === staged.order.length - 1, PANELS[id] + ' is already last.');
    });
    if (focus && $(focus)) $(focus).focus();
  }
  function render() {
    // Controls show the staged values.
    ['theme', 'density', 'language'].forEach(function (k) { Array.prototype.forEach.call(document.querySelectorAll('input[name="' + k + '"]'), function (i) { i.checked = i.value === staged[k]; }); });
    $('in-transparency').checked = staged.transparency; $('in-warnings').checked = staged.warnings;
    renderOrder();
    // Every setting says whether it differs from what is applied.
    KEYS.forEach(function (k) {
      var row = document.querySelector('.setting[data-key="' + k + '"]'), dirty = !same(staged[k], applied[k]), dot = row.querySelector('.setting__name .mark');
      dot.hidden = !dirty;
      row.querySelector('.field__message span').textContent = dirty ? 'Unsaved · was ' + show(k, applied[k]) + ' · applies to ' + SCOPE[k] : 'Applies to ' + SCOPE[k];
    });
    // The preview is a subtree carrying the staged theme, density and language.
    var p = $('preview'), dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    p.dataset.theme = staged.theme === 'system' ? (dark ? 'dark' : 'light') : staged.theme;
    if (staged.density === 'auto') p.removeAttribute('data-density'); else p.dataset.density = staged.density;
    if (staged.transparency) p.dataset.reducedTransparency = 'true'; else p.removeAttribute('data-reduced-transparency');
    p.lang = staged.language; p.dir = staged.language === 'ar' ? 'rtl' : 'ltr';
    Array.prototype.forEach.call(p.querySelectorAll('[data-t]'), function (el) { el.textContent = T[staged.language][el.dataset.t]; });
    // The apply bar.
    var n = changed().length;
    $('set-count').textContent = n + ' unsaved'; $('set-count').parentElement.hidden = n === 0;
    setDisabled($('s-apply'), n === 0, 'Nothing to apply: no unsaved settings.');
    setDisabled($('s-reset'), n === 0, 'Nothing to reset: no unsaved settings.');
    setDisabled($('s-defaults'), same(staged, DEFAULTS), 'Already at the defaults.');
  }

  Array.prototype.forEach.call(document.querySelectorAll('input[type="radio"]'), function (i) { i.addEventListener('change', function () { staged[i.name] = i.value; render(); }); });
  $('in-transparency').addEventListener('change', function (e) { staged.transparency = e.target.checked; render(); });
  $('in-warnings').addEventListener('change', function (e) { staged.warnings = e.target.checked; render(); });
  $('order').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.getAttribute('aria-disabled') === 'true') { say(b.dataset.why); return; }
    var id = b.closest('.order__row').dataset.id, i = staged.order.indexOf(id), j = i + (b.id.indexOf('up-') === 0 ? -1 : 1);
    staged.order.splice(i, 1); staged.order.splice(j, 0, id); render();
    say(PANELS[id] + ' moved to position ' + (j + 1) + '.');
  });
  var guard = function (btn, fn) { btn.addEventListener('click', function () { if (btn.getAttribute('aria-disabled') === 'true') { say(btn.dataset.why); return; } fn(); render(); }); };
  guard($('s-apply'), function () { var n = changed().length; applied = copy(staged); try { localStorage.setItem('ra.settings', JSON.stringify(applied)); } catch (e) { /* ignore */ } applyToRoot(applied); say('Applied ' + plural(n, 'setting') + '.'); });
  guard($('s-reset'), function () { var n = changed().length; staged = copy(applied); say('Reset: ' + plural(n, 'unsaved setting') + ' discarded.'); });
  guard($('s-defaults'), function () { staged = copy(DEFAULTS); say('Staged the defaults. Apply to use them.'); });
  $('request').addEventListener('click', function () { say('Change requested from H. Tazi, operations lead.'); });

  // Find: filters by text, hides a group only when none of its settings match, and says how many remain.
  $('find').addEventListener('input', function (e) {
    var q = e.target.value.trim().toLowerCase(), all = document.querySelectorAll('.setting'), shown = 0;
    Array.prototype.forEach.call(all, function (s) { var ok = !q || (s.dataset.text + ' ' + s.textContent).toLowerCase().indexOf(q) >= 0; s.hidden = !ok; if (ok) shown++; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-group]'), function (g) { g.hidden = !g.querySelector('.setting:not([hidden])'); });
    $('find-status').textContent = !q ? '' : shown === 0 ? 'No settings match "' + e.target.value.trim() + '".' : 'Showing ' + shown + ' of ' + all.length + ' settings.';
  });

  render();
})();
