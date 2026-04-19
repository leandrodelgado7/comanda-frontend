import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { OrdersComponent } from './features/orders/orders.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent, canActivate: [guestGuard] },
	{ path: 'orders', component: OrdersComponent, canActivate: [authGuard] },
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: '**', redirectTo: 'login' }
];
