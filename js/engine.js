/* Cargo Voyage - the animation engine.
   It never stores per-step positions. To show step s at progress p it rebuilds the world:
   start from the initial props, play every earlier step to its end, then play step s up to p.
   So Back, Replay or a changed decision can never leave anything in the wrong place. */
(function (CV) {
  'use strict';
  const { seg, lp } = CV.U;

  function flyAlt(f) {
    if (f < 0.1) return 0;
    if (f < 0.3) return 260 * seg(f, 0.1, 0.3);
    if (f < 0.75) return 260;
    if (f < 0.95) return 260 * (1 - seg(f, 0.75, 0.95));
    return 0;
  }

  class World {
    constructor(scn) {
      this.scn = scn;
      this.reset();
    }

    reset() {
      this.props = new Map();
      this.order = [];
      for (const p of this.scn.props) {
        const c = Object.assign({}, p);
        this.props.set(c.id, c);
        this.order.push(c);
      }
      this.boxAt = this.scn.startBox;
      this.boxMoving = false;
      this.boxLift = false;
      this.boxX = 0;
      this.boxY = 0;
      this.craneUse = {};
      this.docs = [];
      this.tags = [];
      this.hl = new Set();
      this.pulse = null;
      this.pulseF = -1;
      this.stamp = null;
      this.stampX = 0;
      this.stampY = 0;
      this.stampT = 0;
      this.scaleKg = 0;
      this.confetti = false;
      this.movingDoc = null;
      this.pendingDoc = null;
      this.focusX = 640;
    }

    get(id) {
      const m = this.props.get(id);
      if (!m) throw new Error('Unknown prop: ' + id);
      return m;
    }

    compute(s, p) {
      this.reset();
      const steps = this.scn.steps;
      for (let i = 0; i < s; i++) this.apply(steps[i], 1, false);
      this.apply(steps[s], p, true);
      const st = steps[s];
      const fp = st.focusProp ? this.props.get(st.focusProp) : null;
      if (fp) this.focusX = fp.kind === 4 ? fp.x - 150 : fp.x + 55;
      else if (st.focusDoc && this.movingDoc) this.focusX = this.movingDoc.x;
      else if (st.focusDoc && this.pendingDoc) this.focusX = this.pendingDoc.x;
      else this.focusX = st.focusX;
    }

    // Menus and the results screen: the starting world with the ship or plane cruising by.
    idle(now, results) {
      this.reset();
      if (results) { this.confetti = true; return; }
      for (const p of this.order) {
        if (p.kind === 2) { p.x = this.scn.coastA + 200 + ((now * 55) % 1500); p.moving = true; }
        if (p.kind === 3) { p.x = this.scn.coastA + 200 + ((now * 120) % 1500); p.y = 220; }
      }
    }

    apply(st, p, visual) {
      for (const a of st.acts) {
        const f = seg(p, a.t0, a.t1);
        switch (a.k) {
          case 'move':
          case 'fly': {
            const m = this.get(a.p);
            const x0 = Number.isNaN(a.x0) ? m.x : a.x0;
            m.x = lp(x0, a.x1, f);
            m.moving = f > 0 && f < 1;
            if (f > 0 && a.x1 !== x0 && m.kind !== 3) m.dir = a.x1 < x0 ? -1 : 1;
            if (a.k === 'fly') {
              m.y = flyAlt(f);
              m.ang = f > 0.1 && f < 0.3 ? -8 : f > 0.75 && f < 0.95 ? 5 : 0;
            }
            break;
          }
          case 'show': if (p >= a.t0) this.get(a.p).visible = true; break;
          case 'hide': if (p >= a.t0) this.get(a.p).visible = false; break;
          case 'cargo': if (p >= a.t0) this.get(a.p).cargo = Math.round(lp(a.n0, a.n1, f)); break;
          case 'xfer': this.transfer(a, p); break;
          case 'scale': if (visual) this.scaleKg = Math.round(a.n1 * f); break;
          default: break;
        }
        if (!visual) continue;
        switch (a.k) {
          case 'doc':
          case 'coin': {
            const x = lp(a.x0, a.x1, f);
            if (f > 0) {
              this.docs.push({ x, y: lp(a.y, a.y2, f) - a.lift * Math.sin(Math.PI * f), l: a.s, c: a.c, k: a.k === 'coin' ? 2 : 0 });
            }
            this.noteDoc(a, f, x);
            break;
          }
          case 'pulse':
            if (f > 0 && f < 1) { this.pulse = a; this.pulseF = f; }
            this.noteDoc(a, f, lp(a.x0, a.x1, f));
            break;
          case 'hop': {
            const span = a.t1 - a.t0;
            for (let i = 0; i < a.n1; i++) {
              const d0 = a.t0 + (span * 0.8 * i) / Math.max(1, a.n1 - 1);
              const h = seg(p, d0, d0 + span * 0.2);
              if (h > 0 && h < 1) {
                this.docs.push({
                  x: lp(a.x0 + (i % 4) * 12 - 18, a.x1, h),
                  y: lp(a.y, a.y2, h) - 70 * Math.sin(Math.PI * h),
                  c: a.c, k: 1,
                });
              }
            }
            break;
          }
          case 'stamp':
            if (p >= a.t0) { this.stamp = a.s; this.stampX = a.x0; this.stampY = a.y; this.stampT = f; }
            break;
          case 'tag':
            if (p >= a.t0) this.tags.push({ x: a.x0, y: a.y, t: a.s, lift: a.lift });
            break;
          case 'proptag':
            if (p >= a.t0) {
              const m = this.get(a.p);
              if (m.visible) {
                this.tags.push({
                  x: m.x + a.x1, y: a.y - (m.kind === 3 ? m.y : 0),
                  t: a.s.replace('{n}', String(Math.floor(a.n1 * f))), lift: a.lift,
                });
              }
            }
            break;
          case 'hl':
            if (p >= a.t0) for (const id of a.s.split(',')) this.hl.add(id.trim());
            break;
          case 'confetti':
            if (p >= a.t0) this.confetti = true;
            break;
          default: break;
        }
      }
    }

    // Which document the camera should follow: one in flight, else the next one to leave.
    noteDoc(a, f, x) {
      if (f > 0 && f < 1) this.movingDoc = { x };
      else if (f <= 0 && (!this.pendingDoc || a.t0 < this.pendingDoc.t0)) this.pendingDoc = { x, t0: a.t0 };
    }

    // Where a box (container or ULD) sits on each kind of prop: bottom-centre.
    anchor(id) {
      const m = this.get(id);
      switch (m.kind) {
        case 1: return [m.dir > 0 ? m.x + 36 : m.x + 80, 451];
        case 2: return [m.x + 40, 356];
        case 3: return [m.x - 45, 432 - m.y];
        case 4: return [m.x - 185, 412];
        case 5: return [m.dir > 0 ? m.x + 35 : m.x + 75, 448];
        case 6: return [m.x, m.y];
        default: return [m.x, 451];
      }
    }

    transfer(a, p) {
      const r = (p - a.t0) / (a.t1 - a.t0);
      if (r <= 0) return;
      if (r >= 1) { this.boxAt = a.p2; this.boxMoving = false; return; }
      const [ax, ay] = this.anchor(a.p);
      const [bx, by] = this.anchor(a.p2);
      if (a.s.startsWith('crane')) {
        const idle = 300, top = 292, hA = ay - 31, hB = by - 31;
        let tx, hy, carry;
        if (r < 0.2) { tx = ax; hy = lp(idle, hA, seg(r, 0, 0.2)); carry = false; }
        else if (r < 0.4) { tx = ax; hy = lp(hA, top, seg(r, 0.2, 0.4)); carry = true; }
        else if (r < 0.75) { tx = lp(ax, bx, seg(r, 0.4, 0.75)); hy = top; carry = true; }
        else if (r < 0.92) { tx = bx; hy = lp(top, hB, seg(r, 0.75, 0.92)); carry = true; }
        else { tx = bx; hy = lp(hB, idle, seg(r, 0.92, 1)); carry = false; this.boxAt = a.p2; }
        this.craneUse[a.s] = { x: tx, y: hy };
        if (carry) { this.boxAt = null; this.boxMoving = true; this.boxLift = false; this.boxX = tx; this.boxY = hy + 31; }
      } else {
        const topY = Math.min(ay, by) - 40;
        let x, y;
        if (r < 0.3) { x = ax; y = lp(ay, topY, seg(r, 0, 0.3)); }
        else if (r < 0.7) { x = lp(ax, bx, seg(r, 0.3, 0.7)); y = topY; }
        else { x = bx; y = lp(topY, by, seg(r, 0.7, 1)); }
        this.boxAt = null; this.boxMoving = true; this.boxLift = true; this.boxX = x; this.boxY = y;
      }
    }
  }

  // Checks a built scenario for mistakes a lesson author can make. Throws with a clear message.
  function validate(s) {
    const ids = new Set(s.props.map((p) => p.id));
    let box = s.startBox;
    s.steps.forEach((st, i) => {
      const where = 'step ' + (i + 1) + ' “' + st.title + '”';
      if (!st.title || !st.text) throw new Error(where + ': missing title or text');
      if (st.text.length > 400) throw new Error(where + ': narration too long (' + st.text.length + ' characters)');
      if (/\{\w+\}/.test(st.title + st.text + st.who)) throw new Error(where + ': a {placeholder} was not filled in');
      for (const k of st.terms) if (!s.termText[k]) throw new Error(where + ': missing glossary term ' + k);
      if (st.quiz && (st.quiz.c < 0 || st.quiz.c >= st.quiz.a.length)) throw new Error(where + ': quiz answer out of range');
      if (st.choices && !st.prompt) throw new Error(where + ': decision has no question');
      if (st.focusProp && !ids.has(st.focusProp)) throw new Error(where + ': camera follows unknown prop ' + st.focusProp);
      for (const a of st.acts) {
        if (a.p && !ids.has(a.p)) throw new Error(where + ': unknown prop ' + a.p);
        if (a.p2 && !ids.has(a.p2)) throw new Error(where + ': unknown prop ' + a.p2);
        if (a.k === 'hl') {
          for (const h of a.s.split(',')) if (s.place[h.trim()] === undefined) throw new Error(where + ': highlight of unknown place ' + h);
        }
        if (a.k === 'xfer') {
          if (a.p !== box) throw new Error(where + ': transfer starts at ' + a.p + ' but the box is at ' + box);
          box = a.p2;
          const crane = { craneA: s.craneA, craneB: s.craneB, craneT: s.craneT }[a.s];
          if (crane !== undefined && crane < 0) throw new Error(where + ': uses ' + a.s + ', which this route does not have');
        }
      }
    });
  }

  CV.Engine = { World, validate };
})(globalThis.CV = globalThis.CV || {});
