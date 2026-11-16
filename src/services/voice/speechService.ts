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

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

function writeAsciiString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

async function convertBlobToWavDataUrl(blob: Blob): Promise<string | null> {
  const AudioContextCtor =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

  if (!AudioContextCtor) {
    return blobToDataUrl(blob);
  }

  const audioCtx = new AudioContextCtor();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const numChannels = Math.max(1, audioBuffer.numberOfChannels);
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;

    const wavBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(wavBuffer);
    writeAsciiString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeAsciiString(view, 8, 'WAVE');
    writeAsciiString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // PCM fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeAsciiString(view, 36, 'data');
    view.setUint32(40, length * 2, true);

    const channels = Array.from({ length: numChannels }, (_, ch) =>
      audioBuffer.getChannelData(ch)
    );
    let offset = 44;
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += channels[ch][i] || 0;
      }
      const sample = Math.max(-1, Math.min(1, sum / numChannels));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }

    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    return await blobToDataUrl(wavBlob);
  } catch {
    return blobToDataUrl(blob);
  } finally {
    await audioCtx.close().catch(() => {});
  }
}

export class XactScopeSpeechService {
  private recognition: any = null;
  private isListening: boolean = false;
  private onTranscriptCallback: SpeechCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;
  private isSupported: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private isRecordingAudio: boolean = false;

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

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      const text = [finalTranscript.trim(), interimTranscript.trim()]
        .filter(Boolean)
        .join(' ');
      const isFinal = Boolean(finalTranscript.trim()) && !interimTranscript.trim();

      if (this.onTranscriptCallback && text) {
        this.onTranscriptCallback(text, isFinal);
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

  public canRecordAudio(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  public getAudioRecordingState(): boolean {
    return this.isRecordingAudio;
  }

  public async startAudioRecording(onError?: ErrorCallback): Promise<boolean> {
    if (!this.canRecordAudio()) {
      onError?.('Browser audio recording (MediaRecorder) is unavailable.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;
      this.audioChunks = [];
      const recorder = new MediaRecorder(stream);
      this.mediaRecorder = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        this.isRecordingAudio = false;
        onError?.('Microphone audio recording failed.');
      };

      recorder.start(250);
      this.isRecordingAudio = true;
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone permission denied.';
      onError?.(msg);
      return false;
    }
  }

  public async stopAudioRecording(): Promise<string | null> {
    const recorder = this.mediaRecorder;
    if (!recorder || !this.isRecordingAudio) {
      return null;
    }

    const baseMimeType = (recorder.mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';
    const dataUrl = await new Promise<string | null>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: baseMimeType });
        this.audioChunks = [];
        if (blob.size === 0) {
          resolve(null);
          return;
        }
        void convertBlobToWavDataUrl(blob).then(resolve);
      };

      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    });

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
    this.isRecordingAudio = false;
    return dataUrl;
  }
}

export const speechService = new XactScopeSpeechService();
