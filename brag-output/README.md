# /brag launch videos

Two cuts of a 21.6-second WanderLuxe launch video, made with the `/brag` Claude Code plugin (v0.2.2) and Hyperframes 0.8.44.

| Cut | Folder |
|---|---|
| Landscape, 1920×1080 | `brag-output/` |
| Vertical, 1080×1920 (Reels, TikTok, Shorts) | `brag-output-2026-09-17-082407/` |

Each folder holds:

- `brag.mp4`: the video. The poster is baked into frame 0 so players and feeds show it as the thumbnail.
- `brag.jpg`: the poster, the 9.15s frame where the flight lands on Oct 3. Use it where a platform takes a custom cover.
- `share-copy.txt`: the caption.
- `brag-plan.md`, `composition-brief.md`: the storyboard and the Hyperframes brief.
- `composition/`: the Hyperframes project that renders the video.

On-screen copy comes from the landing page. The phone screenshots are `public/images/app-*.jpg`. The three Print Studio editions were rendered by the real `PrintDocument` from the fixtures in `src/components/landing/print-showcase/`. The SFX are from Kenney (CC0). The fonts are the DM Serif Display and DM Sans files from `src/assets/fonts/pdf/` (OFL).

## Re-rendering

The music bed (`happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`, from ende.app) is not in git, because it is a third-party track and this repo is public. Check its license before redistributing the raw file. Copy it into both compositions from the `/brag` plugin:

```bash
TRACK=~/.claude/plugins/cache/brag/brag/0.2.2/skills/brag/assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3
cp "$TRACK" brag-output/composition/assets/music/
cp "$TRACK" brag-output-2026-09-17-082407/composition/assets/music/
```

Then, from a `composition/` folder (Node 22+ and FFmpeg required):

```bash
npx hyperframes@0.8.44 check
npx hyperframes@0.8.44 render --quality delivery --output ../brag.mp4
```

`check --at-transitions` takes many minutes here because of the audio-reactive keyframes. Plain `check` is enough.

The delivered files got two finishing steps after the render. Run them from the cut's folder: they extract the poster, bake it into frame 0, and raise the audio from about −26 to about −16 LUFS. The limiter only touches the SFX peaks.

```bash
ffmpeg -y -ss 9.15 -i brag.mp4 -frames:v 1 -q:v 2 brag.jpg
ffmpeg -y -i brag.mp4 -i brag.jpg \
  -filter_complex "[0:v][1:v]overlay=0:0:enable='eq(n,0)'[v];[0:a]volume=10.1dB,alimiter=limit=0.79:attack=4:release=60:level=false[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart brag.poster.mp4 && mv brag.poster.mp4 brag.mp4
```
