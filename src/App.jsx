import { useState, useEffect, useRef } from "react";
import { logo_app } from "./logoData.js";
import {
  db, loadPins, PINS, todayIST, nowDate,
  getCustomers, addCustomer, updateCustomer, deactivateCustomer, deleteCustomer, deleteCustomerAllData,
  getBrands, addBrand, updateBrand, deleteBrand,
  getTodayEntries, getDailyEntriesForDate, getMonthOwnerEntries, saveEntry, deleteEntry,
  saveCustomerEntry, getMonthCustomerEntries,
  getPayments, addPayment, confirmPayment, rejectPayment, getPendingPaymentsForCustomer, getPaymentsByCustomer,
  getBills, getAllCustomerBills, generateBillForCustomer, updateBillStatus,
  getSetting, setSetting, getAreas, addArea, updateArea, deleteArea,
  getSubgroups, addSubgroup, updateSubgroup, deleteSubgroup, bulkImportCustomers,
} from "./db.js";

const UPI_ID = "yadaiahchinthala07-4@okaxis";
const WHATSAPP_NUMBER = "919987073536";
const OWNER_PIN = "1234";
const FATHER_PIN = "0000";
const BASE_URL = window.location.origin;
const QTY_OPTIONS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0];
const YEARS = Array.from({length:12},(_,i)=>2024+i);

const fmtCurrency = n => "₹" + Number(n||0).toLocaleString("en-IN");
const fmtDate = d => { if(!d)return""; return new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short"}); };
const fmtDateFull = d => { if(!d)return""; return new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}); };
const monthLabel = (m,y) => { if(!m||!y)return""; return new Date(y,m-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"}); };
const monthShort = (m,y) => { if(!m||!y)return""; return new Date(y,m-1,1).toLocaleDateString("en-IN",{month:"short",year:"numeric"}); };
const initials = (name="") => name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const avatarColor = (name="") => { const c=["#1a6b3c","#1565C0","#6a1b9a","#c62828","#e65100","#00695c","#f57f17"]; let h=0; for(let ch of name)h=(h*31+ch.charCodeAt(0))%c.length; return c[h]; };
const roomNum = (code="") => code.replace(/[^0-9]/g,"")||code;
const daysInMonth = (m,y) => new Date(y,m,0).getDate();

function speak(text) {
  if(!window.speechSynthesis)return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="en-IN"; u.rate=0.9;
  window.speechSynthesis.speak(u);
}

function getRoute() {
  const path=window.location.pathname;
  if(path==="/owner")return{role:"owner"};
  if(path==="/entry")return{role:"father"};
  if(path.startsWith("/c/"))return{role:"customer",code:path.split("/c/")[1]};
  if(path.startsWith("/bill/"))return{role:"bill",code:path.split("/bill/")[1]};
  return{role:"select"};
}

const Loader=()=><div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40,fontSize:32}}>⏳</div>;
const EmptyState=({icon,message})=><div style={{textAlign:"center",padding:40,color:"#888"}}><div style={{fontSize:40,marginBottom:8}}>{icon}</div><div style={{fontSize:14}}>{message}</div></div>;
const StatCard=({label,value,icon,color})=><div style={S.statCard}><div style={{fontSize:20,marginBottom:4}}>{icon}</div><div style={{fontSize:17,fontWeight:700,color}}>{value}</div><div style={{fontSize:11,color:"#888",marginTop:2}}>{label}</div></div>;
const Chip=({bg,color,label})=><div style={{flex:1,background:bg,color,borderRadius:20,padding:"6px 0",textAlign:"center",fontSize:11,fontWeight:500}}>{label}</div>;
const Avatar=({name,size=44})=><div style={{width:size,height:size,borderRadius:"50%",background:avatarColor(name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.32,fontWeight:600,color:"white",flexShrink:0}}>{initials(name)}</div>;

function StatusBadge({status}){
  const map={paid:{bg:"#d4edda",color:"#155724",label:"✅ Paid"},pending:{bg:"#fff3cd",color:"#856404",label:"⏳ Pending"},"carry-forward":{bg:"#e2e3e5",color:"#383d41",label:"↩ Carry Forward"},confirmed:{bg:"#d4edda",color:"#155724",label:"✅ Confirmed"},rejected:{bg:"#f8d7da",color:"#721c24",label:"❌ Rejected"},pending_confirmation:{bg:"#fff3cd",color:"#856404",label:"⏳ Review"}};
  const s=map[status]||{bg:"#eee",color:"#666",label:status};
  return <span style={{background:s.bg,color:s.color,borderRadius:10,padding:"2px 8px",fontSize:11,fontWeight:600}}>{s.label}</span>;
}

// ─── PIN SCREEN ───────────────────────────────────────────────────────────────
function PinScreen({onSuccess,role}){
  const [pin,setPin]=useState(""); const [error,setError]=useState(false); const [shake,setShake]=useState(false);
  const correctPin=role==="father"?FATHER_PIN:OWNER_PIN;
  const press=d=>{
    if(pin.length>=4)return; const next=pin+d; setPin(next); setError(false);
    if(next.length===4){
      setTimeout(()=>{
        if(next===correctPin){onSuccess();}
        else{setShake(true);setError(true);setPin("");setTimeout(()=>setShake(false),500);}
      },150);
    }
  };
  return(
    <div style={S.pinWrap}>
      <img src={logo_app} style={{width:90,height:90,borderRadius:16,objectFit:"contain",marginBottom:4}} alt="logo"/>
      <div style={S.pinTitle}>Saikrishna Milk Supply</div>
      <div style={{background:role==="father"?"#e8f5ee":"#e8eaf6",color:role==="father"?"#1a6b3c":"#3949ab",padding:"5px 16px",borderRadius:20,fontSize:13,fontWeight:500,marginBottom:20}}>
        {role==="father"?"🥛 Owner's Register":"👑 Owner Login"}
      </div>
      <div style={{...S.pinDots,...(shake?{animation:"shake 0.4s"}:{})}}>
        {[0,1,2,3].map(i=><div key={i} style={{...S.pinDot,...(i<pin.length?S.pinDotFilled:{})}}/>)}
      </div>
      {error&&<div style={{color:"#c0392b",fontSize:13}}>❌ Wrong PIN — try again</div>}
      <div style={S.pinPad}>
        {[1,2,3,4,5,6,7,8,9].map(n=><button key={n} style={S.pinBtn} onClick={()=>press(String(n))}>{n}</button>)}
        <div/><button style={S.pinBtn} onClick={()=>press("0")}>0</button>
        <button style={S.pinBtn} onClick={()=>setPin(p=>p.slice(0,-1))}>⌫</button>
      </div>
    </div>
  );
}

// ─── FATHER SCREEN v3.3 — inline +/- Save, backdated, group/subgroup ──────────
function FatherScreen(){
  const [customers,setCustomers]=useState([]); const [brands,setBrands]=useState([]);
  const [areas,setAreas]=useState([]); const [subgroups,setSubgroups]=useState([]);
  const [entries,setEntries]=useState({}); const [date,setDate]=useState(todayIST());
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState({});
  const [filter,setFilter]=useState("all"); const [search,setSearch]=useState("");

  useEffect(()=>{loadData();},[date]);
  const loadData=async()=>{
    setLoading(true);
    try{
      const [custs,b,a,sg,dayEntries]=await Promise.all([
        getCustomers(),getBrands(),getAreas(),getSubgroups(),getDailyEntriesForDate(date)
      ]);
      setCustomers(custs||[]); setBrands(b||[]); setAreas(a||[]); setSubgroups(sg||[]);
      const map={}; (dayEntries||[]).forEach(e=>{map[e.customer_id]={qty:e.quantity,saved:true};});
      // init unsaved with default qty
      (custs||[]).forEach(c=>{if(!map[c.id])map[c.id]={qty:c.default_qty||1,saved:false};});
      setEntries(map);
    }catch(e){console.error(e);}
    setLoading(false);
  };

  const adjust=(custId,delta)=>{
    setEntries(p=>({...p,[custId]:{qty:Math.max(0,+((p[custId]?.qty||0)+delta).toFixed(1)),saved:false}}));
  };

  const doSave=async(cust)=>{
    const e=entries[cust.id]; if(!e)return;
    setSaving(p=>({...p,[cust.id]:true}));
    try{
      const brand=brands.find(b=>b.id===cust.brand_id);
      const rate=cust.custom_rate||brand?.rate||0;
      await saveEntry(cust.id,e.qty,cust.brand_id,rate,date);
      setEntries(p=>({...p,[cust.id]:{qty:e.qty,saved:true}}));
    }catch(err){alert("Save failed: "+err.message);}
    setSaving(p=>({...p,[cust.id]:false}));
  };

  const doneCount=Object.values(entries).filter(e=>e.saved).length;
  const grouped={};
  customers.forEach(c=>{
    const area=areas.find(a=>a.id===c.area_id); const sg=subgroups.find(s=>s.id===c.subgroup_id);
    const aKey=area?.id||"none"; const aLabel=area?`${area.name}${area.delivery_boy_name?" / "+area.delivery_boy_name:""}`:"Other";
    const sgKey=sg?.id||"none"; const sgLabel=sg?.name||"Other";
    if(!grouped[aKey])grouped[aKey]={label:aLabel,area,subs:{}};
    if(!grouped[aKey].subs[sgKey])grouped[aKey].subs[sgKey]={label:sgLabel,sg,customers:[]};
    grouped[aKey].subs[sgKey].customers.push(c);
  });

  const filtered=customers.filter(c=>{
    const e=entries[c.id];
    if(filter==="done"&&!e?.saved)return false;
    if(filter==="pending"&&e?.saved)return false;
    const s=search.toLowerCase();
    return !s||(c.name||"").toLowerCase().includes(s)||(c.code||"").toLowerCase().includes(s);
  });
  const filteredIds=new Set(filtered.map(c=>c.id));

  if(loading)return<Loader/>;
  return(
    <div style={S.screen}>
      {/* Date selector */}
      <div style={{padding:"8px 12px",background:"#f8f9fa",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13,color:"#888"}}>📅 Date:</span>
        <input type="date" value={date} max={todayIST()} onChange={e=>setDate(e.target.value)}
          style={{border:"0.5px solid #ddd",borderRadius:8,padding:"4px 10px",fontSize:14,flex:1}}/>
        {date!==todayIST()&&<span style={{fontSize:11,background:"#fff3cd",color:"#856404",padding:"3px 8px",borderRadius:8}}>Backdated</span>}
      </div>
      <div style={S.statusBar}>
        <Chip bg="#e8f5ee" color="#1a6b3c" label={`✅ ${doneCount}/${customers.length} Saved`}/>
        <Chip bg="#fff3cd" color="#856404" label={`⏳ ${customers.length-doneCount} Pending`}/>
        <Chip bg="#e9ecef" color="#495057" label={fmtDateFull(date)}/>
      </div>
      <div style={S.searchBar}>
        <span style={{color:"#888"}}>🔍</span>
        <input style={S.searchInput} placeholder="Search customer..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {search&&<button style={S.clearBtn} onClick={()=>setSearch("")}>✕</button>}
      </div>
      <div style={S.filterRow}>
        {[["all",`All (${customers.length})`],["pending",`Pending (${customers.length-doneCount})`],["done",`Done (${doneCount})`]].map(([f,l])=>(
          <button key={f} style={{...S.filterChip,...(filter===f?S.filterChipActive:{})}} onClick={()=>setFilter(f)}>{l}</button>
        ))}
      </div>
      <div style={S.scrollArea}>
        {customers.length===0?<EmptyState icon="👥" message="No customers yet."/>:
        Object.values(grouped).map((group,gi)=>(
          <div key={group.label}>
            <div style={{background:"#1a2744",color:"white",padding:"9px 12px",fontWeight:700,fontSize:15,marginTop:gi>0?8:0}}>📍 {group.label}</div>
            {Object.values(group.subs).map(sub=>(
              <div key={sub.label}>
                <div style={{background:"#eef2ff",color:"#1a2744",padding:"7px 12px",fontWeight:600,fontSize:14,borderBottom:"0.5px solid #ddd"}}>🏢 {sub.label}</div>
                {sub.customers.filter(c=>filteredIds.has(c.id)).map(cust=>{
                  const e=entries[cust.id]||{qty:cust.default_qty||1,saved:false};
                  const brand=brands.find(b=>b.id===cust.brand_id);
                  const room=roomNum(cust.code);
                  const ttsText=`${group.area?.name||""} - ${sub.sg?.name||""} - ${room||cust.name}`;
                  const isSaving=saving[cust.id];
                  return(
                    <div key={cust.id} style={{...S.custCard,borderLeft:`3px solid ${e.saved?"#28a745":"#eee"}`,padding:"10px 12px"}}>
                      <div style={{width:44,height:44,borderRadius:"50%",background:avatarColor(cust.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white",flexShrink:0}}>{room||initials(cust.name)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <div style={S.custName}>{cust.name}</div>
                          <button style={{background:"none",border:"none",fontSize:14,cursor:"pointer",padding:"0 2px"}} onClick={ev=>{ev.stopPropagation();speak(ttsText);}}>🔊</button>
                        </div>
                        <div style={S.custMeta}>{cust.code} • {brand?.name||"—"} • Default: {cust.default_qty}L</div>
                        {e.saved&&<div style={{fontSize:11,color:"#1a6b3c",fontWeight:600}}>✅ Saved: {e.qty}L</div>}
                      </div>
                      {/* Inline +/- Save control */}
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <button style={{width:32,height:32,borderRadius:"50%",background:"#f0f0f0",border:"0.5px solid #ddd",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>adjust(cust.id,-0.5)}>−</button>
                          <span style={{fontWeight:700,fontSize:16,minWidth:36,textAlign:"center"}}>{e.qty}L</span>
                          <button style={{width:32,height:32,borderRadius:"50%",background:"#1a2744",border:"none",color:"white",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>adjust(cust.id,0.5)}>+</button>
                        </div>
                        <button style={{background:e.saved?"#d4edda":"#1a6b3c",border:"none",borderRadius:8,padding:"5px 14px",color:e.saved?"#155724":"white",fontSize:12,fontWeight:600,cursor:"pointer"}} onClick={()=>doSave(cust)} disabled={isSaving}>
                          {isSaving?"...":e.saved?"✓ Saved":"✓ Save"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
        {filtered.length===0&&customers.length>0&&<EmptyState icon="🔍" message="No customers match filter"/>}
      </div>
    </div>
  );
}

// ─── OWNER DASHBOARD ─────────────────────────────────────────────────────────
function OwnerDashboard(){
  const [tab,setTab]=useState("home");
  const tabs=[["home","🏠","Home"],["customers","👥","Customers"],["records","📋","Records"],["billing","🧾","Billing"],["payments","💳","Payments"],["reports","📊","Reports"],["settings","⚙️","Settings"]];
  return(<div style={S.screen}><div style={{flex:1,overflowY:"auto"}}>{tab==="home"&&<OwnerHome setTab={setTab}/>}{tab==="customers"&&<CustomerManagement/>}{tab==="records"&&<DailyRecords/>}{tab==="billing"&&<BillingSection/>}{tab==="payments"&&<PaymentTracking/>}{tab==="reports"&&<ReportsSection/>}{tab==="settings"&&<OwnerSettings/>}</div><div style={{...S.bottomNav,overflowX:"auto"}}>{tabs.map(([id,icon,label])=>(<button key={id} style={{...S.navBtn,minWidth:46,...(tab===id?S.navBtnActive:{})}} onClick={()=>setTab(id)}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:9,marginTop:2}}>{label}</span></button>))}</div></div>);
}

function OwnerHome({setTab}){
  const [stats,setStats]=useState(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{load();},[]);
  const load=async()=>{
    setLoading(true);
    try{
      const [custs,todayE,pendingP]=await Promise.all([db("customers","GET",null,"?active=eq.true&select=id,default_qty"),getTodayEntries(),db("payments","GET",null,"?status=eq.pending_confirmation&select=id")]);
      const actualL=(todayE||[]).reduce((s,e)=>s+(parseFloat(e.quantity)||0),0);
      const plannedL=(custs||[]).reduce((s,c)=>s+(parseFloat(c.default_qty)||0),0);
      const hasActual=(todayE||[]).length>0;
      const now=new Date(new Date().getTime()+(5.5*60*60*1000));
      setStats({customers:custs?.length||0,todayLitres:hasActual?actualL:plannedL,hasActual,pendingPayments:(pendingP||[]).length,day:now.getDate(),daysInMonth:new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),dateStr:todayIST()});
    }catch{setStats({customers:0,todayLitres:0,hasActual:false,pendingPayments:0,day:1,daysInMonth:30,dateStr:todayIST()});}
    setLoading(false);
  };
  const hr=new Date(new Date().getTime()+(5.5*60*60*1000)).getHours();
  const greeting=hr<12?"Good Morning":hr<17?"Good Afternoon":"Good Evening";
  return(<div style={{padding:16}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
      <div><div style={{fontSize:13,color:"#888"}}>{greeting} 👋</div><div style={{fontSize:18,fontWeight:600}}>Saikrishna Milk Supply</div><div style={{fontSize:12,color:"#888"}}>{stats?fmtDateFull(stats.dateStr):""}</div></div>
      <img src={logo_app} style={{width:44,height:44,borderRadius:10,objectFit:"contain"}} alt="logo"/>
    </div>
    {loading?<Loader/>:<>
      <div style={S.sectionTitle}>📊 Today</div>
      <div style={S.statsGrid}>
        <StatCard label="Active Customers" value={stats.customers} icon="👥" color="#1565C0"/>
        <StatCard label="Litres Today" value={stats.todayLitres.toFixed(1)+"L"+(stats.hasActual?" ✅":" 📋")} icon="🥛" color="#1a6b3c"/>
        <StatCard label="Pending Payments" value={stats.pendingPayments} icon="⏳" color={stats.pendingPayments>0?"#c62828":"#1a6b3c"}/>
        <StatCard label="Month Progress" value={`${stats.day}/${stats.daysInMonth}`} icon="📅" color="#6a1b9a"/>
      </div>
      <div style={S.sectionTitle}>⚡ Quick Actions</div>
      <div style={{display:"flex",gap:10,marginBottom:16}}>{[["🧾","Billing","billing"],["💳","Payments","payments"],["📋","Records","records"],["👥","Customers","customers"]].map(([icon,label,t])=>(<button key={t} style={{flex:1,background:"white",border:"1px solid #eee",borderRadius:12,padding:"12px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}} onClick={()=>setTab(t)}><span style={{fontSize:24}}>{icon}</span><span style={{fontSize:11,color:"#555",fontWeight:500}}>{label}</span></button>))}</div>
      {stats.pendingPayments>0&&<div style={S.alertBox}><span style={{fontSize:20}}>⚠️</span><div><div style={{fontWeight:500,fontSize:14}}>{stats.pendingPayments} payment{stats.pendingPayments>1?"s":""} waiting</div><div style={{fontSize:12,color:"#856404"}}>Tap Payments to review</div></div></div>}
      <div style={S.sectionTitle}>🗓️ This Month</div>
      <div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:"14px 16px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,color:"#555"}}>Days recorded</span><span style={{fontWeight:600}}>{stats.day}/{stats.daysInMonth}</span></div><div style={{background:"#eee",borderRadius:4,height:8}}><div style={{background:"#1a6b3c",borderRadius:4,height:"100%",width:`${(stats.day/stats.daysInMonth)*100}%`}}/></div></div>
    </>}
  </div>);
}

function CustomerManagement(){
  const [customers,setCustomers]=useState([]); const [brands,setBrands]=useState([]);
  const [areas,setAreas]=useState([]); const [subgroups,setSubgroups]=useState([]);
  const [loading,setLoading]=useState(true); const [search,setSearch]=useState("");
  const [showAdd,setShowAdd]=useState(false); const [editTarget,setEditTarget]=useState(null);
  const [showImport,setShowImport]=useState(false); const [deleteTarget,setDeleteTarget]=useState(null);
  const emptyForm={code:"",name:"",phone:"",address:"",area_id:"",subgroup_id:"",brand_id:"",default_qty:"1",custom_rate:"",outstanding:"0"};
  const [form,setForm]=useState(emptyForm); const [codeWarning,setCodeWarning]=useState(false);
  useEffect(()=>{load();},[]);
  const load=async()=>{setLoading(true);try{const [c,b,a,sg]=await Promise.all([getCustomers(),getBrands(),getAreas(),getSubgroups()]);setCustomers(c||[]);setBrands(b||[]);setAreas(a||[]);setSubgroups(sg||[]);}catch(e){console.error(e);}setLoading(false);};
  const filteredSubs=subgroups.filter(sg=>sg.area_id===form.area_id);
  const openAdd=()=>{setForm(emptyForm);setEditTarget(null);setCodeWarning(false);setShowAdd(true);};
  const openEdit=c=>{setForm({code:c.code,name:c.name,phone:c.phone||"",address:c.address||"",area_id:c.area_id||"",subgroup_id:c.subgroup_id||"",brand_id:c.brand_id||"",default_qty:String(c.default_qty||1),custom_rate:String(c.custom_rate||""),outstanding:String(c.outstanding||0)});setEditTarget(c);setCodeWarning(false);setShowAdd(true);};
  const doSave=async()=>{
    if(!form.code.trim()){alert("Customer code is required");return;}
    if(!form.name.trim()){alert("Name is required");return;}
    try{
      if(editTarget){await updateCustomer(editTarget.id,{code:form.code,name:form.name,phone:form.phone,address:form.address,area_id:form.area_id||null,subgroup_id:form.subgroup_id||null,brand_id:form.brand_id||null,default_qty:parseFloat(form.default_qty)||1,custom_rate:form.custom_rate?parseFloat(form.custom_rate):null,outstanding:parseFloat(form.outstanding)||0,portal_token:form.code});}
      else{await addCustomer({...form,area_id:form.area_id||null,subgroup_id:form.subgroup_id||null});}
      setShowAdd(false);setForm(emptyForm);setEditTarget(null);load();
    }catch(e){alert("Error: "+e.message);}
  };
  const exportExcel=async()=>{try{if(!window.XLSX)await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});const rows=customers.map(c=>({Code:c.code,Name:c.name,Phone:c.phone,Group:c.areas?.name||"",Subgroup:c.subgroups?.name||"",Brand:brands.find(b=>b.id===c.brand_id)?.name||"","Daily Qty":c.default_qty,"Custom Rate":c.custom_rate||"",Outstanding:c.outstanding||0}));const ws=window.XLSX.utils.json_to_sheet(rows);const wb=window.XLSX.utils.book_new();window.XLSX.utils.book_append_sheet(wb,ws,"Customers");window.XLSX.writeFile(wb,`Customers_${todayIST()}.xlsx`);}catch(e){alert("Export error: "+e.message);}};
  const filtered=customers.filter(c=>!search||(c.name||"").toLowerCase().includes(search.toLowerCase())||(c.phone||"").includes(search)||(c.code||"").toLowerCase().includes(search.toLowerCase()));
  const grouped={};
  filtered.forEach(c=>{const aKey=c.area_id||"none";const aLabel=c.areas?.name||"No Group";const sgKey=c.subgroup_id||"none";const sgLabel=c.subgroups?.name||"No Subgroup";if(!grouped[aKey])grouped[aKey]={label:aLabel,subs:{}};if(!grouped[aKey].subs[sgKey])grouped[aKey].subs[sgKey]={label:sgLabel,customers:[]};grouped[aKey].subs[sgKey].customers.push(c);});
  return(<div style={{padding:16}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><div style={S.sectionTitle}>👥 Customers ({customers.length})</div><div style={{display:"flex",gap:6}}><button style={{...S.btnPrimary,background:"#1565C0",padding:"8px 10px",fontSize:12}} onClick={()=>setShowImport(true)}>📥 Import</button><button style={{...S.btnPrimary,background:"#6a1b9a",padding:"8px 10px",fontSize:12}} onClick={exportExcel}>📤 Export</button><button style={S.btnPrimary} onClick={openAdd}>+ Add</button></div></div>
    <div style={S.searchBar}><span>🔍</span><input style={S.searchInput} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
    {loading?<Loader/>:filtered.length===0?<EmptyState icon="👥" message={search?"No customers found":"No customers yet."}/>:
      Object.entries(grouped).map(([aKey,group])=>(
        <div key={aKey} style={{marginBottom:12}}>
          <div style={{background:"#1a2744",color:"white",padding:"8px 12px",borderRadius:"8px 8px 0 0",fontWeight:700,fontSize:14}}>📍 {group.label}</div>
          {Object.entries(group.subs).map(([sgKey,sub])=>(
            <div key={sgKey} style={{border:"0.5px solid #eee",borderTop:"none"}}>
              <div style={{background:"#eef2ff",color:"#1a2744",padding:"6px 12px",fontWeight:600,fontSize:13,borderBottom:"0.5px solid #eee"}}>🏢 {sub.label}</div>
              {sub.customers.map(c=>{const brand=brands.find(b=>b.id===c.brand_id);return(<div key={c.id} style={{...S.listCard,flexDirection:"column",gap:8,borderRadius:0,borderBottom:"0.5px solid #f5f5f5"}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:40,height:40,borderRadius:"50%",background:avatarColor(c.name),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white",flexShrink:0}}>{roomNum(c.code)||initials(c.name)}</div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div><div style={{fontSize:12,color:"#888"}}>{c.code} • {c.phone}</div><div style={{fontSize:12,color:"#888"}}>{brand?.name||"No brand"} • {c.default_qty}L/day</div>{(c.outstanding||0)>0&&<div style={{fontSize:12,color:"#c62828"}}>OB: {fmtCurrency(c.outstanding)}</div>}</div></div><div style={{display:"flex",gap:6}}><a href={`https://wa.me/91${(c.phone||"").replace(/\D/g,"")}`} style={{flex:1,fontSize:11,padding:"5px 0",background:"#e7f9f0",border:"0.5px solid #b3dfcb",borderRadius:8,color:"#1a6b3c",textDecoration:"none",textAlign:"center"}}>📞 WhatsApp</a><button style={{flex:1,fontSize:11,padding:"5px 0",background:"#e8f0ff",border:"0.5px solid #c5d5f5",borderRadius:8,color:"#1565C0",cursor:"pointer"}} onClick={()=>openEdit(c)}>✏️ Edit</button><button style={{flex:1,fontSize:11,padding:"5px 0",background:"#fdf2f3",border:"0.5px solid #f5c6cb",borderRadius:8,color:"#c62828",cursor:"pointer"}} onClick={()=>setDeleteTarget(c)}>🗑 Remove</button></div></div>);})}
            </div>
          ))}
        </div>
      ))
    }
    {showAdd&&(<div style={S.modalBg} onClick={()=>{setShowAdd(false);setEditTarget(null);}}><div style={{...S.modal,maxHeight:"92vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={S.modalHandle}/><div style={S.modalName}>{editTarget?"Edit Customer":"Add Customer"}</div>
      <div style={{background:"#e8f5ee",borderRadius:10,padding:10,marginBottom:12,fontSize:12,color:"#1a6b3c"}}>💡 Code format: <strong>BUILDINGCODE-ROOMNO</strong> e.g. <strong>SA-504</strong> (Sumit A Wing, Room 504) or <strong>SB-504</strong> (Sumit B Wing, Room 504)</div>
      <label style={S.formLabel}>Customer Code *</label>
      <input style={S.formInput} placeholder="e.g. SA-504 or JB1-504" value={form.code} onChange={e=>{setForm(p=>({...p,code:e.target.value}));if(editTarget)setCodeWarning(true);}}/>
      {codeWarning&&<div style={{background:"#fef3c7",border:"1px solid #ffc107",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#856404"}}>⚠️ Changing code will change the customer portal link.</div>}
      <label style={S.formLabel}>Full Name *</label>
      <input style={S.formInput} placeholder="Full name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
      <label style={S.formLabel}>Phone (WhatsApp)</label>
      <input style={S.formInput} type="tel" placeholder="10-digit mobile" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
      <label style={S.formLabel}>Group (Area / Zone)</label>
      <select style={S.formInput} value={form.area_id} onChange={e=>setForm(p=>({...p,area_id:e.target.value,subgroup_id:""}))}>
        <option value="">-- Select Group --</option>
        {areas.map(a=><option key={a.id} value={a.id}>{a.name}{a.delivery_boy_name?" / "+a.delivery_boy_name:""}</option>)}
      </select>
      <label style={S.formLabel}>Subgroup (Building / Wing)</label>
      <select style={S.formInput} value={form.subgroup_id} onChange={e=>setForm(p=>({...p,subgroup_id:e.target.value}))} disabled={!form.area_id}>
        <option value="">-- Select Subgroup --</option>
        {filteredSubs.map(sg=><option key={sg.id} value={sg.id}>{sg.name}</option>)}
      </select>
      <label style={S.formLabel}>Address / Notes</label>
      <input style={S.formInput} placeholder="Flat/building details" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/>
      <label style={S.formLabel}>Milk Brand</label>
      <select style={S.formInput} value={form.brand_id} onChange={e=>setForm(p=>({...p,brand_id:e.target.value}))}><option value="">Select brand...</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name} — ₹{b.rate}/L</option>)}</select>
      <div style={{display:"flex",gap:8}}><div style={{flex:1}}><label style={S.formLabel}>Daily Qty (L)</label><input style={S.formInput} type="text" inputMode="decimal" placeholder="1.5" value={form.default_qty} onChange={e=>setForm(p=>({...p,default_qty:e.target.value}))}/></div><div style={{flex:1}}><label style={S.formLabel}>Custom Rate ₹/L</label><input style={S.formInput} type="text" inputMode="decimal" placeholder="Leave blank=brand rate" value={form.custom_rate} onChange={e=>setForm(p=>({...p,custom_rate:e.target.value}))}/></div></div>
      <div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"12px 14px",marginBottom:12}}><div style={{fontWeight:500,fontSize:13,marginBottom:4}}>💰 Opening Balance</div><input style={{...S.formInput,marginBottom:0}} type="text" inputMode="decimal" placeholder="0" value={form.outstanding} onChange={e=>setForm(p=>({...p,outstanding:e.target.value}))}/></div>
      <div style={S.modalActions}><button style={S.btnCancel} onClick={()=>{setShowAdd(false);setEditTarget(null);}}>Cancel</button><button style={S.btnSave} onClick={doSave}>{editTarget?"Save Changes":"Add Customer"}</button></div>
    </div></div>)}
    {showImport&&<BulkImportModal brands={brands} areas={areas} subgroups={subgroups} onClose={()=>setShowImport(false)} onDone={()=>{setShowImport(false);load();}}/>}
    {deleteTarget&&<DeleteCustomerModal customer={deleteTarget} onClose={()=>setDeleteTarget(null)} onDone={()=>{setDeleteTarget(null);load();}}/>}
  </div>);
}

function DeleteCustomerModal({customer,onClose,onDone}){
  const [type,setType]=useState("soft"); const [step,setStep]=useState("confirm");
  const [err,setErr]=useState(""); const [doing,setDoing]=useState(false);
  const pinRef=useRef(""); const [pinDisplay,setPinDisplay]=useState(0);

  const executeDelete=async(confirmedPin)=>{
    if(confirmedPin!=="1234"){setErr("❌ Wrong PIN — try again");pinRef.current="";setPinDisplay(0);return;}
    setDoing(true);
    try{
      if(type==="soft") await deactivateCustomer(customer.id);
      else if(type==="hard") await deleteCustomer(customer.id);
      else await deleteCustomerAllData(customer.id);
      onDone();
    }catch(e){alert("Error: "+e.message);setDoing(false);}
  };

  const pressPin=d=>{
    if(pinRef.current.length>=4)return;
    const next=pinRef.current+d;
    pinRef.current=next;
    setPinDisplay(next.length);
    setErr("");
    if(next.length===4){
      const captured=next;
      setTimeout(()=>executeDelete(captured),150);
    }
  };
  const delPin=()=>{pinRef.current=pinRef.current.slice(0,-1);setPinDisplay(pinRef.current.length);};

  return(<div style={S.modalBg} onClick={onClose}><div style={S.modal} onClick={e=>e.stopPropagation()}>
    <div style={S.modalHandle}/><div style={S.modalName}>Remove Customer</div><div style={S.modalMeta}>{customer.name} • {customer.code}</div>
    {step==="confirm"&&<>
      {[
        ["soft","😴","Deactivate (Safe)","History kept, can reactivate anytime","#1a6b3c"],
        ["hard","🗑️","Delete Customer Only","Removes customer but keeps bills/entries","#e65100"],
        ["all","💥","Delete Everything","Removes customer + all bills, entries, payments","#c62828"],
      ].map(([v,icon,label,desc,color])=>(
        <div key={v} style={{border:`2px solid ${type===v?color:"#eee"}`,borderRadius:12,padding:14,marginBottom:10,cursor:"pointer",background:type===v?color+"11":"white"}} onClick={()=>setType(v)}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>{icon}</span>
            <div><div style={{fontWeight:600,fontSize:14,color}}>{label}</div><div style={{fontSize:12,color:"#888"}}>{desc}</div></div>
          </div>
        </div>
      ))}
      <div style={S.modalActions}><button style={S.btnCancel} onClick={onClose}>Cancel</button><button style={{...S.btnSave,background:type==="all"?"#c62828":type==="hard"?"#e65100":"#1a6b3c"}} onClick={()=>{pinRef.current="";setPinDisplay(0);setErr("");setStep("pin");}}>Continue →</button></div>
    </>}
    {step==="pin"&&<>
      <div style={{background:"#fff3cd",borderRadius:10,padding:12,marginBottom:14,fontSize:13,color:"#856404"}}>Enter Owner PIN to confirm</div>
      <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:14}}>
        {[0,1,2,3].map(i=><div key={i} style={{width:18,height:18,borderRadius:"50%",border:"2px solid #1a6b3c",background:i<pinDisplay?"#1a6b3c":"white"}}/>)}
      </div>
      {err&&<div style={{color:"#c62828",fontSize:13,textAlign:"center",marginBottom:8}}>{err}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,maxWidth:240,margin:"0 auto"}}>
        {[1,2,3,4,5,6,7,8,9].map(n=><button key={n} style={S.pinBtn} onClick={()=>pressPin(String(n))}>{n}</button>)}
        <div/><button style={S.pinBtn} onClick={()=>pressPin("0")}>0</button>
        <button style={S.pinBtn} onClick={delPin}>⌫</button>
      </div>
      {doing&&<div style={{textAlign:"center",marginTop:12,color:"#888"}}>Processing...</div>}
      <button style={{...S.btnCancel,width:"100%",marginTop:14}} onClick={()=>{setStep("confirm");pinRef.current="";setPinDisplay(0);setErr("");}}>← Back</button>
    </>}
  </div></div>);
}

function BulkImportModal({brands,areas,subgroups,onClose,onDone}){
  const [step,setStep]=useState("upload"); const [rows,setRows]=useState([]); const [result,setResult]=useState(null);
  const downloadTemplate=()=>{const csv="code,name,phone,address,group_name,subgroup_name,brand_name,qty,rate,opening_balance\nSA-504,John Doe,9876543210,Flat 504,JB Nagar,Sumit A Wing,Amul Full Cream,1,68,0";const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="milkflow_template.csv";a.click();};
  const handleFile=e=>{const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=ev=>{const lines=ev.target.result.trim().split("\n");const headers=lines[0].split(",").map(h=>h.trim().toLowerCase().replace(/\s+/g,"_"));const parsed=lines.slice(1).map(line=>{const vals=line.split(",");const row={};headers.forEach((h,i)=>row[h]=vals[i]?.trim()||"");return row;});setRows(parsed);setStep("preview");};reader.readAsText(f);};
  const runImport=async()=>{setStep("importing");const res=await bulkImportCustomers(rows,brands,[...areas],[...subgroups]);setResult(res);setStep("done");};
  return(<div style={{...S.modalBg,alignItems:"flex-start",overflowY:"auto"}} onClick={onClose}><div style={{...S.modal,borderRadius:0,minHeight:"100vh",paddingBottom:40}} onClick={e=>e.stopPropagation()}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}><button style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}} onClick={onClose}>←</button><div style={{fontWeight:600,fontSize:16}}>📥 Import Customers</div></div>
    {step==="upload"&&<div><button style={{...S.btnCancel,width:"100%",marginBottom:14}} onClick={downloadTemplate}>📄 Download CSV Template</button><div style={{background:"#e8f5ee",borderRadius:10,padding:12,marginBottom:14,fontSize:12,color:"#1a6b3c"}}>Columns: code | name | phone | address | group_name | subgroup_name | brand_name | qty | rate | opening_balance<br/><br/>• group_name & subgroup_name auto-created if not found<br/>• Code format: BUILDINGCODE-ROOMNO e.g. SA-504</div><label style={{display:"block",border:"2px dashed #1a6b3c",borderRadius:12,padding:"32px 20px",textAlign:"center",cursor:"pointer"}}><div style={{fontSize:40,marginBottom:8}}>📊</div><div style={{fontSize:15,fontWeight:500,color:"#1a6b3c"}}>Tap to select CSV file</div><input type="file" accept=".csv" style={{display:"none"}} onChange={handleFile}/></label></div>}
    {step==="preview"&&<div><div style={{background:"#e8f5ee",borderRadius:10,padding:14,marginBottom:14}}><div style={{fontWeight:600,color:"#1a6b3c"}}>✅ {rows.length} customers ready</div></div>{rows.slice(0,5).map((r,i)=><div key={i} style={S.listCard}><Avatar name={r.name} size={36}/><div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{r.name}</div><div style={{fontSize:12,color:"#888"}}>{r.code} • {r.group_name} • {r.subgroup_name}</div></div></div>)}{rows.length>5&&<div style={{textAlign:"center",fontSize:13,color:"#888",padding:8}}>...and {rows.length-5} more</div>}<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}><button style={S.btnCancel} onClick={()=>setStep("upload")}>← Back</button><button style={S.btnSave} onClick={runImport}>Import {rows.length}</button></div></div>}
    {step==="importing"&&<div style={{textAlign:"center",padding:"40px 20px"}}><div style={{fontSize:48,marginBottom:16}}>⏳</div><div style={{fontSize:18,fontWeight:600,color:"#1a6b3c"}}>Importing...</div></div>}
    {step==="done"&&result&&<div style={{textAlign:"center",padding:"32px 20px"}}><div style={{fontSize:64}}>🎉</div><div style={{fontSize:22,fontWeight:700,color:"#1a6b3c",marginBottom:12}}>Done!</div><div style={{display:"flex",gap:12,justifyContent:"center",marginBottom:8}}><div style={S.statBox}><div style={S.statBoxNum}>{result.success}</div><div style={S.statBoxLabel}>Imported</div></div>{result.failed>0&&<div style={S.statBox}><div style={{...S.statBoxNum,color:"#c62828"}}>{result.failed}</div><div style={S.statBoxLabel}>Failed</div></div>}</div>{result.errors.map((e,i)=><div key={i} style={{fontSize:12,color:"#c62828",marginBottom:3}}>• {e}</div>)}<button style={{...S.btnSave,padding:"14px 40px",marginTop:12}} onClick={onDone}>✅ Done</button></div>}
  </div></div>);
}

function DailyRecords(){
  const [date,setDate]=useState(todayIST()); const [entries,setEntries]=useState([]); const [custEntries,setCustEntries]=useState([]); const [customers,setCustomers]=useState([]); const [loading,setLoading]=useState(false);
  useEffect(()=>{load();},[date]);
  const load=async()=>{setLoading(true);try{const [custs,oe,ce]=await Promise.all([getCustomers(),getDailyEntriesForDate(date),db("customer_entries","GET",null,`?entry_date=eq.${date}&select=customer_id,quantity`)]);setCustomers(custs||[]);setEntries(oe||[]);setCustEntries(ce||[]);}catch{setEntries([]);}setLoading(false);};
  const total=entries.reduce((s,e)=>s+(parseFloat(e.quantity)||0),0);
  const custMap={};(custEntries||[]).forEach(e=>{custMap[e.customer_id]=e.quantity;});
  return(<div style={{padding:16}}>
    <div style={S.sectionTitle}>📋 Daily Records</div>
    <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...S.formInput,marginBottom:12}}/>
    <div style={S.statsGrid}><StatCard label="Owner Entries" value={entries.length} icon="📝" color="#1a6b3c"/><StatCard label="Total Litres" value={total.toFixed(1)+"L"} icon="🥛" color="#1565C0"/></div>
    {loading?<Loader/>:entries.length===0?<EmptyState icon="📋" message="No entries for this date"/>:entries.map((e,i)=>{
      const custQty=custMap[e.customer_id];
      const mismatch=custQty!==undefined&&parseFloat(custQty)!==parseFloat(e.quantity);
      return(<div key={i} style={{...S.listCard,border:`0.5px solid ${mismatch?"#ffc107":"#eee"}`}}>
        <Avatar name={e.customers?.name||""} size={36}/>
        <div style={{flex:1}}>
          <div style={{fontWeight:500,fontSize:14}}>{e.customers?.name||"—"}</div>
          <div style={{fontSize:12,color:"#888"}}>{e.customers?.code}</div>
          <div style={{fontSize:12,marginTop:2}}>
            <span style={{color:"#1a6b3c"}}>Owner: {e.quantity}L</span>
            {custQty!==undefined&&<span style={{color:mismatch?"#c62828":"#888",marginLeft:8}}>{mismatch?"⚠️":""} Customer: {custQty}L</span>}
            {custQty===undefined&&<span style={{color:"#bbb",marginLeft:8}}>Customer: not recorded</span>}
          </div>
          {mismatch&&<div style={{fontSize:11,color:"#c62828",fontWeight:600}}>⚠️ Mismatch — owner vs customer differs</div>}
        </div>
        <div style={{fontWeight:600,color:parseFloat(e.quantity)===0?"#c62828":"#1a6b3c",fontSize:16}}>{parseFloat(e.quantity)===0?"🚫":e.quantity+"L"}</div>
      </div>);
    })}
  </div>);
}

// ─── BILL DETAIL VIEW ─────────────────────────────────────────────────────────
function BillDetailView({bill,customer,month,year,entries=[],editable=false,onEntryEdit=null}){
  const totalLitres=parseFloat(bill?.total_litres||0); const monthAmt=parseFloat(bill?.month_amount||0);
  const outstanding=parseFloat(bill?.outstanding||0); const totalDue=parseFloat(bill?.total_amount||0);
  const brand=customer?.milk_brands||null; const rate=customer?.custom_rate||brand?.rate||0;
  return(
    <div style={{background:"#f0ebe0",padding:"16px 12px 40px"}}>
      <div style={{background:"white",borderRadius:6,boxShadow:"0 8px 48px #00000020",overflow:"hidden",maxWidth:480,margin:"0 auto"}}>
        <div style={{background:"linear-gradient(160deg,#1a2744 0%,#0f1a38 100%)",padding:"20px 20px 16px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-40,right:-40,width:140,height:140,borderRadius:"50%",background:"#ffffff07"}}/>
          <div style={{display:"flex",alignItems:"center",gap:14,position:"relative",zIndex:1}}>
            <div style={{width:72,height:72,borderRadius:"50%",border:"2px solid #d4a843",background:"white",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><img src={logo_app} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="logo"/></div>
            <div><div style={{fontSize:8,letterSpacing:3,color:"#ffffff45",textTransform:"uppercase",marginBottom:2}}>Official Milk Bill</div><div style={{fontFamily:"serif",fontSize:19,fontWeight:700,color:"white",lineHeight:1.15}}><span style={{color:"#d4a843"}}>Sai</span>krishna<br/>Milk Supply</div><div style={{fontSize:10,color:"#ffffff50",marginTop:4}}>UPI: {UPI_ID}</div></div>
          </div>
          <div style={{height:1,background:"linear-gradient(90deg,transparent,#ffffff20,transparent)",margin:"14px 0",position:"relative",zIndex:1}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",position:"relative",zIndex:1}}>
            <div><div style={{fontSize:8,letterSpacing:2,color:"#ffffff40",textTransform:"uppercase",marginBottom:2}}>Billed To</div><div style={{fontFamily:"serif",fontSize:16,color:"white",fontWeight:600}}>{customer?.name||"Customer"}</div><div style={{fontSize:10,color:"#d4a843",marginTop:1}}>Code: #{customer?.code}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:8,letterSpacing:2,color:"#ffffff40",textTransform:"uppercase",marginBottom:2}}>Period</div><div style={{fontSize:11,color:"#ffffffcc",fontWeight:500}}>{monthLabel(month,year)}</div></div>
          </div>
        </div>
        <div style={{display:"flex",background:"#f8f4e8",borderBottom:"1px solid #e8dfc8"}}>
          {[[totalLitres.toFixed(1)+"L","Litres"],[rate?"₹"+rate+"/L":"—","Rate"],[entries.filter(e=>parseFloat(e.quantity)>0).length||"—","Days"],[(brand?.name||"—").slice(0,6),"Brand"]].map(([v,l],i)=>(
            <div key={i} style={{flex:1,padding:"10px 4px",textAlign:"center",borderRight:i<3?"1px solid #e8dfc8":"none"}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1a2744"}}>{v}</div><div style={{fontSize:10,color:"#888"}}>{l}</div>
            </div>
          ))}
        </div>
        {entries.length>0&&(
          <div style={{padding:"0 0 8px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px 6px"}}><div style={{fontSize:12,fontWeight:700,color:"#1a2744"}}>Day-wise Delivery</div>{editable&&<div style={{fontSize:11,color:"#888"}}>Tap a row to edit</div>}<div style={{flex:1,height:1,background:"#e8dfc8"}}/></div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#f8f4e8"}}>{["Date","Qty","Amount",""].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#888",fontWeight:600,fontSize:11}}>{h}</th>)}</tr></thead>
              <tbody>{entries.map((e,i)=>(
                <tr key={i} style={{borderBottom:"0.5px solid #f5f0e8",cursor:editable?"pointer":"default",background:"white"}} onClick={()=>editable&&onEntryEdit&&onEntryEdit(e)}>
                  <td style={{padding:"6px 10px",color:"#555",fontSize:11}}>{fmtDate(e.entry_date)}</td>
                  <td style={{padding:"6px 10px",fontWeight:600,color:parseFloat(e.quantity)===0?"#c62828":"#1a2744"}}>{parseFloat(e.quantity)===0?"0 L":e.quantity+" L"}</td>
                  <td style={{padding:"6px 10px",color:"#555"}}>₹{e.amount||0}</td>
                  <td style={{padding:"6px 10px",color:"#1565C0",fontSize:11}}>{editable?"✏️":""}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div style={{padding:"8px 16px 16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:"#1a2744"}}>Bill Summary</div><div style={{flex:1,height:1,background:"#e8dfc8"}}/></div>
          {[["Total Litres",totalLitres.toFixed(1)+" L"],["Month Total",fmtCurrency(monthAmt)]].map(([l,v])=>(<div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8,color:"#555"}}><span>{l}</span><span style={{fontWeight:500}}>{v}</span></div>))}
          {outstanding>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8,color:"#c0392b"}}><span>⚠ Previous Outstanding</span><span>+ {fmtCurrency(outstanding)}</span></div>}
          <div style={{borderTop:"2px solid #1a2744",marginTop:8,paddingTop:10,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:15}}>Total Amount Due</span><span style={{fontWeight:800,fontSize:20,color:"#c0392b"}}>{fmtCurrency(totalDue)}</span></div>
        </div>
        <div style={{background:"#f8f4e8",borderTop:"1px solid #e8dfc8",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontFamily:"serif",fontSize:13,fontWeight:700}}><span style={{color:"#b8860b"}}>Sai</span>krishna Milk Supply</div><div style={{fontSize:11,color:"#888"}}>Pure Milk • Pure Love • Pure Life</div></div>
          <div style={{textAlign:"right",fontSize:11,color:"#888"}}>Thank you 🙏</div>
        </div>
      </div>
    </div>
  );
}

// ─── ENTRY EDIT MODAL ─────────────────────────────────────────────────────────
function EntryEditModal({entry,customer,brands,onSave,onClose}){
  const [qty,setQty]=useState(entry?.quantity||0); const [saving,setSaving]=useState(false);
  const brand=brands.find(b=>b.id===customer?.brand_id);
  const rate=customer?.custom_rate||brand?.rate||0;
  const save=async()=>{setSaving(true);try{await saveEntry(customer.id,qty,customer.brand_id,rate,entry.entry_date);onSave();}catch(e){alert("Error: "+e.message);}setSaving(false);};
  return(<div style={S.modalBg} onClick={onClose}><div style={S.modal} onClick={e=>e.stopPropagation()}>
    <div style={S.modalHandle}/>
    <div style={S.modalName}>✏️ Edit Entry</div>
    <div style={S.modalMeta}>{fmtDateFull(entry?.entry_date)} • {customer?.name}</div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,margin:"20px 0"}}>
      <button style={{width:44,height:44,borderRadius:"50%",background:"#f0f0f0",border:"0.5px solid #ddd",fontSize:22,cursor:"pointer"}} onClick={()=>setQty(q=>Math.max(0,+(q-0.5).toFixed(1)))}>−</button>
      <div style={{textAlign:"center"}}><div style={{fontSize:32,fontWeight:700,color:"#1a6b3c"}}>{qty}L</div><div style={{fontSize:12,color:"#888"}}>₹{(qty*rate).toFixed(0)}</div></div>
      <button style={{width:44,height:44,borderRadius:"50%",background:"#1a2744",border:"none",color:"white",fontSize:22,cursor:"pointer"}} onClick={()=>setQty(q=>+(q+0.5).toFixed(1))}>+</button>
    </div>
    <div style={S.modalActions}><button style={S.btnCancel} onClick={onClose}>Cancel</button><button style={S.btnSave} onClick={save} disabled={saving}>{saving?"Saving...":"Save Changes"}</button></div>
  </div></div>);
}

function BillingSection(){
  const now=new Date(new Date().getTime()+(5.5*60*60*1000));
  const [month,setMonth]=useState(now.getMonth()+1); const [year,setYear]=useState(now.getFullYear());
  const [bills,setBills]=useState([]); const [customers,setCustomers]=useState([]); const [brands,setBrands]=useState([]);
  const [loading,setLoading]=useState(false); const [generating,setGenerating]=useState(false);
  const [previewBill,setPreviewBill]=useState(null); const [previewEntries,setPreviewEntries]=useState([]);
  const [editEntry,setEditEntry]=useState(null); const [editCustomer,setEditCustomer]=useState(null);
  const [sendingAll,setSendingAll]=useState(false); const [filter,setFilter]=useState("all");

  useEffect(()=>{loadAll();},[month,year]);
  const loadAll=async()=>{setLoading(true);try{const [b,c,br]=await Promise.all([getBills(month,year),getCustomers(),getBrands()]);setBills(b||[]);setCustomers(c||[]);setBrands(br||[]);}catch{setBills([]);}setLoading(false);};

  const openPreview=async(bill)=>{
    const cust=customers.find(c=>c.id===bill.customer_id);
    const entries=await getMonthOwnerEntries(bill.customer_id,month,year);
    setPreviewBill(bill); setPreviewEntries(entries||[]); setEditCustomer(cust||null);
  };

  const generateAll=async()=>{
    setGenerating(true);
    try{
      for(const c of customers){await generateBillForCustomer(c.id,month,year,customers);}
      await loadAll(); alert(`✅ Bills generated/updated for ${monthLabel(month,year)}!`);
    }catch(e){alert("Error: "+e.message);}
    setGenerating(false);
  };

  const billWAMsg=bill=>{const cust=customers.find(c=>c.id===bill.customer_id);const phone=(cust?.phone||"").replace(/\D/g,"");const portalLink=`${BASE_URL}/c/${cust?.code}`;const msg=`🥛 Saikrishna Milk Supply\nDear ${cust?.name},\n\nYour ${monthLabel(month,year)} milk bill is now ready.\n📋 Total Milk Supplied: ${parseFloat(bill.total_litres||0).toFixed(1)} Litres\n💰 Total Amount Due: ₹${bill.total_amount}\n\n👉 View your dashboard: ${portalLink}\n\nFrom your dashboard you can:\n• Record your daily milk from now onwards\n• View your detailed day-wise bill\n• Pay bills directly through the portal\n\nWe are happy to introduce this new digital system to provide you with better service, transparency, and convenience.\n\nThank you for your continued trust and support 🙏\n\nUPI: ${UPI_ID}\nAfter paying, please share payment screenshot on WhatsApp to confirm ✅`;return{phone,msg};};
  const sendBillWA=bill=>{const{phone,msg}=billWAMsg(bill);window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`,"_blank");};
  const sendAll=async()=>{const pending=bills.filter(b=>b.status!=="paid");if(!pending.length){alert("All paid!");return;}if(!window.confirm(`Send ${pending.length} bills?`))return;setSendingAll(true);for(let i=0;i<pending.length;i++){sendBillWA(pending[i]);await new Promise(r=>setTimeout(r,2500));}setSendingAll(false);};

  const filteredBills=bills.filter(b=>filter==="all"||b.status===filter||(filter==="pending"&&b.status!=="paid"));
  const totalAmt=bills.reduce((s,b)=>s+(parseFloat(b.total_amount)||0),0);
  const paidCount=bills.filter(b=>b.status==="paid").length;

  return(<div style={{padding:16}}>
    <div style={S.sectionTitle}>🧾 Billing</div>
    <div style={{display:"flex",gap:8,marginBottom:12}}>
      <select style={{...S.formInput,flex:1,marginBottom:0}} value={month} onChange={e=>setMonth(parseInt(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2024,i,1).toLocaleDateString("en-IN",{month:"long"})}</option>)}</select>
      <select style={{...S.formInput,flex:0.6,marginBottom:0}} value={year} onChange={e=>setYear(parseInt(e.target.value))}>{YEARS.map(y=><option key={y}>{y}</option>)}</select>
      <button style={{...S.btnPrimary,whiteSpace:"nowrap"}} onClick={generateAll} disabled={generating}>{generating?"⏳...":"⚡ Generate"}</button>
    </div>
    <div style={S.statsGrid}><StatCard label="Bills" value={bills.length} icon="🧾" color="#1565C0"/><StatCard label="Total" value={fmtCurrency(totalAmt)} icon="💰" color="#1a6b3c"/><StatCard label="Paid" value={paidCount} icon="✅" color="#2E7D32"/><StatCard label="Pending" value={bills.length-paidCount} icon="⏳" color="#c62828"/></div>
    {bills.length-paidCount>0&&<button style={{...S.btnPrimary,width:"100%",padding:13,marginBottom:12,fontSize:14}} onClick={sendAll} disabled={sendingAll}>{sendingAll?"📤 Sending...":"📤 Send All Pending Bills via WhatsApp"}</button>}
    <div style={S.filterRow}>{[["all","All"],["pending","Pending"],["paid","Paid"]].map(([f,l])=>(<button key={f} style={{...S.filterChip,...(filter===f?S.filterChipActive:{})}} onClick={()=>setFilter(f)}>{l}</button>))}</div>
    {loading?<Loader/>:filteredBills.length===0?<EmptyState icon="🧾" message="No bills. Click Generate."/>:filteredBills.map((b,i)=>{
      const cust=customers.find(c=>c.id===b.customer_id);
      return(<div key={i} style={S.listCard}><Avatar name={cust?.name||""} size={40}/><div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{cust?.name}</div><div style={{fontSize:12,color:"#888"}}>{cust?.code} • {parseFloat(b.total_litres||0).toFixed(1)}L</div>{parseFloat(b.outstanding||0)>0&&<div style={{fontSize:11,color:"#c62828"}}>+{fmtCurrency(b.outstanding)} outstanding</div>}</div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><div style={{fontWeight:600,fontSize:15}}>{fmtCurrency(b.total_amount)}</div><StatusBadge status={b.status}/><div style={{display:"flex",gap:4,marginTop:2}}><button style={{fontSize:11,padding:"3px 8px",background:"#e8f5ee",border:"0.5px solid #b8dfc8",borderRadius:8,color:"#1a6b3c",cursor:"pointer"}} onClick={()=>openPreview(b)}>👁 View</button>{b.status!=="paid"&&<button style={{fontSize:11,padding:"3px 8px",background:"#e7f3ff",border:"0.5px solid #b3d4f5",borderRadius:8,color:"#1565C0",cursor:"pointer"}} onClick={()=>sendBillWA(b)}>📤</button>}</div></div></div>);
    })}

    {previewBill&&(<div style={{...S.modalBg,alignItems:"flex-start",overflowY:"auto"}} onClick={()=>{setPreviewBill(null);setPreviewEntries([]);}}>
      <div style={{...S.modal,borderRadius:0,minHeight:"100vh",paddingBottom:40,padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"white",borderBottom:"0.5px solid #eee"}}>
          <button style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}} onClick={()=>{setPreviewBill(null);setPreviewEntries([]);}}>←</button>
          <div style={{fontWeight:600,fontSize:16,flex:1}}>Bill — {editCustomer?.name}</div>
          <button style={{...S.btnPrimary,padding:"8px 14px",fontSize:13}} onClick={()=>sendBillWA(previewBill)}>📤 Send</button>
        </div>
        <BillDetailView bill={previewBill} customer={editCustomer} month={month} year={year} entries={previewEntries} editable={true} onEntryEdit={e=>{setEditEntry(e);}}/>
      </div>
    </div>)}

    {editEntry&&editCustomer&&(<EntryEditModal entry={editEntry} customer={editCustomer} brands={brands} onSave={async()=>{setEditEntry(null);const entries=await getMonthOwnerEntries(editCustomer.id,month,year);setPreviewEntries(entries||[]);await generateBillForCustomer(editCustomer.id,month,year,customers);await loadAll();}} onClose={()=>setEditEntry(null)}/>)}
  </div>);
}

function PaymentTracking(){
  const [payments,setPayments]=useState([]); const [customers,setCustomers]=useState([]); const [filter,setFilter]=useState("pending_confirmation"); const [loading,setLoading]=useState(true);
  const [showCash,setShowCash]=useState(false); const [cashForm,setCashForm]=useState({customer_id:"",amount:"",note:""});
  useEffect(()=>{loadAll();},[]);
  const loadAll=async()=>{setLoading(true);try{const [p,c]=await Promise.all([getPayments(),getCustomers()]);setPayments(p||[]);setCustomers(c||[]);}catch{setPayments([]);setCustomers([]);}setLoading(false);};
  const doConfirm=async p=>{try{await confirmPayment(p.id,p.bill_id);loadAll();}catch(e){alert("Error: "+e.message);}};
  const doReject=async p=>{if(!window.confirm("Reject this payment?"))return;try{await rejectPayment(p.id);loadAll();}catch(e){alert("Error: "+e.message);}};
  const doMarkCash=async()=>{if(!cashForm.customer_id||!cashForm.amount){alert("Select customer and enter amount");return;}try{await addPayment({customer_id:cashForm.customer_id,amount:parseFloat(cashForm.amount),payment_method:"cash",status:"confirmed",notes:cashForm.note||"Cash payment"});setCashForm({customer_id:"",amount:"",note:""});setShowCash(false);loadAll();}catch(e){alert("Error: "+e.message);}};
  const pendingCount=payments.filter(p=>p.status==="pending_confirmation").length;
  const filtered=payments.filter(p=>filter==="all"||p.status===filter);
  return(<div style={{padding:16}}>
    <div style={S.sectionTitle}>💳 Payment Tracking</div>
    <div style={S.statsGrid}><StatCard label="Awaiting Review" value={pendingCount} icon="⏳" color={pendingCount>0?"#c62828":"#1a6b3c"}/><StatCard label="Total Records" value={payments.length} icon="📋" color="#1565C0"/></div>
    <div style={{display:"flex",gap:8,marginBottom:14}}><button style={{flex:1,background:"#f0f4ff",border:"0.5px solid #c5d5f5",borderRadius:10,padding:"10px 8px",fontSize:13,color:"#1565C0",cursor:"pointer"}} onClick={()=>setShowCash(true)}>💵 Mark Cash Paid</button></div>
    {pendingCount>0&&<div style={S.alertBox}><span style={{fontSize:20}}>⚠️</span><div><div style={{fontWeight:500,fontSize:14}}>{pendingCount} payment{pendingCount>1?"s":""} waiting</div><div style={{fontSize:12,color:"#856404"}}>Check GPay/PhonePe and confirm below</div></div></div>}
    <div style={S.filterRow}>{[["pending_confirmation",`⏳ Review (${pendingCount})`],["confirmed","✅ Confirmed"],["rejected","❌ Rejected"],["all","All"]].map(([f,l])=>(<button key={f} style={{...S.filterChip,...(filter===f?S.filterChipActive:{})}} onClick={()=>setFilter(f)}>{l}</button>))}</div>
    {loading?<Loader/>:filtered.length===0?<EmptyState icon="💳" message="No payments found"/>:filtered.map((p,i)=>(<div key={i} style={S.listCard}><Avatar name={p.customers?.name||""} size={40}/><div style={{flex:1,minWidth:0}}><div style={{fontWeight:500,fontSize:14}}>{p.customers?.name}</div><div style={{fontSize:12,color:"#888"}}>{p.customers?.code} • {p.payment_method} • {fmtDate(p.payment_date)}</div>{p.notes&&<div style={{fontSize:11,color:"#888",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.notes}</div>}</div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><div style={{fontWeight:700,fontSize:16,color:"#1a6b3c"}}>{fmtCurrency(p.amount)}</div><StatusBadge status={p.status}/>{p.status==="pending_confirmation"&&<div style={{display:"flex",gap:4,marginTop:2}}><button style={{fontSize:11,padding:"3px 8px",background:"#d4edda",border:"0.5px solid #b8dfc8",borderRadius:8,color:"#155724",cursor:"pointer"}} onClick={()=>doConfirm(p)}>✅ Confirm</button><button style={{fontSize:11,padding:"3px 8px",background:"#f8d7da",border:"0.5px solid #f5c6cb",borderRadius:8,color:"#721c24",cursor:"pointer"}} onClick={()=>doReject(p)}>❌ Reject</button></div>}</div></div>))}
    {showCash&&(<div style={S.modalBg} onClick={()=>setShowCash(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalHandle}/><div style={S.modalName}>💵 Mark Cash Paid</div><label style={S.formLabel}>Customer</label><select style={S.formInput} value={cashForm.customer_id} onChange={e=>setCashForm(p=>({...p,customer_id:e.target.value}))}><option value="">Select customer...</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select><label style={S.formLabel}>Amount (₹)</label><input style={S.formInput} type="number" value={cashForm.amount} onChange={e=>setCashForm(p=>({...p,amount:e.target.value}))}/><label style={S.formLabel}>Note (optional)</label><input style={S.formInput} value={cashForm.note} onChange={e=>setCashForm(p=>({...p,note:e.target.value}))}/><div style={S.modalActions}><button style={S.btnCancel} onClick={()=>setShowCash(false)}>Cancel</button><button style={S.btnSave} onClick={doMarkCash}>Record Cash</button></div></div></div>)}
  </div>);
}

function ReportsSection(){
  const [sub,setSub]=useState("procurement");
  return(<div style={{padding:16}}><div style={S.sectionTitle}>📊 Reports</div><div style={S.filterRow}>{[["procurement","🥛 Procurement"],["reminders","⏰ Reminders"],["inactive","😴 Inactive"],["export","📤 Export"]].map(([id,label])=>(<button key={id} style={{...S.filterChip,...(sub===id?S.filterChipActive:{})}} onClick={()=>setSub(id)}>{label}</button>))}</div>{sub==="procurement"&&<ProcurementEstimate/>}{sub==="reminders"&&<PaymentReminders/>}{sub==="inactive"&&<InactiveCustomers/>}{sub==="export"&&<ExportSection/>}</div>);
}

function ProcurementEstimate(){
  const [customers,setCustomers]=useState([]); const [brands,setBrands]=useState([]); const [todayE,setTodayE]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([getCustomers(),getBrands(),getTodayEntries()]).then(([c,b,e])=>{setCustomers(c||[]);setBrands(b||[]);setTodayE(e||[]);setLoading(false);}).catch(()=>setLoading(false));},[]);
  const hasActual=todayE.length>0;
  const byBrand={};
  if(hasActual){todayE.forEach(e=>{const cust=customers.find(c=>c.id===e.customer_id);const b=brands.find(br=>br.id===cust?.brand_id);const name=b?.name||"Unknown";if(!byBrand[name])byBrand[name]={qty:0,count:0};byBrand[name].qty+=parseFloat(e.quantity)||0;byBrand[name].count++;});}
  else{customers.forEach(c=>{const b=brands.find(br=>br.id===c.brand_id);const name=b?.name||"Unknown";if(!byBrand[name])byBrand[name]={qty:0,count:0};byBrand[name].qty+=parseFloat(c.default_qty)||0;byBrand[name].count++;});}
  const total=Object.values(byBrand).reduce((s,b)=>s+b.qty,0);
  if(loading)return<Loader/>; if(customers.length===0)return<EmptyState icon="🥛" message="No customers yet"/>;
  return(<div style={{marginTop:8}}><div style={{background:"#e8f5ee",border:"1px solid #b8dfc8",borderRadius:10,padding:14,marginBottom:8}}><div style={{fontWeight:600,fontSize:15,color:"#1a6b3c"}}>{hasActual?"Today's Actual Delivery":"Tomorrow's Planned Order"}</div><div style={{fontSize:28,fontWeight:700,color:"#1a6b3c",marginTop:4}}>{total.toFixed(1)} Litres</div><div style={{fontSize:12,color:hasActual?"#1a6b3c":"#856404",marginTop:2}}>{hasActual?"✅ Actual delivered quantities":"📋 Planned (no entries yet today)"}</div></div>{Object.entries(byBrand).map(([name,data])=>(<div key={name} style={S.listCard}><div style={{flex:1}}><div style={{fontWeight:500}}>{name}</div><div style={{fontSize:12,color:"#888"}}>{data.count} customers</div></div><div style={{fontWeight:700,fontSize:18,color:"#1a6b3c"}}>{data.qty.toFixed(1)}L</div></div>))}<button style={{...S.btnPrimary,width:"100%",padding:12,marginTop:8}} onClick={()=>{const lines=Object.entries(byBrand).map(([n,d])=>`• ${n}: ${d.qty.toFixed(1)}L`).join("\n");window.open(`https://wa.me/?text=${encodeURIComponent(`🥛 ${hasActual?"Today's Actual":"Tomorrow's Milk Order"}\n\n${lines}\n\nTotal: ${total.toFixed(1)}L\n\n— Saikrishna Milk Supply`)}`,"_blank");}}>📤 Send Order to Supplier via WhatsApp</button></div>);
}

function InactiveCustomers(){
  const [inactive,setInactive]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{load();},[]);
  const load=async()=>{setLoading(true);try{const cutoff=new Date(new Date().getTime()+(5.5*60*60*1000)-7*86400000).toISOString().split("T")[0];const [custs,recent]=await Promise.all([getCustomers(),db("daily_entries","GET",null,`?entry_date=gte.${cutoff}&select=customer_id`)]);const activeIds=new Set((recent||[]).map(e=>e.customer_id));setInactive((custs||[]).filter(c=>!activeIds.has(c.id)));}catch{setInactive([]);}setLoading(false);};
  if(loading)return<Loader/>;
  return(<div style={{marginTop:8}}><div style={{background:inactive.length>0?"#fff3cd":"#e8f5ee",border:`1px solid ${inactive.length>0?"#ffc107":"#b8dfc8"}`,borderRadius:10,padding:12,marginBottom:14}}><div style={{fontWeight:500,fontSize:14,color:inactive.length>0?"#856404":"#1a6b3c"}}>{inactive.length>0?`⚠️ ${inactive.length} customers — no delivery in 7+ days`:"✅ All customers active"}</div></div>{inactive.length===0?<EmptyState icon="✅" message="All customers received delivery recently"/>:inactive.map((c,i)=>(<div key={i} style={S.listCard}><Avatar name={c.name} size={40}/><div style={{flex:1}}><div style={{fontWeight:500}}>{c.name}</div><div style={{fontSize:12,color:"#888"}}>{c.code} • {c.default_qty}L/day</div></div><a href={`https://wa.me/91${(c.phone||"").replace(/\D/g,"")}`} style={{fontSize:12,padding:"6px 10px",background:"#e8f5ee",border:"0.5px solid #b8dfc8",borderRadius:8,color:"#1a6b3c",textDecoration:"none"}}>📞</a></div>))}</div>);
}

function PaymentReminders(){
  const [bills,setBills]=useState([]); const [loading,setLoading]=useState(true);
  const ist=new Date(new Date().getTime()+(5.5*60*60*1000));
  const month=ist.getMonth()+1; const year=ist.getFullYear(); const day=ist.getDate();
  const level=day>=20?3:day>=15?2:day>=10?1:0;
  useEffect(()=>{getBills(month,year).then(d=>{setBills((d||[]).filter(b=>b.status!=="paid"));setLoading(false);}).catch(()=>setLoading(false));},[]);
  const getMsg=bill=>{const name=bill.customers?.name||"Customer";const amt=fmtCurrency(bill.total_amount);const url=`${BASE_URL}/c/${bill.customers?.code}`;if(level===1)return `🥛 Saikrishna Milk Supply\nDear ${name},\n\nGentle reminder — your ${monthLabel(month,year)} milk bill of *${amt}* is due.\n\nView & Pay: ${url}\n\nPlease share screenshot after payment ✅\n\n— Saikrishna Milk Supply`;if(level===2)return `🥛 Saikrishna Milk Supply\nDear ${name},\n\nYour milk bill of *${amt}* for ${monthLabel(month,year)} is still pending.\n\nView & Pay: ${url}\n\n— Saikrishna Milk Supply`;return `🥛 Saikrishna Milk Supply\nDear ${name},\n\nFinal reminder — *${amt}* milk bill is overdue. Will show as OUTSTANDING on next bill.\n\nPay now: ${url}\n\n— Saikrishna Milk Supply`;};
  const sendReminder=bill=>{const phone=(bill.customers?.phone||"").replace(/\D/g,"");window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(getMsg(bill))}`,"_blank");};
  const sendAll=async()=>{if(!window.confirm(`Send reminders to ${bills.length} customers?`))return;for(const b of bills){sendReminder(b);await new Promise(r=>setTimeout(r,2500));}};
  if(loading)return<Loader/>;
  return(<div style={{marginTop:8}}><div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:14,marginBottom:14}}><div style={{fontSize:13,color:"#888",marginBottom:8}}>Today is Day {day} of the month</div><div style={{display:"flex",gap:4}}>{[1,2,3].map(l=>(<div key={l} style={{flex:1,borderRadius:8,padding:"8px 6px",textAlign:"center",background:l<=level?"#1a6b3c":"#f5f5f5"}}><div style={{fontSize:11,color:l<=level?"white":"#888",fontWeight:500}}>Day {l===1?"10":l===2?"15":"20"}</div><div style={{fontSize:10,color:l<=level?"rgba(255,255,255,0.8)":"#bbb"}}>{l===1?"Gentle":l===2?"Firm":"Final"}</div></div>))}</div></div>{bills.length===0?<EmptyState icon="🎉" message="All customers have paid!"/>:<><button style={{...S.btnPrimary,width:"100%",padding:13,fontSize:14,marginBottom:14}} onClick={sendAll} disabled={level===0}>{level===0?"🔒 Reminders start Day 10":`📤 Send all reminders (${bills.length})`}</button>{bills.map((b,i)=>(<div key={i} style={S.listCard}><Avatar name={b.customers?.name||""} size={40}/><div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{b.customers?.name}</div><div style={{fontSize:12,color:"#888"}}>{fmtCurrency(b.total_amount)}</div></div><button style={{background:"#25D366",border:"none",borderRadius:10,padding:"8px 12px",color:"white",fontSize:12,cursor:"pointer"}} onClick={()=>sendReminder(b)}>📤 Remind</button></div>))}</>}</div>);
}

function ExportSection(){
  const [exporting,setExporting]=useState(null);
  const loadXLSX=async()=>{if(window.XLSX)return window.XLSX;await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});return window.XLSX;};
  const doExport=async type=>{setExporting(type);try{const XLSX=await loadXLSX();let rows=[];if(type==="customers"){const [c,b]=await Promise.all([getCustomers(),getBrands()]);rows=(c||[]).map(cu=>({Code:cu.code,Name:cu.name,Phone:cu.phone,Group:cu.areas?.name||"",Subgroup:cu.subgroups?.name||"",Brand:b.find(br=>br.id===cu.brand_id)?.name||"","Daily Qty":cu.default_qty,"Custom Rate":cu.custom_rate||"",Outstanding:cu.outstanding||0}));}else{const p=await getPayments();rows=(p||[]).map(pm=>({Date:pm.payment_date,Customer:pm.customers?.name||"",Code:pm.customers?.code||"",Amount:pm.amount,Method:pm.payment_method,Status:pm.status}));}const ws=XLSX.utils.json_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,type);XLSX.writeFile(wb,`MilkFlow_${type}_${todayIST()}.xlsx`);}catch(e){alert("Error: "+e.message);}setExporting(null);};
  return(<div style={{marginTop:8}}>{[["customers","👥","Customer List","All customers with rates and balances"],["payments","💳","Payment Records","All payments with status"]].map(([type,icon,label,desc])=>(<div key={type} style={S.listCard}><div style={{fontSize:28}}>{icon}</div><div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{label}</div><div style={{fontSize:12,color:"#888"}}>{desc}</div></div><button style={{...S.btnPrimary,padding:"8px 14px",fontSize:13,background:exporting===type?"#888":"#1a6b3c"}} onClick={()=>doExport(type)} disabled={!!exporting}>{exporting===type?"⏳...":"📥 Export"}</button></div>))}</div>);
}

function OwnerSettings(){
  const [sub,setSub]=useState("groups");
  return(<div style={{padding:16}}><div style={S.sectionTitle}>⚙️ Settings</div><div style={S.filterRow}>{[["groups","📍 Groups"],["brands","🥛 Brands"],["balance","⚖️ Balances"],["about","ℹ️ About"]].map(([id,label])=>(<button key={id} style={{...S.filterChip,...(sub===id?S.filterChipActive:{})}} onClick={()=>setSub(id)}>{label}</button>))}</div>{sub==="groups"&&<GroupsManager/>}{sub==="brands"&&<BrandManagement/>}{sub==="balance"&&<OpeningBalanceSetup/>}{sub==="about"&&<AboutSection/>}</div>);
}

function GroupsManager(){
  const [areas,setAreas]=useState([]); const [subgroups,setSubgroups]=useState([]); const [loading,setLoading]=useState(true);
  const [newGroup,setNewGroup]=useState({name:"",delivery_boy_name:""}); const [newSg,setNewSg]=useState({area_id:"",name:""});
  const [editGroup,setEditGroup]=useState(null); const [editSg,setEditSg]=useState(null);
  useEffect(()=>{load();},[]);
  const load=async()=>{setLoading(true);try{const [a,sg]=await Promise.all([getAreas(),getSubgroups()]);setAreas(a||[]);setSubgroups(sg||[]);}catch{}setLoading(false);};
  if(loading)return<Loader/>;
  return(<div style={{marginTop:8}}>
    <div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:14,marginBottom:12}}>
      <div style={{fontWeight:600,marginBottom:10}}>➕ Add Group</div>
      <input style={S.formInput} placeholder="Group name (e.g. JB Nagar)" value={newGroup.name} onChange={e=>setNewGroup(g=>({...g,name:e.target.value}))}/>
      <input style={S.formInput} placeholder="Delivery boy name (optional)" value={newGroup.delivery_boy_name} onChange={e=>setNewGroup(g=>({...g,delivery_boy_name:e.target.value}))}/>
      <button style={S.btnPrimary} onClick={async()=>{if(!newGroup.name.trim())return;await addArea(newGroup.name,newGroup.delivery_boy_name);setNewGroup({name:"",delivery_boy_name:""});load();}}>Add Group</button>
    </div>
    <div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:14,marginBottom:12}}>
      <div style={{fontWeight:600,marginBottom:10}}>➕ Add Subgroup / Building</div>
      <select style={S.formInput} value={newSg.area_id} onChange={e=>setNewSg(sg=>({...sg,area_id:e.target.value}))}><option value="">-- Select Group first --</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
      <input style={S.formInput} placeholder="Subgroup name (e.g. Sumit A Wing)" value={newSg.name} onChange={e=>setNewSg(sg=>({...sg,name:e.target.value}))}/>
      <button style={S.btnPrimary} onClick={async()=>{if(!newSg.area_id||!newSg.name.trim()){alert("Select group and enter subgroup name");return;}try{await addSubgroup(newSg.area_id,newSg.name);setNewSg({area_id:"",name:""});load();}catch(e){alert("Failed to add subgroup: "+e.message);}}}>Add Subgroup</button>
    </div>
    {areas.map(area=>{const areaSgs=subgroups.filter(sg=>sg.area_id===area.id);return(<div key={area.id} style={{marginBottom:10}}>
      <div style={{background:"#1a2744",color:"white",padding:"8px 12px",borderRadius:"8px 8px 0 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontWeight:700}}>📍 {area.name}{area.delivery_boy_name?" / "+area.delivery_boy_name:""}</span>
        <div style={{display:"flex",gap:6}}><button style={{background:"#d4a843",border:"none",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",color:"#1a2744",fontWeight:600}} onClick={()=>setEditGroup({...area})}>✏️</button><button style={{background:"#dc2626",border:"none",borderRadius:6,padding:"4px 8px",fontSize:11,cursor:"pointer",color:"white"}} onClick={async()=>{if(!confirm("Delete group and all its subgroups?"))return;try{await deleteArea(area.id);load();}catch(e){alert("Delete failed: "+e.message);}}}>🗑</button></div>
      </div>
      <div style={{border:"0.5px solid #eee",borderTop:"none",borderRadius:"0 0 8px 8px"}}>
        {areaSgs.length===0?<div style={{padding:"10px 12px",fontSize:13,color:"#888"}}>No subgroups yet. Add one above.</div>:areaSgs.map(sg=>(<div key={sg.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderBottom:"0.5px solid #f5f5f5"}}><span style={{fontSize:13}}>🏢 {sg.name}</span><div style={{display:"flex",gap:6}}><button style={{background:"#e8f0ff",border:"0.5px solid #c5d5f5",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer",color:"#1565C0"}} onClick={()=>setEditSg({...sg})}>✏️</button><button style={{background:"#fdf2f3",border:"0.5px solid #f5c6cb",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer",color:"#c62828"}} onClick={async()=>{if(!confirm("Delete subgroup?"))return;try{await deleteSubgroup(sg.id);load();}catch(e){alert("Delete failed: "+e.message);}}}>🗑</button></div></div>))}
      </div>
    </div>);})}
    {editGroup&&(<div style={S.modalBg} onClick={()=>setEditGroup(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalHandle}/><div style={S.modalName}>✏️ Edit Group</div><input style={S.formInput} value={editGroup.name} onChange={e=>setEditGroup(g=>({...g,name:e.target.value}))}/><input style={S.formInput} value={editGroup.delivery_boy_name||""} onChange={e=>setEditGroup(g=>({...g,delivery_boy_name:e.target.value}))} placeholder="Delivery boy name"/><div style={S.modalActions}><button style={S.btnCancel} onClick={()=>setEditGroup(null)}>Cancel</button><button style={S.btnSave} onClick={async()=>{await updateArea(editGroup.id,editGroup.name,editGroup.delivery_boy_name);setEditGroup(null);load();}}>Save</button></div></div></div>)}
    {editSg&&(<div style={S.modalBg} onClick={()=>setEditSg(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalHandle}/><div style={S.modalName}>✏️ Edit Subgroup</div><input style={S.formInput} value={editSg.name} onChange={e=>setEditSg(sg=>({...sg,name:e.target.value}))}/><div style={S.modalActions}><button style={S.btnCancel} onClick={()=>setEditSg(null)}>Cancel</button><button style={S.btnSave} onClick={async()=>{await updateSubgroup(editSg.id,editSg.name);setEditSg(null);load();}}>Save</button></div></div></div>)}
  </div>);
}

function BrandManagement(){
  const [brands,setBrands]=useState([]); const [loading,setLoading]=useState(true); const [showAdd,setShowAdd]=useState(false); const [editBrand,setEditBrand]=useState(null); const [form,setForm]=useState({name:"",rate:""}); const [saving,setSaving]=useState(false);
  useEffect(()=>{load();},[]);
  const load=async()=>{setLoading(true);try{setBrands(await getBrands()||[]);}catch{setBrands([]);}setLoading(false);};
  const doSave=async()=>{if(!form.name.trim()||!form.rate)return;setSaving(true);try{if(editBrand)await updateBrand(editBrand.id,form.name.trim(),form.rate);else await addBrand(form.name.trim(),form.rate);setShowAdd(false);setEditBrand(null);setForm({name:"",rate:""});load();}catch(e){alert("Error: "+e.message);}setSaving(false);};
  return(<div style={{marginTop:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontSize:14,color:"#555"}}>{brands.length} brands</div><button style={S.btnPrimary} onClick={()=>{setShowAdd(true);setEditBrand(null);setForm({name:"",rate:""});}}>+ Add Brand</button></div>{loading?<Loader/>:brands.length===0?<EmptyState icon="🥛" message="No brands yet"/>:brands.map((b,i)=>(<div key={b.id} style={S.listCard}><div style={{width:4,height:44,borderRadius:2,background:["#1a6b3c","#1565C0","#6a1b9a","#c62828"][i%4],flexShrink:0}}/><div style={{flex:1}}><div style={{fontWeight:500}}>{b.name}</div><div style={{fontSize:12,color:"#888"}}>₹{b.rate}/litre</div></div><div style={{display:"flex",gap:6}}><button style={{fontSize:12,padding:"5px 10px",background:"#e8f5ee",border:"0.5px solid #b8dfc8",borderRadius:8,color:"#1a6b3c",cursor:"pointer"}} onClick={()=>{setEditBrand(b);setForm({name:b.name,rate:String(b.rate)});setShowAdd(true);}}>✏️</button><button style={{fontSize:12,padding:"5px 10px",background:"#fdf2f3",border:"0.5px solid #f5c6cb",borderRadius:8,color:"#c62828",cursor:"pointer"}} onClick={async()=>{if(!confirm(`Remove "${b.name}"?`))return;await deleteBrand(b.id);load();}}>🗑</button></div></div>))}{showAdd&&(<div style={S.modalBg} onClick={()=>setShowAdd(false)}><div style={S.modal} onClick={e=>e.stopPropagation()}><div style={S.modalHandle}/><div style={S.modalName}>{editBrand?"Edit Brand":"Add Brand"}</div><label style={S.formLabel}>Brand Name</label><input style={S.formInput} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/><label style={S.formLabel}>Rate (₹/litre)</label><input style={S.formInput} type="text" inputMode="decimal" value={form.rate} onChange={e=>setForm(p=>({...p,rate:e.target.value}))}/><div style={S.modalActions}><button style={S.btnCancel} onClick={()=>setShowAdd(false)}>Cancel</button><button style={S.btnSave} onClick={doSave} disabled={saving}>{saving?"Saving...":"Save Brand"}</button></div></div></div>)}</div>);
}

function OpeningBalanceSetup(){
  const [customers,setCustomers]=useState([]); const [balances,setBalances]=useState({}); const [saving,setSaving]=useState(false); const [done,setDone]=useState(false); const [loading,setLoading]=useState(true);
  useEffect(()=>{getCustomers().then(d=>{setCustomers(d||[]);setLoading(false);}).catch(()=>setLoading(false));},[]);
  const saveAll=async()=>{setSaving(true);try{for(const c of customers){const bal=parseFloat(balances[c.id]!==undefined?balances[c.id]:c.outstanding||0);await updateCustomer(c.id,{outstanding:bal});}setDone(true);}catch(e){alert(e.message);}setSaving(false);};
  if(done)return<div style={{textAlign:"center",padding:32}}><div style={{fontSize:56}}>✅</div><div style={{fontSize:20,fontWeight:600,color:"#1a6b3c",marginTop:12}}>Balances Saved!</div></div>;
  return(<div style={{marginTop:8}}>{loading?<Loader/>:customers.map(c=>(<div key={c.id} style={S.listCard}><Avatar name={c.name} size={40}/><div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{c.name}</div><div style={{fontSize:12,color:"#888"}}>{c.code} • OB: {fmtCurrency(c.outstanding||0)}</div></div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:15,color:"#888"}}>₹</span><input type="text" inputMode="decimal" placeholder={String(c.outstanding||0)} value={balances[c.id]!==undefined?balances[c.id]:""} onChange={e=>setBalances(p=>({...p,[c.id]:e.target.value}))} style={{width:88,padding:"8px 10px",border:"0.5px solid #ddd",borderRadius:8,fontSize:15,textAlign:"right",background:"white",color:"#111"}}/></div></div>))}{customers.length>0&&<button style={{...S.btnSave,width:"100%",padding:14,marginTop:8}} onClick={saveAll} disabled={saving}>{saving?"Saving...":"✅ Save All Balances"}</button>}</div>);
}

function AboutSection(){
  return(<div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:16,marginTop:8}}><div style={{textAlign:"center",marginBottom:16}}><img src={logo_app} style={{width:72,height:72,borderRadius:14,objectFit:"contain"}} alt="logo"/><div style={{fontWeight:700,fontSize:16,marginTop:8}}>MilkFlow v3.3</div><div style={{fontSize:12,color:"#888"}}>Saikrishna Milk Supply</div></div>{[["UPI ID",UPI_ID],["Owner URL",window.location.origin+"/owner"],["Entry URL",window.location.origin+"/entry"],["Customer URL",window.location.origin+"/c/CODE"]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8,paddingBottom:8,borderBottom:"0.5px solid #f5f5f5"}}><span style={{color:"#888"}}>{k}</span><span style={{fontWeight:500,fontSize:11,color:"#555",wordBreak:"break-all",textAlign:"right",maxWidth:"60%"}}>{v}</span></div>))}</div>);
}

// ─── CUSTOMER PORTAL ─────────────────────────────────────────────────────────
function CustomerPortal({customerCode}){
  const [customer,setCustomer]=useState(null); const [loading,setLoading]=useState(true); const [tab,setTab]=useState("home");
  useEffect(()=>{load();},[]);
  const load=async()=>{setLoading(true);try{const custs=await db("customers","GET",null,`?code=eq.${customerCode}&limit=1&select=*,areas(name),subgroups(name),milk_brands(name,rate)`);setCustomer(custs?.[0]||null);}catch{}setLoading(false);};
  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:12}}><img src={logo_app} style={{width:72,height:72,borderRadius:16,objectFit:"contain"}} alt="loading"/><div style={{fontSize:14,color:"#888"}}>Loading...</div></div>;
  if(!customer)return<div style={{textAlign:"center",padding:60}}><div style={{fontSize:40}}>😕</div><div style={{fontWeight:600,fontSize:18,marginBottom:8}}>Customer not found</div><div style={{fontSize:13,color:"#888"}}>Your link should be:<br/>{BASE_URL}/c/YOUR_CODE</div></div>;
  const tabs=[["home","🏠","Home"],["records","📋","Records"],["bill","🧾","Bill"],["pay","💳","Pay"],["help","❓","Help"]];
  return(<div style={S.screen}>
    <div style={{background:"#1565C0",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
      <img src={logo_app} style={{width:36,height:36,borderRadius:8,objectFit:"contain",background:"white",padding:2}} alt="logo"/>
      <div style={{color:"white"}}><div style={{fontSize:14,fontWeight:500}}>Saikrishna Milk Supply</div><div style={{fontSize:12,opacity:0.85}}>Hi, {customer.name?.split(" ")[0]} 👋</div></div>
    </div>
    <div style={{flex:1,overflowY:"auto"}}>
      {tab==="home"&&<PortalHome customer={customer} setTab={setTab}/>}
      {tab==="records"&&<PortalRecords customer={customer}/>}
      {tab==="bill"&&<PortalBill customer={customer} setTab={setTab}/>}
      {tab==="pay"&&<PortalPay customer={customer}/>}
      {tab==="help"&&<PortalHelp/>}
    </div>
    <div style={S.bottomNav}>{tabs.map(([id,icon,label])=>(<button key={id} style={{...S.navBtn,...(tab===id?S.navBtnActiveBlue:{})}} onClick={()=>setTab(id)}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:10,marginTop:2}}>{label}</span></button>))}</div>
  </div>);
}

function PortalHome({customer,setTab}){
  const [bills,setBills]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{getAllCustomerBills(customer.id).then(b=>{setBills(b||[]);setLoading(false);}).catch(()=>setLoading(false));},[]);
  const latestBill=bills[0];
  const totalDue=bills.filter(b=>b.status!=="paid").reduce((s,b)=>s+(parseFloat(b.total_amount)||0),0);
  return(<div style={{padding:16}}>
    <div style={{fontSize:18,fontWeight:600,marginBottom:2}}>Hello, {customer?.name?.split(" ")[0]} 👋</div>
    <div style={{fontSize:13,color:"#888",marginBottom:16}}>Account: {customer?.code} • {todayIST()}</div>
    <div style={S.statsGrid}>
      <StatCard label="Daily Milk" value={(customer?.default_qty||1)+"L"} icon="🥛" color="#1565C0"/>
      <StatCard label="Bill Status" value={latestBill?.status==="paid"?"✅ Paid":"⏳ Due"} icon="🧾" color={latestBill?.status==="paid"?"#2E7D32":"#c62828"}/>
      <StatCard label="Total Due" value={fmtCurrency(totalDue)} icon="💰" color={totalDue>0?"#c62828":"#1a6b3c"}/>
      <StatCard label="Today" value={todayIST().split("-").slice(1).reverse().join(" ")} icon="📅" color="#6a1b9a"/>
    </div>
    {totalDue>0&&<div style={S.alertBox}><span style={{fontSize:18}}>💳</span><div><div style={{fontWeight:500,fontSize:14}}>Total Due: {fmtCurrency(totalDue)}</div><div style={{fontSize:12,color:"#856404"}}>Tap Pay to pay and confirm</div></div></div>}
    <div style={{display:"flex",gap:10,marginBottom:16}}>{[["🧾","View Bill","bill"],["💳","Pay Now","pay"],["📋","Records","records"]].map(([icon,label,t])=>(<button key={t} style={{flex:1,background:"white",border:"1px solid #eee",borderRadius:12,padding:"12px 6px",display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}} onClick={()=>setTab(t)}><span style={{fontSize:24}}>{icon}</span><span style={{fontSize:11,color:"#555",fontWeight:500}}>{label}</span></button>))}</div>
    <div style={{background:"#e8f5ee",border:"1px solid #b8dfc8",borderRadius:12,padding:12,fontSize:12,color:"#1a6b3c"}}>
      <strong>📱 Add to Home Screen</strong><br/>To access your milk account quickly daily, tap your browser's Share/Menu button and select <strong>"Add to Home Screen"</strong>. This saves your personal dashboard link directly.
    </div>
  </div>);
}

// ─── PORTAL RECORDS — inline +/- Save like Owner Register ────────────────────
function PortalRecords({customer}){
  const ist=new Date(new Date().getTime()+(5.5*60*60*1000));
  const [month,setMonth]=useState(ist.getMonth()+1); const [year,setYear]=useState(ist.getFullYear());
  const [custEntries,setCustEntries]=useState([]); const [loading,setLoading]=useState(true);
  const [qtys,setQtys]=useState({}); const [saving,setSaving]=useState({});

  useEffect(()=>{load();},[month,year]);
  const load=async()=>{
    setLoading(true);
    try{
      const e=await getMonthCustomerEntries(customer.id,month,year);
      setCustEntries(e||[]);
      const map={};(e||[]).forEach(en=>{map[en.entry_date]={qty:en.quantity,saved:true};});
      setQtys(map);
    }catch{}
    setLoading(false);
  };

  const adjust=(dateStr,delta,defaultQty)=>{
    setQtys(p=>{
      const cur=p[dateStr]?.qty??defaultQty;
      return {...p,[dateStr]:{qty:Math.max(0,+(cur+delta).toFixed(1)),saved:false}};
    });
  };
  const doSave=async(dateStr)=>{
    const e=qtys[dateStr]; if(!e)return;
    setSaving(p=>({...p,[dateStr]:true}));
    try{
      await saveCustomerEntry(customer.id,e.qty,dateStr);
      setQtys(p=>({...p,[dateStr]:{qty:e.qty,saved:true}}));
    }catch(err){alert("Error: "+err.message);}
    setSaving(p=>({...p,[dateStr]:false}));
  };

  const days=daysInMonth(month,year);
  const totalLitres=Object.values(qtys).filter(e=>e.saved).reduce((s,e)=>s+(parseFloat(e.qty)||0),0);
  const savedCount=Object.values(qtys).filter(e=>e.saved).length;

  return(<div style={{padding:16}}>
    <div style={S.sectionTitle}>📋 My Records</div>
    <div style={{background:"#e8f5ee",borderRadius:10,padding:10,marginBottom:12,fontSize:13,color:"#1a6b3c"}}>📝 You can record your daily milk here. Use +/- to adjust and ✓ to save.</div>
    <div style={{display:"flex",gap:8,marginBottom:12}}>
      <select style={{...S.formInput,flex:1,marginBottom:0}} value={month} onChange={e=>setMonth(+e.target.value)}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2024,i).toLocaleString("en-IN",{month:"long"})}</option>)}</select>
      <select style={{...S.formInput,flex:0.6,marginBottom:0}} value={year} onChange={e=>setYear(+e.target.value)}>{YEARS.map(y=><option key={y}>{y}</option>)}</select>
    </div>
    {/* Summary strip */}
    <div style={{display:"flex",gap:10,marginBottom:12}}>
      <div style={{flex:1,background:"white",border:"0.5px solid #eee",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
        <div style={{fontSize:20,fontWeight:700,color:"#1a6b3c"}}>{totalLitres.toFixed(1)}L</div>
        <div style={{fontSize:11,color:"#888"}}>Total Litres</div>
      </div>
      <div style={{flex:1,background:"white",border:"0.5px solid #eee",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
        <div style={{fontSize:20,fontWeight:700,color:"#1565C0"}}>{savedCount}/{days}</div>
        <div style={{fontSize:11,color:"#888"}}>Days Recorded</div>
      </div>
    </div>
    {loading?<Loader/>:<div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,overflow:"hidden"}}>
      {Array.from({length:days},(_,i)=>{
        const d=i+1;
        const dateStr=`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const isFuture=dateStr>todayIST();
        const isToday=dateStr===todayIST();
        const entry=qtys[dateStr];
        const qty=entry?.qty??customer.default_qty??1;
        const isSaved=entry?.saved===true;
        const isSaving=saving[dateStr];
        return(
          <div key={d} style={{display:"flex",alignItems:"center",padding:"8px 10px",borderBottom:"0.5px solid #f5f5f5",background:isToday?"#f0fff4":isSaved?"#f8fff8":"white",opacity:isFuture?0.35:1}}>
            {/* Date */}
            <div style={{width:28,textAlign:"center",fontWeight:isToday?700:400,fontSize:13,color:isToday?"#1a6b3c":"#555",flexShrink:0}}>{d}</div>
            <div style={{width:30,textAlign:"center",fontSize:10,color:"#aaa",flexShrink:0}}>{new Date(dateStr+"T00:00:00").toLocaleDateString("en-IN",{weekday:"short"})}</div>
            {/* Status */}
            <div style={{flex:1,paddingLeft:4}}>
              {isSaved
                ? <span style={{fontSize:12,color:parseFloat(qty)===0?"#c62828":"#1a6b3c",fontWeight:600}}>{parseFloat(qty)===0?"🚫 No milk":`✅ ${qty}L`}</span>
                : <span style={{fontSize:11,color:"#bbb"}}>Not recorded</span>}
            </div>
            {/* Controls — hidden for future dates */}
            {!isFuture&&<div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
              <button style={{width:28,height:28,borderRadius:"50%",background:"#f0f0f0",border:"0.5px solid #ddd",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}} onClick={()=>adjust(dateStr,-0.5,customer.default_qty??1)}>−</button>
              <span style={{fontWeight:700,fontSize:13,minWidth:30,textAlign:"center"}}>{qty}L</span>
              <button style={{width:28,height:28,borderRadius:"50%",background:"#1a2744",border:"none",color:"white",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}} onClick={()=>adjust(dateStr,0.5,customer.default_qty??1)}>+</button>
              <button style={{width:28,height:28,borderRadius:6,background:isSaved?"#d4edda":"#1a6b3c",border:"none",color:isSaved?"#155724":"white",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}} onClick={()=>doSave(dateStr)} disabled={isSaving}>
                {isSaving?"…":"✓"}
              </button>
            </div>}
          </div>
        );
      })}
    </div>}
  </div>);
}

// ─── PORTAL BILL — month list → detail ───────────────────────────────────────
function PortalBill({customer,setTab}){
  const [bills,setBills]=useState([]); const [loading,setLoading]=useState(true); const [selected,setSelected]=useState(null); const [entries,setEntries]=useState([]);
  useEffect(()=>{getAllCustomerBills(customer.id).then(b=>{setBills(b||[]);setLoading(false);}).catch(()=>setLoading(false));},[]);
  const openBill=async bill=>{const e=await getMonthOwnerEntries(customer.id,bill.month,bill.year);setEntries(e||[]);setSelected(bill);};
  if(loading)return<Loader/>;
  if(selected)return(<div>
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:"white",borderBottom:"0.5px solid #eee"}}>
      <button style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}} onClick={()=>setSelected(null)}>←</button>
      <div style={{fontWeight:600,fontSize:16}}>{monthLabel(selected.month,selected.year)}</div>
      <StatusBadge status={selected.status}/>
    </div>
    <div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:12,padding:14,margin:"12px 16px"}}><div style={{fontWeight:600,fontSize:14,color:"#856404",marginBottom:4}}>🔔 Important</div><div style={{fontSize:13,color:"#856404",lineHeight:1.7}}>To confirm payment → go to <strong>Pay</strong> tab → tap <strong>"I Have Paid"</strong> → share screenshot on WhatsApp.</div></div>
    <BillDetailView bill={selected} customer={{...customer,milk_brands:customer.milk_brands}} month={selected.month} year={selected.year} entries={entries}/>
    <div style={{padding:"0 16px 24px"}}><button style={{...S.btnSave,width:"100%",padding:14,fontSize:15}} onClick={()=>setTab("pay")}>💳 Go to Pay →</button></div>
  </div>);
  if(bills.length===0)return<EmptyState icon="🧾" message="No bills generated yet for your account."/>;
  return(<div style={{padding:16}}>
    <div style={S.sectionTitle}>🧾 Your Bills</div>
    {bills.map((b,i)=>(
      <div key={i} style={{...S.listCard,cursor:"pointer"}} onClick={()=>openBill(b)}>
        <div style={{fontSize:28}}>🧾</div>
        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:15}}>{monthLabel(b.month,b.year)}</div><div style={{fontSize:13,color:"#888"}}>{parseFloat(b.total_litres||0).toFixed(1)}L • {fmtCurrency(b.total_amount)}</div></div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><StatusBadge status={b.status}/><span style={{fontSize:12,color:"#888"}}>→</span></div>
      </div>
    ))}
  </div>);
}

// ─── PORTAL PAY — no duplicate payments ──────────────────────────────────────
function PortalPay({customer}){
  const [bills,setBills]=useState([]); const [hasPending,setHasPending]=useState(false); const [step,setStep]=useState("check"); const [submitting,setSubmitting]=useState(false); const [done,setDone]=useState(false); const [confirm,setConfirm]=useState(false);
  useEffect(()=>{load();},[]);
  const load=async()=>{
    try{
      const [allBills,pendingPayments]=await Promise.all([getAllCustomerBills(customer.id),getPendingPaymentsForCustomer(customer.id)]);
      setBills((allBills||[]).filter(b=>b.status!=="paid"));
      setHasPending((pendingPayments||[]).length>0);
    }catch{}
    setStep("pay");
  };
  const submitPaid=async()=>{
    if(hasPending){alert("You already have a pending payment confirmation. Please wait for the owner to confirm it.");return;}
    setSubmitting(true);
    try{
      const unpaidBill=bills[0];
      await addPayment({customer_id:customer.id,bill_id:unpaidBill?.id||null,amount:unpaidBill?.total_amount||0,payment_method:"upi",status:"pending_confirmation",notes:`Customer confirmed via portal. ${new Date(new Date().getTime()+(5.5*60*60*1000)).toLocaleString("en-IN")}`});
      setDone(true);
    }catch{setDone(true);}
    setSubmitting(false);
  };
  const totalDue=bills.reduce((s,b)=>s+(parseFloat(b.total_amount)||0),0);
  if(step==="check")return<Loader/>;
  if(done)return(<div style={{padding:16,textAlign:"center"}}><div style={{fontSize:60,marginBottom:12}}>✅</div><div style={{fontSize:20,fontWeight:600,color:"#1a6b3c",marginBottom:8}}>Payment Recorded!</div><div style={{fontSize:13,color:"#555",marginBottom:20,lineHeight:1.7,background:"#e8f5ee",borderRadius:12,padding:14}}>Your payment is waiting for owner confirmation.<br/><br/><strong>Please share your payment screenshot on WhatsApp</strong> to confirm ✅</div><a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, sharing payment screenshot — ${customer?.name} (${customer?.code})`)}`} style={{...S.btnSave,display:"block",textAlign:"center",textDecoration:"none",background:"#25D366",padding:14,fontSize:15}}>📸 Share Screenshot on WhatsApp</a></div>);
  if(bills.length===0)return<div style={{padding:16}}><EmptyState icon="🎉" message="No pending dues! All paid up."/></div>;
  return(<div style={{padding:16}}>
    <div style={S.sectionTitle}>💳 Pay Your Bill</div>
    {bills.map((b,i)=><div key={i} style={{...S.listCard,marginBottom:8}}><div style={{flex:1}}><div style={{fontWeight:600}}>{monthLabel(b.month,b.year)}</div><div style={{fontSize:12,color:"#888"}}>{parseFloat(b.total_litres||0).toFixed(1)}L</div></div><div style={{fontWeight:700,fontSize:16,color:"#c62828"}}>{fmtCurrency(b.total_amount)}</div></div>)}
    {bills.length>1&&<div style={{background:"#fff3cd",borderRadius:10,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:600}}>Total Due</span><span style={{fontWeight:700,color:"#c62828"}}>{fmtCurrency(totalDue)}</span></div>}
    <div style={{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:16,marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span style={{color:"#888"}}>UPI ID</span><span style={{fontWeight:600}}>{UPI_ID}</span></div></div>
    <a href={`upi://pay?pa=${UPI_ID}&pn=Saikrishna+Milk+Supply&am=${totalDue}&cu=INR&tn=MF-${customer?.code||""}`} style={{...S.btnSave,display:"block",textAlign:"center",padding:15,fontSize:16,fontWeight:600,textDecoration:"none",marginBottom:12}}>📱 Pay via GPay / PhonePe / Paytm</a>
    {hasPending?(<div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:12,padding:14,textAlign:"center"}}><div style={{fontWeight:600,color:"#856404"}}>⏳ Payment Pending Confirmation</div><div style={{fontSize:13,color:"#856404",marginTop:4}}>Your previous payment is waiting for owner confirmation. Please wait.</div></div>):(
      <button style={{...S.btnCancel,width:"100%",padding:14,fontSize:14,fontWeight:600,border:"2px solid #1a6b3c",color:"#1a6b3c",marginBottom:8}} onClick={()=>setConfirm(true)} disabled={submitting}>✅ I Have Paid</button>
    )}
    <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, sharing payment screenshot — ${customer?.name} (${customer?.code})`)}`} style={{display:"block",textAlign:"center",padding:"10px 0",fontSize:13,color:"#25D366",textDecoration:"none"}}>📸 Share Screenshot on WhatsApp →</a>

    {confirm&&(<div style={S.modalBg} onClick={()=>setConfirm(false)}><div style={{...S.modal,maxHeight:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={S.modalHandle}/>
      <div style={{textAlign:"center",padding:"8px 0 16px"}}><div style={{fontSize:40,marginBottom:8}}>💳</div><div style={S.modalName}>Have you actually paid?</div><div style={{fontSize:13,color:"#888",marginBottom:20}}>Only confirm if payment has been made via GPay/PhonePe/UPI</div></div>
      <div style={S.modalActions}>
        <button style={S.btnCancel} onClick={()=>setConfirm(false)}>No, Cancel</button>
        <button style={S.btnSave} onClick={()=>{setConfirm(false);submitPaid();}} disabled={submitting}>Yes, I Paid</button>
      </div>
    </div></div>)}
  </div>);
}

function PortalHelp(){
  return(<div style={{padding:16}}>
    <div style={S.sectionTitle}>❓ How to Use</div>
    <div style={{background:"#e8f5ee",border:"1px solid #b8dfc8",borderRadius:12,padding:16,marginBottom:12}}>
      <div style={{fontWeight:600,fontSize:15,color:"#1a6b3c",marginBottom:8}}>Welcome to Your Milk Portal 🥛</div>
      <div style={{fontSize:13,color:"#1a6b3c",lineHeight:1.8}}>This portal helps you track your daily milk delivery and pay your bills easily.</div>
    </div>
    {[["🏠 Home","See your account summary, total dues, and quick actions."],["📋 Records","Record your daily milk here. You can also record previous dates you missed."],["🧾 Bill","View your monthly bills. Tap any month to see the detailed day-wise bill."],["💳 Pay","Pay your bill via UPI and confirm payment. Share your screenshot on WhatsApp."]].map(([title,desc])=>(<div key={title} style={{...S.listCard,flexDirection:"column",alignItems:"flex-start",gap:4}}><div style={{fontWeight:600,fontSize:14}}>{title}</div><div style={{fontSize:13,color:"#888"}}>{desc}</div></div>))}
    <div style={{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:12,padding:14,marginTop:4}}>
      <div style={{fontWeight:600,fontSize:13,color:"#856404",marginBottom:6}}>📌 Payment Instructions</div>
      <div style={{fontSize:13,color:"#856404",lineHeight:1.7}}>1. Pay via UPI: <strong>{UPI_ID}</strong><br/>2. Tap "I Have Paid" in the Pay tab<br/>3. Share your payment screenshot on WhatsApp<br/>4. Wait for owner confirmation</div>
    </div>
    <div style={{background:"#e8f0ff",borderRadius:12,padding:14,marginTop:12}}>
      <div style={{fontWeight:600,fontSize:13,color:"#1565C0",marginBottom:4}}>📱 Add to Home Screen</div>
      <div style={{fontSize:13,color:"#1565C0",lineHeight:1.7}}>Tap your browser's Share button → "Add to Home Screen" to save your personal dashboard for quick daily access.</div>
    </div>
    <div style={{textAlign:"center",marginTop:16,fontSize:12,color:"#888"}}>Content coming soon — more guidance will be added here.</div>
  </div>);
}

function BillPage({customerCode}){
  const [bill,setBill]=useState(null); const [customer,setCustomer]=useState(null); const [entries,setEntries]=useState([]); const [loading,setLoading]=useState(true);
  const ist=new Date(new Date().getTime()+(5.5*60*60*1000)); const month=ist.getMonth()+1; const year=ist.getFullYear();
  useEffect(()=>{load();},[]);
  const load=async()=>{setLoading(true);try{const custs=await db("customers","GET",null,`?code=eq.${customerCode}&limit=1&select=*,milk_brands(name,rate)`);const cust=custs?.[0];if(!cust){setLoading(false);return;}setCustomer(cust);const bills=await db("bills","GET",null,`?customer_id=eq.${cust.id}&month=eq.${month}&year=eq.${year}&limit=1`);const b=bills?.[0];setBill(b||null);if(b){const e=await getMonthOwnerEntries(cust.id,month,year);setEntries(e||[]);}}catch{}setLoading(false);};
  if(loading)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",flexDirection:"column",gap:12}}><img src={logo_app} style={{width:72,height:72,borderRadius:16,objectFit:"contain"}} alt="loading"/><div style={{fontSize:14,color:"#888"}}>Loading...</div></div>;
  if(!customer)return<EmptyState icon="❌" message="Customer not found"/>;
  if(!bill)return<EmptyState icon="🧾" message="No bill for this month yet"/>;
  return<div style={{background:"#f8f9fa",minHeight:"100vh"}}><BillDetailView bill={bill} customer={customer} month={month} year={year} entries={entries}/></div>;
}

function SelectScreen(){
  const [portalCode,setPortalCode]=useState("");
  return(<div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,background:"#f8f9fa"}}>
    <img src={logo_app} style={{width:100,height:100,borderRadius:20,objectFit:"contain",marginBottom:12}} alt="logo"/>
    <div style={{fontSize:22,fontWeight:700,color:"#1a6b3c",marginBottom:4}}>Saikrishna Milk Supply</div>
    <div style={{fontSize:13,color:"#888",marginBottom:32}}>MilkFlow v3.3</div>
    <div style={{width:"100%",display:"flex",flexDirection:"column",gap:12}}>
      {[["👑","Owner Dashboard","/owner"],["🥛","Owner's Register","/entry"]].map(([icon,label,path])=>(
        <a key={path} href={path} style={{display:"flex",alignItems:"center",gap:14,background:"white",border:"1px solid #eee",borderRadius:14,padding:"16px 18px",textDecoration:"none",color:"#111"}}>
          <span style={{fontSize:32}}>{icon}</span><div><div style={{fontWeight:600,fontSize:16}}>{label}</div><div style={{fontSize:12,color:"#888"}}>{window.location.origin}{path}</div></div><span style={{marginLeft:"auto",color:"#888"}}>→</span>
        </a>
      ))}
      <div style={{background:"white",border:"1px solid #eee",borderRadius:14,padding:"16px 18px"}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:10}}>🔗 Test Customer Portal</div>
        <input style={{...S.formInput,marginBottom:8}} value={portalCode} onChange={e=>setPortalCode(e.target.value)} placeholder="Enter customer code e.g. SA-504"/>
        <button style={{...S.btnSave,width:"100%",padding:10}} onClick={()=>{if(portalCode.trim())window.location.href=`/c/${portalCode.trim()}`;}}>Open Portal</button>
      </div>
    </div>
  </div>);
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S={
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
  custCard:{background:"white",border:"0.5px solid #eee",borderRadius:12,padding:"12px 14px",display:"flex",alignItems:"center",gap:12},
  custInfo:{flex:1,minWidth:0},
  custName:{fontSize:15,fontWeight:500,color:"#111",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
  custMeta:{fontSize:12,color:"#888",marginTop:2},
  qtySection:{display:"flex",flexDirection:"column",alignItems:"center",gap:4},
  qtyNum:{fontSize:22,fontWeight:600,color:"#1a6b3c",lineHeight:1},
  qtyUnit:{fontSize:11,color:"#888"},
  qtyBadge:{fontSize:10,padding:"2px 7px",borderRadius:10},
  qtyBadgeDone:{background:"#d4edda",color:"#155724"},
  qtyBadgePrev:{background:"#fff3cd",color:"#856404"},
  modalBg:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"flex-end",zIndex:100},
  modal:{background:"white",borderRadius:"20px 20px 0 0",padding:"20px 16px 32px",width:"100%",maxHeight:"92vh",overflowY:"auto"},
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
  statBox:{background:"#e8f5ee",borderRadius:12,padding:"12px 16px",textAlign:"center"},
  statBoxNum:{fontSize:26,fontWeight:700,color:"#1a6b3c"},
  statBoxLabel:{fontSize:12,color:"#2d7a50"},
  statsGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16},
  statCard:{background:"#f8f9fa",borderRadius:12,padding:"14px 12px",textAlign:"center"},
  alertBox:{background:"#fff3cd",border:"1px solid #ffc107",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:12},
  listCard:{background:"white",border:"0.5px solid #eee",borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:8},
  formLabel:{display:"block",fontSize:12,color:"#888",marginBottom:4,fontWeight:500},
  formInput:{width:"100%",padding:"10px 14px",border:"0.5px solid #ddd",borderRadius:10,fontSize:15,background:"white",color:"#111",marginBottom:12,display:"block",boxSizing:"border-box"},
  btnPrimary:{background:"#1a6b3c",border:"none",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:500,color:"white",cursor:"pointer"},
  bottomNav:{display:"flex",borderTop:"0.5px solid #eee",background:"white",flexShrink:0},
  navBtn:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 0",background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:12},
  navBtnActive:{color:"#1a6b3c",borderTop:"2px solid #1a6b3c"},
  navBtnActiveBlue:{color:"#1565C0",borderTop:"2px solid #1565C0"},
};

export default function App(){
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
    if(!authed)return<div style={{maxWidth:480,margin:"0 auto"}}><div style={{...S.appHeader,background:"#1a6b3c",color:"white"}}><img src={logo_app} style={{width:28,height:28,borderRadius:6,objectFit:"contain",background:"white",padding:2}} alt="logo"/> MilkFlow — Owner's Register</div><PinScreen role="father" onSuccess={()=>setAuthed(true)}/></div>;
    return<div style={{maxWidth:480,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column"}}><div style={{...S.appHeader,background:"#1a6b3c",color:"white"}}><img src={logo_app} style={{width:28,height:28,borderRadius:6,objectFit:"contain",background:"white",padding:2}} alt="logo"/> Owner's Register — {todayIST()}<button style={{marginLeft:"auto",fontSize:12,color:"rgba(255,255,255,0.8)",background:"none",border:"none",cursor:"pointer"}} onClick={()=>setAuthed(false)}>Lock</button></div><FatherScreen/></div>;
  }
  return<SelectScreen/>;
}
