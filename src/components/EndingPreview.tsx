import { useRef, useState } from 'react';
import type { Command, Game } from '../domain/game';
import { execute } from '../domain/engine';
import { storyLines } from '../domain/story';
import { StoryPlayer } from './StoryPlayer';
/** The preview owns a detached snapshot and never calls the live game's action/save methods. */
export function EndingPreview({
  initialGame,
  close,
}: {
  initialGame: Game;
  close: () => void;
}) {
  const snapshot = useRef(initialGame);
  const [error, setError] = useState('');
  const [game, setGame] = useState(initialGame);
  async function act(command: Command) {
    if (!['storyNext', 'storyChoice'].includes(command.type)) return false;
    const result = execute(snapshot.current, command);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setError('');
    snapshot.current = result.game;
    if (!result.game.story?.active) close();
    else setGame(result.game);
    return true;
  }
  function skip() {
    let next = snapshot.current;
    while (
      next.story?.active &&
      next.story.active.step < storyLines(next).length - 1
    ) {
      const result = execute(next, { type: 'storyNext' });
      if (!result.ok) break;
      next = result.game;
    }
    snapshot.current = next;
    setGame(next);
  }
  return <StoryPlayer preview={{ game, act, skip, close, error }} />;
}
