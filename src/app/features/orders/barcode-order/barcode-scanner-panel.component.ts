import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BarcodeFormat } from '@zxing/library';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { take } from 'rxjs';
import { CarritoService } from '../../../core/services/carrito.service';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-barcode-scanner-panel',
  standalone: true,
  imports: [CommonModule, ZXingScannerModule],
  templateUrl: './barcode-scanner-panel.component.html',
  styleUrl: './barcode-scanner-panel.component.scss'
})
export class BarcodeScannerPanelComponent {
  availableDevices: MediaDeviceInfo[] = [];
  selectedDevice?: MediaDeviceInfo;

  hasDevices = true;
  hasPermission: boolean | null = null;
  readonly supportedFormats: BarcodeFormat[] = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE
  ];

  feedbackMessage = 'Listo para escanear';
  scannerErrorMessage = '';

  private lastScannedCode = '';
  private lastScannedAt = 0;

  constructor(
    private readonly productService: ProductService,
    private readonly carritoService: CarritoService
  ) {}

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    this.availableDevices = devices;
    this.hasDevices = devices.length > 0;

    if (!this.hasDevices) {
      this.scannerErrorMessage = 'No hay camara disponible en este dispositivo.';
      return;
    }

    this.selectedDevice = this.selectPreferredCamera(devices);
    this.scannerErrorMessage = '';
  }

  onNoCamerasFound(): void {
    this.hasDevices = false;
    this.scannerErrorMessage = 'No hay camara disponible en este dispositivo.';
  }

  onHasPermission(hasPermission: boolean): void {
    this.hasPermission = hasPermission;
    if (!hasPermission) {
      this.scannerErrorMessage = 'Permiso de camara denegado. Habilitalo para usar el scanner.';
      return;
    }

    this.scannerErrorMessage = '';
  }

  onScanError(error: unknown): void {
    this.scannerErrorMessage = error instanceof Error
      ? error.message
      : 'No se pudo iniciar el scanner.';
  }

  onScanFailure(): void {
    // No mostramos estado en cada frame fallido para evitar texto permanente.
  }

  onCodeResult(result: string): void {
    const code = result.trim();
    if (!code || this.isDuplicateWithinLockWindow(code)) {
      return;
    }

    this.feedbackMessage = `Buscando código ${code}...`;

    this.productService.findByCodigo(code)
      .pipe(take(1))
      .subscribe((product) => {
        if (!product) {
          this.feedbackMessage = `Producto no encontrado para el codigo ${code}`;
          return;
        }

        this.carritoService.addProductWithQuantity(product, 1);
        this.feedbackMessage = `Agregado: ${product.descripcion}`;
      });
  }

  private isDuplicateWithinLockWindow(code: string): boolean {
    const now = Date.now();
    const isLocked = this.lastScannedCode === code && now - this.lastScannedAt < 1000;

    this.lastScannedCode = code;
    this.lastScannedAt = now;

    return isLocked;
  }

  private selectPreferredCamera(devices: MediaDeviceInfo[]): MediaDeviceInfo {
    const rearCameraRegex = /back|rear|environment|trasera|traseira/i;
    return devices.find((device) => rearCameraRegex.test(device.label)) ?? devices[0];
  }
}
