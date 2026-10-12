// Purchase invoices are stored in the database through the API (see api/Services/PurchaseInvoiceService.cs).
// SKU numbers, cost per piece and the "sold stock can't be removed" rules are applied on the server.
import { purchaseInvoiceApi } from '../api/erpApi';
import { money, num } from './purchaseCalc';
import { priceWithGst } from './invoiceCalc';

// Long side of uploaded photos: sharp in the full-screen preview (up to 900px), still small enough to store.
const THUMB_SIZE = 1200;

export const loadPurchaseInvoices = () => purchaseInvoiceApi.list();

/** Resized JPEG data URL of a chosen photo (null when there is no photo or it can't be read). */
export async function makeThumbnail(file) {
  if (!file) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = THUMB_SIZE / Math.max(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * Math.min(scale, 1));
    canvas.height = Math.round(bitmap.height * Math.min(scale, 1));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return null;
  }
}

/**
 * Creates (no invoiceId) or updates an invoice from toInvoicePayload. `photos[i]` is a newly chosen File for
 * item i; items without one keep the photo they already have (item.thumb).
 */
export async function savePurchaseInvoice(payload, photos, invoiceId = null) {
  const items = await Promise.all(payload.items.map(async (item, i) => ({
    ...item,
    thumb: photos[i] ? await makeThumbnail(photos[i]) : item.thumb ?? null,
  })));
  const body = { ...payload, items };
  return invoiceId ? purchaseInvoiceApi.update(invoiceId, body) : purchaseInvoiceApi.create(body);
}

/** Removes one item; the server removes the invoice too when it was the last item. */
export const deletePurchaseItem = (invoiceId, itemId) => purchaseInvoiceApi.removeItem(invoiceId, itemId);

export const deletePurchaseInvoice = (invoiceId) => purchaseInvoiceApi.remove(invoiceId);

/** Changes one SKU number (typo / sequence gap fix); the server keeps numbers unique. */
export const renameSku = (oldSku, newSku) => purchaseInvoiceApi.renameSku(oldSku, newSku);

/**
 * One row per item for the Item View.
 *   Purch. (GST)  = Price × (1 + GST %) + Hallmark × 18%   per piece
 *   Sale          = MRP − Discount             per piece
 *   Net Amt       = (Sale − Purch. (GST)) × Qty
 *   Net PR %      = Net Amt ÷ (Sale × Qty) × 100
 */
export function toItemRows(invoices) {
  return invoices.flatMap((inv) => inv.items.map((item) => {
    const qty = num(item.qty);
    const purchWithGst = priceWithGst(item.price, item.hallmark, item.gstPercent);
    const sale = money(num(item.mrp) - num(item.discount));
    const netAmount = money((sale - purchWithGst) * qty);
    const saleTotal = sale * qty;
    return {
      ...item,
      invoiceId: inv.id,
      purchaseDate: inv.purchaseDate,
      supplierName: inv.supplierName,
      supplierInvoiceNo: inv.supplierInvoiceNo,
      createdAt: inv.createdAt,
      purchWithGst,
      sale,
      netAmount,
      netPercent: saleTotal > 0 ? money((netAmount / saleTotal) * 100) : null,
    };
  }));
}
