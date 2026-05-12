import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs';
import SiriWave from 'siriwave';
import { Product } from '../../../core/models/product.model';
import { OrderService } from '../../../core/services/order.service';
import { ProductService } from '../../../core/services/product.service';
import {
  VoiceNeedsConfirmationItem,
  VoiceNeedsConfirmationOption,
  VoiceOrderResponse,
  VoiceRejectedItem,
  VoiceOrderService,
  VoiceResolvedItem
} from '../../../core/services/voice-order.service';

@Component({
  selector: 'app-voice-order-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-order-panel.component.html',
  styleUrls: ['./voice-order-panel.component.scss']
})
export class VoiceOrderPanelComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('waveContainer', { static: true })
  waveContainerRef!: ElementRef<HTMLDivElement>;

  isListening = false;
  isProcessing = false;
  isRetrying = false;

  needsConfirmation: VoiceNeedsConfirmationItem[] = [];
  showConfirmationModal = false;
  private rejectedItemsForRetry: VoiceRejectedItem[] = [];

  private readonly productsById = new Map<string, Product>();
  private readonly productsByCode = new Map<string, Product>();
  private siriWave: SiriWave | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array | null = null;
  private rafId: number | null = null;

  constructor(
    private readonly voiceOrderService: VoiceOrderService,
    private readonly productService: ProductService,
    private readonly orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.productService
      .searchProducts('')
      .pipe(take(1))
      .subscribe((products) => {
        products.forEach((product) => {
          this.productsById.set(String(product.id), product);
          this.productsByCode.set(String(product.codigo), product);
        });
      });
  }

  ngAfterViewInit(): void {
    // Wave is initialized lazily when listening starts to avoid zero-size canvas when hidden.
  }

  ngOnDestroy(): void {
    this.stopWaveAnalyser();
    this.siriWave?.stop();
    this.siriWave?.dispose();
    this.siriWave = null;
    this.voiceOrderService.cancelRecording();
  }

  async startListening(): Promise<void> {
    if (this.isListening || this.isProcessing) {
      return;
    }

    try {
      await this.voiceOrderService.startRecording();
      this.isListening = true;
      this.startWaveAnalyser();
    } catch {
      alert('No se pudo acceder al microfono');
      this.isListening = false;
      this.isProcessing = false;
      this.siriWave?.setAmplitude(0);
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    this.isListening = false;
    this.stopWaveAnalyser();
    this.isProcessing = true;

    const response = await this.voiceOrderService.stopRecording();

    if (!response) {
      alert('Error al procesar el audio');
      this.isProcessing = false;
      return;
    }

    this.handleVoiceResponse(response);
    this.isProcessing = false;
  }

  confirmProduct(cantidad: number, option: VoiceNeedsConfirmationOption): void {
    this.addResolvedItems([
      {
        id: option.id,
        descripcion: option.descripcion,
        cantidad,
        precio_unitario: option.precio_unitario,
        total: option.precio_unitario * cantidad,
        confianza: option.confianza
      }
    ]);

    this.needsConfirmation = this.needsConfirmation.filter(
      (item) => !(item.cantidad === cantidad && item.options.some((current) => current.id === option.id))
    );

    this.showConfirmationModal = this.needsConfirmation.length > 0;
  }

  closeConfirmationModal(): void {
    this.showConfirmationModal = false;
  }

  async retryVoiceProcessing(): Promise<void> {
    if (this.isRetrying || this.isProcessing || !this.rejectedItemsForRetry.length) {
      return;
    }

    this.isRetrying = true;
    const response = await this.voiceOrderService.retryLastRecording(this.rejectedItemsForRetry);
    this.isRetrying = false;

    if (!response) {
      alert('Error al reintentar el procesamiento del audio');
      return;
    }

    this.handleVoiceResponse(response);
  }

  onMicContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  private handleVoiceResponse(response: VoiceOrderResponse): void {
    const resolved = response.resolved ?? [];
    const pendingConfirmation = response.needs_confirmation ?? [];
    this.rejectedItemsForRetry = this.buildRejectedItems(resolved, pendingConfirmation);

    if (!resolved.length && !pendingConfirmation.length) {
      alert('No se pudo reconocer el producto');
      return;
    }

    // Convertir items resolved a items que se muestren en el modal de confirmación
    const resolvedAsConfirmation: VoiceNeedsConfirmationItem[] = resolved.map((item) => ({
      cantidad: item.cantidad,
      options: [
        {
          id: item.id,
          descripcion: item.descripcion,
          precio_unitario: item.precio_unitario,
          confianza: item.confianza ?? 1.0
        }
      ]
    }));

    this.needsConfirmation = [
      ...resolvedAsConfirmation,
      ...pendingConfirmation.map((item) => ({
        ...item,
        options: [...item.options].sort((a, b) => b.confianza - a.confianza)
      }))
    ];
    this.showConfirmationModal = this.needsConfirmation.length > 0;
  }

  private buildRejectedItems(
    resolved: VoiceResolvedItem[],
    pendingConfirmation: VoiceNeedsConfirmationItem[]
  ): VoiceRejectedItem[] {
    const rejectedFromResolved: VoiceRejectedItem[] = resolved.map((item) => ({
      id: item.id,
      descripcion: item.descripcion,
      precio_unitario: item.precio_unitario,
      cantidad: item.cantidad,
      confianza: item.confianza
    }));

    const rejectedFromConfirmation: VoiceRejectedItem[] = pendingConfirmation.flatMap((item) =>
      item.options.map((option) => ({
        id: option.id,
        descripcion: option.descripcion,
        precio_unitario: option.precio_unitario,
        cantidad: item.cantidad,
        confianza: option.confianza
      }))
    );

    return [...rejectedFromResolved, ...rejectedFromConfirmation];
  }

  private addResolvedItems(items: VoiceResolvedItem[]): void {
    items.forEach((item) => {
      const product = this.getProductForVoiceItem(item);
      this.orderService.addProductWithQuantity(product, item.cantidad);
    });
  }

  private getProductForVoiceItem(item: VoiceResolvedItem): Product {
    const key = String(item.id);

    const productFromCatalog = this.productsById.get(key) ?? this.productsByCode.get(key);
    if (productFromCatalog) {
      return productFromCatalog;
    }

    // Fallback product for voice responses not present in local catalog.
    return {
      id: key,
      codigo: key,
      descripcion: item.descripcion,
      aliases: [],
      precio: item.precio_unitario,
      imagen: '',
      disponible: true,
      saleUnit: 'UNIT'
    };
  }

  private initWave(): void {
    this.siriWave?.dispose();

    const hostElement = this.waveContainerRef.nativeElement;
    const measuredWidth = Math.round(hostElement.clientWidth);
    const measuredHeight = Math.round(hostElement.clientHeight);

    this.siriWave = new SiriWave({
      container: hostElement,
      width: measuredWidth > 0 ? measuredWidth : 320,
      height: measuredHeight > 0 ? measuredHeight : 110,
      style: 'ios',
      ratio: Math.max(window.devicePixelRatio || 1, 1),
      speed: 0.16,
      amplitude: 0.8,
      autostart: true,
      cover: true,
      pixelDepth: 0.01,
      lerpSpeed: 0.08,
      frequency: 5,
      color: '#1e5ef3'
    });

    this.siriWave.start();
  }

  private startWaveAnalyser(): void {
    this.initWave();

    const stream = this.voiceOrderService.getActiveStream();
    if (!stream) {
      this.siriWave?.setAmplitude(1);
      return;
    }

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.75;
    this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
    source.connect(this.analyser);

    const animate = (): void => {
      if (!this.analyser || !this.analyserData) {
        return;
      }

      (this.analyser as any).getByteTimeDomainData(this.analyserData);
      let sumSquares = 0;
      for (let i = 0; i < this.analyserData.length; i += 1) {
        const normalized = (this.analyserData[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }

      const rms = Math.sqrt(sumSquares / this.analyserData.length);
      // Keep a thin baseline when silence is detected, and grow only when there is voice.
      const silenceThreshold = 0.02;
      const amplitude = rms < silenceThreshold
        ? 0.02
        : Math.min(2.4, Math.max(0.12, rms * 24));
      this.siriWave?.setAmplitude(amplitude);
      this.rafId = requestAnimationFrame(animate);
    };

    this.rafId = requestAnimationFrame(animate);
  }

  private stopWaveAnalyser(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.analyserData = null;
    this.siriWave?.setAmplitude(0);
    this.siriWave?.stop();
  }
}
