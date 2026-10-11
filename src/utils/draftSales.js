// Sales invoices are stored in the database through the API (see api/Services/SalesInvoiceService.cs).
// Stock is purchased qty − sold qty; the server refuses a sale that needs more pieces than are in stock.
import { salesInvoiceApi } from '../api/erpApi';
import { toItemRows } from './draftInvoices';
import { num } from './purchaseCalc';

export const loadSales = () => salesInvoiceApi.list();

/** The number the next sale will get (shown in the dialog; the server assigns it on save). */
export const nextSaleNo = async () => (await salesInvoiceApi.nextNumber()).invoiceNo;

/** Creates a sale, or changes the one with `id`. */
export const saveSale = (payload, id) => (id ? salesInvoiceApi.update(id, payload) : salesInvoiceApi.create(payload));

/** A delivered sale is closed: it can no longer be changed. */
export const canEditSale = (sale) => sale.orderStatus !== 'DELIVERED';

export const deleteSale = (id) => salesInvoiceApi.remove(id);

/**
 * SKUs that can be sold: every purchased item with its available stock.
 * `excludeSaleId` leaves one sale out of "sold" (for editing that sale later).
 */
export function stockList(purchaseDrafts, sales, excludeSaleId) {
  const sold = new Map();
  sales.filter((s) => s.id !== excludeSaleId).forEach((s) => s.lines.forEach((l) => {
    sold.set(l.skuNo, (sold.get(l.skuNo) ?? 0) + num(l.qty));
  }));
  return toItemRows(purchaseDrafts).map((r) => ({
    skuNo: r.skuNo,
    category: r.category,
    collection: r.collection,
    designCode: r.designCode,
    supplierName: r.supplierName,
    supplierInvoiceNo: r.supplierInvoiceNo,
    purchaseDate: r.purchaseDate,
    createdAt: r.createdAt,
    diamondType: r.diamondType,
    // Landed cost of one piece (purchase price incl. GST), used for GP / NP on sales.
    costPerPiece: r.purchWithGst,
    metalType: r.metalType ?? r.sampleMetal,
    netWeight: num(r.netWeight),
    mrp: num(r.mrp),
    discount: num(r.discount),
    salePrice: r.sale,
    gstPercent: num(r.gstPercent),
    thumb: r.thumb,
    purchased: num(r.qty),
    available: num(r.qty) - (sold.get(r.skuNo) ?? 0),
  }));
}

/**
 * Profit for a sale, like the sales record sheet:
 *   Total Cost = Σ cost/pc × qty      Sale = Σ selling × qty (GST-inclusive)
 *   Gross = Sale − Total Cost         GP % = Gross ÷ Sale × 100
 *   Net = Gross − Expenses            NP % = Net ÷ Sale × 100
 */
export function saleProfit(sale, stockBySku) {
  const totalCost = sale.lines.reduce((s, l) => s + (stockBySku.get(l.skuNo)?.costPerPiece ?? 0) * num(l.qty), 0);
  const saleAmount = sale.lines.reduce((s, l) => s + num(l.selling) * num(l.qty), 0);
  const gross = saleAmount - totalCost;
  const net = gross - num(sale.expenses);
  const pct = (v) => (saleAmount > 0 ? Math.round((v / saleAmount) * 10000) / 100 : null);
  const round = (v) => Math.round(v * 100) / 100;
  return {
    totalCost: round(totalCost), saleAmount: round(saleAmount), gross: round(gross), grossPercent: pct(gross),
    expenses: num(sale.expenses), net: round(net), netPercent: pct(net),
  };
}
