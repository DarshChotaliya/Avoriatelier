// Screen definitions for the simple master lists. Each field: key, label, type, required, options, width.
// `list: true` shows the field as a table column.

// Loose stones: Wt × rate per carat. Single stones: Pcs × rate per piece (the weight is only the total).
export const STONE_PRICING = [
  { value: 'perCt', label: 'Loose Stone' },
  { value: 'perCert', label: 'Single Stone' },
];

const contactFields = [
  { key: 'contactNo', label: 'Contact No', type: 'tel', list: true, placeholder: 'Mobile no.' },
  { key: 'city', label: 'City', list: true, placeholder: 'e.g. Surat' },
  { key: 'state', label: 'State', list: true, placeholder: 'e.g. Gujarat' },
];

export const MASTER_PAGES = {
  customers: {
    title: 'Customers',
    singular: 'Customer',
    icon: 'users',
    fields: [
      { key: 'name', label: 'Customer Name', required: true, list: true, placeholder: 'Full name' },
      ...contactFields,
      { key: 'email', label: 'Email', type: 'email', wide: true, placeholder: 'name@example.com' },
      { key: 'address', label: 'Address', type: 'textarea', wide: true, placeholder: 'House / street, area, pincode' },
    ],
  },
  suppliers: {
    title: 'Suppliers / Manufacturers',
    singular: 'Supplier',
    icon: 'truck',
    fields: [
      { key: 'name', label: 'Supplier Name', required: true, list: true },
      ...contactFields,
      { key: 'gstNo', label: 'GST No', list: true },
      { key: 'panNo', label: 'PAN No' },
      { key: 'address', label: 'Address', type: 'textarea', wide: true },
    ],
  },
  categories: {
    title: 'Item Categories',
    singular: 'Category',
    icon: 'box',
    fields: [
      { key: 'name', label: 'Category', required: true, list: true },
      // Short form used in the SKU (Ring = RG → AVRG14W00081); empty = the first letters of the name.
      { key: 'shortCode', label: 'Short Code (for SKU)', list: true, maxLength: 6, upper: true, emptyText: 'Auto',
        placeholder: 'e.g. RG — empty = first letters' },
    ],
  },
  collections: {
    title: 'Collections',
    singular: 'Collection',
    icon: 'folder',
    fields: [{ key: 'name', label: 'Collection', required: true, list: true }],
  },
  branches: {
    title: 'Branches',
    singular: 'Branch',
    icon: 'building',
    fields: [
      { key: 'name', label: 'Branch Name', required: true, list: true },
      { key: 'address', label: 'Address', type: 'textarea', wide: true, list: true },
    ],
  },
  metalTypes: {
    title: 'Metal Types',
    singular: 'Metal Type',
    icon: 'layers',
    // The list is shown in one group per metal, in this order.
    groupBy: { key: 'metal', order: ['Gold', 'Silver', 'Platinum'] },
    fields: [
      { key: 'name', label: 'Quality (e.g. S925, 18KT)', required: true, list: true },
      { key: 'metal', label: 'Metal', type: 'select', options: ['Silver', 'Gold', 'Platinum'], required: true, list: true },
      { key: 'purity', label: 'Purity / Tunch %', type: 'number', list: true },
      // Quotation rate = today's 999 rate (box above the list) × Quotation %; used only on quotations.
      { key: 'quotePercent', label: 'Quotation % of 999', type: 'number', list: true },
      { key: 'quoteRate', label: 'Quotation rate / g (auto)', type: 'number', list: true, money: true, auto: true },
      // Quotations convert a design's weight between metals with this (S925 silver = 1, 18KT ≈ 1.5).
      { key: 'weightFactor', label: 'Weight factor (S925 = 1)', type: 'number', list: true },
    ],
  },
  diamondTypes: {
    title: 'Diamond Types',
    singular: 'Diamond Type',
    icon: 'diamond',
    fields: [{ key: 'name', label: 'Diamond Type', required: true, list: true }],
  },
  stoneTypes: {
    title: 'Stone Shapes',
    singular: 'Stone Shape',
    icon: 'gem',
    fields: [
      { key: 'name', label: 'Shape (e.g. RND, OVL)', required: true, list: true },
    ],
  },
  stoneNames: {
    title: 'Stone Names',
    singular: 'Stone Name',
    icon: 'gem',
    fields: [{ key: 'name', label: 'Stone (e.g. CZ, Ruby)', required: true, list: true }],
  },
  diamondShapes: {
    title: 'Diamond Shapes',
    singular: 'Diamond Shape',
    icon: 'diamond',
    fields: [{ key: 'name', label: 'Shape (e.g. Round, Oval)', required: true, list: true }],
  },
};
