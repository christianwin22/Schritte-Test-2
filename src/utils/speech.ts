/**
 * Text-to-speech utility for German pronunciation using Web Speech API
 */
export function speakGerman(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Web Speech API is not supported in this browser.');
    return;
  }

  // Cancel ongoing speech
  window.speechSynthesis.cancel();

  // Strip cloze brackets if present
  const cleanText = text.replace(/\{\{blank\}\}/g, '...').replace(/\{\{.*?\}\}/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'de-DE';
  utterance.rate = 0.88; // Comfortable pace for language learners
  utterance.pitch = 1.0;

  // Try to find a high quality German voice if available
  const voices = window.speechSynthesis.getVoices();
  const germanVoice =
    voices.find(
      (v) =>
        v.lang.startsWith('de') &&
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
    ) || voices.find((v) => v.lang.startsWith('de'));

  if (germanVoice) {
    utterance.voice = germanVoice;
  }

  window.speechSynthesis.speak(utterance);
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

