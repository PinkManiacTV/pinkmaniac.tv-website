importScripts('meander-engine.js');

self.onmessage = function (e) {
  const { type, params, seed } = e.data;

  if (type === 'run') {
    const rng = seededRandom(seed ?? Date.now());
    const p = MeanderEngine.defaultParams(params);
    const ch = MeanderEngine.generateInitialChannel(
      p.W,
      p.D,
      p.Sl,
      p.deltas,
      p.pad,
      p.n_bends,
      rng
    );
    const chb = MeanderEngine.createChannelBelt(ch);

    MeanderEngine.migrate(chb, p, (progress) => {
      self.postMessage({ type: 'progress', ...progress });
    });

    self.postMessage({
      type: 'done',
      channelBelt: MeanderEngine.serializeChannelBelt(chb),
    });
  }
};

function seededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
