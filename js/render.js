/* Cargo Voyage - draws the world on a canvas. World units: the ground is at y = 400, the road at y = 468,
   and the scene is 500 units tall. The app scales and scrolls it to fit any screen. */
(function (CV) {
  'use strict';
  const { lp } = CV.U;
  const FONT = '"Atkinson Hyperlegible", Arial, Helvetica, sans-serif';
  const STENCIL = '"Big Shoulders Stencil Display", Impact, "Arial Narrow", sans-serif';
  const ROADY = 468;
  const FILLER = ['#c8463c', '#46965a', '#e69632', '#5a6e96'];
  const CONFETTI = ['#ffd700', '#ff69b4', '#00bfff', '#32cd32', '#ffa500', '#ffffff'];

  // ---------- small drawing helpers ----------
  function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function shade(h, f) { const c = rgb(h); return 'rgb(' + Math.round(c[0] * f) + ',' + Math.round(c[1] * f) + ',' + Math.round(c[2] * f) + ')'; }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function fillRR(ctx, col, x, y, w, h, r) { rr(ctx, x, y, w, h, r); ctx.fillStyle = col; ctx.fill(); }
  function strokeRR(ctx, col, lw, x, y, w, h, r) { rr(ctx, x, y, w, h, r); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); }
  function box(ctx, col, x, y, w, h) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); }
  function line(ctx, col, lw, x1, y1, x2, y2) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function poly(ctx, col, pts, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (col) { ctx.fillStyle = col; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  function oval(ctx, col, x, y, w, h) {
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
  }
  function text(ctx, s, x, y, size, col, bold, fam, align) {
    ctx.font = (bold ? '700 ' : '400 ') + size + 'px ' + (fam || FONT);
    ctx.fillStyle = col;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }
  function wheel(ctx, cx, cy, r) {
    oval(ctx, '#232328', cx - r, cy - r, 2 * r, 2 * r);
    oval(ctx, '#c0c0c0', cx - r * 0.45, cy - r * 0.45, r * 0.9, r * 0.9);
  }

  // A 20-foot container, drawn from its bottom-left corner.
  function container(ctx, x, yb, col, label) {
    box(ctx, col, x, yb - 26, 64, 26);
    const rib = shade(col, 0.78);
    for (let i = 1; i < 10; i++) line(ctx, rib, 1, x + i * 6.4, yb - 25, x + i * 6.4, yb - 1);
    ctx.strokeStyle = shade(col, 0.55); ctx.lineWidth = 1.5; ctx.strokeRect(x, yb - 26, 64, 26);
    if (label) text(ctx, label, x + 32, yb - 13, 9, '#fff', true);
  }

  // The cargo box: a container (sea) or a ULD (air), drawn from its bottom-centre.
  function cargoBox(ctx, scn, cx, yb) {
    if (!scn.cfg.air) {
      if (scn.reefer) {
        container(ctx, cx - 32, yb, '#ebeef2', null);
        box(ctx, '#3c465a', cx + 22, yb - 24, 9, 22);
        text(ctx, 'REEFER', cx - 4, yb - 13, 9, '#285aa0', true);
      } else container(ctx, cx - 32, yb, scn.boxCol, scn.boxLabel);
    } else if (scn.cfg.load === 1) {
      poly(ctx, '#c8cdd6', [cx - 32, yb - 14, cx - 24, yb, cx + 32, yb, cx + 32, yb - 32, cx - 32, yb - 32], '#6e737d', 1.5);
      text(ctx, 'AKE', cx + 4, yb - 16, 11, '#464b5a', true);
    } else {
      fillRR(ctx, scn.cargoCol, cx - 30, yb - 30, 60, 27, 8);
      for (let i = 1; i < 6; i++) line(ctx, 'rgba(60,60,60,0.35)', 1, cx - 30 + i * 10, yb - 30, cx - 30 + i * 10, yb - 3);
      line(ctx, 'rgba(60,60,60,0.35)', 1, cx - 30, yb - 16, cx + 30, yb - 16);
      box(ctx, '#aaafb9', cx - 32, yb - 4, 64, 4);
      text(ctx, 'PMC', cx, yb - 17, 11, '#3c3228', true);
    }
    if (scn.dg) dgLabel(ctx, cx - 18, yb - 13);
  }

  // Class 9 dangerous goods diamond.
  function dgLabel(ctx, cx, cy) {
    poly(ctx, '#fff', [cx, cy - 8, cx + 8, cy, cx, cy + 8, cx - 8, cy], '#000', 1);
    for (let i = -3; i <= 3; i += 2) line(ctx, '#000', 1, cx + i, cy - 6 + Math.abs(i), cx + i, cy - 1);
  }

  // Scissor lift drawn under a box that a forklift or K-loader is moving.
  function loader(ctx, cx, yb) {
    box(ctx, '#e6be28', cx - 34, yb, 68, 5);
    line(ctx, '#46464c', 2, cx - 28, yb + 5, cx + 28, 462);
    line(ctx, '#46464c', 2, cx + 28, yb + 5, cx - 28, 462);
    box(ctx, '#e6be28', cx - 34, 462, 68, 6);
  }

  // ---------- sky (drawn in view space, before the camera) ----------
  function cloud(ctx, x, y, s) {
    const c = 'rgba(255,255,255,0.88)';
    oval(ctx, c, x, y, 80 * s, 30 * s);
    oval(ctx, c, x + 18 * s, y - 14 * s, 50 * s, 34 * s);
    oval(ctx, c, x + 44 * s, y - 4 * s, 60 * s, 28 * s);
  }

  function drawSky(ctx, cam, now, viewW, viewH) {
    const g = ctx.createLinearGradient(0, 0, 0, 410);
    g.addColorStop(0, '#60aaeb');
    g.addColorStop(1, '#ceebfc');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, viewH);
    const sx = viewW - 230;
    oval(ctx, 'rgba(255,240,170,0.47)', sx, 56, 100, 100);
    oval(ctx, '#ffec8c', sx + 20, 76, 60, 60);
    const span = viewW + 900;
    for (let i = 0; i < 8; i++) {
      let cx = (i * 330 + now * (6 + i) - cam * 0.25) % span;
      if (cx < 0) cx += span;
      cloud(ctx, cx - 400, 70 + ((i * 53) % 150), 0.8 + (i % 3) * 0.25);
    }
    ctx.beginPath();
    ctx.moveTo(-10, 410);
    for (let x = -10; x <= viewW + 40; x += 40) {
      const wx = x + cam * 0.5;
      ctx.lineTo(x, 372 - 22 * Math.sin(wx * 0.006) - 12 * Math.sin(wx * 0.017 + 1));
    }
    ctx.lineTo(viewW + 40, 410);
    ctx.closePath();
    ctx.fillStyle = '#aacdbe';
    ctx.fill();
  }

  // ---------- ground, flags, trees ----------
  function palm(ctx, x) {
    line(ctx, '#785432', 7, x, 406, x + 6, 346);
    for (let i = 0; i < 5; i++) {
      const a = -2.6 + i * 0.55;
      line(ctx, '#288c3c', 5, x + 6, 346, x + 6 + Math.cos(a) * 34, 360 + Math.sin(a) * 18);
    }
  }
  function tree(ctx, x) { box(ctx, '#6e5032', x - 3, 370, 6, 36); oval(ctx, '#3c8c46', x - 22, 334, 44, 44); }
  function pine(ctx, x) {
    box(ctx, '#644628', x - 3, 392, 6, 14);
    for (let i = 0; i < 3; i++) poly(ctx, '#1e643c', [x - 20 + i * 4, 396 - i * 20, x + 20 - i * 4, 396 - i * 20, x, 364 - i * 20]);
  }

  function flag(ctx, x, which) {
    line(ctx, '#696969', 2, x, 336, x, 410);
    const fx = x + 1, fy = 336, w = 30, h = 19;
    if (which === 'brazil') {
      box(ctx, '#00963c', fx, fy, w, h);
      poly(ctx, '#ffd700', [fx + 15, fy + 2, fx + 28, fy + 9.5, fx + 15, fy + 17, fx + 2, fy + 9.5]);
      oval(ctx, '#4169e1', fx + 10, fy + 5, 10, 10);
    } else if (which === 'china') {
      box(ctx, '#dc1e1e', fx, fy, w, h);
      oval(ctx, '#ffd700', fx + 3, fy + 3, 7, 7);
    } else if (which === 'germany') {
      box(ctx, '#000', fx, fy, w, h / 3);
      box(ctx, '#dc1e1e', fx, fy + h / 3, w, h / 3);
      box(ctx, '#ffd700', fx, fy + (2 * h) / 3, w, h / 3);
    } else {
      box(ctx, '#e01e1e', fx, fy, 8, h);
      box(ctx, '#fff', fx + 8, fy, 14, h);
      box(ctx, '#e01e1e', fx + 22, fy, 8, h);
      oval(ctx, '#e01e1e', fx + 11, fy + 6, 8, 7);
    }
  }

  function apron(ctx, x, w) {
    box(ctx, '#b0b2ba', x, 400, w, 78);
    line(ctx, '#f0c828', 3, x + 10, 470, x + w - 10, 470);
    for (let k = x + 20; k < x + w - 20; k += 50) box(ctx, '#fff', k, 438, 26, 4);
  }

  function drawGround(ctx, w, cam, viewW) {
    const s = w.scn, A = s.coastA, B = s.coastB, W = s.worldW, air = s.cfg.air;
    box(ctx, '#7cc462', -700, 400, A + 700, 120);
    box(ctx, '#62ac68', B, 400, W + 700 - B, 120);
    const g = ctx.createLinearGradient(0, 396, 0, 520);
    g.addColorStop(0, '#4696d2');
    g.addColorStop(1, '#164886');
    ctx.fillStyle = g;
    ctx.fillRect(A, 396, B - A, 124);

    const cap = 'rgba(255,255,255,0.3)';
    text(ctx, s.country, Math.max(260, A / 2), 140, 80, cap, true, STENCIL);
    text(ctx, s.ocean, (A + B) / 2, 140, 80, cap, true, STENCIL);
    text(ctx, 'CANADA', B + 520, 140, 80, cap, true, STENCIL);

    for (let x = 10; x < A - 300; x += 330) { if (s.flag === 'brazil') palm(ctx, x); else tree(ctx, x); }
    for (let x = B + 420; x < W - 100; x += 290) pine(ctx, x);

    const slab = '#989aa2', road = '#5e626a';
    if (!air) {
      box(ctx, slab, A - 240, 400, 248, 34);
      box(ctx, slab, B - 8, 400, 290, 34);
    }
    box(ctx, road, -700, 436, A + 700, 42);
    box(ctx, road, B, 436, W + 700 - B, 42);
    if (air) { apron(ctx, A - 360, 360); apron(ctx, B, 380); }
    for (let x = Math.floor(cam / 70) * 70; x < cam + viewW + 70; x += 70) {
      if (x < A - 40 || x >= B) box(ctx, 'rgba(255,255,255,0.78)', x, 456, 34, 3);
    }

    if (s.railX0 >= 0) {
      for (let x = s.railX0; x < s.railX1; x += 14) box(ctx, '#785a3c', x, 420, 6, 10);
      line(ctx, '#46464c', 2, s.railX0, 422, s.railX1, 422);
      line(ctx, '#46464c', 2, s.railX0, 428, s.railX1, 428);
      box(ctx, slab, s.craneT - 170, 400, 340, 20);
    }

    const sc = s.place.scale;
    if (sc !== undefined) {
      box(ctx, '#46484e', sc - 80, 466, 160, 8);
      box(ctx, '#787880', sc - 69, 380, 6, 88);
      fillRR(ctx, '#183c28', sc - 65, 336, 130, 46, 6);
      text(ctx, 'WEIGHBRIDGE', sc, 347, 11, '#aadcbe', true);
      text(ctx, w.scaleKg.toLocaleString('en-CA') + ' kg', sc, 367, 22, '#78ff8c', true);
    }

    flag(ctx, A - (air ? 330 : 220), s.flag);
    flag(ctx, B + 80, 'canada');
  }

  // Style: 0 barn, 1 office, 2 warehouse, 3 government building with a flag.
  function drawBuilding(ctx, bd, hl, now) {
    const { x, w, h } = bd, y = 400 - h, c = bd.col;
    if (hl.has(bd.id)) {
      const a = (90 + 60 * Math.sin(now * 6)) / 255;
      fillRR(ctx, 'rgba(255,235,90,' + a.toFixed(3) + ')', x - 12, y - 40, w + 24, h + 52, 14);
    }
    box(ctx, c, x, y, w, h);
    box(ctx, shade(c, 0.8), x, y + h - 6, w, 6);
    if (bd.style === 0) {
      poly(ctx, shade(c, 0.65), [x - 8, y + 2, x + w / 2, y - 38, x + w + 8, y + 2]);
      box(ctx, '#fff', x + w / 2 - 22, y + h - 44, 44, 44);
      const d = shade(c, 0.5);
      ctx.strokeStyle = d; ctx.lineWidth = 3; ctx.strokeRect(x + w / 2 - 22, y + h - 44, 44, 44);
      line(ctx, d, 3, x + w / 2 - 22, y + h - 44, x + w / 2 + 22, y + h);
      line(ctx, d, 3, x + w / 2 + 22, y + h - 44, x + w / 2 - 22, y + h);
    } else {
      box(ctx, shade(c, 0.6), x - 4, y - 6, w + 8, 8);
      if (bd.style === 2) {
        for (let k = 0; k < 2; k++) {
          const dx = k === 0 ? x + 14 : x + w - 54;
          box(ctx, '#96969e', dx, y + h - 40, 40, 40);
          for (let r = 1; r < 5; r++) line(ctx, '#6e6e76', 1, dx, y + h - 40 + r * 8, dx + 40, y + h - 40 + r * 8);
        }
      } else {
        box(ctx, shade(c, 0.55), x + w / 2 - 8, y + h - 24, 16, 24);
        box(ctx, '#dcf0ff', x + 8, y + 36, 14, 10);
        box(ctx, '#dcf0ff', x + w - 22, y + 36, 14, 10);
      }
    }
    const pw = Math.max(30, bd.sign.length * 11 + 14);
    const py = bd.style === 0 ? y - 14 : y + 8;
    fillRR(ctx, '#fff', x + w / 2 - pw / 2, py, pw, 24, 6);
    text(ctx, bd.sign, x + w / 2, py + 12, 15, shade(c, 0.45), true);
    if (bd.style === 3) flag(ctx, x + w - 8, 'canada');
  }

  function drawLabel(ctx, id, s, cx, hl, ls) {
    const size = 14 * ls;
    if (hl.has(id)) {
      ctx.font = '700 ' + size + 'px ' + FONT;
      const tw = ctx.measureText(s).width;
      fillRR(ctx, 'rgba(255,235,100,0.92)', cx - tw / 2 - 5, 490 - size * 0.8, tw + 10, size * 1.6, 6);
    }
    text(ctx, s, cx, 490, size, '#1c341e', true);
  }

  // ---------- sea ----------
  function seaLayer(ctx, scn, cam, viewW, now, back) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(scn.coastA, 380, scn.coastB - scn.coastA, 140);
    ctx.clip();
    const x0 = cam - 30, yb = back ? 404 : 414, amp = back ? 3 : 4, sp = back ? 1.6 : -1.3, ph = back ? 0 : 2;
    ctx.beginPath();
    ctx.moveTo(x0, 530);
    for (let x = x0; x <= x0 + viewW + 70; x += 20) ctx.lineTo(x, yb + amp * Math.sin(x * 0.021 + now * sp + ph));
    ctx.lineTo(x0 + viewW + 70, 530);
    ctx.closePath();
    ctx.fillStyle = back ? 'rgba(100,180,230,0.47)' : 'rgba(24,86,150,0.59)';
    ctx.fill();
    ctx.restore();
  }

  function ship(ctx, w, pr, now) {
    const scn = w.scn;
    const bob = pr.moving ? Math.sin(now * 1.7 + pr.x * 0.01) * 3 : 0;
    const ang = pr.moving ? Math.sin(now * 1.2) * 1.6 : 0;
    ctx.save();
    ctx.translate(pr.x, 400 + bob);
    ctx.rotate((ang * Math.PI) / 180);
    container(ctx, -58, -18, FILLER[0], null);
    container(ctx, 8, -18, FILLER[1], null);
    container(ctx, -58, -44, FILLER[2], null);
    if (w.boxAt === pr.id) cargoBox(ctx, scn, 40, -44);
    else container(ctx, 8, -44, FILLER[3], null);
    poly(ctx, '#1c2c52', [-97, -18, 102, -18, 80, 8, -90, 8]);
    poly(ctx, '#b02628', [-92, -2, 89, -2, 80, 8, -90, 8]);
    box(ctx, '#fff', -97, -20, 199, 3);
    text(ctx, scn.cfg.air ? '' : scn.boxLabel, 0, -10, 11, '#fff', true);
    box(ctx, '#fff', -94, -54, 30, 36);
    box(ctx, '#283c5a', -90, -48, 22, 7);
    box(ctx, scn.boxCol, -86, -66, 12, 12);
    box(ctx, '#1e1e1e', -86, -68, 12, 3);
    ctx.restore();
  }

  // ---------- plane ----------
  function plane(ctx, pr) {
    ctx.save();
    ctx.translate(pr.x, ROADY - pr.y);
    ctx.rotate((pr.ang * Math.PI) / 180);
    const body = '#f5f6fa', tail = '#c81e28', dark = '#464a56';
    poly(ctx, tail, [-128, -66, -152, -132, -122, -132, -88, -66]);
    if (pr.y < 60) {
      line(ctx, dark, 3, -30, -34, -30, -8);
      line(ctx, dark, 3, 118, -34, 118, -8);
      wheel(ctx, -38, -8, 8); wheel(ctx, -20, -8, 8); wheel(ctx, 118, -7, 7);
    }
    fillRR(ctx, body, -152, -84, 290, 52, 24);
    oval(ctx, body, 104, -84, 62, 52);
    box(ctx, tail, -150, -52, 296, 4);
    for (let i = 0; i < 14; i++) box(ctx, '#78aadc', -116 + i * 16, -72, 7, 7);
    poly(ctx, dark, [140, -76, 156, -70, 158, -62, 140, -62]);
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.strokeRect(-62, -78, 34, 42);
    poly(ctx, '#bec2cc', [-36, -50, 48, -50, -6, -30, -70, -30]);
    oval(ctx, '#969ba8', -26, -42, 52, 20);
    text(ctx, 'CARGO', 40, -46, 11, tail, true);
    ctx.restore();
  }

  // Port or rail-terminal crane. If a transfer is using it, the trolley follows the box.
  function crane(ctx, w, x, id) {
    const c = '#e87a28', d = '#aa5519';
    const use = w.craneUse[id];
    const tx = use ? use.x : x, hy = use ? use.y : 300;
    box(ctx, c, x - 17, 262, 8, 163);
    box(ctx, c, x + 9, 262, 8, 163);
    line(ctx, d, 3, x - 13, 425, x + 13, 300);
    line(ctx, d, 3, x + 13, 425, x - 13, 300);
    box(ctx, c, x - 170, 262, 340, 9);
    line(ctx, d, 2, x, 230, x - 166, 262);
    line(ctx, d, 2, x, 230, x + 166, 262);
    box(ctx, d, x - 8, 230, 16, 34);
    box(ctx, '#3c3c42', tx - 11, 271, 22, 8);
    line(ctx, '#1e1e1e', 1.5, tx - 10, 279, tx - 10, hy);
    line(ctx, '#1e1e1e', 1.5, tx + 10, 279, tx + 10, hy);
    box(ctx, '#46464c', tx - 14, hy, 28, 5);
  }

  function train(ctx, w, pr) {
    const f = pr.x, ex = f - 70;
    box(ctx, '#c42428', ex, 390, 70, 28);
    box(ctx, '#96181c', f - 28, 378, 28, 40);
    box(ctx, '#c8e6fa', f - 22, 384, 16, 12);
    box(ctx, '#fadc3c', ex, 406, 70, 3);
    text(ctx, 'CPKC', ex + 24, 398, 11, '#fff', true);
    wheel(ctx, ex + 12, 421, 5.5); wheel(ctx, ex + 34, 421, 5.5); wheel(ctx, ex + 56, 421, 5.5);
    for (let k = 1; k <= 2; k++) {
      const cx = f - 70 - 76 * k;
      box(ctx, '#3c3c42', cx, 412, 74, 6);
      box(ctx, '#28282c', cx + 74, 414, 2, 3);
      wheel(ctx, cx + 14, 421, 5); wheel(ctx, cx + 60, 421, 5);
      if (k === 1) container(ctx, cx + 5, 412, FILLER[3], null);
      else if (w.boxAt === pr.id) cargoBox(ctx, w.scn, cx + 37, 412);
    }
  }

  // Kind 0 straight truck, 1 tractor + chassis, 5 tug + dolly. Mirrored when driving left.
  function vehicle(ctx, w, pr) {
    const x = pr.x, yb = ROADY;
    const len = pr.kind === 0 ? 104 : pr.kind === 5 ? 110 : 116;
    const dark = '#30323a';
    ctx.save();
    if (pr.dir < 0) { ctx.translate(2 * x + len, 0); ctx.scale(-1, 1); }
    if (pr.kind === 0) {
      box(ctx, dark, x, yb - 16, 104, 5);
      box(ctx, '#96693c', x, yb - 30, 74, 10);
      for (let j = 0; j < pr.cargo; j++) {
        const sx = x + 3 + (j % 4) * 18, sy = yb - 41 - Math.floor(j / 4) * 11;
        fillRR(ctx, w.scn.cargoCol, sx, sy, 17, 11, 3);
        strokeRR(ctx, 'rgba(90,60,40,0.47)', 1, sx, sy, 17, 11, 3);
      }
      poly(ctx, '#e87a22', [x + 76, yb - 16, x + 76, yb - 48, x + 94, yb - 48, x + 104, yb - 32, x + 104, yb - 16]);
      poly(ctx, '#cde8fa', [x + 85, yb - 44, x + 93, yb - 44, x + 100, yb - 33, x + 85, yb - 33]);
      wheel(ctx, x + 16, yb - 8, 8); wheel(ctx, x + 34, yb - 8, 8); wheel(ctx, x + 90, yb - 8, 8);
    } else if (pr.kind === 5) {
      box(ctx, dark, x, yb - 20, 70, 6);
      wheel(ctx, x + 12, yb - 7, 6); wheel(ctx, x + 58, yb - 7, 6);
      line(ctx, dark, 3, x + 70, yb - 16, x + 80, yb - 16);
      box(ctx, '#e6be28', x + 78, yb - 32, 32, 20);
      ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.strokeRect(x + 92, yb - 46, 14, 14);
      wheel(ctx, x + 85, yb - 8, 7); wheel(ctx, x + 103, yb - 8, 7);
    } else {
      box(ctx, dark, x, yb - 17, 78, 5);
      box(ctx, '#c0c0c0', x + 46, yb - 12, 3, 9);
      wheel(ctx, x + 12, yb - 7, 7); wheel(ctx, x + 27, yb - 7, 7);
      box(ctx, dark, x + 60, yb - 17, 54, 6);
      poly(ctx, '#225cb0', [x + 80, yb - 17, x + 80, yb - 50, x + 102, yb - 50, x + 114, yb - 34, x + 114, yb - 17]);
      poly(ctx, '#cde8fa', [x + 86, yb - 46, x + 100, yb - 46, x + 108, yb - 35, x + 86, yb - 35]);
      box(ctx, '#c0c0c0', x + 82, yb - 62, 4, 14);
      oval(ctx, '#ffd700', x + 110, yb - 28, 6, 6);
      wheel(ctx, x + 70, yb - 8, 8); wheel(ctx, x + 84, yb - 8, 8); wheel(ctx, x + 104, yb - 8, 8);
    }
    ctx.restore();
    if (w.boxAt === pr.id) {
      const [bx, by] = w.anchor(pr.id);
      cargoBox(ctx, w.scn, bx, by);
    }
  }

  // ---------- documents, coins, pallets, tags, stamps ----------
  function doc(ctx, d) {
    if (d.k === 1) {
      box(ctx, d.c, d.x - 9, d.y - 8, 18, 12);
      box(ctx, '#8c643c', d.x - 10, d.y + 4, 20, 4);
      return;
    }
    if (d.k === 2) {
      oval(ctx, '#ffd700', d.x - 13, d.y - 13, 26, 26);
      ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(d.x, d.y, 13, 0, Math.PI * 2); ctx.stroke();
      text(ctx, '$', d.x, d.y + 1, 18, '#b8860b', true);
      return;
    }
    box(ctx, 'rgba(0,0,0,0.24)', d.x - 15, d.y - 18, 36, 44);
    box(ctx, '#fff', d.x - 18, d.y - 22, 36, 44);
    box(ctx, d.c, d.x - 18, d.y - 22, 36, 13);
    ctx.strokeStyle = '#5a5a5a'; ctx.lineWidth = 1; ctx.strokeRect(d.x - 18, d.y - 22, 36, 44);
    text(ctx, d.l, d.x, d.y - 15, 10, '#fff', true);
    for (let i = 0; i < 3; i++) line(ctx, '#aaa', 1, d.x - 12, d.y - 2 + i * 7, d.x + 12, d.y - 2 + i * 7);
  }

  // A label on a stick. lift > 0 floats the label above the point, lift < 0 hangs it below.
  function tag(ctx, t, ts) {
    const size = 14 * ts, h = 24 * ts;
    ctx.font = '700 ' + size + 'px ' + FONT;
    const w = ctx.measureText(t.t).width + 12 * ts;
    const lift = t.lift > 0 ? t.lift : t.lift;
    const boxY = lift > 0 ? t.y - lift - h : t.y - lift;
    const lineY = lift > 0 ? boxY + h : boxY;
    const dk = '#323846';
    line(ctx, dk, 1.5, t.x, lineY, t.x, t.y);
    oval(ctx, dk, t.x - 3, t.y - 3, 6, 6);
    fillRR(ctx, 'rgba(255,255,255,0.96)', t.x - w / 2, boxY, w, h, 7);
    strokeRR(ctx, dk, 1.5, t.x - w / 2, boxY, w, h, 7);
    text(ctx, t.t, t.x, boxY + h / 2 + 1, size, dk, true);
  }

  function pulse(ctx, w) {
    const a = w.pulse;
    if (!a) return;
    const pos = (t) => [lp(a.x0, a.x1, t), lp(a.y, a.y2, t) - a.lift * Math.sin(Math.PI * t)];
    for (let k = 10; k >= 1; k--) {
      const tk = w.pulseF - k * 0.006;
      if (tk < 0) continue;
      const [px, py] = pos(tk);
      oval(ctx, 'rgba(255,240,120,' + ((18 + (10 - k) * 6) / 255).toFixed(3) + ')', px - 7, py - 7, 14, 14);
    }
    const [px, py] = pos(w.pulseF);
    oval(ctx, 'rgba(255,240,120,0.35)', px - 26, py - 26, 52, 52);
    box(ctx, '#fff', px - 18, py - 12, 36, 24);
    ctx.strokeStyle = '#696969'; ctx.lineWidth = 1.5; ctx.strokeRect(px - 18, py - 12, 36, 24);
    line(ctx, '#696969', 1.5, px - 18, py - 12, px, py + 2);
    line(ctx, '#696969', 1.5, px + 18, py - 12, px, py + 2);
    text(ctx, a.s, px, py - 34, 14, '#142850', true);
  }

  function stamp(ctx, w) {
    if (!w.stamp || w.stampT <= 0) return;
    const s = 1 + (1 - w.stampT) * 2;
    const a = Math.min(1, w.stampT * 1.5);
    ctx.save();
    ctx.translate(w.stampX, w.stampY);
    ctx.rotate((-8 * Math.PI) / 180);
    ctx.scale(s, s);
    ctx.font = '700 38px ' + STENCIL;
    const tw = ctx.measureText(w.stamp).width;
    const bw = tw + 30, bh = 50;
    fillRR(ctx, 'rgba(255,255,255,' + (a * 0.85).toFixed(3) + ')', -bw / 2, -bh / 2, bw, bh, 8);
    strokeRR(ctx, 'rgba(200,30,30,' + a.toFixed(3) + ')', 5, -bw / 2, -bh / 2, bw, bh, 8);
    text(ctx, w.stamp, 0, 2, 38, 'rgba(200,30,30,' + a.toFixed(3) + ')', true, STENCIL);
    ctx.restore();
  }

  function confetti(ctx, cam, viewW, now) {
    const span = Math.max(1, Math.round(viewW));
    for (let i = 0; i < 90; i++) {
      const x = cam + ((i * 97) % span) + 12 * Math.sin(now * 3 + i);
      const y = (now * (60 + (i % 5) * 20) + i * 37) % 520;
      box(ctx, CONFETTI[i % 6], x, y, 8, 5);
    }
  }

  // Everything in the world, back to front. ctx is already scaled so the scene is 500 units tall.
  // ts enlarges labels and tags on small screens so they stay readable.
  function drawWorld(ctx, w, cam, now, viewW, viewH, ts) {
    const scn = w.scn;
    drawSky(ctx, cam, now, viewW, viewH);
    ctx.save();
    ctx.translate(-cam, 0);
    drawGround(ctx, w, cam, viewW);
    for (const bd of scn.bldgs) drawBuilding(ctx, bd, w.hl, now);
    const ls = Math.min(ts, 1.25);
    for (const bd of scn.bldgs) drawLabel(ctx, bd.id, bd.label, bd.x + bd.w / 2, w.hl, ls);
    for (const l of scn.labels) drawLabel(ctx, l.id, l.text, l.x, w.hl, ls);
    for (const p of w.order) if (p.kind === 6 && p.visible && w.boxAt === p.id) cargoBox(ctx, scn, p.x, p.y);
    seaLayer(ctx, scn, cam, viewW, now, true);
    for (const p of w.order) if (p.kind === 2 && p.visible) ship(ctx, w, p, now);
    seaLayer(ctx, scn, cam, viewW, now, false);
    if (scn.craneA >= 0) crane(ctx, w, scn.craneA, 'craneA');
    if (scn.craneB >= 0) crane(ctx, w, scn.craneB, 'craneB');
    if (scn.craneT >= 0) crane(ctx, w, scn.craneT, 'craneT');
    for (const p of w.order) if (p.kind === 4 && p.visible) train(ctx, w, p);
    for (const p of w.order) if (p.kind === 3 && p.visible) plane(ctx, p);
    for (const p of w.order) if ((p.kind === 0 || p.kind === 1 || p.kind === 5) && p.visible) vehicle(ctx, w, p);
    if (w.boxMoving) {
      if (w.boxLift) loader(ctx, w.boxX, w.boxY);
      cargoBox(ctx, scn, w.boxX, w.boxY);
    }
    for (const d of w.docs) doc(ctx, d);
    pulse(ctx, w);
    stamp(ctx, w);
    for (const t of w.tags) tag(ctx, t, ts);
    if (w.confetti) confetti(ctx, cam, viewW, now);
    ctx.restore();
  }

  CV.Render = { drawWorld };
})(globalThis.CV = globalThis.CV || {});
