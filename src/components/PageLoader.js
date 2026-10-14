/** Shown while the lists load: a spinner and a short line of text in the middle of the screen. */
function PageLoader({ text = 'Loading data…' }) {
  return (
    <div className="pl" role="status" aria-live="polite">
      <span className="pl-spinner" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

export default PageLoader;
