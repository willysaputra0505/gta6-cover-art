// Fixed scenes for screenshots, driven by the page query string:
//   ?shot=editor&photo=pier&caption=Sunset%20Heist&layout=hero&grade=sunset
//   ?shot=cover&photo=boulevard&caption=Boulevard%20Queen&layout=grid&size=wide
// `editor` shows the studio with a sample photo loaded; `cover` shows the PNG
// the app itself exported, full-bleed. Either way window.__shotReady is set
// once the scene has painted, so a screenshot tool can wait on it.
export async function runShot(shot, query, app) {
  const photo = query.get('photo') || 'pier';
  const caption = query.get('caption') || 'Sunset Heist';
  const subtitle = query.get('subtitle') || undefined;
  const layout = query.get('layout') || 'hero';
  const grade = query.get('grade') || 'sunset';
  const size = query.get('size') || 'square';

  app.setLayout(layout);
  app.setGrade(grade);
  app.setSize(size);
  await app.loadSample(photo);
  app.setCaption(caption, subtitle);

  if (shot === 'cover') {
    await app.showExportedCover(size);
  }
  // Two frames so the canvas paint and the staged image both land.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
