// describe.js -- plain-language description of what a gate does, computed
// from its matrix.
//
// Deliberately NOT a lookup table of prose. A hardcoded gloss like
// "rotators only change the phase of |1>" is true for Z, S, T and P but
// FALSE for Rz, which splits the phase symmetrically and moves both
// amplitudes. Deriving the text from the matrix means the description
// cannot disagree with the plot.

var AQ = AQ || {};

AQ.describe = (function () {
  "use strict";

  var K = AQ.complex;
  var CL = AQ.classify;

  function deg(rad) {
    var d = K.wrap(rad) * 180 / Math.PI;
    if (Math.abs(d) < 1e-9) d = 0;
    return (d >= 0 ? "+" : "") + d.toFixed(1) + "\u00B0";
  }

  // Format a complex coefficient compactly: 0.707, -i, (0.500+0.500i)
  function coeff(z) {
    var e = 1e-10;
    var r = Math.abs(z.re) < e ? 0 : z.re;
    var i = Math.abs(z.im) < e ? 0 : z.im;
    if (i === 0) return r.toFixed(3);
    if (r === 0) {
      if (Math.abs(i - 1) < e) return "i";
      if (Math.abs(i + 1) < e) return "-i";
      return i.toFixed(3) + "i";
    }
    return "(" + r.toFixed(3) + (i < 0 ? "-" : "+") + Math.abs(i).toFixed(3) + "i)";
  }

  // Join a trailing term with a proper sign: "+ 0.707 z1" or "- 0.707 z1",
  // never "+ -0.707 z1".
  function tail(z, varName) {
    var s = coeff(z);
    if (s.charAt(0) === "-") return " - " + s.slice(1) + " " + varName;
    return " + " + s + " " + varName;
  }

  // A one-line summary plus zero or more detail lines.
  function of(M) {
    var kind = CL.of(M);
    var a = M[0][0], b = M[0][1], c = M[1][0], d = M[1][1];

    if (kind === CL.IDENTITY) {
      return {
        kind: kind,
        summary: "Does nothing. Both arrows stay exactly where they are.",
        lines: []
      };
    }

    if (kind === CL.ROTATOR) {
      return {
        kind: kind,
        summary: "Spins the arrows in place. Lengths unchanged, so the " +
                 "measurement probabilities do not change and no interference occurs.",
        lines: [
          "arg z0 " + deg(K.arg(a)),
          "arg z1 " + deg(K.arg(d))
        ]
      };
    }

    if (kind === CL.MOVER) {
      return {
        kind: kind,
        summary: "Swaps the two amplitudes. The arrows exchange labels but " +
                 "neither changes length or direction, so no new complex numbers appear.",
        lines: ["z0' = z1", "z1' = z0"]
      };
    }

    if (kind === CL.MOVER_PHASE) {
      return {
        kind: kind,
        summary: "Swaps the two amplitudes and rotates them. A swap and a " +
                 "spin at once; still no summing, so still no interference.",
        lines: [
          "z0' = " + coeff(b) + " z1",
          "z1' = " + coeff(c) + " z0"
        ]
      };
    }

    return {
      kind: kind,
      summary: "Adds the arrows together. Each new amplitude is a sum of both " +
               "old ones, which is the only way interference can happen.",
      lines: [
        "z0' = " + coeff(a) + " z0" + tail(b, "z1"),
        "z1' = " + coeff(c) + " z0" + tail(d, "z1")
      ]
    };
  }

  // Description for a gate id, using a supplied angle for parameterized gates.
  function ofGate(id, angleDeg) {
    var G = AQ.gates;
    if (!G.has(id)) return null;
    var entry = G.isParam(id) ? { g: id, p: angleDeg } : { g: id };
    var out = of(G.matrixOf(entry));
    out.label = G.labelOf(entry);
    out.name = G.def(id).name;
    return out;
  }

  return { of: of, ofGate: ofGate, coeff: coeff, deg: deg };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AQ.describe;
