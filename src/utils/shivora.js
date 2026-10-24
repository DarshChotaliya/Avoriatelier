// Shivora International staff portal: one sign-in for Avori and Carat Quest.
// Set REACT_APP_SHIVORA_URL (e.g. https://shivorainternational.in) to switch it on;
// while it is empty Avori signs in on its own screen exactly as before.
export const SHIVORA_URL = (process.env.REACT_APP_SHIVORA_URL || '').replace(/\/+$/, '');

/** The other companies Avori can switch to through the portal. */
export const OTHER_COMPANIES = [{ code: 'cq', name: 'Carat Quest' }];

export const shivoraLink = (path = '/') => `${SHIVORA_URL}${path}`;

/** The one-minute pass in /sso#token=…, removed from the address bar as it is read. */
export function takeSsoToken() {
  if (window.location.pathname !== '/sso') return null;
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
  window.history.replaceState(null, '', '/');
  return token || null;
}
