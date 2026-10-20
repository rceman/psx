# Agent Handoff — Implement CRT Atmosphere V1

**Canonical spec:** [docs/CRT_ATMOSPHERE_V1_SPEC.md](CRT_ATMOSPHERE_V1_SPEC.md)  
**Repository:** https://github.com/rceman/psx  
**Planning branch:** \`spec/crt-atmosphere-v1\` (contains design docs only)  
**Baseline runtime:** \`gh-pages\` Build 5 (not \`main\`)  
**Implementation branch:** \`feature/crt-atmosphere-v1\`, created from \`spec/crt-atmosphere-v1\`

## Agent instruction (copy into Devin/Codex)

> Open https://github.com/rceman/psx, fetch branch \`spec/crt-atmosphere-v1\`, and read \`docs/CRT_ATMOSPHERE_V1_SPEC.md\` IN FULL before modifying code. Implement the entire spec in milestone order M0→M5 on a new \`feature/crt-atmosphere-v1\` branch created from \`spec/crt-atmosphere-v1\`. This is a precise Silent Hill 1 / PS1 CRT display-atmosphere experiment using the EXISTING 1206×847 reference street scene, not a scene recreation or new engine. Keep the original car, door, porch, posts, bushes, character, camera aspect and texture atlas untouched. Implement a verified color pipeline, local/night atmosphere, distance/height-aware fog where justified, lightweight CRT effects, 3 presets with strict A/B parity, mobile UI, one-button diagnostics, reproducible Chrome screenshot evidence and real iPhone Safari validation if available. Complete all gated milestones, add the required evidence/docs, and prepare a PR to \`gh-pages\`. Do not merge or deploy automatically. If the original screenshot or device test is unavailable, explicitly mark manual visual acceptance as PENDING and never claim that the CRT effect is verified. Return a structured result per §12 of the spec. Do not stop merely because JS syntax and CI are green; visual evidence and image comparison are required.

## Execution boundaries

- Treat the canonical spec as the only acceptance contract. It supersedes this abbreviated handoff where more detailed.
- Do **not** modify \`main\` or \`gh-pages\`, change Pages configuration or merge a PR.
- Preserve static GitHub Pages hosting and current CDN-pinned Three.js unless a documented reason forces a change.
- Protect current \`assets/atlas.png\` and its 16-cell layout. Ensure fallback atlas loading still works.
- Use strict scene/renderer parity for CRT-vs-LCD captures: identical camera, geometry, lighting (lock switch), clock/seed and source render resolution.
- Capture browser logs, draw calls, pipeline metadata and screenshots. Report missing hardware testing honestly.
- Prefer implement/test/audit rather than adding endless UI knobs without validated visual impact.

## Deliverables checklist

- [ ] \`feature/crt-atmosphere-v1\` created from the planning branch
- [ ] M0 baseline Chrome capture + known-issues log
- [ ] M1 tested linear/sRGB pipeline, zero visual regressions when effects OFF
- [ ] M2 improved low-light readability and spatial fog without washing out blacks
- [ ] M3 CRT-lite/mobile and full/desktop analog softening, localized glow, scanline, conditional mask
- [ ] M4 Debug / PS1 LCD / CRT Atmosphere selector, persistent validated config, A/B, mobile-friendly controls
- [ ] M5 deterministic screenshots, per-region output brightness/contrast diagnostics, CI verification
- [ ] \`docs/CRT_ATMOSPHERE_RESULT.md\`, \`AGENT_RESULT.md\`, screenshots/artifacts and browser logs
- [ ] PR against \`gh-pages\`, left open/unmerged

**The precise original reference screenshot must be supplied to the agent separately if it cannot access the user's conversation image. Do not substitute a different screenshot of Silent Hill.**

## Review request to user

Require screenshots of the exact same frame in \`PS1_LCD\`, \`CRT_ATMOSPHERE\`, and \`DEBUG_VISIBLE\`; a phone shot showing both the scene and a functioning preset selector; and a sample \`COPY DEBUG LOG\` confirming true output dimensions and CRT quality tier.

Only after the user approves this comparison should the implementation be merged to \`gh-pages\`.
