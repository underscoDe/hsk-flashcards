import { readStorage, writeStorage } from './utils.js';

// Short game-like sounds (Kenney, CC0: see sounds/) and vibrations for the study
// actions. Web Audio plays them without the lag of <audio> on phones; on an
// iPhone they follow the silent switch, and only Android can vibrate.

const SOUND_KEY = 'hsk-sound';

// Volumes even out the files, which are all as loud as they can be
const SOUNDS = {
  flip:     { volume: 0.25 },
  known:    { volume: 0.45, vibration: 12 },
  unknown:  { volume: 0.45, vibration: [20, 40, 20] },
  correct:  { volume: 0.45 },
  wrong:    { volume: 0.35, vibration: 30 },
  mastered: { volume: 0.4,  vibration: [15, 30, 15] },
  undo:     { volume: 0.4 },
  great:    { volume: 0.45, vibration: [30, 60, 30, 60, 60] },
  finish:   { volume: 0.45 },
};

let context = null;
const buffers = {};

export function getSoundPreference() {
  return readStorage(SOUND_KEY) === 'off' ? 'off' : 'on';
}

export function setSoundPreference(preference) {
  writeStorage(SOUND_KEY, preference);
}

/** Loads every sound when a session starts, so the first ones play on time. */
export function preloadSounds() {
  if (getSoundPreference() === 'off') return;
  Object.keys(SOUNDS).forEach(name => loadSound(name).catch(() => {}));
}

export function playSound(name) {
  if (getSoundPreference() === 'off') return;
  const { volume, vibration } = SOUNDS[name];
  if (vibration) navigator.vibrate?.(vibration);

  loadSound(name)
    .then(buffer => {
      const source = context.createBufferSource();
      const gain   = context.createGain();
      source.buffer   = buffer;
      gain.gain.value = volume;
      source.connect(gain).connect(context.destination);
      source.start();
    })
    .catch(err => console.warn(`Could not play ${name}`, err));
}

function loadSound(name) {
  // Browsers only let audio start after a tap: the context is created or woken up then
  context ??= new AudioContext();
  if (context.state === 'suspended') context.resume();

  buffers[name] ??= fetch(`/sounds/${name}.mp3`)
    .then(res => res.arrayBuffer())
    .then(data => context.decodeAudioData(data))
    .catch(err => { delete buffers[name]; throw err; }); // try again next time
  return buffers[name];
}
