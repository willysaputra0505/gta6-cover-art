// Neon Bay Cover Studio — the entrypoint for gta6-cover-art-01 (Node 22,
// standard library only). It hands the app in: it copies this repository's
// app/ and screenshots/ into the output directory and writes dossier.json
// there with the vendored make.fun library.
//
// The app itself is plain static files under app/ (index.html plus its own
// ES modules, a bundled DejaVu font and two sample photos), made to open in
// desktop Chrome with no network request at all.
//
// Before copying anything it runs a loud pre-flight check: app/index.html has
// to exist (a missing entrypoint would hand in a broken app), and the
// screenshots have to already meet the gate's caps, so a bad screenshot fails
// here instead of silently reaching the scorer. Any failure throws and the
// program exits non-zero.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// --- Pre-flight: refuse to hand in a broken entry. -------------------------
const indexHtml = join(here, 'app', 'index.html');
if (!existsSync(indexHtml) || !statSync(indexHtml).isFile()) {
  throw new Error(`Pre-flight failed: app/index.html is missing at ${indexHtml}`);
}
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) {
  throw new Error(`Pre-flight failed: screenshots/ is missing at ${shotsDir}`);
}
const shotFiles = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`Pre-flight failed: screenshots/ holds ${shotFiles.length} files, the gate wants 3 or 4`);
}
for (const name of shotFiles) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > 262144) {
    throw new Error(`Pre-flight failed: screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

// --- Copy the entry and write the dossier. ----------------------------------
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files, in all, or a path under app/ over 1000 bytes: app/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
