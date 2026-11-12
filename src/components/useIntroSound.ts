import { useEffect, useState } from 'react';
import {
  gameAudioContext,
  prepareGameAudio,
  useGameOptions,
} from '../app/gameOptions';
import type { IntroShot } from '../content/intro';
/** Optional local synthesis. No autoplay, downloads, speech or game-state changes. */
export function useIntroSound(shot?: IntroShot) {
  const enabled = useGameOptions((s) => s.soundEnabled);
  const setEnabled = useGameOptions((s) => s.setSound);
  const [unavailable, setUnavailable] = useState(false);
  const [audioState, setAudioState] = useState(0);
  useEffect(() => {
    const ctx = gameAudioContext();
    if (!ctx) return;
    const changed = () => setAudioState((n) => n + 1);
    ctx.addEventListener('statechange', changed);
    return () => ctx.removeEventListener('statechange', changed);
  }, [enabled, shot]);
  useEffect(() => {
    const ctx = gameAudioContext();
    if (!enabled || !shot || !ctx || ctx.state !== 'running') return;
    const nodes: AudioScheduledSourceNode[] = [];
    const tone = (
      offset: number,
      frequency: number,
      duration: number,
      volume: number,
    ) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = shot === 'door' || shot === 'contract' ? 'triangle' : 'sine';
      osc.frequency.value = frequency;
      const start = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
      nodes.push(osc);
    };
    if (shot === 'door') {
      tone(0.12, 70, 0.14, 0.18);
      tone(0.48, 65, 0.16, 0.18);
      tone(0.83, 72, 0.14, 0.14);
    } else if (shot === 'contract') tone(0.6, 110, 0.12, 0.12);
    else if (shot === 'debt' || shot === 'listing') {
      tone(0.08, 660, 0.18, 0.07);
      tone(0.23, 880, 0.24, 0.06);
    } else if (shot === 'departure' || shot === 'exit')
      tone(0.55, 90, 0.25, 0.06);
    else if (shot === 'window') {
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      // Deterministic ambient texture, independent of the game's economic RNG.
      for (let n = 0; n < data.length; n++)
        data[n] = Math.sin(n * 171.73) * Math.cos(n * 39.19);
      const noise = ctx.createBufferSource(),
        gain = ctx.createGain();
      noise.buffer = buffer;
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      noise.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      nodes.push(noise);
    }
    return () => {
      for (const node of nodes) {
        try {
          node.stop();
        } catch {
          /* Already ended. */
        }
      }
    };
  }, [shot, enabled, audioState]);
  async function toggle() {
    if (!enabled && !(await prepareGameAudio())) {
      setUnavailable(true);
      return;
    }
    setUnavailable(false);
    setEnabled(!enabled);
  }
  return { enabled, unavailable, toggle };
}
