import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GrupoService, Grupo } from '../../core/api/grupo.service';
import { ReporteService } from '../../core/api/reporte.service';
import { SimulationService } from '../../core/api/simulation.service';
import { AdminUser, UserAdminService } from '../../core/api/user-admin.service';
import { AuthService } from '../../core/auth/auth.service';
import { APP_BRAND } from '../../core/config/brand.config';
import { Dashboard } from '../../core/models/sesion.model';
import {
  RecentAttempt,
  SimulationCaseSummary,
  StudentAttemptSummary
} from '../../core/models/simulation.model';
import { DashboardChartsComponent } from './dashboard-charts.component';
import { QuickAction, QuickActionsComponent } from './quick-actions.component';

interface DashboardMetric {
  icon: string;
  value: string;
  label: string;
  status: string;
  badgeClass: 'green' | 'purple' | 'blue' | 'orange' | 'neutral';
}

interface LearningGap {
  titulo: string;
  texto: string;
  estado: string;
  icon: string;
  color: 'green' | 'purple' | 'orange' | 'blue';
}

interface TrainingResume {
  caso: string;
  rol: string;
  ultimaAccion: string;
  progreso: number;
  estado: string;
  attemptId?: string;
}

interface HeroStatusItem {
  label: string;
  value: string;
}

interface HeroStatusCard {
  title: string;
  chips: string[];
  items: HeroStatusItem[];
  action: QuickAction;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatChipsModule, MatIconModule, MatTableModule, DashboardChartsComponent, QuickActionsComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  readonly brand = APP_BRAND;
  readonly auth = inject(AuthService);
  private readonly reporteService = inject(ReporteService);
  private readonly simulationService = inject(SimulationService);
  private readonly userAdminService = inject(UserAdminService);
  private readonly grupoService = inject(GrupoService);

  readonly dashboard = signal<Dashboard | null>(null);
  readonly studentHistory = signal<StudentAttemptSummary[]>([]);
  readonly adminUsers = signal<AdminUser[]>([]);
  readonly grupos = signal<Grupo[]>([]);
  readonly simulationCases = signal<SimulationCaseSummary[]>([]);
  readonly recentAttempts = signal<RecentAttempt[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly loadingMessage = signal('Cargando métricas académicas…');

  readonly cols = ['caso', 'estudiante', 'puntaje', 'estado', 'accion'];
  readonly studentCols = ['caso', 'puntaje', 'estado', 'accion'];
  readonly progressSegments = Array.from({ length: 10 });

  ngOnInit() {
    if (this.auth.hasRole('ESTUDIANTE')) {
      this.loadStudentDashboard();
    } else if (this.auth.hasRole('ADMIN')) {
      this.loadAdminDashboard();
    } else if (this.auth.hasRole('PROFESOR')) {
      this.loadProfessorDashboard();
    } else {
      this.loading.set(false);
      this.error.set(true);
    }
  }

  isAdmin(): boolean {
    return this.auth.hasRole('ADMIN');
  }

  isProfesor(): boolean {
    return this.auth.hasRole('PROFESOR');
  }

  isEstudiante(): boolean {
    return this.auth.hasRole('ESTUDIANTE');
  }

  chartsRole(): 'ADMIN' | 'PROFESOR' | 'ESTUDIANTE' {
    if (this.isAdmin()) return 'ADMIN';
    if (this.isProfesor()) return 'PROFESOR';
    return 'ESTUDIANTE';
  }

  hasData(): boolean {
    if (this.isEstudiante()) {
      return !this.error() && (this.studentHistory().length > 0 || this.simulationCases().length > 0);
    }
    return !!this.dashboard() && !this.error();
  }

  continuarEntrenamiento(): TrainingResume | null {
    if (this.isEstudiante()) {
      const active = this.studentHistory().find(a => a.status === 'IN_PROGRESS');
      if (!active) return null;
      return {
        caso: active.caseTitle,
        rol: 'Psicólogo social en formación',
        ultimaAccion: 'Simulación en curso',
        progreso: active.accumulatedScore > 0 ? Math.min(100, active.accumulatedScore) : 0,
        estado: 'En curso',
        attemptId: active.attemptId
      };
    }

    const data = this.dashboard();
    const active = data?.intentosRecientes?.find(
      item => item.estado === 'EN_PROGRESO' || item.estado === 'IN_PROGRESS'
    );
    if (!active) return null;
    return {
      caso: active.casoTitulo,
      rol: 'Psicólogo social en formación',
      ultimaAccion: 'Simulación en curso',
      progreso: active.puntaje && active.puntaje > 0 ? Math.min(100, active.puntaje) : 0,
      estado: 'En curso'
    };
  }

  metrics(): DashboardMetric[] {
    if (this.isAdmin()) return this.adminMetrics();
    if (this.isProfesor()) return this.professorMetrics();
    if (this.isEstudiante()) return this.studentMetrics();
    return [];
  }

  quickActions(): QuickAction[] {
    if (this.isAdmin()) {
      return [
        { label: 'Gestión de usuarios', route: '/portal/admin/usuarios', icon: 'manage_accounts', accent: true },
        { label: 'Gestión de casos', route: '/portal/casos', icon: 'account_tree' },
        { label: 'Trazabilidad', route: '/portal/docente/trazabilidad', icon: 'timeline' }
      ];
    }
    if (this.isProfesor()) {
      return [
        { label: 'Ver trazabilidad', route: '/portal/docente/trazabilidad', icon: 'timeline', accent: true },
        { label: 'Revisar rúbricas', route: '/portal/docente/trazabilidad', icon: 'grading' },
        { label: 'Ver reportes', route: '/portal/reportes', icon: 'analytics' },
        { label: 'Gestionar grupos', route: '/portal/grupos', icon: 'groups' }
      ];
    }
    return [
      { label: 'Continuar simulación', route: '/portal/simulador', icon: 'play_arrow', accent: true },
      { label: 'Ver historial', route: '/portal/simulador', icon: 'history' },
      { label: 'Ver reporte final', route: '/portal/simulador', icon: 'description' }
    ];
  }

  heroTitle(): string {
    if (this.isAdmin()) return 'Panel de administración académica';
    if (this.isProfesor()) return 'Seguimiento de tus grupos';
    return 'Tu entrenamiento psicosocial';
  }

  heroLead(): string {
    if (this.isAdmin()) {
      return 'Supervisa usuarios, casos publicados, simulaciones y el estado general del sistema formativo.';
    }
    if (this.isProfesor()) {
      return 'Revisa el avance de tus cohortes, detecta brechas formativas y accede a trazabilidad docente.';
    }
    return 'Continúa tus simulaciones, consulta tu historial y revisa recomendaciones formativas pendientes.';
  }

  heroStatusCard(): HeroStatusCard {
    if (this.loading()) {
      return this.heroStatusLoadingCard();
    }
    if (this.isAdmin()) return this.heroStatusAdminCard();
    if (this.isProfesor()) return this.heroStatusProfessorCard();
    return this.heroStatusStudentCard();
  }

  private heroStatusLoadingCard(): HeroStatusCard {
    const action = this.isEstudiante()
      ? { label: 'Continuar simulación', route: '/portal/simulador', icon: 'play_arrow', accent: true }
      : this.isProfesor()
        ? { label: 'Revisar trazabilidad', route: '/portal/docente/trazabilidad', icon: 'timeline', accent: true }
        : { label: 'Gestión de usuarios', route: '/portal/admin/usuarios', icon: 'manage_accounts', accent: true };

    return {
      title: this.isAdmin()
        ? 'Estado general de SIEP'
        : this.isProfesor()
          ? 'Estado de tus grupos'
          : 'Tu avance formativo',
      chips: this.isAdmin()
        ? ['Usuarios', 'Casos', 'Sistema']
        : this.isProfesor()
          ? ['Grupos', 'Intentos', 'Rúbricas']
          : ['Casos', 'Progreso', 'Historial'],
      items: [
        { label: 'Cargando…', value: '—' },
        { label: 'Cargando…', value: '—' },
        { label: 'Cargando…', value: '—' },
        { label: 'Cargando…', value: '—' }
      ],
      action
    };
  }

  private heroStatusAdminCard(): HeroStatusCard {
    const users = this.adminUsers();
    const data = this.dashboard();
    const activeUsers = users.filter(u => u.activo).length;
    const published = this.publishedCasesCount();
    const completed = data?.simulacionesCompletadas ?? 0;
    const recentCount = data?.intentosRecientes?.length ?? this.recentAttempts().length;

    return {
      title: 'Estado general de SIEP',
      chips: ['Usuarios', 'Casos', 'Sistema'],
      items: [
        {
          label: 'Usuarios activos',
          value: activeUsers > 0 ? String(activeUsers) : 'Sin datos suficientes'
        },
        {
          label: 'Casos publicados',
          value: published > 0 ? String(published) : 'Aún no registrado'
        },
        {
          label: 'Simulaciones completadas',
          value: completed > 0 ? String(completed) : 'Aún no registrado'
        },
        {
          label: 'Intentos recientes',
          value: recentCount > 0 ? String(recentCount) : 'Aún no registrado'
        }
      ],
      action: { label: 'Gestión de usuarios', route: '/portal/admin/usuarios', icon: 'manage_accounts', accent: true }
    };
  }

  private heroStatusProfessorCard(): HeroStatusCard {
    const data = this.dashboard();
    const grupos = this.grupos();
    const assignedStudents = grupos.reduce((sum, g) => sum + (g.totalEstudiantes ?? 0), 0);
    const recentCount = data?.intentosRecientes?.length ?? 0;

    return {
      title: 'Estado de tus grupos',
      chips: ['Grupos', 'Intentos', 'Rúbricas'],
      items: [
        {
          label: 'Grupos activos',
          value: grupos.length > 0 ? String(grupos.length) : 'Sin datos suficientes'
        },
        {
          label: 'Estudiantes asignados',
          value: assignedStudents > 0 ? String(assignedStudents) : 'Sin datos suficientes'
        },
        {
          label: 'Intentos recientes',
          value: recentCount > 0 ? String(recentCount) : 'Aún no registrado'
        },
        {
          label: 'Rúbricas pendientes',
          value: 'Pendiente'
        }
      ],
      action: {
        label: 'Revisar trazabilidad',
        route: '/portal/docente/trazabilidad',
        icon: 'timeline',
        accent: true
      }
    };
  }

  private heroStatusStudentCard(): HeroStatusCard {
    const history = this.studentHistory();
    const cases = this.simulationCases();
    const assignedCases = cases.length > 0 ? cases.length : new Set(history.map(h => h.caseTitle)).size;
    const completed = this.studentCompletedCount();
    const scores = history.filter(h => h.accumulatedScore > 0).map(h => h.accumulatedScore);
    const bestScore = scores.length ? String(Math.max(...scores)) : 'Pendiente';
    const totalSeconds = history.reduce((sum, h) => sum + (h.totalDurationSeconds ?? 0), 0);
    const totalTime = totalSeconds > 0 ? this.formatDuration(totalSeconds) : 'Pendiente';

    return {
      title: 'Tu avance formativo',
      chips: ['Casos', 'Progreso', 'Historial'],
      items: [
        {
          label: 'Casos asignados',
          value: assignedCases > 0 ? String(assignedCases) : 'Sin datos suficientes'
        },
        {
          label: 'Intentos completados',
          value: completed > 0 ? String(completed) : 'Aún no registrado'
        },
        {
          label: 'Mejor puntaje',
          value: bestScore
        },
        {
          label: 'Tiempo total',
          value: totalTime
        }
      ],
      action: { label: 'Continuar simulación', route: '/portal/simulador', icon: 'play_arrow', accent: true }
    };
  }

  systemStatus(): { label: string; detail: string; ok: boolean } {
    if (this.error()) {
      return {
        label: 'Servicio interrumpido',
        detail: 'No fue posible confirmar el estado del sistema. Revisa la conexión.',
        ok: false
      };
    }
    if (this.loading()) {
      return {
        label: 'Verificando servicios',
        detail: 'Consultando métricas académicas del entorno SIEP.',
        ok: true
      };
    }
    return {
      label: 'Sistema operativo',
      detail: 'Servicios académicos respondiendo con normalidad.',
      ok: true
    };
  }

  adminMetrics(): DashboardMetric[] {
    const users = this.adminUsers();
    const data = this.dashboard();
    const published = this.publishedCasesCount();
    const criticas = this.criticalDecisions(data);

    const totalUsers = users.length;
    const activeStudents = users.filter(u => u.role === 'ESTUDIANTE' && u.activo).length;
    const activeTeachers = users.filter(u => u.role === 'PROFESOR' && u.activo).length;
    const completed = data?.simulacionesCompletadas ?? 0;
    const recentCount = data?.intentosRecientes?.length ?? this.recentAttempts().length;

    return [
      this.metric('groups', totalUsers, 'Total de usuarios', totalUsers > 0 ? 'Registro activo' : 'Sin usuarios', totalUsers > 0 ? 'purple' : 'neutral'),
      this.metric('school', activeStudents, 'Estudiantes activos', activeStudents > 0 ? 'Cohortes activas' : 'Sin datos suficientes', activeStudents > 0 ? 'green' : 'neutral'),
      this.metric('co_present', activeTeachers, 'Profesores activos', activeTeachers > 0 ? 'Docentes habilitados' : 'Sin datos suficientes', activeTeachers > 0 ? 'blue' : 'neutral'),
      this.metric('account_tree', published, 'Casos publicados', published > 0 ? 'Catálogo publicado' : 'Sin casos publicados', published > 0 ? 'blue' : 'neutral'),
      this.metric('task_alt', completed, 'Simulaciones completadas', completed > 0 ? 'Histórico registrado' : 'Aún no hay intentos registrados', completed > 0 ? 'green' : 'neutral'),
      this.metric('history', recentCount, 'Intentos recientes', recentCount > 0 ? 'Actividad reciente' : 'Aún no hay intentos registrados', recentCount > 0 ? 'purple' : 'neutral'),
      this.metric('warning_amber', criticas, 'Decisiones críticas', criticas > 0 ? 'Requiere revisión' : 'Sin alertas registradas', criticas > 0 ? 'orange' : 'neutral'),
      this.metric('monitor_heart', data?.simulacionesEnProgreso ?? 0, 'Simulaciones en curso', (data?.simulacionesEnProgreso ?? 0) > 0 ? 'En progreso' : 'Sin simulaciones activas', (data?.simulacionesEnProgreso ?? 0) > 0 ? 'purple' : 'neutral')
    ];
  }

  professorMetrics(): DashboardMetric[] {
    const data = this.dashboard();
    const grupos = this.grupos();
    const assignedStudents = grupos.reduce((sum, g) => sum + (g.totalEstudiantes ?? 0), 0);
    const casosAsignados = this.uniqueCasesCount(data);
    const promedioRaw = data?.puntajePromedioSimulacion ?? data?.puntajePromedioGlobal;
    const promedio = promedioRaw && promedioRaw > 0 ? String(Math.round(promedioRaw)) : 'Pendiente';
    const criticas = this.criticalDecisions(data);
    const recentCount = data?.intentosRecientes?.length ?? 0;
    const completed = data?.simulacionesCompletadas ?? 0;

    return [
      this.metric('groups', grupos.length, 'Grupos activos', grupos.length > 0 ? 'Cohortes asignadas' : 'Sin grupos registrados', grupos.length > 0 ? 'purple' : 'neutral'),
      this.metric('people', assignedStudents, 'Estudiantes asignados', assignedStudents > 0 ? 'En tus grupos' : 'Sin estudiantes asignados', assignedStudents > 0 ? 'green' : 'neutral'),
      this.metric('history', recentCount, 'Intentos recientes', recentCount > 0 ? 'Últimas sesiones' : 'Aún no hay intentos registrados', recentCount > 0 ? 'blue' : 'neutral'),
      this.metric('account_tree', casosAsignados, 'Casos asignados', casosAsignados > 0 ? 'Catálogo activo' : 'No hay casos asignados', casosAsignados > 0 ? 'blue' : 'neutral'),
      this.metric('task_alt', completed, 'Simulaciones completadas', completed > 0 ? 'Avance registrado' : 'Aún no hay intentos registrados', completed > 0 ? 'green' : 'neutral'),
      this.metric('analytics', promedio, 'Promedio de desempeño', promedio === 'Pendiente' ? 'Sin datos suficientes todavía' : 'Evaluación activa', promedio === 'Pendiente' ? 'neutral' : 'green'),
      this.metric('warning_amber', criticas, 'Decisiones críticas', criticas > 0 ? 'Requiere revisión' : 'Sin alertas registradas', criticas > 0 ? 'orange' : 'neutral'),
      this.metric('grading', 'Pendiente', 'Rúbricas pendientes', 'Sin datos suficientes todavía', 'neutral')
    ];
  }

  studentMetrics(): DashboardMetric[] {
    const history = this.studentHistory();
    const cases = this.simulationCases();
    const inProgress = history.filter(a => a.status === 'IN_PROGRESS').length;
    const completed = history.filter(a => a.status === 'COMPLETED' || a.status === 'SAFE_EXITED').length;
    const assignedCases = cases.length > 0 ? cases.length : new Set(history.map(h => h.caseTitle)).size;
    const scores = history.filter(h => h.accumulatedScore > 0).map(h => h.accumulatedScore);
    const bestScore = scores.length ? String(Math.max(...scores)) : 'Pendiente';
    const totalSeconds = history.reduce((sum, h) => sum + (h.totalDurationSeconds ?? 0), 0);
    const totalTime = totalSeconds > 0 ? this.formatDuration(totalSeconds) : 'Pendiente';
    const pendingReview = history.reduce(
      (sum, h) => sum + h.riskyDecisions + h.inadequateDecisions + h.prohibitedDecisions,
      0
    );

    return [
      this.metric('account_tree', assignedCases, 'Casos asignados', assignedCases > 0 ? 'Disponibles' : 'No hay casos asignados', assignedCases > 0 ? 'blue' : 'neutral'),
      this.metric('play_circle', inProgress, 'Simulaciones en progreso', inProgress > 0 ? 'En curso' : 'Sin simulaciones activas', inProgress > 0 ? 'purple' : 'neutral'),
      this.metric('task_alt', completed, 'Intentos completados', completed > 0 ? 'Histórico personal' : 'Aún no hay intentos registrados', completed > 0 ? 'green' : 'neutral'),
      this.metric('emoji_events', bestScore, 'Mejor puntaje', bestScore === 'Pendiente' ? 'Sin datos suficientes todavía' : 'Mejor resultado', bestScore === 'Pendiente' ? 'neutral' : 'green'),
      this.metric('schedule', totalTime, 'Tiempo total', totalTime === 'Pendiente' ? 'Sin datos suficientes todavía' : 'Acumulado', totalTime === 'Pendiente' ? 'neutral' : 'blue'),
      this.metric('lightbulb', pendingReview, 'Recomendaciones pendientes', pendingReview > 0 ? 'Decisiones a revisar' : 'Sin recomendaciones pendientes', pendingReview > 0 ? 'orange' : 'neutral')
    ];
  }

  studentCompletedCount(): number {
    return this.studentHistory().filter(
      a => a.status === 'COMPLETED' || a.status === 'SAFE_EXITED'
    ).length;
  }

  actividadDocenteVacia(): boolean {
    const data = this.dashboard();
    if (!data) return true;
    return (
      (data.simulacionesCompletadas ?? 0) === 0 &&
      (data.simulacionesEnProgreso ?? 0) === 0 &&
      (data.decisionesAdecuadas ?? 0) === 0
    );
  }

  brechasSinDatosSuficientes(): boolean {
    return !this.loading() && !this.error() && !this.hasData();
  }

  brechas(): LearningGap[] {
    const data = this.dashboard();
    if (!data) return [];

    const gaps: LearningGap[] = [];
    const criticas = this.criticalDecisions(data);

    if (criticas > 0) {
      gaps.push({
        titulo: 'Decisiones críticas',
        texto: `${criticas} decisión(es) requieren revisión docente.`,
        estado: 'En revisión',
        icon: 'gavel',
        color: 'purple'
      });
    }

    if ((data.simulacionesEnProgreso ?? 0) === 0 && (data.simulacionesCompletadas ?? 0) === 0) {
      gaps.push({
        titulo: 'Simulaciones',
        texto: 'Aún no hay simulaciones registradas en el periodo.',
        estado: 'Pendiente',
        icon: 'travel_explore',
        color: 'blue'
      });
    } else if ((data.simulacionesEnProgreso ?? 0) > 0) {
      gaps.push({
        titulo: 'Seguimiento activo',
        texto: `${data.simulacionesEnProgreso} simulación(es) en progreso.`,
        estado: 'En curso',
        icon: 'play_circle',
        color: 'green'
      });
    }

    if (!gaps.length) {
      gaps.push({
        titulo: 'Sin alertas formativas',
        texto: 'No hay alertas formativas con los datos actuales.',
        estado: 'Adecuado',
        icon: 'verified',
        color: 'green'
      });
    }

    return gaps;
  }

  actividadDocente(): { titulo: string; valor: number | string }[] {
    const data = this.dashboard();
    if (!data) return [];

    return [
      { titulo: 'Simulaciones completadas', valor: data.simulacionesCompletadas ?? 0 },
      { titulo: 'Simulaciones en progreso', valor: data.simulacionesEnProgreso ?? 0 },
      { titulo: 'Decisiones adecuadas', valor: data.decisionesAdecuadas ?? 0 }
    ];
  }

  filledProgressSegments() {
    const training = this.continuarEntrenamiento();
    if (!training) return 0;
    return Math.round(training.progreso / 10);
  }

  rows() {
    if (this.isEstudiante()) {
      return this.studentHistory()
        .slice(0, 8)
        .map(item => ({
          casoTitulo: item.caseTitle,
          estudiante: '—',
          puntajeLabel: item.accumulatedScore > 0 ? String(item.accumulatedScore) : 'Pendiente',
          estado: this.estadoLabel(item.status),
          attemptId: item.attemptId,
          studentRow: true
        }));
    }

    const data = this.dashboard();
    const source = data?.intentosRecientes ?? [];

    return source.map(item => ({
      casoTitulo: item.casoTitulo,
      estudiante: item.estudiante,
      puntajeLabel: item.puntaje && item.puntaje > 0 ? String(item.puntaje) : 'Pendiente',
      estado: this.estadoLabel(item.estado),
      studentRow: false
    }));
  }

  tableColumns(): string[] {
    return this.isEstudiante() ? this.studentCols : this.cols;
  }

  private loadAdminDashboard() {
    this.loadingMessage.set('Cargando métricas académicas…');
    forkJoin({
      dashboard: this.reporteService.getDashboard().pipe(catchError(() => of(null))),
      users: this.userAdminService.list().pipe(catchError(() => of([] as AdminUser[]))),
      cases: this.simulationService.listCases().pipe(catchError(() => of([] as SimulationCaseSummary[]))),
      recent: this.simulationService.recentAttempts().pipe(catchError(() => of([] as RecentAttempt[])))
    }).subscribe({
      next: ({ dashboard, users, cases, recent }) => {
        this.dashboard.set(dashboard);
        this.adminUsers.set(users);
        this.simulationCases.set(cases);
        this.recentAttempts.set(recent);
        this.error.set(!dashboard && !users.length);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  private loadProfessorDashboard() {
    this.loadingMessage.set('Cargando métricas académicas…');
    forkJoin({
      dashboard: this.reporteService.getDashboard(),
      grupos: this.grupoService.listar().pipe(catchError(() => of([] as Grupo[])))
    }).subscribe({
      next: ({ dashboard, grupos }) => {
        this.dashboard.set(dashboard);
        this.grupos.set(grupos);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  private loadStudentDashboard() {
    this.loadingMessage.set('Cargando métricas académicas…');
    forkJoin({
      history: this.simulationService.attemptHistory(),
      cases: this.simulationService.listCases().pipe(catchError(() => of([] as SimulationCaseSummary[])))
    }).subscribe({
      next: ({ history, cases }) => {
        this.studentHistory.set(history);
        this.simulationCases.set(cases);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  private metric(
    icon: string,
    value: number | string,
    label: string,
    status: string,
    badgeClass: DashboardMetric['badgeClass']
  ): DashboardMetric {
    const display = typeof value === 'number'
      ? (value > 0 ? String(value) : 'Pendiente')
      : value;
    return { icon, value: display, label, status, badgeClass };
  }

  private criticalDecisions(data: Dashboard | null): number {
    if (!data) return 0;
    return (
      (data.decisionesRiesgosas ?? 0) +
      (data.decisionesInadecuadas ?? 0) +
      (data.decisionesProhibidas ?? 0)
    );
  }

  private uniqueCasesCount(data: Dashboard | null): number {
    if (!data) return 0;
    return new Set([
      ...(data.intentosRecientes?.map(i => i.casoTitulo) ?? []),
      ...(data.ultimosIntentos?.map(i => i.casoTitulo) ?? [])
    ]).size;
  }

  private publishedCasesCount(): number {
    const simCases = this.simulationCases().filter(c => c.status?.toUpperCase() === 'PUBLISHED').length;
    if (simCases > 0) return simCases;
    return this.simulationCases().length;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours} h ${minutes} min`;
    if (minutes > 0) return `${minutes} min`;
    return `${seconds} s`;
  }

  private estadoLabel(estado: string) {
    if (estado === 'COMPLETADO' || estado === 'COMPLETED' || estado === 'SAFE_EXITED') return 'Completado';
    if (estado === 'PENDIENTE') return 'Pendiente';
    return 'En curso';
  }
}
