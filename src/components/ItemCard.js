function ItemCard({ index, canRemove, onRemove, children }) {
  return (
    <div className="item-card">
      <div className="item-card-header">
        <strong>Item {index + 1}</strong>
        {canRemove && (
          <button type="button" className="btn btn-link danger" onClick={onRemove}>Remove</button>
        )}
      </div>
      <div className="grid">{children}</div>
    </div>
  );
}

export default ItemCard;
