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

export const emptyDiamondItem = () => ({
  packetLotNo: '', shape: '', carat: '', color: '', clarity: '', cut: '', polish: '', symmetry: '',
  fluorescence: '', certificateNo: '', certificateDate: '', quantity: '1', ratePerCarat: '', discountPercent: '',
});

export const emptyGoldItem = () => ({
  goldType: '', purity: '22K', grossWeight: '', stoneWeight: '', wastagePercent: '', ratePerGram: '',
  makingCharges: '', otherCharges: '',
});

export const emptySilverItem = () => ({
  silverType: '', purity: '999', grossWeight: '', stoneWeight: '', ratePerGram: '', makingCharges: '',
  otherCharges: '',
});
