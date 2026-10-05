/**
 * Canvas renderer — matches meanderpy ChannelBelt.plot('strat') accumulation.
 */
(function (root, factory) {
  root.MeanderRenderer = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  const COLORS = {
    stratPb: '#E8D4B0',
    stratOb: '#1f6636',
    stratActive: '#4FC3F7',
    morphGreen: 'rgb(106, 159, 67)',
    morphPb: 'rgb(189, 153, 148)',
    morphOb: '#1f6636',
    ageOb: '#1f6636',
    ageActive: '#4FC3F7',
    stroke: '#111',
    bgStart: '#8bedde',
    bgEnd: '#8dfa8b',
  };

  const MAGMA = [
    [0, 0, 4],
    [40, 11, 84],
    [110, 40, 120],
    [180, 60, 100],
    [240, 120, 60],
    [252, 210, 140],
  ];

  /** Incremental bake state — point bars only; cutoffs drawn live with fade. */
  let bakedLayer = null;
  const OXBOW_FADE_YEARS = 50;
  const OXBOW_RGB = '31, 102, 54';

  function resetCache() {
    bakedLayer = null;
  }

  function boundsMatch(a, b) {
    return a.xmin === b.xmin && a.xmax === b.xmax && a.ymin === b.ymin && a.ymax === b.ymax;
  }

  function lerpColor(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ];
  }

  function magmaColor(t) {
    t = Math.max(0, Math.min(1, t));
    const idx = t * (MAGMA.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(MAGMA.length - 1, lo + 1);
    return `rgb(${lerpColor(MAGMA[lo], MAGMA[hi], idx - lo).join(',')})`;
  }

  function morphColor(t, pbAge, obAge, endTime, times, isOxbow) {
    const age = endTime - times[t];
    const crit = isOxbow ? obAge : pbAge;
    if (age < crit) return COLORS.morphGreen;
    return isOxbow ? COLORS.morphOb : COLORS.morphPb;
  }

  function scanGeometry(chb, xFilter) {
    const W = chb.channels[0].W;
    let xmin = Infinity;
    let xmax = -Infinity;
    let ymax = 0;

    function scanChannel(ch) {
      if (!ch?.x) return;
      for (let i = 0; i < ch.x.length; i++) {
        if (xFilter && !xFilter(ch.x[i])) continue;
        xmin = Math.min(xmin, ch.x[i]);
        xmax = Math.max(xmax, ch.x[i]);
        ymax = Math.max(ymax, Math.abs(ch.y[i]));
      }
    }

    for (const ch of chb.channels) scanChannel(ch);
    if (chb.liveChannel) scanChannel(chb.liveChannel);
    else if (chb.activeChannel) scanChannel(chb.activeChannel);

    for (const cutoff of chb.cutoffs) {
      for (let j = 0; j < cutoff.x.length; j++) {
        for (let i = 0; i < cutoff.x[j].length; i++) {
          if (xFilter && !xFilter(cutoff.x[j][i])) continue;
          xmin = Math.min(xmin, cutoff.x[j][i]);
          xmax = Math.max(xmax, cutoff.x[j][i]);
          ymax = Math.max(ymax, Math.abs(cutoff.y[j][i]));
        }
      }
    }

    ymax = Math.max(ymax, W * 0.5) + 2 * W;
    if (!isFinite(xmin)) {
      xmin = chb.channels[0].x[0];
      xmax = chb.channels[0].x[chb.channels[0].x.length - 1];
    }
    return { xmin, xmax, ymin: -ymax, ymax };
  }

  function computeBounds(chb) {
    return scanGeometry(chb, null);
  }

  function computeLiveBounds(chb, pad) {
    const ch =
      chb.liveChannel ||
      chb.activeChannel ||
      chb.channels.find((c) => c?.x) ||
      chb.channels[chb.channels.length - 1];
    if (!ch?.x) return computeBounds(chb);
    const n = ch.x.length;
    let pad1 = Math.floor(pad / 10);
    if (pad1 < 5) pad1 = 5;
    const xLo = ch.x[Math.min(pad1, n - 1)];
    const xHi = ch.x[Math.max(n - pad - 1, pad1 + 1)];
    const xFilter = (x) => x >= xLo && x <= xHi;
    return scanGeometry(chb, xFilter);
  }

  function createInitialBounds(channelBelt, nBends, pad) {
    const ch = channelBelt.channels[0];
    const W = ch.W;
    const expectedY = Math.max(W * 2, nBends * W * 0.15);
    const live = computeLiveBounds(channelBelt, pad);
    return {
      xmin: live.xmin,
      xmax: live.xmax,
      ymin: -expectedY - 2 * W,
      ymax: expectedY + 2 * W,
    };
  }

  function expandBounds(stable, measured) {
    return {
      xmin: Math.min(stable.xmin, measured.xmin),
      xmax: Math.max(stable.xmax, measured.xmax),
      ymin: Math.min(stable.ymin, measured.ymin),
      ymax: Math.max(stable.ymax, measured.ymax),
    };
  }

  function lerpBoundsXOnly(from, to, t) {
    return {
      xmin: from.xmin,
      xmax: from.xmax + (to.xmax - from.xmax) * t,
      ymin: from.ymin,
      ymax: from.ymax,
    };
  }

  function buildTimeline(chb, endTime) {
    const cot = chb.cutoff_times.filter((t) => t <= endTime);
    const sclt = chb.cl_times.filter((t) => t <= endTime);
    const times = [...new Set([...cot, ...sclt])].sort((a, b) => a - b);
    return { times, cot, sclt };
  }

  function cutoffOpacity(cutoffTime, endTime) {
    const age = endTime - cutoffTime;
    if (age >= OXBOW_FADE_YEARS) return 0;
    return 1 - age / OXBOW_FADE_YEARS;
  }

  function drawPolygon(ctx, xm, ym, fill, stroke, lineWidth, alpha = 1) {
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(xm[0], ym[0]);
    for (let i = 1; i < xm.length; i++) ctx.lineTo(xm[i], ym[i]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
    ctx.globalAlpha = prevAlpha;
  }

  function makeTransform(bounds, width, height, padding) {
    const dataW = bounds.xmax - bounds.xmin || 1;
    const dataH = bounds.ymax - bounds.ymin || 1;
    const drawW = width - 2 * padding;
    const drawH = height - 2 * padding;
    const scale = Math.min(drawW / dataW, drawH / dataH);
    const offX = padding + (drawW - dataW * scale) / 2;
    const offY = padding + (drawH - dataH * scale) / 2;
    return {
      scale,
      tx: (x) => offX + (x - bounds.xmin) * scale,
      ty: (y) => offY + (bounds.ymax - y) * scale,
    };
  }

  function drawPointBar(ctx, ch, pad, tx, ty, plotType, strokeW, skipStrokes) {
    if (!ch?.x) return;
    const core = MeanderEngine.sliceToCore(ch, pad);
    const { xm, ym } = MeanderEngine.getChannelBanks(core.x, core.y, core.W);
    const px = Float64Array.from(xm, tx);
    const py = Float64Array.from(ym, ty);
    if (plotType === 'strat') {
      drawPolygon(ctx, px, py, COLORS.stratPb, skipStrokes ? null : COLORS.stroke, strokeW);
    }
  }

  function drawCutoffPolygons(ctx, cutoff, tx, ty, plotType, strokeW, skipStrokes, alpha = 1) {
    if (alpha <= 0) return;
    const fill = plotType === 'strat' ? `rgba(${OXBOW_RGB}, ${alpha})` : COLORS.stratOb;
    for (let j = 0; j < cutoff.x.length; j++) {
      const { xm, ym } = MeanderEngine.getChannelBanks(cutoff.x[j], cutoff.y[j], cutoff.W);
      const px = Float64Array.from(xm, tx);
      const py = Float64Array.from(ym, ty);
      if (plotType === 'strat') {
        drawPolygon(ctx, px, py, fill, skipStrokes ? null : COLORS.stroke, strokeW, alpha);
      }
    }
  }

  /** Cutoffs with age-based fade — cheap: typically only a few visible at once. */
  function drawLiveCutoffs(ctx, chb, endTime, tx, ty, plotType, strokeW, skipStrokes) {
    for (let i = 0; i < chb.cutoffs.length; i++) {
      const alpha = cutoffOpacity(chb.cutoff_times[i], endTime);
      if (alpha <= 0) continue;
      drawCutoffPolygons(ctx, chb.cutoffs[i], tx, ty, plotType, strokeW, skipStrokes, alpha);
    }
  }

  function drawDeposits(ctx, chb, options, tx, ty, strokeW, skipStrokes) {
    const { plotType, pbAge, obAge, endTime, pad } = options;
    const { times } = buildTimeline(chb, endTime);
    const timeToScl = new Map(chb.cl_times.map((t, i) => [t, i]));
    const timeToCut = new Map(chb.cutoff_times.map((t, i) => [t, i]));

    for (let ti = 0; ti < times.length; ti++) {
      const t = times[ti];
      const sclIdx = timeToScl.get(t);
      if (sclIdx != null && sclIdx > 0) {
        drawPointBar(ctx, chb.channels[sclIdx], pad, tx, ty, plotType, strokeW, skipStrokes);
      }
      const cotIdx = timeToCut.get(t);
      if (cotIdx != null) {
        const alpha = cutoffOpacity(chb.cutoff_times[cotIdx], endTime);
        if (alpha > 0) {
          drawCutoffPolygons(ctx, chb.cutoffs[cotIdx], tx, ty, plotType, strokeW, skipStrokes, alpha);
        }
      }
    }
  }

  function fillBackground(ctx, width, height, plotType = 'strat') {
    if (plotType === 'morph') {
      ctx.fillStyle = COLORS.morphGreen;
      ctx.fillRect(0, 0, width, height);
      return;
    }
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, COLORS.bgStart);
    gradient.addColorStop(1, COLORS.bgEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function rebakeAll(bctx, chb, pad, tx, ty, plotType, width, height, strokeW) {
    fillBackground(bctx, width, height, plotType);
    bctx.lineJoin = 'round';
    for (let i = 1; i < chb.channels.length; i++) {
      if (chb.channels[i]?.x) {
        drawPointBar(bctx, chb.channels[i], pad, tx, ty, plotType, strokeW, true);
      }
    }
  }

  function releaseBakedChannels(chb, fromIdx, toIdx) {
    for (let idx = fromIdx; idx <= toIdx; idx++) {
      MeanderEngine.releaseChannelGeometry(chb.channels[idx]);
    }
  }

  /** Copy canvas pixels before resize — setting canvas.width clears the same element. */
  function snapshotCanvas(source, width, height) {
    const snap = document.createElement('canvas');
    snap.width = width;
    snap.height = height;
    snap.getContext('2d').drawImage(source, 0, 0);
    return snap;
  }

  function resizeBakedCanvas(baked, width, height, depositCount) {
    const oldW = baked.width;
    const oldH = baked.height;
    const snapshot =
      depositCount > 0 && oldW > 0 && oldH > 0
        ? snapshotCanvas(baked.canvas, oldW, oldH)
        : null;

    baked.canvas.width = width;
    baked.canvas.height = height;
    baked.width = width;
    baked.height = height;

    const bctx = baked.canvas.getContext('2d');
    fillBackground(bctx, width, height);
    if (snapshot) {
      bctx.drawImage(snapshot, 0, 0, oldW, oldH, 0, 0, width, height);
    }
    return bctx;
  }

  function syncBakedLayer(chb, bounds, width, height, pad, plotType, tx, ty, strokeW) {
    const depositCount = Math.max(0, chb.channels.length - 1);
    const prev = bakedLayer;
    const sizeChanged = prev && (prev.width !== width || prev.height !== height);
    const boundsChanged = prev && !boundsMatch(prev.bounds, bounds);
    const plotChanged = prev && prev.plotType !== plotType;
    const needsFullRebuild = !prev || boundsChanged || plotChanged;

    if (!bakedLayer) {
      bakedLayer = { canvas: document.createElement('canvas') };
    }

    if (needsFullRebuild) {
      const oldW = prev?.width ?? 0;
      const oldH = prev?.height ?? 0;
      const oldDepositCount = prev?.depositCount ?? 0;
      const snapshot =
        prev?.canvas && oldDepositCount > 0 && oldW > 0 && oldH > 0
          ? snapshotCanvas(prev.canvas, oldW, oldH)
          : null;

      bakedLayer.canvas.width = width;
      bakedLayer.canvas.height = height;
      bakedLayer.bounds = { ...bounds };
      bakedLayer.plotType = plotType;
      bakedLayer.width = width;
      bakedLayer.height = height;
      const bctx = bakedLayer.canvas.getContext('2d');
      fillBackground(bctx, width, height, plotType);
      bctx.lineJoin = 'round';

      const hasGeometry = chb.channels.some((c, i) => i > 0 && c?.x);
      if (hasGeometry) {
        rebakeAll(bctx, chb, pad, tx, ty, plotType, width, height, strokeW);
        releaseBakedChannels(chb, 1, chb.channels.length - 1);
      } else if (snapshot) {
        bctx.drawImage(snapshot, 0, 0, oldW, oldH, 0, 0, width, height);
      }
      bakedLayer.depositCount = depositCount;
      return;
    }

    if (sizeChanged) {
      resizeBakedCanvas(bakedLayer, width, height, bakedLayer.depositCount);
    }

    const bctx = bakedLayer.canvas.getContext('2d');
    bctx.lineJoin = 'round';

    while (bakedLayer.depositCount < depositCount) {
      bakedLayer.depositCount += 1;
      const idx = bakedLayer.depositCount;
      const ch = chb.channels[idx];
      if (ch?.x) {
        drawPointBar(bctx, ch, pad, tx, ty, plotType, strokeW, true);
        MeanderEngine.releaseChannelGeometry(ch);
      }
    }
  }

  function render(ctx, chb, options = {}) {
    const {
      plotType = 'strat',
      endTime = chb.cl_times[chb.cl_times.length - 1],
      width,
      height,
      padding = 20,
      stableBounds = null,
      liveMode = false,
      pad = 100,
      fast = false,
    } = options;

    const measured = liveMode ? computeLiveBounds(chb, pad) : computeBounds(chb);
    const bounds = stableBounds ?? measured;
    const { scale, tx, ty } = makeTransform(bounds, width, height, padding);
    const strokeW = Math.max(0.25, 0.35 / scale);
    const skipStrokes = fast || liveMode || plotType === 'strat';

    ctx.clearRect(0, 0, width, height);
    fillBackground(ctx, width, height, plotType);

    ctx.save();
    ctx.lineJoin = 'round';

    if (liveMode && fast && plotType === 'strat' && stableBounds) {
      syncBakedLayer(chb, bounds, width, height, pad, plotType, tx, ty, strokeW);
      ctx.drawImage(bakedLayer.canvas, 0, 0, width, height);
      drawLiveCutoffs(ctx, chb, endTime, tx, ty, plotType, strokeW, true);
    } else {
      drawDeposits(ctx, chb, options, tx, ty, strokeW, skipStrokes);
    }

    const lastCh =
      chb.liveChannel ||
      chb.activeChannel ||
      chb.channels.find((c) => c?.x) ||
      chb.channels[chb.channels.length - 1];
    if (lastCh?.x) {
      const core = MeanderEngine.sliceToCore(lastCh, pad);
      const { xm, ym } = MeanderEngine.getChannelBanks(core.x, core.y, core.W);
      const px = Float64Array.from(xm, tx);
      const py = Float64Array.from(ym, ty);
      if (plotType === 'age') {
        drawPolygon(ctx, px, py, COLORS.ageActive, COLORS.stroke, strokeW * 0.5);
      } else {
        drawPolygon(ctx, px, py, COLORS.stratActive, null);
      }
    }

    ctx.restore();
    return { bounds, scale, endTime: endTime.toFixed(1) };
  }

  return {
    render,
    computeBounds,
    computeLiveBounds,
    createInitialBounds,
    expandBounds,
    lerpBoundsXOnly,
    resetCache,
    COLORS,
  };
});
