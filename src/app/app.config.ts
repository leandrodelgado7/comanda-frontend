import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { NgxUiLoaderModule, PB_DIRECTION, POSITION, SPINNER } from 'ngx-ui-loader';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    importProvidersFrom(NgxUiLoaderModule.forRoot({
      bgsColor: 'red',
      bgsOpacity: 0.5,
      bgsPosition: POSITION.bottomRight,
      bgsSize: 60,
      bgsType: SPINNER.ballSpinClockwise,
      blur: 5,
      delay: 0,
      fastFadeOut: true,
      fgsColor: '#4caf50',
      fgsPosition: POSITION.centerCenter,
      fgsSize: 60,
      fgsType: SPINNER.foldingCube,
      gap: 24,
      logoPosition: POSITION.centerCenter,
      logoSize: 0,
      logoUrl: '',
      masterLoaderId: 'master',
      overlayBorderRadius: '0',
      overlayColor: 'rgba(40, 40, 40, 0.8)',
      pbColor: 'red',
      pbDirection: PB_DIRECTION.leftToRight,
      pbThickness: 3,
      hasProgressBar: false,
      text: '',
      textColor: '#FFFFFF',
      textPosition: POSITION.centerCenter,
      maxTime: -1,
      minTime: 300
    })),
    MessageService
  ]
};
