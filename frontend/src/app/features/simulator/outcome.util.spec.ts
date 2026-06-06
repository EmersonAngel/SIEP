import { decisionTotal, adequacyPercent, performanceLabel } from './outcome.util';

const base = { adequateDecisions: 0, riskyDecisions: 0, inadequateDecisions: 0, prohibitedDecisions: 0 };

describe('outcome.util', () => {
  it('decisionTotal sums the three decision kinds', () => {
    expect(decisionTotal({ ...base, adequateDecisions: 2, riskyDecisions: 1, inadequateDecisions: 1 })).toBe(4);
  });

  it('adequacyPercent', () => {
    expect(adequacyPercent({ ...base, adequateDecisions: 4 })).toBe(100);
    expect(adequacyPercent({ ...base, adequateDecisions: 2, riskyDecisions: 1, inadequateDecisions: 1 })).toBe(50);
    expect(adequacyPercent(base)).toBe(0);
  });

  it('performanceLabel by adequacy ratio', () => {
    expect(performanceLabel({ ...base, adequateDecisions: 5 })).toBe('Excelente');
    expect(performanceLabel({ ...base, adequateDecisions: 3, riskyDecisions: 1, inadequateDecisions: 1 })).toBe('Adecuado');
    expect(performanceLabel({ ...base, adequateDecisions: 2, riskyDecisions: 1, inadequateDecisions: 2 })).toBe('En desarrollo');
    expect(performanceLabel({ ...base, adequateDecisions: 1, riskyDecisions: 2, inadequateDecisions: 3 })).toBe('Requiere refuerzo');
    expect(performanceLabel(base)).toBe('Sin decisiones');
  });

  it('prohibited decisions drop performance one step', () => {
    expect(performanceLabel({ ...base, adequateDecisions: 5, prohibitedDecisions: 1 })).toBe('Adecuado');
  });
});
