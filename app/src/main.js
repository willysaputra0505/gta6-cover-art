// Neon Bay Cover Studio — the editor.
// Owns the page state (photos, panels, layout, grade, caption, size), wires the
// controls, paints the live preview, and exports the PNG. Shot scenes live in
// ./shots.js and drive this same state through the `app` object below.
import { SIZES, LAYOUTS, GRADES, drawCover, exportCover, previewQuads, pointInQuad } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('statusLine');
const panelNote = document.getElementById('panelNote');
const panelPhoto = document.getElementById('panelPhoto');
const zoomRange = document.getElementById('zoomRange');
const zoomVal = document.getElementById('zoomVal');
const titleInput = document.getElementById('titleInput');
const subInput = document.getElementById('subInput');

const PREVIEW_PX = { square: [640, 640], portrait: [576, 720], wide: [768, 432] };

const state = {
  photos: [], // { img, name }
  panels: [], // { photo, zoom, ox, oy } — one per layout panel
  layoutId: 'fullbleed',
  gradeId: 'sunset',
  sizeId: 'square',
  title: 'Mandy',
  subtitle: 'Neon Bay — One Last Ride',
  selected: 0,
};

function panelCount() {
  const layout = LAYOUTS.find((l) => l.id === state.layoutId) || LAYOUTS[0];
  // Panel count is the number of quads the layout builds for a 100x100 cover.
  return layout.panels(100, 100).length;
}

function syncPanels() {
  const n = panelCount();
  while (state.panels.length < n) state.panels.push({ photo: 0, zoom: 1, ox: 0, oy: 0 });
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

function renderState() {
  return {
    photos: state.photos.map((p) => p.img),
    panels: state.panels,
    layoutId: state.layoutId,
    gradeId: state.gradeId,
    title: state.title,
    subtitle: state.subtitle,
  };
}

function redraw() {
  syncPanels();
  const [pw, ph] = PREVIEW_PX[state.sizeId];
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  drawCover(canvas, renderState());
  refreshPanelUI();
}

function refreshPanelUI() {
  const n = panelCount();
  panelNote.textContent = state.photos.length === 0
    ? 'Add a photo first — the panels are waiting.'
    : `Panel ${state.selected + 1} of ${n} selected. Drag the preview to pan its photo.`;
  panelPhoto.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '-1';
  empty.textContent = '(empty panel)';
  panelPhoto.appendChild(empty);
  state.photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1} · ${p.name}`;
    panelPhoto.appendChild(opt);
  });
  const slot = state.panels[state.selected] || { photo: 0, zoom: 1 };
  const hasPhoto = state.photos.length > 0 && state.photos[slot.photo];
  panelPhoto.value = hasPhoto ? String(slot.photo) : '-1';
  zoomRange.value = String(slot.zoom || 1);
  zoomVal.textContent = `${(slot.zoom || 1).toFixed(1)}×`;
}

function refreshPhotoStrip() {
  const strip = document.getElementById('photoStrip');
  strip.innerHTML = '';
  state.photos.forEach((p, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'photo-thumb';
    btn.setAttribute('aria-pressed', state.panels.some((s) => s.photo === i) ? 'true' : 'false');
    btn.title = `Use “${p.name}” in the selected panel`;
    const thumb = document.createElement('img');
    thumb.src = p.img.src;
    thumb.alt = p.name;
    btn.appendChild(thumb);
    const x = document.createElement('span');
    x.className = 'x';
    x.textContent = '×';
    x.title = 'Remove this photo';
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      removePhoto(i);
    });
    btn.appendChild(x);
    btn.addEventListener('click', () => {
      syncPanels();
      state.panels[state.selected].photo = i;
      state.panels[state.selected].zoom = 1;
      state.panels[state.selected].ox = 0;
      state.panels[state.selected].oy = 0;
      redraw();
    });
    strip.appendChild(btn);
  });
}

function removePhoto(index) {
  state.photos.splice(index, 1);
  state.panels.forEach((s) => {
    if (s.photo === index) { s.photo = 0; s.zoom = 1; s.ox = 0; s.oy = 0; }
    else if (s.photo > index) s.photo -= 1;
  });
  refreshPhotoStrip();
  redraw();
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not read ${file.name} as an image`));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function loadImageUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

async function addPhotoFiles(files) {
  for (const file of files) {
    if (state.photos.length >= 6) { statusLine.textContent = 'Six photos is the limit — remove one first.'; break; }
    try {
      const img = await loadImageFile(file);
      state.photos.push({ img, name: file.name });
      statusLine.textContent = `Added ${file.name}.`;
    } catch (err) {
      statusLine.textContent = err.message;
    }
  }
  if (state.photos.length > 0) {
    // A panel pointing at a photo index that no longer exists falls back to
    // the first photo; a deliberately empty panel (-1) stays empty.
    state.panels.forEach((s) => { if (s.photo >= state.photos.length) s.photo = 0; });
  }
  refreshPhotoStrip();
  redraw();
}

function buildChips(rowId, items, currentId, onPick) {
  const row = document.getElementById(rowId);
  row.innerHTML = '';
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = item.name || item.label;
    btn.setAttribute('aria-pressed', item.id === currentId ? 'true' : 'false');
    btn.addEventListener('click', () => {
      onPick(item.id);
      buildChips(rowId, items, item.id, onPick);
    });
    row.appendChild(btn);
  });
}

function refreshLayoutChips() {
  buildChips('layoutRow', LAYOUTS, state.layoutId, (id) => {
    state.layoutId = id;
    refreshLayoutChips();
    redraw();
  });
}

function refreshGradeChips() {
  buildChips('gradeRow', GRADES, state.gradeId, (id) => {
    state.gradeId = id;
    refreshGradeChips();
    redraw();
  });
}

function buildSizeChips() {
  const row = document.querySelector('.size-row');
  row.querySelectorAll('.size-chip').forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.size === state.sizeId ? 'true' : 'false');
    btn.onclick = () => { state.sizeId = btn.dataset.size; buildSizeChips(); redraw(); };
  });
}

function bindControls() {
  document.getElementById('photoInput').addEventListener('change', (e) => {
    addPhotoFiles([...e.target.files]);
    e.target.value = '';
  });
  document.getElementById('fillAllBtn').addEventListener('click', () => {
    if (state.photos.length === 0) { statusLine.textContent = 'Add a photo first.'; return; }
    syncPanels();
    state.panels.forEach((s) => { s.photo = 0; s.zoom = 1; s.ox = 0; s.oy = 0; });
    redraw();
    statusLine.textContent = 'Every panel now shows the first photo.';
  });
  buildChips('layoutRow', LAYOUTS, state.layoutId, (id) => { state.layoutId = id; refreshLayoutChips(); redraw(); });
  buildChips('gradeRow', GRADES, state.gradeId, (id) => { state.gradeId = id; refreshGradeChips(); redraw(); });
  buildSizeChips();
  titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
  subInput.addEventListener('input', () => { state.subtitle = subInput.value; redraw(); });
  panelPhoto.addEventListener('change', () => {
    syncPanels();
    // -1 means the panel stays empty; any other value is a photo index.
    state.panels[state.selected].photo = Number(panelPhoto.value);
    redraw();
  });
  zoomRange.addEventListener('input', () => {
    syncPanels();
    state.panels[state.selected].zoom = Number(zoomRange.value);
    redraw();
  });
  document.getElementById('swapBtn').addEventListener('click', () => {
    syncPanels();
    const first = state.panels[0].photo;
    for (let i = 0; i < state.panels.length - 1; i++) state.panels[i].photo = state.panels[i + 1].photo;
    state.panels[state.panels.length - 1].photo = first;
    redraw();
    statusLine.textContent = 'Photos rotated across the panels.';
  });
  document.getElementById('resetPanelBtn').addEventListener('click', () => {
    syncPanels();
    state.panels[state.selected] = { photo: 0, zoom: 1, ox: 0, oy: 0 };
    redraw();
  });
  document.getElementById('exportBtn').addEventListener('click', doExport);
}

async function doExport() {
  const size = SIZES[state.sizeId];
  statusLine.textContent = `Rendering ${size.w} × ${size.h}…`;
  try {
    const blob = await exportCover(renderState(), state.sizeId);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-bay-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusLine.textContent = `Saved neon-bay-cover-${size.w}x${size.h}.png (${(blob.size / 1024).toFixed(0)} KiB).`;
  } catch (err) {
    statusLine.textContent = `Export failed: ${err.message}`;
  }
}

function bindPreviewPointer() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const quads = previewQuads(renderState(), canvas.width, canvas.height);
    const hit = quads.findIndex((q) => pointInQuad(x, y, q));
    if (hit >= 0) {
      state.selected = hit;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      refreshPanelUI();
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    syncPanels();
    const rect = canvas.getBoundingClientRect();
    const slot = state.panels[state.selected];
    slot.ox = Math.max(-0.6, Math.min(0.6, slot.ox + (e.clientX - lastX) / rect.width));
    slot.oy = Math.max(-0.6, Math.min(0.6, slot.oy + (e.clientY - lastY) / rect.height));
    lastX = e.clientX;
    lastY = e.clientY;
    redraw();
  });
  const stop = () => { dragging = false; };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
}

// The shot scenes drive the same editor through this object.
const app = {
  state,
  async loadSample(name) {
    const img = await loadImageUrl(`samples/${name}.jpg`);
    state.photos = [{ img, name: `${name}.jpg` }];
    state.panels.forEach((s) => { s.photo = 0; s.zoom = 1; s.ox = 0; s.oy = 0; });
    refreshPhotoStrip();
    redraw();
  },
  setCaption(title, subtitle) {
    if (title !== undefined) { state.title = title; titleInput.value = title; }
    if (subtitle !== undefined) { state.subtitle = subtitle; subInput.value = subtitle; }
    redraw();
  },
  setLayout(id) { state.layoutId = id; refreshLayoutChips(); redraw(); },
  setGrade(id) { state.gradeId = id; refreshGradeChips(); redraw(); },
  setSize(id) { state.sizeId = id; buildSizeChips(); redraw(); },
  async showExportedCover(sizeId) {
    const blob = await exportCover(renderState(), sizeId);
    const url = URL.createObjectURL(blob);
    const stage = document.getElementById('coverStage');
    const img = document.getElementById('coverImg');
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('cover image failed to load'));
      img.src = url;
    });
    document.body.classList.add('shot-cover');
    stage.hidden = false;
  },
};

// For automated checks: the live state and the export function.
window.__neonBay = { state, renderState, exportCover, redraw };

bindControls();
bindPreviewPointer();
syncPanels();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
document.fonts.load('700 100px "NeonBay Bold"').finally(() => {
  redraw();
  if (shot) runShot(shot, query, app);
});
