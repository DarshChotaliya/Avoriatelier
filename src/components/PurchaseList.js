import { useEffect, useState } from 'react';
import { usePaged } from './Pagination';
import { confirmDialog } from './ConfirmDialog';
import SelectBox from './SelectBox';
import Icon from './Icon';
import { purchaseApi } from '../api/purchaseApi';
import { formatAmount } from '../utils/purchaseCalc';
import { PURCHASE_TYPES } from '../constants/purchaseOptions';
import './PurchaseInvoices.css';
import './MasterPage.css';

// Same icons as the form's Diamond / Gold / Silver sections.
const TYPE_ICONS = { Diamond: 'diamond', Gold: 'coin', Silver: 'coin' };

const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN');

function PurchaseList({ type, onTypeChange, onNew, onEdit, onView, canEdit = true, canDelete = true }) {
  const [purchases, setPurchases] = useState([]);
  const [search, setSearch] = useState('');
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
    if (!await confirmDialog({ title: `Delete purchase ${p.purchaseNo}?`, message: 'This purchase will be removed.' })) return;
    try {
      await purchaseApi.remove(p.id);
      setReloadKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    }
  };

  const total = purchases.reduce((sum, p) => sum + p.netPurchaseAmount, 0);

  const { pageRows, pager } = usePaged(purchases);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{type ? `${type} Purchases` : 'Purchases'}</h1>
          <p className="page-subtitle">Diamond, gold and silver purchase entries with GST</p>
        </div>
        {canEdit && (
          <button type="button" className="btn btn-primary" onClick={onNew}>+ New Purchase</button>
        )}
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search purchase no., supplier, invoice…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SelectBox value={type} onChange={onTypeChange} options={PURCHASE_TYPES} allowEmpty placeholder="All types"
          aria-label="Purchase type" className="pl-type" />
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Purchase No.</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Vendor Invoice No.</th>
              <th>Type</th>
              <th>Payment</th>
              <th className="num">Net Amount</th>
              <th className="center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && purchases.length === 0 && (
              <tr><td colSpan={8} className="muted center">Loading…</td></tr>
            )}
            {!loading && purchases.length === 0 && (
              <tr><td colSpan={8} className="muted center">No purchases found.</td></tr>
            )}
            {pageRows.map((p) => (
              <tr key={p.id}>
                <td><button type="button" className="btn btn-link" onClick={() => onEdit(p.id)}>{p.purchaseNo}</button></td>
                <td>{formatDate(p.purchaseDate)}</td>
                <td>{p.supplierName}</td>
                <td>{p.invoiceNo}</td>
                <td><span className={`badge badge-${p.purchaseType.toLowerCase()}`}><Icon name={TYPE_ICONS[p.purchaseType]} size={12} className="badge-icon" /> {p.purchaseType}</span></td>
                <td>{p.paymentType}</td>
                <td className="num">₹ {formatAmount(p.netPurchaseAmount)}</td>
                <td className="center mp-actions">
                  {onView && (
                    <button type="button" className="pi-action" title="View details" aria-label={`View ${p.purchaseNo}`}
                      onClick={() => onView(p.id)}>
                      <Icon name="eye" size={15} />
                    </button>
                  )}
                  {canEdit && (
                    <button type="button" className="pi-action" title="Edit" aria-label={`Edit ${p.purchaseNo}`}
                      onClick={() => onEdit(p.id)}>
                      <Icon name="edit" size={15} />
                    </button>
                  )}
                  {canDelete && (
                    <button type="button" className="pi-action danger" title="Delete" aria-label={`Delete ${p.purchaseNo}`}
                      onClick={() => handleDelete(p)}>
                      <Icon name="trash" size={15} />
                    </button>
                  )}
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
        {pager}
      </div>
    </div>
  );
}

export default PurchaseList;
