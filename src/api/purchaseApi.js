// In development, CRA proxies /api to the .NET API (see "proxy" in package.json).
const BASE_URL = process.env.REACT_APP_API_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const problem = await response.json();
      if (problem.errors) {
        message = Object.values(problem.errors).flat().join(' ');
      } else if (problem.detail || problem.title) {
        message = problem.detail || problem.title;
      }
    } catch {
      // Body was not JSON; keep the status-based message.
    }
    throw new Error(message);
  }

  return response.status === 204 ? null : response.json();
}

export const purchaseApi = {
  list: ({ search, type } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    const qs = params.toString();
    return request(`/api/purchases${qs ? `?${qs}` : ''}`);
  },
  get: (id) => request(`/api/purchases/${id}`),
  nextNumber: () => request('/api/purchases/next-number'),
  create: (data) => request('/api/purchases', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/purchases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/api/purchases/${id}`, { method: 'DELETE' }),
};
