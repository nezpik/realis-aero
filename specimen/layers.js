// Realis Aero layered state: baseline → committed → queued → draft.
// What a field shows is the top layer that holds a value for it. Unsaved and
// queued marks, Reset, Revert and Undo are all computed from the layers.
(function () {
  var root = document.getElementById('layers');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEYS = ['setpoint', 'setback', 'tariff'];
  var NAMES = { setpoint: 'Setpoint', setback: 'Night setback', tariff: 'Tariff window' };
  var REMOTE = { key: 'setback', value: '17.0', who: 'L. Haddad', at: '14:03' };  // an edit made elsewhere while offline
  var baseline = {}, committed = {}, queued = {}, draft = {}, conflicts = [], history = [], online = true, clock = 5;
  KEYS.forEach(function (k) { baseline[k] = committed[k] = $('l-' + k).value; });

  var copy = function (o) { return JSON.parse(JSON.stringify(o)); };
  var size = function (o) { return Object.keys(o).length; };
  var value = function (k) { return k in draft ? draft[k] : k in queued ? queued[k] : committed[k]; };
  var stamp = function () { return '14:' + String(clock++).padStart(2, '0'); };
  var plural = function (n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };
  function record(label) { history.push({ label: label + ' · ' + stamp(), committed: copy(committed), queued: copy(queued) }); }
  function say(text) { $('layers-status').textContent = text; }
  // A disabled control stays focusable and its reason is its description, not only a message after a click.
  function setDisabled(btn, off, why) {
    btn.setAttribute('aria-disabled', String(off));
    var id = 'why-' + btn.id, el = document.getElementById(id);
    if (off) {
      btn.dataset.why = why;
      if (!el) { el = document.createElement('span'); el.id = id; el.className = 'sr-only'; btn.after(el); }
      el.textContent = why; btn.setAttribute('aria-describedby', id);
    } else { delete btn.dataset.why; btn.setAttribute('aria-describedby', 'layers-status'); if (el) el.remove(); }
  }

  // While the user types, the field they are in is left alone; after an action every field is redrawn.
  function render(typing) {
    KEYS.forEach(function (k) {
      var field = $('l-' + k).closest('.field'), msg = $('l-' + k + '-m'), dot = field.querySelector('.field__label .mark'), arrow = msg.querySelector('.mark'), text = msg.querySelector('span');
      if (!(typing && document.activeElement === $('l-' + k))) $('l-' + k).value = value(k);
      var state = k in draft ? 'dirty' : k in queued ? 'queued' : 'rest';
      field.dataset.state = state; dot.hidden = state === 'rest'; arrow.hidden = state !== 'queued';
      text.textContent = state === 'dirty' ? 'Unsaved · was ' + (k in queued ? queued[k] : committed[k])
        : state === 'queued' ? 'Queued · was ' + committed[k] + ' · syncs when the network returns'
        : committed[k] !== baseline[k] ? 'Saved · was ' + baseline[k] + ' when opened' : 'Saved';
    });
    $('layers-dirty').textContent = size(draft) + ' unsaved';
    $('layers-queued').textContent = size(queued) + ' queued';
    $('layers-dirty').parentElement.hidden = !size(draft);
    $('layers-queued').parentElement.hidden = !size(queued);
    var changed = KEYS.some(function (k) { return committed[k] !== baseline[k]; });
    setDisabled($('l-apply'), !size(draft), 'Nothing to apply: no unsaved changes.');
    setDisabled($('l-reset'), !size(draft), 'Nothing to reset: no unsaved changes.');
    setDisabled($('l-revert'), !changed || !online, online ? 'Nothing to revert: values match what was opened.' : 'Revert needs the network: it changes saved values.');
    setDisabled($('l-undo'), !history.length, 'Nothing to undo yet.');
    $('l-apply').textContent = online ? 'Apply' : 'Apply offline';
    $('net').textContent = online ? 'Go offline' : 'Go online'; $('net').setAttribute('aria-pressed', String(!online));
    var feed = $('layers-net'); feed.dataset.state = online ? 'live' : 'offline';
    feed.querySelector('use').setAttribute('href', online ? '#m-live' : '#m-offline');
    feed.querySelector('span').textContent = online ? 'Online · changes save when applied' : 'Offline · changes queue until the network returns';
    var list = $('layers-history'); list.textContent = '';
    history.slice(-3).reverse().forEach(function (h) { var li = document.createElement('li'); li.textContent = h.label; list.appendChild(li); });
    var box = $('layers-conflicts'); box.textContent = '';
    conflicts.forEach(function (c) {
      var row = document.createElement('div'); row.className = 'conflict'; row.dataset.state = 'warning';
      row.innerHTML = '<span class="state-label"><svg class="mark" aria-hidden="true"><use href="#m-warning"/></svg><span></span></span>';
      row.querySelector('span span').textContent = 'Conflict · ' + NAMES[c.key] + ': yours ' + c.mine + ', theirs ' + c.theirs + ' (' + c.who + ', ' + c.at + ')';
      [['Keep mine', c.mine], ['Take theirs', c.theirs]].forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn--secondary'; b.textContent = o[0];
        b.addEventListener('click', function () { record('Resolved ' + NAMES[c.key] + ' (' + o[0].toLowerCase() + ')'); committed[c.key] = o[1]; conflicts = conflicts.filter(function (x) { return x !== c; }); say('Conflict resolved: ' + NAMES[c.key] + ' is ' + o[1] + '.'); render(); });
        row.appendChild(b);
      });
      box.appendChild(row);
    });
  }

  KEYS.forEach(function (k) {
    $('l-' + k).addEventListener('input', function (ev) {
      var below = k in queued ? queued[k] : committed[k];
      if (ev.target.value === below) delete draft[k]; else draft[k] = ev.target.value;
      render(true);
    });
  });
  function guard(btn, fn) { btn.addEventListener('click', function () { if (btn.getAttribute('aria-disabled') === 'true') { say(btn.dataset.why); return; } fn(); render(); }); }
  guard($('l-apply'), function () {
    var n = size(draft);
    if (online) { record('Applied ' + plural(n, 'change')); Object.assign(committed, draft); say('Applied ' + plural(n, 'change') + '.'); }
    else { record('Queued ' + plural(n, 'change')); Object.assign(queued, draft); say('Queued ' + plural(n, 'change') + '. They sync when the network returns.'); }
    draft = {};
  });
  guard($('l-reset'), function () { var n = size(draft); draft = {}; say('Reset: ' + plural(n, 'unsaved change') + ' discarded.'); });
  guard($('l-revert'), function () { record('Reverted to the values that were opened'); committed = copy(baseline); draft = {}; say('Reverted to the values that were opened.'); });
  guard($('l-undo'), function () { var h = history.pop(); committed = h.committed; queued = h.queued; say('Undone: ' + h.label.split(' · ')[0] + '.'); });
  $('net').addEventListener('click', function () {
    online = !online;
    if (online && size(queued)) {
      var n = 0;
      record('Synced queued changes');
      Object.keys(queued).forEach(function (k) {
        if (k === REMOTE.key && queued[k] !== REMOTE.value) conflicts.push({ key: k, mine: queued[k], theirs: REMOTE.value, who: REMOTE.who, at: REMOTE.at });
        else { committed[k] = queued[k]; n++; }
      });
      queued = {};
      say('Back online: ' + plural(n, 'change') + ' synced' + (conflicts.length ? ', ' + plural(conflicts.length, 'conflict') + ' to resolve.' : '.'));
    } else say(online ? 'Back online.' : 'Offline. Changes you apply are queued.');
    render();
  });
  render();
})();
