import Icon from './Icon';
import { SHIVORA_URL, OTHER_COMPANIES, shivoraLink } from '../utils/shivora';

// Every master is a tab inside the single "Masters" page. Customers have their own page in the sidebar
// (they will later sign in on the website too), though they are stored like the other masters.
export const MASTER_TABS = [
  { page: 'suppliers', label: 'Suppliers', icon: 'truck' },
  { page: 'categories', label: 'Items', icon: 'box' },
  { page: 'collections', label: 'Collections', icon: 'folder' },
  { page: 'branches', label: 'Branches', icon: 'building' },
  { page: 'metalTypes', label: 'Metal Types', icon: 'layers' },
  { page: 'diamondTypes', label: 'Diamond Types', icon: 'diamond' },
  { page: 'diamondShapes', label: 'Diamond Shapes', icon: 'diamond' },
  { page: 'stoneNames', label: 'Stone Names', icon: 'gem' },
  { page: 'stoneTypes', label: 'Stone Shapes', icon: 'gem' },
  { page: 'skus', label: 'SKU Master', icon: 'hash' },
];
const MASTER_PAGES_SET = new Set(MASTER_TABS.map((t) => t.page));
export const isMasterPage = (page) => MASTER_PAGES_SET.has(page);

export const NAV_SECTIONS = [
  {
    // Shown without a heading at the top of the sidebar.
    key: 'transactions',
    title: '',
    links: [
      // `perm`: the permission a user needs to see the link (the API checks it again).
      { page: 'dashboard', label: 'Dashboard', icon: 'chart' },
      // Diamond / Gold / Silver purchase module from Dev_g, saved in the database through the API.
      { page: 'purchaseItems', label: 'Purchase Item', icon: 'diamond', perm: 'purchase.view' },
      { page: 'purchases', label: 'Purchase Invoices', icon: 'cart', perm: 'purchase.view' },
      { page: 'sales', label: 'Sales Invoices', icon: 'receipt', perm: 'sales.view' },
      { page: 'quotations', label: 'Quotations', icon: 'list', perm: 'sales.view' },
      { page: 'orders', label: 'Orders', icon: 'clipboard', perm: 'sales.view' },
      { page: 'customers', label: 'Customers', icon: 'user', perm: 'masters.view' },
      { page: 'inventory', label: 'Inventory', icon: 'archive', perm: 'inventory.view' },
      // Opens the last-used master tab (see App); active on any master page.
      { page: 'masters', label: 'Masters', icon: 'grid', perm: 'masters.view' },
      { page: 'users', label: 'Users', icon: 'users', perm: 'users.manage' },
    ],
  },
];

// Modules shown for the ERP layout but not built yet (hidden for now, see the commented block below).
// const UPCOMING_MODULES = [
//   { label: 'Reports', icon: 'chart' },
//   { label: 'GST', icon: 'receipt' },
//   { label: 'Users', icon: 'users' },
// ];

/** `collapsed` shows icons only (labels become tooltips); the toggle sits next to the logo. */
const ROLE_NAMES = { Owner: 'Owner', Manager: 'Manager', Accountant: 'Accountant', StoreStaff: 'Store Staff' };

const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

function Sidebar({ page, collapsed, onToggle, onNavigate, user, can, onChangePassword, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        {/* Both logos are rendered; CSS shows the mark when collapsed and the full logo otherwise / on hover. */}
        <img className="sidebar-mark" src={`${process.env.PUBLIC_URL}/favicon.png`} alt="" aria-hidden="true" />
        <img className="sidebar-logo" src={`${process.env.PUBLIC_URL}/brand/avori-logo-white.png`} alt="Avori" />
        <button type="button" className="sidebar-toggle" onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={15} />
        </button>
      </div>


      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.key} className={section.title ? undefined : 'nav-group-top'}>
            {section.title && <div className="nav-section">{section.title}</div>}
            {section.links.filter((link) => !link.hidden && (!link.perm || can(link.perm))).map((link) => (
              <button
                key={link.page}
                type="button"
                className={`nav-item${page === link.page || (link.page === 'masters' && isMasterPage(page)) ? ' active' : ''}`}
                onClick={() => onNavigate(link.page)}
                title={collapsed ? link.label : undefined}
                aria-label={link.label}
              >
                <span className="nav-icon"><Icon name={link.icon} size={17} /></span>
                <span className="nav-label">{link.label}</span>
              </button>
            ))}
          </div>
        ))}

        {/* Coming soon section hidden for now; uncomment it (and UPCOMING_MODULES above) to show it again.
        <div className="nav-section">Coming soon</div>
        {UPCOMING_MODULES.map((m) => (
          <button key={m.label} type="button" className="nav-item" disabled
            title={collapsed ? `${m.label} (soon)` : undefined} aria-label={`${m.label} (soon)`}>
            <span className="nav-icon"><Icon name={m.icon} size={17} /></span>
            <span className="nav-label">{m.label}</span>
            <span className="nav-tag">Soon</span>
          </button>
        ))}
        */}
      </nav>

      {user && (
        <div className="sb-account">
          <span className="sb-avatar" title={user.fullName}>{initials(user.fullName) || '?'}</span>
          <div className="sb-who">
            <strong>{user.fullName}</strong>
            <span>{ROLE_NAMES[user.role] ?? user.role}{user.branches.length ? ` · ${user.branches.join(', ')}` : ''}</span>
          </div>
          <button type="button" className="sb-acc-btn" onClick={onChangePassword} title="Change password"
            aria-label="Change password">
            <Icon name="key" size={15} />
          </button>
          {SHIVORA_URL && OTHER_COMPANIES.map((co) => (
            <a key={co.code} className="sb-acc-btn" href={shivoraLink(`/go/${co.code}`)}
              title={`Switch to ${co.name}`} aria-label={`Switch to ${co.name}`}>
              <Icon name="building" size={15} />
            </a>
          ))}
          <button type="button" className="sb-acc-btn" onClick={onLogout} title="Sign out" aria-label="Sign out">
            <Icon name="logout" size={15} />
          </button>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
