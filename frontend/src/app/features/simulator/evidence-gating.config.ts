import { DialogueChoiceState, SimulationWorldState } from '../../core/models/simulation.model';

/**
 * Evidencia antes de decisión (Fase 9). Gating de PRESENTACIÓN: las opciones
 * siguen existiendo y el backend sigue siendo la autoridad del puntaje; aquí
 * solo se advierte que falta evidencia al intentar decidir y se desbloquean
 * líneas narrativas al explorar. Nunca se revela cuál opción es la correcta.
 *
 * Claves reales: npcs = keys de NpcConfig o PERSON del mapa;
 * tools = tool_code BD ('PAP', 'RISK_METER'…) contra inventario o uso;
 * inspected = object_key contra world.inspectedObjectKeys.
 */
export interface NodeEvidenceDef {
  npcs?: string[];
  tools?: string[];
  inspected?: string[];
  missingMessage: string;
  unlockLines?: { dialogueKey: string; lines: string[] }[];
}

export const NODE_EVIDENCE: Record<string, NodeEvidenceDef> = {
  // ── Caso PDF: Violencia Familiar y Tentativa de Feminicidio ──
  'hospital-urgencias': {
    npcs: ['enfermera-urgencias'],
    tools: ['PAP'],
    missingMessage: 'Información insuficiente: habla con la enfermera de urgencias y aplica Primeros Auxilios Psicológicos antes de definir el foco de la intervención.',
    unlockLines: [{
      dialogueKey: 'familia-duelo',
      lines: ['(La abuela respira un poco más despacio y te sostiene la mirada.) Gracias por quedarse… nadie nos había explicado nada. Solo díganme la verdad cuando se pueda.'],
    }],
  },
  'hospital-accion-etica': {
    tools: ['SPIKES'],
    missingMessage: 'Información insuficiente: revisa el protocolo EPICEE/SPIKES del estante antes de definir la actuación técnica y ética.',
  },
  'hospital-cierre-bloque': {
    tools: ['RISK_METER'],
    missingMessage: 'Información insuficiente: aplica el instrumento de valoración de riesgo antes de definir la prioridad psicosocial.',
  },
  'comisaria-accion-final': {
    tools: ['RISK_METER'],
    missingMessage: 'Información insuficiente: usa el instrumento de valoración estructurada antes de cerrar la actuación.',
  },
};

export function nodeEvidence(nodeKey: string | undefined | null): NodeEvidenceDef | null {
  if (!nodeKey) return null;
  return NODE_EVIDENCE[nodeKey] ?? null;
}

function stringsFrom(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

export function choiceEvidence(choice: DialogueChoiceState | null | undefined): NodeEvidenceDef | null {
  if (!choice) return null;
  const effect = (choice.effect ?? {}) as Record<string, unknown>;
  const tools = [
    ...(choice.requiredToolCode ? [choice.requiredToolCode] : []),
    ...stringsFrom(effect['requiresTools']),
  ];
  const def: NodeEvidenceDef = {
    npcs: stringsFrom(effect['requiresNpcs']),
    tools,
    inspected: stringsFrom(effect['requiresInspected']),
    missingMessage: 'Informacion insuficiente: completa la evidencia requerida antes de decidir.',
  };
  return (def.npcs?.length || def.tools?.length || def.inspected?.length) ? def : null;
}

export function mergeEvidence(...defs: Array<NodeEvidenceDef | null | undefined>): NodeEvidenceDef | null {
  const present = defs.filter((def): def is NodeEvidenceDef => !!def);
  if (!present.length) return null;
  const uniq = (values: string[]) => Array.from(new Set(values));
  return {
    npcs: uniq(present.flatMap(def => def.npcs ?? [])),
    tools: uniq(present.flatMap(def => def.tools ?? [])),
    inspected: uniq(present.flatMap(def => def.inspected ?? [])),
    missingMessage: present[0].missingMessage,
    unlockLines: present.flatMap(def => def.unlockLines ?? []),
  };
}

export function toolUsed(world: SimulationWorldState, code: string): boolean {
  return world.inventory.includes(code)
    || world.usedToolKeys.some(k => k === code || k.startsWith(`${code}@`));
}

/** Lista lo que falta ('npc:x' | 'tool:X' | 'inspected:y'); vacía = evidencia completa. */
export function missingEvidence(
  def: NodeEvidenceDef | null | undefined,
  world: SimulationWorldState | null,
  viewedNpcKeys: ReadonlySet<string>,
): string[] {
  if (!def || !world) return [];
  const missing: string[] = [];
  const viewed = new Set(viewedNpcKeys);
  const fromWorld = world.flags?.['viewedNpcKeys'];
  if (Array.isArray(fromWorld)) {
    fromWorld
      .filter((key): key is string => typeof key === 'string' && key.length > 0)
      .forEach(key => viewed.add(key));
  }
  for (const npc of def.npcs ?? []) if (!viewed.has(npc)) missing.push(`npc:${npc}`);
  for (const tool of def.tools ?? []) if (!toolUsed(world, tool)) missing.push(`tool:${tool}`);
  for (const key of def.inspected ?? []) if (!world.inspectedObjectKeys.includes(key)) missing.push(`inspected:${key}`);
  return missing;
}

/** Líneas narrativas desbloqueadas para un diálogo cuando la evidencia está completa. */
export function unlockedExtraLines(
  def: NodeEvidenceDef | null | undefined,
  dialogueKey: string,
  world: SimulationWorldState | null,
  viewedNpcKeys: ReadonlySet<string>,
): string[] {
  if (!def?.unlockLines || missingEvidence(def, world, viewedNpcKeys).length) return [];
  return def.unlockLines.filter(u => u.dialogueKey === dialogueKey).flatMap(u => u.lines);
}
