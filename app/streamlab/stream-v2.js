(function () {
    'use strict';

    var TILE = StreamEngine.TILE_PX;
    var WIDTH = StreamEngine.WIDTH;
    var HEIGHT = StreamEngine.HEIGHT;
    var MAX_X = StreamEngine.MAX_X;
    var MAX_Y = StreamEngine.MAX_Y;
    var MIN_X = StreamEngine.MIN_X;
    var MIN_Y = StreamEngine.MIN_Y;

    // Stardew-inspired top-down palette (procedural tiles only).
    var PALETTE = {
        grassDeep: '#2d6b28',
        grassDark: '#3a7f32',
        grassMid: '#4a9a3e',
        grassLight: '#5cb84a',
        grassTuft: '#6fd45a',
        grassSoil: '#5a6b32',
        flower: '#f0d050',
        flowerPink: '#e878a0',
        bedDeep: '#6b4a28',
        bedDark: '#8a5e38',
        bedMid: '#a87848',
        bedLight: '#c49860',
        bedWet: '#7a6848',
        waterPool: '#0c2e58',
        waterDeep: '#154878',
        waterMid: '#2a78a8',
        waterLight: '#48a0c8',
        waterShine: '#90d8f0',
        waterFoam: '#d0f0ff',
        waterShadow: '#081c38',
        shoreLip: '#3d8a48',
        shoreDark: '#2a5c30',
        rockOutline: '#1a1a18',
        rockDark: '#3e3e38',
        rockMid: '#5c5c54',
        rockLight: '#8a8a7e',
        rockHighlight: '#b8b8a8',
        // Stardew shrubs — darker than grass, wider green spread across families
        treeOutline: '#081410',
        treeShade: '#0e2818',
        treeDark: '#163c24',
        treeMid: '#1e5230',
        treeLight: '#2a6a3c',
        treeShine: '#3a8448',
        treeShadeB: '#0a2018',
        treeDarkB: '#123628',
        treeMidB: '#1a4a38',
        treeLightB: '#246448',
        treeShineB: '#307c58',
        treeShadeC: '#101c10',
        treeDarkC: '#1a3018',
        treeMidC: '#264820',
        treeLightC: '#346028',
        treeShineC: '#447834',
        treeShadeD: '#0c1c20',
        treeDarkD: '#143028',
        treeMidD: '#1c4638',
        treeLightD: '#285e4a',
        treeShineD: '#347858',
        treeShadeE: '#14180c',
        treeDarkE: '#1e2c14',
        treeMidE: '#2a421c',
        treeLightE: '#385a26',
        treeShineE: '#487230',
        treeTwig: '#4a2818',
        treeTwigDark: '#32180e'
    };

    var model;
    var canvas;
    var ctx;
    var animating;
    var displayScale = 1;
    var waterFrameSlow = 0;
    var waterFrameFast = 0;
    var flowSpeed = 3;
    var ROCK_RADIUS_LARGE = StreamEngine.MAX_ROCK_RADIUS;
    var ROCK_RADIUS_SMALL = StreamEngine.MAX_ROCK_RADIUS * 0.5;
    var rockSizeKey = 'large';
    var rockRadius = ROCK_RADIUS_LARGE;
    var toolMode = 'rock';
    var dragState = null;
    var rockChipEls = [];
    var shifterEl;
    var lastDigSolve = 0;
    var tiles = {};
    var rockSpriteCache = {};
    var treeSpriteCache = {};
    var borderTrees = [];
    var MODE_ORDER = ['rock', 'remove', 'dig'];

    function rockCellRadius(sliderRadius) {
        return sliderRadius * StreamEngine.ROCK_VISUAL_SCALE;
    }

    function $(id) {
        return document.getElementById(id);
    }

    function idx(x, y) {
        return y * WIDTH + x;
    }

    function setPx(cctx, x, y, color) {
        cctx.fillStyle = color;
        cctx.fillRect(x, y, 1, 1);
    }

    function makeTileCanvas(drawFn) {
        var c = document.createElement('canvas');
        c.width = TILE;
        c.height = TILE;
        var cctx = c.getContext('2d');
        cctx.imageSmoothingEnabled = false;
        drawFn(cctx);
        return c;
    }

    function buildGrassTile(variant) {
        return makeTileCanvas(function (cctx) {
            var base = variant === 0 ? PALETTE.grassMid : (variant === 1 ? PALETTE.grassLight : PALETTE.grassDark);
            cctx.fillStyle = base;
            cctx.fillRect(0, 0, TILE, TILE);
            // stipple / tufts
            setPx(cctx, 1, 1, PALETTE.grassDark);
            setPx(cctx, 2, 3, PALETTE.grassTuft);
            setPx(cctx, 4, 2, PALETTE.grassDeep);
            setPx(cctx, 5, 5, PALETTE.grassTuft);
            setPx(cctx, 0, 5, PALETTE.grassSoil);
            setPx(cctx, 6, 0, PALETTE.grassDark);
            setPx(cctx, 3, 6, PALETTE.grassLight);
            setPx(cctx, 7, 4, PALETTE.grassDeep);
            if (variant === 1) {
                setPx(cctx, 5, 1, PALETTE.flower);
                setPx(cctx, 1, 6, PALETTE.flowerPink);
            }
            if (variant === 2) {
                setPx(cctx, 3, 3, PALETTE.grassSoil);
                setPx(cctx, 6, 6, PALETTE.grassTuft);
            }
        });
    }

    function buildShoreTile(variant) {
        return makeTileCanvas(function (cctx) {
            var base = variant === 0 ? PALETTE.shoreLip : (variant === 1 ? PALETTE.grassMid : PALETTE.shoreDark);
            cctx.fillStyle = base;
            cctx.fillRect(0, 0, TILE, TILE);
            setPx(cctx, 0, 0, PALETTE.grassDeep);
            setPx(cctx, 2, 1, PALETTE.grassTuft);
            setPx(cctx, 4, 0, PALETTE.shoreDark);
            setPx(cctx, 1, 3, PALETTE.grassMid);
            setPx(cctx, 5, 4, PALETTE.grassDeep);
            setPx(cctx, 3, 6, PALETTE.shoreLip);
            setPx(cctx, 6, 2, PALETTE.grassTuft);
            setPx(cctx, 7, 7, PALETTE.bedWet);
        });
    }

    function buildBedTile(variant) {
        return makeTileCanvas(function (cctx) {
            var base = variant === 0 ? PALETTE.bedMid : (variant === 1 ? PALETTE.bedLight : PALETTE.bedDark);
            cctx.fillStyle = base;
            cctx.fillRect(0, 0, TILE, TILE);
            setPx(cctx, 1, 2, PALETTE.bedDeep);
            setPx(cctx, 3, 0, PALETTE.bedDark);
            setPx(cctx, 4, 4, PALETTE.bedLight);
            setPx(cctx, 6, 1, PALETTE.bedDeep);
            setPx(cctx, 2, 6, PALETTE.bedDark);
            setPx(cctx, 7, 5, PALETTE.bedMid);
            setPx(cctx, 0, 5, PALETTE.bedWet);
            if (variant === 1) setPx(cctx, 5, 3, PALETTE.bedLight);
        });
    }

    function buildRockShadowTile() {
        return makeTileCanvas(function (cctx) {
            cctx.fillStyle = PALETTE.waterShadow;
            cctx.fillRect(0, 0, TILE, TILE);
            setPx(cctx, 2, 2, '#0a1428');
            setPx(cctx, 5, 4, '#102038');
            setPx(cctx, 1, 6, PALETTE.rockDark);
        });
    }

    // speed: 0 = slow .. 3 = fast; frame: 0..3 Stardew-style ripples (renderer only)
    function buildWaterTile(speed, frame, edge) {
        return makeTileCanvas(function (cctx) {
            var base = PALETTE.waterPool;
            if (speed === 1) base = PALETTE.waterDeep;
            if (speed === 2) base = PALETTE.waterMid;
            if (speed === 3) base = PALETTE.waterLight;
            cctx.fillStyle = base;
            cctx.fillRect(0, 0, TILE, TILE);

            // Horizontal ripple bands that travel with frame (downstream feel).
            var y1 = (1 + frame) % TILE;
            var y2 = (4 + frame) % TILE;
            var xShift = frame % TILE;
            var i;

            if (speed <= 1) {
                setPx(cctx, (2 + xShift) % TILE, y1, PALETTE.waterDeep);
                setPx(cctx, (5 + xShift) % TILE, y1, speed === 0 ? '#0a2848' : PALETTE.waterMid);
                setPx(cctx, (1 + xShift) % TILE, y2, PALETTE.waterDeep);
            } else {
                for (i = 0; i < 4; i++) {
                    setPx(cctx, (i * 2 + xShift) % TILE, y1, PALETTE.waterShine);
                }
                setPx(cctx, (3 + xShift) % TILE, y2, PALETTE.waterLight);
                setPx(cctx, (6 + xShift) % TILE, y2, PALETTE.waterShine);
            }

            if (speed >= 3) {
                setPx(cctx, (0 + xShift) % TILE, (y1 + 2) % TILE, PALETTE.waterFoam);
                setPx(cctx, (4 + xShift) % TILE, (y2 + 1) % TILE, PALETTE.waterFoam);
            } else if (speed === 2) {
                setPx(cctx, (2 + xShift) % TILE, (y1 + 3) % TILE, PALETTE.waterShine);
            }

            if (edge) {
                setPx(cctx, 0, 0, PALETTE.waterFoam);
                setPx(cctx, 1, 0, PALETTE.waterShine);
                setPx(cctx, 0, 1, PALETTE.waterLight);
                setPx(cctx, 7, 0, PALETTE.waterFoam);
                setPx(cctx, 0, 7, PALETTE.waterShine);
                setPx(cctx, 7, 7, PALETTE.waterFoam);
                setPx(cctx, (3 + frame) % TILE, 0, PALETTE.waterLight);
                setPx(cctx, 0, (4 + frame) % TILE, PALETTE.waterShine);
            }
        });
    }

    // Nearly round; tiny rim wobble per variant. Coarse tile-pixels, then NN scale.
    // Variants stay visual-only (seed from rock.id) — no engine collision change.
    var ROCK_VARIANT_COUNT = 5;

    function rockSilhouetteRadius(angle, r, seed, amp) {
        var a = amp == null ? 1 : amp;
        var bump =
            Math.sin(angle * 2.0 + seed) * 0.038 * a +
            Math.sin(angle * 3.0 - seed * 1.1) * 0.022 * a +
            Math.sin(angle * 5.0 + seed * 0.65) * 0.012 * a;
        return r * (0.965 + bump);
    }

    function buildRockSprite(cellRadius, variant) {
        // World footprint in tile-pixels (same space as 8×8 grass tiles).
        var targetR = Math.max(4, Math.round(cellRadius * TILE * 0.55));
        // Author on a coarser grid so rock texels match the chunky tile look
        // (1 rock art px ≈ 2 tile px), then nearest-neighbor upscale.
        var step = 2;
        var r = Math.max(3, Math.round(targetR / step));
        var lowSize = r * 2 + 2;
        var low = document.createElement('canvas');
        low.width = lowSize;
        low.height = lowSize;
        var lctx = low.getContext('2d');
        lctx.imageSmoothingEnabled = false;

        var cx = Math.floor(lowSize / 2);
        var cy = Math.floor(lowSize / 2);
        var v = ((variant % ROCK_VARIANT_COUNT) + ROCK_VARIANT_COUNT) % ROCK_VARIANT_COUNT;
        var seed = 1.7 + v * 2.41 + (Math.round(cellRadius * 10) % 7) * 0.13;
        var amp = 0.85 + (v % 3) * 0.08;
        var y;
        var x;
        var dx;
        var dy;
        var dist;
        var ang;
        var edge;
        var t;
        var color;
        var speckMod = 8 + (v % 3);

        for (y = 0; y < lowSize; y++) {
            for (x = 0; x < lowSize; x++) {
                dx = x - cx;
                dy = y - cy;
                dist = Math.sqrt(dx * dx + dy * dy);
                ang = Math.atan2(dy, dx);
                edge = rockSilhouetteRadius(ang, r, seed, amp);
                if (dist > edge) continue;

                t = dist / Math.max(1, edge);
                // Organic light blot (soft blob + wobble), not a hard quarter wedge.
                // Silhouette unchanged; only fill banding varies.
                if (dist >= edge - 1) {
                    color = PALETTE.rockOutline;
                } else {
                    var nx = dx / Math.max(1, r);
                    var ny = dy / Math.max(1, r);
                    var hx = -0.28 - (v % 3) * 0.04;
                    var hy = -0.34 - ((v + 1) % 3) * 0.03;
                    var lx = nx - hx;
                    var ly = ny - hy;
                    var lightBlob = Math.sqrt(lx * lx * 1.2 + ly * ly * 0.85);
                    var lightEdge =
                        0.46 +
                        Math.sin(nx * 5.2 + seed) * 0.07 +
                        Math.sin(ny * 4.1 - seed * 1.2) * 0.055 +
                        Math.sin((nx + ny) * 3.3 + seed * 0.8) * 0.04;
                    var sx = nx - 0.32;
                    var sy = ny - 0.38;
                    var shadeBlob = Math.sqrt(sx * sx * 0.9 + sy * sy * 1.15);
                    var shadeEdge =
                        0.52 +
                        Math.sin(nx * 3.7 - seed) * 0.06 +
                        Math.sin(ny * 4.6 + seed * 0.9) * 0.05;

                    if (lightBlob < lightEdge && t < 0.78) {
                        color = PALETTE.rockLight;
                    } else if (shadeBlob < shadeEdge || t > 0.8) {
                        color = PALETTE.rockDark;
                    } else {
                        color = PALETTE.rockMid;
                    }
                    if (t < 0.5 && ((x + y * 3 + (seed | 0) + v) % speckMod) === 0) {
                        color = PALETTE.rockDark;
                    }
                }
                setPx(lctx, x, y, color);
            }
        }

        var size = lowSize * step;
        var c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        var cctx = c.getContext('2d');
        cctx.imageSmoothingEnabled = false;
        cctx.drawImage(low, 0, 0, size, size);

        return {
            canvas: c,
            size: size,
            anchorX: Math.floor(size / 2),
            anchorY: Math.floor(size / 2),
            cellRadius: cellRadius
        };
    }

    function rockVariantIndex(idOrVariant) {
        var n = idOrVariant == null ? 0 : (idOrVariant | 0);
        return ((n % ROCK_VARIANT_COUNT) + ROCK_VARIANT_COUNT) % ROCK_VARIANT_COUNT;
    }

    function getRockSprite(sliderRadius, variant) {
        var cells = rockCellRadius(sliderRadius);
        var v = rockVariantIndex(variant);
        var key = 'tilepx4:' + Math.round(cells * 4) + ':v' + v;
        if (!rockSpriteCache[key]) {
            rockSpriteCache[key] = buildRockSprite(cells, v);
        }
        return rockSpriteCache[key];
    }

    // Visual-only side shrubs — Stardew clumpy leaf style (ref attachment).
    function treeGreenFamily(tint) {
        var families = [
            {
                outline: PALETTE.treeOutline,
                shade: PALETTE.treeShade,
                dark: PALETTE.treeDark,
                mid: PALETTE.treeMid,
                light: PALETTE.treeLight,
                shine: PALETTE.treeShine
            },
            {
                outline: PALETTE.treeOutline,
                shade: PALETTE.treeShadeB,
                dark: PALETTE.treeDarkB,
                mid: PALETTE.treeMidB,
                light: PALETTE.treeLightB,
                shine: PALETTE.treeShineB
            },
            {
                outline: PALETTE.treeOutline,
                shade: PALETTE.treeShadeC,
                dark: PALETTE.treeDarkC,
                mid: PALETTE.treeMidC,
                light: PALETTE.treeLightC,
                shine: PALETTE.treeShineC
            },
            {
                outline: PALETTE.treeOutline,
                shade: PALETTE.treeShadeD,
                dark: PALETTE.treeDarkD,
                mid: PALETTE.treeMidD,
                light: PALETTE.treeLightD,
                shine: PALETTE.treeShineD
            },
            {
                outline: PALETTE.treeOutline,
                shade: PALETTE.treeShadeE,
                dark: PALETTE.treeDarkE,
                mid: PALETTE.treeMidE,
                light: PALETTE.treeLightE,
                shine: PALETTE.treeShineE
            }
        ];
        return families[((tint % families.length) + families.length) % families.length];
    }

    function buildTreeSprite(seed) {
        var rockSize = getRockSprite(ROCK_RADIUS_LARGE, 0).size;
        var maxSize = Math.max(20, Math.floor(rockSize * 1.75 * 0.7));
        var sizeScale = 0.82 + ((seed >>> 3) % 19) / 100;
        if (sizeScale > 1) sizeScale = 1;
        var size = Math.max(24, Math.floor(maxSize * sizeScale));
        if (size % 2 === 0) size += 1;
        if (size > maxSize) size = maxSize - (maxSize % 2 === 0 ? 1 : 0);

        // Author chunky (Stardew texel size), then NN upscale
        var step = 2;
        var lowSize = Math.max(14, Math.floor(size / step));
        if (lowSize % 2 === 0) lowSize += 1;
        var low = document.createElement('canvas');
        low.width = lowSize;
        low.height = lowSize;
        var lctx = low.getContext('2d');
        lctx.imageSmoothingEnabled = false;

        var tint = (seed >>> 1) % 5;
        var g = treeGreenFamily(tint);
        var cx = (lowSize / 2) | 0;
        var cy = (lowSize / 2) | 0;
        var bodyR = (lowSize / 2) - 1.2;
        var phase = (seed % 97) * 0.067;
        var clusters = [];
        var nClump = 6 + (seed % 3);
        var i;
        var ang;
        var rad;
        var cr;
        var h;

        // Center clump + ring of leaf mounds (union = bushy silhouette)
        clusters.push({
            x: cx + (((seed >>> 4) % 5) - 2) * 0.35,
            y: cy + (((seed >>> 7) % 5) - 2) * 0.35,
            r: bodyR * (0.52 + ((seed >>> 2) % 5) * 0.02)
        });
        for (i = 0; i < nClump; i++) {
            h = treeHash(seed, i * 17 + 3);
            ang = (i / nClump) * Math.PI * 2 + phase + ((h % 9) - 4) * 0.08;
            rad = bodyR * (0.28 + (h % 7) * 0.035);
            cr = bodyR * (0.34 + (h % 6) * 0.03);
            clusters.push({
                x: cx + Math.cos(ang) * rad,
                y: cy + Math.sin(ang) * rad * 0.92,
                r: cr
            });
        }

        var mask = new Uint8Array(lowSize * lowSize);
        var owner = new Int16Array(lowSize * lowSize);
        var x;
        var y;
        var dx;
        var dy;
        var dist;
        var edge;
        var best;
        var bestD;
        var ci;
        var localT;
        var light;
        var color;
        var nx;
        var ny;
        var idx;
        var emptyN;
        var seam;

        function clumpEdge(cl, px, py) {
            dx = px - cl.x;
            dy = py - cl.y;
            dist = Math.sqrt(dx * dx + dy * dy);
            ang = Math.atan2(dy, dx);
            edge = cl.r * (
                0.92 +
                Math.sin(ang * 3 + phase + cl.x) * 0.07 +
                Math.sin(ang * 5 - phase) * 0.045
            );
            return dist <= edge ? dist / Math.max(0.001, edge) : -1;
        }

        for (y = 0; y < lowSize; y++) {
            for (x = 0; x < lowSize; x++) {
                best = -1;
                bestD = 2;
                for (ci = 0; ci < clusters.length; ci++) {
                    localT = clumpEdge(clusters[ci], x + 0.5, y + 0.5);
                    if (localT < 0) continue;
                    if (localT < bestD) {
                        bestD = localT;
                        best = ci;
                    }
                }
                if (best < 0) continue;
                idx = y * lowSize + x;
                mask[idx] = 1;
                owner[idx] = best;
            }
        }

        for (y = 0; y < lowSize; y++) {
            for (x = 0; x < lowSize; x++) {
                idx = y * lowSize + x;
                if (!mask[idx]) continue;
                ci = owner[idx];
                localT = clumpEdge(clusters[ci], x + 0.5, y + 0.5);
                if (localT < 0) localT = 1;

                // Outline: outer silhouette or seam between clumps
                emptyN = false;
                seam = false;
                if (x === 0 || y === 0 || x === lowSize - 1 || y === lowSize - 1) emptyN = true;
                if (x > 0 && !mask[idx - 1]) emptyN = true;
                if (x < lowSize - 1 && !mask[idx + 1]) emptyN = true;
                if (y > 0 && !mask[idx - lowSize]) emptyN = true;
                if (y < lowSize - 1 && !mask[idx + lowSize]) emptyN = true;
                if (x > 0 && mask[idx - 1] && owner[idx - 1] !== ci) seam = true;
                if (y > 0 && mask[idx - lowSize] && owner[idx - lowSize] !== ci) seam = true;

                if (emptyN || (seam && localT > 0.55)) {
                    setPx(lctx, x, y, g.outline);
                    continue;
                }

                // Light from top-left on each clump
                nx = (x + 0.5 - clusters[ci].x) / Math.max(1, clusters[ci].r);
                ny = (y + 0.5 - clusters[ci].y) / Math.max(1, clusters[ci].r);
                light = (-nx * 0.55 - ny * 0.65) + (1 - localT) * 0.35;

                if (light > 0.55) color = g.shine;
                else if (light > 0.2) color = g.light;
                else if (light > -0.15) color = g.mid;
                else if (light > -0.45) color = g.dark;
                else color = g.shade;

                // Leaf speckles (lighter flecks on lit side)
                if (light > 0.1 && ((x * 3 + y * 5 + (seed & 15)) % 11) === 0) {
                    color = g.shine;
                }
                // Sparse brown twigs (Stardew accent — not a center trunk)
                if (localT > 0.25 && localT < 0.7 && ((x * 7 + y * 11 + seed) % 29) === 0) {
                    color = ((x + y) & 1) ? PALETTE.treeTwig : PALETTE.treeTwigDark;
                }

                setPx(lctx, x, y, color);
            }
        }

        var c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        var cctx = c.getContext('2d');
        cctx.imageSmoothingEnabled = false;
        cctx.drawImage(low, 0, 0, size, size);

        return {
            canvas: c,
            size: size,
            anchorX: Math.floor(size / 2),
            anchorY: Math.floor(size / 2)
        };
    }

    function getTreeSprite(seed) {
        var keySeed = seed & 255;
        var key = 'shrub:v9:' + keySeed;
        if (!treeSpriteCache[key]) {
            treeSpriteCache[key] = buildTreeSprite(seed);
        }
        return treeSpriteCache[key];
    }

    function treeHash(a, b) {
        return ((a * 374761 + b * 668265263 + a * b * 127) >>> 0);
    }

    function buildBorderTrees() {
        borderTrees = [];
        var y;
        var h;
        var outCells;
        var jx;
        var jy;
        var tx;
        var ty;
        var side;
        var layer;
        var rockSize = getRockSprite(ROCK_RADIUS_LARGE, 0).size;
        var shrubRadiusCells = (rockSize * 1.75 * 0.7 * 0.9) / TILE * 0.5;
        // ~40% in view ⇒ core just outside; clamp so altijd een deel zichtbaar blijft
        var baseOut = shrubRadiusCells * 0.2;
        var outMin = shrubRadiusCells * 0.12;
        var outMax = shrubRadiusCells * 0.28;
        // Tight spacing so canopies overlap into a solid edge (screenshot had big gaps)
        var stepBase = shrubRadiusCells * 0.55;

        function addShrub(sideId, baseY, layerId) {
            h = treeHash(sideId * 97 + layerId * 41, Math.round(baseY * 10));
            outCells = baseOut + (((h >>> 2) % 9) - 4) * 0.03 * shrubRadiusCells;
            if (outCells < outMin) outCells = outMin;
            if (outCells > outMax) outCells = outMax;
            // Extra depth for second layer — still keep part visible
            if (layerId === 1) outCells *= 0.55;
            jx = (((h >>> 5) % 7) - 3) * 0.12;
            if (jx < -0.3) jx = -0.3;
            if (jx > 0.3) jx = 0.3;
            // Mild vertical jitter — organic, but not enough to open holes in the wall
            jy = (((h >>> 8) % 11) - 5) * 0.28;
            ty = baseY + jy;
            if (ty < MIN_Y - shrubRadiusCells * 0.45) ty = MIN_Y - shrubRadiusCells * 0.45;
            if (ty > MAX_Y + shrubRadiusCells * 0.45) ty = MAX_Y + shrubRadiusCells * 0.45;
            tx = sideId === 0
                ? (MIN_X - outCells + jx)
                : (MAX_X + outCells - jx);
            borderTrees.push({
                x: tx,
                y: ty,
                seed: h,
                z: treeHash(h, Math.round(ty * 13) + sideId + layerId * 7)
            });
        }

        // Two staggered layers per side for a covering green wall
        for (side = 0; side <= 1; side++) {
            for (layer = 0; layer < 2; layer++) {
                y = MIN_Y + layer * (stepBase * 0.5) + (treeHash(side, layer + 3) % 60) / 100;
                while (y <= MAX_Y + 0.5) {
                    addShrub(side, y, layer);
                    y += stepBase * (0.85 + (treeHash(Math.round(y * 8), side + layer * 3) % 100) / 280);
                }
            }
        }
        borderTrees.sort(function (a, b) {
            return a.z - b.z;
        });
    }

    function drawTreeAt(tree) {
        var sprite = getTreeSprite(tree.seed);
        var cellPx = TILE * displayScale;
        var sx = (tree.x - MIN_X) * cellPx - sprite.anchorX * displayScale;
        var sy = (MAX_Y - tree.y) * cellPx - sprite.anchorY * displayScale;
        var drawSize = sprite.size * displayScale;
        ctx.drawImage(sprite.canvas, sx, sy, drawSize, drawSize);
    }

    function radiusForSizeKey(key) {
        return key === 'small' ? ROCK_RADIUS_SMALL : ROCK_RADIUS_LARGE;
    }

    function setRockSize(key) {
        if (key !== 'small' && key !== 'large') key = 'large';
        rockSizeKey = key;
        rockRadius = radiusForSizeKey(key);
        var i;
        for (i = 0; i < rockChipEls.length; i++) {
            var selected = rockChipEls[i].getAttribute('data-rock-size') === key;
            rockChipEls[i].classList.toggle('is-selected', selected);
            rockChipEls[i].setAttribute('aria-pressed', selected ? 'true' : 'false');
        }
        paintRockChips();
    }

    function buildTileCache() {
        var v;
        var s;
        var f;
        tiles.grass = [];
        tiles.shore = [];
        tiles.bed = [];
        tiles.water = [[], [], [], []];
        tiles.waterEdge = [[], [], [], []];
        tiles.rockShadow = buildRockShadowTile();

        for (v = 0; v < 3; v++) {
            tiles.grass[v] = buildGrassTile(v);
            tiles.shore[v] = buildShoreTile(v);
            tiles.bed[v] = buildBedTile(v);
        }

        for (s = 0; s < 4; s++) {
            for (f = 0; f < 4; f++) {
                tiles.water[s][f] = buildWaterTile(s, f, false);
                tiles.waterEdge[s][f] = buildWaterTile(s, f, true);
            }
        }
    }

    function hasRockNeighbor(x, y) {
        var dx;
        var dy;
        var nx;
        var ny;
        if (model.rockSolid[idx(x, y)]) return true;
        for (dy = -1; dy <= 1; dy++) {
            for (dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                nx = x + dx;
                ny = y + dy;
                if (nx < MIN_X || nx > MAX_X || ny < MIN_Y || ny > MAX_Y) continue;
                if (model.rockSolid[idx(nx, ny)]) return true;
            }
        }
        return false;
    }

    // Grass/water edge: neighbor is wet or channel (cosmetic only).
    function hasWetOrChannelNeighbor(x, y) {
        var n;
        if (x > MIN_X) {
            n = idx(x - 1, y);
            if (model.isWet(n) || model.channelMask[n]) return true;
        }
        if (x < MAX_X) {
            n = idx(x + 1, y);
            if (model.isWet(n) || model.channelMask[n]) return true;
        }
        if (y > MIN_Y) {
            n = idx(x, y - 1);
            if (model.isWet(n) || model.channelMask[n]) return true;
        }
        if (y < MAX_Y) {
            n = idx(x, y + 1);
            if (model.isWet(n) || model.channelMask[n]) return true;
        }
        return false;
    }

    function hasGrassNeighbor(x, y) {
        var n;
        if (x > MIN_X) {
            n = idx(x - 1, y);
            if (!model.isWet(n) && !model.channelMask[n] && !model.rockSolid[n]) return true;
        }
        if (x < MAX_X) {
            n = idx(x + 1, y);
            if (!model.isWet(n) && !model.channelMask[n] && !model.rockSolid[n]) return true;
        }
        if (y > MIN_Y) {
            n = idx(x, y - 1);
            if (!model.isWet(n) && !model.channelMask[n] && !model.rockSolid[n]) return true;
        }
        if (y < MAX_Y) {
            n = idx(x, y + 1);
            if (!model.isWet(n) && !model.channelMask[n] && !model.rockSolid[n]) return true;
        }
        return false;
    }

    function resizeCanvas() {
        var wrap = canvas.parentElement;
        var size = Math.min(wrap.clientWidth, wrap.clientHeight, 660);
        var worldSize = WIDTH * TILE;
        displayScale = Math.max(1, Math.floor(size / worldSize));
        canvas.width = worldSize * displayScale;
        canvas.height = worldSize * displayScale;
    }

    function pointerToWorld(clientX, clientY) {
        var rect = canvas.getBoundingClientRect();
        var cx = (clientX - rect.left) * (canvas.width / rect.width);
        var cy = (clientY - rect.top) * (canvas.height / rect.height);
        return model.canvasToWorld(cx, cy, displayScale);
    }

    function updateStats() {
        var rocks = $('stat-rocks');
        if (rocks) rocks.textContent = model.rocks.length + ' / ' + StreamEngine.MAX_ROCKS;
    }

    function flashMessage(text) {
        var el = $('play-toast');
        if (!el) return;
        el.textContent = text;
        el.classList.add('is-visible');
        clearTimeout(flashMessage._t);
        flashMessage._t = setTimeout(function () {
            el.classList.remove('is-visible');
        }, 1600);
    }

    function blitTile(tileCanvas, sx, sy) {
        var px = TILE * displayScale;
        ctx.drawImage(tileCanvas, sx, sy, px, px);
    }

    function drawRockAt(worldX, worldY, radius, alpha, variant) {
        var sprite = getRockSprite(radius, variant);
        var cellPx = TILE * displayScale;
        var sx = (worldX - MIN_X) * cellPx + cellPx * 0.5 - sprite.anchorX * displayScale;
        var sy = (MAX_Y - worldY) * cellPx + cellPx * 0.5 - sprite.anchorY * displayScale;
        var drawSize = sprite.size * displayScale;

        ctx.save();
        if (alpha != null) ctx.globalAlpha = alpha;
        ctx.drawImage(sprite.canvas, sx, sy, drawSize, drawSize);
        ctx.restore();
    }

    function draw() {
        var x;
        var y;
        var i;
        var sx;
        var sy;
        var variant;
        var rock;
        var ri;
        var ghost;
        var speed;
        var frame;
        var rockAdj;
        var px = TILE * displayScale;
        // Stack: grass/shore → dry bed (not rock-adj) → water(+edge) → under-rock → rocks → dig UI

        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = PALETTE.grassDeep;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Pass 1: grass / shore / bed (no water yet — keeps shore lip under foam)
        for (y = MIN_Y; y <= MAX_Y; y++) {
            for (x = MIN_X; x <= MAX_X; x++) {
                i = idx(x, y);
                sx = (x - MIN_X) * px;
                sy = (MAX_Y - y) * px;
                variant = model.getTileVariant(x, y);
                rockAdj = hasRockNeighbor(x, y);

                if (model.rockSolid[i]) {
                    // No brown bed under rocks. Shadow only in channel/wet;
                    // on land keep grass so no dark halo on field.
                    if (model.channelMask[i] || model.isWet(i)) {
                        blitTile(tiles.rockShadow, sx, sy);
                    } else if (hasWetOrChannelNeighbor(x, y)) {
                        blitTile(tiles.shore[variant], sx, sy);
                    } else {
                        blitTile(tiles.grass[variant], sx, sy);
                    }
                    continue;
                }

                if (model.isWet(i)) {
                    // Water drawn in pass 2
                    continue;
                }

                if (model.channelMask[i]) {
                    // Dry channel: bed only if not rock-adjacent
                    if (rockAdj) {
                        blitTile(tiles.rockShadow, sx, sy);
                    } else {
                        blitTile(tiles.bed[variant], sx, sy);
                    }
                    continue;
                }

                // Grass / shore lip next to water or channel
                if (hasWetOrChannelNeighbor(x, y)) {
                    blitTile(tiles.shore[variant], sx, sy);
                } else {
                    blitTile(tiles.grass[variant], sx, sy);
                }
            }
        }

        // Pass 2: water + foam edge
        for (y = MIN_Y; y <= MAX_Y; y++) {
            for (x = MIN_X; x <= MAX_X; x++) {
                i = idx(x, y);
                if (!model.isWet(i) || model.rockSolid[i]) continue;
                sx = (x - MIN_X) * px;
                sy = (MAX_Y - y) * px;
                speed = model.getSpeedLevel(i);
                frame = speed >= 2 ? waterFrameFast : waterFrameSlow;
                frame = (frame + ((x + y) & 1)) % 4;
                if (hasGrassNeighbor(x, y)) {
                    blitTile(tiles.waterEdge[speed][frame], sx, sy);
                } else {
                    blitTile(tiles.water[speed][frame], sx, sy);
                }
            }
        }

        // Pass 3: rocks (+ lift alpha). Variant from rock.id — cache hit, cheap.
        for (ri = 0; ri < model.rocks.length; ri++) {
            rock = model.rocks[ri];
            drawRockAt(rock.x, rock.y, rock.radius, rock.lifted ? 0.75 : null, rock.id);
        }

        ghost = dragState && dragState.ghost ? dragState.ghost : null;
        if (ghost) {
            drawRockAt(ghost.x, ghost.y, ghost.radius, 0.75, model.nextRockId);
        }

        // Pass 4: border trees (visual frame only — after rocks, under dig cursor)
        for (ri = 0; ri < borderTrees.length; ri++) {
            drawTreeAt(borderTrees[ri]);
        }

        if (toolMode === 'dig' && dragState && dragState.mode === 'dig' && dragState.cursor) {
            drawDigCursor(dragState.cursor.x, dragState.cursor.y);
        }
    }

    function drawDigCursor(worldX, worldY) {
        var cellPx = TILE * displayScale;
        var r = model.digBrushCells() * cellPx;
        var sx = (worldX - MIN_X) * cellPx + cellPx * 0.5;
        var sy = (MAX_Y - worldY) * cellPx + cellPx * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#c8a060';
        ctx.fillStyle = 'rgba(168, 128, 80, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function modeIndex(mode) {
        var i = MODE_ORDER.indexOf(mode);
        return i < 0 ? 0 : i;
    }

    function paintOneRockChip(chipEl, sizeKey) {
        var canvasEl = chipEl.querySelector('canvas');
        if (!canvasEl) return;
        var cctx = canvasEl.getContext('2d');
        var size = canvasEl.width;
        var x;
        var y;
        var radius = radiusForSizeKey(sizeKey);
        cctx.imageSmoothingEnabled = false;
        cctx.clearRect(0, 0, size, size);
        for (y = 0; y < size; y++) {
            for (x = 0; x < size; x++) {
                cctx.fillStyle = ((x + y * 3) % 7 === 0) ? PALETTE.grassDark : PALETTE.grassMid;
                if ((x * 5 + y) % 11 === 0) cctx.fillStyle = PALETTE.grassTuft;
                cctx.fillRect(x, y, 1, 1);
            }
        }
        try {
            var sprite = getRockSprite(radius);
            // Same button size; small rock drawn smaller inside the chip.
            var fit = sizeKey === 'small' ? 0.55 : 0.92;
            var maxSide = Math.floor((size - 4) * fit);
            var scale = maxSide / sprite.size;
            var drawW = Math.max(10, Math.round(sprite.size * scale));
            var drawH = drawW;
            var dx = Math.floor((size - drawW) / 2);
            var dy = Math.floor((size - drawH) / 2);
            cctx.drawImage(sprite.canvas, dx, dy, drawW, drawH);
        } catch (err) {
            // keep grass fill if sprite build fails
        }
    }

    function paintRockChips() {
        var i;
        for (i = 0; i < rockChipEls.length; i++) {
            paintOneRockChip(rockChipEls[i], rockChipEls[i].getAttribute('data-rock-size'));
        }
    }

    function setToolMode(mode) {
        if (MODE_ORDER.indexOf(mode) < 0) mode = 'rock';
        toolMode = mode;
        var pos = modeIndex(mode);
        var labels = document.querySelectorAll('.play-dial-label[data-mode]');
        var li;
        for (li = 0; li < labels.length; li++) {
            var active = labels[li].getAttribute('data-mode') === mode;
            labels[li].classList.toggle('is-active', active);
            labels[li].setAttribute('aria-checked', active ? 'true' : 'false');
        }
        if (shifterEl) {
            shifterEl.setAttribute('data-mode', mode);
            shifterEl.setAttribute('data-pos', String(pos));
        }
        // Previews stay visible; only drag is limited to Place mode.
        var ci;
        for (ci = 0; ci < rockChipEls.length; ci++) {
            rockChipEls[ci].hidden = false;
            rockChipEls[ci].classList.toggle('is-disabled', mode !== 'rock');
            rockChipEls[ci].setAttribute('aria-disabled', mode !== 'rock' ? 'true' : 'false');
        }
        paintRockChips();
        canvas.classList.toggle('is-dig', mode === 'dig');
        canvas.classList.toggle('is-remove', mode === 'remove');
    }

    function cycleToolMode() {
        var i = modeIndex(toolMode);
        setToolMode(MODE_ORDER[(i + 1) % MODE_ORDER.length]);
    }

    function bindShifter() {
        shifterEl = $('play-shifter');
        if (!shifterEl) return;

        // Labels pick a stand; dial face itself just advances 1 → 2 → 3 → 1.
        shifterEl.addEventListener('click', function (e) {
            if (e.target.closest('#play-dial-face')) return;
            var hit = e.target.closest('.play-dial-label[data-mode]');
            if (!hit || !shifterEl.contains(hit)) return;
            setToolMode(hit.getAttribute('data-mode'));
        });

        var face = $('play-dial-face');
        if (!face) return;
        face.addEventListener('click', function (e) {
            e.preventDefault();
            cycleToolMode();
        });
    }

    function frameLoop(now) {
        var basePeriod = 720 - flowSpeed * 55;
        waterFrameSlow = Math.floor(now / basePeriod) % 4;
        waterFrameFast = Math.floor(now / (basePeriod * 0.42)) % 4;

        draw();

        if (animating) requestAnimationFrame(frameLoop);
    }

    function startLoop() {
        if (animating) return;
        animating = true;
        requestAnimationFrame(frameLoop);
    }

    function tryPlaceRock(x, y, lifted) {
        if (model.rocks.length >= StreamEngine.MAX_ROCKS) {
            flashMessage('Maximum ' + StreamEngine.MAX_ROCKS + ' rocks');
            var stat = $('stat-rocks');
            if (stat) {
                stat.classList.add('is-shake');
                setTimeout(function () { stat.classList.remove('is-shake'); }, 400);
            }
            return null;
        }
        var rock = model.addRock(x, y, rockRadius, lifted);
        if (rock) {
            updateStats();
        }
        return rock;
    }

    function onPointerDown(e) {
        var chipHit = e.target.closest && e.target.closest('.play-rock-chip');
        if (chipHit) return;

        if (e.button === 2) {
            e.preventDefault();
            var worldR = pointerToWorld(e.clientX, e.clientY);
            if (model.removeRockAt(worldR.x, worldR.y)) {
                updateStats();
                draw();
            }
            return;
        }

        if (e.button !== 0) return;

        canvas.setPointerCapture(e.pointerId);
        var world = pointerToWorld(e.clientX, e.clientY);

        if (toolMode === 'remove') {
            if (model.removeRockAt(world.x, world.y)) {
                updateStats();
                draw();
            }
            dragState = { mode: 'remove', pointerId: e.pointerId };
            return;
        }

        if (toolMode === 'dig') {
            canvas.classList.add('is-grabbing');
            dragState = {
                mode: 'dig',
                pointerId: e.pointerId,
                cursor: { x: world.x, y: world.y },
                dirty: false
            };
            lastDigSolve = 0;
            if (model.stampDig(world.x, world.y)) {
                dragState.dirty = true;
                model.digSolve(true);
                lastDigSolve = performance.now();
            }
            draw();
            return;
        }

        // Rock tool
        var hit = model.findRockAt(world.x, world.y);
        if (hit) {
            canvas.classList.add('is-grabbing');
            model.liftRock(hit.id);
            dragState = {
                mode: 'move',
                rock: hit,
                offsetX: world.x - hit.x,
                offsetY: world.y - hit.y,
                pointerId: e.pointerId
            };
            return;
        }

        var placed = tryPlaceRock(world.x, world.y, true);
        if (placed) {
            canvas.classList.add('is-grabbing');
            dragState = {
                mode: 'move',
                rock: placed,
                offsetX: 0,
                offsetY: 0,
                pointerId: e.pointerId
            };
        }
    }

    function onPointerMove(e) {
        if (!dragState || dragState.pointerId !== e.pointerId) return;
        if (dragState.mode === 'chip') return;

        var world = pointerToWorld(e.clientX, e.clientY);

        if (dragState.mode === 'remove') {
            if (model.removeRockAt(world.x, world.y)) {
                updateStats();
                draw();
            }
            return;
        }

        if (dragState.mode === 'dig') {
            dragState.cursor.x = world.x;
            dragState.cursor.y = world.y;
            if (model.stampDig(world.x, world.y)) {
                dragState.dirty = true;
            }
            var now = performance.now();
            if (dragState.dirty && now - lastDigSolve > 55) {
                model.digSolve(true);
                lastDigSolve = now;
                dragState.dirty = false;
                dragState.needsFinal = true;
            }
            draw();
            return;
        }

        if (dragState.mode === 'move' && dragState.rock) {
            model.setRockPosition(
                dragState.rock.id,
                world.x - dragState.offsetX,
                world.y - dragState.offsetY
            );
        }
    }

    function onPointerUp(e) {
        if (!dragState || dragState.pointerId !== e.pointerId) return;
        if (dragState.mode === 'chip') return;
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        canvas.classList.remove('is-grabbing');
        if (dragState.mode === 'move' && dragState.rock) {
            model.dropRock(dragState.rock.id);
        }
        if (dragState.mode === 'dig' && (dragState.dirty || dragState.needsFinal)) {
            model.refineFlow();
        }
        dragState = null;
    }

    function onChipPointerDown(e) {
        var chip = e.currentTarget;
        var sizeKey = chip.getAttribute('data-rock-size') || 'large';
        setRockSize(sizeKey);
        if (toolMode !== 'rock') {
            flashMessage('Shift to Place rocks');
            return;
        }
        if (model.rocks.length >= StreamEngine.MAX_ROCKS) {
            flashMessage('Maximum ' + StreamEngine.MAX_ROCKS + ' rocks');
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        dragState = {
            mode: 'chip',
            pointerId: e.pointerId,
            ghost: { x: 0, y: 0, radius: rockRadius }
        };
        window.addEventListener('pointermove', onChipPointerMove);
        window.addEventListener('pointerup', onChipPointerUp);
        window.addEventListener('pointercancel', onChipPointerUp);
        onChipPointerMove(e);
    }

    function onChipPointerMove(e) {
        if (!dragState || dragState.mode !== 'chip') return;
        var world = pointerToWorld(e.clientX, e.clientY);
        dragState.ghost.x = world.x;
        dragState.ghost.y = world.y;
        dragState.ghost.radius = rockRadius;
        draw();
    }

    function onChipPointerUp(e) {
        if (!dragState || dragState.mode !== 'chip') return;
        window.removeEventListener('pointermove', onChipPointerMove);
        window.removeEventListener('pointerup', onChipPointerUp);
        window.removeEventListener('pointercancel', onChipPointerUp);
        if (dragState.ghost) {
            tryPlaceRock(dragState.ghost.x, dragState.ghost.y);
        }
        dragState = null;
        draw();
    }

    function bindControls() {
        $('btn-reset-rocks').addEventListener('click', function () {
            model.resetRocks();
            updateStats();
            draw();
        });

        $('btn-reset-digs').addEventListener('click', function () {
            model.clearDigs();
            draw();
        });

        $('btn-reset-all').addEventListener('click', function () {
            model.totalReset();
            updateStats();
            draw();
        });

        bindShifter();

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

        rockChipEls = Array.prototype.slice.call(document.querySelectorAll('.play-rock-chip[data-rock-size]'));
        var chi;
        for (chi = 0; chi < rockChipEls.length; chi++) {
            rockChipEls[chi].addEventListener('pointerdown', onChipPointerDown);
        }
        setRockSize('large');

        setToolMode('rock');

        window.addEventListener('resize', function () {
            resizeCanvas();
            draw();
        });

        setTimeout(function () {
            var tip = $('play-tip');
            if (tip) tip.classList.add('is-faded');
        }, 8000);
    }

    function init() {
        canvas = $('play-canvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');
        buildTileCache();
        buildBorderTrees();
        model = new StreamEngine();

        resizeCanvas();
        model.setup();
        bindControls();
        updateStats();
        draw();
        startLoop();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
