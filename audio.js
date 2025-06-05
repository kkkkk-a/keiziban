
// --- グローバル変数 ---
let audioContext = null;
const ui = {}; // DOM要素の参照を格納 (DOMContentLoaded内で設定)

let bgmTracks = {};
let bgmTrackIdCounter = 0;
let arpeggioTimeoutId = null;
let mediaRecorder = null;
let recordedBlob = null;
let mediaStreamDestinationNode = null;
let masterGainNode = null;
let globalMuteGainNode = null;
const activeInstrumentNodes = new Map(); // { uniqueNodeId: { instrumentGain, oscillators, filters, lfo, lfoGain, settingsKey, stopTime, nodesForCleanup } }

const NUM_STEPS = 16;
let sequencerTracks = [
    { name: "Kick", instrument: "kick_seq", color: "#e53935", pattern: Array(NUM_STEPS).fill(false), gainNode: null, solo: false, mute: false, wasMutedBySolo: false, defaultVelocity: 1.0 },
    { name: "Snare", instrument: "snare_seq", color: "#1e88e5", pattern: Array(NUM_STEPS).fill(false), gainNode: null, solo: false, mute: false, wasMutedBySolo: false, defaultVelocity: 0.8 },
    { name: "HiHat", instrument: "hihat_closed_seq", color: "#43a047", pattern: Array(NUM_STEPS).fill(false), gainNode: null, solo: false, mute: false, wasMutedBySolo: false, defaultVelocity: 0.6 },
    { name: "Bass", instrument: "synth_bass_seq", color: "#fdd835", pattern: Array(NUM_STEPS).fill(null), gainNode: null, solo: false, mute: false, defaultNote: "C2", octave: 2, wasMutedBySolo: false }
];

let isMasterPlaying = false;
let masterPlayIntervalId = null;
let currentBeat = 0;

let micStream = null; let micSourceNode = null; let micGainNode = null; let isMicActive = false;

let masterFilterNode = null; let masterDelayNode = null; let masterFeedbackGainNode = null; let masterDelayWetGainNode = null;
let currentNoiseNodes = { source: null, filter: null, gain: null };

// --- 音楽理論データ & 楽器設定 ---
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHORD_INTERVALS = { "major": [0, 4, 7], "minor": [0, 3, 7], "diminished": [0, 3, 6], "augmented": [0, 4, 8], "major7": [0, 4, 7, 11], "minor7": [0, 3, 7, 10], "dominant7": [0, 4, 7, 10], "diminished7": [0, 3, 6, 9], "half_diminished7": [0, 3, 6, 10], "major9": [0, 4, 7, 11, 14], "minor9": [0, 3, 7, 10, 14], "dominant9": [0, 4, 7, 10, 14] };
const SCALE_MODE_INTERVALS = { "major_scale": [0, 2, 4, 5, 7, 9, 11], "natural_minor_scale": [0, 2, 3, 5, 7, 8, 10], "harmonic_minor_scale": [0, 2, 3, 5, 7, 8, 11], "melodic_minor_scale_asc": [0, 2, 3, 5, 7, 9, 11], "pentatonic_major": [0, 2, 4, 7, 9], "pentatonic_minor": [0, 3, 5, 7, 10], "whole_tone": [0, 2, 4, 6, 8, 10], "chromatic_scale": Array.from({ length: 12 }, (_, i) => i), "ionian_mode": [0, 2, 4, 5, 7, 9, 11], "dorian_mode": [0, 2, 3, 5, 7, 9, 10], "phrygian_mode": [0, 1, 3, 5, 7, 8, 10], "lydian_mode": [0, 2, 4, 6, 7, 9, 11], "mixolydian_mode": [0, 2, 4, 5, 7, 9, 10], "aeolian_mode": [0, 2, 3, 5, 7, 8, 10], "locrian_mode": [0, 1, 3, 5, 6, 8, 10] };
const instrumentSettings = {
    "piano": { getWaveformType: () => ui.waveformSelector.value, envelope: { attack: 0.01, decay: 1.0, sustainLevel: 0.1, releaseTime: 0.2, maxGain: 0.35 }, sourceType: "oscillator" },
    "guitar_simple": { getWaveformType: () => "sawtooth", envelope: { attack: 0.005, decay: 0.3, sustainLevel: 0.001, releaseTime: 0.1, maxGain: 0.25 }, sourceType: "oscillator_with_filter", filterSettings: { type: "lowpass", frequencyFactor: 2.5, baseFrequency: 500, maxFrequency: 6000, Q: 0.7 } },
    "flute_simple": { getWaveformType: () => "triangle", envelope: { attack: 0.05, decay: 0.2, sustainLevel: 0.6, releaseTime: 0.15, maxGain: 0.4 }, sourceType: "oscillator_with_optional_filter", filterSettings: { type: "lowpass", frequency: 5000, Q: 0.5 } },
    "synth_bass": { getWaveformType: () => "sawtooth", envelope: { attack: 0.01, decay: 0.15, sustainLevel: 0.2, releaseTime: 0.1, maxGain: 0.6 }, sourceType: "oscillator_with_filter_lfo", filterSettings: { type: "lowpass", frequencyFactor: 1.2, baseFrequency: 80, maxFrequency: 800, Q: 1.5 }, lfoDefaults: { active: false, waveform: 'sine', rate: 4, depth: 100, target: 'filter_freq' }, canBeSidechained: true },
    "synth_lead_saw": { getWaveformType: () => "sawtooth", envelope: { attack: 0.02, decay: 0.5, sustainLevel: 0.4, releaseTime: 0.3, maxGain: 0.3 }, sourceType: "multi_oscillator_with_filter_lfo", oscillatorCount: 3, detuneAmount: 7, filterSettings: { type: "lowpass", frequencyFactor: 3, baseFrequency: 600, maxFrequency: 8000, Q: 1.0 }, lfoDefaults: { active: false, waveform: 'sine', rate: 5, depth: 5, target: 'pitch' }, canBeSidechained: true },
    "synth_lead_square": { getWaveformType: () => "square", envelope: { attack: 0.01, decay: 0.2, sustainLevel: 0.5, releaseTime: 0.2, maxGain: 0.3 }, sourceType: "oscillator_with_filter_lfo", filterSettings: { type: "lowpass", frequencyFactor: 2, baseFrequency: 700, maxFrequency: 7000, Q: 0.8 }, lfoDefaults: { active: false, waveform: 'sine', rate: 3, depth: 200, target: 'filter_freq' }, canBeSidechained: true },
    "sub_bass": { getWaveformType: () => "sine", envelope: { attack: 0.005, decay: 0.1, sustainLevel: 0.7, releaseTime: 0.1, maxGain: 0.7 }, sourceType: "oscillator", octaveOffset: -1, canBeSidechained: true },
    "kick_seq": { isDrum: true, drumType: "kick" },
    "snare_seq": { isDrum: true, drumType: "snare" },
    "hihat_closed_seq": { isDrum: true, drumType: "hihat_closed" },
    "synth_bass_seq": { getWaveformType: () => "square", envelope: { attack: 0.01, decay: 0.1, sustainLevel: 0.1, releaseTime: 0.05, maxGain: 0.5 }, sourceType: "oscillator_with_filter_lfo", filterSettings: { type: "lowpass", frequencyFactor: 1, baseFrequency: 100, maxFrequency: 600, Q: 1.0 }, canBeSidechained: true, octaveOffset: -1, lfoDefaults: { active: false, waveform: 'sine', rate: 2, depth: 50, target: 'filter_freq' } }
};
const A4_FREQ = 440.0; const A4_INDEX_IN_NOTES = NOTES.indexOf('A');
const keysLayout = [{ note: 'C', type: 'white', whiteKeyIndex: 0 }, { note: 'C#', type: 'black', whiteKeyIndex: 1 }, { note: 'D', type: 'white', whiteKeyIndex: 1 }, { note: 'D#', type: 'black', whiteKeyIndex: 2 }, { note: 'E', type: 'white', whiteKeyIndex: 2 }, { note: 'F', type: 'white', whiteKeyIndex: 3 }, { note: 'F#', type: 'black', whiteKeyIndex: 4 }, { note: 'G', type: 'white', whiteKeyIndex: 4 }, { note: 'G#', type: 'black', whiteKeyIndex: 5 }, { note: 'A', type: 'white', whiteKeyIndex: 5 }, { note: 'A#', type: 'black', whiteKeyIndex: 6 }, { note: 'B', type: 'white', whiteKeyIndex: 6 }, { note: 'C', type: 'white', whiteKeyIndex: 7, isNextOctaveC: true }];

// --- ヘルパー関数 ---
function getNoteIndex(noteNameWithOctave) { if (!noteNameWithOctave || typeof noteNameWithOctave !== 'string' || noteNameWithOctave.length < 2) { console.warn(`Invalid note format: ${noteNameWithOctave}`); return null; } const noteBase = noteNameWithOctave.slice(0, -1).toUpperCase(); const octaveStr = noteNameWithOctave.slice(-1); if (!/^\d$/.test(octaveStr)) { console.warn(`Invalid octave in note: ${noteNameWithOctave}`); return null; } const octave = parseInt(octaveStr); const noteIdx = NOTES.indexOf(noteBase); if (noteIdx === -1) { console.warn(`Unknown note base: ${noteBase} in ${noteNameWithOctave}`); return null; } return noteIdx + (octave * 12); }
function getFrequencyFromIndex(noteIndex, octaveOffset = 0) { if (noteIndex === null || typeof noteIndex !== 'number') return null; const adjustedIndex = noteIndex + (octaveOffset * 12); const semitonesFromA4 = adjustedIndex - (A4_INDEX_IN_NOTES + 4 * 12); return A4_FREQ * (Math.pow(2, semitonesFromA4 / 12.0)); }
function getChordNotesWithInversion(rootNoteName, octave, chordType, inversion) { const baseIntervals = CHORD_INTERVALS[chordType]; if (!baseIntervals) { console.warn(`Unknown chord type: ${chordType}`); return []; } const numNotes = baseIntervals.length; if (numNotes === 0) return []; const actualInversion = inversion % numNotes; const rootNoteBaseIndex = NOTES.indexOf(rootNoteName); if (rootNoteBaseIndex === -1) { console.warn(`Unknown root note: ${rootNoteName}`); return []; } const rootAbsIdx = rootNoteBaseIndex + (octave * 12); const absoluteNoteIndices = baseIntervals.map(i => rootAbsIdx + i).sort((a, b) => a - b); let invertedIndices = [...absoluteNoteIndices]; for (let i = 0; i < actualInversion; i++) { if (i < invertedIndices.length) { invertedIndices[i] += 12; } } const finalNoteIndices = invertedIndices.sort((a, b) => a - b); return finalNoteIndices.map(idx => { const noteName = NOTES[idx % 12]; const noteOctave = Math.floor(idx / 12); return `${noteName}${noteOctave}`; }); }
function getScaleNotes(rootNoteName, octave, scaleModeType) { const intervals = SCALE_MODE_INTERVALS[scaleModeType]; if (!intervals) { console.warn(`Unknown scale/mode type: ${scaleModeType}`); return []; } const rootNoteBaseIndex = NOTES.indexOf(rootNoteName); if (rootNoteBaseIndex === -1) { console.warn(`Unknown root note: ${rootNoteName}`); return []; } const rootAbsIdx = rootNoteBaseIndex + (octave * 12); return intervals.map(i => { const noteAbsIdx = rootAbsIdx + i; const noteName = NOTES[noteAbsIdx % 12]; const noteOctave = Math.floor(noteAbsIdx / 12); return `${noteName}${noteOctave}`; }); }

// --- UI構築関数 ---
function createKeyElement(noteNameBase, keyType, whiteKeyIdx, displayOctave, fullNoteNameWithOctave) { const keyEl = document.createElement("div"); keyEl.classList.add("key", keyType); keyEl.dataset.note = fullNoteNameWithOctave; keyEl.dataset.noteBase = noteNameBase; keyEl.innerText = fullNoteNameWithOctave.replace("#", "♯"); keyEl.setAttribute('aria-label', `Play note ${fullNoteNameWithOctave}`); keyEl.addEventListener("mousedown", () => { ensureGlobalAudioUnmuted(); if (!audioContext) { ui.statusElement.innerText = "オーディオを有効化してください。"; return; } const instrumentName = ui.instrumentSelector.value; const settings = instrumentSettings[instrumentName]; const freq = getFrequencyFromIndex(getNoteIndex(fullNoteNameWithOctave), settings?.octaveOffset || 0); if (freq === null) { console.error(`Could not get frequency for note: ${fullNoteNameWithOctave}`); return; } playInstrumentNote(freq, instrumentName, 1.0, keyEl, ui.articulationSelector.value); }); return keyEl; }
function buildPianoUI() { if (!ui.pianoContainer || !ui.octaveSelector) { console.error("Piano UI elements not found for build."); return; } ui.pianoContainer.innerHTML = ""; const baseDisplayOctave = parseInt(ui.octaveSelector.value); const numOctavesToDisplay = 2; for (let octOffset = 0; octOffset < numOctavesToDisplay; octOffset++) { const currentDisplayOctaveBase = baseDisplayOctave + octOffset; const layoutToUse = (octOffset < numOctavesToDisplay - 1 || numOctavesToDisplay === 1) ? keysLayout : keysLayout.slice(0, -1); layoutToUse.forEach(keyInfo => { let octaveForThisNote = currentDisplayOctaveBase + (keyInfo.isNextOctaveC ? 1 : 0); const fullNoteName = `${keyInfo.note}${octaveForThisNote}`; const keyEl = createKeyElement(keyInfo.note, keyInfo.type, keyInfo.whiteKeyIndex, octaveForThisNote, fullNoteName); ui.pianoContainer.appendChild(keyEl); }); } }

// --- 音声再生関数 (LFOリアルタイム適用) ---
function playInstrumentNote(frequency, instrumentName, baseDurationSec = 1.0, keyElement = null, articulation = "normal", noteOffTime = null, inputGainNode = null) {
    if (!audioContext || !masterGainNode) { if (ui.statusElement) ui.statusElement.innerText = "Audio system not initialized."; return null; }
    if (audioContext.state === "suspended") { audioContext.resume().catch(err => { console.error("Resume error:", err); if (ui.statusElement) ui.statusElement.innerText = "Error resuming audio."; }); if (audioContext.state === "suspended") { if (ui.statusElement) ui.statusElement.innerText = "Audio suspended."; return null; } }
    if (typeof frequency !== 'number' || isNaN(frequency)) { console.error("Invalid frequency for playInstrumentNote:", frequency); if (ui.statusElement) ui.statusElement.innerText = "Invalid frequency."; return null; }

    const settings = instrumentSettings[instrumentName];
    if (!settings) { if (ui.statusElement) ui.statusElement.innerText = `Unknown instrument: ${instrumentName}`; return null; }

    const env = JSON.parse(JSON.stringify(settings.envelope));
    let effectiveDuration = baseDurationSec;
    let gainAutomationTimeConstant = 0.015;

    if (articulation === "staccato") { env.decay = 0.02; env.sustainLevel = 0.0001; env.releaseTime = 0.03; effectiveDuration = env.attack + env.decay + env.releaseTime + 0.02; }
    else if (articulation === "legato") { env.releaseTime = Math.max(0.4, env.releaseTime * 1.8); effectiveDuration = baseDurationSec + env.releaseTime; }
    else if (articulation === "crescendo") { env.attack = Math.min(0.5, baseDurationSec * 0.8); }
    else if (articulation === "decrescendo") { env.releaseTime = Math.min(0.6, baseDurationSec * 0.6); gainAutomationTimeConstant = env.releaseTime / 2.5; }

    const now = audioContext.currentTime;
    const mainInstrumentGainNode = inputGainNode || audioContext.createGain();
    const uniqueNodeId = `${instrumentName}_${now}_${Math.random().toString(16).slice(2)}`;

    let createdOscillators = []; let createdFilters = [];
    let lfoNodeThisInstance = null; let lfoGainNodeThisInstance = null;
    let nodesToCleanUpThisNote = [mainInstrumentGainNode];

    if (settings.canBeSidechained) activeInstrumentNodes.set(uniqueNodeId, mainInstrumentGainNode);

    if (settings.sourceType.startsWith("oscillator") || settings.sourceType.startsWith("multi_oscillator")) {
        const oscillatorCount = settings.oscillatorCount || 1;
        for (let i = 0; i < oscillatorCount; i++) {
            const oscillator = audioContext.createOscillator();
            oscillator.type = settings.getWaveformType();
            if (oscillatorCount > 1 && settings.detuneAmount) { const detune = (i - Math.floor(oscillatorCount / 2)) * settings.detuneAmount; try { oscillator.detune.setValueAtTime(detune, now); } catch (e) { console.warn("Detune not supported or error:", e); } }
            oscillator.frequency.setValueAtTime(frequency, now);
            let currentOscOutput = oscillator; createdOscillators.push(oscillator); nodesToCleanUpThisNote.push(oscillator);
            let filterNodeForThisOscLFO = null;
            if ((settings.sourceType.includes("filter") || settings.sourceType.includes("optional_filter")) && settings.filterSettings) {
                const fs = settings.filterSettings; const bFilter = audioContext.createBiquadFilter();
                bFilter.type = fs.type || "lowpass"; const cutoff = fs.frequency !== undefined ? fs.frequency : Math.min(Math.max(frequency * (fs.frequencyFactor || 1), fs.baseFrequency || 20), fs.maxFrequency || 20000);
                bFilter.frequency.setValueAtTime(cutoff, now); bFilter.Q.setValueAtTime(fs.Q || 1, now);
                oscillator.connect(bFilter); currentOscOutput = bFilter; createdFilters.push(bFilter); nodesToCleanUpThisNote.push(bFilter);
                if (i === 0) filterNodeForThisOscLFO = bFilter;
            }
            const lfoUiSource = (instrumentName === ui.instrumentSelector?.value && ui.lfoWaveformSelector) ? ui : (settings.lfoDefaults || {});
            const lfoIsActiveForThisInstrument = settings.lfoDefaults && (lfoUiSource.lfoActiveCheckbox?.checked || settings.lfoDefaults.active);
            if (lfoIsActiveForThisInstrument) {
                lfoNodeThisInstance = audioContext.createOscillator(); lfoGainNodeThisInstance = audioContext.createGain();
                lfoNodeThisInstance.type = lfoUiSource.lfoWaveform?.value || settings.lfoDefaults.waveform;
                lfoNodeThisInstance.frequency.setValueAtTime(parseFloat(lfoUiSource.lfoRateSlider?.value || settings.lfoDefaults.rate), now);
                lfoGainNodeThisInstance.gain.setValueAtTime(parseFloat(lfoUiSource.lfoDepthSlider?.value || settings.lfoDefaults.depth), now);
                lfoNodeThisInstance.connect(lfoGainNodeThisInstance);
                nodesToCleanUpThisNote.push(lfoNodeThisInstance, lfoGainNodeThisInstance);
                const lfoTargetActual = lfoUiSource.lfoTargetSelector?.value || settings.lfoDefaults.target;
                if (lfoTargetActual === 'pitch') lfoGainNodeThisInstance.connect(oscillator.detune);
                else if (lfoTargetActual === 'filter_freq' && filterNodeForThisOscLFO) lfoGainNodeThisInstance.connect(filterNodeForThisOscLFO.frequency);
                else if (lfoTargetActual === 'amplitude') lfoGainNodeThisInstance.connect(mainInstrumentGainNode.gain);
                lfoNodeThisInstance.start(now); lfoNodeThisInstance.stop(now + effectiveDuration + 0.2);
            }
            currentOscOutput.connect(mainInstrumentGainNode);
            oscillator.start(now);
            const actualStopTime = noteOffTime !== null ? noteOffTime : now + effectiveDuration;
            try { oscillator.stop(actualStopTime); } catch (e) { console.warn("Error stopping oscillator, already stopped?", e); }
        }
    } else { if (ui.statusElement) ui.statusElement.innerText = "Unknown source type for instrument."; return null; }
    mainInstrumentGainNode.gain.setValueAtTime(articulation === "crescendo" ? 0.001 : 0, now);
    mainInstrumentGainNode.gain.linearRampToValueAtTime(env.maxGain, now + env.attack);
    mainInstrumentGainNode.gain.setTargetAtTime(env.sustainLevel, now + env.attack, env.decay / 3 > 0.001 ? env.decay / 3 : 0.001);
    const actualReleaseStartTime = noteOffTime !== null ? noteOffTime : (now + effectiveDuration - env.releaseTime - 0.05);
    const finalEndTime = noteOffTime !== null ? noteOffTime + env.releaseTime : now + effectiveDuration;
    const earliestReleaseTime = now + env.attack + env.decay * 0.8;
    mainInstrumentGainNode.gain.setTargetAtTime(0.0001, Math.max(earliestReleaseTime, actualReleaseStartTime), gainAutomationTimeConstant > 0.001 ? gainAutomationTimeConstant : 0.001);
    mainInstrumentGainNode.connect(masterGainNode);
    if (keyElement) { keyElement.classList.add("playing"); setTimeout(() => { if (keyElement) keyElement.classList.remove("playing"); }, (finalEndTime - now) * 1000 * 0.98); }
    const noteInstanceData = { id: uniqueNodeId, instrumentGain: mainInstrumentGainNode, oscillators: createdOscillators, filters: createdFilters, lfo: lfoNodeThisInstance, lfoGain: lfoGainNodeThisInstance, settingsKey: instrumentName, stopTime: finalEndTime, nodesForCleanup: nodesToCleanUpThisNote };
    activeInstrumentNodes.set(uniqueNodeId, noteInstanceData);
    setTimeout(() => { noteInstanceData.nodesForCleanup.forEach(node => { if (node && typeof node.disconnect === 'function') { try { node.disconnect(); } catch (e) { } } }); activeInstrumentNodes.delete(uniqueNodeId); if (settings.canBeSidechained) activeInstrumentNodes.delete(uniqueNodeId); }, (finalEndTime - now + 0.3) * 1000);
    return mainInstrumentGainNode;
}

function updateActiveLFOs() {
    if (!audioContext || !ui.instrumentSelector || !ui.lfoActiveCheckbox) return;
    const now = audioContext.currentTime;
    const instrumentName = ui.instrumentSelector.value;
    const currentUiSettings = instrumentSettings[instrumentName];
    if (!currentUiSettings || !currentUiSettings.lfoDefaults) { if (ui.lfoControlsDiv) ui.lfoControlsDiv.style.display = 'none'; return; }
    if (ui.lfoControlsDiv) ui.lfoControlsDiv.style.display = 'block';

    const isActive = ui.lfoActiveCheckbox.checked;
    const waveform = ui.lfoWaveformSelector.value;
    const rate = parseFloat(ui.lfoRateSlider.value);
    const depth = parseFloat(ui.lfoDepthSlider.value);
    const target = ui.lfoTargetSelector.value;

    currentUiSettings.lfoDefaults.active = isActive;
    currentUiSettings.lfoDefaults.waveform = waveform;
    currentUiSettings.lfoDefaults.rate = rate;
    currentUiSettings.lfoDefaults.depth = depth;
    currentUiSettings.lfoDefaults.target = target;
    if (ui.lfoRateValue) ui.lfoRateValue.textContent = `${rate.toFixed(1)}Hz`;
    if (ui.lfoDepthValue) ui.lfoDepthValue.textContent = depth;

    activeInstrumentNodes.forEach(noteInstance => {
        if (noteInstance.settingsKey === instrumentName && noteInstance.lfo && noteInstance.lfoGain) {
            if (isActive) {
                if (noteInstance.lfo.type !== waveform) noteInstance.lfo.type = waveform;
                noteInstance.lfo.frequency.setTargetAtTime(rate, now, 0.01);
                noteInstance.lfoGain.gain.setTargetAtTime(depth, now, 0.01);
                try { noteInstance.lfoGain.disconnect(); } catch (e) { } // Disconnect before reconnecting to new target
                if (target === 'pitch' && noteInstance.oscillators) {
                    noteInstance.oscillators.forEach(osc => { try { noteInstance.lfoGain.connect(osc.detune); } catch (e) { console.warn("LFO->osc detune error", e) } });
                } else if (target === 'filter_freq' && noteInstance.filters && noteInstance.filters.length > 0) {
                    noteInstance.filters.forEach(filt => { try { noteInstance.lfoGain.connect(filt.frequency); } catch (e) { console.warn("LFO->filter freq error", e) } });
                } else if (target === 'amplitude' && noteInstance.instrumentGain) {
                    try { noteInstance.lfoGain.connect(noteInstance.instrumentGain.gain); } catch (e) { console.warn("LFO->main gain error", e) }
                }
            } else {
                noteInstance.lfoGain.gain.setTargetAtTime(0, now, 0.01); // Set depth to 0 if LFO is inactive
            }
        }
    });
}

// --- ドラムサウンド & ノイズ & シーケンサー ---
function playDrumSound(type, velocity = 1.0) {
    if (!audioContext || !masterGainNode) { ui.statusElement.innerText = "Audio system not ready."; return; }
    if (audioContext.state === "suspended") {
        audioContext.resume().catch(err => console.error("Resume error:", err));
        if (audioContext.state === "suspended") { ui.statusElement.innerText = "Audio suspended."; return; }
    }
    const now = audioContext.currentTime;
    let finalOutputNode; const gainNode = audioContext.createGain();
    try {
        if (type === "kick") {
            const osc = audioContext.createOscillator();
            osc.type = 'sine'; osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
            gainNode.gain.setValueAtTime(0, now); gainNode.gain.linearRampToValueAtTime(0.7 * velocity, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
            osc.connect(gainNode); finalOutputNode = gainNode; osc.start(now); osc.stop(now + 0.25);
            triggerSidechain(velocity);
        } else if (type === "snare") {
            const noise = createNoiseBufferSource('white', 0.15); const osc = audioContext.createOscillator(); osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1); const noiseGain = audioContext.createGain(); noiseGain.gain.value = 0.6; const oscGain = audioContext.createGain(); oscGain.gain.value = 0.4;
            if (noise) noise.connect(noiseGain).connect(gainNode); osc.connect(oscGain).connect(gainNode); gainNode.gain.setValueAtTime(0, now); gainNode.gain.linearRampToValueAtTime(0.6 * velocity, now + 0.005); gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
            finalOutputNode = gainNode; if (noise) noise.start(now); osc.start(now); osc.stop(now + 0.15);
        }
        else if (type === "hihat_closed" || type === "hihat_open") {
            const duration = type === "hihat_closed" ? 0.05 : 0.3; const noise = createNoiseBufferSource('white', duration);
            if (!noise) { console.error("Failed to create hihat noise source"); return; } const hipass = audioContext.createBiquadFilter(); hipass.type = 'highpass';
            hipass.frequency.value = 8000;
            gainNode.gain.setValueAtTime(0, now); gainNode.gain.linearRampToValueAtTime(0.25 * velocity, now + 0.002); gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration - 0.01);
            noise.connect(hipass).connect(gainNode); finalOutputNode = gainNode; noise.start(now);
        }
        else if (type === "clap") {
            const mainClapGain = audioContext.createGain();
            for (let i = 0; i < 3; i++) {
                const noise = createNoiseBufferSource('white', 0.06 + Math.random() * 0.02);
                if (!noise) continue;
                const bandpass = audioContext.createBiquadFilter(); bandpass.type = 'bandpass';
                bandpass.frequency.value = 1000 + Math.random() * 1000; bandpass.Q.value = 10 + Math.random() * 5;
                const clapGain = audioContext.createGain();
                clapGain.gain.setValueAtTime(0, now + i * 0.005);
                clapGain.gain.linearRampToValueAtTime(0.4, now + i * 0.005 + 0.002);
                clapGain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.005 + 0.05 + Math.random() * 0.02);
                noise.connect(bandpass).connect(clapGain).connect(mainClapGain);
                noise.start(now + i * 0.005);
            }
            mainClapGain.gain.value = velocity; finalOutputNode = mainClapGain;
        }
        else if (type === "cymbal_crash" || type === "cymbal_ride") {
            const fundamental = type === "cymbal_crash" ? 250 : 350; const ratios = [1, 1.618, 2.3, 3.5, 4.8, 5.5]; let totalInitialGain = 0; for (let i = 0; i < ratios.length; i++) {
                const osc = audioContext.createOscillator();
                osc.type = 'square';
                osc.frequency.value = fundamental * ratios[i] * (1 + (Math.random() - 0.5) * 0.03); const oscGain = audioContext.createGain();
                const initialGain = 0.1 / (i * 0.5 + 1); totalInitialGain += initialGain;
                oscGain.gain.setValueAtTime(initialGain, now); oscGain.gain.exponentialRampToValueAtTime(0.0001, now + (type === "cymbal_crash" ? 2.0 : 1.5) * (1 + Math.random() * 0.2));
                osc.connect(oscGain).connect(gainNode);
                osc.start(now); osc.stop(now + (type === "cymbal_crash" ? 2.6 : 1.9));
            }
            const noise = createNoiseBufferSource('white', type === "cymbal_crash" ? 1.2 : 0.6);
            if (noise) {
                const noiseGain = audioContext.createGain(); noiseGain.gain.value = 0.03; totalInitialGain += noiseGain.gain.value;
                noise.connect(noiseGain).connect(gainNode);
                noise.start(now);
            }
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.4 / (Math.sqrt(totalInitialGain) || 1) * velocity, now + 0.01); gainNode.gain.exponentialRampToValueAtTime(0.0001, now + (type === "cymbal_crash" ? 2.4 : 1.7)); finalOutputNode = gainNode;
        }
        else if (type === "tom_low") {
            const osc = audioContext.createOscillator(); osc.type = 'sine';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.2); gainNode.gain.setValueAtTime(0, now); gainNode.gain.linearRampToValueAtTime(0.6 * velocity, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3); osc.connect(gainNode); finalOutputNode = gainNode; osc.start(now); osc.stop(now + 0.35);
        }
        if (finalOutputNode) {
            finalOutputNode.connect(masterGainNode);
            setTimeout(() => {
                if (finalOutputNode && typeof finalOutputNode.disconnect === 'function') {
                    try { finalOutputNode.disconnect(); } catch (e) { }
                }
            }, (type.includes("cymbal") ? 2700 : (type === "kick" || type === "snare" || type === "tom_low" ? 500 : 350)));
        }
    } catch (e) {
        console.error(`Error playing drum sound ${type}:`, e);
        if (ui.statusElement) ui.statusElement.innerText = `Drum sound error: ${e.message}`;
    }
}
function createNoiseBufferSource(type, duration) { if (!audioContext) return null; const bufferSize = Math.max(1, Math.floor(audioContext.sampleRate * duration)); if (bufferSize <= 0) { console.warn("Invalid duration for noise buffer"); return null; } try { const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate); const output = buffer.getChannelData(0); let lastOut = 0; for (let i = 0; i < bufferSize; i++) { if (type === 'white') { output[i] = Math.random() * 2 - 1; } else if (type === 'pink') { const white = Math.random() * 2 - 1; output[i] = (0.99886 * lastOut + white * 0.0555179 + 0.99332 * lastOut + white * 0.0750759 + 0.96900 * lastOut + white * 0.1538520 + white * 0.145180) * 0.08; lastOut = output[i]; } else if (type === 'brown') { const white = Math.random() * 2 - 1; output[i] = (lastOut + (0.02 * white)) / 1.02; lastOut = output[i]; output[i] *= 3.0; } output[i] = Math.max(-1, Math.min(1, output[i])); } const noiseSource = audioContext.createBufferSource(); noiseSource.buffer = buffer; return noiseSource; } catch (e) { console.error("Error creating noise buffer:", e); return null; } }
function playNoise() { ensureGlobalAudioUnmuted(); if (!audioContext || !masterGainNode) { ui.statusElement.innerText = "Audio system not ready."; return; } if (audioContext.state === "suspended") { audioContext.resume().catch(err => console.error(err)); if (audioContext.state === "suspended") { ui.statusElement.innerText = "Audio Suspended"; return; } } if (currentNoiseNodes.source) { try { currentNoiseNodes.source.stop(0); currentNoiseNodes.source.disconnect(); } catch (e) { } } if (currentNoiseNodes.filter) currentNoiseNodes.filter.disconnect(); if (currentNoiseNodes.gain) currentNoiseNodes.gain.disconnect(); const type = ui.noiseTypeSelector.value; const duration = parseFloat(ui.noiseDurationInput.value); const filterCutoff = parseFloat(ui.noiseFilterCutoffInput.value); currentNoiseNodes.source = createNoiseBufferSource(type, duration); if (!currentNoiseNodes.source) { ui.statusElement.innerText = "Noise source creation failed."; return; } currentNoiseNodes.filter = audioContext.createBiquadFilter(); currentNoiseNodes.filter.type = "lowpass"; currentNoiseNodes.filter.frequency.setValueAtTime(filterCutoff, audioContext.currentTime); currentNoiseNodes.filter.Q.value = 1; currentNoiseNodes.gain = audioContext.createGain(); currentNoiseNodes.gain.gain.setValueAtTime(0, audioContext.currentTime); currentNoiseNodes.gain.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.01); currentNoiseNodes.gain.gain.setTargetAtTime(0, audioContext.currentTime + duration - 0.05, 0.015); currentNoiseNodes.source.connect(currentNoiseNodes.filter).connect(currentNoiseNodes.gain).connect(masterGainNode); try { currentNoiseNodes.source.start(0); currentNoiseNodes.source.stop(audioContext.currentTime + duration); } catch (e) { console.error("Error starting/stopping noise:", e); ui.statusElement.innerText = "Noise playback error."; currentNoiseNodes = { source: null, filter: null, gain: null }; return; } ui.statusElement.innerText = `${type.charAt(0).toUpperCase() + type.slice(1)} noise (LPF @ ${filterCutoff}Hz).`; currentNoiseNodes.source.onended = () => { if (currentNoiseNodes.filter) currentNoiseNodes.filter.disconnect(); if (currentNoiseNodes.gain) currentNoiseNodes.gain.disconnect(); currentNoiseNodes = { source: null, filter: null, gain: null }; }; }
function buildSequencerUI() {
    if (!ui.sequencerTracksContainer) return;
    ui.sequencerTracksContainer.innerHTML = '';
    sequencerTracks.forEach((track, trackIndex) => {
        const trackDiv = document.createElement('div'); trackDiv.classList.add('sequencer-track');
        const trackHeader = document.createElement('div'); trackHeader.classList.add('track-header');
        const trackNameLabel = document.createElement('span'); trackNameLabel.classList.add('track-name'); trackNameLabel.textContent = track.name;
        trackNameLabel.style.color = track.color;

        trackHeader.appendChild(trackNameLabel); const trackControlsMini = document.createElement('div');
        trackControlsMini.classList.add('track-controls-mini');
        const muteButton = document.createElement('button');
        muteButton.textContent = track.mute ? "Unmute" : "Mute"; muteButton.title = "Mute/Unmute Track"; muteButton.onclick = () => { track.mute = !track.mute; muteButton.textContent = track.mute ? "Unmute" : "Mute"; muteButton.style.opacity = track.mute ? 0.6 : 1; updateAllTrackGains(); }; const soloButton = document.createElement('button');
        soloButton.textContent = track.solo ? "Unsolo" : "Solo"; soloButton.title = "Solo/Unsolo Track"; soloButton.onclick = () => {
            track.solo = !track.solo; soloButton.textContent = track.solo ? "Unsolo" : "Solo"; soloButton.style.backgroundColor = track.solo ? "#fdd835" : (track.mute ? "#78909c" : "#5c6bc0");
            sequencerTracks.forEach(t => {
                if (t !== track && track.solo) t.wasMutedBySolo = t.mute; else if (t !== track && !track.solo && t.wasMutedBySolo) t.mute = true;
                t.wasMutedBySolo = track.solo && t !== track ? true : false;
            }); updateAllTrackGains();
        };
        trackControlsMini.appendChild(muteButton); trackControlsMini.appendChild(soloButton); trackHeader.appendChild(trackControlsMini);
        trackDiv.appendChild(trackHeader); const grid = document.createElement('div');
        grid.classList.add('step-sequencer-grid'); grid.dataset.trackIndex = trackIndex; for (let i = 0; i < NUM_STEPS; i++) {
            const stepButton = document.createElement('button');
            stepButton.classList.add('step-button'); stepButton.dataset.step = i;
            if (track.instrument.includes("bass") || track.instrument.includes("lead")) {
                if (track.pattern[i]) {
                    stepButton.classList.add('active');
                    stepButton.textContent = track.pattern[i].note ? track.pattern[i].note.slice(0, -1) : 'ON';
                } stepButton.onclick = () => toggleSequencerStepPitch(trackIndex, i, stepButton);
            }
            else {
                if (track.pattern[i]) stepButton.classList.add('active'); stepButton.onclick = () => toggleSequencerStep(trackIndex, i, stepButton);

            } grid.appendChild(stepButton);
        } trackDiv.appendChild(grid); ui.sequencerTracksContainer.appendChild(trackDiv);
    });
}
function toggleSequencerStep(trackIndex, stepIndex, button) { sequencerTracks[trackIndex].pattern[stepIndex] = !sequencerTracks[trackIndex].pattern[stepIndex]; button.classList.toggle('active'); }
function toggleSequencerStepPitch(trackIndex, stepIndex, button) {
    const track = sequencerTracks[trackIndex];
    const currentPattern = track.pattern[stepIndex];
    if (currentPattern) {
        track.pattern[stepIndex] = null; button.classList.remove('active');
        button.textContent = '';
    }
    else {
        const noteToSet = track.defaultNote;
        track.pattern[stepIndex] = { note: noteToSet, velocity: 1.0, duration: (60 / parseFloat(ui.masterBpmInput.value) / 4) * 0.9 };
        button.classList.add('active');
        button.textContent = noteToSet.slice(0, -1);
    }
}
function playSequencerStep() { if (!isMasterPlaying || !audioContext) return; const masterBpm = parseFloat(ui.masterBpmInput.value); if (masterBpm <= 0) return; const allStepButtons = ui.sequencerTracksContainer.querySelectorAll('.step-button'); allStepButtons.forEach(btn => btn.classList.remove('playing')); sequencerTracks.forEach((track, trackIndex) => { updateAllTrackGains(); const currentTrackGrid = ui.sequencerTracksContainer.querySelector(`.step-sequencer-grid[data-track-index="${trackIndex}"]`); if (currentTrackGrid) { const currentStepButton = currentTrackGrid.querySelector(`.step-button[data-step="${currentBeat % NUM_STEPS}"]`); if (currentStepButton) currentStepButton.classList.add('playing'); } const stepData = track.pattern[currentBeat % NUM_STEPS]; if (stepData) { const instrumentName = track.instrument; const settings = instrumentSettings[instrumentName]; if (settings?.isDrum) { playDrumSound(settings.drumType, typeof stepData === 'object' ? stepData.velocity : 1.0); } else if (typeof stepData === 'object' && stepData.note) { const freq = getFrequencyFromIndex(getNoteIndex(stepData.note), settings?.octaveOffset || 0); if (freq !== null) { if (!track.gainNode) { track.gainNode = audioContext.createGain(); track.gainNode.connect(masterGainNode); } const isAnySoloed = sequencerTracks.some(t => t.solo); const playThisTrackSound = (!track.mute || track.solo) && (!isAnySoloed || track.solo); if (playThisTrackSound) { track.gainNode.gain.value = 1.0 * (stepData.velocity || 1.0); playInstrumentNote(freq, instrumentName, stepData.duration, null, "staccato", audioContext.currentTime + stepData.duration, track.gainNode); } else { track.gainNode.gain.value = 0; } } } } }); currentBeat++; }
function updateAllTrackGains() {
    const isAnyTrackSoloed = sequencerTracks.some(t => t.solo);
    sequencerTracks.forEach(track => {
        if (track.gainNode && audioContext) {
            let targetGain = 1.0;
            if (track.mute && !track.solo) targetGain = 0;
            if (isAnyTrackSoloed && !track.solo) targetGain = 0;
            track.gainNode.gain.setTargetAtTime(targetGain, audioContext.currentTime, 0.005);
        }
    });
} // 少し滑らかに
function masterPlayLoop() { if (!isMasterPlaying) { clearTimeout(masterPlayIntervalId); masterPlayIntervalId = null; if (ui.sequencerTracksContainer) ui.sequencerTracksContainer.querySelectorAll('.step-button.playing').forEach(btn => btn.classList.remove('playing')); return; } playSequencerStep(); const bpm = parseFloat(ui.masterBpmInput.value); if (bpm <= 0) { isMasterPlaying = false; return; } const sixteenthNoteDurationMs = (60 / bpm / 4) * 1000; masterPlayIntervalId = setTimeout(masterPlayLoop, sixteenthNoteDurationMs); }
function toggleMasterPlay() {
    if (!audioContext) { ui.statusElement.innerText = "Audio not ready"; return; }
    if (isMasterPlaying) { isMasterPlaying = false; clearTimeout(masterPlayIntervalId); masterPlayIntervalId = null; ui.toggleSequencerButton.textContent = "シーケンサー開始"; ui.toggleSequencerButton.classList.remove("sequencer-active"); ui.statusElement.innerText = "全体停止"; if (ui.sequencerTracksContainer) ui.sequencerTracksContainer.querySelectorAll('.step-button.playing').forEach(btn => btn.classList.remove('playing')); }
    else { ensureGlobalAudioUnmuted(); isMasterPlaying = true; currentBeat = 0; ui.toggleSequencerButton.textContent = "シーケンサー停止"; ui.toggleSequencerButton.classList.add("sequencer-active"); ui.statusElement.innerText = `全体再生中 (BPM: ${ui.masterBpmInput.value})`; ui.sequencerBpmDisplay.value = ui.masterBpmInput.value; masterPlayLoop(); }
}

function triggerSidechain(velocity = 1.0) { if (!audioContext || !ui.sidechainTargetSelector) return; const targetInstrumentName = ui.sidechainTargetSelector.value; const amountFactor = 1.0 - (parseFloat(ui.sidechainAmountSlider.value) * velocity); const now = audioContext.currentTime; const attack = 0.005; const hold = 0.05; const release = 0.15; const applySidechain = (gainNodeToDuck) => { if (gainNodeToDuck && gainNodeToDuck.gain) { const currentGainVal = gainNodeToDuck.gain.value; gainNodeToDuck.gain.cancelScheduledValues(now); gainNodeToDuck.gain.setValueAtTime(currentGainVal, now); gainNodeToDuck.gain.linearRampToValueAtTime(currentGainVal * amountFactor, now + attack); gainNodeToDuck.gain.linearRampToValueAtTime(currentGainVal * amountFactor, now + attack + hold); gainNodeToDuck.gain.linearRampToValueAtTime(currentGainVal, now + attack + hold + release); } }; if (targetInstrumentName === "bgm_all") { Object.values(bgmTracks).forEach(track => { if (track.isPlaying && track.gainNode) applySidechain(track.gainNode); }); } else if (targetInstrumentName !== "none") { activeInstrumentNodes.forEach((gainNode, key) => { if (key.startsWith(targetInstrumentName)) applySidechain(gainNode); }); } }

function setupMasterEffectsChain() { if (!audioContext || !masterGainNode) return; if (!masterFilterNode) masterFilterNode = audioContext.createBiquadFilter(); if (!masterDelayNode) masterDelayNode = audioContext.createDelay(2.0); if (!masterFeedbackGainNode) masterFeedbackGainNode = audioContext.createGain(); if (!masterDelayWetGainNode) masterDelayWetGainNode = audioContext.createGain(); connectMasterEffects(); }
function connectMasterEffects() {
    // Guard clause: Ensure all necessary nodes are available
    if (!audioContext || !masterGainNode || !globalMuteGainNode ||
        !mediaStreamDestinationNode || !masterFilterNode || !masterDelayNode ||
        !masterFeedbackGainNode || !masterDelayWetGainNode) {

        console.warn("connectMasterEffects: Essential audio nodes not initialized. Attempting basic connection if possible.");
        const fallbackNode = globalMuteGainNode || masterGainNode;
        if (fallbackNode && audioContext.destination && mediaStreamDestinationNode) {
            try {
                // fallbackNode が接続されている可能性のある全ての接続を解除
                fallbackNode.disconnect();
                fallbackNode.connect(audioContext.destination);
                fallbackNode.connect(mediaStreamDestinationNode);
            } catch (e) {
                console.error("Error in connectMasterEffects guard clause connection:", e);
            }
        }
        return;
    }

    // --- Disconnect existing connections before rebuilding the chain ---
    // It's crucial to disconnect in a way that doesn't leave dangling nodes
    // or break if a node wasn't connected.

    // Disconnect globalMuteGainNode from any outputs it might have
    // (which would be effects or destination if effects are bypassed)
    if (globalMuteGainNode) {
        try {
            globalMuteGainNode.disconnect();
        } catch (e) {
            // This error can happen if it was never connected, which is fine.
            // console.warn("globalMuteGainNode was not connected or error on disconnect:", e.message);
        }
    }

    // masterGainNode is always connected to globalMuteGainNode, so its disconnections
    // are implicitly handled when globalMuteGainNode is disconnected from subsequent nodes.
    // However, if masterGainNode could be connected elsewhere, disconnect it too.
    // For now, assuming masterGainNode -> globalMuteGainNode is the fixed start.

    // Disconnect effect nodes from their outputs.
    // If a node doesn't exist or isn't connected, disconnect() might throw or do nothing.
    const effectNodesToDisconnect = [
        masterFilterNode,
        masterDelayNode,
        masterFeedbackGainNode, // This is part of the delay loop, careful with order
        masterDelayWetGainNode,
        // Add any other nodes that are part of the chain and might be connected to destination
    ];

    effectNodesToDisconnect.forEach(node => {
        if (node) { // Check if the node object itself exists
            try {
                node.disconnect(); // Disconnects this node from all nodes it's connected to.
            } catch (e) {
                // This error usually means the node wasn't connected to anything.
                // console.warn(`Error disconnecting node ${node.constructor.name || 'unknown node'}: ${e.message}`);
            }
        }
    });

    // --- Rebuild the audio chain ---
    let currentNode = globalMuteGainNode; // Start of the chain after masterGainNode

    // --- Filter Stage (Serial) ---
    if (!ui.masterFilterBypassCheckbox.checked) {
        // updateMasterFilterValues(); // Called by UI event listener
        currentNode.connect(masterFilterNode);
        currentNode = masterFilterNode;
    }

    // --- Delay Stage (Parallel Mix: Dry + Wet) ---
    if (!ui.masterDelayBypassCheckbox.checked) {
        // updateMasterDelayValues(); // Called by UI event listener

        const drySignalGain = audioContext.createGain(); // Create locally, will be garbage collected
        drySignalGain.gain.value = 1.0 - parseFloat(ui.masterDelayWetSlider.value);

        currentNode.connect(drySignalGain);
        drySignalGain.connect(audioContext.destination);
        drySignalGain.connect(mediaStreamDestinationNode);

        currentNode.connect(masterDelayNode);
        // Delay's internal feedback loop
        masterDelayNode.connect(masterFeedbackGainNode);
        masterFeedbackGainNode.connect(masterDelayNode);
        // Output of the delay unit goes to the wet gain control
        masterDelayNode.connect(masterDelayWetGainNode);

        // masterDelayWetGainNode.gain.value is set by updateMasterDelayValues
        masterDelayWetGainNode.connect(audioContext.destination);
        masterDelayWetGainNode.connect(mediaStreamDestinationNode);

    } else {
        // If delay is bypassed, the signal from currentNode goes directly to destinations
        currentNode.connect(audioContext.destination);
        currentNode.connect(mediaStreamDestinationNode);
    }
    // console.log("connectMasterEffects: Chain rebuilt successfully.");
}
function updateMasterFilterValues() { if (!masterFilterNode || !audioContext) return; const type = ui.masterFilterTypeSelector.value; const freq = parseFloat(ui.masterFilterFreqSlider.value); const qVal = parseFloat(ui.masterFilterQSlider.value); const gainVal = parseFloat(ui.masterFilterGainSlider.value); masterFilterNode.type = type; masterFilterNode.frequency.setTargetAtTime(freq, audioContext.currentTime, 0.01); masterFilterNode.Q.setTargetAtTime(qVal, audioContext.currentTime, 0.01); ui.masterFilterGainSlider.disabled = !(type === "lowshelf" || type === "highshelf" || type === "peaking" || type === "notch" || type === "allpass"); if (!ui.masterFilterGainSlider.disabled) masterFilterNode.gain.setTargetAtTime(gainVal, audioContext.currentTime, 0.01); ui.masterFilterFreqValue.textContent = `${freq.toFixed(0)}Hz`; ui.masterFilterQValue.textContent = qVal.toFixed(1); ui.masterFilterGainValue.textContent = `${gainVal.toFixed(1)}dB`; }
function updateMasterDelayValues() { if (!masterDelayNode || !masterFeedbackGainNode || !masterDelayWetGainNode || !audioContext) return; const delayTime = parseFloat(ui.masterDelayTimeSlider.value); const feedback = parseFloat(ui.masterDelayFeedbackSlider.value); const wetLevel = parseFloat(ui.masterDelayWetSlider.value); masterDelayNode.delayTime.setTargetAtTime(delayTime, audioContext.currentTime, 0.01); masterFeedbackGainNode.gain.setTargetAtTime(feedback, audioContext.currentTime, 0.01); masterDelayWetGainNode.gain.setTargetAtTime(wetLevel, audioContext.currentTime, 0.01); ui.masterDelayTimeValue.textContent = `${delayTime.toFixed(2)}s`; ui.masterDelayFeedbackValue.textContent = feedback.toFixed(2); ui.masterDelayWetValue.textContent = wetLevel.toFixed(2); }
function updateMasterFilterValuesAndReconnect() { updateMasterFilterValues(); connectMasterEffects(); }
function updateMasterDelayValuesAndReconnect() { updateMasterDelayValues(); connectMasterEffects(); }

async function loadBgmFiles(event) { const files = event.target.files; if (!files.length || !audioContext) { ui.statusElement.innerText = files.length ? "オーディオが準備できていません。" : "ファイルが選択されていません。"; return; } ui.bgmPlaylistElement.innerHTML = '<li>ファイルを処理中...</li>'; ui.bgmPlaylistContainer.style.display = 'block'; let filesProcessedCount = 0; for (const file of files) { const uniqueId = `bgm-${bgmTrackIdCounter++}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`; try { const arrayBuffer = await file.arrayBuffer(); const audioBuffer = await audioContext.decodeAudioData(arrayBuffer); bgmTracks[uniqueId] = { id: uniqueId, file: file, buffer: audioBuffer, sourceNode: null, gainNode: null, isPlaying: false, loop: true, volume: 0.5, pitch: 1.0 }; filesProcessedCount++; } catch (err) { console.error(`Error decoding BGM ${file.name}:`, err); ui.statusElement.innerText = `BGM「${file.name}」のデコードエラー: ${err.message}`; } } updateBgmPlaylist(); if (filesProcessedCount > 0) { ui.statusElement.innerText = `${filesProcessedCount} BGM files added.`; } else if (Object.keys(bgmTracks).length === 0) { ui.bgmPlaylistElement.innerHTML = '<li>BGM load failed.</li>'; } ui.bgmFileInput.value = ""; }
function updateBgmPlaylist() { ui.bgmPlaylistElement.innerHTML = ""; const trackIds = Object.keys(bgmTracks); if (trackIds.length === 0) { ui.bgmPlaylistContainer.style.display = 'none'; return; } ui.bgmPlaylistContainer.style.display = 'block'; trackIds.forEach(trackId => { const track = bgmTracks[trackId]; const listItem = document.createElement('li'); listItem.classList.add('bgm-list-item'); listItem.dataset.trackId = trackId; if (track.isPlaying) listItem.classList.add('playing-bgm'); const nameSpan = document.createElement('span'); nameSpan.classList.add('filename'); nameSpan.textContent = track.file.name; listItem.appendChild(nameSpan); const controlsDiv = document.createElement('div'); controlsDiv.classList.add('bgm-item-controls'); const playPauseButton = document.createElement('button'); playPauseButton.textContent = track.isPlaying ? '❚❚' : '▶'; playPauseButton.title = track.isPlaying ? '一時停止' : '再生'; playPauseButton.onclick = () => toggleBgmPlayPause(trackId); controlsDiv.appendChild(playPauseButton); const loopLabel = document.createElement('label'); const loopCheckbox = document.createElement('input'); loopCheckbox.type = 'checkbox'; loopCheckbox.checked = track.loop; loopCheckbox.title = "ループ再生"; loopCheckbox.onchange = (e) => setBgmLoop(trackId, e.target.checked); loopLabel.appendChild(loopCheckbox); loopLabel.appendChild(document.createTextNode('L')); controlsDiv.appendChild(loopLabel); const volumeSlider = document.createElement('input'); volumeSlider.type = 'range'; volumeSlider.min = 0; volumeSlider.max = 1; volumeSlider.step = 0.01; volumeSlider.value = track.volume; volumeSlider.title = `音量: ${Math.round(track.volume * 100)}%`; volumeSlider.oninput = (e) => { setBgmVolume(trackId, parseFloat(e.target.value)); e.target.title = `音量: ${Math.round(e.target.value * 100)}%`; }; controlsDiv.appendChild(volumeSlider); const pitchSlider = document.createElement('input'); pitchSlider.type = 'range'; pitchSlider.min = 0.5; pitchSlider.max = 2; pitchSlider.step = 0.05; pitchSlider.value = track.pitch; pitchSlider.title = `ピッチ/速度: x${track.pitch.toFixed(2)}`; pitchSlider.oninput = (e) => { setBgmPitch(trackId, parseFloat(e.target.value)); e.target.title = `ピッチ/速度: x${parseFloat(e.target.value).toFixed(2)}`; }; controlsDiv.appendChild(pitchSlider); const resetButton = document.createElement('button'); resetButton.textContent = 'Reset'; resetButton.title = "設定リセット"; resetButton.onclick = () => resetBgmTrackSettings(trackId); controlsDiv.appendChild(resetButton); const deleteButton = document.createElement('button'); deleteButton.textContent = '✕'; deleteButton.title = "削除"; deleteButton.classList.add('delete-bgm'); deleteButton.onclick = () => deleteBgmTrack(trackId); controlsDiv.appendChild(deleteButton); listItem.appendChild(controlsDiv); ui.bgmPlaylistElement.appendChild(listItem); }); }
function toggleBgmPlayPause(trackId) { const track = bgmTracks[trackId]; if (!track) return; if (track.isPlaying) stopSingleBgm(trackId); else playSingleBgm(trackId); updateBgmPlaylist(); }
function playSingleBgm(trackId) { ensureGlobalAudioUnmuted(); const track = bgmTracks[trackId]; if (!track.buffer || !audioContext || !masterGainNode) { ui.statusElement.innerText = `BGM「${track?.file?.name || trackId}」再生準備エラー`; return; } stopSingleBgm(trackId); track.sourceNode = audioContext.createBufferSource(); track.sourceNode.buffer = track.buffer; track.sourceNode.loop = track.loop; track.sourceNode.playbackRate.value = track.pitch; track.gainNode = audioContext.createGain(); track.gainNode.gain.value = track.volume; track.sourceNode.connect(track.gainNode).connect(masterGainNode); track.sourceNode.start(0); track.isPlaying = true; track.sourceNode.onended = () => { if (track.isPlaying && !track.loop) { track.isPlaying = false; track.sourceNode = null; updateBgmPlaylist(); } }; ui.statusElement.innerText = `BGM「${track.file.name}」再生中。`; }
function stopSingleBgm(trackId) { const track = bgmTracks[trackId]; if (track && track.sourceNode) { try { track.sourceNode.stop(0); } catch (e) { } track.sourceNode.disconnect(); track.sourceNode = null; } if (track && track.gainNode) { try { track.gainNode.disconnect(); } catch (e) { } /* gainNodeは設定保持のためnullにしない */ } if (track) track.isPlaying = false; }
function setBgmLoop(trackId, doLoop) { const track = bgmTracks[trackId]; if (track) { track.loop = doLoop; if (track.sourceNode) track.sourceNode.loop = doLoop; } }
function setBgmVolume(trackId, volume) { const track = bgmTracks[trackId]; if (track) { track.volume = volume; if (track.gainNode) track.gainNode.gain.value = volume; } }
function setBgmPitch(trackId, pitch) { const track = bgmTracks[trackId]; if (track) { track.pitch = pitch; if (track.sourceNode) track.sourceNode.playbackRate.value = pitch; } }
function deleteBgmTrack(trackId) { stopSingleBgm(trackId); delete bgmTracks[trackId]; updateBgmPlaylist(); ui.statusElement.innerText = `BGMトラック削除。`; if (Object.keys(bgmTracks).length === 0) { ui.bgmPlaylistContainer.style.display = 'none'; } }
function resetBgmTrackSettings(trackId) { const track = bgmTracks[trackId]; if (track && audioContext) { track.volume = 0.5; track.pitch = 1.0; track.loop = true; if (track.isPlaying && track.gainNode) track.gainNode.gain.setTargetAtTime(track.volume, audioContext.currentTime, 0.01); if (track.isPlaying && track.sourceNode) { track.sourceNode.playbackRate.setTargetAtTime(track.pitch, audioContext.currentTime, 0.01); track.sourceNode.loop = track.loop; } else if (track.sourceNode) { track.sourceNode.loop = track.loop; } updateBgmPlaylist(); ui.statusElement.innerText = `BGM「${track.file.name}」設定リセット。`; } else if (!track) console.warn(`BGM track for reset not found: ${trackId}`); else ui.statusElement.innerText = "Audio not ready."; }

async function blobToAudioBuffer(blob) { if (!audioContext) throw new Error("AudioContext not ready."); const arrayBuffer = await blob.arrayBuffer(); return audioContext.decodeAudioData(arrayBuffer); }
function audioBufferToWav(buffer) { const numChan = buffer.numberOfChannels, len = buffer.length * numChan * 2 + 44, wavBuffer = new ArrayBuffer(len), view = new DataView(wavBuffer); let offset = 0; const writeString = s => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); }; writeString('RIFF'); offset += 4; view.setUint32(offset, len - 8, true); offset += 4; writeString('WAVE'); offset += 4; writeString('fmt '); offset += 4; view.setUint32(offset, 16, true); offset += 4; view.setUint16(offset, 1, true); offset += 2; view.setUint16(offset, numChan, true); offset += 2; view.setUint32(offset, buffer.sampleRate, true); offset += 4; view.setUint32(offset, buffer.sampleRate * numChan * 2, true); offset += 4; view.setUint16(offset, numChan * 2, true); offset += 2; view.setUint16(offset, 16, true); offset += 2; writeString('data'); offset += 4; view.setUint32(offset, len - offset - 4, true); offset += 4; const channels = []; for (let i = 0; i < numChan; i++) channels.push(buffer.getChannelData(i)); for (let i = 0; i < buffer.length; i++) { for (let ch = 0; ch < numChan; ch++) { let sample = Math.max(-1, Math.min(1, channels[ch][i])); view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true); offset += 2; } } return new Blob([view], { type: 'audio/wav' }); }
function audioBufferToMp3(buffer, onComplete, onError) { ui.statusElement.innerText = "MP3エンコード中..."; const sampleRate = buffer.sampleRate; const numChannels = 1; const kbps = 128; try { const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps); const pcmData = buffer.getChannelData(0); const samples = new Int16Array(pcmData.length); for (let i = 0; i < pcmData.length; i++) samples[i] = Math.max(-1, Math.min(1, pcmData[i])) * 0x7FFF; const blockSize = 1152; const mp3Data = []; for (let i = 0; i < samples.length; i += blockSize) { const sampleChunk = samples.subarray(i, Math.min(i + blockSize, samples.length)); const mp3buf = mp3encoder.encodeBuffer(sampleChunk); if (mp3buf.length > 0) mp3Data.push(mp3buf); } const finalMp3buf = mp3encoder.flush(); if (finalMp3buf.length > 0) mp3Data.push(finalMp3buf); const mp3Blob = new Blob(mp3Data.map(d => new Uint8Array(d)), { type: 'audio/mpeg' }); onComplete(mp3Blob); } catch (e) { console.error("MP3 Encoding Error:", e); onError(e); } }

async function toggleMic() {
    if (!audioContext || !masterGainNode) { ui.statusElement.innerText = "Audio system not ready."; return; }
    if (isMicActive) { if (micSourceNode) micSourceNode.disconnect(); if (micGainNode) micGainNode.disconnect(); if (micStream) micStream.getTracks().forEach(track => track.stop()); micSourceNode = null; micGainNode = null; micStream = null; isMicActive = false; ui.toggleMicButton.textContent = "マイクOFF"; ui.toggleMicButton.classList.remove("mic-active"); ui.micGainSlider.disabled = true; ui.statusElement.innerText = "Mic input stopped."; }
    else { ensureGlobalAudioUnmuted(); try { micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); micSourceNode = audioContext.createMediaStreamSource(micStream); micGainNode = audioContext.createGain(); micGainNode.gain.value = parseFloat(ui.micGainSlider.value); micSourceNode.connect(micGainNode).connect(masterGainNode); isMicActive = true; ui.toggleMicButton.textContent = "マイクON"; ui.toggleMicButton.classList.add("mic-active"); ui.micGainSlider.disabled = false; ui.statusElement.innerText = "Mic input started."; } catch (err) { console.error("Error accessing microphone:", err); ui.statusElement.innerText = `Mic access error: ${err.message}`; isMicActive = false; ui.toggleMicButton.textContent = "マイクOFF"; ui.toggleMicButton.classList.remove("mic-active"); ui.micGainSlider.disabled = true; } }
}

// --- グローバル変数 (uiオブジェクトは初期化済みとする) ---
// let ui = { /* ... 各種DOM要素への参照 ... */ };
// let audioContext = null; // AudioContextも初期化済みとする
// let masterGainNode = null; // 同上
// const instrumentSettings = { /* ... */ }; // 楽器設定も定義済みとする
// const NOTES = [/* ... */];
// const SCALE_MODE_INTERVALS = { /* ... */ };
// const CHORD_INTERVALS = { /* ... */ };
// function getNoteIndex(noteNameWithOctave) { /* ... */ }
// function getFrequencyFromIndex(noteIndex, octaveOffset = 0) { /* ... */ }
// function getScaleNotes(rootNoteName, octave, scaleModeType) { /* ... */ } // ★これが定義済みであること
// function getChordNotesWithInversion(rootNoteName, octave, chordType, inversion) { /* ... */ } // ★これが定義済みであること
// function playInstrumentNote(frequency, instrumentName, baseDurationSec, keyElement, articulation, noteOffTime, inputGainNode) { /* ... */ } // ★これが定義済みであること
function startRecording() {
    if (!audioContext || !mediaStreamDestinationNode) {
        ui.statusElement.innerText = "録音準備エラー: オーディオシステム未初期化。";
        return;
    }
    if (mediaRecorder && mediaRecorder.state === "recording") {
        ui.statusElement.innerText = "既に録音中です。";
        return;
    }

    try {
        const options = { mimeType: 'audio/webm;codecs=opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.warn(`${options.mimeType} not supported, using browser default.`);
            mediaRecorder = new MediaRecorder(mediaStreamDestinationNode.stream);
        } else {
            mediaRecorder = new MediaRecorder(mediaStreamDestinationNode.stream, options);
        }

    } catch (e) {
        console.error("MediaRecorder_Error:", e);
        ui.statusElement.innerText = `録音開始エラー: ${e.message}. サポートされているコーデックを確認してください。`;
        return;
    }

    recordedChunks = [];
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = handleRecordingStop; // handleRecordingStop がこの後定義されていることを確認
    mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event.error);
        ui.statusElement.innerText = `録音エラー: ${event.error.name} - ${event.error.message}`;
        ui.startRecordButton.disabled = false;
        ui.stopRecordButton.disabled = true;
        ui.startRecordButton.classList.remove("recording-active");
        ui.startRecordButton.textContent = "録音開始"; // Revert text on error
    };

    mediaRecorder.start();
    ui.startRecordButton.disabled = true;
    ui.stopRecordButton.disabled = false;
    ui.startRecordButton.classList.add("recording-active");
    ui.startRecordButton.textContent = "録音中...";
    ui.downloadArea.innerHTML = ""; // Clear previous downloads
    ui.statusElement.innerText = "録音開始...";
}

function stopRecordingAction() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        ui.statusElement.innerText = "録音停止中、処理しています...";
    } else {
        ui.statusElement.innerText = "録音されていません。";
    }
}

async function handleRecordingStop() {
    recordedBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
    recordedChunks = [];

    ui.startRecordButton.disabled = false;
    ui.stopRecordButton.disabled = true;
    ui.startRecordButton.classList.remove("recording-active");
    ui.startRecordButton.textContent = "録音開始";
    ui.statusElement.innerText = "録音完了。ダウンロードリンク生成中...";

    ui.downloadArea.innerHTML = "";

    const nativeUrl = URL.createObjectURL(recordedBlob);
    const nativeLink = document.createElement('a');
    nativeLink.href = nativeUrl;
    const nativeExtension = (mediaRecorder.mimeType && mediaRecorder.mimeType.includes('webm')) ? 'webm' : 'ogg';
    nativeLink.download = `recording_${Date.now()}.${nativeExtension}`;
    nativeLink.textContent = `録音 (${nativeExtension.toUpperCase()}) ダウンロード`;
    ui.downloadArea.appendChild(nativeLink);
    ui.downloadArea.appendChild(document.createElement('br'));

    try {
        const audioBuffer = await blobToAudioBuffer(recordedBlob); // blobToAudioBuffer が定義済みであること

        const wavBlob = audioBufferToWav(audioBuffer); // audioBufferToWav が定義済みであること
        const wavUrl = URL.createObjectURL(wavBlob);
        const wavLink = document.createElement('a');
        wavLink.href = wavUrl;
        wavLink.download = `recording_${Date.now()}.wav`;
        wavLink.textContent = "録音 (WAV) ダウンロード";
        ui.downloadArea.appendChild(wavLink);
        ui.downloadArea.appendChild(document.createElement('br'));

        if (typeof lamejs !== 'undefined') {
            audioBufferToMp3(audioBuffer, (mp3Blob) => { // audioBufferToMp3 が定義済みであること
                const mp3Url = URL.createObjectURL(mp3Blob);
                const mp3Link = document.createElement('a');
                mp3Link.href = mp3Url;
                mp3Link.download = `recording_${Date.now()}.mp3`;
                mp3Link.textContent = "録音 (MP3) ダウンロード";
                ui.downloadArea.appendChild(mp3Link);
                ui.statusElement.innerText = "録音完了。ダウンロードリンク生成済み。";
            }, (err) => {
                console.error("MP3 conversion error:", err);
                ui.statusElement.innerText = `録音完了。MP3変換エラー: ${err.message}`;
            });
        } else {
            const mp3Info = document.createElement('span');
            mp3Info.textContent = "(MP3エクスポートにはlamejsライブラリが必要です)";
            mp3Info.style.fontSize = "0.8em";
            mp3Info.style.marginLeft = "10px";
            ui.downloadArea.appendChild(mp3Info);
            ui.statusElement.innerText = "録音完了。WAVダウンロードリンク生成済み。";
        }

    } catch (e) {
        console.error("Error processing recorded blob:", e);
        ui.statusElement.innerText = `録音処理エラー: ${e.message}`;
        const errorFallbackLink = document.createElement('a');
        errorFallbackLink.href = nativeUrl;
        errorFallbackLink.download = `recording_error_${Date.now()}.${nativeExtension}`;
        errorFallbackLink.textContent = `録音 (RAW ${nativeExtension.toUpperCase()}) ダウンロード (処理エラー発生)`;
        ui.downloadArea.appendChild(document.createElement('br'));
        ui.downloadArea.appendChild(errorFallbackLink);
    }
}

// --- スケール/モード表示機能 ---
function showScaleModeOnPiano() {
    if (!ui.pianoContainer || !ui.rootNoteSelector || !ui.scaleModeSelector || !ui.octaveSelector || !ui.statusElement) {
        console.error("showScaleModeOnPiano: Required UI elements are not initialized.");
        return;
    }

    // まず全ての鍵盤の既存のスケールハイライトを解除
    const existingHighlights = ui.pianoContainer.querySelectorAll(".key.scale-highlight");
    existingHighlights.forEach(keyEl => {
        keyEl.classList.remove("scale-highlight");
        // keyEl.style.backgroundColor = ""; // CSSで通常の色に戻るようにする方が良い
    });

    const rootNote = ui.rootNoteSelector.value;
    const scaleModeType = ui.scaleModeSelector.value;
    const baseOctaveForDisplay = parseInt(ui.octaveSelector.value); // 鍵盤表示の基準オクターブ

    if (!rootNote || !scaleModeType || isNaN(baseOctaveForDisplay)) {
        ui.statusElement.innerText = "スケール表示のための情報が不足しています。";
        return;
    }

    const allScaleNotesOnVisibleKeyboard = new Set();

    // 鍵盤に表示されているオクターブ範囲のスケール音を計算
    // (buildPianoUIで表示しているオクターブ数に合わせる。ここでは仮に2オクターブとする)
    const numDisplayedOctaves = 2;
    for (let octOffset = 0; octOffset < numDisplayedOctaves; octOffset++) {
        const currentOctaveForScaleCalc = baseOctaveForDisplay + octOffset;
        const notesInThisOctave = getScaleNotes(rootNote, currentOctaveForScaleCalc, scaleModeType);
        if (notesInThisOctave) {
            notesInThisOctave.forEach(note => allScaleNotesOnVisibleKeyboard.add(note));
        }
    }
    // さらに1オクターブ上も考慮する場合 (buildPianoUIの実装による)
    const nextOctaveNotes = getScaleNotes(rootNote, baseOctaveForDisplay + numDisplayedOctaves, scaleModeType);
    if (nextOctaveNotes) {
        nextOctaveNotes.forEach(note => {
            // 鍵盤表示範囲内に収まるものだけ追加 (例: C5までならC5を含む)
            const noteIdx = getNoteIndex(note);
            const maxNoteIdxOnKeyboard = getNoteIndex(NOTES[NOTES.length - 1] + (baseOctaveForDisplay + numDisplayedOctaves)); // 表示される最後の音のインデックス
            if (noteIdx !== null && maxNoteIdxOnKeyboard !== null && noteIdx <= maxNoteIdxOnKeyboard) { // 鍵盤の最後の音まで
                allScaleNotesOnVisibleKeyboard.add(note);
            }
        });
    }


    if (allScaleNotesOnVisibleKeyboard.size === 0 && SCALE_MODE_INTERVALS[scaleModeType]) {
        // スケール定義はあるが、表示範囲内に該当ノートがなかった場合
        ui.statusElement.innerText = `「${rootNote.replace("#", "♯")} ${ui.scaleModeSelector.options[ui.scaleModeSelector.selectedIndex].text}」の構成音が現在の鍵盤範囲にありません。`;
        return;
    } else if (allScaleNotesOnVisibleKeyboard.size === 0) {
        ui.statusElement.innerText = "スケール構成音の取得に失敗しました。";
        return;
    }


    const selectedScaleText = ui.scaleModeSelector.options[ui.scaleModeSelector.selectedIndex].text;
    ui.statusElement.innerText = `表示中: ${rootNote.replace("#", "♯")} ${selectedScaleText}`;

    allScaleNotesOnVisibleKeyboard.forEach(noteToHighlight => {
        // querySelectorで属性値にシャープや数字が含まれる場合、エスケープが必要なことがあるが、
        // datasetなので通常は大丈夫。ただし、CSSセレクタとして使う場合は注意。
        // const keyEl = document.querySelector(`.key[data-note="${noteToHighlight}"]`);
        // より安全なのは、全キーをループして data-note を比較する
        const keys = ui.pianoContainer.querySelectorAll('.key');
        keys.forEach(keyEl => {
            if (keyEl.dataset.note === noteToHighlight) {
                keyEl.classList.add("scale-highlight");
            }
        });
    });
}


// --- コード演奏機能 ---
function playChordAction() {
    if (!audioContext) {
        if (ui.statusElement) ui.statusElement.innerText = "オーディオを有効化してください。";
        return;
    }
    if (!ui.rootNoteSelector || !ui.chordTypeSelector || !ui.octaveSelector || !ui.inversionSelector || !ui.instrumentSelector || !ui.articulationSelector || !ui.statusElement) {
        console.error("playChordAction: Required UI elements are not initialized.");
        return;
    }

    const rootNote = ui.rootNoteSelector.value;
    const chordType = ui.chordTypeSelector.value;
    const octave = parseInt(ui.octaveSelector.value);
    const inversion = parseInt(ui.inversionSelector.value);
    const instrumentName = ui.instrumentSelector.value;
    const articulation = ui.articulationSelector.value;

    if (!rootNote || !chordType || isNaN(octave) || isNaN(inversion) || !instrumentName || !articulation) {
        ui.statusElement.innerText = "コード演奏のための情報が不足しています。";
        return;
    }

    const chordNotes = getChordNotesWithInversion(rootNote, octave, chordType, inversion);

    if (!chordNotes || chordNotes.length === 0) {
        ui.statusElement.innerText = `コード「${rootNote.replace("#", "♯")}${chordType} Inv:${inversion}」を構成できませんでした。`;
        return;
    }

    const baseIntervals = CHORD_INTERVALS[chordType];
    const numNotesInChord = baseIntervals ? baseIntervals.length : 0;
    let infoMessage = "";
    if (inversion >= numNotesInChord && numNotesInChord > 0) {
        infoMessage = ` (注意: ${numNotesInChord}音コードに第${inversion}転回は無効。基本形に近い形で演奏されます。)`;
    }

    const statusTextNotes = chordNotes.map(n => n.replace("#", "♯"));
    const chordTypeName = ui.chordTypeSelector.options[ui.chordTypeSelector.selectedIndex]?.text || chordType;
    const inversionText = ui.inversionSelector.options[ui.inversionSelector.selectedIndex]?.text || `Inv ${inversion}`;
    ui.statusElement.innerText = `コード演奏: ${rootNote.replace("#", "♯")}${chordTypeName} (${inversionText}) [${statusTextNotes.join(', ')}] (${articulation})${infoMessage}`;

    chordNotes.forEach(noteStr => {
        const noteIndex = getNoteIndex(noteStr);
        if (noteIndex === null) {
            console.warn(`Invalid note in chord: ${noteStr}`);
            return; // このノートはスキップ
        }
        const settings = instrumentSettings[instrumentName];
        const freq = getFrequencyFromIndex(noteIndex, settings?.octaveOffset || 0);
        if (freq === null) {
            console.warn(`Could not get frequency for note: ${noteStr}`);
            return; // このノートはスキップ
        }

        // 鍵盤要素を探してハイライト (オプショナル)
        let keyElToHighlight = null;
        if (ui.pianoContainer) {
            const keys = ui.pianoContainer.querySelectorAll('.key');
            keys.forEach(keyEl => {
                if (keyEl.dataset.note === noteStr) {
                    keyElToHighlight = keyEl;
                }
            });
        }
        playInstrumentNote(freq, instrumentName, 1.5, keyElToHighlight, articulation);
    });
}

function stopArpeggioPlayback() {
    if (arpeggioTimeoutId) {
        clearTimeout(arpeggioTimeoutId);
        arpeggioTimeoutId = null;
    }
    arpeggioActive = false;
    currentArpeggioNotes = [];
    currentArpeggioIndex = 0;
    if (ui.statusElement) {
        // 他の操作でステータスが上書きされる可能性があるので、
        // 停止時は明示的にメッセージを出すか、あるいは出さないか選択
        // ui.statusElement.innerText = "アルペジオ停止";
    }
    // 演奏中の鍵盤ハイライトを消す (もしあれば)
    if (ui.pianoContainer) {
        ui.pianoContainer.querySelectorAll(".key.playing").forEach(el => el.classList.remove("playing"));
    }
    if (ui.playArpeggioButton) ui.playArpeggioButton.textContent = "アルペジオ演奏";
    if (ui.playArpeggioButton) ui.playArpeggioButton.classList.remove("sequencer-active"); // アクティブ風クラスがあれば解除
}

function playNextArpeggioNote() {
    if (!arpeggioActive || currentArpeggioNotes.length === 0 || !audioContext) {
        stopArpeggioPlayback(); // 何らかの理由で継続できない場合は停止
        return;
    }

    if (currentArpeggioIndex >= currentArpeggioNotes.length) {
        currentArpeggioIndex = 0; // ループ再生
        // ループしない場合はここで stopArpeggioPlayback(); return;
    }

    const noteStringToPlay = currentArpeggioNotes[currentArpeggioIndex];
    if (!noteStringToPlay) {
        console.warn("Arpeggio: Invalid note string at index", currentArpeggioIndex);
        currentArpeggioIndex++; // 次のノートへ
        arpeggioTimeoutId = setTimeout(playNextArpeggioNote, 10); // すぐに次へ (エラー回避)
        return;
    }

    const noteIndexToPlay = getNoteIndex(noteStringToPlay);
    if (noteIndexToPlay === null) {
        console.warn(`Arpeggio: Could not get note index for ${noteStringToPlay}`);
        currentArpeggioIndex++;
        arpeggioTimeoutId = setTimeout(playNextArpeggioNote, 10);
        return;
    }

    const instrumentName = ui.instrumentSelector.value;
    const settings = instrumentSettings[instrumentName];
    const frequencyToPlay = getFrequencyFromIndex(noteIndexToPlay, settings?.octaveOffset || 0);

    if (frequencyToPlay === null) {
        console.warn(`Arpeggio: Could not get frequency for ${noteStringToPlay}`);
        currentArpeggioIndex++;
        arpeggioTimeoutId = setTimeout(playNextArpeggioNote, 10);
        return;
    }

    // アルペジオの各音の長さ（例: 16分音符の90%）
    const bpm = parseFloat(ui.arpeggioBpmInput.value) || 120;
    const sixteenthNoteDuration = (60 / bpm / 4); // 16分音符の基本長 (秒)
    const noteDuration = sixteenthNoteDuration * 0.9; // 少し短くして歯切れよく

    let keyElementToHighlight = null;
    if (ui.pianoContainer) {
        keyElementToHighlight = ui.pianoContainer.querySelector(`.key[data-note='${noteStringToPlay}']`);
    }

    // アルペジオではスタッカート気味にするか、アーティキュレーション設定に従うか選択可能
    // ここでは簡略化のため、アーティキュレーション設定は無視し、短い音で再生
    playInstrumentNote(frequencyToPlay, instrumentName, noteDuration, keyElementToHighlight, "staccato");

    currentArpeggioIndex++;

    const delayMs = sixteenthNoteDuration * 1000; // 次の16分音符までの時間

    arpeggioTimeoutId = setTimeout(playNextArpeggioNote, delayMs);
}

function playArpeggioAction() {
    ensureGlobalAudioUnmuted();
    if (!audioContext) {
        if (ui.statusElement) ui.statusElement.innerText = "オーディオを有効化してください。";
        return;
    }
    if (!ui.rootNoteSelector || !ui.chordTypeSelector || !ui.octaveSelector || !ui.inversionSelector ||
        !ui.arpeggioPatternSelector || !ui.arpeggioBpmInput || !ui.instrumentSelector || !ui.statusElement) {
        console.error("playArpeggioAction: Required UI elements are not initialized.");
        if (ui.statusElement) ui.statusElement.innerText = "UI初期化エラー。";
        return;
    }

    stopArpeggioPlayback(); // 既存のアルペジオがあれば停止
    arpeggioActive = true;

    const rootNote = ui.rootNoteSelector.value;
    const chordType = ui.chordTypeSelector.value;
    const octave = parseInt(ui.octaveSelector.value);
    const inversion = parseInt(ui.inversionSelector.value);
    const pattern = ui.arpeggioPatternSelector.value;
    const bpm = parseFloat(ui.arpeggioBpmInput.value);

    if (isNaN(octave) || isNaN(inversion) || isNaN(bpm) || bpm <= 0) {
        ui.statusElement.innerText = "アルペジオ設定が無効です (オクターブ、転回、BPM)。";
        arpeggioActive = false;
        return;
    }

    const baseChordNotes = getChordNotesWithInversion(rootNote, octave, chordType, inversion);

    if (!baseChordNotes || baseChordNotes.length === 0) {
        ui.statusElement.innerText = "アルペジオの元になるコードを構成できませんでした。";
        arpeggioActive = false;
        return;
    }

    if (pattern === "up") {
        currentArpeggioNotes = [...baseChordNotes];
    } else if (pattern === "down") {
        currentArpeggioNotes = [...baseChordNotes].reverse();
    } else if (pattern === "up_down") {
        // 真ん中の音を重複させずに上昇下降 (例: C E G E)
        currentArpeggioNotes = [...baseChordNotes];
        if (baseChordNotes.length > 2) { // 3音以上ないと意味がない
            currentArpeggioNotes = currentArpeggioNotes.concat([...baseChordNotes.slice(0, -1)].reverse().slice(0, -1));
        } else if (baseChordNotes.length === 2) { // 2音なら単純往復
            currentArpeggioNotes = currentArpeggioNotes.concat([...baseChordNotes].reverse().slice(1));
        }
    } else if (pattern === "random") {
        // コード構成音からランダムに8音（または構成音数が多い場合はそれ以上）を選ぶ
        const numArpNotes = Math.max(8, baseChordNotes.length * 2);
        currentArpeggioNotes = Array.from({ length: numArpNotes }, () => baseChordNotes[Math.floor(Math.random() * baseChordNotes.length)]);
    } else { // デフォルトは "up"
        currentArpeggioNotes = [...baseChordNotes];
    }

    currentArpeggioIndex = 0;
    const chordTypeName = ui.chordTypeSelector.options[ui.chordTypeSelector.selectedIndex]?.text || chordType;
    ui.statusElement.innerText = `アルペジオ演奏中 (${pattern}): ${rootNote.replace("#", "♯")}${chordTypeName} @ ${bpm}BPM`;

    if (ui.playArpeggioButton) ui.playArpeggioButton.textContent = "アルペジオ停止中..."; // 仮の表示
    if (ui.playArpeggioButton) ui.playArpeggioButton.classList.add("sequencer-active"); // アクティブ風クラス

    playNextArpeggioNote(); // 最初の音を再生開始
}


// --- 初期化処理のとりまとめ ---
function initializeUIReferences() {
    ui.pianoContainer = document.getElementById("piano-container");
    ui.statusElement = document.getElementById("status");
    ui.instrumentSelector = document.getElementById("instrument-selector");
    ui.octaveSelector = document.getElementById("octave-selector");
    ui.waveformSelector = document.getElementById("waveform-selector");
    ui.waveformLabel = document.getElementById("waveform-label");
    ui.articulationSelector = document.getElementById("articulation-selector");

    ui.lfoControlsDiv = document.getElementById("instrument-lfo-controls");
    ui.lfoActiveCheckbox = document.getElementById("lfo-active");
    ui.lfoWaveformSelector = document.getElementById("lfo-waveform");
    ui.lfoRateSlider = document.getElementById("lfo-rate");
    ui.lfoRateValue = document.getElementById("lfo-rate-value");
    ui.lfoDepthSlider = document.getElementById("lfo-depth");
    ui.lfoDepthValue = document.getElementById("lfo-depth-value");
    ui.lfoTargetSelector = document.getElementById("lfo-target");

    ui.sidechainTargetSelector = document.getElementById("sidechain-target");
    ui.sidechainAmountSlider = document.getElementById("sidechain-amount");
    ui.sidechainAmountValue = document.getElementById("sidechain-amount-value");

    ui.rootNoteSelector = document.getElementById("root-note-selector");
    ui.chordTypeSelector = document.getElementById("chord-type-selector");
    ui.inversionSelector = document.getElementById("inversion-selector");
    ui.playChordButton = document.getElementById("play-chord-button");
    ui.arpeggioBpmInput = document.getElementById("arpeggio-bpm");
    ui.arpeggioPatternSelector = document.getElementById("arpeggio-pattern");
    ui.playArpeggioButton = document.getElementById("play-arpeggio-button");
    ui.stopArpeggioButton = document.getElementById("stop-arpeggio-button");
    ui.scaleModeSelector = document.getElementById("scale-mode-selector");

    ui.bgmFileInput = document.getElementById("bgm-file-input");
    ui.bgmPlaylistContainer = document.getElementById("bgm-playlist-container");
    ui.bgmPlaylistElement = document.getElementById("bgm-playlist");

    ui.startRecordButton = document.getElementById("start-record-button");
    ui.stopRecordButton = document.getElementById("stop-record-button");
    ui.downloadArea = document.getElementById("download-area");

    ui.drumPadsContainer = document.getElementById("drum-pads");
    ui.noiseTypeSelector = document.getElementById("noise-type-selector");
    ui.noiseDurationInput = document.getElementById("noise-duration");
    ui.noiseFilterCutoffInput = document.getElementById("noise-filter-cutoff");
    ui.noiseFilterCutoffValue = document.getElementById("noise-filter-cutoff-value");
    ui.playNoiseButton = document.getElementById("play-noise-button");

    ui.masterBpmInput = document.getElementById("master-bpm");
    ui.masterStopButton = document.getElementById("master-stop-button");
    ui.sequencerBpmDisplay = document.getElementById("sequencer-bpm-display");
    ui.toggleSequencerButton = document.getElementById("toggle-sequencer-button");
    ui.sequencerTracksContainer = document.getElementById("sequencer-tracks");

    ui.toggleMicButton = document.getElementById("toggle-mic-button");
    ui.micGainSlider = document.getElementById("mic-gain");

    ui.masterFilterBypassCheckbox = document.getElementById("master-filter-bypass");
    ui.masterFilterTypeSelector = document.getElementById("master-filter-type");
    ui.masterFilterFreqSlider = document.getElementById("master-filter-freq");
    ui.masterFilterFreqValue = document.getElementById("master-filter-freq-value");
    ui.masterFilterQSlider = document.getElementById("master-filter-q");
    ui.masterFilterQValue = document.getElementById("master-filter-q-value");
    ui.masterFilterGainSlider = document.getElementById("master-filter-gain");
    ui.masterFilterGainValue = document.getElementById("master-filter-gain-value");
    ui.masterDelayBypassCheckbox = document.getElementById("master-delay-bypass");
    ui.masterDelayTimeSlider = document.getElementById("master-delay-time");
    ui.masterDelayTimeValue = document.getElementById("master-delay-time-value");
    ui.masterDelayFeedbackSlider = document.getElementById("master-delay-feedback");
    ui.masterDelayFeedbackValue = document.getElementById("master-delay-feedback-value");
    ui.masterDelayWetSlider = document.getElementById("master-delay-wet");
    ui.masterDelayWetValue = document.getElementById("master-delay-wet-value");

    // Nullチェック (開発中にあると便利)
    for (const key in ui) {
        if (ui[key] === null) {
            console.error(`UI Element not found: ${key}. Check HTML id.`);
        }
    }
}


function initializeAudioContext() {
    document.body.addEventListener("click", function initAudio() {
        if (!audioContext) { // AudioContextがまだ作成されていない場合のみ実行
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();

                // 1. 基本となるノードを作成
                masterGainNode = audioContext.createGain();
                globalMuteGainNode = audioContext.createGain(); // ★全体ミュート用ノードを作成
                mediaStreamDestinationNode = audioContext.createMediaStreamDestination(); // 録音先

                // 2. 基本的な接続: 全ての音はまず masterGainNode に集まり、次に globalMuteGainNode を通る
                masterGainNode.connect(globalMuteGainNode);

                // 3. エフェクトチェーンをセットアップ
                // setupMasterEffectsChain内で各エフェクトノードが作成され、
                // connectMasterEffectsが呼ばれて globalMuteGainNode 以降の接続が行われる。
                // connectMasterEffects の最終段で audioContext.destination と mediaStreamDestinationNode に接続される。
                setupMasterEffectsChain();

                // 4. UIの初期値をWeb Audioノードに反映 (オプションだが推奨)
                // これにより、ページロード時のUIスライダー等の値が実際の音に反映される。
                // setupMasterEffectsChain の後、つまりノードが存在し接続された後に呼ぶ。
                if (ui.masterFilterTypeSelector) updateMasterFilterValues();
                if (ui.masterDelayTimeSlider) updateMasterDelayValues();
                // 上記update関数がconnectMasterEffectsを呼ばないバージョンなら、
                // ここで再度 connectMasterEffects() を呼ぶか、
                // updateMaster...ValuesAndReconnect() を使う。
                // 現状のupdateMaster...Valuesはconnectを呼ばないので、再接続が必要なら以下を実行。
                // ただし、setupMasterEffectsChain内で既にconnectMasterEffectsが呼ばれているので、
                // updateMaster...Valuesがパラメータのみ変更するなら、ここでの再接続は不要な場合も。
                // より安全なのは、UIの初期値を反映した後に接続を確定させること。
                // connectMasterEffects(); // UI初期値反映後の最終的な接続

                if (ui.statusElement) ui.statusElement.innerText = "オーディオが有効になりました。";

                // イベントリスナーを削除して、複数回初期化されるのを防ぐ
                document.body.removeEventListener("click", initAudio);

            } catch (e) {
                if (ui.statusElement) ui.statusElement.innerText = `AudioContext初期化エラー: ${e.message}`;
                console.error("AudioContext Error:", e);
            }
        }
    }, { once: true });
}

function updateInstrumentControls() {
    // uiオブジェクトが初期化されているか確認 (initializeUIReferencesが先に呼ばれる前提)
    if (!ui.instrumentSelector || !ui.waveformSelector || !ui.waveformLabel || !ui.lfoControlsDiv ||
        !ui.lfoActiveCheckbox || !ui.lfoWaveformSelector || !ui.lfoRateSlider || !ui.lfoRateValue ||
        !ui.lfoDepthSlider || !ui.lfoDepthValue || !ui.lfoTargetSelector) {
        console.warn("LFO UI elements might not be fully initialized yet in updateInstrumentControls. This function might be called too early or UI elements are missing in HTML.");
        // DOM要素がなければ、この関数の処理の一部をスキップするか、エラーを投げるか、または何もしない
        // ここでは、LFO関連のUIがなければその部分の処理をスキップする
    }

    const instrumentName = ui.instrumentSelector.value;
    const settings = instrumentSettings[instrumentName];
    const isPiano = instrumentName === "piano";

    if (ui.waveformSelector) ui.waveformSelector.disabled = !isPiano;
    if (ui.waveformLabel) {
        ui.waveformLabel.style.color = isPiano ? "#cfd8dc" : "#78909c";
        ui.waveformLabel.innerText = `波形 (${isPiano ? 'ピアノ' : (settings?.getWaveformType?.() || 'N/A') + ' 固定'})`;
    }

    if (ui.lfoControlsDiv) { // ui.lfoControlsDivが存在するか確認してから操作
        if (settings && settings.lfoDefaults) {
            ui.lfoControlsDiv.style.display = 'block';
            if (ui.lfoActiveCheckbox) ui.lfoActiveCheckbox.checked = settings.lfoDefaults.active;
            if (ui.lfoWaveformSelector) ui.lfoWaveformSelector.value = settings.lfoDefaults.waveform;
            if (ui.lfoRateSlider) ui.lfoRateSlider.value = settings.lfoDefaults.rate;
            if (ui.lfoRateValue) ui.lfoRateValue.textContent = `${settings.lfoDefaults.rate.toFixed(1)}Hz`;
            if (ui.lfoDepthSlider) ui.lfoDepthSlider.value = settings.lfoDefaults.depth;
            if (ui.lfoDepthValue) ui.lfoDepthValue.textContent = settings.lfoDefaults.depth;
            if (ui.lfoTargetSelector) ui.lfoTargetSelector.value = settings.lfoDefaults.target;
        } else {
            ui.lfoControlsDiv.style.display = 'none';
        }
    }
    // 現在再生中の音のLFOも更新
    updateActiveLFOs(); // この関数も updateInstrumentControls より前に定義されている必要がある
}


function setupEventListeners() {
    if (!Object.keys(ui).length) { // uiオブジェクトが空なら、まだDOM参照が取得できていない
        console.error("UI references not initialized. Cannot setup event listeners.");
        return;
    }
    try {
        ui.instrumentSelector.addEventListener("change", updateInstrumentControls);
        ui.octaveSelector.addEventListener("change", () => { buildPianoUI(); showScaleModeOnPiano(); });
        ui.waveformSelector.addEventListener("change", () => ui.statusElement.innerText = `ピアノ波形: ${ui.waveformSelector.value}`);
        ui.articulationSelector.addEventListener("change", () => ui.statusElement.innerText = `アーティキュレーション: ${ui.articulationSelector.options[ui.articulationSelector.selectedIndex].text}`);

        if (ui.lfoActiveCheckbox) ui.lfoActiveCheckbox.addEventListener("change", updateActiveLFOs);
        if (ui.lfoWaveformSelector) ui.lfoWaveformSelector.addEventListener("change", updateActiveLFOs);
        if (ui.lfoRateSlider) ui.lfoRateSlider.addEventListener("input", updateActiveLFOs);
        if (ui.lfoDepthSlider) ui.lfoDepthSlider.addEventListener("input", updateActiveLFOs);
        if (ui.lfoTargetSelector) ui.lfoTargetSelector.addEventListener("change", updateActiveLFOs);

        if (ui.sidechainAmountSlider) ui.sidechainAmountSlider.addEventListener('input', (e) => { ui.sidechainAmountValue.textContent = parseFloat(e.target.value).toFixed(2); });

        ui.playChordButton.addEventListener("click", playChordAction);
        ui.inversionSelector.addEventListener("change", () => ui.statusElement.innerText = `転回形: ${ui.inversionSelector.options[ui.inversionSelector.selectedIndex].text}`);
        ui.playArpeggioButton.addEventListener("click", playArpeggioAction);
        ui.stopArpeggioButton.addEventListener("click", stopArpeggioPlayback);
        ui.rootNoteSelector.addEventListener("change", showScaleModeOnPiano);
        ui.scaleModeSelector.addEventListener("change", showScaleModeOnPiano);

        ui.drumPadsContainer.addEventListener("click", (event) => { if (event.target.classList.contains("pad")) { const drumType = event.target.dataset.drum; ensureGlobalAudioUnmuted(); if (drumType) playDrumSound(drumType); } });
        ui.playNoiseButton.addEventListener("click", playNoise);
        ui.noiseFilterCutoffInput.addEventListener("input", (event) => { const value = parseFloat(event.target.value); ui.noiseFilterCutoffValue.textContent = `${value} Hz`; if (currentNoiseNodes.filter && audioContext) { currentNoiseNodes.filter.frequency.setTargetAtTime(value, audioContext.currentTime, 0.01); } });

        // ui.masterStopButton のイベントリスナー内の処理 (setupEventListeners 内)
        if (ui.masterStopButton) {
            ui.masterStopButton.addEventListener("click", () => {
                // 1. シーケンサー/マスター再生の停止
                if (isMasterPlaying) toggleMasterPlay(); // これが isMasterPlaying を false にし、再生ループを止める


                // 2. BGMの停止
                Object.values(bgmTracks).forEach(track => stopSingleBgm(track.id));
                if (ui.bgmPlaylistElement) { // ★これ
                    updateBgmPlaylist();    // ★これ (全てのBGMのUIを更新)
                }
                // 3. アルペジオの停止
                stopArpeggioPlayback();

                // 4. グローバルミュートゲインノードによる全体のミュート
                if (globalMuteGainNode && audioContext) {
                    globalMuteGainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.015); // 短時間でミュート
                    console.log("Global Mute Gain set to 0 (All Stop).");
                }

                // 5. アクティブな楽器ノートの強制停止
                activeInstrumentNodes.forEach((nodeInstance, nodeId) => { // nodeIdも取得できるように変更
                    if (nodeInstance.instrumentGain && nodeInstance.instrumentGain.gain) {
                        // ゲインエンベロープを即座に0に近づける
                        nodeInstance.instrumentGain.gain.cancelScheduledValues(audioContext.currentTime);
                        nodeInstance.instrumentGain.gain.setValueAtTime(nodeInstance.instrumentGain.gain.value, audioContext.currentTime); // 現在のゲイン値を取得して即座に設定
                        nodeInstance.instrumentGain.gain.linearRampToValueAtTime(0.0001, audioContext.currentTime + 0.02); // 非常に短時間で0へ
                    }
                    if (nodeInstance.oscillators) {
                        nodeInstance.oscillators.forEach(osc => {
                            try {
                                // 現在時刻から非常に短いディレイの後で停止させることで、クリックノイズを避ける試み
                                // ただし、即時停止が目的なら audioContext.currentTime でも良い
                                osc.stop(audioContext.currentTime + 0.01); // 0.01秒後に停止
                            } catch (e) {
                                // console.warn(`Error stopping oscillator for node ${nodeId}: ${e.message}`);
                            }
                        });
                    }
                    // LFOも停止させる (もしLFOが音を持続させている原因の場合)
                    if (nodeInstance.lfo) {
                        try { nodeInstance.lfo.stop(audioContext.currentTime + 0.01); } catch (e) { }
                    }
                    // activeInstrumentNodes から削除する (クリーンアップの一部)
                    // setTimeout 内の削除と重複する可能性もあるが、即時停止のためここで積極削除も検討
                    // ただし、setTimeout内のクリーンアップに任せる方が安全な場合もある
                });
                // activeInstrumentNodes.clear(); // 全てクリアする場合 (注意: 停止処理が完了する前にクリアすると問題が起きる可能性)

                // 6. ステータスメッセージの更新
                if (ui.statusElement) ui.statusElement.innerText = "全体停止しました。";
            });
        }
        ui.masterBpmInput.addEventListener("change", () => { ui.sequencerBpmDisplay.value = ui.masterBpmInput.value; if (isMasterPlaying) { clearTimeout(masterPlayIntervalId); masterPlayLoop(); ui.statusElement.innerText = `全体再生中 (BPM: ${ui.masterBpmInput.value})`; } });
        ui.toggleSequencerButton.addEventListener("click", toggleMasterPlay);

        ui.toggleMicButton.addEventListener("click", toggleMic);
        ui.micGainSlider.addEventListener("input", (e) => { if (micGainNode && isMicActive) micGainNode.gain.value = parseFloat(e.target.value); });

        ui.bgmFileInput.addEventListener("change", loadBgmFiles);

        ui.masterFilterBypassCheckbox.addEventListener("change", connectMasterEffects);
        ui.masterFilterTypeSelector.addEventListener("change", updateMasterFilterValuesAndReconnect);
        ui.masterFilterFreqSlider.addEventListener("input", updateMasterFilterValuesAndReconnect);
        ui.masterFilterQSlider.addEventListener("input", updateMasterFilterValuesAndReconnect);
        ui.masterFilterGainSlider.addEventListener("input", updateMasterFilterValuesAndReconnect);
        ui.masterDelayBypassCheckbox.addEventListener("change", connectMasterEffects);
        ui.masterDelayTimeSlider.addEventListener("input", updateMasterDelayValuesAndReconnect);
        ui.masterDelayFeedbackSlider.addEventListener("input", updateMasterDelayValuesAndReconnect);
        ui.masterDelayWetSlider.addEventListener("input", updateMasterDelayValuesAndReconnect);

        ui.startRecordButton.addEventListener("click", startRecording);
        ui.stopRecordButton.addEventListener("click", stopRecordingAction);
    } catch (error) {
        console.error("Error setting up event listeners:", error);
        if (ui.statusElement) ui.statusElement.innerText = "UIの初期化に失敗しました。ページを再読み込みしてください。";
    }
}

function main() {
    try {
        initializeUIReferences(); // 1. DOM要素への参照を確立
        initializeAudioContext(); // 2. AudioContextの初期化準備

        // 3. UIの初期構築 (AudioContextがまだなくてもDOMは操作可能)
        buildPianoUI();
        buildSequencerUI();
        updateInstrumentControls(); // 楽器UIの初期状態を設定

        // 4. イベントリスナーの設定 (DOM要素は確定している)
        setupEventListeners();

        // 5. 初期状態の設定
        if (ui.statusElement) { // ui.statusElement が存在するか確認
            ui.statusElement.innerText = "ページ上の任意の場所をクリックしてオーディオを有効化してください。";
        }
        showScaleModeOnPiano();
        console.log("JavaScript EDM Production Studio (Full Code with main) Ready");
    } catch (error) {
        console.error("Error in main function:", error);
        const bodyStatus = document.createElement('p');
        bodyStatus.textContent = "アプリケーションの起動に失敗しました。コンソールを確認してください。";
        bodyStatus.style.color = "red";
        bodyStatus.style.textAlign = "center";
        bodyStatus.style.padding = "20px";
        document.body.prepend(bodyStatus);
        if (ui.statusElement) ui.statusElement.innerText = "起動エラー。";
    }
}

// --- 初期化とメインのイベントリスナー設定 ---
document.addEventListener('DOMContentLoaded', main);
// --- 再生開始時のアンミュートヘルパー ---
function ensureGlobalAudioUnmuted() {
    // if (globalMuteGainNode && audioContext && globalMuteGainNode.gain.value < 0.5) { // 0.5未満なら1に戻す (ミュートされていたと判断)
    globalMuteGainNode.gain.setTargetAtTime(1, audioContext.currentTime, 0.01);
    //     console.log("Global Mute Gain restored to 1 (Unmuted).");
    // }
}