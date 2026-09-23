import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Auth } from '../../services/auth';
import { api } from '../../services/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  showPassword = false;
  isLoading = false;

  constructor(
    private auth: Auth,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (!this.email || !this.password) {
      this.toastr.warning('Preencha seu e-mail e senha.');
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const response = await api.post('/api/auth/login', {
        email: this.email,
        password: this.password
      });

      const resObj = response.data?.result || response.data;
      const dataPayload = resObj?.data || resObj;

      const token = dataPayload?.token || resObj?.token || response.data?.token;
      const refreshToken = dataPayload?.refreshToken || resObj?.refreshToken || response.data?.refreshToken;
      const user = dataPayload?.user || resObj?.user || { name: 'Administrador', email: this.email, role: 'admin' };
      const message = resObj?.message || response.data?.message || 'Login realizado com sucesso!';

      if (token) {
        this.auth.setToken(token);
        if (refreshToken) this.auth.setRefreshToken(refreshToken);
        this.auth.setUser(user);

        this.toastr.success(message);
        this.router.navigate(['/dashboard']);
      } else {
        throw new Error('Token de autenticação não retornado.');
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.result?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Não foi possível conectar ao servidor da API.';
      this.toastr.error(errorMsg);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
