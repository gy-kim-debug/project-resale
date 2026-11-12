import { useState } from 'react';
import { prepareGameAudio, useGameOptions } from '../app/gameOptions';

export function GameOptions() {
  const options = useGameOptions();
  const [unavailable, setUnavailable] = useState(false);
  const [preparing, setPreparing] = useState(false);
  return (
    <section className="game-options" aria-label="게임 설정">
      <div className="game-option-row">
        <span>효과음</span>
        <button
          role="switch"
          aria-label="효과음"
          aria-checked={options.soundEnabled}
          disabled={preparing}
          onClick={async () => {
            setPreparing(true);
            try {
              if (!options.soundEnabled && !(await prepareGameAudio())) {
                setUnavailable(true);
                return;
              }
              setUnavailable(false);
              options.setSound(!options.soundEnabled);
            } finally {
              setPreparing(false);
            }
          }}
        >
          {options.soundEnabled ? '켜짐' : '꺼짐'}
        </button>
      </div>
      {unavailable && (
        <p className="warning" role="status">
          소리를 켜지 못했습니다.
        </p>
      )}
      <div className="game-option-row">
        <span>모션 간소화</span>
        <button
          role="switch"
          aria-label="모션 간소화"
          aria-checked={options.reducedMotion}
          onClick={() => options.setReducedMotion(!options.reducedMotion)}
        >
          {options.reducedMotion ? '켜짐' : '꺼짐'}
        </button>
      </div>
    </section>
  );
}
