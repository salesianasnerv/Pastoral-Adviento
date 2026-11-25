/* PRESENTE · Adviento 2026 · «Caja a tu medida»
   Genera en el navegador el revestimiento de cualquier caja (cuatro caras = cuatro semanas, y arriba
   la tapa, el cartel PRESENTE de pie o una lámina plana) en PDF a tamaño real o en hojas A3/A4.
   Mismo diseño que la caja de los pasillos y la del recibidor (fuentes Python en el proyecto). */
(function () {
  'use strict';
  var app = document.getElementById('medida-app');
  if (!app) return;
  var BASE = 'medida/';
  var JSPDF = BASE + 'jspdf.umd.min.js';   // jsPDF 2.5.1 (MIT), copia local
  var F = 'FiraCaja';

  var INK = '#1d2c33', MUTED = '#5a6d75', CREAM = '#fbf8f1', LINE = '#dbe5e8';
  var MORADO = '#5b3a8c', ROSA = '#e0559a', LLAMA = '#ffc000', LLAMA_IN = '#ee712a', CORONA = '#737800';
  var WEEKS = [
    { n: 1, ord: '1ª SEMANA', fechas: '30 NOV – 4 DIC', word: 'ESTAR', sub: 'presente', cita: '«Estad atentos, vigilad»', ref: 'MC 13, 33', trama: 'azul', color: '#3490b0', ink: '#22708c' },
    { n: 2, ord: '2ª SEMANA', fechas: '9 – 11 DIC', word: 'HACERSE', sub: 'presente', cita: '«Preparad el camino del Señor»', ref: 'MC 1, 3', trama: 'verde', color: '#b6bc00', ink: '#737800' },
    { n: 3, ord: '3ª SEMANA', fechas: '14 – 18 DIC', word: 'DESCUBRIR', sub: 'al Presente', cita: '«En medio de vosotros hay uno que no conocéis»', ref: 'JN 1, 26', trama: 'naranja', color: '#ee712a', ink: '#c4531a' },
    { n: 4, ord: '4ª SEMANA', fechas: '21 – 22 DIC', word: 'RESPONDER', sub: '¡Presente!', cita: '«He aquí la esclava del Señor»', ref: 'LC 1, 38', trama: 'amarillo', color: '#ffc000', ink: '#8a6800' }
  ];
  var LADOS = ['Frente', 'Lado derecho', 'Atrás', 'Lado izquierdo'];

  // ------------------------------------------------------------------ recursos
  var R = { tramas: null, logo: null, logos: {}, ready: null };
  function load() {
    if (R.ready) return R.ready;
    var faces = [['Regular', '400', 'normal'], ['Italic', '400', 'italic'], ['Bold', '700', 'normal'], ['ExtraBold', '800', 'normal']]
      .map(function (f) {
        var ff = new FontFace(F, 'url(' + BASE + 'fonts/FiraSans-' + f[0] + '.ttf)', { weight: f[1], style: f[2] });
        return ff.load().then(function (x) { document.fonts.add(x); });
      });
    var tr = fetch(BASE + 'tramas.json').then(function (r) { return r.json(); }).then(function (j) {
      R.tramas = {};
      Object.keys(j).forEach(function (k) {
        R.tramas[k] = j[k].map(function (L) {
          if (!L.p) return { c: L.c, path: null };
          var p = new Path2D();
          L.p.forEach(function (poly) {
            p.moveTo(poly[0], 1000 - poly[1]);
            for (var i = 2; i < poly.length; i += 2) p.lineTo(poly[i], 1000 - poly[i + 1]);
            p.closePath();
          });
          return { c: L.c, path: p };
        });
      });
    });
    var lg = new Promise(function (ok, ko) {
      var im = new Image();
      im.onload = function () { R.logo = im; ok(); };
      im.onerror = ko;
      im.src = BASE + 'logo_mono.png';
    });
    R.ready = Promise.all(faces.concat([tr, lg]));
    return R.ready;
  }
  function logo(color) {
    if (R.logos[color]) return R.logos[color];
    var c = document.createElement('canvas');
    c.width = R.logo.width; c.height = R.logo.height;
    var x = c.getContext('2d');
    x.drawImage(R.logo, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return (R.logos[color] = c);
  }
  var LOGO_AR = 438 / 1400;

  // ------------------------------------------------------------------ texto (fuente a 100 px y escala: evita redondeos)
  var mctx = document.createElement('canvas').getContext('2d');
  function font(w, it) { return (it ? 'italic ' : '') + w + ' 100px ' + F; }
  function tw(txt, w, it, size) { mctx.font = font(w, it); return mctx.measureText(txt).width * size / 100; }
  function text(ctx, txt, x, y, w, it, size, color, align) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 100, size / 100);
    ctx.font = font(w, it); ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(txt, 0, 0); ctx.restore();
  }
  function spacedW(txt, w, size, track) { var s = 0; for (var i = 0; i < txt.length; i++) s += tw(txt[i], w, false, size); return s + track * size * (txt.length - 1); }
  function spaced(ctx, txt, x, y, w, size, track, color, align) {
    var tot = spacedW(txt, w, size, track);
    if (align !== 'left') x -= tot / 2;
    for (var i = 0; i < txt.length; i++) { text(ctx, txt[i], x, y, w, false, size, color); x += tw(txt[i], w, false, size) + track * size; }
    return tot;
  }
  function wrap(txt, size, maxw) {
    var words = txt.split(' '), lines = [], cur = '';
    words.forEach(function (w) { var t = (cur + ' ' + w).trim(); if (tw(t, 400, true, size) <= maxw) cur = t; else { lines.push(cur); cur = w; } });
    lines.push(cur);
    if (lines.length === 2) {
      var best = null;
      for (var i = 1; i < words.length; i++) {
        var a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
        var m = Math.max(tw(a, 400, true, size), tw(b, 400, true, size));
        if (m <= maxw && (!best || m < best[0])) best = [m, [a, b]];
      }
      if (best) lines = best[1];
    }
    return lines;
  }

  // ------------------------------------------------------------------ dibujo (unidades: cm; y hacia abajo)
  function trama(ctx, key, W, H, bleed, sx, sy) {
    var side = Math.max(W, H) + 2 * bleed;
    var x0 = -(side - W) / 2 - (sx || 0) * side, y0 = -(side - H) / 2 + (sy || 0) * side;
    ctx.save();
    ctx.beginPath(); ctx.rect(-bleed, -bleed, W + 2 * bleed, H + 2 * bleed); ctx.clip();
    ctx.translate(x0, y0); ctx.scale(side / 1000, side / 1000);
    R.tramas[key].forEach(function (L) {
      ctx.fillStyle = L.c;
      if (!L.path) ctx.fillRect(-1, -1, 1002, 1002); else ctx.fill(L.path, 'evenodd');
    });
    ctx.restore();
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function card(ctx, U, x, y, w, h) {   // (x,y) arriba a la izquierda
    var r = U * 0.028;
    ctx.fillStyle = 'rgba(13,26,31,0.18)'; rrect(ctx, x + U * 0.006, y + U * 0.009, w, h, r); ctx.fill();
    ctx.fillStyle = CREAM; rrect(ctx, x, y, w, h, r); ctx.fill();
  }
  function candles(ctx, cx, yb, h, lit) {   // yb = base de las velas
    var w = h * 0.16, gap = h * 0.30, cols = [MORADO, MORADO, ROSA, MORADO], x0 = cx - 1.5 * gap;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = CORONA; ctx.lineWidth = h * 0.05;
    ctx.beginPath(); ctx.moveTo(x0 - gap * 0.75, yb - h * 0.04);
    ctx.bezierCurveTo(x0, yb + h * 0.10, x0 + 3 * gap, yb + h * 0.10, x0 + 3 * gap + gap * 0.75, yb - h * 0.04); ctx.stroke();
    var body = h * 0.62;
    for (var i = 0; i < 4; i++) {
      var x = x0 + i * gap;
      ctx.fillStyle = cols[i]; rrect(ctx, x - w / 2, yb - body, w, body, w * 0.18); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = h * 0.018; ctx.beginPath(); ctx.moveTo(x, yb - body); ctx.lineTo(x, yb - body - h * 0.05); ctx.stroke();
      if (i < lit) {
        var fy = yb - body - h * 0.04, fh = h * 0.30;
        [[LLAMA, 1], [LLAMA_IN, 0.55]].forEach(function (f) {
          var s = f[1], fw = w * 0.62 * s;
          ctx.fillStyle = f[0]; ctx.beginPath(); ctx.moveTo(x, fy - fh * s);
          ctx.bezierCurveTo(x + fw * 0.2, fy - fh * s * 0.6, x + fw, fy - fh * s * 0.25, x, fy);
          ctx.bezierCurveTo(x - fw, fy - fh * s * 0.25, x - fw * 0.2, fy - fh * s * 0.6, x, fy - fh * s); ctx.fill();
        });
      }
    }
    ctx.restore();
  }
  function drawLogo(ctx, x, yb, h, color, align) {
    var w = h / LOGO_AR;
    if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
    ctx.drawImage(logo(color), x, yb - h, w, h);
    return w;
  }

  var WORD_K = null;
  function wordK() {
    if (WORD_K) return WORD_K;
    WORD_K = Math.min.apply(null, WEEKS.map(function (w) { return 0.68 / (spacedW(w.word, 800, 1, 0) + 0.02 * (w.word.length - 1)); }));
    return WORD_K;
  }

  // Bloque central de una cara: lista de piezas con su alto (como en recibidor.py)
  function blocks(wk, U, cw) {
    var qsize = U * 0.058, ws = U * wordK();
    var q = wrap(wk.cita, qsize, cw * 0.82);
    var parts = [['lbl', U * 0.036], ['gap', U * 0.060], ['word', ws * 0.74], ['gap', U * 0.050], ['sub', U * 0.088 * 0.74], ['gap', U * 0.065], ['rule', U * 0.009], ['gap', U * 0.075]];
    q.forEach(function (_, i) { parts.push(['q' + i, qsize * 0.74]); parts.push(['qgap', qsize * 0.60]); });
    parts[parts.length - 1] = ['gap', U * 0.040];
    parts.push(['ref', U * 0.028 * 0.74]);
    return { parts: parts, q: q, qsize: qsize, ws: ws };
  }
  function sum(parts) { return parts.reduce(function (a, p) { return a + p[1]; }, 0); }
  var FOOT = 0.20, PAD = 0.06, BOT = 0.11, TOP = 0.075;
  function cardW(W, U) { return Math.min(W - 0.17 * U, 1.25 * U); }
  function minFaceH(W, U, top) {
    return WEEKS.reduce(function (m, wk) {
      var b = blocks(wk, U, cardW(W, U));
      return Math.max(m, top + BOT * U + 2 * PAD * U + sum(b.parts) + FOOT * U);
    }, 0);
  }

  function face(ctx, W, H, wk, bleed, cfg) {
    var U = cfg.U, top = cfg.top;
    trama(ctx, wk.trama, W, H, bleed);
    var cw = cardW(W, U), x0 = (W - cw) / 2, x1 = x0 + cw;
    var b = blocks(wk, U, cw);
    var yTop = top, yBot = H - BOT * U, avail = yBot - yTop;
    var need = 2 * PAD * U + sum(b.parts) + FOOT * U;
    var ch = Math.max(need, Math.min(avail, 1.55 * U));
    var cy0 = yTop + (avail - ch) * 0.35;           // si sobra mucho, la tarjeta queda algo más arriba
    card(ctx, U, x0, cy0, cw, ch);
    var cy1 = cy0 + ch;
    // pie
    ctx.strokeStyle = LINE; ctx.lineWidth = U * 0.0015;
    ctx.beginPath(); ctx.moveTo(x0 + U * 0.05, cy1 - FOOT * U); ctx.lineTo(x1 - U * 0.05, cy1 - FOOT * U); ctx.stroke();
    var fy = cy1 - U * 0.055, lh = U * 0.075;
    var lw = drawLogo(ctx, x0 + U * 0.05, fy, lh, wk.ink);
    var tx = x0 + U * 0.05 + lw + U * 0.03;
    spaced(ctx, 'PRESENTE', tx, fy - lh * 0.56, 700, U * 0.020, 0.12, INK, 'left');
    var tl = 'Aquí y ahora te esperamos, ven Señor';
    if (tx + tw(tl, 400, true, U * 0.0155) < x1 - U * 0.17) text(ctx, tl, tx, fy - lh * 0.18, 400, true, U * 0.0155, MUTED);
    candles(ctx, x1 - U * 0.095, fy - U * 0.004, U * 0.10, wk.n);
    // bloque central (el espacio que sobra se reparte entre los huecos)
    var free = ch - need;
    var gaps = b.parts.filter(function (p) { return p[0] === 'gap'; }).length;
    var extra = free * 0.45 / gaps;
    var parts = b.parts.map(function (p) { return p[0] === 'gap' ? [p[0], p[1] + extra] : p; });
    var block = sum(parts);
    var y = cy0 + (ch - FOOT * U - block) / 2, cx = W / 2;
    parts.forEach(function (p) {
      var k = p[0]; y += p[1];
      if (k === 'lbl') spaced(ctx, wk.ord + '  ·  ' + wk.fechas, cx, y, 700, U * 0.036, 0.14, wk.ink);
      else if (k === 'word') spaced(ctx, wk.word, cx, y, 800, b.ws, 0.02, wk.ink);
      else if (k === 'sub') text(ctx, wk.sub, cx, y, 400, true, U * 0.088, INK, 'center');
      else if (k === 'rule') { ctx.fillStyle = wk.color; rrect(ctx, cx - U * 0.06, y - U * 0.009, U * 0.12, U * 0.009, U * 0.0045); ctx.fill(); }
      else if (k[0] === 'q' && k !== 'qgap') text(ctx, b.q[+k.slice(1)], cx, y, 400, true, b.qsize, INK, 'center');
      else if (k === 'ref') spaced(ctx, wk.ref, cx, y, 700, U * 0.028, 0.14, wk.ink);
    });
  }

  // Lámina de tapa con PRESENTE (tapa real o lámina plana)
  function lidCard(ctx, W, D, bleed) {
    trama(ctx, 'multi', W, D, bleed);
    var S = Math.min(W, D * 1.25), cx = W / 2, cy = D / 2;
    card(ctx, S, cx - 0.36 * S, cy - 0.24 * S, 0.72 * S, 0.48 * S);
    spaced(ctx, 'ADVIENTO 2026', cx, cy - 0.145 * S, 700, S * 0.030, 0.30, '#22708c');
    var size = S * 0.58 / tw('PRESENTE', 800, false, 1) * 0.94;
    spaced(ctx, 'PRESENTE', cx, cy - 0.005 * S, 800, size, 0.02, INK);
    ctx.fillStyle = '#ee712a'; rrect(ctx, cx - S * 0.055, cy + 0.03 * S - S * 0.008, S * 0.11, S * 0.008, S * 0.004); ctx.fill();
    text(ctx, '«Aquí y ahora te esperamos, ven Señor»', cx, cy + 0.095 * S, 400, true, S * 0.036, INK, 'center');
    drawLogo(ctx, cx, cy + 0.20 * S, S * 0.06, INK, 'center');
  }
  // Tapa-soporte del cartel de pie: trama + rótulo pequeño delante + ranuras
  function lidBoard(ctx, W, D, bleed, sg, marks) {
    trama(ctx, 'multi', W, D, bleed);
    var L = Math.min(W, D), cw = 0.5 * L, ch = 0.085 * L, cx = W / 2, y1 = D - 0.06 * L;
    card(ctx, L * 0.5, cx - cw / 2, y1 - ch, cw, ch);
    spaced(ctx, 'ADVIENTO 2026', cx, y1 - ch * 0.36, 700, L * 0.028, 0.30, '#22708c');
    if (!marks) return;
    var cy = D / 2;
    ctx.save();
    [cx - sg.w / 2 + sg.px, cx + sg.w / 2 - sg.px].forEach(function (sx) {
      var w = sg.tw + 0.4, h = sg.t + 0.2;
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(sx - w / 2, cy - h / 2, w, h);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.04; ctx.setLineDash([0.2, 0.14]); ctx.strokeRect(sx - w / 2, cy - h / 2, w, h); ctx.setLineDash([]);
      text(ctx, 'ranura · recortar', sx, cy - h / 2 - 0.4, 700, false, Math.max(0.5, Math.min(0.8, sg.tw * 0.08)), INK, 'center');
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.035; ctx.setLineDash([0.07, 0.2]);
    ctx.beginPath(); ctx.moveTo(cx - sg.w / 2, cy); ctx.lineTo(cx + sg.w / 2, cy); ctx.stroke();
    ctx.restore();
  }
  function sign(ctx, W, H, bleed) {
    trama(ctx, 'multi', W, H, bleed, 0, 0.18);
    var mx = H * 0.11, my = H * 0.12;
    card(ctx, H * 1.4, mx, my, W - 2 * mx, H - 2 * my);
    var cx = W / 2;
    spaced(ctx, 'ADVIENTO 2026', cx, H * 0.27, 700, H * 0.060, 0.30, '#22708c');
    var size = Math.min((W - 2 * mx) * 0.80 / (tw('PRESENTE', 800, false, 1) + 0.14), H * 0.40);
    spaced(ctx, 'PRESENTE', cx, H * 0.665, 800, size, 0.02, INK);
    ctx.fillStyle = '#ee712a'; rrect(ctx, cx - H * 0.10, H * 0.75 - H * 0.016, H * 0.20, H * 0.016, H * 0.008); ctx.fill();
  }
  function skirt(ctx, L, h, k, bleed) {
    ctx.save(); ctx.beginPath(); ctx.rect(-bleed, -bleed, L + 2 * bleed, h + 2 * bleed); ctx.clip();
    trama(ctx, 'multi', L, L, bleed, 0, (0.15 + 0.2 * k) - 1 + h / L);
    ctx.restore();
    var lw = Math.min(L * 0.42, h * 6), lh = h * 0.46, lx = (L - lw) / 2, ly = (h - lh) / 2;
    ctx.fillStyle = 'rgba(13,26,31,0.15)'; rrect(ctx, lx + h * 0.02, ly + h * 0.03, lw, lh, lh * 0.18); ctx.fill();
    ctx.fillStyle = CREAM; rrect(ctx, lx, ly, lw, lh, lh * 0.18); ctx.fill();
    var t = 'PRESENTE  ·  ADVIENTO 2026', size = lh * 0.34;
    while (spacedW(t, 700, size, 0.18) > lw * 0.88) size *= 0.95;
    spaced(ctx, t, L / 2, h / 2 + size * 0.35, 700, size, 0.18, INK);
  }

  // ------------------------------------------------------------------ piezas según la configuración
  function fmt(v) { var s = (Math.round(v * 10) / 10).toString().replace('.', ','); return s; }
  function build(c) {
    var W = c.w, H = c.h, D = c.d;
    var top = 0;
    if (c.tapa === 'si' && c.falda > 0) top = Math.min(c.falda, H * 0.4) + 1;
    var U = Math.min(W, D);
    for (var i = 0; i < 200; i++) {
      var t = top || TOP * U;
      if (minFaceH(W, U, t) <= H && minFaceH(D, U, t) <= H) break;
      U *= 0.97;
    }
    var cfg = { U: U, top: top || TOP * U };
    var P = [];
    [W, D, W, D].forEach(function (fw, i) {
      var wk = WEEKS[i];
      P.push({ key: 'cara' + (i + 1), W: fw, H: H, color: wk.color, name: 'Cara ' + (i + 1) + ' · ' + wk.word + ' ' + wk.sub + ' · ' + LADOS[i],
        draw: function (ctx, b) { face(ctx, fw, H, wk, b, cfg); } });
    });
    var sg = null;
    if (c.tapa === 'si') {
      var lw = c.tw, ld = c.td, f = c.falda;
      P.push({ key: 'tapa', W: lw, H: ld, color: INK, name: 'Tapa · parte de arriba', draw: function (ctx, b) { lidCard(ctx, lw, ld, b); } });
      if (f > 0) {
        [[lw, 'delante y detrás'], [ld, 'lados']].forEach(function (s, j) {
          P.push({ key: 'faldon' + j, W: s[0], H: f, color: INK, copies: 2, name: 'Faldón de la tapa · ' + s[1],
            draw: function (ctx, b) { skirt(ctx, s[0], f, j, b); } });
        });
      }
    } else if (c.tapa === 'cartel') {
      var sw = Math.max(10, W - Math.min(4, W * 0.06)), sh = Math.min(sw * 26 / 72, Math.max(8, H * 0.45));
      sg = { w: sw, h: sh, tw: Math.max(3, Math.min(sw * 0.14, 12)), th: Math.max(2.5, Math.min(sw * 0.07, 6)), t: 0.5 };
      sg.px = Math.min(sw * 0.18, sw / 2 - sg.tw);
      P.push({ key: 'tapa', W: W, H: D, color: INK, name: 'Tapa · se apoya encima de la caja', draw: function (ctx, b, m) { lidBoard(ctx, W, D, b, sg, m !== false); } });
      P.push({ key: 'cartel', W: sw, H: sh, color: INK, copies: 2, name: 'Cartel PRESENTE · una copia por cada cara', draw: function (ctx, b) { sign(ctx, sw, sh, b); } });
    } else if (c.tapa === 'lamina') {
      P.push({ key: 'tapa', W: W, H: D, color: INK, name: 'Lámina de arriba · PRESENTE', draw: function (ctx, b) { lidCard(ctx, W, D, b); } });
    }
    return { pieces: P, sign: sg, cfg: c };
  }

  // ------------------------------------------------------------------ render a canvas
  function render(piece, x0, y0, w, h, k, bleed) {
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
    ctx.save(); ctx.beginPath(); ctx.rect(-bleed, -bleed, piece.W + 2 * bleed, piece.H + 2 * bleed); ctx.clip();
    piece.draw(ctx, bleed);
    ctx.restore();
    return cv;
  }

  // ------------------------------------------------------------------ PDF
  var jsPDFp = null;
  function getPDF() {
    if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
    if (jsPDFp) return jsPDFp;
    jsPDFp = new Promise(function (ok, ko) {
      var s = document.createElement('script'); s.src = JSPDF; s.onload = function () { ok(window.jspdf.jsPDF); }; s.onerror = ko;
      document.head.appendChild(s);
    });
    return jsPDFp;
  }
  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }
  function cropMarks(doc, x, y, w, h, off, ln) {
    doc.setDrawColor(0); doc.setLineWidth(0.01);
    [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]].forEach(function (p) {
      doc.line(p[0] + p[2] * off, p[1], p[0] + p[2] * (off + ln), p[1]);
      doc.line(p[0], p[1] + p[3] * off, p[0], p[1] + p[3] * (off + ln));
    });
  }
  function newDoc(J, w, h) { return new J({ unit: 'cm', format: [w, h], orientation: w > h ? 'l' : 'p', compress: true }); }
  function addPage(doc, first, w, h) { if (!first.v) doc.addPage([w, h], w > h ? 'l' : 'p'); first.v = false; }
  function medidas(c) { return fmt(c.w) + ' × ' + fmt(c.h) + ' × ' + fmt(c.d) + ' cm'; }

  async function pdfReal(B, progress) {
    var J = await getPDF();
    var bleed = 0.3, slug = 1.5, dpi = 120, k = dpi / 2.54, doc = null, first = { v: true };
    var list = B.pieces;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var extra = p.key === 'cartel' ? B.sign.th + 1 : 0;
      var PW = p.W + 2 * (bleed + slug), PH = p.H + 2 * (bleed + slug) + extra;
      if (!doc) doc = newDoc(J, PW, PH);
      addPage(doc, first, PW, PH);
      var full = p.H + 2 * bleed, sw = p.W + 2 * bleed;
      var sh = Math.max(2, Math.floor(5e6 / (sw * k * k)));
      for (var y = 0; y < full; y += sh) {
        progress('Página ' + (i + 1) + ' de ' + list.length + '…');
        await tick();
        var hh = Math.min(sh + 0.05, full - y);
        var cv = render(p, -bleed, -bleed + y, sw, hh, k, bleed);
        doc.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', slug, slug + y, sw, hh, undefined, 'FAST');
      }
      cropMarks(doc, slug + bleed, slug + bleed, p.W, p.H, 0.3, 0.6);
      if (p.key === 'cartel') {
        doc.setDrawColor(90, 109, 117); doc.setLineDashPattern([0.2, 0.12], 0); doc.setLineWidth(0.02);
        var sg = B.sign, ox = slug + bleed, oy = slug + bleed + p.H;
        [sg.px, p.W - sg.px].forEach(function (sx) {
          doc.rect(ox + sx - sg.tw / 2, oy, sg.tw, sg.th);
          doc.setFontSize(9); doc.setTextColor(90, 109, 117);
          doc.text('pestaña del cartón pluma (sin papel)', ox + sx, oy + sg.th / 2, { align: 'center' });
        });
        doc.setLineDashPattern([], 0);
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(0);
      doc.text('PRESENTE · Caja a tu medida (' + medidas(B.cfg) + ') · ' + p.name + ' · ' + fmt(p.W) + ' × ' + fmt(p.H) + ' cm' +
        (p.copies ? ' · imprimir ' + p.copies + ' copias' : '') + ' · sangrado 3 mm · página ' + (i + 1) + '/' + list.length, slug + bleed, PH - 0.5);
    }
    return doc;
  }

  var PAPER = { A3: [29.7, 42], A4: [21, 29.7] };
  var OV = 1;
  function plan(W, H, paper) {
    var p = PAPER[paper], best = null;
    [['V', p[0] - 2.7, p[1] - 4], ['H', p[1] - 4, p[0] - 2.7]].forEach(function (o, oi) {
      var mw = o[1], mh = o[2];
      var cols = W <= mw ? 1 : Math.ceil((W - OV) / (mw - OV)), rows = H <= mh ? 1 : Math.ceil((H - OV) / (mh - OV));
      while (W / cols + (cols > 1 ? OV : 0) > mw) cols++;
      while (H / rows + (rows > 1 ? OV : 0) > mh) rows++;
      var cand = [cols * rows, oi, o[0], cols, rows];
      if (!best || cand[0] < best[0] || (cand[0] === best[0] && cand[1] < best[1])) best = cand;
    });
    return { o: best[2], cols: best[3], rows: best[4] };
  }
  var ROWS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function cover(doc, B, plans, total, paper) {
    var p = PAPER[paper], W = p[0], m = 2, y = 3, c = B.cfg;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(29, 44, 51); doc.text('PRESENTE', m, y);
    y += 1; doc.setFontSize(13); doc.setTextColor(34, 112, 140); doc.text('Caja a tu medida · hojas ' + paper, m, y);
    doc.setFillColor(238, 113, 42); doc.roundedRect(m, y + 0.4, 2.2, 0.2, 0.1, 0.1, 'F');
    y += 1.6;
    var small = paper === 'A4';
    function h(t) { doc.setFont('helvetica', 'bold'); doc.setFontSize(small ? 10.5 : 12); doc.setTextColor(34, 112, 140); doc.text(t, m, y); y += small ? 0.55 : 0.7; }
    function l(t, mut) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(small ? 8.5 : 10); doc.setTextColor(mut ? 90 : 29, mut ? 109 : 44, mut ? 117 : 51);
      doc.splitTextToSize(t, W - 2 * m - (mut ? 0.5 : 0)).forEach(function (s) { doc.text(s, m + (mut ? 0.5 : 0), y); y += small ? 0.42 : 0.5; });
    }
    h('Qué hay en este PDF');
    l('Caja de ' + fmt(c.w) + ' cm de ancho × ' + fmt(c.h) + ' cm de alto × ' + fmt(c.d) + ' cm de fondo. ' + (total - 1) + ' hojas ' + paper + ' más esta portada.');
    B.pieces.forEach(function (pc, i) {
      var pl = plans[i], n = pl.cols * pl.rows * (pc.copies || 1);
      l('·  ' + pc.name + ': ' + fmt(pc.W) + ' × ' + fmt(pc.H) + ' cm · ' + n + ' hoja' + (n > 1 ? 's' : '') + (pc.copies ? ' (' + pc.copies + ' copias)' : ''), true);
    });
    y += 0.3; h('Cómo imprimir');
    l(paper + ', en color y al 100 % (tamaño real, sin «ajustar a página»). Mejor en papel de 120-160 g o cartulina fina.');
    l('Cada hoja lleva arriba su nombre: fila A, B, C… de arriba abajo y columna 1, 2, 3… de izquierda a derecha.');
    y += 0.3; h('Cómo montar cada cara');
    l('1. Recorta cada hoja por sus marcas de corte. Las franjas claras de 1 cm quedan debajo de la hoja vecina.');
    l('2. Empieza por la fila A (arriba) y sigue hacia abajo, haciendo coincidir cada borde con la línea discontinua.');
    l('3. Pega cada cara directamente sobre la caja (cola blanca rebajada, barra o cinta de doble cara).');
    l('Orden, girando hacia la derecha: frente = cara 1 (ESTAR), lado derecho = cara 2 (HACERSE), atrás = cara 3 (DESCUBRIR), lado izquierdo = cara 4 (RESPONDER).');
    y += 0.3;
    if (c.tapa === 'si') {
      h('La tapa');
      l('Pega la lámina de la tapa encima' + (c.falda > 0 ? ' y los faldones alrededor (dos para delante y detrás, dos para los lados). Las caras dejan libre arriba la franja que tapa el faldón.' : '.'));
    } else if (c.tapa === 'cartel') {
      var s = B.sign;
      h('Tapa y cartel PRESENTE');
      l('Tapa: un cartón de ' + fmt(c.w) + ' × ' + fmt(c.d) + ' cm con su lámina pegada. Se apoya encima de la caja; para que no se mueva, pega por debajo unas tiras de cartón que encajen por dentro de las paredes.');
      l('Cartel: cartón pluma de 5 mm de ' + fmt(s.w) + ' × ' + fmt(s.h) + ' cm con dos pestañas abajo de ' + fmt(s.tw) + ' × ' + fmt(s.th) + ' cm (su centro a ' + fmt(s.px) + ' cm de cada extremo). Pega una lámina del cartel por cada cara.');
      l('Recorta las dos ranuras marcadas en la tapa, mete las pestañas y fíjalas por debajo con cinta americana.');
    } else if (c.tapa === 'lamina') {
      h('Arriba'); l('La lámina PRESENTE se pega sobre un cartón del tamaño de la caja que se apoya encima.');
    }
  }

  async function pdfMosaic(B, paper, progress) {
    var J = await getPDF();
    var plans = B.pieces.map(function (p) { return plan(p.W, p.H, paper); });
    var total = 1 + B.pieces.reduce(function (a, p, i) { return a + plans[i].cols * plans[i].rows * (p.copies || 1); }, 0);
    var P = PAPER[paper], doc = newDoc(J, P[0], P[1]);
    cover(doc, B, plans, total, paper);
    var k = 150 / 2.54, hoja = 2;
    for (var i = 0; i < B.pieces.length; i++) {
      var pc = B.pieces[i], pl = plans[i], tw_ = pc.W / pl.cols, th_ = pc.H / pl.rows;
      var SW = pl.o === 'V' ? P[0] : P[1], SH = pl.o === 'V' ? P[1] : P[0];
      for (var cp = 0; cp < (pc.copies || 1); cp++) {
        for (var r = 0; r < pl.rows; r++) {
          for (var q = 0; q < pl.cols; q++) {
            progress('Hoja ' + hoja + ' de ' + total + '…');
            await tick();
            doc.addPage([SW, SH], SW > SH ? 'l' : 'p');
            var rw = tw_ + (q < pl.cols - 1 ? OV : 0), rh = th_ + (r < pl.rows - 1 ? OV : 0);
            var px = (SW - rw) / 2, py = (SH - rh) / 2 + 0.3;
            var cv = render(pc, q * tw_, r * th_, rw, rh, k, 0);
            var x = cv.getContext('2d');
            x.setTransform(k, 0, 0, k, 0, 0);
            x.fillStyle = 'rgba(255,255,255,0.55)'; x.strokeStyle = INK; x.lineWidth = 0.03; x.setLineDash([0.3, 0.2]);
            if (q < pl.cols - 1) { x.fillRect(tw_, 0, OV, rh); x.beginPath(); x.moveTo(tw_, 0); x.lineTo(tw_, rh); x.stroke(); }
            if (r < pl.rows - 1) { x.fillRect(0, th_, rw, OV); x.beginPath(); x.moveTo(0, th_); x.lineTo(rw, th_); x.stroke(); }
            doc.addImage(cv.toDataURL('image/jpeg', 0.9), 'JPEG', px, py, rw, rh, undefined, 'FAST');
            cropMarks(doc, px, py, rw, rh, 0.15, 0.4);
            var tag = ROWS[r] + (q + 1);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(29, 44, 51);
            doc.text(pc.name + (pc.copies ? ' · copia ' + (cp + 1) + ' de ' + pc.copies : '') + '  ·  hoja ' + tag + ' (fila ' + ROWS[r] + ', columna ' + (q + 1) + ')', px, Math.max(0.9, py - 0.8));
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(90, 109, 117);
            doc.text(paper + ' al 100 % · recortar por las marcas · la franja clara va debajo de la hoja vecina · pieza ' + fmt(pc.W) + ' × ' + fmt(pc.H) + ' cm · hoja ' + hoja + ' de ' + total,
              px, Math.min(SH - 0.5, py + rh + 0.7));
            hoja++;
          }
        }
      }
    }
    return doc;
  }

  // ------------------------------------------------------------------ interfaz
  function $(s) { return app.querySelector(s); }
  function num(id, def) { var v = parseFloat(String($(id).value).replace(',', '.')); return isFinite(v) ? v : def; }
  function read() {
    var tapa = app.querySelector('input[name="mt-tapa"]:checked').value;
    var arriba = app.querySelector('input[name="mt-arriba"]:checked').value;
    var c = { w: num('#mt-w', 0), h: num('#mt-h', 0), d: num('#mt-d', 0), tapa: tapa === 'si' ? 'si' : arriba, tw: num('#mt-tw', 0), td: num('#mt-td', 0), falda: num('#mt-f', 0) };
    var err = '';
    [['w', 'el ancho'], ['h', 'el alto'], ['d', 'el fondo']].forEach(function (k) { if (!(c[k[0]] >= 10 && c[k[0]] <= 250)) err = err || 'Revisa ' + k[1] + ': entre 10 y 250 cm.'; });
    if (c.tapa === 'si') {
      if (!(c.tw >= 10 && c.tw <= 260 && c.td >= 10 && c.td <= 260)) err = err || 'Revisa las medidas de la tapa: entre 10 y 260 cm.';
      if (!(c.falda >= 0 && c.falda <= c.h * 0.4)) err = err || 'El faldón de la tapa debe medir entre 0 y ' + fmt(c.h * 0.4) + ' cm.';
    }
    return { c: c, err: err };
  }
  function sync() {
    var si = app.querySelector('input[name="mt-tapa"]:checked').value === 'si';
    $('#mt-con').hidden = !si; $('#mt-sin').hidden = si;
  }
  var timer = null;
  function preview() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      var r = read(), box = $('#mt-prev'), msg = $('#mt-msg');
      sync();
      if (r.err) { msg.textContent = r.err; box.innerHTML = ''; return; }
      msg.textContent = '';
      load().then(function () {
        var B = build(r.c);
        box.innerHTML = '';
        var hpx = 150, dpr = Math.min(2, window.devicePixelRatio || 1);
        var maxH = Math.max.apply(null, B.pieces.map(function (p) { return p.H; }));
        B.pieces.forEach(function (p) {
          var kk = hpx / maxH, f = document.createElement('figure');
          var cv = render(p, 0, 0, p.W, p.H, kk * dpr, 0);
          cv.style.width = (p.W * kk) + 'px'; cv.style.height = (p.H * kk) + 'px';
          var fc = document.createElement('figcaption');
          fc.textContent = p.name.split(' · ').slice(0, 2).join(' · ') + ' · ' + fmt(p.W) + ' × ' + fmt(p.H) + ' cm' + (p.copies ? ' (×' + p.copies + ')' : '');
          f.appendChild(cv); f.appendChild(fc); box.appendChild(f);
        });
      }).catch(function () { msg.textContent = 'No se ha podido cargar el diseño. Revisa la conexión y vuelve a intentarlo.'; });
    }, 250);
  }
  app.addEventListener('input', preview);
  app.addEventListener('change', preview);
  app.querySelectorAll('[data-pdf]').forEach(function (b) {
    b.addEventListener('click', async function () {
      var r = read(), msg = $('#mt-msg');
      if (r.err) { msg.textContent = r.err; return; }
      var btns = app.querySelectorAll('[data-pdf]');
      btns.forEach(function (x) { x.disabled = true; });
      try {
        msg.textContent = 'Preparando…';
        await load();
        var B = build(r.c), kind = b.dataset.pdf;
        var prog = function (t) { msg.textContent = t; };
        var doc = kind === 'real' ? await pdfReal(B, prog) : await pdfMosaic(B, kind, prog);
        var c = r.c, name = 'PRESENTE_caja_' + fmt(c.w) + 'x' + fmt(c.h) + 'x' + fmt(c.d) + '_' + (kind === 'real' ? 'tamano_real' : 'hojas_' + kind) + '.pdf';
        doc.setProperties({ title: 'PRESENTE · Caja a tu medida · ' + medidas(c), author: 'Pastoral · Salesianas Nervión · Sevilla', subject: 'Campaña de Adviento 2026 «PRESENTE»' });
        doc.save(name.replace(/,/g, '.'));
        msg.textContent = 'Listo: se ha descargado ' + name.replace(/,/g, '.') + '.';
      } catch (e) {
        console.error(e);
        msg.textContent = 'No se ha podido generar el PDF. Revisa la conexión y vuelve a intentarlo.';
      }
      btns.forEach(function (x) { x.disabled = false; });
    });
  });
  // vista previa cuando la sección se ve por primera vez
  var started = false;
  function start() { if (!started) { started = true; preview(); } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es, o) { if (es.some(function (e) { return e.isIntersecting; })) { start(); o.disconnect(); } }).observe(app);
  } else start();
  sync();
  window.PresenteMedida = { build: build, load: load, render: render, pdfReal: pdfReal, pdfMosaic: pdfMosaic };
})();
