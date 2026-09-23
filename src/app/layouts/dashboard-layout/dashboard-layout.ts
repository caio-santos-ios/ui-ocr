import { Component, HostListener, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar],
  templateUrl: './dashboard-layout.html',
  styleUrls: ['./dashboard-layout.css']
})
export class DashboardLayout implements OnInit {
  private readonly STORAGE_KEY = 'sidebar_open';
  private isBrowser: boolean;
  isSidebarOpen = true;

  constructor(
    public themeService: ThemeService,
    public router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.isSidebarOpen = this.getInitialSidebarState();
    }
  }

  ngOnInit(): void {}

  private getInitialSidebarState(): boolean {
    if (!this.isBrowser) return true;
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
    return window.innerWidth >= 1024;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (this.isBrowser) {
      if (event.target.innerWidth >= 1024) {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        this.isSidebarOpen = saved !== null ? saved === 'true' : true;
      } else {
        this.isSidebarOpen = false;
      }
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, String(this.isSidebarOpen));
    }
  }

  closeOnMobile() {
    if (this.isBrowser && window.innerWidth < 1024) {
      this.isSidebarOpen = false;
    }
  }
}
