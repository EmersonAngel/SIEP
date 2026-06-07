import { chartHasData, lineChartPath, ringProgress } from './dashboard-charts.util';

// The chart builders read signal inputs, which plain ts-jest (no
// jest-preset-angular) cannot wire, so — like the simulator specs — we exercise
// the pure presentation helpers directly. The input-driven builders and the
// template are covered by `ng build` type-checking and the manual dashboard smoke.
describe('dashboard-charts util', () => {
  it('chartHasData is false for empty or all-zero series and true when any value is positive', () => {
    expect(chartHasData([])).toBe(false);
    expect(chartHasData([{ label: 'a', value: 0 }])).toBe(false);
    expect(chartHasData([{ label: 'a', value: 3 }])).toBe(true);
  });

  it('ringProgress clamps to [0, 100] and guards non-positive inputs', () => {
    expect(ringProgress(50, 100)).toBe(50);
    expect(ringProgress(0, 100)).toBe(0);
    expect(ringProgress(5, 0)).toBe(0);
    expect(ringProgress(200, 100)).toBe(100);
  });

  it('lineChartPath plots a centered single point and spans the width for a series', () => {
    expect(lineChartPath([])).toBe('');
    expect(lineChartPath([{ label: 'I1', value: 10 }])).toBe('140,4');
    expect(lineChartPath([{ label: 'I1', value: 0 }, { label: 'I2', value: 10 }])).toBe('0,86 280,4');
  });
});
