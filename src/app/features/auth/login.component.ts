import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, tap, switchMap, throwError, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { FieldError } from '../../core/models/auth.model';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  errorMessage = '';
  fieldErrors: FieldError[] = [];

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastService: ToastService
  ) {}

  submit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.fieldErrors = [];

    this.authService
      .login(this.username, this.password)
      .pipe(
        switchMap((user) => {
          const hasComandaRole = user.roles.some((role) => role.code === 'COMANDA');
          if (!hasComandaRole) {
            this.authService.clearSessionAndRedirect();
            return throwError(() => ({ message: 'No tenés rol de acceso a la comanda.' }));
          }
          return of(user);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: () => {
          this.toastService.showSuccessToast('Sesion iniciada correctamente.');
          void this.router.navigate(['/orders']);
        },
        error: (error: HttpErrorResponse | { message: string }) => {
          if ('status' in error) {
            const authError = this.authService.mapHttpError(error);
            this.errorMessage = authError.message ?? 'No se pudo iniciar sesión.';
            this.fieldErrors = authError.fieldErrors ?? [];
          } else {
            this.errorMessage = error.message;
          }
          this.toastService.showErrorToast(this.errorMessage);
        }
      });
  }

  getFieldError(fieldName: string): string | null {
    return this.fieldErrors.find((fieldError) => fieldError.field === fieldName)?.message ?? null;
  }
}
