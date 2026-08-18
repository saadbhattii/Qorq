// gates.js -- gate matrices as [[a,b],[c,d]] of complex numbers.
//
// These are the scientific core of the tool. Every matrix here is checked
// by selftest.js on every page load and by tests/run.js in CI.
// If you edit one, run `node tests/run.js` before you trust anything on screen.
//
// Convention: |psi> = z0|0> + z1|1>, column vector [z0, z1].
// Rotation gates use the standard exp(-i*theta*sigma/2) convention.

var AQ = AQ || {};

AQ.gates = (function () {
  "use strict";

  var K = AQ.complex;
  var C = K.C, expi = K.expi;
  var R2 = Math.SQRT1_2;

  var DEFS = {
    I:  { label: "I",  name: "Identity",
          m: function () { return [[C(1), C(0)], [C(0), C(1)]]; } },

    X:  { label: "X",  name: "Pauli-X (NOT)",
          m: function () { return [[C(0), C(1)], [C(1), C(0)]]; } },

    Y:  { label: "Y",  name: "Pauli-Y",
          m: function () { return [[C(0), C(0, -1)], [C(0, 1), C(0)]]; } },

    Z:  { label: "Z",  name: "Pauli-Z",
          m: function () { return [[C(1), C(0)], [C(0), C(-1)]]; } },

    H:  { label: "H",  name: "Hadamard",
          m: function () { return [[C(R2), C(R2)], [C(R2), C(-R2)]]; } },

    S:  { label: "S",  name: "Phase (sqrt Z)",
          m: function () { return [[C(1), C(0)], [C(0), C(0, 1)]]; } },

    Sd: { label: "S\u2020", name: "S-dagger",
          m: function () { return [[C(1), C(0)], [C(0), C(0, -1)]]; } },

    T:  { label: "T",  name: "T (4th root of Z)",
          m: function () { return [[C(1), C(0)], [C(0), expi(Math.PI / 4)]]; } },

    Td: { label: "T\u2020", name: "T-dagger",
          m: function () { return [[C(1), C(0)], [C(0), expi(-Math.PI / 4)]]; } },

    SX: { label: "\u221AX", name: "sqrt X",
          m: function () { return [[C(0.5, 0.5), C(0.5, -0.5)],
                                   [C(0.5, -0.5), C(0.5, 0.5)]]; } },

    SY: { label: "\u221AY", name: "sqrt Y",
          m: function () { return [[C(0.5, 0.5), C(-0.5, -0.5)],
                                   [C(0.5, 0.5), C(0.5, 0.5)]]; } },

    Rx: { label: "Rx", name: "X rotation", param: "angle",
          m: function (t) {
            var c = Math.cos(t / 2), s = Math.sin(t / 2);
            return [[C(c), C(0, -s)], [C(0, -s), C(c)]];
          } },

    Ry: { label: "Ry", name: "Y rotation", param: "angle",
          m: function (t) {
            var c = Math.cos(t / 2), s = Math.sin(t / 2);
            return [[C(c), C(-s)], [C(s), C(c)]];
          } },

    Rz: { label: "Rz", name: "Z rotation", param: "angle",
          m: function (t) { return [[expi(-t / 2), C(0)], [C(0), expi(t / 2)]]; } },

    P:  { label: "P",  name: "Phase shift", param: "angle",
          m: function (t) { return [[C(1), C(0)], [C(0), expi(t)]]; } }
  };

  // Toolbox layout. Order here is the order shown on screen.
  var ROW_FIXED = ["X", "Y", "Z", "H", "S", "Sd", "T", "Td", "SX", "SY", "I"];
  var ROW_PARAM = ["Rx", "Ry", "Rz", "P"];

  function has(id) { return Object.prototype.hasOwnProperty.call(DEFS, id); }
  function def(id) { return DEFS[id]; }
  function isParam(id) { return has(id) && !!DEFS[id].param; }
  function ids() { return Object.keys(DEFS); }

  // An "entry" is a placed gate: {g: "Rx", p: 90} where p is in DEGREES.
  function matrixOf(entry) {
    var d = DEFS[entry.g];
    if (!d) throw new Error("unknown gate: " + entry.g);
    return d.param ? d.m(entry.p * Math.PI / 180) : d.m();
  }

  function labelOf(entry) {
    var d = DEFS[entry.g];
    return d.param ? d.label + "(" + entry.p + "\u00B0)" : d.label;
  }

  // --- small matrix helpers, used by classify/describe/selftest ---
  function matMul(A, B) {
    var R = [[C(0), C(0)], [C(0), C(0)]];
    for (var i = 0; i < 2; i++)
      for (var j = 0; j < 2; j++)
        for (var k = 0; k < 2; k++)
          R[i][j] = K.add(R[i][j], K.mul(A[i][k], B[k][j]));
    return R;
  }
  function matDag(A) {
    return [[K.conj(A[0][0]), K.conj(A[1][0])],
            [K.conj(A[0][1]), K.conj(A[1][1])]];
  }
  function matScale(A, z) {
    return [[K.mul(A[0][0], z), K.mul(A[0][1], z)],
            [K.mul(A[1][0], z), K.mul(A[1][1], z)]];
  }
  function matEq(A, B, tol) {
    tol = tol === undefined ? 1e-10 : tol;
    for (var i = 0; i < 2; i++)
      for (var j = 0; j < 2; j++)
        if (K.abs(K.sub(A[i][j], B[i][j])) > tol) return false;
    return true;
  }
  function identity() { return [[C(1), C(0)], [C(0), C(1)]]; }

  return {
    DEFS: DEFS, ROW_FIXED: ROW_FIXED, ROW_PARAM: ROW_PARAM,
    has: has, def: def, isParam: isParam, ids: ids,
    matrixOf: matrixOf, labelOf: labelOf,
    matMul: matMul, matDag: matDag, matScale: matScale, matEq: matEq,
    identity: identity
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AQ.gates;
