import type { PlayerAppearance } from '../content/player';
import { PixelCharacter } from './PixelCharacter';
/** Remote contact, packing bench and carrier; actor positions never depend on dialogue height. */
export function ParcelStage({
  appearance,
  step = 0,
  kind = 'parcelDispatch',
  complete = false,
  compact = false,
}: {
  appearance?: PlayerAppearance;
  step?: number;
  kind?: string;
  complete?: boolean;
  compact?: boolean;
}) {
  const mode =
    kind === 'parcelPhotos'
      ? 'photos'
      : kind === 'parcelAddress'
        ? 'label'
        : kind === 'parcelPacking'
          ? 'packing'
          : 'dispatch';
  return (
    <div
      className={`parcel-stage${compact ? ' parcel-stage-compact' : ' story-stage'} parcel-${mode}${complete ? ' parcel-complete' : ''}`}
      data-parcel-stage={mode}
      aria-hidden="true"
    >
      <svg viewBox="0 0 240 128" shapeRendering="crispEdges" focusable="false">
        <rect width="240" height="128" fill="#15212e" />
        <rect x="8" y="10" width="62" height="58" fill="#263548" />
        <rect x="14" y="16" width="50" height="4" fill="#394c60" />
        <rect x="14" y="30" width="18" height="15" fill="#a77a4e" />
        <rect x="39" y="27" width="18" height="18" fill="#8a6847" />
        <rect y="104" width="240" height="24" fill="#293c48" />
        <g className="parcel-worker">
          <g transform="translate(46 42) scale(2)">
            <PixelCharacter animated appearance={appearance} scale={1} />
          </g>
        </g>
        <rect x="93" y="80" width="58" height="6" fill="#7b6a58" />
        <rect x="98" y="86" width="5" height="23" fill="#4e5051" />
        <rect x="141" y="86" width="5" height="23" fill="#4e5051" />
        <g className="parcel-box">
          <rect x="107" y="55" width="35" height="25" fill="#b58653" />
          <rect x="107" y="55" width="35" height="4" fill="#d1a16e" />
          <rect x="121" y="55" width="6" height="25" fill="#e0c08c" />
          <rect x="130" y="66" width="8" height="8" fill="#e5e9df" />
          {mode === 'packing' && (
            <g className="parcel-tape">
              <rect x="104" y="49" width="42" height="5" fill="#d5c18f" />
              <rect x="104" y="49" width="6" height="14" fill="#d5c18f" />
            </g>
          )}
        </g>
        <rect x="178" y="8" width="48" height="61" fill="#0d131d" />
        <rect x="181" y="11" width="42" height="55" fill="#2a4250" />
        <g transform="translate(190 14)">
          <PixelCharacter variant="trader" scale={1} />
        </g>
        <rect x="185" y="51" width="30" height="3" fill="#8bdbc1" />
        <rect x="185" y="58" width="21" height="3" fill="#7699a6" />
        {mode === 'photos' && (
          <g className="parcel-camera">
            <rect x="91" y="31" width="24" height="15" fill="#91a7b9" />
            <rect x="99" y="34" width="8" height="8" fill="#203946" />
            <rect
              className="parcel-flash"
              x="113"
              y="28"
              width="5"
              height="5"
              fill="#e7f5ce"
            />
          </g>
        )}
        {mode === 'label' && (
          <g className="parcel-label">
            <rect x="155" y="73" width="22" height="14" fill="#4e6979" />
            <rect x="158" y="62" width="16" height="14" fill="#edf0e4" />
            <rect x="161" y="65" width="10" height="2" fill="#65828b" />
            <rect x="161" y="69" width="7" height="2" fill="#65828b" />
          </g>
        )}
        {mode === 'dispatch' && (
          <g className="parcel-van">
            <rect x="172" y="85" width="35" height="18" fill="#78b6ab" />
            <rect x="207" y="91" width="16" height="12" fill="#6a9f9b" />
            <rect x="210" y="92" width="8" height="5" fill="#c9e1de" />
            <rect x="177" y="101" width="8" height="8" fill="#101923" />
            <rect x="210" y="101" width="8" height="8" fill="#101923" />
          </g>
        )}
        <rect
          x="93"
          y="116"
          width="55"
          height="2"
          fill={step % 2 || complete ? '#8de0bb' : '#537986'}
        />
      </svg>
    </div>
  );
}
