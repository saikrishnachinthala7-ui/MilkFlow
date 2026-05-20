import { useState, useEffect } from "react";
import { logo_app } from "./logoData.js";
import { db, loadPins, getCustomers, addCustomer, updateCustomer, deactivateCustomer, deleteCustomer, getBrands, addBrand, updateBrand, deleteBrand, getTodayEntries, saveEntry, saveCustomerEntry, getPayments, addPayment, confirmPayment, rejectPayment, getBills, getSetting, setSetting, todayStr } from "./db.js";

const UPI_ID = "yadaiahchinthala07-4@okaxis";
const WHATSAPP_NUMBER = "919987073536";
const OWNER_PIN = "1234";
const FATHER_PIN = "0000";
const QTY_OPTIONS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0];
const AREA_COLORS = ["#1a6b3c","#1565C0","#6a1b9a","#c62828","#e65100"];

const fmtCurrency = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => { if (!d) return ""; return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short" }); };
const monthLabel = (m, y) => { if (!m || !y) return ""; return new Date(y, m-1, 1).toLocaleDateString("en-IN", { month:"long", year:"numeric" }); };
const initials = (name="") => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const avatarColor = (name="") => { const c=["#1a6b3c","#1565C0","#6a1b9a","#c62828","#e65100","#00695c","#f57f17"]; let h=0; for(let ch of name) h=(h*31+ch.charCodeAt(0))%c.length; return c[h]; };
const nowDate = () => { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };

function getRoute() {
  const path = window.location.pathname;
  const p = new URLSearchParams(window.location.search);
  if (path==="/owner"||p.get("role")==="owner") return {role:"owner"};
  if (path==="/entry"||p.get("role")==="father") return {role:"father"};
  if (path.startsWith("/c/")) return {role:"customer",code:path.split("/c/")[1]};
  if (path.startsWith("/bill/")) return {role:"bill",code:path.split("/bill/")[1]};
  return {role:"select"};
}

const Loader = () => <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40,fontSize:32}}>⏳</div>;
const EmptyState = ({icon,message}) => <div style={{textAlign:"center",padding:40,color:"#888"}}><div style={{fontSize:40,marginBottom:8}}>{icon}</div><div style={{fontSize:14}}>{message}</div></div>;
const StatCard = ({label,value,icon,color}) => <div style={S.statCard}><div style={{fontSize:20,marginBottom:4}}>{icon}</div><div style={{fontSize:17,fontWeight:700,color}}>{value}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>{label}</div></div>;
const Chip = ({bg,color,label}) => <div style={{flex:1,background:bg,color,borderRadius:20,padding:"6px 0",textAlign:"center",fontSize:11,fontWeight:500}}>{label}</div>;
const Avatar = ({name,size=44}) => <div style={{width:size,height:size,borderRadius:"50%",background:avatarColor(name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.32,fontWeight:600,color:"white",flexShrink:0}}>{initials(name)}</div>;

function PinScreen({onSuccess,role}) {
  const [pin,setPin]=useState(""); const [error,setError]=useState(false); const [shake,setShake]=useState(false);
  const press=(d)=>{
    if(pin.length>=4)return; const next=pin+d; setPin(next); setError(false);
    if(next.length===4){setTimeout(()=>{if(next===(role==="father"?FATHER_PIN:OWNER_PIN)){onSuccess();}else{setShake(true);setError(true);setPin("");setTimeout(()=>setShake(false),500);}},150);}
  };
  return(
    <div style={S.pinWrap}>
      <img src={logo_app} style={{width:90,height:90,borderRadius:16,objectFit:"contain",marginBottom:4}} alt="logo"/>
      <div style={S.pinTitle}>Saikrishna Milk Supply</div>
      <div style={{background:role==="father"?"#e8f5ee":"#e8eaf6",color:role==="father"?"#1a6b3c":"#3949ab",padding:"5px 16px",borderRadius:20,fontSize:13,fontWeight:500,marginBottom:20}}>{role==="father"?"🥛 Delivery Entry":"👑 Owner Login"}</div>
      <div style={{...S.pinDots,...(shake?{animation:"shake 0.4s"}:{})}}>{[0,1,2,3].map(i=><div key={i} style={{...S.pinDot,...(i<pin.length?S.pinDotFilled:{})}}/>)}</div>
      {error&&<div style={{color:"#c0392b",fontSize:13}}>❌ Wrong PIN — try again</div>}
      <div style={S.pinPad}>
        {[1,2,3,4,5,6,7,8,9].map(n=><button key={n} style={S.pinBtn} onClick={()=>press(String(n))}>{n}</button>)}
        <div style={S.pinBtn}/><button style={S.pinBtn} onClick={()=>press("0")}>0</button>
        <button style={S.pinBtn} onClick={()=>setPin(p=>p.slice(0,-1))}>⌫</button>
      </div>
    </div>
  );
}

function FatherScreen() {
  const [customers,setCustomers]=useState([]); const [brands,setBrands]=useState([]); const [entries,setEntries]=useState({});
  const [active,setActive]=useState(null); const [selectedQty,setSelectedQty]=useState(null); const [customQty,setCustomQty]=useState("");
  const [filter,setFilter]=useState("all"); const [search,setSearch]=useState(""); const [submitted,setSubmitted]=useState(false);
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false);
  useEffect(()=>{loadData();},[]);
  const loadData=async()=>{
    setLoading(true);
    try{
      const [custs,brandsData,todayE]=await Promise.all([getCustomers(),getBrands(),getTodayEntries()]);
      setCustomers(custs||[]); setBrands(brandsData||[]);
      const map={}; (todayE||[]).forEach(e=>{map[e.customer_id]=e;}); setEntries(map);
    }catch(e){console.error(e);setCustomers([]);}
    setLoading(false);
  };
  const doSave=async()=>{
    let qty; if(selectedQty===-1){qty=parseFloat(customQty);if(isNaN(qty)||qty<0)return;}else if(selectedQty===null)return;else qty=selectedQty;
    setSaving(true);
    try{const brand=brands.find(b=>b.id===active.brand_id);const rate=active.custom_rate||brand?.rate||0;await saveEntry(active.id,qty,active.brand_id,rate);setEntries(p=>({...p,[active.id]:{customer_id:active.id,quantity:qty}}));setActive(null);}
    catch(e){alert("Save failed: "+e.message);}
    setSaving(false);
  };
  const doneCount=Object.keys(entries).length; const allDone=customers.length>0&&doneCount>=customers.length;
  const filtered=customers.filter(c=>{const e=entries[c.id];if(filter==="done"&&!e)return false;if(filter==="pending"&&e)return false;const s=search.toLowerCase();return !s||(c.name||"").toLowerCase().includes(s)||(c.code||"").toLowerCase().includes(s);});
  const byArea={}; filtered.forEach(c=>{const a=c.address||"Other";if(!byArea[a])byArea[a]=[];byArea[a].push(c);});
  if(submitted)return(<div style={S.successScreen}><div style={{fontSize:72}}>✅</div><div style={{fontSize:24,fontWeight:600,color:"#1a6b3c"}}>All Submitted!</div><div style={{display:"flex",gap:16,marginTop:12}}><div style={S.statBox}><div style={S.statBoxNum}>{customers.length}</div><div style={S.statBoxLabel}>Customers</div></div><div style={S.statBox}><div style={S.statBoxNum}>{Object.values(entries).reduce((s,e)=>s+(e?.quantity||0),0).toFixed(1)}</div><div style={S.statBoxLabel}>Litres</div></div></div><button style={{...S.btnSave,marginTop:24,padding:"12px 32px"}} onClick={()=>{setSubmitted(false);setEntries({});loadData();}}>New Day</button></div>);
  if(loading)return <Loader/>;
  if(customers.length===0)return <EmptyState icon="👥" message="No customers yet. Add from Owner Dashboard."/>;
  return(
    <div style={S.screen}>
      <div style={S.statusBar}><Chip bg="#e8f5ee" color="#1a6b3c" label={`✅ ${doneCount}/${customers.length} Done`}/><Chip bg="#fff3cd" color="#856404" label={`⏳ ${customers.length-doneCount} Left`}/><Chip bg={allDone?"#d4edda":"#e9ecef"} color={allDone?"#155724":"#495057"} label={`${Math.round(doneCount/Math.max(customers.length,1)*100)}%`}/></div>
      <div style={S.searchBar}><span style={{color:"#888"}}>🔍</span><input style={S.searchInput} placeholder="Search customer..." value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button style={S.clearBtn} onClick={()=>setSearch("")}>✕</button>}</div>
      <div style={S.filterRow}>{[["all",`All (${customers.length})`],["pending",`Pending (${customers.length-doneCount})`],["done",`Done (${doneCount})`]].map(([f,l])=>(<button key={f} style={{...S.filterChip,...(filter===f?S.filterChipActive:{})}} onClick={()=>setFilter(f)}>{l}</button>))}</div>
      <div style={S.scrollArea}>
        {Object.entries(byArea).map(([area,custs],ai)=>(<div key={area}><div style={S.areaDivider}><span style={{color:AREA_COLORS[ai%5]}}>📍 {area}</span><div style={S.dividerLine}/></div>{custs.map(cust=>{const entry=entries[cust.id];const isDone=!!entry;const qty=isDone?entry.quantity:(cust.default_qty||1);const brand=brands.find(b=>b.id===cust.brand_id);return(<div key={cust.id} style={{...S.custCard,...(isDone?S.custCardDone:{})}} onClick={()=>{setActive(cust);setSelectedQty(isDone?entry.quantity:null);setCustomQty("");}}><Avatar name={cust.name}/><div style={S.custInfo}><div style={S.custName}>{cust.name}</div><div style={S.custMeta}>{cust.code} • {brand?.name||"—"}</div></div><div style={S.qtySection}>{entry?.quantity===0?<><div style={{fontSize:20}}>🚫</div><div style={S.qtyUnit}>No Delivery</div></>:<><div style={S.qtyNum}>{qty}</div><div style={S.qtyUnit}>Litres</div></>}<div style={{...S.qtyBadge,...(isDone?S.qtyBadgeDone:S.qtyBadgePrev)}}>{isDone?"✓ Saved":"Default"}</div></div></div>);})}</div>))}
        {filtered.length===0&&<EmptyState icon="🔍" message="No customers found"/>}
      </div>
      <button style={{...S.submitBtn,...(allDone?{}:S.submitBtnDisabled)}} onClick={allDone?()=>setSubmitted(true):null}><span style={{fontSize:22}}>{allDone?"🚀":"🔒"}</span>{allDone?"Submit All Records":`${customers.length-doneCount} remaining — complete first`}</button>
      {active&&(<div style={S.modalBg} onClick={()=>setActive(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalHandle}/><div style={S.modalName}>{active.name}</div><div style={S.modalMeta}>{active.code} • {brands.find(b=>b.id===active.brand_id)?.name||"—"}</div><div style={S.prevBox}><span style={{fontSize:13,color:"#2d7a50"}}>Default:</span><span style={{fontSize:18,fontWeight:600,color:"#1a6b3c"}}>{active.default_qty||1} L</span></div><div style={{fontSize:13,color:"#888",marginBottom:10,textAlign:"center"}}>How many litres today? 👇</div><div style={S.qtyGrid}>{QTY_OPTIONS.map(q=><button key={q} style={{...S.qtyOption,...(selectedQty===q?S.qtyOptionSel:{})}} onClick={()=>{setSelectedQty(q);setCustomQty("");}}>{q}</button>)}<button style={{...S.qtyOption,...(selectedQty===0?S.qtyOptionSel:{}),color:"#c0392b",borderColor:"#f5c6cb",background:"#fdf2f3",fontSize:13}} onClick={()=>{setSelectedQty(0);setCustomQty("");}}>🚫<br/><span style={{fontSize:10}}>None</span></button><button style={{...S.qtyOption,...(selectedQty===-1?S.qtyOptionSel:{}),fontSize:13}} onClick={()=>setSelectedQty(-1)}>✏️<br/><span style={{fontSize:10}}>Other</span></button></div>{selectedQty===-1&&(<div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}><input type="number" step="0.5" min="0" placeholder="0.0" value={customQty} onChange={e=>setCustomQty(e.target.value)} style={{flex:1,fontSize:18,padding:"10px 14px",border:"0.5px solid #ddd",borderRadius:10,background:"white",color:"#111"}} autoFocus/><span style={{fontSize:13,color:"#888"}}>Litres</span></div>)}<div style={S.modalActions}><button style={S.btnCancel} onClick={()=>setActive(null)}>Cancel</button><button style={S.btnSave} onClick={doSave} disabled={saving}>{saving?"Saving...":"✅ Save"}</button></div></div></div>)}
    </div>
  );
}

function OwnerDashboard() {
  const [tab,setTab]=useState("home");
  const tabs=[["home","🏠","Home"],["customers","👥","Customers"],["records","📋","Records"],["billing","🧾","Billing"],["payments","💳","Payments"],["reports","📊","Reports"],["settings","⚙️","Settings"]];
  return(<div style={S.screen}><div style={{flex:1,overflowY:"auto"}}>{tab==="home"&&<OwnerHome setTab={setTab}/>}{tab==="customers"&&<CustomerManagement/>}{tab==="records"&&<DailyRecords/>}{tab==="billing"&&<BillingSection/>}{tab==="payments"&&<PaymentTracking/>}{tab==="reports"&&<ReportsSection/>}{tab==="settings"&&<OwnerSettings/>}</div><div style={{...S.bottomNav,overflowX:"auto"}}>{tabs.map(([id,icon,label])=>(<button key={id} style={{...S.navBtn,minWidth:46,...(tab===id?S.navBtnActive:{})}} onClick={()=>setTab(id)}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:9,marginTop:2}}>{label}</span></button>))}</div></div>);
}

function OwnerHome({setTab}) {
  const [stats,setStats]=useState(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{loadStats();},[]);
  const loadStats=async()=>{
    setLoading(true);
    try{
      const now=new Date();
      const [custs,todayE,pendingP]=await Promise.all([db("customers","GET",null,"?active=eq.true&select=id"),db("daily_entries","GET",null,`?entry_date=eq.${nowDate()}&select=quantity`),db("payments","GET",null,"?status=eq.pending_confirmation&select=id")]);
      setStats({customers:custs?.length||0,todayLitres:(todayE||[]).reduce((s,e)=>s+(parseFloat(e.quantity)||0),0),pendingPayments:(pendingP||[]).length,day:now.getDate(),daysInMonth:new Date(now.getFullYear(),now.getMonth()+1,0).getDate()});
    }catch{setStats({customers:0,todayLitres:0,pendingPayments:0,day:new Date().getDate(),daysInMonth:30});}
    setLoading(false);
  };
  const hr=new Date().getHours(); const greeting=hr<12?"Good Morning":hr<17?"Good Afternoon":"Good Evening"; const now=new Date();
  return(<div style={{padding:16}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}><div><div style={{fontSize:13,color:"#888"}}>{greeting} 👋</div><div style={{fontSize:18,fontWeight:600}}>Saikrishna Milk Supply</div><div style={{fontSize:12,color:"#888"}}>{now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div></div><img src={logo_app} style={{width:44,height:44,borderRadius:10,objectFit:"contain"}} alt="logo"/></div>
    {loading?<Loader/>:<><div style={S.sectionTitle}>📊 Today</div><div style={S.statsGrid}><StatCard label="Active Customers" value={stats.customers} icon="👥" color="#1565C0"/><StatCard label="Litres Today" value={stats.todayLitres.toFixed(1)+"L"} icon="🥛" color="#1a6b3c"/><StatCard label="Pending Payments" value={stats.pendingPayments} icon="⏳" color={stats.pendingPayments>0?"#c62828":"#1a6b3c"}/><StatCard label="Month Progress" value={`${stats.day}/${stats.daysInMonth}`} icon="📅" color="#6a1b9a"/></div><div style={S.sectionTitle}>⚡ Quick Actions</div><div style={{display:"flex",gap:10,marginBottom:16}}>{[["🧾","Billing","billing"],["💳","Payments","payments"],["📋","Records","records"],["👥","Customers","customers"]].map(([icon,label,t])=>(<button key={t} style={{flex:1,background:"white",border:"1px solid #eee",borderRadius:12,padding:"12px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}} onClick={()=>setTab(t)}><span style={{fontSize:24}}>{icon}</span><span style={{fontSize:11,color:"#555",fontWeight:500}}>{label}</span></button>))}</div>{stats.pendingPayments>0&&<div style={S.alertBox}><span style={{fontSize:20}}>⚠️</span><div><div style={{fontWeight:500,fontSize:14}}>{stats.pendingPayments} payment{stats.pendingPayments>1?"s":""} waiting</div><div style={{fontSize:12,color:"#856404"}}>Tap Payments to review</div></div></div>}<div style={S.sectionTitle}>🗓️ This Month</div><div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:"14px 16px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,color:"#555"}}>Days recorded</span><span style={{fontWeight:600}}>{stats.day}/{stats.daysInMonth}</span></div><div style={{background:"#eee",borderRadius:4,height:8}}><div style={{background:"#1a6b3c",borderRadius:4,height:"100%",width:`${(stats.day/stats.daysInMonth)*100}%`}}/></div></div></>}
  </div>);
}

function CustomerManagement() {
  const [customers,setCustomers]=useState([]); const [brands,setBrands]=useState([]); const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState(""); const [showAdd,setShowAdd]=useState(false); const [showImport,setShowImport]=useState(false); const [deleteTarget,setDeleteTarget]=useState(null);
  const [form,setForm]=useState({name:"",phone:"",address:"",brand_id:"",default_qty:"1",custom_rate:"",outstanding:"0"});
  useEffect(()=>{load();},[]);
  const load=async()=>{setLoading(true);try{const [c,b]=await Promise.all([getCustomers(),getBrands()]);setCustomers(c||[]);setBrands(b||[]);}catch(e){console.error(e);setCustomers([]);setBrands([]);}setLoading(false);};
  const doAdd=async()=>{
    if(!form.name.trim()){alert("Name is required");return;}
    try{await addCustomer({name:form.name.trim(),phone:form.phone.trim(),address:form.address.trim(),brand_id:form.brand_id||null,default_qty:parseFloat(form.default_qty)||1,custom_rate:form.custom_rate?parseFloat(form.custom_rate):null,outstanding:parseFloat(form.outstanding)||0});setShowAdd(false);setForm({name:"",phone:"",address:"",brand_id:"",default_qty:"1",custom_rate:"",outstanding:"0"});load();}
    catch(e){alert("Error: "+e.message);}
  };
  const exportExcel=async()=>{
    try{if(!window.XLSX)await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});const rows=customers.map(c=>({Code:c.code,Name:c.name,Phone:c.phone,Address:c.address,Brand:brands.find(b=>b.id===c.brand_id)?.name||"","Daily Qty":c.default_qty,"Custom Rate":c.custom_rate||"",Outstanding:c.outstanding||0}));const ws=window.XLSX.utils.json_to_sheet(rows);const wb=window.XLSX.utils.book_new();window.XLSX.utils.book_append_sheet(wb,ws,"Customers");window.XLSX.writeFile(wb,`Customers_${nowDate()}.xlsx`);}
    catch(e){alert("Export error: "+e.message);}
  };
  const filtered=customers.filter(c=>!search||(c.name||"").toLowerCase().includes(search.toLowerCase())||(c.phone||"").includes(search)||(c.code||"").toLowerCase().includes(search.toLowerCase()));
  return(<div style={{padding:16}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><div style={S.sectionTitle}>👥 Customers ({customers.length})</div><div style={{display:"flex",gap:6}}><button style={{...S.btnPrimary,background:"#1565C0",padding:"8px 10px",fontSize:12}} onClick={()=>setShowImport(true)}>📥 Import</button><button style={{...S.btnPrimary,background:"#6a1b9a",padding:"8px 10px",fontSize:12}} onClick={exportExcel}>📤 Export</button><button style={S.btnPrimary} onClick={()=>setShowAdd(true)}>+ Add</button></div></div>
    <div style={S.searchBar}><span>🔍</span><input style={S.searchInput} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
    {loading?<Loader/>:filtered.length===0?<EmptyState icon="👥" message={search?"No customers found":"No customers yet. Tap + Add."}/>:filtered.map(c=>{const brand=brands.find(b=>b.id===c.brand_id);return(<div key={c.id} style={{...S.listCard,flexDirection:"column",gap:8}}><div style={{display:"flex",alignItems:"center",gap:10}}><Avatar name={c.name} size={40}/><div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div><div style={{fontSize:12,color:"#888"}}>{c.code} • {c.phone}</div><div style={{fontSize:12,color:"#888"}}>{brand?.name||"No brand"} • {c.default_qty}L/day • ₹{c.custom_rate||brand?.rate||0}/L</div>{(c.outstanding||0)>0&&<div style={{fontSize:12,color:"#c62828"}}>OB: {fmtCurrency(c.outstanding)}</div>}</div></div><div style={{display:"flex",gap:6}}><a href={`https://wa.me/91${(c.phone||"").replace(/\D/g,"")}`} style={{flex:1,fontSize:11,padding:"5px 0",background:"#e7f9f0",border:"0.5px solid #b3dfcb",borderRadius:8,color:"#1a6b3c",textDecoration:"none",textAlign:"center"}}>📞 WhatsApp</a><button style={{flex:1,fontSize:11,padding:"5px 0",background:"#fdf2f3",border:"0.5px solid #f5c6cb",borderRadius:8,color:"#c62828",cursor:"pointer"}} onClick={()=>setDeleteTarget(c)}>🗑 Remove</button></div></div>);})}
    {showAdd&&(<div style={S.modalBg} onClick={()=>setShowAdd(false)}><div style={{...S.modal,maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}><div style={S.modalHandle}/><div style={S.modalName}>Add Customer</div><label style={S.formLabel}>Full Name *</label><input style={S.formInput} placeholder="Full name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/><label style={S.formLabel}>Phone</label><input style={S.formInput} type="tel" placeholder="10-digit mobile" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/><label style={S.formLabel}>Address / Area</label><input style={S.formInput} placeholder="e.g. Govindapuram" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/><label style={S.formLabel}>Milk Brand</label><select style={S.formInput} value={form.brand_id} onChange={e=>setForm(p=>({...p,brand_id:e.target.value}))}><option value="">Select brand...</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name} — ₹{b.rate}/L</option>)}</select><div style={{display:"flex",gap:8}}><div style={{flex:1}}><label style={S.formLabel}>Daily Qty (L)</label><input style={S.formInput} type="text" inputMode="decimal" placeholder="e.g. 1.5" value={form.default_qty} onChange={e=>setForm(p=>({...p,default_qty:e.target.value}))}/></div><div style={{flex:1}}><label style={S.formLabel}>Custom Rate ₹/L</label><input style={S.formInput} type="text" inputMode="decimal" placeholder="Leave blank=brand rate" value={form.custom_rate} onChange={e=>setForm(p=>({...p,custom_rate:e.target.value}))}/></div></div><div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"12px 14px",marginBottom:12}}><div style={{fontWeight:500,fontSize:13,marginBottom:4}}>💰 Opening Balance</div><div style={{fontSize:12,color:"#856404",marginBottom:8}}>Amount owed before MilkFlow. Leave 0 if fresh start.</div><input style={{...S.formInput,marginBottom:0}} type="text" inputMode="decimal" placeholder="0" value={form.outstanding} onChange={e=>setForm(p=>({...p,outstanding:e.target.value}))}/></div><div style={S.modalActions}><button style={S.btnCancel} onClick={()=>setShowAdd(false)}>Cancel</button><button style={S.btnSave} onClick={doAdd}>Add Customer</button></div></div></div>)}
    {showImport&&<ExcelImportModal brands={brands} onClose={()=>setShowImport(false)} onDone={()=>{setShowImport(false);load();}}/>}
    {deleteTarget&&<DeleteCustomerModal customer={deleteTarget} onClose={()=>setDeleteTarget(null)} onDone={()=>{setDeleteTarget(null);load();}}/>}
  </div>);
}

function ExcelImportModal({brands,onClose,onDone}) {
  const [step,setStep]=useState("upload"); const [rows,setRows]=useState([]); const [errors,setErrors]=useState([]); const [progress,setProgress]=useState(0); const [summary,setSummary]=useState(null);
  const loadXLSX=async()=>{if(window.XLSX)return window.XLSX;await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});return window.XLSX;};
  const parseFile=async(file)=>{const XLSX=await loadXLSX();const data=await file.arrayBuffer();const wb=XLSX.read(data);const ws=wb.Sheets[wb.SheetNames[0]];const raw=XLSX.utils.sheet_to_json(ws,{defval:""});const parsed=[];const errs=[];raw.forEach((row,i)=>{const name=String(row["Name"]||row["name"]||"").trim();if(!name){errs.push(`Row ${i+2}: Name empty`);return;}const phone=String(row["Phone"]||row["phone"]||"").replace(/\D/g,"");const address=String(row["Address"]||row["Area"]||row["area"]||"").trim();const qty=parseFloat(row["Daily Qty (L)"]||row["Qty"]||1);const rate=parseFloat(row["Custom Rate"]||row["Rate"]||0)||null;const ob=parseFloat(row["Opening Balance"]||row["Outstanding"]||0);const brandName=String(row["Brand"]||row["brand"]||"").trim();const brand=brands.find(b=>b.name.toLowerCase()===brandName.toLowerCase());parsed.push({name,phone,address,brand_id:brand?.id||null,default_qty:isNaN(qty)?1:qty,custom_rate:rate,outstanding:isNaN(ob)?0:ob});});setRows(parsed);setErrors(errs);setStep("preview");};
  const runImport=async()=>{setStep("importing");let success=0,failed=0;for(let i=0;i<rows.length;i++){setProgress(i+1);try{await addCustomer(rows[i]);success++;}catch{failed++;}await new Promise(r=>setTimeout(r,150));}setSummary({success,failed,total:rows.length});setStep("done");};
  const downloadTemplate=async()=>{const XLSX=await loadXLSX();const sample=[{Name:"Rajesh Kumar",Phone:"9876543210",Address:"Govindapuram",Brand:"Amul Full Cream","Daily Qty (L)":1.5,"Custom Rate":"","Opening Balance":0}];const ws=XLSX.utils.json_to_sheet(sample);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Customers");XLSX.writeFile(wb,"MilkFlow_Import_Template.xlsx");};
  return(<div style={{...S.modalBg,alignItems:"flex-start",overflowY:"auto"}} onClick={onClose}><div style={{...S.modal,borderRadius:0,minHeight:"100vh",paddingBottom:40}} onClick={e=>e.stopPropagation()}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}><button style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}} onClick={onClose}>←</button><div style={{fontWeight:600,fontSize:16}}>📥 Import Customers</div></div>
    {step==="upload"&&<div><button style={{...S.btnCancel,width:"100%",marginBottom:14}} onClick={downloadTemplate}>📄 Download Template</button><div style={{background:"#e8f5ee",borderRadius:10,padding:12,marginBottom:14,fontSize:13,color:"#1a6b3c"}}>Columns: Name, Phone, Address, Brand, Daily Qty (L), Custom Rate, Opening Balance</div><label style={{display:"block",border:"2px dashed #1a6b3c",borderRadius:12,padding:"32px 20px",textAlign:"center",cursor:"pointer"}}><div style={{fontSize:40,marginBottom:8}}>📊</div><div style={{fontSize:15,fontWeight:500,color:"#1a6b3c"}}>Tap to select Excel file</div><input type="file" accept=".xlsx,.xls" style={{display:"none"}} onChange={e=>{if(e.target.files[0])parseFile(e.target.files[0]);}}/></label></div>}
    {step==="preview"&&<div><div style={{background:errors.length>0?"#fff3cd":"#e8f5ee",borderRadius:10,padding:14,marginBottom:14}}><div style={{fontWeight:600,color:errors.length>0?"#856404":"#1a6b3c"}}>{errors.length>0?`⚠️ ${rows.length} found, ${errors.length} warnings`:`✅ ${rows.length} customers ready`}</div></div>{errors.map((e,i)=><div key={i} style={{fontSize:12,color:"#c62828",marginBottom:3}}>• {e}</div>)}{rows.slice(0,5).map((r,i)=><div key={i} style={{...S.listCard,padding:"10px 12px"}}><Avatar name={r.name} size={36}/><div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{r.name}</div><div style={{fontSize:12,color:"#888"}}>{r.phone} • {r.address} • {r.default_qty}L</div></div>{r.outstanding>0&&<div style={{fontSize:12,color:"#c62828"}}>{fmtCurrency(r.outstanding)}</div>}</div>)}{rows.length>5&&<div style={{textAlign:"center",fontSize:13,color:"#888",padding:8}}>...and {rows.length-5} more</div>}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}><button style={S.btnCancel} onClick={()=>setStep("upload")}>← Back</button><button style={S.btnSave} onClick={runImport} disabled={rows.length===0}>Import {rows.length}</button></div></div>}
    {step==="importing"&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:48,marginBottom:16}}>⏳</div><div style={{fontSize:18,fontWeight:600,color:"#1a6b3c",marginBottom:8}}>Importing...</div><div style={{fontSize:14,color:"#888",marginBottom:16}}>{progress} of {rows.length}</div><div style={{background:"#eee",borderRadius:8,height:10}}><div style={{background:"#1a6b3c",height:"100%",borderRadius:8,width:`${(progress/rows.length)*100}%`}}/></div></div>}
    {step==="done"&&summary&&<div style={{textAlign:"center",padding:"32px 20px"}}><div style={{fontSize:64,marginBottom:12}}>🎉</div><div style={{fontSize:22,fontWeight:700,color:"#1a6b3c",marginBottom:12}}>Import Complete!</div><div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:20}}><div style={S.statBox}><div style={S.statBoxNum}>{summary.success}</div><div style={S.statBoxLabel}>Imported</div></div>{summary.failed>0&&<div style={S.statBox}><div style={{...S.statBoxNum,color:"#c62828"}}>{summary.failed}</div><div style={S.statBoxLabel}>Failed</div></div>}</div><button style={{...S.btnSave,padding:"14px 40px",fontSize:16}} onClick={onDone}>✅ Done</button></div>}
  </div></div>);
}

function DeleteCustomerModal({customer,onClose,onDone}) {
  const [type,setType]=useState("soft"); const [step,setStep]=useState("confirm"); const [pin,setPin]=useState(""); const [err,setErr]=useState(""); const [doing,setDoing]=useState(false);
  const doDelete=async()=>{if(pin!==OWNER_PIN){setErr("❌ Wrong PIN");setPin("");return;}setDoing(true);try{if(type==="soft")await deactivateCustomer(customer.id);else await deleteCustomer(customer.id);onDone();}catch(e){alert("Error: "+e.message);}setDoing(false);};
  const pressPin=(d)=>{if(pin.length>=4)return;const next=pin+d;setPin(next);setErr("");if(next.length===4)setTimeout(()=>doDelete(),150);};
  return(<div style={S.modalBg} onClick={onClose}><div style={S.modal} onClick={e=>e.stopPropagation()}>
    <div style={S.modalHandle}/><div style={S.modalName}>Remove Customer</div><div style={S.modalMeta}>{customer.name} • {customer.code}</div>
    {step==="confirm"&&<>{[["soft","😴","Deactivate (Recommended)","History kept, reactivate anytime","#1a6b3c"],["hard","🗑️","Permanent Delete","Only for test/duplicate entries","#c62828"]].map(([v,icon,label,desc,color])=>(<div key={v} style={{border:`2px solid ${type===v?color:"#eee"}`,borderRadius:12,padding:14,marginBottom:10,cursor:"pointer",background:type===v?color+"11":"white"}} onClick={()=>setType(v)}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:22}}>{icon}</span><div><div style={{fontWeight:600,fontSize:14,color}}>{label}</div><div style={{fontSize:12,color:"#888"}}>{desc}</div></div></div></div>))}<div style={S.modalActions}><button style={S.btnCancel} onClick={onClose}>Cancel</button><button style={{...S.btnSave,background:type==="hard"?"#c62828":"#1a6b3c"}} onClick={()=>setStep("pin")}>Continue →</button></div></>}
    {step==="pin"&&<><div style={{background:"#fff3cd",borderRadius:10,padding:12,marginBottom:14,fontSize:13,color:"#856404"}}>Enter Owner PIN to confirm</div><div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:14}}>{[0,1,2,3].map(i=><div key={i} style={{width:18,height:18,borderRadius:"50%",border:"2px solid #1a6b3c",background:i<pin.length?"#1a6b3c":"white"}}/>)}</div>{err&&<div style={{color:"#c62828",fontSize:13,textAlign:"center",marginBottom:8}}>{err}</div>}<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:240,margin:"0 auto"}}>{[1,2,3,4,5,6,7,8,9].map(n=><button key={n} style={S.pinBtn} onClick={()=>pressPin(String(n))}>{n}</button>)}<div/><button style={S.pinBtn} onClick={()=>pressPin("0")}>0</button><button style={S.pinBtn} onClick={()=>setPin(p=>p.slice(0,-1))}>⌫</button></div>{doing&&<div style={{textAlign:"center",marginTop:12,color:"#888"}}>Processing...</div>}<button style={{...S.btnCancel,width:"100%",marginTop:14}} onClick={()=>{setStep("confirm");setPin("");setErr("");}}>← Back</button></>}
  </div></div>);
}

function DailyRecords() {
  const [date,setDate]=useState(nowDate()); const [entries,setEntries]=useState([]); const [loading,setLoading]=useState(false);
  useEffect(()=>{load();},[date]);
  const load=async()=>{setLoading(true);try{const d=await db("daily_entries","GET",null,`?entry_date=eq.${date}&select=id,customer_id,quantity,submitted_by,customers(name,code,address)`);setEntries(d||[]);}catch{setEntries([]);}setLoading(false);};
  const total=entries.reduce((s,e)=>s+(parseFloat(e.quantity)||0),0);
  return(<div style={{padding:16}}><div style={S.sectionTitle}>📋 Daily Records</div><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...S.formInput,marginBottom:12}}/><div style={S.statsGrid}><StatCard label="Entries" value={entries.length} icon="📝" color="#1a6b3c"/><StatCard label="Total Litres" value={total.toFixed(1)+"L"} icon="🥛" color="#1565C0"/></div>{loading?<Loader/>:entries.length===0?<EmptyState icon="📋" message="No entries for this date"/>:entries.map((e,i)=>(<div key={i} style={S.listCard}><Avatar name={e.customers?.name||""} size={36}/><div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{e.customers?.name||"—"}</div><div style={{fontSize:12,color:"#888"}}>{e.customers?.code} • {e.customers?.address}</div></div><div style={{fontWeight:600,color:parseFloat(e.quantity)===0?"#c62828":"#1a6b3c",fontSize:16}}>{parseFloat(e.quantity)===0?"🚫":e.quantity+"L"}</div></div>))}</div>);
}

function BillingSection() {
  const now=new Date(); const [month,setMonth]=useState(now.getMonth()+1); const [year,setYear]=useState(now.getFullYear());
  const [bills,setBills]=useState([]); const [loading,setLoading]=useState(false); const [generating,setGenerating]=useState(false); const [previewBill,setPreviewBill]=useState(null); const [sendingAll,setSendingAll]=useState(false); const [sendProgress,setSendProgress]=useState(0);
  useEffect(()=>{loadBills();},[month,year]);
  const loadBills=async()=>{setLoading(true);try{const d=await getBills(month,year);setBills(d||[]);}catch{setBills([]);}setLoading(false);};
  const generateBills=async()=>{
    setGenerating(true);
    try{
      const customers=await getCustomers();
      const startDate=`${year}-${String(month).padStart(2,"0")}-01`;
      const endDate=new Date(year,month,0).toISOString().split("T")[0];
      const entries=await db("daily_entries","GET",null,`?entry_date=gte.${startDate}&entry_date=lte.${endDate}&select=customer_id,quantity,rate,amount`);
      const entryMap={};(entries||[]).forEach(e=>{if(!entryMap[e.customer_id])entryMap[e.customer_id]={litres:0,amount:0};entryMap[e.customer_id].litres+=parseFloat(e.quantity)||0;entryMap[e.customer_id].amount+=parseFloat(e.amount)||0;});
      for(const cust of(customers||[])){const data=entryMap[cust.id]||{litres:0,amount:0};const outstanding=parseFloat(cust.outstanding)||0;const total=data.amount+outstanding;const billNum=`BILL-${year}${String(month).padStart(2,"0")}-${cust.code}`;const existing=await db("bills","GET",null,`?customer_id=eq.${cust.id}&month=eq.${month}&year=eq.${year}&limit=1`);if(existing&&existing.length>0){await db("bills","PATCH",{total_litres:data.litres,month_amount:data.amount,outstanding,total_amount:total},`?id=eq.${existing[0].id}`);}else{await db("bills","POST",{bill_number:billNum,customer_id:cust.id,month,year,period_from:startDate,period_to:endDate,total_litres:data.litres,month_amount:data.amount,outstanding,total_amount:total,status:"pending",locked:false});}}
      loadBills();alert(`✅ Bills generated for ${monthLabel(month,year)}!`);
    }catch(e){alert("Error: "+e.message);}
    setGenerating(false);
  };
  const sendBillWA=(bill)=>{const cust=bill.customers;const phone=(cust?.phone||"").replace(/\D/g,"");const billUrl=`${window.location.origin}/bill/${cust?.code}`;const msg=encodeURIComponent(`🥛 *Saikrishna Milk Supply*\nNamaste ${cust?.name?.split(" ")[0]||""} ji 🙏\n\nYour ${monthLabel(month,year)} milk bill is ready!\n\n📋 Total Litres: ${parseFloat(bill.total_litres||0).toFixed(1)}L\n${parseFloat(bill.outstanding||0)>0?`⚠️ Previous Outstanding: ${fmtCurrency(bill.outstanding)}\n`:""}💰 *Total Due: ${fmtCurrency(bill.total_amount)}*\n\n👉 View bill: ${billUrl}\n\nAfter paying, tap "I Have Paid" on portal and share screenshot here ✅\n\nUPI: ${UPI_ID}\n\nThank you! 🙏`);window.open(`https://wa.me/91${phone}?text=${msg}`,"_blank");};
  const sendAll=async()=>{const pending=bills.filter(b=>b.status!=="paid");if(pending.length===0){alert("All bills paid!");return;}if(!window.confirm(`Send bills to ${pending.length} customers?`))return;setSendingAll(true);for(let i=0;i<pending.length;i++){setSendProgress(i+1);sendBillWA(pending[i]);await new Promise(r=>setTimeout(r,2500));}setSendingAll(false);setSendProgress(0);};
  const totalAmount=bills.reduce((s,b)=>s+(parseFloat(b.total_amount)||0),0);const paidCount=bills.filter(b=>b.status==="paid").length;
  return(<div style={{padding:16}}>
    <div style={S.sectionTitle}>🧾 Month-End Billing</div>
    <div style={{display:"flex",gap:8,marginBottom:12}}>
      <select style={{...S.formInput,flex:1,marginBottom:0}} value={month} onChange={e=>setMonth(parseInt(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2024,i,1).toLocaleDateString("en-IN",{month:"long"})}</option>)}</select>
      <select style={{...S.formInput,flex:0.6,marginBottom:0}} value={year} onChange={e=>setYear(parseInt(e.target.value))}>{[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select>
      <button style={{...S.btnPrimary,whiteSpace:"nowrap"}} onClick={generateBills} disabled={generating}>{generating?"⏳...":"⚡ Generate"}</button>
    </div>
    <div style={S.statsGrid}><StatCard label="Total Bills" value={bills.length} icon="🧾" color="#1565C0"/><StatCard label="Total Amount" value={fmtCurrency(totalAmount)} icon="💰" color="#1a6b3c"/><StatCard label="Paid" value={paidCount} icon="✅" color="#2E7D32"/><StatCard label="Pending" value={bills.length-paidCount} icon="⏳" color="#c62828"/></div>
    {bills.length-paidCount>0&&<button style={{...S.btnPrimary,width:"100%",padding:13,marginBottom:12,fontSize:14}} onClick={sendAll} disabled={sendingAll}>{sendingAll?`📤 Sending ${sendProgress}/${bills.length-paidCount}...`:`📤 Send All ${bills.length-paidCount} Bills via WhatsApp`}</button>}
    {loading?<Loader/>:bills.length===0?<EmptyState icon="🧾" message="No bills yet. Click Generate."/>:bills.map((b,i)=>(<div key={i} style={S.listCard}><Avatar name={b.customers?.name||""} size={40}/><div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{b.customers?.name}</div><div style={{fontSize:12,color:"#888"}}>{b.customers?.code} • {parseFloat(b.total_litres||0).toFixed(1)}L</div>{parseFloat(b.outstanding||0)>0&&<div style={{fontSize:11,color:"#c62828"}}>+{fmtCurrency(b.outstanding)} outstanding</div>}</div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><div style={{fontWeight:600,fontSize:15}}>{fmtCurrency(b.total_amount)}</div><div style={{...S.statusBadge,...(b.status==="paid"?S.badgePaid:S.badgePending)}}>{b.status==="paid"?"✅ Paid":"⏳ Pending"}</div><div style={{display:"flex",gap:4}}><button style={{fontSize:11,padding:"3px 8px",background:"#e8f5ee",border:"0.5px solid #b8dfc8",borderRadius:8,color:"#1a6b3c",cursor:"pointer"}} onClick={()=>setPreviewBill(b)}>👁 View</button>{b.status!=="paid"&&<button style={{fontSize:11,padding:"3px 8px",background:"#e7f3ff",border:"0.5px solid #b3d4f5",borderRadius:8,color:"#1565C0",cursor:"pointer"}} onClick={()=>sendBillWA(b)}>📤 Send</button>}</div></div></div>))}
    {previewBill&&(<div style={{...S.modalBg,alignItems:"flex-start",overflowY:"auto"}} onClick={()=>setPreviewBill(null)}><div style={{...S.modal,borderRadius:0,minHeight:"100vh",paddingBottom:40}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><button style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}} onClick={()=>setPreviewBill(null)}>←</button><div style={{fontWeight:600,fontSize:16}}>Bill Preview</div><button style={{marginLeft:"auto",...S.btnPrimary,padding:"8px 14px",fontSize:13}} onClick={()=>sendBillWA(previewBill)}>📤 Send</button></div><BillView bill={previewBill} customer={previewBill.customers} month={month} year={year}/></div></div>)}
  </div>);
}

function BillView({bill,customer,month,year}) {
  const upiLink=`upi://pay?pa=${UPI_ID}&pn=Saikrishna+Milk+Supply&am=${bill?.total_amount||0}&cu=INR&tn=MF-${customer?.code||""}`;
  return(<div style={{maxWidth:480,margin:"0 auto"}}>
    <div style={{background:"linear-gradient(135deg,#0a3d1f,#1a6b3c)",borderRadius:14,padding:"20px 20px 16px",marginBottom:12,color:"white"}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}><img src={logo_app} style={{width:56,height:56,borderRadius:10,objectFit:"contain",background:"white",padding:3,flexShrink:0}} alt="logo"/><div><div style={{fontSize:18,fontWeight:700}}>Saikrishna Milk Supply</div><div style={{fontSize:11,opacity:0.8}}>Pure Milk • Pure Love • Pure Life</div><div style={{fontSize:11,opacity:0.85}}>UPI: {UPI_ID}</div></div></div>
      <div style={{display:"flex",justifyContent:"space-between",background:"rgba(255,255,255,0.1)",borderRadius:8,padding:"10px 14px"}}><div><div style={{fontSize:11,opacity:0.75}}>Customer</div><div style={{fontWeight:600,fontSize:14}}>{customer?.name}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:11,opacity:0.75}}>Code</div><div style={{fontWeight:600,fontSize:14}}>{customer?.code}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:11,opacity:0.75}}>Month</div><div style={{fontWeight:600,fontSize:14}}>{monthLabel(month,year)}</div></div></div>
    </div>
    <div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:16,marginBottom:12}}>
      {[["Total Litres",parseFloat(bill?.total_litres||0).toFixed(1)+"L"],["Milk Charges",fmtCurrency(bill?.month_amount)],...(parseFloat(bill?.outstanding||0)>0?[["Previous Outstanding","+"+fmtCurrency(bill?.outstanding)]]:[])].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:8,color:"#555"}}><span>{k}</span><span style={{fontWeight:500}}>{v}</span></div>))}
      <div style={{borderTop:"2px solid #1a6b3c",marginTop:10,paddingTop:10,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:17}}>TOTAL DUE</span><span style={{fontWeight:700,fontSize:20,color:"#c62828"}}>{fmtCurrency(bill?.total_amount)}</span></div>
    </div>
    <a href={upiLink} style={{display:"block",background:"#1a6b3c",color:"white",textAlign:"center",padding:15,borderRadius:12,fontSize:16,fontWeight:600,textDecoration:"none",marginBottom:10}}>💳 Pay {fmtCurrency(bill?.total_amount)} — GPay / PhonePe</a>
    <div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:12,fontSize:13,color:"#856404",textAlign:"center"}}>⚠️ After paying, tap <strong>"I Have Paid"</strong> on portal and share screenshot on WhatsApp</div>
  </div>);
}

function BillPage({customerCode}) {
  const [bill,setBill]=useState(null); const [customer,setCustomer]=useState(null); const [loading,setLoading]=useState(true);
  const now=new Date(); const month=now.getMonth()+1; const year=now.getFullYear();
  useEffect(()=>{load();},[]);
  const load=async()=>{setLoading(true);try{const custs=await db("customers","GET",null,`?code=eq.${customerCode}&limit=1`);const cust=custs?.[0];if(!cust){setLoading(false);return;}setCustomer(cust);const bills=await db("bills","GET",null,`?customer_id=eq.${cust.id}&month=eq.${month}&year=eq.${year}&limit=1`);setBill(bills?.[0]||null);}catch(e){console.error(e);}setLoading(false);};
  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:12}}><img src={logo_app} style={{width:72,height:72,borderRadius:16,objectFit:"contain"}} alt="loading"/><div style={{fontSize:14,color:"#888"}}>Loading bill...</div></div>;
  if(!customer)return<EmptyState icon="❌" message="Customer not found"/>;
  if(!bill)return<EmptyState icon="🧾" message="No bill generated yet for this month"/>;
  return<div style={{background:"#f8f9fa",minHeight:"100vh",padding:"16px 12px"}}><BillView bill={bill} customer={customer} month={month} year={year}/></div>;
}

function PaymentTracking() {
  const [payments,setPayments]=useState([]); const [customers,setCustomers]=useState([]); const [filter,setFilter]=useState("pending_confirmation"); const [loading,setLoading]=useState(true);
  const [showCash,setShowCash]=useState(false); const [showOCR,setShowOCR]=useState(false);
  const [cashForm,setCashForm]=useState({customer_id:"",amount:"",note:""});
  const [ocrImage,setOcrImage]=useState(null); const [ocrResult,setOcrResult]=useState(null); const [ocrProcessing,setOcrProcessing]=useState(false); const [ocrCustomer,setOcrCustomer]=useState(""); const [ocrAmount,setOcrAmount]=useState("");
  useEffect(()=>{loadAll();},[]);
  const loadAll=async()=>{setLoading(true);try{const [p,c]=await Promise.all([getPayments(),getCustomers()]);setPayments(p||[]);setCustomers(c||[]);}catch{setPayments([]);setCustomers([]);}setLoading(false);};
  const doConfirm=async(p)=>{try{await confirmPayment(p.id);loadAll();}catch(e){alert("Error: "+e.message);}};
  const doReject=async(p)=>{if(!window.confirm("Reject this payment?"))return;try{await rejectPayment(p.id);loadAll();}catch(e){alert("Error: "+e.message);}};
  const doMarkCash=async()=>{if(!cashForm.customer_id||!cashForm.amount){alert("Select customer and enter amount");return;}try{await addPayment({customer_id:cashForm.customer_id,amount:parseFloat(cashForm.amount),payment_method:"cash",status:"confirmed",notes:cashForm.note||"Cash payment"});setCashForm({customer_id:"",amount:"",note:""});setShowCash(false);loadAll();alert("✅ Cash payment recorded!");}catch(e){alert("Error: "+e.message);}};
  const processScreenshot=async(file)=>{
    setOcrProcessing(true);const reader=new FileReader();reader.onload=e=>setOcrImage(e.target.result);reader.readAsDataURL(file);
    try{if(!window.Tesseract)await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});const result=await window.Tesseract.recognize(file,"eng",{logger:()=>{}});const text=result.data.text;const amtMatch=text.match(/(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);const amount=amtMatch?parseFloat(amtMatch[1].replace(/,/g,"")):null;const isSuccess=/success|paid|complete|debit/i.test(text);const txnMatch=text.match(/(?:upi ref|txn|transaction|ref)\s*[:#]?\s*([A-Z0-9]{8,20})/i);setOcrResult({amount,isSuccess,txnId:txnMatch?.[1]||null});if(amount)setOcrAmount(String(amount));}
    catch{setOcrResult({error:true});}
    setOcrProcessing(false);
  };
  const saveOcrPayment=async()=>{if(!ocrCustomer){alert("Select customer");return;}const amt=parseFloat(ocrAmount);if(!amt){alert("Enter amount");return;}try{await addPayment({customer_id:ocrCustomer,amount:amt,payment_method:"upi",status:"pending_confirmation",transaction_ref:ocrResult?.txnId||null,notes:`OCR screenshot. TxnID: ${ocrResult?.txnId||"not found"}`});setShowOCR(false);setOcrImage(null);setOcrResult(null);setOcrCustomer("");setOcrAmount("");loadAll();alert("✅ Added to review queue!");}catch(e){alert("Error: "+e.message);}};
  const pendingCount=payments.filter(p=>p.status==="pending_confirmation").length;
  const filtered=payments.filter(p=>filter==="all"||p.status===filter);
  return(<div style={{padding:16}}>
    <div style={S.sectionTitle}>💳 Payment Tracking</div>
    <div style={S.statsGrid}><StatCard label="Awaiting Review" value={pendingCount} icon="⏳" color={pendingCount>0?"#c62828":"#1a6b3c"}/><StatCard label="Total Records" value={payments.length} icon="📋" color="#1565C0"/></div>
    <div style={{display:"flex",gap:8,marginBottom:14}}><button style={{flex:1,...S.btnPrimary,fontSize:13}} onClick={()=>setShowOCR(true)}>📸 Upload Screenshot</button><button style={{flex:1,background:"#f0f4ff",border:"0.5px solid #c5d5f5",borderRadius:10,padding:"10px 8px",fontSize:13,color:"#1565C0",cursor:"pointer"}} onClick={()=>setShowCash(true)}>💵 Mark Cash Paid</button></div>
    {pendingCount>0&&<div style={S.alertBox}><span style={{fontSize:20}}>⚠️</span><div><div style={{fontWeight:500,fontSize:14}}>{pendingCount} payment{pendingCount>1?"s":""} waiting</div><div style={{fontSize:12,color:"#856404"}}>Check GPay/PhonePe and confirm below</div></div></div>}
    <div style={S.filterRow}>{[["pending_confirmation",`⏳ Review (${pendingCount})`],["confirmed","✅ Confirmed"],["rejected","❌ Rejected"],["all","All"]].map(([f,l])=>(<button key={f} style={{...S.filterChip,...(filter===f?S.filterChipActive:{})}} onClick={()=>setFilter(f)}>{l}</button>))}</div>
    {loading?<Loader/>:filtered.length===0?<EmptyState icon="💳" message={filter==="pending_confirmation"?"No payments waiting for review":"No payments found"}/>:filtered.map((p,i)=>(<div key={i} style={{...S.listCard,flexDirection:"column",gap:10}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{fontSize:28}}>{p.payment_method==="cash"?"💵":"📱"}</div><div style={{flex:1}}><div style={{fontWeight:500,fontSize:15}}>{p.customers?.name||"—"}</div><div style={{fontSize:12,color:"#888"}}>{p.payment_method?.toUpperCase()} • {fmtDate(p.payment_date)}{p.transaction_ref?` • Ref: ${p.transaction_ref}`:""}</div>{p.notes&&<div style={{fontSize:11,color:"#888",marginTop:2}}>{p.notes}</div>}</div><div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:17,color:"#1a6b3c"}}>{fmtCurrency(p.amount)}</div><div style={{...S.statusBadge,...(p.status==="confirmed"?S.badgePaid:p.status==="rejected"?S.badgeRejected:S.badgePending)}}>{p.status==="confirmed"?"✅ Confirmed":p.status==="rejected"?"❌ Rejected":"⏳ Pending"}</div></div></div>{p.status==="pending_confirmation"&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><button style={{background:"#fdf2f3",border:"0.5px solid #f5c6cb",borderRadius:10,padding:"10px 0",fontSize:13,color:"#721c24",cursor:"pointer",fontWeight:500}} onClick={()=>doReject(p)}>❌ Reject</button><button style={{background:"#1a6b3c",border:"none",borderRadius:10,padding:"10px 0",fontSize:13,color:"white",cursor:"pointer",fontWeight:500}} onClick={()=>doConfirm(p)}>✅ Confirm Paid</button></div>)}</div>))}
    {showCash&&(<div style={S.modalBg} onClick={()=>setShowCash(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalHandle}/><div style={S.modalName}>💵 Mark Cash Payment</div><label style={S.formLabel}>Customer *</label><select style={S.formInput} value={cashForm.customer_id} onChange={e=>setCashForm(p=>({...p,customer_id:e.target.value}))}><option value="">Select customer...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select><label style={S.formLabel}>Amount (₹) *</label><input type="text" inputMode="decimal" style={S.formInput} placeholder="e.g. 2040" value={cashForm.amount} onChange={e=>setCashForm(p=>({...p,amount:e.target.value}))}/><label style={S.formLabel}>Note (optional)</label><input style={S.formInput} placeholder="e.g. Collected at door" value={cashForm.note} onChange={e=>setCashForm(p=>({...p,note:e.target.value}))}/><div style={S.modalActions}><button style={S.btnCancel} onClick={()=>setShowCash(false)}>Cancel</button><button style={S.btnSave} onClick={doMarkCash}>✅ Mark Paid</button></div></div></div>)}
    {showOCR&&(<div style={{...S.modalBg,alignItems:"flex-start",overflowY:"auto"}} onClick={()=>{setShowOCR(false);setOcrImage(null);setOcrResult(null);}}><div style={{...S.modal,borderRadius:0,minHeight:"100vh",paddingBottom:40}} onClick={e=>e.stopPropagation()}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}><button style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}} onClick={()=>{setShowOCR(false);setOcrImage(null);setOcrResult(null);}}>←</button><div style={{fontWeight:600,fontSize:16}}>📸 Screenshot OCR</div></div><div style={{background:"#e8f5ee",borderRadius:10,padding:12,marginBottom:14,fontSize:13,color:"#1a6b3c"}}>Customer forwarded payment screenshot on WhatsApp? Upload it here.</div>{!ocrImage&&(<label style={{display:"block",border:"2px dashed #ddd",borderRadius:12,padding:"32px 20px",textAlign:"center",cursor:"pointer",marginBottom:14}}><div style={{fontSize:40,marginBottom:8}}>📷</div><div style={{fontSize:15,fontWeight:500,color:"#555"}}>Tap to upload screenshot</div><input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])processScreenshot(e.target.files[0]);}}/></label>)}{ocrImage&&<img src={ocrImage} alt="screenshot" style={{width:"100%",borderRadius:10,marginBottom:14,maxHeight:250,objectFit:"contain",background:"#f8f9fa"}}/>}{ocrProcessing&&<div style={{textAlign:"center",padding:20,color:"#856404"}}>🔍 Reading screenshot...</div>}{ocrResult&&!ocrProcessing&&(<div><div style={{background:ocrResult.isSuccess?"#e8f5ee":"#fff3cd",borderRadius:10,padding:12,marginBottom:14}}><div style={{fontWeight:500,color:ocrResult.isSuccess?"#1a6b3c":"#856404"}}>{ocrResult.error?"⚠️ Could not read — enter manually":ocrResult.isSuccess?"✅ Payment looks genuine":"⚠️ Please verify carefully"}</div>{ocrResult.amount&&<div style={{fontSize:13,marginTop:4}}>Amount: <strong>{fmtCurrency(ocrResult.amount)}</strong></div>}{ocrResult.txnId&&<div style={{fontSize:13}}>TxnID: <strong>{ocrResult.txnId}</strong></div>}</div><label style={S.formLabel}>Customer *</label><select style={S.formInput} value={ocrCustomer} onChange={e=>setOcrCustomer(e.target.value)}><option value="">Select customer...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select><label style={S.formLabel}>Amount (₹) *</label><input type="text" inputMode="decimal" style={S.formInput} placeholder="Enter amount" value={ocrAmount} onChange={e=>setOcrAmount(e.target.value)}/><button style={{...S.btnSave,width:"100%",padding:14}} onClick={saveOcrPayment}>✅ Add to Review Queue</button></div>)}</div></div>)}
  </div>);
}

function ReportsSection() {
  const [sub,setSub]=useState("overview");
  return(<div style={{padding:16}}><div style={S.sectionTitle}>📊 Reports</div><div style={{...S.filterRow,flexWrap:"wrap",gap:6}}>{[["overview","📈 Overview"],["procurement","🥛 Procurement"],["inactive","⚠️ Inactive"],["reminders","💳 Reminders"],["brands","🏷 Brands"],["export","📤 Export"]].map(([id,label])=>(<button key={id} style={{...S.filterChip,...(sub===id?S.filterChipActive:{})}} onClick={()=>setSub(id)}>{label}</button>))}</div>{sub==="overview"&&<MonthlyOverview/>}{sub==="procurement"&&<ProcurementEstimate/>}{sub==="inactive"&&<InactiveCustomers/>}{sub==="reminders"&&<PaymentReminders/>}{sub==="brands"&&<BrandManagement/>}{sub==="export"&&<ExportSection/>}</div>);
}

function MonthlyOverview() {
  const now=new Date(); const [month,setMonth]=useState(now.getMonth()+1); const [year,setYear]=useState(now.getFullYear()); const [data,setData]=useState(null); const [loading,setLoading]=useState(false);
  useEffect(()=>{load();},[month,year]);
  const load=async()=>{setLoading(true);try{const [bills,payments,customers]=await Promise.all([getBills(month,year),db("payments","GET",null,"?status=eq.confirmed&select=amount"),db("customers","GET",null,"?active=eq.true&select=id")]);const totalBilled=(bills||[]).reduce((s,b)=>s+(parseFloat(b.total_amount)||0),0);const totalPaid=(payments||[]).reduce((s,p)=>s+(parseFloat(p.amount)||0),0);setData({totalBilled,totalPaid,outstanding:totalBilled-totalPaid,paidBills:(bills||[]).filter(b=>b.status==="paid").length,totalBills:(bills||[]).length,customers:(customers||[]).length,collectionRate:totalBilled>0?Math.round((totalPaid/totalBilled)*100):0});}catch{setData(null);}setLoading(false);};
  return(<div style={{marginTop:8}}><div style={{display:"flex",gap:8,marginBottom:14}}><select style={{...S.formInput,flex:1,marginBottom:0}} value={month} onChange={e=>setMonth(parseInt(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2024,i,1).toLocaleDateString("en-IN",{month:"long"})}</option>)}</select><select style={{...S.formInput,flex:0.6,marginBottom:0}} value={year} onChange={e=>setYear(parseInt(e.target.value))}>{[2024,2025,2026,2027].map(y=><option key={y}>{y}</option>)}</select></div>{loading?<Loader/>:!data?<EmptyState icon="📊" message="No data for this period"/>:<><div style={{background:"linear-gradient(135deg,#0a3d1f,#1a6b3c)",borderRadius:14,padding:16,marginBottom:12,color:"white"}}><div style={{fontSize:13,opacity:0.8,marginBottom:4}}>{monthLabel(month,year)}</div><div style={{fontSize:28,fontWeight:700,marginBottom:8}}>{fmtCurrency(data.totalBilled)}</div><div style={{display:"flex",gap:12}}><div><div style={{fontSize:11,opacity:0.7}}>Collected</div><div style={{fontWeight:600}}>{fmtCurrency(data.totalPaid)}</div></div><div><div style={{fontSize:11,opacity:0.7}}>Outstanding</div><div style={{fontWeight:600,color:"#ffcc80"}}>{fmtCurrency(data.outstanding)}</div></div><div><div style={{fontSize:11,opacity:0.7}}>Collection %</div><div style={{fontWeight:600}}>{data.collectionRate}%</div></div></div></div><div style={S.statsGrid}><StatCard label="Total Bills" value={data.totalBills} icon="🧾" color="#1565C0"/><StatCard label="Bills Paid" value={data.paidBills} icon="✅" color="#2E7D32"/><StatCard label="Active Customers" value={data.customers} icon="👥" color="#6a1b9a"/><StatCard label="Collection Rate" value={data.collectionRate+"%"} icon="📊" color={data.collectionRate>=80?"#1a6b3c":"#c62828"}/></div></>}</div>);
}

function ProcurementEstimate() {
  const [customers,setCustomers]=useState([]); const [brands,setBrands]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([getCustomers(),getBrands()]).then(([c,b])=>{setCustomers(c||[]);setBrands(b||[]);setLoading(false);}).catch(()=>setLoading(false));},[]);
  const byBrand={}; customers.forEach(c=>{const b=brands.find(br=>br.id===c.brand_id);const name=b?.name||"Unknown";if(!byBrand[name])byBrand[name]={qty:0,count:0};byBrand[name].qty+=parseFloat(c.default_qty)||0;byBrand[name].count++;});
  const total=customers.reduce((s,c)=>s+(parseFloat(c.default_qty)||0),0);
  if(loading)return<Loader/>; if(customers.length===0)return<EmptyState icon="🥛" message="No customers yet"/>;
  return(<div style={{marginTop:8}}><div style={{background:"#e8f5ee",border:"1px solid #b8dfc8",borderRadius:10,padding:14,marginBottom:14}}><div style={{fontWeight:600,fontSize:15,color:"#1a6b3c"}}>🥛 Tomorrow's Order</div><div style={{fontSize:28,fontWeight:700,color:"#1a6b3c",marginTop:4}}>{total.toFixed(1)} Litres</div></div>{Object.entries(byBrand).map(([name,data])=>(<div key={name} style={S.listCard}><div style={{flex:1}}><div style={{fontWeight:500}}>{name}</div><div style={{fontSize:12,color:"#888"}}>{data.count} customers</div></div><div style={{fontWeight:700,fontSize:18,color:"#1a6b3c"}}>{data.qty.toFixed(1)}L</div></div>))}<button style={{...S.btnPrimary,width:"100%",padding:12,marginTop:8}} onClick={()=>{const lines=Object.entries(byBrand).map(([n,d])=>`• ${n}: ${d.qty.toFixed(1)}L`).join("\n");window.open(`https://wa.me/?text=${encodeURIComponent(`🥛 Tomorrow's Milk Order\n\n${lines}\n\nTotal: ${total.toFixed(1)}L\n\n— Saikrishna Milk Supply`)}`,"_blank");}}>📤 Send Order to Supplier</button></div>);
}

function InactiveCustomers() {
  const [inactive,setInactive]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{load();},[]);
  const load=async()=>{setLoading(true);try{const cutoff=new Date(Date.now()-7*86400000).toISOString().split("T")[0];const [customers,recent]=await Promise.all([getCustomers(),db("daily_entries","GET",null,`?entry_date=gte.${cutoff}&select=customer_id`)]);const activeIds=new Set((recent||[]).map(e=>e.customer_id));setInactive((customers||[]).filter(c=>!activeIds.has(c.id)));}catch{setInactive([]);}setLoading(false);};
  if(loading)return<Loader/>;
  return(<div style={{marginTop:8}}><div style={{background:inactive.length>0?"#fff3cd":"#e8f5ee",border:`1px solid ${inactive.length>0?"#ffc107":"#b8dfc8"}`,borderRadius:10,padding:12,marginBottom:14}}><div style={{fontWeight:500,fontSize:14,color:inactive.length>0?"#856404":"#1a6b3c"}}>{inactive.length>0?`⚠️ ${inactive.length} customers with no delivery in 7+ days`:"✅ All customers active"}</div></div>{inactive.length===0?<EmptyState icon="✅" message="All customers received delivery in last 7 days"/>:inactive.map((c,i)=>(<div key={i} style={S.listCard}><Avatar name={c.name} size={40}/><div style={{flex:1}}><div style={{fontWeight:500}}>{c.name}</div><div style={{fontSize:12,color:"#888"}}>{c.code} • {c.address} • {c.default_qty}L/day</div></div><a href={`https://wa.me/91${(c.phone||"").replace(/\D/g,"")}`} style={{fontSize:12,padding:"6px 10px",background:"#e8f5ee",border:"0.5px solid #b8dfc8",borderRadius:8,color:"#1a6b3c",textDecoration:"none"}}>📞</a></div>))}</div>);
}

function PaymentReminders() {
  const [bills,setBills]=useState([]); const [loading,setLoading]=useState(true);
  const now=new Date(); const month=now.getMonth()+1; const year=now.getFullYear(); const day=now.getDate(); const level=day>=20?3:day>=15?2:day>=10?1:0;
  useEffect(()=>{getBills(month,year).then(d=>{setBills((d||[]).filter(b=>b.status!=="paid"));setLoading(false);}).catch(()=>setLoading(false));},[]);
  const getMsg=(bill)=>{const name=bill.customers?.name?.split(" ")[0]||"ji";const amt=fmtCurrency(bill.total_amount);const url=`${window.location.origin}/bill/${bill.customers?.code}`;if(level===1)return `🙏 Namaste ${name} ji,\n\nGentle reminder — your ${monthLabel(month,year)} milk bill of *${amt}* is due.\n\nView & Pay: ${url}\n\nPlease share screenshot after payment ✅\n\n— Saikrishna Milk Supply`;if(level===2)return `📋 Namaste ${name} ji,\n\nYour milk bill of *${amt}* for ${monthLabel(month,year)} is still pending.\n\nView & Pay: ${url}\n\n— Saikrishna Milk Supply`;return `⚠️ Namaste ${name} ji,\n\nFinal reminder — *${amt}* milk bill is overdue. Will show as OUTSTANDING on next bill.\n\nPay now: ${url}\n\n— Saikrishna Milk Supply`;};
  const sendReminder=(bill)=>{const phone=(bill.customers?.phone||"").replace(/\D/g,"");window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(getMsg(bill))}`,"_blank");};
  const sendAll=async()=>{if(!window.confirm(`Send reminders to ${bills.length} customers?`))return;for(const b of bills){sendReminder(b);await new Promise(r=>setTimeout(r,2500));}};
  if(loading)return<Loader/>;
  return(<div style={{marginTop:8}}><div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:14,marginBottom:14}}><div style={{fontSize:13,color:"#888",marginBottom:8}}>Today is Day {day} of month</div><div style={{display:"flex",gap:4}}>{[1,2,3].map(l=>(<div key={l} style={{flex:1,borderRadius:8,padding:"8px 6px",textAlign:"center",background:l<=level?"#1a6b3c":"#f5f5f5"}}><div style={{fontSize:11,color:l<=level?"white":"#888",fontWeight:500}}>Day {l===1?"10":l===2?"15":"20"}</div><div style={{fontSize:10,color:l<=level?"rgba(255,255,255,0.8)":"#bbb"}}>{l===1?"Gentle":l===2?"Firm":"Final"}</div></div>))}</div></div>{bills.length===0?<EmptyState icon="🎉" message="All customers have paid this month!"/>:<><button style={{...S.btnPrimary,width:"100%",padding:13,fontSize:14,marginBottom:14}} onClick={sendAll} disabled={level===0}>{level===0?"🔒 Reminders start Day 10":`📤 Send reminders to all (${bills.length})`}</button>{bills.map((b,i)=>(<div key={i} style={S.listCard}><Avatar name={b.customers?.name||""} size={40}/><div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{b.customers?.name}</div><div style={{fontSize:12,color:"#888"}}>{fmtCurrency(b.total_amount)}</div></div><button style={{background:"#25D366",border:"none",borderRadius:10,padding:"8px 12px",color:"white",fontSize:12,cursor:"pointer"}} onClick={()=>sendReminder(b)}>📤 Remind</button></div>))}</>}</div>);
}

function BrandManagement() {
  const [brands,setBrands]=useState([]); const [loading,setLoading]=useState(true); const [showAdd,setShowAdd]=useState(false); const [editBrand,setEditBrand]=useState(null); const [form,setForm]=useState({name:"",rate:""}); const [saving,setSaving]=useState(false);
  useEffect(()=>{load();},[]);
  const load=async()=>{setLoading(true);try{setBrands(await getBrands()||[]);}catch{setBrands([]);}setLoading(false);};
  const doSave=async()=>{if(!form.name.trim()||!form.rate){alert("Enter brand name and rate");return;}setSaving(true);try{if(editBrand)await updateBrand(editBrand.id,form.name.trim(),form.rate);else await addBrand(form.name.trim(),form.rate);setShowAdd(false);setEditBrand(null);setForm({name:"",rate:""});load();}catch(e){alert("Error: "+e.message);}setSaving(false);};
  const doDelete=async(b)=>{if(!window.confirm(`Remove "${b.name}"?`))return;try{await deleteBrand(b.id);load();}catch(e){alert("Error: "+e.message);}};
  return(<div style={{marginTop:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontSize:14,color:"#555"}}>{brands.length} brands</div><button style={S.btnPrimary} onClick={()=>{setShowAdd(true);setEditBrand(null);setForm({name:"",rate:""});}}>+ Add Brand</button></div>{loading?<Loader/>:brands.length===0?<EmptyState icon="🥛" message="No brands yet"/>:brands.map((b,i)=>(<div key={b.id} style={S.listCard}><div style={{width:4,height:44,borderRadius:2,background:["#1a6b3c","#1565C0","#6a1b9a","#c62828"][i%4],flexShrink:0}}/><div style={{flex:1}}><div style={{fontWeight:500}}>{b.name}</div><div style={{fontSize:12,color:"#888"}}>₹{b.rate}/litre</div></div><div style={{display:"flex",gap:6}}><button style={{fontSize:12,padding:"5px 10px",background:"#e8f5ee",border:"0.5px solid #b8dfc8",borderRadius:8,color:"#1a6b3c",cursor:"pointer"}} onClick={()=>{setEditBrand(b);setForm({name:b.name,rate:String(b.rate)});setShowAdd(true);}}>✏️ Edit</button><button style={{fontSize:12,padding:"5px 10px",background:"#fdf2f3",border:"0.5px solid #f5c6cb",borderRadius:8,color:"#c62828",cursor:"pointer"}} onClick={()=>doDelete(b)}>🗑</button></div></div>))}{showAdd&&(<div style={S.modalBg} onClick={()=>setShowAdd(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalHandle}/><div style={S.modalName}>{editBrand?"Edit Brand":"Add Brand"}</div><label style={S.formLabel}>Brand Name</label><input style={S.formInput} placeholder="e.g. Jersey Full Cream" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/><label style={S.formLabel}>Rate (₹ per litre)</label><input style={S.formInput} type="text" inputMode="decimal" placeholder="e.g. 68" value={form.rate} onChange={e=>setForm(p=>({...p,rate:e.target.value}))}/><div style={S.modalActions}><button style={S.btnCancel} onClick={()=>setShowAdd(false)}>Cancel</button><button style={S.btnSave} onClick={doSave} disabled={saving}>{saving?"Saving...":"Save Brand"}</button></div></div></div>)}</div>);
}

function ExportSection() {
  const [exporting,setExporting]=useState(null);
  const loadXLSX=async()=>{if(window.XLSX)return window.XLSX;await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});return window.XLSX;};
  const doExport=async(type)=>{setExporting(type);try{const XLSX=await loadXLSX();let rows=[];let sheetName=type;if(type==="customers"){const [c,b]=await Promise.all([getCustomers(),getBrands()]);rows=(c||[]).map(cu=>({Code:cu.code,Name:cu.name,Phone:cu.phone,Address:cu.address,Brand:b.find(br=>br.id===cu.brand_id)?.name||"","Daily Qty":cu.default_qty,"Custom Rate":cu.custom_rate||"",Outstanding:cu.outstanding||0}));sheetName="Customers";}else if(type==="payments"){const p=await getPayments();rows=(p||[]).map(pm=>({Date:pm.payment_date,Customer:pm.customers?.name||"",Code:pm.customers?.code||"",Amount:pm.amount,Method:pm.payment_method,Ref:pm.transaction_ref||"",Status:pm.status}));sheetName="Payments";}const ws=XLSX.utils.json_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,sheetName);XLSX.writeFile(wb,`MilkFlow_${sheetName}_${nowDate()}.xlsx`);}catch(e){alert("Error: "+e.message);}setExporting(null);};
  return(<div style={{marginTop:8}}>{[["customers","👥","Customer List","All customers with rates and balances"],["payments","💳","Payment Records","All payments with status"]].map(([type,icon,label,desc])=>(<div key={type} style={S.listCard}><div style={{fontSize:28}}>{icon}</div><div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{label}</div><div style={{fontSize:12,color:"#888"}}>{desc}</div></div><button style={{...S.btnPrimary,padding:"8px 14px",fontSize:13,background:exporting===type?"#888":"#1a6b3c"}} onClick={()=>doExport(type)} disabled={!!exporting}>{exporting===type?"⏳...":"📥 Export"}</button></div>))}</div>);
}

function OwnerSettings() {
  const [sub,setSub]=useState("balance");
  return(<div style={{padding:16}}><div style={S.sectionTitle}>⚙️ Settings</div><div style={S.filterRow}>{[["balance","⚖️ Balances"],["lock","🔒 Month Lock"],["about","ℹ️ About"]].map(([id,label])=>(<button key={id} style={{...S.filterChip,...(sub===id?S.filterChipActive:{})}} onClick={()=>setSub(id)}>{label}</button>))}</div>{sub==="balance"&&<OpeningBalanceSetup/>}{sub==="lock"&&<MonthLockSection/>}{sub==="about"&&<AboutSection/>}</div>);
}

function OpeningBalanceSetup() {
  const [customers,setCustomers]=useState([]); const [balances,setBalances]=useState({}); const [saving,setSaving]=useState(false); const [done,setDone]=useState(false); const [loading,setLoading]=useState(true);
  useEffect(()=>{getCustomers().then(d=>{setCustomers(d||[]);setLoading(false);}).catch(()=>setLoading(false));},[]);
  const saveAll=async()=>{setSaving(true);try{for(const c of customers){const bal=parseFloat(balances[c.id]!==undefined?balances[c.id]:c.outstanding||0);await updateCustomer(c.id,{outstanding:bal});}setDone(true);}catch(e){alert("Error: "+e.message);}setSaving(false);};
  if(done)return<div style={{textAlign:"center",padding:32}}><div style={{fontSize:56}}>✅</div><div style={{fontSize:20,fontWeight:600,color:"#1a6b3c",marginTop:12}}>Balances Saved!</div></div>;
  const total=Object.values(balances).reduce((s,v)=>s+(parseFloat(v)||0),0);
  return(<div style={{marginTop:8}}><div style={{background:"#e8f5ee",border:"1px solid #b8dfc8",borderRadius:10,padding:12,marginBottom:12,fontSize:13,color:"#2d7a50"}}>Enter how much each customer owed before MilkFlow. Leave blank for 0.</div>{total>0&&<div style={{background:"#fff3cd",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:"#856404"}}>Total to migrate</span><span style={{fontWeight:600,color:"#856404"}}>{fmtCurrency(total)}</span></div>}{loading?<Loader/>:customers.length===0?<EmptyState icon="👥" message="No customers yet"/>:customers.map(c=>(<div key={c.id} style={S.listCard}><Avatar name={c.name} size={40}/><div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{c.name}</div><div style={{fontSize:12,color:"#888"}}>{c.code} • Current OB: {fmtCurrency(c.outstanding||0)}</div></div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:15,color:"#888"}}>₹</span><input type="text" inputMode="decimal" placeholder={String(c.outstanding||0)} value={balances[c.id]!==undefined?balances[c.id]:""} onChange={e=>setBalances(p=>({...p,[c.id]:e.target.value}))} style={{width:88,padding:"8px 10px",border:"0.5px solid #ddd",borderRadius:8,fontSize:15,textAlign:"right",background:"white",color:"#111"}}/></div></div>))}{customers.length>0&&<button style={{...S.btnSave,width:"100%",padding:14,fontSize:15,marginTop:8}} onClick={saveAll} disabled={saving}>{saving?"Saving...":"✅ Save All Balances"}</button>}</div>);
}

function MonthLockSection() {
  const [locked,setLocked]=useState(false); const [lockedMonth,setLockedMonth]=useState(""); const [pin,setPin]=useState(""); const [loading,setLoading]=useState(true);
  const now=new Date(); const current=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  useEffect(()=>{getSetting("locked_month").then(v=>{if(v){setLockedMonth(v);setLocked(v===current);}setLoading(false);}).catch(()=>setLoading(false));},[]);
  const doAction=async()=>{if(pin!==OWNER_PIN){alert("Wrong PIN");setPin("");return;}try{if(locked){await setSetting("locked_month","");setLocked(false);setLockedMonth("");}else{await setSetting("locked_month",current);setLocked(true);setLockedMonth(current);}setPin("");}catch(e){alert("Error: "+e.message);}};
  if(loading)return<Loader/>;
  return(<div style={{marginTop:8}}><div style={{background:locked?"#fdf2f3":"#e8f5ee",border:`1px solid ${locked?"#f5c6cb":"#b8dfc8"}`,borderRadius:12,padding:16,marginBottom:14,textAlign:"center"}}><div style={{fontSize:40,marginBottom:8}}>{locked?"🔒":"🔓"}</div><div style={{fontWeight:600,fontSize:16,color:locked?"#721c24":"#1a6b3c"}}>{locked?`${lockedMonth} is Locked`:"Current month is Open"}</div></div><div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:16}}><label style={S.formLabel}>Enter Owner PIN to {locked?"Unlock":"Lock"}</label><input type="password" maxLength={4} inputMode="numeric" placeholder="••••" style={{...S.formInput,letterSpacing:10,fontSize:22,textAlign:"center"}} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,"").slice(0,4))}/><button style={{...S.btnSave,width:"100%",background:locked?"#c62828":"#1a6b3c"}} onClick={doAction}>{locked?"🔓 Unlock Month":`🔒 Lock ${current}`}</button></div></div>);
}

function AboutSection() {
  return(<div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:16,marginTop:8}}><div style={{textAlign:"center",marginBottom:16}}><img src={logo_app} style={{width:72,height:72,borderRadius:14,objectFit:"contain"}} alt="logo"/><div style={{fontWeight:700,fontSize:16,marginTop:8}}>MilkFlow v2.0</div><div style={{fontSize:12,color:"#888"}}>Saikrishna Milk Supply</div></div>{[["UPI ID",UPI_ID],["Owner URL",window.location.origin+"/owner"],["Delivery URL",window.location.origin+"/entry"],["Customer URL",window.location.origin+"/c/CODE"],["Bill URL",window.location.origin+"/bill/CODE"]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8,paddingBottom:8,borderBottom:"0.5px solid #f5f5f5"}}><span style={{color:"#888"}}>{k}</span><span style={{fontWeight:500,fontSize:11,color:"#555",wordBreak:"break-all",textAlign:"right",maxWidth:"60%"}}>{v}</span></div>))}</div>);
}

function CustomerPortal({customerCode}) {
  const [customer,setCustomer]=useState(null); const [bill,setBill]=useState(null); const [ownerEntries,setOwnerEntries]=useState([]); const [custEntries,setCustEntries]=useState([]); const [tab,setTab]=useState("home"); const [loading,setLoading]=useState(true);
  const now=new Date(); const month=now.getMonth()+1; const year=now.getFullYear();
  useEffect(()=>{load();},[]);
  const load=async()=>{
    setLoading(true);
    try{
      const custs=await db("customers","GET",null,`?code=eq.${customerCode}&limit=1`);
      const cust=custs?.[0]; if(!cust){setLoading(false);return;} setCustomer(cust);
      const startDate=`${year}-${String(month).padStart(2,"0")}-01`; const endDate=new Date(year,month,0).toISOString().split("T")[0];
      const [bills,oe,ce]=await Promise.all([
        db("bills","GET",null,`?customer_id=eq.${cust.id}&month=eq.${month}&year=eq.${year}&limit=1`),
        db("daily_entries","GET",null,`?customer_id=eq.${cust.id}&entry_date=gte.${startDate}&entry_date=lte.${endDate}&order=entry_date.desc&select=entry_date,quantity`),
        db("customer_entries","GET",null,`?customer_id=eq.${cust.id}&entry_date=gte.${startDate}&entry_date=lte.${endDate}&order=entry_date.desc&select=entry_date,quantity`),
      ]);
      setBill(bills?.[0]||null); setOwnerEntries(oe||[]); setCustEntries(ce||[]);
    }catch(e){console.error(e);}
    setLoading(false);
  };
  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:12}}><img src={logo_app} style={{width:72,height:72,borderRadius:16,objectFit:"contain"}} alt="loading"/><div style={{fontSize:14,color:"#888"}}>Loading...</div></div>;
  if(!customer)return<EmptyState icon="❌" message="Customer not found. Check your link."/>;
  return(<div style={S.screen}>
    <div style={{background:"#1565C0",padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}><img src={logo_app} style={{width:36,height:36,borderRadius:8,objectFit:"contain",background:"white",padding:2}} alt="logo"/><div style={{color:"white"}}><div style={{fontSize:14,fontWeight:500}}>Saikrishna Milk Supply</div><div style={{fontSize:12,opacity:0.85}}>Your milk account</div></div></div>
    <div style={{flex:1,overflowY:"auto"}}>
      {tab==="home"&&<PortalHome customer={customer} bill={bill} ownerEntries={ownerEntries} custEntries={custEntries} setTab={setTab}/>}
      {tab==="records"&&<PortalRecords customer={customer} ownerEntries={ownerEntries} custEntries={custEntries} month={month} year={year} onRefresh={load}/>}
      {tab==="bill"&&<PortalBillTab bill={bill} customer={customer} month={month} year={year} setTab={setTab}/>}
      {tab==="pay"&&<PortalPay bill={bill} customer={customer}/>}
    </div>
    <div style={S.bottomNav}>{[["home","🏠","Home"],["records","📋","Records"],["bill","🧾","Bill"],["pay","💳","Pay"]].map(([id,icon,label])=>(<button key={id} style={{...S.navBtn,...(tab===id?S.navBtnActiveBlue:{})}} onClick={()=>setTab(id)}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:10,marginTop:2}}>{label}</span></button>))}</div>
  </div>);
}

function PortalHome({customer,bill,ownerEntries,custEntries,setTab}) {
  return(<div style={{padding:16}}>
    <div style={{fontSize:18,fontWeight:600,marginBottom:2}}>Hello, {customer?.name?.split(" ")[0]} 👋</div>
    <div style={{fontSize:13,color:"#888",marginBottom:16}}>Account: {customer?.code}</div>
    <div style={S.statsGrid}><StatCard label="Daily Milk" value={(customer?.default_qty||1)+"L"} icon="🥛" color="#1565C0"/><StatCard label="Days Recorded" value={custEntries.length+" 🔥"} icon="📅" color="#e65100"/><StatCard label="Bill Amount" value={fmtCurrency(bill?.total_amount)} icon="🧾" color="#1a6b3c"/><StatCard label="Status" value={bill?.status==="paid"?"✅ Paid":"⏳ Due"} icon="💳" color={bill?.status==="paid"?"#2E7D32":"#c62828"}/></div>
    {bill&&bill.status!=="paid"&&<div style={S.alertBox}><span style={{fontSize:18}}>💳</span><div><div style={{fontWeight:500,fontSize:14}}>Amount Due: {fmtCurrency(bill.total_amount)}</div><div style={{fontSize:12,color:"#856404"}}>Tap Pay to pay and confirm</div></div></div>}
    <div style={{display:"flex",gap:10,marginBottom:16}}>{[["🧾","View Bill","bill"],["💳","Pay Now","pay"],["📋","Records","records"]].map(([icon,label,t])=>(<button key={t} style={{flex:1,background:"white",border:"1px solid #eee",borderRadius:12,padding:"12px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}} onClick={()=>setTab(t)}><span style={{fontSize:24}}>{icon}</span><span style={{fontSize:11,color:"#555",fontWeight:500}}>{label}</span></button>))}</div>
  </div>);
}

function PortalBillTab({bill,customer,month,year,setTab}) {
  if(!bill)return<EmptyState icon="🧾" message="No bill generated yet for this month. Check back after the 3rd."/>;
  return(<div style={{padding:16}}>
    <div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:12,padding:14,marginBottom:16}}><div style={{fontWeight:600,fontSize:14,color:"#856404",marginBottom:6}}>🔔 Important — After Paying</div><div style={{fontSize:13,color:"#856404",lineHeight:1.7}}>Please tap <strong>Pay</strong> tab → tap <strong>"I Have Paid"</strong> and share payment screenshot on WhatsApp. If not confirmed, payment shows as <strong>Outstanding</strong> on next month's bill.</div></div>
    <div style={{background:"white",border:"0.5px solid #eee",borderRadius:14,padding:18,marginBottom:14}}>
      <div style={{textAlign:"center",marginBottom:14}}><img src={logo_app} style={{width:52,height:52,borderRadius:10,objectFit:"contain"}} alt="logo"/><div style={{fontWeight:700,fontSize:16,marginTop:6}}>Saikrishna Milk Supply</div></div>
      {[["Customer",customer?.name],["Code",customer?.code],["Period",monthLabel(month,year)],["Total Litres",parseFloat(bill.total_litres||0).toFixed(1)+"L"],["Milk Charges",fmtCurrency(bill.month_amount)]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:8,color:"#555"}}><span>{k}</span><span style={{fontWeight:500}}>{v}</span></div>))}
      {parseFloat(bill.outstanding||0)>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8,color:"#c62828"}}><span>Previous Outstanding</span><span>+{fmtCurrency(bill.outstanding)}</span></div>}
      <div style={{borderTop:"2px solid #1a6b3c",marginTop:10,paddingTop:10,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:17}}>TOTAL DUE</span><span style={{fontWeight:700,fontSize:20,color:"#c62828"}}>{fmtCurrency(bill.total_amount)}</span></div>
    </div>
    <button style={{...S.btnSave,width:"100%",padding:14,fontSize:15}} onClick={()=>setTab("pay")}>💳 Go to Pay →</button>
  </div>);
}

function PortalRecords({customer,ownerEntries,custEntries,month,year,onRefresh}) {
  const [showEntry,setShowEntry]=useState(false); const [selectedQty,setSelectedQty]=useState(null); const [customQty,setCustomQty]=useState(""); const [saving,setSaving]=useState(false);
  const custMap={}; custEntries.forEach(e=>{custMap[e.entry_date]=e.quantity;});
  const todayRecorded=custMap[nowDate()]!==undefined;
  const doSave=async()=>{
    let qty; if(selectedQty===-1){qty=parseFloat(customQty);if(isNaN(qty)||qty<0)return;}else if(selectedQty===null)return;else qty=selectedQty;
    setSaving(true);
    try{await saveCustomerEntry(customer.id,qty);setShowEntry(false);setSelectedQty(null);if(onRefresh)onRefresh();}
    catch(e){alert("Error: "+e.message);}
    setSaving(false);
  };
  return(<div style={{padding:16}}>
    <div style={S.sectionTitle}>📋 {monthLabel(month,year)} Records</div>
    <div style={{background:"#e8f5ee",borderRadius:12,padding:14,marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:"#2d7a50"}}>Days recorded by us</span><span style={{fontWeight:600}}>{ownerEntries.length} ✅</span></div><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:"#2d7a50"}}>Days recorded by you</span><span style={{fontWeight:600}}>{custEntries.length} 📝</span></div></div>
    <div style={{background:"white",border:`2px solid ${todayRecorded?"#1a6b3c":"#ffc107"}`,borderRadius:12,padding:14,marginBottom:14}}><div style={{fontWeight:500,fontSize:14,marginBottom:6}}>{todayRecorded?"✅ Today recorded by you":"📝 Record today's milk"}</div>{todayRecorded?<div style={{fontSize:13,color:"#888"}}>You recorded {custMap[nowDate()]}L today</div>:<button style={{...S.btnSave,width:"100%",padding:12}} onClick={()=>setShowEntry(true)}>📝 Record Today's Milk</button>}</div>
    {ownerEntries.slice(0,25).map((e,i)=>(<div key={i} style={{...S.listCard,padding:"10px 12px"}}><div style={{fontSize:13,color:"#888",minWidth:55}}>{fmtDate(e.entry_date)}</div><div style={{flex:1,fontSize:14,fontWeight:500}}>{e.quantity}L</div><div style={{fontSize:12,color:custMap[e.entry_date]!==undefined?"#1a6b3c":"#bbb"}}>{custMap[e.entry_date]!==undefined?`✅ You: ${custMap[e.entry_date]}L`:"—"}</div></div>))}
    {showEntry&&(<div style={S.modalBg} onClick={()=>setShowEntry(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalHandle}/><div style={S.modalName}>📝 Record Today's Milk</div><div style={S.prevBox}><span style={{fontSize:13,color:"#2d7a50"}}>Your usual:</span><span style={{fontSize:18,fontWeight:600,color:"#1a6b3c"}}>{customer?.default_qty||1}L</span></div><div style={S.qtyGrid}>{QTY_OPTIONS.map(q=><button key={q} style={{...S.qtyOption,...(selectedQty===q?S.qtyOptionSel:{})}} onClick={()=>{setSelectedQty(q);setCustomQty("");}}>{q}</button>)}<button style={{...S.qtyOption,...(selectedQty===0?S.qtyOptionSel:{}),color:"#c0392b",borderColor:"#f5c6cb",background:"#fdf2f3",fontSize:13}} onClick={()=>{setSelectedQty(0);setCustomQty("");}}>🚫<br/><span style={{fontSize:10}}>None</span></button><button style={{...S.qtyOption,...(selectedQty===-1?S.qtyOptionSel:{}),fontSize:13}} onClick={()=>setSelectedQty(-1)}>✏️<br/><span style={{fontSize:10}}>Other</span></button></div>{selectedQty===-1&&<div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}><input type="number" step="0.5" min="0" placeholder="0.0" value={customQty} onChange={e=>setCustomQty(e.target.value)} style={{flex:1,fontSize:18,padding:"10px 14px",border:"0.5px solid #ddd",borderRadius:10,background:"white",color:"#111"}} autoFocus/><span style={{fontSize:13,color:"#888"}}>Litres</span></div>}<div style={S.modalActions}><button style={S.btnCancel} onClick={()=>setShowEntry(false)}>Cancel</button><button style={S.btnSave} onClick={doSave} disabled={saving||selectedQty===null}>{saving?"Saving...":"✅ Save"}</button></div></div></div>)}
  </div>);
}

function PortalPay({bill,customer}) {
  const [step,setStep]=useState("pay"); const [txn4,setTxn4]=useState(""); const [submitting,setSubmitting]=useState(false);
  const upiLink=`upi://pay?pa=${UPI_ID}&pn=Saikrishna+Milk+Supply&am=${bill?.total_amount||0}&cu=INR&tn=MF-${customer?.code||""}`;
  const submitPaid=async()=>{
    if(txn4.length<4){alert("Enter last 4 digits of your Transaction ID");return;}
    setSubmitting(true);
    try{await addPayment({customer_id:customer?.id,amount:bill?.total_amount,payment_method:"upi",status:"pending_confirmation",notes:`Customer self-confirmed. Last 4 TxnID digits: ${txn4}. Time: ${new Date().toLocaleTimeString("en-IN")}`});setStep("done");}
    catch{setStep("done");}
    setSubmitting(false);
  };
  if(!bill)return<EmptyState icon="🧾" message="No bill for this month yet"/>;
  if(step==="done")return(<div style={{padding:16,textAlign:"center"}}><div style={{fontSize:60,marginBottom:12}}>✅</div><div style={{fontSize:20,fontWeight:600,color:"#1a6b3c",marginBottom:8}}>Payment Recorded!</div><div style={{fontSize:13,color:"#555",marginBottom:20,lineHeight:1.7,background:"#e8f5ee",borderRadius:12,padding:14}}>Payment recorded and waiting for owner confirmation.<br/><br/><strong>Please share your payment screenshot on WhatsApp</strong> to speed up confirmation ✅</div><a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Payment screenshot for ${monthLabel(bill?.month,bill?.year)} bill — ${customer?.name} (${customer?.code})`)}`} style={{...S.btnSave,display:"block",textAlign:"center",textDecoration:"none",background:"#25D366",padding:14,fontSize:15}}>📸 Share Screenshot on WhatsApp</a></div>);
  return(<div style={{padding:16}}>
    <div style={S.sectionTitle}>💳 Pay Your Bill</div>
    <div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:12,padding:14,marginBottom:16}}><div style={{fontWeight:600,fontSize:14,color:"#856404",marginBottom:6}}>🔔 Important — After Paying</div><div style={{fontSize:13,color:"#856404",lineHeight:1.7}}>Please tap <strong>"I Have Paid"</strong> below and share payment screenshot on WhatsApp. If not confirmed, payment shows as <strong>Outstanding</strong> on next month's bill.</div></div>
    <div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:16,marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:"#888",fontSize:14}}>Amount Due</span><span style={{fontWeight:700,fontSize:22,color:"#c62828"}}>{fmtCurrency(bill.total_amount)}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"#888"}}>UPI ID</span><span style={{fontWeight:500}}>{UPI_ID}</span></div><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:4}}><span style={{color:"#888"}}>Payment ref</span><span style={{fontWeight:500,color:"#1a6b3c"}}>MF-{customer?.code}</span></div></div>
    <a href={upiLink} style={{...S.btnSave,display:"block",textAlign:"center",padding:15,fontSize:16,fontWeight:600,textDecoration:"none",marginBottom:12}}>📱 Pay via GPay / PhonePe / Paytm</a>
    {step==="pay"&&<button style={{...S.btnCancel,width:"100%",padding:14,fontSize:15,fontWeight:500,border:"2px solid #1a6b3c",color:"#1a6b3c"}} onClick={()=>setStep("confirm")}>✅ I Have Paid — Confirm Now</button>}
    {step==="confirm"&&(<div style={{background:"white",border:"2px solid #1a6b3c",borderRadius:12,padding:16}}><div style={{fontWeight:500,fontSize:14,marginBottom:4}}>Enter last 4 digits of your Transaction ID</div><div style={{fontSize:12,color:"#888",marginBottom:12}}>Open GPay/PhonePe → tap the payment → enter last 4 digits of Transaction ID</div><input type="text" inputMode="numeric" maxLength={4} placeholder="e.g. 7634" style={{...S.formInput,fontSize:22,letterSpacing:8,textAlign:"center"}} value={txn4} onChange={e=>setTxn4(e.target.value.replace(/\D/g,"").slice(0,4))}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><button style={S.btnCancel} onClick={()=>setStep("pay")}>Back</button><button style={S.btnSave} onClick={submitPaid} disabled={submitting||txn4.length<4}>{submitting?"Submitting...":"Submit ✅"}</button></div></div>)}
    <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, sharing payment screenshot for ${monthLabel(bill?.month,bill?.year)} bill — ${customer?.name} (${customer?.code})`)}`} style={{display:"block",textAlign:"center",padding:"12px 0",fontSize:13,color:"#25D366",marginTop:12,textDecoration:"none"}}>📸 Also share screenshot on WhatsApp →</a>
  </div>);
}

const S = {
  screen:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},
  appHeader:{background:"white",borderBottom:"1px solid #eee",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,fontWeight:600,fontSize:16,flexShrink:0},
  sectionTitle:{fontSize:15,fontWeight:600,color:"#111",marginBottom:12},
  pinWrap:{display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 24px",gap:14},
  pinTitle:{fontSize:18,fontWeight:700,color:"#1a6b3c",textAlign:"center"},
  pinDots:{display:"flex",gap:14},
  pinDot:{width:18,height:18,borderRadius:"50%",border:"2px solid #1a6b3c",transition:"background 0.15s"},
  pinDotFilled:{background:"#1a6b3c"},
  pinPad:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,width:"100%",maxWidth:280},
  pinBtn:{background:"#f5f5f5",border:"0.5px solid #ddd",borderRadius:12,padding:"18px 0",fontSize:26,fontWeight:500,color:"#111",cursor:"pointer",textAlign:"center"},
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
  statBox:{background:"#e8f5ee",borderRadius:12,padding:"12px 16px",textAlign:"center"},
  statBoxNum:{fontSize:26,fontWeight:700,color:"#1a6b3c"},
  statBoxLabel:{fontSize:12,color:"#2d7a50"},
  statsGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16},
  statCard:{background:"#f8f9fa",borderRadius:12,padding:"14px 12px",textAlign:"center"},
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

export default function App() {
  const [authed,setAuthed]=useState(false); const [ready,setReady]=useState(false);
  const route=getRoute();
  useEffect(()=>{loadPins().then(()=>setReady(true));},[]);
  if(!ready)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:12}}><img src={logo_app} style={{width:80,height:80,borderRadius:16,objectFit:"contain"}} alt="logo"/><div style={{fontSize:14,color:"#888"}}>Loading MilkFlow...</div></div>;
  if(route.role==="customer")return<div style={{maxWidth:480,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column"}}><CustomerPortal customerCode={route.code}/></div>;
  if(route.role==="bill")return<div style={{maxWidth:520,margin:"0 auto"}}><BillPage customerCode={route.code}/></div>;
  if(route.role==="owner"){
    if(!authed)return<div style={{maxWidth:480,margin:"0 auto"}}><div style={S.appHeader}><img src={logo_app} style={{width:28,height:28,borderRadius:6,objectFit:"contain"}} alt="logo"/> MilkFlow — Owner</div><PinScreen role="owner" onSuccess={()=>setAuthed(true)}/></div>;
    return<div style={{maxWidth:480,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column"}}><div style={S.appHeader}><img src={logo_app} style={{width:28,height:28,borderRadius:6,objectFit:"contain"}} alt="logo"/> MilkFlow<button style={{marginLeft:"auto",fontSize:12,color:"#888",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setAuthed(false)}>Logout</button></div><OwnerDashboard/></div>;
  }
  if(route.role==="father"){
    if(!authed)return<div style={{maxWidth:480,margin:"0 auto"}}><div style={{...S.appHeader,background:"#1a6b3c",color:"white"}}><img src={logo_app} style={{width:28,height:28,borderRadius:6,objectFit:"contain",background:"white",padding:2}} alt="logo"/> MilkFlow — Delivery Entry</div><PinScreen role="father" onSuccess={()=>setAuthed(true)}/></div>;
    return<div style={{maxWidth:480,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column"}}><div style={{...S.appHeader,background:"#1a6b3c",color:"white"}}><img src={logo_app} style={{width:28,height:28,borderRadius:6,objectFit:"contain",background:"white",padding:2}} alt="logo"/> Milk Entry — {new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}<button style={{marginLeft:"auto",fontSize:12,color:"rgba(255,255,255,0.8)",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setAuthed(false)}>Lock</button></div><FatherScreen/></div>;
  }
  return(
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,background:"#f8f9fa"}}>
      <img src={logo_app} style={{width:100,height:100,borderRadius:20,objectFit:"contain",marginBottom:12}} alt="logo"/>
      <div style={{fontSize:22,fontWeight:700,color:"#1a6b3c",marginBottom:4}}>Saikrishna Milk Supply</div>
      <div style={{fontSize:13,color:"#888",marginBottom:8}}>MilkFlow v2.0</div>
      <div style={{fontSize:11,background:"#fff3cd",color:"#856404",padding:"4px 14px",borderRadius:20,marginBottom:32}}>Development mode</div>
      <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12}}>
        {[["👑","Owner Dashboard","/owner"],["🥛","Delivery Entry","/entry"],["👤","Customer Portal (demo)","/c/TEST001"]].map(([icon,label,path])=>(
          <a key={path} href={path} style={{display:"flex",alignItems:"center",gap:14,background:"white",border:"1px solid #eee",borderRadius:14,padding:"16px 18px",textDecoration:"none",color:"#111"}}>
            <span style={{fontSize:32}}>{icon}</span><div><div style={{fontWeight:600,fontSize:16}}>{label}</div><div style={{fontSize:12,color:"#888"}}>{window.location.origin}{path}</div></div><span style={{marginLeft:"auto",color:"#888"}}>→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
