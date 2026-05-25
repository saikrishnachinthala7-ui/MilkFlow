// MilkFlow — App.jsx — Complete v3.1 FINAL
// All 18 pending changes + 5 features from v2.0 restored + config fixes

import { useState, useEffect, useRef } from "react";
import { logo_app } from "./logoData.js";
import * as DB from "./db.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const OWNER_PIN = "1234";
const FATHER_PIN = "0000";
const BASE_URL = "https://milk-flow-beta.vercel.app";
const UPI_ID = "yadaiahchinthala07-4@okaxis";
const WA_NUMBER = "919987073536";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split("T")[0];
}
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtMonth(m, y) {
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}
function roomNum(code) {
  return code ? code.replace(/[^0-9]/g, "") || code : "";
}
function getInitials(name) {
  return name ? name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";
}

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  navy: "#1a2744",
  gold: "#c9a84c",
  white: "#ffffff",
  bg: "#f4f6fb",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  info: "#0ea5e9",
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', sans-serif", color: C.text },
  card: { background: C.card, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", padding: 16, marginBottom: 12 },
  btn: (bg = C.navy, color = C.white) => ({
    background: bg, color, border: "none", borderRadius: 8, padding: "10px 18px",
    fontWeight: 700, cursor: "pointer", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6,
  }),
  btnSm: (bg = C.navy, color = C.white) => ({
    background: bg, color, border: "none", borderRadius: 6, padding: "6px 12px",
    fontWeight: 600, cursor: "pointer", fontSize: 12,
  }),
  input: {
    width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
    fontSize: 14, boxSizing: "border-box", outline: "none",
  },
  label: { fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 4, display: "block" },
  header: {
    background: C.navy, color: C.white, padding: "12px 16px",
    display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100,
  },
  badge: (bg) => ({
    background: bg, color: C.white, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
  }),
  avatar: (size = 42) => ({
    width: size, height: size, borderRadius: "50%", background: C.gold, color: C.navy,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: size > 36 ? 15 : 12, flexShrink: 0,
  }),
  modal: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modalBox: {
    background: C.white, borderRadius: 16, padding: 24, width: "100%",
    maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
  },
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ msg, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  const bg = type === "success" ? C.success : type === "error" ? C.danger : C.warning;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: bg, color: "#fff", padding: "12px 20px", borderRadius: 10,
      fontWeight: 600, zIndex: 9999, maxWidth: 320, textAlign: "center", fontSize: 14,
    }}>{msg}</div>
  );
}
function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type = "success") => setToast({ msg, type });
  const el = toast ? <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} /> : null;
  return [show, el];
}

// ─── PIN PAD (numeric keypad like phone) ─────────────────────────────────────
function PinModal({ title, correctPin, onSuccess, onCancel }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [err, setErr] = useState("");

  function press(d) {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    if (next.length === correctPin.length) {
      setTimeout(() => {
        if (next === correctPin) {
          onSuccess();
        } else {
          setShake(true);
          setErr("Wrong PIN");
          setTimeout(() => { setPin(""); setShake(false); setErr(""); }, 700);
        }
      }, 100);
    }
  }

  function del() { setPin(p => p.slice(0, -1)); setErr(""); }

  const keys = [
    ["1","2","3"],
    ["4","5","6"],
    ["7","8","9"],
    ["","0","⌫"],
  ];

  return (
    <div style={S.modal}>
      <div style={{ ...S.modalBox, maxWidth: 320, textAlign: "center" }}>
        <img src={logo_app} alt="Logo" style={{ width: 56, height: 56, borderRadius: 12, marginBottom: 10 }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Enter your PIN to continue</div>

        {/* PIN dots */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 12, marginBottom: 8,
          animation: shake ? "shake 0.4s ease" : "none",
        }}>
          {Array.from({ length: correctPin.length }).map((_, i) => (
            <div key={i} style={{
              width: 16, height: 16, borderRadius: "50%",
              background: i < pin.length ? C.navy : C.border,
              transition: "background 0.15s",
            }} />
          ))}
        </div>

        {err && <div style={{ color: C.danger, fontSize: 13, marginBottom: 8, fontWeight: 600 }}>{err}</div>}
        {!err && <div style={{ height: 21, marginBottom: 0 }} />}

        {/* Keypad */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
          {keys.flat().map((k, i) => (
            k === "" ? <div key={i} /> :
            k === "⌫" ? (
              <button key={i} onClick={del} style={{
                background: C.border, border: "none", borderRadius: 12, padding: "16px 0",
                fontSize: 18, cursor: "pointer", fontWeight: 700, color: C.muted,
              }}>{k}</button>
            ) : (
              <button key={i} onClick={() => press(k)} style={{
                background: "#f0f4ff", border: "none", borderRadius: 12, padding: "16px 0",
                fontSize: 20, fontWeight: 700, cursor: "pointer", color: C.navy,
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
              }}>{k}</button>
            )
          ))}
        </div>

        <button onClick={onCancel} style={{ ...S.btn(C.border, C.muted), width: "100%", justifyContent: "center", marginTop: 16 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── CUSTOMER FORM MODAL ──────────────────────────────────────────────────────
function CustomerFormModal({ initial, areas, subgroups, brands, onSave, onCancel }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    code: initial?.code || "",
    name: initial?.name || "",
    phone: initial?.phone || "",
    address: initial?.address || "",
    area_id: initial?.area_id || "",
    subgroup_id: initial?.subgroup_id || "",
    brand_id: initial?.brand_id || "",
    default_qty: initial?.default_qty || 1,
    custom_rate: initial?.custom_rate || "",
    credit_limit: initial?.credit_limit || 0,
    outstanding: initial?.outstanding || 0,
  });
  const [loading, setLoading] = useState(false);
  const [codeWarning, setCodeWarning] = useState(false);

  const filteredSubs = subgroups.filter(sg => sg.area_id === form.area_id);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.code.trim()) return alert("Customer code is required");
    if (!form.name.trim()) return alert("Customer name is required");
    setLoading(true);
    try {
      if (isEdit) await DB.updateCustomer(initial.id, form);
      else await DB.addCustomer(form);
      onSave();
    } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  }

  return (
    <div style={S.modal}>
      <div style={S.modalBox}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
          {isEdit ? "✏️ Edit Customer" : "➕ Add Customer"}
        </div>

        <label style={S.label}>Customer Code / Room No. *</label>
        <input style={{ ...S.input, marginBottom: 4 }} value={form.code}
          onChange={e => { set("code", e.target.value); if (isEdit) setCodeWarning(true); }}
          placeholder="e.g. C504 or C1002 (room number)" />
        {codeWarning && (
          <div style={{ color: C.warning, fontSize: 12, marginBottom: 8, padding: "6px 10px", background: "#fef3c7", borderRadius: 6 }}>
            ⚠️ Changing code will change the customer portal link. Share new link with customer.
          </div>
        )}
        {!codeWarning && <div style={{ height: 8 }} />}

        <label style={S.label}>Full Name *</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.name}
          onChange={e => set("name", e.target.value)} placeholder="Customer full name" />

        <label style={S.label}>Phone (WhatsApp)</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.phone}
          onChange={e => set("phone", e.target.value)} placeholder="10-digit mobile number" type="tel" />

        <label style={S.label}>Group (Area / Delivery Zone)</label>
        <select style={{ ...S.input, marginBottom: 12 }} value={form.area_id}
          onChange={e => { set("area_id", e.target.value); set("subgroup_id", ""); }}>
          <option value="">-- Select Group --</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}{a.delivery_boy_name ? ` / ${a.delivery_boy_name}` : ""}</option>)}
        </select>

        <label style={S.label}>Subgroup (Building / Wing)</label>
        <select style={{ ...S.input, marginBottom: 12 }} value={form.subgroup_id}
          onChange={e => set("subgroup_id", e.target.value)} disabled={!form.area_id}>
          <option value="">-- Select Subgroup --</option>
          {filteredSubs.map(sg => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
        </select>

        <label style={S.label}>Address / Notes</label>
        <input style={{ ...S.input, marginBottom: 12 }} value={form.address}
          onChange={e => set("address", e.target.value)} placeholder="Flat/building details" />

        <label style={S.label}>Default Milk Brand</label>
        <select style={{ ...S.input, marginBottom: 12 }} value={form.brand_id}
          onChange={e => set("brand_id", e.target.value)}>
          <option value="">-- Select Brand --</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name} (₹{b.rate}/L)</option>)}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={S.label}>Default Qty (Litres/day)</label>
            <input style={S.input} type="number" step="0.5" value={form.default_qty}
              onChange={e => set("default_qty", e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Custom Rate (₹/L)</label>
            <input style={S.input} type="number" value={form.custom_rate}
              onChange={e => set("custom_rate", e.target.value)} placeholder="Leave blank = brand rate" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={S.label}>Credit Limit (₹)</label>
            <input style={S.input} type="number" value={form.credit_limit}
              onChange={e => set("credit_limit", e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Opening Balance (₹)</label>
            <input style={S.input} type="number" value={form.outstanding}
              onChange={e => set("outstanding", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button style={S.btn(C.muted)} onClick={onCancel}>Cancel</button>
          <button style={S.btn(C.navy)} onClick={save} disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WHATSAPP HELPERS ─────────────────────────────────────────────────────────
function waLink(phone, message) {
  const clean = phone.replace(/\D/g, "");
  const num = clean.startsWith("91") ? clean : `91${clean}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

function billWAMessage(customer, bill) {
  const portalLink = `${BASE_URL}/c/${customer.code}`;
  const month = fmtMonth(bill.month, bill.year);
  return `🥛 Saikrishna Milk Supply
Dear ${customer.name},

Your ${month} milk bill is now ready.
📋 Total Milk Supplied: ${bill.total_litres} Litres
💰 Total Amount Due: ₹${bill.total_amount}

👉 View your dashboard: ${portalLink}

From your dashboard you can:
• Record your daily milk from now onwards
• View your detailed day-wise bill
• Pay bills directly through the portal

We are happy to introduce this new digital system to provide you with better service, transparency, and convenience.

Thank you for your continued trust and support 🙏

UPI: ${UPI_ID}
After paying, please share payment screenshot on WhatsApp to confirm ✅`;
}

// ─── TTS ─────────────────────────────────────────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEV SCREEN (/)
// ═══════════════════════════════════════════════════════════════════════════════
function DevScreen() {
  const [portalCode, setPortalCode] = useState("");
  return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 24 }}>
      <img src={logo_app} alt="Logo" style={{ width: 84, height: 84, borderRadius: 18, marginBottom: 16, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }} />
      <div style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 2 }}>MilkFlow</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 36 }}>Saikrishna Milk Supply</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
        <a href="/owner" style={{ textDecoration: "none" }}>
          <button style={{ ...S.btn(C.navy), width: "100%", justifyContent: "center", padding: "16px 18px", fontSize: 16 }}>
            👑 Owner Portal
          </button>
        </a>
        <a href="/entry" style={{ textDecoration: "none" }}>
          <button style={{ ...S.btn(C.gold, C.navy), width: "100%", justifyContent: "center", padding: "16px 18px", fontSize: 16 }}>
            📦 Owner's Register
          </button>
        </a>

        <div style={{ ...S.card, marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: C.navy }}>🔗 Test Customer Portal</div>
          <input style={{ ...S.input, marginBottom: 8 }} value={portalCode}
            onChange={e => setPortalCode(e.target.value)}
            placeholder="Enter customer code e.g. C504" />
          <button style={{ ...S.btn(C.info), width: "100%", justifyContent: "center" }}
            onClick={() => { if (portalCode.trim()) window.location.href = `/c/${portalCode.trim()}`; }}>
            Open Portal
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OWNER PORTAL (/owner)
// ═══════════════════════════════════════════════════════════════════════════════
function OwnerPortal() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [show, toast] = useToast();

  if (!authed) return (
    <PinModal title="Owner Login" correctPin={OWNER_PIN}
      onSuccess={() => setAuthed(true)} onCancel={() => window.location.href = "/"} />
  );

  const tabs = [
    { id: "dashboard", label: "📊", title: "Dashboard" },
    { id: "customers", label: "👥", title: "Customers" },
    { id: "entry", label: "📝", title: "Entries" },
    { id: "bills", label: "🧾", title: "Bills" },
    { id: "payments", label: "💰", title: "Payments" },
    { id: "reports", label: "📈", title: "Reports" },
    { id: "settings", label: "⚙️", title: "Settings" },
  ];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <img src={logo_app} alt="Logo" style={{ width: 32, height: 32, borderRadius: 6 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Saikrishna Milk Supply</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Owner Portal</div>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, background: C.white, overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, minWidth: 48, padding: "10px 2px", border: "none", background: "none",
            cursor: "pointer", fontSize: 17, borderBottom: tab === t.id ? `3px solid ${C.navy}` : "3px solid transparent",
            color: tab === t.id ? C.navy : C.muted,
          }} title={t.title}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {tab === "dashboard" && <OwnerDashboard show={show} />}
        {tab === "customers" && <OwnerCustomers show={show} />}
        {tab === "entry" && <OwnerEntry show={show} />}
        {tab === "bills" && <OwnerBills show={show} />}
        {tab === "payments" && <OwnerPayments show={show} />}
        {tab === "reports" && <OwnerReports show={show} />}
        {tab === "settings" && <OwnerSettings show={show} />}
      </div>
      {toast}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function OwnerDashboard({ show }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [customers, entries, payments, bills] = await Promise.all([
        DB.getActiveCustomers(), DB.getDailyEntries(today()),
        DB.getPendingPayments(), DB.getBills(),
      ]);
      const totalActual = entries.reduce((s, e) => s + (e.quantity || 0), 0);
      const totalDefault = customers.reduce((s, c) => s + (c.default_qty || 0), 0);
      const isActual = entries.length > 0;
      const pendingAmt = payments.reduce((s, p) => s + (p.amount || 0), 0);
      const unpaidBills = bills.filter(b => b.status === "unpaid" || b.status === "partial");
      const totalDue = unpaidBills.reduce((s, b) => s + (b.total_amount || 0), 0);
      setData({ customers, entries, payments, totalActual, totalDefault, isActual, pendingAmt, totalDue });
    } catch (e) { show("Failed to load dashboard", "error"); }
    setLoading(false);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading...</div>;
  if (!data) return null;

  const Stat = ({ label, value, color, sub }) => (
    <div style={{ ...S.card, textAlign: "center", flex: 1, marginBottom: 0 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || C.navy }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.warning, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>📅 {fmtDate(today())}</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <Stat label="Active Customers" value={data.customers.length} color={C.navy} />
        <Stat label="Milk Today"
          value={`${data.isActual ? data.totalActual : data.totalDefault}L`}
          color={C.success}
          sub={data.isActual ? "✅ Actual delivered" : "📋 Planned (no entries yet)"} />
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <Stat label="Pending Payments" value={`₹${data.pendingAmt}`} color={C.warning} />
        <Stat label="Total Outstanding" value={`₹${data.totalDue}`} color={C.danger} />
      </div>

      {data.payments.length > 0 && (
        <div style={S.card}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>⏳ Pending Confirmations</div>
          {data.payments.slice(0, 3).map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13 }}>{p.customers?.name}</span>
              <span style={{ fontWeight: 700, color: C.warning }}>₹{p.amount}</span>
            </div>
          ))}
        </div>
      )}

      {/* Inactive customers alert */}
      <InactiveCustomersAlert customers={data.customers} entries={data.entries} />
    </div>
  );
}

function InactiveCustomersAlert({ customers, entries }) {
  const [inactive, setInactive] = useState([]);

  useEffect(() => {
    async function check() {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoff = sevenDaysAgo.toISOString().split("T")[0];
      const inactiveList = [];
      for (const c of customers) {
        try {
          const recent = await DB.getDailyEntriesForCustomer(c.id);
          const hasRecent = recent.some(e => e.entry_date >= cutoff);
          if (!hasRecent) inactiveList.push(c);
        } catch {}
      }
      setInactive(inactiveList);
    }
    if (customers.length > 0) check();
  }, [customers]);

  if (inactive.length === 0) return null;

  return (
    <div style={{ ...S.card, background: "#fff8ed", border: `1px solid ${C.warning}` }}>
      <div style={{ fontWeight: 700, color: C.warning, marginBottom: 8 }}>
        ⚠️ {inactive.length} Customer(s) — No Delivery in 7+ Days
      </div>
      {inactive.map(c => (
        <div key={c.id} style={{ fontSize: 13, padding: "4px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
          <span>{c.name}</span>
          <span style={{ color: C.muted }}>{c.code}</span>
        </div>
      ))}
    </div>
  );
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
function OwnerCustomers({ show }) {
  const [customers, setCustomers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [showPin, setShowPin] = useState(false);
  const [pinAction, setPinAction] = useState(null);
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [c, a, sg, b] = await Promise.all([DB.getCustomers(), DB.getAreas(), DB.getSubgroups(), DB.getBrands()]);
      setCustomers(c); setAreas(a); setSubgroups(sg); setBrands(b);
    } catch (e) { show("Failed to load", "error"); }
    setLoading(false);
  }

  function triggerDelete(customer, type) {
    setPinAction(() => async () => {
      try {
        if (type === "deactivate") await DB.deactivateCustomer(customer.id);
        else await DB.deleteCustomer(customer.id);
        show(`Customer ${type === "deactivate" ? "deactivated" : "deleted"}`, "success");
        load();
      } catch (e) { show("Error: " + e.message, "error"); }
    });
    setShowPin(true);
  }

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = {};
  filtered.forEach(c => {
    const aKey = c.area_id || "none";
    const aLabel = c.areas?.name || "No Group";
    const sgKey = c.subgroup_id || "none";
    const sgLabel = c.subgroups?.name || "No Subgroup";
    if (!grouped[aKey]) grouped[aKey] = { label: aLabel, subs: {} };
    if (!grouped[aKey].subs[sgKey]) grouped[aKey].subs[sgKey] = { label: sgLabel, customers: [] };
    grouped[aKey].subs[sgKey].customers.push(c);
  });

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button style={S.btn(C.navy)} onClick={() => { setEditCustomer(null); setShowForm(true); }}>➕ Add Customer</button>
        <button style={S.btn(C.gold, C.navy)} onClick={() => setShowImport(true)}>📥 Import Excel</button>
      </div>

      <input style={{ ...S.input, marginBottom: 12 }} value={search}
        onChange={e => setSearch(e.target.value)} placeholder="🔍 Search by name or code..." />

      {customers.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 40 }}>No customers yet.</div>
      ) : (
        Object.entries(grouped).map(([aKey, group]) => (
          <div key={aKey} style={{ marginBottom: 16 }}>
            <div style={{ background: C.navy, color: C.white, padding: "9px 14px", borderRadius: "8px 8px 0 0", fontWeight: 800, fontSize: 15 }}>
              📍 {group.label}
            </div>
            {Object.entries(group.subs).map(([sgKey, sub]) => (
              <div key={sgKey} style={{ border: `1px solid ${C.border}`, borderTop: "none" }}>
                <div style={{ background: "#f0f4ff", padding: "7px 14px", fontWeight: 700, fontSize: 14, color: C.navy, borderBottom: `1px solid ${C.border}` }}>
                  🏢 {sub.label}
                </div>
                {sub.customers.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: c.active ? C.white : "#fff5f5" }}>
                    <div style={S.avatar(40)}>{roomNum(c.code) || getInitials(c.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>{c.code} · {c.phone}</div>
                      {!c.active && <span style={S.badge(C.danger)}>Inactive</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button style={S.btnSm(C.info)} title="Send WhatsApp" onClick={() => {
                        window.open(waLink(c.phone, `Hi ${c.name}, your MilkFlow portal: ${BASE_URL}/c/${c.code}`), "_blank");
                      }}>💬</button>
                      <button style={S.btnSm(C.gold, C.navy)} title="Edit" onClick={() => { setEditCustomer(c); setShowForm(true); }}>✏️</button>
                      <button style={S.btnSm(C.warning)} title="Deactivate" onClick={() => triggerDelete(c, "deactivate")}>⏸</button>
                      <button style={S.btnSm(C.danger)} title="Delete" onClick={() => triggerDelete(c, "delete")}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))
      )}

      {showForm && (
        <CustomerFormModal initial={editCustomer} areas={areas} subgroups={subgroups} brands={brands}
          onSave={() => { setShowForm(false); setEditCustomer(null); load(); show("Customer saved!"); }}
          onCancel={() => { setShowForm(false); setEditCustomer(null); }} />
      )}

      {showPin && (
        <PinModal title="Confirm Action" correctPin={OWNER_PIN}
          onSuccess={() => { setShowPin(false); pinAction && pinAction(); }}
          onCancel={() => setShowPin(false)} />
      )}

      {showImport && (
        <ImportModal areas={areas} subgroups={subgroups} brands={brands}
          onDone={() => { setShowImport(false); load(); }}
          onCancel={() => setShowImport(false)} show={show} />
      )}
    </div>
  );
}

// ─── BULK IMPORT ──────────────────────────────────────────────────────────────
function ImportModal({ areas, subgroups, brands, onDone, onCancel, show }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const COLS = ["code","name","phone","address","group_name","subgroup_name","brand_name","qty","rate","opening_balance"];

  function downloadTemplate() {
    const csv = COLS.join(",") + "\n" +
      "C504,John Doe,9876543210,Flat 504,JB Nagar,Sumit A Wing,Amul Full Cream,1,68,0\n" +
      "C505,Jane Smith,9876543211,Flat 505,JB Nagar,Sumit A Wing,Nandini,1.5,56,200";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "milkflow_import_template.csv";
    a.click();
  }

  function parseCSV(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).map(line => {
      const vals = line.split(",");
      const row = {};
      headers.forEach((h, i) => row[h] = vals[i]?.trim() || "");
      return row;
    });
  }

  function handleFile(e) {
    const f = e.target.files[0]; if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(parseCSV(ev.target.result).slice(0, 5));
    reader.readAsText(f);
  }

  async function doImport() {
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      const rows = parseCSV(ev.target.result);
      const res = await DB.bulkImportCustomers(rows, brands, [...areas], [...subgroups]);
      setResult(res);
      setLoading(false);
      if (res.success > 0) show(`Imported ${res.success} customers`, "success");
    };
    reader.readAsText(file);
  }

  return (
    <div style={S.modal}>
      <div style={S.modalBox}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>📥 Bulk Import Customers</div>
        <div style={{ background: "#f0f4ff", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13 }}>
          <strong>CSV Columns:</strong>
          <div style={{ fontFamily: "monospace", fontSize: 11, marginTop: 4, color: C.muted, wordBreak: "break-all" }}>{COLS.join(" | ")}</div>
          <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}>
            • <strong>group_name</strong> and <strong>subgroup_name</strong> auto-created if not found<br />
            • <strong>brand_name</strong> must match exactly<br />
            • <strong>opening_balance</strong> = previous outstanding
          </div>
        </div>
        <button style={{ ...S.btn(C.gold, C.navy), marginBottom: 12 }} onClick={downloadTemplate}>⬇️ Download Template</button>
        <input type="file" accept=".csv" onChange={handleFile} style={{ marginBottom: 12, display: "block" }} />
        {preview.length > 0 && (
          <div style={{ marginBottom: 12, overflowX: "auto" }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Preview (first 5 rows):</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead><tr>{Object.keys(preview[0]).map(k => <th key={k} style={{ padding: "4px 6px", background: C.navy, color: C.white, textAlign: "left" }}>{k}</th>)}</tr></thead>
              <tbody>{preview.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j} style={{ padding: "4px 6px", borderBottom: `1px solid ${C.border}` }}>{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
        {result && (
          <div style={{ background: result.failed > 0 ? "#fff5f5" : "#f0fff4", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>✅ {result.success} imported &nbsp; ❌ {result.failed} failed</div>
            {result.errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: C.danger }}>{e}</div>)}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button style={S.btn(C.muted)} onClick={onCancel}>Close</button>
          {!result && <button style={S.btn(C.navy)} onClick={doImport} disabled={!file || loading}>{loading ? "Importing..." : "Import"}</button>}
          {result && <button style={S.btn(C.success)} onClick={onDone}>Done</button>}
        </div>
      </div>
    </div>
  );
}

// ─── OWNER ENTRY ──────────────────────────────────────────────────────────────
function OwnerEntry({ show }) {
  const [customers, setCustomers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [brands, setBrands] = useState([]);
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [date]);

  async function load() {
    setLoading(true);
    try {
      const [c, e, b] = await Promise.all([DB.getActiveCustomers(), DB.getDailyEntries(date), DB.getBrands()]);
      setCustomers(c); setEntries(e); setBrands(b);
    } catch { show("Failed to load", "error"); }
    setLoading(false);
  }

  const entryMap = {};
  entries.forEach(e => { entryMap[e.customer_id] = e; });

  async function saveEntry(customer, qty) {
    const brand = brands.find(b => b.id === customer.brand_id) || brands[0];
    if (!brand) return;
    const rate = customer.custom_rate || brand.rate;
    try {
      await DB.upsertDailyEntry({ customer_id: customer.id, entry_date: date, brand_id: brand.id, quantity: qty, rate });
      show("Entry saved", "success"); load();
    } catch (e) { show("Error: " + e.message, "error"); }
  }

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...S.input, flex: 1, width: "auto" }} />
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>{entries.length} of {customers.length} entries recorded</div>
      {customers.map(c => {
        const entry = entryMap[c.id];
        const brand = brands.find(b => b.id === c.brand_id);
        return (
          <div key={c.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={S.avatar(38)}>{roomNum(c.code) || getInitials(c.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{c.code} · {brand?.name || "No brand"}</div>
            </div>
            <EntryQtyControl defaultQty={c.default_qty || 1} savedQty={entry?.quantity} onSave={qty => saveEntry(c, qty)} />
          </div>
        );
      })}
    </div>
  );
}

function EntryQtyControl({ defaultQty, savedQty, onSave }) {
  const [qty, setQty] = useState(savedQty ?? defaultQty);
  const [dirty, setDirty] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button style={S.btnSm(C.border, C.text)} onClick={() => { setQty(q => Math.max(0, +(q - 0.5).toFixed(1))); setDirty(true); }}>−</button>
      <span style={{ fontWeight: 800, minWidth: 34, textAlign: "center" }}>{qty}L</span>
      <button style={S.btnSm(C.border, C.text)} onClick={() => { setQty(q => +(q + 0.5).toFixed(1)); setDirty(true); }}>+</button>
      {dirty && <button style={S.btnSm(C.success)} onClick={() => { onSave(qty); setDirty(false); }}>✓</button>}
      {savedQty !== undefined && !dirty && <span style={{ fontSize: 11, color: C.success }}>✅</span>}
    </div>
  );
}

// ─── BILLS ────────────────────────────────────────────────────────────────────
function OwnerBills({ show }) {
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genModal, setGenModal] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [c, b] = await Promise.all([DB.getActiveCustomers(), DB.getBills()]);
      setCustomers(c); setBills(b);
    } catch { show("Failed to load", "error"); }
    setLoading(false);
  }

  async function generateBill(customer) {
    try {
      const entries = await DB.getMonthEntries(customer.id, month, year);
      if (entries.length === 0) return;
      const totalLitres = entries.reduce((s, e) => s + e.quantity, 0);
      const monthAmt = entries.reduce((s, e) => s + e.amount, 0);
      const billNum = `BILL-${customer.code}-${year}${String(month).padStart(2, "0")}`;
      if (bills.find(b => b.bill_number === billNum)) return;
      await DB.createBill({
        bill_number: billNum, customer_id: customer.id, month, year,
        period_from: `${year}-${String(month).padStart(2, "0")}-01`,
        period_to: `${year}-${String(month).padStart(2, "0")}-31`,
        total_litres: totalLitres, month_amount: monthAmt,
        outstanding: customer.outstanding || 0,
        total_amount: monthAmt + (customer.outstanding || 0),
        status: "unpaid",
      });
    } catch {}
  }

  async function bulkSendWA() {
    const monthBills = bills.filter(b => b.month === month && b.year === year);
    if (monthBills.length === 0) { show("No bills for selected month", "warning"); return; }
    setBulkSending(true);
    for (let i = 0; i < monthBills.length; i++) {
      const bill = monthBills[i];
      const customer = customers.find(c => c.id === bill.customer_id);
      if (!customer?.phone) continue;
      setTimeout(() => window.open(waLink(customer.phone, billWAMessage(customer, bill)), "_blank"), i * 2500);
    }
    setTimeout(() => { setBulkSending(false); show(`${monthBills.length} bills sent!`, "success"); }, monthBills.length * 2500 + 500);
  }

  const monthBills = bills.filter(b => b.month === month && b.year === year);
  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <select style={{ ...S.input, width: "auto" }} value={month} onChange={e => setMonth(+e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("en-IN", { month: "long" })}</option>)}
        </select>
        <select style={{ ...S.input, width: "auto" }} value={year} onChange={e => setYear(+e.target.value)}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button style={S.btn(C.gold, C.navy)} onClick={() => setGenModal(true)}>⚡ Generate Bills</button>
        <button style={S.btn(C.success)} onClick={bulkSendWA} disabled={bulkSending}>
          {bulkSending ? "Sending..." : "📲 Bulk WhatsApp"}
        </button>
      </div>

      {monthBills.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 32 }}>No bills for {fmtMonth(month, year)}.</div>
      ) : monthBills.map(bill => {
        const customer = customers.find(c => c.id === bill.customer_id);
        return (
          <div key={bill.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{customer?.name || "Unknown"}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{bill.bill_number}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{bill.total_litres}L · <strong>₹{bill.total_amount}</strong></div>
              </div>
              <div style={{ display: "flex", gap: 6, flexDirection: "column", alignItems: "flex-end" }}>
                <span style={S.badge(bill.status === "paid" ? C.success : bill.status === "partial" ? C.warning : C.danger)}>{bill.status}</span>
                {customer?.phone && (
                  <button style={S.btnSm(C.success)} onClick={() => window.open(waLink(customer.phone, billWAMessage(customer, bill)), "_blank")}>
                    💬 Send
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {genModal && (
        <div style={S.modal}>
          <div style={S.modalBox}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>⚡ Generate Bills — {fmtMonth(month, year)}</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Generates bills for all active customers. Customers with no entries will be skipped.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={S.btn(C.muted)} onClick={() => setGenModal(false)}>Cancel</button>
              <button style={S.btn(C.navy)} onClick={async () => {
                setGenModal(false);
                for (const c of customers) await generateBill(c);
                load(); show("Bills generated!", "success");
              }}>Generate All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────
function OwnerPayments({ show }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setPayments(await DB.getPendingPayments()); } catch { show("Failed to load", "error"); }
    setLoading(false);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 12 }}>⏳ Pending Confirmations ({payments.length})</div>
      {payments.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 32 }}>No pending payments 🎉</div>
      ) : payments.map(p => (
        <div key={p.id} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{p.customers?.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{fmtDate(p.payment_date)} · {p.payment_method}</div>
              {p.transaction_ref && <div style={{ fontSize: 12 }}>TxnRef: ...{p.transaction_ref}</div>}
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.success }}>₹{p.amount}</div>
          </div>
          {p.screenshot_url && <a href={p.screenshot_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.info }}>📷 View Screenshot</a>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={{ ...S.btn(C.success), flex: 1, justifyContent: "center" }} onClick={async () => { await DB.updatePayment(p.id, "confirmed"); show("Confirmed!", "success"); load(); }}>✅ Confirm</button>
            <button style={{ ...S.btn(C.danger), flex: 1, justifyContent: "center" }} onClick={async () => { await DB.updatePayment(p.id, "rejected"); show("Rejected", "warning"); load(); }}>❌ Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── REPORTS ─────────────────────────────────────────────────────────────────
function OwnerReports({ show }) {
  const [customers, setCustomers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [bills, setBills] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => { load(); }, [month, year]);

  async function load() {
    setLoading(true);
    try {
      const [c, b, bi, e] = await Promise.all([
        DB.getActiveCustomers(), DB.getBrands(), DB.getBills(), DB.getDailyEntries(today()),
      ]);
      setCustomers(c); setBrands(b); setBills(bi); setEntries(e);
    } catch { show("Failed", "error"); }
    setLoading(false);
  }

  // Procurement by brand — actual today or planned
  const procurementByBrand = {};
  brands.forEach(b => { procurementByBrand[b.id] = { name: b.name, rate: b.rate, actual: 0, planned: 0 }; });
  entries.forEach(e => { if (procurementByBrand[e.brand_id]) procurementByBrand[e.brand_id].actual += e.quantity; });
  customers.forEach(c => { if (procurementByBrand[c.brand_id]) procurementByBrand[c.brand_id].planned += c.default_qty || 0; });
  const isActual = entries.length > 0;

  // Payment reminders for this month
  const monthBills = bills.filter(b => b.month === month && b.year === year);
  const unpaid = monthBills.filter(b => b.status === "unpaid" || b.status === "partial");
  const today_ = new Date();
  const dayOfMonth = today_.getDate();

  function reminderLevel(days) {
    if (days >= 20) return { label: "🔴 Final Notice", color: C.danger };
    if (days >= 15) return { label: "🟠 Firm Reminder", color: C.warning };
    if (days >= 10) return { label: "🟡 Gentle Reminder", color: C.gold };
    return null;
  }

  // Export CSV
  function exportCSV() {
    const rows = [["Code","Name","Phone","Group","Subgroup","Brand","Default Qty","Outstanding"]];
    customers.forEach(c => {
      rows.push([
        c.code, c.name, c.phone,
        c.areas?.name || "", c.subgroups?.name || "",
        c.milk_brands?.name || "", c.default_qty, c.outstanding || 0,
      ]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `milkflow_customers_${today()}.csv`;
    a.click();
  }

  function supplierWAMessage() {
    const lines = Object.values(procurementByBrand)
      .filter(b => (isActual ? b.actual : b.planned) > 0)
      .map(b => `• ${b.name}: ${isActual ? b.actual : b.planned}L`);
    return `🥛 Saikrishna Milk Supply\nMilk Order for ${fmtDate(today())}\n\n${lines.join("\n")}\n\n${isActual ? "✅ Actual delivered quantities" : "📋 Planned quantities"}`;
  }

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>;

  return (
    <div>
      {/* Procurement */}
      <div style={S.card}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>🥛 Today's Procurement Estimate</div>
        <div style={{ fontSize: 12, color: isActual ? C.success : C.warning, marginBottom: 12 }}>
          {isActual ? "✅ Showing actual delivered quantities" : "📋 Showing planned quantities (no entries yet today)"}
        </div>
        {Object.values(procurementByBrand).map(b => {
          const qty = isActual ? b.actual : b.planned;
          if (qty === 0) return null;
          return (
            <div key={b.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontWeight: 600 }}>{b.name}</span>
              <span style={{ fontWeight: 700 }}>{qty}L &nbsp;<span style={{ color: C.muted, fontWeight: 400 }}>₹{(qty * b.rate).toFixed(0)}</span></span>
            </div>
          );
        })}
        <button style={{ ...S.btn(C.success), marginTop: 12, width: "100%", justifyContent: "center" }}
          onClick={() => window.open(waLink(WA_NUMBER, supplierWAMessage()), "_blank")}>
          📲 Send Order to Supplier via WhatsApp
        </button>
      </div>

      {/* Payment Reminders */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>⏰ Payment Reminders</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select style={{ ...S.input, width: "auto", fontSize: 12 }} value={month} onChange={e => setMonth(+e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("en-IN", { month: "short" })}</option>)}
            </select>
            <select style={{ ...S.input, width: "auto", fontSize: 12 }} value={year} onChange={e => setYear(+e.target.value)}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {unpaid.length === 0 ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 16 }}>All bills paid for this month 🎉</div>
        ) : unpaid.map(bill => {
          const customer = customers.find(c => c.id === bill.customer_id);
          if (!customer) return null;
          const level = reminderLevel(dayOfMonth);
          const reminderMsg = `🥛 Saikrishna Milk Supply\nDear ${customer.name},\n\nThis is a reminder for your ${fmtMonth(bill.month, bill.year)} milk bill.\n💰 Amount Due: ₹${bill.total_amount}\n\n👉 Pay via UPI: ${UPI_ID}\n\nView your bill: ${BASE_URL}/c/${customer.code}\n\nPlease clear your dues at the earliest. Thank you 🙏`;
          return (
            <div key={bill.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{customer.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{customer.code}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: C.danger }}>₹{bill.total_amount}</div>
                  {level && <div style={{ fontSize: 11, color: level.color, fontWeight: 700 }}>{level.label}</div>}
                </div>
              </div>
              {customer.phone && (
                <button style={{ ...S.btnSm(C.success), width: "100%" }}
                  onClick={() => window.open(waLink(customer.phone, reminderMsg), "_blank")}>
                  💬 Send Reminder via WhatsApp
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Export */}
      <div style={S.card}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>📤 Export Data</div>
        <button style={{ ...S.btn(C.navy), width: "100%", justifyContent: "center" }} onClick={exportCSV}>
          ⬇️ Export Customer List (CSV)
        </button>
      </div>
    </div>
  );
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function OwnerSettings({ show }) {
  const [tab, setTab] = useState("groups");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[{ id: "groups", label: "📍 Groups" }, { id: "brands", label: "🥛 Brands" }].map(t => (
          <button key={t.id} style={S.btn(tab === t.id ? C.navy : C.border, tab === t.id ? C.white : C.text)}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === "groups" && <GroupsManager show={show} />}
      {tab === "brands" && <BrandsManager show={show} />}
    </div>
  );
}

function GroupsManager({ show }) {
  const [areas, setAreas] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGroup, setNewGroup] = useState({ name: "", delivery_boy_name: "" });
  const [newSg, setNewSg] = useState({ area_id: "", name: "" });
  const [editGroup, setEditGroup] = useState(null);
  const [editSg, setEditSg] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { const [a, sg] = await Promise.all([DB.getAreas(), DB.getSubgroups()]); setAreas(a); setSubgroups(sg); }
    catch { show("Failed", "error"); }
    setLoading(false);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div style={S.card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>➕ Add Group</div>
        <input style={{ ...S.input, marginBottom: 8 }} placeholder="Group name (e.g. JB Nagar)"
          value={newGroup.name} onChange={e => setNewGroup(g => ({ ...g, name: e.target.value }))} />
        <input style={{ ...S.input, marginBottom: 8 }} placeholder="Delivery boy name (optional)"
          value={newGroup.delivery_boy_name} onChange={e => setNewGroup(g => ({ ...g, delivery_boy_name: e.target.value }))} />
        <button style={S.btn(C.navy)} onClick={async () => {
          if (!newGroup.name.trim()) return;
          await DB.addArea(newGroup.name, newGroup.delivery_boy_name);
          setNewGroup({ name: "", delivery_boy_name: "" }); load(); show("Group added");
        }}>Add Group</button>
      </div>

      <div style={S.card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>➕ Add Subgroup / Building</div>
        <select style={{ ...S.input, marginBottom: 8 }} value={newSg.area_id}
          onChange={e => setNewSg(sg => ({ ...sg, area_id: e.target.value }))}>
          <option value="">-- Select Group --</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input style={{ ...S.input, marginBottom: 8 }} placeholder="Subgroup name (e.g. Sumit A Wing)"
          value={newSg.name} onChange={e => setNewSg(sg => ({ ...sg, name: e.target.value }))} />
        <button style={S.btn(C.navy)} onClick={async () => {
          if (!newSg.area_id || !newSg.name.trim()) return;
          await DB.addSubgroup(newSg.area_id, newSg.name);
          setNewSg({ area_id: "", name: "" }); load(); show("Subgroup added");
        }}>Add Subgroup</button>
      </div>

      {areas.map(area => {
        const areaSgs = subgroups.filter(sg => sg.area_id === area.id);
        return (
          <div key={area.id} style={{ marginBottom: 12 }}>
            <div style={{ background: C.navy, color: C.white, padding: "9px 14px", borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: 15 }}>📍 {area.name}</span>
                {area.delivery_boy_name && <span style={{ fontSize: 13, opacity: 0.8 }}> / {area.delivery_boy_name}</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={S.btnSm(C.gold, C.navy)} onClick={() => setEditGroup(area)}>✏️</button>
                <button style={S.btnSm(C.danger)} onClick={async () => {
                  if (!confirm("Delete group? All subgroups will also be deleted.")) return;
                  await DB.deleteArea(area.id); load(); show("Deleted");
                }}>🗑</button>
              </div>
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderTop: "none", borderRadius: "0 0 8px 8px" }}>
              {areaSgs.length === 0
                ? <div style={{ padding: "10px 14px", fontSize: 13, color: C.muted }}>No subgroups yet</div>
                : areaSgs.map(sg => (
                  <div key={sg.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>🏢 {sg.name}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={S.btnSm(C.gold, C.navy)} onClick={() => setEditSg(sg)}>✏️</button>
                      <button style={S.btnSm(C.danger)} onClick={async () => {
                        if (!confirm("Delete subgroup?")) return;
                        await DB.deleteSubgroup(sg.id); load(); show("Deleted");
                      }}>🗑</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })}

      {editGroup && (
        <div style={S.modal}>
          <div style={{ ...S.modalBox, maxWidth: 360 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>✏️ Edit Group</div>
            <input style={{ ...S.input, marginBottom: 8 }} value={editGroup.name} onChange={e => setEditGroup(g => ({ ...g, name: e.target.value }))} />
            <input style={{ ...S.input, marginBottom: 12 }} value={editGroup.delivery_boy_name || ""} onChange={e => setEditGroup(g => ({ ...g, delivery_boy_name: e.target.value }))} placeholder="Delivery boy name" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={S.btn(C.muted)} onClick={() => setEditGroup(null)}>Cancel</button>
              <button style={S.btn(C.navy)} onClick={async () => { await DB.updateArea(editGroup.id, editGroup.name, editGroup.delivery_boy_name); setEditGroup(null); load(); show("Updated"); }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {editSg && (
        <div style={S.modal}>
          <div style={{ ...S.modalBox, maxWidth: 360 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>✏️ Edit Subgroup</div>
            <input style={{ ...S.input, marginBottom: 12 }} value={editSg.name} onChange={e => setEditSg(sg => ({ ...sg, name: e.target.value }))} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={S.btn(C.muted)} onClick={() => setEditSg(null)}>Cancel</button>
              <button style={S.btn(C.navy)} onClick={async () => { await DB.updateSubgroup(editSg.id, editSg.name); setEditSg(null); load(); show("Updated"); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BrandsManager({ show }) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBrand, setNewBrand] = useState({ name: "", rate: "" });
  const [editBrand, setEditBrand] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { setBrands(await DB.getAllBrands()); } catch { show("Failed", "error"); }
    setLoading(false);
  }

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>;

  return (
    <div>
      <div style={S.card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>➕ Add Brand</div>
        <input style={{ ...S.input, marginBottom: 8 }} placeholder="Brand name" value={newBrand.name} onChange={e => setNewBrand(b => ({ ...b, name: e.target.value }))} />
        <input style={{ ...S.input, marginBottom: 8 }} placeholder="Rate (₹/L)" type="number" value={newBrand.rate} onChange={e => setNewBrand(b => ({ ...b, rate: e.target.value }))} />
        <button style={S.btn(C.navy)} onClick={async () => {
          if (!newBrand.name || !newBrand.rate) return;
          await DB.addBrand(newBrand.name, parseFloat(newBrand.rate));
          setNewBrand({ name: "", rate: "" }); load(); show("Brand added");
        }}>Add Brand</button>
      </div>
      {brands.map(b => (
        <div key={b.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontWeight: 700 }}>{b.name}</div><div style={{ fontSize: 13, color: C.muted }}>₹{b.rate}/L</div></div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={S.btnSm(C.gold, C.navy)} onClick={() => setEditBrand(b)}>✏️</button>
            <button style={S.btnSm(C.danger)} onClick={async () => { if (!confirm("Delete brand?")) return; await DB.deleteBrand(b.id); load(); show("Deleted"); }}>🗑</button>
          </div>
        </div>
      ))}
      {editBrand && (
        <div style={S.modal}>
          <div style={{ ...S.modalBox, maxWidth: 360 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>✏️ Edit Brand</div>
            <input style={{ ...S.input, marginBottom: 8 }} value={editBrand.name} onChange={e => setEditBrand(b => ({ ...b, name: e.target.value }))} />
            <input style={{ ...S.input, marginBottom: 12 }} type="number" value={editBrand.rate} onChange={e => setEditBrand(b => ({ ...b, rate: e.target.value }))} placeholder="Rate ₹/L" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={S.btn(C.muted)} onClick={() => setEditBrand(null)}>Cancel</button>
              <button style={S.btn(C.navy)} onClick={async () => { await DB.updateBrand(editBrand.id, editBrand.name, parseFloat(editBrand.rate)); setEditBrand(null); load(); show("Updated"); }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FATHER'S ENTRY (/entry)
// ═══════════════════════════════════════════════════════════════════════════════
function FatherEntry() {
  const [authed, setAuthed] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [brands, setBrands] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today());
  const [show, toast] = useToast();

  useEffect(() => { if (authed) load(); }, [authed, date]);

  async function load() {
    setLoading(true);
    try {
      const [c, a, sg, b, e] = await Promise.all([
        DB.getActiveCustomers(), DB.getAreas(), DB.getSubgroups(), DB.getBrands(), DB.getDailyEntries(date),
      ]);
      setCustomers(c); setAreas(a); setSubgroups(sg); setBrands(b); setEntries(e);
    } catch { show("Failed to load", "error"); }
    setLoading(false);
  }

  if (!authed) return (
    <PinModal title="Entry Login" correctPin={FATHER_PIN}
      onSuccess={() => setAuthed(true)} onCancel={() => window.location.href = "/"} />
  );

  const entryMap = {};
  entries.forEach(e => { entryMap[e.customer_id] = e; });

  async function saveEntry(customer, qty) {
    const brand = brands.find(b => b.id === customer.brand_id) || brands[0];
    if (!brand) { show("No brand assigned", "error"); return; }
    const rate = customer.custom_rate || brand.rate;
    try {
      await DB.upsertDailyEntry({ customer_id: customer.id, entry_date: date, brand_id: brand.id, quantity: qty, rate, submitted_by: "father" });
      show("✅ Saved!", "success"); load();
    } catch { show("Error saving", "error"); }
  }

  // Group: area → subgroup → customers
  const grouped = {};
  customers.forEach(c => {
    const area = areas.find(a => a.id === c.area_id);
    const sg = subgroups.find(s => s.id === c.subgroup_id);
    const aKey = area?.id || "none";
    const aLabel = area ? `${area.name}${area.delivery_boy_name ? " / " + area.delivery_boy_name : ""}` : "No Group";
    const sgKey = sg?.id || "none";
    const sgLabel = sg?.name || "No Subgroup";
    if (!grouped[aKey]) grouped[aKey] = { label: aLabel, area, subs: {} };
    if (!grouped[aKey].subs[sgKey]) grouped[aKey].subs[sgKey] = { label: sgLabel, sg, customers: [] };
    grouped[aKey].subs[sgKey].customers.push(c);
  });

  const done = entries.length;
  const total = customers.length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <img src={logo_app} alt="Logo" style={{ width: 32, height: 32, borderRadius: 6 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Daily Entry</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{done}/{total} done · {fmtDate(date)}</div>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "none" }} />
      </div>

      <div style={{ height: 4, background: C.border }}>
        <div style={{ height: 4, background: C.success, width: `${total ? (done / total) * 100 : 0}%`, transition: "width 0.3s" }} />
      </div>

      <div style={{ padding: 12 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, fontSize: 18 }}>Loading...</div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: C.muted }}>No customers added yet</div>
        ) : (
          Object.values(grouped).map(group => (
            <div key={group.label} style={{ marginBottom: 16 }}>
              {/* Group header — slightly bigger text */}
              <div style={{ background: C.navy, color: C.white, padding: "11px 14px", borderRadius: "10px 10px 0 0", fontWeight: 800, fontSize: 16 }}>
                📍 {group.label}
              </div>
              {Object.values(group.subs).map(sub => (
                <div key={sub.label} style={{ border: `1px solid ${C.border}`, borderTop: "none" }}>
                  {/* Subgroup header — slightly bigger text */}
                  <div style={{ background: "#eef2ff", padding: "9px 14px", fontWeight: 700, fontSize: 15, color: C.navy, borderBottom: `1px solid ${C.border}` }}>
                    🏢 {sub.label}
                  </div>
                  {sub.customers.map(c => {
                    const entry = entryMap[c.id];
                    const brand = brands.find(b => b.id === c.brand_id);
                    const room = roomNum(c.code);
                    const ttsText = `${group.area?.name || ""} - ${sub.sg?.name || ""} - ${room || c.name}`;
                    return (
                      <div key={c.id} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                        borderBottom: `1px solid ${C.border}`, background: entry ? "#f0fff4" : C.white,
                      }}>
                        <div style={S.avatar(48)}>{room || getInitials(c.name)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 16 }}>{c.name}</span>
                            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 17, padding: "0 2px" }}
                              onClick={() => speak(ttsText)} title="Speak location">🔊</button>
                          </div>
                          <div style={{ fontSize: 13, color: C.muted }}>{brand?.name || "No brand"} · Default: {c.default_qty}L</div>
                          {entry && <div style={{ fontSize: 13, color: C.success, fontWeight: 600 }}>✅ {entry.quantity}L recorded</div>}
                        </div>
                        <FatherQtyControl defaultQty={c.default_qty || 1} savedQty={entry?.quantity} onSave={qty => saveEntry(c, qty)} />
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ borderRadius: "0 0 10px 10px", height: 3, background: C.navy, opacity: 0.12 }} />
            </div>
          ))
        )}
      </div>
      {toast}
    </div>
  );
}

function FatherQtyControl({ defaultQty, savedQty, onSave }) {
  const [qty, setQty] = useState(savedQty ?? defaultQty);
  const [dirty, setDirty] = useState(false);
  function adjust(d) { setQty(q => Math.max(0, +(q + d).toFixed(1))); setDirty(true); }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <button style={{ ...S.btn(C.navy), width: 44, height: 44, justifyContent: "center", fontSize: 22, padding: 0, borderRadius: "50%" }} onClick={() => adjust(0.5)}>+</button>
      <div style={{ fontWeight: 800, fontSize: 16 }}>{qty}L</div>
      <button style={{ ...S.btn(C.border, C.text), width: 44, height: 44, justifyContent: "center", fontSize: 22, padding: 0, borderRadius: "50%" }} onClick={() => adjust(-0.5)}>−</button>
      {dirty && <button style={{ ...S.btnSm(C.success), marginTop: 4, padding: "7px 16px", fontSize: 13 }} onClick={() => { onSave(qty); setDirty(false); }}>Save</button>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER PORTAL (/c/:code)
// ═══════════════════════════════════════════════════════════════════════════════
function CustomerPortal({ code }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("home");
  const [show, toast] = useToast();

  useEffect(() => {
    DB.getCustomerByCode(code).then(c => { setCustomer(c); setLoading(false); }).catch(() => setLoading(false));
  }, [code]);

  if (loading) return <div style={{ textAlign: "center", padding: 60 }}>Loading...</div>;
  if (!customer) return (
    <div style={{ textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Customer not found</div>
      <div style={{ fontSize: 13, color: C.muted }}>Make sure you have the correct link.<br />Your link: {BASE_URL}/c/YOUR_CODE</div>
    </div>
  );

  const tabs = [{ id: "home", label: "🏠" }, { id: "entries", label: "📋" }, { id: "bill", label: "🧾" }, { id: "pay", label: "💳" }];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <img src={logo_app} alt="Logo" style={{ width: 32, height: 32, borderRadius: 6 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Hi, {customer.name}! 👋</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Saikrishna Milk Supply</div>
        </div>
      </div>
      <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, background: C.white }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px 4px", border: "none", background: "none", cursor: "pointer",
            fontSize: 20, borderBottom: tab === t.id ? `3px solid ${C.navy}` : "3px solid transparent",
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ padding: 16 }}>
        {tab === "home" && <CustomerHome customer={customer} />}
        {tab === "entries" && <CustomerEntries customer={customer} show={show} />}
        {tab === "bill" && <CustomerBill customer={customer} show={show} setTab={setTab} />}
        {tab === "pay" && <CustomerPay customer={customer} show={show} />}
      </div>
      {toast}
    </div>
  );
}

function CustomerHome({ customer }) {
  return (
    <div>
      <div style={S.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={S.avatar(56)}>{roomNum(customer.code) || getInitials(customer.name)}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{customer.name}</div>
            <div style={{ fontSize: 13, color: C.muted }}>Room {roomNum(customer.code) || customer.code}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{customer.phone}</div>
          </div>
        </div>
      </div>
      {customer.outstanding > 0 && (
        <div style={{ ...S.card, background: "#fff5f5", border: `1px solid ${C.danger}` }}>
          <div style={{ fontWeight: 700, color: C.danger }}>⚠️ Outstanding Balance</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.danger }}>₹{customer.outstanding}</div>
          <div style={{ fontSize: 12, color: C.muted }}>Please clear at earliest</div>
        </div>
      )}
      <div style={{ ...S.card, background: "#f0f4ff" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>📱 How to use this portal</div>
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          • <strong>Entries</strong> — View your daily milk delivery records<br />
          • <strong>Bill</strong> — View your monthly bill<br />
          • <strong>Pay</strong> — Record payment and share screenshot
        </div>
      </div>
    </div>
  );
}

function CustomerEntries({ customer, show }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    setLoading(true);
    DB.getMonthEntries(customer.id, month, year).then(e => { setEntries(e); setLoading(false); }).catch(() => { show("Failed", "error"); setLoading(false); });
  }, [month, year]);

  const total = entries.reduce((s, e) => s + e.quantity, 0);
  const amount = entries.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <select style={{ ...S.input, width: "auto" }} value={month} onChange={e => setMonth(+e.target.value)}>
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString("en-IN", { month: "long" })}</option>)}
        </select>
        <select style={{ ...S.input, width: "auto" }} value={year} onChange={e => setYear(+e.target.value)}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {loading ? <div style={{ textAlign: "center", padding: 40 }}>Loading...</div> : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <div style={{ ...S.card, flex: 1, textAlign: "center", marginBottom: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.navy }}>{total}L</div>
              <div style={{ fontSize: 11, color: C.muted }}>Total Milk</div>
            </div>
            <div style={{ ...S.card, flex: 1, textAlign: "center", marginBottom: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.success }}>₹{amount}</div>
              <div style={{ fontSize: 11, color: C.muted }}>Month Amount</div>
            </div>
          </div>
          {entries.length === 0
            ? <div style={{ ...S.card, textAlign: "center", color: C.muted }}>No entries for this month</div>
            : entries.map(e => (
              <div key={e.id} style={{ ...S.card, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13 }}>{fmtDate(e.entry_date)}</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontWeight: 600 }}>{e.quantity}L</span>
                  <span style={{ color: C.success }}>₹{e.amount}</span>
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}

function CustomerBill({ customer, show, setTab }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DB.getBills(customer.id).then(b => { setBills(b); setLoading(false); }).catch(() => { show("Failed", "error"); setLoading(false); });
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>;
  const latest = bills[0];

  return (
    <div>
      {!latest ? (
        <div style={{ ...S.card, textAlign: "center", color: C.muted, padding: 40 }}>No bills generated yet.</div>
      ) : (
        <div style={S.card}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>🧾 {fmtMonth(latest.month, latest.year)}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: C.muted }}>Milk Supplied</span><span style={{ fontWeight: 700 }}>{latest.total_litres} Litres</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: C.muted }}>Month Amount</span><span style={{ fontWeight: 700 }}>₹{latest.month_amount}</span></div>
          {latest.outstanding > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ color: C.muted }}>Previous Outstanding</span><span style={{ fontWeight: 700, color: C.danger }}>₹{latest.outstanding}</span></div>}
          <div style={{ borderTop: `2px solid ${C.border}`, paddingTop: 8, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 800 }}>Total Due</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: C.danger }}>₹{latest.total_amount}</span>
          </div>
          <div style={{ marginTop: 12, background: "#fff8ed", borderRadius: 8, padding: 10, fontSize: 13 }}>
            <strong>📌 Payment Note</strong><br />
            Pay via UPI: <strong>{UPI_ID}</strong><br />
            After paying, go to Pay tab and share your screenshot.
          </div>
          <button style={{ ...S.btn(C.navy), width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => setTab("pay")}>
            💳 Go to Pay
          </button>
        </div>
      )}
      {bills.length > 1 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Previous Bills</div>
          {bills.slice(1).map(b => (
            <div key={b.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{fmtMonth(b.month, b.year)}</span>
              <span style={{ fontWeight: 700 }}>₹{b.total_amount}</span>
              <span style={S.badge(b.status === "paid" ? C.success : C.warning)}>{b.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomerPay({ customer, show }) {
  const [form, setForm] = useState({ amount: "", txn_ref: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    if (!form.amount) { show("Enter amount", "error"); return; }
    setLoading(true);
    try {
      await DB.addPayment({
        customer_id: customer.id, amount: parseFloat(form.amount),
        payment_method: "upi", payment_date: today(),
        transaction_ref: form.txn_ref, notes: form.notes, status: "pending",
      });
      setSubmitted(true); show("Payment recorded!", "success");
    } catch (e) { show("Error: " + e.message, "error"); }
    setLoading(false);
  }

  if (submitted) return (
    <div style={{ ...S.card, textAlign: "center", padding: 32 }}>
      <div style={{ fontSize: 48 }}>✅</div>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Payment Recorded!</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Share your payment screenshot on WhatsApp to confirm.</div>
      <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Payment confirmation from ${customer.name} (${customer.code}) - ₹${form.amount}`)}`} target="_blank" rel="noreferrer">
        <button style={{ ...S.btn(C.success), width: "100%", justifyContent: "center" }}>📲 Share Screenshot on WhatsApp</button>
      </a>
    </div>
  );

  return (
    <div>
      <div style={{ ...S.card, background: "#f0fff4" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>💳 Pay via UPI</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, marginBottom: 4 }}>{UPI_ID}</div>
        <div style={{ fontSize: 12, color: C.muted }}>Pay first, then fill details below</div>
      </div>
      <div style={S.card}>
        <label style={S.label}>Amount Paid (₹)</label>
        <input style={{ ...S.input, marginBottom: 12 }} type="number" value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Enter amount" />
        <label style={S.label}>Last 4 digits of Transaction ID</label>
        <input style={{ ...S.input, marginBottom: 12 }} maxLength={4} value={form.txn_ref}
          onChange={e => setForm(f => ({ ...f, txn_ref: e.target.value }))} placeholder="e.g. 4821" />
        <label style={S.label}>Notes (optional)</label>
        <input style={{ ...S.input, marginBottom: 16 }} value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes" />
        <button style={{ ...S.btn(C.navy), width: "100%", justifyContent: "center" }} onClick={submit} disabled={loading}>
          {loading ? "Submitting..." : "I Have Paid ✅"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BILL PAGE (/bill/:code)
// ═══════════════════════════════════════════════════════════════════════════════
function BillPage({ billNumber }) {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { DB.getBillByCode(billNumber).then(b => { setBill(b); setLoading(false); }); }, [billNumber]);
  if (loading) return <div style={{ textAlign: "center", padding: 60 }}>Loading...</div>;
  if (!bill) return <div style={{ textAlign: "center", padding: 60 }}>Bill not found</div>;
  const c = bill.customers;
  return (
    <div style={{ ...S.page, maxWidth: 480, margin: "0 auto", padding: 16 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <img src={logo_app} alt="Logo" style={{ width: 60, height: 60, borderRadius: 12 }} />
        <div style={{ fontWeight: 800, fontSize: 18, color: C.navy }}>Saikrishna Milk Supply</div>
        <div style={{ fontSize: 13, color: C.muted }}>Monthly Bill</div>
      </div>
      <div style={S.card}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{fmtMonth(bill.month, bill.year)}</div>
        <div style={{ marginBottom: 6 }}><strong>Customer:</strong> {c?.name}</div>
        <div style={{ marginBottom: 6 }}><strong>Code:</strong> {c?.code}</div>
        <div style={{ marginBottom: 8 }}><strong>Bill No:</strong> {bill.bill_number}</div>
        <hr />
        <div style={{ display: "flex", justifyContent: "space-between", margin: "8px 0" }}><span>Total Milk</span><strong>{bill.total_litres} Litres</strong></div>
        <div style={{ display: "flex", justifyContent: "space-between", margin: "8px 0" }}><span>Month Amount</span><strong>₹{bill.month_amount}</strong></div>
        {bill.outstanding > 0 && <div style={{ display: "flex", justifyContent: "space-between", margin: "8px 0", color: C.danger }}><span>Previous Outstanding</span><strong>₹{bill.outstanding}</strong></div>}
        <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0 0", fontWeight: 800, fontSize: 18 }}>
          <span>Total Due</span><span style={{ color: C.danger }}>₹{bill.total_amount}</span>
        </div>
      </div>
      <div style={{ ...S.card, background: "#fff8ed" }}>
        <strong>💳 Pay via UPI</strong>
        <div style={{ fontFamily: "monospace", fontSize: 16, margin: "6px 0" }}>{UPI_ID}</div>
        <div style={{ fontSize: 12, color: C.muted }}>After payment, visit your portal to confirm.</div>
        <a href={`${BASE_URL}/c/${c?.code}`}>
          <button style={{ ...S.btn(C.navy), marginTop: 10, width: "100%", justifyContent: "center" }}>Open My Portal</button>
        </a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const path = window.location.pathname;
  if (path === "/owner") return <OwnerPortal />;
  if (path === "/entry") return <FatherEntry />;
  if (path.startsWith("/c/")) return <CustomerPortal code={path.replace("/c/", "")} />;
  if (path.startsWith("/bill/")) return <BillPage billNumber={path.replace("/bill/", "")} />;
  return <DevScreen />;
}
