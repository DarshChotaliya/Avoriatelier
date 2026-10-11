// Master lists (customers, suppliers, metal types, …) come from the database through the API
// (see api/Services/MasterService.cs; empty lists are seeded with starting values there).
// Records reference each other by name (e.g. item.metalType = 'S925').
import { mastersApi } from '../api/erpApi';

const SETTINGS_KEY = 'avori.settings';

export const MASTER_KEYS = ['customers', 'suppliers', 'categories', 'collections', 'branches', 'metalTypes',
  'diamondTypes', 'stoneTypes', 'stoneNames', 'diamondShapes'];

export const DEFAULT_SETTINGS = {
  companyName: 'AVORI',
  gstNo: '',
  panNo: '',
  address: '',
  state: 'Gujarat',
  contactNo: '',
  email: '',
  bankName: '',
  accountName: '',
  accountNo: '',
  ifsc: '',
  upiId: '',
  defaultGstPercent: 3,
  labourRatePerGram: 500,
  labourMinimum: 500,
  hallmarkCharge: 70,
};

/** Every master list: { customers: [...], suppliers: [...], … }. */
export async function loadMasters() {
  const all = await mastersApi.all();
  return Object.fromEntries(MASTER_KEYS.map((k) => [k, all[k] ?? []]));
}

/** Insert (no id) or update (with id); the server keeps names unique and refuses renaming names in use. */
export const saveMasterRecord = (masterKey, record) => mastersApi.save(masterKey, record);

export const deleteMasterRecord = (masterKey, id) => mastersApi.remove(masterKey, id);

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    throw new Error('Could not save settings in this browser.');
  }
}

export const findByName = (list, name) => list.find((r) => r.name === name);
