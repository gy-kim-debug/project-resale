import type { ActionSceneKind } from '../app/actionPresentation';
import { PixelCharacter } from './PixelCharacter';
export function ActionScene({ kind }: { kind: ActionSceneKind }) {
  const trade = kind === 'buy' || kind === 'sell' || kind === 'gift';
  const desk = ['inspect', 'repair', 'listing', 'finance'].includes(kind);
  return (
    <div
      className={`action-scene scene-${kind}`}
      data-scene={kind}
      aria-hidden="true"
    >
      <svg viewBox="0 0 160 76" shapeRendering="crispEdges" focusable="false">
        <rect x="0" y="0" width="160" height="76" fill="#131c28" />
        <rect x="7" y="22" width="22" height="34" fill="#202d3c" />
        <rect x="31" y="14" width="26" height="42" fill="#1b2735" />
        <rect x="108" y="19" width="36" height="37" fill="#202d3c" />
        {[12, 21, 36, 47, 114, 127, 136].map((x, n) => (
          <rect
            key={x}
            x={x}
            y={n % 2 ? 28 : 35}
            width="4"
            height="5"
            fill="#3b5360"
          />
        ))}
        <rect x="0" y="56" width="160" height="20" fill="#24313c" />
        <rect x="0" y="56" width="160" height="2" fill="#40524f" />
        <rect x="12" y="65" width="26" height="1" fill="#37434b" />
        <rect x="103" y="69" width="37" height="1" fill="#37434b" />
        {trade && (
          <>
            <rect x="64" y="42" width="32" height="3" fill="#597168" />
            <rect x="67" y="45" width="3" height="13" fill="#384b49" />
            <rect x="90" y="45" width="3" height="13" fill="#384b49" />
            <g className="scene-trader">
              <g transform="translate(126 25) scale(-1 1)">
                <PixelCharacter variant="trader" animated scale={1} />
              </g>
            </g>
            <g className="scene-parcel">
              <rect x="94" y="39" width="10" height="9" fill="#c99461" />
              <rect x="94" y="39" width="10" height="2" fill="#e7b77e" />
              <rect x="98" y="39" width="2" height="7" fill="#f7d49a" />
            </g>
            {kind !== 'gift' && (
              <g className="scene-payment">
                <rect x="59" y="36" width="9" height="5" fill="#8ce5c0" />
                <rect x="62" y="37" width="3" height="3" fill="#438c73" />
              </g>
            )}
          </>
        )}
        {kind === 'search' && (
          <>
            <rect x="88" y="45" width="24" height="12" fill="#9a7451" />
            <rect x="85" y="42" width="30" height="4" fill="#c49667" />
            <rect x="99" y="46" width="3" height="11" fill="#d4aa7a" />
            <g className="scene-spark" fill="#f8d38d">
              <rect x="95" y="27" width="2" height="10" />
              <rect x="91" y="31" width="10" height="2" />
            </g>
          </>
        )}
        {kind === 'work' && (
          <g>
            <rect x="97" y="44" width="20" height="13" fill="#977351" />
            <rect x="119" y="33" width="21" height="24" fill="#c39363" />
            <rect x="126" y="33" width="4" height="24" fill="#eac08c" />
          </g>
        )}
        {desk && (
          <>
            <rect x="72" y="43" width="55" height="5" fill="#a57950" />
            <rect x="76" y="48" width="4" height="10" fill="#5b5147" />
            <rect x="118" y="48" width="4" height="10" fill="#5b5147" />
            {kind === 'listing' ? (
              <g className="scene-tool">
                <rect x="87" y="29" width="12" height="15" fill="#475a70" />
                <rect x="89" y="31" width="8" height="10" fill="#8ce5c0" />
              </g>
            ) : kind === 'finance' ? (
              <g className="scene-tool" fill="#e9c17d">
                <rect x="90" y="38" width="17" height="4" />
                <rect x="93" y="33" width="14" height="4" />
                <rect x="96" y="28" width="11" height="4" />
              </g>
            ) : (
              <>
                <rect x="85" y="38" width="18" height="5" fill="#91a7b6" />
                <g className="scene-tool">
                  {kind === 'repair' ? (
                    <>
                      <rect
                        x="101"
                        y="24"
                        width="3"
                        height="16"
                        fill="#c99461"
                      />
                      <rect
                        x="95"
                        y="23"
                        width="13"
                        height="5"
                        fill="#a5b6c3"
                      />
                    </>
                  ) : (
                    <>
                      <rect
                        x="96"
                        y="23"
                        width="11"
                        height="11"
                        fill="#a7d8de"
                      />
                      <rect x="98" y="25" width="7" height="7" fill="#345465" />
                      <rect
                        x="105"
                        y="33"
                        width="3"
                        height="8"
                        fill="#d2a276"
                      />
                    </>
                  )}
                </g>
              </>
            )}
          </>
        )}
        <g className="scene-player">
          <g transform={`translate(${trade ? 27 : desk ? 43 : 42} 25)`}>
            <PixelCharacter animated scale={1} />
          </g>
        </g>
        {kind === 'work' && (
          <g className="scene-carried-box">
            <rect x="64" y="43" width="13" height="11" fill="#c99461" />
            <rect x="69" y="43" width="3" height="11" fill="#f0c58e" />
          </g>
        )}
      </svg>
    </div>
  );
}
