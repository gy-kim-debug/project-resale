import type { CSSProperties } from 'react';
export type IconName =
  | 'home'
  | 'market'
  | 'bag'
  | 'moon'
  | 'debt'
  | 'arrow'
  | 'back'
  | 'heart'
  | 'food'
  | 'health'
  | 'wallet'
  | 'clock'
  | 'alert'
  | 'radio'
  | 'keyboard'
  | 'box'
  | 'chair'
  | 'camera';
const paths: Record<IconName, string> = {
  home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
  market:
    'M3 10h18l-2-6H5l-2 6Zm1 0v11h16V10M9 21v-7h6v7M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0',
  bag: 'M5 7h14l1 14H4L5 7Zm3 0V5a4 4 0 0 1 8 0v2',
  moon: 'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',
  debt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  back: 'M20 12H4m6-6-6 6 6 6',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  food: 'M4 3v6a3 3 0 0 0 6 0V3M7 3v18M20 21V3c-4 2-5 7 0 9',
  health: 'M8 3h8v5h5v8h-5v5H8v-5H3V8h5V3Z',
  wallet: 'M20 7V4H4a2 2 0 0 0-2 2v13h19V7H4M16 11h5v5h-5v-5Z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
  alert: 'm12 3 10 18H2L12 3Zm0 5v6m0 3v1',
  radio: 'M4 7h16v13H4V7Zm3 4h5v5H7v-5Zm9 0v1m0 4v1M6 7l10-4',
  keyboard:
    'M2 6h20v13H2V6Zm3 4h1m3 0h1m3 0h1m3 0h1M5 13h1m3 0h1m3 0h1m3 0h1M7 16h10',
  box: 'm3 7 9-4 9 4v11l-9 4-9-4V7Zm0 0 9 5 9-5m-9 5v10M7 5l10 5v4',
  chair: 'M6 3h12v11H6V3Zm-2 11h16v4H4v-4Zm2 4v4m12-4v4',
  camera: 'M3 7h4l2-3h6l2 3h4v14H3V7Zm9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
};
export function Icon({
  name,
  size = 22,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
