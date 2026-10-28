/* Cargo Voyage - sound effects, synthesized in the browser (no audio files).
   Each sound is a list of [wave, frequency Hz, milliseconds]: 0 sine, 1 square, 2 saw, 3 noise, 4 horn, 9 silence. */
(function (CV) {
  'use strict';
  const SPECS = {
    click: [[0, 700, 40]],
    next: [[0, 523, 60], [0, 659, 60], [0, 784, 110]],
    back: [[0, 784, 60], [0, 523, 110]],
    good: [[0, 523, 90], [0, 659, 90], [0, 784, 90], [0, 1047, 260]],
    bad: [[1, 196, 160], [1, 147, 320]],
    ding: [[0, 1319, 70], [0, 1760, 160]],
    pop: [[0, 600, 40], [0, 900, 70]],
    whoosh: [[3, 0, 60], [0, 500, 40], [0, 700, 40], [0, 900, 50]],
    horn: [[4, 98, 900]],
    truck: [[2, 90, 150], [2, 100, 150], [2, 120, 150], [2, 140, 250]],
    beep: [[0, 1000, 110], [9, 0, 90], [0, 1000, 110], [9, 0, 90], [0, 1000, 110]],
    clunk: [[3, 0, 35], [0, 110, 120]],
    crane: [[1, 240, 90], [9, 0, 40], [1, 240, 90], [9, 0, 40], [1, 300, 120]],
    stamp: [[3, 0, 45], [0, 80, 150], [0, 60, 120]],
    train: [[3, 0, 60], [9, 0, 70], [3, 0, 60], [9, 0, 70], [3, 0, 60], [9, 0, 70], [3, 0, 60], [9, 0, 120], [4, 520, 600]],
    jet: [[3, 0, 700], [2, 160, 500]],
    fanfare: [[0, 523, 110], [0, 523, 110], [0, 523, 110], [0, 698, 320], [0, 622, 120], [0, 698, 520]],
  };
  const RATE = 22050;
  let ac = null;
  let muted = false;
  const buffers = {};

  function make(spec) {
    let total = 0;
    for (const s of spec) total += Math.floor((s[2] * RATE) / 1000);
    const buf = ac.createBuffer(1, Math.max(1, total), RATE);
    const data = buf.getChannelData(0);
    let pos = 0, seed = 7;
    for (const [wave, f, ms] of spec) {
      const n = Math.floor((ms * RATE) / 1000);
      for (let k = 0; k < n; k++) {
        const t = k / RATE;
        let v = 0;
        if (wave === 0) v = Math.sin(2 * Math.PI * f * t);
        else if (wave === 1) v = Math.sin(2 * Math.PI * f * t) >= 0 ? 0.55 : -0.55;
        else if (wave === 2) v = 0.7 * (2 * ((f * t) % 1) - 1);
        else if (wave === 3) { seed = (seed * 1103515245 + 12345) % 2147483648; v = ((seed / 2147483648) * 2 - 1) * 0.5; }
        else if (wave === 4) v = 0.45 * Math.sin(2 * Math.PI * f * t) + 0.38 * Math.sin(2 * Math.PI * f * 1.26 * t) + 0.2 * Math.sin(2 * Math.PI * f * 2 * t);
        const fade = Math.min(1, Math.min(k, n - 1 - k) / (0.008 * RATE));
        data[pos++] = v * fade * 0.28;
      }
    }
    return buf;
  }

  // Browsers only allow sound after the first tap or click, so the app calls this on every input.
  function unlock() {
    try {
      if (!ac) {
        const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        for (const k in SPECS) buffers[k] = make(SPECS[k]);
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
  }

  function play(name) {
    if (muted || !ac || !buffers[name]) return;
    try {
      const src = ac.createBufferSource();
      src.buffer = buffers[name];
      src.connect(ac.destination);
      src.start();
    } catch (e) { /* sound is optional */ }
  }

  CV.Sfx = {
    unlock,
    play,
    get muted() { return muted; },
    set muted(v) { muted = !!v; },
  };
})(globalThis.CV = globalThis.CV || {});
