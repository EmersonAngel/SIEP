export type LoginRole = 'ESTUDIANTE' | 'PROFESOR' | 'ADMIN';

export interface LoginRoleOption {
  id: LoginRole;
  label: string;
  icon: string;
  accent: string;
  accentSoft: string;
  emailPlaceholder: string;
  hint: string;
  narrative: string;
  previewCase: string;
  previewScene: string;
  demoEmail: string;
  demoPassword: string;
}

export const LOGIN_ROLES: LoginRoleOption[] = [
  {
    id: 'ESTUDIANTE',
    label: 'Estudiante',
    icon: 'school',
    accent: '#4f6fd6',
    accentSoft: '#e8eeff',
    emailPlaceholder: 'estudiante@institucion.edu.co',
    hint: 'Accede a tus casos asignados, explora el simulador y registra tu bitácora reflexiva.',
    narrative:
      'Entrena decisiones en casos de VBG, feminicidio, NNA y rutas de protección con retroalimentación formativa.',
    previewCase: 'SIM-VBG-001',
    previewScene: 'Hospital · Comisaría',
    demoEmail: 'estudiante@psychosim.edu.co',
    demoPassword: 'Estudiante123!',
  },
  {
    id: 'PROFESOR',
    label: 'Docente',
    icon: 'co_present',
    accent: '#2c2a84',
    accentSoft: '#ecebff',
    emailPlaceholder: 'docente@institucion.edu.co',
    hint: 'Gestiona grupos, asigna simulaciones y revisa evidencias con rúbricas académicas.',
    narrative:
      'Supervisa intentos, evalúa competencias y acompaña el aprendizaje con evidencia clínica trazable.',
    previewCase: 'Panel docente',
    previewScene: 'Grupos · Reportes',
    demoEmail: 'profesora@psychosim.edu.co',
    demoPassword: 'Profesor123!',
  },
  {
    id: 'ADMIN',
    label: 'Administrador',
    icon: 'admin_panel_settings',
    accent: '#7c3aed',
    accentSoft: '#f1e8ff',
    emailPlaceholder: 'admin@institucion.edu.co',
    hint: 'Administra usuarios, autoría de casos y publicación del catálogo institucional.',
    narrative:
      'Configura la plataforma, publica versiones de casos y garantiza el acceso seguro por rol.',
    previewCase: 'Autoría',
    previewScene: 'Usuarios · Casos',
    demoEmail: 'admin@psychosim.edu.co',
    demoPassword: 'Admin123!',
  },
];

export function findLoginRole(id: LoginRole): LoginRoleOption {
  return LOGIN_ROLES.find(role => role.id === id) ?? LOGIN_ROLES[0];
}
