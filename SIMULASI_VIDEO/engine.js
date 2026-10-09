// Mesin animasi simulasi komunikasi data.
// Setiap skenario ditulis sebagai timeline (Script). Fungsi render(t) menggambar
// keadaan PERSIS pada detik ke-t, sehingga video bisa dirender frame demi frame
// secara deterministik (dipakai oleh record.js) maupun diputar langsung di browser.

(function () {
  'use strict';

  const W = 1920;
  const H = 1080;
  // Bisa diganti lewat SIM.fonts() (versi web memakai IBM Plex dari Google Fonts)
  let SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
  let MONO = 'Menlo, Monaco, Consolas, "Courier New", monospace';

  const C = {
    bg: '#0a1020',
    panel: '#111a2e',
    panel2: '#0d1527',
    border: '#24324f',
    text: '#e6edf7',
    muted: '#8ea3c2',
    dim: '#4f6385',
    req: '#38bdf8',
    res: '#4ade80',
    err: '#f87171',
    push: '#c084fc',
    warn: '#fbbf24',
    pink: '#f472b6',
    net: '#94a3b8',
  };
  const KIND = { req: C.req, res: C.res, err: C.err, push: C.push, info: C.warn, net: C.net };

  const BUKU = [
    { id: 1, judul: 'Laskar Pelangi', penulis: 'Andrea Hirata', stok: 5 },
    { id: 2, judul: 'Bumi Manusia', penulis: 'Pramoedya Ananta Toer', stok: 3 },
    { id: 3, judul: 'Negeri 5 Menara', penulis: 'Ahmad Fuadi', stok: 4 },
  ];
  const BUKU_BARU = { id: 4, judul: 'Ronggeng Dukuh Paruk', penulis: 'Ahmad Tohari', stok: 2 };

  // ---------------------------------------------------------------- utilitas
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = (x) => {
    x = clamp(x);
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function wrap(ctx, text, maxW) {
    const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const test = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(test).width > maxW) {
          out.push(line);
          line = word;
        } else line = test;
      }
      out.push(line);
    }
    return out;
  }

  function ellipsis(ctx, text, maxW) {
    text = String(text);
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(`${text}…`).width > maxW) text = text.slice(0, -1);
    return `${text}…`;
  }

  // ---------------------------------------------------------------- Script (timeline)
  class Script {
    constructor(cfg) {
      this.cfg = cfg;
      this.t = 0;
      this.events = [];
      this.packets = [];
      this.steps = [];
      this.inspects = [];
      this.procs = [];
      this.overlays = [];
    }

    get duration() {
      return this.t;
    }

    wait(d) {
      this.t += d;
      return this;
    }

    on(fn) {
      this.events.push({ at: this.t, fn });
      return this;
    }

    intro(content, dur = 6) {
      this.overlays.push({ at: this.t, dur, kind: 'intro', content });
      this.t += dur;
      return this;
    }

    outro(content, dur = 9) {
      this.overlays.push({ at: this.t, dur, kind: 'outro', content });
      this.t += dur;
      return this;
    }

    step(title, text) {
      this.steps.push({ at: this.t, title, text });
      return this;
    }

    inspect(d) {
      this.inspects.push({ at: this.t, ...d });
      return this;
    }

    // Paket yang bergerak di sebuah link. dir: 'fwd' (from → to) / 'back'
    packet({ link = 'net', dir = 'fwd', label, kind = 'req', dur = 1.7, sub, inspect, parallel = false }) {
      if (inspect) this.inspect({ kind, ...inspect });
      this.packets.push({ at: this.t, dur, link, dir, label, kind, sub });
      if (!parallel) this.t += dur;
      return this;
    }

    process(node, label, dur = 1.3, kind = 'info', parallel = false) {
      this.procs.push({ at: this.t, dur, node, label, kind });
      if (!parallel) this.t += dur;
      return this;
    }

    // ----- perubahan state (terjadi pada waktu kursor saat ini)
    addRow(table, row) {
      return this.on((s, at) => s.tables[table].push({ ...row, _born: at }));
    }
    setRows(table, rows) {
      return this.on((s, at) => {
        s.tables[table] = rows.map((r) => ({ ...r, _born: at }));
      });
    }
    updateRow(table, id, patch, kind = 'warn') {
      return this.on((s, at) => {
        const r = s.tables[table].find((x) => x.id === id);
        if (r) Object.assign(r, patch, { _flash: { at, kind } });
      });
    }
    removeRow(table, id) {
      return this.on((s, at) => {
        const r = s.tables[table].find((x) => x.id === id);
        if (r) r._dying = at;
      });
    }
    flash(table, kind = 'res', ids = null) {
      return this.on((s, at) => {
        for (const r of s.tables[table]) if (!ids || ids.includes(r.id)) r._flash = { at, kind };
      });
    }
    log(node, text, kind = 'req') {
      return this.on((s, at) => (s.logs[node] = s.logs[node] || []).push({ text, kind, at }));
    }
    openLink(id, label) {
      return this.on((s, at) => (s.links[id] = { open: true, label, at }));
    }
    closeLink(id, label) {
      return this.on((s, at) => (s.links[id] = { open: false, label, at }));
    }
    extra(node, extra) {
      return this.on((s, at) => {
        s.nodes[node] = s.nodes[node] || {};
        s.nodes[node].extra = extra ? { ...extra, at } : null;
      });
    }
    activate(node, idx, kind = 'req') {
      return this.on((s, at) => {
        s.nodes[node] = s.nodes[node] || {};
        s.nodes[node].active = { idx, at, kind };
      });
    }
  }

  // ---------------------------------------------------------------- state
  function computeState(sc, t) {
    const cfg = sc.cfg;
    const s = {
      tables: clone(cfg.tables || {}),
      logs: {},
      links: clone(cfg.linkState || {}),
      nodes: clone(cfg.nodeState || {}),
    };
    for (const ev of sc.events) if (ev.at <= t) ev.fn(s, ev.at, t);
    return s;
  }

  const lastAt = (arr, t) => {
    let found = null;
    for (const x of arr) if (x.at <= t) found = x;
    return found;
  };

  // ---------------------------------------------------------------- geometri
  const nodeById = (cfg, id) => cfg.nodes.find((n) => n.id === id);

  function linkPts(cfg, link) {
    const a = nodeById(cfg, link.from);
    const b = nodeById(cfg, link.to);
    return [
      { x: a.x + a.w, y: a.y + a.h / 2 + (link.ay || 0) },
      { x: b.x, y: b.y + b.h / 2 + (link.by || 0) },
    ];
  }

  // ---------------------------------------------------------------- gambar: latar & header
  function drawBackground(ctx) {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, 380, 50, W / 2, 380, 1100);
    g.addColorStop(0, 'rgba(56,189,248,0.07)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(148,163,184,0.07)';
    for (let x = 40; x < W; x += 40) for (let y = 40; y < H; y += 40) ctx.fillRect(x, y, 2, 2);
  }

  function drawChipRow(ctx, items, x, y, opts = {}) {
    const { font = `600 20px ${SANS}`, h = 36, pad = 16, gap = 10, color = C.muted, fill = C.panel } = opts;
    ctx.font = font;
    for (const it of items) {
      const w = ctx.measureText(it).width + pad * 2;
      rr(ctx, x, y, w, h, h / 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.55);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.textBaseline = 'middle';
      ctx.fillText(it, x + pad, y + h / 2 + 1);
      x += w + gap;
    }
    ctx.textBaseline = 'alphabetic';
    return x;
  }

  function drawHeader(ctx, cfg) {
    ctx.fillStyle = cfg.accent;
    rr(ctx, 70, 44, 8, 52, 4);
    ctx.fill();
    ctx.fillStyle = C.text;
    ctx.font = `800 46px ${SANS}`;
    ctx.fillText(cfg.title, 96, 88);
    const x = 96 + ctx.measureText(cfg.title).width + 28;
    drawChipRow(ctx, cfg.chips, x, 54, { color: cfg.accent });
    ctx.font = `500 20px ${SANS}`;
    ctx.fillStyle = C.muted;
    ctx.textAlign = 'right';
    ctx.fillText('Simulasi Komunikasi Data', W - 70, 66);
    ctx.fillStyle = C.dim;
    ctx.fillText('Studi kasus: CRUD Buku Perpustakaan', W - 70, 92);
    ctx.textAlign = 'left';
  }

  // ---------------------------------------------------------------- gambar: ikon
  function drawIcon(ctx, kind, x, y, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = rgba(color, 0.15);
    ctx.lineWidth = 3;
    if (kind === 'server') {
      for (let i = 0; i < 3; i++) {
        rr(ctx, x, y + i * 16, 42, 13, 3);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 34, y + i * 16 + 6.5, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = rgba(color, 0.15);
      }
    } else {
      rr(ctx, x + 4, y, 34, 24, 3);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 2, y + 32);
      ctx.lineTo(x + 44, y + 32);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- gambar: node
  function sectionTitle(ctx, text, x, y) {
    ctx.font = `700 15px ${SANS}`;
    ctx.fillStyle = C.dim;
    ctx.fillText(text.toUpperCase().split('').join(' '), x, y);
  }

  function drawChips(ctx, cfg, extra, active, x, y, w, t) {
    sectionTitle(ctx, extra.title, x, y + 12);
    y += 24;
    const a = clamp((t - extra.at) / 0.5);
    ctx.font = `600 17px ${MONO}`;
    const h = 34;
    let cx = x;
    let cy = y;
    extra.items.forEach((it, i) => {
      const cw = ctx.measureText(it).width + 24;
      if (cx + cw > x + w) {
        cx = x;
        cy += h + 8;
      }
      let hl = 0;
      if (active && active.idx === i) hl = 1 - clamp((t - active.at - 2.6) / 0.6);
      const col = KIND[active && active.kind] || cfg.accent;
      ctx.globalAlpha = a;
      rr(ctx, cx, cy, cw, h, 8);
      ctx.fillStyle = hl > 0 ? rgba(col, 0.12 + 0.25 * hl) : C.panel2;
      ctx.fill();
      ctx.strokeStyle = hl > 0 ? rgba(col, 0.4 + 0.6 * hl) : C.border;
      ctx.lineWidth = hl > 0 ? 2 : 1.5;
      ctx.stroke();
      ctx.fillStyle = hl > 0 ? C.text : C.muted;
      ctx.textBaseline = 'middle';
      ctx.fillText(it, cx + 12, cy + h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
      cx += cw + 8;
    });
    return extra.items.length ? cy + h : y;
  }

  function drawTable(ctx, cfg, node, rows, x, y, w, h, t) {
    sectionTitle(ctx, node.tableTitle || 'Data buku', x, y + 12);
    y += 24;
    const cols = node.columns || [
      { key: 'id', label: 'ID', w: 56 },
      { key: 'judul', label: 'JUDUL' },
      { key: 'stok', label: 'STOK', w: 76, align: 'right' },
    ];
    const fixed = cols.reduce((s, c) => s + (c.w || 0), 0);
    const flex = cols.filter((c) => !c.w).length;
    for (const c of cols) c._w = c.w || (w - fixed) / flex;

    const headH = 32;
    rr(ctx, x, y, w, headH, 6);
    ctx.fillStyle = C.panel2;
    ctx.fill();
    ctx.font = `700 15px ${SANS}`;
    ctx.fillStyle = C.dim;
    let cx = x;
    for (const c of cols) {
      ctx.textAlign = c.align === 'right' ? 'right' : 'left';
      ctx.fillText(c.label, c.align === 'right' ? cx + c._w - 14 : cx + 14, y + 21);
      cx += c._w;
    }
    ctx.textAlign = 'left';
    y += headH + 4;

    const visible = rows.filter((r) => !(r._dying !== undefined && t - r._dying > 0.9));
    const rowH = Math.min(node.rowH || 40, (h - headH - 28) / Math.max(4, visible.length));
    if (!visible.length) {
      ctx.font = `italic 18px ${SANS}`;
      ctx.fillStyle = C.dim;
      ctx.fillText(node.emptyText || '(belum ada data)', x + 14, y + rowH * 0.65);
    }
    for (const r of visible) {
      let a = r._born !== undefined ? clamp((t - r._born) / 0.5) : 1;
      let bg = null;
      if (r._born !== undefined && t - r._born < 2.4) bg = rgba(C.res, 0.3 * (1 - clamp((t - r._born) / 2.4)));
      if (r._flash && t - r._flash.at < 2.4) bg = rgba(KIND[r._flash.kind] || C.warn, 0.32 * (1 - clamp((t - r._flash.at) / 2.4)));
      if (r._dying !== undefined) {
        const k = clamp((t - r._dying) / 0.9);
        a *= 1 - k;
        bg = rgba(C.err, 0.35 * (1 - k * 0.5));
      }
      ctx.globalAlpha = a;
      const slide = (1 - a) * 18;
      if (bg) {
        rr(ctx, x, y + 2, w, rowH - 4, 6);
        ctx.fillStyle = bg;
        ctx.fill();
      }
      ctx.font = `500 ${Math.min(19, rowH * 0.5)}px ${SANS}`;
      ctx.fillStyle = C.text;
      let cx2 = x + slide;
      for (const c of cols) {
        const v = ellipsis(ctx, r[c.key], c._w - 24);
        ctx.textAlign = c.align === 'right' ? 'right' : 'left';
        ctx.fillText(v, c.align === 'right' ? cx2 + c._w - 14 : cx2 + 14, y + rowH * 0.64);
        cx2 += c._w;
      }
      ctx.textAlign = 'left';
      ctx.strokeStyle = rgba(C.border, 0.7);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + rowH);
      ctx.lineTo(x + w, y + rowH);
      ctx.stroke();
      ctx.globalAlpha = 1;
      y += rowH;
    }
  }

  function drawLogs(ctx, node, logs, x, y, w, h, t) {
    sectionTitle(ctx, node.logTitle || 'Log client', x, y + 12);
    y += 26;
    rr(ctx, x, y, w, h - 26, 8);
    ctx.fillStyle = C.panel2;
    ctx.fill();
    const lineH = 31;
    const max = Math.floor((h - 40) / lineH);
    const shown = logs.slice(-max);
    ctx.font = `500 18px ${MONO}`;
    shown.forEach((l, i) => {
      ctx.globalAlpha = clamp((t - l.at) / 0.35);
      ctx.fillStyle = KIND[l.kind] || C.text;
      ctx.fillText(ellipsis(ctx, l.text, w - 28), x + 14, y + 28 + i * lineH);
      ctx.globalAlpha = 1;
    });
    if (!shown.length) {
      ctx.font = `italic 18px ${SANS}`;
      ctx.fillStyle = C.dim;
      ctx.fillText('(belum ada aktivitas)', x + 14, y + 30);
    }
  }

  function drawStatus(ctx, node, proc, x, y, w, h, t, accent) {
    if (proc) {
      const col = KIND[proc.kind] || C.warn;
      rr(ctx, x, y, w, h, 8);
      ctx.fillStyle = rgba(col, 0.16);
      ctx.fill();
      ctx.strokeStyle = rgba(col, 0.6);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const a0 = t * 7;
      ctx.arc(x + 22, y + h / 2, 9, a0, a0 + Math.PI * 1.4);
      ctx.stroke();
      ctx.font = `600 18px ${MONO}`;
      ctx.fillStyle = C.text;
      ctx.fillText(ellipsis(ctx, proc.label, w - 56), x + 42, y + h / 2 + 6);
    } else {
      ctx.fillStyle = rgba(C.res, 0.85);
      ctx.beginPath();
      ctx.arc(x + 14, y + h / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `500 17px ${SANS}`;
      ctx.fillStyle = C.dim;
      ctx.fillText(node.idle || 'siap', x + 28, y + h / 2 + 6);
    }
  }

  function drawNode(ctx, sc, node, s, t) {
    const cfg = sc.cfg;
    const st = s.nodes[node.id] || {};
    const proc = sc.procs.find((p) => p.node === node.id && t >= p.at && t < p.at + p.dur);
    const { x, y, w, h } = node;

    ctx.save();
    ctx.shadowColor = proc ? rgba(KIND[proc.kind] || C.warn, 0.45) : 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = proc ? 30 : 24;
    rr(ctx, x, y, w, h, 18);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.restore();
    rr(ctx, x, y, w, h, 18);
    ctx.strokeStyle = proc ? rgba(KIND[proc.kind] || C.warn, 0.8) : C.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    let cy;
    if (node.compact) {
      // Header satu baris: judul + subjudul berdampingan
      ctx.font = `700 25px ${SANS}`;
      ctx.fillStyle = C.text;
      ctx.fillText(node.title, x + 24, y + 42);
      const tw = ctx.measureText(node.title).width;
      ctx.font = `500 17px ${MONO}`;
      ctx.fillStyle = C.muted;
      ctx.fillText(ellipsis(ctx, node.subtitle, w - tw - 64), x + 40 + tw, y + 42);
      cy = y + 62;
    } else {
      drawIcon(ctx, node.kind, x + 26, y + 26, node.kind === 'server' ? cfg.accent : C.req);
      ctx.font = `700 27px ${SANS}`;
      ctx.fillStyle = C.text;
      ctx.fillText(node.title, x + 86, y + 48);
      ctx.font = `500 17px ${MONO}`;
      ctx.fillStyle = C.muted;
      ctx.fillText(ellipsis(ctx, node.subtitle, w - 110), x + 86, y + 74);
      cy = y + 96;
    }
    if (st.extra) cy = drawChips(ctx, cfg, st.extra, st.active, x + 24, cy, w - 48, t) + 14;
    const bottom = y + h - (node.status ? 58 : 18);
    if (node.table) drawTable(ctx, cfg, node, s.tables[node.table] || [], x + 24, cy, w - 48, bottom - cy, t);
    else if (node.showLogs !== false) drawLogs(ctx, node, s.logs[node.id] || [], x + 24, cy, w - 48, bottom - cy, t);
    if (node.status) drawStatus(ctx, node, proc, x + 20, y + h - 50, w - 40, 36, t, cfg.accent);
  }

  // ---------------------------------------------------------------- gambar: link & paket
  function drawLink(ctx, sc, link, s, t) {
    const cfg = sc.cfg;
    const st = s.links[link.id] || {};
    const [A, B] = linkPts(cfg, link);
    const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const ang = Math.atan2(B.y - A.y, B.x - A.x);

    if (!st.open) {
      ctx.save();
      ctx.setLineDash([10, 12]);
      ctx.strokeStyle = rgba(C.dim, 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
      ctx.restore();
    } else {
      const k = ease((t - st.at) / 0.8);
      const ex = A.x + (B.x - A.x) * k;
      const ey = A.y + (B.y - A.y) * k;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(cfg.accent, 0.1);
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = rgba(cfg.accent, 0.5);
      ctx.lineWidth = 2;
      for (const off of [-17, 17]) {
        const ox = -Math.sin(ang) * off;
        const oy = Math.cos(ang) * off;
        ctx.beginPath();
        ctx.moveTo(A.x + ox, A.y + oy);
        ctx.lineTo(ex + ox, ey + oy);
        ctx.stroke();
      }
      ctx.setLineDash([4, 18]);
      ctx.lineDashOffset = -t * 30;
      ctx.strokeStyle = rgba(cfg.accent, 0.35);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.restore();
    }
    if (st.label) {
      ctx.save();
      ctx.translate(mid.x, mid.y);
      ctx.rotate(ang);
      ctx.font = `700 17px ${SANS}`;
      ctx.fillStyle = st.open ? cfg.accent : C.dim;
      ctx.textAlign = 'center';
      ctx.fillText(st.label, 0, st.open ? -62 : -14);
      ctx.restore();
    }
  }

  function drawPacket(ctx, sc, p, t) {
    const k = (t - p.at) / p.dur;
    if (k < 0 || k > 1) return;
    const link = sc.cfg.links.find((l) => l.id === p.link);
    let [A, B] = linkPts(sc.cfg, link);
    if (p.dir === 'back') [A, B] = [B, A];
    const col = KIND[p.kind] || C.req;

    ctx.font = `700 21px ${SANS}`;
    const pw = ctx.measureText(p.label).width + 56;
    const ph = 42;
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len;
    const uy = dy / len;
    // Normal ke "kiri" arah gerak: paket pergi (kiri→kanan) lewat atas garis,
    // paket balik (kanan→kiri) otomatis lewat bawah garis.
    const lane = 30;
    const nx = uy;
    const ny = -ux;
    const margin = Math.min(pw / 2 + 6, len * 0.3);
    const S = { x: A.x + ux * margin + nx * lane, y: A.y + uy * margin + ny * lane };
    const E = { x: B.x - ux * margin + nx * lane, y: B.y - uy * margin + ny * lane };
    const e = ease(k);
    const px = S.x + (E.x - S.x) * e;
    const py = S.y + (E.y - S.y) * e;
    const alpha = Math.min(clamp(k / 0.07), clamp((1 - k) / 0.07));

    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(S.x, S.y, px, py);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(1, rgba(col, 0.75));
    ctx.strokeStyle = g;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(S.x, S.y);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.shadowColor = rgba(col, 0.7);
    ctx.shadowBlur = 22;
    rr(ctx, px - pw / 2, py - ph / 2, pw, ph, ph / 2);
    ctx.fillStyle = '#0f1a30';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = rgba(col, 0.22);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // panah arah
    const fx = px + ux * (pw / 2 - 18);
    const fy = py + uy * (pw / 2 - 18);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(fx + ux * 9, fy + uy * 9);
    ctx.lineTo(fx - ux * 5 - uy * 7, fy - uy * 5 + ux * 7);
    ctx.lineTo(fx - ux * 5 + uy * 7, fy - uy * 5 - ux * 7);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.label, px - ux * 8, py + 1);
    if (p.sub) {
      ctx.font = `600 16px ${MONO}`;
      ctx.fillStyle = col;
      ctx.fillText(p.sub, px, py + (p.dir === 'fwd' ? -36 : 36));
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- gambar: panel bawah
  function drawCaption(ctx, sc, t) {
    const x = 70;
    const y = 668;
    const w = 650;
    const h = 352;
    rr(ctx, x, y, w, h, 18);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    const st = lastAt(sc.steps, t);
    if (!st) return;
    const idx = sc.steps.indexOf(st);
    const a = clamp((t - st.at) / 0.45);
    const slide = (1 - ease(a)) * 16;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `800 17px ${SANS}`;
    ctx.fillStyle = sc.cfg.accent;
    ctx.fillText(`LANGKAH ${idx + 1} / ${sc.steps.length}`, x + 32, y + 48 + slide);
    ctx.font = `800 33px ${SANS}`;
    ctx.fillStyle = C.text;
    let yy = y + 92 + slide;
    for (const line of wrap(ctx, st.title, w - 64)) {
      ctx.fillText(line, x + 32, yy);
      yy += 40;
    }
    ctx.font = `400 24px ${SANS}`;
    ctx.fillStyle = '#c3d0e4';
    yy += 8;
    for (const line of wrap(ctx, st.text, w - 64)) {
      ctx.fillText(line, x + 32, yy);
      yy += 35;
    }
    ctx.restore();
  }

  // pewarnaan sintaks sederhana untuk panel "isi pesan"
  function tokens(line) {
    if (Array.isArray(line)) return line.map(([text, c]) => ({ text, color: KIND[c] || C[c] || c }));
    if (typeof line === 'object' && line) return [{ text: line.t, color: KIND[line.c] || C[line.c] || line.c }];
    if (/^\s*(#|\/\/)/.test(line)) return [{ text: line, color: C.dim }];
    if (/^(GET|POST|PUT|DELETE|PRI|HTTP\/)/.test(line)) return [{ text: line, color: C.warn }];
    if (line.includes('<')) {
      return line.split(/(<[^>]*>)/).filter(Boolean).map((p) => ({ text: p, color: p.startsWith('<') ? C.pink : C.text }));
    }
    const hm = line.match(/^(\s*:?[A-Za-z][\w-]*:)(\s.*)?$/);
    if (hm && !/^\s*"/.test(line)) return [{ text: hm[1], color: C.req }, { text: hm[2] || '', color: C.text }];
    const out = [];
    const re = /"(?:[^"\\]|\\.)*"(\s*:)?|\b\d+\b|\b(query|mutation|service|rpc|message|returns|true|false|null)\b/g;
    let last = 0;
    let m;
    while ((m = re.exec(line))) {
      if (m.index > last) out.push({ text: line.slice(last, m.index), color: C.text });
      let color = C.res;
      if (m[1]) color = C.req;
      else if (/^\d/.test(m[0])) color = C.warn;
      else if (m[2]) color = C.pink;
      out.push({ text: m[0], color });
      last = re.lastIndex;
    }
    if (last < line.length) out.push({ text: line.slice(last), color: C.text });
    return out;
  }

  function drawInspector(ctx, sc, t) {
    const x = 750;
    const y = 668;
    const w = 1100;
    const h = 352;
    rr(ctx, x, y, w, h, 18);
    ctx.fillStyle = '#0c1424';
    ctx.fill();
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    const ins = lastAt(sc.inspects, t);
    sectionTitle(ctx, 'Isi pesan', x + 28, y + 36);
    if (!ins) return;
    const col = KIND[ins.kind] || C.req;
    const a = clamp((t - ins.at) / 0.3);
    ctx.save();
    ctx.globalAlpha = a;

    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x + 160, y + 30, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `700 21px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.fillText(ins.title, x + 176, y + 37);
    let rx = x + w - 28;
    ctx.textAlign = 'right';
    if (ins.badge) {
      ctx.font = `700 17px ${MONO}`;
      const bw = ctx.measureText(ins.badge).width + 24;
      rr(ctx, rx - bw, y + 15, bw, 32, 8);
      ctx.fillStyle = rgba(col, 0.18);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillText(ins.badge, rx - 12, y + 37);
      rx -= bw + 16;
    }
    if (ins.dir) {
      ctx.font = `600 17px ${SANS}`;
      ctx.fillStyle = C.muted;
      ctx.fillText(ins.dir, rx, y + 37);
    }
    ctx.textAlign = 'left';

    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 24, y + 60);
    ctx.lineTo(x + w - 24, y + 60);
    ctx.stroke();

    const lines = ins.lines || [];
    const maxChars = Math.max(
      20,
      ...lines.map((l) => (Array.isArray(l) ? l.map((p) => p[0]).join('') : typeof l === 'object' ? l.t : l).length),
    );
    const size = Math.min(21, (h - 82) / (lines.length * 1.34), (w - 56) / (maxChars * 0.61));
    const lh = size * 1.34;
    ctx.font = `500 ${size}px ${MONO}`;
    const shown = Math.floor((t - ins.at) / 0.035) + 1;
    lines.slice(0, shown).forEach((line, i) => {
      let cx = x + 28;
      for (const tok of tokens(line)) {
        ctx.fillStyle = tok.color;
        ctx.fillText(tok.text, cx, y + 72 + size + i * lh);
        cx += ctx.measureText(tok.text).width;
      }
    });
    ctx.restore();
  }

  function drawProgress(ctx, sc, t) {
    const x = 70;
    const y = 1044;
    const w = W - 140;
    const d = sc.duration;
    rr(ctx, x, y, w, 6, 3);
    ctx.fillStyle = C.panel;
    ctx.fill();
    rr(ctx, x, y, w * clamp(t / d), 6, 3);
    ctx.fillStyle = sc.cfg.accent;
    ctx.fill();
    for (const st of sc.steps) {
      ctx.fillStyle = st.at <= t ? '#ffffff' : C.dim;
      ctx.beginPath();
      ctx.arc(x + (w * st.at) / d, y + 3, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------- gambar: intro & outro
  function drawOverlay(ctx, sc, o, t) {
    const lt = t - o.at;
    if (lt < 0 || lt > o.dur) return;
    const cfg = sc.cfg;
    const c = o.content;
    const a = o.kind === 'intro' ? 1 - clamp((lt - (o.dur - 0.7)) / 0.7) : clamp(lt / 0.7);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 1000);
    g.addColorStop(0, rgba(cfg.accent, 0.13));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const x = 200;
    const oy = 70; // geser konten ke tengah layar
    const k = (d) => ease((lt - d) / 0.6);
    ctx.font = `800 22px ${SANS}`;
    ctx.fillStyle = cfg.accent;
    ctx.globalAlpha = a * k(0.1);
    ctx.fillText(o.kind === 'intro' ? `SIMULASI KOMUNIKASI DATA  ·  ${cfg.index} / 5` : 'RINGKASAN', x, 250 + oy);

    ctx.globalAlpha = a * k(0.25);
    ctx.font = `800 ${o.kind === 'intro' ? 120 : 84}px ${SANS}`;
    ctx.fillStyle = C.text;
    ctx.fillText(c.title, x, (o.kind === 'intro' ? 380 : 350) + oy);
    let y = (o.kind === 'intro' ? 450 : 410) + oy;
    if (c.subtitle) {
      ctx.font = `500 38px ${SANS}`;
      ctx.fillStyle = C.muted;
      ctx.fillText(c.subtitle, x, y);
      y += 30;
    }
    if (o.kind === 'intro') {
      ctx.globalAlpha = a * k(0.45);
      drawChipRow(ctx, cfg.chips, x, y + 6, { color: cfg.accent, h: 42, font: `600 22px ${SANS}` });
      y += 100;
    } else y += 40;

    c.bullets.forEach((b, i) => {
      ctx.globalAlpha = a * k(0.8 + i * 0.35);
      const off = (1 - k(0.8 + i * 0.35)) * 24;
      ctx.fillStyle = rgba(cfg.accent, 0.18);
      ctx.beginPath();
      ctx.arc(x + 20 + off, y - 10, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `800 20px ${SANS}`;
      ctx.fillStyle = cfg.accent;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), x + 20 + off, y - 3);
      ctx.textAlign = 'left';
      ctx.font = `500 32px ${SANS}`;
      ctx.fillStyle = C.text;
      ctx.fillText(b, x + 64 + off, y);
      y += 72;
    });

    if (c.footer) {
      ctx.globalAlpha = a * k(1.2);
      ctx.font = `500 22px ${MONO}`;
      ctx.fillStyle = C.dim;
      ctx.fillText(c.footer, x, H - 110);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- render utama
  function render(ctx, sc, t) {
    const s = computeState(sc, t);
    ctx.save();
    drawBackground(ctx);
    drawHeader(ctx, sc.cfg);
    for (const link of sc.cfg.links) drawLink(ctx, sc, link, s, t);
    for (const node of sc.cfg.nodes) drawNode(ctx, sc, node, s, t);
    for (const p of sc.packets) drawPacket(ctx, sc, p, t);
    drawCaption(ctx, sc, t);
    drawInspector(ctx, sc, t);
    drawProgress(ctx, sc, t);
    for (const o of sc.overlays) drawOverlay(ctx, sc, o, t);
    ctx.restore();
  }

  // ---------------------------------------------------------------- tata letak standar
  // Satu client di kiri, satu server di kanan, satu jalur jaringan di tengah.
  function single({ client = {}, server = {} }) {
    return {
      nodes: [
        { id: 'client', kind: 'client', x: 70, y: 140, w: 500, h: 495, title: 'Client', subtitle: '', ...client },
        { id: 'server', kind: 'server', x: 1350, y: 140, w: 500, h: 495, title: 'Server', subtitle: '', table: 'buku', status: true, tableTitle: 'bukuStore.js (memori)', ...server },
      ],
      links: [{ id: 'net', from: 'client', to: 'server' }],
    };
  }

  window.SIM = {
    W,
    H,
    C,
    BUKU,
    BUKU_BARU,
    layout: { single },
    scenes: {},
    order: [],
    register(id, cfg, build) {
      const sc = new Script(cfg);
      build(sc);
      this.scenes[id] = sc;
      this.order.push(id);
    },
    duration(id) {
      return this.scenes[id].duration;
    },
    fonts({ sans, mono }) {
      if (sans) SANS = sans;
      if (mono) MONO = mono;
    },
    render(ctx, id, t) {
      render(ctx, this.scenes[id], t);
    },
  };
})();
