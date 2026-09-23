import { Routes } from '@angular/router';
import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { CostCenters } from './pages/cost-centers/cost-centers';
import { Users } from './pages/users/users';
import { Profile } from './pages/profile/profile';
import { Login } from './pages/login/login';
import { ResetPassword } from './pages/reset-password/reset-password';
import { Confirmation } from './pages/confirmation/confirmation';
import { ReadPhoto } from './pages/read-photo/read-photo';
import { AuthGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', component: ReadPhoto },
  // { path: 'reset-password', component: ResetPassword },
  // { path: 'confirmation/:code/:device', component: Confirmation },
  // { path: 'confirmation/:code', component: Confirmation },
  // {
  //   path: '',
  //   component: DashboardLayout,
  //   canActivate: [AuthGuard],
  //   children: [
  //     { path: '', redirectTo: 'cost-centers', pathMatch: 'full' },
  //     { path: 'dashboard', component: Dashboard },
  //     { path: 'cost-centers', component: CostCenters },
  //     { path: 'users', component: Users },
  //     { path: 'profile', component: Profile }
  //   ]
  // },
  { path: '**', redirectTo: 'cost-centers' }
];
