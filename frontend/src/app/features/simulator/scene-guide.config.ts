/**
 * Guide NPC config (Sub-project B1). A frontend-only "colleague" NPC that,
 * per node, walks to a free spot next to a *process* point (a TOOL pickup)
 * and surfaces a short process hint when the player approaches.
 *
 * Hard guardrail: the hint orients the PROCESS and the WHERE only. It never
 * names which clinical decision option is correct (that would break formative
 * assessment). `targetKey` is therefore always a TOOL object, never a decision
 * object. Authoring this from the editor is deferred to sub-project E.
 *
 * Keyed by node_key, which equals the scene map_key for SIM-VBG-001.
 */
export interface SceneGuideEntry {
  /** Frontend-only identifier for this guide NPC (unique per node). */
  guideKey: string;
  /** Label shown above the NPC sprite. */
  guideName: string;
  /** Spawn position in world pixels (player spawns at 145,430). */
  spawnX: number;
  spawnY: number;
  /** object_key of the process point to lead toward — always a TOOL. */
  targetKey: string;
  /** Short process guidance; must not reveal the correct decision. */
  hint: string;
}

export const SCENE_GUIDES: Record<string, SceneGuideEntry> = {
  'hospital-urgencias': {
    guideKey: 'guide-pdf-urgencias',
    guideName: 'Enfermera de turno',
    spawnX: 680, spawnY: 430,
    targetKey: 'tool-pap',
    hint: 'Antes de decidir, toma el kit PAP y observa la crisis familiar. El objetivo es contener sin apresurarte.',
  },
  'hospital-sala-escucha': {
    guideKey: 'guide-pdf-marco-hospital',
    guideName: 'Trabajadora social',
    spawnX: 610, spawnY: 410,
    targetKey: 'tool-spikes',
    hint: 'Revisa el protocolo de noticias dificiles y el marco disponible. La guia orienta el proceso, no la respuesta.',
  },
  'hospital-accion-etica': {
    guideKey: 'guide-pdf-accion-hospital',
    guideName: 'Psicologa hospitalaria',
    spawnX: 610, spawnY: 410,
    targetKey: 'tool-spikes',
    hint: 'Antes de cerrar la actuacion tecnica, revisa el protocolo y piensa en contencion, confidencialidad e interdisciplina.',
  },
  'hospital-cierre-bloque': {
    guideKey: 'guide-pdf-riesgo',
    guideName: 'Orientadora juridica',
    spawnX: 660, spawnY: 430,
    targetKey: 'tool-riesgo',
    hint: 'En esta etapa importa valorar riesgo y proteccion. Toma el instrumento antes de decidir la prioridad psicosocial.',
  },
  'comisaria-consultorio': {
    guideKey: 'guide-pdf-marco-comisaria',
    guideName: 'Apoyo psicosocial',
    spawnX: 660, spawnY: 430,
    targetKey: 'tool-ruta',
    hint: 'Revisa la ruta de proteccion y el marco institucional antes de formular la actuacion de la comisaria.',
  },
  'comisaria-accion-final': {
    guideKey: 'guide-pdf-cierre-comisaria',
    guideName: 'Apoyo psicosocial',
    spawnX: 660, spawnY: 430,
    targetKey: 'tool-riesgo',
    hint: 'Para cerrar, contrasta riesgo, dependientes y rutas disponibles. La decision debe sostener seguridad y derechos.',
  },
  'urgencias-crisis': {
    guideKey: 'guide-urgencias',
    guideName: 'Enfermera de turno',
    spawnX: 210, spawnY: 430,
    targetKey: 'tool-pap',
    hint: 'Antes de decidir, equípate y observa con calma. Tus herramientas de contención están aquí; recógelas y valora a la consultante sin apresurarte.',
  },
  'ruta-proteccion': {
    guideKey: 'guide-ruta',
    guideName: 'Trabajadora social',
    spawnX: 210, spawnY: 430,
    targetKey: 'tool-ruta',
    hint: 'Este momento exige articular la ruta institucional. Reúne tus instrumentos de valoración y protección antes de actuar.',
  },
  'informe-integral': {
    guideKey: 'guide-informe',
    guideName: 'Colega de psicología',
    spawnX: 210, spawnY: 430,
    targetKey: 'tool-ruta',
    hint: 'Vas a dejar un registro técnico. Toma tus instrumentos y organiza la información de forma integral y no revictimizante.',
  },
  'valoracion-comisaria': {
    guideKey: 'guide-comisaria',
    guideName: 'Funcionario de derechos',
    spawnX: 210, spawnY: 430,
    targetKey: 'tool-riesgo',
    hint: 'Aquí se valora el riesgo. Acércate a tus herramientas y revisa los factores con cuidado antes de proponer medidas.',
  },
  'proteccion-nna': {
    guideKey: 'guide-nna',
    guideName: 'Defensora de familia',
    spawnX: 210, spawnY: 430,
    targetKey: 'tool-ruta',
    hint: 'Piensa en los niños y niñas. Reúne tus herramientas y considera la protección integral antes de decidir la ruta.',
  },
};

export function getSceneGuide(nodeKey: string | undefined | null): SceneGuideEntry | null {
  // Guides are disabled by default: the moving helper NPC looked like an
  // unrelated orange character approaching the PAP tool.
  void nodeKey;
  return null;
}
