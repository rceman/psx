# HOLLOW STREET — PSX Scene 001

**Goal:** recreate the specific user-provided 1206 × 847 nighttime street / porch screenshot in interactive Three.js, then compare the output to the reference by aligning the camera. This is an experimental reference reconstruction — not a new scene inspired only by the franchise.

[Launch on GitHub Pages, once enabled](https://rceman.github.io/psx/) · [Edit the texture draft](assets/UV_ATLAS_DRAFT.svg) · [ImageGen instructions](assets/IMAGEGEN_PROMPT.md)

## Current implementation

- Static initial reference-matching camera, plus optional follow camera.
- Parked gray station wagon on the left, two canopy columns, recessed black corridor, dirty green facade, gray entry door with sign, bushes on the right, blue-jeans/black-jacket low-poly walking character.
- WASD / arrows for movement; Shift for run; F flashlight; C toggle static/follow camera; R reset. Mobile on-screen D-pad, RUN, LIGHT.
- 320-ish × 240 render (adjustable), nearest-neighbor upscale, framebuffer RGB555-like quantization with ordered dithering, film grain and vignette, vertex snapping, affine UV warping, distance fog, particle flecks.
- **Reference-match control:** under Graphics Settings load the user's screenshot from local storage (never uploaded), drag the reference opacity slider, adjust FOV/camera coordinates to improve framing. Original image reference 1206 × 847; the best comparison is at similar aspect ratio.
- Runtime-generated original low-poly meshes and procedural textures, currently stand-ins for original game models. No game binaries, extracted textures or copyrighted mesh payloads checked into this repo.
- **Unified UV texture atlas contract:** see `assets/atlas-layout.json`. Four rows × four columns, 256 × 256 texels each, yielding 1024 × 1024 PNG.
- The `EXPORT 1024px BASE ATLAS` control saves the original procedural base, helpful as an additional input for texture generation.
- Place an artist-generated `assets/atlas.png` in the repo and reload the page. All 16 generated material textures are replaced from the corresponding atlas cells automatically. No shader/material code edits required.

## Diagnostics (iPhone Safari / desktop)

A permanently visible **COPY DEBUG LOG** button copies the latest initialization,
JavaScript, asset load, Three.js console warnings/errors, shader compile/link failures,
WebGL context events, canvas size, renderer statistics and a center pixel probe.
The logger is initialized before the `game.js` ES module, so it also reports
when the Three.js CDN cannot load. The report intentionally omits query strings
and does not upload anything.

A separate **VISIBILITY TEST** button disables fog and replaces scene materials
with bright untextured colors, retaining the same geometry and camera. It helps
distinguish PSX shader/lighting problems from missing objects. Tap **RESTORE
PSX VIEW** to return to the textured view.

The scene camera permanently retains the screenshot's 1206:847 aspect ratio.
On portrait displays, the 3D image is letterboxed to prevent horizontal
cropping instead of distorting the scene. Debug v2 logs **actual 3D scene**
draw calls/triangles separately from the final 2-triangle post-processing pass,
plus a 3×3 brightness distribution of the off-screen render target.

On iOS Safari, tap **COPY DEBUG LOG** and paste the result into a bug report or
the ChatGPT conversation. If the Clipboard API is unavailable, the app presents
a selectable text report as a fallback. Renderer statistics and the 8×8 center
pixel probe are snapshots, not a guarantee that the frame visually matches
the target reference.

To develop and visually verify, run a local HTTP server and inspect the
WebGL canvas with a real browser (Playwright is useful for repeatable desktop
screenshots). The published site cannot be assumed healthy solely from CI
syntax checks.

## Scene placement / reference calibration

The source reference is a ~1206 × 847 screenshot. Approximate visual targets:

| Target | Reference pixel region |
|---|---|
| Station wagon | left, x:0–320 / y:405–680 |
| Main canopy support | x:519–553 / y:90–728 |
| Entry door | x:684–777 / y:279–570 |
| Person | x:675–817 / y:372–770 |
| Right hedge | x:790–1206 / y:538–846 |
| Near-black passage | x:310–500 / y:166–544 |

Main facade plane: z≈−3.85; door center x≈2; character at (x=2.57, z=2.02); initial camera at (0.7,2.7,8.9) with FOV 48°. **These world coordinates are draft calibration values, not measured original Silent Hill geometry**. Current proportions are approximate until screenshot overlay tuning and/or original game level extraction.

### Source models investigation

- [Silent Hill file format and extraction reference](https://github.com/Sparagas/Silent-Hill).
- [Silent Hill map/IPD/PLM editing](https://github.com/msimonetto/sh1-level-editor).
- [Silent Hill PC port asset and model extraction guide](https://github.com/SlickAmogus/silent-hill-decomp/blob/pc-port/pc_port/docs/Modding_And_Extraction_Guide.md).
- [Fan-made Harry Mason PS1-style FBX on Sketchfab](https://sketchfab.com/3d-models/harry-mason-f7d35fa083c645c7a8e0404b57c824c1), CC BY; **not incorporated here**.

The actual game models may exist in the original game data, but obtaining the game files, determining the matching map and extracting its textures is a separate asset recovery task. This repository does not represent the procedural placeholder as an original model.

**Better route for exact geometry:** load your own game copy in DuckStation and use [DuckStation 3D Screenshot](https://github.com/scurest/duckstation-3D-Screenshot) to capture the **same frame** as OBJ + textures. See [the documented model/scene capture workflow](https://archive.vg-resource.com/archive/index.php/thread-43171.html): disable culling, capture front/back, PGXP, then import OBJ in Blender, fix transforms and export glTF/GLB. This provides the exact visible street, columns, wall and wagon instead of the current handmade substitutes. Preserve exported UVs and original material IDs; after import, create a character/architecture UV-specific layout rather than forcing the generic 16-cell atlas onto extracted meshes. Coordinate/image alignment still requires verification.

## Texture workflow

1. Open `assets/UV_ATLAS_DRAFT.svg` and the source screenshot in ImageGen; paste `assets/IMAGEGEN_PROMPT.md`.
2. Ask for one 1024 × 1024 PNG with strict four-by-four square tiling. Do not allow labels/grid into the final paint.
3. Upload the output as `assets/atlas.png` on `gh-pages`. The app detects it automatically; refresh after committing.
4. Tweak low resolution, wobble, affine amount, grain, fog and dithering to compare PS1 render output.

**Important:** the atlas is a *material atlas*, not original character or car mesh-unwrapped UVs. Extracted or custom high-quality meshes later require a real per-model UV unwrap, conversion and import. Current geometry UVs are basic face-local projections.

## GitHub Pages

GitHub doesn't publish arbitrary branches automatically unless Pages is enabled. Go to `https://github.com/rceman/psx/settings/pages` → **Build and deployment** → **Deploy from a branch** → branch **gh-pages** → directory **/(root)** → **Save**. GitHub should then publish at `https://rceman.github.io/psx/`. The site needs WebGL and network access to the pinned Three.js module on jsDelivr.

This is a pure static app: no bundling/build command. Serve it locally with `python3 -m http.server 8000` and open `http://localhost:8000`. The JS module CDN requires internet.

## Engineering caveats

- PS1 perspective wobble is approximated by GLSL shader hooks on modern WebGL, not emulation of Sony GPU microcode.
- RGB555-style quantization, affine UV and snapping are tunable artistic approximations of the 1990s PS1 pipeline.
- No actual browser screenshot/visual-difference QA performed in the development environment. Visual calibration is still necessary before calling this a 1:1 recreation.
- No original Silent Hill content is shipped in the public gh-pages branch.

