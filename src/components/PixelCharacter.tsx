import { DEFAULT_PLAYER, type PlayerAppearance } from '../content/player';
import approvedSheet from '../assets/characters/b-approved-base.png';

/** Display the approved PNG unchanged, using the same crops as its review preview. */
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
  const avatar =
    appearance?.avatar ?? DEFAULT_PLAYER.appearance.avatar ?? 'male';
  return (
    <svg
      className={`pixel-character ${animated ? 'pixel-character-active' : ''}`}
      data-style="b-approved-png"
      data-character-role={variant}
      data-avatar={variant === 'player' ? avatar : undefined}
      viewBox={avatar === 'female' ? '806 80 500 880' : '218 20 500 940'}
      width={24 * scale}
      height={32 * scale}
      aria-hidden="true"
      focusable="false"
    >
      <image href={approvedSheet} width="1536" height="1024" />
    </svg>
  );
}
