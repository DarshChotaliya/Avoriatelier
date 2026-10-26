// API calls for the ERP screens (masters, purchase invoices, sales invoices).
import { request } from './purchaseApi';

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const mastersApi = {
  all: () => request('/api/masters'),
  save: (kind, record) => request(`/api/masters/${kind}`, json('POST', record)),
  remove: (kind, id) => request(`/api/masters/${kind}/${id}`, { method: 'DELETE' }),
};

export const purchaseInvoiceApi = {
  list: () => request('/api/purchase-invoices'),
  create: (data) => request('/api/purchase-invoices', json('POST', data)),
  update: (id, data) => request(`/api/purchase-invoices/${id}`, json('PUT', data)),
  remove: (id) => request(`/api/purchase-invoices/${id}`, { method: 'DELETE' }),
  removeItem: (id, itemId) => request(`/api/purchase-invoices/${id}/items/${itemId}`, { method: 'DELETE' }),
  renameSku: (sku, newSku) =>
    request(`/api/purchase-invoices/skus/${encodeURIComponent(sku)}/rename`, json('POST', { newSku })),
};

export const salesInvoiceApi = {
  list: () => request('/api/sales-invoices'),
  nextNumber: () => request('/api/sales-invoices/next-number'),
  create: (data) => request('/api/sales-invoices', json('POST', data)),
  update: (id, data) => request(`/api/sales-invoices/${id}`, json('PUT', data)),
  remove: (id) => request(`/api/sales-invoices/${id}`, { method: 'DELETE' }),
};

export const quotationApi = {
  list: () => request('/api/quotations'),
  save: (data, id) => (id
    ? request(`/api/quotations/${id}`, json('PUT', data))
    : request('/api/quotations', json('POST', data))),
  remove: (id) => request(`/api/quotations/${id}`, { method: 'DELETE' }),
};

export const orderApi = {
  list: () => request('/api/orders'),
  save: (data, id) => (id
    ? request(`/api/orders/${id}`, json('PUT', data))
    : request('/api/orders', json('POST', data))),
  remove: (id) => request(`/api/orders/${id}`, { method: 'DELETE' }),
};

/** Today's gold / silver 999 rates; saving them works out every metal quality's quotation rate. */
export const metalRatesApi = {
  get: () => request('/api/metal-rates'),
  save: (rates) => request('/api/metal-rates', json('PUT', rates)),
};

/** SKU format and counter (company prefix + item code + size + gender + running number). */
export const skuSettingsApi = {
  get: () => request('/api/sku-settings'),
  save: (settings) => request('/api/sku-settings', json('PUT', settings)),
};

export const authApi = {
  status: () => request('/api/auth/status'),
  setup: (data) => request('/api/auth/setup', json('POST', data)),
  login: (username, password) => request('/api/auth/login', json('POST', { username, password })),
  // One-minute pass from the Shivora portal
  sso: (token) => request('/api/auth/sso', json('POST', { token })),
  shivoraPass: () => request('/api/auth/shivora-pass', { method: 'POST' }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/change-password', json('POST', { currentPassword, newPassword })),
};

export const usersApi = {
  list: () => request('/api/users'),
  save: (user) => request('/api/users', json('POST', user)),
  roles: () => request('/api/users/roles'),
};

/** One row per SKU with purchased / available qty; cost only for users allowed to see it. */
export const stockApi = { get: () => request('/api/stock') };
