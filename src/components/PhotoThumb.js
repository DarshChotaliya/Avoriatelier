import { useState } from 'react';
import ImagePreview from './ImagePreview';

/** A photo thumbnail that opens the full photo when clicked. */
function PhotoThumb({ src, title, className = 'pi-thumb' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="thumb-btn" title="View photo" aria-label={`View photo ${title ?? ''}`}
        onClick={() => setOpen(true)}>
        <img className={className} src={src} alt={title ?? ''} />
      </button>
      {open && <ImagePreview src={src} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}

export default PhotoThumb;
