import Icon from './Icon';
import './PurchaseInvoice.css';

function ItemCard({ index, canRemove, onRemove, children }) {
  return (
    <div className="item-card">
      <div className="item-card-header">
        <strong>Item {index + 1}</strong>
        {canRemove && (
          <button type="button" className="inv-icon-btn danger" title="Remove item"
            aria-label={`Remove item ${index + 1}`} onClick={onRemove}>
            <Icon name="trash" size={15} />
          </button>
        )}
      </div>
      <div className="grid">{children}</div>
    </div>
  );
}

export default ItemCard;
