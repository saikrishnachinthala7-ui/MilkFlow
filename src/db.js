// MilkFlow db.js v3.3 — IST timezone fix + subgroup import fix + bill fix
const SUPABASE_URL = "https://ehsqnfmctdosebfcakwv.supabase.co";
const SUPABASE_KEY = "sb_publishable_r85tUWIcXp-tRJ7OypsXWw_Oy4ijkfh";

// ─── IST DATE HELPERS ─────────────────────────────────────────────────────────
export function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split("T")[0];
}
export function nowDate() { return todayIST(); }

export async function db(table, method = "GET", body = null, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };
  if (method === "POST") headers["Prefer"] = "return=representation";
  if (method === "PATCH") headers["Prefer"] = "return=representation";
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  if (method === "DELETE") return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export let PINS = { owner: "1234", father: "0000" };
export async function loadPins() {
  try {
    const rows = await db("settings", "GET", null, "?key=in.(owner_pin,father_pin)&select=key,value");
    (rows || []).forEach(r => {
      if (r.key === "owner_pin") PINS.owner = r.value;
      if (r.key === "father_pin") PINS.father = r.value;
    });
  } catch { }
}

// ─── AREAS ────────────────────────────────────────────────────────────────────
export async function getAreas() {
  return await db("areas", "GET", null, "?select=*&order=name");
}
export async function addArea(name, delivery_boy_name = "") {
  const res = await db("areas", "POST", { name, delivery_boy_name });
  return Array.isArray(res) ? res[0] : res;
}
export async function updateArea(id, name, delivery_boy_name = "") {
  return await db("areas", "PATCH", { name, delivery_boy_name }, `?id=eq.${id}`);
}
export async function deleteArea(id) {
  return await db("areas", "DELETE", null, `?id=eq.${id}`);
}

// ─── SUBGROUPS ────────────────────────────────────────────────────────────────
export async function getSubgroups(area_id = null) {
  const filter = area_id ? `&area_id=eq.${area_id}` : "";
  return await db("subgroups", "GET", null, `?select=*${filter}&order=name`);
}
export async function addSubgroup(area_id, name) {
  const res = await db("subgroups", "POST", { area_id, name });
  return Array.isArray(res) ? res[0] : res;
}
export async function updateSubgroup(id, name) {
  return await db("subgroups", "PATCH", { name }, `?id=eq.${id}`);
}
export async function deleteSubgroup(id) {
  return await db("subgroups", "DELETE", null, `?id=eq.${id}`);
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
export async function getCustomers() {
  return await db("customers", "GET", null,
    "?active=eq.true&order=name&select=id,code,name,phone,address,default_qty,custom_rate,outstanding,active,brand_id,area_id,subgroup_id,milk_brands(id,name,rate),areas(id,name,delivery_boy_name),subgroups(id,name)"
  );
}
export async function addCustomer(data) {
  return await db("customers", "POST", {
    code: data.code, name: data.name, phone: data.phone || "",
    address: data.address || "", brand_id: data.brand_id || null,
    area_id: data.area_id || null, subgroup_id: data.subgroup_id || null,
    default_qty: parseFloat(data.default_qty) || 1,
    custom_rate: data.custom_rate ? parseFloat(data.custom_rate) : null,
    outstanding: parseFloat(data.outstanding) || 0,
    active: true, portal_token: data.code,
    joined_date: todayIST(),
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

// ─── BRANDS ──────────────────────────────────────────────────────────────────
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
export async function getTodayEntries() {
  return await db("daily_entries", "GET", null,
    `?entry_date=eq.${todayIST()}&select=id,customer_id,quantity,submitted_by`
  );
}
export async function getDailyEntriesForDate(date) {
  return await db("daily_entries", "GET", null,
    `?entry_date=eq.${date}&select=id,customer_id,quantity,submitted_by,rate,amount,customers(name,code,address)`
  );
}
export async function getMonthOwnerEntries(customerId, month, year) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];
  return await db("daily_entries", "GET", null,
    `?customer_id=eq.${customerId}&entry_date=gte.${startDate}&entry_date=lte.${endDate}&order=entry_date`
  );
}
export async function saveEntry(customerId, quantity, brandId, rate, date = null) {
  const entryDate = date || todayIST();
  const amount = parseFloat(quantity) * parseFloat(rate || 0);
  const existing = await db("daily_entries", "GET", null,
    `?customer_id=eq.${customerId}&entry_date=eq.${entryDate}&limit=1`
  );
  if (existing && existing.length > 0) {
    return await db("daily_entries", "PATCH",
      { quantity: parseFloat(quantity), amount, rate: parseFloat(rate || 0) },
      `?id=eq.${existing[0].id}`
    );
  }
  return await db("daily_entries", "POST", {
    customer_id: customerId, entry_date: entryDate,
    brand_id: brandId || null, quantity: parseFloat(quantity),
    rate: parseFloat(rate || 0), amount, submitted_by: "father",
  });
}
export async function deleteEntry(customerId, date) {
  return await db("daily_entries", "DELETE", null,
    `?customer_id=eq.${customerId}&entry_date=eq.${date}`
  );
}

// ─── CUSTOMER ENTRIES ─────────────────────────────────────────────────────────
export async function saveCustomerEntry(customerId, quantity, date = null) {
  const entryDate = date || todayIST();
  const existing = await db("customer_entries", "GET", null,
    `?customer_id=eq.${customerId}&entry_date=eq.${entryDate}&limit=1`
  );
  if (existing && existing.length > 0) {
    return await db("customer_entries", "PATCH",
      { quantity: parseFloat(quantity) }, `?id=eq.${existing[0].id}`
    );
  }
  return await db("customer_entries", "POST", {
    customer_id: customerId, entry_date: entryDate, quantity: parseFloat(quantity),
  });
}
export async function getMonthCustomerEntries(customerId, month, year) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];
  return await db("customer_entries", "GET", null,
    `?customer_id=eq.${customerId}&entry_date=gte.${startDate}&entry_date=lte.${endDate}&order=entry_date`
  );
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export async function getPayments() {
  return await db("payments", "GET", null,
    "?order=created_at.desc&limit=100&select=id,customer_id,bill_id,amount,payment_method,payment_date,transaction_ref,status,notes,created_at,customers(name,code,phone)"
  );
}
export async function addPayment(data) {
  return await db("payments", "POST", {
    customer_id: data.customer_id, bill_id: data.bill_id || null,
    amount: parseFloat(data.amount), payment_method: data.payment_method || "upi",
    payment_date: todayIST(), transaction_ref: data.transaction_ref || null,
    status: data.status || "pending_confirmation", notes: data.notes || null,
  });
}
export async function confirmPayment(paymentId, billId = null) {
  await db("payments", "PATCH",
    { status: "confirmed", confirmed_at: new Date().toISOString() },
    `?id=eq.${paymentId}`
  );
  if (billId) {
    await db("bills", "PATCH", { status: "paid" }, `?id=eq.${billId}`);
  }
}
export async function rejectPayment(id) {
  return await db("payments", "PATCH", { status: "rejected" }, `?id=eq.${id}`);
}
export async function getPendingPaymentsForCustomer(customerId) {
  return await db("payments", "GET", null,
    `?customer_id=eq.${customerId}&status=eq.pending_confirmation&select=id`
  );
}

// ─── BILLS ────────────────────────────────────────────────────────────────────
export async function getBills(month = null, year = null) {
  let q = "?select=id,bill_number,customer_id,month,year,total_litres,month_amount,outstanding,total_amount,status,locked,customers(name,code,phone,address)&order=year.desc,month.desc";
  if (month && year) q += `&month=eq.${month}&year=eq.${year}`;
  return await db("bills", "GET", null, q);
}
export async function getAllCustomerBills(customerId) {
  return await db("bills", "GET", null,
    `?customer_id=eq.${customerId}&order=year.desc,month.desc&select=*`
  );
}
export async function generateBillForCustomer(customerId, month, year, customers) {
  const cust = customers.find(c => c.id === customerId);
  if (!cust) return;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];
  const entries = await db("daily_entries", "GET", null,
    `?customer_id=eq.${customerId}&entry_date=gte.${startDate}&entry_date=lte.${endDate}&select=quantity,amount`
  );
  const totalLitres = (entries || []).reduce((s, e) => s + (parseFloat(e.quantity) || 0), 0);
  const monthAmount = (entries || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const outstanding = parseFloat(cust.outstanding) || 0;
  const totalAmount = monthAmount + outstanding;
  const billNum = `BILL-${year}${String(month).padStart(2, "0")}-${cust.code}`;
  const existing = await db("bills", "GET", null,
    `?customer_id=eq.${customerId}&month=eq.${month}&year=eq.${year}&limit=1`
  );
  if (existing && existing.length > 0) {
    return await db("bills", "PATCH",
      { total_litres: totalLitres, month_amount: monthAmount, outstanding, total_amount: totalAmount },
      `?id=eq.${existing[0].id}`
    );
  }
  return await db("bills", "POST", {
    bill_number: billNum, customer_id: customerId, month, year,
    period_from: startDate, period_to: endDate,
    total_litres: totalLitres, month_amount: monthAmount,
    outstanding, total_amount: totalAmount, status: "pending", locked: false,
  });
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

// ─── BULK IMPORT ──────────────────────────────────────────────────────────────
export async function bulkImportCustomers(rows, brands, areas, subgroups) {
  const results = { success: 0, failed: 0, errors: [] };
  for (const row of rows) {
    try {
      // Resolve group
      let area_id = null;
      if (row.group_name && row.group_name.trim()) {
        let area = areas.find(a => a.name.toLowerCase().trim() === row.group_name.toLowerCase().trim());
        if (!area) {
          area = await addArea(row.group_name.trim(), "");
          if (area) areas.push(area);
        }
        area_id = area?.id || null;
      }
      // Resolve subgroup — fixed: same pattern as group
      let subgroup_id = null;
      if (row.subgroup_name && row.subgroup_name.trim() && area_id) {
        let sg = subgroups.find(s =>
          s.name.toLowerCase().trim() === row.subgroup_name.toLowerCase().trim() &&
          s.area_id === area_id
        );
        if (!sg) {
          sg = await addSubgroup(area_id, row.subgroup_name.trim());
          if (sg) subgroups.push(sg);
        }
        subgroup_id = sg?.id || null;
      }
      // Resolve brand
      let brand_id = null;
      if (row.brand_name) {
        const brand = brands.find(b => b.name.toLowerCase().trim() === row.brand_name.toLowerCase().trim());
        if (brand) brand_id = brand.id;
      }
      await addCustomer({
        code: row.code, name: row.name, phone: row.phone || "",
        address: row.address || "", area_id, subgroup_id, brand_id,
        default_qty: row.qty || 1, custom_rate: row.rate || null,
        outstanding: row.opening_balance || 0,
      });
      results.success++;
    } catch (e) {
      results.failed++;
      results.errors.push(`Row ${row.code || row.name}: ${e.message}`);
    }
  }
  return results;
}

// ─── MISC ─────────────────────────────────────────────────────────────────────
export async function getPaymentsByCustomer(customerId) {
  return await db("payments", "GET", null,
    `?customer_id=eq.${customerId}&order=created_at.desc&select=*`
  );
}
