// circuit.js -- the circuit is a plain array of entries: [{g:"H"}, {g:"Rx",p:90}]
//
// Serialized as a comma-separated code, e.g. "H,S,Rx:90". A Streamlit
// component runs in a sandboxed iframe and cannot write the parent address
// bar, so this text code takes the place of Quirk's URL-encoded circuits.

var AQ = AQ || {};

AQ.circuit = (function () {
  "use strict";

  var G = AQ.gates;

  function encode(circuit) {
    return circuit.map(function (e) {
      return G.isParam(e.g) ? e.g + ":" + e.p : e.g;
    }).join(",");
  }

  // Returns {ok, circuit, error}. Never throws: this parses user input.
  function decode(text) {
    var out = [];
    text = (text || "").trim();
    if (!text) return { ok: true, circuit: [] };

    var toks = text.split(",");
    for (var i = 0; i < toks.length; i++) {
      var tok = toks[i].trim();
      if (!tok) continue;
      var parts = tok.split(":");
      var id = parts[0];
      if (!G.has(id)) return { ok: false, circuit: [], error: "unknown gate: " + id };
      if (G.isParam(id)) {
        var v = parseFloat(parts[1]);
        if (!isFinite(v)) return { ok: false, circuit: [], error: id + " needs an angle" };
        out.push({ g: id, p: v });
      } else {
        if (parts.length > 1) return { ok: false, circuit: [], error: id + " takes no angle" };
        out.push({ g: id });
      }
    }
    return { ok: true, circuit: out };
  }

  // Immutable edits. Each returns a new array; the caller replaces its
  // reference. Keeps the "state is a fold over the circuit" rule honest.
  function insert(circuit, index, entry) {
    var out = circuit.slice();
    out.splice(index, 0, entry);
    return out;
  }
  function remove(circuit, index) {
    var out = circuit.slice();
    out.splice(index, 1);
    return out;
  }
  function move(circuit, from, to) {
    var out = circuit.slice();
    var e = out.splice(from, 1)[0];
    if (to > from) to--;
    out.splice(to, 0, e);
    return out;
  }

  return { encode: encode, decode: decode, insert: insert, remove: remove, move: move };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AQ.circuit;
