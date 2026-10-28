import type { CSSProperties } from 'react';
export type IconName =
  | 'user'
  | 'activity'
  | 'home'
  | 'market'
  | 'bag'
  | 'moon'
  | 'debt'
  | 'arrow'
  | 'back'
  | 'heart'
  | 'health'
  | 'wallet'
  | 'clock'
  | 'alert'
  | 'radio'
  | 'keyboard'
  | 'box'
  | 'chair'
  | 'camera'
  | 'mail'
  | 'settings'
  | 'search'
  | 'music'
  | 'car'
  | 'building'
  | 'gavel'
  | 'gift';
const paths: Record<IconName, string> = {
  search: 'M21 21l-5-5M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z',
  music:
    'M9 17V5l11-2v12M9 8l11-2M9 17a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Zm11-2a3 3 0 1 1-3-3c1.7 0 3 1.3 3 3Z',
  car: 'M3 16V10l3-6h12l3 6v6H3Zm0-6h18M5 16v4m14-4v4M6 13h2m8 0h2',
  building:
    'M4 21V3h11v18M15 9h5v12M2 21h20M7 7h1m3 0h1M7 11h1m3 0h1M7 15h1m3 0h1M8 21v-3h3v3',
  gavel: 'm14 3 7 7-3 3-7-7 3-3ZM5 12l7 7-3 3-7-7 3-3Zm3 3 7-7M12 22h10',
  gift: 'M3 8h18v4H3V8Zm2 4v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z',
  mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  settings:
    'M10 2h4l1 3 3 1 3 3-2 3 2 3-3 3-3 1-1 3h-4l-1-3-3-1-3-3 2-3-2-3 3-3 3-1 1-3Zm2 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-2a8 8 0 0 1 16 0v2',
  activity: 'm13 2-9 12h7l-1 8 10-12h-7l0-8Z',
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
