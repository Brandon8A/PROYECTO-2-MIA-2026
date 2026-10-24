import { Carpetas } from './../pages/carpetas/carpetas';
import { Routes } from '@angular/router';
import { Login } from '../pages/login/login';
import { Inicio } from '../pages/inicio/inicio';
import { AuthGuard } from './guards/auth.guard';
import { AccesoDenegado } from '../pages/acceso-denegado/acceso-denegado';
import { rolGuard } from './guards/rol.guard';
import { UsuariosAdmin } from '../pages/admin/usuarios/usuarios';
import { ReportesAdmin } from '../pages/admin/reportes/reportes';
import { ActividadAdmin } from '../pages/admin/actividad/actividad';

export const routes: Routes = [
  { path: 'login', component: Login},
  { path: 'inicio', component: Inicio, canActivate: [AuthGuard]},
  { path: 'carpetas', component: Carpetas, canActivate: [AuthGuard]},
  { path: 'acceso-denegado', component: AccesoDenegado},
  { path: 'admin/usuarios', component: UsuariosAdmin, canActivate: [AuthGuard]},
  { path: 'admin/reportes', component: ReportesAdmin, canActivate: [AuthGuard]},
  { path: 'admin/actividad', component: ActividadAdmin, canActivate: [AuthGuard]},
  { path: '', redirectTo: 'inicio', pathMatch: 'full'},
  { path: '**', redirectTo: 'inicio'}
];
