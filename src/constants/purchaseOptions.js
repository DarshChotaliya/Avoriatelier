export const PURCHASE_TYPES = ['Diamond', 'Gold', 'Silver'];

export const PAYMENT_TYPES = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Credit'];

export const GOLD_PURITIES = ['24K', '22K', '18K'];
export const SILVER_PURITIES = ['999', '925', '900', '800'];

export const DIAMOND_SHAPES = ['Round', 'Princess', 'Oval', 'Cushion', 'Emerald', 'Pear', 'Marquise', 'Heart',
  'Radiant', 'Asscher'];
export const DIAMOND_COLORS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
export const DIAMOND_CLARITIES = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'];
export const DIAMOND_GRADES = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'];
export const DIAMOND_FLUORESCENCE = ['None', 'Faint', 'Medium', 'Strong', 'Very Strong'];

// Labs that grade and certify diamonds.
export const CERTIFICATE_LABS = ['IGI', 'GIA'];

export const emptyDiamondItem = () => ({
  packetLotNo: '', shape: '', sizeMm: '', carat: '', color: '', clarity: '', cut: '', polish: '', symmetry: '',
  fluorescence: '', certificateLab: '', certificateNo: '', certificateDate: '', quantity: '1', ratePerCarat: '', discountPercent: '',
});

export const emptyGoldItem = () => ({
  goldType: '', purity: '22K', grossWeight: '', stoneWeight: '', wastagePercent: '', ratePerGram: '',
  makingCharges: '', otherCharges: '',
});

export const emptySilverItem = () => ({
  silverType: '', purity: '999', grossWeight: '', stoneWeight: '', ratePerGram: '', makingCharges: '',
  otherCharges: '',
});

// ---------- Purchase invoice ----------

export const BRANCHES = ['SURAT'];

export const ITEM_CATEGORIES = ['Ring', 'Earring', 'Pendant', 'Necklace', 'Bracelet', 'Bangle', 'Chain', 'Anklet',
  'Nose Pin'];

// value = API enum name, label = what the user sees.
export const METAL_TYPES = [
  { value: 'Silver', label: 'Silver' },
  { value: 'Gold', label: 'Gold' },
];

export const DIAMOND_TYPES = [
  { value: 'LooseStone', label: 'Loose Stone (per Ct)', priceLabel: 'Price / Ct' },
  { value: 'SingleStone', label: 'Single Stone (per Cert)', priceLabel: 'Price / Cert' },
  { value: 'GemStone', label: 'Gem Stone', priceLabel: 'Price' },
];

// SKU No. prefix per diamond type, e.g. LS-00001.
export const SKU_PREFIXES = { LooseStone: 'LS-', SingleStone: 'SS-', GemStone: 'GEM-' };

/**
 * A new purchase item. Qty, labour, minimum and hallmark start empty so every bill is typed in as it is;
 * only the GST % comes from Bank & Settings.
 */
export const emptyInvoiceItem = (settings = {}) => ({
  photo: null, category: '', designCode: '', qty: '', collection: '', size: '', diamondType: '',
  metalType: '', grossWeight: '', netWeight: '', metalRate: '',
  diamonds: [], stones: [],
  labourRate: '', labourMinimum: '', hallmark: '', otherCharges: '',
  mrp: '', discount: '', gstPercent: String(settings.defaultGstPercent ?? 3), igst: false, description: '',
});

export const emptyDiamondRow = () => ({ code: '', diamondType: '', size: '', pcs: '', rate: '', weight: '', amount: '' });
export const emptyStoneRow = () => ({
  stoneName: '', color: '', stoneType: '', pricing: 'perCt', size: '', pcs: '', weight: '', rate: '',
});
