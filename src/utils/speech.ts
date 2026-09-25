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
    const silent = new SpeechSynthesisUtterance('');
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

/** Text-to-speech utility for German pronunciation using Web Speech API */
export function speakGerman(text: string): void {
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

