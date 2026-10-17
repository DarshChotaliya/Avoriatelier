// Company details printed on bills (from Avori's sale invoice sheet).
export const COMPANY = {
  legalName: 'SHIVORA INTERNATIONAL LLP',
  address: '206 KRINK TOWER, MANGADH CHOWK, MINI BAZAAR, VARACHHA, SURAT, GJ 395006',
  contact: '6356093756',
  email: 'avoriatelier@gmail.com',
  gstin: '24AFWFS9858R1ZD',
};

/**
 * Where a scanned QR tag opens. Tags printed from this computer's own copy of the ERP (localhost / a LAN address) would
 * hold an address no phone can reach, so they use this one instead. Set REACT_APP_PUBLIC_URL to change it.
 */
export const PUBLIC_SITE_URL = (process.env.REACT_APP_PUBLIC_URL || 'https://erp.avoriatelier.com').replace(/\/+$/, '');

/** HSN code of jewellery, pre-filled on every sale line. */
export const JEWELLERY_HSN = '7113';
