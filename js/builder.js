/* Cargo Voyage - builds a scenario (world layout + lesson steps) from the player's choices.
   Steps are written as small timed actions ("this truck drives there between 10% and 60% of the step"),
   so a lesson reads like a script and never stores positions by hand. */
(function (CV) {
  'use strict';
  const { Content } = CV;

  class Ctx {
    constructor(cfg) {
      this.C = cfg;
      this.O = Content.origins[cfg.origin];
      this.D = Content.dests[cfg.dest];
      this.I = Content.items[cfg.item];
      this.S = {
        cfg, steps: [], props: [], bldgs: [], labels: [], place: {}, termOrder: [], termText: {},
        startBox: null, country: '', ocean: '', boxLabel: '', coastA: 0, coastB: 0, worldW: 0,
        railX0: -1, railX1: -1, craneA: -1, craneB: -1, craneT: -1,
        flag: '', reefer: false, dg: false, cargoCol: '#ccc', boxCol: '#888',
      };
      this.cur = null;
    }

    get air() { return this.C.air; }
    get lcl() { return !this.C.air && this.C.load === 1; }
    get rail() { return this.S.railX0 >= 0; }

    P(id) {
      const v = this.S.place[id];
      if (v === undefined) throw new Error('Unknown place: ' + id);
      return v;
    }

    // Fills {placeholders} with this route's names. Unknown ones (like {n}) are left for later.
    F(t) {
      const O = this.O, D = this.D, I = this.I, C = this.C;
      const map = {
        city: O.city, country: O.country, dest: D.city, pol: O.seaPort, pod: Content.podName(O),
        carrier: C.air ? 'Air Canada Cargo' : O.carrier, aod: O.airCode, aoa: D.airCode, item: I.short,
        mode: C.air ? 'air' : 'sea', load: C.load === 1 ? 'LCL' : 'FCL', days: O.seaDays, hours: O.airHours,
        ocean: O.ocean,
      };
      return t.replace(/\{(\w+)\}/g, (m, k) => (k in map ? String(map[k]) : m));
    }

    // ----- steps -----
    St(title, who, owner, dur, snd, text) {
      this.cur = {
        title: this.F(title), who: this.F(who), owner, dur, snd, text: this.F(text),
        terms: [], quiz: null, prompt: null, choices: null, acts: [],
        focusX: 640, focusProp: null, focusDoc: false,
      };
      this.S.steps.push(this.cur);
    }

    DefTerm(key, name, def) { this.S.termText[key] = [this.F(name), this.F(def)]; }

    T(...keys) {
      for (const k of keys) {
        if (!this.S.termText[k]) {
          if (!Content.terms[k]) throw new Error('Unknown term: ' + k);
          this.S.termText[k] = Content.terms[k];
        }
        if (!this.cur.terms.includes(k)) this.cur.terms.push(k);
        if (!this.S.termOrder.includes(k)) this.S.termOrder.push(k);
      }
    }

    Q(id, q, answers, correct, why) {
      this.cur.quiz = { id, q: this.F(q), a: answers.map((a) => this.F(a)), c: correct, why: this.F(why) };
    }

    Decide(prompt, choices) {
      this.cur.prompt = this.F(prompt);
      this.cur.choices = choices.map((c) => ({ key: c[0], label: this.F(c[1]), sub: this.F(c[2]), why: this.F(c[3]) }));
    }

    // ----- actions -----
    A(k, t0, t1) {
      const a = { k, t0, t1, p: null, p2: null, s: null, x0: NaN, x1: 0, y: 0, y2: 0, lift: 0, n0: 0, n1: 0, c: null };
      this.cur.acts.push(a);
      return a;
    }
    Move(p, x1, t0, t1) { const a = this.A('move', t0, t1); a.p = p; a.x1 = x1; }
    MoveFrom(p, x0, x1, t0, t1) { const a = this.A('move', t0, t1); a.p = p; a.x0 = x0; a.x1 = x1; }
    Fly(p, x1, t0, t1) { const a = this.A('fly', t0, t1); a.p = p; a.x1 = x1; }
    Show(p, t) { const a = this.A('show', t, t + 0.01); a.p = p; }
    Hide(p, t) { const a = this.A('hide', t, t + 0.01); a.p = p; }
    Cargo(p, n0, n1, t0, t1) { const a = this.A('cargo', t0, t1); a.p = p; a.n0 = n0; a.n1 = n1; }
    Xfer(from, to, via, t0, t1) { const a = this.A('xfer', t0, t1); a.p = from; a.p2 = to; a.s = via; }
    Scale(kg, t0, t1) { const a = this.A('scale', t0, t1); a.n1 = kg; }
    Doc(label, c, x0, x1, t0, t1) {
      const a = this.A('doc', t0, t1);
      Object.assign(a, { s: label, c, x0, x1, y: 330, y2: 318, lift: 90 });
    }
    DocStill(label, c, x, y, t0) {
      const a = this.A('doc', t0, t0 + 0.01);
      Object.assign(a, { s: label, c, x0: x, x1: x, y, y2: y, lift: 0 });
    }
    Coin(x0, x1, t0, t1) { const a = this.A('coin', t0, t1); Object.assign(a, { x0, x1, y: 340, y2: 340, lift: 150 }); }
    Pulse(label, x0, x1, t0, t1) { const a = this.A('pulse', t0, t1); Object.assign(a, { s: label, x0, x1, y: 300, y2: 300, lift: 170 }); }
    Hop(n, x0, y0, x1, y1, t0, t1, c) { const a = this.A('hop', t0, t1); Object.assign(a, { n1: n, x0, y: y0, x1, y2: y1, c }); }
    Stamp(text, x, y, t0) { const a = this.A('stamp', t0, t0 + 0.12); Object.assign(a, { s: this.F(text), x0: x, y }); }
    Tag(text, x, y, lift, t0) { const a = this.A('tag', t0, 1.01); Object.assign(a, { s: this.F(text), x0: x, y, lift }); }
    PropTag(text, p, dx, y, lift, n, t0, t1) { const a = this.A('proptag', t0, t1); Object.assign(a, { s: this.F(text), p, x1: dx, y, lift, n1: n }); }
    Hl(ids, t0) { const a = this.A('hl', t0, 1.01); a.s = ids; }
    Confetti(t0) { this.A('confetti', t0, 1.01); }
    Focus(x) { this.cur.focusX = x; }
    Follow(p) { this.cur.focusProp = p; }
    FollowDoc(fallback) { this.cur.focusDoc = true; this.cur.focusX = fallback; }

    // ----- layout -----
    Bld(id, x, w, h, sign, label, col, style) {
      this.S.bldgs.push({ id, x, w, h, sign, label: this.F(label), col, style });
      this.S.place[id] = x + w / 2;
      return x + w;
    }
    Label(id, text, x) {
      this.S.labels.push({ id, text: this.F(text), x });
      this.S.place[id] = x;
    }
    AddProp(id, kind, x, y, visible) {
      const p = { id, kind, x, y, ang: 0, dir: 1, cargo: 0, visible, moving: false };
      this.S.props.push(p);
      return p;
    }
  }

  // Places every building left to right, so nothing overlaps whatever the route.
  // Prop kinds: 0 straight truck, 1 tractor + chassis, 2 ship, 3 plane, 4 train, 5 tug + dolly, 6 spot on the ground.
  function layout(b) {
    const s = b.S, air = b.air;
    const office = '#5a78aa', shed = '#b9a078', term = '#96a0af';
    let x = 40;
    x = b.Bld('exp', x, 140, 78, 'E', 'Exporter ({city})', '#be3c32', 0) + 70;
    if (air) x = b.Bld('gsa', x, 80, 56, 'GSA', 'GSA (airline agent)', '#825aaa', 1) + 70;
    x = b.Bld('ff1', x, 90, 60, 'FF', 'Freight forwarder', office, 1) + 70;
    if (!air) {
      x = b.Bld('cfs1', x, 140, 70, 'CFS', 'Container freight station', shed, 2) + 70;
      b.Label('scale', 'Weighbridge', x + 80);
      x += 220;
      b.Label('dockA', '{pol} (POL)', x + 110);
      x += 230;
      s.coastA = x;
      s.craneA = x - 10;
    } else {
      x = b.Bld('term1', x, 170, 76, 'CARGO', 'Air cargo terminal', term, 2) + 60;
      b.Label('apronA', '{aod} airport (departure)', x + 170);
      x += 360;
      s.coastA = x;
    }
    x += 1800;
    s.coastB = x;
    const rail = !air && Content.podCity(b.O) !== b.D.city;
    if (!air) {
      s.craneB = x + 30;
      b.Label('dockB', '{pod} (POD)', x + 140);
      x += 280;
    } else {
      b.Label('apronB', '{aoa} airport (arrival)', x + 190);
      x += 380;
      x = b.Bld('term2', x, 170, 76, 'BOND', 'Sufferance warehouse', term, 2) + 60;
    }
    x = b.Bld('cbsa', x, 80, 62, 'CBSA', 'CBSA', '#e8e8ee', 3) + 50;
    x = b.Bld('cb', x, 80, 56, 'CB', 'Customs broker', '#966eaa', 1) + 50;
    if (b.I.food) x = b.Bld('cfia', x, 80, 56, 'CFIA', 'CFIA', '#5aa06e', 3) + 50;
    if (rail) {
      x += 380;
      s.craneT = x + 160;
      b.Label('railT', 'Rail terminal ({dest})', x + 160);
      s.railX0 = s.coastB + 20;
      s.railX1 = x + 330;
      x += 400;
    } else x += 150;
    if (!air) x = b.Bld('cfs2', x, 140, 70, 'CFS', 'CFS (destination)', shed, 2) + 70;
    x = b.Bld('ff2', x, 80, 54, 'FF', 'Freight forwarder', office, 1) + 260;
    x = b.Bld('imp', x, 150, 82, 'I', 'Importer ({dest})', '#c8aa6e', 2);
    s.worldW = x + 260;

    b.AddProp('stO', 0, -300, 0, true).cargo = 8;
    b.AddProp('stD', 0, b.P('imp') - 300, 0, false);
    if (!air) {
      b.AddProp('cfsO', 6, b.P('cfs1'), 430, true);
      b.AddProp('cfsD', 6, b.P('cfs2'), 430, true);
      b.AddProp('truckO', 1, -300, 0, true);
      b.AddProp('ship', 2, s.coastA + 75, 0, true);
      b.AddProp('train', 4, s.craneB + 245, 0, rail);
      b.AddProp('truckD', 1, s.craneB + 24, 0, false);
      s.startBox = b.lcl ? 'cfsO' : 'truckO';
    } else {
      b.AddProp('termO', 6, b.P('term1'), 430, true);
      b.AddProp('termD', 6, b.P('term2'), 430, true);
      b.AddProp('dollyO', 5, b.P('term1') - 35, 0, true);
      b.AddProp('plane', 3, b.P('apronA'), 0, true);
      b.AddProp('dollyD', 5, b.P('apronB') - 80, 0, false);
      s.startBox = 'termO';
    }
  }

  function build(cfg) {
    const b = new Ctx(cfg);
    const s = b.S;
    s.country = b.O.country.toUpperCase();
    s.ocean = b.O.ocean.toUpperCase() + ' OCEAN';
    s.flag = b.O.flag;
    s.dg = b.I.dg;
    s.reefer = b.I.reefer;
    s.cargoCol = b.I.col;
    s.boxCol = b.O.boxCol;
    s.boxLabel = cfg.air ? (cfg.load === 1 ? 'AKE' : 'PMC') : b.O.carrier.split('-')[0].toUpperCase();
    layout(b);
    if (cfg.air) CV.Lessons.air(b); else CV.Lessons.sea(b);
    return s;
  }

  CV.Builder = { build, Ctx };
})(globalThis.CV = globalThis.CV || {});
