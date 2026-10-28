import { useEffect } from 'react';

export function Toast({
  id,
  message,
  ok,
  dismiss,
}: {
  id: number;
  message: string;
  ok: boolean;
  dismiss: (expectedId?: number) => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(id), ok ? 3200 : 4500);
    return () => window.clearTimeout(timer);
  }, [id, message, ok, dismiss]);
  return (
    <div
      className={`toast${ok ? '' : ' error'}`}
      role={ok ? 'status' : 'alert'}
      aria-atomic="true"
    >
      {message}
    </div>
  );
}
