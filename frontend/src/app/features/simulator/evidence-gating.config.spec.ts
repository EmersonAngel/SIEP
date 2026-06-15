import { SimulationWorldState } from '../../core/models/simulation.model';
import { NODE_EVIDENCE, choiceEvidence, mergeEvidence, missingEvidence, nodeEvidence, toolUsed, unlockedExtraLines } from './evidence-gating.config';

function worldWith(partial: Partial<SimulationWorldState>): SimulationWorldState {
  return {
    attemptId: 'a', status: 'IN_PROGRESS',
    map: { id: 1, key: 'urgencias-crisis', title: '', width: 960, height: 540, theme: '', spawnX: 0, spawnY: 0, ambient: {} },
    player: { x: 0, y: 0 }, objects: [], collisions: [], tools: [],
    inventory: [], inspectedObjectKeys: [], viewedDialogueKeys: [], usedToolKeys: [], flags: {},
    ...partial,
  };
}

describe('evidence-gating.config', () => {
  it('toolUsed acepta herramienta en inventario, uso directo y uso con target (PAP@escucha-segura)', () => {
    expect(toolUsed(worldWith({ inventory: ['PAP'] }), 'PAP')).toBe(true);
    expect(toolUsed(worldWith({ usedToolKeys: ['PAP'] }), 'PAP')).toBe(true);
    expect(toolUsed(worldWith({ usedToolKeys: ['PAP@escucha-segura'] }), 'PAP')).toBe(true);
    expect(toolUsed(worldWith({ usedToolKeys: ['RISK_METER'] }), 'PAP')).toBe(false);
  });

  it('urgencias (caso PDF) exige enfermera + PAP; reporta exactamente lo que falta', () => {
    const def = nodeEvidence('hospital-urgencias')!;
    expect(missingEvidence(def, worldWith({}), new Set()))
      .toEqual(['npc:enfermera-urgencias', 'tool:PAP']);
    expect(missingEvidence(def, worldWith({ inventory: ['PAP'] }), new Set(['enfermera-urgencias'])))
      .toEqual([]);
  });

  it('las líneas extra solo se desbloquean con la evidencia completa y el diálogo correcto', () => {
    const def = nodeEvidence('hospital-urgencias')!;
    const ready = worldWith({ inventory: ['PAP'] });
    expect(unlockedExtraLines(def, 'familia-duelo', worldWith({}), new Set())).toEqual([]);
    expect(unlockedExtraLines(def, 'otro-dialogo', ready, new Set(['enfermera-urgencias']))).toEqual([]);
    expect(unlockedExtraLines(def, 'familia-duelo', ready, new Set(['enfermera-urgencias'])).length).toBeGreaterThan(0);
  });

  it('nodos sin definición no bloquean nada', () => {
    expect(nodeEvidence('cierre-caso')).toBeNull();
    expect(missingEvidence(null, worldWith({}), new Set())).toEqual([]);
  });

  it('toda herramienta exigida usa tool_code reales de la BD (mayúsculas)', () => {
    const real = ['PAP', 'SPIKES', 'RISK_METER', 'SAFETY_ROUTE', 'REFLECTION_JOURNAL'];
    for (const def of Object.values(NODE_EVIDENCE)) {
      for (const tool of def.tools ?? []) expect(real).toContain(tool);
    }
  });

  it('acepta requisitos de evidencia configurados por respuesta autorada', () => {
    const def = choiceEvidence({
      key: 'c1',
      text: 'Responder despues de explorar',
      decisionOptionId: 10,
      requiredToolCode: 'PAP',
      effect: {
        requiresNpcs: ['enfermera-urgencias'],
        requiresTools: ['RISK_METER'],
        requiresInspected: ['historia-clinica'],
      },
    })!;
    expect(missingEvidence(def, worldWith({}), new Set())).toEqual([
      'npc:enfermera-urgencias',
      'tool:PAP',
      'tool:RISK_METER',
      'inspected:historia-clinica',
    ]);
    const merged = mergeEvidence(nodeEvidence('hospital-urgencias'), def)!;
    expect(merged.tools).toEqual(['PAP', 'RISK_METER']);
  });
});
