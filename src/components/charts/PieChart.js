import React from 'react';
import Svg, { Path, G } from 'react-native-svg';
import { getCategoryColor } from '../../constants/colors';

export function PieChart({ data, size, colors }) {
  const r = (size - 4) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const total = data.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return null;
  let acc = 0;
  const slices = data.map(([cat, value]) => {
    const pct = value / total;
    const a0 = (acc * 360 - 90) * (Math.PI / 180);
    acc += pct;
    const a1 = (acc * 360 - 90) * (Math.PI / 180);
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = pct > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
    return { key: cat, d, fill: getCategoryColor(cat) };
  });
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <G>{slices.map((s) => <Path key={s.key} d={s.d} fill={s.fill} />)}</G>
    </Svg>
  );
}
