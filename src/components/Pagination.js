import { useState } from 'react';
import SelectBox from './SelectBox';
import './Pagination.css';

export const PAGE_SIZES = [10, 20, 50, 100];

/** Up to five page numbers around the current page (1 2 3 4 5 · 3 4 5 6 7 · …). */
export function pageNumbers(page, pages) {
  const first = Math.max(1, Math.min(page - 2, pages - 4));
  return Array.from({ length: Math.min(5, pages) }, (_, i) => first + i);
}

/**
 * Splits a list into pages. Returns the rows of the current page and the pager bar to put under the table
 * (nothing while the list is empty). A list that shrinks (search, filter, delete) falls back to its last page.
 */
export function usePaged(rows, initialSize = 20) {
  const [size, setSize] = useState(initialSize);
  const [wanted, setWanted] = useState(1);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(wanted, pages);
  const start = (page - 1) * size;
  const pageRows = rows.slice(start, start + size);

  const pager = total === 0 ? null : (
    <div className="pg">
      <span className="pg-info">
        Showing <b>{start + 1}–{start + pageRows.length}</b> of <b>{total}</b> lines
      </span>
      <label className="pg-size">
        <span>Per page:</span>
        <SelectBox value={size} options={PAGE_SIZES.map((n) => ({ value: n, label: String(n) }))}
          onChange={(v) => { setSize(Number(v)); setWanted(1); }} aria-label="Rows per page" />
      </label>
      <nav className="pg-nav" aria-label="Pages">
        <button type="button" className="pg-btn" disabled={page === 1} aria-label="First page"
          onClick={() => setWanted(1)}>«</button>
        <button type="button" className="pg-btn" disabled={page === 1} aria-label="Previous page"
          onClick={() => setWanted(page - 1)}>‹</button>
        {pageNumbers(page, pages).map((p) => (
          <button key={p} type="button" className={`pg-btn${p === page ? ' active' : ''}`}
            aria-current={p === page ? 'page' : undefined} onClick={() => setWanted(p)}>
            {p}
          </button>
        ))}
        <button type="button" className="pg-btn" disabled={page === pages} aria-label="Next page"
          onClick={() => setWanted(page + 1)}>›</button>
        <button type="button" className="pg-btn" disabled={page === pages} aria-label="Last page"
          onClick={() => setWanted(pages)}>»</button>
      </nav>
    </div>
  );

  return { pageRows, pager };
}
