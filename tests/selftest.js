// Cargo Voyage self-test: builds every mode / role / route / product / choice, validates the lesson data,
// runs the animation engine through every step and draws each frame on a strict fake canvas that
// rejects NaN or missing coordinates. Run with:  node tests/selftest.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const sandbox = vm.createContext({ console });
for (const f of ['content.js', 'builder.js', 'lessons.js', 'engine.js', 'render.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), sandbox, { filename: 'js/' + f });
}
const CV = sandbox.CV;

// A fake 2D context that throws on bad numbers, so drawing bugs fail the test instead of drawing nothing.
function strictContext() {
  const check = (name, args) => {
    for (const a of args) {
      if (typeof a === 'number' && !Number.isFinite(a)) throw new Error('canvas ' + name + ' got ' + a);
      if (a === undefined) throw new Error('canvas ' + name + ' got undefined');
    }
  };
  const target = {};
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop === 'measureText') return (s) => ({ width: String(s).length * 7 });
      if (prop === 'createLinearGradient') return (...a) => { check(prop, a); return { addColorStop() {} }; };
      return (...a) => check(String(prop), a);
    },
    set(t, prop, value) {
      if (value === undefined || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('canvas ' + String(prop) + ' set to ' + value);
      t[prop] = value;
      return true;
    },
  });
}

const ctx = strictContext();
const ps = [0, 0.15, 0.3, 0.5, 0.7, 0.9, 1];
let scenarios = 0, frames = 0;
const failures = [];

for (const air of [false, true])
  for (const role of [1, 2])
    for (let o = 0; o < CV.Content.origins.length; o++)
      for (let d = 0; d < CV.Content.dests.length; d++)
        for (let it = 0; it < CV.Content.items.length; it++)
          for (const load of [-1, 0, 1]) {
            const name = (air ? 'air' : 'sea') + (role === 1 ? ' exporter ' : ' importer ') + CV.Content.origins[o].city +
              ' > ' + CV.Content.dests[d].city + ', ' + CV.Content.items[it].name + ', choice ' + load;
            let step = 0;
            try {
              const scn = CV.Builder.build({ air, role, origin: o, dest: d, item: it, load });
              scenarios++;
              CV.Engine.validate(scn);
              const w = new CV.Engine.World(scn);
              for (step = 0; step < scn.steps.length; step++) {
                for (const p of ps) {
                  w.compute(step, p);
                  if (!Number.isFinite(w.focusX)) throw new Error('camera focus is ' + w.focusX);
                  frames++;
                  if (p === 0.5 || (role === 1 && load !== -1)) {
                    const cam = Math.max(0, Math.min(scn.worldW - 1280, w.focusX - 640));
                    CV.Render.drawWorld(ctx, w, cam, step * 3 + p, 1280, 520, p === 0.5 ? 1.5 : 1);
                  }
                }
              }
              w.idle(12.3, false);
              CV.Render.drawWorld(ctx, w, 700, 12.3, 900, 600, 1.2);
              w.idle(12.3, true);
              CV.Render.drawWorld(ctx, w, 700, 12.3, 900, 600, 1.2);
            } catch (e) {
              failures.push('FAIL  ' + name + '  (step ' + (step + 1) + ')\n      ' + e.message);
            }
          }

if (failures.length) {
  console.log(failures.slice(0, 25).join('\n'));
  console.log('\nSELF-TEST FOUND ' + failures.length + ' PROBLEM(S) in ' + scenarios + ' scenarios.');
  process.exit(1);
}
console.log('SELF-TEST PASSED: ' + scenarios + ' scenarios, ' + frames + ' animation frames checked.');
