import { useState } from 'react';
import Icon from './Icon';
import { authApi } from '../api/erpApi';
import './LoginPage.css';

/**
 * Sign-in screen. With `setup`, it creates the very first (Owner) account instead; the server only allows
 * that while no users exist.
 */
function LoginPage({ setup = false, onSignedIn, notice = '' }) {
  const [form, setForm] = useState({ fullName: '', username: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (setup && form.password !== form.confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const me = setup
        ? await authApi.setup({ fullName: form.fullName, username: form.username, password: form.password })
        : await authApi.login(form.username, form.password);
      onSignedIn(me);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="lg-page">
      <aside className="lg-brand">
        <img src={`${process.env.PUBLIC_URL}/brand/avori-logo-white.png`} alt="Avori" />
        <p>Purchase · Sales · Stock</p>
      </aside>

      <main className="lg-main">
        <form className="lg-card" onSubmit={submit} noValidate>
          <h1>{setup ? 'Create owner account' : 'Sign in'}</h1>
          <p className="lg-sub">
            {setup
              ? 'First time here: this account will manage the store and its users.'
              : 'Welcome back. Sign in to continue.'}
          </p>

          {(error || notice) && <div className="alert" role="alert">{error || notice}</div>}

          {setup && (
            <label className="lg-field">
              <span>Full name</span>
              <input value={form.fullName} onChange={set('fullName')} autoComplete="name" maxLength={100} required />
            </label>
          )}
          <label className="lg-field">
            <span>Username</span>
            <input value={form.username} onChange={set('username')} autoComplete="username" maxLength={50}
              autoCapitalize="none" spellCheck={false} required autoFocus />
          </label>
          <label className="lg-field">
            <span>Password</span>
            <div className="lg-password">
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')}
                autoComplete={setup ? 'new-password' : 'current-password'} maxLength={200} required />
              <button type="button" className="lg-eye" onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                <Icon name="eye" size={16} />
              </button>
            </div>
          </label>
          {setup && (
            <>
              <label className="lg-field">
                <span>Confirm password</span>
                <input type={showPassword ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')}
                  autoComplete="new-password" maxLength={200} required />
              </label>
              <p className="lg-hint">At least 8 characters, with letters and numbers.</p>
            </>
          )}

          <button type="submit" className="lg-submit" disabled={busy || !form.username || !form.password}>
            {busy ? 'Please wait…' : setup ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default LoginPage;
