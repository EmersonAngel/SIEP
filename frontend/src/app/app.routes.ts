import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/public/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'portal',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'jugar',
        canActivate: [roleGuard('ESTUDIANTE', 'ADMIN')],
        loadComponent: () => import('./features/simulator/game-menu.component').then(m => m.GameMenuComponent)
      },
      {
        path: 'simulador',
        loadComponent: () => import('./features/simulator/simulation-catalog.component').then(m => m.SimulationCatalogComponent)
      },
      {
        path: 'simulador/:caseVersionId',
        canActivate: [roleGuard('ESTUDIANTE', 'ADMIN')],
        loadComponent: () => import('./features/simulator/simulation-play.component').then(m => m.SimulationPlayComponent)
      },
      {
        path: 'personaje',
        canActivate: [roleGuard('ESTUDIANTE', 'ADMIN')],
        loadComponent: () => import('./features/character/character-editor.component').then(m => m.CharacterEditorComponent)
      },
      {
        path: 'casos',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/simulator/case-authoring-hub.component').then(m => m.CaseAuthoringHubComponent)
      },
      {
        path: 'casos/:caseVersionId/editor',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/simulator/case-editor.component').then(m => m.CaseEditorComponent)
      },
      {
        path: 'docente/trazabilidad',
        canActivate: [roleGuard('PROFESOR', 'ADMIN')],
        loadComponent: () => import('./features/simulator/instructor-trace.component').then(m => m.InstructorTraceComponent)
      },
      {
        path: 'rubricas',
        canActivate: [roleGuard('PROFESOR', 'ADMIN')],
        loadComponent: () => import('./features/admin/rubrics.component').then(m => m.RubricsComponent)
      },
      {
        path: 'grupos',
        canActivate: [roleGuard('PROFESOR')],
        loadComponent: () => import('./features/grupos/grupo-list.component').then(m => m.GrupoListComponent)
      },
      {
        path: 'reportes',
        canActivate: [roleGuard('PROFESOR')],
        loadComponent: () => import('./features/reportes/reporte-grupo.component').then(m => m.ReporteGrupoComponent)
      },
      {
        path: 'admin/usuarios',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/admin/users.component').then(m => m.UsersComponent)
      }
    ]
  },
  { path: 'dashboard', redirectTo: 'portal/dashboard', pathMatch: 'full' },
  { path: 'simulador', redirectTo: 'portal/simulador', pathMatch: 'full' },
  { path: 'casos', redirectTo: 'portal/casos', pathMatch: 'full' },
  { path: 'docente', redirectTo: 'portal/docente/trazabilidad', pathMatch: 'full' },
  { path: 'rubricas', redirectTo: 'portal/rubricas', pathMatch: 'full' },
  { path: 'grupos', redirectTo: 'portal/grupos', pathMatch: 'full' },
  { path: 'reportes', redirectTo: 'portal/reportes', pathMatch: 'full' },
  { path: 'usuarios', redirectTo: 'portal/admin/usuarios', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
