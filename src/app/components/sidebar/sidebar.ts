import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Auth, UserSession } from '../../services/auth';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit, OnDestroy {
  user: UserSession | null = null;
  private sub?: Subscription;

  constructor(public auth: Auth, private router: Router, public themeService: ThemeService) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.sub = this.auth.user$.subscribe(u => {
      this.user = u;
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  goToProfile() {
    this.router.navigate(['/profile']);
  }

  logout(event?: Event) {
    if (event) event.stopPropagation();
    this.auth.clearSession();
    this.router.navigate(['/login']);
  }
}
