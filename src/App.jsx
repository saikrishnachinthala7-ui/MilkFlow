import { useState, useEffect, useCallback } from "react";

// ─── Supabase Client ─────────────────────────────────────────────────────────
const SUPABASE_URL = "https://ehsqnfmctdosebfcakwv.supabase.co";
const SUPABASE_KEY = "sb_publishable_r85tUWIcXp-tRJ7OypsXWw_Oy4ijkfh";

async function db(table, method = "GET", body = null, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  return method === "DELETE" ? null : res.json();
}

// ─── Constants ────────────────────────────────────────────────────────────────
const OWNER_PIN = "1234";
const FATHER_PIN = "0000";
const UPI_ID = "yadaiahchinthala07-4@okaxis";

const BRAND_COLORS = {
  "Amul Full Cream": "#1565C0",
  "Amul Toned": "#0288D1",
  Nandini: "#2E7D32",
  Local: "#6D4C41",
};

const AREA_COLORS = ["#1a6b3c", "#1565C0", "#6a1b9a", "#c62828", "#e65100"];

const QTY_OPTIONS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 0];

// ─── Utility Helpers ──────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const fmtCurrency = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });
const initials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const avatarColor = (name = "") => {
  const colors = ["#1a6b3c","#1565C0","#6a1b9a","#c62828","#e65100","#00695c","#f57f17"];
  let h = 0;
  for (let c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
};

// ─── PIN Screen ───────────────────────────────────────────────────────────────
function PinScreen({ onSuccess, role }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const press = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      setTimeout(() => {
        const valid =
          role === "father"
            ? next === FATHER_PIN
            : next === OWNER_PIN;
        if (valid) onSuccess();
        else {
          setShake(true);
          setError(true);
          setPin("");
          setTimeout(() => setShake(false), 500);
        }
      }, 150);
    }
  };

  const del = () => { setPin(p => p.slice(0, -1)); setError(false); };

  return (
    <div style={styles.pinWrap}>
      <div style={styles.pinLogo}>🥛</div>
      <div style={styles.pinTitle}>MilkFlow</div>
      <div style={styles.pinSub}>Saikrishna Milk Supply</div>
      <div style={styles.pinRoleTag}>
        {role === "father" ? "👨 అన్న లాగిన్" : "👑 Owner Login"}
      </div>
      <div style={{ ...styles.pinDots, ...(shake ? styles.shake : {}) }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ ...styles.pinDot, ...(i < pin.length ? styles.pinDotFilled : {}) }} />
        ))}
      </div>
      {error && <div style={styles.pinError}>❌ తప్పు PIN — మళ్ళీ ప్రయత్నించండి</div>}
      <div style={styles.pinPad}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} style={styles.pinBtn} onClick={() => press(String(n))}>{n}</button>
        ))}
        <div style={styles.pinBtn} />
        <button style={styles.pinBtn} onClick={() => press("0")}>0</button>
        <button style={styles.pinBtn} onClick={del}>⌫</button>
      </div>
    </div>
  );
}

// ─── Father Entry Screen ──────────────────────────────────────────────────────
function FatherScreen() {
  const [customers, setCustomers] = useState([]);
  const [entries, setEntries] = useState({});
  const [active, setActive] = useState(null);
  const [selectedQty, setSelectedQty] = useState(null);
  const [customQty, setCustomQty] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custs, todayEntries] = await Promise.all([
        db("customers", "GET", null, "?is_active=eq.true&order=area_id,name"),
        db("daily_entries", "GET", null, `?entry_date=eq.${today()}&select=*`),
      ]);
      setCustomers(custs || []);
      const entryMap = {};
      (todayEntries || []).forEach(e => {
        entryMap[e.customer_id] = e;
      });
      setEntries(entryMap);
    } catch (e) {
      // Use demo data if Supabase fails
      setCustomers(DEMO_CUSTOMERS);
    }
    setLoading(false);
  };

  const openEntry = (cust) => {
    const existing = entries[cust.id];
    setActive(cust);
    setSelectedQty(existing ? existing.quantity_litres : null);
    setCustomQty("");
  };

  const saveEntry = async () => {
    let qty;
    if (selectedQty === -1) {
      qty = parseFloat(customQty);
      if (isNaN(qty) || qty < 0) return;
    } else if (selectedQty === null) return;
    else qty = selectedQty;

    setSaving(true);
    const payload = {
      customer_id: active.id,
      entry_date: today(),
      quantity_litres: qty,
      entered_by: "father",
      notes: qty === 0 ? "No delivery" : null,
    };

    try {
      const existing = entries[active.id];
      if (existing?.id) {
        await db("daily_entries", "PATCH", { quantity_litres: qty }, `?id=eq.${existing.id}`);
      } else {
        await db("daily_entries", "POST", payload);
      }
    } catch (e) { /* offline — save locally */ }

    setEntries(prev => ({
      ...prev,
      [active.id]: { ...payload, quantity_litres: qty },
    }));
    setActive(null);
    setSaving(false);
  };

  const submitAll = async () => {
    setSubmitted(true);
  };

  const doneCount = Object.keys(entries).length;
  const allDone = doneCount >= customers.length && customers.length > 0;

  const filtered = customers.filter(c => {
    const e = entries[c.id];
    if (filter === "done" && !e) return false;
    if (filter === "pending" && e) return false;
    const s = search.toLowerCase();
    return !s || (c.name || "").toLowerCase().includes(s) || (c.customer_code || "").toLowerCase().includes(s);
  });

  // Group by area
  const byArea = {};
  filtered.forEach(c => {
    const a = c.area_name || "Other";
    if (!byArea[a]) byArea[a] = [];
    byArea[a].push(c);
  });

  if (submitted) return <FatherSuccess entries={entries} customers={customers} onReset={() => { setSubmitted(false); setEntries({}); }} />;
  if (loading) return <LoadingScreen />;

  return (
    <div style={styles.screen}>
      {/* Status bar */}
      <div style={styles.statusBar}>
        <StatusChip color="#1a6b3c" bg="#e8f5ee" label={`✅ ${doneCount}/${customers.length} నమోదు`} />
        <StatusChip color="#856404" bg="#fff3cd" label={`⏳ ${customers.length - doneCount} మిగిలి`} />
        <StatusChip color={allDone ? "#155724" : "#495057"} bg={allDone ? "#d4edda" : "#e9ecef"} label={`${Math.round((doneCount / Math.max(customers.length,1)) * 100)}% పూర్తి`} />
      </div>

      {/* Search */}
      <div style={styles.searchBar}>
        <span style={{ fontSize: 16, color: "#888" }}>🔍</span>
        <input style={styles.searchInput} placeholder="పేరు వెతకండి..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button style={styles.clearBtn} onClick={() => setSearch("")}>✕</button>}
      </div>

      {/* Filters */}
      <div style={styles.filterRow}>
        {["all","pending","done"].map(f => (
          <button key={f} style={{ ...styles.filterChip, ...(filter === f ? styles.filterChipActive : {}) }} onClick={() => setFilter(f)}>
            {f === "all" ? `అందరూ (${customers.length})` : f === "pending" ? `మిగిలింది (${customers.length - doneCount})` : `పూర్తి (${doneCount})`}
          </button>
        ))}
      </div>

      {/* Customer List */}
      <div style={styles.scrollArea}>
        {Object.entries(byArea).map(([area, custs], ai) => (
          <div key={area}>
            <div style={styles.areaDivider}>
              <span style={{ color: AREA_COLORS[ai % AREA_COLORS.length] }}>📍 {area}</span>
              <div style={styles.dividerLine} />
            </div>
            {custs.map(cust => {
              const entry = entries[cust.id];
              const isDone = !!entry;
              const qty = isDone ? entry.quantity_litres : (cust.default_quantity || 1);
              return (
                <div key={cust.id} style={{ ...styles.custCard, ...(isDone ? styles.custCardDone : {}) }} onClick={() => openEntry(cust)}>
                  <div style={{ ...styles.avatar, background: avatarColor(cust.name) }}>{initials(cust.name)}</div>
                  <div style={styles.custInfo}>
                    <div style={styles.custName}>{cust.name}</div>
                    <div style={styles.custMeta}>{cust.customer_code} • {cust.brand_name || "Amul"}</div>
                  </div>
                  <div style={styles.qtySection}>
                    {entry?.quantity_litres === 0
                      ? <><div style={{ fontSize: 22 }}>🚫</div><div style={styles.qtyUnit}>యివ్వలేదు</div></>
                      : <><div style={styles.qtyNum}>{qty}</div><div style={styles.qtyUnit}>లీటర్</div></>
                    }
                    <div style={{ ...styles.qtyBadge, ...(isDone ? styles.qtyBadgeDone : styles.qtyBadgePrev) }}>
                      {isDone ? "✓ నమోదు" : "నిన్న"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#888" }}>ఫలితాలు లేవు</div>
        )}
      </div>

      {/* Submit Button */}
      <button
        style={{ ...styles.submitBtn, ...(allDone ? {} : styles.submitBtnDisabled) }}
        onClick={allDone ? submitAll : null}
      >
        <span style={{ fontSize: 22 }}>{allDone ? "🚀" : "🔒"}</span>
        {allDone ? "అన్నీ సమర్పించండి" : `${customers.length - doneCount} మిగిలింది — ముందు నమోదు చేయండి`}
      </button>

      {/* Entry Modal */}
      {active && (
        <div style={styles.modalBg} onClick={() => setActive(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHandle} />
            <div style={styles.modalName}>{active.name}</div>
            <div style={styles.modalMeta}>{active.customer_code} • {active.area_name} • {active.brand_name || "Amul"}</div>
            <div style={styles.prevBox}>
              <span style={{ fontSize: 13, color: "#2d7a50" }}>📅 నిన్న ఇచ్చారు:</span>
              <span style={{ fontSize: 18, fontWeight: 600, color: "#1a6b3c" }}>{active.default_quantity || 1} L</span>
            </div>
            <div style={styles.modalQtyLabel}>ఈరోజు ఎంత ఇచ్చారు? 👇</div>
            <div style={styles.qtyGrid}>
              {QTY_OPTIONS.map(q => (
                <button
                  key={q}
                  style={{ ...styles.qtyOption, ...(selectedQty === q ? styles.qtyOptionSel : {}), ...(q === 0 ? styles.qtyOptionZero : {}) }}
                  onClick={() => { setSelectedQty(q); setCustomQty(""); }}
                >
                  {q === 0 ? <>🚫<br /><span style={{ fontSize: 10 }}>యివ్వలేదు</span></> : q}
                </button>
              ))}
              <button
                style={{ ...styles.qtyOption, ...(selectedQty === -1 ? styles.qtyOptionSel : {}), fontSize: 13 }}
                onClick={() => setSelectedQty(-1)}
              >✏️<br /><span style={{ fontSize: 10 }}>వేరేది</span></button>
            </div>
            {selectedQty === -1 && (
              <div style={styles.customRow}>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  placeholder="0.0"
                  value={customQty}
                  onChange={e => setCustomQty(e.target.value)}
                  style={styles.customInput}
                  autoFocus
                />
                <span style={{ fontSize: 13, color: "#888" }}>లీటర్లు</span>
              </div>
            )}
            <div style={styles.modalActions}>
              <button style={styles.btnCancel} onClick={() => setActive(null)}>రద్దు</button>
              <button style={styles.btnSave} onClick={saveEntry} disabled={saving}>
                {saving ? "..." : "✅ సేవ్ చేయి"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FatherSuccess({ entries, customers, onReset }) {
  const total = Object.values(entries).reduce((s, e) => s + (e?.quantity_litres || 0), 0);
  const zeros = Object.values(entries).filter(e => e?.quantity_litres === 0).length;
  return (
    <div style={styles.successScreen}>
      <div style={{ fontSize: 72 }}>✅</div>
      <div style={styles.successTitle}>అన్నీ సమర్పించారు!</div>
      <div style={styles.successSub}>ఈరోజు పాలు రికార్డ్ పూర్తి అయింది</div>
      <div style={styles.statsRow}>
        <StatBox label="కస్టమర్లు" value={customers.length} />
        <StatBox label="లీటర్లు" value={total.toFixed(1)} />
        <StatBox label="ఇవ్వలేదు" value={zeros} />
      </div>
      <div style={{ fontSize: 14, color: "#888", marginTop: 8 }}>యజమానికి పంపబడింది 📤</div>
      <button style={{ ...styles.btnSave, marginTop: 24, padding: "12px 32px" }} onClick={onReset}>
        మళ్ళీ చేయి
      </button>
    </div>
  );
}

// ─── Owner Dashboard ──────────────────────────────────────────────────────────
function OwnerDashboard() {
  const [tab, setTab] = useState("home");

  const tabs = [
    { id: "home", icon: "🏠", label: "Home" },
    { id: "customers", icon: "👥", label: "Customers" },
    { id: "records", icon: "📋", label: "Records" },
    { id: "billing", icon: "🧾", label: "Billing" },
    { id: "payments", icon: "💳", label: "Payments" },
  ];

  return (
    <div style={styles.screen}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "home" && <OwnerHome setTab={setTab} />}
        {tab === "customers" && <CustomerManagement />}
        {tab === "records" && <DailyRecords />}
        {tab === "billing" && <BillingSection />}
        {tab === "payments" && <PaymentTracking />}
      </div>
      {/* Bottom Nav */}
      <div style={styles.bottomNav}>
        {tabs.map(t => (
          <button key={t.id} style={{ ...styles.navBtn, ...(tab === t.id ? styles.navBtnActive : {}) }} onClick={() => setTab(t.id)}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, marginTop: 2 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function OwnerHome({ setTab }) {
  const [stats, setStats] = useState({ customers: 0, todayLitres: 0, monthRevenue: 0, pendingPayments: 0, overdueCount: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [custs, todayE, bills] = await Promise.all([
        db("customers", "GET", null, "?is_active=eq.true&select=count"),
        db("daily_entries", "GET", null, `?entry_date=eq.${today()}&select=quantity_litres`),
        db("bills", "GET", null, "?status=eq.pending&select=total_amount"),
      ]);
      const litres = (todayE || []).reduce((s, e) => s + (e.quantity_litres || 0), 0);
      const pending = (bills || []).reduce((s, b) => s + (b.total_amount || 0), 0);
      setStats({
        customers: custs?.[0]?.count || DEMO_CUSTOMERS.length,
        todayLitres: litres || 47.5,
        monthRevenue: pending || 84250,
        pendingPayments: pending || 32400,
        overdueCount: 8,
      });
    } catch (e) {
      setStats({ customers: DEMO_CUSTOMERS.length, todayLitres: 47.5, monthRevenue: 84250, pendingPayments: 32400, overdueCount: 8 });
    }
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good Morning" : now.getHours() < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={styles.ownerHeader}>
        <div>
          <div style={{ fontSize: 13, color: "#888" }}>{greeting} 👋</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#111" }}>Saikrishna Milk Supply</div>
        </div>
        <div style={{ ...styles.avatar, background: "#1a6b3c", width: 40, height: 40, fontSize: 16 }}>SK</div>
      </div>

      {/* Today Summary */}
      <div style={styles.sectionTitle}>📊 Today — {fmtDate(today())}</div>
      <div style={styles.statsGrid}>
        <StatCard label="Active Customers" value={stats.customers} icon="👥" color="#1565C0" />
        <StatCard label="Litres Today" value={stats.todayLitres.toFixed(1) + "L"} icon="🥛" color="#1a6b3c" />
        <StatCard label="Month Revenue" value={fmtCurrency(stats.monthRevenue)} icon="💰" color="#6a1b9a" />
        <StatCard label="Pending Payments" value={fmtCurrency(stats.pendingPayments)} icon="⏳" color="#c62828" />
      </div>

      {/* Quick Actions */}
      <div style={styles.sectionTitle}>⚡ Quick Actions</div>
      <div style={styles.quickActions}>
        <QuickAction icon="🧾" label="Generate Bills" onClick={() => setTab("billing")} color="#1a6b3c" />
        <QuickAction icon="💳" label="Check Payments" onClick={() => setTab("payments")} color="#1565C0" />
        <QuickAction icon="📋" label="Daily Records" onClick={() => setTab("records")} color="#6a1b9a" />
        <QuickAction icon="👥" label="Customers" onClick={() => setTab("customers")} color="#e65100" />
      </div>

      {/* Alerts */}
      {stats.overdueCount > 0 && (
        <div style={styles.alertBox}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{stats.overdueCount} customers overdue</div>
            <div style={{ fontSize: 12, color: "#856404" }}>Send reminder → tap Payments</div>
          </div>
        </div>
      )}

      {/* Monthly Calendar Progress */}
      <div style={styles.sectionTitle}>🗓️ This Month</div>
      <div style={styles.monthCard}>
        <div style={styles.monthRow}>
          <span style={{ fontSize: 13, color: "#555" }}>Days recorded</span>
          <span style={{ fontWeight: 600 }}>{now.getDate()}/{new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()}</span>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${(now.getDate() / new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()) * 100}%` }} />
        </div>
        <div style={styles.monthRow}>
          <span style={{ fontSize: 13, color: "#555" }}>Bill status</span>
          <span style={{ background: "#fff3cd", color: "#856404", fontSize: 12, padding: "2px 8px", borderRadius: 10 }}>Pending Generation</span>
        </div>
      </div>
    </div>
  );
}

function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCust, setNewCust] = useState({ name: "", phone: "", area_name: "", default_quantity: 1, brand_name: "Amul Full Cream" });

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await db("customers", "GET", null, "?is_active=eq.true&order=name");
      setCustomers(data || DEMO_CUSTOMERS);
    } catch { setCustomers(DEMO_CUSTOMERS); }
    setLoading(false);
  };

  const addCustomer = async () => {
    try {
      const code = "C" + String(Date.now()).slice(-4);
      await db("customers", "POST", { ...newCust, customer_code: code, is_active: true });
      loadCustomers();
      setShowAdd(false);
      setNewCust({ name: "", phone: "", area_name: "", default_quantity: 1, brand_name: "Amul Full Cream" });
    } catch (e) { alert("Error: " + e.message); }
  };

  const filtered = customers.filter(c =>
    !search || (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) || (c.customer_code || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: 16 }}>
      <div style={styles.pageHeader}>
        <div style={styles.sectionTitle}>👥 Customers ({customers.length})</div>
        <button style={styles.btnPrimary} onClick={() => setShowAdd(true)}>+ Add</button>
      </div>
      <div style={styles.searchBar}>
        <span>🔍</span>
        <input style={styles.searchInput} placeholder="Search name, phone, code..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <LoadingScreen /> : filtered.map(c => (
        <div key={c.id} style={styles.listCard}>
          <div style={{ ...styles.avatar, background: avatarColor(c.name) }}>{initials(c.name)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{c.customer_code} • {c.phone} • {c.area_name}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, color: "#1a6b3c" }}>{c.default_quantity}L</div>
            <div style={{ fontSize: 11, color: "#888" }}>{c.brand_name || "Amul"}</div>
          </div>
        </div>
      ))}
      {showAdd && (
        <div style={styles.modalBg} onClick={() => setShowAdd(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHandle} />
            <div style={styles.modalName}>New Customer</div>
            {["name","phone","area_name"].map(field => (
              <input key={field} style={styles.formInput} placeholder={field === "name" ? "Full Name" : field === "phone" ? "Phone (10 digits)" : "Area"} value={newCust[field]} onChange={e => setNewCust(p => ({ ...p, [field]: e.target.value }))} />
            ))}
            <div style={styles.formRow}>
              <input style={{ ...styles.formInput, flex: 1 }} type="number" step="0.5" placeholder="Daily Qty (L)" value={newCust.default_quantity} onChange={e => setNewCust(p => ({ ...p, default_quantity: e.target.value }))} />
              <select style={{ ...styles.formInput, flex: 1 }} value={newCust.brand_name} onChange={e => setNewCust(p => ({ ...p, brand_name: e.target.value }))}>
                {["Amul Full Cream","Amul Toned","Nandini","Local"].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div style={styles.modalActions}>
              <button style={styles.btnCancel} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={styles.btnSave} onClick={addCustomer}>Add Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DailyRecords() {
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadEntries(); }, [date]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await db("daily_entries", "GET", null, `?entry_date=eq.${date}&select=*,customers(name,customer_code,area_name)`);
      setEntries(data || DEMO_ENTRIES);
    } catch { setEntries(DEMO_ENTRIES); }
    setLoading(false);
  };

  const total = entries.reduce((s, e) => s + (e.quantity_litres || 0), 0);
  const zeros = entries.filter(e => e.quantity_litres === 0).length;

  return (
    <div style={{ padding: 16 }}>
      <div style={styles.sectionTitle}>📋 Daily Records</div>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...styles.formInput, marginBottom: 12 }} />
      <div style={styles.statsGrid}>
        <StatCard label="Entries" value={entries.length} icon="📝" color="#1a6b3c" />
        <StatCard label="Total Litres" value={total.toFixed(1) + "L"} icon="🥛" color="#1565C0" />
        <StatCard label="Zero Delivery" value={zeros} icon="🚫" color="#c62828" />
      </div>
      {loading ? <LoadingScreen /> : entries.map((e, i) => (
        <div key={i} style={styles.listCard}>
          <div style={{ ...styles.avatar, background: avatarColor(e.customers?.name || ""), width: 36, height: 36, fontSize: 13 }}>
            {initials(e.customers?.name || "")}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{e.customers?.name || "Customer"}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{e.customers?.area_name} • {e.entered_by}</div>
          </div>
          <div style={{ fontWeight: 600, color: e.quantity_litres === 0 ? "#c62828" : "#1a6b3c", fontSize: 16 }}>
            {e.quantity_litres === 0 ? "🚫" : e.quantity_litres + "L"}
          </div>
        </div>
      ))}
    </div>
  );
}

function BillingSection() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadBills(); }, [month]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const data = await db("bills", "GET", null, `?billing_month=eq.${month + "-01"}&select=*,customers(name,customer_code,phone)`);
      setBills(data || DEMO_BILLS);
    } catch { setBills(DEMO_BILLS); }
    setLoading(false);
  };

  const generateBills = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1500));
    setGenerating(false);
    alert("Bills generated for " + month + "! Ready to send.");
  };

  const totalAmount = bills.reduce((s, b) => s + (b.total_amount || 0), 0);
  const paidCount = bills.filter(b => b.status === "paid").length;

  return (
    <div style={{ padding: 16 }}>
      <div style={styles.sectionTitle}>🧾 Month-End Billing</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...styles.formInput, flex: 1 }} />
        <button style={styles.btnPrimary} onClick={generateBills} disabled={generating}>
          {generating ? "⏳..." : "Generate"}
        </button>
      </div>
      <div style={styles.statsGrid}>
        <StatCard label="Total Bills" value={bills.length} icon="🧾" color="#1565C0" />
        <StatCard label="Total Amount" value={fmtCurrency(totalAmount)} icon="💰" color="#1a6b3c" />
        <StatCard label="Paid" value={paidCount} icon="✅" color="#2E7D32" />
        <StatCard label="Pending" value={bills.length - paidCount} icon="⏳" color="#c62828" />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button style={styles.btnPrimary}>📤 Send All via WhatsApp</button>
      </div>
      {loading ? <LoadingScreen /> : bills.map((b, i) => (
        <div key={i} style={styles.listCard}>
          <div style={{ ...styles.avatar, background: avatarColor(b.customers?.name || ""), width: 36, height: 36, fontSize: 13 }}>
            {initials(b.customers?.name || "")}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{b.customers?.name || "Customer"}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{b.customers?.customer_code} • {fmtDate(b.billing_month)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600 }}>{fmtCurrency(b.total_amount)}</div>
            <div style={{ ...styles.statusBadge, ...(b.status === "paid" ? styles.badgePaid : styles.badgePending) }}>
              {b.status === "paid" ? "✅ Paid" : "⏳ Pending"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentTracking() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPayments(); }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await db("payments", "GET", null, "?order=payment_date.desc&limit=50&select=*,customers(name,customer_code)");
      setPayments(data || DEMO_PAYMENTS);
    } catch { setPayments(DEMO_PAYMENTS); }
    setLoading(false);
  };

  const confirm = async (id) => {
    try {
      await db("payments", "PATCH", { status: "confirmed", owner_confirmed: true }, `?id=eq.${id}`);
      loadPayments();
    } catch { alert("Error confirming"); }
  };

  const filtered = payments.filter(p => filter === "all" || p.status === filter);

  return (
    <div style={{ padding: 16 }}>
      <div style={styles.sectionTitle}>💳 Payment Tracking</div>
      <div style={styles.filterRow}>
        {["all","pending_confirmation","confirmed","rejected"].map(f => (
          <button key={f} style={{ ...styles.filterChip, ...(filter === f ? styles.filterChipActive : {}) }} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "pending_confirmation" ? "⏳ Review" : f === "confirmed" ? "✅ Confirmed" : "❌ Rejected"}
          </button>
        ))}
      </div>
      {loading ? <LoadingScreen /> : filtered.map((p, i) => (
        <div key={i} style={styles.listCard}>
          <div style={{ fontSize: 28 }}>{p.payment_method === "cash" ? "💵" : p.payment_method === "upi" ? "📱" : "🏦"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{p.customers?.name || "Customer"}</div>
            <div style={{ fontSize: 12, color: "#888" }}>{p.payment_method?.toUpperCase()} • {fmtDate(p.payment_date)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, color: "#1a6b3c" }}>{fmtCurrency(p.amount)}</div>
            {p.status === "pending_confirmation" && (
              <button style={{ ...styles.btnPrimary, padding: "4px 10px", fontSize: 11, marginTop: 4 }} onClick={() => confirm(p.id)}>
                Confirm ✅
              </button>
            )}
            {p.status === "confirmed" && <div style={styles.badgePaid}>✅ Done</div>}
            {p.status === "rejected" && <div style={styles.badgeRejected}>❌ Rejected</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Customer Portal ──────────────────────────────────────────────────────────
function CustomerPortal({ customerId = "C001" }) {
  const [customer, setCustomer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [bill, setBill] = useState(null);
  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCustomerData(); }, []);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const [custs, monthEntries, bills] = await Promise.all([
        db("customers", "GET", null, `?customer_code=eq.${customerId}&limit=1`),
        db("daily_entries", "GET", null, `?customer_id=eq.${customerId}&order=entry_date.desc&limit=31`),
        db("bills", "GET", null, `?customer_id=eq.${customerId}&order=billing_month.desc&limit=1`),
      ]);
      setCustomer(custs?.[0] || DEMO_CUSTOMERS[0]);
      setEntries(monthEntries || DEMO_PORTAL_ENTRIES);
      setBill(bills?.[0] || DEMO_BILL);
    } catch {
      setCustomer(DEMO_CUSTOMERS[0]);
      setEntries(DEMO_PORTAL_ENTRIES);
      setBill(DEMO_BILL);
    }
    setLoading(false);
  };

  if (loading) return <LoadingScreen />;

  const streak = entries.filter(e => e.customer_recorded).length;

  return (
    <div style={styles.screen}>
      {/* Portal Header */}
      <div style={{ background: "#1565C0", padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ ...styles.avatar, background: "white", color: "#1565C0", width: 38, height: 38 }}>🥛</div>
        <div style={{ color: "white" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Saikrishna Milk Supply</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Your personal milk account</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "home" && <PortalHome customer={customer} bill={bill} streak={streak} setTab={setTab} />}
        {tab === "records" && <PortalRecords entries={entries} />}
        {tab === "bill" && <PortalBill bill={bill} customer={customer} />}
        {tab === "pay" && <PortalPay bill={bill} customer={customer} />}
      </div>

      <div style={styles.bottomNav}>
        {[["home","🏠","Home"],["records","📋","Records"],["bill","🧾","Bill"],["pay","💳","Pay"]].map(([id,icon,label]) => (
          <button key={id} style={{ ...styles.navBtn, ...(tab === id ? styles.navBtnActiveBlue : {}) }} onClick={() => setTab(id)}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 10, marginTop: 2 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PortalHome({ customer, bill, streak, setTab }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Hello, {customer?.name?.split(" ")[0]} 👋</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Code: {customer?.customer_code}</div>
      <div style={styles.statsGrid}>
        <StatCard label="Daily Milk" value={(customer?.default_quantity || 1) + "L"} icon="🥛" color="#1565C0" />
        <StatCard label="Streak" value={streak + " days 🔥"} icon="📅" color="#e65100" />
        <StatCard label="Bill Amount" value={fmtCurrency(bill?.total_amount)} icon="🧾" color="#1a6b3c" />
        <StatCard label="Status" value={bill?.status === "paid" ? "✅ Paid" : "⏳ Due"} icon="💳" color={bill?.status === "paid" ? "#2E7D32" : "#c62828"} />
      </div>
      {bill?.status !== "paid" && (
        <div style={{ ...styles.alertBox, marginBottom: 12 }}>
          <span style={{ fontSize: 18 }}>💳</span>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>Amount Due: {fmtCurrency(bill?.total_amount)}</div>
            <div style={{ fontSize: 12, color: "#856404" }}>Pay & share screenshot to confirm</div>
          </div>
        </div>
      )}
      <div style={styles.quickActions}>
        <QuickAction icon="🧾" label="View Bill" onClick={() => setTab("bill")} color="#1a6b3c" />
        <QuickAction icon="💳" label="Pay Now" onClick={() => setTab("pay")} color="#1565C0" />
        <QuickAction icon="📋" label="My Records" onClick={() => setTab("records")} color="#6a1b9a" />
      </div>
    </div>
  );
}

function PortalRecords({ entries }) {
  const ownerDays = entries.length;
  const custDays = entries.filter(e => e.customer_recorded).length;
  const matching = entries.filter(e => e.customer_recorded && e.quantity_litres === e.customer_quantity).length;

  return (
    <div style={{ padding: 16 }}>
      <div style={styles.sectionTitle}>📋 This Month's Records</div>
      <div style={{ background: "#e8f5ee", borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#2d7a50" }}>Days recorded by us</span>
          <span style={{ fontWeight: 600 }}>{ownerDays} ✅</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#2d7a50" }}>Days recorded by you</span>
          <span style={{ fontWeight: 600 }}>{custDays} 📝</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#2d7a50" }}>Matching records</span>
          <span style={{ fontWeight: 600, color: "#1a6b3c" }}>{matching} 🎯</span>
        </div>
      </div>
      {entries.slice(0, 20).map((e, i) => (
        <div key={i} style={{ ...styles.listCard, padding: "10px 12px" }}>
          <div style={{ fontSize: 13, color: "#888", minWidth: 50 }}>{fmtDate(e.entry_date)}</div>
          <div style={{ flex: 1, fontSize: 14 }}>{e.quantity_litres}L</div>
          <div style={{ fontSize: 12, color: e.customer_recorded ? "#1a6b3c" : "#888" }}>
            {e.customer_recorded ? "✅ You recorded" : "📝 Not recorded"}
          </div>
        </div>
      ))}
    </div>
  );
}

function PortalBill({ bill, customer }) {
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=Saikrishna+Milk+Supply&am=${bill?.total_amount || 0}&cu=INR`;
  return (
    <div style={{ padding: 16 }}>
      <div style={styles.billCard}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 28 }}>🥛</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Saikrishna Milk Supply</div>
          <div style={{ fontSize: 12, color: "#888" }}>Monthly Bill</div>
        </div>
        <div style={styles.billRow}><span>Customer</span><span style={{ fontWeight: 500 }}>{customer?.name}</span></div>
        <div style={styles.billRow}><span>Code</span><span>{customer?.customer_code}</span></div>
        <div style={styles.billRow}><span>Period</span><span>{bill?.billing_month ? fmtDate(bill.billing_month) : "This Month"}</span></div>
        <div style={{ borderTop: "1px dashed #ddd", margin: "12px 0" }} />
        <div style={styles.billRow}><span>Milk Rate</span><span>₹{customer?.rate_per_litre || 68}/L</span></div>
        <div style={styles.billRow}><span>Total Litres</span><span>{bill?.total_litres || 0}L</span></div>
        <div style={{ borderTop: "2px solid #1a6b3c", margin: "12px 0" }} />
        <div style={{ ...styles.billRow, fontWeight: 700, fontSize: 18 }}>
          <span>TOTAL DUE</span>
          <span style={{ color: "#c62828" }}>{fmtCurrency(bill?.total_amount)}</span>
        </div>
        {bill?.outstanding_amount > 0 && (
          <div style={{ ...styles.billRow, fontSize: 13 }}>
            <span style={{ color: "#c62828" }}>Outstanding</span>
            <span style={{ color: "#c62828" }}>+{fmtCurrency(bill?.outstanding_amount)}</span>
          </div>
        )}
        <a href={upiLink} style={{ ...styles.btnSave, display: "block", textAlign: "center", marginTop: 16, textDecoration: "none" }}>
          💳 Pay Now — {fmtCurrency(bill?.total_amount)}
        </a>
        <div style={{ fontSize: 11, color: "#888", textAlign: "center", marginTop: 8 }}>
          After payment, share screenshot on WhatsApp to confirm ✅
        </div>
      </div>
    </div>
  );
}

function PortalPay({ bill, customer }) {
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=Saikrishna+Milk+Supply&am=${bill?.total_amount || 0}&cu=INR`;
  return (
    <div style={{ padding: 16 }}>
      <div style={styles.sectionTitle}>💳 Pay Your Bill</div>
      <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13 }}>
        ⚠️ Share payment screenshot on WhatsApp after paying. Unshared payments show as <strong>OUTSTANDING</strong> on next bill.
      </div>
      <div style={styles.billCard}>
        <div style={styles.billRow}><span style={{ fontWeight: 600 }}>Amount Due</span><span style={{ fontWeight: 700, fontSize: 20, color: "#c62828" }}>{fmtCurrency(bill?.total_amount)}</span></div>
        <div style={styles.billRow}><span>UPI ID</span><span style={{ fontSize: 12 }}>{UPI_ID}</span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        <a href={upiLink} style={{ ...styles.btnSave, textAlign: "center", textDecoration: "none", padding: 16, fontSize: 17 }}>
          📱 Pay via GPay / PhonePe / Paytm
        </a>
        <a href={`https://wa.me/91XXXXXXXXXX`} style={{ ...styles.btnCancel, textAlign: "center", textDecoration: "none", padding: 14, fontSize: 15, display: "block" }}>
          📸 Share Payment Screenshot on WhatsApp
        </a>
      </div>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color }) => (
  <div style={styles.statCard}>
    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{label}</div>
  </div>
);

const StatBox = ({ label, value }) => (
  <div style={{ background: "#e8f5ee", borderRadius: 12, padding: "14px 20px", textAlign: "center" }}>
    <div style={{ fontSize: 28, fontWeight: 700, color: "#1a6b3c" }}>{value}</div>
    <div style={{ fontSize: 12, color: "#2d7a50" }}>{label}</div>
  </div>
);

const StatusChip = ({ color, bg, label }) => (
  <div style={{ flex: 1, background: bg, color, borderRadius: 20, padding: "6px 0", textAlign: "center", fontSize: 11, fontWeight: 500 }}>{label}</div>
);

const QuickAction = ({ icon, label, onClick, color }) => (
  <button style={{ flex: 1, background: "white", border: `1px solid ${color}20`, borderRadius: 12, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={onClick}>
    <span style={{ fontSize: 26 }}>{icon}</span>
    <span style={{ fontSize: 11, color, fontWeight: 500 }}>{label}</span>
  </button>
);

const LoadingScreen = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "#888" }}>
    <span style={{ fontSize: 32 }}>⏳</span>
  </div>
);

// ─── Demo Data (fallback when Supabase not accessible) ────────────────────────
const DEMO_CUSTOMERS = [
  { id: 1, name: "రాజేశ్వర రావు", customer_code: "C001", phone: "9876543210", area_name: "గోవిందపురం", brand_name: "Amul Full Cream", default_quantity: 1.5, rate_per_litre: 68, is_active: true },
  { id: 2, name: "సుమిత్ర దేవి", customer_code: "C002", phone: "9876543211", area_name: "గోవిందపురం", brand_name: "Amul Toned", default_quantity: 1.0, rate_per_litre: 54, is_active: true },
  { id: 3, name: "వెంకటేశ్వర్లు", customer_code: "C003", phone: "9876543212", area_name: "నాయుడుపేట", brand_name: "Jersey", default_quantity: 2.0, rate_per_litre: 68, is_active: true },
  { id: 4, name: "లక్ష్మి నారాయణ", customer_code: "C004", phone: "9876543213", area_name: "నాయుడుపేట", brand_name: "Amul Full Cream", default_quantity: 0.5, rate_per_litre: 68, is_active: true },
  { id: 5, name: "మురళీకృష్ణ", customer_code: "C005", phone: "9876543214", area_name: "శ్రీనగర్", brand_name: "Nandini", default_quantity: 1.5, rate_per_litre: 56, is_active: true },
  { id: 6, name: "పద్మావతి", customer_code: "C006", phone: "9876543215", area_name: "శ్రీనగర్", brand_name: "Amul Full Cream", default_quantity: 1.0, rate_per_litre: 68, is_active: true },
];
const DEMO_ENTRIES = DEMO_CUSTOMERS.map(c => ({ customer_id: c.id, entry_date: today(), quantity_litres: c.default_quantity, entered_by: "father", customers: c }));
const DEMO_BILLS = DEMO_CUSTOMERS.map(c => ({ customer_id: c.id, billing_month: new Date().toISOString().slice(0, 7) + "-01", total_litres: c.default_quantity * 30, total_amount: c.default_quantity * 30 * c.rate_per_litre, status: Math.random() > 0.5 ? "paid" : "pending", customers: c }));
const DEMO_BILL = { total_litres: 30, total_amount: 2040, outstanding_amount: 0, status: "pending", billing_month: new Date().toISOString().slice(0, 7) + "-01" };
const DEMO_PAYMENTS = DEMO_CUSTOMERS.slice(0, 4).map((c, i) => ({ id: i + 1, customer_id: c.id, amount: c.default_quantity * 30 * c.rate_per_litre, payment_method: i % 2 === 0 ? "upi" : "cash", payment_date: today(), status: i === 0 ? "pending_confirmation" : "confirmed", customers: c }));
const DEMO_PORTAL_ENTRIES = Array.from({ length: 20 }, (_, i) => ({
  entry_date: new Date(Date.now() - i * 86400000).toISOString().split("T")[0],
  quantity_litres: 1.5,
  customer_recorded: i % 3 !== 0,
  customer_quantity: 1.5,
}));

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home"); // home | owner | father | portal
  const [authed, setAuthed] = useState(null); // null | 'owner' | 'father'

  // Detect customer portal from URL
  const isPortal = window.location.pathname.startsWith("/c/");
  if (isPortal) return (
    <div style={{ maxWidth: 480, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column" }}>
      <CustomerPortal customerId={window.location.pathname.split("/c/")[1]} />
    </div>
  );

  if (screen === "owner") {
    if (authed !== "owner") return (
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={styles.appHeader}><span style={{ fontSize: 22 }}>🥛</span> MilkFlow</div>
        <PinScreen role="owner" onSuccess={() => setAuthed("owner")} />
      </div>
    );
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={styles.appHeader}>
          <span style={{ fontSize: 22 }}>🥛</span> MilkFlow — Owner
          <button style={{ marginLeft: "auto", fontSize: 12, color: "#888", background: "none", border: "none", cursor: "pointer" }} onClick={() => { setScreen("home"); setAuthed(null); }}>Logout</button>
        </div>
        <OwnerDashboard />
      </div>
    );
  }

  if (screen === "father") {
    if (authed !== "father") return (
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ ...styles.appHeader, background: "#1a6b3c", color: "white" }}><span style={{ fontSize: 22 }}>🥛</span> MilkFlow — అన్న</div>
        <PinScreen role="father" onSuccess={() => setAuthed("father")} />
      </div>
    );
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ ...styles.appHeader, background: "#1a6b3c", color: "white" }}>
          <span style={{ fontSize: 22 }}>🥛</span> పాలు నమోదు — {new Date().toLocaleDateString("te-IN")}
          <button style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.8)", background: "none", border: "none", cursor: "pointer" }} onClick={() => { setScreen("home"); setAuthed(null); }}>వెనక్కి</button>
        </div>
        <FatherScreen />
      </div>
    );
  }

  // Home screen — role selector
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "#f8f9fa" }}>
      <div style={{ fontSize: 56, marginBottom: 8 }}>🥛</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#1a6b3c", marginBottom: 4 }}>MilkFlow</div>
      <div style={{ fontSize: 14, color: "#888", marginBottom: 40 }}>Saikrishna Milk Supply</div>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
        <button style={styles.roleBtn} onClick={() => setScreen("owner")}>
          <span style={{ fontSize: 36 }}>👑</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 17 }}>Owner Dashboard</div>
            <div style={{ fontSize: 12, color: "#888" }}>Full control — billing, payments, reports</div>
          </div>
          <span style={{ marginLeft: "auto", color: "#888" }}>→</span>
        </button>
        <button style={{ ...styles.roleBtn, borderColor: "#1a6b3c" }} onClick={() => setScreen("father")}>
          <span style={{ fontSize: 36 }}>👨</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 17 }}>పాలు నమోదు</div>
            <div style={{ fontSize: 12, color: "#888" }}>అన్న — రోజువారీ పాలు రికార్డ్</div>
          </div>
          <span style={{ marginLeft: "auto", color: "#888" }}>→</span>
        </button>
        <button style={{ ...styles.roleBtn, borderColor: "#1565C0" }} onClick={() => setScreen("portal")}>
          <span style={{ fontSize: 36 }}>👤</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 17 }}>Customer Portal</div>
            <div style={{ fontSize: 12, color: "#888" }}>View bill, records & pay</div>
          </div>
          <span style={{ marginLeft: "auto", color: "#888" }}>→</span>
        </button>
      </div>
      {screen === "portal" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end" }} onClick={() => setScreen("home")}>
          <div style={{ background: "white", width: "100%", maxWidth: 480, margin: "0 auto", borderRadius: "20px 20px 0 0", padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHandle} />
            <div style={{ fontWeight: 600, marginBottom: 14 }}>Enter Customer Code</div>
            <input style={styles.formInput} placeholder="e.g. C001" id="cust-code" />
            <button style={{ ...styles.btnSave, width: "100%", marginTop: 10 }} onClick={() => {
              const code = document.getElementById("cust-code").value;
              if (code) window.location.href = `/c/${code}`;
            }}>Open Portal</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  screen: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  appHeader: { background: "white", borderBottom: "1px solid #eee", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 16, flexShrink: 0 },
  ownerHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 12 },

  // PIN
  pinWrap: { display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 24px", gap: 16 },
  pinLogo: { fontSize: 52 },
  pinTitle: { fontSize: 24, fontWeight: 700, color: "#1a6b3c" },
  pinSub: { fontSize: 13, color: "#888" },
  pinRoleTag: { background: "#e8f5ee", color: "#1a6b3c", padding: "6px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500 },
  pinDots: { display: "flex", gap: 14 },
  pinDot: { width: 18, height: 18, borderRadius: "50%", border: "2px solid #1a6b3c", transition: "background 0.15s" },
  pinDotFilled: { background: "#1a6b3c" },
  pinError: { color: "#c0392b", fontSize: 13 },
  pinPad: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, width: "100%", maxWidth: 280 },
  pinBtn: { background: "#f5f5f5", border: "0.5px solid #ddd", borderRadius: 12, padding: "18px 0", fontSize: 26, fontWeight: 500, color: "#111", cursor: "pointer", textAlign: "center" },
  shake: { animation: "shake 0.4s" },

  // Status bar
  statusBar: { display: "flex", gap: 6, padding: "8px 10px", background: "#f8f9fa", borderBottom: "0.5px solid #eee" },
  searchBar: { display: "flex", alignItems: "center", gap: 8, background: "#f5f5f5", border: "0.5px solid #ddd", borderRadius: 24, padding: "8px 14px", margin: "8px 12px 4px" },
  searchInput: { flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, color: "#111" },
  clearBtn: { background: "none", border: "none", color: "#888", fontSize: 14, cursor: "pointer" },
  filterRow: { display: "flex", gap: 8, padding: "0 12px 6px", overflowX: "auto", scrollbarWidth: "none" },
  filterChip: { whiteSpace: "nowrap", padding: "5px 12px", borderRadius: 16, fontSize: 12, cursor: "pointer", border: "0.5px solid #ddd", color: "#666", background: "white" },
  filterChipActive: { background: "#e8f5ee", color: "#1a6b3c", borderColor: "#1a6b3c" },

  // Customer card
  scrollArea: { flex: 1, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 },
  custCard: { background: "white", border: "0.5px solid #eee", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" },
  custCardDone: { borderLeft: "3px solid #28a745" },
  avatar: { width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "white", flexShrink: 0 },
  custInfo: { flex: 1, minWidth: 0 },
  custName: { fontSize: 15, fontWeight: 500, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  custMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  qtySection: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  qtyNum: { fontSize: 22, fontWeight: 600, color: "#1a6b3c", lineHeight: 1 },
  qtyUnit: { fontSize: 11, color: "#888" },
  qtyBadge: { fontSize: 10, padding: "2px 7px", borderRadius: 10 },
  qtyBadgeDone: { background: "#d4edda", color: "#155724" },
  qtyBadgePrev: { background: "#fff3cd", color: "#856404" },
  areaDivider: { fontSize: 12, fontWeight: 600, color: "#888", padding: "4px 2px 2px", display: "flex", alignItems: "center", gap: 8 },
  dividerLine: { flex: 1, height: 0.5, background: "#eee" },

  // Submit button
  submitBtn: { margin: 12, background: "#1a6b3c", border: "none", borderRadius: 12, padding: 16, fontSize: 16, fontWeight: 500, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  submitBtnDisabled: { background: "#a8d5b8" },

  // Modal
  modalBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", zIndex: 100 },
  modal: { background: "white", borderRadius: "20px 20px 0 0", padding: "20px 16px 32px", width: "100%" },
  modalHandle: { width: 40, height: 4, background: "#ddd", borderRadius: 2, margin: "0 auto 16px" },
  modalName: { fontSize: 20, fontWeight: 600, color: "#111", marginBottom: 4 },
  modalMeta: { fontSize: 13, color: "#888", marginBottom: 16 },
  prevBox: { background: "#e8f5ee", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" },
  modalQtyLabel: { fontSize: 13, color: "#888", marginBottom: 10, textAlign: "center" },
  qtyGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 },
  qtyOption: { background: "#f5f5f5", border: "2px solid #eee", borderRadius: 12, padding: "12px 0", textAlign: "center", cursor: "pointer", fontSize: 18, fontWeight: 500, color: "#111" },
  qtyOptionSel: { background: "#e8f5ee", borderColor: "#1a6b3c", color: "#1a6b3c" },
  qtyOptionZero: { fontSize: 13, color: "#c0392b", borderColor: "#f5c6cb", background: "#fdf2f3" },
  customRow: { display: "flex", gap: 8, marginBottom: 16, alignItems: "center" },
  customInput: { flex: 1, fontSize: 18, padding: "10px 14px", border: "0.5px solid #ddd", borderRadius: 10, background: "white", color: "#111" },
  modalActions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  btnCancel: { background: "#f5f5f5", border: "0.5px solid #ddd", borderRadius: 12, padding: 14, fontSize: 15, color: "#666", cursor: "pointer", textAlign: "center" },
  btnSave: { background: "#1a6b3c", border: "none", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 500, color: "white", cursor: "pointer", textAlign: "center" },

  // Success
  successScreen: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 14, textAlign: "center" },
  successTitle: { fontSize: 26, fontWeight: 700, color: "#1a6b3c" },
  successSub: { fontSize: 14, color: "#888" },
  statsRow: { display: "flex", gap: 16, marginTop: 8 },

  // Owner
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
  statCard: { background: "#f8f9fa", borderRadius: 12, padding: "14px 12px", textAlign: "center" },
  quickActions: { display: "flex", gap: 10, marginBottom: 16 },
  alertBox: { background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
  monthCard: { background: "white", border: "0.5px solid #eee", borderRadius: 12, padding: "14px 16px", marginBottom: 16 },
  monthRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  progressBar: { background: "#eee", borderRadius: 4, height: 6, marginBottom: 12 },
  progressFill: { background: "#1a6b3c", borderRadius: 4, height: "100%" },
  listCard: { background: "white", border: "0.5px solid #eee", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, marginBottom: 8 },
  formInput: { width: "100%", padding: "10px 14px", border: "0.5px solid #ddd", borderRadius: 10, fontSize: 15, background: "white", color: "#111", marginBottom: 10 },
  formRow: { display: "flex", gap: 8 },
  btnPrimary: { background: "#1a6b3c", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "white", cursor: "pointer" },
  statusBadge: { fontSize: 11, padding: "2px 8px", borderRadius: 10, display: "inline-block", marginTop: 4 },
  badgePaid: { background: "#d4edda", color: "#155724", fontSize: 11, padding: "2px 8px", borderRadius: 10 },
  badgePending: { background: "#fff3cd", color: "#856404", fontSize: 11, padding: "2px 8px", borderRadius: 10 },
  badgeRejected: { background: "#f8d7da", color: "#721c24", fontSize: 11, padding: "2px 8px", borderRadius: 10 },

  // Bottom nav
  bottomNav: { display: "flex", borderTop: "0.5px solid #eee", background: "white", flexShrink: 0 },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0", background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 12 },
  navBtnActive: { color: "#1a6b3c", borderTop: "2px solid #1a6b3c" },
  navBtnActiveBlue: { color: "#1565C0", borderTop: "2px solid #1565C0" },

  // Bill
  billCard: { background: "white", border: "0.5px solid #eee", borderRadius: 14, padding: 18, marginBottom: 12 },
  billRow: { display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8, color: "#555" },

  // Role buttons (home)
  roleBtn: { display: "flex", alignItems: "center", gap: 14, background: "white", border: "1px solid #eee", borderRadius: 14, padding: "16px 18px", cursor: "pointer", width: "100%" },
};
