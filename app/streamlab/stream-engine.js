/**
 * Stream Lab v2 — potential-flow engine (no depth)
 *
 * Water is binary (a cell is wet or dry). Discs block flow completely.
 * A single potential field (source = 1, drain = 0) is solved over the grid;
 * per-cell flux magnitude gives the flow speed shown as color.
 *
 * Permeability: channel = high, grass = low (but passable), disc = zero.
 * Mass conservation is inherent: constrictions concentrate flux -> faster water.
 * The field is re-solved only when discs change, never per frame.
 */
(function (global) {
    'use strict';

    var GRID = 96;
    var MIN_X = 0;
    var MAX_X = GRID - 1;
    var MIN_Y = 0;
    var MAX_Y = GRID - 1;
    var WIDTH = GRID;
    var HEIGHT = GRID;
    var TILE_PX = 8;
    var SEED_CHANNEL_HALF = 10;
    var SEED_MEANDER_AMP = 6;
    var MAX_ROCKS = 50;
    var MAX_ROCK_RADIUS = 20;
    var DIG_RADIUS = MAX_ROCK_RADIUS * 0.25;
    var ROCK_VISUAL_SCALE = 0.45;
    var ROCK_BLOCK_VISUAL = 0.58;

    var K_CHANNEL = 1.0;
    var K_GRASS = 0.03;
    // Grass along a spillway gets "carved" more permeable, like water eroding
    // a gully, so the detour carries a concentrated, visible stream.
    var K_GRASS_CARVED = 0.95;
    // Spillway path cost (Dijkstra): a dammed pool overflows at its
    // downstream rim and the detour runs with the stream, never back up.
    var SPILL_COST_LATERAL = 1.0;
    var SPILL_COST_DOWNSTREAM = 0.85;
    var SPILL_COST_UPSTREAM = 4.0;
    var SPILL_COST_DIAG_DOWN = ((SPILL_COST_LATERAL + SPILL_COST_DOWNSTREAM) / 2) * Math.SQRT2;
    var SPILL_COST_DIAG_UP = ((SPILL_COST_LATERAL + SPILL_COST_UPSTREAM) / 2) * Math.SQRT2;
    // Deterministic per-cell terrain noise breaks cost ties, so the path
    // meanders organically instead of tracing axis-aligned rectangles.
    var SPILL_NOISE = 0.35;
    // Starting bias per cell of y above the pool's downstream rim, so the
    // spillway prefers to leave the pool as far downstream as possible.
    var SPILL_START_Y_BIAS = 0.75;
    // Half-width of the carved gully around the spill path (cells).
    var SPILL_CARVE_RADIUS = 2;
    // Walking an existing dig is cheap, so overflow prefers the dug corridor.
    var SPILL_COST_DIG = 0.12;
    // Tiny channel pockets trapped between rocks are not valid overflow
    // destinations — the spillway must reach a real basin (dig / downstream).
    var MIN_SPILL_TARGET = 20;
    var SOLVE_ITERS_FULL = 300;
    var SOLVE_ITERS_DIG = 90;
    var SOR_OMEGA = 1.7;

    // Wet/speed thresholds are relative to refFlux (median open-channel flux).
    var WET_FLUX_REL = 0.05;
    // Tiny wet-grass specks are pruned; a real spillway is a long streak.
    var MIN_GRASS_STREAK = 6;
    var SPEED_REL_T1 = 0.45;
    var SPEED_REL_T2 = 1.15;
    var SPEED_REL_T3 = 1.8;

    function idx(x, y) {
        return y * WIDTH + x;
    }

    function inBounds(x, y) {
        return x >= MIN_X && x <= MAX_X && y >= MIN_Y && y <= MAX_Y;
    }

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function dist2d(ax, ay, bx, by) {
        var dx = bx - ax;
        var dy = by - ay;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function tileHash(x, y) {
        var n = (x * 374761 + y * 668265) | 0;
        n = ((n >> 13) ^ n) * 1274126177;
        return (n ^ (n >> 16)) & 255;
    }

    function edgeK(ka, kb) {
        if (ka <= 0 || kb <= 0) return 0;
        return (2 * ka * kb) / (ka + kb);
    }

    function StreamEngine() {
        this.channelMask = new Uint8Array(WIDTH * HEIGHT);
        this.seedChannelMask = new Uint8Array(WIDTH * HEIGHT);
        this.digMask = new Uint8Array(WIDTH * HEIGHT);
        this.rockSolid = new Uint8Array(WIDTH * HEIGHT);
        this.perm = new Float32Array(WIDTH * HEIGHT);
        this.condR = new Float32Array(WIDTH * HEIGHT);
        this.condD = new Float32Array(WIDTH * HEIGHT);
        this.phi = new Float32Array(WIDTH * HEIGHT);
        this.fixedCell = new Uint8Array(WIDTH * HEIGHT);
        this.flux = new Float32Array(WIDTH * HEIGHT);
        this.carveMask = new Uint8Array(WIDTH * HEIGHT);
        this.wateredMask = new Uint8Array(WIDTH * HEIGHT);
        this.wetMask = new Uint8Array(WIDTH * HEIGHT);
        this.speedLevel = new Uint8Array(WIDTH * HEIGHT);
        this.refFlux = 0;
        this.rocks = [];
        this.nextRockId = 1;
        this.seedNodes = [];
        this.sourceX = Math.floor(WIDTH / 2);
    }

    StreamEngine.prototype.clear = function () {
        var i;
        for (i = 0; i < this.channelMask.length; i++) {
            this.channelMask[i] = 0;
            this.seedChannelMask[i] = 0;
            this.digMask[i] = 0;
            this.rockSolid[i] = 0;
            this.perm[i] = 0;
            this.phi[i] = 0;
            this.fixedCell[i] = 0;
            this.flux[i] = 0;
            this.carveMask[i] = 0;
            this.wateredMask[i] = 0;
            this.wetMask[i] = 0;
            this.speedLevel[i] = 0;
        }
        this.rocks = [];
        this.refFlux = 0;
    };

    StreamEngine.prototype.setup = function () {
        this.clear();
        this.createSeedChannel();
        this.initPotential();
        this.rebuildRockMask();
        this.calibrateReference();
    };

    StreamEngine.prototype.createSeedChannel = function () {
        var y;
        var row;
        var cx;
        var center = Math.floor(WIDTH / 2);
        var wl = HEIGHT / 2;
        var ph = 1.7;
        var nodes = [];
        var ni;
        var a;
        var b;
        var steps;
        var s;
        var t;
        var px;
        var py;

        for (y = MAX_Y; y >= MIN_Y; y -= 6) {
            row = MAX_Y - y;
            cx = center + Math.sin((row / wl) * Math.PI * 1.35 + ph) * SEED_MEANDER_AMP;
            nodes.push({ x: cx, y: y });
        }

        this.seedNodes = nodes;
        this.sourceX = nodes.length ? Math.round(nodes[0].x) : center;

        for (ni = 0; ni < nodes.length; ni++) {
            this.stampDisc(nodes[ni].x, nodes[ni].y, SEED_CHANNEL_HALF);
            if (ni + 1 < nodes.length) {
                a = nodes[ni];
                b = nodes[ni + 1];
                steps = Math.max(1, Math.ceil(dist2d(a.x, a.y, b.x, b.y) / 1.5));
                for (s = 1; s < steps; s++) {
                    t = s / steps;
                    px = a.x + (b.x - a.x) * t;
                    py = a.y + (b.y - a.y) * t;
                    this.stampDisc(px, py, SEED_CHANNEL_HALF);
                }
            }
        }

        // Snapshot seed so Clear digs can restore without touching the brook.
        var i;
        for (i = 0; i < this.channelMask.length; i++) {
            this.seedChannelMask[i] = this.channelMask[i];
        }
    };

    StreamEngine.prototype.stampDisc = function (cx, cy, radius) {
        var r2 = (radius + 0.5) * (radius + 0.5);
        var dx;
        var dy;
        var x;
        var y;

        for (dy = -Math.ceil(radius) - 1; dy <= Math.ceil(radius) + 1; dy++) {
            for (dx = -Math.ceil(radius) - 1; dx <= Math.ceil(radius) + 1; dx++) {
                if (dx * dx + dy * dy > r2) continue;
                x = Math.round(cx + dx);
                y = Math.round(cy + dy);
                if (!inBounds(x, y)) continue;
                this.channelMask[idx(x, y)] = 1;
            }
        }
    };

    StreamEngine.prototype.initPotential = function () {
        var x;
        var y;
        var i;
        var span = MAX_Y - MIN_Y;

        for (y = MIN_Y; y <= MAX_Y; y++) {
            for (x = MIN_X; x <= MAX_X; x++) {
                i = idx(x, y);
                this.phi[i] = (y - MIN_Y) / span;
            }
        }
    };

    StreamEngine.prototype.isChannel = function (i) {
        return this.channelMask[i] === 1;
    };

    StreamEngine.prototype.isWet = function (i) {
        return this.wetMask[i] === 1;
    };

    StreamEngine.prototype.getSpeedLevel = function (i) {
        return this.speedLevel[i];
    };

    StreamEngine.prototype.getTileVariant = function (x, y) {
        return tileHash(x, y) % 3;
    };

    StreamEngine.prototype.rockVisualCells = function (radius) {
        return radius * ROCK_VISUAL_SCALE;
    };

    StreamEngine.prototype.rockBlockCells = function (radius) {
        return this.rockVisualCells(radius) * ROCK_BLOCK_VISUAL;
    };

    StreamEngine.prototype.rockHitCells = function (radius) {
        // Match drawn rock footprint (renderer uses visualCells * 0.55).
        // Slightly inside so grabbing beside the sprite is not possible.
        return this.rockVisualCells(radius) * 0.52;
    };

    StreamEngine.prototype.digBrushCells = function () {
        return this.rockVisualCells(DIG_RADIUS);
    };

    StreamEngine.prototype.applyChannelFromSeedAndDig = function () {
        var i;
        for (i = 0; i < this.channelMask.length; i++) {
            this.channelMask[i] = (this.seedChannelMask[i] || this.digMask[i]) ? 1 : 0;
        }
    };

    /**
     * Dig a disc of ground into channel. Stops at rocks. Grass and dry seed
     * bed both take a dig mark (intent corridor); seed geometry stays on
     * Clear digs. Returns true if any new dig cell was stamped.
     */
    StreamEngine.prototype.stampDig = function (wx, wy) {
        var r = this.digBrushCells();
        var r2 = r * r;
        var changed = false;
        var dx;
        var dy;
        var x;
        var y;
        var i;

        for (dy = -Math.ceil(r) - 1; dy <= Math.ceil(r) + 1; dy++) {
            for (dx = -Math.ceil(r) - 1; dx <= Math.ceil(r) + 1; dx++) {
                if (dx * dx + dy * dy > r2) continue;
                x = Math.round(wx + dx);
                y = Math.round(wy + dy);
                if (!inBounds(x, y)) continue;
                i = idx(x, y);
                if (this.rockSolid[i]) continue;
                if (this.digMask[i]) continue;
                this.digMask[i] = 1;
                changed = true;
            }
        }

        if (changed) this.applyChannelFromSeedAndDig();
        return changed;
    };

    StreamEngine.prototype.digAt = function (wx, wy, dragQuality) {
        if (!this.stampDig(wx, wy)) return false;
        this.solveFlow(dragQuality ? SOLVE_ITERS_DIG : SOLVE_ITERS_FULL);
        return true;
    };

    StreamEngine.prototype.digSolve = function (dragQuality) {
        this.solveFlow(dragQuality ? SOLVE_ITERS_DIG : SOLVE_ITERS_FULL);
    };

    StreamEngine.prototype.clearDigs = function () {
        var i;
        var had = false;
        for (i = 0; i < this.digMask.length; i++) {
            if (this.digMask[i]) had = true;
            this.digMask[i] = 0;
        }
        if (!had) return false;
        this.applyChannelFromSeedAndDig();
        this.rebuildRockMask();
        return true;
    };

    StreamEngine.prototype.rebuildPermeability = function () {
        var i;
        var x;
        var y;

        for (y = MIN_Y; y <= MAX_Y; y++) {
            for (x = MIN_X; x <= MAX_X; x++) {
                i = idx(x, y);
                this.fixedCell[i] = 0;
                if (this.rockSolid[i]) {
                    this.perm[i] = 0;
                    continue;
                }
                if (this.channelMask[i]) {
                    this.perm[i] = K_CHANNEL;
                } else {
                    this.perm[i] = this.carveMask[i] ? K_GRASS_CARVED : K_GRASS;
                }
            }
        }

        // Precompute edge conductances so the relaxation inner loop is
        // pure array lookups (condR = edge to x+1, condD = edge to y+1).
        for (y = MIN_Y; y <= MAX_Y; y++) {
            for (x = MIN_X; x <= MAX_X; x++) {
                i = idx(x, y);
                this.condR[i] = x < MAX_X ? edgeK(this.perm[i], this.perm[i + 1]) : 0;
                this.condD[i] = y < MAX_Y ? edgeK(this.perm[i], this.perm[i + WIDTH]) : 0;
            }
        }

        // Source (bottom of world, top of screen) and drain rows are fixed.
        for (x = MIN_X; x <= MAX_X; x++) {
            for (y = MAX_Y - 1; y <= MAX_Y; y++) {
                i = idx(x, y);
                if (this.perm[i] > 0 && this.channelMask[i]) {
                    this.fixedCell[i] = 1;
                    this.phi[i] = 1;
                }
            }
            for (y = MIN_Y; y <= MIN_Y + 1; y++) {
                i = idx(x, y);
                if (this.perm[i] > 0 && this.channelMask[i]) {
                    this.fixedCell[i] = 1;
                    this.phi[i] = 0;
                }
            }
        }
    };

    StreamEngine.prototype.solveFlow = function (iters) {
        var n = iters != null ? iters : SOLVE_ITERS_FULL;
        var i;

        for (i = 0; i < this.carveMask.length; i++) this.carveMask[i] = 0;

        this.rebuildPermeability();
        this.buildSpillways();
        this.rebuildPermeability();
        this.relax(n);
        this.computeFlux();
        this.classifyCells();
    };

    /**
     * Free-surface behavior that pure potential flow lacks: a dammed pool
     * fills up and overflows. Channel regions are labeled by connectivity;
     * water starts in the source region and, for every watered region that
     * cannot reach the drain, a spillway is carved: the cheapest grass path
     * (Dijkstra) to the next open water, preferring to leave the pool at its
     * downstream rim and penalizing upstream travel. Fills wateredMask and
     * carveMask; needs no flux, only geometry.
     */
    StreamEngine.prototype.buildSpillways = function () {
        var len = WIDTH * HEIGHT;
        var region = this.regionScratch || (this.regionScratch = new Int32Array(len));
        var stack = [];
        var regionHasDrain = [];
        var regionSize = [];
        var regionHasDig = [];
        var watered = [];
        var spilled = [];
        var nRegions = 0;
        var i;
        var cur;
        var x;
        var y;
        var rid;
        var progress;
        var guard;
        var result;
        var size;

        region.fill(-1);

        var self = this;

        function channelOpen(k) {
            return self.channelMask[k] === 1 && self.perm[k] > 0;
        }

        for (i = 0; i < len; i++) {
            if (region[i] >= 0 || !channelOpen(i)) continue;
            regionHasDrain[nRegions] = false;
            regionHasDig[nRegions] = false;
            watered[nRegions] = false;
            spilled[nRegions] = false;
            size = 0;
            region[i] = nRegions;
            stack.push(i);
            while (stack.length) {
                cur = stack.pop();
                size++;
                if (this.digMask[cur]) regionHasDig[nRegions] = true;
                x = cur % WIDTH;
                y = (cur / WIDTH) | 0;
                if (y >= MAX_Y - 1) watered[nRegions] = true;
                if (y <= MIN_Y + 1) regionHasDrain[nRegions] = true;
                if (x > MIN_X && region[cur - 1] < 0 && channelOpen(cur - 1)) { region[cur - 1] = nRegions; stack.push(cur - 1); }
                if (x < MAX_X && region[cur + 1] < 0 && channelOpen(cur + 1)) { region[cur + 1] = nRegions; stack.push(cur + 1); }
                if (y > MIN_Y && region[cur - WIDTH] < 0 && channelOpen(cur - WIDTH)) { region[cur - WIDTH] = nRegions; stack.push(cur - WIDTH); }
                if (y < MAX_Y && region[cur + WIDTH] < 0 && channelOpen(cur + WIDTH)) { region[cur + WIDTH] = nRegions; stack.push(cur + WIDTH); }
            }
            regionSize[nRegions] = size;
            nRegions++;
        }

        guard = 0;
        do {
            progress = false;
            for (rid = 0; rid < nRegions; rid++) {
                if (!watered[rid] || regionHasDrain[rid] || spilled[rid]) continue;
                spilled[rid] = true;
                // Prefer a path that reaches a drain, using dig as a cheap
                // corridor; fall back to any real basin if no drain is reachable.
                result = this.findSpillPath(rid, region, null, regionSize, regionHasDrain, true);
                if (!result) {
                    result = this.findSpillPath(rid, region, null, regionSize, regionHasDrain, false);
                }
                if (result) {
                    this.carveSpillPath(result.path);
                    // Water every channel region the path touches (dig + destination)
                    var pi;
                    var pr;
                    for (pi = 0; pi < result.path.length; pi++) {
                        pr = region[result.path[pi]];
                        if (pr >= 0 && !watered[pr]) {
                            watered[pr] = true;
                            progress = true;
                        }
                    }
                    if (!watered[result.targetRegion]) {
                        watered[result.targetRegion] = true;
                        progress = true;
                    }
                }
            }
        } while (progress && ++guard < MAX_ROCKS);

        for (i = 0; i < len; i++) {
            this.wateredMask[i] = region[i] >= 0 && watered[region[i]] ? 1 : 0;
        }
    };

    /**
     * Multi-source Dijkstra from the pooled region to a spill destination.
     * Dig cells are a cheap corridor (player intent); grass is the expensive
     * default. When requireDrain is true, only drain-bearing basins count as
     * goals — dig without a drain is traversed, not accepted as the end.
     */
    StreamEngine.prototype.findSpillPath = function (rid, region, blocked, regionSize, regionHasDrain, requireDrain) {
        var len = WIDTH * HEIGHT;
        var dist = this.distScratch || (this.distScratch = new Float64Array(len));
        var prev = this.prevScratch || (this.prevScratch = new Int32Array(len));
        var heapIdx = [];
        var heapCost = [];
        var minY = MAX_Y;
        var i;
        var x;
        var y;
        var cur;
        var curCost;
        var stepCost;
        var next;
        var dirs;
        var d;
        var path;
        var targetRid;
        var accept;
        var base;

        dist.fill(Infinity);
        prev.fill(-1);

        function heapPush(idxVal, cost) {
            heapIdx.push(idxVal);
            heapCost.push(cost);
            var c = heapIdx.length - 1;
            while (c > 0) {
                var p = (c - 1) >> 1;
                if (heapCost[p] <= heapCost[c]) break;
                var ti = heapIdx[p]; heapIdx[p] = heapIdx[c]; heapIdx[c] = ti;
                var tc = heapCost[p]; heapCost[p] = heapCost[c]; heapCost[c] = tc;
                c = p;
            }
        }

        function heapPop() {
            var topIdx = heapIdx[0];
            var last = heapIdx.length - 1;
            heapIdx[0] = heapIdx[last];
            heapCost[0] = heapCost[last];
            heapIdx.pop();
            heapCost.pop();
            var p = 0;
            for (;;) {
                var l = p * 2 + 1;
                var r = l + 1;
                var s = p;
                if (l < heapIdx.length && heapCost[l] < heapCost[s]) s = l;
                if (r < heapIdx.length && heapCost[r] < heapCost[s]) s = r;
                if (s === p) break;
                var ti = heapIdx[p]; heapIdx[p] = heapIdx[s]; heapIdx[s] = ti;
                var tc = heapCost[p]; heapCost[p] = heapCost[s]; heapCost[s] = tc;
                p = s;
            }
            return topIdx;
        }

        for (i = 0; i < len; i++) {
            if (region[i] === rid) {
                y = (i / WIDTH) | 0;
                if (y < minY) minY = y;
            }
        }
        for (i = 0; i < len; i++) {
            if (region[i] === rid) {
                y = (i / WIDTH) | 0;
                dist[i] = (y - minY) * SPILL_START_Y_BIAS;
                heapPush(i, dist[i]);
            }
        }

        while (heapIdx.length) {
            cur = heapPop();
            curCost = dist[cur];
            targetRid = region[cur];
            if (targetRid >= 0 && targetRid !== rid) {
                accept = !(regionSize && regionSize[targetRid] < MIN_SPILL_TARGET);
                if (accept && requireDrain && !(regionHasDrain && regionHasDrain[targetRid])) {
                    accept = false;
                }
                if (accept) {
                    path = [];
                    for (i = cur; i >= 0; i = prev[i]) path.push(i);
                    return { path: path, targetRegion: targetRid, cost: curCost };
                }
                // Dig / tiny pocket without drain: keep walking through it.
            }

            x = cur % WIDTH;
            y = (cur / WIDTH) | 0;
            dirs = [];
            if (x > MIN_X) dirs.push([cur - 1, SPILL_COST_LATERAL]);
            if (x < MAX_X) dirs.push([cur + 1, SPILL_COST_LATERAL]);
            if (y > MIN_Y) dirs.push([cur - WIDTH, SPILL_COST_DOWNSTREAM]);
            if (y < MAX_Y) dirs.push([cur + WIDTH, SPILL_COST_UPSTREAM]);
            if (x > MIN_X && y > MIN_Y && this.perm[cur - 1] > 0 && this.perm[cur - WIDTH] > 0) {
                dirs.push([cur - WIDTH - 1, SPILL_COST_DIAG_DOWN]);
            }
            if (x < MAX_X && y > MIN_Y && this.perm[cur + 1] > 0 && this.perm[cur - WIDTH] > 0) {
                dirs.push([cur - WIDTH + 1, SPILL_COST_DIAG_DOWN]);
            }
            if (x > MIN_X && y < MAX_Y && this.perm[cur - 1] > 0 && this.perm[cur + WIDTH] > 0) {
                dirs.push([cur + WIDTH - 1, SPILL_COST_DIAG_UP]);
            }
            if (x < MAX_X && y < MAX_Y && this.perm[cur + 1] > 0 && this.perm[cur + WIDTH] > 0) {
                dirs.push([cur + WIDTH + 1, SPILL_COST_DIAG_UP]);
            }

            for (d = 0; d < dirs.length; d++) {
                next = dirs[d][0];
                if (this.perm[next] <= 0) continue;
                if (region[next] === rid) continue;
                if (blocked && blocked[next]) continue;
                base = dirs[d][1];
                // Dig corridor is the cheap preferred route.
                if (this.digMask[next]) {
                    stepCost = SPILL_COST_DIG + (tileHash(next % WIDTH, (next / WIDTH) | 0) / 255) * SPILL_NOISE * 0.25;
                } else {
                    stepCost = base + (tileHash(next % WIDTH, (next / WIDTH) | 0) / 255) * SPILL_NOISE;
                }
                if (curCost + stepCost < dist[next]) {
                    dist[next] = curCost + stepCost;
                    prev[next] = cur;
                    heapPush(next, dist[next]);
                }
            }
        }
        return null;
    };

    StreamEngine.prototype.carveSpillPath = function (path) {
        var pi;
        var i;
        var x;
        var y;
        var dx;
        var dy;
        var n;
        var r = SPILL_CARVE_RADIUS;

        for (pi = 0; pi < path.length; pi++) {
            i = path[pi];
            if (this.channelMask[i]) continue;
            x = i % WIDTH;
            y = (i / WIDTH) | 0;
            for (dy = -r; dy <= r; dy++) {
                for (dx = -r; dx <= r; dx++) {
                    if (!inBounds(x + dx, y + dy)) continue;
                    n = idx(x + dx, y + dy);
                    if (!this.channelMask[n] && this.perm[n] > 0) this.carveMask[n] = 1;
                }
            }
        }
    };

    StreamEngine.prototype.relax = function (n) {
        var phi = this.phi;
        var perm = this.perm;
        var fixed = this.fixedCell;
        var condR = this.condR;
        var condD = this.condD;
        var it;
        var x;
        var y;
        var i;
        var ke;
        var num;
        var den;

        for (it = 0; it < n; it++) {
            for (y = MIN_Y; y <= MAX_Y; y++) {
                for (x = MIN_X; x <= MAX_X; x++) {
                    i = y * WIDTH + x;
                    if (fixed[i] || perm[i] <= 0) continue;

                    num = 0;
                    den = 0;

                    if (x > MIN_X) {
                        ke = condR[i - 1];
                        num += ke * phi[i - 1];
                        den += ke;
                    }
                    if (x < MAX_X) {
                        ke = condR[i];
                        num += ke * phi[i + 1];
                        den += ke;
                    }
                    if (y > MIN_Y) {
                        ke = condD[i - WIDTH];
                        num += ke * phi[i - WIDTH];
                        den += ke;
                    }
                    if (y < MAX_Y) {
                        ke = condD[i];
                        num += ke * phi[i + WIDTH];
                        den += ke;
                    }

                    if (den <= 0) continue;
                    phi[i] += SOR_OMEGA * (num / den - phi[i]);
                }
            }
        }
    };

    StreamEngine.prototype.computeFlux = function () {
        var phi = this.phi;
        var perm = this.perm;
        var condR = this.condR;
        var condD = this.condD;
        var x;
        var y;
        var i;
        var fx;
        var fy;

        for (y = MIN_Y; y <= MAX_Y; y++) {
            for (x = MIN_X; x <= MAX_X; x++) {
                i = idx(x, y);
                if (perm[i] <= 0) {
                    this.flux[i] = 0;
                    continue;
                }

                fx = 0;
                fy = 0;

                if (x > MIN_X) fx += condR[i - 1] * (phi[i - 1] - phi[i]);
                if (x < MAX_X) fx += condR[i] * (phi[i] - phi[i + 1]);
                fx *= 0.5;

                if (y > MIN_Y) fy += condD[i - WIDTH] * (phi[i - WIDTH] - phi[i]);
                if (y < MAX_Y) fy += condD[i] * (phi[i] - phi[i + WIDTH]);
                fy *= 0.5;

                this.flux[i] = Math.sqrt(fx * fx + fy * fy);
            }
        }
    };

    StreamEngine.prototype.classifyCells = function () {
        var i;
        var rel;
        var ref = this.refFlux > 0 ? this.refFlux : this.medianChannelFlux();

        for (i = 0; i < this.flux.length; i++) {
            this.wetMask[i] = 0;
            this.speedLevel[i] = 0;
            if (this.perm[i] <= 0) continue;

            rel = ref > 0 ? this.flux[i] / ref : 0;

            if (this.channelMask[i]) {
                // channel cells hold water whenever their region receives
                // any (a pool stays flooded even if barely flowing)
                if (!this.wateredMask[i]) continue;
            } else if (!this.carveMask[i] || rel < WET_FLUX_REL) {
                // grass is wet only along a carved spillway that carries flow
                continue;
            }

            this.wetMask[i] = 1;
            if (rel < SPEED_REL_T1) {
                this.speedLevel[i] = 0;
            } else if (rel < SPEED_REL_T2) {
                this.speedLevel[i] = 1;
            } else if (rel < SPEED_REL_T3) {
                this.speedLevel[i] = 2;
            } else {
                this.speedLevel[i] = 3;
            }
        }

        this.pruneGrassSpecks();
    };

    StreamEngine.prototype.pruneGrassSpecks = function () {
        var visited = new Uint8Array(WIDTH * HEIGHT);
        var stack = [];
        var component = [];
        var i;
        var cur;
        var x;
        var y;
        var j;
        var n;

        var isWetGrass = (function (self) {
            return function (k) {
                return self.wetMask[k] === 1 && !self.channelMask[k];
            };
        })(this);

        for (i = 0; i < this.wetMask.length; i++) {
            if (visited[i] || !isWetGrass(i)) continue;

            stack.length = 0;
            component.length = 0;
            stack.push(i);
            visited[i] = 1;

            while (stack.length) {
                cur = stack.pop();
                component.push(cur);
                x = cur % WIDTH;
                y = (cur / WIDTH) | 0;
                if (x > MIN_X && !visited[cur - 1] && isWetGrass(cur - 1)) { visited[cur - 1] = 1; stack.push(cur - 1); }
                if (x < MAX_X && !visited[cur + 1] && isWetGrass(cur + 1)) { visited[cur + 1] = 1; stack.push(cur + 1); }
                if (y > MIN_Y && !visited[cur - WIDTH] && isWetGrass(cur - WIDTH)) { visited[cur - WIDTH] = 1; stack.push(cur - WIDTH); }
                if (y < MAX_Y && !visited[cur + WIDTH] && isWetGrass(cur + WIDTH)) { visited[cur + WIDTH] = 1; stack.push(cur + WIDTH); }
            }

            if (component.length < MIN_GRASS_STREAK) {
                for (j = 0, n = component.length; j < n; j++) {
                    this.wetMask[component[j]] = 0;
                    this.speedLevel[component[j]] = 0;
                }
            }
        }
    };

    StreamEngine.prototype.medianChannelFlux = function () {
        var vals = [];
        var i;

        for (i = 0; i < this.flux.length; i++) {
            if (!this.channelMask[i] || this.perm[i] <= 0) continue;
            if (this.flux[i] > 0) vals.push(this.flux[i]);
        }
        if (!vals.length) return 0;
        vals.sort(function (a, b) { return a - b; });
        return vals[Math.floor(vals.length / 2)];
    };

    StreamEngine.prototype.calibrateReference = function () {
        this.refFlux = this.medianChannelFlux();
        this.classifyCells();
    };

    StreamEngine.prototype.rebuildRockMask = function () {
        var i;
        for (i = 0; i < this.rockSolid.length; i++) {
            this.rockSolid[i] = 0;
        }

        var ri;
        var rock;
        var dx;
        var dy;
        var x;
        var y;
        var r;
        var r2;

        for (ri = 0; ri < this.rocks.length; ri++) {
            rock = this.rocks[ri];
            // lifted rocks (being dragged) are out of the simulation
            if (rock.lifted) continue;
            r = this.rockBlockCells(rock.radius);
            r2 = r * r;
            for (dy = -Math.ceil(r) - 1; dy <= Math.ceil(r) + 1; dy++) {
                for (dx = -Math.ceil(r) - 1; dx <= Math.ceil(r) + 1; dx++) {
                    if (dx * dx + dy * dy > r2) continue;
                    x = Math.round(rock.x + dx);
                    y = Math.round(rock.y + dy);
                    if (!inBounds(x, y)) continue;
                    this.rockSolid[idx(x, y)] = 1;
                }
            }
        }

        this.solveFlow(SOLVE_ITERS_FULL);
    };

    StreamEngine.prototype.refineFlow = function () {
        this.solveFlow(SOLVE_ITERS_FULL);
    };

    // A rock added as `lifted` is held above the water (no influence, no
    // solve) until dropRock puts it down.
    StreamEngine.prototype.addRock = function (x, y, radius, lifted) {
        if (this.rocks.length >= MAX_ROCKS) return null;
        var rock = {
            id: this.nextRockId++,
            x: clamp(x, MIN_X + 3, MAX_X - 3),
            y: clamp(y, MIN_Y + 3, MAX_Y - 3),
            radius: clamp(radius, 2.5, MAX_ROCK_RADIUS),
            lifted: !!lifted
        };
        this.rocks.push(rock);
        if (!rock.lifted) this.rebuildRockMask();
        return rock;
    };

    StreamEngine.prototype.findRockById = function (id) {
        var ri;
        for (ri = 0; ri < this.rocks.length; ri++) {
            if (this.rocks[ri].id === id) return this.rocks[ri];
        }
        return null;
    };

    StreamEngine.prototype.liftRock = function (id) {
        var rock = this.findRockById(id);
        if (!rock || rock.lifted) return rock;
        // Freeze: mark lifted for drawing only; do not re-solve until drop.
        rock.lifted = true;
        return rock;
    };

    StreamEngine.prototype.dropRock = function (id) {
        var rock = this.findRockById(id);
        if (!rock) return null;
        rock.lifted = false;
        this.rebuildRockMask();
        return rock;
    };

    StreamEngine.prototype.removeRockAt = function (wx, wy) {
        var rock = this.findRockAt(wx, wy);
        var ri;
        if (!rock) return false;
        for (ri = 0; ri < this.rocks.length; ri++) {
            if (this.rocks[ri].id === rock.id) {
                this.rocks.splice(ri, 1);
                this.rebuildRockMask();
                return true;
            }
        }
        return false;
    };

    // Updates position only; a lifted rock has no influence, so no re-solve.
    StreamEngine.prototype.setRockPosition = function (id, x, y) {
        var rock = this.findRockById(id);
        if (!rock) return false;
        rock.x = clamp(x, MIN_X + 3, MAX_X - 3);
        rock.y = clamp(y, MIN_Y + 3, MAX_Y - 3);
        return true;
    };

    StreamEngine.prototype.findRockAt = function (wx, wy) {
        // Closest rock whose disc contains the point — never the farther overlap.
        var ri;
        var rock;
        var d;
        var hitR;
        var best = null;
        var bestD = Infinity;
        for (ri = 0; ri < this.rocks.length; ri++) {
            rock = this.rocks[ri];
            hitR = this.rockHitCells(rock.radius);
            d = dist2d(wx, wy, rock.x, rock.y);
            if (d <= hitR && d < bestD) {
                bestD = d;
                best = rock;
            }
        }
        return best;
    };

    StreamEngine.prototype.resetRocks = function () {
        this.rocks = [];
        this.rebuildRockMask();
    };

    StreamEngine.prototype.totalReset = function () {
        this.setup();
    };

    StreamEngine.prototype.worldToGrid = function (wx, wy) {
        return {
            x: clamp(Math.round(wx), MIN_X, MAX_X),
            y: clamp(Math.round(wy), MIN_Y, MAX_Y)
        };
    };

    StreamEngine.prototype.canvasToWorld = function (cx, cy, scale) {
        var px = TILE_PX * scale;
        return {
            x: cx / px,
            y: MAX_Y - cy / px
        };
    };

    StreamEngine.MIN_X = MIN_X;
    StreamEngine.MAX_X = MAX_X;
    StreamEngine.MIN_Y = MIN_Y;
    StreamEngine.MAX_Y = MAX_Y;
    StreamEngine.WIDTH = WIDTH;
    StreamEngine.HEIGHT = HEIGHT;
    StreamEngine.TILE_PX = TILE_PX;
    StreamEngine.MAX_ROCKS = MAX_ROCKS;
    StreamEngine.MAX_ROCK_RADIUS = MAX_ROCK_RADIUS;
    StreamEngine.DIG_RADIUS = DIG_RADIUS;
    StreamEngine.ROCK_VISUAL_SCALE = ROCK_VISUAL_SCALE;
    StreamEngine.tileHash = tileHash;

    global.StreamEngine = StreamEngine;
})(typeof window !== 'undefined' ? window : global);
