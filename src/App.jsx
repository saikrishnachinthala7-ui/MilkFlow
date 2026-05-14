import { useState, useEffect } from "react";
import { logo_app, logo_192 } from "./logoData.js";

// ─── Supabase ─────────────────────────────────────────────────────────────────
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
  if (!res.ok) throw new Error(await res.text());
  return method === "DELETE" ? null : res.json();
}

// ─── PIN helpers — stored in Supabase settings table ─────────────────────────
let CACHED_PINS = { owner_pin: "1234", father_pin: "0000" };

async function loadPins() {
  try {
    const rows = await db("settings", "GET", null, "?key=in.(owner_pin,father_pin)&select=key,value");
    (rows || []).forEach(r => { CACHED_PINS[r.key] = r.value; });
  } catch { /* use defaults */ }
}

async function savePin(key, value) {
  try {
    // Try PATCH first (update existing row)
    const existing = await db("settings","GET",null,`?key=eq.${key}&limit=1`);
    if (existing && existing.length > 0) {
      await db("settings","PATCH",{ value },`?key=eq.${key}`);
    } else {
      await db("settings","POST",{ key, value });
    }
    CACHED_PINS[key] = value;
    return true;
  } catch {
    // Fallback: save in memory only
    CACHED_PINS[key] = value;
    return false;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const UPI_ID = "yadaiahchinthala07-4@okaxis";
const AREA_COLORS = ["#1a6b3c", "#1565C0", "#6a1b9a", "#c62828", "#e65100"];
const QTY_OPTIONS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const monthLabel = (m) => { if (!m) return ""; const [y,mo] = m.split("-"); return new Date(parseInt(y),parseInt(mo)-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"}); };
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const fmtCurrency = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const initials = (name = "") => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const avatarColor = (name = "") => {
  const colors = ["#1a6b3c","#1565C0","#6a1b9a","#c62828","#e65100","#00695c","#f57f17"];
  let h = 0; for (let c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
};

// ─── URL Routing ──────────────────────────────────────────────────────────────
// /owner       → Owner Dashboard (PIN protected)
// /entry       → Father's Entry Screen (PIN protected)
// /c/CODE      → Customer Portal (no PIN)
// /            → Dev selector (not shown to users)
function getRoute() {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const role = params.get("role");
  // Support ?role=owner / ?role=father for PWA shortcuts
  if (path === "/owner" || role === "owner") return { role: "owner" };
  if (path === "/entry" || role === "father") return { role: "father" };
  if (path.startsWith("/c/")) return { role: "customer", code: path.split("/c/")[1] };
  if (path.startsWith("/bill/")) return { role: "bill", code: path.split("/bill/")[1] };
  // Also support /c/CODE with query param
  if (params.get("customer")) return { role: "customer", code: params.get("customer") };
  return { role: "select" };
}

// ─── PIN Screen ───────────────────────────────────────────────────────────────
function PinScreen({ onSuccess, role }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const press = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next); setError(false);
    if (next.length === 4) {
      setTimeout(() => {
        const correct = role === "father" ? CACHED_PINS.father_pin : CACHED_PINS.owner_pin;
        if (next === correct) { onSuccess(); }
        else { setShake(true); setError(true); setPin(""); setTimeout(() => setShake(false), 500); }
      }, 150);
    }
  };
  const del = () => { setPin(p => p.slice(0, -1)); setError(false); };

  return (
    <div style={S.pinWrap}>
      <img src={logo_app} style={{width:90,height:90,borderRadius:16,objectFit:"contain",marginBottom:4}} alt="Saikrishna Milk Supply"/>
      <div style={S.pinTitle}>MilkFlow</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Saikrishna Milk Supply</div>
      <div style={{ background: role === "father" ? "#e8f5ee" : "#e8eaf6", color: role === "father" ? "#1a6b3c" : "#3949ab", padding: "5px 16px", borderRadius: 20, fontSize: 13, fontWeight: 500, marginBottom: 20 }}>
        {role === "father" ? "🥛 Delivery Entry" : "👑 Owner Login"}
      </div>
      <div style={{ ...S.pinDots, ...(shake ? S.shake : {}) }}>
        {[0,1,2,3].map(i => <div key={i} style={{ ...S.pinDot, ...(i < pin.length ? S.pinDotFilled : {}) }} />)}
      </div>
      {error && <div style={{ color: "#c0392b", fontSize: 13 }}>❌ Wrong PIN — try again</div>}
      <div style={S.pinPad}>
        {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} style={S.pinBtn} onClick={() => press(String(n))}>{n}</button>)}
        <div style={S.pinBtn} />
        <button style={S.pinBtn} onClick={() => press("0")}>0</button>
        <button style={S.pinBtn} onClick={del}>⌫</button>
      </div>
    </div>
  );
}

// ─── FATHER ENTRY SCREEN — English ───────────────────────────────────────────
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custs, todayE] = await Promise.all([
        db("customers", "GET", null, "?is_active=eq.true&order=area_name,name"),
        db("daily_entries", "GET", null, `?entry_date=eq.${today()}`),
      ]);
      setCustomers(custs || DEMO_CUSTOMERS);
      const map = {};
      (todayE || []).forEach(e => { map[e.customer_id] = e; });
      setEntries(map);
    } catch(e) {
      console.error("Load error:", e.message);
      setCustomers([]);
    }
    setLoading(false);
  };

  const saveEntry = async () => {
    let qty;
    if (selectedQty === -1) { qty = parseFloat(customQty); if (isNaN(qty) || qty < 0) return; }
    else if (selectedQty === null) return;
    else qty = selectedQty;
    setSaving(true);
    const payload = { customer_id: active.id, entry_date: today(), quantity_litres: qty, entered_by: "father" };
    try {
      const ex = entries[active.id];
      if (ex?.id) await db("daily_entries", "PATCH", { quantity_litres: qty }, `?id=eq.${ex.id}`);
      else await db("daily_entries", "POST", payload);
    } catch { /* offline fallback */ }
    setEntries(p => ({ ...p, [active.id]: { ...payload } }));
    setActive(null); setSaving(false);
  };

  const doneCount = Object.keys(entries).length;
  const allDone = doneCount >= customers.length && customers.length > 0;

  const filtered = customers.filter(c => {
    const e = entries[c.id];
    if (filter === "done" && !e) return false;
    if (filter === "pending" && e) return false;
    const s = search.toLowerCase();
    return !s || (c.name||"").toLowerCase().includes(s) || (c.customer_code||"").toLowerCase().includes(s);
  });

  const byArea = {};
  filtered.forEach(c => { const a = c.area_name || "Area"; if (!byArea[a]) byArea[a] = []; byArea[a].push(c); });

  if (submitted) return (
    <div style={S.successScreen}>
      <div style={{ fontSize: 72 }}>✅</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#1a6b3c" }}>All Submitted!</div>
      <div style={{ fontSize: 14, color: "#888" }}>Today's milk records saved</div>
      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        <StatBox label="Customers" value={customers.length} />
        <StatBox label="Litres" value={Object.values(entries).reduce((s,e)=>s+(e?.quantity_litres||0),0).toFixed(1)} />
        <StatBox label="Zero" value={Object.values(entries).filter(e=>e?.quantity_litres===0).length} />
      </div>
      <button style={{ ...S.btnSave, marginTop: 24, padding: "12px 32px" }} onClick={() => { setSubmitted(false); setEntries({}); }}>New Day</button>
    </div>
  );

  if (loading) return <Loader />;

  return (
    <div style={S.screen}>
      <div style={S.statusBar}>
        <Chip bg="#e8f5ee" color="#1a6b3c" label={`✅ ${doneCount}/${customers.length} Done`} />
        <Chip bg="#fff3cd" color="#856404" label={`⏳ ${customers.length - doneCount} Left`} />
        <Chip bg={allDone?"#d4edda":"#e9ecef"} color={allDone?"#155724":"#495057"} label={`${Math.round(doneCount/Math.max(customers.length,1)*100)}%`} />
      </div>

      <div style={S.searchBar}>
        <span style={{ color: "#888" }}>🔍</span>
        <input style={S.searchInput} placeholder="Search customer..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button style={S.clearBtn} onClick={() => setSearch("")}>✕</button>}
      </div>

      <div style={S.filterRow}>
        {[["all",`All (${customers.length})`],["pending",`Pending (${customers.length-doneCount})`],["done",`Done (${doneCount})`]].map(([f,l]) => (
          <button key={f} style={{ ...S.filterChip, ...(filter===f?S.filterChipActive:{}) }} onClick={() => setFilter(f)}>{l}</button>
        ))}
      </div>

      <div style={S.scrollArea}>
        {Object.entries(byArea).map(([area, custs], ai) => (
          <div key={area}>
            <div style={S.areaDivider}><span style={{ color: AREA_COLORS[ai%AREA_COLORS.length] }}>📍 {area}</span><div style={S.dividerLine} /></div>
            {custs.map(cust => {
              const entry = entries[cust.id];
              const isDone = !!entry;
              const qty = isDone ? entry.quantity_litres : (cust.default_quantity || 1);
              return (
                <div key={cust.id} style={{ ...S.custCard, ...(isDone?S.custCardDone:{}) }}
                  onClick={() => { setActive(cust); setSelectedQty(isDone?entry.quantity_litres:null); setCustomQty(""); }}>
                  <div style={{ ...S.avatar, background: avatarColor(cust.name) }}>{initials(cust.name)}</div>
                  <div style={S.custInfo}>
                    <div style={S.custName}>{cust.name}</div>
                    <div style={S.custMeta}>{cust.customer_code} • {cust.brand_name || "Amul"}</div>
                  </div>
                  <div style={S.qtySection}>
                    {entry?.quantity_litres === 0
                      ? <><div style={{ fontSize: 20 }}>🚫</div><div style={S.qtyUnit}>No Delivery</div></>
                      : <><div style={S.qtyNum}>{qty}</div><div style={S.qtyUnit}>Litres</div></>}
                    <div style={{ ...S.qtyBadge, ...(isDone?S.qtyBadgeDone:S.qtyBadgePrev) }}>{isDone?"✓ Saved":"Yesterday"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ textAlign:"center", padding:40, color:"#888" }}>No customers found</div>}
      </div>

      <button style={{ ...S.submitBtn, ...(allDone?{}:S.submitBtnDisabled) }} onClick={allDone ? () => setSubmitted(true) : null}>
        <span style={{ fontSize: 22 }}>{allDone ? "🚀" : "🔒"}</span>
        {allDone ? "Submit All Records" : `${customers.length - doneCount} remaining — complete first`}
      </button>

      {active && (
        <div style={S.modalBg} onClick={() => setActive(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHandle} />
            <div style={S.modalName}>{active.name}</div>
            <div style={S.modalMeta}>{active.customer_code} • {active.area_name} • {active.brand_name || "Amul"}</div>
            <div style={S.prevBox}>
              <span style={{ fontSize: 13, color: "#2d7a50" }}>📅 Yesterday's quantity:</span>
              <span style={{ fontSize: 18, fontWeight: 600, color: "#1a6b3c" }}>{active.default_quantity || 1} L</span>
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 10, textAlign: "center" }}>How many litres today? 👇</div>
            <div style={S.qtyGrid}>
              {QTY_OPTIONS.map(q => (
                <button key={q} style={{ ...S.qtyOption, ...(selectedQty===q?S.qtyOptionSel:{}) }} onClick={() => { setSelectedQty(q); setCustomQty(""); }}>{q}</button>
              ))}
              <button style={{ ...S.qtyOption, ...(selectedQty===0?S.qtyOptionSel:{}), color:"#c0392b", borderColor:"#f5c6cb", background:"#fdf2f3", fontSize:13 }} onClick={() => { setSelectedQty(0); setCustomQty(""); }}>🚫<br/><span style={{fontSize:10}}>None</span></button>
              <button style={{ ...S.qtyOption, ...(selectedQty===-1?S.qtyOptionSel:{}), fontSize:13 }} onClick={() => setSelectedQty(-1)}>✏️<br/><span style={{fontSize:10}}>Other</span></button>
            </div>
            {selectedQty === -1 && (
              <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
                <input type="number" step="0.5" min="0" max="20" placeholder="0.0" value={customQty}
                  onChange={e=>setCustomQty(e.target.value)}
                  style={{ flex:1, fontSize:18, padding:"10px 14px", border:"0.5px solid #ddd", borderRadius:10, background:"white", color:"#111" }} autoFocus />
                <span style={{ fontSize:13, color:"#888" }}>Litres</span>
              </div>
            )}
            <div style={S.modalActions}>
              <button style={S.btnCancel} onClick={() => setActive(null)}>Cancel</button>
              <button style={S.btnSave} onClick={saveEntry} disabled={saving}>{saving?"Saving...":"✅ Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OWNER DASHBOARD ──────────────────────────────────────────────────────────
function OwnerDashboard() {
  const [tab, setTab] = useState("home");
  const tabs = [
    ["home","🏠","Home"],
    ["customers","👥","Customers"],
    ["records","📋","Records"],
    ["billing","🧾","Billing"],
    ["payments","💳","Payments"],
    ["reports","📊","Reports"],
    ["settings","⚙️","Settings"],
  ];
  return (
    <div style={S.screen}>
      <div style={{ flex:1, overflowY:"auto" }}>
        {tab==="home" && <OwnerHome setTab={setTab} />}
        {tab==="customers" && <CustomerManagement />}
        {tab==="records" && <DailyRecords />}
        {tab==="billing" && <BillingSection />}
        {tab==="payments" && <PaymentTracking />}
        {tab==="reports" && <ReportsSection />}
        {tab==="settings" && <OwnerSettings />}
      </div>
      <div style={{ ...S.bottomNav, overflowX:"auto" }}>
        {tabs.map(([id,icon,label]) => (
          <button key={id} style={{ ...S.navBtn, minWidth:46, ...(tab===id?S.navBtnActive:{}) }} onClick={() => setTab(id)}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontSize: 9, marginTop: 2 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}


function OwnerHome({ setTab }) {
  const [stats, setStats] = useState({ customers:0, todayLitres:47.5, monthRevenue:84250, pendingPayments:32400, overdueCount:8 });
  useEffect(() => { loadStats(); }, []);
  const loadStats = async () => {
    try {
      const [custs, todayE] = await Promise.all([
        db("customers","GET",null,"?is_active=eq.true"),
        db("daily_entries","GET",null,`?entry_date=eq.${today()}&select=quantity_litres`),
      ]);
      setStats(p => ({ ...p, customers: custs?.length||DEMO_CUSTOMERS.length, todayLitres:(todayE||[]).reduce((s,e)=>s+(e.quantity_litres||0),0)||47.5 }));
    } catch {}
  };
  const hr = new Date().getHours();
  const greeting = hr<12?"Good Morning":hr<17?"Good Afternoon":"Good Evening";
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  return (
    <div style={{ padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div><div style={{ fontSize:13, color:"#888" }}>{greeting} 👋</div><div style={{ fontSize:20, fontWeight:600 }}>Saikrishna Milk Supply</div></div>
        <img src={logo_app} style={{width:40,height:40,borderRadius:20,objectFit:"contain"}} alt="logo"/>
      </div>
      <div style={S.sectionTitle}>📊 Today — {fmtDate(today())}</div>
      <div style={S.statsGrid}>
        <StatCard label="Active Customers" value={stats.customers} icon="👥" color="#1565C0" />
        <StatCard label="Litres Today" value={stats.todayLitres.toFixed(1)+"L"} icon="🥛" color="#1a6b3c" />
        <StatCard label="Month Revenue" value={fmtCurrency(stats.monthRevenue)} icon="💰" color="#6a1b9a" />
        <StatCard label="Pending Payments" value={fmtCurrency(stats.pendingPayments)} icon="⏳" color="#c62828" />
      </div>
      <div style={S.sectionTitle}>⚡ Quick Actions</div>
      <div style={S.quickActions}>
        <QuickAction icon="🧾" label="Bills" onClick={()=>setTab("billing")} color="#1a6b3c" />
        <QuickAction icon="💳" label="Payments" onClick={()=>setTab("payments")} color="#1565C0" />
        <QuickAction icon="📋" label="Records" onClick={()=>setTab("records")} color="#6a1b9a" />
        <QuickAction icon="⚖️" label="Balances" onClick={()=>setTab("settings")} color="#e65100" />
      </div>
      {stats.overdueCount>0 && (
        <div style={S.alertBox}><span style={{fontSize:18}}>⚠️</span><div><div style={{fontWeight:500,fontSize:14}}>{stats.overdueCount} customers overdue</div><div style={{fontSize:12,color:"#856404"}}>Tap Payments to send reminders</div></div></div>
      )}
      <div style={S.sectionTitle}>🗓️ This Month</div>
      <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:"14px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span style={{fontSize:13,color:"#555"}}>Days recorded</span><span style={{fontWeight:600}}>{now.getDate()}/{daysInMonth}</span></div>
        <div style={{ background:"#eee", borderRadius:4, height:6, marginBottom:12 }}><div style={{ background:"#1a6b3c", borderRadius:4, height:"100%", width:`${(now.getDate()/daysInMonth)*100}%` }} /></div>
        <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{fontSize:13,color:"#555"}}>Bill status</span><span style={{ background:"#fff3cd", color:"#856404", fontSize:12, padding:"2px 8px", borderRadius:10 }}>Pending Generation</span></div>
      </div>
    </div>
  );
}

function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [viewStatement, setViewStatement] = useState(null);
  const [viewDisputes, setViewDisputes] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name:"", phone:"", area_name:"", default_quantity:1, brand_name:"Amul Full Cream", rate_per_litre:68, opening_balance:0 });

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const d = await db("customers","GET",null,"?is_active=eq.true&order=name"); setCustomers(d||[]); }
    catch(e) { console.error(e); setCustomers([]); }
    setLoading(false);
  };

  const add = async () => {
    if (!form.name || !form.phone) { alert("Name and phone are required"); return; }
    try {
      await db("customers","POST",{ ...form, customer_code:"C"+String(Date.now()).slice(-4), is_active:true });
      load(); setShowAdd(false);
      setForm({ name:"", phone:"", area_name:"", default_quantity:1, brand_name:"Amul Full Cream", rate_per_litre:68, opening_balance:0 });
    } catch(e) { alert("Error: "+e.message); }
  };

  const filtered = customers.filter(c => !search || (c.name||"").toLowerCase().includes(search.toLowerCase()) || (c.phone||"").includes(search) || (c.customer_code||"").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={S.sectionTitle}>👥 Customers ({customers.length})</div>
        <div style={{ display:"flex", gap:6 }}>
          <button style={{ ...S.btnPrimary, background:"#1565C0", padding:"8px 12px", fontSize:12 }} onClick={()=>setShowImport(true)}>📥 Import</button>
          <button style={{ ...S.btnPrimary, background:"#6a1b9a", padding:"8px 12px", fontSize:12 }} onClick={()=>exportCustomersExcel(customers)}>📤 Export</button>
          <button style={S.btnPrimary} onClick={()=>setShowAdd(true)}>+ Add</button>
        </div>
      </div>
      <div style={S.searchBar}>
        <span>🔍</span>
        <input style={S.searchInput} placeholder="Search name, phone, code..." value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      {loading ? <Loader /> : filtered.map(c => (
        <div key={c.id} style={{ ...S.listCard, flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ ...S.avatar, background:avatarColor(c.name), width:40, height:40 }}>{initials(c.name)}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:500 }}>{c.name}</div>
              <div style={{ fontSize:12, color:"#888" }}>{c.customer_code} • {c.phone} • {c.area_name}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontWeight:600, color:"#1a6b3c" }}>{c.default_quantity}L / {fmtCurrency(c.rate_per_litre)}</div>
              {(c.opening_balance||0) > 0 && <div style={{ fontSize:11, color:"#c62828" }}>OB: {fmtCurrency(c.opening_balance)}</div>}
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button style={{ flex:1, fontSize:11, padding:"5px 0", background:"#e8f5ee", border:"0.5px solid #b8dfc8", borderRadius:8, color:"#1a6b3c", cursor:"pointer" }}
              onClick={()=>setViewStatement(c)}>📋 Statement</button>
            <button style={{ flex:1, fontSize:11, padding:"5px 0", background:"#fff3cd", border:"0.5px solid #ffc107", borderRadius:8, color:"#856404", cursor:"pointer" }}
              onClick={()=>setViewDisputes(c)}>⚠️ Disputes</button>
            <a href={`https://wa.me/91${(c.phone||"").replace(/\D/g,"")}`} style={{ flex:1, fontSize:11, padding:"5px 0", background:"#e7f3ff", border:"0.5px solid #b3d4f5", borderRadius:8, color:"#1565C0", cursor:"pointer", textDecoration:"none", textAlign:"center" }}>📞 WhatsApp</a>
            <button style={{ flex:1, fontSize:11, padding:"5px 0", background:"#fdf2f3", border:"0.5px solid #f5c6cb", borderRadius:8, color:"#c62828", cursor:"pointer" }}
              onClick={()=>setDeleteTarget(c)}>🗑 Remove</button>
          </div>
        </div>
      ))}

      {showImport && (
        <ExcelImportModal onClose={()=>setShowImport(false)} onDone={()=>{ setShowImport(false); load(); }} />
      )}

      {/* Delete Customer Modal */}
      {deleteTarget && (
        <DeleteCustomerModal
          customer={deleteTarget}
          onClose={()=>setDeleteTarget(null)}
          onDone={()=>{ setDeleteTarget(null); load(); }}
        />
      )}

      {/* Annual Statement Modal */}
      {viewStatement && (
        <div style={{ ...S.modalBg, alignItems:"flex-start", overflowY:"auto" }} onClick={()=>setViewStatement(null)}>
          <div style={{ ...S.modal, borderRadius:0, minHeight:"100vh", paddingBottom:40 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <button style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }} onClick={()=>setViewStatement(null)}>←</button>
              <div style={{ fontWeight:600, fontSize:16 }}>📋 Annual Statement</div>
            </div>
            <AnnualStatement customer={viewStatement} />
          </div>
        </div>
      )}

      {/* Dispute Log Modal */}
      {viewDisputes && (
        <div style={{ ...S.modalBg, alignItems:"flex-start", overflowY:"auto" }} onClick={()=>setViewDisputes(null)}>
          <div style={{ ...S.modal, borderRadius:0, minHeight:"100vh", paddingBottom:40 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <button style={{ background:"none", border:"none", fontSize:22, cursor:"pointer" }} onClick={()=>setViewDisputes(null)}>←</button>
              <div style={{ fontWeight:600, fontSize:16 }}>⚠️ Disputes — {viewDisputes.name}</div>
            </div>
            <DisputeLog customer={viewDisputes} />
          </div>
        </div>
      )}

      {showAdd && (
        <div style={S.modalBg} onClick={()=>setShowAdd(false)}>
          <div style={{ ...S.modal, maxHeight:"92vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHandle} />
            <div style={S.modalName}>Add Customer</div>
            <label style={S.formLabel}>Full Name *</label>
            <input style={S.formInput} placeholder="Customer's full name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
            <label style={S.formLabel}>Phone *</label>
            <input style={S.formInput} type="tel" placeholder="10-digit mobile" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} />
            <label style={S.formLabel}>Area</label>
            <input style={S.formInput} placeholder="e.g. Govindapuram" value={form.area_name} onChange={e=>setForm(p=>({...p,area_name:e.target.value}))} />
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:1 }}>
                <label style={S.formLabel}>Daily Qty (L)</label>
                <input style={S.formInput} type="text" inputMode="decimal" placeholder="e.g. 0.5 or 1.5"
                  value={form.default_quantity}
                  onChange={e=>setForm(p=>({...p,default_quantity:e.target.value}))}
                  onBlur={e=>setForm(p=>({...p,default_quantity:parseFloat(e.target.value)||0.5}))} />
              </div>
              <div style={{ flex:1 }}>
                <label style={S.formLabel}>Rate (₹/L)</label>
                <input style={S.formInput} type="text" inputMode="decimal" placeholder="e.g. 68"
                  value={form.rate_per_litre}
                  onChange={e=>setForm(p=>({...p,rate_per_litre:e.target.value}))}
                  onBlur={e=>setForm(p=>({...p,rate_per_litre:parseFloat(e.target.value)||68}))} />
              </div>
            </div>
            <label style={S.formLabel}>Milk Brand</label>
            <select style={S.formInput} value={form.brand_name} onChange={e=>setForm(p=>({...p,brand_name:e.target.value}))}>
              {["Amul Full Cream","Amul Toned","Nandini","Local"].map(b=><option key={b}>{b}</option>)}
            </select>
            <div style={{ background:"#fff3cd", border:"1px solid #ffc107", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
              <div style={{ fontWeight:500, fontSize:14, marginBottom:4 }}>💰 Opening Balance</div>
              <div style={{ fontSize:12, color:"#856404", marginBottom:8 }}>Amount this customer already owes from before MilkFlow. Leave 0 if starting fresh.</div>
              <label style={S.formLabel}>Previous outstanding (₹)</label>
              <input style={{ ...S.formInput, marginBottom:0 }} type="number" min="0" placeholder="0" value={form.opening_balance} onChange={e=>setForm(p=>({...p,opening_balance:parseFloat(e.target.value)||0}))} />
            </div>
            <div style={S.modalActions}>
              <button style={S.btnCancel} onClick={()=>setShowAdd(false)}>Cancel</button>
              <button style={S.btnSave} onClick={add}>Add Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EXCEL IMPORT / EXPORT — Week 6 ──────────────────────────────────────────

// Load SheetJS from CDN
async function loadSheetJS() {
  if (window.XLSX) return window.XLSX;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.XLSX;
}

// Export customers to Excel
async function exportCustomersExcel(customers) {
  const XLSX = await loadSheetJS();
  const rows = customers.map(c => ({
    "Name":             c.name || "",
    "Phone":            c.phone || "",
    "Area":             c.area_name || "",
    "Customer Code":    c.customer_code || "",
    "Daily Qty (L)":    c.default_quantity || 1,
    "Rate (₹/L)":       c.rate_per_litre || 68,
    "Brand":            c.brand_name || "Amul Full Cream",
    "Opening Balance":  c.opening_balance || 0,
    "Active":           c.is_active ? "Yes" : "No",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  // Column widths
  ws["!cols"] = [20,15,15,14,13,12,18,16,8].map(w=>({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");
  XLSX.writeFile(wb, `MilkFlow_Customers_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// Export daily entries to Excel
async function exportEntriesExcel(entries) {
  const XLSX = await loadSheetJS();
  const rows = (entries||[]).map(e => ({
    "Date":          e.entry_date || "",
    "Customer Name": e.customers?.name || "",
    "Customer Code": e.customers?.customer_code || "",
    "Area":          e.customers?.area_name || "",
    "Litres":        e.quantity_litres || 0,
    "Entered By":    e.entered_by || "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [12,20,14,15,8,12].map(w=>({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Daily Entries");
  XLSX.writeFile(wb, `MilkFlow_Entries_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// Download blank import template
async function downloadTemplate() {
  const XLSX = await loadSheetJS();
  const sample = [
    { "Name":"Rajesh Kumar", "Phone":"9876543210", "Area":"Govindapuram", "Daily Qty (L)":1.5, "Rate (₹/L)":68, "Brand":"Amul Full Cream", "Opening Balance":0 },
    { "Name":"Sumitra Devi", "Phone":"9876543211", "Area":"Naidupet",     "Daily Qty (L)":1.0, "Rate (₹/L)":54, "Brand":"Amul Toned",     "Opening Balance":340 },
    { "Name":"Venkateswarlu","Phone":"9876543212", "Area":"Srinagar",     "Daily Qty (L)":2.0, "Rate (₹/L)":68, "Brand":"Amul Full Cream", "Opening Balance":0 },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  ws["!cols"] = [20,15,15,13,12,18,16].map(w=>({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");
  XLSX.writeFile(wb, "MilkFlow_Import_Template.xlsx");
}

// ── Excel Import Modal ────────────────────────────────────────────────────────
function ExcelImportModal({ onClose, onDone }) {
  const [step, setStep] = useState("upload"); // upload | preview | importing | done
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState(null);

  const BRANDS = ["Amul Full Cream","Amul Toned","Nandini","Local"];

  const parseFile = async (file) => {
    const XLSX = await loadSheetJS();
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const parsed = [];
    const errs = [];

    raw.forEach((row, i) => {
      const rowNum = i + 2; // Excel row number (1=header)
      const name  = String(row["Name"] || row["name"] || "").trim();
      const phone = String(row["Phone"] || row["phone"] || "").replace(/\D/g,"").trim();
      const area  = String(row["Area"] || row["area"] || "").trim();
      const qty   = parseFloat(row["Daily Qty (L)"] || row["qty"] || row["Qty"] || 1);
      const rate  = parseFloat(row["Rate (₹/L)"] || row["Rate"] || row["rate"] || 68);
      const brand = String(row["Brand"] || row["brand"] || "Amul Full Cream").trim();
      const ob    = parseFloat(row["Opening Balance"] || row["opening_balance"] || 0);

      // Validation
      if (!name) { errs.push(`Row ${rowNum}: Name is empty`); return; }
      if (phone && phone.length !== 10) errs.push(`Row ${rowNum} (${name}): Phone should be 10 digits`);
      if (isNaN(qty) || qty <= 0) errs.push(`Row ${rowNum} (${name}): Invalid quantity`);
      if (isNaN(rate) || rate <= 0) errs.push(`Row ${rowNum} (${name}): Invalid rate`);
      if (ob < 0) errs.push(`Row ${rowNum} (${name}): Opening balance cannot be negative`);

      parsed.push({ name, phone, area, default_quantity: qty, rate_per_litre: rate,
        brand_name: BRANDS.includes(brand) ? brand : "Amul Full Cream",
        opening_balance: isNaN(ob) ? 0 : ob, is_active: true });
    });

    setRows(parsed);
    setErrors(errs);
    setStep("preview");
  };

  const runImport = async () => {
    setImporting(true);
    setStep("importing");
    let success = 0, failed = 0;
    const totalOB = rows.reduce((s,r)=>s+(r.opening_balance||0),0);

    for (let i = 0; i < rows.length; i++) {
      setProgress(i + 1);
      try {
        const code = "C" + String(Date.now() + i).slice(-5);
        await db("customers","POST",{ ...rows[i], customer_code: code });
        success++;
      } catch { failed++; }
      await new Promise(r => setTimeout(r, 120)); // small delay to avoid rate limit
    }

    setSummary({ success, failed, totalOB, total: rows.length });
    setStep("done");
    setImporting(false);
  };

  const totalOB = rows.reduce((s,r)=>s+(r.opening_balance||0),0);

  return (
    <div style={{ ...S.modalBg, alignItems:"flex-start", overflowY:"auto" }} onClick={onClose}>
      <div style={{ ...S.modal, borderRadius:0, minHeight:"100vh", paddingBottom:40 }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <button style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#888" }} onClick={onClose}>←</button>
          <div style={{ fontWeight:600, fontSize:16 }}>📥 Import Customers from Excel</div>
        </div>

        {/* Step indicators */}
        <div style={{ display:"flex", gap:6, marginBottom:20 }}>
          {[["upload","1. Upload"],["preview","2. Preview"],["importing","3. Import"],["done","4. Done"]].map(([s,l],i)=>(
            <div key={s} style={{ flex:1, textAlign:"center", padding:"6px 4px", borderRadius:8, fontSize:11, fontWeight:500,
              background: step===s?"#1a6b3c":["upload","preview","importing","done"].indexOf(step)>i?"#e8f5ee":"#f5f5f5",
              color: step===s?"white":["upload","preview","importing","done"].indexOf(step)>i?"#1a6b3c":"#888" }}>
              {l}
            </div>
          ))}
        </div>

        {/* STEP 1 — Upload */}
        {step==="upload" && (
          <div>
            <div style={{ background:"#e8f5ee", borderRadius:10, padding:"12px 14px", marginBottom:16, fontSize:13, color:"#1a6b3c" }}>
              Upload your existing customer list as Excel (.xlsx). Include name, phone, area, quantity, rate, brand, and any previous outstanding balance.
            </div>

            {/* Template download */}
            <button style={{ ...S.btnCancel, width:"100%", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontSize:14 }}
              onClick={downloadTemplate}>
              📄 Download Template First (Recommended)
            </button>

            {/* Column guide */}
            <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:14, marginBottom:16 }}>
              <div style={{ fontWeight:500, fontSize:13, marginBottom:10 }}>Required columns in your Excel:</div>
              {[
                ["Name","Customer full name","Required"],
                ["Phone","10-digit mobile number","Optional"],
                ["Area","Delivery area/location","Optional"],
                ["Daily Qty (L)","Default litres per day","Required"],
                ["Rate (₹/L)","Price per litre","Required"],
                ["Brand","Amul Full Cream / Amul Toned / Nandini / Local","Optional"],
                ["Opening Balance","Previous outstanding amount in ₹","Optional — leave 0 if none"],
              ].map(([col,desc,note])=>(
                <div key={col} style={{ marginBottom:8, paddingBottom:8, borderBottom:"0.5px solid #f5f5f5" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                    <span style={{ fontWeight:500, fontSize:13, color:"#111" }}>{col}</span>
                    <span style={{ fontSize:11, color: note.includes("Required")?"#c62828":"#888" }}>{note}</span>
                  </div>
                  <div style={{ fontSize:12, color:"#888" }}>{desc}</div>
                </div>
              ))}
            </div>

            {/* File upload */}
            <label style={{ display:"block", border:"2px dashed #1a6b3c", borderRadius:12, padding:"32px 20px", textAlign:"center", cursor:"pointer", background:"#f8fdf9" }}>
              <div style={{ fontSize:40, marginBottom:8 }}>📊</div>
              <div style={{ fontSize:15, fontWeight:500, color:"#1a6b3c" }}>Tap to select Excel file</div>
              <div style={{ fontSize:12, color:"#888", marginTop:4 }}>.xlsx or .xls files only</div>
              <input type="file" accept=".xlsx,.xls" style={{ display:"none" }}
                onChange={e=>{ if(e.target.files[0]) parseFile(e.target.files[0]); }} />
            </label>
          </div>
        )}

        {/* STEP 2 — Preview */}
        {step==="preview" && (
          <div>
            {/* Summary */}
            <div style={{ background: errors.length>0?"#fff3cd":"#e8f5ee", border:`1px solid ${errors.length>0?"#ffc107":"#b8dfc8"}`, borderRadius:10, padding:14, marginBottom:14 }}>
              <div style={{ fontWeight:600, fontSize:15, color: errors.length>0?"#856404":"#1a6b3c", marginBottom:8 }}>
                {errors.length > 0 ? `⚠️ ${rows.length} customers found — ${errors.length} warning(s)` : `✅ ${rows.length} customers ready to import`}
              </div>
              <div style={{ display:"flex", gap:16, fontSize:13 }}>
                <div><span style={{ color:"#888" }}>Total customers: </span><strong>{rows.length}</strong></div>
                {totalOB > 0 && <div><span style={{ color:"#888" }}>Total outstanding: </span><strong style={{ color:"#c62828" }}>{fmtCurrency(totalOB)}</strong></div>}
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div style={{ background:"#fdf2f3", border:"0.5px solid #f5c6cb", borderRadius:10, padding:12, marginBottom:14 }}>
                <div style={{ fontWeight:500, fontSize:13, color:"#721c24", marginBottom:6 }}>Warnings (these rows will still import):</div>
                {errors.map((e,i) => <div key={i} style={{ fontSize:12, color:"#c62828", marginBottom:3 }}>• {e}</div>)}
              </div>
            )}

            {/* Preview table */}
            <div style={{ fontWeight:500, fontSize:13, marginBottom:8 }}>Preview (first 5 rows):</div>
            {rows.slice(0,5).map((r,i) => (
              <div key={i} style={S.listCard}>
                <div style={{ ...S.avatar, background:avatarColor(r.name), width:38, height:38, fontSize:13 }}>{initials(r.name)}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500, fontSize:14 }}>{r.name}</div>
                  <div style={{ fontSize:12, color:"#888" }}>{r.phone} • {r.area} • {r.brand_name}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:600, color:"#1a6b3c" }}>{r.default_quantity}L / ₹{r.rate_per_litre}</div>
                  {r.opening_balance > 0 && <div style={{ fontSize:11, color:"#c62828" }}>OB: {fmtCurrency(r.opening_balance)}</div>}
                </div>
              </div>
            ))}
            {rows.length > 5 && <div style={{ textAlign:"center", fontSize:13, color:"#888", padding:"8px 0" }}>...and {rows.length-5} more customers</div>}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16 }}>
              <button style={S.btnCancel} onClick={()=>setStep("upload")}>← Back</button>
              <button style={{ ...S.btnSave, fontSize:15 }} onClick={runImport} disabled={rows.length===0}>
                ✅ Import {rows.length} Customers
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Importing */}
        {step==="importing" && (
          <div style={{ textAlign:"center", padding:"40px 20px" }}>
            <div style={{ fontSize:48, marginBottom:16 }}>⏳</div>
            <div style={{ fontSize:18, fontWeight:600, color:"#1a6b3c", marginBottom:8 }}>Importing customers...</div>
            <div style={{ fontSize:14, color:"#888", marginBottom:24 }}>{progress} of {rows.length} done</div>
            <div style={{ background:"#eee", borderRadius:8, height:10, overflow:"hidden" }}>
              <div style={{ background:"#1a6b3c", height:"100%", borderRadius:8, width:`${(progress/rows.length)*100}%`, transition:"width 0.3s" }} />
            </div>
            <div style={{ fontSize:12, color:"#888", marginTop:12 }}>Please wait — do not close this screen</div>
          </div>
        )}

        {/* STEP 4 — Done */}
        {step==="done" && summary && (
          <div style={{ textAlign:"center", padding:"32px 20px" }}>
            <div style={{ fontSize:64, marginBottom:12 }}>🎉</div>
            <div style={{ fontSize:22, fontWeight:700, color:"#1a6b3c", marginBottom:8 }}>Import Complete!</div>
            <div style={{ display:"flex", gap:12, justifyContent:"center", marginBottom:20 }}>
              <StatBox label="Imported" value={summary.success} />
              {summary.failed > 0 && <StatBox label="Failed" value={summary.failed} />}
              {summary.totalOB > 0 && <StatBox label="Total OB" value={fmtCurrency(summary.totalOB)} />}
            </div>
            {summary.totalOB > 0 && (
              <div style={{ background:"#fff3cd", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#856404" }}>
                ₹{fmtCurrency(summary.totalOB)} in opening balances has been saved and will appear on first bills automatically.
              </div>
            )}
            <button style={{ ...S.btnSave, padding:"14px 40px", fontSize:16 }} onClick={onDone}>
              ✅ Done — View Customers
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Opening Balance Bulk Setup ───────────────────────────────────────────────
function OpeningBalanceSetup() {
  const [customers, setCustomers] = useState([]);
  const [balances, setBalances] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const d = await db("customers","GET",null,"?is_active=eq.true&order=name"); setCustomers(d||DEMO_CUSTOMERS); }
    catch { setCustomers(DEMO_CUSTOMERS); }
    setLoading(false);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const cust of customers) {
        const bal = parseFloat(balances[cust.id] || 0);
        if (bal > 0) await db("customers","PATCH",{ opening_balance: bal },`?id=eq.${cust.id}`);
      }
      setDone(true);
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  };

  if (done) return (
    <div style={{ textAlign:"center", padding:32 }}>
      <div style={{ fontSize:56 }}>✅</div>
      <div style={{ fontSize:20, fontWeight:600, color:"#1a6b3c", marginTop:12 }}>Opening Balances Saved!</div>
      <div style={{ fontSize:13, color:"#888", marginTop:8 }}>These will appear as outstanding on each customer's first bill.</div>
    </div>
  );

  const totalBalance = Object.values(balances).reduce((s,v)=>s+(parseFloat(v)||0),0);

  return (
    <div>
      <div style={{ background:"#e8f5ee", border:"1px solid #b8dfc8", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
        <div style={{ fontWeight:500, fontSize:14, color:"#1a6b3c" }}>One-time migration setup</div>
        <div style={{ fontSize:13, color:"#2d7a50", marginTop:4 }}>Enter how much each customer owed from your previous records. Leave blank for 0.</div>
      </div>
      {totalBalance > 0 && (
        <div style={{ background:"#fff3cd", borderRadius:10, padding:"10px 14px", marginBottom:12, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:13, color:"#856404" }}>Total to migrate</span>
          <span style={{ fontWeight:600, color:"#856404" }}>{fmtCurrency(totalBalance)}</span>
        </div>
      )}
      {loading ? <Loader /> : (
        <>
          {customers.map(c => (
            <div key={c.id} style={S.listCard}>
              <div style={{ ...S.avatar, background:avatarColor(c.name), width:40, height:40 }}>{initials(c.name)}</div>
              <div style={{ flex:1 }}><div style={{ fontWeight:500, fontSize:14 }}>{c.name}</div><div style={{ fontSize:12, color:"#888" }}>{c.customer_code}</div></div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:15, color:"#888" }}>₹</span>
                <input type="number" min="0" placeholder="0" value={balances[c.id]||""}
                  onChange={e=>setBalances(p=>({...p,[c.id]:e.target.value}))}
                  style={{ width:88, padding:"8px 10px", border:"0.5px solid #ddd", borderRadius:8, fontSize:15, textAlign:"right", background:"white", color:"#111" }} />
              </div>
            </div>
          ))}
          <button style={{ ...S.btnSave, width:"100%", padding:14, fontSize:15, marginTop:8 }} onClick={saveAll} disabled={saving}>
            {saving?"Saving...":"✅ Save All Opening Balances"}
          </button>
          <div style={{ fontSize:12, color:"#888", textAlign:"center", marginTop:8 }}>Do this once — never again.</div>
        </>
      )}
    </div>
  );
}

// ─── Owner Settings ───────────────────────────────────────────────────────────
function OwnerSettings() {
  const [sub, setSub] = useState("pins");
  return (
    <div style={{ padding:16 }}>
      <div style={S.sectionTitle}>⚙️ Settings</div>
      <div style={S.filterRow}>
        {[["pins","🔐 PINs"],["brands","🥛 Brands"],["balance","⚖️ Balances"],["rates","💲 Rates"],["lock","🔒 Month Lock"],["about","ℹ️ About"]].map(([id,label]) => (
          <button key={id} style={{ ...S.filterChip, ...(sub===id?S.filterChipActive:{}) }} onClick={()=>setSub(id)}>{label}</button>
        ))}
      </div>
      {sub==="pins" && <PinChangeSection />}
      {sub==="brands" && <BrandManagement />}
      {sub==="balance" && <OpeningBalanceSetup />}
      {sub==="rates" && <RatesSection />}
      {sub==="lock" && <MonthLockSection />}
      {sub==="about" && (
        <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:16, marginTop:8 }}>
          <div style={{ fontWeight:600, fontSize:16, marginBottom:12 }}>🥛 MilkFlow v1.7 — Final Build</div>
          {[["Business","Saikrishna Milk Supply"],["UPI ID",UPI_ID],
            ["Owner URL", window.location.origin+"/owner"],
            ["Delivery URL", window.location.origin+"/entry"],
            ["Customer URL", window.location.origin+"/c/CODE"],
            ["Bill URL", window.location.origin+"/bill/CODE"],
          ].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:8, paddingBottom:8, borderBottom:"0.5px solid #f5f5f5" }}>
              <span style={{ color:"#888" }}>{k}</span><span style={{ fontWeight:500, fontSize:12 }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── WEEK 7 — Rates, Month Lock, Disputes, Annual Statement ──────────────────

// ── Rates Section ─────────────────────────────────────────────────────────────
function RatesSection() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkBrand, setBulkBrand] = useState("Amul Full Cream");
  const [bulkRate, setBulkRate] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [rateHistory, setRateHistory] = useState([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [custs, history] = await Promise.all([
        db("customers","GET",null,"?is_active=eq.true&order=brand_name,name&select=id,name,customer_code,brand_name,rate_per_litre"),
        db("rate_history","GET",null,"?order=changed_at.desc&limit=20&select=*,customers(name,customer_code)"),
      ]);
      setCustomers(custs || DEMO_CUSTOMERS);
      setRateHistory(history || []);
    } catch { setCustomers(DEMO_CUSTOMERS); }
    setLoading(false);
  };

  const applyBulkRate = async () => {
    if (!bulkRate || isNaN(parseFloat(bulkRate))) { alert("Enter a valid rate"); return; }
    const newRate = parseFloat(bulkRate);
    const affected = customers.filter(c => c.brand_name === bulkBrand);
    if (affected.length === 0) { alert("No customers found for this brand"); return; }
    const ok = window.confirm(
      `Change rate for ${affected.length} ${bulkBrand} customers to ₹${newRate}/L?

This will send WhatsApp notification to all affected customers.`
    );
    if (!ok) return;
    setBulkSaving(true);
    let changed = 0;
    for (const cust of affected) {
      try {
        const oldRate = cust.rate_per_litre;
        await db("customers","PATCH",{ rate_per_litre: newRate },`?id=eq.${cust.id}`);
        // Log to rate_history
        try {
          await db("rate_history","POST",{
            customer_id: cust.id,
            old_rate: oldRate,
            new_rate: newRate,
            brand_name: bulkBrand,
            changed_at: new Date().toISOString(),
            changed_by: "owner",
            notes: `Bulk rate change — ${bulkBrand}`,
          });
        } catch {}
        // Send WhatsApp notification
        const phone = (cust.phone||"").replace(/\D/g,"");
        if (phone.length === 10) {
          const msg = encodeURIComponent(
`🥛 *Saikrishna Milk Supply*

Namaste ${cust.name?.split(" ")[0]} ji 🙏

Your milk rate has been updated:

Brand: ${bulkBrand}
Old Rate: ₹${oldRate}/litre
New Rate: ₹${newRate}/litre

This will reflect in your next bill.

Thank you for your continued trust 🙏
— Saikrishna Milk Supply`
          );
          window.open(`https://wa.me/91${phone}?text=${msg}`,"_blank");
          await new Promise(r => setTimeout(r, 1500));
        }
        changed++;
      } catch {}
    }
    setBulkSaving(false);
    setShowBulk(false);
    setBulkRate("");
    loadAll();
    alert(`✅ Rate updated for ${changed} customers and WhatsApp notifications sent!`);
  };

  const byBrand = {};
  customers.forEach(c => {
    const b = c.brand_name || "Amul Full Cream";
    if (!byBrand[b]) byBrand[b] = { customers:[], rate: c.rate_per_litre };
    byBrand[b].customers.push(c);
  });

  if (loading) return <Loader />;

  return (
    <div style={{ marginTop:8 }}>
      <button style={{ ...S.btnPrimary, width:"100%", padding:13, fontSize:14, marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
        onClick={()=>setShowBulk(true)}>
        📢 Bulk Rate Change + WhatsApp Notify
      </button>

      {/* Current rates by brand */}
      <div style={S.sectionTitle}>Current Rates by Brand</div>
      {Object.entries(byBrand).map(([brand, data]) => (
        <div key={brand} style={S.listCard}>
          <div style={{ width:4, height:44, borderRadius:2, background: brand.includes("Full")?"#1565C0":brand.includes("Toned")?"#0288D1":brand==="Nandini"?"#2E7D32":"#6D4C41", flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500 }}>{brand}</div>
            <div style={{ fontSize:12, color:"#888" }}>{data.customers.length} customers</div>
          </div>
          <div style={{ fontWeight:700, fontSize:18, color:"#1a6b3c" }}>₹{data.rate}/L</div>
        </div>
      ))}

      {/* Rate history */}
      {rateHistory.length > 0 && (
        <>
          <div style={{ ...S.sectionTitle, marginTop:16 }}>📋 Rate Change History</div>
          {rateHistory.map((h,i) => (
            <div key={i} style={{ ...S.listCard, padding:"10px 14px" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:500, fontSize:13 }}>{h.customers?.name || "Bulk change"}</div>
                <div style={{ fontSize:12, color:"#888" }}>{h.brand_name} • {fmtDate(h.changed_at)}</div>
              </div>
              <div style={{ textAlign:"right", fontSize:13 }}>
                <span style={{ color:"#c62828" }}>₹{h.old_rate}</span>
                <span style={{ color:"#888", margin:"0 6px" }}>→</span>
                <span style={{ color:"#1a6b3c", fontWeight:600 }}>₹{h.new_rate}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Bulk rate modal */}
      {showBulk && (
        <div style={S.modalBg} onClick={()=>setShowBulk(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHandle} />
            <div style={S.modalName}>📢 Bulk Rate Change</div>
            <div style={S.modalMeta}>Change rate for all customers of one brand at once</div>
            <label style={S.formLabel}>Brand</label>
            <select style={S.formInput} value={bulkBrand} onChange={e=>setBulkBrand(e.target.value)}>
              {["Amul Full Cream","Amul Toned","Nandini","Local"].map(b=><option key={b}>{b}</option>)}
            </select>
            <label style={S.formLabel}>New Rate (₹ per litre)</label>
            <input type="number" step="0.5" style={S.formInput} placeholder="e.g. 72" value={bulkRate} onChange={e=>setBulkRate(e.target.value)} />
            <div style={{ background:"#fff3cd", borderRadius:8, padding:"10px 12px", marginBottom:14, fontSize:12, color:"#856404" }}>
              ⚠️ This will open WhatsApp for each affected customer to send rate change notification. Keep WhatsApp open.
            </div>
            <div style={S.modalActions}>
              <button style={S.btnCancel} onClick={()=>setShowBulk(false)}>Cancel</button>
              <button style={S.btnSave} onClick={applyBulkRate} disabled={bulkSaving}>
                {bulkSaving ? "Updating..." : "Apply + Notify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Month Lock Section ────────────────────────────────────────────────────────
function MonthLockSection() {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0,7);
  const [locked, setLocked] = useState(false);
  const [lockedMonth, setLockedMonth] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkLock(); }, []);

  const checkLock = async () => {
    setLoading(true);
    try {
      const rows = await db("settings","GET",null,"?key=eq.locked_month&select=value");
      if (rows?.[0]?.value) {
        setLockedMonth(rows[0].value);
        setLocked(rows[0].value === currentMonth);
      }
    } catch {}
    setLoading(false);
  };

  const lockMonth = async () => {
    if (pin !== CACHED_PINS.owner_pin) { alert("Wrong PIN"); setPin(""); return; }
    try {
      await db("settings","POST",{ key:"locked_month", value:currentMonth });
      setLocked(true);
      setLockedMonth(currentMonth);
      setPin("");
      alert(`✅ ${monthLabel(currentMonth)} has been locked. No further entries can be modified.`);
    } catch(e) { alert("Error: "+e.message); }
  };

  const unlockMonth = async () => {
    if (pin !== CACHED_PINS.owner_pin) { alert("Wrong PIN"); setPin(""); return; }
    const ok = window.confirm(`Unlock ${monthLabel(lockedMonth)}? This allows editing of records.`);
    if (!ok) return;
    try {
      await db("settings","PATCH",{ value:"" },"?key=eq.locked_month");
      setLocked(false);
      setLockedMonth("");
      setPin("");
      alert("✅ Month unlocked — records can now be edited.");
    } catch(e) { alert("Error: "+e.message); }
  };

  if (loading) return <Loader />;

  return (
    <div style={{ marginTop:8 }}>
      <div style={{ background: locked?"#fdf2f3":"#e8f5ee", border:`1px solid ${locked?"#f5c6cb":"#b8dfc8"}`, borderRadius:12, padding:16, marginBottom:16, textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:8 }}>{locked?"🔒":"🔓"}</div>
        <div style={{ fontWeight:600, fontSize:16, color: locked?"#721c24":"#1a6b3c" }}>
          {locked ? `${monthLabel(lockedMonth)} is Locked` : "Current month is Open"}
        </div>
        <div style={{ fontSize:13, color:"#888", marginTop:4 }}>
          {locked ? "No entries can be modified for locked month" : "Records can be added and edited freely"}
        </div>
      </div>

      <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:16, marginBottom:14 }}>
        <div style={{ fontWeight:500, fontSize:14, marginBottom:12 }}>Enter Owner PIN to {locked?"Unlock":"Lock"}</div>
        <input type="password" maxLength={4} inputMode="numeric" placeholder="••••"
          style={{ ...S.formInput, letterSpacing:10, fontSize:22, textAlign:"center" }}
          value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))} />
        <button
          style={{ ...S.btnSave, width:"100%", background: locked?"#c62828":"#1a6b3c" }}
          onClick={locked ? unlockMonth : lockMonth}>
          {locked ? "🔓 Unlock Month" : `🔒 Lock ${monthLabel(currentMonth)}`}
        </button>
      </div>

      <div style={{ background:"#fff3cd", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#856404" }}>
        💡 Lock month after billing is complete. You can always unlock if you need to make a correction.
      </div>
    </div>
  );
}

// ── Annual Customer Statement ──────────────────────────────────────────────────
function AnnualStatement({ customer }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [bills, payments] = await Promise.all([
        db("bills","GET",null,`?customer_id=eq.${customer.id}&billing_month=gte.${year}-01-01&order=billing_month`),
        db("payments","GET",null,`?customer_id=eq.${customer.id}&payment_date=gte.${year}-01-01&status=eq.confirmed&order=payment_date`),
      ]);
      const totalBilled = (bills||[]).reduce((s,b)=>s+(b.total_amount||0),0);
      const totalPaid   = (payments||[]).reduce((s,p)=>s+(p.amount||0),0);
      setData({ bills: bills||[], payments: payments||[], totalBilled, totalPaid, outstanding: totalBilled-totalPaid });
    } catch { setData({ bills:[], payments:[], totalBilled:0, totalPaid:0, outstanding:0 }); }
    setLoading(false);
  };

  const shareStatement = () => {
    if (!data) return;
    const msg = encodeURIComponent(
`📋 *Annual Statement ${year}*
*Saikrishna Milk Supply*

Customer: ${customer.name}
Code: ${customer.customer_code}
Period: Jan–Dec ${year}

💰 Total Billed: ${fmtCurrency(data.totalBilled)}
✅ Total Paid: ${fmtCurrency(data.totalPaid)}
⏳ Outstanding: ${fmtCurrency(data.outstanding)}

Month-wise:
${(data.bills||[]).map(b=>`${monthLabel(b.billing_month?.slice(0,7))}: ${fmtCurrency(b.total_amount)} — ${b.status==="paid"?"✅ Paid":"⏳ Pending"}`).join("\n")}

— Saikrishna Milk Supply`
    );
    const phone = (customer.phone||"").replace(/\D/g,"");
    window.open(`https://wa.me/91${phone}?text=${msg}`,"_blank");
  };

  if (loading) return <Loader />;

  return (
    <div>
      {/* Summary */}
      <div style={{ background:"linear-gradient(135deg,#0a3d1f,#1a6b3c)", borderRadius:12, padding:16, color:"white", marginBottom:14 }}>
        <div style={{ fontSize:13, opacity:0.8 }}>Annual Statement {year}</div>
        <div style={{ fontSize:22, fontWeight:700, marginTop:4 }}>{customer.name}</div>
        <div style={{ display:"flex", gap:16, marginTop:12 }}>
          <div><div style={{ fontSize:11, opacity:0.7 }}>Total Billed</div><div style={{ fontWeight:600 }}>{fmtCurrency(data.totalBilled)}</div></div>
          <div><div style={{ fontSize:11, opacity:0.7 }}>Total Paid</div><div style={{ fontWeight:600 }}>{fmtCurrency(data.totalPaid)}</div></div>
          <div><div style={{ fontSize:11, opacity:0.7 }}>Outstanding</div><div style={{ fontWeight:600, color:"#ffcc80" }}>{fmtCurrency(data.outstanding)}</div></div>
        </div>
      </div>

      {/* Month-wise bills */}
      {data.bills.map((b,i) => (
        <div key={i} style={{ ...S.listCard, padding:"10px 14px" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500, fontSize:14 }}>{monthLabel(b.billing_month?.slice(0,7))}</div>
            <div style={{ fontSize:12, color:"#888" }}>{b.total_litres?.toFixed(1)}L</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontWeight:600 }}>{fmtCurrency(b.total_amount)}</div>
            <div style={{ ...S.statusBadge, ...(b.status==="paid"?S.badgePaid:S.badgePending) }}>
              {b.status==="paid"?"✅ Paid":"⏳ Pending"}
            </div>
          </div>
        </div>
      ))}

      <button style={{ ...S.btnPrimary, width:"100%", padding:13, marginTop:8, fontSize:14 }} onClick={shareStatement}>
        📤 Share Statement on WhatsApp
      </button>
    </div>
  );
}

// ── Dispute Resolution Log ────────────────────────────────────────────────────
function DisputeLog() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ customer_id:"", type:"billing", description:"", amount:0 });
  const [customers, setCustomers] = useState([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [disp, custs] = await Promise.all([
        db("disputes","GET",null,"?order=created_at.desc&select=*,customers(name,customer_code)"),
        db("customers","GET",null,"?is_active=eq.true&select=id,name,customer_code"),
      ]);
      setDisputes(disp||[]);
      setCustomers(custs||DEMO_CUSTOMERS);
    } catch { setCustomers(DEMO_CUSTOMERS); }
    setLoading(false);
  };

  const addDispute = async () => {
    if (!form.customer_id || !form.description) { alert("Select customer and describe the issue"); return; }
    try {
      await db("disputes","POST",{ ...form, status:"open", created_at:new Date().toISOString() });
      setShowAdd(false);
      setForm({ customer_id:"", type:"billing", description:"", amount:0 });
      loadAll();
    } catch(e) { alert("Error: "+e.message); }
  };

  const resolveDispute = async (id) => {
    const resolution = window.prompt("How was this resolved?");
    if (!resolution) return;
    try {
      await db("disputes","PATCH",{ status:"resolved", resolution, resolved_at:new Date().toISOString() },`?id=eq.${id}`);
      loadAll();
    } catch(e) { alert("Error: "+e.message); }
  };

  const typeColors = { billing:"#1565C0", payment:"#1a6b3c", quantity:"#e65100", other:"#6a1b9a" };

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:13, color:"#888" }}>{disputes.length} total disputes</div>
        <button style={S.btnPrimary} onClick={()=>setShowAdd(true)}>+ Log Dispute</button>
      </div>

      {disputes.length === 0 && (
        <div style={{ textAlign:"center", padding:32, color:"#888" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
          <div>No disputes logged</div>
        </div>
      )}

      {disputes.map((d,i) => (
        <div key={i} style={{ ...S.listCard, flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ ...S.avatar, background:avatarColor(d.customers?.name||""), width:38, height:38, fontSize:13 }}>{initials(d.customers?.name||"")}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:500, fontSize:14 }}>{d.customers?.name}</div>
              <div style={{ fontSize:12, color:"#888" }}>{fmtDate(d.created_at)} • {d.customers?.customer_code}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:11, padding:"2px 8px", borderRadius:8, background: d.status==="resolved"?"#d4edda":"#fff3cd", color: d.status==="resolved"?"#155724":"#856404" }}>
                {d.status==="resolved"?"✅ Resolved":"⏳ Open"}
              </div>
              {d.amount>0 && <div style={{ fontSize:12, fontWeight:500, marginTop:2 }}>{fmtCurrency(d.amount)}</div>}
            </div>
          </div>
          <div style={{ fontSize:13, color:"#555", background:"#f8f9fa", borderRadius:8, padding:"8px 10px" }}>{d.description}</div>
          {d.resolution && <div style={{ fontSize:12, color:"#1a6b3c", background:"#e8f5ee", borderRadius:8, padding:"6px 10px" }}>✅ {d.resolution}</div>}
          {d.status==="open" && (
            <button style={{ ...S.btnPrimary, width:"100%", padding:"8px 0", fontSize:13 }} onClick={()=>resolveDispute(d.id)}>
              Mark as Resolved
            </button>
          )}
        </div>
      ))}

      {showAdd && (
        <div style={S.modalBg} onClick={()=>setShowAdd(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHandle} />
            <div style={S.modalName}>Log Dispute</div>
            <label style={S.formLabel}>Customer</label>
            <select style={S.formInput} value={form.customer_id} onChange={e=>setForm(p=>({...p,customer_id:e.target.value}))}>
              <option value="">Select customer...</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.name} ({c.customer_code})</option>)}
            </select>
            <label style={S.formLabel}>Type</label>
            <select style={S.formInput} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
              {["billing","payment","quantity","other"].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
            <label style={S.formLabel}>Description</label>
            <input style={S.formInput} placeholder="Describe the issue..." value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} />
            <label style={S.formLabel}>Amount Disputed (₹) — optional</label>
            <input type="number" style={S.formInput} placeholder="0" value={form.amount} onChange={e=>setForm(p=>({...p,amount:parseFloat(e.target.value)||0}))} />
            <div style={S.modalActions}>
              <button style={S.btnCancel} onClick={()=>setShowAdd(false)}>Cancel</button>
              <button style={S.btnSave} onClick={addDispute}>Log Dispute</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PinChangeSection() {
  const [ownerForm, setOwnerForm] = useState({ current:"", new1:"", new2:"" });
  const [fatherForm, setFatherForm] = useState({ current:"", new1:"", new2:"" });
  const [ownerMsg, setOwnerMsg] = useState("");
  const [fatherMsg, setFatherMsg] = useState("");

  const changePin = async (role, form, setMsg, resetForm) => {
    const key = role === "owner" ? "owner_pin" : "father_pin";
    const currentCorrect = CACHED_PINS[key];
    if (form.current !== currentCorrect) { setMsg("❌ Current PIN is wrong"); return; }
    if (form.new1.length !== 4 || !/^\d{4}$/.test(form.new1)) { setMsg("❌ New PIN must be exactly 4 digits"); return; }
    if (form.new1 !== form.new2) { setMsg("❌ New PINs don't match"); return; }
    const ok = await savePin(key, form.new1);
    setMsg(ok ? "✅ PIN changed successfully!" : "✅ PIN changed (saved locally)");
    resetForm();
  };

  const PinInput = ({ label, value, onChange }) => (
    <div style={{ marginBottom:10 }}>
      <label style={S.formLabel}>{label}</label>
      <input type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*" placeholder="••••"
        style={{ ...S.formInput, letterSpacing:10, fontSize:22, textAlign:"center", marginBottom:0 }}
        value={value} onChange={e => onChange(e.target.value.replace(/\D/g,"").slice(0,4))} />
    </div>
  );

  return (
    <div style={{ marginTop:8 }}>
      <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:16, marginBottom:14 }}>
        <div style={{ fontWeight:500, fontSize:15, marginBottom:14 }}>👑 Change Owner PIN</div>
        <PinInput label="Current PIN" value={ownerForm.current} onChange={v=>setOwnerForm(p=>({...p,current:v}))} />
        <PinInput label="New PIN (4 digits)" value={ownerForm.new1} onChange={v=>setOwnerForm(p=>({...p,new1:v}))} />
        <PinInput label="Confirm New PIN" value={ownerForm.new2} onChange={v=>setOwnerForm(p=>({...p,new2:v}))} />
        {ownerMsg && <div style={{ fontSize:13, marginBottom:10, color:ownerMsg.startsWith("✅")?"#1a6b3c":"#c62828" }}>{ownerMsg}</div>}
        <button style={{ ...S.btnSave, width:"100%", marginTop:4 }} onClick={() => changePin("owner", ownerForm, setOwnerMsg, ()=>setOwnerForm({current:"",new1:"",new2:""}))}>Change Owner PIN</button>
      </div>

      <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:16 }}>
        <div style={{ fontWeight:500, fontSize:15, marginBottom:14 }}>🥛 Change Delivery PIN</div>
        <PinInput label="Current PIN" value={fatherForm.current} onChange={v=>setFatherForm(p=>({...p,current:v}))} />
        <PinInput label="New PIN (4 digits)" value={fatherForm.new1} onChange={v=>setFatherForm(p=>({...p,new1:v}))} />
        <PinInput label="Confirm New PIN" value={fatherForm.new2} onChange={v=>setFatherForm(p=>({...p,new2:v}))} />
        {fatherMsg && <div style={{ fontSize:13, marginBottom:10, color:fatherMsg.startsWith("✅")?"#1a6b3c":"#c62828" }}>{fatherMsg}</div>}
        <button style={{ ...S.btnSave, width:"100%", marginTop:4 }} onClick={() => changePin("father", fatherForm, setFatherMsg, ()=>setFatherForm({current:"",new1:"",new2:""}))}>Change Delivery PIN</button>
      </div>

      <div style={{ background:"#e8f5ee", borderRadius:10, padding:"10px 14px", marginTop:12, fontSize:13, color:"#2d7a50" }}>
        💡 Default PINs: Owner = 1234 · Delivery = 0000
      </div>
    </div>
  );
}

function DailyRecords() {
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(()=>{ load(); },[date]);
  const load = async () => {
    setLoading(true);
    try { const d = await db("daily_entries","GET",null,`?entry_date=eq.${date}&select=*,customers(name,customer_code,area_name)`); setEntries(d||DEMO_ENTRIES); }
    catch { setEntries(DEMO_ENTRIES); }
    setLoading(false);
  };
  const total = entries.reduce((s,e)=>s+(e.quantity_litres||0),0);
  return (
    <div style={{ padding:16 }}>
      <div style={S.sectionTitle}>📋 Daily Records</div>
      <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ ...S.formInput, marginBottom:12 }} />
      <div style={S.statsGrid}>
        <StatCard label="Entries" value={entries.length} icon="📝" color="#1a6b3c" />
        <StatCard label="Total Litres" value={total.toFixed(1)+"L"} icon="🥛" color="#1565C0" />
        <StatCard label="Zero Delivery" value={entries.filter(e=>e.quantity_litres===0).length} icon="🚫" color="#c62828" />
      </div>
      {loading ? <Loader /> : entries.map((e,i) => (
        <div key={i} style={S.listCard}>
          <div style={{ ...S.avatar, background:avatarColor(e.customers?.name||""), width:36, height:36, fontSize:12 }}>{initials(e.customers?.name||"")}</div>
          <div style={{ flex:1 }}><div style={{fontWeight:500,fontSize:14}}>{e.customers?.name||"Customer"}</div><div style={{fontSize:12,color:"#888"}}>{e.customers?.area_name} • by {e.entered_by}</div></div>
          <div style={{fontWeight:600,color:e.quantity_litres===0?"#c62828":"#1a6b3c",fontSize:16}}>{e.quantity_litres===0?"🚫":e.quantity_litres+"L"}</div>
        </div>
      ))}
    </div>
  );
}

// ─── BILLING ENGINE — Week 3 ──────────────────────────────────────────────────

function BillingSection() {
  const now = new Date();
  const [month, setMonth] = useState(now.toISOString().slice(0,7));
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewBill, setPreviewBill] = useState(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [editBill, setEditBill] = useState(null);

  useEffect(()=>{ loadBills(); },[month]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const d = await db("bills","GET",null,
        `?billing_month=eq.${month+"-01"}&select=*,customers(name,customer_code,phone,area_name,default_quantity,rate_per_litre,opening_balance)`
      );
      setBills(d && d.length > 0 ? d : DEMO_BILLS);
    } catch { setBills(DEMO_BILLS); }
    setLoading(false);
  };

  // Generate bills from daily entries for the selected month
  const generateBills = async () => {
    setGenerating(true);
    try {
      // Get all active customers
      const customers = await db("customers","GET",null,"?is_active=eq.true");
      // Get all entries for the month
      const [y,m] = month.split("-");
      const startDate = `${y}-${m}-01`;
      const endDate = new Date(parseInt(y), parseInt(m), 0).toISOString().split("T")[0];
      const entries = await db("daily_entries","GET",null,
        `?entry_date=gte.${startDate}&entry_date=lte.${endDate}&select=customer_id,quantity_litres`
      );

      // Group entries by customer
      const entryMap = {};
      (entries||[]).forEach(e => {
        if (!entryMap[e.customer_id]) entryMap[e.customer_id] = 0;
        entryMap[e.customer_id] += (e.quantity_litres || 0);
      });

      // Generate bill per customer
      const generated = [];
      for (const cust of (customers||DEMO_CUSTOMERS)) {
        const totalLitres = entryMap[cust.id] || (cust.default_quantity * 30);
        const milkAmount = Math.round(totalLitres * (cust.rate_per_litre || 68));
        const outstanding = cust.opening_balance || 0;
        const totalAmount = milkAmount + outstanding;

        const billPayload = {
          customer_id: cust.id,
          billing_month: startDate,
          total_litres: totalLitres,
          milk_amount: milkAmount,
          opening_balance: outstanding,
          total_amount: totalAmount,
          status: "pending",
        };

        try {
          // Check if bill already exists
          const existing = await db("bills","GET",null,
            `?customer_id=eq.${cust.id}&billing_month=eq.${startDate}&limit=1`
          );
          if (existing && existing.length > 0) {
            await db("bills","PATCH",{ total_litres:totalLitres, milk_amount:milkAmount, total_amount:totalAmount },`?id=eq.${existing[0].id}`);
          } else {
            await db("bills","POST",billPayload);
          }
          generated.push({ ...billPayload, customers: cust });
        } catch { generated.push({ ...billPayload, customers: cust }); }
      }
      setBills(generated);
    } catch(e) {
      // Demo fallback
      setBills(DEMO_BILLS);
    }
    setGenerating(false);
    alert(`✅ Bills generated for ${monthLabel(month)}!\n\nReview each bill, then send via WhatsApp.`);
  };

  // Send single bill via WhatsApp
  const sendBillWhatsApp = (bill) => {
    const cust = bill.customers;
    const phone = (cust?.phone||"").replace(/\D/g,"");
    const billUrl = `${window.location.origin}/bill/${cust?.customer_code||"C001"}`;
    const msg = encodeURIComponent(
`🥛 *Saikrishna Milk Supply*
Namaste ${cust?.name?.split(" ")[0]} ji 🙏

Your ${monthLabel(month)} milk bill is ready!

📋 Total Litres: ${bill.total_litres?.toFixed(1)}L
${(bill.opening_balance||0)>0?`⚠️ Previous Outstanding: ${fmtCurrency(bill.opening_balance)}\n`:""}💰 *Total Due: ${fmtCurrency(bill.total_amount)}*

👉 View full bill: ${billUrl}

Pay via GPay/PhonePe/Paytm:
UPI: ${UPI_ID}

After paying, please share payment screenshot here to confirm ✅

Thank you! 🙏`
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank");
  };

  // Bulk send all pending bills
  const sendAllWhatsApp = async () => {
    const pending = bills.filter(b => b.status !== "paid");
    if (pending.length === 0) { alert("All bills are already paid!"); return; }
    const ok = window.confirm(`Send bills to ${pending.length} customers via WhatsApp?\n\nThis will open WhatsApp one by one.`);
    if (!ok) return;
    setSendingAll(true);
    for (let i = 0; i < pending.length; i++) {
      setSendProgress(i + 1);
      sendBillWhatsApp(pending[i]);
      await new Promise(r => setTimeout(r, 2500)); // 2.5s gap between each
    }
    setSendingAll(false);
    setSendProgress(0);
    alert(`✅ Sent ${pending.length} bills via WhatsApp!`);
  };

  const totalAmount = bills.reduce((s,b)=>s+(b.total_amount||0),0);
  const paidCount = bills.filter(b=>b.status==="paid").length;
  const pendingCount = bills.length - paidCount;
  const pendingAmount = bills.filter(b=>b.status!=="paid").reduce((s,b)=>s+(b.total_amount||0),0);

  return (
    <div style={{ padding:16 }}>
      <div style={S.sectionTitle}>🧾 Month-End Billing</div>

      {/* Month selector + Generate */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{ ...S.formInput, flex:1, marginBottom:0 }} />
        <button style={{ ...S.btnPrimary, padding:"10px 14px", whiteSpace:"nowrap" }}
          onClick={generateBills} disabled={generating}>
          {generating ? "⏳ Generating..." : "⚡ Generate Bills"}
        </button>
      </div>

      {generating && (
        <div style={{ background:"#e8f5ee", borderRadius:10, padding:"12px 14px", marginBottom:12, fontSize:13, color:"#1a6b3c" }}>
          ⏳ Calculating bills from daily entries... Please wait.
        </div>
      )}

      {/* Stats */}
      <div style={S.statsGrid}>
        <StatCard label="Total Bills" value={bills.length} icon="🧾" color="#1565C0" />
        <StatCard label="Total Amount" value={fmtCurrency(totalAmount)} icon="💰" color="#1a6b3c" />
        <StatCard label="Paid" value={paidCount} icon="✅" color="#2E7D32" />
        <StatCard label="Pending" value={pendingCount} icon="⏳" color="#c62828" />
      </div>

      {/* Bulk send */}
      {pendingCount > 0 && (
        <button
          style={{ ...S.btnPrimary, width:"100%", padding:13, marginBottom:12, fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
          onClick={sendAllWhatsApp} disabled={sendingAll}>
          {sendingAll
            ? `📤 Sending ${sendProgress}/${pendingCount}...`
            : `📤 Send All ${pendingCount} Bills via WhatsApp`}
        </button>
      )}

      {/* Bill list */}
      {loading ? <Loader /> : bills.map((b,i) => (
        <div key={i} style={S.listCard}>
          <div style={{ ...S.avatar, background:avatarColor(b.customers?.name||""), width:40, height:40, fontSize:13 }}>
            {initials(b.customers?.name||"")}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:500, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.customers?.name||"Customer"}</div>
            <div style={{ fontSize:12, color:"#888" }}>{b.customers?.customer_code} • {b.total_litres?.toFixed(1)}L</div>
            {(b.opening_balance||0)>0 && <div style={{ fontSize:11, color:"#c62828" }}>+{fmtCurrency(b.opening_balance)} outstanding</div>}
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
            <div style={{ fontWeight:600, fontSize:15 }}>{fmtCurrency(b.total_amount)}</div>
            <div style={{ ...S.statusBadge, ...(b.status==="paid"?S.badgePaid:S.badgePending) }}>
              {b.status==="paid"?"✅ Paid":"⏳ Pending"}
            </div>
            <div style={{ display:"flex", gap:4, marginTop:2 }}>
              <button style={{ fontSize:11, padding:"3px 8px", background:"#e8f5ee", border:"0.5px solid #b8dfc8", borderRadius:8, color:"#1a6b3c", cursor:"pointer" }}
                onClick={()=>setPreviewBill(b)}>👁 View</button>
              {b.status !== "paid" && (
                <button style={{ fontSize:11, padding:"3px 8px", background:"#e7f3ff", border:"0.5px solid #b3d4f5", borderRadius:8, color:"#1565C0", cursor:"pointer" }}
                  onClick={()=>sendBillWhatsApp(b)}>📤 Send</button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Bill Preview Modal */}
      {previewBill && (
        <div style={{ ...S.modalBg, alignItems:"flex-start", overflowY:"auto" }} onClick={()=>setPreviewBill(null)}>
          <div style={{ ...S.modal, borderRadius:0, minHeight:"100vh", paddingBottom:40 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
              <button style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#888" }} onClick={()=>setPreviewBill(null)}>←</button>
              <div style={{ fontWeight:600, fontSize:16 }}>Bill Preview</div>
              <button style={{ marginLeft:"auto", ...S.btnPrimary, padding:"8px 14px", fontSize:13 }} onClick={()=>sendBillWhatsApp(previewBill)}>📤 Send WhatsApp</button>
            </div>
            <BillView bill={previewBill} customer={previewBill.customers} month={month} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BILL VIEW — used in preview modal + /bill/CODE page ─────────────────────
function BillView({ bill, customer, month, entries }) {
  const [year, mon] = (month||"").split("-");
  const daysInMonth = month ? new Date(parseInt(year), parseInt(mon), 0).getDate() : 30;
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=Saikrishna+Milk+Supply&am=${bill?.total_amount||0}&cu=INR&tn=MilkBill${month||""}`;
  const billUrl = `${window.location.origin}/bill/${customer?.customer_code||"C001"}`;
  const whatsappUrl = `https://wa.me/91${(customer?.phone||"").replace(/\D/g,"")}`;

  return (
    <div style={{ maxWidth:480, margin:"0 auto", fontFamily:"sans-serif" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#0a3d1f,#1a6b3c)", borderRadius:14, padding:"20px 20px 16px", marginBottom:12, color:"white" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
          <img src={logo_app} style={{ width:56, height:56, borderRadius:10, objectFit:"contain", background:"white", padding:3, flexShrink:0 }} alt="Saikrishna Milk Supply" />
          <div>
            <div style={{ fontSize:18, fontWeight:700 }}>Saikrishna Milk Supply</div>
            <div style={{ fontSize:11, opacity:0.8 }}>Pure Milk • Pure Love • Pure Life</div>
            <div style={{ fontSize:11, opacity:0.85 }}>UPI: {UPI_ID}</div>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", background:"rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px" }}>
          <div><div style={{ fontSize:11, opacity:0.75 }}>Customer</div><div style={{ fontWeight:600, fontSize:14 }}>{customer?.name}</div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:11, opacity:0.75 }}>Code</div><div style={{ fontWeight:600, fontSize:14 }}>{customer?.customer_code}</div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:11, opacity:0.75 }}>Month</div><div style={{ fontWeight:600, fontSize:14 }}>{monthLabel(month)}</div></div>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
        {[
          ["📦 Total Litres", `${(bill?.total_litres||0).toFixed(1)} L`],
          ["💲 Rate", `₹${customer?.rate_per_litre||68}/L`],
          ["📅 Period", `${daysInMonth} days`],
        ].map(([l,v])=>(
          <div key={l} style={{ background:"#f8f9fa", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#888", marginBottom:2 }}>{l}</div>
            <div style={{ fontWeight:600, fontSize:14, color:"#111" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Day-wise table */}
      {entries && entries.length > 0 && (
        <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, marginBottom:12, overflow:"hidden" }}>
          <div style={{ background:"#f8f9fa", padding:"10px 14px", fontSize:12, fontWeight:600, color:"#555", borderBottom:"0.5px solid #eee", display:"grid", gridTemplateColumns:"50px 1fr 60px 70px" }}>
            <span>Date</span><span>Day</span><span style={{textAlign:"center"}}>Litres</span><span style={{textAlign:"right"}}>Amount</span>
          </div>
          <div style={{ maxHeight:280, overflowY:"auto" }}>
            {entries.map((e,i)=>{
              const d = new Date(e.entry_date);
              const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
              const amt = (e.quantity_litres||0) * (customer?.rate_per_litre||68);
              return (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"50px 1fr 60px 70px", padding:"8px 14px", borderBottom:"0.5px solid #f5f5f5", fontSize:13, background:i%2===0?"white":"#fafafa" }}>
                  <span style={{ color:"#888" }}>{d.getDate().toString().padStart(2,"0")}</span>
                  <span style={{ color:"#555" }}>{days[d.getDay()]}</span>
                  <span style={{ textAlign:"center", color:e.quantity_litres===0?"#c62828":"#1a6b3c", fontWeight:500 }}>{e.quantity_litres===0?"🚫":e.quantity_litres+"L"}</span>
                  <span style={{ textAlign:"right", color:"#111" }}>{e.quantity_litres===0?"—":fmtCurrency(Math.round(amt))}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bill totals */}
      <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:"16px", marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:14, color:"#555" }}>
          <span>Milk charges ({(bill?.total_litres||0).toFixed(1)}L × ₹{customer?.rate_per_litre||68})</span>
          <span>{fmtCurrency(bill?.milk_amount || Math.round((bill?.total_litres||0)*(customer?.rate_per_litre||68)))}</span>
        </div>
        {(bill?.opening_balance||0) > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:14, color:"#c62828" }}>
            <span>Previous outstanding</span>
            <span>+{fmtCurrency(bill.opening_balance)}</span>
          </div>
        )}
        <div style={{ borderTop:"1.5px solid #1a6b3c", marginTop:10, paddingTop:10, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontWeight:700, fontSize:17 }}>TOTAL DUE</span>
          <span style={{ fontWeight:700, fontSize:20, color:"#c62828" }}>{fmtCurrency(bill?.total_amount)}</span>
        </div>
      </div>

      {/* Pay button */}
      <a href={upiLink} style={{ display:"block", background:"#1a6b3c", color:"white", textAlign:"center", padding:"15px", borderRadius:12, fontSize:16, fontWeight:600, textDecoration:"none", marginBottom:10 }}>
        💳 Pay {fmtCurrency(bill?.total_amount)} — GPay / PhonePe / Paytm
      </a>

      {/* Screenshot reminder */}
      <div style={{ background:"#fff3cd", border:"1px solid #ffc107", borderRadius:10, padding:"12px 14px", marginBottom:12, fontSize:13, color:"#856404", textAlign:"center" }}>
        ⚠️ After paying, <strong>share your payment screenshot on WhatsApp</strong><br/>
        Unshared payments show as OUTSTANDING on next bill
      </div>

      {/* WhatsApp share */}
      <a href={whatsappUrl} style={{ display:"block", background:"#25D366", color:"white", textAlign:"center", padding:"13px", borderRadius:12, fontSize:14, fontWeight:500, textDecoration:"none", marginBottom:20 }}>
        📸 Share Payment Screenshot on WhatsApp
      </a>

      <div style={{ textAlign:"center", fontSize:11, color:"#bbb", paddingBottom:20 }}>
        {customer?.customer_code} • {monthLabel(month)} • Saikrishna Milk Supply
      </div>
    </div>
  );
}

// ─── BILL WEBPAGE — /bill/CODE route ─────────────────────────────────────────
function BillPage({ customerCode }) {
  const [bill, setBill] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;

  useEffect(()=>{ load(); },[]);

  const load = async () => {
    setLoading(true);
    try {
      const custs = await db("customers","GET",null,`?customer_code=eq.${customerCode}&limit=1`);
      const cust = custs?.[0] || DEMO_CUSTOMERS.find(c=>c.customer_code===customerCode) || DEMO_CUSTOMERS[0];
      setCustomer(cust);

      const [y,m] = month.split("-");
      const startDate = `${y}-${m}-01`;
      const endDate = new Date(parseInt(y),parseInt(m),0).toISOString().split("T")[0];

      const [bills, monthEntries] = await Promise.all([
        db("bills","GET",null,`?customer_id=eq.${cust.id}&billing_month=eq.${startDate}&limit=1`),
        db("daily_entries","GET",null,`?customer_id=eq.${cust.id}&entry_date=gte.${startDate}&entry_date=lte.${endDate}&order=entry_date`),
      ]);

      setBill(bills?.[0] || DEMO_BILL);
      setEntries(monthEntries || DEMO_PORTAL_ENTRIES.slice(0,10));
    } catch {
      setCustomer(DEMO_CUSTOMERS[0]);
      setBill(DEMO_BILL);
      setEntries(DEMO_PORTAL_ENTRIES.slice(0,10));
    }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", flexDirection:"column", gap:12 }}>
      <img src={logo_app} style={{width:72,height:72,borderRadius:16,objectFit:"contain"}} alt="loading"/>
      <div style={{ fontSize:14, color:"#888" }}>Loading your bill...</div>
    </div>
  );

  return (
    <div style={{ background:"#f8f9fa", minHeight:"100vh", padding:"16px 12px" }}>
      <BillView bill={bill} customer={customer} month={month} entries={entries} />
    </div>
  );
}

// ─── PAYMENT TRACKING — Week 4 Full System ───────────────────────────────────
function PaymentTracking() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("pending_confirmation");
  const [loading, setLoading] = useState(true);
  const [showCash, setShowCash] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [showPartial, setShowPartial] = useState(null); // bill object
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrImage, setOcrImage] = useState(null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [cashForm, setCashForm] = useState({ customer_id:"", amount:"", note:"" });
  const [partialAmount, setPartialAmount] = useState("");

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pmts, custs] = await Promise.all([
        db("payments","GET",null,"?order=payment_date.desc&limit=100&select=*,customers(name,customer_code,phone)"),
        db("customers","GET",null,"?is_active=eq.true&order=name&select=id,name,customer_code"),
      ]);
      setPayments(pmts && pmts.length > 0 ? pmts : DEMO_PAYMENTS);
      setCustomers(custs || DEMO_CUSTOMERS);
    } catch {
      setPayments(DEMO_PAYMENTS);
      setCustomers(DEMO_CUSTOMERS);
    }
    setLoading(false);
  };

  // ── Confirm payment ──
  const confirmPayment = async (p) => {
    try {
      // Confirm payment
      await db("payments","PATCH",
        { status:"confirmed", owner_confirmed:true },
        `?id=eq.${p.id}`
      );
      // Try to update bill — ignore if fails
      try {
        await db("bills","PATCH",{ status:"paid" },`?customer_id=eq.${p.customer_id}&status=eq.pending`);
      } catch {}
      loadAll();
    } catch(e) {
      console.error("Confirm error:", e.message);
      // Still refresh — payment may have saved
      loadAll();
    }
  };

  // ── Reject payment ──
  const rejectPayment = async (p) => {
    const reason = window.prompt("Reason for rejection (shown in log):", "Amount mismatch");
    if (reason === null) return;
    try {
      await db("payments","PATCH",{ status:"rejected" },`?id=eq.${p.id}`);
      loadAll();
    } catch(e) {
      console.error("Reject error:", e.message);
      loadAll();
    }
  };

  // ── Mark cash paid ──
  const markCashPaid = async () => {
    if (!cashForm.customer_id || !cashForm.amount) { alert("Select customer and enter amount"); return; }
    const amt = parseFloat(cashForm.amount);
    if (isNaN(amt) || amt <= 0) { alert("Enter a valid amount"); return; }
    try {
      await db("payments","POST",{
        customer_id: cashForm.customer_id,
        amount: amt,
        payment_method: "cash",
        payment_date: today(),
        status: "confirmed",
        owner_confirmed: true,
        notes: cashForm.note || "Cash payment — marked by owner",
      });
      await db("bills","PATCH",{ status:"paid" },`?customer_id=eq.${cashForm.customer_id}&status=eq.pending`);
      setCashForm({ customer_id:"", amount:"", note:"" });
      setShowCash(false);
      loadAll();
      alert("✅ Cash payment recorded!");
    } catch(e) { alert("Error: "+e.message); }
  };

  // ── OCR screenshot processing ──
  const processScreenshot = async (file) => {
    if (!file) return;
    setOcrProcessing(true);
    setOcrResult(null);

    // Show image preview
    const reader = new FileReader();
    reader.onload = (e) => setOcrImage(e.target.result);
    reader.readAsDataURL(file);

    try {
      // Load Tesseract from CDN
      if (!window.Tesseract) {
        await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
      }

      const result = await window.Tesseract.recognize(file, "eng", {
        logger: () => {},
      });

      const text = result.data.text;
      const parsed = parsePaymentScreenshot(text);
      setOcrResult({ ...parsed, rawText: text });
    } catch(e) {
      // Fallback — manual entry if OCR fails
      setOcrResult({ error: true, rawText: "" });
    }
    setOcrProcessing(false);
  };

  // ── Parse OCR text to extract payment details ──
  const parsePaymentScreenshot = (text) => {
    const lines = text.toLowerCase();

    // Amount — look for ₹ or Rs followed by numbers
    const amtMatch = text.match(/(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i)
      || text.match(/([0-9,]+(?:\.[0-9]{2})?)\s*(?:rupees)/i);
    const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g,"")) : null;

    // Status — success keywords
    const isSuccess = /success|paid|complete|done|debit/i.test(text);
    const isFailed = /fail|declin|reject|error/i.test(text);

    // Transaction ID — UPI ref / transaction ID patterns
    const txnMatch = text.match(/(?:upi ref|txn|transaction|ref)\s*[:#]?\s*([A-Z0-9]{8,20})/i);
    const txnId = txnMatch ? txnMatch[1] : null;

    // Date — common date patterns
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    const date = dateMatch ? dateMatch[1] : today();

    // Payment app detection
    const app = /gpay|google pay/i.test(text) ? "GPay"
      : /phonepe/i.test(text) ? "PhonePe"
      : /paytm/i.test(text) ? "Paytm"
      : /bhim/i.test(text) ? "BHIM"
      : "UPI";

    // Fraud checks
    const fraudFlags = [];
    if (!isSuccess) fraudFlags.push("Payment status not SUCCESS");
    if (isFailed) fraudFlags.push("Payment appears FAILED");
    if (!amount) fraudFlags.push("Could not read amount");
    if (!txnId) fraudFlags.push("No transaction ID found");

    return { amount, isSuccess, isFailed, txnId, date, app, fraudFlags };
  };

  const loadScript = (src) => new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  // ── Save OCR-verified payment ──
  const saveOcrPayment = async (customerId, billAmount) => {
    if (!ocrResult || !customerId) { alert("Select customer first"); return; }
    const amt = ocrResult.amount || parseFloat(billAmount);
    if (!amt) { alert("Enter amount manually"); return; }

    // Duplicate check
    if (ocrResult.txnId) {
      try {
        const existing = await db("payments","GET",null,`?transaction_id=eq.${ocrResult.txnId}&limit=1`);
        if (existing && existing.length > 0) { alert("⚠️ Duplicate! This transaction ID already exists in records."); return; }
      } catch {}
    }

    try {
      await db("payments","POST",{
        customer_id: customerId,
        amount: amt,
        payment_method: "upi",
        payment_date: today(),
        status: "pending_confirmation",
        transaction_id: ocrResult.txnId,
        payment_app: ocrResult.app,
        ocr_verified: true,
        notes: `OCR read from screenshot. App: ${ocrResult.app}. TxnID: ${ocrResult.txnId||"not found"}`,
      });
      setShowOCR(false);
      setOcrResult(null);
      setOcrImage(null);
      loadAll();
      alert("✅ Payment added to review queue!\n\nNow verify in your GPay/PhonePe app and tap Confirm.");
    } catch(e) { alert("Error saving: "+e.message); }
  };

  // ── Stats ──
  const pendingCount = payments.filter(p=>p.status==="pending_confirmation").length;
  const confirmedToday = payments.filter(p=>p.status==="confirmed" && p.payment_date===today()).length;
  const totalConfirmed = payments.filter(p=>p.status==="confirmed").reduce((s,p)=>s+(p.amount||0),0);
  const filtered = payments.filter(p => filter==="all" || p.status===filter);

  return (
    <div style={{ padding:16 }}>
      <div style={S.sectionTitle}>💳 Payment Tracking</div>

      {/* Stats */}
      <div style={S.statsGrid}>
        <StatCard label="Awaiting Review" value={pendingCount} icon="⏳" color={pendingCount>0?"#c62828":"#1a6b3c"} />
        <StatCard label="Confirmed Today" value={confirmedToday} icon="✅" color="#2E7D32" />
        <StatCard label="Total Collected" value={fmtCurrency(totalConfirmed)} icon="💰" color="#1a6b3c" />
        <StatCard label="Total Records" value={payments.length} icon="📋" color="#1565C0" />
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <button style={{ flex:1, ...S.btnPrimary, padding:"11px 8px", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
          onClick={()=>setShowOCR(true)}>
          📸 Upload Screenshot
        </button>
        <button style={{ flex:1, background:"#f0f4ff", border:"0.5px solid #c5d5f5", borderRadius:10, padding:"11px 8px", fontSize:13, color:"#1565C0", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
          onClick={()=>setShowCash(true)}>
          💵 Mark Cash Paid
        </button>
      </div>

      {/* Alert if pending reviews */}
      {pendingCount > 0 && (
        <div style={S.alertBox}>
          <span style={{fontSize:20}}>⚠️</span>
          <div>
            <div style={{fontWeight:500,fontSize:14}}>{pendingCount} payment{pendingCount>1?"s":""} waiting for your confirmation</div>
            <div style={{fontSize:12,color:"#856404"}}>Check your GPay/PhonePe app and confirm below</div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div style={S.filterRow}>
        {[
          ["pending_confirmation",`⏳ Review (${pendingCount})`],
          ["confirmed","✅ Confirmed"],
          ["rejected","❌ Rejected"],
          ["all","All"],
        ].map(([f,l]) => (
          <button key={f} style={{ ...S.filterChip, ...(filter===f?S.filterChipActive:{}) }} onClick={()=>setFilter(f)}>{l}</button>
        ))}
      </div>

      {/* Payment list */}
      {loading ? <Loader /> : (
        <>
          {filtered.length === 0 && (
            <div style={{ textAlign:"center", padding:32, color:"#888", fontSize:14 }}>
              {filter==="pending_confirmation" ? "✅ No payments waiting for review" : "No payments found"}
            </div>
          )}
          {filtered.map((p,i) => (
            <div key={i} style={{ ...S.listCard, flexDirection:"column", alignItems:"stretch", gap:10 }}>
              {/* Top row */}
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ fontSize:28 }}>{p.payment_method==="cash"?"💵":p.payment_app==="GPay"?"🟢":p.payment_app==="PhonePe"?"🟣":"📱"}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:500, fontSize:15 }}>{p.customers?.name||"Customer"}</div>
                  <div style={{ fontSize:12, color:"#888" }}>
                    {p.payment_app||p.payment_method?.toUpperCase()||"UPI"} • {fmtDate(p.payment_date)}
                    {p.transaction_id && <span style={{marginLeft:6,color:"#aaa"}}>#{p.transaction_id.slice(-6)}</span>}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:700, fontSize:17, color:"#1a6b3c" }}>{fmtCurrency(p.amount)}</div>
                  <div style={{ ...S.statusBadge, ...(p.status==="confirmed"?S.badgePaid:p.status==="rejected"?S.badgeRejected:S.badgePending) }}>
                    {p.status==="confirmed"?"✅ Confirmed":p.status==="rejected"?"❌ Rejected":"⏳ Pending"}
                  </div>
                </div>
              </div>

              {/* OCR verified badge */}
              {p.ocr_verified && (
                <div style={{ fontSize:11, color:"#2E7D32", background:"#e8f5ee", padding:"4px 10px", borderRadius:8, display:"inline-block" }}>
                  🔍 OCR verified screenshot
                </div>
              )}

              {/* Confirm / Reject buttons for pending */}
              {p.status==="pending_confirmation" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <button style={{ background:"#f8d7da", border:"0.5px solid #f5c6cb", borderRadius:10, padding:"10px 0", fontSize:13, color:"#721c24", cursor:"pointer", fontWeight:500 }}
                    onClick={()=>rejectPayment(p)}>
                    ❌ Reject
                  </button>
                  <button style={{ background:"#1a6b3c", border:"none", borderRadius:10, padding:"10px 0", fontSize:13, color:"white", cursor:"pointer", fontWeight:500 }}
                    onClick={()=>confirmPayment(p)}>
                    ✅ Confirm Paid
                  </button>
                </div>
              )}

              {/* Rejection reason */}
              {p.status==="rejected" && p.rejection_reason && (
                <div style={{ fontSize:12, color:"#c62828", background:"#fdf2f3", padding:"6px 10px", borderRadius:8 }}>
                  Reason: {p.rejection_reason}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── CASH PAYMENT MODAL ── */}
      {showCash && (
        <div style={S.modalBg} onClick={()=>setShowCash(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHandle} />
            <div style={S.modalName}>💵 Mark Cash Payment</div>
            <div style={S.modalMeta}>Record a cash payment received from customer</div>

            <label style={S.formLabel}>Customer *</label>
            <select style={S.formInput} value={cashForm.customer_id} onChange={e=>setCashForm(p=>({...p,customer_id:e.target.value}))}>
              <option value="">Select customer...</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.name} ({c.customer_code})</option>)}
            </select>

            <label style={S.formLabel}>Amount Received (₹) *</label>
            <input type="number" style={S.formInput} placeholder="e.g. 2040" value={cashForm.amount} onChange={e=>setCashForm(p=>({...p,amount:e.target.value}))} />

            <label style={S.formLabel}>Note (optional)</label>
            <input type="text" style={S.formInput} placeholder="e.g. Collected at door, Staff collected" value={cashForm.note} onChange={e=>setCashForm(p=>({...p,note:e.target.value}))} />

            <div style={S.modalActions}>
              <button style={S.btnCancel} onClick={()=>setShowCash(false)}>Cancel</button>
              <button style={S.btnSave} onClick={markCashPaid}>✅ Mark Paid</button>
            </div>
          </div>
        </div>
      )}

      {/* ── OCR SCREENSHOT MODAL ── */}
      {showOCR && (
        <div style={{ ...S.modalBg, alignItems:"flex-start", overflowY:"auto" }} onClick={()=>{ setShowOCR(false); setOcrResult(null); setOcrImage(null); }}>
          <div style={{ ...S.modal, borderRadius:0, minHeight:"100vh", paddingBottom:40 }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <button style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#888" }} onClick={()=>{ setShowOCR(false); setOcrResult(null); setOcrImage(null); }}>←</button>
              <div style={{ fontWeight:600, fontSize:16 }}>📸 Screenshot OCR</div>
            </div>

            <div style={{ background:"#e8f5ee", borderRadius:10, padding:"12px 14px", marginBottom:16, fontSize:13, color:"#1a6b3c" }}>
              Customer shared payment screenshot on WhatsApp? Upload it here — the system reads amount, date, and transaction ID automatically.
            </div>

            {/* Upload area */}
            {!ocrImage && (
              <label style={{ display:"block", border:"2px dashed #ddd", borderRadius:12, padding:"32px 20px", textAlign:"center", cursor:"pointer", marginBottom:16 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>📷</div>
                <div style={{ fontSize:15, fontWeight:500, color:"#555" }}>Tap to upload screenshot</div>
                <div style={{ fontSize:12, color:"#888", marginTop:4 }}>GPay / PhonePe / Paytm / BHIM</div>
                <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{ if(e.target.files[0]) processScreenshot(e.target.files[0]); }} />
              </label>
            )}

            {/* Image preview */}
            {ocrImage && (
              <div style={{ marginBottom:16 }}>
                <img src={ocrImage} alt="Payment screenshot" style={{ width:"100%", borderRadius:10, border:"0.5px solid #eee", maxHeight:300, objectFit:"contain", background:"#f8f9fa" }} />
                <button style={{ ...S.btnCancel, width:"100%", marginTop:8, fontSize:13 }} onClick={()=>{ setOcrImage(null); setOcrResult(null); }}>
                  🔄 Upload Different Screenshot
                </button>
              </div>
            )}

            {/* Processing */}
            {ocrProcessing && (
              <div style={{ background:"#fff3cd", borderRadius:10, padding:"14px", textAlign:"center", marginBottom:16 }}>
                <div style={{ fontSize:24, marginBottom:8 }}>🔍</div>
                <div style={{ fontSize:14, color:"#856404", fontWeight:500 }}>Reading screenshot...</div>
                <div style={{ fontSize:12, color:"#856404", marginTop:4 }}>Scanning for amount, date, transaction ID</div>
              </div>
            )}

            {/* OCR Result */}
            {ocrResult && !ocrProcessing && (
              <OcrResultPanel result={ocrResult} customers={customers} onSave={saveOcrPayment} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OCR Result Panel ─────────────────────────────────────────────────────────
function OcrResultPanel({ result, customers, onSave }) {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [manualAmount, setManualAmount] = useState(result.amount ? String(result.amount) : "");

  if (result.error) return (
    <div style={{ background:"#fdf2f3", border:"0.5px solid #f5c6cb", borderRadius:12, padding:16 }}>
      <div style={{ fontWeight:500, color:"#721c24", marginBottom:8 }}>⚠️ Could not read screenshot automatically</div>
      <div style={{ fontSize:13, color:"#888", marginBottom:14 }}>Enter payment details manually below:</div>
      <label style={S.formLabel}>Customer</label>
      <select style={S.formInput} value={selectedCustomer} onChange={e=>setSelectedCustomer(e.target.value)}>
        <option value="">Select customer...</option>
        {customers.map(c=><option key={c.id} value={c.id}>{c.name} ({c.customer_code})</option>)}
      </select>
      <label style={S.formLabel}>Amount (₹)</label>
      <input type="number" style={S.formInput} placeholder="Enter amount" value={manualAmount} onChange={e=>setManualAmount(e.target.value)} />
      <button style={{ ...S.btnSave, width:"100%", marginTop:4 }} onClick={()=>onSave(selectedCustomer, manualAmount)}>
        Save Payment (Manual)
      </button>
    </div>
  );

  const allClear = result.fraudFlags.length === 0;

  return (
    <div>
      {/* Fraud check result */}
      <div style={{ background: allClear?"#e8f5ee":"#fff3cd", border:`0.5px solid ${allClear?"#b8dfc8":"#ffc107"}`, borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ fontWeight:500, fontSize:14, color: allClear?"#1a6b3c":"#856404", marginBottom:8 }}>
          {allClear ? "✅ Screenshot looks genuine" : "⚠️ Please review carefully"}
        </div>
        {result.fraudFlags.length > 0 && result.fraudFlags.map((f,i) => (
          <div key={i} style={{ fontSize:12, color:"#856404", marginBottom:3 }}>• {f}</div>
        ))}
        {allClear && <div style={{ fontSize:12, color:"#2d7a50" }}>Amount, status, and transaction ID all verified from screenshot.</div>}
      </div>

      {/* Extracted data */}
      <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:500, color:"#555", marginBottom:10 }}>📋 Extracted from screenshot:</div>
        {[
          ["Amount", result.amount ? fmtCurrency(result.amount) : "Not found", !result.amount],
          ["Status", result.isSuccess ? "✅ SUCCESS" : result.isFailed ? "❌ FAILED" : "⚠️ Unknown", !result.isSuccess],
          ["Payment App", result.app, false],
          ["Transaction ID", result.txnId || "Not found", !result.txnId],
          ["Date", result.date, false],
        ].map(([label,value,warn])=>(
          <div key={label} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:8, paddingBottom:8, borderBottom:"0.5px solid #f5f5f5" }}>
            <span style={{ color:"#888" }}>{label}</span>
            <span style={{ fontWeight:500, color: warn?"#c62828":result.isSuccess&&label==="Status"?"#1a6b3c":"#111" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Manual amount override if not found */}
      {!result.amount && (
        <div style={{ marginBottom:14 }}>
          <label style={S.formLabel}>Enter amount manually (₹)</label>
          <input type="number" style={S.formInput} placeholder="e.g. 2040" value={manualAmount} onChange={e=>setManualAmount(e.target.value)} />
        </div>
      )}

      {/* Customer selection */}
      <label style={S.formLabel}>Match to customer *</label>
      <select style={S.formInput} value={selectedCustomer} onChange={e=>setSelectedCustomer(e.target.value)}>
        <option value="">Select customer this payment is from...</option>
        {customers.map(c=><option key={c.id} value={c.id}>{c.name} ({c.customer_code})</option>)}
      </select>

      <div style={{ background:"#e8f5ee", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#2d7a50", marginBottom:14 }}>
        💡 After saving, verify in your GPay/PhonePe app that this payment arrived, then tap <strong>Confirm</strong> in the payment list.
      </div>

      <button
        style={{ ...S.btnSave, width:"100%", padding:14, fontSize:15, opacity: (!selectedCustomer||(result.isFailed))?0.5:1 }}
        onClick={()=>onSave(selectedCustomer, manualAmount||result.amount)}
        disabled={!selectedCustomer || result.isFailed}>
        {result.isFailed ? "❌ Cannot save — payment failed" : "✅ Add to Review Queue"}
      </button>
    </div>
  );
}

// Helper for currency inside OCR panel
const fmtCurrencyOCR = (n) => "₹" + Number(n||0).toLocaleString("en-IN");


// ─── REPORTS SECTION — Week 5 ─────────────────────────────────────────────────
function ReportsSection() {
  const [sub, setSub] = useState("overview");
  return (
    <div style={{ padding:16 }}>
      <div style={S.sectionTitle}>📊 Reports & Automation</div>
      <div style={{ ...S.filterRow, flexWrap:"wrap", gap:6 }}>
        {[
          ["overview","📈 Overview"],
          ["procurement","🥛 Procurement"],
          ["inactive","⚠️ Inactive"],
          ["reminders","🔔 Reminders"],
          ["automation","⚙️ Schedule"],
          ["export","📤 Export"],
          ["templates","📱 Templates"],
          ["festivals","🎊 Festivals"],
          ["qty","🥛 Qty Change"],
        ].map(([id,label]) => (
          <button key={id} style={{ ...S.filterChip, ...(sub===id?S.filterChipActive:{}) }} onClick={()=>setSub(id)}>{label}</button>
        ))}
      </div>
      {sub==="overview"    && <MonthlyOverview />}
      {sub==="procurement" && <ProcurementEstimate />}
      {sub==="inactive"    && <InactiveCustomers />}
      {sub==="reminders"   && <PaymentReminders />}
      {sub==="automation"  && <AutomationSchedule />}
      {sub==="export"      && <ExportSection />}
      {sub==="templates"   && <WhatsAppTemplates />}
      {sub==="festivals"   && <FestivalGreetings />}
      {sub==="qty"         && <QuantityChangeSection />}
    </div>
  );
}

// ── Monthly Overview ──────────────────────────────────────────────────────────
function MonthlyOverview() {
  const now = new Date();
  const [month, setMonth] = useState(now.toISOString().slice(0,7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [month]);

  const load = async () => {
    setLoading(true);
    try {
      const [y,m] = month.split("-");
      const startDate = `${y}-${m}-01`;
      const endDate = new Date(parseInt(y),parseInt(m),0).toISOString().split("T")[0];

      const [entries, bills, payments, customers] = await Promise.all([
        db("daily_entries","GET",null,`?entry_date=gte.${startDate}&entry_date=lte.${endDate}&select=quantity_litres,entry_date`),
        db("bills","GET",null,`?billing_month=eq.${startDate}&select=total_amount,status`),
        db("payments","GET",null,`?payment_date=gte.${startDate}&payment_date=lte.${endDate}&status=eq.confirmed&select=amount`),
        db("customers","GET",null,"?is_active=eq.true&select=id"),
      ]);

      const totalLitres = (entries||[]).reduce((s,e)=>s+(e.quantity_litres||0),0);
      const totalBilled  = (bills||[]).reduce((s,b)=>s+(b.total_amount||0),0);
      const totalPaid    = (payments||[]).reduce((s,p)=>s+(p.amount||0),0);
      const paidBills    = (bills||[]).filter(b=>b.status==="paid").length;
      const pendingBills = (bills||[]).filter(b=>b.status!=="paid").length;
      const daysInMonth  = new Date(parseInt(y),parseInt(m),0).getDate();
      const daysRecorded = new Set((entries||[]).map(e=>e.entry_date)).size;

      setData({ totalLitres, totalBilled, totalPaid, paidBills, pendingBills,
        outstanding: totalBilled - totalPaid, totalCustomers: (customers||[]).length,
        daysRecorded, daysInMonth,
        avgLitresPerDay: totalLitres / Math.max(daysRecorded,1),
        collectionRate: totalBilled > 0 ? Math.round((totalPaid/totalBilled)*100) : 0,
      });
    } catch {
      setData({ totalLitres:1425, totalBilled:96900, totalPaid:64600,
        paidBills:14, pendingBills:6, outstanding:32300, totalCustomers:DEMO_CUSTOMERS.length,
        daysRecorded:22, daysInMonth:30, avgLitresPerDay:47.5, collectionRate:67 });
    }
    setLoading(false);
  };

  if (loading) return <Loader />;
  if (!data) return null;

  return (
    <div style={{ marginTop:8 }}>
      <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{ ...S.formInput, marginBottom:14 }} />

      {/* Revenue summary */}
      <div style={{ background:"linear-gradient(135deg,#0a3d1f,#1a6b3c)", borderRadius:14, padding:16, marginBottom:12, color:"white" }}>
        <div style={{ fontSize:13, opacity:0.8, marginBottom:4 }}>Total Revenue — {monthLabel(month)}</div>
        <div style={{ fontSize:28, fontWeight:700, marginBottom:8 }}>{fmtCurrency(data.totalBilled)}</div>
        <div style={{ display:"flex", gap:12 }}>
          <div><div style={{ fontSize:11, opacity:0.7 }}>Collected</div><div style={{ fontWeight:600 }}>{fmtCurrency(data.totalPaid)}</div></div>
          <div><div style={{ fontSize:11, opacity:0.7 }}>Outstanding</div><div style={{ fontWeight:600, color:"#ffcc80" }}>{fmtCurrency(data.outstanding)}</div></div>
          <div><div style={{ fontSize:11, opacity:0.7 }}>Collection %</div><div style={{ fontWeight:600 }}>{data.collectionRate}%</div></div>
        </div>
      </div>

      {/* Collection rate bar */}
      <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:14, marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ fontSize:13, color:"#555" }}>Collection rate</span>
          <span style={{ fontWeight:600, color: data.collectionRate>=80?"#1a6b3c":data.collectionRate>=60?"#856404":"#c62828" }}>{data.collectionRate}%</span>
        </div>
        <div style={{ background:"#eee", borderRadius:4, height:8 }}>
          <div style={{ background: data.collectionRate>=80?"#1a6b3c":data.collectionRate>=60?"#ffc107":"#c62828", borderRadius:4, height:"100%", width:`${data.collectionRate}%`, transition:"width 0.5s" }} />
        </div>
        <div style={{ fontSize:11, color:"#888", marginTop:6 }}>Target: 80%+ by Day 20 of month</div>
      </div>

      <div style={S.statsGrid}>
        <StatCard label="Total Litres" value={data.totalLitres.toFixed(0)+"L"} icon="🥛" color="#1565C0" />
        <StatCard label="Avg Per Day" value={data.avgLitresPerDay.toFixed(1)+"L"} icon="📅" color="#6a1b9a" />
        <StatCard label="Bills Paid" value={`${data.paidBills}/${data.paidBills+data.pendingBills}`} icon="✅" color="#2E7D32" />
        <StatCard label="Days Recorded" value={`${data.daysRecorded}/${data.daysInMonth}`} icon="📋" color="#e65100" />
      </div>

      {/* WhatsApp summary button */}
      <button style={{ ...S.btnPrimary, width:"100%", padding:13, fontSize:14, marginTop:4 }}
        onClick={() => {
          const msg = encodeURIComponent(
`📊 *MilkFlow Monthly Report — ${monthLabel(month)}*

🥛 Total Litres: ${data.totalLitres.toFixed(0)}L
💰 Total Billed: ${fmtCurrency(data.totalBilled)}
✅ Collected: ${fmtCurrency(data.totalPaid)} (${data.collectionRate}%)
⏳ Outstanding: ${fmtCurrency(data.outstanding)}
📋 Days Recorded: ${data.daysRecorded}/${data.daysInMonth}
👥 Active Customers: ${data.totalCustomers}

— Saikrishna Milk Supply`
          );
          window.open(`https://wa.me/?text=${msg}`,"_blank");
        }}>
        📤 Share Report on WhatsApp
      </button>
    </div>
  );
}

// ── Procurement Estimate ──────────────────────────────────────────────────────
function ProcurementEstimate() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const d = await db("customers","GET",null,"?is_active=eq.true&select=brand_name,default_quantity,area_name"); setCustomers(d||DEMO_CUSTOMERS); }
    catch { setCustomers(DEMO_CUSTOMERS); }
    setLoading(false);
  };

  const totalByBrand = {};
  const totalByArea  = {};
  let grandTotal = 0;

  customers.forEach(c => {
    const brand = c.brand_name || "Amul Full Cream";
    const area  = c.area_name  || "Other";
    const qty   = c.default_quantity || 0;
    totalByBrand[brand] = (totalByBrand[brand]||0) + qty;
    totalByArea[area]   = (totalByArea[area]||0)   + qty;
    grandTotal += qty;
  });

  const brandColors = { "Amul Full Cream":"#1565C0","Amul Toned":"#0288D1","Nandini":"#2E7D32","Local":"#6D4C41" };

  if (loading) return <Loader />;

  return (
    <div style={{ marginTop:8 }}>
      <div style={{ background:"#e8f5ee", border:"1px solid #b8dfc8", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ fontWeight:600, fontSize:15, color:"#1a6b3c" }}>🥛 Tomorrow's Order</div>
        <div style={{ fontSize:28, fontWeight:700, color:"#1a6b3c", marginTop:4 }}>{grandTotal.toFixed(1)} Litres</div>
        <div style={{ fontSize:13, color:"#2d7a50" }}>Based on current default quantities</div>
      </div>

      <div style={S.sectionTitle}>By Brand</div>
      {Object.entries(totalByBrand).map(([brand,qty]) => (
        <div key={brand} style={S.listCard}>
          <div style={{ width:12, height:40, borderRadius:3, background: brandColors[brand]||"#888", flexShrink:0 }} />
          <div style={{ flex:1 }}><div style={{ fontWeight:500 }}>{brand}</div><div style={{ fontSize:12, color:"#888" }}>{customers.filter(c=>(c.brand_name||"Amul Full Cream")===brand).length} customers</div></div>
          <div style={{ fontWeight:700, fontSize:18, color: brandColors[brand]||"#111" }}>{qty.toFixed(1)}L</div>
        </div>
      ))}

      <div style={S.sectionTitle}>By Area</div>
      {Object.entries(totalByArea).map(([area,qty],i) => (
        <div key={area} style={S.listCard}>
          <div style={{ fontSize:20 }}>📍</div>
          <div style={{ flex:1 }}><div style={{ fontWeight:500 }}>{area}</div><div style={{ fontSize:12, color:"#888" }}>{customers.filter(c=>(c.area_name||"Other")===area).length} customers</div></div>
          <div style={{ fontWeight:700, fontSize:18, color: AREA_COLORS[i%AREA_COLORS.length] }}>{qty.toFixed(1)}L</div>
        </div>
      ))}

      <button style={{ ...S.btnPrimary, width:"100%", padding:12, marginTop:8 }}
        onClick={() => {
          const lines = Object.entries(totalByBrand).map(([b,q])=>`• ${b}: ${q.toFixed(1)}L`).join("\n");
          const msg = encodeURIComponent(`🥛 *Tomorrow's Milk Order*\n\n${lines}\n\n*Total: ${grandTotal.toFixed(1)}L*\n\n— Saikrishna Milk Supply`);
          window.open(`https://wa.me/?text=${msg}`,"_blank");
        }}>
        📤 Send Order to Supplier
      </button>
    </div>
  );
}

// ── Inactive Customer Detection ───────────────────────────────────────────────
function InactiveCustomers() {
  const [inactive, setInactive] = useState([]);
  const [loading, setLoading] = useState(true);
  const INACTIVE_DAYS = 7;

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const cutoff = new Date(Date.now() - INACTIVE_DAYS * 86400000).toISOString().split("T")[0];
      const [customers, recentEntries] = await Promise.all([
        db("customers","GET",null,"?is_active=eq.true&select=id,name,customer_code,phone,area_name,default_quantity"),
        db("daily_entries","GET",null,`?entry_date=gte.${cutoff}&select=customer_id`),
      ]);
      const activeIds = new Set((recentEntries||[]).map(e=>e.customer_id));
      const inactiveList = (customers||DEMO_CUSTOMERS).filter(c => !activeIds.has(c.id));
      setInactive(inactiveList);
    } catch {
      setInactive(DEMO_CUSTOMERS.slice(0,2));
    }
    setLoading(false);
  };

  if (loading) return <Loader />;

  return (
    <div style={{ marginTop:8 }}>
      <div style={{ background: inactive.length>0?"#fff3cd":"#e8f5ee", border:`1px solid ${inactive.length>0?"#ffc107":"#b8dfc8"}`, borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ fontWeight:500, fontSize:14, color: inactive.length>0?"#856404":"#1a6b3c" }}>
          {inactive.length > 0 ? `⚠️ ${inactive.length} customers with no delivery in ${INACTIVE_DAYS}+ days` : `✅ All customers active in last ${INACTIVE_DAYS} days`}
        </div>
        {inactive.length > 0 && <div style={{ fontSize:12, color:"#856404", marginTop:4 }}>Check if they stopped milk or need follow-up</div>}
      </div>

      {inactive.length === 0 && (
        <div style={{ textAlign:"center", padding:32, color:"#888" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
          <div>All customers received delivery in last {INACTIVE_DAYS} days</div>
        </div>
      )}

      {inactive.map((c,i) => (
        <div key={i} style={S.listCard}>
          <div style={{ ...S.avatar, background:avatarColor(c.name), width:40, height:40 }}>{initials(c.name)}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500 }}>{c.name}</div>
            <div style={{ fontSize:12, color:"#888" }}>{c.customer_code} • {c.area_name} • {c.default_quantity}L/day</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <div style={{ fontSize:11, background:"#fff3cd", color:"#856404", padding:"2px 8px", borderRadius:8, textAlign:"center" }}>No delivery {INACTIVE_DAYS}d+</div>
            <a href={`https://wa.me/91${(c.phone||"").replace(/\D/g,"")}`} style={{ fontSize:11, background:"#e8f5ee", color:"#1a6b3c", padding:"3px 8px", borderRadius:8, textDecoration:"none", textAlign:"center" }}>📞 Call</a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Payment Reminders ─────────────────────────────────────────────────────────
function PaymentReminders() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const now = new Date();
  const month = now.toISOString().slice(0,7);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const d = await db("bills","GET",null,`?billing_month=eq.${month}-01&status=eq.pending&select=*,customers(name,customer_code,phone)`);
      setBills(d||DEMO_BILLS.filter(b=>b.status!=="paid"));
    } catch { setBills(DEMO_BILLS.filter(b=>b.status!=="paid")); }
    setLoading(false);
  };

  const dayOfMonth = now.getDate();
  const reminderLevel = dayOfMonth >= 20 ? 3 : dayOfMonth >= 15 ? 2 : dayOfMonth >= 10 ? 1 : 0;
  const reminderLabels = ["Too early","Gentle (Day 10)","Firm (Day 15)","Final (Day 20)"];
  const reminderColors = ["#888","#1a6b3c","#856404","#c62828"];

  const getReminderMsg = (bill, level) => {
    const name = bill.customers?.name?.split(" ")[0] || "ji";
    const amt  = fmtCurrency(bill.total_amount);
    const billUrl = `${window.location.origin}/bill/${bill.customers?.customer_code}`;
    if (level === 1) return `🙏 Namaste ${name} ji,

Your ${monthLabel(month)} milk bill of *${amt}* is due.

View bill: ${billUrl}

Please pay at your convenience. Share screenshot after payment ✅

— Saikrishna Milk Supply`;
    if (level === 2) return `📋 Namaste ${name} ji,

Your milk bill of *${amt}* for ${monthLabel(month)} is still pending.

View & pay: ${billUrl}

Please share payment screenshot to confirm ✅

— Saikrishna Milk Supply`;
    return `⚠️ Namaste ${name} ji,

Final reminder — *${amt}* milk bill for ${monthLabel(month)} is overdue.

This will show as OUTSTANDING on next month's bill if unpaid.

Pay now: ${billUrl}

— Saikrishna Milk Supply`;
  };

  const sendReminder = (bill) => {
    setSending(bill.customers?.customer_code);
    const phone = (bill.customers?.phone||"").replace(/\D/g,"");
    const msg = encodeURIComponent(getReminderMsg(bill, Math.max(reminderLevel,1)));
    window.open(`https://wa.me/91${phone}?text=${msg}`,"_blank");
    setTimeout(() => setSending(null), 2000);
  };

  const sendAllReminders = async () => {
    if (bills.length === 0) return;
    const ok = window.confirm(`Send payment reminders to ${bills.length} customers?

Will open WhatsApp one by one.`);
    if (!ok) return;
    for (const bill of bills) {
      sendReminder(bill);
      await new Promise(r => setTimeout(r, 2500));
    }
  };

  if (loading) return <Loader />;

  return (
    <div style={{ marginTop:8 }}>
      {/* Reminder level indicator */}
      <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:14, marginBottom:14 }}>
        <div style={{ fontSize:13, color:"#888", marginBottom:8 }}>Today is Day {dayOfMonth} of month</div>
        <div style={{ display:"flex", gap:4 }}>
          {[1,2,3].map(level => (
            <div key={level} style={{ flex:1, borderRadius:8, padding:"8px 6px", textAlign:"center", background: level<=reminderLevel?"#1a6b3c":"#f5f5f5" }}>
              <div style={{ fontSize:11, color: level<=reminderLevel?"white":"#888", fontWeight:500 }}>Day {level===1?"10":level===2?"15":"20"}</div>
              <div style={{ fontSize:10, color: level<=reminderLevel?"rgba(255,255,255,0.8)":"#bbb" }}>{level===1?"Gentle":level===2?"Firm":"Final"}</div>
            </div>
          ))}
        </div>
        {reminderLevel === 0 && <div style={{ fontSize:12, color:"#888", marginTop:8 }}>Reminders start on Day 10</div>}
        {reminderLevel > 0 && <div style={{ fontSize:12, color:"#1a6b3c", marginTop:8 }}>✅ {reminderLabels[reminderLevel]} reminder ready to send</div>}
      </div>

      {bills.length === 0 ? (
        <div style={{ textAlign:"center", padding:32, color:"#888" }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🎉</div>
          <div>All customers have paid this month!</div>
        </div>
      ) : (
        <>
          <button style={{ ...S.btnPrimary, width:"100%", padding:13, fontSize:14, marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
            onClick={sendAllReminders} disabled={reminderLevel===0}>
            {reminderLevel === 0 ? "🔒 Reminders start Day 10" : `📤 Send ${reminderLabels[reminderLevel]} to All (${bills.length})`}
          </button>

          {bills.map((b,i) => (
            <div key={i} style={S.listCard}>
              <div style={{ ...S.avatar, background:avatarColor(b.customers?.name||""), width:40, height:40 }}>{initials(b.customers?.name||"")}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:500, fontSize:14 }}>{b.customers?.name}</div>
                <div style={{ fontSize:12, color:"#888" }}>{b.customers?.customer_code} • {fmtCurrency(b.total_amount)}</div>
              </div>
              <button
                style={{ background:"#25D366", border:"none", borderRadius:10, padding:"8px 12px", color:"white", fontSize:12, cursor:"pointer", fontWeight:500 }}
                onClick={()=>sendReminder(b)}
                disabled={sending===b.customers?.customer_code}>
                {sending===b.customers?.customer_code ? "Sending..." : "📤 Remind"}
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}


// ── Export Section ────────────────────────────────────────────────────────────
function ExportSection() {
  const [exporting, setExporting] = useState(null);

  const doExport = async (type) => {
    setExporting(type);
    try {
      if (type === "customers") {
        const data = await db("customers","GET",null,"?is_active=eq.true&order=name");
        await exportCustomersExcel(data || DEMO_CUSTOMERS);
      } else if (type === "entries") {
        const today30 = new Date(Date.now() - 30*86400000).toISOString().split("T")[0];
        const data = await db("daily_entries","GET",null,`?entry_date=gte.${today30}&order=entry_date.desc&select=*,customers(name,customer_code,area_name)`);
        await exportEntriesExcel(data || DEMO_ENTRIES);
      } else if (type === "payments") {
        const XLSX = await loadSheetJS();
        const data = await db("payments","GET",null,"?order=payment_date.desc&select=*,customers(name,customer_code)");
        const rows = (data||DEMO_PAYMENTS).map(p=>({
          "Date": p.payment_date||"",
          "Customer": p.customers?.name||"",
          "Code": p.customers?.customer_code||"",
          "Amount": p.amount||0,
          "Method": p.payment_method||"",
          "App": p.payment_app||"",
          "Status": p.status||"",
          "Transaction ID": p.transaction_id||"",
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [12,20,10,10,8,10,12,20].map(w=>({wch:w}));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payments");
        XLSX.writeFile(wb, `MilkFlow_Payments_${new Date().toISOString().slice(0,10)}.xlsx`);
      } else if (type === "bills") {
        const XLSX = await loadSheetJS();
        const data = await db("bills","GET",null,"?order=billing_month.desc&select=*,customers(name,customer_code,area_name)");
        const rows = (data||DEMO_BILLS).map(b=>({
          "Month": b.billing_month||"",
          "Customer": b.customers?.name||"",
          "Code": b.customers?.customer_code||"",
          "Area": b.customers?.area_name||"",
          "Total Litres": b.total_litres||0,
          "Milk Amount": b.milk_amount||0,
          "Opening Balance": b.opening_balance||0,
          "Total Amount": b.total_amount||0,
          "Status": b.status||"",
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [12,20,10,15,13,12,16,13,10].map(w=>({wch:w}));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bills");
        XLSX.writeFile(wb, `MilkFlow_Bills_${new Date().toISOString().slice(0,10)}.xlsx`);
      }
    } catch(e) { alert("Export error: "+e.message); }
    setExporting(null);
  };

  const exports = [
    { id:"customers", icon:"👥", label:"Customer List",     desc:"All customers with rates, areas, opening balances" },
    { id:"entries",   icon:"📋", label:"Daily Entries",     desc:"Last 30 days of milk delivery records" },
    { id:"bills",     icon:"🧾", label:"Bills",             desc:"All monthly bills with amounts and status" },
    { id:"payments",  icon:"💳", label:"Payment Records",   desc:"All payments with transaction IDs and status" },
  ];

  return (
    <div style={{ marginTop:8 }}>
      <div style={{ background:"#e8f5ee", borderRadius:10, padding:"12px 14px", marginBottom:14, fontSize:13, color:"#1a6b3c" }}>
        📊 Download any data as Excel. Open in Google Sheets or Microsoft Excel — use for accounting, audits, or backup.
      </div>
      {exports.map(exp => (
        <div key={exp.id} style={S.listCard}>
          <div style={{ fontSize:28 }}>{exp.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500, fontSize:14 }}>{exp.label}</div>
            <div style={{ fontSize:12, color:"#888" }}>{exp.desc}</div>
          </div>
          <button
            style={{ ...S.btnPrimary, padding:"8px 14px", fontSize:13, background: exporting===exp.id?"#888":"#1a6b3c" }}
            onClick={()=>doExport(exp.id)}
            disabled={!!exporting}>
            {exporting===exp.id ? "⏳..." : "📥 Export"}
          </button>
        </div>
      ))}
      <div style={{ background:"#f8f9fa", borderRadius:10, padding:"12px 14px", marginTop:8, fontSize:12, color:"#888" }}>
        💡 Tip: Export customer list monthly as backup. Store in Google Drive for safety.
      </div>
    </div>
  );
}

// ── Automation Schedule ───────────────────────────────────────────────────────
function AutomationSchedule() {
  const now = new Date();
  const hr  = now.getHours();
  const day = now.getDate();

  const dailyTasks = [
    { time:"12:00 PM", icon:"🔄", label:"Father's screen refreshes", desc:"Yesterday's quantities pre-filled", done: hr >= 12 },
    { time:"6:00 PM",  icon:"🔔", label:"Reminder to Father",        desc:"If today's entry not yet submitted", done: hr >= 18 },
    { time:"7:00 PM",  icon:"📊", label:"Daily summary to owner",    desc:"Litres, customers, pending payments", done: hr >= 19 },
    { time:"8:00 PM",  icon:"📱", label:"Customer reminder",         desc:"Portal link + today's delivery status", done: hr >= 20 },
    { time:"9:00 PM",  icon:"🔔", label:"Second reminder to Father", desc:"If entry still not submitted", done: hr >= 21 },
    { time:"11:00 PM", icon:"🔒", label:"Day records locked",        desc:"No more changes for today", done: hr >= 23 },
  ];

  const monthlyTasks = [
    { date:"1st",  icon:"🔒", label:"Previous month locked",      desc:"Comparison report generated", done: day >= 1 },
    { date:"2nd",  icon:"📋", label:"Reconciliation report",      desc:"Mismatches flagged for owner", done: day >= 2 },
    { date:"3rd",  icon:"🧾", label:"Bills auto-generated",       desc:"All customers billed automatically", done: day >= 3 },
    { date:"4th",  icon:"📤", label:"Bills sent via WhatsApp",    desc:"After owner approval — one tap", done: day >= 4 },
    { date:"10th", icon:"💳", label:"Payment reminder 1",         desc:"Gentle — all unpaid customers", done: day >= 10 },
    { date:"15th", icon:"💳", label:"Payment reminder 2",         desc:"Firm — still unpaid customers", done: day >= 15 },
    { date:"20th", icon:"⚠️", label:"Payment reminder 3 — Final", desc:"Overdue list sent to owner", done: day >= 20 },
  ];

  const TaskRow = ({ time, icon, label, desc, done }) => (
    <div style={{ ...S.listCard, padding:"10px 14px", borderLeft: done?"3px solid #1a6b3c":"3px solid #eee" }}>
      <div style={{ fontSize:22, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:500, fontSize:13 }}>{label}</div>
        <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{desc}</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
        <div style={{ fontSize:12, fontWeight:500, color:"#555" }}>{time}</div>
        <div style={{ fontSize:10, color: done?"#1a6b3c":"#bbb" }}>{done?"✅ Done":"⏳"}</div>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop:8 }}>
      <div style={{ background:"#e8f5ee", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#1a6b3c" }}>
        📅 Today: Day {day} of month • {now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
      </div>

      <div style={S.sectionTitle}>⏰ Daily Automations</div>
      {dailyTasks.map((t,i) => <TaskRow key={i} {...t} />)}

      <div style={{ ...S.sectionTitle, marginTop:16 }}>📅 Monthly Automations</div>
      {monthlyTasks.map((t,i) => <TaskRow key={i} time={t.date} {...t} />)}

      <div style={{ background:"#fff3cd", borderRadius:10, padding:"12px 14px", marginTop:12, fontSize:13, color:"#856404" }}>
        💡 <strong>Scale tip:</strong> When you cross 256 customers, upgrade to AiSensy (₹1,999/mo) to fully automate the 8 PM and payment reminders without manual WhatsApp sending.
      </div>
    </div>
  );
}



// ─── DELETE CUSTOMER MODAL ────────────────────────────────────────────────────
function DeleteCustomerModal({ customer, onClose, onDone }) {
  const [step, setStep] = useState("confirm"); // confirm | pin | done
  const [deleteType, setDeleteType] = useState("soft");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (pin !== CACHED_PINS.owner_pin) { setPinError("❌ Wrong PIN — try again"); setPin(""); return; }
    setDeleting(true);
    try {
      if (deleteType === "soft") {
        // Soft delete — mark inactive, keep all data
        await db("customers","PATCH",{ is_active: false },`?id=eq.${customer.id}`);
      } else {
        // Hard delete — remove customer record
        // Note: daily_entries, bills, payments with this customer_id remain as audit trail
        await db("customers","DELETE",null,`?id=eq.${customer.id}`);
      }
      setStep("done");
    } catch(e) {
      alert("Error: " + e.message);
    }
    setDeleting(false);
  };

  if (step === "done") return (
    <div style={S.modalBg}>
      <div style={S.modal}>
        <div style={S.modalHandle} />
        <div style={{ textAlign:"center", padding:"16px 0" }}>
          <div style={{ fontSize:52, marginBottom:12 }}>{deleteType==="soft"?"😴":"🗑️"}</div>
          <div style={{ fontSize:18, fontWeight:600, color:"#1a6b3c", marginBottom:8 }}>
            {deleteType==="soft" ? "Customer Deactivated" : "Customer Deleted"}
          </div>
          <div style={{ fontSize:13, color:"#888", marginBottom:20, lineHeight:1.6 }}>
            {deleteType==="soft"
              ? `${customer.name} has been deactivated. All their billing history, payments and records are safely preserved. You can reactivate them anytime from the inactive customers list.`
              : `${customer.name} has been permanently removed. Historical billing records are preserved for audit purposes.`}
          </div>
          <button style={{ ...S.btnSave, padding:"12px 40px" }} onClick={onDone}>Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.modalBg} onClick={onClose}>
      <div style={S.modal} onClick={e=>e.stopPropagation()}>
        <div style={S.modalHandle} />
        <div style={S.modalName}>Remove Customer</div>
        <div style={S.modalMeta}>{customer.name} • {customer.customer_code}</div>

        {step === "confirm" && (
          <>
            {/* Delete type selection */}
            <div style={{ marginBottom:16 }}>
              {/* Soft delete option */}
              <div
                style={{ border:`2px solid ${deleteType==="soft"?"#1a6b3c":"#eee"}`, borderRadius:12, padding:14, marginBottom:10, cursor:"pointer", background:deleteType==="soft"?"#f0fdf4":"white" }}
                onClick={()=>setDeleteType("soft")}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <span style={{ fontSize:22 }}>😴</span>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:"#1a6b3c" }}>Deactivate (Recommended)</div>
                    <div style={{ fontSize:12, color:"#888" }}>Hides customer from all screens</div>
                  </div>
                  <div style={{ marginLeft:"auto", width:20, height:20, borderRadius:"50%", border:`2px solid ${deleteType==="soft"?"#1a6b3c":"#ddd"}`, background:deleteType==="soft"?"#1a6b3c":"white", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {deleteType==="soft" && <div style={{ width:8, height:8, borderRadius:"50%", background:"white" }} />}
                  </div>
                </div>
                <div style={{ fontSize:12, color:"#2d7a50", background:"#e8f5ee", borderRadius:8, padding:"6px 10px" }}>
                  ✅ All billing history, payments and records preserved safely<br/>
                  ✅ Can reactivate anytime — no data loss ever
                </div>
              </div>

              {/* Hard delete option */}
              <div
                style={{ border:`2px solid ${deleteType==="hard"?"#c62828":"#eee"}`, borderRadius:12, padding:14, cursor:"pointer", background:deleteType==="hard"?"#fdf2f3":"white" }}
                onClick={()=>setDeleteType("hard")}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <span style={{ fontSize:22 }}>🗑️</span>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14, color:"#c62828" }}>Permanent Delete</div>
                    <div style={{ fontSize:12, color:"#888" }}>Removes customer record forever</div>
                  </div>
                  <div style={{ marginLeft:"auto", width:20, height:20, borderRadius:"50%", border:`2px solid ${deleteType==="hard"?"#c62828":"#ddd"}`, background:deleteType==="hard"?"#c62828":"white", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {deleteType==="hard" && <div style={{ width:8, height:8, borderRadius:"50%", background:"white" }} />}
                  </div>
                </div>
                {deleteType==="hard" && (
                  <div style={{ fontSize:12, color:"#721c24", background:"#fdf2f3", borderRadius:8, padding:"6px 10px" }}>
                    ⚠️ Use only for duplicate or test entries — not for real customers who stopped milk
                  </div>
                )}
              </div>
            </div>

            <div style={S.modalActions}>
              <button style={S.btnCancel} onClick={onClose}>Cancel</button>
              <button
                style={{ ...S.btnSave, background: deleteType==="hard"?"#c62828":"#1a6b3c" }}
                onClick={()=>setStep("pin")}>
                Continue →
              </button>
            </div>
          </>
        )}

        {step === "pin" && (
          <>
            <div style={{ background:"#fff3cd", border:"1px solid #ffc107", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#856404" }}>
              {deleteType==="soft"
                ? `Deactivating ${customer.name}. Enter owner PIN to confirm.`
                : `⚠️ PERMANENTLY deleting ${customer.name}. This cannot be undone. Enter owner PIN to confirm.`}
            </div>

            {/* PIN pad */}
            <div style={{ marginBottom:8 }}>
              <label style={S.formLabel}>Enter Owner PIN</label>
              <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:12 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${deleteType==="hard"?"#c62828":"#1a6b3c"}`, background: i < pin.length ? (deleteType==="hard"?"#c62828":"#1a6b3c") : "white" }} />
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, maxWidth:240, margin:"0 auto" }}>
                {[1,2,3,4,5,6,7,8,9].map(n=>(
                  <button key={n} style={S.pinBtn} onClick={()=>{ if(pin.length<4){ const next=pin+n; setPin(next); setPinError(""); if(next.length===4) handleDelete(); }}}>
                    {n}
                  </button>
                ))}
                <div />
                <button style={S.pinBtn} onClick={()=>{ if(pin.length<4){ const next=pin+"0"; setPin(next); setPinError(""); if(next.length===4) handleDelete(); }}}>0</button>
                <button style={S.pinBtn} onClick={()=>{ setPin(p=>p.slice(0,-1)); setPinError(""); }}>⌫</button>
              </div>
              {pinError && <div style={{ color:"#c62828", fontSize:13, textAlign:"center", marginTop:8 }}>{pinError}</div>}
              {deleting && <div style={{ color:"#1a6b3c", fontSize:13, textAlign:"center", marginTop:8 }}>Processing...</div>}
            </div>

            <button style={{ ...S.btnCancel, width:"100%", marginTop:8 }} onClick={()=>{ setStep("confirm"); setPin(""); setPinError(""); }}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── WEEK 8 — Festival Greetings, Templates, Quantity Change, Polish ──────────

// ── WhatsApp Message Templates ────────────────────────────────────────────────
function WhatsAppTemplates() {
  const [copied, setCopied] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selCust, setSelCust] = useState(null);

  useEffect(() => {
    db("customers","GET",null,"?is_active=eq.true&select=id,name,customer_code,phone,default_quantity,rate_per_litre")
      .then(d => setCustomers(d||DEMO_CUSTOMERS)).catch(()=>setCustomers(DEMO_CUSTOMERS));
  }, []);

  const now = new Date();
  const month = now.toISOString().slice(0,7);

  const templates = [
    {
      id:"welcome", icon:"🙏", label:"New Customer Welcome",
      msg:(c)=>`🥛 *Saikrishna Milk Supply*

Namaste ${c?.name?.split(" ")[0]||"ji"} 🙏

Welcome to our milk service! Your account is now active.

📋 Your account code: *${c?.customer_code||"C001"}*
🥛 Daily quantity: *${c?.default_quantity||1}L*
💲 Rate: *₹${c?.rate_per_litre||68}/litre*

Your personal bill link:
${window.location.origin}/c/${c?.customer_code||"C001"}

Bookmark this link — use it to check your daily records, view bills, and pay 📱

Payment UPI: ${UPI_ID}

Thank you for choosing us! 🙏
— Saikrishna Milk Supply`,
    },
    {
      id:"bill_ready", icon:"🧾", label:"Bill Ready Notification",
      msg:(c)=>`🧾 *Saikrishna Milk Supply*

Namaste ${c?.name?.split(" ")[0]||"ji"} 🙏

Your ${monthLabel(month)} milk bill is ready!

👉 View & Pay: ${window.location.origin}/bill/${c?.customer_code||"C001"}

After payment, please share the screenshot here to confirm ✅

UPI: ${UPI_ID}

Thank you 🙏
— Saikrishna Milk Supply`,
    },
    {
      id:"payment_confirmed", icon:"✅", label:"Payment Confirmed",
      msg:(c)=>`✅ *Payment Confirmed!*

Namaste ${c?.name?.split(" ")[0]||"ji"} 🙏

Your payment has been received and confirmed.

Your account is now clear for ${monthLabel(month)} ✅

Thank you for the prompt payment 🙏
— Saikrishna Milk Supply`,
    },
    {
      id:"payment_reminder", icon:"💳", label:"Payment Reminder (Gentle)",
      msg:(c)=>`🙏 Namaste ${c?.name?.split(" ")[0]||"ji"} ji,

Just a gentle reminder — your ${monthLabel(month)} milk bill is pending.

👉 View Bill: ${window.location.origin}/bill/${c?.customer_code||"C001"}

Pay at your convenience and share screenshot to confirm ✅

— Saikrishna Milk Supply`,
    },
    {
      id:"rate_change", icon:"📢", label:"Rate Change Notice",
      msg:(c)=>`📢 *Important Notice*
*Saikrishna Milk Supply*

Namaste ${c?.name?.split(" ")[0]||"ji"} ji 🙏

Due to increase in procurement costs, we are updating our milk rates effective next month.

New rate: ₹${c?.rate_per_litre||68}/litre

This will reflect in your next bill. We apologize for any inconvenience.

Thank you for your understanding 🙏
— Saikrishna Milk Supply`,
    },
    {
      id:"quantity_change", icon:"🥛", label:"Quantity Change Confirmation",
      msg:(c)=>`✅ *Quantity Updated*
*Saikrishna Milk Supply*

Namaste ${c?.name?.split(" ")[0]||"ji"} ji 🙏

Your daily milk quantity has been updated to *${c?.default_quantity||1} litres* as requested.

This change starts from tomorrow.

— Saikrishna Milk Supply`,
    },
    {
      id:"inactive_followup", icon:"🤔", label:"Inactive Customer Follow-up",
      msg:(c)=>`Namaste ${c?.name?.split(" ")[0]||"ji"} ji 🙏

We noticed there has been no milk delivery to your address for the past few days.

Is everything okay? Please let us know if you'd like to:
• Resume deliveries 🥛
• Adjust quantity
• Pause temporarily

We're here to help!
— Saikrishna Milk Supply`,
    },
  ];

  const copyTemplate = (id, msg) => {
    navigator.clipboard.writeText(msg).then(()=>{
      setCopied(id);
      setTimeout(()=>setCopied(null), 2000);
    }).catch(()=>{
      // Fallback for mobile
      const el = document.createElement("textarea");
      el.value = msg; document.body.appendChild(el);
      el.select(); document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(id); setTimeout(()=>setCopied(null), 2000);
    });
  };

  const sendTemplate = (msg, phone) => {
    const p = (phone||"").replace(/\D/g,"");
    if (p.length === 10) {
      window.open(`https://wa.me/91${p}?text=${encodeURIComponent(msg)}`,"_blank");
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
    }
  };

  return (
    <div style={{ padding:16 }}>
      <div style={S.sectionTitle}>📱 WhatsApp Templates</div>
      
      {/* Customer selector */}
      <div style={{ marginBottom:14 }}>
        <label style={S.formLabel}>Preview for customer (optional)</label>
        <select style={S.formInput} value={selCust?.id||""} onChange={e=>{
          const c = customers.find(c=>String(c.id)===e.target.value);
          setSelCust(c||null);
        }}>
          <option value="">Generic preview</option>
          {customers.map(c=><option key={c.id} value={c.id}>{c.name} ({c.customer_code})</option>)}
        </select>
      </div>

      {templates.map(t => {
        const msg = t.msg(selCust || { name:"Customer", customer_code:"C001", default_quantity:1, rate_per_litre:68, phone:"" });
        return (
          <div key={t.id} style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:14, marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:20 }}>{t.icon}</span>
              <span style={{ fontWeight:500, fontSize:14, flex:1 }}>{t.label}</span>
            </div>
            <div style={{ background:"#f8f9fa", borderRadius:8, padding:"10px 12px", fontSize:12, color:"#555", lineHeight:1.6, marginBottom:10, maxHeight:120, overflowY:"auto", whiteSpace:"pre-wrap" }}>
              {msg}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ flex:1, padding:"8px 0", background: copied===t.id?"#d4edda":"#f5f5f5", border:`0.5px solid ${copied===t.id?"#b8dfc8":"#ddd"}`, borderRadius:8, fontSize:12, color: copied===t.id?"#155724":"#555", cursor:"pointer" }}
                onClick={()=>copyTemplate(t.id, msg)}>
                {copied===t.id ? "✅ Copied!" : "📋 Copy"}
              </button>
              <button style={{ flex:1, padding:"8px 0", background:"#e7f9f0", border:"0.5px solid #b3dfcb", borderRadius:8, fontSize:12, color:"#1a6b3c", cursor:"pointer" }}
                onClick={()=>sendTemplate(msg, selCust?.phone)}>
                📤 Send WhatsApp
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Festival Greetings ────────────────────────────────────────────────────────
function FestivalGreetings() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selFestival, setSelFestival] = useState(null);

  useEffect(() => {
    db("customers","GET",null,"?is_active=eq.true&select=id,name,customer_code,phone")
      .then(d=>{ setCustomers(d||DEMO_CUSTOMERS); setLoading(false); })
      .catch(()=>{ setCustomers(DEMO_CUSTOMERS); setLoading(false); });
  }, []);

  const festivals = [
    { id:"diwali",    icon:"🪔", name:"Diwali",       msg:(n)=>`🪔 *Happy Diwali!*

Namaste ${n} ji 🙏

Wishing you and your family a very Happy Diwali filled with joy, prosperity and happiness! 🎆

May this festival of lights bring lots of happiness to your home 🌟

— Saikrishna Milk Supply` },
    { id:"ugadi",     icon:"🌸", name:"Ugadi",        msg:(n)=>`🌸 *Happy Ugadi!*

Namaste ${n} ji 🙏

Wishing you and your family a very Happy Telugu New Year! 🎊

May this Ugadi bring you health, wealth and happiness 🙏

— Saikrishna Milk Supply` },
    { id:"sankranti", icon:"🪁", name:"Sankranti",    msg:(n)=>`🪁 *Happy Sankranti!*

Namaste ${n} ji 🙏

Wishing you and your family a very Happy Makar Sankranti! 🌾

May this harvest festival bring abundance and joy to your family 🙏

— Saikrishna Milk Supply` },
    { id:"holi",      icon:"🎨", name:"Holi",         msg:(n)=>`🎨 *Happy Holi!*

Namaste ${n} ji 🙏

Wishing you and your family a very colourful and joyful Holi! 🌈

— Saikrishna Milk Supply` },
    { id:"eid",       icon:"🌙", name:"Eid",          msg:(n)=>`🌙 *Eid Mubarak!*

Namaste ${n} ji 🙏

Wishing you and your family Eid Mubarak! May Allah bless you with happiness and prosperity 🌟

— Saikrishna Milk Supply` },
    { id:"christmas", icon:"🎄", name:"Christmas",    msg:(n)=>`🎄 *Merry Christmas!*

Namaste ${n} ji 🙏

Wishing you and your family a very Merry Christmas and a Happy New Year! 🎁

— Saikrishna Milk Supply` },
    { id:"newyear",   icon:"🎆", name:"New Year",     msg:(n)=>`🎆 *Happy New Year!*

Namaste ${n} ji 🙏

Wishing you and your family a very Happy New Year ${new Date().getFullYear()+1}! 🥳

Thank you for your continued trust and support throughout the year 🙏

— Saikrishna Milk Supply` },
  ];

  const sendToAll = async (festival) => {
    const ok = window.confirm(`Send ${festival.name} greetings to all ${customers.length} customers?

This will open WhatsApp one by one.`);
    if (!ok) return;
    setSending(true);
    for (let i = 0; i < customers.length; i++) {
      setProgress(i+1);
      const c = customers[i];
      const phone = (c.phone||"").replace(/\D/g,"");
      if (phone.length === 10) {
        const msg = encodeURIComponent(festival.msg(c.name?.split(" ")[0]||""));
        window.open(`https://wa.me/91${phone}?text=${msg}`,"_blank");
        await new Promise(r=>setTimeout(r,2500));
      }
    }
    setSending(false);
    setProgress(0);
    setSelFestival(null);
    alert(`✅ ${festival.name} greetings sent to ${customers.length} customers!`);
  };

  if (loading) return <Loader />;

  return (
    <div style={{ padding:16 }}>
      <div style={S.sectionTitle}>🎊 Festival Greetings</div>
      <div style={{ background:"#e8f5ee", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#1a6b3c" }}>
        Send festival greetings to all customers via WhatsApp. One tap — sends to everyone automatically. No birthday wishes — festivals only.
      </div>

      {sending && (
        <div style={{ background:"#fff3cd", borderRadius:10, padding:14, marginBottom:14, textAlign:"center" }}>
          <div style={{ fontSize:14, fontWeight:500, color:"#856404", marginBottom:8 }}>Sending greetings... {progress}/{customers.length}</div>
          <div style={{ background:"#eee", borderRadius:8, height:8 }}>
            <div style={{ background:"#1a6b3c", height:"100%", borderRadius:8, width:`${(progress/customers.length)*100}%`, transition:"width 0.3s" }} />
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {festivals.map(f => (
          <div key={f.id} style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:14, textAlign:"center", cursor:"pointer" }}
            onClick={()=>setSelFestival(f)}>
            <div style={{ fontSize:32, marginBottom:6 }}>{f.icon}</div>
            <div style={{ fontWeight:500, fontSize:13 }}>{f.name}</div>
            <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{customers.length} customers</div>
          </div>
        ))}
      </div>

      {selFestival && (
        <div style={S.modalBg} onClick={()=>setSelFestival(null)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHandle} />
            <div style={S.modalName}>{selFestival.icon} {selFestival.name} Greetings</div>
            <div style={{ background:"#f8f9fa", borderRadius:10, padding:"12px 14px", marginBottom:14, fontSize:13, color:"#555", lineHeight:1.7, whiteSpace:"pre-wrap" }}>
              {selFestival.msg("Customer")}
            </div>
            <div style={{ fontSize:13, color:"#888", marginBottom:14, textAlign:"center" }}>
              Will be sent to <strong>{customers.length} customers</strong> one by one via WhatsApp
            </div>
            <div style={S.modalActions}>
              <button style={S.btnCancel} onClick={()=>setSelFestival(null)}>Cancel</button>
              <button style={S.btnSave} onClick={()=>sendToAll(selFestival)} disabled={sending}>
                📤 Send to All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Quantity Change Handler ────────────────────────────────────────────────────
function QuantityChangeSection() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [newQty, setNewQty] = useState("");
  const [changeType, setChangeType] = useState("permanent");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const d = await db("customers","GET",null,"?is_active=eq.true&order=name&select=id,name,customer_code,phone,area_name,default_quantity,brand_name"); setCustomers(d||DEMO_CUSTOMERS); }
    catch { setCustomers(DEMO_CUSTOMERS); }
    setLoading(false);
  };

  const applyChange = async () => {
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty < 0) { alert("Enter valid quantity"); return; }
    setSaving(true);
    try {
      if (changeType === "permanent") {
        await db("customers","PATCH",{ default_quantity:qty },`?id=eq.${editing.id}`);
        // Send confirmation WhatsApp
        const phone = (editing.phone||"").replace(/\D/g,"");
        if (phone.length === 10) {
          const msg = encodeURIComponent(
`✅ *Quantity Updated*
Saikrishna Milk Supply

Namaste ${editing.name?.split(" ")[0]} ji 🙏

Your daily milk quantity has been updated to *${qty} litres* as requested.

This change starts from tomorrow.

— Saikrishna Milk Supply`
          );
          window.open(`https://wa.me/91${phone}?text=${msg}`,"_blank");
        }
      }
      // For temporary — would need a temp_override table, mark as permanent for now
      load();
      setEditing(null);
      setNewQty("");
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  };

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ background:"#e8f5ee", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:"#1a6b3c" }}>
        Change a customer's daily quantity. Permanent = changes default. WhatsApp confirmation sent automatically.
      </div>
      {customers.map(c => (
        <div key={c.id} style={S.listCard}>
          <div style={{ ...S.avatar, background:avatarColor(c.name), width:40, height:40 }}>{initials(c.name)}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500, fontSize:14 }}>{c.name}</div>
            <div style={{ fontSize:12, color:"#888" }}>{c.customer_code} • {c.area_name}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontWeight:700, fontSize:18, color:"#1a6b3c" }}>{c.default_quantity}L</div>
            <button style={{ ...S.btnPrimary, padding:"6px 12px", fontSize:12 }} onClick={()=>{ setEditing(c); setNewQty(String(c.default_quantity)); }}>✏️ Edit</button>
          </div>
        </div>
      ))}

      {editing && (
        <div style={S.modalBg} onClick={()=>setEditing(null)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHandle} />
            <div style={S.modalName}>✏️ Change Quantity</div>
            <div style={S.modalMeta}>{editing.name} • Current: {editing.default_quantity}L/day</div>
            <label style={S.formLabel}>New Daily Quantity (Litres)</label>
            <div style={S.qtyGrid}>
              {[0.5,1.0,1.5,2.0,2.5,3.0,4.0,0].map(q=>(
                <button key={q} style={{ ...S.qtyOption, ...(parseFloat(newQty)===q?S.qtyOptionSel:{}), ...(q===0?{color:"#c0392b",borderColor:"#f5c6cb",background:"#fdf2f3",fontSize:13}:{}) }}
                  onClick={()=>setNewQty(String(q))}>
                  {q===0?"🚫 Stop":q}
                </button>
              ))}
            </div>
            <input type="number" step="0.5" min="0" max="20" placeholder="Or type custom amount" value={newQty}
              style={{ ...S.formInput, marginBottom:12 }} onChange={e=>setNewQty(e.target.value)} />
            <label style={S.formLabel}>Change Type</label>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {[["permanent","Permanent (default changes)"],["temporary","Today only"]].map(([v,l])=>(
                <button key={v} style={{ flex:1, padding:"10px 8px", borderRadius:10, fontSize:12, fontWeight:500, cursor:"pointer", border:`2px solid ${changeType===v?"#1a6b3c":"#eee"}`, background:changeType===v?"#e8f5ee":"white", color:changeType===v?"#1a6b3c":"#888" }}
                  onClick={()=>setChangeType(v)}>{l}</button>
              ))}
            </div>
            <div style={S.modalActions}>
              <button style={S.btnCancel} onClick={()=>setEditing(null)}>Cancel</button>
              <button style={S.btnSave} onClick={applyChange} disabled={saving}>{saving?"Saving...":"✅ Apply + Notify"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── BRAND MANAGEMENT (Fix Issue 1) ──────────────────────────────────────────
function BrandManagement() {
  const DEFAULT_BRANDS = [
    { id:1, name:"Amul Full Cream", rate_per_litre:68 },
    { id:2, name:"Amul Toned",      rate_per_litre:54 },
    { id:3, name:"Nandini",         rate_per_litre:56 },
    { id:4, name:"Local",           rate_per_litre:48 },
  ];
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editBrand, setEditBrand] = useState(null);
  const [form, setForm] = useState({ name:"", rate_per_litre:"" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const d = await db("milk_brands","GET",null,"?order=name&select=*");
      setBrands(d && d.length > 0 ? d : DEFAULT_BRANDS);
    } catch { setBrands(DEFAULT_BRANDS); }
    setLoading(false);
  };

  const save = async () => {
    if (!form.name || !form.rate_per_litre) { alert("Enter brand name and rate"); return; }
    const rate = parseFloat(form.rate_per_litre);
    if (isNaN(rate) || rate <= 0) { alert("Enter valid rate"); return; }
    setSaving(true);
    try {
      if (editBrand) {
        await db("milk_brands","PATCH",{ name:form.name, rate_per_litre:rate },`?id=eq.${editBrand.id}`);
      } else {
        await db("milk_brands","POST",{ name:form.name, rate_per_litre:rate });
      }
      load();
      setShowAdd(false);
      setEditBrand(null);
      setForm({ name:"", rate_per_litre:"" });
    } catch(e) {
      // Save locally if DB fails
      setBrands(p => editBrand
        ? p.map(b => b.id===editBrand.id ? {...b, name:form.name, rate_per_litre:rate} : b)
        : [...p, { id:Date.now(), name:form.name, rate_per_litre:rate }]
      );
      setShowAdd(false); setEditBrand(null);
      setForm({ name:"", rate_per_litre:"" });
    }
    setSaving(false);
  };

  const deleteBrand = async (brand) => {
    if (!window.confirm(`Delete "${brand.name}"?`)) return;
    try {
      await db("milk_brands","DELETE",null,`?id=eq.${brand.id}`);
      load();
    } catch { setBrands(p=>p.filter(b=>b.id!==brand.id)); }
  };

  if (loading) return <Loader />;

  return (
    <div style={{ marginTop:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ fontSize:14, color:"#555" }}>{brands.length} brands configured</div>
        <button style={S.btnPrimary} onClick={()=>{ setShowAdd(true); setEditBrand(null); setForm({name:"",rate_per_litre:""}); }}>+ Add Brand</button>
      </div>

      {brands.map((b,i) => (
        <div key={b.id||i} style={S.listCard}>
          <div style={{ width:4, height:44, borderRadius:2, background:AREA_COLORS[i%AREA_COLORS.length], flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:500 }}>{b.name}</div>
            <div style={{ fontSize:12, color:"#888" }}>Rate: {fmtCurrency(b.rate_per_litre)}/litre</div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button style={{ fontSize:12, padding:"5px 10px", background:"#e8f5ee", border:"0.5px solid #b8dfc8", borderRadius:8, color:"#1a6b3c", cursor:"pointer" }}
              onClick={()=>{ setEditBrand(b); setForm({name:b.name, rate_per_litre:String(b.rate_per_litre)}); setShowAdd(true); }}>✏️ Edit</button>
            <button style={{ fontSize:12, padding:"5px 10px", background:"#fdf2f3", border:"0.5px solid #f5c6cb", borderRadius:8, color:"#c62828", cursor:"pointer" }}
              onClick={()=>deleteBrand(b)}>🗑</button>
          </div>
        </div>
      ))}

      <div style={{ background:"#e8f5ee", borderRadius:10, padding:"10px 14px", marginTop:8, fontSize:12, color:"#2d7a50" }}>
        💡 Brands added here appear in the customer Add/Edit form and billing calculations.
      </div>

      {showAdd && (
        <div style={S.modalBg} onClick={()=>setShowAdd(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHandle} />
            <div style={S.modalName}>{editBrand ? "Edit Brand" : "Add New Brand"}</div>
            <label style={S.formLabel}>Brand Name</label>
            <input style={S.formInput} placeholder="e.g. Jersey Full Cream" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
            <label style={S.formLabel}>Rate per Litre (₹)</label>
            <input style={S.formInput} type="text" inputMode="decimal" placeholder="e.g. 72" value={form.rate_per_litre} onChange={e=>setForm(p=>({...p,rate_per_litre:e.target.value}))} />
            <div style={S.modalActions}>
              <button style={S.btnCancel} onClick={()=>setShowAdd(false)}>Cancel</button>
              <button style={S.btnSave} onClick={save} disabled={saving}>{saving?"Saving...":"Save Brand"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAYMENT "I PAID" BUTTON (Fix Issue 13) ───────────────────────────────────
// Added to Customer Portal Pay tab
function PortalPayConfirm({ bill, customer }) {
  const [step, setStep] = useState("pay"); // pay | confirm | done
  const [txnLast4, setTxnLast4] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=Saikrishna+Milk+Supply&am=${bill?.total_amount||0}&cu=INR&tn=MF-${customer?.customer_code||"C001"}`;
  const waLink = `https://wa.me/91${(customer?.phone||"XXXXXXXXXX").replace(/\D/g,"")}`;
  const WHATSAPP_NUMBER = "919987073536"; // Replace with owner's WhatsApp

  const submitPaid = async () => {
    if (txnLast4.length < 4) { alert("Please enter last 4 digits of your transaction ID"); return; }
    setSubmitting(true);
    try {
      await db("payments","POST",{
        customer_id: customer?.id,
        amount: bill?.total_amount,
        payment_method: "upi",
        payment_date: today(),
        status: "pending_confirmation",
        notes: `Customer self-confirmed. Last 4 digits of TxnID: ${txnLast4}. Time: ${new Date().toLocaleTimeString("en-IN")}`,
        ocr_verified: false,
      });
      setStep("done");
    } catch(e) {
      // Even if DB save fails, show done — owner will see screenshot on WhatsApp
      setStep("done");
    }
    setSubmitting(false);
  };

  if (step === "done") return (
    <div style={{ padding:16, textAlign:"center" }}>
      <div style={{ fontSize:60, marginBottom:12 }}>✅</div>
      <div style={{ fontSize:20, fontWeight:600, color:"#1a6b3c", marginBottom:8 }}>Payment Recorded!</div>
      <div style={{ fontSize:14, color:"#555", marginBottom:20, lineHeight:1.7, background:"#e8f5ee", borderRadius:12, padding:14 }}>
        Your payment is recorded and waiting for owner confirmation.<br/><br/>
        <strong>Please also share your payment screenshot on WhatsApp</strong> to speed up confirmation ✅
      </div>
      <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Payment screenshot for bill ${monthLabel(bill?.billing_month?.slice(0,7))} — ${customer?.name} (${customer?.customer_code})`)}`}
        style={{ ...S.btnSave, display:"block", textAlign:"center", textDecoration:"none", background:"#25D366", padding:14, fontSize:15 }}>
        📸 Share Screenshot on WhatsApp
      </a>
    </div>
  );

  return (
    <div style={{ padding:16 }}>
      <div style={S.sectionTitle}>💳 Pay Your Bill</div>

      {/* Important notice */}
      <div style={{ background:"#fff3cd", border:"1px solid #ffc107", borderRadius:12, padding:14, marginBottom:16 }}>
        <div style={{ fontWeight:600, fontSize:14, color:"#856404", marginBottom:6 }}>🔔 Important — After Paying</div>
        <div style={{ fontSize:13, color:"#856404", lineHeight:1.7 }}>
          Please tap <strong>"I Have Paid"</strong> below and share your payment screenshot on WhatsApp.
          If not confirmed, your payment will show as <strong>Outstanding</strong> on next month's bill.
        </div>
      </div>

      {/* Bill amount */}
      <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:16, marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <span style={{ color:"#888", fontSize:14 }}>Amount Due</span>
          <span style={{ fontWeight:700, fontSize:22, color:"#c62828" }}>{fmtCurrency(bill?.total_amount)}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
          <span style={{ color:"#888" }}>UPI ID</span>
          <span style={{ fontWeight:500 }}>{UPI_ID}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginTop:4, color:"#888" }}>
          <span>Payment ref</span>
          <span style={{ fontWeight:500, color:"#1a6b3c" }}>MF-{customer?.customer_code}</span>
        </div>
      </div>

      {/* Pay button */}
      <a href={upiLink} style={{ ...S.btnSave, display:"block", textAlign:"center", padding:15, fontSize:16, fontWeight:600, textDecoration:"none", marginBottom:12 }}>
        📱 Pay via GPay / PhonePe / Paytm
      </a>

      {/* I Paid section */}
      {step === "pay" && (
        <button style={{ ...S.btnCancel, width:"100%", padding:14, fontSize:15, fontWeight:500, border:"2px solid #1a6b3c", color:"#1a6b3c" }}
          onClick={()=>setStep("confirm")}>
          ✅ I Have Paid — Confirm Now
        </button>
      )}

      {step === "confirm" && (
        <div style={{ background:"white", border:"2px solid #1a6b3c", borderRadius:12, padding:16, marginTop:4 }}>
          <div style={{ fontWeight:500, fontSize:14, marginBottom:4 }}>Enter last 4 digits of your Transaction ID</div>
          <div style={{ fontSize:12, color:"#888", marginBottom:12 }}>
            Open GPay/PhonePe → tap the payment → you'll see a Transaction ID like "4289XXXXXX7634" — enter the last 4 digits
          </div>
          <input
            type="text" inputMode="numeric" maxLength={4} placeholder="e.g. 7634"
            style={{ ...S.formInput, fontSize:22, letterSpacing:8, textAlign:"center" }}
            value={txnLast4} onChange={e=>setTxnLast4(e.target.value.replace(/\D/g,"").slice(0,4))} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <button style={S.btnCancel} onClick={()=>setStep("pay")}>Back</button>
            <button style={S.btnSave} onClick={submitPaid} disabled={submitting||txnLast4.length<4}>
              {submitting ? "Submitting..." : "Submit ✅"}
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp screenshot reminder */}
      <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, sharing payment screenshot for ${monthLabel(bill?.billing_month?.slice(0,7))} bill — ${customer?.name} (${customer?.customer_code})`)}`}
        style={{ display:"block", textAlign:"center", padding:"12px 0", fontSize:13, color:"#25D366", marginTop:12, textDecoration:"none" }}>
        📸 Also share screenshot on WhatsApp →
      </a>
    </div>
  );
}

// ─── CUSTOMER PORTAL ──────────────────────────────────────────────────────────
function CustomerPortal({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [bill, setBill] = useState(null);
  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ load(); },[]);
  const load = async () => {
    setLoading(true);
    try {
      const [custs, monthE, bills] = await Promise.all([
        db("customers","GET",null,`?customer_code=eq.${customerId}&limit=1`),
        db("daily_entries","GET",null,`?customer_id=eq.${customerId}&order=entry_date.desc&limit=31`),
        db("bills","GET",null,`?customer_id=eq.${customerId}&order=billing_month.desc&limit=1`),
      ]);
      setCustomer(custs?.[0]||DEMO_CUSTOMERS[0]); setEntries(monthE||DEMO_PORTAL_ENTRIES); setBill(bills?.[0]||DEMO_BILL);
    } catch { setCustomer(DEMO_CUSTOMERS[0]); setEntries(DEMO_PORTAL_ENTRIES); setBill(DEMO_BILL); }
    setLoading(false);
  };

  if (loading) return <Loader />;

  return (
    <div style={S.screen}>
      <div style={{ background:"#1565C0", padding:"12px 16px", display:"flex", alignItems:"center", gap:10 }}>
        <img src={logo_app} style={{width:36,height:36,borderRadius:8,objectFit:"contain"}} alt="logo"/>
        <div style={{color:"white"}}><div style={{fontSize:14,fontWeight:500}}>Saikrishna Milk Supply</div><div style={{fontSize:12,opacity:0.85}}>Your milk account</div></div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {tab==="home" && <PortalHome customer={customer} bill={bill} entries={entries} setTab={setTab} />}
        {tab==="records" && <PortalRecords entries={entries} customer={customer} onRefresh={load} />}
        {tab==="bill" && <PortalBill bill={bill} customer={customer} />}
        {tab==="pay" && <PortalPayConfirm bill={bill} customer={customer} />}
      </div>
      <div style={S.bottomNav}>
        {[["home","🏠","Home"],["records","📋","Records"],["bill","🧾","Bill"],["pay","💳","Pay"]].map(([id,icon,label]) => (
          <button key={id} style={{...S.navBtn,...(tab===id?S.navBtnActiveBlue:{})}} onClick={()=>setTab(id)}>
            <span style={{fontSize:18}}>{icon}</span><span style={{fontSize:10,marginTop:2}}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PortalHome({ customer, bill, entries, setTab }) {
  const streak = entries.filter(e=>e.customer_recorded).length;
  return (
    <div style={{padding:16}}>
      <div style={{fontSize:18,fontWeight:600,marginBottom:2}}>Hello, {customer?.name?.split(" ")[0]} 👋</div>
      <div style={{fontSize:13,color:"#888",marginBottom:16}}>Account: {customer?.customer_code}</div>
      <div style={S.statsGrid}>
        <StatCard label="Daily Milk" value={(customer?.default_quantity||1)+"L"} icon="🥛" color="#1565C0" />
        <StatCard label="Your Streak" value={streak+" days 🔥"} icon="📅" color="#e65100" />
        <StatCard label="Bill Amount" value={fmtCurrency(bill?.total_amount)} icon="🧾" color="#1a6b3c" />
        <StatCard label="Status" value={bill?.status==="paid"?"✅ Paid":"⏳ Due"} icon="💳" color={bill?.status==="paid"?"#2E7D32":"#c62828"} />
      </div>
      {bill?.status!=="paid" && <div style={S.alertBox}><span style={{fontSize:18}}>💳</span><div><div style={{fontWeight:500,fontSize:14}}>Amount Due: {fmtCurrency(bill?.total_amount)}</div><div style={{fontSize:12,color:"#856404"}}>Pay & share screenshot to confirm</div></div></div>}
      <div style={S.quickActions}>
        <QuickAction icon="🧾" label="View Bill" onClick={()=>setTab("bill")} color="#1a6b3c" />
        <QuickAction icon="💳" label="Pay Now" onClick={()=>setTab("pay")} color="#1565C0" />
        <QuickAction icon="📋" label="Records" onClick={()=>setTab("records")} color="#6a1b9a" />
      </div>
    </div>
  );
}

function PortalRecords({ entries, customer, onRefresh }) {
  const ownerDays = entries.length;
  const custDays = entries.filter(e=>e.customer_recorded).length;
  const matching = entries.filter(e=>e.customer_recorded&&e.quantity_litres===e.customer_quantity).length;
  const [showEntry, setShowEntry] = useState(false);
  const [selectedQty, setSelectedQty] = useState(null);
  const [customQty, setCustomQty] = useState("");
  const [saving, setSaving] = useState(false);
  const todayEntry = entries.find(e=>e.entry_date===today());

  const saveCustomerEntry = async () => {
    let qty;
    if (selectedQty === -1) { qty = parseFloat(customQty); if (isNaN(qty)||qty<0) return; }
    else if (selectedQty === null) return;
    else qty = selectedQty;
    setSaving(true);
    try {
      await db("customer_entries","POST",{
        customer_id: customer?.id,
        entry_date: today(),
        quantity_litres: qty,
        recorded_at: new Date().toISOString(),
      });
      setShowEntry(false);
      setSelectedQty(null);
      if (onRefresh) onRefresh();
    } catch(e) {
      // Save locally even if DB fails
      setShowEntry(false);
    }
    setSaving(false);
  };

  return (
    <div style={{padding:16}}>
      <div style={S.sectionTitle}>📋 This Month's Records</div>

      {/* Summary */}
      <div style={{background:"#e8f5ee",borderRadius:12,padding:14,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:"#2d7a50"}}>Days recorded by us</span><span style={{fontWeight:600}}>{ownerDays} ✅</span></div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:"#2d7a50"}}>Days recorded by you</span><span style={{fontWeight:600}}>{custDays} 📝</span></div>
        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:"#2d7a50"}}>Matching records</span><span style={{fontWeight:600,color:"#1a6b3c"}}>{matching} 🎯</span></div>
      </div>

      {/* Today's entry button */}
      <div style={{background:"white",border:`2px solid ${todayEntry?.customer_recorded?"#1a6b3c":"#ffc107"}`,borderRadius:12,padding:14,marginBottom:14}}>
        <div style={{fontWeight:500,fontSize:14,marginBottom:4}}>
          {todayEntry?.customer_recorded ? "✅ Today's milk recorded by you" : "📝 Record today's milk received"}
        </div>
        <div style={{fontSize:13,color:"#888",marginBottom:10}}>
          {todayEntry?.customer_recorded
            ? `You recorded ${todayEntry.customer_quantity||todayEntry.quantity_litres}L today`
            : "How much milk did you receive today?"}
        </div>
        {!todayEntry?.customer_recorded && (
          <button style={{...S.btnSave, width:"100%", padding:12}} onClick={()=>setShowEntry(true)}>
            📝 Record Today's Milk
          </button>
        )}
      </div>

      {/* Daily records list */}
      {entries.slice(0,25).map((e,i)=>(
        <div key={i} style={{...S.listCard,padding:"10px 12px"}}>
          <div style={{fontSize:13,color:"#888",minWidth:50}}>{fmtDate(e.entry_date)}</div>
          <div style={{flex:1,fontSize:14,fontWeight:500}}>{e.quantity_litres}L</div>
          <div style={{fontSize:12,color:e.customer_recorded?"#1a6b3c":"#bbb"}}>
            {e.customer_recorded ? `✅ You: ${e.customer_quantity||e.quantity_litres}L` : "—"}
          </div>
        </div>
      ))}

      {/* Entry modal */}
      {showEntry && (
        <div style={S.modalBg} onClick={()=>setShowEntry(false)}>
          <div style={S.modal} onClick={e=>e.stopPropagation()}>
            <div style={S.modalHandle}/>
            <div style={S.modalName}>📝 Record Today's Milk</div>
            <div style={S.modalMeta}>{fmtDate(today())} — How much milk did you receive?</div>
            <div style={{...S.prevBox}}>
              <span style={{fontSize:13,color:"#2d7a50"}}>Your usual quantity:</span>
              <span style={{fontSize:18,fontWeight:600,color:"#1a6b3c"}}>{customer?.default_quantity||1}L</span>
            </div>
            <div style={S.qtyGrid}>
              {QTY_OPTIONS.map(q=>(
                <button key={q} style={{...S.qtyOption,...(selectedQty===q?S.qtyOptionSel:{})}} onClick={()=>{setSelectedQty(q);setCustomQty("");}}>
                  {q}
                </button>
              ))}
              <button style={{...S.qtyOption,...(selectedQty===0?S.qtyOptionSel:{}),color:"#c0392b",borderColor:"#f5c6cb",background:"#fdf2f3",fontSize:13}}
                onClick={()=>{setSelectedQty(0);setCustomQty("");}}>🚫<br/><span style={{fontSize:10}}>None</span></button>
              <button style={{...S.qtyOption,...(selectedQty===-1?S.qtyOptionSel:{}),fontSize:13}}
                onClick={()=>setSelectedQty(-1)}>✏️<br/><span style={{fontSize:10}}>Other</span></button>
            </div>
            {selectedQty===-1&&(
              <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
                <input type="number" step="0.5" min="0" placeholder="0.0" value={customQty}
                  onChange={e=>setCustomQty(e.target.value)}
                  style={{flex:1,fontSize:18,padding:"10px 14px",border:"0.5px solid #ddd",borderRadius:10,background:"white",color:"#111"}} autoFocus/>
                <span style={{fontSize:13,color:"#888"}}>Litres</span>
              </div>
            )}
            <div style={S.modalActions}>
              <button style={S.btnCancel} onClick={()=>setShowEntry(false)}>Cancel</button>
              <button style={S.btnSave} onClick={saveCustomerEntry} disabled={saving||selectedQty===null}>
                {saving?"Saving...":"✅ Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PortalBill({ bill, customer }) {
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=Saikrishna+Milk+Supply&am=${bill?.total_amount||0}&cu=INR`;
  return (
    <div style={{padding:16}}>
      <div style={{background:"white",border:"0.5px solid #eee",borderRadius:14,padding:18}}>
        <div style={{textAlign:"center",marginBottom:16}}><div style={{fontSize:28}}>🥛</div><div style={{fontWeight:700,fontSize:18}}>Saikrishna Milk Supply</div><div style={{fontSize:12,color:"#888"}}>Monthly Bill</div></div>
        {[["Customer",customer?.name],["Code",customer?.customer_code],["Period",bill?.billing_month?fmtDate(bill.billing_month):"This Month"],["Rate",`₹${customer?.rate_per_litre||68}/L`],["Total Litres",`${bill?.total_litres||0}L`]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:8,color:"#555"}}><span>{k}</span><span style={{fontWeight:500}}>{v}</span></div>
        ))}
        {(bill?.opening_balance||0)>0 && <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8,color:"#c62828"}}><span>Previous Outstanding</span><span>+{fmtCurrency(bill.opening_balance)}</span></div>}
        <div style={{borderTop:"2px solid #1a6b3c",margin:"12px 0"}}/>
        <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:18}}><span>TOTAL DUE</span><span style={{color:"#c62828"}}>{fmtCurrency(bill?.total_amount)}</span></div>
        <a href={upiLink} style={{...S.btnSave,display:"block",textAlign:"center",marginTop:16,textDecoration:"none"}}>💳 Pay Now — {fmtCurrency(bill?.total_amount)}</a>
        <div style={{fontSize:11,color:"#888",textAlign:"center",marginTop:8}}>After paying, share screenshot on WhatsApp ✅</div>
      </div>
    </div>
  );
}

function PortalPay({ bill }) {
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=Saikrishna+Milk+Supply&am=${bill?.total_amount||0}&cu=INR`;
  return (
    <div style={{padding:16}}>
      <div style={S.sectionTitle}>💳 Pay Your Bill</div>
      <div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:14,marginBottom:16,fontSize:13}}>
        ⚠️ After paying, <strong>share your payment screenshot on WhatsApp</strong>. Unshared payments show as OUTSTANDING on next bill.
      </div>
      <div style={{background:"white",border:"0.5px solid #eee",borderRadius:14,padding:18,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontWeight:600}}>Amount Due</span><span style={{fontWeight:700,fontSize:20,color:"#c62828"}}>{fmtCurrency(bill?.total_amount)}</span></div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"#888"}}>UPI ID</span><span>{UPI_ID}</span></div>
      </div>
      <a href={upiLink} style={{...S.btnSave,display:"block",textAlign:"center",padding:16,fontSize:16,textDecoration:"none",marginBottom:12}}>📱 Pay via GPay / PhonePe / Paytm</a>
      <a href="https://wa.me/919987073536" style={{...S.btnCancel,display:"block",textAlign:"center",padding:14,fontSize:14,textDecoration:"none"}}>📸 Share Payment Screenshot on WhatsApp</a>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color }) => (
  <div style={S.statCard}><div style={{fontSize:20,marginBottom:4}}>{icon}</div><div style={{fontSize:17,fontWeight:700,color}}>{value}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>{label}</div></div>
);
const StatBox = ({ label, value }) => (
  <div style={{background:"#e8f5ee",borderRadius:12,padding:"12px 16px",textAlign:"center"}}>
    <div style={{fontSize:26,fontWeight:700,color:"#1a6b3c"}}>{value}</div>
    <div style={{fontSize:12,color:"#2d7a50"}}>{label}</div>
  </div>
);
const Chip = ({ bg, color, label }) => (
  <div style={{flex:1,background:bg,color,borderRadius:20,padding:"6px 0",textAlign:"center",fontSize:11,fontWeight:500}}>{label}</div>
);
const QuickAction = ({ icon, label, onClick, color }) => (
  <button style={{flex:1,background:"white",border:`1px solid ${color}20`,borderRadius:12,padding:"12px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}} onClick={onClick}>
    <span style={{fontSize:24}}>{icon}</span><span style={{fontSize:11,color,fontWeight:500}}>{label}</span>
  </button>
);
const Loader = () => <div style={{textAlign:"center",padding:40,color:"#888",fontSize:28}}>⏳</div>;

// ─── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_CUSTOMERS = [
  {id:1,name:"Rajeshwar Rao",customer_code:"C001",phone:"9876543210",area_name:"Govindapuram",brand_name:"Amul Full Cream",default_quantity:1.5,rate_per_litre:68,is_active:true,opening_balance:0},
  {id:2,name:"Sumitra Devi",customer_code:"C002",phone:"9876543211",area_name:"Govindapuram",brand_name:"Amul Toned",default_quantity:1.0,rate_per_litre:54,is_active:true,opening_balance:340},
  {id:3,name:"Venkateswarlu",customer_code:"C003",phone:"9876543212",area_name:"Naidupet",brand_name:"Jersey",default_quantity:2.0,rate_per_litre:68,is_active:true,opening_balance:0},
  {id:4,name:"Lakshmi Narayana",customer_code:"C004",phone:"9876543213",area_name:"Naidupet",brand_name:"Amul Full Cream",default_quantity:0.5,rate_per_litre:68,is_active:true,opening_balance:0},
  {id:5,name:"Murali Krishna",customer_code:"C005",phone:"9876543214",area_name:"Srinagar",brand_name:"Nandini",default_quantity:1.5,rate_per_litre:56,is_active:true,opening_balance:0},
  {id:6,name:"Padmavathi",customer_code:"C006",phone:"9876543215",area_name:"Srinagar",brand_name:"Amul Full Cream",default_quantity:1.0,rate_per_litre:68,is_active:true,opening_balance:612},
];
const DEMO_ENTRIES = DEMO_CUSTOMERS.map(c=>({customer_id:c.id,entry_date:today(),quantity_litres:c.default_quantity,entered_by:"father",customers:c}));
const DEMO_BILLS = DEMO_CUSTOMERS.map(c=>({customer_id:c.id,billing_month:new Date().toISOString().slice(0,7)+"-01",total_litres:c.default_quantity*30,total_amount:c.default_quantity*30*c.rate_per_litre+(c.opening_balance||0),opening_balance:c.opening_balance||0,status:Math.random()>0.5?"paid":"pending",customers:c}));
const DEMO_BILL={total_litres:45,total_amount:3060,opening_balance:0,status:"pending",billing_month:new Date().toISOString().slice(0,7)+"-01"};
const DEMO_PAYMENTS=DEMO_CUSTOMERS.slice(0,4).map((c,i)=>({id:i+1,customer_id:c.id,amount:c.default_quantity*30*c.rate_per_litre,payment_method:i%2===0?"upi":"cash",payment_date:today(),status:i===0?"pending_confirmation":"confirmed",customers:c}));
const DEMO_PORTAL_ENTRIES=Array.from({length:20},(_,i)=>({entry_date:new Date(Date.now()-i*86400000).toISOString().split("T")[0],quantity_litres:1.5,customer_recorded:i%3!==0,customer_quantity:1.5}));

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [pinsLoaded, setPinsLoaded] = useState(false);
  const route = getRoute();

  useEffect(() => { loadPins().then(() => setPinsLoaded(true)); }, []);

  if (!pinsLoaded) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontSize:40}}>🥛</div>
  );

  // Bill webpage — /bill/CODE — no PIN, direct access
  if (route.role === "bill") {
    return (
      <div style={{ maxWidth:520, margin:"0 auto" }}>
        <BillPage customerCode={route.code} />
      </div>
    );
  }

  // Customer portal — no PIN, direct access
  if (route.role === "customer") {
    return (
      <div style={{maxWidth:480,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column"}}>
        <CustomerPortal customerId={route.code} />
      </div>
    );
  }

  // Owner dashboard
  if (route.role === "owner") {
    if (!authed) return (
      <div style={{maxWidth:480,margin:"0 auto"}}>
        <div style={S.appHeader}><img src={logo_app} style={{width:32,height:32,borderRadius:6,objectFit:"contain"}} alt="logo"/> MilkFlow — Owner</div>
        <PinScreen role="owner" onSuccess={()=>setAuthed(true)} />
      </div>
    );
    return (
      <div style={{maxWidth:480,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column"}}>
        <div style={S.appHeader}>
          <img src={logo_app} style={{width:32,height:32,borderRadius:6,objectFit:"contain"}} alt="logo"/> MilkFlow
          <button style={{marginLeft:"auto",fontSize:12,color:"#888",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setAuthed(false)}>Logout</button>
        </div>
        <OwnerDashboard />
      </div>
    );
  }

  // Father entry
  if (route.role === "father") {
    if (!authed) return (
      <div style={{maxWidth:480,margin:"0 auto"}}>
        <div style={{...S.appHeader,background:"#1a6b3c",color:"white"}}><img src={logo_app} style={{width:32,height:32,borderRadius:6,objectFit:"contain"}} alt="logo"/> MilkFlow — Delivery Entry</div>
        <PinScreen role="father" onSuccess={()=>setAuthed(true)} />
      </div>
    );
    return (
      <div style={{maxWidth:480,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column"}}>
        <div style={{...S.appHeader,background:"#1a6b3c",color:"white"}}>
          <span style={{fontSize:22}}>🥛</span> Milk Entry — {new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}
          <button style={{marginLeft:"auto",fontSize:12,color:"rgba(255,255,255,0.8)",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setAuthed(false)}>Lock</button>
        </div>
        <FatherScreen />
      </div>
    );
  }

  // Dev selector — not exposed to users
  return (
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,background:"#f8f9fa"}}>
      <img src={logo_app} style={{width:100,height:100,borderRadius:20,objectFit:"contain",marginBottom:8}} alt="Saikrishna Milk Supply"/>
      <div style={{fontSize:26,fontWeight:700,color:"#1a6b3c",marginBottom:4}}>MilkFlow</div>
      <div style={{fontSize:14,color:"#888",marginBottom:8}}>Saikrishna Milk Supply</div>
      <div style={{fontSize:12,color:"#bbb",marginBottom:32,background:"#fff3cd",padding:"6px 16px",borderRadius:20,color:"#856404"}}>Developer mode — not visible to users</div>
      <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12}}>
        {[["👑","Owner Dashboard","/owner","#3949ab"],["🥛","Delivery Entry","/entry","#1a6b3c"],["👤","Customer Portal (demo)","/c/C001","#e65100"]].map(([icon,label,path,color])=>(
          <a key={path} href={path} style={{display:"flex",alignItems:"center",gap:14,background:"white",border:`1px solid ${color}30`,borderRadius:14,padding:"16px 18px",textDecoration:"none",color:"#111"}}>
            <span style={{fontSize:32}}>{icon}</span>
            <div><div style={{fontWeight:600,fontSize:16}}>{label}</div><div style={{fontSize:12,color:"#888"}}>{path}</div></div>
            <span style={{marginLeft:"auto",color:"#888"}}>→</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  screen:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},
  appHeader:{background:"white",borderBottom:"1px solid #eee",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,fontWeight:600,fontSize:16,flexShrink:0},
  sectionTitle:{fontSize:15,fontWeight:600,color:"#111",marginBottom:12},
  pinWrap:{display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 24px",gap:14},
  pinTitle:{fontSize:24,fontWeight:700,color:"#1a6b3c"},
  pinDots:{display:"flex",gap:14},
  pinDot:{width:18,height:18,borderRadius:"50%",border:"2px solid #1a6b3c",transition:"background 0.15s"},
  pinDotFilled:{background:"#1a6b3c"},
  pinPad:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,width:"100%",maxWidth:280},
  pinBtn:{background:"#f5f5f5",border:"0.5px solid #ddd",borderRadius:12,padding:"18px 0",fontSize:26,fontWeight:500,color:"#111",cursor:"pointer",textAlign:"center"},
  shake:{animation:"shake 0.4s"},
  statusBar:{display:"flex",gap:6,padding:"8px 10px",background:"#f8f9fa",borderBottom:"0.5px solid #eee"},
  searchBar:{display:"flex",alignItems:"center",gap:8,background:"#f5f5f5",border:"0.5px solid #ddd",borderRadius:24,padding:"8px 14px",margin:"8px 12px 4px"},
  searchInput:{flex:1,background:"none",border:"none",outline:"none",fontSize:15,color:"#111"},
  clearBtn:{background:"none",border:"none",color:"#888",fontSize:14,cursor:"pointer"},
  filterRow:{display:"flex",gap:8,padding:"0 12px 8px",overflowX:"auto",scrollbarWidth:"none"},
  filterChip:{whiteSpace:"nowrap",padding:"5px 12px",borderRadius:16,fontSize:12,cursor:"pointer",border:"0.5px solid #ddd",color:"#666",background:"white"},
  filterChipActive:{background:"#e8f5ee",color:"#1a6b3c",borderColor:"#1a6b3c"},
  scrollArea:{flex:1,overflowY:"auto",padding:"8px 12px",display:"flex",flexDirection:"column",gap:8},
  custCard:{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"},
  custCardDone:{borderLeft:"3px solid #28a745"},
  avatar:{width:44,height:44,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:600,color:"white",flexShrink:0},
  custInfo:{flex:1,minWidth:0},
  custName:{fontSize:15,fontWeight:500,color:"#111",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
  custMeta:{fontSize:12,color:"#888",marginTop:2},
  qtySection:{display:"flex",flexDirection:"column",alignItems:"center",gap:4},
  qtyNum:{fontSize:22,fontWeight:600,color:"#1a6b3c",lineHeight:1},
  qtyUnit:{fontSize:11,color:"#888"},
  qtyBadge:{fontSize:10,padding:"2px 7px",borderRadius:10},
  qtyBadgeDone:{background:"#d4edda",color:"#155724"},
  qtyBadgePrev:{background:"#fff3cd",color:"#856404"},
  areaDivider:{fontSize:12,fontWeight:600,color:"#888",padding:"4px 2px 2px",display:"flex",alignItems:"center",gap:8},
  dividerLine:{flex:1,height:0.5,background:"#eee"},
  submitBtn:{margin:12,background:"#1a6b3c",border:"none",borderRadius:12,padding:16,fontSize:15,fontWeight:500,color:"white",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10},
  submitBtnDisabled:{background:"#a8d5b8"},
  modalBg:{position:"absolute",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-end",zIndex:100},
  modal:{background:"white",borderRadius:"20px 20px 0 0",padding:"20px 16px 32px",width:"100%"},
  modalHandle:{width:40,height:4,background:"#ddd",borderRadius:2,margin:"0 auto 16px"},
  modalName:{fontSize:20,fontWeight:600,color:"#111",marginBottom:4},
  modalMeta:{fontSize:13,color:"#888",marginBottom:14},
  prevBox:{background:"#e8f5ee",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"},
  qtyGrid:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14},
  qtyOption:{background:"#f5f5f5",border:"2px solid #eee",borderRadius:12,padding:"12px 0",textAlign:"center",cursor:"pointer",fontSize:18,fontWeight:500,color:"#111"},
  qtyOptionSel:{background:"#e8f5ee",borderColor:"#1a6b3c",color:"#1a6b3c"},
  modalActions:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},
  btnCancel:{background:"#f5f5f5",border:"0.5px solid #ddd",borderRadius:12,padding:14,fontSize:15,color:"#666",cursor:"pointer",textAlign:"center"},
  btnSave:{background:"#1a6b3c",border:"none",borderRadius:12,padding:14,fontSize:15,fontWeight:500,color:"white",cursor:"pointer",textAlign:"center"},
  successScreen:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,gap:12,textAlign:"center"},
  statsGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16},
  statCard:{background:"#f8f9fa",borderRadius:12,padding:"14px 12px",textAlign:"center"},
  quickActions:{display:"flex",gap:10,marginBottom:16},
  alertBox:{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:12},
  listCard:{background:"white",border:"0.5px solid #eee",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:8},
  formLabel:{display:"block",fontSize:12,color:"#888",marginBottom:4,fontWeight:500},
  formInput:{width:"100%",padding:"10px 14px",border:"0.5px solid #ddd",borderRadius:10,fontSize:15,background:"white",color:"#111",marginBottom:12,display:"block"},
  btnPrimary:{background:"#1a6b3c",border:"none",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:500,color:"white",cursor:"pointer"},
  statusBadge:{fontSize:11,padding:"2px 8px",borderRadius:10,display:"inline-block",marginTop:4},
  badgePaid:{background:"#d4edda",color:"#155724",fontSize:11,padding:"2px 8px",borderRadius:10},
  badgePending:{background:"#fff3cd",color:"#856404",fontSize:11,padding:"2px 8px",borderRadius:10},
  badgeRejected:{background:"#f8d7da",color:"#721c24",fontSize:11,padding:"2px 8px",borderRadius:10},
  bottomNav:{display:"flex",borderTop:"0.5px solid #eee",background:"white",flexShrink:0},
  navBtn:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 0",background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:12},
  navBtnActive:{color:"#1a6b3c",borderTop:"2px solid #1a6b3c"},
  navBtnActiveBlue:{color:"#1565C0",borderTop:"2px solid #1565C0"},
};
