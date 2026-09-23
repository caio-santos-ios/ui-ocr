import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { api } from '../../services/api';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './confirmation.html',
  styleUrl: './confirmation.css'
})
export class Confirmation implements OnInit, OnDestroy {
  code = '';
  device = '';
  isApp = false;

  isLoading = true;
  isSuccess = false;
  errorMessage = '';

  countdown = 3;
  private timerInterval: any = null;

  private hasExecuted = false;

  constructor(
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const newCode = params['code'] || '';
      this.device = (params['device'] || '').toLowerCase();
      this.isApp = this.device === 'app';

      if (!newCode) {
        this.isLoading = false;
        this.errorMessage = 'Código de confirmação não informado.';
        this.cdr.detectChanges();
        return;
      }

      if (this.hasExecuted && this.code === newCode) {
        return;
      }

      this.code = newCode;
      this.hasExecuted = true;
      this.executeConfirmation();
    });
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  async executeConfirmation() {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const response = await api.get(`/api/auth/confirm-account/${this.code}`);
      if (response.status === 200) {
        this.isSuccess = true;
        this.isLoading = false;
        this.cdr.detectChanges();

        if (this.isApp) {
          this.startAutoRedirect();
        }
      } else {
        this.isSuccess = false;
        this.isLoading = false;
        this.errorMessage = response.data?.message || 'Falha ao confirmar conta.';
        this.cdr.detectChanges();
      }
    } catch (err: any) {
      this.isSuccess = false;
      this.isLoading = false;
      if (!err.response) {
        this.errorMessage = 'Não foi possível conectar ao servidor. Verifique se a API está em execução.';
      } else {
        this.errorMessage = err.response?.data?.message || err.response?.data?.Message || 'Código inválido, expirado ou conta já confirmada.';
      }
      this.cdr.detectChanges();
    }
  }

  startAutoRedirect() {
    this.openApp();
    this.timerInterval = setInterval(() => {
      this.countdown--;
      this.cdr.detectChanges();
      if (this.countdown <= 0) {
        clearInterval(this.timerInterval);
        this.openApp();
      }
    }, 1000);
  }

  openApp() {
    window.location.href = 'sistemafazenda://confirmation-success';
  }
}
