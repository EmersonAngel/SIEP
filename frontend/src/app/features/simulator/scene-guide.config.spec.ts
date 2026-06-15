import { SCENE_GUIDES, getSceneGuide } from './scene-guide.config';

describe('scene-guide.config', () => {
  it('returns null for unknown / empty node keys', () => {
    expect(getSceneGuide(null)).toBeNull();
    expect(getSceneGuide(undefined)).toBeNull();
    expect(getSceneGuide('does-not-exist')).toBeNull();
  });

  it('keeps guide NPCs disabled for playable stages', () => {
    for (const nodeKey of [
      'hospital-urgencias', 'hospital-sala-escucha', 'hospital-accion-etica',
      'hospital-cierre-bloque', 'comisaria-consultorio', 'comisaria-accion-final',
    ]) {
      expect(getSceneGuide(nodeKey)).toBeNull();
    }
  });

  it('has no guide for the terminal node (no objects to lead toward)', () => {
    expect(getSceneGuide('cierre-caso')).toBeNull();
  });

  it('never points at a known decision object key', () => {
    const decisionKeys = new Set([
      'familia-duelo', 'marco-normativo-hospital', 'psicologa-acompanante',
      'sobreviviente-consulta', 'marco-normativo-comisaria', 'profesional-psicosocial',
      'escucha-segura', 'cuestionario-prematuro', 'aviso-policial',
      'ruta-vbg', 'mediacion-prohibida', 'psiquiatria-aislada',
      'informe-integral', 'dsm-aislado', 'riesgo-estructurado',
      'contacto-agresor', 'ruta-nna', 'nna-sin-ruta',
    ]);
    for (const entry of Object.values(SCENE_GUIDES)) {
      expect(decisionKeys.has(entry.targetKey)).toBe(false);
    }
  });
});
