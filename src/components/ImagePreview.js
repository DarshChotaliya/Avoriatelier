import { useEffect } from 'react';
import Icon from './Icon';
import './ImagePreview.css';

/** Full-size photo over the page. Closes on ×, Escape, or a click outside the photo. */
function ImagePreview({ src, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    // The backdrop click is a convenience; × and Escape are the accessible ways to close.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="ip-overlay" onClick={onClose}>
      <figure className="ip-figure" role="dialog" aria-modal="true" aria-label={title}
        onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ip-close" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
        <img src={src} alt={title} />
        {title && <figcaption>{title}</figcaption>}
      </figure>
    </div>
  );
}

export default ImagePreview;
