export const SALES_CHANNELS = ['STORE', 'ONLINE', 'WHOLESALE', 'EXHIBITION'];
export const PAYMENT_METHODS = ['CASH', 'ONLINE/UPI', 'CARD', 'BANK TRANSFER', 'CREDIT'];
export const PAYMENT_STATUSES = ['PENDING', 'PARTIAL', 'PAID'];
export const ORDER_STATUSES = ['PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// A sale line holds the bill's columns: what the piece is, and metal / diamond / stone / making amounts.
export const emptySaleLine = () => ({
  skuNo: '', description: '', hsnSac: '7113', metalType: '', qty: '1', grossWeight: '', netWeight: '',
  metalAmount: '', diaPcs: '', diaWeight: '', diaAmount: '', stonePcs: '', stoneWeight: '', stoneAmount: '',
  makingCharges: '', mrp: '', discount: '', selling: '', gstPercent: '3', igst: false,
});
