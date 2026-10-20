/* PSX diagnostics — works even if game.js or the Three.js CDN fails. */
(() => {
  'use strict';
  const MAX_ENTRIES = 300, MAX_VALUE = 2200;
  const entries = [];
  const started = performance.now();
  const original = Object.fromEntries(['log', 'info', 'warn', 'error', 'debug']
    .map(name => [name, console[name].bind(console)]));
  let runtime = null, renderReady = false, lastProbe = null, visibilityTest = false;

  function stringify(value) {
    if (value instanceof Error) return (value.stack || value.message || String(value)).slice(0, MAX_VALUE);
    if (typeof value === 'string') return value.slice(0, MAX_VALUE);
    try {
      const s = JSON.stringify(value, (key, val) => {
        if (key === 'password' || key === 'token' || key === 'authorization') return '[REDACTED]';
        return val instanceof Error ? {name: val.name, message: val.message, stack: val.stack} : val;
      });
      return String(s ?? value).slice(0, MAX_VALUE);
    } catch (_) { return String(value).slice(0, MAX_VALUE); }
  }
  function log(level, ...args) {
    const line = {
      time: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - started),
      level: String(level).toUpperCase(),
      message: args.map(stringify).join(' ')
    };
    entries.push(line);
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  }

  for (const name of Object.keys(original)) {
    try {
      console[name] = (...args) => {
        log(name, ...args);
        original[name](...args);
      };
    } catch (e) {
      original.warn('Could not intercept console.' + name, e);
    }
  }

  window.addEventListener('error', e => {
    if (e.target !== window && e.target) {
      log('resource-error', e.target.tagName || 'resource', (e.target.src || e.target.href || 'unknown').split('?')[0]);
    } else {
      log('uncaught', e.message || 'script error', e.filename || '', e.lineno || 0, e.colno || 0,
        e.error?.stack || '');
    }
  }, true);
  window.addEventListener('unhandledrejection', e => log('unhandled-promise', e.reason));
  window.addEventListener('visibilitychange', () => log('visibility', document.visibilityState));
  const canvas = document.getElementById('game');
  canvas?.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    log('webgl-context-lost', 'GPU context lost');
  }, false);
  canvas?.addEventListener('webglcontextrestored', () => log('webgl-context-restored', 'GPU context restored'));

  function safe(callback) {
    try { return callback(); } catch (e) { return 'unavailable: ' + e.message; }
  }
  function snapshot() {
    const report = {
      page: location.origin + location.pathname,
      capturedAt: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - started),
      userAgent: navigator.userAgent,
      display: {
        viewport: [window.innerWidth, window.innerHeight],
        devicePixelRatio: window.devicePixelRatio,
        hidden: document.hidden,
        canvas: canvas ? {width: canvas.width, height: canvas.height} : null
      },
      build: '5-20261020',
      sceneModuleLoaded: !!runtime,
      firstFrameRendered: renderReady,
      recentPixelProbe: lastProbe
    };
    if (runtime) {
      const {renderer, scene, camera, target, settings} = runtime;
      report.renderer = safe(() => ({
        drawingBuffer: [renderer.domElement.width, renderer.domElement.height],
        presentationOnly: {
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          points: renderer.info.render.points
        },
        scenePass: safe(() => runtime.scenePass?.() ?? 'unavailable'),
        visibilityTest,
        presentation: safe(() => runtime.presentation?.() ?? null),
        shaderPrograms: renderer.info.programs?.length ?? null,
        sceneChildren: scene.children.length,
        sceneMeshes: (() => {
          let count = 0;
          scene.traverse(o => { if (o.isMesh) count++; });
          return count;
        })(),
        cameraPosition: camera.position.toArray().map(v => Number(v.toFixed(2))),
        cameraFov: camera.fov,
        cameraAspect: Number(camera.aspect.toFixed(4)),
        renderTarget: target?.() ? [target().width, target().height] : null,
        settings
      }));
      report.webgl = safe(() => {
        const gl = renderer.getContext();
        return {
          context: gl.constructor.name,
          version: gl.getParameter(gl.VERSION),
          shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
          isContextLost: gl.isContextLost()
        };
      });
    }
    return report;
  }

  function report() {
    const state = JSON.stringify(snapshot(), null, 2);
    const lines = entries.map(e => '[' + e.time + ' +' + e.elapsedMs + 'ms] ' +
      e.level + ' ' + e.message);
    return [
      'HOLLOW STREET / PSX DEBUG REPORT v3 · BUILD 5',
      '--- STATE ---',
      state,
      '--- LOG (' + lines.length + ' most recent entries) ---',
      ...lines,
      '--- END ---'
    ].join('\n');
  }

  function probe(r, sceneTarget) {
    if (!r || !sceneTarget) return;
    try {
      const w = sceneTarget.width, h = sceneTarget.height;
      const pixels = new Uint8Array(4 * 8 * 8);
      r.readRenderTargetPixels(sceneTarget, Math.max(0, (w >> 1) - 4),
        Math.max(0, (h >> 1) - 4), 8, 8, pixels);
      let min = 255, max = 0, sum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        for (let j = 0; j < 3; j++) {
          const value = pixels[i + j];
          sum += value;
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
      const grid = [], tiny = new Uint8Array(4 * 4 * 4);
      for (let iy = 0; iy < 3; iy++) {
        const row = [];
        for (let ix = 0; ix < 3; ix++) {
          const px = Math.min(w - 4, Math.max(0, Math.round((ix + .5) * w / 3 - 2)));
          const py = Math.min(h - 4, Math.max(0, Math.round((iy + .5) * h / 3 - 2)));
          r.readRenderTargetPixels(sceneTarget, px, py, 4, 4, tiny);
          let brightness = 0;
          for (let k = 0; k < tiny.length; k += 4)
            brightness += (tiny[k] + tiny[k + 1] + tiny[k + 2]) / 3;
          row.push(Math.round(brightness / (tiny.length / 4)));
        }
        grid.push(row);
      }
      const values = grid.flat();
      lastProbe = {
        sample: 'center 8x8 and 3x3 grid of 4x4 average RGB brightness',
        center: {min, max, mean: Math.round(sum / (pixels.length * .75))},
        gridBrightness: grid, gridContrast: Math.max(...values) - Math.min(...values),
        size: [w,h]
      };
      log('gpu-probe', lastProbe);
    } catch (e) { log('gpu-probe-failed', e.message); }
  }

  const api = window.__psxDebug = {
    log, snapshot, report, probe,
    setRuntime(info) {
      runtime = info;
      log('init', 'Three.js scene attached',
        {objects: info.scene?.children?.length, webgl: !!info.renderer?.getContext?.()});
    },
    markReady() {
      if (!renderReady) { renderReady = true; log('frame', 'First render loop finished'); }
    }
  };

  function initControls() {
    const button = document.createElement('button');
    button.id = 'debug-copy';
    button.type = 'button';
    button.textContent = 'COPY DEBUG LOG';
    button.setAttribute('aria-label', 'Copy diagnostics report to clipboard');
    button.title = 'Copy JavaScript/WebGL errors, rendering state and recent log';
    const note = document.createElement('div');
    note.id = 'debug-feedback';
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    const test = document.createElement('button');
    test.type = 'button';
    test.id = 'debug-visibility';
    test.textContent = 'VISIBILITY TEST';
    test.setAttribute('aria-pressed', 'false');
    test.title = 'Temporarily disable fog and custom material shaders to isolate dark-scene failures';
    test.addEventListener('click', () => {
      if (!runtime?.setVisibilityTest) {
        log('warning', 'Scene not loaded; visibility test unavailable');
        note.textContent = 'SCENE MODULE NOT READY';
        return;
      }
      visibilityTest = !visibilityTest;
      runtime.setVisibilityTest(visibilityTest);
      test.textContent = visibilityTest ? 'RESTORE PSX VIEW' : 'VISIBILITY TEST';
      test.setAttribute('aria-pressed', String(visibilityTest));
      log('ui', 'Visibility test', visibilityTest ? 'ON' : 'OFF');
    });
    document.body.append(button, test, note);
    const fallback = document.createElement('div');
    fallback.id = 'debug-fallback';
    fallback.hidden = true;
    const text = document.createElement('textarea');
    text.setAttribute('readonly', '');
    text.setAttribute('aria-label', 'Debug report text to select and copy');
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'CLOSE';
    close.addEventListener('click', () => fallback.hidden = true);
    fallback.append(text, close);
    document.body.append(fallback);
    let clearId = null;
    function feedback(message) {
      note.textContent = message;
      if (clearId) clearTimeout(clearId);
      clearId = setTimeout(() => note.textContent = '', 4800);
    }
    button.addEventListener('click', async () => {
      const output = report();
      try {
        if (!navigator.clipboard?.writeText) throw Error('Clipboard API unavailable');
        await navigator.clipboard.writeText(output);
        feedback('DEBUG LOG COPIED');
        log('ui', 'Debug report copied');
        return;
      } catch (e) { log('clipboard', String(e.message || e)); }
      // iOS Safari fallback: selectable text if clipboard permission is denied.
      fallback.hidden = false;
      text.value = output;
      text.focus();
      text.select();
      text.setSelectionRange(0, text.value.length);
      let copied = false;
      try { copied = document.execCommand('copy'); } catch (_) { /* permission denied */ }
      feedback(copied ? 'DEBUG LOG COPIED' : 'SELECT LOG TEXT AND COPY');
    });
    log('ui', 'Copy debug log control installed');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initControls, {once: true});
  } else initControls();

  log('boot', 'Debug capture initialized (before Three.js module)');
  window.setTimeout(() => {
    if (!runtime) log('warning', 'Scene module did not initialize within 8 seconds: check CDN/module loading and console errors');
    else if (!renderReady) log('warning', 'Scene initialized but no render-loop completion recorded within 8 seconds');
  }, 8000);
})();
