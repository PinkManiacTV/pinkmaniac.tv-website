(function () {
    'use strict';

    var STEPS = 32;
    var MAX_TRACKS = 16;
    var MAX_VOICES = 6;
    var PITCHES = 24;
    var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    var BLACK_NOTES = { 1: 1, 3: 1, 6: 1, 8: 1, 10: 1 };

    var SOUND_VARIANTS = {
        kick: ['Tight', 'Punchy', '808', 'Soft', 'Click', 'Distorted', 'Boom', 'Short'],
        snare: ['Tight', 'Fat', 'Snap', 'Rim', 'Clap', 'Soft', 'Dry', 'Crackle'],
        hihat: ['Closed', 'Open', 'Pedal', 'Soft', 'Bright', 'Dark', 'Shaker', 'Tick'],
        crash: ['Bright', 'Dark', 'Splash', 'China', 'Soft', 'Hard', 'Wash', 'Ride'],
        perc: ['Conga', 'Bongo', 'Tom', 'Clave', 'Cowbell', 'Wood', 'Shaker', 'Tap'],
        bass: ['Deep', 'Round', 'Sub', 'Growl', 'Pluck', 'Warm', 'Acid', 'Soft'],
        synth: ['Saw', 'Square', 'Pulse', 'Soft', 'Bright', 'Pad', 'Lead', 'Detuned'],
        piano: ['Classic', 'Grand', 'Bright', 'Soft', 'Warm', 'Electric', 'Bell', 'Pluck'],
        guitar: ['Clean', 'Warm', 'Bright', 'Muted', 'Chorus', 'Pluck', 'Soft', 'Edge']
    };

    var INSTRUMENTS = {
        kick:  { label: 'Kick',   kind: 'drum',    color: '#ff2961', baseMidi: null, group: 'Drums' },
        snare: { label: 'Snare',  kind: 'drum',    color: '#ff6b8a', baseMidi: null, group: 'Drums' },
        hihat: { label: 'Hi-Hat', kind: 'drum',    color: '#ffb3c6', baseMidi: null, group: 'Drums' },
        crash: { label: 'Crash',  kind: 'drum',    color: '#ffd0dc', baseMidi: null, group: 'Drums' },
        perc:  { label: 'Perc',   kind: 'drum',    color: '#e8a0b0', baseMidi: null, group: 'Drums' },
        bass:  { label: 'Bass',   kind: 'melody',  color: '#7ec8ff', baseMidi: 36,   group: 'Melody' },
        synth: { label: 'Synth',  kind: 'melody',  color: '#a78bfa', baseMidi: 48,   group: 'Melody' },
        piano: { label: 'Piano',  kind: 'melody',  color: '#e8c96a', baseMidi: 48,   group: 'Melody' },
        guitar:{ label: 'Guitar', kind: 'melody',  color: '#5cdb95', baseMidi: 40,   group: 'Melody' }
    };

    var DEFAULT_TYPES = ['kick', 'snare', 'hihat', 'bass', 'synth', 'piano'];

    var state = {
        tracks: [],
        bpm: 120,
        playing: false,
        currentStep: 0,
        nextNoteTime: 0,
        timerId: null,
        trackIdSeq: 1,
        noteIdSeq: 1,
        drag: null
    };

    var audioCtx = null;
    var masterGain = null;
    var noiseBuffer = null;

    /* Salamander grand piano samples (real recordings) — Tone.js CDN */
    var PIANO_SAMPLE_BASE = 'https://tonejs.github.io/audio/salamander/';
    var PIANO_SAMPLE_FILES = [
        'A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3',
        'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6', 'Fs6', 'A6', 'C7'
    ];
    var pianoSampler = {
        ready: false,
        failed: false,
        loading: null,
        byMidi: {},
        midiList: []
    };

    var els = {
        tracks: document.getElementById('beat-tracks'),
        ruler: document.getElementById('beat-step-ruler'),
        play: document.getElementById('beat-play'),
        stop: document.getElementById('beat-stop'),
        clear: document.getElementById('beat-clear'),
        add: document.getElementById('beat-add'),
        expandAll: document.getElementById('beat-expand-all'),
        collapseAll: document.getElementById('beat-collapse-all'),
        bpm: document.getElementById('beat-bpm'),
        bpmValue: document.getElementById('beat-bpm-value'),
        modal: document.getElementById('beat-add-modal'),
        modalBody: document.getElementById('beat-add-options'),
        modalClose: document.getElementById('beat-add-close'),
        modalBackdrop: document.getElementById('beat-add-backdrop'),
        hint: document.getElementById('beat-hint')
    };

    function midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function noteLabel(midi) {
        var n = ((midi % 12) + 12) % 12;
        var oct = Math.floor(midi / 12) - 1;
        return NOTE_NAMES[n] + oct;
    }

    function sampleNameToMidi(name) {
        var m = name.match(/^([A-G])(s?)(-?\d+)$/);
        if (!m) return null;
        var map = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        var pc = map[m[1]] + (m[2] ? 1 : 0);
        var oct = parseInt(m[3], 10);
        return (oct + 1) * 12 + pc;
    }

    function nearestPianoSample(midi) {
        var list = pianoSampler.midiList;
        if (!list.length) return null;
        var best = list[0];
        var bestDist = Math.abs(midi - best);
        for (var i = 1; i < list.length; i++) {
            var d = Math.abs(midi - list[i]);
            if (d < bestDist) {
                best = list[i];
                bestDist = d;
            }
        }
        return best;
    }

    function loadPianoSamples() {
        if (pianoSampler.ready || pianoSampler.failed) {
            return Promise.resolve(pianoSampler.ready);
        }
        if (pianoSampler.loading) return pianoSampler.loading;
        if (!audioCtx) return Promise.resolve(false);

        if (els.hint) els.hint.textContent = 'Loading real grand piano samples…';

        pianoSampler.loading = Promise.all(PIANO_SAMPLE_FILES.map(function (name) {
            var url = PIANO_SAMPLE_BASE + name + '.mp3';
            return fetch(url)
                .then(function (res) {
                    if (!res.ok) throw new Error('sample ' + name);
                    return res.arrayBuffer();
                })
                .then(function (buf) {
                    return audioCtx.decodeAudioData(buf.slice(0));
                })
                .then(function (audioBuf) {
                    var midi = sampleNameToMidi(name);
                    if (midi != null) pianoSampler.byMidi[midi] = audioBuf;
                })
                .catch(function () {
                    /* skip missing/failed note — others can still load */
                });
        })).then(function () {
            pianoSampler.midiList = Object.keys(pianoSampler.byMidi)
                .map(Number)
                .sort(function (a, b) { return a - b; });
            pianoSampler.ready = pianoSampler.midiList.length > 0;
            pianoSampler.failed = !pianoSampler.ready;
            pianoSampler.loading = null;
            if (els.hint) {
                els.hint.textContent = pianoSampler.ready
                    ? 'Grand piano ready — Classic / Grand / Bright / Soft / Warm use real samples.'
                    : 'Piano samples failed to load; using synth fallback.';
            }
            return pianoSampler.ready;
        }).catch(function () {
            pianoSampler.failed = true;
            pianoSampler.loading = null;
            if (els.hint) els.hint.textContent = 'Piano samples unavailable; using synth fallback.';
            return false;
        });

        return pianoSampler.loading;
    }

    function playSampledPiano(ctx, dest, when, midi, vol, dur, color) {
        var sampleMidi = nearestPianoSample(midi);
        if (sampleMidi == null) return false;
        var buffer = pianoSampler.byMidi[sampleMidi];
        if (!buffer) return false;

        var rate = midiToFreq(midi) / midiToFreq(sampleMidi);
        var src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate;

        /* Acoustic color profiles — Classic stays natural; others shape the same samples */
        var profile = {
            peak: vol * 0.95,
            attack: 0.002,
            release: 0.35,
            tail: 0.4
        };
        var node = src;

        function addFilter(type, freq, q, gain) {
            var f = ctx.createBiquadFilter();
            f.type = type;
            f.frequency.value = freq;
            if (q != null) f.Q.value = q;
            if (gain != null) f.gain.value = gain;
            node.connect(f);
            node = f;
            return f;
        }

        if (color === 'grand') {
            /* Fuller concert grand: body + air + longer ring */
            addFilter('lowshelf', 220, null, 5);
            addFilter('peaking', 900, 0.8, 2.5);
            addFilter('highshelf', 4500, null, 3);
            profile.peak = vol * 1.05;
            profile.release = 0.7;
            profile.tail = 0.85;
        } else if (color === 'bright') {
            /* Clear / sparkling: less mud, more hammer & overtones */
            addFilter('lowshelf', 180, null, -4);
            addFilter('peaking', 2800, 0.9, 5);
            addFilter('highshelf', 5000, null, 7);
            profile.peak = vol * 0.9;
            profile.attack = 0.001;
            profile.release = 0.28;
            profile.tail = 0.35;
        } else if (color === 'soft') {
            /* Felt / intimate: muted highs, gentle attack, quieter */
            addFilter('lowshelf', 300, null, 3);
            addFilter('lowpass', 1800, 0.7, null);
            addFilter('highshelf', 2500, null, -8);
            profile.peak = vol * 0.72;
            profile.attack = 0.035;
            profile.release = 0.55;
            profile.tail = 0.65;
        } else if (color === 'warm') {
            /* Round / mellow: bass & mid bloom, rolled top */
            addFilter('lowshelf', 160, null, 6);
            addFilter('peaking', 550, 0.7, 4);
            addFilter('lowpass', 4200, 0.6, null);
            addFilter('highshelf', 3500, null, -5);
            profile.peak = vol * 0.98;
            profile.attack = 0.008;
            profile.release = 0.5;
            profile.tail = 0.6;
        } else {
            /* classic — keep the current natural sample tone */
            addFilter('peaking', 2500, 0.8, 1.2);
        }

        var g = ctx.createGain();
        var peak = Math.max(0.0001, profile.peak);
        var attackEnd = when + profile.attack;
        var fadeAt = when + Math.max(profile.attack + 0.04, dur - 0.05);
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(peak, attackEnd);
        g.gain.setValueAtTime(peak, fadeAt);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur + profile.release);

        node.connect(g);
        g.connect(dest);
        src.start(when);
        src.stop(when + dur + profile.tail);
        return true;
    }

    function ensureAudio() {
        if (!audioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AC();
            masterGain = audioCtx.createGain();
            masterGain.gain.value = 0.85;
            masterGain.connect(audioCtx.destination);
            noiseBuffer = createNoiseBuffer(audioCtx);
            loadPianoSamples();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function createNoiseBuffer(ctx) {
        var len = ctx.sampleRate * 2;
        var buffer = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < len; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    function envGain(ctx, when, attack, decay, sustain, release, peak, hold) {
        var g = ctx.createGain();
        var p = peak == null ? 1 : peak;
        var h = hold == null ? 0 : Math.max(0, hold);
        var t = when;
        g.gain.setValueAtTime(0.0001, t);
        t += attack;
        g.gain.exponentialRampToValueAtTime(Math.max(0.0001, p), t);
        t += decay;
        g.gain.exponentialRampToValueAtTime(Math.max(0.0001, p * sustain), t);
        if (h > 0) {
            t += h;
            g.gain.setValueAtTime(Math.max(0.0001, p * sustain), t);
        }
        t += release;
        g.gain.exponentialRampToValueAtTime(0.0001, t);
        return g;
    }

    function playKick(ctx, dest, when, variant, vol) {
        var configs = [
            { f0: 160, f1: 42, dur: 0.18, type: 'sine' },
            { f0: 180, f1: 48, dur: 0.22, type: 'sine' },
            { f0: 90,  f1: 30, dur: 0.45, type: 'sine' },
            { f0: 140, f1: 50, dur: 0.28, type: 'triangle' },
            { f0: 220, f1: 70, dur: 0.1,  type: 'sine' },
            { f0: 150, f1: 40, dur: 0.25, type: 'sawtooth' },
            { f0: 120, f1: 28, dur: 0.5,  type: 'sine' },
            { f0: 170, f1: 55, dur: 0.12, type: 'sine' }
        ];
        var c = configs[variant % configs.length];
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = c.type;
        osc.frequency.setValueAtTime(c.f0, when);
        osc.frequency.exponentialRampToValueAtTime(c.f1, when + c.dur * 0.85);
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.95 * vol, when + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, when + c.dur);
        osc.connect(g);
        g.connect(dest);
        osc.start(when);
        osc.stop(when + c.dur + 0.02);

        if (variant === 4 || variant === 5) {
            var n = ctx.createBufferSource();
            var ng = ctx.createGain();
            var filter = ctx.createBiquadFilter();
            n.buffer = noiseBuffer;
            filter.type = 'highpass';
            filter.frequency.value = 800;
            ng.gain.setValueAtTime(0.2 * vol, when);
            ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
            n.connect(filter);
            filter.connect(ng);
            ng.connect(dest);
            n.start(when);
            n.stop(when + 0.05);
        }
    }

    function playSnare(ctx, dest, when, variant, vol) {
        var toneFreq = [200, 180, 240, 320, 160, 190, 210, 150][variant % 8];
        var noiseAmt = [0.55, 0.7, 0.45, 0.25, 0.8, 0.4, 0.35, 0.65][variant % 8];
        var dur = [0.16, 0.2, 0.12, 0.1, 0.18, 0.22, 0.14, 0.25][variant % 8];

        var osc = ctx.createOscillator();
        var og = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(toneFreq, when);
        osc.frequency.exponentialRampToValueAtTime(toneFreq * 0.6, when + dur);
        og.gain.setValueAtTime(0.0001, when);
        og.gain.exponentialRampToValueAtTime(0.45 * vol, when + 0.004);
        og.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        osc.connect(og);
        og.connect(dest);
        osc.start(when);
        osc.stop(when + dur + 0.02);

        var n = ctx.createBufferSource();
        var ng = ctx.createGain();
        var filter = ctx.createBiquadFilter();
        n.buffer = noiseBuffer;
        filter.type = variant === 3 ? 'bandpass' : 'highpass';
        filter.frequency.value = variant === 3 ? 900 : 1800;
        ng.gain.setValueAtTime(0.0001, when);
        ng.gain.exponentialRampToValueAtTime(noiseAmt * vol, when + 0.003);
        ng.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        n.connect(filter);
        filter.connect(ng);
        ng.connect(dest);
        n.start(when);
        n.stop(when + dur + 0.02);
    }

    function playHat(ctx, dest, when, variant, vol) {
        var open = variant === 1;
        var dur = open ? 0.35 : [0.05, 0.35, 0.08, 0.07, 0.06, 0.09, 0.12, 0.04][variant % 8];
        var freq = [7000, 6500, 5000, 4000, 9000, 3500, 6000, 8000][variant % 8];
        var n = ctx.createBufferSource();
        var filter = ctx.createBiquadFilter();
        var g = ctx.createGain();
        n.buffer = noiseBuffer;
        filter.type = 'highpass';
        filter.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.35 * vol, when + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        n.connect(filter);
        filter.connect(g);
        g.connect(dest);
        n.start(when);
        n.stop(when + dur + 0.02);
    }

    function playCrash(ctx, dest, when, variant, vol) {
        var dur = [1.2, 1.4, 0.5, 1.0, 0.9, 0.7, 1.6, 1.1][variant % 8];
        var freq = [5000, 3200, 7000, 2800, 4500, 6000, 4000, 3800][variant % 8];
        var n = ctx.createBufferSource();
        var filter = ctx.createBiquadFilter();
        var g = ctx.createGain();
        n.buffer = noiseBuffer;
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        filter.Q.value = 0.7;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.4 * vol, when + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        n.connect(filter);
        filter.connect(g);
        g.connect(dest);
        n.start(when);
        n.stop(when + dur + 0.02);
    }

    function playPerc(ctx, dest, when, variant, vol) {
        var freq = [220, 280, 160, 900, 700, 420, 2400, 340][variant % 8];
        var dur = [0.18, 0.12, 0.25, 0.08, 0.15, 0.1, 0.12, 0.09][variant % 8];
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = variant === 6 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, when);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, when + dur);
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.55 * vol, when + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        osc.connect(g);
        g.connect(dest);
        osc.start(when);
        osc.stop(when + dur + 0.02);
        if (variant === 6) {
            var n = ctx.createBufferSource();
            var ng = ctx.createGain();
            var f = ctx.createBiquadFilter();
            n.buffer = noiseBuffer;
            f.type = 'highpass';
            f.frequency.value = 3000;
            ng.gain.setValueAtTime(0.25 * vol, when);
            ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
            n.connect(f);
            f.connect(ng);
            ng.connect(dest);
            n.start(when);
            n.stop(when + 0.12);
        }
    }

    function playMelody(ctx, dest, when, type, midi, vol, variant, durSec) {
        var freq = midiToFreq(midi);
        var v = variant || 0;
        var dur = Math.max(0.08, durSec || 0.3);
        var release = Math.min(0.18, dur * 0.25);
        var hold = Math.max(0, dur - release - 0.08);

        if (type === 'bass') {
            var bassTypes = ['sine', 'triangle', 'sine', 'sawtooth', 'square', 'triangle', 'sawtooth', 'sine'];
            var bassCut = [400, 700, 180, 1100, 1600, 850, 2000, 500][v % 8];
            var bassPeak = [0.85, 0.7, 0.95, 0.55, 0.5, 0.65, 0.45, 0.6][v % 8];
            var osc = ctx.createOscillator();
            var filter = ctx.createBiquadFilter();
            var g = envGain(ctx, when, 0.01, v === 4 ? 0.05 : 0.1, v === 4 ? 0.2 : 0.65, release, bassPeak * vol, hold);
            osc.type = bassTypes[v % 8];
            osc.frequency.value = freq;
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(bassCut, when);
            filter.frequency.exponentialRampToValueAtTime(Math.max(80, bassCut * 0.35), when + Math.min(dur, 0.35));
            if (v === 3 || v === 6) filter.Q.value = 8;
            osc.connect(filter);
            filter.connect(g);
            g.connect(dest);
            osc.start(when);
            osc.stop(when + dur + 0.05);
            return;
        }

        if (type === 'synth') {
            var sTypes = ['sawtooth', 'square', 'square', 'sine', 'sawtooth', 'triangle', 'sawtooth', 'sawtooth'];
            var detune = 1.008;
            var sPeak = [0.35, 0.32, 0.28, 0.4, 0.3, 0.38, 0.33, 0.28][v % 8];
            var attack = [0.01, 0.01, 0.01, 0.04, 0.008, 0.08, 0.01, 0.01][v % 8];
            var o1 = ctx.createOscillator();
            var o2 = ctx.createOscillator();
            var filter = ctx.createBiquadFilter();
            var g = envGain(ctx, when, attack, 0.08, v === 5 ? 0.75 : 0.45, release, sPeak * vol, hold);
            o1.type = sTypes[v % 8];
            o2.type = v === 1 || v === 2 ? 'square' : 'sawtooth';
            o1.frequency.value = freq;
            o2.frequency.value = freq * (v === 7 ? detune : 1.005);
            filter.type = 'lowpass';
            filter.frequency.value = [2400, 1800, 2200, 1200, 4000, 900, 3200, 2000][v % 8];
            o1.connect(filter);
            o2.connect(filter);
            filter.connect(g);
            g.connect(dest);
            o1.start(when);
            o2.start(when);
            o1.stop(when + dur + 0.05);
            o2.stop(when + dur + 0.05);
            return;
        }

        if (type === 'guitar') {
            var gTypes = ['sawtooth', 'triangle', 'sawtooth', 'triangle', 'sawtooth', 'sawtooth', 'triangle', 'sawtooth'];
            var gPeak = [0.45, 0.4, 0.42, 0.3, 0.35, 0.48, 0.38, 0.4][v % 8];
            var gQ = [2, 1.2, 3, 0.8, 1.5, 4, 1, 2.5][v % 8];
            var osc = ctx.createOscillator();
            var filter = ctx.createBiquadFilter();
            var g = envGain(ctx, when, 0.005, v === 5 ? 0.04 : 0.08, 0.35, release, gPeak * vol, hold);
            osc.type = gTypes[v % 8];
            osc.frequency.value = freq;
            filter.type = v === 3 ? 'lowpass' : 'bandpass';
            filter.frequency.value = freq * [2, 1.6, 2.4, 1.2, 2, 2.8, 1.5, 2.2][v % 8];
            filter.Q.value = gQ;
            osc.connect(filter);
            if (v === 4) {
                var osc2 = ctx.createOscillator();
                osc2.type = 'sawtooth';
                osc2.frequency.value = freq * 1.003;
                osc2.connect(filter);
                osc2.start(when);
                osc2.stop(when + dur + 0.05);
            }
            filter.connect(g);
            g.connect(dest);
            osc.start(when);
            osc.stop(when + dur + 0.05);
            return;
        }

        playPiano(ctx, dest, when, midi, freq, vol, v, dur, release, hold);
    }

    function playPiano(ctx, dest, when, midi, freq, vol, variant, dur, release, hold) {
        var v = variant % 8;
        /* Classic, Grand, Bright, Soft, Warm → real Salamander samples when loaded */
        var sampleColors = {
            0: 'classic',
            1: 'grand',
            2: 'bright',
            3: 'soft',
            4: 'warm'
        };
        if (sampleColors[v] != null) {
            if (!pianoSampler.ready && !pianoSampler.failed) {
                loadPianoSamples();
            }
            if (pianoSampler.ready) {
                if (playSampledPiano(ctx, dest, when, midi, vol, dur, sampleColors[v])) {
                    return;
                }
            }
        }

        /* Electric / Bell / Pluck (and sample fallback) stay synthesized */
        var gBus = ctx.createGain();
        gBus.gain.value = vol;
        gBus.connect(dest);

        /* Order: Classic, Grand, Bright, Soft, Warm, Electric, Bell, Pluck */
        var profiles = [
            { partials: [1, 2, 3, 4, 5, 6], gains: [0.55, 0.26, 0.14, 0.08, 0.04, 0.02], attack: 0.005, decay: 0.18, sus: 0.4, hammer: 0.06 },
            { partials: [1, 2, 3, 4, 5, 6], gains: [0.5, 0.28, 0.16, 0.09, 0.045, 0.02], attack: 0.004, decay: 0.15, sus: 0.36, hammer: 0.08 },
            { partials: [1, 2, 3, 4, 5], gains: [0.42, 0.3, 0.2, 0.12, 0.06], attack: 0.003, decay: 0.12, sus: 0.3, hammer: 0.1 },
            { partials: [1, 2, 3, 4], gains: [0.58, 0.18, 0.08, 0.03], attack: 0.012, decay: 0.28, sus: 0.5, hammer: 0.03 },
            { partials: [1, 2, 3, 4, 5], gains: [0.52, 0.22, 0.1, 0.05, 0.02], attack: 0.008, decay: 0.2, sus: 0.48, hammer: 0.04 },
            { partials: [1, 2, 3, 4], gains: [0.4, 0.32, 0.08, 0.03], attack: 0.004, decay: 0.1, sus: 0.45, hammer: 0, tri: true },
            { partials: [1, 2.76, 5.4, 8.1], gains: [0.4, 0.28, 0.14, 0.06], attack: 0.002, decay: 0.35, sus: 0.2, hammer: 0 },
            { partials: [1, 2, 3, 4], gains: [0.5, 0.18, 0.08, 0.03], attack: 0.002, decay: 0.08, sus: 0.12, hammer: 0.06 }
        ];
        var p = profiles[v] || profiles[0];
        for (var i = 0; i < p.partials.length; i++) {
            var o = ctx.createOscillator();
            var gg = envGain(
                ctx, when,
                p.attack + i * 0.001,
                p.decay + i * 0.03,
                p.sus,
                release + i * 0.02,
                p.gains[i],
                hold * (1 - i * 0.05)
            );
            o.type = p.tri ? 'triangle' : 'sine';
            o.frequency.value = freq * p.partials[i];
            o.connect(gg);
            gg.connect(gBus);
            o.start(when);
            o.stop(when + dur + 0.15);
        }
        if (p.hammer && noiseBuffer) {
            var n = ctx.createBufferSource();
            var f = ctx.createBiquadFilter();
            var ng = ctx.createGain();
            n.buffer = noiseBuffer;
            f.type = 'highpass';
            f.frequency.value = 1800;
            ng.gain.setValueAtTime(0.0001, when);
            ng.gain.exponentialRampToValueAtTime(p.hammer * vol, when + 0.002);
            ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
            n.connect(f);
            f.connect(ng);
            ng.connect(dest);
            n.start(when);
            n.stop(when + 0.04);
        }
    }

    function noteCovers(note, step) {
        return step >= note.start && step < note.start + note.length;
    }

    function rangesOverlap(aStart, aLen, bStart, bLen) {
        return aStart < bStart + bLen && bStart < aStart + aLen;
    }

    function voicesAtStep(track, step, ignoreNoteId) {
        var count = 0;
        for (var i = 0; i < track.notes.length; i++) {
            var n = track.notes[i];
            if (ignoreNoteId && n.id === ignoreNoteId) continue;
            if (noteCovers(n, step)) count++;
        }
        return count;
    }

    function removeOverlappingSamePitch(track, pitch, start, length, exceptId) {
        track.notes = track.notes.filter(function (n) {
            if (exceptId && n.id === exceptId) return true;
            if (n.pitch !== pitch) return true;
            return !rangesOverlap(n.start, n.length, start, length);
        });
    }

    function canPlaceNote(track, pitch, start, length, exceptId) {
        for (var s = start; s < start + length; s++) {
            var voices = voicesAtStep(track, s, exceptId);
            var hasSame = false;
            for (var i = 0; i < track.notes.length; i++) {
                var n = track.notes[i];
                if (exceptId && n.id === exceptId) continue;
                if (n.pitch === pitch && noteCovers(n, s)) {
                    hasSame = true;
                    break;
                }
            }
            if (!hasSame && voices >= MAX_VOICES) return false;
        }
        return true;
    }

    function findNoteAt(track, pitch, step) {
        for (var i = 0; i < track.notes.length; i++) {
            var n = track.notes[i];
            if (n.pitch === pitch && noteCovers(n, step)) return n;
        }
        return null;
    }

    function getActiveNotes(track) {
        var notes = track.notes.slice();
        if (state.drag && state.drag.trackId === track.id && state.drag.preview) {
            var p = state.drag.preview;
            notes = notes.filter(function (n) {
                if (state.drag.mode === 'resize' && n.id === state.drag.noteId) return false;
                if (n.pitch !== p.pitch) return true;
                return !rangesOverlap(n.start, n.length, p.start, p.length);
            });
            notes.push({
                id: state.drag.noteId || -1,
                pitch: p.pitch,
                start: p.start,
                length: p.length,
                draft: true
            });
        }
        return notes;
    }

    function secondsPerStep() {
        return (60 / state.bpm) / 4;
    }

    function playSound(track, when) {
        if (track.muted) return;
        var meta = INSTRUMENTS[track.type];
        var vol = track.volume;
        var dest = masterGain;
        var step = state.currentStep;

        if (meta.kind === 'drum') {
            if (!track.steps[step]) return;
            if (track.type === 'kick') playKick(audioCtx, dest, when, track.variant, vol);
            else if (track.type === 'snare') playSnare(audioCtx, dest, when, track.variant, vol);
            else if (track.type === 'hihat') playHat(audioCtx, dest, when, track.variant, vol);
            else if (track.type === 'crash') playCrash(audioCtx, dest, when, track.variant, vol);
            else playPerc(audioCtx, dest, when, track.variant, vol);
            return;
        }

        for (var i = 0; i < track.notes.length; i++) {
            var note = track.notes[i];
            if (note.start !== step) continue;
            var dur = note.length * secondsPerStep();
            playMelody(audioCtx, dest, when, track.type, meta.baseMidi + note.pitch, vol, track.variant, dur);
        }
    }

    function scheduler() {
        if (!audioCtx) return;
        var scheduleAhead = 0.1;
        while (state.nextNoteTime < audioCtx.currentTime + scheduleAhead) {
            for (var i = 0; i < state.tracks.length; i++) {
                playSound(state.tracks[i], state.nextNoteTime);
            }
            var step = state.currentStep;
            window.setTimeout(function (s) {
                return function () {
                    if (state.playing) updatePlayhead(s);
                };
            }(step), Math.max(0, (state.nextNoteTime - audioCtx.currentTime) * 1000));

            state.nextNoteTime += secondsPerStep();
            state.currentStep = (state.currentStep + 1) % STEPS;
        }
    }

    function updatePlayhead(step) {
        var nums = els.ruler.querySelectorAll('.beat-step-num');
        for (var i = 0; i < nums.length; i++) {
            nums[i].classList.toggle('is-playhead', i === step);
        }
        var cells = els.tracks.querySelectorAll('[data-step]');
        for (var j = 0; j < cells.length; j++) {
            var el = cells[j];
            el.classList.toggle('is-playhead', Number(el.getAttribute('data-step')) === step);
        }
    }

    function clearPlayhead() {
        updatePlayhead(-1);
        state.currentStep = 0;
    }

    function startPlayback() {
        ensureAudio();
        state.playing = true;
        state.nextNoteTime = audioCtx.currentTime + 0.05;
        els.play.setAttribute('aria-pressed', 'true');
        els.play.classList.add('is-playing');
        els.play.querySelector('span').textContent = 'Pause';
        els.play.querySelector('i').className = 'fa-solid fa-pause';
        if (state.timerId) window.clearInterval(state.timerId);
        state.timerId = window.setInterval(scheduler, 25);
        scheduler();
    }

    function pausePlayback() {
        state.playing = false;
        if (state.timerId) {
            window.clearInterval(state.timerId);
            state.timerId = null;
        }
        els.play.setAttribute('aria-pressed', 'false');
        els.play.classList.remove('is-playing');
        els.play.querySelector('span').textContent = 'Play';
        els.play.querySelector('i').className = 'fa-solid fa-play';
    }

    function stopPlayback() {
        pausePlayback();
        clearPlayhead();
    }

    function createTrack(type) {
        var meta = INSTRUMENTS[type];
        var track = {
            id: state.trackIdSeq++,
            type: type,
            variant: 0,
            volume: 0.85,
            muted: false,
            expanded: false,
            lastPitch: 12
        };
        if (meta.kind === 'melody') {
            track.notes = [];
            track.steps = null;
        } else {
            track.notes = null;
            track.steps = [];
            for (var i = 0; i < STEPS; i++) track.steps.push(false);
        }
        return track;
    }

    function createDefaultTracks() {
        state.tracks = DEFAULT_TYPES.map(createTrack);
    }

    function renderRuler() {
        var html = '<div class="beat-step-ruler-label">Tracks</div>';
        for (var i = 0; i < STEPS; i++) {
            html += '<div class="beat-step-num" data-ruler-step="' + i + '">' + ((i % 4 === 0) ? (i + 1) : '') + '</div>';
        }
        els.ruler.innerHTML = html;
    }

    function stepIsOn(track, stepIndex) {
        if (INSTRUMENTS[track.type].kind === 'melody') {
            var notes = getActiveNotes(track);
            for (var i = 0; i < notes.length; i++) {
                if (noteCovers(notes[i], stepIndex)) return true;
            }
            return false;
        }
        return !!track.steps[stepIndex];
    }

    function renderTracks() {
        var html = '';
        for (var t = 0; t < state.tracks.length; t++) {
            html += renderTrack(state.tracks[t]);
        }
        els.tracks.innerHTML = html;
        updateAddButton();
        if (state.playing) updatePlayhead(state.currentStep === 0 ? STEPS - 1 : state.currentStep - 1);
    }

    function renderTrack(track) {
        var meta = INSTRUMENTS[track.type];
        var mutedClass = track.muted ? ' is-muted' : '';
        var expandedClass = track.expanded ? ' is-expanded' : '';
        var variants = SOUND_VARIANTS[track.type] || [];
        var variantLabel = variants[track.variant] || 'Default';
        var stepAction = meta.kind === 'melody' ? 'open-melody' : 'step';

        var html = '<article class="beat-track' + mutedClass + expandedClass + '" data-track-id="' + track.id + '">';
        html += '<div class="beat-track-main">';
        html += '<div class="beat-track-side">';
        html += '<div class="beat-track-top">';
        html += '<button type="button" class="beat-expand" data-action="expand" aria-expanded="' + track.expanded + '" title="Expand">';
        html += '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>';
        html += '<div><div class="beat-track-name" style="color:' + meta.color + '">' + meta.label + '</div>';
        html += '<div class="beat-track-type">' + variantLabel + '</div></div>';
        html += '<button type="button" class="beat-icon-btn' + (track.muted ? ' is-active' : '') + '" data-action="mute" title="Mute" aria-pressed="' + track.muted + '">';
        html += '<i class="fa-solid fa-volume-' + (track.muted ? 'xmark' : 'high') + '" aria-hidden="true"></i></button>';
        html += '<button type="button" class="beat-icon-btn beat-icon-btn--danger" data-action="remove" title="Remove track">';
        html += '<i class="fa-solid fa-trash" aria-hidden="true"></i></button>';
        html += '</div>';
        html += '<label class="beat-vol"><span>VOL</span>';
        html += '<input type="range" class="beat-range" data-action="volume" min="0" max="1" step="0.01" value="' + track.volume + '">';
        html += '</label></div>';

        for (var s = 0; s < STEPS; s++) {
            var on = stepIsOn(track, s) ? ' is-on' : '';
            var melodyClass = meta.kind === 'melody' ? ' beat-step--melody' : '';
            html += '<button type="button" class="beat-step' + on + melodyClass + '" data-action="' + stepAction + '" data-step="' + s + '" aria-label="Step ' + (s + 1) + '"></button>';
        }
        html += '</div>';

        html += '<div class="beat-track-panel">';
        html += '<div class="beat-variants" role="group" aria-label="Sound variants">';
        for (var v = 0; v < variants.length; v++) {
            var sel = v === track.variant ? ' is-selected' : '';
            html += '<button type="button" class="beat-chip' + sel + '" data-action="variant" data-variant="' + v + '">' + variants[v] + '</button>';
        }
        html += '</div>';
        if (meta.kind === 'melody') {
            html += renderPianoRoll(track);
        }
        html += '</div></article>';
        return html;
    }

    function buildCellMap(track) {
        var map = {};
        var notes = getActiveNotes(track);
        for (var i = 0; i < notes.length; i++) {
            var n = notes[i];
            for (var s = 0; s < n.length; s++) {
                var step = n.start + s;
                if (!map[n.pitch]) map[n.pitch] = {};
                var role = 'body';
                if (n.length === 1) role = 'single';
                else if (s === 0) role = 'start';
                else if (s === n.length - 1) role = 'end';
                map[n.pitch][step] = { noteId: n.id, role: role, draft: !!n.draft };
            }
        }
        return map;
    }

    /*
     * BandLab-style white key heads within an octave (semitone units from C).
     * Heads are taller than 1 row; tails + black keys stay exactly 1 row at the grid edge.
     */
    var WHITE_HEADS = {
        0: [0, 5 / 3],
        2: [5 / 3, 10 / 3],
        4: [10 / 3, 5],
        5: [5, 5 + 7 / 4],
        7: [5 + 7 / 4, 5 + 14 / 4],
        9: [5 + 14 / 4, 5 + 21 / 4],
        11: [5 + 21 / 4, 12]
    };

    function renderPianoKeyboard(meta) {
        var base = meta.baseMidi;
        var topMidi = base + PITCHES - 1;
        var html = '<div class="beat-piano-kbd" aria-hidden="true">';
        html += '<div class="beat-piano-kbd-bed"></div>';

        /* White keys: wide head (left) + 1-row tail (right, against divider) */
        for (var pitch = 0; pitch < PITCHES; pitch++) {
            var midi = base + pitch;
            var pc = midi % 12;
            if (!WHITE_HEADS[pc]) continue;
            var octC = midi - pc;
            var start = Math.max(octC + WHITE_HEADS[pc][0], base);
            var end = Math.min(octC + WHITE_HEADS[pc][1], base + PITCHES);
            if (end <= start) continue;

            /* Higher midi = higher on screen = smaller top offset */
            var headTopRows = Math.max(0, topMidi + 1 - end);
            var headBottomRows = Math.min(PITCHES, topMidi + 1 - start);
            var headRows = headBottomRows - headTopRows;
            if (headRows <= 0) continue;
            var tailTopRows = topMidi - midi;

            var wkCls = 'beat-wk' + (pc === 0 ? ' beat-wk--c' : '');
            html += '<div class="' + wkCls + '" data-pitch="' + pitch + '" style="';
            html += 'top:calc(' + headTopRows + ' * var(--beat-key-h));';
            html += 'height:calc(' + headRows + ' * var(--beat-key-h));';
            html += '">';
            html += '<div class="beat-wk-head"></div>';
            html += '<div class="beat-wk-tail" style="top:calc(' + (tailTopRows - headTopRows) + ' * var(--beat-key-h))">';
            html += '<span class="beat-wk-label">' + noteLabel(midi) + '</span>';
            html += '</div></div>';
        }

        /* Black keys: 1 row tall, shorter, right-aligned against the grid divider */
        for (var bp = 0; bp < PITCHES; bp++) {
            var bMidi = base + bp;
            if (!BLACK_NOTES[bMidi % 12]) continue;
            var bTop = topMidi - bMidi;
            html += '<div class="beat-bk" data-pitch="' + bp + '" style="';
            html += 'top:calc(' + bTop + ' * var(--beat-key-h));';
            html += 'height:var(--beat-key-h);';
            html += '"></div>';
        }

        html += '</div>';
        return html;
    }

    function renderPianoRoll(track) {
        var meta = INSTRUMENTS[track.type];
        var map = buildCellMap(track);
        var html = '<div class="beat-piano-wrap" data-piano-track="' + track.id + '">';
        html += renderPianoKeyboard(meta);

        for (var pitch = PITCHES - 1; pitch >= 0; pitch--) {
            var midi = meta.baseMidi + pitch;
            var isBlack = !!BLACK_NOTES[midi % 12];
            var label = noteLabel(midi);
            var laneCls = 'beat-piano-lane' + (isBlack ? ' is-black-row' : '');
            if (midi % 12 === 0) laneCls += ' is-c-row';

            html += '<div class="' + laneCls + '" data-pitch="' + pitch + '">';
            html += '<div class="beat-piano-gutter"></div>';
            html += '<div class="beat-piano-cells">';
            for (var step = 0; step < STEPS; step++) {
                var cell = map[pitch] && map[pitch][step];
                var classes = 'beat-piano-cell';
                var attrs = ' data-action="piano" data-step="' + step + '" data-pitch="' + pitch + '"';
                var inner = '';
                if (cell) {
                    classes += ' is-on is-note-' + cell.role;
                    if (cell.draft) classes += ' is-draft';
                    attrs += ' data-note-id="' + cell.noteId + '"';
                    if (cell.role === 'end' || cell.role === 'single') classes += ' has-resize';
                    if (cell.role === 'start' || cell.role === 'single') {
                        inner = '<span class="beat-note-label">' + label + '</span>';
                    }
                }
                html += '<button type="button" class="' + classes + '"' + attrs + ' aria-label="' + label + ' step ' + (step + 1) + '">' + inner + '</button>';
            }
            html += '</div></div>';
        }
        html += '</div>';
        return html;
    }

    function findTrack(id) {
        for (var i = 0; i < state.tracks.length; i++) {
            if (state.tracks[i].id === id) return state.tracks[i];
        }
        return null;
    }

    function previewTrackSound(track, pitchOverride, lengthSteps) {
        ensureAudio();
        var when = audioCtx.currentTime + 0.01;
        var meta = INSTRUMENTS[track.type];
        var vol = track.volume;
        if (meta.kind === 'drum') {
            if (track.type === 'kick') playKick(audioCtx, masterGain, when, track.variant, vol);
            else if (track.type === 'snare') playSnare(audioCtx, masterGain, when, track.variant, vol);
            else if (track.type === 'hihat') playHat(audioCtx, masterGain, when, track.variant, vol);
            else if (track.type === 'crash') playCrash(audioCtx, masterGain, when, track.variant, vol);
            else playPerc(audioCtx, masterGain, when, track.variant, vol);
            return;
        }
        var pitch = pitchOverride != null ? pitchOverride : track.lastPitch;
        var dur = (lengthSteps || 1) * secondsPerStep();
        playMelody(audioCtx, masterGain, when, track.type, meta.baseMidi + pitch, vol, track.variant, dur);
    }

    function normalizeRange(a, b) {
        var start = Math.min(a, b);
        var end = Math.max(a, b);
        start = Math.max(0, Math.min(STEPS - 1, start));
        end = Math.max(0, Math.min(STEPS - 1, end));
        return { start: start, length: end - start + 1 };
    }

    function commitPaint(track, pitch, start, length) {
        if (!canPlaceNote(track, pitch, start, length, null)) {
            els.hint.textContent = 'Max ' + MAX_VOICES + ' notes at once on a step.';
            return false;
        }
        removeOverlappingSamePitch(track, pitch, start, length, null);
        track.notes.push({
            id: state.noteIdSeq++,
            pitch: pitch,
            start: start,
            length: length
        });
        track.lastPitch = pitch;
        previewTrackSound(track, pitch, length);
        return true;
    }

    function commitResize(track, note, newStart, newLength) {
        if (newLength < 1) return false;
        if (!canPlaceNote(track, note.pitch, newStart, newLength, note.id)) {
            els.hint.textContent = 'Max ' + MAX_VOICES + ' notes at once on a step.';
            return false;
        }
        removeOverlappingSamePitch(track, note.pitch, newStart, newLength, note.id);
        note.start = newStart;
        note.length = newLength;
        track.lastPitch = note.pitch;
        return true;
    }

    function onTracksClick(e) {
        if (state.drag && state.drag.moved) return;
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var row = btn.closest('.beat-track');
        if (!row) return;
        var track = findTrack(Number(row.getAttribute('data-track-id')));
        if (!track) return;
        var action = btn.getAttribute('data-action');
        var meta = INSTRUMENTS[track.type];

        if (action === 'expand') {
            track.expanded = !track.expanded;
            renderTracks();
            return;
        }
        if (action === 'open-melody') {
            track.expanded = true;
            renderTracks();
            els.hint.textContent = 'Piano roll open — click or drag to place notes and chords.';
            return;
        }
        if (action === 'mute') {
            track.muted = !track.muted;
            renderTracks();
            return;
        }
        if (action === 'remove') {
            if (state.tracks.length <= 1) {
                els.hint.textContent = 'Keep at least one track in the stack.';
                return;
            }
            state.tracks = state.tracks.filter(function (t) { return t.id !== track.id; });
            renderTracks();
            return;
        }
        if (action === 'variant') {
            track.variant = Number(btn.getAttribute('data-variant'));
            previewTrackSound(track);
            renderTracks();
            return;
        }
        if (action === 'step' && meta.kind === 'drum') {
            ensureAudio();
            var step = Number(btn.getAttribute('data-step'));
            track.steps[step] = !track.steps[step];
            if (track.steps[step]) previewTrackSound(track);
            renderTracks();
        }
    }

    function onTracksPointerDown(e) {
        if (e.button != null && e.button !== 0) return;
        var cell = e.target.closest('.beat-piano-cell');
        if (!cell) return;
        var row = cell.closest('.beat-track');
        if (!row) return;
        var track = findTrack(Number(row.getAttribute('data-track-id')));
        if (!track || INSTRUMENTS[track.type].kind !== 'melody') return;

        e.preventDefault();
        var pitch = Number(cell.getAttribute('data-pitch'));
        var step = Number(cell.getAttribute('data-step'));
        var noteIdAttr = cell.getAttribute('data-note-id');
        var existing = noteIdAttr != null ? findNoteById(track, Number(noteIdAttr)) : null;
        var isResize = cell.classList.contains('has-resize') && (e.offsetX > cell.clientWidth - 10 || cell.classList.contains('is-note-end'));

        // Prefer resize when clicking the right edge of a note
        if (existing && (isResize || (e.offsetX > cell.clientWidth * 0.65 && (cell.classList.contains('is-note-end') || cell.classList.contains('is-note-single'))))) {
            state.drag = {
                mode: 'resize',
                trackId: track.id,
                noteId: existing.id,
                pitch: existing.pitch,
                anchorStart: existing.start,
                moved: false,
                preview: { pitch: existing.pitch, start: existing.start, length: existing.length }
            };
            cell.setPointerCapture && cell.setPointerCapture(e.pointerId);
            return;
        }

        if (existing) {
            state.drag = {
                mode: 'remove',
                trackId: track.id,
                noteId: existing.id,
                pitch: pitch,
                startStep: step,
                moved: false,
                preview: null
            };
            return;
        }

        state.drag = {
            mode: 'paint',
            trackId: track.id,
            pitch: pitch,
            startStep: step,
            moved: false,
            preview: { pitch: pitch, start: step, length: 1 }
        };
        renderTracks();
    }

    function findNoteById(track, id) {
        for (var i = 0; i < track.notes.length; i++) {
            if (track.notes[i].id === id) return track.notes[i];
        }
        return null;
    }

    function onPointerMove(e) {
        if (!state.drag) return;
        var track = findTrack(state.drag.trackId);
        if (!track) return;

        var el = document.elementFromPoint(e.clientX, e.clientY);
        var cell = el && el.closest ? el.closest('.beat-piano-cell') : null;
        if (!cell) return;

        var step = Number(cell.getAttribute('data-step'));
        var pitch = Number(cell.getAttribute('data-pitch'));
        if (isNaN(step)) return;

        if (state.drag.mode === 'paint') {
            if (pitch !== state.drag.pitch) return;
            var range = normalizeRange(state.drag.startStep, step);
            if (!state.drag.preview || state.drag.preview.start !== range.start || state.drag.preview.length !== range.length) {
                state.drag.moved = true;
                state.drag.preview = { pitch: state.drag.pitch, start: range.start, length: range.length };
                renderTracks();
            }
            return;
        }

        if (state.drag.mode === 'resize') {
            var note = findNoteById(track, state.drag.noteId);
            if (!note) return;
            var end = Math.max(state.drag.anchorStart, step);
            var length = end - state.drag.anchorStart + 1;
            if (!state.drag.preview || state.drag.preview.length !== length) {
                state.drag.moved = true;
                state.drag.preview = { pitch: note.pitch, start: state.drag.anchorStart, length: length };
                renderTracks();
            }
            return;
        }

        if (state.drag.mode === 'remove') {
            if (step !== state.drag.startStep || pitch !== state.drag.pitch) {
                // Convert to paint/replace if user drags away on empty-ish intent: treat as paint from original
                state.drag.mode = 'paint';
                state.drag.startStep = state.drag.startStep;
                state.drag.preview = normalizeRange(state.drag.startStep, step);
                state.drag.preview = { pitch: state.drag.pitch, start: state.drag.preview.start, length: state.drag.preview.length };
                state.drag.moved = true;
                // remove the original note immediately so drag replaces it
                track.notes = track.notes.filter(function (n) { return n.id !== state.drag.noteId; });
                renderTracks();
            }
        }
    }

    function onPointerUp() {
        if (!state.drag) return;
        var drag = state.drag;
        var track = findTrack(drag.trackId);
        state.drag = null;

        if (!track) {
            renderTracks();
            return;
        }

        if (drag.mode === 'remove' && !drag.moved) {
            track.notes = track.notes.filter(function (n) { return n.id !== drag.noteId; });
            renderTracks();
            return;
        }

        if (drag.mode === 'paint' && drag.preview) {
            commitPaint(track, drag.preview.pitch, drag.preview.start, drag.preview.length);
            renderTracks();
            return;
        }

        if (drag.mode === 'resize' && drag.preview) {
            var note = findNoteById(track, drag.noteId);
            if (note) {
                commitResize(track, note, drag.preview.start, drag.preview.length);
                if (drag.moved) previewTrackSound(track, note.pitch, note.length);
            }
            renderTracks();
            return;
        }

        renderTracks();
    }

    function updateAddButton() {
        els.add.disabled = state.tracks.length >= MAX_TRACKS;
        els.add.title = state.tracks.length >= MAX_TRACKS ? 'Max 16 tracks' : 'Add track (max 16)';
    }

    function openAddModal() {
        if (state.tracks.length >= MAX_TRACKS) return;
        var html = '';
        var keys = Object.keys(INSTRUMENTS);
        for (var i = 0; i < keys.length; i++) {
            var type = keys[i];
            var meta = INSTRUMENTS[type];
            html += '<button type="button" class="beat-add-option" data-type="' + type + '">';
            html += '<strong style="color:' + meta.color + '">' + meta.label + '</strong>';
            html += '<span>' + meta.group + (meta.kind === 'drum' ? ' · 8 sounds' : ' · chords · long notes') + '</span>';
            html += '</button>';
        }
        els.modalBody.innerHTML = html;
        els.modal.hidden = false;
        els.modal.setAttribute('aria-hidden', 'false');
    }

    function closeAddModal() {
        els.modal.hidden = true;
        els.modal.setAttribute('aria-hidden', 'true');
    }

    function clearPattern() {
        for (var i = 0; i < state.tracks.length; i++) {
            var track = state.tracks[i];
            if (INSTRUMENTS[track.type].kind === 'melody') {
                track.notes = [];
            } else {
                for (var s = 0; s < STEPS; s++) track.steps[s] = false;
            }
        }
        renderTracks();
        els.hint.textContent = 'Pattern cleared. Stack a new groove.';
    }

    var hoverWrap = null;

    function clearPianoCrosshair() {
        if (!hoverWrap) return;
        var marked = hoverWrap.querySelectorAll('.is-cross-row, .is-cross-col, .is-cross-key');
        for (var i = 0; i < marked.length; i++) {
            marked[i].classList.remove('is-cross-row', 'is-cross-col', 'is-cross-key');
        }
        hoverWrap = null;
    }

    function updatePianoCrosshair(cell) {
        var wrap = cell.closest('.beat-piano-wrap');
        if (!wrap) {
            clearPianoCrosshair();
            return;
        }
        var step = cell.getAttribute('data-step');
        var pitch = cell.getAttribute('data-pitch');
        if (hoverWrap && hoverWrap !== wrap) clearPianoCrosshair();
        hoverWrap = wrap;

        var prev = wrap.querySelectorAll('.is-cross-row, .is-cross-col, .is-cross-key');
        for (var i = 0; i < prev.length; i++) {
            prev[i].classList.remove('is-cross-row', 'is-cross-col', 'is-cross-key');
        }

        var lane = wrap.querySelector('.beat-piano-lane[data-pitch="' + pitch + '"]');
        if (lane) {
            lane.classList.add('is-cross-row');
            var rowCells = lane.querySelectorAll('.beat-piano-cell');
            for (var r = 0; r < rowCells.length; r++) rowCells[r].classList.add('is-cross-row');
        }
        var wk = wrap.querySelector('.beat-wk[data-pitch="' + pitch + '"]');
        if (wk) wk.classList.add('is-cross-key');
        var bk = wrap.querySelector('.beat-bk[data-pitch="' + pitch + '"]');
        if (bk) bk.classList.add('is-cross-key');

        var colCells = wrap.querySelectorAll('.beat-piano-cell[data-step="' + step + '"]');
        for (var c = 0; c < colCells.length; c++) colCells[c].classList.add('is-cross-col');
    }

    function onTracksPointerMoveHover(e) {
        if (state.drag) return;
        var cell = e.target.closest('.beat-piano-cell');
        if (!cell) {
            if (!e.target.closest('.beat-piano-wrap')) clearPianoCrosshair();
            return;
        }
        updatePianoCrosshair(cell);
    }

    function bindGlobal() {
        els.tracks.addEventListener('click', onTracksClick);
        els.tracks.addEventListener('pointerdown', onTracksPointerDown);
        els.tracks.addEventListener('pointermove', onTracksPointerMoveHover);
        els.tracks.addEventListener('pointerleave', clearPianoCrosshair);
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);

        els.tracks.addEventListener('input', function (e) {
            var input = e.target;
            if (!input.matches('[data-action="volume"]')) return;
            var row = input.closest('.beat-track');
            if (!row) return;
            var track = findTrack(Number(row.getAttribute('data-track-id')));
            if (!track) return;
            track.volume = Number(input.value);
        });

        els.play.addEventListener('click', function () {
            if (state.playing) pausePlayback();
            else startPlayback();
        });
        els.stop.addEventListener('click', stopPlayback);
        els.clear.addEventListener('click', clearPattern);
        els.expandAll.addEventListener('click', function () {
            for (var i = 0; i < state.tracks.length; i++) state.tracks[i].expanded = true;
            renderTracks();
        });
        els.collapseAll.addEventListener('click', function () {
            for (var i = 0; i < state.tracks.length; i++) state.tracks[i].expanded = false;
            renderTracks();
        });
        els.add.addEventListener('click', openAddModal);
        els.modalClose.addEventListener('click', closeAddModal);
        els.modalBackdrop.addEventListener('click', closeAddModal);
        els.modalBody.addEventListener('click', function (e) {
            var opt = e.target.closest('[data-type]');
            if (!opt) return;
            if (state.tracks.length >= MAX_TRACKS) return;
            var track = createTrack(opt.getAttribute('data-type'));
            state.tracks.push(track);
            closeAddModal();
            renderTracks();
            previewTrackSound(track);
            els.hint.textContent = track.notes
                ? 'Melody track added. Expand it to place notes.'
                : 'Track added. Expand it to shape the sound.';
        });
        els.bpm.addEventListener('input', function () {
            state.bpm = Number(els.bpm.value);
            els.bpmValue.textContent = String(state.bpm);
        });
        document.addEventListener('keydown', function (e) {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                if (state.playing) pausePlayback();
                else startPlayback();
            }
        });
    }

    function init() {
        createDefaultTracks();
        renderRuler();
        renderTracks();
        bindGlobal();
        els.hint.textContent = 'Expand a melody track to place chords and long notes. Drag to lengthen.';
    }

    init();
})();
