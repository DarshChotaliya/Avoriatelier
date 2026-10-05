import Field from './Field';
import ItemCard from './ItemCard';
import { calcGold, formatAmount, formatWeight } from '../utils/purchaseCalc';
import { GOLD_PURITIES } from '../constants/purchaseOptions';

function GoldSection({ items, onChangeItem, onAdd, onRemove }) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>🥇 Gold Details</h2>
        <button type="button" className="btn btn-secondary" onClick={onAdd}>+ Add Gold</button>
      </div>
      {items.map((item, i) => {
        const set = (field) => (value) => onChangeItem(i, field, value);
        const c = calcGold(item);
        return (
          <ItemCard key={i} index={i} canRemove={items.length > 1} onRemove={() => onRemove(i)}>
            <Field label="Gold Type" value={item.goldType} onChange={set('goldType')}
              suggestions={['Bullion', 'Ornament', 'Old Gold', 'Coin', 'Bar']} />
            <Field label="Purity" required value={item.purity} onChange={set('purity')} options={GOLD_PURITIES} />
            <Field label="Gross Weight (g)" type="number" required value={item.grossWeight}
              onChange={set('grossWeight')} />
            <Field label="Stone Weight (g)" type="number" value={item.stoneWeight} onChange={set('stoneWeight')} />
            <Field label="Net Gold Weight (g)" readOnly value={formatWeight(c.netWeight)} />
            <Field label="Wastage %" type="number" max="100" value={item.wastagePercent}
              onChange={set('wastagePercent')} />
            <Field label="Wastage Weight (g)" readOnly value={formatWeight(c.wastageWeight)} />
            <Field label="Chargeable Weight (g)" readOnly value={formatWeight(c.chargeableWeight)} />
            <Field label="Gold Rate / Gram" type="number" required value={item.ratePerGram}
              onChange={set('ratePerGram')} />
            <Field label="Gold Value" readOnly value={formatAmount(c.goldValue)} />
            <Field label="Making Charges" type="number" value={item.makingCharges} onChange={set('makingCharges')} />
            <Field label="Other Charges" type="number" value={item.otherCharges} onChange={set('otherCharges')} />
            <Field label="Amount" readOnly value={formatAmount(c.amount)} />
          </ItemCard>
        );
      })}
      <p className="formula">
        Chargeable Weight = Net Weight + Wastage Weight · Gold Value = Chargeable Weight × Gold Rate ·
        Amount = Gold Value + Making + Other
      </p>
    </section>
  );
}

export default GoldSection;
