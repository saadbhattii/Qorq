// bloch.js -- small 2D Bloch sphere, Quirk-style.
//
// APPROXIMATE BY DESIGN. This is a fixed oblique projection, not a real 3D
// render. Specifically:
//
//   * The two "great circle" ellipses are axis-aligned, which is not the
//     true projection of those circles (the x-axis is drawn diagonally, so
//     the real projections would be rotated ellipses). Quirk does the same
//     thing and calls it "not-quite-proper 3d" in a source comment. It reads
//     better at this size than the correct version does.
//   * There is no perspective divide. Depth is faked with dot size and by
//     redrawing the stem over the ball with depth-dependent opacity.
//
// What is NOT approximate is the Bloch vector itself (see state.bloch),
// which is exact and pinned by tests. The geometry is a sketch; the numbers
// are not.
//
// Projection: z up, y right, x toward the viewer (drawn down-left).
// Screen basis vectors, for a sphere of radius u:
//     ex = (-u/3, +u/3)     toward viewer
//     ey = ( u  ,  0  )     right
//     ez = ( 0  , -u  )     up          (SVG y is down, hence the minus)

var AQ = AQ || {};

AQ.bloch = (function () {
  "use strict";

  var ST = AQ.state;

  var SHRINK = 1 / 3;   // foreshortening of the x axis

  // Returns screen offset from the centre, in pixels.
  function project(v, u) {
    return {
      dx: -u * SHRINK * v.x + u * v.y,
      dy: u * SHRINK * v.x - u * v.z
    };
  }

  // Depth along the view direction. Larger = nearer the viewer.
  // Both depth cues below key off this one number, so they cannot disagree.
  function depth(v) { return v.x; }

  function dotRadius(d) { return 4.0 * (1 + 0.20 * d); }          // nearer = bigger
  function stemFrontOpacity(d) { return Math.max(0, Math.min(1, 0.5 + 0.5 * d)); }

  function esc(n) { return Math.round(n * 100) / 100; }

  function render(state, opts) {
    opts = opts || {};
    var size = opts.size || 200;
    var c = size / 2;
    var u = size * 0.40;
    var v = ST.bloch(state);
    var p = project(v, u);
    var px = c + p.dx, py = c + p.dy;
    var d = depth(v);

    var o = [];
    o.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
           '" viewBox="0 0 ' + size + ' ' + size + '" style="background:#fff">');

    // sphere outline and the two approximate great circles
    o.push('<circle cx="' + c + '" cy="' + c + '" r="' + esc(u) + '" fill="none" stroke="#bbb"/>');
    o.push('<ellipse cx="' + c + '" cy="' + c + '" rx="' + esc(u) + '" ry="' + esc(u * SHRINK) +
           '" fill="none" stroke="#ddd"/>');
    o.push('<ellipse cx="' + c + '" cy="' + c + '" rx="' + esc(u * SHRINK) + '" ry="' + esc(u) +
           '" fill="none" stroke="#ddd"/>');

    // axis lines through the centre
    [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }].forEach(function (a) {
      var q = project(a, u);
      o.push('<line x1="' + esc(c - q.dx) + '" y1="' + esc(c - q.dy) +
             '" x2="' + esc(c + q.dx) + '" y2="' + esc(c + q.dy) + '" stroke="#ddd"/>');
    });

    // pole labels
    o.push('<text x="' + c + '" y="' + esc(c - u - 4) +
           '" text-anchor="middle" font-family="Arial" font-size="10" fill="#888">|0\u27E9</text>');
    o.push('<text x="' + c + '" y="' + esc(c + u + 12) +
           '" text-anchor="middle" font-family="Arial" font-size="10" fill="#888">|1\u27E9</text>');

    // stem drawn thin, then the ball, then the stem again with depth-dependent
    // opacity. That lerps continuously between "stem behind ball" and "stem in
    // front of ball" without any clipping or z-ordering. Borrowed from Quirk.
    o.push('<line x1="' + c + '" y1="' + c + '" x2="' + esc(px) + '" y2="' + esc(py) +
           '" stroke="#000" stroke-width="1.2"/>');
    o.push('<circle cx="' + esc(px) + '" cy="' + esc(py) + '" r="' + esc(dotRadius(d)) +
           '" fill="#fff" stroke="#000" stroke-width="1.2"/>');
    o.push('<line x1="' + c + '" y1="' + c + '" x2="' + esc(px) + '" y2="' + esc(py) +
           '" stroke="#000" stroke-width="2" opacity="' + esc(stemFrontOpacity(d)) + '"/>');

    o.push("</svg>");
    return o.join("");
  }

  return {
    render: render, project: project, depth: depth,
    dotRadius: dotRadius, stemFrontOpacity: stemFrontOpacity, SHRINK: SHRINK
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AQ.bloch;
