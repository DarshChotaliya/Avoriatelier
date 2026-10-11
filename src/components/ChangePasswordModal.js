import { useEffect, useState } from 'react';
import Icon from './Icon';
import { authApi } from '../api/erpApi';
import './PurchaseInvoice.css';
import './MasterPage.css';

function ChangePasswordModal({ onClose }) {
  const [values, setValues] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (values.next !== values.confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(values.current, values.next);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inv-overlay">
      <form className="inv-modal mp-modal" style={{ maxWidth: 460 }} onSubmit={submit} noValidate role="dialog"
        aria-modal="true" aria-label="Change password">
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="settings" size={22} /></span>
          <div>
            <h2>Change password</h2>
            <p>Other devices will be signed out</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="inv-body">
          {error && <div className="alert">{error}</div>}
          {done ? (
            <p className="st-saved">Password changed.</p>
          ) : (
            <div className="mp-form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="inv-cell">
                <span>Current password</span>
                <input type="password" value={values.current} onChange={set('current')} autoComplete="current-password" />
              </label>
              <label className="inv-cell">
                <span>New password</span>
                <input type="password" value={values.next} onChange={set('next')} autoComplete="new-password"
                  placeholder="8+ characters, letters and numbers" />
              </label>
              <label className="inv-cell">
                <span>Confirm new password</span>
                <input type="password" value={values.confirm} onChange={set('confirm')} autoComplete="new-password" />
              </label>
            </div>
          )}
        </div>
        <footer className="inv-footer">
          <span />
          <div className="inv-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{done ? 'Close' : 'Cancel'}</button>
            {!done && (
              <button type="submit" className="inv-btn-gold inv-btn-lg" disabled={saving}>
                {saving ? 'Saving…' : 'Change password'}
              </button>
            )}
          </div>
        </footer>
      </form>
    </div>
  );
}

export default ChangePasswordModal;
