import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { api } from '../../services/api';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  token = '';
  email = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;

  hasToken = false;
  isSubmitted = false;
  isResetDone = false;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || params['code'] || '';
      this.hasToken = !!this.token;
      this.cdr.detectChanges();
    });
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onRequestLink() {
    if (!this.email.trim()) {
      this.toastr.warning('Informe seu e-mail cadastrado.');
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      await api.post('/api/auth/forgot-password', { email: this.email });
      this.isSubmitted = true;
      this.toastr.success('Link de recuperação enviado com sucesso!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Se o e-mail estiver cadastrado, o link de recuperação foi enviado!';
      this.isSubmitted = true;
      this.toastr.success(msg);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async onResetPassword() {
    if (!this.newPassword || !this.confirmPassword) {
      this.toastr.warning('Preencha a nova senha e a confirmação.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.toastr.error('As senhas não coincidem.');
      return;
    }

    if (this.newPassword.length < 6) {
      this.toastr.warning('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      await api.post('/api/auth/reset-password', {
        token: this.token,
        password: this.newPassword,
        confirmPassword: this.confirmPassword
      });
      this.isResetDone = true;
      this.toastr.success('Sua senha foi redefinida com sucesso!');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Token inválido ou expirado.';
      this.toastr.error(msg);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
