// selftest.js -- the numerics are checked, not asserted.
//
// This exact suite runs in TWO places:
//   * in the browser, on every page load, printing a line in the footer
//   * in node, via `node tests/run.js`, which exits non-zero on failure
//
// One source of truth, so the badge in the app cannot claim something the
// CI does not check. If the footer line ever goes red, do not trust the plot.

var AQ = AQ || {};

AQ.selftest = (function () {
  "use strict";

  var K = AQ.complex, G = AQ.gates, CL = AQ.classify, ST = AQ.state, BL = AQ.bloch;
  var C = K.C;

  function run() {
    var fails = [];
    var counts = { unitary: 0, identities: 0, classes: 0, bloch: 0, misc: 0 };

    function check(group, name, cond) {
      counts[group]++;
      if (!cond) fails.push(name);
    }

    // ---- 1. every gate is unitary ----
    G.ids().forEach(function (id) {
      var M = G.isParam(id) ? G.def(id).m(0.7) : G.def(id).m();
      check("unitary", id + " unitary", G.matEq(G.matMul(M, G.matDag(M)), G.identity()));
    });

    // ---- 2. algebraic identities between gates ----
    var g = function (id, t) { return G.isParam(id) ? G.def(id).m(t) : G.def(id).m(); };
    var mul = G.matMul, eq = G.matEq, I = G.identity();
    var negI = [[C(-1), C(0)], [C(0), C(-1)]];
    var PI = Math.PI;

    var ids = [
      ["X^2 = I", mul(g("X"), g("X")), I],
      ["Y^2 = I", mul(g("Y"), g("Y")), I],
      ["Z^2 = I", mul(g("Z"), g("Z")), I],
      ["H^2 = I", mul(g("H"), g("H")), I],
      ["S^2 = Z", mul(g("S"), g("S")), g("Z")],
      ["T^2 = S", mul(g("T"), g("T")), g("S")],
      ["sqrtX^2 = X", mul(g("SX"), g("SX")), g("X")],
      ["sqrtY^2 = Y", mul(g("SY"), g("SY")), g("Y")],
      ["S S+ = I", mul(g("S"), g("Sd")), I],
      ["T T+ = I", mul(g("T"), g("Td")), I],
      ["HZH = X", mul(mul(g("H"), g("Z")), g("H")), g("X")],
      ["HXH = Z", mul(mul(g("H"), g("X")), g("H")), g("Z")],
      ["i XZ = Y", G.matScale(mul(g("X"), g("Z")), C(0, 1)), g("Y")],
      ["Rz(pi)^2 = -I", mul(g("Rz", PI), g("Rz", PI)), negI],
      ["Rx(pi)^2 = -I", mul(g("Rx", PI), g("Rx", PI)), negI],
      ["Ry(pi)^2 = -I", mul(g("Ry", PI), g("Ry", PI)), negI],
      ["Rz(0) = I", g("Rz", 0), I],
      ["P(pi) = Z", g("P", PI), g("Z")],
      ["P(pi/2) = S", g("P", PI / 2), g("S")]
    ];
    ids.forEach(function (t) { check("identities", t[0], eq(t[1], t[2])); });

    // ---- 3. classification ----
    var classes = [
      ["X", CL.MOVER], ["Y", CL.MOVER_PHASE], ["Z", CL.ROTATOR], ["H", CL.MIXER],
      ["S", CL.ROTATOR], ["Sd", CL.ROTATOR], ["T", CL.ROTATOR], ["Td", CL.ROTATOR],
      ["SX", CL.MIXER], ["SY", CL.MIXER], ["I", CL.IDENTITY]
    ];
    classes.forEach(function (t) {
      check("classes", "class " + t[0], CL.of(g(t[0])) === t[1]);
    });

    // Rx is a mixer for every angle EXCEPT the two degenerate ones. This is
    // the claim the whole taxonomy rests on, so it is checked explicitly.
    check("classes", "class Rx(0) = identity", CL.of(g("Rx", 0)) === CL.IDENTITY);
    check("classes", "class Rx(pi) = mover", CL.of(g("Rx", PI)) === CL.MOVER);
    check("classes", "class Rx(1.0) = mixer", CL.of(g("Rx", 1.0)) === CL.MIXER);
    check("classes", "class Rz(pi/3) = rotator", CL.of(g("Rz", PI / 3)) === CL.ROTATOR);
    // Global phase must not change the category.
    check("classes", "class -X = mover", CL.of(G.matScale(g("X"), C(-1))) === CL.MOVER);
    check("classes", "class e^i I = identity",
      CL.of(G.matScale(I, K.expi(1.3))) === CL.IDENTITY);

    // ---- 4. Bloch vector, standard physics convention ----
    var r2 = Math.SQRT1_2;
    var blochCases = [
      ["|0>", [C(1), C(0)], 0, 0, 1],
      ["|1>", [C(0), C(1)], 0, 0, -1],
      ["|+>", [C(r2), C(r2)], 1, 0, 0],
      ["|->", [C(r2), C(-r2)], -1, 0, 0],
      ["|i>", [C(r2), C(0, r2)], 0, 1, 0],
      ["|-i>", [C(r2), C(0, -r2)], 0, -1, 0]
    ];
    blochCases.forEach(function (t) {
      var v = ST.bloch(t[1]);
      var ok = Math.abs(v.x - t[2]) < 1e-10 &&
               Math.abs(v.y - t[3]) < 1e-10 &&
               Math.abs(v.z - t[4]) < 1e-10;
      check("bloch", "bloch " + t[0], ok);
    });

    // Bloch vector is invariant under global phase. This is the whole reason
    // it earns a panel next to the Argand plot.
    var base = [C(0.6), C(0.8)];
    var phased = [K.mul(base[0], K.expi(0.9)), K.mul(base[1], K.expi(0.9))];
    var b1 = ST.bloch(base), b2 = ST.bloch(phased);
    check("bloch", "bloch invariant under global phase",
      Math.abs(b1.x - b2.x) < 1e-10 && Math.abs(b1.y - b2.y) < 1e-10 &&
      Math.abs(b1.z - b2.z) < 1e-10);

    // Pure states sit on the surface.
    check("bloch", "pure state has |r| = 1",
      Math.abs(Math.hypot(b1.x, b1.y, b1.z) - 1) < 1e-10);

    // Projection sanity: |0> straight up, |1> straight down, |i> to the right.
    if (BL) {
      var pUp = BL.project(ST.bloch([C(1), C(0)]), 100);
      check("bloch", "project |0> is straight up",
        Math.abs(pUp.dx) < 1e-9 && pUp.dy < -50);
      var pRight = BL.project(ST.bloch([C(r2), C(0, r2)]), 100);
      check("bloch", "project |i> is to the right",
        pRight.dx > 50 && Math.abs(pRight.dy) < 1e-9);
      // Depth cues must agree about which sign is nearer.
      check("bloch", "depth cues agree",
        BL.dotRadius(1) > BL.dotRadius(-1) &&
        BL.stemFrontOpacity(1) > BL.stemFrontOpacity(-1));
    }

    // ---- 5. state mechanics ----
    // Norm is preserved through a long random-ish circuit.
    var circ = [{ g: "H" }, { g: "T" }, { g: "SX" }, { g: "Rz", p: 37 },
                { g: "Y" }, { g: "Ry", p: 123 }, { g: "S" }, { g: "H" }];
    var s = ST.fold([C(1), C(0)], circ);
    check("misc", "norm preserved", Math.abs(ST.norm(s) - 1) < 1e-12);

    // Gauge fixing changes neither probabilities nor relative phase.
    var gf = ST.gaugeFix(s);
    check("misc", "gauge fix preserves |z0|",
      Math.abs(K.abs(gf[0]) - K.abs(s[0])) < 1e-12);
    check("misc", "gauge fix preserves delta theta",
      Math.abs(ST.deltaTheta(gf) - ST.deltaTheta(s)) < 1e-10);
    check("misc", "gauge fix makes z0 real positive",
      gf[0].re > 0 && Math.abs(gf[0].im) < 1e-12);

    // deltaTheta refuses to invent a phase for a vanished amplitude.
    check("misc", "delta theta null on |0>", ST.deltaTheta([C(1), C(0)]) === null);

    // H twice returns |0>; this is the interference demo in the README.
    var back = ST.fold([C(1), C(0)], [{ g: "H" }, { g: "H" }]);
    check("misc", "HH|0> = |0>", K.eq(back[0], C(1)) && K.isZero(back[1]));

    // sqrt(X) twice equals X on a state, and the halfway point is genuinely mixed.
    var half = ST.fold([C(1), C(0)], [{ g: "SX" }]);
    check("misc", "sqrtX halfway is mixed",
      Math.abs(K.abs(half[0]) - r2) < 1e-10 && Math.abs(K.abs(half[1]) - r2) < 1e-10);

    // Circuit round-trips through its text code.
    if (AQ.circuit) {
      var code = AQ.circuit.encode(circ);
      var back2 = AQ.circuit.decode(code);
      check("misc", "circuit code round-trips",
        back2.ok && AQ.circuit.encode(back2.circuit) === code);
      check("misc", "circuit code rejects junk", !AQ.circuit.decode("H,NOPE").ok);
    }

    var total = counts.unitary + counts.identities + counts.classes +
                counts.bloch + counts.misc;
    return { ok: fails.length === 0, fails: fails, total: total, counts: counts };
  }

  return { run: run };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AQ.selftest;
