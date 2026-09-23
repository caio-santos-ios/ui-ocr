import { Component, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { api } from '../../services/api';

interface Campo {
  key: string;
  label: string;
  icone: string;
  span: 2 | 3 | 4 | 6; // colunas de 6
  tipo?: 'text' | 'date' | 'number';
  placeholder?: string;
  obrigatorio?: boolean;
}

interface Grupo {
  titulo: string;
  icone: string;
  campos: Campo[];
}

interface OcrResponse {
  etiqueta?: {
    cirurgiao?: string | null;
    paciente?: string | null;
    data?: string | null;
    regiao?: string | null;
    regiaoValida?: boolean;
    travamento?: string | null;
    auxiliar?: string | null;
    observacao?: string | null;
    liberarDias?: number | null;
  } | null;
  implante?: {
    ref?: string | null;
    lot?: string | null;
    dimensao?: string | null;
  } | null;
  confianca?: number;
}

@Component({
  selector: 'app-read-photo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './read-photo.html',
  styleUrl: './read-photo.css'
})
export class ReadPhoto implements OnDestroy {
  // estado da tela
  previewUrl: string | null = null;
  dragging = false;
  lendo = false;
  lida = false;
  confianca: number | null = null;

  // mensagens que giram enquanto o OCR roda
  mensagens = [
    'Localizando a etiqueta…',
    'Lendo o texto (OCR)…',
    'Procurando REF e LOT…',
    'Validando os campos…'
  ];
  msgIdx = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  // valores dos campos e quais vieram do OCR
  valores: Record<string, string | number | null> = {};
  lidoPorOcr = new Set<string>();

  grupos: Grupo[] = [
    {
      titulo: 'Registro cirúrgico',
      icone: 'fa-file-medical',
      campos: [
        { key: 'paciente', label: 'Paciente', icone: 'fa-user', span: 4, obrigatorio: true },
        // quando a API passar a devolver o prontuário manuscrito, troque para obrigatorio: true
        { key: 'prontuario', label: 'Nº prontuário', icone: 'fa-hashtag', span: 2, placeholder: 'Digitar' },
        { key: 'cirurgiao', label: 'Cirurgião', icone: 'fa-user-doctor', span: 3 },
        { key: 'data', label: 'Data', icone: 'fa-calendar-days', span: 3, tipo: 'date', obrigatorio: true },
        { key: 'regiao', label: 'Região', icone: 'fa-tooth', span: 2, obrigatorio: true },
        { key: 'auxiliar', label: 'Auxiliar', icone: 'fa-user-nurse', span: 2 },
        { key: 'travamento', label: 'Travamento', icone: 'fa-lock', span: 2 },
        { key: 'observacao', label: 'Observação/material', icone: 'fa-note-sticky', span: 6 },
        { key: 'dentistaIndicador', label: 'Dentista indicador', icone: 'fa-user-tie', span: 4 },
        { key: 'liberarDias', label: 'Liberar em (dias)', icone: 'fa-hourglass-half', span: 2, tipo: 'number' }
      ]
    },
    {
      titulo: 'Implante — etiqueta',
      icone: 'fa-tooth',
      campos: [
        { key: 'fabricante', label: 'Fabricante/linha', icone: 'fa-industry', span: 3 },
        { key: 'implante', label: 'Implante', icone: 'fa-cube', span: 3 },
        { key: 'dimensao', label: 'Dimensão', icone: 'fa-ruler-horizontal', span: 2 },
        { key: 'ref', label: 'REF', icone: 'fa-barcode', span: 2, obrigatorio: true },
        { key: 'lot', label: 'LOT', icone: 'fa-layer-group', span: 2, obrigatorio: true }
      ]
    }
  ];

  constructor(
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  // ---------- getters usados no template ----------

  get confiancaPct(): number {
    return Math.round((this.confianca ?? 0) * 100);
  }

  get nivelConfianca(): 'alta' | 'media' | 'baixa' {
    const c = this.confianca ?? 0;
    if (c >= 0.8) return 'alta';
    if (c >= 0.6) return 'media';
    return 'baixa';
  }

  get pendentes(): string[] {
    return this.grupos
      .flatMap(g => g.campos)
      .filter(c => c.obrigatorio && this.vazio(this.valores[c.key]))
      .map(c => c.label);
  }

  aviso(c: Campo): string | null {
    if (!this.lida) return null;
    const v = this.valores[c.key];

    if (c.key === 'regiao' && !this.vazio(v) && !/^[1-4][1-8]$/.test(String(v).trim())) {
      return 'Dente fora da notação FDI (11–48).';
    }
    if (c.obrigatorio && this.vazio(v)) {
      return 'Não lido — preencha manualmente.';
    }
    return null;
  }

  // ---------- upload ----------

  onFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite escolher a mesma foto de novo
    if (file) void this.processar(file);
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragging = true;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) void this.processar(file);
  }

  private async processar(file: File) {
    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Envie uma imagem (JPG ou PNG).');
      return;
    }

    this.limpar();
    this.previewUrl = URL.createObjectURL(file);
    this.lendo = true;
    this.iniciarMensagens();
    this.cdr.detectChanges();

    try {
      const payload = new FormData();
      payload.append('photo', file);
      const res = await api.post('/api/ocr', payload);

      this.preencher(res.data as OcrResponse);
      this.lida = true;
    } catch (err) {
      console.error(err);
      this.toastr.error('Não foi possível ler a foto. Tente novamente com uma foto mais nítida.');
    } finally {
      this.lendo = false;
      this.pararMensagens();
      this.cdr.detectChanges();
    }
  }

  private preencher(r: OcrResponse) {
    const e = r.etiqueta ?? {};
    const i = r.implante ?? {};

    const lidos: Record<string, unknown> = {
      paciente: e.paciente,
      cirurgiao: e.cirurgiao,
      data: e.data,
      regiao: e.regiao,
      auxiliar: e.auxiliar,
      travamento: e.travamento,
      observacao: e.observacao,
      liberarDias: e.liberarDias,
      ref: i.ref,
      lot: i.lot,
      dimensao: i.dimensao
    };

    for (const [chave, valor] of Object.entries(lidos)) {
      if (!this.vazio(valor)) {
        this.valores[chave] = valor as string | number;
        this.lidoPorOcr.add(chave);
      }
    }

    this.confianca = r.confianca ?? null;
  }

  // ---------- ações ----------

  limpar() {
    this.revogarPreview();
    this.valores = {};
    this.lidoPorOcr.clear();
    this.lida = false;
    this.lendo = false;
    this.confianca = null;
  }

  confirmar() {
    const faltam = this.pendentes;
    if (faltam.length) {
      this.toastr.warning(`Preencha: ${faltam.join(', ')}`);
      return;
    }
    // TODO: enviar o registro conferido para a API (fora do escopo da demonstração)
    this.toastr.success('Registro confirmado com sucesso!');
    this.limpar();
  }

  // ---------- utilitários ----------

  private vazio(v: unknown): boolean {
    return v === null || v === undefined || String(v).trim() === '';
  }

  private iniciarMensagens() {
    this.msgIdx = 0;
    this.pararMensagens();
    this.timer = setInterval(() => {
      this.msgIdx = (this.msgIdx + 1) % this.mensagens.length;
      this.cdr.detectChanges();
    }, 1400);
  }

  private pararMensagens() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private revogarPreview() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
  }

  ngOnDestroy() {
    this.pararMensagens();
    this.revogarPreview();
  }
}