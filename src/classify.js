// classify.js -- sort a unitary into mover / rotator / mixer by inspecting
// its matrix. Never hardcode a category: the whole point is that the label
// is derived from the operator, so it stays honest for gates like Rx(theta)
// whose category changes with theta.
//
//   identity      U = I up to global phase
//   rotator       diagonal: amplitudes stay in place, phases change
//   mover         anti-diagonal with equal entries: a pure swap
//   mover + phase anti-diagonal with unequal entries: swap plus phase
//   mixer         anything else: amplitudes are summed, so interference
//
// Global phase is divided out first, so -X classifies the same as X.

var AQ = AQ || {};

AQ.classify = (function () {
  "use strict";

  var K = AQ.complex;

  var IDENTITY = "identity";
  var ROTATOR = "rotator";
  var MOVER = "mover";
  var MOVER_PHASE = "mover + phase";
  var MIXER = "mixer";

  function stripGlobalPhase(M) {
    var flat = [M[0][0], M[0][1], M[1][0], M[1][1]];
    var ph = 0;
    for (var i = 0; i < 4; i++) {
      if (!K.isZero(flat[i])) { ph = K.arg(flat[i]); break; }
    }
    var u = K.expi(-ph);
    return [[K.mul(M[0][0], u), K.mul(M[0][1], u)],
            [K.mul(M[1][0], u), K.mul(M[1][1], u)]];
  }

  function of(M) {
    var N = stripGlobalPhase(M);
    var a = N[0][0], b = N[0][1], c = N[1][0], d = N[1][1];
    var isOne = function (z) { return K.abs(K.sub(z, K.C(1))) < K.EPS; };

    if (K.isZero(b) && K.isZero(c)) {
      return (isOne(a) && isOne(d)) ? IDENTITY : ROTATOR;
    }
    if (K.isZero(a) && K.isZero(d)) {
      return (isOne(b) && isOne(c)) ? MOVER : MOVER_PHASE;
    }
    return MIXER;
  }

  // Does this gate sum amplitudes together? Only mixers can create or
  // destroy interference in the computational basis.
  function interferes(M) { return of(M) === MIXER; }

  return {
    of: of, interferes: interferes, stripGlobalPhase: stripGlobalPhase,
    IDENTITY: IDENTITY, ROTATOR: ROTATOR, MOVER: MOVER,
    MOVER_PHASE: MOVER_PHASE, MIXER: MIXER
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AQ.classify;
