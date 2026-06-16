import { AvatarConfig, HAIR_VARIANTS } from '../character/avatar.model';
import { defaultAvatar, hairVariantPatch } from '../character/avatar-config.util';
import { SceneMapDefinition, WorldObject, WorldObjectType } from '../../core/models/simulation.model';
import { backgroundImage, cameraZoom, setBackgroundImage, setCameraZoom } from './world-editor/room-edit.util';

export interface AuthoringSceneTemplate {
  id: string;
  label: string;
  theme: string;
  backgroundImage: string;
  cameraZoom: number;
}

export interface AuthoringObjectTemplate {
  id: string;
  label: string;
  type: WorldObjectType;
  icon: string;
  colorHex: string;
  shortCode: string;
  interactionPrompt: string;
  interactionText: string;
  width: number;
  height: number;
  metadata?: Record<string, unknown>;
}

export interface AuthoringNpcTemplate {
  id: string;
  label: string;
  gender: 'female' | 'male';
  avatar: AvatarConfig;
}

export const AUTHORING_SCENE_TEMPLATES: AuthoringSceneTemplate[] = [
  {
    id: 'clinical-room',
    label: 'Consultorio clinico',
    theme: 'clinical-soft',
    backgroundImage: '',
    cameraZoom: 1,
  },
  {
    id: 'hospital',
    label: 'Urgencias hospitalarias',
    theme: 'risk-assessment',
    backgroundImage: '',
    cameraZoom: 0.95,
  },
  {
    id: 'protection',
    label: 'Ruta de proteccion',
    theme: 'protection-route',
    backgroundImage: '',
    cameraZoom: 1,
  },
  {
    id: 'technical',
    label: 'Oficina de informe',
    theme: 'technical-record',
    backgroundImage: '',
    cameraZoom: 1,
  },
];

export const AUTHORING_OBJECT_TEMPLATES: AuthoringObjectTemplate[] = [
  {
    id: 'npc',
    label: 'NPC / Persona',
    type: 'PERSON',
    icon: 'person',
    colorHex: '#4F7CAC',
    shortCode: 'NPC',
    interactionPrompt: 'Hablar',
    interactionText: '',
    width: 48,
    height: 64,
    metadata: { gender: 'female', avatar: { ...defaultAvatar(), gender: 'female', clothingColor: 'purple', ...hairVariantPatch('long_brown'), mouth: 'seria' } },
  },
  {
    id: 'question',
    label: 'Cuestionario',
    type: 'OBJECT',
    icon: 'quiz',
    colorHex: '#7A6F9E',
    shortCode: 'QUIZ',
    interactionPrompt: 'Responder',
    interactionText: 'Elige la intervencion mas adecuada.',
    width: 48,
    height: 48,
  },
  {
    id: 'tool',
    label: 'Articulo / herramienta',
    type: 'TOOL',
    icon: 'inventory_2',
    colorHex: '#6A8E5E',
    shortCode: 'ITEM',
    interactionPrompt: 'Tomar herramienta',
    interactionText: 'Herramienta disponible para la intervencion.',
    width: 44,
    height: 44,
  },
  {
    id: 'door',
    label: 'Puerta',
    type: 'EXIT',
    icon: 'door_open',
    colorHex: '#A85064',
    shortCode: 'EXIT',
    interactionPrompt: 'Entrar',
    interactionText: '',
    width: 48,
    height: 64,
    metadata: { targetNodeKey: '', entryX: 120, entryY: 120 },
  },
  {
    id: 'resource',
    label: 'Recurso informativo',
    type: 'RESOURCE',
    icon: 'article',
    colorHex: '#5E8E6A',
    shortCode: 'INFO',
    interactionPrompt: 'Revisar',
    interactionText: 'Informacion de apoyo para tomar la decision.',
    width: 44,
    height: 44,
  },
];

export const AUTHORING_NPC_TEMPLATES: AuthoringNpcTemplate[] = [
  {
    id: 'mujer-adulta',
    label: 'Mujer adulta',
    gender: 'female',
    avatar: { ...defaultAvatar(), gender: 'female', clothingColor: 'burgundy', ...hairVariantPatch('long_brown'), mouth: 'seria', eyes: 'amables', brows: 'suaves' },
  },
  {
    id: 'hombre-adulto',
    label: 'Hombre adulto',
    gender: 'male',
    avatar: { ...defaultAvatar(), gender: 'male', clothingColor: 'blue', ...hairVariantPatch('short_black'), mouth: 'neutra', eyes: 'atentos', brows: 'rectas', skinTone: 'media' },
  },
  {
    id: 'adolescente',
    label: 'Adolescente',
    gender: 'female',
    avatar: { ...defaultAvatar(), gender: 'female', clothingColor: 'green', ...hairVariantPatch('medium_red'), mouth: 'seria', eyes: 'neutros', brows: 'suaves', skinTone: 'clara' },
  },
  {
    id: 'profesional',
    label: 'Profesional',
    gender: 'female',
    avatar: { ...defaultAvatar(), gender: 'female', clothingColor: 'gray', ...hairVariantPatch('tied_brown'), mouth: 'neutra', eyes: 'atentos', brows: 'rectas', skinTone: 'morena' },
  },
];

export const AUTHORING_HAIR_VARIANTS = HAIR_VARIANTS;

export function applySceneTemplate(map: SceneMapDefinition, template: AuthoringSceneTemplate): SceneMapDefinition {
  const ambient = setCameraZoom(setBackgroundImage(map.ambient, template.backgroundImage), template.cameraZoom);
  return {
    ...map,
    theme: template.theme,
    ambient,
  };
}

export function selectedSceneTemplateId(map: SceneMapDefinition | null | undefined): string {
  if (!map) return '';
  const bg = backgroundImage(map.ambient);
  const zoom = cameraZoom(map.ambient);
  return AUTHORING_SCENE_TEMPLATES.find(t =>
    t.theme === map.theme && t.backgroundImage === bg && Math.abs(t.cameraZoom - zoom) < 0.01
  )?.id ?? '';
}

export function objectTemplateById(id: string): AuthoringObjectTemplate | null {
  return AUTHORING_OBJECT_TEMPLATES.find(t => t.id === id) ?? null;
}

export function buildObjectFromTemplate(
  template: AuthoringObjectTemplate,
  key: string,
  x: number,
  y: number,
  localId: number,
): WorldObject {
  return {
    id: localId,
    key,
    label: template.label,
    type: template.type,
    x,
    y,
    width: template.width,
    height: template.height,
    zIndex: 0,
    facing: 'down',
    colorHex: template.colorHex,
    icon: template.icon,
    shortCode: template.shortCode,
    collision: template.type === 'PERSON' || template.type === 'EXIT',
    visible: true,
    interactionPrompt: template.interactionPrompt,
    interactionText: template.interactionText,
    decisionOptionId: null,
    toolCode: null,
    unlockCondition: {},
    movementPattern: template.type === 'PERSON' ? { type: 'idle' } : {},
    metadata: { ...(template.metadata ?? {}) },
  };
}
