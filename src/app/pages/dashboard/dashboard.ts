import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { Loading } from '../../components/loading/loading';
import { GlobalService } from '../../services/global.service';
import { api } from '../../services/api';

export interface GroupIndicatorDetail {
  code: string;
  name: string;
  category: string;
  categoryName: string;
  costCenterCount: number;
  totalValue: number;
  percentageOfRevenue: number;
}

export interface FinancialIndicators {
  grossRevenue: number;
  coe: number;
  cot: number;
  margemBruta: number;
  margemBrutaPercent: number;
  ebitdaAgricola: number;
  ebitdaPercent: number;
  capex: number;
  fcol: number;
  compromissosDividas: number;
  saidasNaoOperacionais: number;
  investimentosNaoOperacionais: number;
  deltaCaixaFinal: number;
  groups: GroupIndicatorDetail[];
}

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Loading],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('distributionChart') distributionChartRef!: ElementRef<HTMLCanvasElement>;

  donutChart: Chart | null = null;
  isLoading = true;
  indicatorsLoading = false;

  grossRevenue: number = 0;
  indicators: FinancialIndicators | null = null;

  stats = {
    totalGroups: 0,
    totalSubGroups: 0,
    totalSubCostCenters: 0,
    totalCostCenters: 0,
    totalUsers: 0
  };

  recentCostCenters: any[] = [];

  constructor(
    public global: GlobalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const savedRevenue = localStorage.getItem('gross_revenue');
    if (savedRevenue !== null) {
      const parsed = parseFloat(savedRevenue);
      this.grossRevenue = isNaN(parsed) ? 0 : parsed;
    }
    this.fetchData();
    this.fetchFinancialIndicators();
  }

  ngAfterViewInit() {
    this.initChart();
  }

  ngOnDestroy() {
    this.destroyChart();
  }

  destroyChart() {
    if (this.donutChart) {
      this.donutChart.destroy();
      this.donutChart = null;
    }
  }

  async fetchFinancialIndicators() {
    this.indicatorsLoading = true;
    this.cdr.detectChanges();
    try {
      const res = await api.get('/api/financial-indicators', {
        params: { grossRevenue: this.grossRevenue || 0 }
      });
      if (res.data?.result) {
        this.indicators = res.data.result;
      }
    } catch (e) {
      console.warn('Erro ao carregar indicadores:', e);
    } finally {
      this.indicatorsLoading = false;
      this.cdr.detectChanges();
    }
  }

  private revenueDebounceTimer: any = null;
  onGrossRevenueChange(val: any) {
    const num = parseFloat(val);
    this.grossRevenue = isNaN(num) ? 0 : num;
    localStorage.setItem('gross_revenue', this.grossRevenue.toString());
    if (this.revenueDebounceTimer) {
      clearTimeout(this.revenueDebounceTimer);
    }
    this.revenueDebounceTimer = setTimeout(() => {
      this.fetchFinancialIndicators();
    }, 400);
  }

  async fetchData() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const [resG, resSG, resSCC, resCC, resU] = await Promise.allSettled([
        api.get('/api/group-cost-centers', { params: { pageSize: 5 } }),
        api.get('/api/group-sub-cost-centers', { params: { pageSize: 5 } }),
        api.get('/api/sub-cost-centers', { params: { pageSize: 5 } }),
        api.get('/api/cost-centers', { params: { pageSize: 5 } }),
        api.get('/api/users')
      ]);

      if (resG.status === 'fulfilled') {
        const d = resG.value.data?.result?.data;
        this.stats.totalGroups = d?.totalCount || (Array.isArray(d) ? d.length : 0);
      }
      if (resSG.status === 'fulfilled') {
        const d = resSG.value.data?.result?.data;
        this.stats.totalSubGroups = d?.totalCount || (Array.isArray(d) ? d.length : 0);
      }
      if (resSCC.status === 'fulfilled') {
        const d = resSCC.value.data?.result?.data;
        this.stats.totalSubCostCenters = d?.totalCount || (Array.isArray(d) ? d.length : 0);
      }
      if (resCC.status === 'fulfilled') {
        const resObj = resCC.value.data?.result?.data;
        this.stats.totalCostCenters = resObj?.totalCount || (Array.isArray(resObj) ? resObj.length : 0);
        this.recentCostCenters = resObj?.data || (Array.isArray(resObj) ? resObj : []);
      }
      if (resU.status === 'fulfilled') {
        const d = resU.value.data?.result?.data;
        this.stats.totalUsers = Array.isArray(d) ? d.length : (d?.totalCount || 0);
      }

      this.updateChart();
    } catch (e) {
      console.warn('Erro ao carregar métricas:', e);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  initChart() {
    if (this.distributionChartRef) {
      const ctx = this.distributionChartRef.nativeElement.getContext('2d');
      if (ctx) {
        this.donutChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Grupos', 'SubGrupos', 'SubCentros', 'Centros de Custo'],
            datasets: [
              {
                data: [
                  this.stats.totalGroups || 1,
                  this.stats.totalSubGroups || 1,
                  this.stats.totalSubCostCenters || 1,
                  this.stats.totalCostCenters || 1
                ],
                backgroundColor: ['#38bdf8', '#fdbf0f', '#c084fc', '#4ade80'],
                borderWidth: 0
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#94a3b8', boxWidth: 12, padding: 12, font: { family: 'Plus Jakarta Sans' } }
              }
            }
          }
        });
      }
    }
  }

  updateChart() {
    if (this.donutChart) {
      const hasData = this.stats.totalGroups > 0 || this.stats.totalSubGroups > 0 || this.stats.totalSubCostCenters > 0 || this.stats.totalCostCenters > 0;
      if (hasData) {
        this.donutChart.data.labels = ['Grupos', 'SubGrupos', 'SubCentros', 'Centros de Custo'];
        this.donutChart.data.datasets[0].data = [
          this.stats.totalGroups,
          this.stats.totalSubGroups,
          this.stats.totalSubCostCenters,
          this.stats.totalCostCenters
        ];
        this.donutChart.data.datasets[0].backgroundColor = ['#38bdf8', '#fdbf0f', '#c084fc', '#4ade80'];
      } else {
        this.donutChart.data.labels = ['Sem registros'];
        this.donutChart.data.datasets[0].data = [1];
        this.donutChart.data.datasets[0].backgroundColor = ['#334155'];
      }
      this.donutChart.update();
    }
  }
}
