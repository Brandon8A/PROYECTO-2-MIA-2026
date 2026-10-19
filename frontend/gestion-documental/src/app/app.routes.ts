import { Carpetas } from './../pages/carpetas/carpetas';
import { Routes } from '@angular/router';
import { Login } from '../pages/login/login';
import { Inicio } from '../pages/inicio/inicio';
import { AuthGuard } from './guards/auth.guard';
import { AccesoDenegado } from '../pages/acceso-denegado/acceso-denegado';
import { AdminsUsuarios } from '../pages/admins-usuarios/admins-usuarios';
import { rolGuard } from './guards/rol.guard';

export const routes: Routes = [
  { path: 'login', component: Login},
  { path: 'inicio', component: Inicio, canActivate: [AuthGuard]},
  { path: 'carpetas', component: Carpetas, canActivate: [AuthGuard]},
  { path: 'admin-usuarios', component: AdminsUsuarios, canActivate: [AuthGuard, rolGuard],
    data: { roles: ['admin']}
  },
  { path: 'acceso-denegado', component: AccesoDenegado},
  { path: '', redirectTo: 'inicio', pathMatch: 'full'},
  { path: '**', redirectTo: 'inicio'}
];
