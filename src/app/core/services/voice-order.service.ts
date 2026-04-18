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

@Injectable({
  providedIn: 'root'
})
export class VoiceOrderService {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];

  private readonly apiUrl = environment.apiUrl;
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
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');
          const authToken = btoa(`${this.username}:${this.password}`);
          const headers = new HttpHeaders({
            Authorization: `Basic ${authToken}`
          });

          const response = await firstValueFrom(
            this.http.post<VoiceOrderResponse>(this.apiUrl, formData, { headers })
          );

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

  cancelRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }

    this.stopMediaStreamTracks();
    this.mediaRecorder = null;
    this.audioChunks = [];
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
}
