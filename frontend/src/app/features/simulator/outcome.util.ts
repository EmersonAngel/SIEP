export type Performance = 'Excelente' | 'Adecuado' | 'En desarrollo' | 'Requiere refuerzo' | 'Sin decisiones';

interface DecisionCounts {
  adequateDecisions: number;
  riskyDecisions: number;
  inadequateDecisions: number;
  prohibitedDecisions?: number;
}

export function decisionTotal(r: DecisionCounts): number {
  return r.adequateDecisions + r.riskyDecisions + r.inadequateDecisions;
}

export function adequacyPercent(r: DecisionCounts): number {
  const total = decisionTotal(r);
  return total === 0 ? 0 : Math.round((r.adequateDecisions / total) * 100);
}

const TIERS: Performance[] = ['Requiere refuerzo', 'En desarrollo', 'Adecuado', 'Excelente'];

export function performanceLabel(r: DecisionCounts): Performance {
  const total = decisionTotal(r);
  if (total === 0) return 'Sin decisiones';
  const pct = r.adequateDecisions / total;
  let tier = pct >= 0.8 ? 3 : pct >= 0.6 ? 2 : pct >= 0.4 ? 1 : 0;
  if ((r.prohibitedDecisions ?? 0) > 0) tier = Math.max(0, tier - 1);
  return TIERS[tier];
}
