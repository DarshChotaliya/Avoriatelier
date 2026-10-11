import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import './ConfirmDialog.css';

// In-app replacement for window.confirm / window.alert. <DialogHost /> is mounted once in App;
// confirmDialog() and alertDialog() can be called from anywhere and return a promise.
let showDialog = null;

const open = (options) => new Promise((resolve) => {
  if (!showDialog) {
    // Host not mounted (e.g. a component rendered on its own in a test): fall back to the browser.
    resolve(options.cancelLabel ? window.confirm(options.message) : (window.alert(options.message), true));
    return;
  }
  showDialog({ ...options, resolve });
});

/** Ask the user to confirm. Resolves true for the confirm button, false for Cancel / Escape. */
export const confirmDialog = ({ title = 'Are you sure?', message, confirmLabel = 'Delete', danger = true }) =>
  open({ title, message, confirmLabel, cancelLabel: 'Cancel', danger });

/** Tell the user something (an error or a reason an action is blocked). Resolves when closed. */
export const alertDialog = (message, title = 'Cannot do this') =>
  open({ title, message, confirmLabel: 'OK', cancelLabel: null, danger: false });

export function DialogHost() {
  const [dialog, setDialog] = useState(null);
  // Focus Cancel when there is one, so Enter never deletes by accident.
  const focusRef = useRef(null);

  useEffect(() => {
    showDialog = setDialog;
    return () => {
      showDialog = null;
    };
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    focusRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!dialog) return null;

  function close(result) {
    dialog.resolve(result);
    setDialog(null);
  }

  return (
    <div className="cd-overlay" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
      <div className="cd-box" role="alertdialog" aria-modal="true" aria-labelledby="cd-title" aria-describedby="cd-message">
        <span className={`cd-icon${dialog.danger ? ' danger' : ''}`}>
          <Icon name={dialog.danger ? 'trash' : 'info'} size={22} />
        </span>
        <h2 id="cd-title">{dialog.title}</h2>
        <p id="cd-message">{dialog.message}</p>
        <div className="cd-actions">
          {dialog.cancelLabel && (
            <button type="button" ref={focusRef} className="btn btn-secondary" onClick={() => close(false)}>
              {dialog.cancelLabel}
            </button>
          )}
          <button type="button" ref={dialog.cancelLabel ? undefined : focusRef}
            className={`btn ${dialog.danger ? 'cd-danger' : 'btn-primary'}`} onClick={() => close(true)}>
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
