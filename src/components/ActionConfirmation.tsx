import { useId, useLayoutEffect, useRef } from 'react';
/** Styled game modal. HTML dialog supplies top-layer isolation, focus trapping and Escape. */
export function ActionConfirmation({
  confirmation,
}: {
  confirmation: {
    pending: {
      title: string;
      detail: string;
      label: string;
      tone?: 'danger';
    } | null;
    cancel(): void;
    confirm(): Promise<unknown>;
  };
}) {
  const ref = useRef<HTMLDialogElement>(null),
    cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId(),
    detailId = useId();
  const pending = confirmation.pending;
  useLayoutEffect(() => {
    if (!pending) return;
    const dialog = ref.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    cancelRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [pending]);
  if (!pending) return null;
  return (
    <dialog
      ref={ref}
      className="action-confirmation"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={detailId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation();
      }}
      onCancel={(event) => {
        event.preventDefault();
        confirmation.cancel();
      }}
    >
      <h2 id={titleId}>{pending.title}</h2>
      <p id={detailId}>{pending.detail}</p>
      <div className="confirmation-buttons">
        <button
          ref={cancelRef}
          className="confirmation-cancel"
          onClick={() => confirmation.cancel()}
        >
          취소
        </button>
        <button
          className={`confirmation-submit${pending.tone === 'danger' ? ' confirmation-danger' : ''}`}
          onClick={() => {
            ref.current?.close();
            void confirmation.confirm();
          }}
        >
          {pending.label}
        </button>
      </div>
    </dialog>
  );
}
