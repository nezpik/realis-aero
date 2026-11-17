// Realis Aero glass specimen: deterministic backdrops, the layer switches,
// the fresh-reading pulse and a live data field. The backdrops are stress
// tests drawn in code, so every run sees the same pixels. They are not photographs.
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Dense hardware glass is a dark subtree, except in outdoor: a dark panel in sunlight would not reach AAA,
  // so there it stays in the outdoor theme and becomes the outdoor solid panel.
  if (document.documentElement.dataset.theme === 'outdoor') Array.prototype.forEach.call(document.querySelectorAll('[data-variant="dense"]'), function (g) { g.removeAttribute('data-theme'); });
  var seed = 7;
  function rand() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

  var DRAW = {
    // A built environment: bright sky, a dark ground, a solar field with seams.
    sky: function (c, w, h) {
      var g = c.createLinearGradient(0, 0, 0, h * 0.6); g.addColorStop(0, 'rgb(232,243,250)'); g.addColorStop(1, 'rgb(165,200,222)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      var sun = c.createRadialGradient(w * 0.78, h * 0.26, 4, w * 0.78, h * 0.26, h * 0.5); sun.addColorStop(0, 'rgba(255,252,236,1)'); sun.addColorStop(1, 'rgba(255,252,236,0)');
      c.fillStyle = sun; c.fillRect(0, 0, w, h);
      var gr = c.createLinearGradient(0, h * 0.6, 0, h); gr.addColorStop(0, 'rgb(52,64,48)'); gr.addColorStop(1, 'rgb(22,28,22)');
      c.fillStyle = gr; c.fillRect(0, h * 0.6, w, h * 0.4);
      for (var row = 0; row < 4; row++) {
        var y = h * 0.64 + row * h * 0.085, ph = h * 0.06 + row * 3, pw = 26 + row * 8;
        for (var x = -10; x < w; x += pw + 4) { c.fillStyle = 'rgb(30,52,78)'; c.fillRect(x, y, pw, ph); c.fillStyle = 'rgba(200,215,225,0.55)'; c.fillRect(x, y, pw, 1); c.fillRect(x + pw / 2, y, 1, ph); }
      }
    },
    ground: function (c, w, h) {
      var g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgb(20,28,22)'); g.addColorStop(1, 'rgb(66,52,38)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      for (var i = 0; i < w * h / 90; i++) { c.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.35)' : 'rgba(150,130,100,0.25)'; c.fillRect(rand() * w, rand() * h, 2, 2); }
    },
    // The worst case for a blur: fine, high-contrast detail.
    busy: function (c, w, h) {
      for (var x = 0; x < w; x += 6) { c.fillStyle = (x / 6) % 2 ? '#fff' : '#000'; c.fillRect(x, 0, 6, h); }
      for (var y = 0; y < h; y += 44) { c.fillStyle = 'rgba(128,128,128,0.55)'; c.fillRect(0, y, w, 14); }
      for (var i = 0; i < w * h / 300; i++) { c.fillStyle = rand() < 0.5 ? '#fff' : '#000'; c.fillRect(rand() * w, rand() * h, 3, 3); }
    },
    // The extremes side by side: a plate must hold over both halves at once.
    split: function (c, w, h) { c.fillStyle = '#fff'; c.fillRect(0, 0, w / 2, h); c.fillStyle = '#000'; c.fillRect(w / 2, 0, w / 2, h); }
  };
  function paint(scene) {
    var cv = scene.querySelector('canvas'); if (!cv) return;
    var w = Math.max(1, Math.round(scene.clientWidth)), h = Math.max(1, Math.round(scene.clientHeight));
    cv.width = w; cv.height = h; seed = 7;
    var kind = scene.dataset.backdrop, c = cv.getContext('2d');
    if (kind === 'flow') drawFlow(c, w, h, 0); else DRAW[kind](c, w, h);
  }
  // A live data field: moving bands, so there is always something to reveal.
  function drawFlow(c, w, h, t) {
    c.fillStyle = 'rgb(13,47,69)'; c.fillRect(0, 0, w, h);
    for (var i = -2; i < w / 38 + 2; i++) {
      var x = i * 38 + (t * 0.03) % 38;
      c.fillStyle = i % 3 === 0 ? 'rgba(143,225,216,0.85)' : i % 3 === 1 ? 'rgba(243,199,102,0.55)' : 'rgba(156,198,216,0.45)';
      c.save(); c.translate(x, 0); c.transform(1, 0, -0.5, 1, 0, 0); c.fillRect(0, 0, 9, h); c.restore();
    }
  }
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  scenes.forEach(paint);
  var timer; window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(function () { scenes.forEach(paint); }, 120); });
  if (!reduced) {
    var flows = scenes.filter(function (s) { return s.dataset.backdrop === 'flow'; });
    var tick = function (t) { flows.forEach(function (s) { var cv = s.querySelector('canvas'); drawFlow(cv.getContext('2d'), cv.width, cv.height, t); }); requestAnimationFrame(tick); };
    if (flows.length) requestAnimationFrame(tick);
  }

  // The layer switches on the anatomy panel.
  var anatomy = document.getElementById('anatomy');
  Array.prototype.forEach.call(document.querySelectorAll('input[data-layer]'), function (box) {
    box.addEventListener('change', function () {
      var layer = box.dataset.layer;
      if (layer === 'wear') { if (box.checked) anatomy.setAttribute('data-wear', ''); else anatomy.removeAttribute('data-wear'); return; }
      var off = (anatomy.getAttribute('data-off') || '').split(/\s+/).filter(function (x) { return x && x !== layer; });
      if (!box.checked) off.push(layer);
      if (off.length) anatomy.setAttribute('data-off', off.join(' ')); else anatomy.removeAttribute('data-off');
    });
  });

  // A fresh reading pulses its stream once, then settles.
  var fresh = document.getElementById('fresh');
  if (fresh) fresh.addEventListener('click', function () {
    var path = document.querySelector('#reveal .stream--water'); path.classList.remove('is-fresh'); void path.getBoundingClientRect(); path.classList.add('is-fresh');
    document.getElementById('fresh-say').textContent = 'Fresh reading on the water stream.';
  });
})();
