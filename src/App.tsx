import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Shirt, WashingMachine, SprayCan, Phone, Sparkles, Package, Shirt as FabricRoll } from "lucide-react";
import type { Catalog, LaundryService, PriceItem, PriceTopic } from "./types";
import {
  downloadCatalog,
  loadAdminDraft,
  loadPublishedCatalog,
  makeId,
  normalizeCatalog,
  saveAdminDraft,
  SESSION_KEY,
  STORAGE_KEY,
} from "./lib/catalog";

type View = "prices" | "admin";
type AdminTab = "overview" | "topics" | "services" | "items";

const serviceIconComponents = { sparkles: Sparkles, package: Package, shirt: Shirt, roll: FabricRoll, basket: WashingMachine, spray: SprayCan };
const itemDisplayName = (item: PriceItem) => item.tamilName?.trim() ? `${item.name} (${item.tamilName.trim()})` : item.name;

const money = (value: string) => {
  if (!value || value === "—") return "—";
  return value.startsWith("₹") ? value : `₹${value}`;
};

function App() {
  const [published, setPublished] = useState<Catalog | null>(null);
  const [draft, setDraft] = useState<Catalog | null>(null);
  const [view, setView] = useState<View>(() => window.location.hash.includes("/admin") ? "admin" : "prices");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");

  useEffect(() => {
    const onHash = () => setView(window.location.hash.includes("/admin") ? "admin" : "prices");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    loadPublishedCatalog()
      .then((data) => {
        setPublished(data);
        setDraft(loadAdminDraft(data));
      })
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Unable to load price list"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (draft) saveAdminDraft(draft);
  }, [draft]);

  const publicUrl = `${window.location.origin}${window.location.pathname}#/prices`;

  const login = (username: string, password: string) => {
    if (username === "admin" && password === "D2D") {
      sessionStorage.setItem(SESSION_KEY, "1");
      setLoggedIn(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setLoggedIn(false);
    window.location.hash = "/prices";
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading DAY TO DAY price list…</p></div>;
  if (!published || !draft) return <div className="load-error"><h1>Unable to open price list</h1><p>{loadError}</p><p>Check that <code>public/catalog.json</code> exists and run the app again.</p></div>;

  if (view === "admin") {
    if (!loggedIn) return <Login onLogin={login} onBack={() => { window.location.hash = "/prices"; }} />;
    return (
      <Admin
        catalog={draft}
        setCatalog={setDraft}
        publicUrl={publicUrl}
        onLogout={logout}
        onReset={() => {
          const fresh = structuredClone(published);
          setDraft(fresh);
          localStorage.removeItem(STORAGE_KEY);
        }}
      />
    );
  }

  return <CustomerPage catalog={draft} onAdmin={() => { window.location.hash = "/admin"; }} />;
}

function BrandHeader({ catalog, compact = false }: { catalog: Catalog; compact?: boolean }) {
  const services = [
    { label: "Steam Ironing", icon: Sparkles },
    { label: "Wash & Ironing", icon: Package },
    { label: "Dry Cleaning", icon: Shirt },
    { label: "Saree Roll Polishing", icon: FabricRoll },
    { label: "Household Laundry", icon: WashingMachine },
    { label: "Wash & Starch", icon: SprayCan },
  ];

  return (
    <header className={`brand-header ${compact ? "compact" : ""}`}>
      <div className="brand-logo-panel">
        <img className="brand-mark" src={`${import.meta.env.BASE_URL}logo.png`} alt="DAY TO DAY logo" />
      </div>
      <div className="brand-copy">
        <div className="brand-name" aria-label="DAY TO DAY">DAY <span>TO</span> DAY</div>
        <div className="brand-tagline">{catalog.business.tagline}</div>
      </div>
      <div className="brand-divider" aria-hidden="true" />
      <nav className="service-icons" aria-label="Laundry services">
        {services.map(({ label, icon: Icon }) => <div className="service-icon" key={label} title={label} aria-label={label}><Icon aria-hidden="true" strokeWidth={2.3} /><span>{label}</span></div>)}
      </nav>
      <a className="phone-chip" href={`tel:${catalog.business.phone}`} aria-label={`Call us at ${catalog.business.phone}`}>
        <span className="phone-icon"><Phone aria-hidden="true" fill="currentColor" /></span>
        <span className="phone-copy"><span>Call us</span><strong>{catalog.business.phone}</strong></span>
      </a>
    </header>
  );
}

function CustomerPage({ catalog, onAdmin }: { catalog: Catalog; onAdmin: () => void }) {
  const [query, setQuery] = useState("");
  const [activeServiceId, setActiveServiceId] = useState("all");
  const topics = catalog.topics;
  const services = [...(catalog.services ?? [])].filter((service) => service.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const activeService = services.find((service) => service.id === activeServiceId);
  const visibleServiceLists = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedServices = activeService ? [activeService] : services;
    return selectedServices.map((service) => {
      const topic = topics.find((entry) => entry.id === service.topicId && entry.active !== false);
      if (!topic) return null;
      const items = topic.items
        .filter((item) => item.active !== false && (!q || `${item.name} ${item.tamilName ?? ""}`.toLowerCase().includes(q)))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      return { service, topic, items };
    }).filter((entry): entry is NonNullable<typeof entry> => !!entry && (entry.items.length > 0 || !q));
  }, [topics, services, activeService, query]);

  return (
    <main className="customer-page">
      <div className="customer-shell">
        <BrandHeader catalog={catalog} />
        <section className="welcome-panel">
          <div>
            <span className="eyebrow">CLEAN • FRESH • READY</span>
            <h1>Your Laundry, <em>Our Care.</em></h1>
            <p>Check our latest laundry and ironing service prices.</p>
          </div>
          <div className="laundry-illustration" aria-hidden="true">🧺</div>
        </section>

        <div className="price-tools">
          <label className="search-box">
            <span>⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search in English or Tamil…" />
          </label>
          <div className="service-filters" role="tablist" aria-label="Filter prices by service">
            <button type="button" role="tab" aria-selected={activeServiceId === "all"} className={`service-filter ${activeServiceId === "all" ? "active" : ""}`} onClick={() => setActiveServiceId("all")}><span className="service-filter-icon">◎</span><span>All Prices</span></button>
            {services.map((service) => {
              const Icon = serviceIconComponents[service.icon as keyof typeof serviceIconComponents];
              return <button type="button" role="tab" aria-selected={activeServiceId === service.id} className={`service-filter ${activeServiceId === service.id ? "active" : ""}`} key={service.id} onClick={() => setActiveServiceId(service.id)}><span className="service-filter-icon">{Icon ? <Icon aria-hidden="true" /> : service.icon}</span><span>{service.name}</span></button>;
            })}
          </div>
        </div>

        <div className="price-list-title"><span className="eyebrow">PRICE LIST</span><h2>{activeService?.name ?? "All Prices"}</h2><p>{activeService ? `Showing ${activeService.name} prices` : "Clothing and household prices"}</p></div>

        {visibleServiceLists.map(({ service, topic, items }) => {
          const Icon = serviceIconComponents[service.icon as keyof typeof serviceIconComponents];
          return (
            <section className="service-price-card" key={service.id}>
              <header className="service-price-heading">
                <span className="service-price-icon" aria-hidden="true">{Icon ? <Icon /> : service.icon}</span>
                <div className="service-price-copy"><h2>{service.name}</h2><p>{topic.title} service rates</p></div>
                <span className="service-item-count">{items.length} {items.length === 1 ? "item" : "items"}</span>
              </header>
              <div className="service-price-table-wrap">
                <table className="service-price-table">
                  <thead><tr><th scope="col">Item</th><th scope="col">Price</th></tr></thead>
                  <tbody>
                    {items.map((item) => <tr key={item.id}><td className="service-price-item">{itemDisplayName(item)}</td><td className="service-price-value">{money(item.prices[service.priceKey] ?? "—")}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        {visibleServiceLists.length === 0 && <div className="empty-state">No matching items. Try another search.</div>}

        <footer className="customer-footer">
          <div className="footer-top"><div><strong>{catalog.business.doorDelivery}</strong><p>Call us for bookings and enquiries.</p></div><a href={`tel:${catalog.business.phone}`} className="footer-call">☎ {catalog.business.phone}</a></div>
          <div className="address-block"><span>📍</span><div><p>{catalog.business.address}</p><p className="tamil-address">{catalog.business.tamilAddress}</p></div></div>
          <div className="footer-bottom"><span>Thank you for choosing DAY TO DAY</span><button onClick={onAdmin}>Admin</button></div>
        </footer>
      </div>
    </main>
  );
}

function Login({ onLogin, onBack }: { onLogin: (u: string, p: string) => boolean; onBack: () => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!onLogin(username, password)) setError("Incorrect username or password.");
  };
  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <img className="login-logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="DAY TO DAY logo" />
        <span className="eyebrow">DAY TO DAY</span>
        <h1>Admin Login</h1>
        <p>Sign in to manage topics, items and prices.</p>
        <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button full" type="submit">Login to Admin</button>
        <button className="text-button" type="button" onClick={onBack}>← Back to customer price list</button>
        <small>Default login: admin / D2D</small>
      </form>
    </main>
  );
}

function Admin({ catalog, setCatalog, publicUrl, onLogout, onReset }: {
  catalog: Catalog;
  setCatalog: (value: Catalog) => void;
  publicUrl: string;
  onLogout: () => void;
  onReset: () => void;
}) {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicIcon, setTopicIcon] = useState("🧺");
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceIcon, setServiceIcon] = useState("sparkles");
  const [serviceTopicId, setServiceTopicId] = useState(catalog.topics[0]?.id ?? "");
  const [servicePriceKey, setServicePriceKey] = useState("");
  const [serviceSortOrder, setServiceSortOrder] = useState(String(catalog.services?.length ?? 6));
  const [serviceActive, setServiceActive] = useState(true);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [columnTopicId, setColumnTopicId] = useState(catalog.topics[0]?.id ?? "");
  const [columnLabel, setColumnLabel] = useState("");
  const [editingColumnKey, setEditingColumnKey] = useState<string | null>(null);
  const [itemTopicId, setItemTopicId] = useState(catalog.topics[0]?.id ?? "");
  const [itemName, setItemName] = useState("");
  const [itemTamilName, setItemTamilName] = useState("");
  const [itemActive, setItemActive] = useState(true);
  const [itemServiceKeys, setItemServiceKeys] = useState<string[]>((catalog.services ?? []).filter((service) => service.topicId === (catalog.topics[0]?.id ?? "")).map((service) => service.priceKey));
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [editingItem, setEditingItem] = useState<{ topicId: string; itemId: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [importError, setImportError] = useState("");

  const totalItems = catalog.topics.reduce((sum, topic) => sum + topic.items.length, 0);
  const updateTopic = (topicId: string, updater: (topic: PriceTopic) => PriceTopic) => {
    setCatalog({ ...catalog, topics: catalog.topics.map((topic) => topic.id === topicId ? updater(topic) : topic) });
  };

  const resetServiceForm = () => { setServiceName(""); setServiceIcon("sparkles"); setServicePriceKey(""); setServiceSortOrder(String(catalog.services?.length ?? 0)); setServiceActive(true); setEditingServiceId(null); };
  const saveService = (e: FormEvent) => {
    e.preventDefault();
    const name = serviceName.trim();
    const topic = catalog.topics.find((entry) => entry.id === serviceTopicId);
    if (!name || !topic || !servicePriceKey) return;
    const service: LaundryService = { id: editingServiceId ?? makeId(name), name, icon: serviceIcon, active: serviceActive, sortOrder: Number(serviceSortOrder) || 0, topicId: topic.id, priceKey: servicePriceKey };
    const services = catalog.services ?? [];
    setCatalog({
      ...catalog,
      services: editingServiceId ? services.map((entry) => entry.id === editingServiceId ? service : entry) : [...services, service],
      topics: catalog.topics.map((entry) => entry.id === topic.id ? { ...entry, columns: entry.columns.map((column) => column.key === servicePriceKey ? { ...column, label: name } : column) } : entry),
    });
    setNotice(editingServiceId ? "Service updated." : "Service added.");
    resetServiceForm();
  };

  const editService = (service: LaundryService) => {
    setEditingServiceId(service.id); setServiceName(service.name); setServiceIcon(service.icon); setServiceTopicId(service.topicId); setServicePriceKey(service.priceKey); setServiceSortOrder(String(service.sortOrder)); setServiceActive(service.active);
    document.getElementById("service-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const deleteService = (service: LaundryService) => {
    if (!window.confirm(`Delete the “${service.name}” customer filter? Existing prices will remain in All Prices.`)) return;
    setCatalog({ ...catalog, services: (catalog.services ?? []).filter((entry) => entry.id !== service.id) });
    if (editingServiceId === service.id) resetServiceForm();
    setNotice("Service deleted. Existing catalog prices were preserved.");
  };

  const resetColumnForm = () => { setColumnLabel(""); setEditingColumnKey(null); };
  const saveColumn = (e: FormEvent) => {
    e.preventDefault();
    const topic = catalog.topics.find((entry) => entry.id === columnTopicId);
    const label = columnLabel.trim();
    if (!topic || !label) return;

    if (editingColumnKey) {
      updateTopic(topic.id, (entry) => ({
        ...entry,
        columns: entry.columns.map((column) => column.key === editingColumnKey ? { ...column, label } : column),
      }));
      setNotice("Price column updated.");
    } else {
      const baseKey = makeId(label).replace(/-/g, "") || "price";
      const key = topic.columns.some((column) => column.key === baseKey) ? `${baseKey}${Date.now().toString(36)}` : baseKey;
      updateTopic(topic.id, (entry) => ({
        ...entry,
        columns: [...entry.columns, { key, label }],
        items: entry.items.map((item) => ({ ...item, prices: { ...item.prices, [key]: "—" } })),
      }));
      setNotice(`${label} column added to ${topic.title}.`);
    }
    resetColumnForm();
  };

  const editColumn = (topic: PriceTopic, columnKey: string, label: string) => {
    setColumnTopicId(topic.id);
    setEditingColumnKey(columnKey);
    setColumnLabel(label);
    document.getElementById("column-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const deleteColumn = (topic: PriceTopic, columnKey: string, label: string) => {
    const linkedService = (catalog.services ?? []).find((service) => service.topicId === topic.id && service.priceKey === columnKey);
    if (linkedService) {
      setNotice(`Remove the “${linkedService.name}” service filter before deleting its price column.`);
      return;
    }
    if (topic.columns.length <= 1) {
      setNotice("A topic must keep at least one price column.");
      return;
    }
    if (!window.confirm(`Delete the “${label}” column and its prices from all ${topic.items.length} items?`)) return;
    updateTopic(topic.id, (entry) => ({
      ...entry,
      columns: entry.columns.filter((column) => column.key !== columnKey),
      items: entry.items.map((item) => {
        const prices = { ...item.prices };
        delete prices[columnKey];
        return { ...item, prices };
      }),
    }));
    if (editingColumnKey === columnKey) resetColumnForm();
    setNotice("Price column deleted.");
  };


  const resetTopicForm = () => { setTopicTitle(""); setTopicIcon("🧺"); setEditingTopic(null); };
  const saveTopic = (e: FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) return;
    if (editingTopic) {
      updateTopic(editingTopic, (topic) => ({ ...topic, title: topicTitle.trim(), icon: topicIcon }));
      setNotice("Topic updated in this browser.");
    } else {
      const id = makeId(topicTitle);
      setCatalog({ ...catalog, topics: [...catalog.topics, { id, title: topicTitle.trim(), icon: topicIcon, columns: [{ key: "amountRate", label: "Amount / Rate" }], items: [] }] });
      setNotice("Topic added.");
    }
    resetTopicForm();
  };

  const editTopic = (topic: PriceTopic) => {
    setEditingTopic(topic.id); setTopicTitle(topic.title); setTopicIcon(topic.icon);
    document.getElementById("topic-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const deleteTopic = (topic: PriceTopic) => {
    if (!window.confirm(`Delete "${topic.title}" and all ${topic.items.length} items inside it?`)) return;
    setCatalog({ ...catalog, topics: catalog.topics.filter((entry) => entry.id !== topic.id) });
    setNotice("Topic deleted.");
  };

  const resetItemForm = () => { setItemName(""); setItemTamilName(""); setItemPrices({}); setItemActive(true); setItemServiceKeys((catalog.services ?? []).filter((service) => service.topicId === itemTopicId).map((service) => service.priceKey)); setEditingItem(null); };
  const saveItem = (e: FormEvent) => {
    e.preventDefault();
    const topic = catalog.topics.find((entry) => entry.id === itemTopicId);
    if (!topic || !itemName.trim()) return;
    const applicableKeys = new Set(itemServiceKeys);
    const servicePriceKeys = new Set((catalog.services ?? []).filter((service) => service.topicId === topic.id).map((service) => service.priceKey));
    const prices = Object.fromEntries(topic.columns.map((column) => [column.key, servicePriceKeys.has(column.key)
      ? (applicableKeys.has(column.key) ? (itemPrices[column.key]?.trim() || "—") : "—")
      : (itemPrices[column.key]?.trim() || "—")]));
    if (editingItem) {
      updateTopic(editingItem.topicId, (entry) => ({ ...entry, items: entry.items.map((item) => item.id === editingItem.itemId ? { ...item, name: itemName.trim(), tamilName: itemTamilName.trim(), active: itemActive, group: topic.id === "household" ? "household" : "clothing", prices } : item) }));
      setNotice("Item and prices updated.");
    } else {
      const item: PriceItem = { id: makeId(itemName), name: itemName.trim(), tamilName: itemTamilName.trim(), active: itemActive, group: topic.id === "household" ? "household" : "clothing", sortOrder: topic.items.length, prices };
      updateTopic(itemTopicId, (entry) => ({ ...entry, items: [...entry.items, item] }));
      setNotice("Item added.");
    }
    resetItemForm();
  };

  const editItem = (topic: PriceTopic, item: PriceItem) => {
    setEditingItem({ topicId: topic.id, itemId: item.id });
    setItemTopicId(topic.id); setItemName(item.name); setItemTamilName(item.tamilName ?? ""); setItemActive(item.active !== false); setItemPrices({ ...item.prices });
    setItemServiceKeys((catalog.services ?? []).filter((service) => service.topicId === topic.id && item.prices[service.priceKey] && item.prices[service.priceKey] !== "—").map((service) => service.priceKey));
    document.getElementById("item-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deleteItem = (topic: PriceTopic, item: PriceItem) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    updateTopic(topic.id, (entry) => ({ ...entry, items: entry.items.filter((row) => row.id !== item.id) }));
    setNotice("Item deleted.");
  };

  const changeItemTopic = (id: string) => {
    setItemTopicId(id); setItemPrices({}); setItemServiceKeys((catalog.services ?? []).filter((service) => service.topicId === id).map((service) => service.priceKey));
  };

  const importCatalog = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = normalizeCatalog(JSON.parse(await file.text()) as Catalog);
      if (!parsed.business || !Array.isArray(parsed.topics)) throw new Error("Invalid catalogue format.");
      setCatalog(parsed); setImportError(""); setNotice("Catalogue imported.");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not import this file.");
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-topbar">
          <div className="admin-brand"><img className="admin-brand-mark" src={`${import.meta.env.BASE_URL}logo.png`} alt="DAY TO DAY logo" /><div><strong>DAY TO DAY</strong><small>Price list management</small></div></div>
          <div className="admin-actions"><a href="#/prices" className="outline-button">View customer page</a><button className="dark-button" onClick={onLogout}>Logout</button></div>
        </header>

        <div className="admin-heading"><div><span className="eyebrow">ADMIN PANEL</span><h1>Manage your price list</h1><p>Changes save automatically in this browser as a private draft.</p></div><button className="primary-button" onClick={() => downloadCatalog(catalog)}>↓ Export catalogue</button></div>
        {notice && <div className="notice-bar">{notice}<button onClick={() => setNotice("")}>×</button></div>}

        <nav className="admin-tabs">
          {(["overview", "topics", "services", "items"] as AdminTab[]).map((value) => <button key={value} className={tab === value ? "selected" : ""} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
        </nav>

        {tab === "overview" && (
          <div className="admin-content">
            <div className="stats-grid">
              <Stat label="Topics" value={catalog.topics.length} icon="🗂️" />
              <Stat label="Laundry items" value={totalItems} icon="👕" />
              <Stat label="Price fields" value={catalog.topics.reduce((sum, topic) => sum + topic.items.length * topic.columns.length, 0)} icon="₹" />
            </div>
            <div className="admin-card publish-card">
              <div><span className="eyebrow">QR CODE</span><h2>Customer price-list QR</h2><p>Print this QR code on the back of your visiting card. It opens the public price-list page.</p></div>
              <button className="secondary-button" onClick={() => setShowQR((value) => !value)}>{showQR ? "Hide QR code" : "Generate QR code"}</button>
              {showQR && <div className="qr-panel"><div className="qr-white"><QRCodeSVG id="day-to-day-price-qr" value={publicUrl} size={240} level="H" includeMargin /></div><strong>Scan to view price list</strong><code>{publicUrl}</code><div className="button-row"><button className="outline-button" onClick={downloadQrSvg}>↓ Download QR SVG</button><button className="outline-button" onClick={() => navigator.clipboard.writeText(publicUrl)}>Copy public URL</button></div></div>}
            </div>
            <div className="admin-card">
              <h2>Publish changes for customers</h2>
              <p>Export your edited catalogue. Replace <code>public/catalog.json</code> in this project with the downloaded file, then build and redeploy the website. This is required because there is no backend.</p>
              <ol className="publish-steps"><li>Click <b>Export catalogue</b>.</li><li>Replace <code>public/catalog.json</code> with the downloaded <code>catalog.json</code>.</li><li>Run <code>npm run build</code> and redeploy the <code>dist</code> folder to your static host.</li></ol>
              <div className="button-row">
                <button className="secondary-button" onClick={() => downloadCatalog(catalog)}>↓ Download updated catalog.json</button>
                <label className="upload-button">↑ Import catalog.json<input type="file" accept="application/json,.json" onChange={(e) => void importCatalog(e.target.files?.[0])} /></label>
                <button className="text-button danger-text" onClick={() => { if (window.confirm("Discard local draft and reload the currently published catalogue?")) onReset(); }}>Reset local draft</button>
              </div>
              {importError && <div className="form-error">{importError}</div>}
            </div>
            <div className="admin-card warning-card"><strong>Important: no-backend limitation</strong><p>Drafts are stored only in this browser. Customers on other phones see the published <code>public/catalog.json</code>, not this device's draft, until you replace the file and redeploy. The default login is a front-end gate, not secure authentication.</p></div>
          </div>
        )}

        {tab === "topics" && (
          <div className="admin-content two-column-admin">
            <section className="admin-card">
              <h2>{editingTopic ? "Edit topic" : "Add new topic"}</h2>
              <form id="topic-form" onSubmit={saveTopic} className="admin-form">
                <label>Topic name<input value={topicTitle} onChange={(e) => setTopicTitle(e.target.value)} placeholder="e.g. Premium Services" required /></label>
                <label>Icon / emoji<input value={topicIcon} onChange={(e) => setTopicIcon(e.target.value)} maxLength={8} /></label>
                <div className="button-row"><button className="primary-button" type="submit">{editingTopic ? "Save topic" : "Add topic"}</button>{editingTopic && <button type="button" className="outline-button" onClick={resetTopicForm}>Cancel</button>}</div>
              </form>
              <p className="helper-text">New topics start with one “Amount / Rate” price column. You can add items and prices under that topic.</p>
            </section>
            <section className="admin-card">
              <h2>Existing topics ({catalog.topics.length})</h2>
              <div className="managed-list">
                {catalog.topics.map((topic) => <div className="managed-row" key={topic.id}><span className="managed-icon">{topic.icon}</span><div className="managed-main"><strong>{topic.title}</strong><small>{topic.items.length} items · {topic.columns.length} price columns</small></div><button className="small-action" onClick={() => editTopic(topic)}>Edit</button><button className="small-action delete" onClick={() => deleteTopic(topic)}>Delete</button></div>)}
              </div>
            </section>
            <section className="admin-card">
              <h2>{editingColumnKey ? "Edit price column" : "Add a price column"}</h2>
              <form id="column-form" onSubmit={saveColumn} className="admin-form">
                <label>Topic<select value={columnTopicId} disabled={!!editingColumnKey} onChange={(e) => setColumnTopicId(e.target.value)}>{catalog.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label>
                <label>Column name<input value={columnLabel} onChange={(e) => setColumnLabel(e.target.value)} placeholder="e.g. Ironing" required /></label>
                <div className="button-row"><button className="primary-button" type="submit" disabled={!catalog.topics.length}>{editingColumnKey ? "Save column" : "Add column"}</button>{editingColumnKey && <button type="button" className="outline-button" onClick={resetColumnForm}>Cancel</button>}</div>
              </form>
              <p className="helper-text">Column changes update the item price forms and customer table. New columns start with “—” for existing items.</p>
            </section>
            <section className="admin-card">
              <h2>Manage price columns</h2>
              <p className="helper-text">Changes show on the customer page in this browser immediately. To update customers on other devices, export the catalog and redeploy the site.</p>
              <div className="managed-list">
                {catalog.topics.flatMap((topic) => topic.columns.map((column) => ({ topic, column }))).map(({ topic, column }) => <div className="managed-row" key={`${topic.id}-${column.key}`}><div className="managed-main"><strong>{column.label}</strong><small>{topic.title}</small></div><button className="small-action" onClick={() => editColumn(topic, column.key, column.label)}>Edit</button><button className="small-action delete" onClick={() => deleteColumn(topic, column.key, column.label)}>Delete</button></div>)}
              </div>
            </section>
          </div>
        )}

        {tab === "services" && (
          <div className="admin-content two-column-admin">
            <section className="admin-card">
              <h2>{editingServiceId ? "Edit service" : "Add service filter"}</h2>
              <form id="service-form" onSubmit={saveService} className="admin-form">
                <label>Service name<input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="e.g. Steam Ironing" required /></label>
                <label>Icon<select value={serviceIcon} onChange={(e) => setServiceIcon(e.target.value)}><option value="sparkles">Steam Ironing</option><option value="package">Wash & Ironing</option><option value="shirt">Dry Cleaning</option><option value="roll">Saree Roll Polishing</option><option value="basket">Household Laundry</option><option value="spray">Wash & Starch</option></select></label>
                <label>Price list<select value={serviceTopicId} onChange={(e) => { const id = e.target.value; setServiceTopicId(id); setServicePriceKey(catalog.topics.find((topic) => topic.id === id)?.columns[0]?.key ?? ""); }}>{catalog.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label>
                <label>Price column<select value={servicePriceKey} onChange={(e) => setServicePriceKey(e.target.value)}>{catalog.topics.find((topic) => topic.id === serviceTopicId)?.columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}</select></label>
                <label>Display order<input type="number" value={serviceSortOrder} onChange={(e) => setServiceSortOrder(e.target.value)} /></label>
                <label className="checkbox-label"><input type="checkbox" checked={serviceActive} onChange={(e) => setServiceActive(e.target.checked)} /> Show this service to customers</label>
                <div className="button-row"><button className="primary-button" type="submit" disabled={!catalog.topics.length}>{editingServiceId ? "Save service" : "Add service"}</button>{editingServiceId && <button type="button" className="outline-button" onClick={resetServiceForm}>Cancel</button>}</div>
              </form>
              <p className="helper-text">Each customer filter displays the selected price column for its assigned price list.</p>
            </section>
            <section className="admin-card">
              <h2>Services ({catalog.services?.length ?? 0})</h2>
              <div className="managed-list">
                {[...(catalog.services ?? [])].sort((a, b) => a.sortOrder - b.sortOrder).map((service) => <div className="managed-row" key={service.id}><span className="managed-icon">{serviceIconComponents[service.icon as keyof typeof serviceIconComponents] ? (() => { const Icon = serviceIconComponents[service.icon as keyof typeof serviceIconComponents]; return <Icon size={18} />; })() : service.icon}</span><div className="managed-main"><strong>{service.name}{service.active ? "" : " · Hidden"}</strong><small>{catalog.topics.find((topic) => topic.id === service.topicId)?.title} · {catalog.topics.find((topic) => topic.id === service.topicId)?.columns.find((column) => column.key === service.priceKey)?.label ?? service.priceKey} · Order {service.sortOrder}</small></div><button className="small-action" onClick={() => editService(service)}>Edit</button><button className="small-action delete" onClick={() => deleteService(service)}>Delete</button></div>)}
              </div>
            </section>
          </div>
        )}

        {tab === "items" && (
          <div className="admin-content two-column-admin">
            <section className="admin-card">
              <h2>{editingItem ? "Edit item & prices" : "Add new item"}</h2>
              <form id="item-form" onSubmit={saveItem} className="admin-form">
                <label>Price list<select value={itemTopicId} disabled={!!editingItem} onChange={(e) => changeItemTopic(e.target.value)}>{catalog.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label>
                <label>English Item Name<input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Shirt" required /></label>
                <label>Tamil Item Name<input value={itemTamilName} onChange={(e) => setItemTamilName(e.target.value)} placeholder="e.g. ஷர்ட்" lang="ta" /></label>
                <label className="checkbox-label"><input type="checkbox" checked={itemActive} onChange={(e) => setItemActive(e.target.checked)} /> Show this item to customers</label>
                <fieldset className="service-assignment"><legend>Applicable services</legend>{(catalog.services ?? []).filter((service) => service.topicId === itemTopicId).map((service) => <label className="checkbox-label" key={service.id}><input type="checkbox" checked={itemServiceKeys.includes(service.priceKey)} onChange={(e) => setItemServiceKeys(e.target.checked ? [...new Set([...itemServiceKeys, service.priceKey])] : itemServiceKeys.filter((key) => key !== service.priceKey))} /> {service.name}</label>)}</fieldset>
                {catalog.topics.find((topic) => topic.id === itemTopicId)?.columns.map((column) => { const isAssignedServicePrice = (catalog.services ?? []).some((service) => service.topicId === itemTopicId && service.priceKey === column.key); return <label key={column.key}>{column.label}<input value={itemPrices[column.key] ?? ""} disabled={isAssignedServicePrice && !itemServiceKeys.includes(column.key)} onChange={(e) => setItemPrices({ ...itemPrices, [column.key]: e.target.value })} placeholder={isAssignedServicePrice && !itemServiceKeys.includes(column.key) ? "Not applicable" : "e.g. 50, 150 per kg"} /></label>; })}
                <div className="button-row"><button className="primary-button" type="submit" disabled={!catalog.topics.length}>{editingItem ? "Save item" : "Add item"}</button>{editingItem && <button type="button" className="outline-button" onClick={resetItemForm}>Cancel</button>}</div>
              </form>
            </section>
            <section className="admin-card">
              <h2>Manage items ({totalItems})</h2>
              <div className="managed-list item-managed-list">
                {catalog.topics.flatMap((topic) => topic.items.map((item) => ({ topic, item }))).map(({ topic, item }) => <div className="managed-row item-row" key={`${topic.id}-${item.id}`}><div className="managed-main"><strong>{itemDisplayName(item)}{item.active === false ? " · Hidden" : ""}</strong><small>{topic.title} · {topic.columns.map((column) => `${column.label}: ${item.prices[column.key] ?? "—"}`).join(" · ")}</small></div><button className="small-action" onClick={() => editItem(topic, item)}>Edit</button><button className="small-action delete" onClick={() => deleteItem(topic, item)}>Delete</button></div>)}
              </div>
            </section>
          </div>
        )}
        <footer className="admin-footer">DAY TO DAY · Static website · No backend / no database</footer>
      </div>
    </main>
  );
}

function downloadQrSvg() {
  const svg = document.getElementById("day-to-day-price-qr");
  if (!svg) return;
  const source = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "day-to-day-price-list-qr.svg";
  anchor.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, icon }: { label: string; value: number; icon: string }) {
  return <div className="stat-card"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

export default App;
