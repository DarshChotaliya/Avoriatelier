import Field from './Field';
import ItemCard from './ItemCard';
import { calcDiamond, formatAmount } from '../utils/purchaseCalc';
import {
  DIAMOND_CLARITIES, DIAMOND_COLORS, DIAMOND_FLUORESCENCE, DIAMOND_GRADES, DIAMOND_SHAPES,
} from '../constants/purchaseOptions';

function DiamondSection({ items, onChangeItem, onAdd, onRemove }) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>💎 Diamond Details</h2>
        <button type="button" className="btn btn-secondary" onClick={onAdd}>+ Add Diamond</button>
      </div>
      {items.map((item, i) => {
        const set = (field) => (value) => onChangeItem(i, field, value);
        const { amount } = calcDiamond(item);
        return (
          <ItemCard key={i} index={i} canRemove={items.length > 1} onRemove={() => onRemove(i)}>
            <Field label="Packet / Lot No." value={item.packetLotNo} onChange={set('packetLotNo')} />
            <Field label="Shape" value={item.shape} onChange={set('shape')} suggestions={DIAMOND_SHAPES} />
            <Field label="Carat" type="number" required value={item.carat} onChange={set('carat')} />
            <Field label="Color" value={item.color} onChange={set('color')} suggestions={DIAMOND_COLORS} />
            <Field label="Clarity" value={item.clarity} onChange={set('clarity')} suggestions={DIAMOND_CLARITIES} />
            <Field label="Cut" value={item.cut} onChange={set('cut')} suggestions={DIAMOND_GRADES} />
            <Field label="Polish" value={item.polish} onChange={set('polish')} suggestions={DIAMOND_GRADES} />
            <Field label="Symmetry" value={item.symmetry} onChange={set('symmetry')} suggestions={DIAMOND_GRADES} />
            <Field label="Fluorescence" value={item.fluorescence} onChange={set('fluorescence')}
              suggestions={DIAMOND_FLUORESCENCE} />
            <Field label="Certificate No." value={item.certificateNo} onChange={set('certificateNo')} />
            <Field label="Certificate Date" type="date" value={item.certificateDate}
              onChange={set('certificateDate')} />
            <Field label="Quantity" type="number" step="1" value={item.quantity} onChange={set('quantity')} />
            <Field label="Rate / Carat" type="number" required value={item.ratePerCarat}
              onChange={set('ratePerCarat')} />
            <Field label="Discount %" type="number" max="100" value={item.discountPercent}
              onChange={set('discountPercent')} />
            <Field label="Amount" readOnly value={formatAmount(amount)} />
          </ItemCard>
        );
      })}
      <p className="formula">Amount = Carat × Rate/Carat − Discount %</p>
    </section>
  );
}

export default DiamondSection;
