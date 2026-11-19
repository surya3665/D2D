import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Shirt, WashingMachine, SprayCan, Phone, Sparkles, Package, Shirt as FabricRoll } from "lucide-react";
import type { Catalog, PriceItem, PriceTopic } from "./types";
import {
  downloadCatalog,
  loadAdminDraft,
  loadPublishedCatalog,
  makeId,
  saveAdminDraft,
  SESSION_KEY,
  STORAGE_KEY,
} from "./lib/catalog";

type View = "prices" | "admin";
type AdminTab = "overview" | "topics" | "items";

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
  const [activeTopic, setActiveTopic] = useState("");
  const topics = catalog.topics;
  const filteredTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    return topics
      .filter((topic) => !activeTopic || topic.id === activeTopic)
      .map((topic) => ({ ...topic, items: topic.items.filter((item) => !q || item.name.toLowerCase().includes(q)) }))
      .filter((topic) => topic.items.length > 0 || !q);
  }, [topics, activeTopic, query]);

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
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clothing or household item…" />
          </label>
          <div className="topic-tabs" role="tablist" aria-label="Price list topics">
            {topics.map((topic) => (
              <button key={topic.id} className={activeTopic === topic.id ? "topic-tab active" : "topic-tab"} onClick={() => setActiveTopic(topic.id)}>
                <span>{topic.icon}</span>{topic.title}
              </button>
            ))}
            <button className={activeTopic === "" ? "topic-tab active" : "topic-tab"} onClick={() => setActiveTopic("")}>All prices</button>
          </div>
        </div>

        {filteredTopics.map((topic) => (
          <section className="customer-topic" key={topic.id}>
            <div className="section-heading">
              <span className="section-icon">{topic.icon}</span>
              <div><h2>{topic.title}</h2><p>{topic.items.length} items</p></div>
            </div>
            {topic.columns.length > 1 ? (
              <div className="price-table-wrap">
                <table className="price-table">
                  <thead><tr><th>Item</th>{topic.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
                  <tbody>
                    {topic.items.map((item) => (
                      <tr key={item.id}>
                        <td className="item-name">{item.name}</td>
                        {topic.columns.map((column) => <td key={column.key}>{money(item.prices[column.key] ?? "—")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="household-grid">
                {topic.items.map((item) => (
                  <div className="household-card" key={item.id}>
                    <span>{item.name}</span><strong>{money(item.prices[topic.columns[0]?.key ?? "amountRate"] ?? "—")}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {filteredTopics.length === 0 && <div className="empty-state">No matching items. Try another search.</div>}

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
  const [columnTopicId, setColumnTopicId] = useState(catalog.topics[0]?.id ?? "");
  const [columnLabel, setColumnLabel] = useState("");
  const [editingColumnKey, setEditingColumnKey] = useState<string | null>(null);
  const [itemTopicId, setItemTopicId] = useState(catalog.topics[0]?.id ?? "");
  const [itemName, setItemName] = useState("");
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [editingItem, setEditingItem] = useState<{ topicId: string; itemId: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [importError, setImportError] = useState("");

  const totalItems = catalog.topics.reduce((sum, topic) => sum + topic.items.length, 0);
  const updateTopic = (topicId: string, updater: (topic: PriceTopic) => PriceTopic) => {
    setCatalog({ ...catalog, topics: catalog.topics.map((topic) => topic.id === topicId ? updater(topic) : topic) });
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

  const resetItemForm = () => { setItemName(""); setItemPrices({}); setEditingItem(null); };
  const saveItem = (e: FormEvent) => {
    e.preventDefault();
    const topic = catalog.topics.find((entry) => entry.id === itemTopicId);
    if (!topic || !itemName.trim()) return;
    const prices = Object.fromEntries(topic.columns.map((column) => [column.key, itemPrices[column.key]?.trim() || "—"]));
    if (editingItem) {
      updateTopic(editingItem.topicId, (entry) => ({ ...entry, items: entry.items.map((item) => item.id === editingItem.itemId ? { ...item, name: itemName.trim(), prices } : item) }));
      setNotice("Item and prices updated.");
    } else {
      const item: PriceItem = { id: makeId(itemName), name: itemName.trim(), prices };
      updateTopic(itemTopicId, (entry) => ({ ...entry, items: [...entry.items, item] }));
      setNotice("Item added.");
    }
    resetItemForm();
  };

  const editItem = (topic: PriceTopic, item: PriceItem) => {
    setEditingItem({ topicId: topic.id, itemId: item.id });
    setItemTopicId(topic.id); setItemName(item.name); setItemPrices({ ...item.prices });
    document.getElementById("item-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const deleteItem = (topic: PriceTopic, item: PriceItem) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    updateTopic(topic.id, (entry) => ({ ...entry, items: entry.items.filter((row) => row.id !== item.id) }));
    setNotice("Item deleted.");
  };

  const changeItemTopic = (id: string) => {
    setItemTopicId(id); setItemPrices({});
  };

  const importCatalog = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Catalog;
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
          {(["overview", "topics", "items"] as AdminTab[]).map((value) => <button key={value} className={tab === value ? "selected" : ""} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
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

        {tab === "items" && (
          <div className="admin-content two-column-admin">
            <section className="admin-card">
              <h2>{editingItem ? "Edit item & prices" : "Add new item"}</h2>
              <form id="item-form" onSubmit={saveItem} className="admin-form">
                <label>Topic<select value={itemTopicId} disabled={!!editingItem} onChange={(e) => changeItemTopic(e.target.value)}>{catalog.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label>
                <label>Item name<input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Bedsheet" required /></label>
                {catalog.topics.find((topic) => topic.id === itemTopicId)?.columns.map((column) => <label key={column.key}>{column.label}<input value={itemPrices[column.key] ?? ""} onChange={(e) => setItemPrices({ ...itemPrices, [column.key]: e.target.value })} placeholder="e.g. 50 or 150 per kg" /></label>)}
                <div className="button-row"><button className="primary-button" type="submit" disabled={!catalog.topics.length}>{editingItem ? "Save item" : "Add item"}</button>{editingItem && <button type="button" className="outline-button" onClick={resetItemForm}>Cancel</button>}</div>
              </form>
            </section>
            <section className="admin-card">
              <h2>Manage items ({totalItems})</h2>
              <div className="managed-list item-managed-list">
                {catalog.topics.flatMap((topic) => topic.items.map((item) => ({ topic, item }))).map(({ topic, item }) => <div className="managed-row item-row" key={`${topic.id}-${item.id}`}><div className="managed-main"><strong>{item.name}</strong><small>{topic.title} · {topic.columns.map((column) => `${column.label}: ${item.prices[column.key] ?? "—"}`).join(" · ")}</small></div><button className="small-action" onClick={() => editItem(topic, item)}>Edit</button><button className="small-action delete" onClick={() => deleteItem(topic, item)}>Delete</button></div>)}
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
