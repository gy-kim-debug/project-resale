import { useRef, useState } from 'react';
import { dailyConfirmation, type DailyCommand } from './dailyActions';
import type { Act } from './store';
export function useDailyConfirmation(act: Act) {
  const [pending, setPending] = useState<ReturnType<
    typeof dailyConfirmation
  > | null>(null);
  const submitting = useRef(false);
  return {
    pending,
    request(command: DailyCommand, amount?: number) {
      if (!submitting.current)
        setPending((current) => current ?? dailyConfirmation(command, amount));
    },
    cancel() {
      setPending(null);
    },
    async confirm() {
      if (!pending || submitting.current) return;
      submitting.current = true;
      setPending(null);
      try {
        await act(pending.command);
      } finally {
        submitting.current = false;
      }
    },
  };
}
