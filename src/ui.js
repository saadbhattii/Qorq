// ui.js -- DOM wiring. The ONLY file that touches the document.
//
// Everything above this file is a pure function, so if something looks wrong
// on screen the first question is always: does `node tests/run.js` pass?
//   * tests pass, screen wrong  -> bug is in here
//   * tests fail                -> bug is in the module the test names
//
// Debugging: open index.html directly in a browser. No build step, no
// Streamlit. Real filenames and line numbers in devtools. `window.AQ` is
// exposed, so you can poke at AQ.state.fold(...) in the console.

var AQ = AQ || {};

AQ.ui = (function () {
  "use strict";

  var K = AQ.complex, G = AQ.gates, CL = AQ.classify, DS = AQ.describe;
  var ST = AQ.state, CIRC = AQ.circuit, ARG = AQ.argand, BLO = AQ.bloch;

  // ---------------- app state ----------------
  // The three lines below are the entire model. Everything on screen is
  // derived from them; nothing else is stored.
  var initial = ST.ket0();
  var circuit = [];
  var viewIdx = 0;          // number of gates applied in the current view

  var drag = null;          // {g, from, x0, y0, moved}
  var hoverGate = null;     // palette tile under the cursor, for the description panel

  function $(id) { return document.getElementById(id); }
  function angleValue() {
    var v = parseFloat($("angle").value);
    return isFinite(v) ? v : 90;
  }
  function entryFor(id) {
    return G.isParam(id) ? { g: id, p: angleValue() } : { g: id };
  }

  // ---------------- toolbox ----------------
  function buildToolbox() {
    function tile(id) {
      var d = G.def(id);
      return '<span class="tile' + (d.param ? " wide" : "") + '" data-g="' + id + '" ' +
             'title="' + d.name + '">' + d.label + "</span>";
    }
    $("toolFixed").innerHTML = G.ROW_FIXED.map(tile).join("");
    $("toolParam").innerHTML = G.ROW_PARAM.map(tile).join("");

    document.querySelectorAll(".tile").forEach(function (el) {
      var id = el.dataset.g;
      el.addEventListener("pointerdown", function (ev) { startDrag(ev, id, null); });
      // Hover shows a TEXT description only. The plot never changes on hover:
      // that was tried and it was jittery and confusing.
      el.addEventListener("mouseenter", function () { hoverGate = id; renderDescription(); });
      el.addEventListener("mouseleave", function () { hoverGate = null; renderDescription(); });
    });
  }

  // ---------------- wire ----------------
  function buildWire() {
    var h = ['<span class="ket">|\u03C8\u2080\u27E9</span>'];
    h.push('<span class="drop" data-i="0"></span>');
    for (var i = 0; i < circuit.length; i++) {
      var e = circuit[i], d = G.def(e.g);
      h.push('<span class="slot' + (i === viewIdx - 1 ? " sel" : "") +
             (i >= viewIdx ? " dim" : "") + '" data-idx="' + i + '">' + d.label +
             (d.param ? '<span class="ang">' + e.p + "\u00B0</span>" : "") + "</span>");
      h.push('<span class="drop" data-i="' + (i + 1) + '"></span>');
    }
    h.push('<span class="hint">drop gates here</span>');
    $("wire").innerHTML = h.join("");

    $("wire").querySelectorAll(".slot").forEach(function (el) {
      var idx = +el.dataset.idx;
      el.addEventListener("pointerdown", function (ev) { startDrag(ev, circuit[idx].g, idx); });
    });
  }

  // ---------------- drag and drop ----------------
  function startDrag(ev, gateId, fromIdx) {
    ev.preventDefault();
    drag = { g: gateId, from: fromIdx, x0: ev.clientX, y0: ev.clientY, moved: false };
    var f = $("floater");
    f.textContent = G.def(gateId).label;
    f.style.display = "block";
    positionFloater(ev.clientX, ev.clientY);
  }

  function positionFloater(x, y) {
    var f = $("floater");
    f.style.left = (x - 17) + "px";
    f.style.top = (y - 14) + "px";
  }

  function dropIndexAt(x, y) {
    var r = $("wire").getBoundingClientRect();
    if (y < r.top - 24 || y > r.bottom + 24) return null;
    var slots = $("wire").querySelectorAll(".slot");
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i].getBoundingClientRect();
      if (x < s.left + s.width / 2) return i;
    }
    return circuit.length;
  }

  function onPointerMove(ev) {
    if (!drag) return;
    if (Math.abs(ev.clientX - drag.x0) > 4 || Math.abs(ev.clientY - drag.y0) > 4) {
      drag.moved = true;
    }
    positionFloater(ev.clientX, ev.clientY);
    var idx = dropIndexAt(ev.clientX, ev.clientY);
    $("wire").querySelectorAll(".drop").forEach(function (d) {
      d.classList.toggle("on", idx !== null && +d.dataset.i === idx);
    });
  }

  function onPointerUp(ev) {
    if (!drag) return;
    var d = drag;
    drag = null;
    $("floater").style.display = "none";

    if (!d.moved) {
      // A click, not a drag.
      if (d.from === null) {
        circuit = CIRC.insert(circuit, viewIdx, entryFor(d.g));
        viewIdx++;
      } else {
        viewIdx = d.from + 1;          // click a placed gate to scrub to it
      }
      render();
      return;
    }

    var idx = dropIndexAt(ev.clientX, ev.clientY);
    if (idx === null) {
      if (d.from !== null) circuit = CIRC.remove(circuit, d.from);   // dragged off = delete
    } else if (d.from === null) {
      circuit = CIRC.insert(circuit, idx, entryFor(d.g));
      viewIdx = Math.max(viewIdx, idx + 1);
    } else {
      circuit = CIRC.move(circuit, d.from, idx);
    }
    viewIdx = Math.min(viewIdx, circuit.length);
    render();
  }

  // ---------------- controls ----------------
  function undo() {
    if (!circuit.length) return;
    circuit = CIRC.remove(circuit, circuit.length - 1);
    viewIdx = Math.min(viewIdx, circuit.length);
    render();
  }
  function clearAll() { circuit = []; viewIdx = 0; render(); }
  function step(delta) {
    viewIdx = Math.max(0, Math.min(circuit.length, viewIdx + delta));
    render();
  }
  function preset(a0, p0, p1) {
    $("a0").value = a0; $("p0").value = p0; $("p1").value = p1;
    setInitial();
  }
  function setInitial() {
    var a0 = parseFloat($("a0").value); if (!isFinite(a0)) a0 = 1;
    initial = ST.fromPolar(a0, parseFloat($("p0").value) || 0, parseFloat($("p1").value) || 0);
    $("a0").value = Math.max(0, Math.min(1, a0));
    render();
  }
  function loadCode() {
    var res = CIRC.decode($("code").value);
    if (!res.ok) { $("codeErr").textContent = res.error; return; }
    $("codeErr").textContent = "";
    circuit = res.circuit;
    viewIdx = circuit.length;
    render();
  }
  function showSvg() {
    $("svgsrc").value = ARG.render(ST.fold(initial, circuit, viewIdx), { size: 420 });
    $("overlay").style.display = "block";
    $("svgsrc").select();
  }
  function closeOverlay() { $("overlay").style.display = "none"; }

  // ---------------- rendering ----------------
  function fmtDeg(rad) { return (rad * 180 / Math.PI).toFixed(2) + "\u00B0"; }

  function renderPlots() {
    var s = ST.fold(initial, circuit, viewIdx);
    var prev = viewIdx > 0 ? ST.fold(initial, circuit, viewIdx - 1) : null;
    var prevM = viewIdx > 0 ? G.matrixOf(circuit[viewIdx - 1]) : null;

    $("argand").innerHTML = ARG.render(s, {
      size: 420,
      prev: prev,
      prevMatrix: prevM,
      showGhost: $("optGhost").checked,
      showSum: $("optSum").checked,
      showRing: $("optRing").checked,
      gaugeFix: $("optGauge").checked
    });
    $("bloch").innerHTML = BLO.render(s, { size: 280 });
  }

  function renderReadout() {
    var raw = ST.fold(initial, circuit, viewIdx);
    var s = $("optGauge").checked ? ST.gaugeFix(raw) : raw;
    var a0 = K.abs(s[0]), a1 = K.abs(s[1]);
    var dt = ST.deltaTheta(s);
    var v = ST.bloch(raw);   // gauge-independent by construction

    var rows = [
      ["|z0|&sup2;", (a0 * a0).toFixed(6)],
      ["|z1|&sup2;", (a1 * a1).toFixed(6)],
      ["arg z0", a0 < K.EPS ? "&mdash;" : fmtDeg(K.arg(s[0]))],
      ["arg z1", a1 < K.EPS ? "&mdash;" : fmtDeg(K.arg(s[1]))],
      ["&Delta;&theta;", dt === null ? "&mdash;" : fmtDeg(dt)],
      ["norm", ST.norm(raw).toFixed(12)],
      ["bloch x", v.x.toFixed(4)],
      ["bloch y", v.y.toFixed(4)],
      ["bloch z", v.z.toFixed(4)]
    ];
    $("readout").innerHTML = rows.map(function (r) {
      return '<tr><td class="k">' + r[0] + "</td><td>" + r[1] + "</td></tr>";
    }).join("");

    function term(z) {
      var m = K.abs(z);
      if (m < K.EPS) return null;
      var ph = K.arg(z);
      return Math.abs(ph) < 1e-9 ? m.toFixed(4)
        : m.toFixed(4) + "\u00B7e^(i" + fmtDeg(ph) + ")";
    }
    var t0 = term(s[0]), t1 = term(s[1]), parts = [];
    if (t0) parts.push(t0 + "|0\u27E9");
    if (t1) parts.push(t1 + "|1\u27E9");
    $("psi").textContent = "|\u03C8\u27E9 = " + (parts.length ? parts.join("  +  ") : "0");

    $("stepinfo").textContent = viewIdx + " / " + circuit.length;
    $("code").value = CIRC.encode(circuit);
  }

  // The description panel shows the hovered toolbox gate if there is one,
  // otherwise the last gate actually applied.
  function renderDescription() {
    var box = $("desc");
    var d, heading;

    if (hoverGate) {
      d = DS.ofGate(hoverGate, angleValue());
      heading = d.label + " \u2014 " + d.name;
    } else if (viewIdx > 0) {
      var e = circuit[viewIdx - 1];
      d = DS.of(G.matrixOf(e));
      d.label = G.labelOf(e);
      heading = "applied: " + d.label;
    } else {
      box.innerHTML = '<div class="dhead">no gate applied</div>' +
        '<div class="dsum">Drag a gate onto the wire, or click one in the toolbox. ' +
        'Hover a gate to read what it does.</div>';
      return;
    }

    box.innerHTML =
      '<div class="dhead">' + heading + ' <span class="cat cat-' +
      d.kind.replace(/[^a-z]/g, "") + '">' + d.kind + "</span></div>" +
      '<div class="dsum">' + d.summary + "</div>" +
      (d.lines.length ? '<div class="dmath">' + d.lines.join("<br>") + "</div>" : "");
  }

  function render() {
    buildWire();
    renderPlots();
    renderReadout();
    renderDescription();
  }

  // ---------------- boot ----------------
  function init() {
    buildToolbox();

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);

    $("btnUndo").onclick = undo;
    $("btnClear").onclick = clearAll;
    $("btnPrev").onclick = function () { step(-1); };
    $("btnNext").onclick = function () { step(1); };
    $("btnSet").onclick = setInitial;
    $("btnSvg").onclick = showSvg;
    $("btnClose").onclick = closeOverlay;
    $("code").onchange = loadCode;
    ["optGauge", "optGhost", "optSum", "optRing"].forEach(function (id) {
      $(id).onchange = render;
    });
    $("angle").onchange = renderDescription;
    document.querySelectorAll("[data-preset]").forEach(function (b) {
      b.onclick = function () {
        var p = b.dataset.preset.split(",");
        preset(parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]));
      };
    });

    var t = AQ.selftest.run();
    $("selftest").className = t.ok ? "ok" : "bad";
    $("selftest").textContent = t.ok
      ? "self test OK \u2014 " + t.total + " checks (" + t.counts.unitary +
        " unitarity, " + t.counts.identities + " identities, " + t.counts.classes +
        " classifications, " + t.counts.bloch + " bloch, " + t.counts.misc + " state)"
      : "SELF TEST FAILED \u2014 " + t.fails.join("; ");

    render();
  }

  return { init: init, render: render,
           debug: function () { return { initial: initial, circuit: circuit, viewIdx: viewIdx }; } };
})();

if (typeof document !== "undefined") {
  if (typeof window !== "undefined") window.AQ = AQ;   // for console poking
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", AQ.ui.init);
  } else {
    AQ.ui.init();
  }
}
