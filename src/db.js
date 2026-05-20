// ─── Supabase Database Layer — Exact Schema Match ─────────────────────────────
const SUPABASE_URL = "https://ehsqnfmctdosebfcakwv.supabase.co";
const SUPABASE_KEY = "sb_publishable_r85tUWIcXp-tRJ7OypsXWw_Oy4ijkfh";

export async function db(table, method = "GET", body = null, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
  if (method === "POST") headers["Prefer"] = "return=representation";
  if (method === "PATCH") headers["Prefer"] = "return=representation";
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  if (method === "DELETE") return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─── EXACT COLUMN MAPPING ─────────────────────────────────────────────────────
// customers:     id, code, name, phone, address, area_id, brand_id,
//                default_qty, custom_rate, credit_limit, outstanding,
//                active, portal_token, joined_date, created_at
// milk_brands:   id, name, rate, unit, active, created_at
// areas:         id, name, created_at
// daily_entries: id, customer_id, entry_date, brand_id, quantity, rate,
//                amount, submitted_by, created_at
// bills:         id, bill_number, customer_id, month, year, period_from,
//                period_to, total_litres, month_amount, outstanding,
//                total_amount, status, sent_at, locked, created_at
// payments:      id, customer_id, bill_id, amount, payment_method,
//                payment_date, screenshot_url, transaction_ref, status,
//                fraud_flags, confirmed_at, notes, created_at
// customer_entries: id, customer_id, entry_date, quantity, created_at
// settings:      id, key, value, updated_at
// disputes:      id, customer_id, bill_id, dispute_date, issue,
//                status, resolution, resolved_at, created_at
// rate_history:  id, brand_id, old_rate, new_rate, changed_at, changed_by
// notification_log: id, customer_id, type, message, sent_at, status
// whatsapp_templates: id, name, type, message, active, created_at

// ─── PIN MANAGEMENT ───────────────────────────────────────────────────────────
export let PINS = { owner: "1234", father: "0000" };

export async function loadPins() {
  try {
    const rows = await db("settings", "GET", null, "?key=in.(owner_pin,father_pin)&select=key,value");
    (rows || []).forEach(r => {
      if (r.key === "owner_pin") PINS.owner = r.value;
      if (r.key === "father_pin") PINS.father = r.value;
    });
  } catch { /* use defaults */ }
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
export async function getCustomers() {
  return await db("customers", "GET", null,
    "?active=eq.true&order=name&select=id,code,name,phone,address,default_qty,custom_rate,outstanding,active,brand_id,area_id,milk_brands(id,name,rate)"
  );
}

export async function addCustomer(data) {
  // data: { name, phone, address, brand_id, default_qty, custom_rate, outstanding }
  const code = "C" + String(Date.now()).slice(-5);
  return await db("customers", "POST", {
    code,
    name: data.name,
    phone: data.phone,
    address: data.address || "",
    brand_id: data.brand_id || null,
    default_qty: parseFloat(data.default_qty) || 1,
    custom_rate: parseFloat(data.custom_rate) || null,
    outstanding: parseFloat(data.outstanding) || 0,
    active: true,
    joined_date: new Date().toISOString().split("T")[0],
  });
}

export async function updateCustomer(id, data) {
  return await db("customers", "PATCH", data, `?id=eq.${id}`);
}

export async function deactivateCustomer(id) {
  return await db("customers", "PATCH", { active: false }, `?id=eq.${id}`);
}

export async function deleteCustomer(id) {
  return await db("customers", "DELETE", null, `?id=eq.${id}`);
}

// ─── MILK BRANDS ──────────────────────────────────────────────────────────────
export async function getBrands() {
  return await db("milk_brands", "GET", null, "?active=eq.true&order=name&select=id,name,rate,unit");
}

export async function addBrand(name, rate) {
  return await db("milk_brands", "POST", { name, rate: parseFloat(rate), unit: "litre", active: true });
}

export async function updateBrand(id, name, rate) {
  return await db("milk_brands", "PATCH", { name, rate: parseFloat(rate) }, `?id=eq.${id}`);
}

export async function deleteBrand(id) {
  return await db("milk_brands", "PATCH", { active: false }, `?id=eq.${id}`);
}

// ─── DAILY ENTRIES ────────────────────────────────────────────────────────────
export function todayStr() { return new Date().toISOString().split("T")[0]; }

export async function getTodayEntries() {
  return await db("daily_entries", "GET", null,
    `?entry_date=eq.${todayStr()}&select=id,customer_id,quantity,submitted_by`
  );
}

export async function saveEntry(customerId, quantity, brandId, rate) {
  const amount = parseFloat(quantity) * parseFloat(rate || 0);
  // Check if entry exists for today
  const existing = await db("daily_entries", "GET", null,
    `?customer_id=eq.${customerId}&entry_date=eq.${todayStr()}&limit=1`
  );
  if (existing && existing.length > 0) {
    return await db("daily_entries", "PATCH",
      { quantity: parseFloat(quantity), amount },
      `?id=eq.${existing[0].id}`
    );
  }
  return await db("daily_entries", "POST", {
    customer_id: customerId,
    entry_date: todayStr(),
    brand_id: brandId || null,
    quantity: parseFloat(quantity),
    rate: parseFloat(rate || 0),
    amount,
    submitted_by: "father",
  });
}

// ─── CUSTOMER ENTRIES ─────────────────────────────────────────────────────────
export async function saveCustomerEntry(customerId, quantity) {
  const existing = await db("customer_entries", "GET", null,
    `?customer_id=eq.${customerId}&entry_date=eq.${todayStr()}&limit=1`
  );
  if (existing && existing.length > 0) {
    return await db("customer_entries", "PATCH",
      { quantity: parseFloat(quantity) },
      `?id=eq.${existing[0].id}`
    );
  }
  return await db("customer_entries", "POST", {
    customer_id: customerId,
    entry_date: todayStr(),
    quantity: parseFloat(quantity),
  });
}

export async function getCustomerEntries(customerId, startDate, endDate) {
  return await db("customer_entries", "GET", null,
    `?customer_id=eq.${customerId}&entry_date=gte.${startDate}&entry_date=lte.${endDate}&order=entry_date.desc`
  );
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export async function getPayments() {
  return await db("payments", "GET", null,
    "?order=created_at.desc&limit=100&select=id,customer_id,amount,payment_method,payment_date,transaction_ref,status,notes,created_at,customers(name,code,phone)"
  );
}

export async function addPayment(data) {
  return await db("payments", "POST", {
    customer_id: data.customer_id,
    bill_id: data.bill_id || null,
    amount: parseFloat(data.amount),
    payment_method: data.payment_method || "upi",
    payment_date: todayStr(),
    transaction_ref: data.transaction_ref || null,
    status: data.status || "pending_confirmation",
    notes: data.notes || null,
  });
}

export async function confirmPayment(id) {
  return await db("payments", "PATCH",
    { status: "confirmed", confirmed_at: new Date().toISOString() },
    `?id=eq.${id}`
  );
}

export async function rejectPayment(id) {
  return await db("payments", "PATCH",
    { status: "rejected" },
    `?id=eq.${id}`
  );
}

// ─── BILLS ────────────────────────────────────────────────────────────────────
export async function getBills(month, year) {
  return await db("bills", "GET", null,
    `?month=eq.${month}&year=eq.${year}&select=id,bill_number,customer_id,month,year,total_litres,month_amount,outstanding,total_amount,status,locked,customers(name,code,phone,address)`
  );
}

export async function getCustomerBills(customerId) {
  return await db("bills", "GET", null,
    `?customer_id=eq.${customerId}&order=year.desc,month.desc&limit=12&select=*`
  );
}

export async function updateBillStatus(id, status) {
  return await db("bills", "PATCH", { status }, `?id=eq.${id}`);
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
export async function getSetting(key) {
  const rows = await db("settings", "GET", null, `?key=eq.${key}&limit=1&select=value`);
  return rows?.[0]?.value || null;
}

export async function setSetting(key, value) {
  const existing = await db("settings", "GET", null, `?key=eq.${key}&limit=1`);
  if (existing && existing.length > 0) {
    return await db("settings", "PATCH", { value, updated_at: new Date().toISOString() }, `?key=eq.${key}`);
  }
  return await db("settings", "POST", { key, value });
}

// ─── DISPUTES ─────────────────────────────────────────────────────────────────
export async function getDisputes(customerId) {
  const q = customerId
    ? `?customer_id=eq.${customerId}&order=created_at.desc&select=*,customers(name,code)`
    : `?order=created_at.desc&select=*,customers(name,code)`;
  return await db("disputes", "GET", null, q);
}

export async function addDispute(data) {
  return await db("disputes", "POST", {
    customer_id: data.customer_id,
    dispute_date: todayStr(),
    issue: data.issue,
    status: "open",
  });
}

export async function resolveDispute(id, resolution) {
  return await db("disputes", "PATCH",
    { status: "resolved", resolution, resolved_at: new Date().toISOString() },
    `?id=eq.${id}`
  );
}
