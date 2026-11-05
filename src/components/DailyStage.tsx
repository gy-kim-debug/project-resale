import type { PlayerProfile } from '../content/player';
import type { DailyScene } from '../domain/daily';
import { PixelCharacter } from './PixelCharacter';
/** A fixed frame: dialogue length and selections never move the actors. */
export function DailyStage({
  scene,
  appearance,
}: {
  scene: DailyScene;
  appearance: PlayerProfile['appearance'];
}) {
  const lottery = scene.kind === 'lottery';
  return (
    <div
      className={`story-stage daily-stage ${lottery ? 'daily-stage-lottery' : 'daily-stage-walk'}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 240 128" shapeRendering="crispEdges" focusable="false">
        <rect width="240" height="128" fill="#15232b" />
        <rect y="99" width="240" height="29" fill="#354141" />
        <path d="M0 99H240" stroke="#53675b" strokeWidth="2" />
        {lottery ? (
          <>
            <rect x="142" y="20" width="76" height="68" fill="#263d45" />
            <rect x="148" y="26" width="64" height="49" fill="#0e1a22" />
            {[154, 173, 192].map((x) => (
              <g key={x}>
                <rect x={x} y="40" width="14" height="20" fill="#38564e" />
                <rect x={x + 5} y="46" width="4" height="8" fill="#a3d4af" />
              </g>
            ))}
            <g className="daily-ticket-float">
              <rect x="83" y="42" width="28" height="42" fill="#e1d5b4" />
              <path
                d="M88 50h18M88 56h12M88 64h18M88 70h14"
                stroke="#697865"
                strokeWidth="2"
              />
              <rect x="88" y="75" width="6" height="4" fill="#59a88c" />
            </g>
          </>
        ) : (
          <>
            <rect x="25" y="35" width="7" height="64" fill="#79654e" />
            <path d="M7 58h45V34H43V21H17v13H7Z" fill="#345c4f" />
            <path
              d="M158 79h57v6h-57zM163 85h5v14h-5zM204 85h5v14h-5zM158 69h57v6h-57z"
              fill="#7c7261"
            />
            {scene.event === 'wallet' && (
              <rect x="113" y="95" width="12" height="5" fill="#a27c51" />
            )}
            {scene.event === 'cat' && (
              <g className="daily-cat">
                <path
                  d="M150 90v-8l4 3 4-3v8h7v7h-15zM165 94h6v-8"
                  fill="#afac9c"
                />
                <rect x="153" y="88" width="2" height="2" fill="#15232b" />
              </g>
            )}
            {scene.event === 'rain' && (
              <g className="daily-rain" stroke="#829fb3">
                {[15, 45, 75, 105, 135, 165, 195, 225].map((x) => (
                  <path key={x} d={`M${x} 10l-4 14m6 25-4 14m8 17-4 14`} />
                ))}
              </g>
            )}
          </>
        )}
        <g className="daily-actor" transform="translate(71 35) scale(2)">
          <PixelCharacter scale={1} animated appearance={appearance} />
        </g>
        {scene.kind === 'stroll' &&
          ['wallet', 'neighbor'].includes(scene.event) && (
            <g transform="translate(202 35) scale(-2 2)">
              <PixelCharacter scale={1} animated variant="trader" />
            </g>
          )}
      </svg>
    </div>
  );
}
