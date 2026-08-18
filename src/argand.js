// argand.js -- draws the two amplitudes as arrows from a shared origin.
//
// Pure: takes a state, returns an SVG string. Touches no DOM, so it can be
// unit tested in node and dumped to a file for README figures.

var AQ = AQ || {};

AQ.argand = (function () {
  "use strict";

  var K = AQ.complex;
  var ST = AQ.state;
  var CL = AQ.classify;

  var COL0 = "#0000cc";   // |0> amplitude
  var COL1 = "#cc0000";   // |1> amplitude
  var GHOST = "#aaaaaa";
  var ARC = "#008000";

  function esc(n) { return (Math.round(n * 100) / 100); }

  function mk(size) {
    var c = size / 2, sc = size * 0.281;   // unit circle at ~56% of half-size
    return {
      size: size, cx: c, cy: c, sc: sc,
      X: function (x) { return c + x * sc; },
      Y: function (y) { return c - y * sc; }
    };
  }

  function arrowSvg(g, z, color, width, dashed) {
    var x1 = g.X(0), y1 = g.Y(0), x2 = g.X(z.re), y2 = g.Y(z.im);
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    if (len < 2) return "";
    var ux = dx / len, uy = dy / len, hl = 10, hw = 4.5;
    var bx = x2 - ux * hl, by = y2 - uy * hl, nx = -uy, ny = ux;
    var ds = dashed ? ' stroke-dasharray="4,3"' : "";
    return '<line x1="' + esc(x1) + '" y1="' + esc(y1) + '" x2="' + esc(bx) +
           '" y2="' + esc(by) + '" stroke="' + color + '" stroke-width="' + width + '"' + ds + '/>' +
           '<polygon points="' + esc(x2) + ',' + esc(y2) + ' ' +
           esc(bx + nx * hw) + ',' + esc(by + ny * hw) + ' ' +
           esc(bx - nx * hw) + ',' + esc(by - ny * hw) + '" fill="' + color + '"/>';
  }

  function segSvg(g, za, zb, color, dashed) {
    var ds = dashed ? ' stroke-dasharray="3,3"' : "";
    return '<line x1="' + esc(g.X(za.re)) + '" y1="' + esc(g.Y(za.im)) +
           '" x2="' + esc(g.X(zb.re)) + '" y2="' + esc(g.Y(zb.im)) +
           '" stroke="' + color + '" stroke-width="1"' + ds + '/>';
  }

  // opts: {size, prev, prevMatrix, showRing, showGhost, showSum, gaugeFix}
  function render(state, opts) {
    opts = opts || {};
    var size = opts.size || 420;
    var g = mk(size);
    var s = opts.gaugeFix === false ? state : ST.gaugeFix(state);
    var prev = opts.prev
      ? (opts.gaugeFix === false ? opts.prev : ST.gaugeFix(opts.prev))
      : null;

    var o = [];
    o.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
           '" viewBox="0 0 ' + size + ' ' + size + '" style="background:#fff">');

    // axes
    o.push('<line x1="0" y1="' + g.cy + '" x2="' + size + '" y2="' + g.cy + '" stroke="#ddd"/>');
    o.push('<line x1="' + g.cx + '" y1="0" x2="' + g.cx + '" y2="' + size + '" stroke="#ddd"/>');

    // unit circle (a bound: only reached when the other amplitude is zero)
    o.push('<circle cx="' + g.cx + '" cy="' + g.cy + '" r="' + esc(g.sc) +
           '" fill="none" stroke="#999"/>');

    // balanced-superposition ring at 1/sqrt(2)
    if (opts.showRing !== false) {
      o.push('<circle cx="' + g.cx + '" cy="' + g.cy + '" r="' + esc(g.sc * Math.SQRT1_2) +
             '" fill="none" stroke="#ccc" stroke-dasharray="3,3"/>');
    }

    // relative phase arc, drawn on the unit circle
    //var dt = ST.deltaTheta(s);
    //if (dt !== null && Math.abs(dt) > 1e-9) {
      //var a0 = K.arg(s[0]), a1 = a0 + dt;
      // SVG y is down, so counterclockwise in the maths is sweep-flag 0.
      //var sweep = dt > 0 ? 0 : 1;
      //o.push('<path d="M ' + esc(g.X(Math.cos(a0))) + ' ' + esc(g.Y(Math.sin(a0))) +
             //' A ' + esc(g.sc) + ' ' + esc(g.sc) + ' 0 0 ' + sweep + ' ' +
             //esc(g.X(Math.cos(a1))) + ' ' + esc(g.Y(Math.sin(a1))) +
             //'" fill="none" stroke="' + ARC + '" stroke-width="2"/>');
    //}

    // ghost of the previous step
    if (prev && opts.showGhost !== false) {
      o.push(arrowSvg(g, prev[0], GHOST, 1.5, true));
      o.push(arrowSvg(g, prev[1], GHOST, 1.5, true));
    }

    // sum construction: for a mixer, z0' = a*z0 + b*z1, drawn tip-to-tail.
    // The resultant lands exactly on the new |0> arrowhead.
    if (prev && opts.showSum !== false && opts.prevMatrix && CL.interferes(opts.prevMatrix)) {
      var M = opts.prevMatrix;
      var A = K.mul(M[0][0], prev[0]);
      var B = K.mul(M[0][1], prev[1]);
      o.push(segSvg(g, K.C(0), A, COL0, true));
      o.push(segSvg(g, A, K.add(A, B), COL1, true));
    }

    // dotted extension to the unit circle separates phase from magnitude
    //[[s[0], COL0], [s[1], COL1]].forEach(function (p) {
      //var z = p[0], r = K.abs(z);
      //if (r > K.EPS && r < 1 - 1e-6) o.push(segSvg(g, z, K.scale(z, 1 / r), p[1], true));
    //});

    // amplitudes. A vanished amplitude is a hollow dot, never a fake arrow.
    // |1> is drawn slightly thinner so it does not completely hide |0>
    // when the two coincide.
    o.push(amplitude(g, s[0], COL0, 2.4));
    o.push(amplitude(g, s[1], COL1, 1.8));

    o.push(labels(g, s));

    o.push('<text x="' + (size - 4) + '" y="' + (g.cy - 5) +
           '" text-anchor="end" font-family="Arial" font-size="10" fill="#888">Re</text>');
    o.push('<text x="' + (g.cx + 5) + '" y="12" font-family="Arial" font-size="10" fill="#888">Im</text>');
    o.push("</svg>");
    return o.join("");
  }

  function amplitude(g, z, color, width) {
    if (K.isZero(z)) {
      return '<circle cx="' + g.cx + '" cy="' + g.cy +
             '" r="5" fill="none" stroke="' + color + '" stroke-width="1.5"/>';
    }
    return arrowSvg(g, z, color, width, false);
  }

  // Labels are nudged apart when the two arrowheads nearly coincide,
  // otherwise "|0>" and "|1>" print on top of each other.
  function labels(g, s) {
    var items = [];
    if (!K.isZero(s[0])) items.push({ z: s[0], col: COL0, t: "|0\u27E9", off: 0 });
    if (!K.isZero(s[1])) items.push({ z: s[1], col: COL1, t: "|1\u27E9", off: 0 });

    if (items.length === 2) {
      var d = Math.hypot(g.X(items[0].z.re) - g.X(items[1].z.re),
                         g.Y(items[0].z.im) - g.Y(items[1].z.im));
      if (d < 26) { items[0].off = -11; items[1].off = 11; }
    }

    return items.map(function (L) {
      var lx = g.X(L.z.re) + (L.z.re >= 0 ? 7 : -27);
      var ly = g.Y(L.z.im) + (L.z.im >= 0 ? -7 : 15) + L.off;
      return '<text x="' + esc(lx) + '" y="' + esc(ly) +
             '" font-family="Arial" font-size="12" fill="' + L.col + '">' + L.t + '</text>';
    }).join("");
  }

  return { render: render, COL0: COL0, COL1: COL1 };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AQ.argand;
