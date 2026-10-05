/**
 * JavaScript port of meanderpy core simulation (Howard & Knutson 1984 kinematic model).
 * Based on https://github.com/zsylvester/meanderpy
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.MeanderEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

  function copyArray(arr) {
    return Float64Array.from(arr);
  }

  function gradient(arr) {
    const n = arr.length;
    const out = new Float64Array(n);
    if (n === 1) return out;
    out[0] = arr[1] - arr[0];
    out[n - 1] = arr[n - 1] - arr[n - 2];
    for (let i = 1; i < n - 1; i++) {
      out[i] = (arr[i + 1] - arr[i - 1]) / 2;
    }
    return out;
  }

  function linspace(start, end, count) {
    const out = new Float64Array(count);
    if (count === 1) {
      out[0] = start;
      return out;
    }
    const step = (end - start) / (count - 1);
    for (let i = 0; i < count; i++) out[i] = start + step * i;
    return out;
  }

  function computeDerivatives(x, y, z) {
    const dx = gradient(x);
    const dy = gradient(y);
    const dz = gradient(z);
    const n = x.length;
    const ds = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      ds[i] = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i] + dz[i] * dz[i]);
    }
    const s = new Float64Array(n);
    for (let i = 1; i < n; i++) s[i] = s[i - 1] + ds[i];
    return { dx, dy, dz, ds, s };
  }

  function computeCurvature(x, y) {
    const dx = gradient(x);
    const dy = gradient(y);
    const ddx = gradient(dx);
    const ddy = gradient(dy);
    const n = x.length;
    const curvature = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const denom = Math.pow(dx[i] * dx[i] + dy[i] * dy[i], 1.5);
      curvature[i] = denom > 1e-12 ? (dx[i] * ddy[i] - dy[i] * ddx[i]) / denom : 0;
    }
    return curvature;
  }

  function computeMigrationRate(pad, ns, ds, alpha, R0, omega = -1.0, gamma = 2.5) {
    const R1 = new Float64Array(ns);
    let pad1 = Math.floor(pad / 10);
    if (pad1 < 5) pad1 = 5;

    for (let i = pad1; i < ns - pad; i++) {
      let sumG = 0;
      let sumRG = 0;
      let cum = 0;
      for (let j = 0; j <= i; j++) {
        const G = Math.exp(-alpha * cum);
        sumG += G;
        sumRG += R0[i - j] * G;
        if (j < i) cum += ds[i - j];
      }
      R1[i] = omega * R0[i] + (gamma * sumRG) / sumG;
    }
    return R1;
  }

  function getPad1(pad) {
    let pad1 = Math.floor(pad / 10);
    if (pad1 < 5) pad1 = 5;
    return pad1;
  }

  /** Restore straight upstream/downstream reaches (y=0) after resampling — matches model intent. */
  function enforcePadding(x, y, pad, pad1, deltas) {
    const n = x.length;
    if (n <= pad1 + pad + 1) return;

    const xCoreStart = x[pad1];
    for (let i = 0; i < pad1; i++) {
      y[i] = 0;
      x[i] = pad1 > 0 ? xCoreStart * (i / pad1) : 0;
    }

    const coreEnd = n - pad - 1;
    const xCoreEnd = x[coreEnd];
    for (let i = 0; i < pad; i++) {
      const idx = coreEnd + 1 + i;
      y[idx] = 0;
      x[idx] = xCoreEnd + (i + 1) * deltas;
    }
  }

  function sliceToCore(ch, pad) {
    const pad1 = getPad1(pad);
    const n = ch.x.length;
    const hi = n - pad;
    if (hi <= pad1 + 1) return ch;
    return {
      x: ch.x.subarray(pad1, hi),
      y: ch.y.subarray(pad1, hi),
      z: ch.z.subarray(pad1, hi),
      W: ch.W,
      D: ch.D,
    };
  }

  function migrateOneStep(x, y, z, W, kl, dt, k, Cf, D, pad, pad1, deltas, cflFactor = 0.5) {
    const ns = x.length;
    const curv = computeCurvature(x, y);
    const { dx, dy, ds, s } = computeDerivatives(x, y, z);
    const endDist = Math.sqrt((x[ns - 1] - x[0]) ** 2 + (y[ns - 1] - y[0]) ** 2);
    const sinuosity = endDist > 0 ? s[ns - 1] / endDist : 1;

    const R0 = new Float64Array(ns);
    for (let i = 0; i < ns; i++) R0[i] = kl * W * curv[i];

    const alpha = k * 2 * Cf / D;
    let R1 = computeMigrationRate(pad, ns, ds, alpha, R0);
    const sinFac = Math.pow(sinuosity, -2 / 3);
    for (let i = 0; i < ns; i++) R1[i] *= sinFac;

    const hi = ns - pad + 1;
    for (let i = pad1; i < hi; i++) {
      const dyDs = dy[i] / (ds[i] || 1e-10);
      const dxDs = dx[i] / (ds[i] || 1e-10);
      let dispX = R1[i] * dyDs * dt;
      let dispY = -R1[i] * dxDs * dt;

      if (deltas != null) {
        const maxAllowed = cflFactor * deltas;
        const mag = Math.sqrt(dispX * dispX + dispY * dispY);
        if (mag > maxAllowed) {
          const scale = maxAllowed / Math.max(mag, 1e-10);
          dispX *= scale;
          dispY *= scale;
        }
      }

      x[i] += dispX;
      y[i] += dispY;
    }
    return { x, y };
  }

  function kthDiagIndices(n, k) {
    const rows = [];
    const cols = [];
    if (k === 0) {
      for (let i = 0; i < n; i++) {
        rows.push(i);
        cols.push(i);
      }
    } else if (k > 0) {
      for (let i = k; i < n; i++) {
        rows.push(i);
        cols.push(i - k);
      }
    } else {
      const kk = -k;
      for (let i = 0; i < n - kk; i++) {
        rows.push(i);
        cols.push(i + kk);
      }
    }
    return { rows, cols };
  }

  function findCutoffs(x, y, crdist, deltas) {
    const n = x.length;
    const diagBlankWidth = Math.floor((crdist + 20 * deltas) / deltas);

    for (let i = 0; i < n; i++) {
      for (let j = i + diagBlankWidth + 1; j < n; j++) {
        const dx = x[i] - x[j];
        if (dx > crdist || dx < -crdist) continue;
        const dy = y[i] - y[j];
        if (dy > crdist || dy < -crdist) continue;
        if (dx * dx + dy * dy <= crdist * crdist) {
          return { ind1: [i], ind2: [j] };
        }
      }
    }
    return { ind1: [], ind2: [] };
  }

  function concatArrays(a, b) {
    const out = new Float64Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  function cutOffCutoffs(x, y, z, crdist, deltas) {
    const xc = [];
    const yc = [];
    const zc = [];
    let cx = copyArray(x);
    let cy = copyArray(y);
    let cz = copyArray(z);

    let { ind1, ind2 } = findCutoffs(cx, cy, crdist, deltas);
    while (ind1.length > 0) {
      const i1 = ind1[0];
      const i2 = ind2[0];
      if (cx.length < 2 || i2 >= cx.length) break;
      xc.push(cx.slice(i1, i2 + 1));
      yc.push(cy.slice(i1, i2 + 1));
      zc.push(cz.slice(i1, i2 + 1));
      cx = concatArrays(cx.slice(0, i1 + 1), cx.slice(i2));
      cy = concatArrays(cy.slice(0, i1 + 1), cy.slice(i2));
      cz = concatArrays(cz.slice(0, i1 + 1), cz.slice(i2));
      ({ ind1, ind2 } = findCutoffs(cx, cy, crdist, deltas));
    }
    return { x: cx, y: cy, z: cz, xc, yc, zc };
  }

  function cubicSplineInterp(xs, ys, xq) {
    const n = xs.length;
    if (n < 2) return copyArray(ys);
    const h = new Float64Array(n - 1);
    const alpha = new Float64Array(n - 1);
    const l = new Float64Array(n);
    const mu = new Float64Array(n);
    const z = new Float64Array(n);
    const c = new Float64Array(n);
    const b = new Float64Array(n - 1);
    const d = new Float64Array(n - 1);

    for (let i = 0; i < n - 1; i++) h[i] = xs[i + 1] - xs[i];
    for (let i = 1; i < n - 1; i++) {
      alpha[i] = (3 / h[i]) * (ys[i + 1] - ys[i]) - (3 / h[i - 1]) * (ys[i] - ys[i - 1]);
    }

    l[0] = 1;
    mu[0] = 0;
    z[0] = 0;
    for (let i = 1; i < n - 1; i++) {
      l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
      mu[i] = h[i] / l[i];
      z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
    }
    l[n - 1] = 1;
    z[n - 1] = 0;
    c[n - 1] = 0;
    for (let j = n - 2; j >= 0; j--) {
      c[j] = z[j] - mu[j] * c[j + 1];
      b[j] = (ys[j + 1] - ys[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3;
      d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
    }

    const out = new Float64Array(xq.length);
    let seg = 0;
    for (let qi = 0; qi < xq.length; qi++) {
      const x = xq[qi];
      while (seg < n - 2 && x > xs[seg + 1]) seg++;
      const dx = x - xs[seg];
      out[qi] = ys[seg] + b[seg] * dx + c[seg] * dx * dx + d[seg] * dx * dx * dx;
    }
    return out;
  }

  function savgolFilter(data, windowSize, polyOrder) {
    const half = Math.floor(windowSize / 2);
    const m = windowSize;
    const A = [];
    for (let i = -half; i <= half; i++) {
      const row = [];
      for (let j = 0; j <= polyOrder; j++) row.push(Math.pow(i, j));
      A.push(row);
    }
    const AT = transpose(A);
    const ATA = matMul(AT, A);
    const invATA = invertSmall(ATA);
    const coeffMatrix = matMul(invATA, AT);
    const coeffs = coeffMatrix[0];

    const n = data.length;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = -half; j <= half; j++) {
        const idx = Math.min(Math.max(i + j, 0), n - 1);
        sum += coeffs[j + half] * data[idx];
      }
      out[i] = sum;
    }
    return out;
  }

  function transpose(m) {
    return m[0].map((_, i) => m.map((row) => row[i]));
  }

  function matMul(a, b) {
    const rows = a.length;
    const cols = b[0].length;
    const inner = b.length;
    const out = Array.from({ length: rows }, () => new Array(cols).fill(0));
    for (let i = 0; i < rows; i++) {
      for (let k = 0; k < inner; k++) {
        for (let j = 0; j < cols; j++) out[i][j] += a[i][k] * b[k][j];
      }
    }
    return out;
  }

  function matVec(m, v) {
    return m.map((row) => row.reduce((s, val, i) => s + val * v[i], 0));
  }

  function unitVector(n, idx) {
    const v = new Array(n).fill(0);
    v[idx] = 1;
    return v;
  }

  function invertSmall(m) {
    const n = m.length;
    const aug = m.map((row, i) => [...row, ...unitVector(n, i)]);
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let r = i + 1; r < n; r++) {
        if (Math.abs(aug[r][i]) > Math.abs(aug[maxRow][i])) maxRow = r;
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
      const pivot = aug[i][i] || 1e-12;
      for (let j = 0; j < 2 * n; j++) aug[i][j] /= pivot;
      for (let r = 0; r < n; r++) {
        if (r === i) continue;
        const factor = aug[r][i];
        for (let j = 0; j < 2 * n; j++) aug[r][j] -= factor * aug[i][j];
      }
    }
    return aug.map((row) => row.slice(n));
  }

  function resampleCenterline(x, y, z, deltas) {
    const { s } = computeDerivatives(x, y, z);
    const total = s[s.length - 1];
    if (x.length < 2 || total < 1e-6) {
      return { x: copyArray(x), y: copyArray(y), z: copyArray(z), ...computeDerivatives(x, y, z) };
    }
    const nNew = Math.max(2, 1 + Math.round(total / deltas));
    const sNew = linspace(0, total, nNew);
    const xNew = cubicSplineInterp(s, x, sNew);
    const yNew = cubicSplineInterp(s, y, sNew);
    const zNew = cubicSplineInterp(s, z, sNew);
    const deriv = computeDerivatives(xNew, yNew, zNew);
    return { x: xNew, y: yNew, z: zNew, ...deriv };
  }

  function generateInitialChannel(W, D, Sl, deltas, pad, nBends, rng = Math.random) {
    const noisyLen = (nBends * 10 * W) / 2;
    let pad1 = Math.floor(pad / 10);
    if (pad1 < 5) pad1 = 5;
    const nCore = Math.floor(noisyLen / deltas) + 1;
    const nTotal = nCore + pad + pad1;
    const x = linspace(0, noisyLen + (pad + pad1) * deltas, nTotal);
    const y = new Float64Array(nTotal);
    for (let i = 0; i < pad1; i++) y[i] = 0;
    for (let i = pad1; i < pad1 + nCore; i++) y[i] = 2 * (2 * rng() - 1);
    for (let i = pad1 + nCore; i < nTotal; i++) y[i] = 0;
    const deltaz = Sl * deltas * (nTotal - 1);
    const z = linspace(deltaz, 0, nTotal);
    return { x, y, z, W, D };
  }

  function getChannelBanks(x, y, W) {
    const ns = x.length;
    const x1 = copyArray(x);
    const y1 = copyArray(y);
    const x2 = copyArray(x);
    const y2 = copyArray(y);
    for (let i = 0; i < ns - 1; i++) {
      const dx = x[i + 1] - x[i];
      const dy = y[i + 1] - y[i];
      const ds = Math.sqrt(dx * dx + dy * dy) || 1;
      x1[i] = x[i] + 0.5 * W * (dy / ds);
      y1[i] = y[i] - 0.5 * W * (dx / ds);
      x2[i] = x[i] - 0.5 * W * (dy / ds);
      y2[i] = y[i] + 0.5 * W * (dx / ds);
    }
    const dx = x[ns - 1] - x[ns - 2];
    const dy = y[ns - 1] - y[ns - 2];
    const ds = Math.sqrt(dx * dx + dy * dy) || 1;
    x1[ns - 1] = x[ns - 1] + 0.5 * W * (dy / ds);
    y1[ns - 1] = y[ns - 1] - 0.5 * W * (dx / ds);
    x2[ns - 1] = x[ns - 1] - 0.5 * W * (dy / ds);
    y2[ns - 1] = y[ns - 1] + 0.5 * W * (dx / ds);

    const xm = new Float64Array(2 * ns);
    const ym = new Float64Array(2 * ns);
    xm.set(x1, 0);
    ym.set(y1, 0);
    for (let i = 0; i < ns; i++) {
      xm[ns + i] = x2[ns - 1 - i];
      ym[ns + i] = y2[ns - 1 - i];
    }
    return { xm, ym };
  }

  function createChannelBelt(channel) {
    return {
      channels: [channel],
      cutoffs: [],
      cl_times: [0],
      cutoff_times: [],
    };
  }

  function cloneChannel(ch) {
    return { x: copyArray(ch.x), y: copyArray(ch.y), z: copyArray(ch.z), W: ch.W, D: ch.D };
  }

  function cloneCutoff(c) {
    return {
      x: c.x.map((a) => copyArray(a)),
      y: c.y.map((a) => copyArray(a)),
      z: c.z.map((a) => copyArray(a)),
      W: c.W,
      D: c.D,
    };
  }

  function serializeChannelBelt(chb) {
    return {
      channels: chb.channels.map(cloneChannel),
      cutoffs: chb.cutoffs.map(cloneCutoff),
      cl_times: chb.cl_times.slice(),
      cutoff_times: chb.cutoff_times.slice(),
      activeChannel: chb.activeChannel ? cloneChannel(chb.activeChannel) : null,
    };
  }

  function initMigrationState(chb, params) {
    const channel = chb.activeChannel || chb.channels[chb.channels.length - 1];
    let pad1 = Math.floor(params.pad / 10);
    if (pad1 < 5) pad1 = 5;
    const x = copyArray(channel.x);
    const y = copyArray(channel.y);
    const z = copyArray(channel.z);
    const { ds, s } = computeDerivatives(x, y, z);
    return {
      x,
      y,
      z,
      W: channel.W,
      D: channel.D,
      pad1,
      ds,
      s,
      slope: gradient(z).map((v, i) => v / (ds[i] || 1)),
      lastClTime: chb.cl_times.length > 0 ? chb.cl_times[chb.cl_times.length - 1] : 0,
      itn: 0,
    };
  }

  function paramAt(arr, index, fallback) {
    return index < arr.length ? arr[index] : fallback;
  }

  function runOneIteration(chb, params, state) {
    const {
      saved_ts,
      deltas,
      pad,
      crdist,
      depths,
      Cfs,
      kl,
      kv,
      dt,
      dens,
      autoaggradation = true,
      Scr = 0.001,
      t1 = null,
      t2 = null,
      t3 = null,
      aggr_factor = null,
      cfl_factor = 0.5,
    } = params;

    const itn = state.itn;
    if (state.x.length < 2) return false;

    state.D = paramAt(depths, itn, state.D);
    const Cf = paramAt(Cfs, itn, Cfs[Cfs.length - 1]);
    const k = 1.0;

    ({ x: state.x, y: state.y } = migrateOneStep(
      state.x,
      state.y,
      state.z,
      state.W,
      kl,
      dt,
      k,
      Cf,
      state.D,
      pad,
      state.pad1,
      deltas,
      cfl_factor
    ));

    const cutoffResult = cutOffCutoffs(state.x, state.y, state.z, crdist, deltas);
    state.x = cutoffResult.x;
    state.y = cutoffResult.y;
    state.z = cutoffResult.z;

    if (cutoffResult.xc.length > 0) {
      chb.cutoff_times.push(state.lastClTime + ((itn + 1) * dt) / SECONDS_PER_YEAR);
      chb.cutoffs.push({
        x: cutoffResult.xc,
        y: cutoffResult.yc,
        z: cutoffResult.zc,
        W: state.W,
        D: state.D,
      });
    }

    const resampled = resampleCenterline(state.x, state.y, state.z, deltas);
    state.x = resampled.x;
    state.y = resampled.y;
    state.z = resampled.z;
    enforcePadding(state.x, state.y, pad, state.pad1, deltas);
    state.ds = resampled.ds;
    state.s = resampled.s;

    if (state.z.length >= 21) {
      state.z = savgolFilter(state.z, 21, 2);
    }
    state.slope = gradient(state.z).map((v, i) => v / (state.ds[i] || 1));

    if (autoaggradation) {
      let maxSlope = 0;
      for (let i = 0; i < state.slope.length; i++) maxSlope = Math.max(maxSlope, state.slope[i]);
      if (maxSlope > 0.001) {
        const R = 1.65;
        const C = 0.1;
        for (let i = 0; i < state.z.length; i++) {
          state.z[i] += kv * dens * 9.81 * R * C * state.D * (Scr - state.slope[i]) * dt;
        }
      }
    } else if (t1 != null && t2 != null && t3 != null && aggr_factor != null) {
      const minAbsSlope = Math.min(...state.slope.map((v) => Math.abs(v)));
      if (itn > t1 && itn <= t2) {
        if (minAbsSlope !== 0) {
          for (let i = 0; i < state.z.length; i++) {
            state.z[i] += kv * dens * 9.81 * state.D * state.slope[i] * dt;
          }
        } else {
          for (let i = 0; i < state.z.length; i++) state.z[i] -= kv * dens * 9.81 * state.D * dt * 0.05;
        }
      }
      if (itn > t2 && itn <= t3) {
        const med = median(state.slope);
        if (minAbsSlope !== 0) {
          for (let i = 0; i < state.z.length; i++) {
            state.z[i] +=
              kv * dens * 9.81 * state.D * state.slope[i] * dt -
              kv * dens * 9.81 * state.D * med * dt;
          }
        }
      }
      if (itn > t3) {
        const mean = state.slope.reduce((a, b) => a + b, 0) / state.slope.length;
        if (minAbsSlope !== 0) {
          for (let i = 0; i < state.z.length; i++) {
            state.z[i] +=
              kv * dens * 9.81 * state.D * state.slope[i] * dt -
              aggr_factor * kv * dens * 9.81 * state.D * mean * dt;
          }
        } else {
          for (let i = 0; i < state.z.length; i++) state.z[i] += aggr_factor * dt;
        }
      }
    }

    if (itn > 0 && itn % saved_ts === 0) {
      chb.cl_times.push(state.lastClTime + ((itn + 1) * dt) / SECONDS_PER_YEAR);
      chb.channels.push({
        x: copyArray(state.x),
        y: copyArray(state.y),
        z: copyArray(state.z),
        W: state.W,
        D: state.D,
      });
    }

    state.itn = itn + 1;
    return state.x.length >= 2;
  }

  const OXBOW_FADE_YEARS = 50;

  /** Drop geometry after point bar is baked to canvas — keeps memory flat. */
  function releaseChannelGeometry(ch) {
    if (!ch || ch.baked) return;
    ch.x = null;
    ch.y = null;
    ch.z = null;
    ch.baked = true;
  }

  /** Lightweight view for renderer — no array copies. */
  function syncLiveChannelView(chb, state) {
    if (!state) {
      chb.liveChannel = null;
      return;
    }
    chb.liveChannel = {
      x: state.x,
      y: state.y,
      z: state.z,
      W: state.W,
      D: state.D,
    };
  }

  function pruneExpiredCutoffs(chb, endTime, fadeYears = OXBOW_FADE_YEARS) {
    let i = 0;
    while (i < chb.cutoffs.length) {
      if (endTime - chb.cutoff_times[i] >= fadeYears) {
        chb.cutoffs.splice(i, 1);
        chb.cutoff_times.splice(i, 1);
      } else {
        i += 1;
      }
    }
  }

  function ensureParamsCapacity(params, itn) {
    if (itn < params.depths.length) return;
    const grow = Math.max(500, itn + 1);
    const d = new Float64Array(grow);
    const c = new Float64Array(grow);
    d.set(params.depths);
    c.set(params.Cfs);
    for (let i = params.depths.length; i < grow; i++) {
      d[i] = params.D;
      c[i] = 0.011;
    }
    params.depths = d;
    params.Cfs = c;
    params.nit = grow;
  }

  function migrateBatch(chb, params, state, batchSize, continuous = false) {
    for (let n = 0; n < batchSize; n++) {
      if (!continuous && state.itn >= params.nit) break;
      if (continuous) ensureParamsCapacity(params, state.itn + 1);
      if (!runOneIteration(chb, params, state)) break;
    }
    return {
      itn: state.itn,
      total: continuous ? null : params.nit,
      done: !continuous && (state.itn >= params.nit || state.x.length < 2),
      years: state.lastClTime + (state.itn * params.dt) / SECONDS_PER_YEAR,
    };
  }

  function migrate(chb, params, onProgress) {
    const state = initMigrationState(chb, params);
    while (state.itn < params.nit && state.x.length >= 2) {
      runOneIteration(chb, params, state);
      if (onProgress && (state.itn % 50 === 0 || state.itn === params.nit)) {
        onProgress({
          iteration: state.itn,
          total: params.nit,
          channelBelt: state.itn === params.nit || state.itn % params.saved_ts === 0 ? serializeChannelBelt(chb) : null,
          current: chb.activeChannel,
        });
      }
    }
    return chb;
  }

  function median(arr) {
    const s = Array.from(arr).sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function defaultParams(overrides = {}) {
    const nit = overrides.nit ?? 2000;
    const W = overrides.W ?? 200;
    const D = overrides.D ?? 6;
    return {
      nit,
      W,
      D,
      depths: Float64Array.from({ length: nit }, () => D),
      pad: overrides.pad ?? 100,
      deltas: overrides.deltas ?? 50,
      Cfs: Float64Array.from({ length: nit }, () => 0.011),
      crdist: overrides.crdist ?? 2 * W,
      kl: overrides.kl ?? 60 / SECONDS_PER_YEAR,
      kv: overrides.kv ?? 1e-11,
      dt: overrides.dt ?? 2 * 0.05 * SECONDS_PER_YEAR,
      dens: overrides.dens ?? 1000,
      saved_ts: overrides.saved_ts ?? 10,
      n_bends: overrides.n_bends ?? 30,
      Sl: overrides.Sl ?? 0.002,
      autoaggradation: overrides.autoaggradation ?? true,
      t1: overrides.t1 ?? 500,
      t2: overrides.t2 ?? 700,
      t3: overrides.t3 ?? 1200,
      aggr_factor: overrides.aggr_factor ?? 2e-9,
      cfl_factor: overrides.cfl_factor ?? 0.5,
    };
  }

  return {
    SECONDS_PER_YEAR,
    computeDerivatives,
    computeCurvature,
    computeMigrationRate,
    migrateOneStep,
    generateInitialChannel,
    getChannelBanks,
    getPad1,
    sliceToCore,
    enforcePadding,
    createChannelBelt,
    migrate,
    migrateBatch,
    initMigrationState,
    defaultParams,
    serializeChannelBelt,
    cloneChannel,
    cutOffCutoffs,
    resampleCenterline,
    releaseChannelGeometry,
    syncLiveChannelView,
    pruneExpiredCutoffs,
    OXBOW_FADE_YEARS,
  };
});
