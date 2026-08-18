// state.js -- the qubit state [z0, z1] and everything derived from it.
//
// Design rule: the current state is never mutated in place. It is always
// recomputed by folding the gate list over the initial state. That makes
// undo, scrubbing and the ghost overlay fall out of slicing an array,
// and removes any chance of the displayed state drifting away from the
// circuit that supposedly produced it.

var AQ = AQ || {};

AQ.state = (function () {
  "use strict";

  var K = AQ.complex;
  var G = AQ.gates;

  function ket0() { return [K.C(1), K.C(0)]; }

  // Build a normalized state from |z0| and the two phases (degrees).
  function fromPolar(a0, p0deg, p1deg) {
    a0 = Math.max(0, Math.min(1, a0));
    var a1 = Math.sqrt(Math.max(0, 1 - a0 * a0));
    return [K.scale(K.expi(p0deg * Math.PI / 180), a0),
            K.scale(K.expi(p1deg * Math.PI / 180), a1)];
  }

  function apply(M, s) {
    return [K.add(K.mul(M[0][0], s[0]), K.mul(M[0][1], s[1])),
            K.add(K.mul(M[1][0], s[0]), K.mul(M[1][1], s[1]))];
  }

  // Fold the first n gates of `circuit` over `initial`.
  function fold(initial, circuit, n) {
    if (n === undefined || n > circuit.length) n = circuit.length;
    var s = [initial[0], initial[1]];
    for (var i = 0; i < n; i++) s = apply(G.matrixOf(circuit[i]), s);
    return s;
  }

  function norm(s) { return K.abs(s[0]) * K.abs(s[0]) + K.abs(s[1]) * K.abs(s[1]); }

  // Rotate so that z0 is real and positive. Global phase is unobservable,
  // so this removes a redundant degree of freedom from the picture.
  // Falls back to z1 when z0 has vanished.
  function gaugeFix(s) {
    var ref = !K.isZero(s[0]) ? s[0] : (!K.isZero(s[1]) ? s[1] : null);
    if (!ref) return [s[0], s[1]];
    var u = K.expi(-K.arg(ref));
    return [K.mul(s[0], u), K.mul(s[1], u)];
  }

  // Relative phase, wrapped to (-pi, pi]. null when either amplitude is zero,
  // because arg(0) is meaningless and reporting 0 would be a lie.
  function deltaTheta(s) {
    if (K.isZero(s[0]) || K.isZero(s[1])) return null;
    return K.wrap(K.arg(s[1]) - K.arg(s[0]));
  }

  // Bloch vector, standard physics convention:
  //   |0> -> (0,0,+1)   |1> -> (0,0,-1)
  //   |+> -> (+1,0,0)   |-> -> (-1,0,0)
  //   |i> -> (0,+1,0)   |-i> -> (0,-1,0)
  // where |i> = (|0> + i|1>)/sqrt(2).
  // Invariant under global phase, which is exactly why it is useful next
  // to the Argand plot: multiply the state by a phase and this does not move.
  function bloch(s) {
    var p = K.mul(K.conj(s[0]), s[1]);
    return {
      x: 2 * p.re,
      y: 2 * p.im,
      z: K.abs(s[0]) * K.abs(s[0]) - K.abs(s[1]) * K.abs(s[1])
    };
  }

  return {
    ket0: ket0, fromPolar: fromPolar, apply: apply, fold: fold,
    norm: norm, gaugeFix: gaugeFix, deltaTheta: deltaTheta, bloch: bloch
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AQ.state;
