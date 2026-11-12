import {
  OUTFITS,
  SKINS,
  DEFAULT_PLAYER,
  type PlayerAppearance,
} from '../content/player';
/** Shared 24×32 sprite. Integer SVG pixels stay sharp at every display size. */
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
  const shirt = player ? OUTFITS[appearance.outfit].main : '#8dadd3';
  const shade = player ? OUTFITS[appearance.outfit].shade : '#506d9b';
  const skin = SKINS[player ? appearance.skin : 'tan'];
  const avatar = player ? (appearance.avatar ?? 'male') : 'male';
  const female = avatar === 'female';
  const hair = player ? appearance.hair : 'short';
  const clothing = player ? (appearance.clothing ?? 'jacket') : 'jacket';
  const bareArms = clothing === 'tshirt' || clothing === 'dress';
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
      <rect x="3" y="30" width="19" height="2" fill="#080d15" />
      <g className="pixel-leg pixel-leg-left">
        <rect
          x="7"
          y="23"
          width={female ? 4 : 5}
          height="7"
          fill={clothing === 'dress' ? skin.shade : '#354253'}
        />
        <rect x="6" y="29" width="6" height="2" fill="#dfaf79" />
        <rect x="6" y="31" width="6" height="1" fill="#101722" />
      </g>
      <g className="pixel-leg pixel-leg-right">
        <rect
          x="13"
          y="23"
          width={female ? 4 : 5}
          height="7"
          fill={clothing === 'dress' ? skin.main : '#263243'}
        />
        <rect x="13" y="29" width="6" height="2" fill="#c99565" />
        <rect x="13" y="31" width="7" height="1" fill="#101722" />
      </g>
      <g className="pixel-body">
        {clothing === 'hoodie' && (
          <>
            <rect x="5" y="10" width="14" height="9" fill={shade} />
            <rect x="7" y="11" width="10" height="7" fill={shirt} />
          </>
        )}
        {player && hair === 'ponytail' && (
          <>
            <rect x="1" y="4" width="5" height="13" fill="#24313d" />
            <rect x="2" y="15" width="3" height="4" fill="#17212b" />
            <rect x="3" y="6" width="4" height="2" fill={shirt} />
          </>
        )}
        {player && hair === 'bob' && (
          <>
            <rect x="4" y="4" width="5" height="11" fill="#24313d" />
            <rect x="17" y="5" width="4" height="10" fill="#17212b" />
            <rect x="5" y="14" width="4" height="2" fill="#17212b" />
          </>
        )}
        {player && hair === 'long' && (
          <>
            <rect x="4" y="5" width="5" height="13" fill="#24313d" />
            <rect x="17" y="5" width="3" height="12" fill="#24313d" />
          </>
        )}

        <rect
          x={female ? 7 : 6}
          y="15"
          width={female ? 11 : 13}
          height={clothing === 'coat' ? 13 : 10}
          fill={shade}
        />
        <rect
          x={female ? 9 : 8}
          y="14"
          width={female ? 7 : 9}
          height={clothing === 'coat' ? 13 : 10}
          fill={shirt}
        />
        <rect
          x={female ? 9 : 8}
          y="24"
          width={female ? 7 : 9}
          height="2"
          fill={clothing === 'coat' || clothing === 'dress' ? shade : '#263243'}
        />
        {clothing === 'dress' && (
          <>
            <rect x="7" y="22" width="12" height="3" fill={shirt} />
            <rect x="6" y="25" width="14" height="3" fill={shade} />
            <rect x="8" y="25" width="10" height="2" fill={shirt} />
            <rect x="9" y="21" width="7" height="1" fill={shade} />
          </>
        )}
        <rect x="10" y="13" width="5" height="3" fill={skin.neck} />
        <rect x="8" y="16" width="3" height="2" fill={shade} />
        <rect x="14" y="16" width="3" height="2" fill={shade} />
        {clothing === 'jacket' && (
          <rect x="12" y="17" width="1" height="6" fill="#c4f2d9" />
        )}
        {clothing === 'hoodie' && (
          <>
            <rect x="10" y="16" width="1" height="3" fill="#dce5df" />
            <rect x="14" y="16" width="1" height="3" fill="#dce5df" />
            <rect x="10" y="21" width="6" height="2" fill={shade} />
          </>
        )}
        {clothing === 'coat' && (
          <>
            <rect x="10" y="15" width="2" height="5" fill={shade} />
            <rect x="14" y="15" width="2" height="5" fill={shade} />
            <rect x="12" y="20" width="1" height="7" fill={shade} />
            <rect x="13" y="21" width="1" height="1" fill="#dce5df" />
            <rect x="13" y="24" width="1" height="1" fill="#dce5df" />
          </>
        )}
        {clothing === 'tshirt' && (
          <rect x="10" y="15" width="5" height="1" fill={shade} />
        )}
        <rect x="5" y="3" width="14" height="7" fill="#17212b" />
        <rect
          x="7"
          y="1"
          width="10"
          height="3"
          fill={player ? '#24313d' : '#637482'}
        />
        <rect x="5" y="4" width="3" height="7" fill="#24313d" />
        <rect x="8" y="5" width="11" height="8" fill={skin.main} />
        <rect x="7" y="9" width="2" height="3" fill={skin.shade} />
        <rect
          x={female ? 11 : 10}
          y="12"
          width={female ? 5 : 7}
          height="2"
          fill={skin.neck}
        />
        <rect
          x="7"
          y="4"
          width="10"
          height="2"
          fill={player ? '#24313d' : '#718693'}
        />
        <rect
          x="7"
          y="5"
          width="3"
          height="3"
          fill={player ? '#24313d' : '#718693'}
        />
        <rect
          x="17"
          y="4"
          width="3"
          height="2"
          fill={player ? '#24313d' : '#718693'}
        />
        {player && hair === 'cap' && (
          <>
            <rect x="5" y="2" width="14" height="4" fill={shade} />
            <rect x="7" y="1" width="9" height="2" fill={shirt} />
            <rect x="17" y="5" width="5" height="2" fill={shade} />
          </>
        )}
        {female && (
          <>
            <rect x="11" y="7" width="2" height="1" fill="#263243" />
            <rect x="17" y="7" width="2" height="1" fill="#263243" />
          </>
        )}
        <rect x="12" y="8" width="1" height="2" fill="#263243" />
        <rect x="17" y="8" width="1" height="2" fill="#263243" />
        <rect x="15" y="11" width={female ? 1 : 2} height="1" fill="#995f50" />
        <g className="pixel-arm-back">
          <rect
            x={female ? 5 : 4}
            y="16"
            width={female ? 3 : 4}
            height={bareArms ? 3 : 7}
            fill={shade}
          />
          <rect
            x={female ? 5 : 4}
            y={bareArms ? 19 : 22}
            width="3"
            height={bareArms ? 6 : 3}
            fill={skin.neck}
          />
        </g>
        <rect x="8" y="16" width="2" height="7" fill="#354253" />
        <rect x="5" y="22" width="6" height="5" fill="#ad8054" />
        <rect x="6" y="23" width="4" height="1" fill="#dfb883" />
        <g className="pixel-arm-front">
          <rect
            x="17"
            y="16"
            width={female ? 3 : 4}
            height={bareArms ? 3 : 6}
            fill={shirt}
          />
          <rect
            x="18"
            y={bareArms ? 18 : 21}
            width="3"
            height={bareArms ? 7 : 4}
            fill={skin.main}
          />
          <rect x="19" y="22" width="3" height="2" fill={skin.main} />
        </g>
      </g>
    </svg>
  );
}
