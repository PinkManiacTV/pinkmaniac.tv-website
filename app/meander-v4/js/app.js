(function () {
  'use strict';

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('status');
  const btnPlay = document.getElementById('btn-play');
  const btnPause = document.getElementById('btn-pause');
  const btnReset = document.getElementById('btn-reset');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnFullscreenIcon = btnFullscreen.querySelector('i');
  const simFullscreen = document.getElementById('sim-fullscreen');

  const SIM_BUDGET_MS = 8;
  const MAX_ITERS_PER_FRAME = 40;

  let channelBelt = null;
  let migrationState = null;
  let simParams = null;
  let stableBounds = null;
  let running = false;
  let rafId = null;

  function getMaxItersPerFrame() {
    return MAX_ITERS_PER_FRAME;
  }

  function readParams() {
    return MeanderEngine.defaultParams({
      nit: 100000,
      W: 200,
      D: 6,
      n_bends: 30,
      kl: 60 / MeanderEngine.SECONDS_PER_YEAR,
      saved_ts: 10,
      Sl: 0.002,
    });
  }

  function currentEndTime() {
    if (!migrationState || !simParams) {
      return channelBelt.cl_times[channelBelt.cl_times.length - 1];
    }
    return migrationState.lastClTime + (migrationState.itn * simParams.dt) / MeanderEngine.SECONDS_PER_YEAR;
  }

  function plotOptions() {
    const simActive = !!migrationState && !!stableBounds;
    return {
      plotType: 'strat',
      pbAge: 20,
      obAge: 60,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      stableBounds,
      liveMode: simActive,
      pad: simParams?.pad ?? 100,
      endTime: currentEndTime(),
      fast: simActive,
    };
  }

  function resizeCanvas() {
    const wrap = document.getElementById('canvas-wrap');
    const dpr = window.devicePixelRatio || 1;
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    let w;
    let h;

    if (fs) {
      w = fs.clientWidth;
      h = fs.clientHeight;
    } else {
      w = wrap.clientWidth;
      h = Math.max(360, Math.min(720, w * 0.5));
    }

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (channelBelt) renderFrame();
  }

  function updateFullscreenButton() {
    const active =
      document.fullscreenElement === simFullscreen ||
      document.webkitFullscreenElement === simFullscreen;
    btnFullscreen.classList.toggle('is-active', active);
    btnFullscreen.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Fullscreen');
    btnFullscreenIcon.className = active ? 'fa-solid fa-compress' : 'fa-solid fa-expand';
  }

  function toggleFullscreen() {
    const active =
      document.fullscreenElement === simFullscreen ||
      document.webkitFullscreenElement === simFullscreen;
    if (!active) {
      (simFullscreen.requestFullscreen || simFullscreen.webkitRequestFullscreen)?.call(simFullscreen);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  }

  function renderFrame() {
    if (!channelBelt) return;
    return MeanderRenderer.render(ctx, channelBelt, plotOptions());
  }

  function updateStatus() {
    if (!migrationState || !simParams) return;
    statusEl.textContent = `${currentEndTime().toFixed(0)} years`;
  }

  function setRunning(isRunning) {
    running = isRunning;
    btnPlay.disabled = isRunning;
    btnPause.disabled = !isRunning;
    btnPlay.classList.toggle('is-active', !isRunning);
    btnPause.classList.toggle('is-active', isRunning);
  }

  function initPreview() {
    pauseSimulation();
    const p = readParams();
    const ch = MeanderEngine.generateInitialChannel(p.W, p.D, p.Sl, p.deltas, p.pad, p.n_bends);
    channelBelt = MeanderEngine.createChannelBelt(ch);
    migrationState = null;
    simParams = null;
    MeanderRenderer.resetCache();
    stableBounds = MeanderRenderer.createInitialBounds(channelBelt, p.n_bends, p.pad);
    MeanderRenderer.render(ctx, channelBelt, { ...plotOptions(), endTime: 0, liveMode: false, fast: false });
    statusEl.textContent = 'Ready to start';
    setRunning(false);
  }

  function runSimulationStep() {
    const maxIters = getMaxItersPerFrame();
    const t0 = performance.now();
    let count = 0;

    while (performance.now() - t0 < SIM_BUDGET_MS && count < maxIters) {
      MeanderEngine.migrateBatch(channelBelt, simParams, migrationState, 1, true);
      count += 1;
      if (migrationState.x.length < 2) break;
    }

    MeanderEngine.syncLiveChannelView(channelBelt, migrationState);
    MeanderEngine.pruneExpiredCutoffs(channelBelt, currentEndTime(), MeanderEngine.OXBOW_FADE_YEARS);
  }

  function simulationStep() {
    if (!running || !migrationState || !simParams) return;

    runSimulationStep();
    renderFrame();
    updateStatus();

    if (migrationState.x.length < 2) {
      pauseSimulation();
      statusEl.textContent = 'Simulation stopped.';
      return;
    }

    rafId = requestAnimationFrame(simulationStep);
  }

  function startSimulation() {
    if (running) return;
    if (!channelBelt) initPreview();

    simParams = readParams();

    if (!migrationState) {
      migrationState = MeanderEngine.initMigrationState(channelBelt, simParams);
      stableBounds = MeanderRenderer.createInitialBounds(channelBelt, simParams.n_bends, simParams.pad);
      MeanderRenderer.resetCache();
      MeanderEngine.syncLiveChannelView(channelBelt, migrationState);
    }

    setRunning(true);
    rafId = requestAnimationFrame(simulationStep);
  }

  function pauseSimulation() {
    running = false;
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    setRunning(false);
    if (channelBelt && migrationState) {
      MeanderEngine.syncLiveChannelView(channelBelt, migrationState);
      renderFrame();
      updateStatus();
    }
  }

  btnPlay.addEventListener('click', startSimulation);
  btnPause.addEventListener('click', pauseSimulation);
  btnReset.addEventListener('click', () => {
    pauseSimulation();
    initPreview();
  });
  btnFullscreen.addEventListener('click', toggleFullscreen);
  window.addEventListener('resize', resizeCanvas);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  function onFullscreenChange() {
    updateFullscreenButton();
    resizeCanvas();
  }

  updateFullscreenButton();
  resizeCanvas();
  initPreview();
})();
