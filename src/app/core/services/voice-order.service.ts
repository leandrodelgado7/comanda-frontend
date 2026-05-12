import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VoiceResolvedItem {
  id: number | string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  total?: number;
  confianza?: number;
}

export interface VoiceNeedsConfirmationOption {
  id: number | string;
  descripcion: string;
  precio_unitario: number;
  confianza: number;
}

export interface VoiceNeedsConfirmationItem {
  cantidad: number;
  options: VoiceNeedsConfirmationOption[];
}

export interface VoiceOrderResponse {
  resolved: VoiceResolvedItem[];
  needs_confirmation: VoiceNeedsConfirmationItem[];
}

export interface VoiceRejectedItem {
  id: number | string;
  descripcion: string;
  precio_unitario: number;
  cantidad: number;
  confianza?: number;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceOrderService {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private lastAudioBlob: Blob | null = null;

  private readonly transcribeApiUrl = environment.transcribeApiUrl;
  private readonly retryApiUrl = environment.retryApiUrl;
  private readonly username = environment.username;
  private readonly password = environment.password;

  constructor(private readonly http: HttpClient) {}

  async startRecording(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.mediaStream);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<VoiceOrderResponse | null> {
    if (!this.mediaRecorder) {
      return null;
    }

    return new Promise<VoiceOrderResponse | null>((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        try {
          this.lastAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const response = await this.sendVoiceRequest(this.transcribeApiUrl, this.lastAudioBlob);

          resolve(response);
        } catch {
          resolve(null);
        } finally {
          this.stopMediaStreamTracks();
          this.mediaRecorder = null;
          this.audioChunks = [];
        }
      };

      this.mediaRecorder!.stop();
    });
  }

async retryLastRecording(rejected: VoiceRejectedItem[]): Promise<VoiceOrderResponse | null> {
  if (!this.lastAudioBlob) {
    return null;
  }

  try {
    return await this.sendVoiceRequest(this.retryApiUrl, this.lastAudioBlob, rejected);
  } catch {
    return null;
  }
}

  cancelRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }

    this.stopMediaStreamTracks();
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.lastAudioBlob = null;
  }

  getActiveStream(): MediaStream | null {
    return this.mediaStream;
  }

  private stopMediaStreamTracks(): void {
    if (!this.mediaStream) {
      return;
    }

    this.mediaStream.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;
  }

  private async sendVoiceRequest(
    url: string,
    audioBlob: Blob,
    rejected: VoiceRejectedItem[] = []
  ): Promise<VoiceOrderResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    if (rejected.length) {
      formData.append('rejected', JSON.stringify(rejected));
    }

    const authToken = btoa(`${this.username}:${this.password}`);
    const headers = new HttpHeaders({
      Authorization: `Basic ${authToken}`
    });

    return firstValueFrom(this.http.post<VoiceOrderResponse>(url, formData, { headers }));
  }
}
