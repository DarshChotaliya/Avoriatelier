import { useMemo, useState } from 'react';
import Icon from './Icon';
import { monthlyFigures, niceMax } from '../utils/dashboard';
import { inventoryByGroup, inventoryTotals } from '../utils/inventory';
import { calcSaleTotals } from '../utils/salesCalc';
import { calcInvoiceTotals } from '../utils/invoiceCalc';
import { saleProfit } from '../utils/draftSales';
import { formatAmount, num } from '../utils/purchaseCalc';
import './PurchaseInvoices.css';
import './Inventory.css';
import './Dashboard.css';

const todayIso = () => new Date().toISOString().slice(0, 10);
const shortDate = (iso) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  : '—');

/** ₹1,23,456 → "₹1.2L", "₹45.0K" for axis ticks and tile subtitles. */
const compact = (v) => {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${Math.round(v)}`;
};

function Kpi({ label, value, sub, tone, icon }) {
  return (
    <div className={`iv-tile db-kpi${tone ? ` iv-${tone}` : ''}`}>
      <span><Icon name={icon} size={14} /> {label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

/** Single-series column chart with a hover tooltip; values in rupees. */
function MonthlyChart({ months, showCost, showPurchases }) {
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const max = niceMax(Math.max(...months.map((m) => m.sales)));
  const ticks = [max, max / 2, 0];

  return (
    <section className="pi-card db-card">
      <div className="db-card-head">
        <h3>Sales by month</h3>
        <div className="pi-seg db-seg">
          <button type="button" className={!asTable ? 'active' : ''} onClick={() => setAsTable(false)}>Chart</button>
          <button type="button" className={asTable ? 'active' : ''} onClick={() => setAsTable(true)}>Table</button>
        </div>
      </div>
      {asTable ? (
        <table className="pi-table">
          <thead>
            <tr>
              <th>Month</th><th className="num">Invoices</th><th className="num">Sales</th>
              {showPurchases && <th className="num">Purchases</th>}
              {showCost && <th className="num">Gross Profit</th>}
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.key}>
                <td>{m.label} {m.year}</td>
                <td className="num">{m.invoices}</td>
                <td className="num mono">₹{formatAmount(m.sales)}</td>
                {showPurchases && <td className="num mono">₹{formatAmount(m.purchases)}</td>}
                {showCost && <td className="num mono">₹{formatAmount(m.gross)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="db-chart" role="img"
          aria-label={`Sales by month: ${months.map((m) => `${m.label} ₹${formatAmount(m.sales)}`).join(', ')}`}>
          <div className="db-axis">
            {ticks.map((t) => <span key={t}>{compact(t)}</span>)}
          </div>
          <div className="db-plot">
            {ticks.map((t) => <div key={t} className="db-grid" style={{ bottom: `${(t / max) * 100}%` }} />)}
            {months.map((m, i) => (
              // The whole column is the hover target, not just the bar.
              <div key={m.key} className={`db-col${hover === i ? ' hover' : ''}`}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <div className="db-bar" style={{ height: `${(m.sales / max) * 100}%` }} />
                <span className="db-label">{m.label}</span>
                {hover === i && (
                  <div className="db-tip">
                    <b>{m.label} {m.year}</b>
                    <span>Sales <em>₹{formatAmount(m.sales)}</em></span>
                    {showCost && <span>Gross profit <em>₹{formatAmount(m.gross)}</em></span>}
                    {showPurchases && <span>Purchases <em>₹{formatAmount(m.purchases)}</em></span>}
                    <span>Invoices <em>{m.invoices}</em></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Ranked horizontal bars: stock value at cost per category, value labelled at the bar end. */
function StockByCategory({ groups, showCost }) {
  const [hover, setHover] = useState(null);
  const rows = groups.filter((g) => g.pcs > 0).slice(0, 7);
  // Without cost access the bars show stock value at sale price instead.
  const value = (g) => (showCost ? g.costValue : g.saleValue);
  const max = Math.max(1, ...rows.map(value));
  return (
    <section className="pi-card db-card">
      <div className="db-card-head"><h3>Stock value by category{showCost ? '' : ' (sale price)'}</h3></div>
      {rows.length === 0 && <p className="db-empty">No stock yet.</p>}
      <div className="db-hbars">
        {rows.map((g, i) => (
          <div key={g.label} className={`db-hrow${hover === i ? ' hover' : ''}`}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            title={`${g.label}: ${g.pcs} pcs${showCost ? ` · cost ₹${formatAmount(g.costValue)}` : ''} · sale ₹${formatAmount(g.saleValue)}`}>
            <span className="db-hlabel">{g.label}</span>
            <div className="db-htrack">
              <div className="db-hbar" style={{ width: `${(value(g) / max) * 100}%` }} />
            </div>
            <span className="db-hvalue">{compact(value(g))} <small>{g.pcs} pcs</small></span>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardPage({ drafts, sales, stock, onNavigate, can = () => true }) {
  const showCost = can('cost.view');
  const showPurchases = can('purchase.view');
  const showSales = can('sales.view');
  // Store staff see only their own sales (the API filters them), so the tiles say so.
  const ownSalesOnly = !can('sales.viewAll');
  const today = todayIso();
  const stockBySku = useMemo(() => new Map(stock.map((s) => [s.skuNo, s])), [stock]);
  const months = useMemo(() => monthlyFigures(drafts, sales, stockBySku, today), [drafts, sales, stockBySku, today]);
  const inventory = useMemo(() => inventoryTotals(stock), [stock]);
  const byCategory = useMemo(() => inventoryByGroup(stock, 'category'), [stock]);

  const thisMonth = months[months.length - 1];
  const gpPercent = thisMonth.sales > 0 ? (thisMonth.gross / thisMonth.sales) * 100 : null;
  const piecesSold = sales.filter((s) => s.invoiceDate.startsWith(thisMonth.key))
    .reduce((n, s) => n + s.lines.reduce((m, l) => m + num(l.qty), 0), 0);
  const outOfStock = stock.filter((s) => s.available <= 0).slice(0, 5);
  const recentSales = sales.slice(0, 5);
  const monthPurchases = drafts.filter((d) => d.purchaseDate.startsWith(thisMonth.key))
    .reduce((n, d) => n + calcInvoiceTotals(d.items).grandTotal, 0);

  return (
    <div className="pi-page">
      <div className="pi-top">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">{thisMonth.label} {thisMonth.year} at a glance</p>
        </div>
      </div>

      <div className="iv-tiles db-kpis">
        {showSales && (
          <Kpi icon="receipt" label={ownSalesOnly ? 'My sales this month' : 'Sales this month'}
            value={`₹${formatAmount(thisMonth.sales)}`}
            sub={`${thisMonth.invoices} invoice${thisMonth.invoices === 1 ? '' : 's'}`} />
        )}
        {showPurchases && (
          <Kpi icon="cart" label="Purchases this month" value={`₹${formatAmount(monthPurchases)}`} />
        )}
        {showCost && (
          <Kpi icon="chart" label="Gross profit" value={`₹${formatAmount(thisMonth.gross)}`}
            sub={gpPercent == null ? 'No sales yet' : `${gpPercent.toFixed(1)}% GP`}
            tone={thisMonth.gross < 0 ? 'red' : 'green'} />
        )}
        {showCost ? (
          <Kpi icon="archive" label="Stock value (cost)" value={compact(inventory.costValue)}
            sub={`${inventory.pcs} pcs · ${inventory.outOfStock} SKUs out`} />
        ) : (
          <Kpi icon="archive" label="Stock in hand" value={`${inventory.pcs} pcs`}
            sub={`${inventory.outOfStock} SKUs out of stock`} />
        )}
        {showSales && (
          <Kpi icon="box" label={ownSalesOnly ? 'Pieces I sold' : 'Pieces sold'} value={`${piecesSold} pcs`} sub="this month" />
        )}
      </div>

      <div className="db-row">
        {showSales && <MonthlyChart months={months} showCost={showCost} showPurchases={showPurchases} />}
        <StockByCategory groups={byCategory} showCost={showCost} />
      </div>

      <div className="db-row">
        <section className="pi-card db-card">
          <div className="db-card-head">
            <h3>Out of stock</h3>
            <button type="button" className="db-link" onClick={() => onNavigate('inventory')}>View all</button>
          </div>
          <table className="pi-table">
            <tbody>
              {outOfStock.length === 0 && <tr><td className="pi-empty">Every SKU is in stock.</td></tr>}
              {outOfStock.map((s) => (
                <tr key={s.skuNo}>
                  <td><span className="pi-sku">{s.skuNo}</span></td>
                  <td>
                    <div className="pi-item-name">{s.category}{s.collection ? ` · ${s.collection}` : ''}</div>
                    <div className="pi-item-sub">{s.supplierName}</div>
                  </td>
                  <td className="num muted">{s.purchased} bought · all sold</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {showSales && (
        <section className="pi-card db-card">
          <div className="db-card-head">
            <h3>{ownSalesOnly ? 'My recent sales' : 'Recent sales'}</h3>
            <button type="button" className="db-link" onClick={() => onNavigate('sales')}>View all</button>
          </div>
          <table className="pi-table">
            <tbody>
              {recentSales.length === 0 && <tr><td className="pi-empty">No sales yet.</td></tr>}
              {recentSales.map((s) => {
                const p = saleProfit(s, stockBySku);
                return (
                  <tr key={s.id}>
                    <td><span className="pi-sku">{s.invoiceNo}</span></td>
                    <td>
                      <div className="pi-item-name">{s.customerName}</div>
                      <div className="pi-item-sub">{shortDate(s.invoiceDate)} · {s.paymentStatus}</div>
                    </td>
                    <td className="num mono">₹{formatAmount(calcSaleTotals(s.lines, s.shipping, s.roundOff).grandTotal)}</td>
                    <td className="num">
                      {showCost && p.grossPercent != null && (
                        <span className={`pi-pr${p.gross < 0 ? ' neg' : ''}`}>{p.grossPercent.toFixed(1)}%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
