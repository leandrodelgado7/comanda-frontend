import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { FieldError } from '../../core/models/auth.model';

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
    private readonly router: Router
  ) {}

  submit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.fieldErrors = [];

    this.authService
      .login(this.username, this.password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          void this.router.navigate(['/orders']);
        },
        error: (error: HttpErrorResponse) => {
          const authError = this.authService.mapHttpError(error);
          this.errorMessage = authError.message ?? 'No se pudo iniciar sesión.';
          this.fieldErrors = authError.fieldErrors ?? [];
        }
      });
  }

  getFieldError(fieldName: string): string | null {
    return this.fieldErrors.find((fieldError) => fieldError.field === fieldName)?.message ?? null;
  }
}
