import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

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
  loginError = false;

  constructor(private readonly authService: AuthService) {}

  submit(): void {
    this.loading = true;
    this.loginError = false;

    this.authService
      .login(this.username, this.password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe((isValid) => {
        this.loginError = !isValid;
      });
  }
}
