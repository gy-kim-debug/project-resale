import { useEffect } from 'react';

export function Toast({
  id,
  message,
  ok,
  dismiss,
  undo,
}: {
  id: number;
  message: string;
  ok: boolean;
  dismiss: (expectedId?: number) => void;
  undo?: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(
      () => dismiss(id),
      undo ? 6000 : ok ? 3200 : 4500,
    );
    return () => window.clearTimeout(timer);
  }, [id, message, ok, dismiss, undo]);
  return (
    <div
      className={`toast${ok ? '' : ' error'}`}
      role={ok ? 'status' : 'alert'}
      aria-atomic="true"
    >
      {message}
      {undo && (
        <button className="toast-undo" onClick={undo}>
          실행 취소
        </button>
      )}
    </div>
  );
}
