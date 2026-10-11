// One-time move of data that earlier versions kept in this browser (localStorage) into the database.
import { mastersApi, purchaseInvoiceApi, salesInvoiceApi } from '../api/erpApi';
import { MASTER_KEYS } from './masters';

const OLD_PURCHASES = 'avori.draftPurchaseInvoices';
const OLD_SALES = 'avori.draftSalesInvoices';
const oldMasterKey = (k) => `avori.master.${k}`;
const DONE_KEY = 'avori.importedToDatabase';

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? [];
  } catch {
    return [];
  }
};

/** What is waiting in this browser, or null when there is nothing (or it was already imported). */
export function browserDataSummary() {
  try {
    if (localStorage.getItem(DONE_KEY)) return null;
  } catch {
    return null;
  }
  const purchases = read(OLD_PURCHASES);
  const sales = read(OLD_SALES);
  const customers = read(oldMasterKey('customers'));
  if (purchases.length + sales.length + customers.length === 0) return null;
  return { purchases: purchases.length, sales: sales.length, customers: customers.length };
}

const n = (v) => Number(v) || 0;

/** An item saved by an older version → API shape, keeping its SKU number and photo. */
const toItem = (i) => ({
  skuNo: i.skuNo,
  category: i.category,
  designCode: i.designCode || null,
  collection: i.collection || null,
  size: i.size || null,
  diamondType: i.diamondType,
  metalType: i.metalType ?? i.sampleMetal ?? '',
  qty: Math.max(1, Math.trunc(n(i.qty))),
  grossWeight: n(i.grossWeight),
  netWeight: n(i.netWeight),
  metalRate: n(i.metalRate),
  labourRate: n(i.labourRate),
  labourMinimum: n(i.labourMinimum),
  hallmark: n(i.hallmark),
  otherCharges: n(i.otherCharges),
  mrp: n(i.mrp),
  discount: n(i.discount),
  gstPercent: n(i.gstPercent),
  igst: Boolean(i.igst),
  description: i.description || null,
  thumb: i.thumb || null,
  stones: (i.stones ?? []).map((s) => ({
    stoneType: s.stoneType, pricing: s.pricing, pcs: n(s.pcs), weight: n(s.weight), rate: n(s.rate),
  })),
  diamonds: (i.diamonds ?? []).map((d) => ({
    code: d.code || null, size: d.size || null, pcs: n(d.pcs), weight: n(d.weight), rate: n(d.rate),
  })),
});

/**
 * Sends masters the database does not have yet, then purchase invoices (keeping SKU numbers), then sales
 * (keeping invoice numbers). Problems are collected per record so one bad record does not stop the rest.
 */
export async function importBrowserData(existingMasters) {
  const result = { imported: 0, failed: [] };

  for (const kind of MASTER_KEYS) {
    const have = new Set((existingMasters[kind] ?? []).map((r) => r.name.trim().toLowerCase()));
    for (const record of read(oldMasterKey(kind))) {
      if (!record.name || have.has(record.name.trim().toLowerCase())) continue;
      const { id, ...rest } = record;
      try {
        // eslint-disable-next-line no-await-in-loop
        await mastersApi.save(kind, rest);
        result.imported += 1;
      } catch (e) {
        result.failed.push(`${kind} “${record.name}”: ${e.message}`);
      }
    }
  }

  // Oldest first, so numbering and history stay in the original order.
  for (const inv of [...read(OLD_PURCHASES)].reverse()) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await purchaseInvoiceApi.create({
        purchaseDate: inv.purchaseDate,
        branch: inv.branch || 'SURAT',
        supplierName: inv.supplierName,
        supplierInvoiceNo: inv.supplierInvoiceNo || null,
        supplierInvoiceDate: inv.supplierInvoiceDate || null,
        remarks: inv.remarks || null,
        igst: inv.igst ?? (inv.items ?? []).some((i) => i.igst),
        items: (inv.items ?? []).map(toItem),
      });
      result.imported += 1;
    } catch (e) {
      result.failed.push(`Purchase ${inv.supplierInvoiceNo || inv.purchaseDate} (${inv.supplierName}): ${e.message}`);
    }
  }

  for (const sale of [...read(OLD_SALES)].reverse()) {
    const { id, createdAt, ...rest } = sale;
    try {
      // eslint-disable-next-line no-await-in-loop
      await salesInvoiceApi.create(rest);
      result.imported += 1;
    } catch (e) {
      result.failed.push(`Sale ${sale.invoiceNo}: ${e.message}`);
    }
  }

  try {
    localStorage.setItem(DONE_KEY, new Date().toISOString());
  } catch {
    // Not remembered; the import banner may show again but re-importing is refused for existing numbers.
  }
  return result;
}

/** Hide the import banner without importing. */
export function dismissBrowserData() {
  try {
    localStorage.setItem(DONE_KEY, 'dismissed');
  } catch {
    // Ignore: nothing else depends on it.
  }
}
