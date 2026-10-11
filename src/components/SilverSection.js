import Field from './Field';
import Icon from './Icon';
import ItemCard from './ItemCard';
import { calcSilver, formatAmount, formatWeight } from '../utils/purchaseCalc';
import { SILVER_PURITIES } from '../constants/purchaseOptions';

function SilverSection({ items, onChangeItem, onAdd, onRemove }) {
  return (
    <section className="card">
      <div className="card-title">
        <h2><Icon name="coin" size={15} className="sec-icon sec-silver" /> Silver Details</h2>
        <button type="button" className="btn btn-secondary" onClick={onAdd}>+ Add Silver</button>
      </div>
      {items.map((item, i) => {
        const set = (field) => (value) => onChangeItem(i, field, value);
        const c = calcSilver(item);
        return (
          <ItemCard key={i} index={i} canRemove={items.length > 1} onRemove={() => onRemove(i)}>
            <Field label="Silver Type" value={item.silverType} onChange={set('silverType')}
              suggestions={['Bullion', 'Ornament', 'Utensil', 'Coin', 'Bar']} />
            <Field label="Purity" required value={item.purity} onChange={set('purity')}
              suggestions={SILVER_PURITIES} />
            <Field label="Gross Weight (g)" type="number" required value={item.grossWeight}
              onChange={set('grossWeight')} />
            <Field label="Net Silver Weight (g)" readOnly value={formatWeight(c.netWeight)} />
            <Field label="Rate / Gram" type="number" required value={item.ratePerGram}
              onChange={set('ratePerGram')} />
            <Field label="Silver Value" readOnly value={formatAmount(c.silverValue)} />
            <Field label="Other Charges" type="number" value={item.otherCharges} onChange={set('otherCharges')} />
            <Field label="Amount" readOnly value={formatAmount(c.amount)} />
          </ItemCard>
        );
      })}
      <p className="formula">Net Weight = Gross Weight · Silver Value = Net Weight × Silver Rate · Amount = Silver Value + Other</p>
    </section>
  );
}

export default SilverSection;
