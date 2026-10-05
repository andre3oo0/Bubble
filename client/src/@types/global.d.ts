// Type definitions for browser APIs

declare global {
  interface Window {
    // Web Speech API
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;

    // Web Audio API
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  }
}

// Ensure TypeScript recognizes the file as a module
export {};
