# IMAGEGEN TEXTURE ATLAS PROMPT — Scene 001
## Use
Provide `UV_ATLAS_DRAFT.svg` as layout reference, and the original screenshot as **the primary visual reference**. Generate **a single 1024×1024 opaque PNG**, with **exactly 16 square textures** arranged as a strict 4×4 grid, 256×256 pixels per cell. Output ONLY the flat texture atlas. No labels, no grid lines, no written text, no margins, no gutters. Do not alter tile positions.
## Visual target
Match the user-provided screenshot exactly: 1999 PlayStation 1 / Silent Hill-like nighttime, muted dirty green exterior plaster, gray worn station wagon, industrial entrance door, wet-ish granular concrete, deep shadowed passage, coarse mottled grain, low saturation, ochre highlights, charcoal clothing. Pixelated material photos, gritty 1990s survival horror rasterized texture style, desaturated oppressive mood. Not cartoon, not hand-painted fantasy, not modern PBR, not photo-realistic HDR, not modern clean surfaces. No lighting baked into texture except stains and natural material variation; runtime flashlight and fog handle lighting. All cells should share palette, grain scale, aging, noise level and light direction neutrality.
## Grid specification (left to right)
| | Column 1 | Column 2 | Column 3 | Column 4 |
|---|---|---|---|---|
| Row 1 | Dark green stained plaster | Dirty brown/gray lower plaster | Coarse gray asphalt | Pale gritty concrete |
| Row 2 | Worn gray rectangular-panel entry door | Dark oxidized door frame material | Grey wagon car body paint | Almost-black bluish car window glass |
| Row 3 | Deep dark green foliage/hedge | Stained porch ceiling timber | Deep unlit passage / black window | Dirty dark roofing |
| Row 4 | Blue-black denim | Near-black charcoal jacket fabric | Skin and dark hair material swatch | Worn metal and fittings |
## Constraints
- All cells fully filled and individually seamless/tileable where practicable.
- No recognizable people, cars, doors as 3D objects. These must be **flat material textures** only. Exception: the door panel material can include panel/trim wear as a flat frontal door texture.
- No text whatsoever. Never place any grid labels from the draft onto the final atlas.
- Fixed exact grid alignment. No gutters or padding. Textures maintain equal texel density.
- Output resolution exactly 1024×1024 (otherwise resize/crop preserving exact quarter boundaries).
- This is an image material atlas: it is not a screenshot of the environment.
## Installation
Save the final output as `assets/atlas.png`. The app currently renders procedural fallback materials; see README for activation. Confirm each tile remains in the correct cell before integrating. The atlas layout is canonical in `assets/atlas-layout.json`.
