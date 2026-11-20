// Fixed scenes for screenshots, driven by the page query string:
//   ?shot=editor&photo=mandy-neon&caption=Mandy&layout=grid&grade=sunset
//   ?shot=cover&photo=mandy-portrait&caption=Mandy&layout=hero&size=wide
// `editor` shows the studio with a sample photo loaded; `cover` shows the PNG
// the app itself exported, full-bleed. Either way window.__shotReady is set
// once the scene has painted, so a screenshot tool can wait on it.
export async function runShot(shot, query, app) {
  const photo = query.get('photo') || 'mandy-portrait';
  const caption = query.get('caption') || 'Mandy';
  const subtitle = query.get('subtitle') || undefined;
  const layout = query.get('layout') || 'hero';
  const grade = query.get('grade') || 'sunset';
  const size = query.get('size') || 'square';

  app.setLayout(layout);
  app.setGrade(grade);
  app.setSize(size);
  await app.loadSample(photo);
  app.setCaption(caption, subtitle);

  // Tall sample photos cover-fit to the torso at zoom 1, so wide panels
  // (hero, grid) cut the subject's face off. A downward shift pulls the
  // face back into frame. Tall panels (triptych, slant) already show the
  // full height, so they leave oy at 0. Full Bleed needs no oy at all: it
  // contain-fits the whole photo, so the subject is never cropped.
  const oy = Number.parseFloat(query.get('oy') || '0') || 0;
  if (oy !== 0) {
    window.__neonBay.state.panels.forEach((p) => { p.oy = oy; });
    window.__neonBay.redraw();
  }

  if (shot === 'cover') {
    await app.showExportedCover(size);
  }
  // Two frames so the canvas paint and the staged image both land.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
