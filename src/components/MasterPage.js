import { useMemo, useState } from 'react';
import { alertDialog, confirmDialog } from './ConfirmDialog';
import Icon from './Icon';
import SelectBox from './SelectBox';
import { usePaged } from './Pagination';
import { formatAmount } from '../utils/purchaseCalc';
import './PurchaseInvoice.css';
import './PurchaseInvoices.css';
import './MasterPage.css';

const optionLabel = (field, value) => {
  const opt = (field.options ?? []).find((o) => (typeof o === 'string' ? o : o.value) === value);
  return typeof opt === 'object' ? opt.label : value;
};

const display = (field, value) => {
  if (value === '' || value == null) return field.emptyText ?? '—';
  if (field.options) return optionLabel(field, value);
  if (field.money) return `₹${formatAmount(value)}`;
  return String(value);
};

/** Add / edit form for one master record; `initial` pre-fills a new record (e.g. a name typed elsewhere). */
export function MasterForm({ config, record, initial, onSave, onClose }) {
  // `auto` fields are worked out by the server (e.g. a quotation rate) and only shown in the list.
  const fields = config.fields.filter((f) => !f.auto);
  const [values, setValues] = useState(() => Object.fromEntries(
    fields.map((f) => [f.key, record?.[f.key] ?? initial?.[f.key] ?? (f.type === 'select' && f.required
      ? (typeof f.options[0] === 'string' ? f.options[0] : f.options[0].value) : '')]),
  ));
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState('');

  const missing = fields.filter((f) => f.required && String(values[f.key] ?? '').trim() === '');
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (missing.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      const numeric = Object.fromEntries(fields.filter((f) => f.type === 'number')
        .map((f) => [f.key, values[f.key] === '' ? 0 : Number(values[f.key])]));
      await onSave({ ...record, ...values, ...numeric });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="inv-overlay">
      <form className="inv-modal mp-modal" onSubmit={submit} noValidate role="dialog" aria-modal="true"
        aria-label={`${record ? 'Edit' : 'New'} ${config.singular}`}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name={config.icon} size={22} /></span>
          <div>
            <h2>{record ? 'Edit' : 'New'} {config.singular}</h2>
            <p>{config.title} master</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="inv-body">
          {error && <div className="alert">{error}</div>}
          <div className="mp-form-grid">
            {fields.map((f) => {
              const invalid = showErrors && missing.includes(f);
              let control;
              if (f.type === 'select') {
                control = (
                  <SelectBox value={values[f.key]} options={f.options} aria-label={f.label}
                    allowEmpty={!f.required} placeholder="—"
                    onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />
                );
              } else if (f.type === 'textarea') {
                control = (
                  <textarea rows={3} value={values[f.key]} onChange={set(f.key)} maxLength={500}
                    placeholder={f.placeholder} />
                );
              } else {
                control = (
                  <input type={f.type ?? 'text'} min={f.type === 'number' ? 0 : undefined} step="any"
                    className={f.type === 'number' ? 'inv-num' : undefined} value={values[f.key]}
                    onChange={f.upper
                      ? (e) => setValues((v) => ({ ...v, [f.key]: e.target.value.toUpperCase() })) : set(f.key)}
                    maxLength={f.type === 'number' ? undefined : f.maxLength ?? 200}
                    placeholder={f.placeholder} />
                );
              }
              return (
                <label key={f.key} className={`inv-cell${f.wide ? ' mp-wide' : ''}${invalid ? ' inv-invalid' : ''}`}>
                  <span>{f.label}{f.required && <em> *</em>}</span>
                  {control}
                  {invalid && <small className="inv-error">Required</small>}
                </label>
              );
            })}
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

/** List + add/edit/delete for one master. `usedNames` blocks deleting records that documents still use. */
function MasterPage({ config, records, usedNames, onSave, onDelete, readOnly = false, header = null }) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | record
  const columns = config.fields.filter((f) => f.list);
  const q = search.trim().toLowerCase();

  const rows = useMemo(() => records.filter((r) => !q || columns
    .some((c) => String(r[c.key] ?? '').toLowerCase().includes(q))), [records, columns, q]);

  const { pageRows, pager } = usePaged(rows);

  // `config.groupBy` (e.g. Metal Types by metal) splits the list into titled groups; otherwise one plain group.
  const groups = useMemo(() => {
    const by = config.groupBy;
    if (!by) return [{ label: null, rows: pageRows }];
    const order = [...by.order, ...new Set(pageRows.map((r) => r[by.key]).filter((v) => v && !by.order.includes(v)))];
    return order.map((label) => ({ label, rows: pageRows.filter((r) => r[by.key] === label) }))
      .filter((g) => g.rows.length > 0 || (!q && by.order.includes(g.label)));
  }, [config.groupBy, pageRows, q]);

  // Errors are shown inside the form (MasterForm catches them), so only close on success.
  const save = async (record) => {
    await onSave(record);
    setEditing(null);
  };

  const remove = async (r) => {
    if (usedNames?.has(r.name)) {
      alertDialog(`"${r.name}" is used in invoices or orders and cannot be deleted.`);
      return;
    }
    if (await confirmDialog({ title: `Delete ${config.singular.toLowerCase()}?`, message: `"${r.name}" will be removed.` })) {
      onDelete(r.id);
    }
  };

  return (
    <div className="pi-page">
      <div className="pi-top">
        <div>
          <h1>{config.title}</h1>
          <p className="page-subtitle">{records.length} records</p>
        </div>
        <div className="pi-top-actions">
          {!readOnly && (
            <button type="button" className="pi-btn-gold" onClick={() => setEditing('new')}>
              <Icon name="plusCircle" size={16} />
              New {config.singular}
            </button>
          )}
        </div>
      </div>

      {header}

      <div className="pi-card">
        <div className="pi-filters">
          <label className="pi-search">
            <Icon name="search" size={16} />
            <input type="search" placeholder={`Search ${config.title.toLowerCase()}…`} value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
        <div className="pi-table-wrap">
          <table className="pi-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={c.type === 'number' ? 'num' : undefined}>{c.label}</th>
                ))}
                {!readOnly && <th className="center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (!config.groupBy || q) && (
                <tr><td colSpan={columns.length + (readOnly ? 0 : 1)} className="pi-empty">No records.</td></tr>
              )}
              {groups.map((g) => [
                g.label && (
                  <tr key={`group-${g.label}`} className="mp-group">
                    <td colSpan={columns.length + (readOnly ? 0 : 1)}>
                      {g.label} <span className="mp-group-count">{g.rows.length}</span>
                    </td>
                  </tr>
                ),
                g.label && g.rows.length === 0 && (
                  <tr key={`empty-${g.label}`}>
                    <td colSpan={columns.length + (readOnly ? 0 : 1)} className="pi-empty mp-group-empty">
                      No {g.label.toLowerCase()} quality yet.
                    </td>
                  </tr>
                ),
                ...g.rows.map((r) => (
                <tr key={r.id}>
                  {columns.map((c, i) => (
                    <td key={c.key} className={c.type === 'number' ? 'num mono' : undefined}>
                      {i === 0 ? <span className="pi-item-name">{r[c.key]}</span> : display(c, r[c.key])}
                    </td>
                  ))}
                  {!readOnly && (
                    <td className="center mp-actions">
                      <button type="button" className="pi-action" title="Edit" aria-label={`Edit ${r.name}`}
                        onClick={() => setEditing(r)}>
                        <Icon name="edit" size={15} />
                      </button>
                      <button type="button" className="pi-action danger" title="Delete" aria-label={`Delete ${r.name}`}
                        onClick={() => remove(r)}>
                        <Icon name="trash" size={15} />
                      </button>
                    </td>
                  )}
                </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
        {pager}
      </div>

      {editing && (
        <MasterForm config={config} record={editing === 'new' ? null : editing} onSave={save}
          onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

export default MasterPage;
