// Shivora International staff portal: one sign-in for Avori and Carat Quest.
// Set REACT_APP_SHIVORA_URL (e.g. https://shivorainternational.in) to switch it on;
// while it is empty Avori signs in on its own screen exactly as before.
export const SHIVORA_URL = (process.env.REACT_APP_SHIVORA_URL || '').replace(/\/+$/, '');

/** The other companies Avori can switch to through the portal. */
export const OTHER_COMPANIES = [{ code: 'cq', name: 'Carat Quest' }];

export const shivoraLink = (path = '/') => `${SHIVORA_URL}${path}`;

/**
 * Open another company without a portal password: Avori vouches for the signed-in user with a
 * one-minute pass, and the portal signs in the Shivora account linked to that user. Without a
 * pass it falls back to the portal, which asks to sign in.
 */
export async function switchCompany(code, getPass) {
  try {
    const res = await getPass();
    if (res?.token) {
      window.location.href = `${SHIVORA_URL}/#from=avori&to=${encodeURIComponent(code)}&token=${encodeURIComponent(res.token)}`;
      return;
    }
  } catch { /* fall back below */ }
  window.location.href = shivoraLink(`/go/${encodeURIComponent(code)}`);
}

/** The one-minute pass in /sso#token=…, removed from the address bar as it is read. */
export function takeSsoToken() {
  if (window.location.pathname !== '/sso') return null;
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
  window.history.replaceState(null, '', '/');
  return token || null;
}
