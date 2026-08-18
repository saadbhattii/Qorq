<p align="center">
  <img src="assets/logo.svg" alt="Qorq logo" width="170">
</p>

<h1 align="left">
  Qorq
  <a href="https://qorq-qc.streamlit.app/" style="font-size: 0.5em; vertical-align: middle;">[live]</a>
</h1>

A drag-and-drop tool for exploring how single-qubit quantum gates transform complex statevectors visualized as arrows with a shared origin on an Argand plane.

There's no installing, configuring, or scripting required: just go to https://qorq-qc.streamlit.app, drag gates, and the output displays update in real time.

Quantum mechanics is fundamentally formulated over complex Hilbert spaces. Yet many of our most common visual and pedagogical tools translate quantum states into real-valued representations, emphasizing geometry or probabilities over the complex amplitudes themselves.

This project was created with the curiosity for a visualization in the complex hilbert space itself. The Bloch sphere is also displayed for comparison in the tool.

## User Interface

<p align="center">
  <img src="assets/ui-screenshot-01.png" alt="Qorq interface" width="900">
</p>

<p align="center">
  Qorq UI: Inspired by Quirk.
</p>

## Running it Locally

```bash
pip install -r requirements.txt
streamlit run app.py
```

## License

MIT.

## Acknowledgements

Interaction model and the Bloch depth-cue technique borrowed from [Quirk](https://algassert.com/quirk).
