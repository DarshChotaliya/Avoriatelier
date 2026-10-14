/**
 * Shown while the lists load: a spinner with a short line of text, and a grey outline of a page (title, filter bar
 * and table rows) so the screen does not jump when the page appears.
 */
function PageLoader({ text = 'Loading data…' }) {
  return (
    <div className="pl" role="status" aria-live="polite">
      <div className="pl-head">
        <span className="pl-spinner" aria-hidden="true" />
        <span>{text}</span>
      </div>
      <div className="pl-card" aria-hidden="true">
        <div className="pl-bar pl-bar-filters" />
        {Array.from({ length: 8 }, (_, i) => (
          // Placeholder rows have no identity, so the index is the key.
          <div key={i} className="pl-row">
            <span className="pl-bar pl-w1" />
            <span className="pl-bar pl-w2" />
            <span className="pl-bar pl-w3" />
            <span className="pl-bar pl-w4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default PageLoader;
