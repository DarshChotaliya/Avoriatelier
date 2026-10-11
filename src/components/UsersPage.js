import { useEffect, useState } from 'react';
import { usePaged } from './Pagination';
import Icon from './Icon';
import SelectBox from './SelectBox';
import { usersApi } from '../api/erpApi';
import './PurchaseInvoice.css';
import './PurchaseInvoices.css';
import './MasterPage.css';
import './UsersPage.css';

export const ROLE_LABELS = { Owner: 'Owner', Manager: 'Manager', Accountant: 'Accountant', StoreStaff: 'Store Staff' };

const ROLE_HINTS = {
  Owner: 'Everything, including users.',
  Manager: 'Purchases, sales, stock and masters. Cannot delete purchases or manage users.',
  Accountant: 'Sees purchases, sales, stock and profit. Cannot change anything.',
  StoreStaff: 'Creates sales and sees only their own sales and stock. No purchase prices, cost or profit.',
};

const shortDate = (iso) => (iso
  ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : 'Never');

function UserModal({ user, branches, onSaved, onClose }) {
  const [values, setValues] = useState(() => ({
    username: user?.username ?? '',
    fullName: user?.fullName ?? '',
    role: user?.role ?? 'StoreStaff',
    branches: user?.branches ?? [],
    isActive: user?.isActive ?? true,
    password: '',
  }));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (v) => setValues((s) => ({ ...s, [k]: v }));
  const toggleBranch = (name) => setValues((s) => ({
    ...s,
    branches: s.branches.includes(name) ? s.branches.filter((b) => b !== name) : [...s.branches, name],
  }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await usersApi.save({ ...values, id: user?.id, password: values.password || null });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="inv-overlay">
      <form className="inv-modal mp-modal" onSubmit={submit} noValidate role="dialog" aria-modal="true"
        aria-label={user ? `Edit ${user.username}` : 'New user'}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="users" size={22} /></span>
          <div>
            <h2>{user ? `Edit ${user.fullName}` : 'New user'}</h2>
            <p>Role decides what they can see and do</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="inv-body">
          {error && <div className="alert">{error}</div>}
          <div className="mp-form-grid">
            <label className="inv-cell">
              <span>Full name<em> *</em></span>
              <input value={values.fullName} onChange={(e) => set('fullName')(e.target.value)} maxLength={100} />
            </label>
            <label className="inv-cell">
              <span>Username<em> *</em></span>
              <input value={values.username} onChange={(e) => set('username')(e.target.value)} maxLength={50}
                autoCapitalize="none" spellCheck={false} autoComplete="off" />
            </label>
            <label className="inv-cell">
              <span>Role<em> *</em></span>
              <SelectBox value={values.role} onChange={set('role')} aria-label="Role"
                options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))} />
            </label>
            <label className="inv-cell">
              <span>{user ? 'New password (leave empty to keep)' : 'Password'}{!user && <em> *</em>}</span>
              <input type="password" value={values.password} onChange={(e) => set('password')(e.target.value)}
                autoComplete="new-password" maxLength={200} placeholder="8+ characters, letters and numbers" />
            </label>
            <p className="us-hint mp-wide">{ROLE_HINTS[values.role]}</p>

            <div className="inv-cell mp-wide">
              <span>Branches</span>
              <div className="us-branches">
                {branches.map((b) => (
                  <label key={b.id} className={`us-chip${values.branches.includes(b.name) ? ' on' : ''}`}>
                    <input type="checkbox" checked={values.branches.includes(b.name)}
                      onChange={() => toggleBranch(b.name)} />
                    {b.name}
                  </label>
                ))}
              </div>
              <small className="muted">
                {values.branches.length ? 'Only these branches.' : 'None ticked = every branch.'}
              </small>
            </div>

            <label className="us-active mp-wide">
              <input type="checkbox" checked={values.isActive} onChange={(e) => set('isActive')(e.target.checked)} />
              Active (can sign in)
            </label>
          </div>
        </div>
        <footer className="inv-footer">
          <span />
          <div className="inv-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="inv-btn-gold inv-btn-lg" disabled={saving}>
              <Icon name="save" size={16} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

/** Users & access (Owner only). */
function UsersPage({ branches, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | user

  const [version, setVersion] = useState(0);
  useEffect(() => {
    usersApi.list().then(setUsers).catch((e) => setError(e.message));
  }, [version]);

  const { pageRows, pager } = usePaged(users);

  return (
    <div className="pi-page">
      <div className="pi-top">
        <div>
          <h1>Users</h1>
          <p className="page-subtitle">{users.filter((u) => u.isActive).length} active · who can sign in and what they can do</p>
        </div>
        <div className="pi-top-actions">
          <button type="button" className="pi-btn-gold" onClick={() => setEditing('new')}>
            <Icon name="plusCircle" size={16} />
            New User
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="pi-card">
        <div className="pi-table-wrap">
          <table className="pi-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Branches</th>
                <th>Last sign-in</th>
                <th>Status</th>
                <th className="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((u) => (
                <tr key={u.id} className={u.isActive ? undefined : 'us-inactive'}>
                  <td>
                    <span className="pi-item-name">{u.fullName}</span>
                    {u.id === currentUserId && <span className="us-you">You</span>}
                  </td>
                  <td className="mono">{u.username}</td>
                  <td><span className={`us-role us-${u.role.toLowerCase()}`}>{ROLE_LABELS[u.role] ?? u.role}</span></td>
                  <td>{u.branches.length ? u.branches.join(', ') : <span className="muted">All</span>}</td>
                  <td className="muted">{shortDate(u.lastLoginAt)}</td>
                  <td>{u.isActive ? <span className="sku-stock">Active</span> : <span className="sku-stock out">Off</span>}</td>
                  <td className="center mp-actions">
                    <button type="button" className="pi-action" title="Edit" aria-label={`Edit ${u.username}`}
                      onClick={() => setEditing(u)}>
                      <Icon name="edit" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pager}
      </div>

      {editing && (
        <UserModal
          user={editing === 'new' ? null : editing}
          branches={branches}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

export default UsersPage;
