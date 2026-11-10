import {
  OUTFITS,
  SKINS,
  DEFAULT_PLAYER,
  type PlayerAppearance,
} from '../content/player';

function highlight(hex: string, amount: number) {
  return (
    '#' +
    [1, 3, 5]
      .map((offset) => {
        const value = parseInt(hex.slice(offset, offset + 2), 16);
        return Math.round(value + (255 - value) * amount)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}

/** Shared 24×32 sprite: stepped contours, selective outlines and top-left light. */
export function PixelCharacter({
  variant = 'player',
  animated = false,
  scale = 3,
  appearance = DEFAULT_PLAYER.appearance,
}: {
  variant?: 'player' | 'trader';
  animated?: boolean;
  scale?: number;
  appearance?: PlayerAppearance;
}) {
  const player = variant === 'player';
  const { main: shirt, shade } = OUTFITS[player ? appearance.outfit : 'blue'];
  const skin = SKINS[player ? appearance.skin : 'tan'];
  const avatar = player ? (appearance.avatar ?? 'male') : 'male';
  const female = avatar === 'female';
  const hair = player ? appearance.hair : 'short';
  const clothing = player ? (appearance.clothing ?? 'jacket') : 'jacket';
  const bareArms = clothing === 'tshirt' || clothing === 'dress';
  const light = highlight(shirt, 0.28);
  const faceLight = highlight(skin.main, 0.16);
  const ink = '#141d2b';
  const hairDark = player ? '#1b2634' : '#344454';
  const hairMain = player ? '#334253' : '#718795';
  const hairLight = player ? '#506074' : '#a6b4b6';
  return (
    <svg
      className={`pixel-character ${animated ? 'pixel-character-active' : ''}`}
      data-avatar={player ? avatar : undefined}
      data-clothing={player ? clothing : undefined}
      data-hair={player ? hair : undefined}
      data-outfit={player ? appearance.outfit : undefined}
      data-skin={player ? appearance.skin : undefined}
      viewBox="0 0 24 32"
      width={24 * scale}
      height={32 * scale}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 30h15v1h2v1H3v-1h2z" fill="#080d15" opacity="0.65" />
      <g className="pixel-leg pixel-leg-left">
        <path d="M7 23h5v7H6v-2h1z" fill={ink} />
        <path
          d="M8 23h3v6H8z"
          fill={clothing === 'dress' ? skin.shade : '#394a60'}
        />
        <path
          d="M8 24h1v4H8z"
          fill={clothing === 'dress' ? skin.main : '#52647a'}
        />
        <path d="M7 28h4v2H6v-1h1z" fill="#77868d" />
        <path d="M7 28h3v1H7z" fill="#dce0d0" />
        <path d="M6 30h6v1H6z" fill="#b1bcb8" />
      </g>
      <g className="pixel-leg pixel-leg-right">
        <path d="M13 23h5v5h1v3h-6z" fill={ink} />
        <path
          d="M14 23h3v6h-3z"
          fill={clothing === 'dress' ? skin.main : '#2c3b51'}
        />
        <path
          d="M14 24h1v4h-1z"
          fill={clothing === 'dress' ? faceLight : '#42546a'}
        />
        <path d="M14 28h3v1h2v1h-5z" fill="#667981" />
        <path d="M14 28h2v1h-2z" fill="#becac4" />
        <path d="M13 30h7v1h-7z" fill="#93a5a5" />
      </g>
      <g className="pixel-body">
        {/* Back hair remains behind the neckline, sleeves and face. */}
        {(hair === 'long' || hair === 'bob') && (
          <>
            <path
              d={
                hair === 'long'
                  ? 'M6 4h12v2h2v12h-2v2h-3V9H9v11H5v-2H4V6h2z'
                  : 'M6 4h12v2h2v9h-2v2h-3V9H9v8H6v-1H4V6h2z'
              }
              fill={hairDark}
            />
            <path
              d={
                hair === 'long'
                  ? 'M5 8h2v10H6v-2H5zM18 8h1v9h-1z'
                  : 'M5 8h2v7H5zM18 8h1v6h-1z'
              }
              fill={hairMain}
            />
          </>
        )}
        {hair === 'ponytail' && (
          <>
            <path d="M4 5h3v2H6v8H4v3H2v-1H1v-4h1V7h2z" fill={hairDark} />
            <path d="M3 8h2v6H3v2H2v-3h1z" fill={hairMain} />
            <path d="M3 6h3v2H3z" fill={shirt} />
            <path d="M3 6h2v1H3z" fill={light} />
          </>
        )}
        {clothing === 'hoodie' && (
          <path d="M7 12h10v2h2v5H5v-5h2z" fill={shade} />
        )}
        <path
          d={female ? 'M9 14h7v1h2v1h1v9H7v-9h2z' : 'M8 14h9v1h2v1h1v9H6v-9h2z'}
          fill={ink}
        />
        <path
          d={female ? 'M9 15h7v1h2v8H8v-8h1z' : 'M8 15h9v1h2v8H7v-8h1z'}
          fill={shade}
        />
        <path d="M9 15h7v1h1v7H9z" fill={shirt} />
        <path d="M9 16h1v6H9zM10 15h5v1h-5z" fill={light} />
        <path d="M10 24h7v1h-7z" fill="#233248" />
        <path d="M10 13h5v3h-1v1h-3v-1h-1z" fill={skin.neck} />
        <path d="M11 14h3v2h-3z" fill={skin.main} />
        {clothing === 'jacket' && (
          <>
            <path d="M11 16h3v8h-3z" fill="#dce3d5" />
            <path
              d="M10 16h1v2h1v1h-1v5h-1zM14 16h1v2h-1v1h-1v5h1z"
              fill={shade}
            />
            <path d="M16 19h1v3h-2v-1h1zM8 23h2v1H8z" fill={light} />
            <path d="M14 20h1v1h-1zM14 23h1v1h-1z" fill="#e1d3a2" />
          </>
        )}
        {clothing === 'tshirt' && (
          <>
            <path d="M10 15h1v1h3v-1h1v2h-5z" fill={shade} />
            <path d="M13 19h3v2h-3z" fill={light} />
            <path d="M9 23h8v1H9z" fill={shade} />
          </>
        )}
        {clothing === 'hoodie' && (
          <>
            <path d="M9 15h2v2h3v-2h2v3H9z" fill={shade} />
            <path d="M10 17h1v3h-1zM15 17h1v3h-1z" fill="#e7e6d6" />
            <path d="M11 21h4v1h1v2h-6v-2h1z" fill={shade} />
            <path d="M11 21h4v1h-4z" fill={light} />
          </>
        )}
        {clothing === 'coat' && (
          <>
            <path d="M7 22h12v5h-1v1H7z" fill={ink} />
            <path d="M8 22h10v5H8z" fill={shade} />
            <path d="M10 22h6v4h-6z" fill={shirt} />
            <path
              d="M10 15h1v2h1v2h-2v2H9v-4h1zM15 15h1v2h1v4h-2v-2h-2v-2h2z"
              fill={light}
            />
            <path d="M12 20h1v7h-1zM9 23h2v1H9zM15 23h2v1h-2z" fill={shade} />
            <path d="M14 21h1v1h-1zM14 24h1v1h-1z" fill="#ead8ac" />
          </>
        )}
        {clothing === 'dress' && (
          <>
            <path d="M8 21h10v2h1v2h1v3H6v-3h1v-2h1z" fill={ink} />
            <path d="M9 21h8v2h1v2h1v2H7v-2h1v-2h1z" fill={shade} />
            <path d="M10 22h5v2h2v2H9v-2h1z" fill={shirt} />
            <path d="M9 24h1v2H9zM11 23h1v3h-1z" fill={light} />
            <path d="M9 21h8v1H9zM11 15h3v1h-3z" fill={shade} />
            <path d="M13 21h1v1h-1z" fill="#ead8ac" />
          </>
        )}
        {/* Stepped jaw, warm shadow and two distinct eyes at native pixel size. */}
        <path
          d={
            female
              ? 'M8 4h8v1h2v7h-1v1h-2v1h-5v-1H8v-1H6V7h2z'
              : 'M8 4h8v1h3v7h-2v2h-7v-1H8v-1H6V7h2z'
          }
          fill={hairDark}
        />
        <path d="M8 5h8v1h2v5h-1v1h-2v1h-5v-1H8v-1H7V8h1z" fill={skin.main} />
        <path d="M8 6h3v1H9v3H8zM10 5h5v1h-5z" fill={faceLight} />
        <path
          d="M17 7h1v4h-1v1h-2v1h-5v-1h5v-1h2zM6 9h2v2H6z"
          fill={skin.shade}
        />
        <path d="M7 9h1v1H7z" fill={skin.main} />
        <path d="M10 8h1v2h-1zM15 8h1v2h-1z" fill={ink} />
        <path d="M12 10h1v1h-1z" fill={skin.shade} />
        <path d="M12 12h3v1h-3z" fill="#995f54" />
        {female ? (
          <path d="M9 7h2v1H9zM15 7h2v1h-2z" fill={hairDark} />
        ) : (
          <path d="M9 6h3v1H9zM14 6h3v1h-3z" fill={hairDark} />
        )}
        <path
          d="M7 2h10v1h2v2h1v2h-2V6h-3V5h-4v1H9v2H7v3H5V5h1V3h1z"
          fill={hairDark}
        />
        <path d="M8 2h8v1h2v2h-4V4h-4v1H8v2H6V4h2z" fill={hairMain} />
        <path d="M9 2h6v1H9zM7 4h3v1H7z" fill={hairLight} />
        {hair === 'long' && (
          <path d="M7 4h3v2H9v3H7zM17 5h2v9h-1V8h-1z" fill={hairMain} />
        )}
        {hair === 'bob' && (
          <path d="M6 5h2v8H6zM18 6h1v8h-2v-1h1z" fill={hairMain} />
        )}
        {hair === 'cap' && (
          <>
            <path d="M7 1h9v1h2v2h1v1h3v2h-7V6H5V3h2z" fill={ink} />
            <path d="M8 2h7v1h2v2H6V4h1V3h1z" fill={shirt} />
            <path d="M8 2h6v1H8zM7 3h1v1H7z" fill={light} />
            <path d="M6 5h12v1h3v1h-6V6H6z" fill={shade} />
            <path d="M13 3h2v1h-2z" fill="#e8e5d0" />
          </>
        )}
        <g className="pixel-arm-back">
          <path
            d={
              female
                ? 'M6 16h2v3H7v6H4v-6h1v-2h1z'
                : 'M5 16h3v3H7v6H3v-6h1v-2h1z'
            }
            fill={ink}
          />
          <path d="M5 18h2v5H4v-3h1z" fill={bareArms ? skin.shade : shade} />
          <path d="M4 23h3v2H4z" fill={skin.neck} />
          <path d="M5 24h1v1H5z" fill={skin.main} />
        </g>
        {/* Familiar trading satchel, now with strap, flap, clasp and side depth. */}
        <path d="M8 16h1v3H8v4H7v-5h1z" fill="#293b49" />
        <path d="M8 16h1v2H8z" fill="#8b9d9f" />
        <path d="M5 22h5v1h1v5H4v-5h1z" fill="#463a35" />
        <path d="M5 23h5v4H5z" fill="#a47b53" />
        <path d="M5 23h5v1H5zM5 24h1v3H5z" fill="#dfb884" />
        <path d="M9 24h1v3H9z" fill="#7c5a42" />
        <path d="M7 24h1v1H7z" fill="#f3d9a0" />
        <g className="pixel-arm-front">
          <path d="M18 16h2v2h1v6h-1v2h-3v-5h1z" fill={ink} />
          <path d="M18 17h2v3h-2z" fill={shirt} />
          <path d="M18 17h1v2h-1z" fill={light} />
          <path d="M18 20h2v3h-2z" fill={bareArms ? skin.main : shade} />
          <path d="M18 23h2v2h-2z" fill={skin.main} />
          <path d="M18 23h1v1h-1z" fill={faceLight} />
          <path d="M20 23h1v1h-1z" fill={skin.shade} />
        </g>
      </g>
    </svg>
  );
}
