import { useEffect, useMemo, useState } from 'react';
import { alertDialog } from './ConfirmDialog';
import Icon from './Icon';
import PhotoThumb from './PhotoThumb';
import { usePaged } from './Pagination';
import { skuSequence } from '../utils/skuRegistry';
import { buildSku, nextSku, skuParts } from '../utils/skuFormat';
import './PurchaseInvoice.css';
import './PurchaseInvoices.css';
import './MasterPage.css';
import './SkuMaster.css';


function EditSkuModal({ sku, onSave, onClose }) {
  const [value, setValue] = useState(sku.skuNo);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await onSave(sku.skuNo, value);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="inv-overlay">
      <form className="inv-modal mp-modal sk-edit" onSubmit={submit} noValidate role="dialog" aria-modal="true"
        aria-label={`Edit SKU ${sku.skuNo}`}>
        <header className="inv-header">
          <span className="inv-header-icon"><Icon name="hash" size={22} /></span>
          <div>
            <h2>Edit SKU</h2>
            <p>Fix a sequence gap or a number typo</p>
          </div>
          <button type="button" className="inv-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="inv-body">
          {error && <div className="alert">{error}</div>}
          <p className="sk-edit-item">{sku.category}{sku.collection ? ` · ${sku.collection}` : ''} — {sku.supplierName}</p>
          <label className="inv-cell">
            <span>SKU No<em> *</em></span>
            <input className="sk-mono" value={value} onChange={(e) => setValue(e.target.value)} maxLength={30}
              autoFocus />
          </label>
        </div>
        <footer className="inv-footer">
          <span className="muted">Current: <b className="sk-mono">{sku.skuNo}</b></span>
          <div className="inv-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="inv-btn-gold inv-btn-lg">
              <Icon name="save" size={16} />
              Save SKU
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}

const SAMPLE = { category: 'Ring', size: '14', collection: 'Women' };
const SEPARATORS = [
  { value: '', label: 'None' },
  { value: '-', label: 'Dash' },
  { value: '/', label: 'Slash' },
];

/** One row of buttons to pick a number or option (e.g. chars per field: 1 2 3 4). */
function Choice({ label, hint, options, value, onChange, disabled }) {
  return (
    <div className="sk-field">
      <span className="sk-label">{label}</span>
      <div className="sk-choice" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} disabled={disabled}
            className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      {hint && <small className="muted">{hint}</small>}
    </div>
  );
}

/** Format controls on the left, a breakdown of the resulting SKU on the right. */
function FormatSettings({ settings, sample: SAMPLE, canEdit, onSave }) {
  const [draft, setDraft] = useState({ ...settings, counter: String(settings.counter) });
  const [state, setState] = useState({ saving: false, error: '', saved: false });
  const set = (key) => (value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setState((st) => ({ ...st, saved: false }));
  };
  const preview = { ...draft, companyPrefix: draft.companyPrefix.trim().toUpperCase(), counter: Number(draft.counter) || 0 };
  const sequence = preview.counter + 1;
  const [company, item, size, gender, number] = skuParts(preview, SAMPLE, sequence);
  const sep = (parts) => parts.join(preview.separator);

  const save = async (e) => {
    e.preventDefault();
    if (!preview.companyPrefix) {
      setState({ saving: false, error: 'Company prefix is required.', saved: false });
      return;
    }
    setState({ saving: true, error: '', saved: false });
    try {
      await onSave(preview);
      setState({ saving: false, error: '', saved: true });
    } catch (err) {
      setState({ saving: false, error: err.message, saved: false });
    }
  };

  const rows = [
    ['Company Prefix', `"${preview.companyPrefix}"`, company, 'Fixed company short code'],
    ['Item Name', '"Ring"', item, `Short Code from Item Categories, else first ${preview.nameChars} character${preview.nameChars === 1 ? '' : 's'}`],
    ['Size', '"14"', size, 'Digits of the size, as entered'],
    ['Gender', 'Women', gender, '1 char from the collection: W, M, K or U'],
    ['Auto Sequence', 'Auto', number, `${preview.seqDigits}-digit, auto-increments`],
  ];

  return (
    <div className="sk-format">
      <form className="pi-card sk-panel" onSubmit={save}>
        <h3><Icon name="settings" size={16} /> Format Controls</h3>
        {state.error && <div className="alert">{state.error}</div>}
        <label className="sk-field">
          <span className="sk-label">Company Prefix<em> *</em></span>
          <input className="sk-mono" value={draft.companyPrefix} maxLength={6} readOnly={!canEdit}
            onChange={(e) => set('companyPrefix')(e.target.value)} />
          <small className="muted">Short code for your company (e.g. AV for Avori)</small>
        </label>
        <Choice label="Chars per Field" value={draft.nameChars} onChange={set('nameChars')} disabled={!canEdit}
          options={[1, 2, 3, 4].map((n) => ({ value: n, label: n }))}
          hint={`Characters taken from the item name (e.g. ${draft.nameChars} → Ring = ${item})`} />
        <Choice label="Sequence Digits" value={draft.seqDigits} onChange={set('seqDigits')} disabled={!canEdit}
          options={[3, 4, 5, 6].map((n) => ({ value: n, label: n }))}
          hint={`Zero-padded running number (e.g. ${draft.seqDigits} → ${'1'.padStart(draft.seqDigits, '0')})`} />
        <Choice label="Separator Between Parts" value={draft.separator} onChange={set('separator')} disabled={!canEdit}
          options={SEPARATORS.map((o) => ({
            value: o.value,
            label: `${o.label} (${buildSku({ ...preview, separator: o.value }, { category: 'Ring', size: '12', collection: 'Men' }, 1)})`,
          }))} />
        <label className="sk-field sk-counter">
          <span className="sk-label">Counter (last number used)</span>
          <input type="number" min="0" step="1" className="inv-num" value={draft.counter} readOnly={!canEdit}
            onChange={(e) => set('counter')(e.target.value)} />
          <small className="muted">The next piece gets #{sequence}. Change it only to fix a gap or start a new series.</small>
        </label>
        {canEdit && (
          <button type="submit" className="pi-btn-gold sk-save" disabled={state.saving}>
            <Icon name={state.saved ? 'check' : 'save'} size={16} />
            {state.saving ? 'Saving…' : state.saved ? 'Saved' : 'Save Format Settings'}
          </button>
        )}
      </form>

      <div className="pi-card sk-panel">
        <h3><Icon name="info" size={16} /> SKU Format Breakdown</h3>
        <table className="pi-table sk-breakdown">
          <thead>
            <tr><th>Part</th><th>Example</th><th>Generated Tag</th><th>Description</th></tr>
          </thead>
          <tbody>
            {rows.map(([part, example, tag, description]) => (
              <tr key={part}>
                <td><b>{part}</b></td>
                <td className="sk-mono muted">{example}</td>
                <td><span className="sk-tag">{tag}</span></td>
                <td className="muted">{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="sk-sample">
          <b>Sample SKU Result:</b>
          <span className="sk-mono">{[company, item, size, gender, number].join(' + ')} =</span>
          <span className="sk-result">{sep([company, item, size, gender, number])}</span>
        </p>
        <p className="muted sk-note">
          A new format or counter only affects SKUs made afterwards; existing SKUs keep their number.
        </p>
      </div>
    </div>
  );
}

/** SKU registry (every SKU bought, newest first) and the SKU format / counter settings. */
function SkuMasterPage({ stock, settings, categories = [], soldSkus, onRename, onSaveSettings, onRefresh, canEdit = true }) {
  // The sample ring uses the Ring category's own short code when it has one.
  const sample = useMemo(() => ({
    ...SAMPLE, shortCode: categories.find((c) => c.name.toLowerCase() === 'ring')?.shortCode,
  }), [categories]);
  const [tab, setTab] = useState('registry');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [copied, setCopied] = useState(false);

  const skus = useMemo(() => stock.map((s) => s.skuNo), [stock]);
  // What a size 14 women's ring bought next would be numbered.
  const preview = useMemo(() => nextSku(settings, sample, skus).sku, [settings, sample, skus]);

  const q = search.trim().toLowerCase();
  const rows = useMemo(() => [...stock]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || skuSequence(b.skuNo) - skuSequence(a.skuNo))
    .filter((s) => !q || [s.skuNo, s.category, s.collection, s.supplierName, s.supplierInvoiceNo, s.metalType,
      s.diamondType, s.designCode].some((v) => v && String(v).toLowerCase().includes(q))), [stock, q]);

  const { pageRows, pager } = usePaged(rows);

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked; the number is still visible to copy by hand.
    }
  };

  const rename = async (oldSku, newSku) => {
    await onRename(oldSku, newSku);
    setEditing(null);
  };

  const startEdit = (s) => {
    if (soldSkus.has(s.skuNo)) {
      alertDialog(`${s.skuNo} is already used in a sales invoice, so its number cannot change.`);
      return;
    }
    setEditing(s);
  };

  return (
    <div className="pi-page">
      <div className="pi-top">
        <div className="sk-title">
          <span className="sk-title-icon"><Icon name="hash" size={22} /></span>
          <div>
            <h1>SKU Master &amp; Registry</h1>
            <p className="page-subtitle">SKU formats, sequence continuity and SKU number fixes</p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary sk-refresh" onClick={onRefresh}>
          <Icon name="refresh" size={15} /> Refresh Data
        </button>
      </div>

      <div className="sk-tiles">
        <div className="sk-tile">
          <span className="sk-tile-icon"><Icon name="layers" size={20} /></span>
          <div>
            <small>Total registered SKUs</small>
            <strong>{skus.length} Items</strong>
          </div>
        </div>
        <div className="sk-tile">
          <span className="sk-tile-icon sk-green"><Icon name="chart" size={20} /></span>
          <div>
            <small>Current counter</small>
            <strong className="sk-green-text">#{settings.counter} <em>(next piece gets #{settings.counter + 1})</em></strong>
          </div>
        </div>
        <div className="sk-tile sk-preview">
          <div>
            <small>Next live SKU preview</small>
            <strong className="sk-mono">{preview}</strong>
            <small>Example for a size 14 ring (women)</small>
          </div>
          <button type="button" className="sk-copy" onClick={copyPreview} title="Copy" aria-label="Copy next SKU">
            <Icon name={copied ? 'check' : 'copy'} size={16} />
          </button>
        </div>
      </div>

      <div className="sk-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'registry'} className={tab === 'registry' ? 'active' : ''}
          onClick={() => setTab('registry')}>
          <Icon name="layers" size={15} /> SKU Sequence Registry ({skus.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === 'rules'} className={tab === 'rules' ? 'active' : ''}
          onClick={() => setTab('rules')}>
          <Icon name="settings" size={15} /> Format Rules &amp; Counter Settings
        </button>
      </div>

      {tab === 'registry' ? (
        <div className="pi-card">
          <div className="sk-head">
            <h3>Registered Item SKUs <span className="sk-count">{rows.length} SKUs</span></h3>
            <p className="muted">Newest on top. Use “Edit SKU” to fix a sequence gap or a number typo.</p>
          </div>
          <div className="pi-filters">
            <label className="pi-search">
              <Icon name="search" size={16} />
              <input type="search" placeholder="Search by SKU, item, supplier, invoice…" value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>
          <div className="pi-table-wrap">
            <table className="pi-table sk-table">
              <thead>
                <tr>
                  <th>SKU Tag &amp; Sequence</th>
                  <th>Item &amp; Category</th>
                  <th>Spec &amp; Collection</th>
                  <th>Invoice / Supplier</th>
                  <th className="num">Stock</th>
                  <th className="num">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="pi-empty">No SKUs yet. They are created by purchase invoices.</td></tr>
                )}
                {pageRows.map((s) => (
                  <tr key={s.skuNo}>
                    <td>
                      <span className="sk-tag">{s.skuNo}</span>
                      <span className="sk-seq">#{skuSequence(s.skuNo)}</span>
                    </td>
                    <td>
                      <div className="sk-item">
                        {s.thumb
                          ? <PhotoThumb src={s.thumb} title={s.skuNo} />
                          : <span className="pi-thumb pi-thumb-empty"><Icon name="camera" size={14} /></span>}
                        <div>
                          <div className="pi-item-name">{s.category}{s.designCode ? ` · ${s.designCode}` : ''}</div>
                          <div className="pi-item-sub">Category: {s.category}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="sk-spec">{[s.metalType, s.diamondType].filter(Boolean).join(' · ') || '—'}</div>
                      {s.collection && <span className="sk-badge">{s.collection}</span>}
                    </td>
                    <td>
                      <div className="pi-item-name sk-inv">{s.supplierInvoiceNo ? `Inv #${s.supplierInvoiceNo}` : 'Purchase'}</div>
                      <div className="pi-item-sub">Supplier: {s.supplierName}</div>
                    </td>
                    <td className="num"><span className={`sku-stock${s.available <= 0 ? ' out' : ''}`}>{s.available}</span></td>
                    <td className="num">
                      {canEdit && (
                        <button type="button" className="sk-edit-btn" onClick={() => startEdit(s)}>
                          <Icon name="edit" size={14} /> Edit SKU
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pager}
        </div>
      ) : (
        <FormatSettings key={JSON.stringify(settings)} settings={settings} sample={sample} canEdit={canEdit}
          onSave={onSaveSettings} />
      )}

      {editing && <EditSkuModal sku={editing} onSave={rename} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default SkuMasterPage;
