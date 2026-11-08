// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export type SpeechCallback = (transcript: string, isFinal: boolean) => void;
export type ErrorCallback = (errorMsg: string) => void;

export class XactScopeSpeechService {
  private recognition: any = null;
  private isListening: boolean = false;
  private onTranscriptCallback: SpeechCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const win = window as unknown as IWindowWithSpeech;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.isSupported = true;

        this.setupListeners();
      }
    }
  }

  public checkSupport(): boolean {
    return this.isSupported;
  }

  private setupListeners(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      const isFinal = !!finalTranscript;

      if (this.onTranscriptCallback && text.trim()) {
        this.onTranscriptCallback(text.trim(), isFinal);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('SpeechRecognition error:', event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error || 'Speech recognition error');
      }
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };
  }

  public startListening(onTranscript: SpeechCallback, onError?: ErrorCallback): void {
    if (!this.isSupported) {
      if (onError) onError('Web Speech API is not supported in this browser.');
      return;
    }

    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError || null;

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (e: any) {
      // Often thrown if already started
      console.warn('SpeechRecognition start failed or already active:', e);
    }
  }

  public stopListening(): void {
    if (!this.recognition || !this.isListening) return;

    try {
      this.recognition.stop();
    } catch (e) {
      console.warn('SpeechRecognition stop error:', e);
    } finally {
      this.isListening = false;
    }
  }

  public getListeningState(): boolean {
    return this.isListening;
  }
}

export const speechService = new XactScopeSpeechService();
