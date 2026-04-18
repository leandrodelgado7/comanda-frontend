import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { OrdersComponent } from './features/orders/orders.component';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'orders', component: OrdersComponent },
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: '**', redirectTo: 'login' }
];
