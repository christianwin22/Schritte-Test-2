/**
 * Saying German out loud, with the things iOS needs.
 *
 * Three of them, all learned the hard way:
 *  - getVoices() is empty on the first call and fills in later, so the voice
 *    is looked up when it is needed, not once at the start.
 *  - cancel() immediately followed by speak() can leave the queue wedged and
 *    the new utterance is silently dropped, so speaking is given its own tick.
 *  - nothing will ever be said until the first utterance follows a real tap,
 *    so the first tap anywhere primes it.
 *
 * What none of this can fix: with the ring/silent switch on Silent, an iPhone
 * says nothing. That is the phone, not the app.
 */

let primed = false;

/** The first tap on the page wakes the speech engine up. */
function prime(): void {
  if (primed || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  primed = true;
  try {
    const silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
  } catch {
    // nothing to do; the real utterance may still work
  }
}

if (typeof window !== 'undefined') {
  const wake = () => {
    prime();
    window.removeEventListener('touchend', wake);
    window.removeEventListener('pointerdown', wake);
  };
  window.addEventListener('touchend', wake, { once: true, passive: true });
  window.addEventListener('pointerdown', wake, { once: true });
}

function germanVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null; // not loaded yet; lang alone still works
  return (
    voices.find((v) => v.lang.startsWith('de') && /Google|Natural|Premium|Enhanced/.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('de')) ??
    null
  );
}

export function isSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface VoiceCheck {
  supported: boolean;
  /** How many voices the device offers at all. Empty means they are still loading. */
  voices: number;
  /** How many of those are German. Zero is why a phone can stay silent. */
  german: number;
  /** The voice that would be used, if any. */
  chosen: string | null;
  /** Filled in after a test: what actually happened. */
  outcome?: 'spoke' | 'silent' | 'error';
  error?: string;
}

/** What this device can do, for the check in Settings. */
export function voiceReport(): VoiceCheck {
  if (!isSpeechAvailable()) return { supported: false, voices: 0, german: 0, chosen: null };
  const all = window.speechSynthesis.getVoices();
  const chosen = germanVoice();
  return {
    supported: true,
    voices: all.length,
    german: all.filter((v) => v.lang.startsWith('de')).length,
    chosen: chosen ? `${chosen.name} (${chosen.lang})` : null,
  };
}

/**
 * Says a word and reports back whether anything actually happened.
 *
 * "It doesn't work" can mean the browser has no voices, or that it accepted
 * the words and stayed quiet — which on an iPhone usually means the ring
 * switch is set to silent. These are different problems, so the test tells
 * them apart instead of leaving us to guess.
 */
export function testGermanVoice(onDone: (result: VoiceCheck) => void): void {
  const report = voiceReport();
  if (!report.supported) return onDone({ ...report, outcome: 'error', error: 'This browser has no speech at all.' });

  prime();
  const utterance = new SpeechSynthesisUtterance('Guten Tag');
  utterance.lang = 'de-DE';
  const voice = germanVoice();
  if (voice) utterance.voice = voice;

  let started = false;
  utterance.onstart = () => {
    started = true;
  };
  utterance.onerror = (e) => onDone({ ...report, outcome: 'error', error: e.error || 'unknown' });
  window.speechSynthesis.speak(utterance);
  window.setTimeout(() => {
    onDone({ ...voiceReport(), outcome: started || window.speechSynthesis.speaking ? 'spoke' : 'silent' });
  }, 1200);
}

/** Text-to-speech utility for German pronunciation using Web Speech API */
/** Bumped whenever something new is said, so a running sequence knows to stop. */
let sequenceToken = 0;

/**
 * Says several things one after another with a short pause between them —
 * e.g. a verb, then ich …, du …, er …, wir …, ihr …, sie …. Anything else said
 * (a tapped speaker) or the returned stop() ends it at once.
 */
export function speakGermanSequence(texts: string[], pauseMs = 450): () => void {
  if (!isSpeechAvailable() || texts.length === 0) return () => {};
  const token = ++sequenceToken;
  const synth = window.speechSynthesis;
  let timer: number | undefined;
  const sayAt = (i: number) => {
    if (token !== sequenceToken || i >= texts.length) return;
    const utterance = new SpeechSynthesisUtterance(texts[i]);
    utterance.lang = 'de-DE';
    utterance.rate = 0.88;
    const voice = germanVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (token === sequenceToken) timer = window.setTimeout(() => sayAt(i + 1), pauseMs);
    };
    utterance.onerror = () => {
      // interrupted or cancelled: the sequence is over
    };
    synth.speak(utterance);
  };
  prime();
  if (synth.speaking || synth.pending) synth.cancel();
  timer = window.setTimeout(() => sayAt(0), 120);
  return () => {
    if (token !== sequenceToken) return;
    sequenceToken++;
    window.clearTimeout(timer);
    synth.cancel();
  };
}

export function speakGerman(text: string): void {
  sequenceToken++; // a tap on a speaker stops any sequence that is playing
  if (!isSpeechAvailable()) {
    console.warn('Web Speech API is not supported in this browser.');
    return;
  }
  prime();

  const synth = window.speechSynthesis;
  // Strip cloze brackets if present
  const cleanText = text.replace(/\{\{blank\}\}/g, '...').replace(/\{\{.*?\}\}/g, '').trim();
  if (!cleanText) return;

  const say = () => {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'de-DE';
    utterance.rate = 0.88; // Comfortable pace for language learners
    utterance.pitch = 1.0;
    const voice = germanVoice();
    if (voice) utterance.voice = voice;

    // iOS sometimes accepts the utterance and then says nothing. If it has not
    // started shortly after, wake the queue and try once more.
    let started = false;
    utterance.onstart = () => {
      started = true;
    };
    synth.speak(utterance);
    window.setTimeout(() => {
      if (started || synth.speaking) return;
      synth.resume();
      synth.speak(utterance);
    }, 300);
  };

  if (synth.speaking || synth.pending) {
    synth.cancel();
    // A tick between cancel and speak; back to back, iOS drops the new one.
    window.setTimeout(say, 60);
    return;
  }
  say();
}

/**
 * Check if Speech Recognition is supported in the current environment
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * Start listening for voice input using Web Speech API
 */
export function listenToGermanSpeech(
  onResult: (transcript: string) => void,
  onError: (error: string) => void,
  onEnd: () => void,
  lang: string = 'de-DE'
): { stop: () => void } | null {
  if (typeof window === 'undefined') return null;

  // @ts-expect-error - window.SpeechRecognition is not in all TS dom definitions
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError('Speech recognition not supported in this browser.');
    onEnd();
    return null;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      if (event.results && event.results.length > 0) {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      onError(event.error || 'Speech recognition failed');
    };

    recognition.onend = () => {
      onEnd();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      },
    };
  } catch (err: any) {
    onError(err.message || 'Could not start speech recognition');
    onEnd();
    return null;
  }
}

