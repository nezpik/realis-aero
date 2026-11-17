/* Realis Pale illustrations, drawn in code. Every colour is a token, so each scene follows the hour
 * and the theme with no second drawing. They carry no text; an alt label is set where they are used. */
(function () {
  var uid = 0;
  function g(id) { return id + (uid) ; }
  var C = {
    evening: 'var(--rp-evening)', sil: 'var(--rp-silhouette)', shade: 'var(--rp-shade)', overcast: 'var(--rp-overcast)', fog: 'var(--rp-fog)', mist: 'var(--rp-mist)',
    paper: 'var(--rp-paper)', ash: 'var(--rp-ash)', lantern: 'var(--rp-lantern)', sky: 'var(--rp-skyline)', spark: 'var(--rp-spark)', skyTop: 'var(--rp-sky-top)', skyMid: 'var(--rp-sky-mid)', skyLow: 'var(--rp-sky-low)', skyGlow: 'var(--rp-sky-glow)'
  };
  // Glow is gentler at later hours and off in Last Light; a lit window stays visible because it keeps a floor.
  var GLOW = 'opacity:calc(0.35 + 0.65 * var(--rp-glow-k))';

  function steps() {
    uid++;
    var s = g('s');
    var stars = '';
    [[90, 40, 1.1], [180, 92, .8], [260, 30, 1], [340, 70, .9], [430, 28, 1.1], [520, 80, .8], [610, 44, 1], [700, 24, .9], [790, 74, 1],
     [880, 36, 1.1], [960, 90, .8], [1050, 30, 1], [1130, 66, .9], [60, 130, .8], [1170, 120, .8], [470, 130, .7]]
      .forEach(function (p) { stars += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '" fill="' + C.paper + '" style="opacity:var(--rp-stars)"/>'; });
    var skyline = '', wins = '';
    [[0, 300, 70, 90], [60, 270, 56, 120], [112, 305, 80, 85], [190, 285, 60, 105], [248, 310, 90, 80], [340, 296, 64, 94], [404, 276, 52, 114], [452, 306, 78, 84]]
      .forEach(function (b) { skyline += '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" fill="' + C.sil + '" opacity=".92"/>'; });
    [[84, 290], [130, 322], [210, 304], [372, 316], [420, 296], [476, 326]]
      .forEach(function (w) { wins += '<rect x="' + w[0] + '" y="' + w[1] + '" width="5" height="7" rx="1" fill="' + C.lantern + '" opacity=".7"/>'; });
    return '' +
    '<svg viewBox="0 0 1200 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="" preserveAspectRatio="xMidYMax slice">' +
    '<defs>' +
      '<linearGradient id="' + s + 'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + C.skyTop + '"/><stop offset=".42" style="stop-color:' + C.skyMid + '"/><stop offset=".78" style="stop-color:' + C.skyLow + '"/><stop offset="1" style="stop-color:' + C.skyGlow + '"/></linearGradient>' +
      '<radialGradient id="' + s + 'sun" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:' + C.skyGlow + ';stop-opacity:.85"/><stop offset=".5" style="stop-color:' + C.skyLow + ';stop-opacity:.30"/><stop offset="1" style="stop-color:' + C.skyLow + ';stop-opacity:0"/></radialGradient>' +
      '<filter id="' + s + 'cloud" x="-20%" y="-300%" width="140%" height="700%"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<radialGradient id="' + s + 'lamp" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:' + C.lantern + ';stop-opacity:.34"/><stop offset=".45" style="stop-color:' + C.lantern + ';stop-opacity:.10"/><stop offset="1" style="stop-color:' + C.lantern + ';stop-opacity:0"/></radialGradient>' +
      '<radialGradient id="' + s + 'door" cx=".5" cy=".6" r=".5"><stop offset="0" style="stop-color:' + C.lantern + ';stop-opacity:.30"/><stop offset="1" style="stop-color:' + C.lantern + ';stop-opacity:0"/></radialGradient>' +
      '<radialGradient id="' + s + 'pool" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:' + C.lantern + ';stop-opacity:.20"/><stop offset="1" style="stop-color:' + C.lantern + ';stop-opacity:0"/></radialGradient>' +
      '<filter id="' + s + 'blur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="22"/></filter>' +
    '</defs>' +
    '<rect width="1200" height="400" fill="url(#' + s + 'sky)"/>' +
    '<g>' + stars + '</g>' +
    /* the sun has just gone: a glow on the horizon, and thin cloud lit from below */
    '<g style="opacity:calc(0.45 + 0.55 * var(--rp-glow-k))"><ellipse cx="660" cy="380" rx="760" ry="250" fill="url(#' + s + 'sun)"/></g>' +
    '<g filter="url(#' + s + 'cloud)">' +
      '<ellipse cx="250" cy="236" rx="260" ry="9" fill="' + C.skyMid + '" opacity=".9"/><ellipse cx="260" cy="246" rx="210" ry="5" fill="' + C.skyGlow + '" opacity=".55"/>' +
      '<ellipse cx="760" cy="196" rx="300" ry="8" fill="' + C.skyMid + '" opacity=".85"/><ellipse cx="770" cy="205" rx="250" ry="4.5" fill="' + C.skyGlow + '" opacity=".6"/>' +
      '<ellipse cx="1010" cy="276" rx="220" ry="8" fill="' + C.skyMid + '" opacity=".8"/><ellipse cx="1015" cy="285" rx="180" ry="4" fill="' + C.skyGlow + '" opacity=".6"/>' +
      '<ellipse cx="470" cy="304" rx="260" ry="6" fill="' + C.skyMid + '" opacity=".7"/><ellipse cx="478" cy="311" rx="200" ry="3.5" fill="' + C.skyGlow + '" opacity=".55"/>' +
    '</g>' +
    '<g>' + skyline + wins + '</g>' +
    /* library */
    '<g>' +
      '<rect x="740" y="190" width="400" height="190" fill="' + C.overcast + '"/>' +
      '<polygon points="720,192 940,128 1160,192" fill="' + C.fog + '"/>' +
      '<path d="M720 192 L940 128 L1160 192" fill="none" stroke="' + C.skyGlow + '" stroke-width="2" opacity=".55"/>' +
      '<polygon points="756,190 940,140 1124,190" fill="' + C.overcast + '"/>' +
      '<rect x="740" y="190" width="400" height="6" fill="' + C.fog + '"/>' +
      [772, 842, 1010, 1080].map(function (x) { return '<rect x="' + x + '" y="214" width="26" height="166" fill="' + C.fog + '" opacity=".55"/>'; }).join('') +
      [779, 849, 1017, 1087].map(function (x) { return '<rect x="' + x + '" y="236" width="12" height="46" rx="6" fill="' + C.sil + '"/>'; }).join('') +
      '<rect x="1024" y="240" width="12" height="46" rx="6" fill="' + C.lantern + '" opacity=".55"/>' +
      '<ellipse cx="940" cy="330" rx="150" ry="110" fill="url(#' + s + 'door)" style="' + GLOW + '"/>' +
      '<path d="M912 380 V318 a28 28 0 0 1 56 0 V380 Z" fill="' + C.lantern + '" opacity=".92"/>' +
      '<path d="M934 380 V324 M946 380 V324" stroke="' + C.sil + '" stroke-width="2" opacity=".5"/>' +
    '</g>' +
    /* ground and steps */
    '<rect x="0" y="378" width="1200" height="142" fill="' + C.shade + '"/>' +
    '<rect x="0" y="378" width="1200" height="3" fill="' + C.mist + '" opacity=".35"/>' +
    '<rect x="150" y="384" width="900" height="30" fill="' + C.overcast + '"/>' +
    '<rect x="100" y="414" width="1000" height="34" fill="' + C.overcast + '" opacity=".92"/>' +
    '<rect x="50" y="448" width="1100" height="40" fill="' + C.fog + '" opacity=".9"/>' +
    '<rect x="0" y="488" width="1200" height="32" fill="' + C.fog + '" opacity=".8"/>' +
    [384, 414, 448, 488].map(function (y) { return '<rect x="0" y="' + y + '" width="1200" height="1.5" fill="' + C.paper + '" opacity=".07"/>'; }).join('') +
    /* lamp post and its light on the steps */
    '<g style="' + GLOW + '"><ellipse cx="300" cy="438" rx="360" ry="60" fill="url(#' + s + 'pool)"/></g>' +
    '<circle cx="262" cy="214" r="230" fill="url(#' + s + 'lamp)" style="' + GLOW + '"/>' +
    '<path d="M262 384 V232" stroke="' + C.mist + '" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M246 384 h32" stroke="' + C.mist + '" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M246 226 h32 l-6 -22 h-20 Z" fill="' + C.fog + '" stroke="' + C.mist + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<rect x="252" y="204" width="20" height="22" rx="4" fill="' + C.lantern + '"/>' +
    /* the person, seen from behind, on the upper step, with a notebook in the lap */
    '<g style="' + GLOW + '"><ellipse cx="500" cy="432" rx="150" ry="34" fill="url(#' + s + 'pool)"/></g>' +
    '<g>' +
      '<path d="M448 432 C448 404 458 392 474 390 L494 390 C510 392 520 404 520 432 Z" fill="' + C.sil + '"/>' +
      '<path d="M449 430 C449 406 458 394 472 391" fill="none" stroke="' + C.lantern + '" stroke-width="2" stroke-linecap="round" opacity=".55"/>' +
      '<circle cx="484" cy="372" r="16" fill="' + C.sil + '"/>' +
      '<path d="M470 366 a14 14 0 0 1 8 -9" fill="none" stroke="' + C.lantern + '" stroke-width="2" stroke-linecap="round" opacity=".5"/>' +
      '<path d="M452 430 l-14 6 l12 8 l22 -6 Z" fill="' + C.sil + '"/>' +
      '<g transform="rotate(-6 505 438)"><rect x="484" y="430" width="44" height="26" rx="2" fill="' + C.lantern + '" opacity=".9"/><path d="M506 430 v26" stroke="' + C.sil + '" stroke-width="1.5" opacity=".4"/></g>' +
    '</g>' +
    '<path d="M0 520 V500 Q300 492 600 502 T1200 496 V520 Z" fill="' + C.sil + '" opacity=".55"/>' +
    '</svg>';
  }

  function bench() {
    uid++;
    return '' +
    '<svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="" fill="none" stroke="' + C.ash + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<defs><radialGradient id="bg' + uid + '" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:' + C.skyLow + ';stop-opacity:.55"/><stop offset="1" style="stop-color:' + C.skyLow + ';stop-opacity:0"/></radialGradient></defs>' +
      '<ellipse cx="240" cy="236" rx="300" ry="90" fill="url(#bg' + uid + ')" stroke="none"/>' +
      '<path d="M20 232 H460" opacity=".6"/>' +
      '<path d="M330 232 L392 244 L460 252" stroke-dasharray="1 7" opacity=".7"/>' +
      '<path d="M80 188 H220 M84 160 H216 M92 188 V232 M208 188 V232 M88 160 V188 M212 160 V188" />' +
      '<path d="M340 232 V74" stroke-width="2"/><path d="M326 74 H354 L350 56 H330 Z"/>' +
      '<rect x="332" y="56" width="16" height="18" rx="3" fill="' + C.lantern + '" stroke="' + C.lantern + '"/>' +
      '<path d="M296 100 A64 64 0 0 0 296 12" stroke="' + C.lantern + '" opacity=".35"/><path d="M384 100 A64 64 0 0 1 384 12" stroke="' + C.lantern + '" opacity=".35"/>' +
      '<path d="M296 232 q44 -16 88 0" stroke="' + C.lantern + '" opacity=".35"/>' +
      '<circle cx="60" cy="70" r="1.2" fill="' + C.ash + '"/><circle cx="130" cy="40" r="1" fill="' + C.ash + '"/><circle cx="200" cy="86" r="1.2" fill="' + C.ash + '"/>' +
    '</svg>';
  }

  function spark() {
    uid++;
    var s = g('k');
    function card(x, w1, w2, w3) {
      return '<g><rect x="' + x + '" y="80" width="200" height="140" rx="16" fill="' + C.shade + '" stroke="' + C.mist + '"/>' +
        '<path d="M' + (x + 22) + ' 116 h' + w1 + ' M' + (x + 22) + ' 140 h' + w2 + ' M' + (x + 22) + ' 164 h' + w3 + '" stroke="' + C.ash + '" stroke-width="2" stroke-linecap="round" opacity=".55"/></g>';
    }
    return '' +
    '<svg viewBox="0 0 720 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="">' +
    '<defs><radialGradient id="' + s + 'g" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:' + C.spark + ';stop-opacity:.9"/><stop offset=".3" style="stop-color:' + C.spark + ';stop-opacity:.32"/><stop offset="1" style="stop-color:' + C.spark + ';stop-opacity:0"/></radialGradient></defs>' +
    card(60, 120, 90, 140) + card(460, 100, 130, 70) +
    '<path d="M260 150 C310 150 310 150 360 150 C410 150 410 150 460 150" fill="none" stroke="' + C.lantern + '" stroke-width="1.5" opacity=".5"/>' +
    '<circle cx="360" cy="150" r="46" fill="url(#' + s + 'g)"/>' +
    '<circle cx="360" cy="150" r="5" fill="' + C.spark + '"/>' +
    '<path d="M360 128 v-9 M360 172 v9 M338 150 h-9 M382 150 h9" stroke="' + C.spark + '" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>' +
    '</svg>';
  }

  function path() {
    uid++;
    var s = g('p');
    var pts = [], i;
    for (i = 0; i <= 56; i++) { var x = 40 + i * 20; pts.push([x, 150 + 46 * Math.sin(x / 150)]); }
    function d(a, b) { return pts.slice(a, b + 1).map(function (p, n) { return (n ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' '); }
    var cur = 33; /* the person is here */
    var lamps = '';
    [5, 13, 21, 29, 33, 43, 52].forEach(function (k, n) {
      var p = pts[k], lit = k < cur, here = k === cur;
      var col = lit ? C.lantern : here ? C.sky : C.mist;
      lamps += '<g transform="translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')">' +
        (lit ? '<circle cy="-26" r="46" fill="url(#' + s + 'l)" style="' + GLOW + '"/>' : '') +
        (here ? '<circle cy="-26" r="40" fill="url(#' + s + 's)" style="' + GLOW + '"/>' : '') +
        '<path d="M0 0 V-30" stroke="' + C.mist + '" stroke-width="3" stroke-linecap="round"/>' +
        '<rect x="-6" y="-44" width="12" height="14" rx="3" fill="' + (lit || here ? col : 'none') + '" stroke="' + col + '" stroke-width="1.5"/></g>';
    });
    var hp = pts[cur];
    return '' +
    '<svg viewBox="0 0 1200 270" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="" preserveAspectRatio="xMidYMid slice">' +
    '<defs>' +
      '<radialGradient id="' + s + 'l" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:' + C.lantern + ';stop-opacity:.30"/><stop offset="1" style="stop-color:' + C.lantern + ';stop-opacity:0"/></radialGradient>' +
      '<radialGradient id="' + s + 's" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:' + C.sky + ';stop-opacity:.28"/><stop offset="1" style="stop-color:' + C.sky + ';stop-opacity:0"/></radialGradient>' +
      '<linearGradient id="' + s + 'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + C.skyTop + '"/><stop offset=".45" style="stop-color:' + C.skyMid + '"/><stop offset=".82" style="stop-color:' + C.skyLow + '"/><stop offset="1" style="stop-color:' + C.skyGlow + '"/></linearGradient>' +
      '<radialGradient id="' + s + 'sun" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:' + C.skyGlow + ';stop-opacity:.8"/><stop offset="1" style="stop-color:' + C.skyLow + ';stop-opacity:0"/></radialGradient>' +
      '<linearGradient id="' + s + 'f" x1="0" x2="1"><stop offset="0" style="stop-color:' + C.paper + ';stop-opacity:.8"/><stop offset="1" style="stop-color:' + C.paper + ';stop-opacity:.25"/></linearGradient>' +
    '</defs>' +
    '<rect width="1200" height="270" fill="url(#' + s + 'sky)"/>' +
    '<g style="opacity:calc(0.45 + 0.55 * var(--rp-glow-k))"><ellipse cx="900" cy="236" rx="520" ry="120" fill="url(#' + s + 'sun)"/></g>' +
    '<path d="M0 270 V232 Q200 214 420 236 T820 226 T1200 238 V270 Z" fill="' + C.sil + '" opacity=".9"/>' +
    '<path d="' + d(0, cur) + '" fill="none" stroke="' + C.lantern + '" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>' +
    '<path d="' + d(cur, 56) + '" fill="none" stroke="url(#' + s + 'f)" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 9"/>' +
    lamps +
    /* the person: a small figure at the current lamp */
    '<g transform="translate(' + (hp[0] - 22).toFixed(1) + ' ' + hp[1].toFixed(1) + ')"><circle cy="-18" r="5" fill="' + C.paper + '" opacity=".85"/><path d="M-6 0 C-6 -9 -4 -13 0 -13 C4 -13 6 -9 6 0 Z" fill="' + C.paper + '" opacity=".85"/></g>' +
    '</svg>';
  }

  window.RealisPaleArt = { steps: steps, bench: bench, spark: spark, path: path };
})();
