// complex.js -- complex arithmetic on {re, im} pairs.
// Pure. No DOM, no dependencies. IEEE float64, same as numpy.

var AQ = AQ || {};

AQ.complex = (function () {
  "use strict";

  var EPS = 1e-10;

  function C(re, im) { return { re: re, im: im === undefined ? 0 : im }; }

  function add(a, b)   { return C(a.re + b.re, a.im + b.im); }
  function sub(a, b)   { return C(a.re - b.re, a.im - b.im); }
  function mul(a, b)   { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function scale(a, s) { return C(a.re * s, a.im * s); }
  function conj(a)     { return C(a.re, -a.im); }
  function abs(a)      { return Math.hypot(a.re, a.im); }
  function arg(a)      { return Math.atan2(a.im, a.re); }
  function expi(t)     { return C(Math.cos(t), Math.sin(t)); }

  function isZero(a)   { return abs(a) < EPS; }
  function eq(a, b, tol) { return abs(sub(a, b)) <= (tol === undefined ? EPS : tol); }

  // Wrap an angle into (-pi, pi].
  function wrap(t) {
    while (t <= -Math.PI) t += 2 * Math.PI;
    while (t > Math.PI) t -= 2 * Math.PI;
    return t;
  }

  return {
    EPS: EPS,
    C: C, add: add, sub: sub, mul: mul, scale: scale, conj: conj,
    abs: abs, arg: arg, expi: expi, isZero: isZero, eq: eq, wrap: wrap
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AQ.complex;
