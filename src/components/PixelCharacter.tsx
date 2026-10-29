/** Shared 24×32 sprite. Integer SVG pixels stay sharp at every display size. */
export function PixelCharacter({
  variant = 'player',
  animated = false,
  scale = 3,
}: {
  variant?: 'player' | 'trader';
  animated?: boolean;
  scale?: number;
}) {
  const player = variant === 'player';
  const shirt = player ? '#83dec0' : '#8dadd3';
  const shade = player ? '#3b8e7d' : '#506d9b';
  return (
    <svg
      className={`pixel-character ${animated ? 'pixel-character-active' : ''}`}
      viewBox="0 0 24 32"
      width={24 * scale}
      height={32 * scale}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="30" width="19" height="2" fill="#080d15" />
      <g className="pixel-leg pixel-leg-left">
        <rect x="7" y="23" width="5" height="7" fill="#354253" />
        <rect x="6" y="29" width="6" height="2" fill="#dfaf79" />
        <rect x="6" y="31" width="6" height="1" fill="#101722" />
      </g>
      <g className="pixel-leg pixel-leg-right">
        <rect x="13" y="23" width="5" height="7" fill="#263243" />
        <rect x="13" y="29" width="6" height="2" fill="#c99565" />
        <rect x="13" y="31" width="7" height="1" fill="#101722" />
      </g>
      <g className="pixel-body">
        <rect x="6" y="15" width="13" height="10" fill={shade} />
        <rect x="8" y="14" width="9" height="10" fill={shirt} />
        <rect x="8" y="24" width="9" height="2" fill="#263243" />
        <rect x="10" y="13" width="5" height="3" fill="#d79872" />
        <rect x="8" y="16" width="3" height="2" fill={shade} />
        <rect x="14" y="16" width="3" height="2" fill={shade} />
        <rect x="12" y="17" width="1" height="6" fill="#c4f2d9" />
        <rect x="5" y="3" width="14" height="7" fill="#17212b" />
        <rect
          x="7"
          y="1"
          width="10"
          height="3"
          fill={player ? '#24313d' : '#637482'}
        />
        <rect x="5" y="4" width="3" height="7" fill="#24313d" />
        <rect x="8" y="5" width="11" height="8" fill="#e8b58a" />
        <rect x="7" y="9" width="2" height="3" fill="#cf936f" />
        <rect x="10" y="12" width="7" height="2" fill="#d99d76" />
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
        <rect x="12" y="8" width="1" height="2" fill="#263243" />
        <rect x="17" y="8" width="1" height="2" fill="#263243" />
        <rect x="15" y="11" width="2" height="1" fill="#995f50" />
        <g className="pixel-arm-back">
          <rect x="4" y="16" width="4" height="7" fill={shade} />
          <rect x="4" y="22" width="3" height="3" fill="#d99d76" />
        </g>
        <rect x="8" y="16" width="2" height="7" fill="#354253" />
        <rect x="5" y="22" width="6" height="5" fill="#ad8054" />
        <rect x="6" y="23" width="4" height="1" fill="#dfb883" />
        <g className="pixel-arm-front">
          <rect x="17" y="16" width="4" height="6" fill={shirt} />
          <rect x="18" y="21" width="3" height="4" fill="#e8b58a" />
          <rect x="19" y="22" width="3" height="2" fill="#e8b58a" />
        </g>
      </g>
    </svg>
  );
}
