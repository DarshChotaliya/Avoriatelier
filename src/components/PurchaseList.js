import { useEffect, useState } from 'react';
import { purchaseApi } from '../api/purchaseApi';
import { formatAmount } from '../utils/purchaseCalc';
import { PURCHASE_TYPES } from '../constants/purchaseOptions';

const TYPE_ICONS = { Diamond: '💎', Gold: '🥇', Silver: '🥈' };

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN');

function PurchaseList({ onNew, onEdit }) {
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Debounce typing in the search box.
    const timer = setTimeout(() => {
      purchaseApi.list({ search, type })
        .then((data) => {
          if (!cancelled) {
            setPurchases(data);
            setError('');
          }
        })
        .catch((e) => !cancelled && setError(e.message))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, type, reloadKey]);

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete purchase ${p.purchaseNo}?`)) return;
    try {
      await purchaseApi.remove(p.id);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    }
  };

  const total = purchases.reduce((sum, p) => sum + p.netPurchaseAmount, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Purchases</h1>
        <button type="button" className="btn btn-primary" onClick={onNew}>+ New Purchase</button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search purchase no., supplier, invoice…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {PURCHASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Purchase No.</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Invoice No.</th>
              <th>Type</th>
              <th>Payment</th>
              <th className="num">Net Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && purchases.length === 0 && (
              <tr><td colSpan={8} className="muted center">Loading…</td></tr>
            )}
            {!loading && purchases.length === 0 && (
              <tr><td colSpan={8} className="muted center">No purchases found.</td></tr>
            )}
            {purchases.map((p) => (
              <tr key={p.id}>
                <td><button type="button" className="btn btn-link" onClick={() => onEdit(p.id)}>{p.purchaseNo}</button></td>
                <td>{formatDate(p.purchaseDate)}</td>
                <td>{p.supplierName}</td>
                <td>{p.invoiceNo}</td>
                <td><span className={`badge badge-${p.purchaseType.toLowerCase()}`}>{TYPE_ICONS[p.purchaseType]} {p.purchaseType}</span></td>
                <td>{p.paymentType}</td>
                <td className="num">₹ {formatAmount(p.netPurchaseAmount)}</td>
                <td className="actions">
                  <button type="button" className="btn btn-link" onClick={() => onEdit(p.id)}>Edit</button>
                  <button type="button" className="btn btn-link danger" onClick={() => handleDelete(p)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
          {purchases.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6}>Total ({purchases.length})</td>
                <td className="num">₹ {formatAmount(total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

export default PurchaseList;
