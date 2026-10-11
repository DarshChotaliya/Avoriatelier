import { useEffect, useState } from 'react';
import Icon from './Icon';
import { metalRatesApi } from '../api/erpApi';
import './MasterPage.css';

const shortDateTime = (iso) => (iso
  ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : null);

/**
 * Today's gold / silver / platinum 999 rates, above the Metal Types list. Saving them works out every quality's quotation rate
 * (999 rate × its Quotation %). Used only on quotations, never on purchases.
 */
function MetalRatesBox({ canEdit, onSaved }) {
  const [rates, setRates] = useState({ Gold: '', Silver: '', Platinum: '' });
  const [updated, setUpdated] = useState(null);
  const [state, setState] = useState({ saving: false, error: '', saved: false });

  const apply = (list) => {
    setRates(Object.fromEntries(list.map((r) => [r.metal, r.rate ? String(r.rate) : ''])));
    const latest = list.filter((r) => r.updatedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    setUpdated(latest ?? null);
  };

  useEffect(() => {
    metalRatesApi.get().then(apply).catch((e) => setState((s) => ({ ...s, error: e.message })));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setState({ saving: true, error: '', saved: false });
    try {
      apply(await metalRatesApi.save({
        gold: Number(rates.Gold) || 0, silver: Number(rates.Silver) || 0, platinum: Number(rates.Platinum) || 0,
      }));
      await onSaved();
      setState({ saving: false, error: '', saved: true });
    } catch (err) {
      setState({ saving: false, error: err.message, saved: false });
    }
  };

  const box = (metal) => (
    <label className="mr-field">
      <span>{metal} 999 / g</span>
      <span className="mr-input">
        <em>₹</em>
        <input type="number" min="0" step="any" value={rates[metal]} readOnly={!canEdit} placeholder="0"
          onChange={(e) => {
            setRates((r) => ({ ...r, [metal]: e.target.value }));
            setState((s) => ({ ...s, saved: false }));
          }} />
      </span>
    </label>
  );

  return (
    <form className="pi-card mr-box" onSubmit={save} aria-label="Today's rate">
      <div className="mr-title">
        <span className="mr-icon"><Icon name="coin" size={18} /></span>
        <div>
          <h3>Today&apos;s Rate <small>for quotations</small></h3>
          <p className="muted">
            Quotation rate of each quality = 999 rate × its Quotation %.
            {updated && ` Last set ${shortDateTime(updated.updatedAt)}${updated.updatedBy ? ` by ${updated.updatedBy}` : ''}.`}
          </p>
        </div>
      </div>
      <div className="mr-fields">
        {box('Gold')}
        {box('Silver')}
        {box('Platinum')}
        {canEdit && (
          <button type="submit" className="pi-btn-gold" disabled={state.saving}>
            <Icon name={state.saved ? 'check' : 'save'} size={16} />
            {state.saving ? 'Saving…' : state.saved ? 'Saved' : 'Save Rates'}
          </button>
        )}
      </div>
      {state.error && <div className="alert mr-error">{state.error}</div>}
    </form>
  );
}

export default MetalRatesBox;
