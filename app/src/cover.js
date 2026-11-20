// Neon Bay Cover Studio — the cover renderer.
// Draws multi-panel, GTA-poster-style cover art on a canvas: the user's photos
// in panel quads, a sunset / neon / noir colour grade, and big gradient caption
// lettering in the bundled DejaVu Sans Bold. Pure drawing, no DOM besides the
// canvas it is handed.

export const SIZES = {
  square: { label: 'Square', w: 1080, h: 1080 },
  portrait: { label: 'Portrait', w: 1080, h: 1350 },
  wide: { label: 'Wide', w: 1920, h: 1080 },
};

// A layout is a set of photo panels plus a caption band, all in fractions of
// the cover. Panels are quads so a layout can cut a diagonal seam.
export const LAYOUTS = [
  {
    id: 'hero',
    name: 'Hero Split',
    caption: { x: 0, y: 0.8, w: 1, h: 0.2 },
    panels(w, h) {
      return [
        quad(0, 0, 0.6, 0.8, w, h),
        quad(0.62, 0, 1, 0.385, w, h),
        quad(0.62, 0.405, 1, 0.8, w, h),
      ];
    },
  },
  {
    id: 'grid',
    name: 'Comic Grid',
    caption: { x: 0, y: 0.78, w: 1, h: 0.22 },
    panels(w, h) {
      return [
        quad(0, 0, 0.49, 0.38, w, h),
        quad(0.51, 0, 1, 0.38, w, h),
        quad(0, 0.4, 0.49, 0.78, w, h),
        quad(0.51, 0.4, 1, 0.78, w, h),
      ];
    },
  },
  {
    id: 'triptych',
    name: 'Triptych',
    caption: { x: 0, y: 0.74, w: 1, h: 0.26 },
    scrim: true,
    panels(w, h) {
      return [
        quad(0, 0, 0.32, 1, w, h),
        quad(0.34, 0, 0.66, 1, w, h),
        quad(0.68, 0, 1, 1, w, h),
      ];
    },
  },
  {
    id: 'slant',
    name: 'Slant Cut',
    caption: { x: 0, y: 0.78, w: 1, h: 0.22 },
    panels(w, h) {
      return [
        poly([[0, 0], [0.56, 0], [0.46, 0.78], [0, 0.78]], w, h),
        poly([[0.6, 0], [1, 0], [1, 0.78], [0.5, 0.78]], w, h),
      ];
    },
  },
];

export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset',
    filter: 'saturate(1.3) contrast(1.06) sepia(0.18)',
    // Warm wash over each photo, top to bottom.
    wash: ['rgba(255, 150, 60, 0.10)', 'rgba(255, 60, 110, 0.28)'],
    band: ['#2a0a2e', '#5b1030'],
    title: ['#ffd319', '#ff7a3c', '#ff2975'],
    accent: '#ffb02e',
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    filter: 'saturate(1.7) contrast(1.12) hue-rotate(-12deg)',
    wash: ['rgba(0, 240, 255, 0.10)', 'rgba(255, 41, 117, 0.30)'],
    band: ['#0b1030', '#3d0a4d'],
    title: ['#22e6ff', '#ff2975', '#b537f2'],
    accent: '#22e6ff',
  },
  {
    id: 'noir',
    name: 'Noir',
    filter: 'grayscale(1) contrast(1.22) brightness(1.05)',
    wash: ['rgba(255, 255, 255, 0.04)', 'rgba(0, 0, 0, 0.22)'],
    band: ['#101010', '#2b2b2b'],
    title: ['#ffffff', '#ffd7e8', '#ff2975'],
    accent: '#ff2975',
  },
];

function quad(x0, y0, x1, y1, w, h) {
  return [[x0 * w, y0 * h], [x1 * w, y0 * h], [x1 * w, y1 * h], [x0 * w, y1 * h]];
}

function poly(fracs, w, h) {
  return fracs.map(([fx, fy]) => [fx * w, fy * h]);
}

function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Pulls a quad a few pixels toward its own centre, so a white gutter shows
// between neighbouring panels.
function insetQuad(pts, px) {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return pts.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const pull = Math.min(px, len * 0.45);
    return [x - (dx / len) * pull, y - (dy / len) * pull];
  });
}

function tracePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

export function pointInQuad(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Draws one photo cover-fitting a panel quad, with zoom and pan offsets.
// zoom 1 fills the panel; ox/oy shift the photo by a fraction of the panel.
function drawPhotoInQuad(ctx, img, pts, zoom, ox, oy, filter) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const bx = Math.min(...xs);
  const by = Math.min(...ys);
  const bw = Math.max(...xs) - bx;
  const bh = Math.max(...ys) - by;
  const base = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const dx = bx + (bw - dw) / 2 + ox * bw;
  const dy = by + (bh - dh) / 2 + oy * bh;
  ctx.save();
  tracePath(ctx, pts);
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function washPanel(ctx, pts, grade) {
  const ys = pts.map((p) => p[1]);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  ctx.save();
  tracePath(ctx, pts);
  ctx.clip();
  const wash = ctx.createLinearGradient(0, top, 0, bottom);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(0, top, ctx.canvas.width, bottom - top);
  ctx.restore();
}

function drawSunGlow(ctx, w, h, grade) {
  // A soft sun disc glowing in the caption band, right of the title.
  const cx = w * 0.76;
  const cy = h * 0.9;
  const r = Math.min(w, h) * 0.12;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2);
  glow.addColorStop(0, grade.id === 'noir' ? 'rgba(255,255,255,0.20)' : 'rgba(255, 176, 46, 0.34)');
  glow.addColorStop(1, 'rgba(255, 176, 46, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
  const disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  disc.addColorStop(0, '#ffe08a');
  disc.addColorStop(1, grade.id === 'neon' ? '#ff2975' : '#ff7a3c');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Slice the disc with thin sky lines, poster style.
  ctx.fillStyle = grade.band[0];
  for (let i = 0; i < 3; i++) {
    const y = cy + r * (0.1 + i * 0.28);
    ctx.fillRect(cx - r, y, r * 2, Math.max(2, r * 0.06));
  }
}

function fitTitleFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `700 ${size}px "NeonBay Bold", "DejaVu Sans", sans-serif`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size = Math.max(14, size - 4);
    ctx.font = `700 ${size}px "NeonBay Bold", "DejaVu Sans", sans-serif`;
  }
  return size;
}

function drawCaption(ctx, w, h, layout, grade, title, subtitle) {
  const band = {
    x: layout.caption.x * w,
    y: layout.caption.y * h,
    w: layout.caption.w * w,
    h: layout.caption.h * h,
  };
  if (layout.scrim) {
    const scrim = ctx.createLinearGradient(0, band.y - band.h * 0.5, 0, band.y + band.h);
    scrim.addColorStop(0, 'rgba(10, 4, 18, 0)');
    scrim.addColorStop(1, 'rgba(10, 4, 18, 0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, band.y - band.h * 0.5, w, band.h * 1.5);
  } else {
    const bg = ctx.createLinearGradient(band.x, band.y, band.x + band.w, band.y);
    bg.addColorStop(0, grade.band[0]);
    bg.addColorStop(1, grade.band[1]);
    ctx.fillStyle = bg;
    ctx.fillRect(band.x, band.y, band.w, band.h);
    // Thin neon rule along the top of the band.
    ctx.fillStyle = grade.accent;
    ctx.fillRect(band.x, band.y, band.w, Math.max(2, h * 0.004));
  }

  drawSunGlow(ctx, w, h, grade);

  const text = (title || 'UNTITLED').trim().toUpperCase();
  const pad = w * 0.04;
  const maxTextW = band.w - pad * 2 - Math.min(w, h) * 0.14;
  const size = fitTitleFont(ctx, text, maxTextW, band.h * 0.52);
  const baseline = band.y + band.h * 0.56;

  ctx.save();
  ctx.translate(band.x + pad, baseline);
  ctx.rotate(-0.02);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, -size * 0.6, 0, size * 0.6);
  grad.addColorStop(0, grade.title[0]);
  grad.addColorStop(0.55, grade.title[1]);
  grad.addColorStop(1, grade.title[2]);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeText(text, 0, 0);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowOffsetX = size * 0.05;
  ctx.shadowOffsetY = size * 0.06;
  ctx.shadowBlur = size * 0.08;
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.restore();

  const sub = (subtitle || '').trim();
  if (sub) {
    ctx.save();
    ctx.font = `700 ${Math.max(12, band.h * 0.15)}px "NeonBay Bold", "DejaVu Sans", sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, band.h * 0.02)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText(sub.toUpperCase(), band.x + pad, band.y + band.h * 0.88);
    ctx.restore();
  }

  // Small corner tag naming the fictional city, bottom-right.
  ctx.save();
  ctx.font = `700 ${Math.max(11, h * 0.013)}px "NeonBay Bold", "DejaVu Sans", sans-serif`;
  try { ctx.letterSpacing = '3px'; } catch { /* older canvas */ }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillText('NEON BAY', w - pad, band.y + band.h * 0.2);
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

// The state the renderer needs. photos: HTMLImageElements (or null slots).
// panels: one per layout panel — { photo, zoom, ox, oy }.
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = layoutById(state.layoutId);
  const grade = gradeById(state.gradeId);
  const gutter = Math.max(3, Math.round(Math.min(w, h) * 0.006));

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f7f2f0';
  ctx.fillRect(0, 0, w, h);

  const quads = layout.panels(w, h).map((q) => insetQuad(q, gutter));
  quads.forEach((pts, i) => {
    const slot = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = slot.photo >= 0 ? state.photos[slot.photo] : null;
    if (img) {
      drawPhotoInQuad(ctx, img, pts, slot.zoom || 1, slot.ox || 0, slot.oy || 0, grade.filter);
    } else {
      // Empty panel: a dusk gradient with a dashed frame, inviting a photo.
      ctx.save();
      tracePath(ctx, pts);
      ctx.clip();
      const empty = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
      empty.addColorStop(0, '#3a1740');
      empty.addColorStop(1, '#12081c');
      ctx.fillStyle = empty;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      ctx.save();
      tracePath(ctx, pts);
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    washPanel(ctx, pts, grade);
  });

  drawCaption(ctx, w, h, layout, grade, state.title, state.subtitle);
  drawVignette(ctx, w, h);

  // Outer frame.
  ctx.strokeStyle = '#f7f2f0';
  ctx.lineWidth = Math.max(4, Math.round(Math.min(w, h) * 0.008));
  ctx.strokeRect(
    ctx.lineWidth / 2, ctx.lineWidth / 2,
    w - ctx.lineWidth, h - ctx.lineWidth,
  );
  return quads;
}

// Renders the cover at a full export size and hands back a PNG blob.
export async function exportCover(state, sizeId) {
  const size = SIZES[sizeId] || SIZES.square;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  await document.fonts.load('700 100px "NeonBay Bold"');
  await document.fonts.ready;
  drawCover(canvas, state);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG export failed'))), 'image/png');
  });
}

// Panel quads for the current layout at the preview canvas size, so the
// editor can tell which panel a click landed in.
export function previewQuads(state, w, h) {
  const gutter = Math.max(3, Math.round(Math.min(w, h) * 0.006));
  return layoutById(state.layoutId).panels(w, h).map((q) => insetQuad(q, gutter));
}
