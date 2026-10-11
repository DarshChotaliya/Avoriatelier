import { useEffect, useState } from 'react';
import ComboBox from './ComboBox';
import Icon from './Icon';
import CostBreakdown from './CostBreakdown';
import SelectBox from './SelectBox';
import SizeField from './SizeField';
import { calcInvoiceItem, diamondAmount, diamondRowChange, stoneAmount } from '../utils/invoiceCalc';
import { formatAmount, formatWeight } from '../utils/purchaseCalc';
import { emptyDiamondRow, emptyStoneRow } from '../constants/purchaseOptions';
import { STONE_PRICING } from '../constants/masterConfig';
import { sizeKind } from '../utils/itemSize';

/** One compact labelled cell. */
function Cell({ label, required, invalid, className = '', children }) {
  const classes = ['inv-cell', invalid && 'inv-invalid', className].filter(Boolean);
  return (
    <label className={classes.join(' ')}>
      <span>{label}{required && <em> *</em>}</span>
      {children}
    </label>
  );
}

/** `embedded` drops the card header (number, collapse, remove) when the item is edited on its own. */
function InvoiceItemCard({
  index, item, masters, skuPreview, canRemove, errors, embedded = false, onChange, onRemove,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasErrors = Object.keys(errors).length > 0;
  // An item with problems always stays open so the highlights are visible.
  const open = embedded || !collapsed || hasErrors;
  const [preview, setPreview] = useState(null);
  const c = calcInvoiceItem(item);

  // Local preview of the chosen photo; freed when replaced or unmounted.
  useEffect(() => {
    if (!item.photo) {
      // Editing a saved item: show its stored thumbnail until a new photo is chosen.
      setPreview(item.thumb ?? null);
      return undefined;
    }
    const url = URL.createObjectURL(item.photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [item.photo, item.thumb]);

  const set = (field) => (e) => onChange({ [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const num = (field, step = 'any') => (
    <input type="number" min="0" step={step} className="inv-num" value={item[field]} onChange={set(field)} />
  );

  // The rate per gram is typed from the supplier bill; picking a metal quality does not fill it.
  const setMetal = (name) => onChange({ metalType: name });

  // Saved items keep their SKU; new ones show the prefix they will get.
  // Read-only: saved items show their SKU, new ones the number they will get (from the dialog).
  const skuShown = item.skuNo || skuPreview || '—';

  // ---------- stone & diamond rows ----------
  const changeRow = (listKey, i, changes) =>
    onChange({ [listKey]: item[listKey].map((r, j) => (j === i ? { ...r, ...changes } : r)) });
  const addRow = (listKey, empty) => onChange({ [listKey]: [...item[listKey], empty()] });
  const removeRow = (listKey, i) => onChange({ [listKey]: item[listKey].filter((_, j) => j !== i) });

  // The Stone Shapes master is only a list of names; pricing and rate are set on the row itself.
  const setStoneType = (i, name) => changeRow('stones', i, { stoneType: name });

  return (
    <div className={`inv-item${embedded ? ' inv-item-embedded' : ''}`}>
      {!embedded && (
      <div className="inv-item-head">
        <span className={`inv-item-no${hasErrors ? ' inv-item-no-error' : ''}`}>{index + 1}</span>
        <strong>{item.category || 'New Item'}</strong>
        <span className="inv-meta">Qty: <b>{item.qty || 0}</b></span>
        <span className="inv-meta">·</span>
        <span className="inv-meta">Net: <b>{formatWeight(c.totalNetWeight)} g</b></span>
        <span className="inv-meta">·</span>
        <span className="inv-meta">Cost/pc: <b>₹{formatAmount(c.costPerPiece)}</b></span>
        <span className="inv-pill">₹{formatAmount(c.grossAmount)}</span>
        <div className="inv-item-actions">
          {canRemove && (
            <button type="button" className="inv-icon-btn danger" title="Remove item" aria-label="Remove item"
              onClick={onRemove}>
              <Icon name="trash" size={15} />
            </button>
          )}
          <button type="button" className="inv-icon-btn" title={open ? 'Collapse' : 'Expand'}
            aria-label={open ? 'Collapse item' : 'Expand item'} onClick={() => setCollapsed(open)}>
            <Icon name={open ? 'chevronUp' : 'chevronDown'} size={16} />
          </button>
        </div>
      </div>

      )}

      {open && (
        <div className="inv-item-body">
          {/* What the piece is */}
          <div className="ic-basic">
            <label className="inv-photo" title="Item photo">
              {preview ? <img src={preview} alt="Item" /> : (
                <>
                  <Icon name="camera" size={20} />
                  <small>Photo</small>
                </>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden
                onChange={(e) => e.target.files[0] && onChange({ photo: e.target.files[0] })} />
            </label>
            <Cell label="Category" required invalid={errors.category} className="ic-span-2">
              {/* A category measured another way (e.g. Ring → Necklace) starts with an empty size. */}
              <SelectBox value={item.category}
                onChange={(v) => onChange({ category: v, ...(sizeKind(v) !== sizeKind(item.category) && { size: '' }) })}
                options={masters.categories.map((c) => c.name)} placeholder="— Category —" aria-label="Category" />
            </Cell>
            <Cell label="Qty" required invalid={errors.qty}>{num('qty', '1')}</Cell>
            <SizeField category={item.category} value={item.size} onChange={(size) => onChange({ size })} Cell={Cell} />
            <Cell label="Collection" className="ic-span-2">
              <SelectBox value={item.collection} onChange={(v) => onChange({ collection: v })}
                options={masters.collections.map((c) => c.name)} placeholder="— Collection —" allowEmpty
                aria-label="Collection" />
            </Cell>
            <Cell label="Diamond Type" required invalid={errors.diamondType} className="ic-span-2">
              <SelectBox value={item.diamondType} onChange={(v) => onChange({ diamondType: v })}
                options={masters.diamondTypes.map((d) => d.name)} placeholder="— Type —" aria-label="Diamond type" />
            </Cell>
            <Cell label="SKU No (auto)">
              <input value={skuShown} readOnly className="inv-readonly inv-sku" tabIndex={-1}
                title={skuShown === '—' ? 'Pick a category to get the SKU number' : 'Assigned automatically'} />
            </Cell>
            <Cell label="Description" className="ic-span-2">
              <input placeholder="Notes / description" value={item.description} onChange={set('description')}
                maxLength={500} />
            </Cell>
          </div>

          {/* Metal, labour and charges in one box on one line (GST % comes from Bank & Settings) */}
          <div className="ic-line">
            <section className="ic-group ic-group-7">
              <h4>Metal, Labour &amp; Charges</h4>
              <div className="ic-group-fields">
                <Cell label="Quality" required invalid={errors.metalType}>
                  <SelectBox value={item.metalType} onChange={setMetal}
                    options={masters.metalTypes.map((m) => m.name)} placeholder="— Metal —" aria-label="Metal quality" />
                </Cell>
                <Cell label="Gross Wt (g)">{num('grossWeight')}</Cell>
                <Cell label="Net Wt (g)" required invalid={errors.netWeight}>{num('netWeight')}</Cell>
                <Cell label="Metal Rate / Gram">{num('metalRate')}</Cell>
                <Cell label="Labour / g">{num('labourRate')}</Cell>
                <Cell label="Hallmark">{num('hallmark')}</Cell>
                <Cell label="Other ₹">{num('otherCharges')}</Cell>
              </div>
            </section>
          </div>

          {/* Stones */}
          <div className="ic-rows">
            <div className="ic-rows-head">
              <h4>Stones <span className="inv-count">{item.stones.length}</span></h4>
              <button type="button" className="ic-add" onClick={() => addRow('stones', emptyStoneRow)}>
                <Icon name="plusCircle" size={14} /> Add Stone
              </button>
            </div>
            {item.stones.length > 0 && (
              <table className="ic-table">
                <thead>
                  <tr>
                    <th>Stone</th>
                    <th>Color</th>
                    <th>Shape</th>
                    <th>Pricing</th>
                    <th>Size</th>
                    <th className="num">Pcs</th>
                    <th className="num">Wt (ct)</th>
                    <th className="num">Rate</th>
                    <th className="num">Amount</th>
                    <th aria-label="Remove" />
                  </tr>
                </thead>
                <tbody>
                  {item.stones.map((s, i) => {
                    const setS = (field) => (e) => changeRow('stones', i, { [field]: e.target.value });
                    const perPc = s.pricing === 'perCert';
                    const bad = errors[`stone${i}`];
                    return (
                      // Rows have no id until saved, so the index is the key.
                      <tr key={i} className={bad ? 'inv-invalid' : undefined}>
                        <td>
                          <ComboBox placeholder="e.g. CZ" value={s.stoneName ?? ''}
                            options={(masters.stoneNames ?? []).map((n) => n.name)}
                            onChange={(v) => changeRow('stones', i, { stoneName: v })} maxLength={100} aria-label="Stone" />
                        </td>
                        <td><input placeholder="e.g. Red" value={s.color ?? ''} onChange={setS('color')} maxLength={50} /></td>
                        <td>
                          <SelectBox value={s.stoneType} onChange={(v) => setStoneType(i, v)}
                            options={masters.stoneTypes.map((st) => st.name)} placeholder="— Shape —" aria-label="Shape" />
                        </td>
                        <td>
                          <SelectBox value={s.pricing} onChange={(v) => changeRow('stones', i, { pricing: v })}
                            options={STONE_PRICING} aria-label="Stone pricing" />
                        </td>
                        <td><input placeholder="e.g. 2 mm" value={s.size ?? ''} onChange={setS('size')} maxLength={50} /></td>
                        <td className="num"><input type="number" min="0" step="1" className="inv-num" value={s.pcs} onChange={setS('pcs')} /></td>
                        <td className="num">
                          <input type="number" min="0" step="any" className="inv-num" value={s.weight} onChange={setS('weight')}
                            title={perPc ? 'Total weight of all pieces (for the record only)' : 'Weight in carats'} />
                        </td>
                        <td className="num">
                          <input type="number" min="0" step="any" className="inv-num" value={s.rate} onChange={setS('rate')}
                            title={perPc ? 'Rate per piece' : 'Rate per carat'} />
                          <small className="ic-unit">{perPc ? '/ pc' : '/ ct'}</small>
                        </td>
                        <td className="num ic-amt">
                          ₹{formatAmount(stoneAmount(s))}
                          <small className="ic-unit">
                            {perPc ? `${s.pcs || 0} pcs × ${s.rate || 0}` : `${s.weight || 0} ct × ${s.rate || 0}`}
                          </small>
                        </td>
                        <td>
                          <button type="button" className="inv-icon-btn danger" aria-label="Remove stone"
                            onClick={() => removeRow('stones', i)}>
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Diamonds */}
          <div className="ic-rows">
            <div className="ic-rows-head">
              <h4>Diamonds <span className="inv-count">{item.diamonds.length}</span></h4>
              <button type="button" className="ic-add" onClick={() => addRow('diamonds', emptyDiamondRow)}>
                <Icon name="plusCircle" size={14} /> Add Diamond
              </button>
            </div>
            {item.diamonds.length > 0 && (
              <table className="ic-table">
                <thead>
                  <tr>
                    <th>Shape</th>
                    <th>Diamond Type</th>
                    <th>Size (mm)</th>
                    <th className="num">Pcs</th>
                    <th className="num">Rate / ct</th>
                    <th className="num">Wt (ct)</th>
                    <th className="num">Amount</th>
                    <th aria-label="Remove" />
                  </tr>
                </thead>
                <tbody>
                  {item.diamonds.map((d, i) => {
                    const setD = (field) => (e) => changeRow('diamonds', i, { [field]: e.target.value });
                    // Wt, Rate and Amount fill each other (see diamondRowChange).
                    const calcD = (field) => (e) => onChange({
                      diamonds: item.diamonds.map((r, j) => (j === i ? diamondRowChange(r, field, e.target.value) : r)),
                    });
                    const amount = d.amount ?? (diamondAmount(d) ? String(diamondAmount(d)) : '');
                    return (
                      // Rows have no id until saved, so the index is the key.
                      <tr key={i} className={errors[`diamond${i}`] ? 'inv-invalid' : undefined}>
                        {/* The shape is kept in the row's `code` (older rows hold supplier codes such as RND). */}
                        <td>
                          <SelectBox value={d.code ?? ''} onChange={(v) => changeRow('diamonds', i, { code: v })}
                            options={(masters.diamondShapes ?? []).map((sh) => sh.name)} allowEmpty placeholder="— Shape —" aria-label="Diamond shape" />
                        </td>
                        <td>
                          <SelectBox value={d.diamondType ?? ''} onChange={(v) => changeRow('diamonds', i, { diamondType: v })}
                            options={masters.diamondTypes.map((t) => t.name)} allowEmpty placeholder="— Type —"
                            aria-label="Diamond type" />
                        </td>
                        <td><input placeholder="e.g. 2.5" value={d.size} onChange={setD('size')} maxLength={50} /></td>
                        <td className="num"><input type="number" min="0" step="1" className="inv-num" value={d.pcs} onChange={setD('pcs')} /></td>
                        <td className="num"><input type="number" min="0" step="any" className="inv-num" value={d.rate} onChange={calcD('rate')} /></td>
                        <td className="num"><input type="number" min="0" step="any" className="inv-num" value={d.weight} onChange={calcD('weight')} /></td>
                        <td className="num">
                          <input type="number" min="0" step="any" className="inv-num" value={amount} onChange={calcD('amount')}
                            aria-label="Diamond amount" title="Type the bill amount; then the rate gives the weight or the weight gives the rate" />
                        </td>
                        <td>
                          <button type="button" className="inv-icon-btn danger" aria-label="Remove diamond"
                            onClick={() => removeRow('diamonds', i)}>
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <CostBreakdown item={item} c={c} />
        </div>
      )}
    </div>
  );
}

export default InvoiceItemCard;
