"""
Qorq -- Streamlit host.

This file does almost nothing. It reads the source files in src/ and inlines
them into a single components.html block. All the logic runs client-side, so
gates apply in well under a millisecond and nothing round-trips to Python.

For development, do NOT use this. Open index.html directly in a browser --
same source files, real filenames in devtools, no Streamlit in the way.

    streamlit run app.py      # hosted version
    open index.html           # development version
    node tests/run.js         # correctness suite
"""

from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

# Dependency order. index.html lists the same files in the same order and
# tests/run.js asserts the two lists agree, so they cannot silently drift.
FILES = [
    "complex.js",
    "gates.js",
    "classify.js",
    "describe.js",
    "state.js",
    "circuit.js",
    "argand.js",
    "bloch.js",
    "selftest.js",
    "ui.js",
]

SRC = Path(__file__).parent / "src"
ROOT = Path(__file__).parent
COMPONENT_HEIGHT = 690

# The markup lives in index.html between these markers, so the browser dev
# entry point and the Streamlit host cannot show different DOM.
BODY_START = "<!-- BODY:START -->"
BODY_END = "<!-- BODY:END -->"


def read_body() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    start = html.index(BODY_START) + len(BODY_START)
    end = html.index(BODY_END)
    return html[start:end]


def build_component() -> str:
    """Concatenate css + body + scripts into one self-contained page fragment."""
    css = (SRC / "styles.css").read_text(encoding="utf-8")
    body = read_body()
    scripts = "\n".join(
        f"/* ==== {name} ==== */\n" + (SRC / name).read_text(encoding="utf-8")
        for name in FILES
    )
    return f"<style>\n{css}\n</style>\n{body}\n<script>\n{scripts}\n</script>"


st.set_page_config(page_title="argand-qubit", layout="wide")

# Strip Streamlit chrome so the tool fills the window without scrolling.
st.markdown(
    """
    <style>
      .block-container { padding: 0.4rem 0.8rem 0 0.8rem !important; max-width: 100% !important; }
      header[data-testid="stHeader"] { display: none; }
      div[data-testid="stDecoration"] { display: none; }
      footer { display: none; }
      #MainMenu { display: none; }
    </style>
    """,
    unsafe_allow_html=True,
)

missing = [name for name in FILES if not (SRC / name).exists()]
if missing:
    st.error("Missing source files in src/: " + ", ".join(missing))
else:
    components.html(build_component(), height=COMPONENT_HEIGHT, scrolling=False)
