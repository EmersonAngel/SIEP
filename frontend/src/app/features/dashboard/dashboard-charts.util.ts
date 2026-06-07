export interface ChartBar {
  label: string;
  value: number;
  max: number;
  tone: 'purple' | 'blue' | 'green' | 'orange' | 'red';
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface DecisionSlice {
  label: string;
  value: number;
  tone: 'green' | 'orange' | 'purple' | 'red';
}

/** True when a series has at least one strictly-positive value. */
export function chartHasData(items: ChartBar[] | ChartPoint[] | DecisionSlice[]): boolean {
  if (!items.length) return false;
  return items.some(item => 'value' in item && item.value > 0);
}

/** Completion percentage clamped to [0, 100]; 0 for non-positive inputs. */
export function ringProgress(value: number, max = 100): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

/** SVG polyline `points` string for the score line chart (viewBox 280×90). */
export function lineChartPath(points: ChartPoint[], width = 280, height = 90): string {
  if (!points.length) return '';
  const max = Math.max(...points.map(p => p.value), 1);
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = height - (point.value / max) * (height - 8) - 4;
    return `${x},${y}`;
  });
  return coords.join(' ');
}
