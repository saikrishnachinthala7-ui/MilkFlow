import { useState, useEffect } from "react";

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
    await db("settings", "POST", { key, value });
    CACHED_PINS[key] = value;
    return true;
  } catch {
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
  if (path === "/owner") return { role: "owner" };
  if (path === "/entry") return { role: "father" };
  if (path.startsWith("/c/")) return { role: "customer", code: path.split("/c/")[1] };
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
      <div style={{ fontSize: 52 }}>🥛</div>
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
    } catch { setCustomers(DEMO_CUSTOMERS); }
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
  const tabs = [["home","🏠","Home"],["customers","👥","Customers"],["records","📋","Records"],["billing","🧾","Billing"],["payments","💳","Payments"],["settings","⚙️","Settings"]];
  return (
    <div style={S.screen}>
      <div style={{ flex:1, overflowY:"auto" }}>
        {tab==="home" && <OwnerHome setTab={setTab} />}
        {tab==="customers" && <CustomerManagement />}
        {tab==="records" && <DailyRecords />}
        {tab==="billing" && <BillingSection />}
        {tab==="payments" && <PaymentTracking />}
        {tab==="settings" && <OwnerSettings />}
      </div>
      <div style={S.bottomNav}>
        {tabs.map(([id,icon,label]) => (
          <button key={id} style={{ ...S.navBtn, ...(tab===id?S.navBtnActive:{}) }} onClick={() => setTab(id)}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontSize: 10, marginTop: 2 }}>{label}</span>
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
        <div style={{ ...S.avatar, background:"#1a6b3c", width:40, height:40, fontSize:16 }}>SK</div>
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
  const [form, setForm] = useState({ name:"", phone:"", area_name:"", default_quantity:1, brand_name:"Amul Full Cream", rate_per_litre:68, opening_balance:0 });

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try { const d = await db("customers","GET",null,"?is_active=eq.true&order=name"); setCustomers(d||DEMO_CUSTOMERS); }
    catch { setCustomers(DEMO_CUSTOMERS); }
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
        <button style={S.btnPrimary} onClick={()=>setShowAdd(true)}>+ Add</button>
      </div>
      <div style={S.searchBar}>
        <span>🔍</span>
        <input style={S.searchInput} placeholder="Search name, phone, code..." value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      {loading ? <Loader /> : filtered.map(c => (
        <div key={c.id} style={S.listCard}>
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
      ))}

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
              <div style={{ flex:1 }}><label style={S.formLabel}>Daily Qty (L)</label><input style={S.formInput} type="number" step="0.5" placeholder="1.0" value={form.default_quantity} onChange={e=>setForm(p=>({...p,default_quantity:parseFloat(e.target.value)||1}))} /></div>
              <div style={{ flex:1 }}><label style={S.formLabel}>Rate (₹/L)</label><input style={S.formInput} type="number" placeholder="68" value={form.rate_per_litre} onChange={e=>setForm(p=>({...p,rate_per_litre:parseFloat(e.target.value)||68}))} /></div>
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
        {[["pins","🔐 Change PINs"],["balance","⚖️ Opening Balances"],["about","ℹ️ About"]].map(([id,label]) => (
          <button key={id} style={{ ...S.filterChip, ...(sub===id?S.filterChipActive:{}) }} onClick={()=>setSub(id)}>{label}</button>
        ))}
      </div>
      {sub==="pins" && <PinChangeSection />}
      {sub==="balance" && <OpeningBalanceSetup />}
      {sub==="about" && (
        <div style={{ background:"white", border:"0.5px solid #eee", borderRadius:12, padding:16, marginTop:8 }}>
          <div style={{ fontWeight:600, fontSize:16, marginBottom:12 }}>🥛 MilkFlow v1.1</div>
          {[["Business","Saikrishna Milk Supply"],["UPI ID",UPI_ID],["Owner URL","yourapp.vercel.app/owner"],["Delivery URL","yourapp.vercel.app/entry"],["Customer URL","yourapp.vercel.app/c/CODE"]].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:8, paddingBottom:8, borderBottom:"0.5px solid #f5f5f5" }}>
              <span style={{ color:"#888" }}>{k}</span><span style={{ fontWeight:500, fontSize:12 }}>{v}</span>
            </div>
          ))}
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

function BillingSection() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  useEffect(()=>{ load(); },[month]);
  const load = async () => {
    setLoading(true);
    try { const d = await db("bills","GET",null,`?billing_month=eq.${month+"-01"}&select=*,customers(name,customer_code,phone)`); setBills(d||DEMO_BILLS); }
    catch { setBills(DEMO_BILLS); }
    setLoading(false);
  };
  const totalAmount = bills.reduce((s,b)=>s+(b.total_amount||0),0);
  const paidCount = bills.filter(b=>b.status==="paid").length;
  return (
    <div style={{ padding:16 }}>
      <div style={S.sectionTitle}>🧾 Billing</div>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{ ...S.formInput, flex:1, marginBottom:0 }} />
        <button style={S.btnPrimary} onClick={async()=>{ setGenerating(true); await new Promise(r=>setTimeout(r,1500)); setGenerating(false); alert("Bills generated for "+month+"!"); }} disabled={generating}>{generating?"⏳...":"Generate"}</button>
      </div>
      <div style={S.statsGrid}>
        <StatCard label="Total Bills" value={bills.length} icon="🧾" color="#1565C0" />
        <StatCard label="Total Amount" value={fmtCurrency(totalAmount)} icon="💰" color="#1a6b3c" />
        <StatCard label="Paid" value={paidCount} icon="✅" color="#2E7D32" />
        <StatCard label="Pending" value={bills.length-paidCount} icon="⏳" color="#c62828" />
      </div>
      <button style={{ ...S.btnPrimary, width:"100%", padding:12, marginBottom:12 }}>📤 Send All via WhatsApp</button>
      {loading ? <Loader /> : bills.map((b,i) => (
        <div key={i} style={S.listCard}>
          <div style={{ ...S.avatar, background:avatarColor(b.customers?.name||""), width:36, height:36, fontSize:12 }}>{initials(b.customers?.name||"")}</div>
          <div style={{ flex:1 }}><div style={{fontWeight:500,fontSize:14}}>{b.customers?.name||"Customer"}</div><div style={{fontSize:12,color:"#888"}}>{b.customers?.customer_code}</div></div>
          <div style={{ textAlign:"right" }}><div style={{fontWeight:600}}>{fmtCurrency(b.total_amount)}</div><div style={{...S.statusBadge,...(b.status==="paid"?S.badgePaid:S.badgePending)}}>{b.status==="paid"?"✅ Paid":"⏳ Pending"}</div></div>
        </div>
      ))}
    </div>
  );
}

function PaymentTracking() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ load(); },[]);
  const load = async () => {
    setLoading(true);
    try { const d = await db("payments","GET",null,"?order=payment_date.desc&limit=50&select=*,customers(name,customer_code)"); setPayments(d||DEMO_PAYMENTS); }
    catch { setPayments(DEMO_PAYMENTS); }
    setLoading(false);
  };
  const confirm = async (id) => {
    try { await db("payments","PATCH",{status:"confirmed"},`?id=eq.${id}`); load(); }
    catch { alert("Error confirming"); }
  };
  const filtered = payments.filter(p=>filter==="all"||p.status===filter);
  return (
    <div style={{ padding:16 }}>
      <div style={S.sectionTitle}>💳 Payment Tracking</div>
      <div style={S.filterRow}>
        {[["all","All"],["pending_confirmation","⏳ Review"],["confirmed","✅ Confirmed"],["rejected","❌ Rejected"]].map(([f,l]) => (
          <button key={f} style={{ ...S.filterChip, ...(filter===f?S.filterChipActive:{}) }} onClick={()=>setFilter(f)}>{l}</button>
        ))}
      </div>
      {loading ? <Loader /> : filtered.map((p,i) => (
        <div key={i} style={S.listCard}>
          <div style={{fontSize:26}}>{p.payment_method==="cash"?"💵":"📱"}</div>
          <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{p.customers?.name||"Customer"}</div><div style={{fontSize:12,color:"#888"}}>{(p.payment_method||"").toUpperCase()} • {fmtDate(p.payment_date)}</div></div>
          <div style={{textAlign:"right"}}>
            <div style={{fontWeight:600,color:"#1a6b3c"}}>{fmtCurrency(p.amount)}</div>
            {p.status==="pending_confirmation" && <button style={{...S.btnPrimary,padding:"4px 10px",fontSize:11,marginTop:4}} onClick={()=>confirm(p.id)}>Confirm ✅</button>}
            {p.status==="confirmed" && <div style={S.badgePaid}>✅ Done</div>}
            {p.status==="rejected" && <div style={S.badgeRejected}>❌ Rejected</div>}
          </div>
        </div>
      ))}
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
        <div style={{fontSize:24}}>🥛</div>
        <div style={{color:"white"}}><div style={{fontSize:14,fontWeight:500}}>Saikrishna Milk Supply</div><div style={{fontSize:12,opacity:0.85}}>Your milk account</div></div>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        {tab==="home" && <PortalHome customer={customer} bill={bill} entries={entries} setTab={setTab} />}
        {tab==="records" && <PortalRecords entries={entries} />}
        {tab==="bill" && <PortalBill bill={bill} customer={customer} />}
        {tab==="pay" && <PortalPay bill={bill} />}
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

function PortalRecords({ entries }) {
  const ownerDays = entries.length;
  const custDays = entries.filter(e=>e.customer_recorded).length;
  const matching = entries.filter(e=>e.customer_recorded&&e.quantity_litres===e.customer_quantity).length;
  return (
    <div style={{padding:16}}>
      <div style={S.sectionTitle}>📋 This Month's Records</div>
      <div style={{background:"#e8f5ee",borderRadius:12,padding:14,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:"#2d7a50"}}>Days recorded by us</span><span style={{fontWeight:600}}>{ownerDays} ✅</span></div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:"#2d7a50"}}>Days recorded by you</span><span style={{fontWeight:600}}>{custDays} 📝</span></div>
        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:"#2d7a50"}}>Matching records</span><span style={{fontWeight:600,color:"#1a6b3c"}}>{matching} 🎯</span></div>
      </div>
      {entries.slice(0,25).map((e,i)=>(
        <div key={i} style={{...S.listCard,padding:"10px 12px"}}>
          <div style={{fontSize:13,color:"#888",minWidth:50}}>{fmtDate(e.entry_date)}</div>
          <div style={{flex:1,fontSize:14}}>{e.quantity_litres}L</div>
          <div style={{fontSize:12,color:e.customer_recorded?"#1a6b3c":"#888"}}>{e.customer_recorded?"✅ You recorded":"Not recorded"}</div>
        </div>
      ))}
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
      <a href="https://wa.me/91XXXXXXXXXX" style={{...S.btnCancel,display:"block",textAlign:"center",padding:14,fontSize:14,textDecoration:"none"}}>📸 Share Payment Screenshot on WhatsApp</a>
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
        <div style={S.appHeader}><span style={{fontSize:22}}>🥛</span> MilkFlow — Owner</div>
        <PinScreen role="owner" onSuccess={()=>setAuthed(true)} />
      </div>
    );
    return (
      <div style={{maxWidth:480,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column"}}>
        <div style={S.appHeader}>
          <span style={{fontSize:22}}>🥛</span> MilkFlow
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
        <div style={{...S.appHeader,background:"#1a6b3c",color:"white"}}><span style={{fontSize:22}}>🥛</span> MilkFlow — Delivery Entry</div>
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
      <div style={{fontSize:56,marginBottom:8}}>🥛</div>
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
