import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { APP_BRAND } from '../../core/config/brand.config';
import { SiepParticleLayerComponent } from '../../shared/ui/siep-particle-layer.component';

interface TrainingCase {
  icon: string;
  title: string;
  text: string;
  tag: string;
  accent: string;
}

interface WorkflowStep {
  step: string;
  icon: string;
  title: string;
  text: string;
  accent: string;
}

interface RoleCard {
  icon: string;
  title: string;
  text: string;
  accent: string;
  features: string[];
}

interface EthicsItem {
  icon: string;
  title: string;
  text: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, SiepParticleLayerComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  readonly brand = APP_BRAND;
  readonly menuOpen = signal(false);

  readonly simulatorSceneSrc = '/assets/images/institution/landing1.png';

  readonly caseInfo = [
    { icon: 'person', label: 'Rol', text: 'Psicólogo social en formación' },
    {
      icon: 'track_changes',
      label: 'Objetivo',
      text: 'Identificar riesgo, ruta de atención y decisión ética.'
    },
    { icon: 'description', label: 'Contexto', text: 'Entorno familiar con posible situación de riesgo.' }
  ];

  readonly heroDecisions = [
    { icon: 'shield', label: 'Activar ruta institucional' },
    { icon: 'forum', label: 'Solicitar más contexto' },
    { icon: 'edit_note', label: 'Registrar observación ética' }
  ];

  readonly trustItems = ['Entorno seguro', 'Aprendizaje ético', 'Evaluación formativa'];

  readonly trainingCases: TrainingCase[] = [
    {
      icon: 'home_work',
      title: 'Violencia intrafamiliar',
      text: 'Evalúa señales de riesgo, activa rutas de protección y documenta decisiones con criterio ético y legal.',
      tag: 'Caso sensible',
      accent: '#7c3aed'
    },
    {
      icon: 'groups',
      title: 'Desplazamiento forzado',
      text: 'Analiza contexto comunitario, necesidades de apoyo y articulación con redes institucionales del territorio.',
      tag: 'Psicología social',
      accent: '#14b8a6'
    },
    {
      icon: 'diversity_3',
      title: 'Conflicto comunitario',
      text: 'Practica mediación psicosocial, lectura del conflicto y decisiones que respeten derechos y convivencia.',
      tag: 'Intervención',
      accent: '#f97316'
    }
  ];

  readonly workflow: WorkflowStep[] = [
    {
      step: '1',
      icon: 'folder_open',
      title: 'Selecciona un caso',
      text: 'Elige un escenario de entrenamiento acorde a tu cohorte.',
      accent: '#7c3aed'
    },
    {
      step: '2',
      icon: 'psychology',
      title: 'Analiza la situación',
      text: 'Explora contexto, personajes y señales antes de intervenir.',
      accent: '#14b8a6'
    },
    {
      step: '3',
      icon: 'account_tree',
      title: 'Toma decisiones',
      text: 'Cada elección queda registrada en la trazabilidad.',
      accent: '#f97316'
    },
    {
      step: '4',
      icon: 'bar_chart',
      title: 'Recibe retroalimentación',
      text: 'Consulta orientación formativa y evaluación con rúbricas.',
      accent: '#3b82f6'
    }
  ];

  readonly roles: RoleCard[] = [
    {
      icon: 'school',
      title: 'Estudiante',
      text: 'Practica intervención psicosocial en escenarios simulados y recibe retroalimentación formativa.',
      accent: '#7c3aed',
      features: ['Simulaciones', 'Bitácora', 'Retroalimentación']
    },
    {
      icon: 'supervisor_account',
      title: 'Profesor',
      text: 'Asigna casos, supervisa trazabilidad y evalúa el desempeño con rúbricas académicas.',
      accent: '#14b8a6',
      features: ['Rúbricas', 'Evaluación', 'Seguimiento']
    },
    {
      icon: 'admin_panel_settings',
      title: 'Administrador',
      text: 'Gestiona usuarios, publica casos y configura el entorno académico del simulador.',
      accent: '#3b82f6',
      features: ['Gestión', 'Trazabilidad', 'Reportes']
    }
  ];

  readonly ethicsItems: EthicsItem[] = [
    { icon: 'exit_to_app', title: 'Salida segura', text: 'Recursos institucionales en contenidos sensibles.' },
    { icon: 'record_voice_over', title: 'Lenguaje no estigmatizante', text: 'Comunicación centrada en derechos.' },
    { icon: 'lock', title: 'Confidencialidad', text: 'Bitácoras protegidas con fines formativos.' },
    { icon: 'route', title: 'Rutas institucionales', text: 'Orientación cuando el escenario lo requiera.' },
    { icon: 'grading', title: 'Evaluación formativa', text: 'Sin diagnósticos ni decisiones automáticas.' }
  ];

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
