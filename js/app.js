/* Cargo Voyage - the app: menus, lesson panel, quizzes, decisions, glossary, camera, input and the frame loop.
   The canvas only draws the moving world; all text and buttons are real HTML so they stay sharp and
   accessible on any screen. */
(function (CV) {
  'use strict';
  const { Content, Builder, Engine, Render, Sfx } = CV;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('cargo-voyage:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('cargo-voyage:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // ---------------------------------------------------------------- state
  const st = {
    screen: 'title',                 // title | role | route | item | play | results
    cfg: { air: false, role: 1, origin: 0, dest: 1, item: 0, load: -1 },
    scn: null, world: null,
    step: 0, stepStart: 0, animDone: false,
    score: 0, quizDone: new Set(), termFirst: new Map(),
    sheet: null,                     // null | quiz | decision | glossary (on top of play or results)
    quizPick: -1, decisionPick: -1, decided: null,
    cues: [], camX: 0, view: { w: 1280, h: 500, scale: 1, dpr: 1, ts: 1 },
    now: 0, lastT: 0,
  };
  Sfx.muted = store.get('muted', false);

  const canvas = $('scene');
  const ctx = canvas.getContext('2d');

  function rebuild() {
    st.scn = Builder.build(st.cfg);
    st.world = new Engine.World(st.scn);
  }

  // ---------------------------------------------------------------- canvas sizing
  // The world is 500 units tall. The canvas always shows the full height and as much width as fits.
  function resize() {
    const stage = $('stage');
    const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const scale = h / 500;
    st.view = { w: w / scale, h: 500, scale, dpr, ts: Math.min(1.7, Math.max(1, 0.85 / scale)) };
  }

  // A small margin on the left keeps the first building's label fully on screen.
  function camTarget(fx) {
    const max = Math.max(-60, st.scn.worldW - st.view.w);
    return Math.max(-60, Math.min(max, fx - st.view.w / 2));
  }

  // ---------------------------------------------------------------- flow
  function setScreen(name) {
    st.screen = name;
    document.body.classList.toggle('on-menu', name !== 'play');
    document.body.classList.toggle('on-play', name === 'play');
    if (name !== 'play' && name !== 'results') rebuild();
    renderSheet();
  }

  function startGame() {
    st.cfg.load = -1;
    rebuild();
    st.score = 0;
    st.quizDone.clear();
    st.termFirst.clear();
    st.sheet = null;
    buildProgress();
    setScreen('play');
    resize();
    enterStep(0);
    st.camX = camTarget(st.world.focusX);
  }

  function enterStep(s) {
    st.step = s;
    st.stepStart = st.now;
    st.animDone = false;
    const step = st.scn.steps[s];
    let fresh = false;
    for (const k of step.terms) if (!st.termFirst.has(k)) { st.termFirst.set(k, s); fresh = true; }
    st.cues = [];
    for (const tok of (step.snd || '').split(',')) {
      const [name, t] = tok.split(':');
      if (name && t) st.cues.push({ t: parseFloat(t), name });
    }
    if (fresh) st.cues.push({ t: 1.2, name: 'ding' });
    st.world.compute(s, 0);
    if (s === 0) st.camX = camTarget(st.world.focusX);
    renderPanel();
  }

  function nextStep() {
    if (st.screen !== 'play' || st.sheet) return;
    const step = st.scn.steps[st.step];
    if (step.choices && st.cfg.load < 0) { openSheet('decision'); return; }
    if (step.quiz && !st.quizDone.has(step.quiz.id)) { openSheet('quiz'); return; }
    advance();
  }

  function advance() {
    if (st.step >= st.scn.steps.length - 1) { Sfx.play('fanfare'); setScreen('results'); return; }
    enterStep(st.step + 1);
  }

  function backStep() {
    if (st.screen === 'play' && !st.sheet && st.step > 0) enterStep(st.step - 1);
  }

  function maxScore() { return st.scn.steps.filter((s) => s.quiz).length * 10; }
  function termsSeen() { return st.scn.termOrder.filter((k) => st.termFirst.has(k)).length; }

  // ---------------------------------------------------------------- lesson panel
  function buildProgress() {
    const bar = $('progress');
    bar.innerHTML = '';
    for (let i = 0; i < st.scn.steps.length; i++) {
      const c = document.createElement('span');
      c.className = 'box';
      bar.appendChild(c);
    }
  }

  function renderPanel() {
    const step = st.scn.steps[st.step];
    const c = st.cfg;
    $('hudMode').textContent = (c.air ? 'Air freight' : 'Sea freight') + ', ' + (c.role === 1 ? 'exporter' : 'importer');
    $('hudStep').textContent = 'Step ' + (st.step + 1) + ' of ' + st.scn.steps.length;
    $('hudScore').innerHTML = '<span>Score <b>' + st.score + '</b></span><span>Terms <b>' + termsSeen() + '</b> of ' + st.scn.termOrder.length + '</span>';
    const boxes = $('progress').children;
    if (boxes.length !== st.scn.steps.length) buildProgress();
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].className = 'box' + (i < st.step ? ' done' : i === st.step ? ' now' : '');
    }
    $('stepTitle').textContent = step.title;
    $('stepNum').textContent = 'Step ' + (st.step + 1) + ' of ' + st.scn.steps.length;
    $('who').textContent = step.who;
    const mine = (step.owner & c.role) !== 0;
    const badge = $('badge');
    badge.textContent = mine ? 'Your turn' : 'Watch and learn';
    badge.className = 'chip ' + (mine ? 'chip-turn' : 'chip-watch');
    $('narration').textContent = step.text;
    const terms = $('terms');
    terms.innerHTML = '';
    for (const k of step.terms) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'term' + (st.termFirst.get(k) === st.step ? ' is-new' : '');
      b.textContent = st.scn.termText[k][0];
      b.dataset.term = k;
      b.setAttribute('aria-expanded', 'false');
      terms.appendChild(b);
    }
    $('termDef').hidden = true;
    $('btnBack').disabled = st.step === 0;
    $('btnNext').textContent = st.step === st.scn.steps.length - 1 ? 'Finish' : 'Next step';
    $('btnNext').classList.remove('ready');
    $('btnSound').textContent = Sfx.muted ? 'Sound off' : 'Sound on';
    $('btnSound').setAttribute('aria-pressed', String(!Sfx.muted));
    const lesson = document.querySelector('.lesson');
    if (lesson) lesson.scrollTop = 0;
  }

  function showTerm(btn) {
    const def = $('termDef');
    const open = btn.getAttribute('aria-expanded') === 'true';
    for (const b of $('terms').children) b.setAttribute('aria-expanded', 'false');
    if (open) { def.hidden = true; return; }
    const t = st.scn.termText[btn.dataset.term];
    def.innerHTML = '<b>' + esc(t[0]) + '</b> ' + esc(t[1]);
    def.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }

  // ---------------------------------------------------------------- sheets (menus and pop-ups)
  const ICON = {
    sea: '<svg viewBox="0 0 64 40" aria-hidden="true"><path d="M4 26h56l-7 10H12z" fill="currentColor"/><rect x="16" y="14" width="10" height="10" fill="currentColor" opacity=".55"/><rect x="28" y="14" width="10" height="10" fill="currentColor" opacity=".8"/><rect x="40" y="14" width="10" height="10" fill="currentColor" opacity=".55"/><rect x="8" y="10" width="6" height="14" fill="currentColor"/></svg>',
    air: '<svg viewBox="0 0 64 40" aria-hidden="true"><path d="M6 22c0-3 3-5 7-5h36c6 0 11 2 11 5s-5 5-11 5H13c-4 0-7-2-7-5z" fill="currentColor"/><path d="M26 22l-6 14h7l12-14zM26 21l-5-13h6l11 13zM8 19l-3-11h5l7 10z" fill="currentColor" opacity=".7"/></svg>',
  };

  function tile(act, value, title, sub, opts) {
    const o = opts || {};
    return '<button type="button" class="tile' + (o.selected ? ' is-selected' : '') + (o.cls ? ' ' + o.cls : '') +
      '" data-act="' + act + '" data-v="' + value + '"' + (o.selected ? ' aria-pressed="true"' : '') + '>' +
      (o.icon ? '<span class="tile-icon">' + o.icon + '</span>' : '') +
      '<span class="tile-title">' + esc(title) + '</span>' + (sub ? '<span class="tile-sub">' + esc(sub) + '</span>' : '') + '</button>';
  }

  function legs(c) {
    return '<ol class="legs" aria-label="Route">' + Content.routeLegs(c).map((l) => '<li>' + esc(l) + '</li>').join('') + '</ol>';
  }

  function openSheet(kind) {
    st.sheet = kind;
    st.quizPick = -1;
    st.decisionPick = -1;
    renderSheet();
  }

  function closeSheet() { st.sheet = null; renderSheet(); }

  function renderSheet() {
    const overlay = $('overlay'), sheet = $('sheet');
    let html = '', modal = false;
    const c = st.cfg;
    if (st.sheet === 'quiz') {
      modal = true;
      const q = st.scn.steps[st.step].quiz;
      html = '<h2 id="sheetTitle">Quick check</h2><p class="lead">' + esc(q.q) + '</p><div class="answers">';
      q.a.forEach((a, i) => {
        let cls = 'answer';
        if (st.quizPick >= 0) cls += i === q.c ? ' is-right' : i === st.quizPick ? ' is-wrong' : ' is-dim';
        html += '<button type="button" class="' + cls + '" data-act="answer" data-v="' + i + '"' + (st.quizPick >= 0 ? ' disabled' : '') + '>' + esc(a) + '</button>';
      });
      html += '</div>';
      if (st.quizPick >= 0) {
        const ok = st.quizPick === q.c;
        html += '<p class="verdict ' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Correct, 10 points.' : 'Not quite.') + '</p><p class="why">' + esc(q.why) + '</p>' +
          '<div class="row"><button type="button" class="btn btn-go" data-act="continue">Continue</button></div>';
      }
    } else if (st.sheet === 'decision') {
      modal = true;
      const step = st.scn.steps[st.step];
      html = '<h2 id="sheetTitle">Your call</h2><p class="lead">' + esc(step.prompt) + '</p><div class="tiles two">';
      step.choices.forEach((ch, i) => {
        html += tile('choose', i, ch.label, ch.sub, { selected: st.decisionPick === i, cls: st.decisionPick >= 0 && st.decisionPick !== i ? 'is-dim' : '' });
      });
      html += '</div>';
      if (st.decided) html += '<p class="why">' + esc(st.decided.why) + '</p><div class="row"><button type="button" class="btn btn-go" data-act="continue">Continue</button></div>';
    } else if (st.sheet === 'glossary') {
      modal = true;
      html = '<h2 id="sheetTitle">Glossary</h2><p class="lead">' + termsSeen() + ' of ' + st.scn.termOrder.length + ' terms found on this route.</p><dl class="gloss">';
      for (const k of st.scn.termOrder) {
        const t = st.scn.termText[k];
        html += st.termFirst.has(k)
          ? '<div><dt>' + esc(t[0]) + '</dt><dd>' + esc(t[1]) + '</dd></div>'
          : '<div class="locked"><dt>Not found yet</dt><dd>Keep going to discover this term.</dd></div>';
      }
      html += '</dl><div class="row"><button type="button" class="btn btn-go" data-act="close">Close</button></div>';
    } else if (st.screen === 'title') {
      html = '<h1 class="wordmark" id="sheetTitle">Cargo Voyage</h1>' +
        '<p class="lead">Follow one shipment into Canada, step by step: the paperwork, the people and the trucks, ships and planes that move it.</p>' +
        '<h2 class="ask">How does your cargo travel?</h2><div class="tiles two">' +
        tile('mode', 'sea', 'Sea freight', 'Container ship, truck and rail', { icon: ICON.sea }) +
        tile('mode', 'air', 'Air freight', 'Cargo plane and truck', { icon: ICON.air }) + '</div>';
    } else if (st.screen === 'role') {
      html = '<h2 id="sheetTitle">Which side are you on?</h2><p class="lead">' + (c.air ? 'Air freight.' : 'Sea freight.') + ' Both sides see the whole journey; your steps are marked “Your turn”.</p><div class="tiles two">' +
        tile('role', 1, 'Exporter', 'You sell the goods and ship them out') +
        tile('role', 2, 'Importer', 'You buy the goods and bring them into Canada') + '</div>' +
        '<div class="row"><button type="button" class="btn btn-quiet" data-act="go" data-v="title">Back</button></div>';
    } else if (st.screen === 'route') {
      html = '<h2 id="sheetTitle">Choose a route</h2><h3>From</h3><div class="tiles three">';
      Content.origins.forEach((o, i) => { html += tile('origin', i, o.city, o.country, { selected: c.origin === i }); });
      html += '</div><h3>To</h3><div class="tiles three">';
      Content.dests.forEach((d, i) => { html += tile('dest', i, d.city, d.prov + ', Canada', { selected: c.dest === i }); });
      html += '</div>' + legs(c) +
        '<div class="row"><button type="button" class="btn btn-quiet" data-act="go" data-v="role">Back</button>' +
        '<button type="button" class="btn btn-go" data-act="go" data-v="item">Choose the cargo</button></div>';
    } else if (st.screen === 'item') {
      html = '<h2 id="sheetTitle">What are you shipping?</h2><p class="lead">Each product changes the lesson: dangerous goods, cold chain or volume pricing.</p><div class="tiles two">';
      Content.items.forEach((it, i) => { html += tile('item', i, it.name, it.desc); });
      html += '</div><div class="row"><button type="button" class="btn btn-quiet" data-act="go" data-v="route">Back</button></div>';
    } else if (st.screen === 'results') {
      const max = maxScore();
      const stars = max === 0 || st.score >= max * 0.8 ? 3 : st.score >= max * 0.5 ? 2 : 1;
      const msg = ['', 'Good start. Try another route to learn more.', 'Solid shipment.', 'Logistics pro.'][stars];
      html = '<h2 id="sheetTitle">Delivered to ' + esc(Content.dests[c.dest].city) + '</h2>' + legs(c) +
        '<div class="stats"><div><b>' + st.score + '</b><span>of ' + max + ' quiz points</span></div><div><b>' + termsSeen() + '</b><span>of ' + st.scn.termOrder.length + ' terms learned</span></div></div>' +
        '<p class="stars" aria-label="' + stars + ' of 3 stars">' + '<span class="on">★</span>'.repeat(stars) + '<span>★</span>'.repeat(3 - stars) + '</p>' +
        '<p class="lead center">' + msg + '</p><div class="row">' +
        '<button type="button" class="btn btn-quiet" data-act="glossary">Glossary</button>' +
        '<button type="button" class="btn btn-quiet" data-act="go" data-v="title">New route</button>' +
        '<button type="button" class="btn btn-go" data-act="again">Play again</button></div>';
    }
    sheet.innerHTML = html;
    sheet.className = modal ? 'is-modal' : 'is-menu';
    overlay.hidden = !html;
    overlay.classList.toggle('dim', modal);
    if (html) {
      sheet.scrollTop = 0;
      // Move keyboard focus into pop-ups so screen-reader and keyboard users land on the question.
      if (modal || st.screen === 'results') {
        const first = sheet.querySelector('.btn-go:not([disabled]), .answer:not([disabled]), .tile');
        if (first) {
          first.focus({ preventScroll: true });
          if (first.dataset.act === 'continue') first.scrollIntoView({ block: 'nearest' });
        }
      }
    }
  }

  function onSheetClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const act = el.dataset.act, v = el.dataset.v;
    const c = st.cfg;
    switch (act) {
      case 'mode': c.air = v === 'air'; Sfx.play('next'); setScreen('role'); break;
      case 'role': c.role = +v; Sfx.play('next'); setScreen('route'); break;
      case 'origin': c.origin = +v; Sfx.play('pop'); setScreen('route'); break;
      case 'dest': c.dest = +v; Sfx.play('pop'); setScreen('route'); break;
      case 'item': c.item = +v; Sfx.play('next'); startGame(); break;
      case 'go': Sfx.play(v === 'item' ? 'next' : 'back'); setScreen(v); break;
      case 'again': Sfx.play('next'); startGame(); break;
      case 'glossary': Sfx.play('click'); openSheet('glossary'); break;
      case 'close': Sfx.play('click'); closeSheet(); break;
      case 'answer': {
        if (st.quizPick >= 0) return;
        const q = st.scn.steps[st.step].quiz;
        st.quizPick = +v;
        const ok = st.quizPick === q.c;
        if (ok) st.score += 10;
        st.quizDone.add(q.id);
        Sfx.play(ok ? 'good' : 'bad');
        renderSheet();
        renderPanel();
        break;
      }
      case 'choose': {
        if (st.decided) return;
        const step = st.scn.steps[st.step];
        st.decisionPick = +v;
        st.decided = step.choices[+v];
        c.load = st.decided.key;
        rebuild();                    // the rest of the lesson now follows this choice
        buildProgress();
        Sfx.play('good');
        renderSheet();
        renderPanel();
        break;
      }
      case 'continue':
        Sfx.play('next');
        st.sheet = null;
        st.decided = null;
        renderSheet();
        advance();
        break;
      default: break;
    }
  }

  // ---------------------------------------------------------------- frame loop
  function frame(t) {
    requestAnimationFrame(frame);
    const now = t / 1000;
    const dt = Math.min(0.1, st.lastT ? now - st.lastT : 0);
    st.lastT = now;
    st.now = now;
    try {
      const w = st.world, v = st.view;
      let cam;
      if (st.screen === 'play') {
        const step = st.scn.steps[st.step];
        const p = Math.min(1, (now - st.stepStart) / step.dur);
        w.compute(st.step, p);
        const target = camTarget(w.focusX);
        st.camX = reduceMotion.matches ? target : st.camX + (target - st.camX) * (1 - Math.exp(-dt * 5));
        cam = st.camX;
        st.cues.sort((a, b) => a.t - b.t);
        while (st.cues.length && now - st.stepStart >= st.cues[0].t) Sfx.play(st.cues.shift().name);
        if (p >= 1 && !st.animDone) { st.animDone = true; $('btnNext').classList.add('ready'); }
      } else if (st.screen === 'results') {
        w.idle(now, true);
        cam = camTarget(st.scn.place.imp);
      } else {
        w.idle(now, false);
        cam = camTarget(st.scn.coastA + 300);
      }
      if (reduceMotion.matches) w.confetti = false;
      ctx.setTransform(v.dpr * v.scale, 0, 0, v.dpr * v.scale, 0, 0);
      Render.drawWorld(ctx, w, cam, now, v.w, v.h, v.ts);
    } catch (err) {
      showError(err);
    }
  }

  let errorShown = false;
  function showError(err) {
    console.error(err);
    if (errorShown) return;
    errorShown = true;
    const t = $('toast');
    t.textContent = 'Something went wrong: ' + (err && err.message ? err.message : err) + '. Reload the page to start again.';
    t.hidden = false;
  }

  // ---------------------------------------------------------------- input
  function toggleSound() {
    Sfx.muted = !Sfx.muted;
    store.set('muted', Sfx.muted);
    if (st.screen === 'play') renderPanel();
  }

  function toggleFull() {
    const d = document;
    if (d.fullscreenElement) d.exitFullscreen();
    else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => {});
  }

  function bind() {
    $('sheet').addEventListener('click', onSheetClick);
    $('btnNext').addEventListener('click', () => { Sfx.play('next'); nextStep(); });
    $('btnBack').addEventListener('click', () => { Sfx.play('back'); backStep(); });
    $('btnReplay').addEventListener('click', () => { Sfx.play('pop'); enterStep(st.step); });
    $('btnGloss').addEventListener('click', () => { Sfx.play('click'); openSheet('glossary'); });
    $('btnSound').addEventListener('click', toggleSound);
    $('btnMenu').addEventListener('click', () => { Sfx.play('back'); st.sheet = null; setScreen('title'); });
    const full = $('btnFull');
    if (document.fullscreenEnabled) full.addEventListener('click', toggleFull);
    else full.hidden = true;
    $('terms').addEventListener('click', (e) => { const b = e.target.closest('.term'); if (b) showTerm(b); });

    // Browsers only allow sound after a tap, click or key press.
    for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => Sfx.unlock(), { passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'Escape' && st.sheet === 'glossary') { closeSheet(); return; }
      if (e.key === 'm' || e.key === 'M') { toggleSound(); return; }
      if (e.key === 'f' || e.key === 'F') { if (document.fullscreenEnabled) toggleFull(); return; }
      if (st.screen !== 'play' || st.sheet) return;
      const tag = (e.target && e.target.tagName) || '';
      if (e.key === 'ArrowRight' || ((e.key === ' ' || e.key === 'Enter') && tag !== 'BUTTON')) { e.preventDefault(); Sfx.play('next'); nextStep(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); Sfx.play('back'); backStep(); }
    });

    // Swipe the scene: left for the next step, right to go back.
    let sx = 0, sy = 0, tracking = false;
    const stage = $('stage');
    stage.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) { Sfx.play('next'); nextStep(); } else { Sfx.play('back'); backStep(); }
      }
    }, { passive: true });

    new ResizeObserver(resize).observe($('stage'));
    window.addEventListener('error', (e) => showError(e.error || e.message));
  }

  // ---------------------------------------------------------------- start
  function start() {
    rebuild();
    bind();
    resize();
    setScreen('title');
    requestAnimationFrame(frame);
  }

  start();
  CV.App = { state: st };
})(globalThis.CV = globalThis.CV || {});
