import { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar, { MASTER_TABS, NAV_SECTIONS, isMasterPage } from './components/Sidebar';
import MasterTabs from './components/MasterTabs';
import PurchaseInvoicesPage from './components/PurchaseInvoicesPage';
import PurchaseInvoiceModal from './components/PurchaseInvoiceModal';
import SalesInvoicesPage from './components/SalesInvoicesPage';
import PurchaseList from './components/PurchaseList';
import PurchaseItemModal from './components/PurchaseItemModal';
import PurchaseItemDetails from './components/PurchaseItemDetails';
import PurchaseInvoiceDetails from './components/PurchaseInvoiceDetails';
import SalesInvoiceModal from './components/SalesInvoiceModal';
import QuotationsPage from './components/QuotationsPage';
import QuotationModal from './components/QuotationModal';
import MetalRatesBox from './components/MetalRatesBox';
import OrdersPage from './components/OrdersPage';
import OrderModal from './components/OrderModal';
import OrderDetails from './components/OrderDetails';
import MasterPage from './components/MasterPage';
import SkuMasterPage from './components/SkuMasterPage';
import InventoryPage from './components/InventoryPage';
import DashboardPage from './components/DashboardPage';
import PageLoader from './components/PageLoader';
import { MASTER_PAGES } from './constants/masterConfig';
import { loadPurchaseInvoices, renameSku, savePurchaseInvoice } from './utils/draftInvoices';
import { deleteSale, loadSales, nextSaleNo, saveSale } from './utils/draftSales';
import { deleteOrder, loadOrders, orderFromQuotation, saveOrder } from './utils/draftOrders';
import { saleFromOrder } from './utils/orderFlow';
import { MASTER_KEYS, deleteMasterRecord, loadMasters, loadSettings, saveMasterRecord } from './utils/masters';
import { browserDataSummary, dismissBrowserData, importBrowserData } from './utils/importBrowserData';
import { alertDialog, confirmDialog, DialogHost } from './components/ConfirmDialog';
import Icon from './components/Icon';
import LoginPage from './components/LoginPage';
import { SHIVORA_URL, takeSsoToken } from './utils/shivora';
import UsersPage from './components/UsersPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import { authApi, quotationApi, skuSettingsApi, stockApi } from './api/erpApi';
import { DEFAULT_SKU_SETTINGS } from './utils/skuFormat';
import './App.css';

const PAGE_LABELS = Object.fromEntries([
  ...NAV_SECTIONS.flatMap((s) => s.links.map((l) => [l.page, [s.title, l.label]])),
  ...MASTER_TABS.map((t) => [t.page, ['Masters', t.label]]),
]);

/** Names each master record is referenced by, so records in use cannot be deleted. */
function namesInUse(drafts, sales, orders) {
  const items = drafts.flatMap((d) => d.items);
  const set = (...lists) => new Set(lists.flat().filter(Boolean));
  return {
    customers: set(sales.map((s) => s.customerName), orders.map((o) => o.clientName)),
    suppliers: set(drafts.map((d) => d.supplierName), orders.map((o) => o.manufacturer)),
    categories: set(items.map((i) => i.category)),
    collections: set(items.map((i) => i.collection)),
    branches: set(drafts.map((d) => d.branch), sales.map((s) => s.branch)),
    metalTypes: set(items.map((i) => i.metalType), orders.map((o) => o.metalType)),
    diamondTypes: set(items.map((i) => i.diamondType), orders.map((o) => o.diamondType)),
    stoneTypes: set(items.flatMap((i) => (i.stones ?? []).map((s) => s.stoneType))),
    stoneNames: set(items.flatMap((i) => (i.stones ?? []).map((s) => s.stoneName))),
    diamondShapes: set(items.flatMap((i) => (i.diamonds ?? []).map((d) => d.code))),
  };
}

// Every page the app can show. The open page is kept in the address (#purchases), so a refresh or the browser's
// back button stays on it instead of returning to the dashboard.
const PAGES = new Set([
  ...NAV_SECTIONS.flatMap((s) => s.links.map((l) => l.page)).filter((p) => p !== 'masters'),
  ...MASTER_TABS.map((t) => t.page),
]);
const pageFromAddress = () => {
  const name = window.location.hash.replace(/^#\/?/, '');
  return PAGES.has(name) ? name : 'dashboard';
};

// The Shivora portal sign-in in progress, if this page was opened with a pass.
let ssoAttempt = null;

function App() {
  const [page, setPage] = useState(pageFromAddress);
  // Purchase Item (Dev_g module): { mode: 'list' | 'form' | 'view', id?: number }, plus the list's type filter.
  const [purchaseItemView, setPurchaseItemView] = useState({ mode: 'list' });
  const [purchaseItemType, setPurchaseItemType] = useState('');
  // Bumped after a save so the list behind the dialog reloads.
  const [purchaseItemVersion, setPurchaseItemVersion] = useState(0);
  // The Masters link reopens whichever master tab was used last.
  const [lastMaster, setLastMaster] = useState(() => (isMasterPage(pageFromAddress()) ? pageFromAddress() : 'suppliers'));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Desktop: icons-only sidebar, remembered per browser.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('avori.sidebarCollapsed') === '1';
    } catch {
      return false;
    }
  });
  const toggleSidebar = () => {
    // On phones the sidebar is a drawer, so the same button just closes it.
    if (window.matchMedia('(max-width: 900px)').matches) {
      setSidebarOpen(false);
      return;
    }
    setCollapsed((c) => {
      try {
        localStorage.setItem('avori.sidebarCollapsed', c ? '0' : '1');
      } catch {
        // Not remembered; the toggle still works for this visit.
      }
      return !c;
    });
  };
  // Open dialog: null | { type: 'purchase' | 'sale' | 'order', record? }.
  const [dialog, setDialog] = useState(null);
  // Purchase invoices, sales and masters come from the database (API); Orders are still browser-only.
  const [drafts, setDrafts] = useState([]);
  const [sales, setSales] = useState([]);
  const [quotations, setQuotations] = useState([]);
  // SKU format and the last number given out (SKU Master → Format & Counter Settings).
  const [skuSettings, setSkuSettings] = useState(DEFAULT_SKU_SETTINGS);
  // Stock per SKU from the server (cost only for users allowed to see it).
  const [stock, setStock] = useState([]);
  // Signed-in user: { checking } while asking the server, then { user } or { needsSetup }.
  const [auth, setAuth] = useState({ checking: true, user: null, needsSetup: false });
  // Shown on the sign-in screen when a Shivora portal pass did not work
  const [ssoError, setSsoError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const can = useCallback((permission) => Boolean(auth.user?.permissions.includes(permission)), [auth.user]);
  const [orders, setOrders] = useState([]);
  const [masters, setMasters] = useState(() => Object.fromEntries(MASTER_KEYS.map((k) => [k, []])));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saleNo, setSaleNo] = useState('');
  // Data that older versions saved in this browser, waiting to be moved into the database.
  const [browserData, setBrowserData] = useState(browserDataSummary);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Only load what this user may see; the server refuses the rest anyway.
  // Stock and the SKU counter change together (a purchase gives out new SKUs).
  const reloadStock = useCallback(async () => {
    const [rows, sku] = await Promise.all([stockApi.get(), skuSettingsApi.get()]);
    setStock(rows);
    setSkuSettings(sku);
  }, []);
  const reloadPurchases = useCallback(async () => {
    setDrafts(can('purchase.view') ? await loadPurchaseInvoices() : []);
    await reloadStock();
  }, [can, reloadStock]);
  const reloadSales = useCallback(async () => {
    setSales(can('sales.view') ? await loadSales() : []);
    await reloadStock();
  }, [can, reloadStock]);
  const reloadQuotations = useCallback(async () => {
    setQuotations(can('sales.view') ? await quotationApi.list() : []);
  }, [can]);
  const reloadOrders = useCallback(async () => {
    setOrders(can('sales.view') ? await loadOrders() : []);
  }, [can]);
  const reloadMasters = useCallback(async () => setMasters(await loadMasters()), []);
  const reloadAll = useCallback(async () => {
    setLoadError('');
    try {
      await Promise.all([reloadPurchases(), reloadSales(), reloadQuotations(), reloadOrders(), reloadMasters()]);
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, [reloadPurchases, reloadSales, reloadQuotations, reloadOrders, reloadMasters]);

  // Who is signed in? (cookie session) — otherwise show sign-in, or first-time setup when there are no users.
  useEffect(() => {
    let cancelled = false;
    // Sent here by the Shivora portal: swap its pass for an Avori session first.
    // Kept outside the component: a pass works once, and React may run this effect twice.
    if (!ssoAttempt) {
      const ssoToken = takeSsoToken();
      if (ssoToken) {
        ssoAttempt = authApi.sso(ssoToken)
          .then((me) => { sessionStorage.setItem('avori_via_shivora', '1'); return me; })
          .catch((e) => { setSsoError(e.message); return authApi.me(); });
      }
    }
    const signIn = ssoAttempt || authApi.me();
    signIn
      .then((me) => !cancelled && setAuth({ checking: false, user: me, needsSetup: false }))
      .catch(async () => {
        const status = await authApi.status().catch(() => ({ needsSetup: false }));
        if (!cancelled) setAuth({ checking: false, user: null, needsSetup: status.needsSetup });
      });
    // Any API call that comes back 401 (session ended, password or role changed) returns to sign-in.
    const onUnauthorized = () => setAuth((a) => ({ ...a, user: null }));
    window.addEventListener('avori:unauthorized', onUnauthorized);
    return () => {
      cancelled = true;
      window.removeEventListener('avori:unauthorized', onUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (!auth.user) return;
    setLoading(true);
    reloadAll();
  }, [auth.user, reloadAll]);

  const signedIn = (me) => {
    setPage('dashboard');
    setAuth({ checking: false, user: me, needsSetup: false });
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    // Signed in through the portal: leaving here signs you out of every company.
    // Signed in on the Avori screen: stays here, as before.
    const viaShivora = sessionStorage.getItem('avori_via_shivora') === '1';
    sessionStorage.removeItem('avori_via_shivora');
    if (SHIVORA_URL && viaShivora) { window.location.href = `${SHIVORA_URL}/logout`; return; }
    setDialog(null);
    setDrafts([]);
    setSales([]);
    setQuotations([]);
    setOrders([]);
    setStock([]);
    setAuth({ checking: false, user: null, needsSetup: false });
  };

  const runImport = async () => {
    setImporting(true);
    try {
      setImportResult(await importBrowserData(masters));
      setBrowserData(null);
      await reloadAll();
    } finally {
      setImporting(false);
    }
  };

  // Delete actions report server refusals (e.g. "used in a sales invoice") instead of failing silently.
  const tryAction = async (action) => {
    try {
      await action();
    } catch (e) {
      alertDialog(e.message);
    }
  };
  // Default labour / hallmark / GST for new purchase items (DEFAULT_SETTINGS in utils/masters.js).
  const [settings] = useState(loadSettings);

  // Clicking anywhere in a date box opens the calendar, not only the small icon (every date field in the app).
  useEffect(() => {
    const openPicker = (e) => {
      const input = e.target;
      if (input instanceof HTMLInputElement && input.type === 'date' && !input.readOnly && !input.disabled) {
        try {
          input.showPicker();
        } catch {
          // Older browsers: the built-in calendar icon still works.
        }
      }
    };
    document.addEventListener('click', openPicker);
    return () => document.removeEventListener('click', openPicker);
  }, []);

  const soldSkus = useMemo(() => new Set(sales.flatMap((s) => s.lines.map((l) => l.skuNo))), [sales]);
  const inUse = useMemo(() => namesInUse(drafts, sales, orders), [drafts, sales, orders]);

  // Customers master first, then anyone from earlier sales who is not in the master yet.
  const customers = useMemo(() => {
    const byName = new Map(masters.customers.map((c) => [c.name.toLowerCase(), c]));
    sales.forEach((s) => {
      const k = s.customerName.toLowerCase();
      if (!byName.has(k)) {
        byName.set(k, {
          name: s.customerName, contactNo: s.contactNo, city: s.city, state: s.state, address: s.billingAddress,
        });
      }
    });
    return [...byName.values()];
  }, [masters.customers, sales]);

  useEffect(() => {
    if (pageFromAddress() !== page) window.history.pushState(null, '', `#${page}`);
  }, [page]);
  useEffect(() => {
    // Back / forward, or an address typed by hand.
    const onMove = () => {
      const next = pageFromAddress();
      if (isMasterPage(next)) setLastMaster(next);
      setPage(next);
    };
    window.addEventListener('popstate', onMove);
    window.addEventListener('hashchange', onMove);
    return () => {
      window.removeEventListener('popstate', onMove);
      window.removeEventListener('hashchange', onMove);
    };
  }, []);

  const navigate = (target) => {
    const next = target === 'masters' ? lastMaster : target;
    if (next === 'purchaseItems') setPurchaseItemView({ mode: 'list' });
    if (isMasterPage(next)) setLastMaster(next);
    setPage(next);
    setSidebarOpen(false);
  };
  const closeDialog = () => setDialog(null);

  const savePurchase = async (payload, items, savedId = null) => {
    let fullPayload = payload;
    let photos = items.map((i) => i.photo);
    // Single-item edit: put the edited item back among the invoice's other, unchanged items.
    if (dialog?.itemId) {
      const edited = payload.items[0];
      const stored = dialog.record.items;
      fullPayload = { ...payload, items: stored.map((i) => (i.id === dialog.itemId ? edited : i)) };
      photos = stored.map((i) => (i.id === dialog.itemId ? items[0].photo : null));
    }
    await savePurchaseInvoice(fullPayload, photos, savedId ?? dialog?.record?.id ?? null);
    await reloadPurchases();
    closeDialog();
  };

  // Add Item in the purchase popup: saves the items typed so far and keeps the popup open.
  const savePurchaseDraft = async (payload, items, savedId) => {
    const saved = await savePurchaseInvoice(payload, items.map((i) => i.photo), savedId);
    await reloadPurchases();
    return saved;
  };

  // Quotation → Order → Sales Invoice: which order a quotation became, and which invoice an order was billed on.
  const ordersByQuotation = useMemo(
    () => new Map(orders.filter((o) => o.quotationNo).map((o) => [o.quotationNo, o.orderNo])), [orders]);
  const salesByOrder = useMemo(
    () => new Map(sales.filter((s) => s.orderNo).map((s) => [s.orderNo, s.invoiceNo])), [sales]);

  // Eye button in the sales item view: the item's full details for users who may see purchases, otherwise its public
  // product page (no cost or price), the page the QR tag opens.
  // A custom piece has no SKU or product page: its eye opens the order it was made for.
  const viewSoldOrder = (orderNo) => {
    const record = orders.find((o) => o.orderNo === orderNo);
    if (record) setDialog({ type: 'orderView', record });
  };

  const viewSoldItem = (skuNo) => {
    const record = drafts.find((d) => d.items.some((i) => i.skuNo === skuNo));
    if (record && can('purchase.view')) {
      setDialog({ type: 'purchaseView', record, itemId: record.items.find((i) => i.skuNo === skuNo).id });
    } else {
      window.open(`/p/${encodeURIComponent(skuNo)}`, '_blank', 'noopener');
    }
  };

  const openSale = async (initial) => {
    try {
      setSaleNo(await nextSaleNo());
    } catch {
      setSaleNo('');
    }
    setDialog({ type: 'sale', initial });
  };
  const openSaleFromOrder = (order) => openSale(saleFromOrder(
    order, stock, quotations.find((q) => q.quotationNo === order.quotationNo), masters.metalTypes));

  // Payment / order status picked in the sales list. A delivered sale is closed, so that choice is confirmed first.
  const changeSaleStatus = (sale, changes) => tryAction(async () => {
    if (changes.orderStatus === 'DELIVERED' && !await confirmDialog({
      title: `Mark ${sale.invoiceNo} delivered?`, message: 'A delivered sales invoice is closed and cannot be changed afterwards.',
      confirmLabel: 'Mark Delivered', danger: false,
    })) return;
    await saveSale({ ...sale, ...changes }, sale.id);
    await reloadSales();
  });

  const saveSaleInvoice = async (payload) => {
    await saveSale(payload, dialog?.record?.id);
    await reloadSales();
    closeDialog();
  };

  // "+ New customer" in the sale / quotation dialogs (only for users who may edit masters).
  const addCustomer = can('masters.edit')
    ? async (record) => { await saveMasterRecord('customers', record); await reloadMasters(); }
    : undefined;

  const saveQuotation = async (payload) => {
    await quotationApi.save(payload, dialog?.record?.id);
    await reloadQuotations();
    closeDialog();
  };

  // Saves an order (from its dialog, or a new status picked in the list) and, when it has just been delivered,
  // offers the sales invoice.
  const persistOrder = async (order, wasDelivered) => {
    const saved = await saveOrder(order);
    await reloadOrders();
    closeDialog();
    // A delivered order is billed next: its sales invoice form opens right away, filled from the order.
    if (saved?.status === 'Delivered' && !wasDelivered && can('sales.create') && !salesByOrder.has(saved.orderNo)) {
      await openSaleFromOrder(saved);
    }
  };
  const saveOrderRecord = (order) => persistOrder({ ...order, id: dialog?.record?.id }, dialog?.record?.status === 'Delivered');
  const changeOrderStatus = (order, status) => tryAction(() => persistOrder({ ...order, status }, order.status === 'Delivered'));

  let content;
  if (page === 'dashboard') {
    content = <DashboardPage drafts={drafts} sales={sales} stock={stock} can={can} onNavigate={navigate} />;
  } else if (page === 'purchaseItems') {
    const showList = () => setPurchaseItemView({ mode: 'list' });
    content = (
      <>
        <PurchaseList
          key={purchaseItemVersion}
          type={purchaseItemType}
          onTypeChange={setPurchaseItemType}
          onNew={() => setPurchaseItemView({ mode: 'form' })}
          onEdit={(id) => setPurchaseItemView({ mode: 'form', id })}
          onView={(id) => setPurchaseItemView({ mode: 'view', id })}
          canEdit={can('purchase.edit')}
          canDelete={can('purchase.delete')}
        />
        {purchaseItemView.mode === 'view' && (
          <PurchaseItemDetails
            purchaseId={purchaseItemView.id}
            onEdit={(id) => setPurchaseItemView({ mode: 'form', id })}
            onClose={showList}
          />
        )}
        {purchaseItemView.mode === 'form' && (
          <PurchaseItemModal
            purchaseId={purchaseItemView.id}
            onSaved={() => {
              setPurchaseItemVersion((v) => v + 1);
              showList();
            }}
            onClose={showList}
          />
        )}
      </>
    );
  } else if (page === 'purchases') {
    content = (
      <PurchaseInvoicesPage drafts={drafts} soldSkus={soldSkus} onChanged={reloadPurchases}
        metalTypes={masters.metalTypes}
        canEdit={can('purchase.edit')} canDelete={can('purchase.delete')}
        onNew={() => setDialog({ type: 'purchase' })} onEdit={(record) => setDialog({ type: 'purchase', record })}
        onEditItem={(record, itemId) => setDialog({ type: 'purchase', record, itemId })}
        onView={(record, itemId) => setDialog({ type: 'purchaseView', record, itemId })} />
    );
  } else if (page === 'sales') {
    content = (
      <SalesInvoicesPage sales={sales} stock={stock} onNew={() => openSale()}
        onEdit={(record) => setDialog({ type: 'sale', record })} onChangeStatus={changeSaleStatus}
        onViewItem={viewSoldItem} onViewOrder={viewSoldOrder}
        canCreate={can('sales.create')} canDelete={can('sales.delete')} showCost={can('cost.view')}
        onDelete={(id) => tryAction(async () => { await deleteSale(id); await reloadSales(); })} />
    );
  } else if (page === 'quotations') {
    content = (
      <QuotationsPage quotations={quotations} canCreate={can('sales.create')} canDelete={can('sales.delete')}
        onNew={() => setDialog({ type: 'quotation' })}
        onNewCustom={() => setDialog({ type: 'quotation', custom: true })}
        onEdit={(record) => setDialog({ type: 'quotation', record })}
        onCreateOrder={(record) => setDialog({ type: 'order', initial: orderFromQuotation(record) })}
        ordersByQuotation={ordersByQuotation}
        onDelete={(id) => tryAction(async () => { await quotationApi.remove(id); await reloadQuotations(); })} />
    );
  } else if (page === 'orders') {
    content = (
      <OrdersPage orders={orders} canCreate={can('sales.create')} canDelete={can('sales.delete')}
        salesByOrder={salesByOrder} onCreateSale={openSaleFromOrder} onChangeStatus={changeOrderStatus}
        onView={(record) => setDialog({ type: 'orderView', record })}
        onNew={() => setDialog({ type: 'order' })}
        onEdit={(record) => setDialog({ type: 'order', record })}
        onDelete={(id) => tryAction(async () => { await deleteOrder(id); await reloadOrders(); })} />
    );
  } else if (page === 'inventory') {
    content = (
      <InventoryPage stock={stock} showCost={can('cost.view')} />
    );
  } else if (page === 'users') {
    content = <UsersPage branches={masters.branches} currentUserId={auth.user?.id} />;
  } else if (page === 'skus') {
    content = (
      <SkuMasterPage
        stock={stock}
        settings={skuSettings}
        categories={masters.categories}
        soldSkus={soldSkus}
        canEdit={can('purchase.edit')}
        onRename={async (oldSku, newSku) => { await renameSku(oldSku, newSku); await reloadPurchases(); }}
        onSaveSettings={async (next) => setSkuSettings(await skuSettingsApi.save(next))}
        onRefresh={reloadAll}
      />
    );
  } else {
    content = (
      <MasterPage
        key={page}
        config={MASTER_PAGES[page]}
        records={masters[page]}
        usedNames={inUse[page]}
        readOnly={!can('masters.edit')}
        header={page === 'metalTypes'
          ? <MetalRatesBox canEdit={can('masters.edit')} onSaved={reloadMasters} />
          : null}
        // A rename is carried into invoices on the server, so reload them too.
        onSave={async (record) => { await saveMasterRecord(page, record); await reloadAll(); }}
        onDelete={(id) => tryAction(async () => { await deleteMasterRecord(page, id); await reloadMasters(); })}
      />
    );
  }

  if (isMasterPage(page)) {
    content = (
      <>
        <MasterTabs page={page} onSelect={navigate} />
        {content}
      </>
    );
  }

  const [section, title] = PAGE_LABELS[page] ?? ['', ''];

  // ---------- signed out ----------
  if (auth.checking) {
    return (
      <div className="app-loading" role="status">
        <img src={`${process.env.PUBLIC_URL}/favicon.png`} alt="" />
        <span className="pl-spinner" aria-hidden="true" />
        Loading…
      </div>
    );
  }
  if (!auth.user) return <LoginPage setup={auth.needsSetup} onSignedIn={signedIn} notice={ssoError} />;

  // A page this user may not open (e.g. after their role changed) falls back to a notice.
  const navLink = NAV_SECTIONS.flatMap((s) => s.links).find((l) => l.page === page);
  const pagePermission = isMasterPage(page) ? 'masters.view' : navLink?.perm;
  if (pagePermission && !can(pagePermission)) {
    content = <p className="muted">You do not have access to this page.</p>;
  }

  return (
    <div className={`app-shell${sidebarOpen ? ' sidebar-open' : ''}${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar page={page} collapsed={collapsed} onToggle={toggleSidebar} onNavigate={navigate}
        user={auth.user} can={can} onChangePassword={() => setChangingPassword(true)} onLogout={logout} />
      <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="menu-toggle"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div className="breadcrumb">
            {section && (
              <>
                <span className="muted">{section}</span>
                <span className="muted">/</span>
              </>
            )}
            <strong>{title}</strong>
          </div>
        </header>

        <main className="container">
          {loadError && (
            <div className="alert app-alert">
              Could not reach the server: {loadError}
              <button type="button" className="btn btn-secondary" onClick={reloadAll}>Retry</button>
            </div>
          )}
          {browserData && !loadError && !loading && can('purchase.edit') && can('masters.edit') && can('sales.create') && (
            <div className="app-import">
              <Icon name="info" size={16} />
              <span>
                This browser still has data from before the database:
                {' '}{browserData.purchases} purchase invoice(s), {browserData.sales} sale(s)
                {browserData.customers ? `, ${browserData.customers} customer(s)` : ''}.
              </span>
              <button type="button" className="pi-btn-gold" onClick={runImport} disabled={importing}>
                {importing ? 'Importing…' : 'Import to database'}
              </button>
              <button type="button" className="btn btn-secondary"
                onClick={() => { dismissBrowserData(); setBrowserData(null); }}>
                Not now
              </button>
            </div>
          )}
          {importResult && (
            <div className={`app-import${importResult.failed.length ? ' warn' : ''}`}>
              <Icon name={importResult.failed.length ? 'info' : 'check'} size={16} />
              <span>
                Imported {importResult.imported} record(s).
                {importResult.failed.length > 0 && (
                  <> Not imported: {importResult.failed.join(' · ')}</>
                )}
              </span>
              <button type="button" className="btn btn-secondary" onClick={() => setImportResult(null)}>Close</button>
            </div>
          )}
          {loading ? <PageLoader /> : content}
        </main>
      </div>

      {dialog?.type === 'purchase' && (
        <PurchaseInvoiceModal
          key={`${dialog.record?.id ?? 'new'}-${dialog.itemId ?? 'all'}`}
          masters={masters}
          settings={settings}
          invoice={dialog.itemId
            ? { ...dialog.record, items: dialog.record.items.filter((i) => i.id === dialog.itemId) }
            : dialog.record}
          itemOnly={Boolean(dialog.itemId)}
          takenSkus={drafts.flatMap((d) => d.items.map((i) => i.skuNo))}
          skuSettings={skuSettings}
          onClose={closeDialog}
          onSubmit={savePurchase}
          onSaveDraft={savePurchaseDraft}
        />
      )}
      {dialog?.type === 'purchaseView' && (
        <PurchaseInvoiceDetails
          invoice={dialog.record}
          itemId={dialog.itemId}
          onClose={closeDialog}
          onEdit={() => setDialog({ ...dialog, type: 'purchase' })}
        />
      )}
      {dialog?.type === 'sale' && (
        <SalesInvoiceModal
          key={dialog.record?.id ?? 'new'}
          invoice={dialog.record}
          initial={dialog.initial}
          invoiceNo={dialog.record?.invoiceNo ?? saleNo}
          stock={stock}
          customers={customers}
          branches={masters.branches}
          onClose={closeDialog}
          onSubmit={saveSaleInvoice}
          onAddCustomer={addCustomer}
        />
      )}
      {dialog?.type === 'quotation' && (
        <QuotationModal
          quotation={dialog.record}
          stock={stock}
          customers={customers}
          branches={masters.branches}
          metalTypes={masters.metalTypes}
          categories={masters.categories}
          startCustom={Boolean(dialog.custom)}
          onClose={closeDialog}
          onSubmit={saveQuotation}
          onAddCustomer={addCustomer}
        />
      )}
      <DialogHost />
      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
      {dialog?.type === 'orderView' && (() => {
        // The latest copy of the order, so a status changed behind the dialog shows.
        const order = orders.find((o) => o.id === dialog.record.id) ?? dialog.record;
        return (
          <OrderDetails
            order={order}
            quotation={quotations.find((q) => q.quotationNo === order.quotationNo)}
            invoiceNo={salesByOrder.get(order.orderNo)}
            canEdit={can('sales.create')}
            onEdit={() => setDialog({ type: 'order', record: order })}
            onInvoice={() => { closeDialog(); openSaleFromOrder(order); }}
            onClose={closeDialog}
          />
        );
      })()}
      {dialog?.type === 'order' && (
        <OrderModal order={dialog.record} initial={dialog.initial} masters={masters} onClose={closeDialog}
          onSave={saveOrderRecord} onAddCustomer={addCustomer} />
      )}
    </div>
  );
}

export default App;
