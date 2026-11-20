# Neon Bay Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/willysaputra0505/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/willysaputra0505/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Neon Bay Cover Studio turns your photos and a caption into multi-panel GTA-style
cover art — the bold, comic-book look of a game cover, built from your own shots.
Everything runs offline in the browser: pick up to four photos, arrange them into
panels, add a title and caption, tune the neon palette, and export a finished
cover as a PNG in 1080×1080 (square), 1080×1350 (portrait), or 1920×1080
(landscape).

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in your browser.

## How it works

1. Drop in 1–4 photos — they become the cover's panels.
2. Type a title and caption, pick a layout and a neon accent colour.
3. Preview the cover live, then export it as a PNG at your chosen size.

No uploads, no accounts, no network calls: your photos never leave your machine.

## Export sizes

| Size | Use |
| --- | --- |
| 1080×1080 | Square post / album cover |
| 1080×1350 | Portrait post |
| 1920×1080 | Landscape banner / wallpaper |

Exports are rendered at full resolution from the same canvas you preview, so what
you see is exactly what you get.
