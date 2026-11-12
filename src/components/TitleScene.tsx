import type { PlayerAppearance } from '../content/player';
import { PixelCharacter } from './PixelCharacter';

/** The existing basement/pixel visual language, presented as a quiet title scene. */
export function TitleScene({ appearance }: { appearance: PlayerAppearance }) {
  return (
    <svg
      className="title-scene"
      viewBox="0 0 240 128"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="240" height="128" fill="#101720" />
      <path d="M0 8h240v2H0zM0 108h240v20H0z" fill="#25313a" />
      <path d="M0 109h240v2H0zM0 125h240v3H0z" fill="#41483e" />
      <rect x="20" y="21" width="82" height="59" fill="#3a454d" />
      <rect x="24" y="25" width="74" height="51" fill="#111b27" />
      <path
        d="M26 69V46h13v23M44 69V36h16v33M64 69V42h15v27M84 69V31h12v38"
        fill="#253a45"
      />
      <path
        d="M31 49h3v5h-3zM48 42h3v5h-3zM53 55h3v5h-3zM69 46h3v5h-3zM89 40h3v5h-3z"
        fill="#a99a67"
      />
      <path d="M59 25h3v51h-3zM24 58h74v3H24z" fill="#4c575a" />
      <path
        d="M31 28v8M48 27v6M70 30v8M87 27v7"
        stroke="#91a7b8"
        opacity=".35"
      />
      <path d="M17 79h88v4H17z" fill="#59615c" />
      <path
        d="M154 88h64v5h-64zM158 93h4v17h-4zM209 93h4v17h-4z"
        fill="#79624d"
      />
      <path d="M188 62h3v25h-3zM180 85h20v3h-20z" fill="#858982" />
      <path d="M182 55h15v3h3v6h-21v-6h3z" fill="#baa76e" />
      <path d="M183 64h13l10 23h-34z" fill="#b6a66d" opacity=".1" />
      <path d="M162 77h13v9h-13zM164 79h9v5h-9z" fill="#56777a" />
      <rect x="65" y="96" width="25" height="14" fill="#846c51" />
      <path d="M64 94h27v3H64zM76 97h3v10h-3z" fill="#b29a71" />
      <g transform="translate(109 77)">
        <PixelCharacter appearance={appearance} scale={1} />
      </g>
      <path
        d="M23 116h47v1H23zM150 117h52v1h-52z"
        fill="#53615a"
        opacity=".45"
      />
    </svg>
  );
}
