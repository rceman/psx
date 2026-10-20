# PSX / HOLLOW STREET — CRT Atmosphere V1
**Status:** APPROVED FOR IMPLEMENTATION AS A PROPOSAL; no implementation yet  
**Work type:** Renderer architecture + measurable visual-quality experiment  
**Target:** Web / Three.js / WebGL2, especially iPhone Safari and desktop Chrome  
**Source:** \`rceman/psx\`, branch \`gh-pages\`, inspected 2026-10-20  
**Implementation branch:** create \`feature/crt-atmosphere-v1\` FROM \`spec/crt-atmosphere-v1\`  
**Scope:** reference-scene lighting, rendering/postprocess pipeline, presets, UI, diagnostics, tests, documentation  
**Do not alter:** original scene identity/composition, production texture atlas layout, movement/gameplay, underlying engine

## 0. Non-negotiable project goal

Reproduce the *experience* of playing Silent Hill 1-era PlayStation visuals on a good consumer CRT, **within a modern browser**, while **keeping the specific user's original 1206×847 street/porch reference scene**. We are not building a generic abandoned street, an emulator, a game remake, a CRT hardware simulator, or a full new engine.

Desired perceptual properties:
- Deep, distinguishable blacks rather than an all-black crushed screen.
- Visible local cues: Harry-like character silhouette, door, post, curb, hedge and car.
- Highlights, subtle halation and soft analog texture; no aggressive bloom.
- Fog with actual foreground/midground/background separation rather than uniform gray wash.
- Stable gritty low-res PS1 geometry, pixel textures, subtle affine UV warp and dithering.
- CRT-inspired scanline/beam softness and (optionally) aperture mask without obvious pattern, moiré or color fringes.
- Plausible *simulation*, not a claim of exact CRT optical/electrical reproduction. LCD/OLED brightness, pixel layouts, viewing conditions and a physical CRT cannot be matched perfectly.

**Primary visual reference:** the screenshot in the user's chat showing an outdoor green building, gray station wagon on the LEFT, canopy and columns, entry door, hedge and standing character; resolution approximately 1206×847. This scene layout is the canonical composition. The user's later YouTube screenshots about SH1 on Sony Trinitron demonstrate desired *tonal/CRT atmosphere*, **not an alternate scene/level to build**. Ask for the original reference image if it is not available to the agent locally; never replace it by arbitrary Silent Hill screenshots.

Success is judged against **the same reference camera, same textures and same scene**, with only the renderer/presets changed. Geometry asset fidelity is a separate milestone. Do not claim pixel-identical reproduction without source assets and image-based verification.

## 1. Current repo audit (facts, not assumptions)

The inspected \`gh-pages\` baseline currently contains:
- \`game.js\` (~606 lines): scene generation, camera, input, movement, atlas slicing, \`MeshLambertMaterial.onBeforeCompile\` PSX effects, rendering, settings.
- \`index.html\`, \`style.css\`, \`preview-v5.html\`: graphics sliders; fixed reference camera composition on a letterboxed portrait display.
- \`debug.js\`: pre-module console/error capture, COPY DEBUG LOG, VISIBILITY TEST, raw center/grid probes and display probe, WebGL/scene statistics.
- \`assets/atlas.png\`, \`assets/atlas-layout.json\`: 4×4 texture atlas, 16 cells. Uploaded image is generated and may not be exactly 1024×1024; runtime slices using naturalWidth/4 and naturalHeight/4 into 256² material canvases.
- \`scripts/webgl-smoke.mjs\`, \`.github/workflows/validate.yml\`: current browser-smoke infrastructure, but previous successful real-browser tests are **not established**. Audit and make CI truly reliable.

Observed baseline pipeline:
1. Mesh lighting/materials + exponential distance fog into low-resolution \`WebGLRenderTarget\` (240 high × ~342 wide, aspect 1206/847).
2. A fullscreen \`ShaderMaterial\` applies exponential brightening, noise, Bayer dithering, RGB555-like quantization and vignette.
3. Last pass nearest-neighbor presentation in a centered, letterboxed region.
4. \`renderer.outputColorSpace = THREE.SRGBColorSpace\`, \`renderer.toneMapping = THREE.NoToneMapping\`; scene RT texture marked sRGB.

Baseline gotchas to address:
- Current 170% exposure is a **visibility workaround**, not CRT grading. The postprocess can lift blacks indiscriminately and wash textures out.
- Current fog is \`FogExp2\` with one density/color; height fog is absent. If actual depth data is unavailable, do NOT fake height fog with a 2D vertical screen gradient.
- Shadowed areas can become illegible on a phone. Target structured contrast rather than blanket brightening.
- Three.js color space conversions may differ for custom \`ShaderMaterial\`; prove whether each stage expects linear or sRGB and **encode to display sRGB exactly once**. Do not introduce double gamma/exposure.
- In prior reports, \`renderer.info.render.calls=1,triangles=2\` measured postprocessing alone. Use saved scene-pass stats and evidence.
- Earlier iOS Safari reports showed 146×240 and DEBUG v1 due to old cached code. Current working target is ~342×240 and DEBUG v3/Build 5. Versioned resources and build ID in logs are mandatory.
- Scene/atlas and geometry may still differ substantially from the reference screenshot: **do not disguise this with CRT distortion**. Mark geometry drift as separate issue.

Before work: record initial git SHA, state, visible screenshots and actual browser errors, check original mobile rendering and verify atlas load. Do not silently rewrite the existing scene.

## 2. Required deliverables

1. **Three switchable modes (same world geometry/camera):**
   - \`DEBUG_VISIBLE\`: high readability, neutral non-CRT output, fog configurable, no CRT mask/bloom, basic debug controls. **Preserve separate "Visibility Test" wireframe/bright-material switch** as diagnostic independent of preset.
   - \`PS1_LCD\`: PS1 vertex snap/affine UV/low-res/RGB555+dither; no analog CRT display effects.
   - \`CRT_ATMOSPHERE\`: same PS1 rasterization as \`PS1_LCD\` + carefully graded contrast, CRT-inspired softness, localized bloom/halation, subtle scanline/mask and optional minimal channel bleed. Main showcase mode.
2. **A clean scene → tone → analog-display pipeline** with explicit color management, WebGL2 compatibility and no custom engine.
3. **Distance fog + controlled height contribution** on physically motivated world-space or depth data, not screen Y hack; preserve local lights and silhouettes.
4. Preset selector + advanced effect controls; sensible mobile defaults, persisted safely and resettable.
5. Side-by-side (or A/B capture) evidence with locked camera/frame, automatic stats, desktop/mobile screenshots, real iPhone Safari validation.
6. Repeatable tests + docs + screenshot/log evidence. CI must fail on shader compile/link errors, missing main scene draw calls, broken resource load, broken settings or unreadably black output.
7. Release-ready PR/branch, without editing \`main\` or deploying to \`gh-pages\` until explicitly approved.

## 3. Renderer architecture and color contract

**Remain on Three.js** (currently CDN-pinned to r180), WebGL2 and the static GH Pages deployment model. Do NOT switch to C++, software rasterization, Godot or Unity.

Organize rendering logic into bounded modules **only if it measurably improves maintainability**; recommended layout (may adapt to current simple static ESM structure):
\`\`\`
src/render/
  color.js            # linear/sRGB helpers, pixel-grade contracts
  presets.js          # immutable validated presets + ranges
  pipeline.js         # render target lifetime, resize, passes, fallbacks
  fog.js              # parameters and world/depth-aware fog contract
  crt.js              # fullscreen CRT composition uniforms/shaders
  diagnostics.js      # render pass metrics and capture helpers
\`\`\`
Retain \`game.js\` as a small scene/bootstrap client once migrated. No mandatory Vite/npm production build; if introducing a build/bundler, justify with measured benefit, ensure GH Pages root remains deployable and lock dependencies. Never silently duplicate two rendering paths.

### Color-space contract

Choose a documented, reproducible working-space path:
- Sample artist textures as correctly tagged **sRGB** source data.
- Do lighting, fog mixes, contrast/tone operations and bloom extraction in a **defined linear working space** (unless a specific perceptual operation intentionally runs in display-encoded values, and is explicitly documented).
- Use either a linear (preferably half-float, if supported) working RT or a supported sRGB RT with a verified decode/encode contract. Have an RGBA8/sRGB-compatible fallback on iOS when float attachments or filtering are unavailable. **Do not assume float color-buffer renderability across devices**.
- Decide and document exact order and transfer functions; final output must be encoded **once** to the renderer's sRGB display target. For custom shader materials, verify \`colorspace_fragment\` or explicitly equivalent conversion; avoid double conversion through mixed raw and managed shader stages.
- Keep alpha opaque for scene output; letterbox clear must be deterministic.
- Use static test swatches (black, near-black, 18% mid gray, neutral gray, near-white, colored patches) and assert captured pixel error vs expected ranges across browsers.
- Count render passes/GPUs resources; dispose replaced FBOs and shaders on resize/mode switching.

**Proposed logical frame graph** (actual pass count may be optimized):
\`\`\`
 [scene / world materials / lights / PS1 geometry / world-space fog]
                     |
              SceneColor RT
        (fixed 1206:847, e.g. 342×240)
                     |
       [PS1 palette / ordered dither]
                     |
        [tone map & controlled grade]
                     |
        [bright-pass/downsample/blur] ---- optional & bounded
                     |                     (CRT only)
     [display compositor / upscale / localized halation /
      CRT beam/softness/scanline/mask at physical display scale]
                     |
      [single final sRGB conversion and present]
\`\`\`
For correctness, bloom may be extracted **before** final display encoding and **before** CRT mask; RGB555 quantization should reflect PS1 output, not be applied independently to an already-graded modern post-effect. The agent may adjust pass ordering to satisfy these contracts, but must document it with tests and screenshots.

Current vertex snapping and affine texturing MUST remain adjustable (0–100% each), preserve the model/UV pipeline and not be disabled in CRT mode. Camera matrices, fog uniforms, upload/reference overlay and flashlight behavior must remain stable.

## 4. Tonal response: darkness with readable silhouettes

Central principle: **do not use a large uniform exposure boost to compensate for low lighting**.

Implement a documented tone/contrast function:
- Controls: \`exposure\`, \`contrast\`, \`blackPoint\`, \`midtoneLift\`, \`highlightGain\`, \`saturation\`.
- Favor monotonic, continuous mapping with no hue shifts for grayscale patches; clamp only at intentional stages.
- Expose ability to preserve truly dark region (~0–2% luma) while separating important objects (~5–30% luma) from their immediate background.
- Avoid crushed shadows: identify pixel contrast around person/door/post/hedge. Keep the black interior darker than the surrounding wall.
- No hardcoded gamma values copied from internet shader presets without checking how color spaces are encoded and whether gamma is applied twice.
- Prefer adjusting actual ambient/key/door/flashlight contribution to restore **local** contrast rather than globally raising the black floor. Disable any brightness/contrast effect selectively to debug.

**Initial tuning ranges** (normalized UI percentages may differ; these are STARTING HYPOTHESES, not reference-calibrated truth):

| Parameter | Target range | CRT starting value | Constraint |
|---|---:|---:|---|
| Exposure | 0.80–2.00 | 1.15 | retain saved existing setting via migration, do not force 1.70 |
| Contrast | 0.75–1.50 | 1.18 | curve centered on midtones |
| Black point | 0.00–0.10 | 0.025 | never crush player/door outlines |
| Midtone lift | −0.10–0.20 | 0.045 | neutral curve adjustment |
| Highlight gain | 0.80–1.40 | 1.08 | avoid broadly glowing walls |
| Saturation | 0.60–1.20 | 0.88 | preserve muddy green/gray palette |
| Vignette | 0.00–0.45 | 0.16 | edge-only, avoid obscuring HUD |
| Grain | 0.00–0.40 | 0.15 | stable/fine and subdued |

These must be validated in the real scene; do not implement preset numbers as hard requirements if visual measurements show otherwise.

## 5. Fog: spatial depth, not gray overlay

Implement fog as part of the scene/world-space render, before CRT display processing. Contract:
- Distance fog controls: \`nearDistance\`, \`farDistance\` OR \`density\` with clear physical mapping, not multiple conflicting terms.
- Optional **world-height** response (\`heightBase\`, \`heightFalloff\`, \`heightInfluence\`), using world position in shader or verified depth reconstruction. This should be subtle; disabled by default if correctness/performance cannot be demonstrated.
- In front of player (near): crisp silhouette and texture; midground: gradual material contrast reduction; deep alley: obscured with low-saturation desaturated fog and deep black.
- Fog hue desaturated green/gray/brown. Initial candidates: #525d55, #5c635a, #63685f; treat as examples, **not a mandate**. Use swatches and reference rather than blindly brightening all distance.
- Player-mounted flashlight modulates nearby surfaces via lighting; a fog volume glow can be an OPTIONAL specialized effect, not a screen-space cone painted over image.
- Runtime controls: fog density/distance, height strength, color (limited swatches). Presets may share base fog parameters but debug mode can turn them down.
- If the pipeline uses \`FogExp2\` unchanged in V1, call the result "distance fog only" and explicitly defer height fog — do not claim it exists. This fallback is acceptable only if its visual depth is demonstrably adequate.

## 6. CRT display simulation: subtle, technically grounded

Use CRT-Royale and Libretro shader docs as REFERENCES for terminology and effect families, **not** as code to copy wholesale: the point is a small WebGL2 mobile-friendly approximation. Recommended switches and controls:

### 6.1 Softening / beam response
- Filter the low-res scene with a small bounded kernel. E.g. blend 70–90% original PS1 pixel image with 10–30% lightly filtered result; tune at final scale.
- Preserve large low-poly edges; avoid smearing text, foreground silhouettes and bright hairline details.
- Do NOT blur HTML/UI/HUD. Effect applies only inside the letterboxed presentation rectangle.
- Interpret texture resolution and output pixel ratio separately; use the **native render pixel grid** (342×240) for intended pixel artifacts.

### 6.2 Halation / highlight glow
- Extract high-luminance bright-pass of scene (start threshold around 0.55–0.75 *in the documented color space*).
- Blur at reduced resolution, composite additively/screen-style in **linear** color; attenuation prevents dulling dark areas.
- Should appear around relevant lamps, shiny metal and flashlight reflections, NOT across all midtone surfaces.
- Strength default 0.10–0.15 (artistic normalized), soft radius ~1–3 source pixels.
- Limit blur taps/texture reads; use separable or dual-filter approximation when cheaper. Do not integrate full Unreal-like bloom.

### 6.3 Scanline / beam modulation
- CRT beams/scanlines should align to the **source pixel-row geometry and display scale**; never use naive alternating physical output pixels regardless of scale.
- Start with 0.05–0.12 intensity. Smooth response, no visible rolling bands, no severe horizontal moiré on iPhone portrait.
- No mandatory interlacing: PS1 output mode varies, and 240p-era scanline-style effect is sufficient for this experiment.
- Disable or attenuate on noninteger scaling when sampling cannot remain stable.

### 6.4 Phosphor aperture/slot mask
- Optional display-space mask; start weak or OFF on mobile.
- Mask must be based on true *drawing-buffer pixel size* and browser DPR, not assumed 1:1 CSS pixels.
- **Do not rely on red-vs-green channel differences as the only signal.** Avoid conspicuous triads that worsen readability for mild protan color vision deficiency.
- If effective physical upscaling does not support stable mask texel density, auto-disable mask; explain the fallback in UI/debug log.
- Prefer luminance texture/scanlines over distinct RGB stripes on low-res phone displays. Do not introduce fake color fringing by default.

### 6.5 Optional very subtle composite chroma softness
- \`chromaBleed\` range 0–0.15, default 0–0.03, at most ~fraction of an output texel.
- Zero visible colored outlines on the character, and do not encode nostalgic "VHS tracking glitches".
- No arbitrary random global jitter, no chromatic aberration always on, no fake VHS noise/tape tears.

### 6.6 Vignette / grain / quantization
- Continue current RGB555-like / Bayer behavior in the **PS1 stage**, with explicit test for PS1_LCD mode.
- Avoid applying PS1 color quantization again to bright CRT glow if it causes harsh banding; document stage ordering.
- Grain should be subtle and time-stable at typical play framerate, ideally decorrelated without aggressive sparkling.
- Vignette should not create a black hole at 4:3/1206:847 edges or erase HUD contrast.

### 6.7 CRT performance tiers
- \`CRT_FULL\` desktop: all effects configurable, modest bloom and optional mask.
- \`CRT_LITE\` default mobile: tone response + simple softening + cheap glow + restrained scanlines, mask OFF if unsupported.
- Avoid WebGL readPixels every frame; capture pixels on demand or throttled diagnostics.
- Instrument actual GPU/CPU timings where possible. No forced DPR=3 for WebGL presentation.
- Choose output target scaling carefully: source 342×240 should not change based on window ratio; display may use DPR 1–2 independently.
- For portrait 402×660, do not stretch 1206:847 image to full screen. Keep letterboxing; CRT effects apply to image area only.
- No allocation of intermediate render targets inside the frame loop.

## 7. Modes, presets and overrides

Mode selector visible outside advanced settings:
- \`DEBUG_VISIBLE\` — neutral/non-CRT, high readability, supports VISIBILITY TEST separately.
- \`PS1_LCD\` — PS1 hardware-style artifacts without simulated CRT display.
- \`CRT_ATMOSPHERE\` — primary preset, simulates CRT tonal response and analog softness.

**Important experimental parity:** world geometry, scene clock/time, character position, input, camera, UV, textures, FOV, PS1 geometry snap, affine warp and source resolution remain identical when toggling between PS1_LCD and CRT_ATMOSPHERE. The **only** intentional differences are CRT display/tone/fog/lighting parameters, logged explicitly. For strict CRT-vs-LCD display comparison, provide **"Lock scene lighting & fog"** toggle (default ON) so only display-processing effects change. DEBUG_VISIBLE may change scene fill/fog with a clear label.

Settings are a **validated data object** with schema/version:
\`\`\`js
{
  schemaVersion: 1,
  mode: "CRT_ATMOSPHERE",
  quality: "auto",              // full | lite | auto
  lockedWorld: true,            // contrast experiment switch
  base: {renderHeight:240, vertexSnap:1, affineWarp:.75, dither:.7},
  atmosphere: {
    exposure:1.15, contrast:1.18, blackPoint:.025,
    midtoneLift:.045, highlightGain:1.08, saturation:.88,
    fogDensity:0.04, fogHeightStrength:0
  },
  crt: {
    softness:.16, halation:.12, bloomThreshold:.68,
    scanlines:.08, mask:.0, chromaBleed:.01, vignette:.16, grain:.15
  }
}
\`\`\`
Values are draft engineering defaults; after reference calibration freeze exact v1 values in presets + tests.

- UI uses sensible labels, values, bounded ranges, one-click \`Reset to preset\`, \`Reset all to defaults\`, A/B toggle.
- Sliders grouped by Tone, Fog, CRT and PS1; avoid crowding the iPhone viewport. Controls accessible with touch and keyboard, min touch targets ~44 CSS pixels, usable in portrait and landscape.
- Collapsed graphics settings remains default on mobile. Preset selector stays available without obscuring subject.
- Persist explicit current mode and overrides in localStorage with namespace \`psx-render-v1\`, safely validate after parse; no huge objects, sensitive data, screenshot URLs, or image blobs persisted.
- Migrate old \`psx-scene-exposure\` by interpreting it as an explicit user override only if present and valid; do not let stale default 1.7 silently override CRT's new authored profile. Document precedence.
- Preset changes should **not** recompile all scene material shaders or recreate the player; use uniforms + reuse assets where feasible.
- Logging: on startup include build ID, mode, pipeline color contract, actual quality tier, reason for fallback, render/present dimensions, real scene draw calls and 3×3 brightness probes.

## 8. Scene lighting and local readability gates

Use the scene's existing objects; **no new scene geometry** in this milestone. Important anchor targets relative to reference screenshot:
- Wagon parked left foreground.
- Thin vertical canopy post near central x, extending to ground.
- Muted green facade, darker brown lower facade band.
- Door slightly right of center.
- Walker close to right side of door.
- Very dark open passage left.
- Low bush row on the right; worn gray pedestrian walkway.

Rule: do NOT make wall uniformly light green, flatten the door into facade, blow out concrete, turn the car into glossy PBR metal or illuminate entire black passage. Prefer two/three meaningful local luminance zones:
1. Warm-ish gray localized light by door / character and adjacent wall.
2. Cooler desaturated ambient fill in front pavement/wagon.
3. Recessed passages mostly in shadow, disappearing with fog.
Lighting tweaks are allowed only when evidence shows tone curves alone insufficient; keep photometric intent consistent between PS1_LCD and CRT_ATMOSPHERE in lockedWorld mode.

A composition overlay is already implemented: keep the local reference-image upload and alpha slider functional, **with zero network upload**. Overlay must match letterboxed image rectangle on resize/orientation change.

## 9. Tests and measurable acceptance criteria

### 9.1 Non-visual regression, required
- \`node --check game.js\`, \`node --check debug.js\` plus every new ES module.
- No shader compile/link warnings/errors on Chrome WebGL2 and real iOS Safari. Capture console (including fragment/vertex shader logs).
- Canvas runs for 60 s and supports mode toggling (A→B→C→A), resize, device orientation, flashlight toggle, walking, map atlas load, reset, VISIBILITY TEST ON/OFF, and screenshot overlay.
- Postprocessing never resets camera/character position or changes source render aspect.
- On reference camera, source framebuffer is approximately **342×240** at the 240p setting, aspect \`1206/847\`. Desktop ~1206×847 and iPhone portrait 402×660 use same world image with letterboxes.
- No live module/CDN errors. If Three.js CDN unavailable, debug overlay clearly reports inability to load; never label scene ACTIVE erroneously.
- \`assets/atlas.png\` loads; changing exposure does not corrupt atlas nor touch \`assets/atlas-layout.json\`.
- Settings migrate, survive reload, reject invalid localStorage JSON/out-of-range values safely.
- GPU context lost/recovery is handled or clearly produces recoverable reload path; no silent blank screen.

### 9.2 Automated screenshot evidence, required
Create reproducible CI/browser capture for:
- 1206×847 desktop, 402×660 portrait, ~844×390 landscape.
- All 3 modes, + CRT_LITE, at fixed \`Date\`/RNG/character/animation camera seed or deterministic freeze frame.
- Captures: image-only scene (no obstructive HTML UI) **and** a full UI screenshot.
- Save descriptive files under \`artifacts/crt-v1/\`: \`desktop-ps1-lcd.png\`, \`desktop-crt.png\`, \`desktop-debug.png\`, \`mobile-crt.png\`, \`landscape-crt.png\`, \`comparison.png\`, \`metrics.json\`, \`browser-console.txt\`.
- Include color swatches showing final encoded sRGB output and missing/doubled gamma test.
- Programmatically assert \`scenePass.calls>0\`, \`scenePass.triangles>0\`, no WebGL shader errors, correct aspect and reasonable nonuniform scene contrast.
- Programmatically compare PS1_LCD vs CRT_ATMOSPHERE: same scene/camera, measurable pixel differences and a difference heatmap. Baseline comparison can be assembled with canvas or Python as CI artifact (not required in the runtime).
- Negative tests: fog=0, grain=0, bloom=0, mask=0, very low and high exposure; no NaNs, flashes, blank frames or runaway GPU memory.

**Metrics report** (record exact region coordinates after matching the reference):
- Overall and region-specific luminance histogram quantiles \`p05,p50,p95\` in output-encoded [0,255], not just one center-pixel sample.
- Subject silhouette contrast against nearest wall, door panel vs facade, passage vs street, hedge vs sidewalk.
- Percentage of pixels near black, near-white, and visibly banded.
- CPU frame median/p95 and optional GPU timer per tested device. Include renderer calls/triangles, RT dimensions, quality mode, and FPS.
- Set thresholds from measured baseline + human reference calibration. Never use a global \`mean brightness > X\` as the sole visual pass; keep passage dark.

### 9.3 Manual visual acceptance (mandatory)
At minimum:
- Chrome desktop at 1206×847, iPhone Safari portrait, iPhone Safari landscape.
- Scene details identifiable **at normal phone brightness**, without maximum brightness: player, door, central post, wagon, walkway edges. Surrounding darkness still feels oppressive.
- Bright highlights are localized, not large blown-out halos.
- Fog creates layered depth and does not whitewash/wash out nearby objects.
- CRT texture is softer than PS1 LCD without completely losing pixel-art quality, and scanlines/mask are not obvious grille stripes.
- No distracting shimmer, flicker, moiré or chromatic fringes during camera motion or character movement.
- No clipping/overlapping mobile controls; logs and toggles remain accessible.
- A/B preset screenshots use identical scene positions and camera, and any differences are attributable to the postprocess.
- Critically **user must approve screenshots** against the provided reference. CI syntax or render-call counts do not certify CRT quality.

### 9.4 Performance/compatibility
- Three.js WebGL2 on current Safari/iPhone; desktop Chrome baseline.
- Targets (aspirational unless measured): 60 FPS on desktop, >=30 FPS sustainable on iPhone in CRT_LITE; CRT_FULL should be optional and gracefully downgrade to LITE if it cannot sustain target for several seconds. Avoid flickering automatic oscillation; hysteresis and logging required.
- Desktop \`CRT_ATMOSPHERE\` ideally adds <=3 ms GPU time vs PS1_LCD on a normal modern GPU; mobile <=5 ms steady postprocess overhead when measurable. Report actual values; if unsupported, label \`GPU timing unavailable\` rather than inventing.
- No WebGL texture/FBO leak after 20 resize/mode cycles; report current texture/program counts after stabilization.
- No GPU readPixels in regular animation loop (sampling diagnostic infrequently/on demand).
- Keep JS/static project small, no enormous CRT-Royale shader port or new megabyte runtime dependency.

## 10. Agent execution plan / gated milestones

Each gate produces a short commit, tests, screenshots and a concise \`AGENT_RESULT.md\` update. Do not work around failed gates silently.

**M0 — Baseline and reproducibility**
1. Read files listed in §1 and record precise HEAD.
2. Make existing Playwright smoke test actually run on CI, including browser installation and deterministic offline dependencies. If external CDN causes flakiness, use locally vendored pinned Three.js file when licensing permits and document its origin.
3. Capture current build 5 in browser: original scene, debug snapshot, render pass stats. Save a baseline artifact set and known defects. Fix test scaffolding only; do not grade visuals yet.

**M1 — Color correctness + renderer refactor**
1. Introduce explicit pipeline with independently togglable steps; maintain existing scene and atlas, GL uniforms.
2. Verify sRGB/linear conversion with swatches and capture. No double encode, blank frame or shader warnings. Scene image must closely match current baseline when new effects are all off.
3. Verify fixed-reference aspect on mobile and reference overlay. Screenshot + automated comparison gate.

**M2 — Atmosphere, tone and fog**
1. Introduce calibrated curve controls and local lighting adjustment. Preserve original deep black passages.
2. Implement distance/height fog if provably correct, or defer height with explicit documentation.
3. Calibrate the person/door/car/hedge readability using locked camera and scene reference. Save before/after regions/histograms. Gate on human-reviewable screenshots.

**M3 — CRT analog display**
1. Add bounded softening, bloom/halation, stable scanline/mask, optional minimal chroma bleed.
2. Correct display scaling and phone fallback with quality tiers. No halo on black regions or moiré at portrait.
3. Produce side-by-side matched CRT vs LCD screenshots at desktop & mobile. Performance gate.

**M4 — Presets / mobile UI / diagnostics**
1. Implement three modes, A/B, validated persistence + migration, reset and independent visibility test.
2. Keep controls uncluttered on portrait Safari; COPY DEBUG LOG must still work from any mode.
3. Extend debug with color pipeline description, preset/tier/fallback and p05/p50/p95 output stats on demand.

**M5 — Release / proof**
1. Run syntax/CI WebGL and capture visual evidence in Chrome, iPhone Safari manual run and performance.
2. Write \`docs/CRT_ATMOSPHERE_RESULT.md\`: architecture, results, known limits, screenshot index, mode comparison, exact preset numbers and references to tests.
3. Update README and \`AGENT_RESULT.md\` with changed file list, checks performed, screenshot paths, known defects and final SHAs.
4. Create PR from implementation branch to \`gh-pages\`. **Do not merge**, update Pages settings or delete \`preview-v5.html\` without approval.

## 11. Explicit exclusions & escalation triggers

NOT in scope:
- Original Silent Hill asset extraction / ripping / game binaries / trademark use.
- Replacing models with random downloaded assets, redoing wagon/door/character geometry, animations or textures.
- New scene design, navigation, physics, sound, 3D engine, desktop C++ application.
- Full CRT hardware emulation, perfect colorimetric authenticity, interlaced composite-video decoder, electrical phosphor simulation.
- Capturing user images or sharing diagnostics over network. Local reference uploads never leave the device.

Escalate to the user before:
- Significant scene composition/camera/geometry changes, changing the atlas/material identity, or adding nontrivial licensed assets.
- Permanent default quality degradation, removing a preset effect, or widening scope.
- Missing original reference screenshot such that visual equivalence cannot be assessed.
- A browser/CI platform cannot demonstrate WebGL and agent proposes claiming completion anyway.
- Implementation requires a new renderer or major bundler change.

## 12. Required final response from implementer

\`\`\`
STATUS: MERGE_READY | BLOCKED | PARTIAL
BASE_BRANCH: gh-pages
BASE_SHA: <sha>
WORK_BRANCH: feature/crt-atmosphere-v1
HEAD_SHA: <sha>
PR: <url or none>
IMPLEMENTED: <scope facts only>
PRESETS: <final values and intentional differences>
COLOR_PIPELINE: <linear/sRGB conversion points, RT formats/fallbacks>
TESTS: <commands, actual pass/fail, browser versions>
VISUAL_EVIDENCE: <paths and exact resolution/mode names>
MOBILE_SAFARI: <real device verified yes/no + observed result>
PERFORMANCE: <measured median/p95 or not measured>
KNOWN_LIMITATIONS: <explicit list>
USER_REVIEW_NEEDED: <specific screenshots and decisions>
\`\`\`

Never write "looks exactly like CRT" or "iPhone tested" absent actual evidence. An automated screenshot alone is not user approval.

## 13. Reference reading (concepts, not drop-in source)

- Three.js official Color Management: https://threejs.org/manual/pages/color-management.html
- Three.js official OutputPass: https://threejs.org/docs/pages/OutputPass.html
- Three.js WebGLRenderer information: https://threejs.org/docs/pages/WebGLRenderer.html
- Libretro CRT shaders overview: https://docs.libretro.com/shader/crt/
- Libretro CRT-Royale tuning/reference: https://docs.libretro.com/shader/crt_royale/

**Priority order:** visual baseline → color correctness → scene readability/fog → analog response → preset ergonomics → performance evidence. Never tune glow/scanlines to hide an incorrect image.
