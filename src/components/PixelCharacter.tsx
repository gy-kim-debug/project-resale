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
const DEFAULT_TRADER: PlayerAppearance = {
  avatar: 'male',
  clothing: 'jacket',
  hair: 'short',
  outfit: 'blue',
  skin: 'tan',
};

/** B-style SD artwork at 48×64; the original 24×32 display footprint is retained. */
export function PixelCharacter({
  variant = 'player',
  animated = false,
  scale = 3,
  appearance,
}: {
  variant?: 'player' | 'trader';
  animated?: boolean;
  scale?: number;
  appearance?: PlayerAppearance;
}) {
  const look =
    appearance ??
    (variant === 'trader' ? DEFAULT_TRADER : DEFAULT_PLAYER.appearance);
  const avatar = look.avatar ?? 'male';
  const female = avatar === 'female';
  const clothing = look.clothing ?? 'jacket';
  const hair = look.hair;
  const { main: shirt, shade } = OUTFITS[look.outfit];
  const skin = SKINS[look.skin];
  const light = highlight(shirt, 0.22);
  const faceLight = highlight(skin.main, 0.12);
  const ink = '#262936';
  const hairDark = variant === 'trader' && !appearance ? '#414451' : '#2c2e3c';
  const hairMain = variant === 'trader' && !appearance ? '#6e7781' : '#404454';
  const hairLight = variant === 'trader' && !appearance ? '#8f99a2' : '#55596b';
  const bare = clothing === 'tshirt' || clothing === 'dress';
  return (
    <svg
      className={`pixel-character ${animated ? 'pixel-character-active' : ''}`}
      data-style="sd-b"
      data-character-role={variant}
      data-avatar={variant === 'player' ? avatar : undefined}
      data-clothing={variant === 'player' ? clothing : undefined}
      data-hair={variant === 'player' ? hair : undefined}
      data-outfit={variant === 'player' ? look.outfit : undefined}
      data-skin={variant === 'player' ? look.skin : undefined}
      viewBox="0 0 48 64"
      width={24 * scale}
      height={32 * scale}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 61h30v1h3v2H6v-2h3z" fill="#0a101a" opacity=".55" />
      <g className="pixel-leg pixel-leg-left">
        <path d="M14 48h10v12H12v-5h2z" fill={ink} />
        <path
          d="M15 49h8v10h-9v-4h1z"
          fill={clothing === 'dress' ? skin.shade : '#40485d'}
        />
        <path
          d="M16 50h2v7h-2z"
          fill={clothing === 'dress' ? skin.main : '#4c5369'}
        />
        <path d="M13 58h10v5H10v-3h3z" fill="#a99b8b" />
        <path d="M14 58h8v2H12v1h-1v-1h2z" fill="#f2ead7" />
        <path d="M11 61h12v2H11z" fill="#d8cbb5" />
        <path d="M11 62h12v1H11z" fill="#fff3d9" />
      </g>
      <g className="pixel-leg pixel-leg-right">
        <path d="M25 48h10v11h2v4H25z" fill={ink} />
        <path
          d="M26 49h8v10h-8z"
          fill={clothing === 'dress' ? skin.main : '#353f54'}
        />
        <path
          d="M27 50h2v7h-2z"
          fill={clothing === 'dress' ? faceLight : '#424c62'}
        />
        <path d="M26 58h9v2h3v3H25v-3h1z" fill="#a99b8b" />
        <path d="M27 58h7v2h3v1H26v-1h1z" fill="#f2ead7" />
        <path d="M26 61h12v2H26z" fill="#d8cbb5" />
        <path d="M26 62h12v1H26z" fill="#fff3d9" />
      </g>
      <g className="pixel-body">
        {/* Rounded hair masses frame the large SD head, behind the shoulders. */}
        {(hair === 'long' || hair === 'bob') && (
          <>
            <path
              d={
                hair === 'long'
                  ? 'M10 7h26v3h5v6h3v22h-3v3h-8V21H15v20H7v-3H4V16h3v-6h3z'
                  : 'M10 7h26v3h5v6h3v16h-3v4h-6v-2H13v2H7v-4H4V16h3v-6h3z'
              }
              fill={hairDark}
            />
            <path
              d={
                hair === 'long'
                  ? 'M7 17h4v19H8V25H7zM38 15h3v22h-3z'
                  : 'M7 17h4v14h2v2H8v-5H7zM38 15h3v16h-4v-3h1z'
              }
              fill={hairMain}
            />
            <path d="M7 20h2v8H7z" fill={hairLight} />
          </>
        )}
        {hair === 'ponytail' && (
          <>
            <path d="M6 12h6v9H9v14H6v5H3v-3H1V22h2v-7h3z" fill={hairDark} />
            <path d="M4 22h4v12H5v3H3V26h1z" fill={hairMain} />
            <path d="M5 17h5v3H5z" fill={shirt} />
            <path d="M5 17h3v1H5z" fill={light} />
          </>
        )}
        {clothing === 'hoodie' && (
          <path d="M15 32h18v3h4v8H11v-8h4z" fill={shade} />
        )}
        <path
          d={
            female
              ? 'M16 34h16v2h4v2h2v13H11V38h2v-2h3z'
              : 'M15 34h18v2h4v2h2v13H10V38h2v-2h3z'
          }
          fill={ink}
        />
        <path d="M15 36h18v2h3v12H13V38h2z" fill={shade} />
        <path d="M16 36h16v2h2v11H15V38h1z" fill={shirt} />
        <path d="M15 39h2v8h-2zM17 36h6v2h-6z" fill={light} />
        <path d="M20 32h10v5h-2v2h-6v-2h-2z" fill={skin.neck} />
        <path d="M22 33h7v3h-7z" fill={skin.main} />
        {clothing === 'jacket' && (
          <>
            <path d="M21 36h9v13h-9z" fill="#eee8d6" />
            <path d="M22 36h7v2h-7z" fill="#cbbda5" />
            <path
              d="M18 35h3v3h2v3h-3v-1h-3v-2h1zM30 35h3v3h2v2h-3v2h-3v-3h1z"
              fill={shade}
            />
            <path d="M18 35h2v2h-2zM31 35h2v2h-2z" fill={light} />
            <path d="M17 44h3v1h-3zM31 44h3v1h-3zM16 48h5v1h-5z" fill={shade} />
            <path d="M30 43h1v1h-1zM30 47h1v1h-1z" fill="#d5c693" />
          </>
        )}
        {clothing === 'tshirt' && (
          <>
            <path d="M20 35h2v2h7v-2h2v4H20z" fill={shade} />
            <path d="M29 42h5v4h-5z" fill={light} />
            <path d="M15 48h19v2H15z" fill={shade} />
          </>
        )}
        {clothing === 'hoodie' && (
          <>
            <path d="M18 35h3v2h9v-2h3v5H18z" fill={shade} />
            <path d="M20 39h1v6h-1zM30 39h1v6h-1z" fill="#eee8d6" />
            <path d="M22 44h6v1h3v4H19v-4h3z" fill={shade} />
            <path d="M22 44h6v1h-6z" fill={light} />
          </>
        )}
        {clothing === 'coat' && (
          <>
            <path d="M13 48h23v8H12v-5h1z" fill={ink} />
            <path d="M14 48h20v6H14z" fill={shade} />
            <path d="M17 48h14v5H17z" fill={shirt} />
            <path
              d="M18 35h3v3h2v3h-3v4h-3v-6h1zM30 35h3v4h2v6h-3v-4h-3v-3h1z"
              fill={light}
            />
            <path
              d="M24 42h2v12h-2zM15 49h5v1h-5zM29 49h4v1h-4z"
              fill={shade}
            />
            <path d="M27 45h2v2h-2zM27 50h2v2h-2z" fill="#e6d5ae" />
          </>
        )}
        {clothing === 'dress' && (
          <>
            <path d="M15 45h18v3h2v3h2v5H11v-5h2v-3h2z" fill={ink} />
            <path d="M16 46h16v3h2v3h1v3H13v-3h2v-3h1z" fill={shade} />
            <path d="M19 47h10v3h2v4H16v-3h3z" fill={shirt} />
            <path d="M18 50h2v4h-2zM23 49h2v5h-2z" fill={light} />
            <path d="M16 45h16v2H16z" fill={shade} />
            <path d="M24 45h2v2h-2z" fill="#e9d8b1" />
            <path d="M20 35h2v2h7v-2h2v4H20z" fill={shade} />
          </>
        )}
        <g className="pixel-arm-back">
          <path d="M12 37h3v8h-2v7H7v-3H5v-7h2v-3h5z" fill={ink} />
          <path
            d="M10 38h4v7h-3v2H7v-5h2v-2h1z"
            fill={bare ? skin.shade : shade}
          />
          <path d="M8 45h5v5H8v-1H7v-3h1z" fill={skin.main} />
          <path d="M8 45h3v2H8z" fill={faceLight} />
          <path d="M12 47h1v3h-1z" fill={skin.shade} />
        </g>
        <g className="pixel-arm-front">
          <path d="M34 37h4v2h2v4h2v6h-2v3h-6v-7h-1z" fill={ink} />
          <path d="M35 38h3v3h1v4h-5v-5h1z" fill={shirt} />
          <path d="M35 39h2v4h-2z" fill={light} />
          <path d="M34 44h5v3h-5z" fill={bare ? skin.main : shade} />
          <path d="M35 46h5v3h-1v2h-4v-1h-1v-3h1z" fill={skin.main} />
          <path d="M35 46h3v2h-3z" fill={faceLight} />
          <path d="M38 49h1v2h-1z" fill={skin.shade} />
        </g>
        {/* Diagonal satchel strap is part of the shared design, not equipment. */}
        <path
          d="M33 35h3v4h-2v3h-2v3h-2v3h-2v3h-2v2h-4v-3h2v-3h2v-3h2v-3h2v-3h3z"
          fill="#453d37"
        />
        <path
          d="M33 36h2v3h-2v3h-2v3h-2v3h-2v2h-2v-3h2v-3h2v-3h2v-3h2z"
          fill="#aa8058"
        />
        <path d="M15 45h11v2h2v8H14v-9h1z" fill="#514137" />
        <path d="M15 46h11v8H15z" fill="#a57b51" />
        <path d="M16 47h9v2h-9z" fill="#c49b6b" />
        <path d="M16 49h9v1h-9zM25 48h1v6h-1z" fill="#7f5d43" />
        <path d="M20 48h3v2h-3z" fill="#eed3a0" />
        {/* Rounded face and large, highlighted eyes are the B concept's key features. */}
        <path
          d="M13 10h22v3h4v7h3v7h-3v3h-4v3H16v-2h-5v-4H8v-8h3v-6h2z"
          fill={skin.shade}
        />
        <path
          d="M13 12h22v3h3v12h-3v3h-4v2H18v-2h-5v-3h-2V17h2z"
          fill={skin.main}
        />
        <path d="M14 15h7v2h-6v7h-2v-6h1zM20 13h10v2H20z" fill={faceLight} />
        <path d="M8 21h4v7H8v-1H6v-4h2z" fill={skin.main} />
        <path d="M8 23h2v3H8z" fill={skin.shade} />
        <path d="M38 21h3v2h2v4h-2v2h-3z" fill={skin.shade} />
        <path d="M15 19h5v1h-5zM29 19h5v1h-5z" fill={hairDark} />
        <path
          d="M16 20h5v1h1v5h-1v1h-5v-1h-1v-5h1zM29 20h5v1h1v5h-1v1h-5v-1h-1v-5h1z"
          fill="#222735"
        />
        <path d="M17 25h4v1h-4zM30 25h4v1h-4z" fill="#3d4557" />
        <path d="M17 21h2v2h-2zM30 21h2v2h-2z" fill="#fff7df" />
        {female && <path d="M14 21h2v1h-2zM34 21h2v1h-2z" fill={hairDark} />}
        <path d="M11 28h4v2h-4zM35 28h4v2h-4z" fill="#d97f77" opacity=".55" />
        <path d="M24 27h1v1h-1z" fill={skin.shade} />
        <path d="M21 29h9v3h-1v1h-6v-1h-2z" fill="#492f38" />

        <path d="M23 30h6v2h-5v-1h-1z" fill="#df8b88" />
        <path
          d={
            hair === 'bob' || hair === 'long'
              ? 'M12 5h23v3h5v4h2v8h-4v-4h-5v-3h-5v4h-4v3h-5v3h-6v5H9V17H7v-5h2V8h3z'
              : 'M15 3h14v2h7v3h5v4h4l-3 5h-4v4h-5v-5h-4v-3h-4v4h-5v3h-7v5H9v-4H5v-5H3l4-5H5l5-5h5z'
          }
          fill={hairDark}
        />
        <path
          d={
            hair === 'bob' || hair === 'long'
              ? 'M13 6h20v3h5v5h-4v-3h-7v4h-5v4h-7v3h-3v-6h-2v-4h3z'
              : 'M15 5h13v2h7v3h5v3h-4v4h-2v-4h-7v-3h-4v5h-5v3h-7v3H8v-5H6l5-5H9l4-3h6V7h-4z'
          }
          fill={hairMain}
        />
        <path d="M18 6h9v2h-9zM11 11h7v2h-7zM30 9h5v2h-5z" fill={hairLight} />
        {hair === 'ponytail' && (
          <path d="M7 17h4v5H8v5H6v-7h1z" fill={hairMain} />
        )}
        {hair === 'cap' && (
          <>
            <path d="M11 4h22v2h5v4h3v6h5v4H30v-2H7V9h4z" fill={hairDark} />
            <path d="M13 5h19v3h5v7H9v-5h4z" fill={shirt} />
            <path d="M14 6h12v2H14zM11 10h2v4h-2z" fill={light} />
            <path d="M9 15h29v2h7v2H30v-2H9z" fill={shade} />
            <path d="M26 10h5v3h-5z" fill="#f0ead8" />
          </>
        )}
      </g>
    </svg>
  );
}
