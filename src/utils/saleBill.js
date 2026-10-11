// The printed sale bill, laid out like Avori's invoice sheet (e.g. AV-00060): bill-to and invoice details, one row
// per piece with metal / diamond / stone / making amounts, the payable amount and the amount in words.
import { COMPANY } from '../constants/company';
import { calcSaleTotals, saleLineAmount } from './salesCalc';
import { num } from './purchaseCalc';

const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE',
  'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

const below100 = (n) => (n < 20 ? ONES[n] : [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' '));
const below1000 = (n) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} HUNDRED` : '', below100(n % 100)]
  .filter(Boolean).join(n >= 100 && n % 100 ? ' AND ' : '');

/** Whole rupees in words, Indian style: 106530 → "ONE LAKH SIX THOUSAND FIVE HUNDRED AND THIRTY RUPEES". */
export function rupeesInWords(amount) {
  let n = Math.round(Math.abs(num(amount)));
  if (n === 0) return 'ZERO RUPEES';
  const parts = [];
  [['CRORE', 10000000], ['LAKH', 100000], ['THOUSAND', 1000]].forEach(([name, size]) => {
    const q = Math.floor(n / size);
    if (q > 0) parts.push(`${q >= 100 ? below1000(q) : below100(q)} ${name}`);
    n %= size;
  });
  if (n > 0) parts.push(below1000(n));
  return `${parts.join(' ')} RUPEES`;
}

const escape = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
const amt = (v) => num(v).toFixed(2);
// Weights with two decimals, as on the sheet (5.50, 4.53).
const wt = (v) => num(v).toFixed(2);
const date = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB');

/** Opens the bill in a new window and shows the print dialog. */
export function printSaleBill(sale) {
  const t = calcSaleTotals(sale.lines, sale.shipping, sale.roundOff);
  const sum = (key) => sale.lines.reduce((s, l) => s + num(l[key]), 0);
  const amounts = sale.lines.map(saleLineAmount);
  const total = amounts.reduce((s, a) => s + a, 0);
  const rows = sale.lines.map((l, i) => `
    <tr>
      <td>${i + 1}</td><td>${escape(l.description || l.skuNo)}</td><td>${escape(l.hsnSac)}</td>
      <td>${escape(l.metalType)}</td><td>${num(l.qty)}</td><td>${wt(l.grossWeight)}</td><td>${wt(l.netWeight)}</td>
      <td>${amt(l.metalAmount)}</td><td>${num(l.diaPcs)}</td><td>${wt(l.diaWeight)}</td><td>${amt(l.diaAmount)}</td>
      <td>${num(l.stonePcs)}</td><td>${wt(l.stoneWeight)}</td><td>${amt(l.stoneAmount)}</td>
      <td>${amt(l.makingCharges)}</td><td>${amt(amounts[i])}</td>
    </tr>`).join('');
  const address = [sale.billingAddress, sale.city, sale.state].filter(Boolean).join(', ');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(sale.invoiceNo)}</title><style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Calibri, Arial, sans-serif; font-size: 10pt; color: #000; }
    .logo { width: 30mm; height: 30mm; margin: 0 auto 4mm; display: flex; align-items: center; justify-content: center;
      background: #04443b; color: #fff; font-family: Georgia, serif; font-size: 16pt; letter-spacing: 0.1em; }
    .company { text-align: center; font-weight: 700; line-height: 1.4; }
    .company a { color: #1155cc; }
    table { width: 100%; border-collapse: collapse; }
    .parties { margin: 8mm 0; }
    .parties td { width: 50%; border: 1px solid #000; padding: 2mm; vertical-align: top; line-height: 1.6; }
    .items th, .items td { border: 1px solid #000; padding: 1mm 1.5mm; text-align: center; font-size: 8.5pt; }
    .items th { font-weight: 700; }
    .items .gap td { height: 14mm; }
    .payable td { border: 0; }
    .payable .box { border: 1px solid #000; font-weight: 700; }
    .words, .thanks { text-align: center; margin-top: 8mm; }
    .words b, .thanks { font-weight: 700; }
    .decl { margin: 10mm 8mm 0; font-size: 9pt; }
    .sign { margin: 10mm 8mm 0; font-weight: 700; }
    .sign div { width: 45mm; margin-top: 14mm; border-top: 1px solid #000; }
  </style></head><body>
    <div class="logo">AVORI</div>
    <div class="company">
      ${escape(COMPANY.legalName)}<br>${escape(COMPANY.address)}<br>CONTACT: ${escape(COMPANY.contact)}<br>
      <a>${escape(COMPANY.email)}</a><br>GSTIN: ${escape(COMPANY.gstin)}
    </div>
    <table class="parties"><tr>
      <td><b>BILL TO</b><br><br>Customer Name: ${escape(sale.customerName)}<br>
        ${address ? `Address: ${escape(address)}<br>` : ''}${sale.contactNo ? `Phone: ${escape(sale.contactNo)}` : ''}</td>
      <td><b>INVOICE DETAILS</b><br><br>Invoice No: ${escape(sale.invoiceNo)}<br>Date: ${date(sale.invoiceDate)}</td>
    </tr></table>
    <table class="items">
      <thead><tr>
        <th>Sr. No.</th><th>Description</th><th>HSN/SAC</th><th>METAL (KT)</th><th>Qty</th><th>GROSS WT</th>
        <th>NET WT</th><th>METAL AMT</th><th>DIA PCS</th><th>DIA WT</th><th>DIA AMT</th><th>STONE PCS</th>
        <th>STONE WT</th><th>STONE AMT</th><th>MAKING CHARGES</th><th>AMOUNT</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr class="gap">${'<td></td>'.repeat(16)}</tr>
        <tr>
          <td></td><td>TOTAL</td><td></td><td></td><td>${sum('qty')}</td><td>${wt(sum('grossWeight'))}</td>
          <td>${wt(sum('netWeight'))}</td><td>${amt(sum('metalAmount'))}</td><td>${sum('diaPcs')}</td>
          <td>${wt(sum('diaWeight'))}</td><td>${amt(sum('diaAmount'))}</td><td>${sum('stonePcs')}</td>
          <td>${wt(sum('stoneWeight'))}</td><td>${amt(sum('stoneAmount'))}</td><td>${amt(sum('makingCharges'))}</td>
          <td>${amt(total)}</td>
        </tr>
        ${t.shipping > 0 ? `<tr class="payable"><td colspan="14"></td><td class="box">SHIPPING</td><td class="box">${amt(t.shipping)}</td></tr>` : ''}
        <tr class="payable"><td colspan="14"></td><td class="box">PAYABLE AMT</td><td class="box">${amt(t.grandTotal)}</td></tr>
      </tbody>
    </table>
    <div class="words"><b>AMOUNT IN WORDS</b><br>${rupeesInWords(t.grandTotal)}</div>
    <div class="decl"><b>DECLARATION</b><br>We declare that this invoice shows the actual price of the goods/services
      described and that all particulars are true and correct.</div>
    <div class="sign">Authorized Signature:<div></div></div>
    <div class="thanks">Thank you for shopping with AVORI. We hope to serve you again soon!</div>
    <script>window.onload = () => window.print();</script>
  </body></html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
