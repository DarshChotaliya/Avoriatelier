import { useEffect, useState } from 'react';
import { request } from '../api/purchaseApi';
import { formatAmount, formatWeight } from '../utils/purchaseCalc';
import './ProductPage.css';

const shortDateTime = (iso) => (iso
  ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : null);

/**
 * The page a QR tag opens (/p/<SKU>), without signing in: the piece, and its metal value in every quality at today's
 * rate (e.g. a silver design in 14K / 18K gold). No cost, supplier, MRP or sale price.
 */
function ProductPage({ sku }) {
  const [state, setState] = useState({ loading: true, product: null, error: '' });

  useEffect(() => {
    request(`/api/public/products/${encodeURIComponent(sku)}`)
      .then((product) => setState({ loading: false, product, error: '' }))
      .catch(() => setState({ loading: false, product: null, error: `No piece found for ${sku}.` }));
  }, [sku]);

  const p = state.product;
  return (
    <div className="pp-page">
      <header className="pp-head">
        <img src={`${process.env.PUBLIC_URL}/brand/avori-logo-white.png`} alt="Avori" />
      </header>
      <main className="pp-card">
        {state.loading && <p className="pp-muted">Loading…</p>}
        {state.error && <p className="pp-error">{state.error}</p>}
        {p && (
          <>
            {p.photo && <img className="pp-photo" src={p.photo} alt={p.category} />}
            <div className="pp-title">
              <h1>{[p.category, p.collection].filter(Boolean).join(' · ')}</h1>
              <span className="pp-sku">{p.skuNo}</span>
              <span className={`pp-stock${p.inStock ? '' : ' out'}`}>{p.inStock ? 'In stock' : 'Sold'}</span>
            </div>
            <dl className="pp-facts">
              <div><dt>Metal</dt><dd>{p.metalType}{p.metal ? ` (${p.metal})` : ''}</dd></div>
              <div><dt>Net weight</dt><dd>{formatWeight(p.netWeight)} g</dd></div>
              {p.grossWeight > 0 && <div><dt>Gross weight</dt><dd>{formatWeight(p.grossWeight)} g</dd></div>}
              {p.diamondType && <div><dt>Diamond type</dt><dd>{p.diamondType}</dd></div>}
              {p.diamondCt > 0 && <div><dt>Diamond weight</dt><dd>{formatWeight(p.diamondCt)} ct</dd></div>}
              {p.stoneCt > 0 && <div><dt>Stone weight</dt><dd>{formatWeight(p.stoneCt)} ct</dd></div>}
              {p.size && <div><dt>Size</dt><dd>{p.size}</dd></div>}
              {p.designCode && <div><dt>Design</dt><dd>{p.designCode}</dd></div>}
            </dl>
            {p.description && <p className="pp-desc">{p.description}</p>}

            {p.stones.length > 0 && (
              <section className="pp-prices pp-stones">
                <h2>Diamonds &amp; stones</h2>
                <table>
                  <thead>
                    <tr><th>Stone</th><th>Shape / size</th><th className="num">Pcs</th><th className="num">Weight</th></tr>
                  </thead>
                  <tbody>
                    {p.stones.map((st, i) => (
                      // Rows have no id; their order is fixed.
                      <tr key={i}>
                        <td>{[st.name || st.kind, st.color].filter(Boolean).join(' · ')}</td>
                        <td>{[st.shape, st.size].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="num">{st.pcs || '—'}</td>
                        <td className="num">{formatWeight(st.weight)} ct</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {p.metalPrices.length > 0 && (
              <section className="pp-prices">
                <h2>This design in other metals</h2>
                <table>
                  <thead>
                    <tr><th>Metal</th><th className="num">Approx. weight</th><th className="num">Metal value</th></tr>
                  </thead>
                  <tbody>
                    {p.metalPrices.map((m) => (
                      <tr key={m.quality} className={m.quality === p.metalType ? 'pp-own' : undefined}>
                        <td>{m.quality} <small>{m.metal}</small></td>
                        <td className="num">{formatWeight(m.weight)} g</td>
                        <td className="num">₹{formatAmount(m.metalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="pp-muted">
                  Metal value at today&apos;s rate{p.ratesUpdatedAt ? ` (${shortDateTime(p.ratesUpdatedAt)})` : ''}.
                  Making, stones and GST are extra. Ask us for an exact quotation.
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default ProductPage;
