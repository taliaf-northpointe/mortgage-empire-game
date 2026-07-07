import { useEffect } from 'react';
import { useToastStore } from '../../store/toastStore';
import styles from './Toasts.module.css';

const TOAST_LIFETIME_MS = 4_500;

/** Floating feedback bubbles for player actions. Render once, near the app root. */
export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismissToast);

  const newest = toasts[toasts.length - 1];
  useEffect(() => {
    if (!newest) return;
    const timer = window.setTimeout(() => dismiss(newest.id), TOAST_LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [newest, dismiss]);

  if (toasts.length === 0) return null;
  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={styles.toast}
          onClick={() => dismiss(toast.id)}
          title="Dismiss"
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
