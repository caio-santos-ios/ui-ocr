import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Auth, UserSession } from '../../services/auth';
import { api } from '../../services/api';
import { Loading } from '../../components/loading/loading';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, Loading],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  isLoading = false;
  isSaving = false;

  userId = '';
  name = '';
  email = '';

  constructor(
    private auth: Auth,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadUserProfile();
  }

  async loadUserProfile() {
    this.isLoading = true;
    this.cdr.detectChanges();

    const sessionUser = this.auth.getUser();
    if (sessionUser) {
      this.userId = sessionUser.id || '';
      this.name = sessionUser.name || '';
      this.email = sessionUser.email || '';
    }

    try {
      const response = await api.get('/api/users/me');
      const u = response.data?.result?.data || response.data?.result || response.data;
      if (u) {
        this.userId = u.id || u._id || this.userId;
        this.name = u.name || this.name;
        this.email = u.email || this.email;

        const currentSession = this.auth.getUser() || {};
        const updatedSession: UserSession = {
          ...currentSession,
          id: this.userId,
          name: this.name,
          email: this.email
        };
        this.auth.setUser(updatedSession);
      }
    } catch {
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async saveProfile() {
    if (!this.name.trim()) {
      this.toastr.warning('O nome é obrigatório.');
      return;
    }
    if (!this.email.trim()) {
      this.toastr.warning('O e-mail é obrigatório.');
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();

    try {
      const payload: any = {
        id: this.userId,
        name: this.name.trim(),
        email: this.email.trim()
      };

      await api.put('/api/users', payload);

      const currentSession = this.auth.getUser() || {};
      const updatedSession: UserSession = {
        ...currentSession,
        id: this.userId,
        name: this.name,
        email: this.email
      };
      this.auth.setUser(updatedSession);

      this.toastr.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Erro ao atualizar perfil.';
      this.toastr.error(msg);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }
}
