import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { BRAND_GREEN } from '../constants/brandColors';

/** Ícone próprio do Dock: círculo verde, check e balão. */
export function DockIcon({ size = 28, color = '#fff', bg = BRAND_GREEN }) {
  const s = Number(size) || 28;
  return (
    <Svg width={s} height={s} viewBox="0 0 48 48">
      <Circle cx="24" cy="24" r="22" fill={bg} />
      <Path
        d="M14 22.5c0-5.2 4.4-9.4 10-9.4s10 4.2 10 9.4c0 3.4-1.9 6.4-4.8 8.1l.6 5.2-5.1-2.8c-.2 0-.5.1-.7.1-5.6 0-10-4.2-10-9.6z"
        fill={color}
        opacity="0.95"
      />
      <Path
        d="M19.2 22.4l3.1 3.1 6.6-6.7"
        fill="none"
        stroke={bg}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
