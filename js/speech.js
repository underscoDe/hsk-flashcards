// Mandarin pronunciation through the Web Speech API (built into browsers, works offline
// with the device's voices). Without a Chinese voice, the listen button stays hidden.

let voice = null;

/** Picks a Chinese voice; voices load asynchronously, so `onChange` may fire later. */
export function initSpeech(onChange) {
  if (!('speechSynthesis' in window)) return;

  const pickVoice = () => {
    const voices = speechSynthesis.getVoices();
    voice = voices.find(v => /^zh[-_]CN/i.test(v.lang))
      ?? voices.find(v => /^zh/i.test(v.lang))
      ?? null;
    onChange(voice !== null);
  };

  pickVoice();
  speechSynthesis.addEventListener('voiceschanged', pickVoice);
}

export function speak(text) {
  if (!voice) return;
  speechSynthesis.cancel(); // don't queue up when tapped repeatedly
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang  = voice.lang;
  utterance.rate  = 0.85;    // slightly slower for learners
  speechSynthesis.speak(utterance);
}
