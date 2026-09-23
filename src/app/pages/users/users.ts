import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Loading } from '../../components/loading/loading';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'professional' | 'admin';
  roleLabel: string;
  status: 'active' | 'blocked' | 'pending';
  statusLabel: string;
  totalOrders: number;
  riskScore: 'low' | 'medium' | 'high';
  createdAt: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, Loading],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit {
  isLoading = false;
  searchQuery = '';
  filterRole = 'all';

  users: UserAccount[] = [];

  constructor(
    private toastr: ToastrService,
    public global: GlobalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const response = await api.get('/api/users');
      const result = response.data.result;
      this.users = result.data.map((u: any) => ({
        id: u.id || u._id,
        name: u.name || 'Sem nome',
        email: u.email,
        phone: u.whatsApp || u.whatsapp || u.phone || 'Não informado',
        role: (u.role?.toString().toLowerCase() === 'admin' || u.role === 1 ? 'admin' : u.role?.toString().toLowerCase() === 'professional' || u.role === 2 ? 'professional' : 'customer') as any,
        roleLabel: u.role?.toString() === 'Admin' ? 'Administrador' : u.role?.toString() === 'Professional' || u.role === 2 ? 'Profissional' : 'Cliente',
        status: (u.blocked || u.isBlocked || u.deleted || u.active === false ? 'blocked' : 'active') as any,
        statusLabel: (u.blocked || u.isBlocked || u.deleted || u.active === false) ? 'Bloqueado' : 'Ativo',
        totalOrders: u.totalOrders || 0,
        riskScore: 'low',
        createdAt: u.createdAt || new Date().toISOString()
      }));
    } catch {
      this.users = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  get filteredList(): UserAccount[] {
    return this.users.filter(u => {
      const matchRole = this.filterRole === 'all' || u.role === this.filterRole;
      const matchQuery = !this.searchQuery ||
        u.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        u.phone.includes(this.searchQuery);
      return matchRole && matchQuery;
    });
  }

  async toggleBlock(user: UserAccount) {
    const willBlock = user.status !== 'blocked';
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      try {
        await api.put('/api/users', {
          id: user.id,
          blocked: willBlock
        });
      } catch {}

      if (willBlock) {
        user.status = 'blocked';
        user.statusLabel = 'Bloqueado';
        this.toastr.warning(`Usuário ${user.name} bloqueado preventivamente.`);
      } else {
        user.status = 'active';
        user.statusLabel = 'Ativo';
        this.toastr.success(`Usuário ${user.name} desbloqueado.`);
      }
    } catch {
      this.toastr.error('Erro ao atualizar status do usuário.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
