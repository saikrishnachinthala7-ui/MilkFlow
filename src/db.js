// MilkFlow — db.js — Complete Database Layer v3.1
const SUPABASE_URL = "https://ehsqnfmctdosebfcakwv.supabase.co";
const SUPABASE_KEY = "sb_publishable_r85tUWIcXp-tRJ7OypsXWw_Oy4ijkfh";

const headers = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  Prefer: "return=representation",
};

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers,
    ...options,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || res.statusText);
  return text ? JSON.parse(text) : [];
}

// ─── AREAS (GROUPS) ───────────────────────────────────────────────────────────
export async function getAreas() {
  return sb("/areas?select=*&order=name");
}
export async function addArea(name, delivery_boy_name = "") {
  return sb("/areas", {
    method: "POST",
    body: JSON.stringify({ name, delivery_boy_name }),
  });
}
export async function updateArea(id, name, delivery_boy_name = "") {
  return sb(`/areas?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name, delivery_boy_name }),
  });
}
export async function deleteArea(id) {
  return sb(`/areas?id=eq.${id}`, { method: "DELETE" });
}

// ─── SUBGROUPS ────────────────────────────────────────────────────────────────
export async function getSubgroups(area_id = null) {
  const filter = area_id ? `&area_id=eq.${area_id}` : "";
  return sb(`/subgroups?select=*${filter}&order=name`);
}
export async function addSubgroup(area_id, name) {
  return sb("/subgroups", {
    method: "POST",
    body: JSON.stringify({ area_id, name }),
  });
}
export async function updateSubgroup(id, name) {
  return sb(`/subgroups?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}
export async function deleteSubgroup(id) {
  return sb(`/subgroups?id=eq.${id}`, { method: "DELETE" });
}

// ─── MILK BRANDS ─────────────────────────────────────────────────────────────
export async function getBrands() {
  return sb("/milk_brands?select=*&active=eq.true&order=name");
}
export async function getAllBrands() {
  return sb("/milk_brands?select=*&order=name");
}
export async function addBrand(name, rate, unit = "litre") {
  return sb("/milk_brands", {
    method: "POST",
    body: JSON.stringify({ name, rate, unit, active: true }),
  });
}
export async function updateBrand(id, name, rate, unit = "litre") {
  return sb(`/milk_brands?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name, rate, unit }),
  });
}
export async function deleteBrand(id) {
  return sb(`/milk_brands?id=eq.${id}`, { method: "DELETE" });
}

// ─── CUSTOMERS ───────────────────────────────────────────────────────────────
export async function getCustomers() {
  return sb(
    "/customers?select=*,areas(*),subgroups(*),milk_brands(*)&order=code"
  );
}
export async function getActiveCustomers() {
  return sb(
    "/customers?select=*,areas(*),subgroups(*),milk_brands(*)&active=eq.true&order=code"
  );
}
export async function getCustomerByCode(code) {
  const rows = await sb(
    `/customers?select=*,areas(*),subgroups(*),milk_brands(*)&code=eq.${encodeURIComponent(code)}`
  );
  return rows[0] || null;
}
export async function getCustomerByToken(token) {
  const rows = await sb(
    `/customers?select=*,areas(*),subgroups(*),milk_brands(*)&portal_token=eq.${encodeURIComponent(token)}`
  );
  return rows[0] || null;
}
export async function addCustomer(data) {
  return sb("/customers", {
    method: "POST",
    body: JSON.stringify({
      code: data.code,
      name: data.name,
      phone: data.phone,
      address: data.address,
      area_id: data.area_id || null,
      subgroup_id: data.subgroup_id || null,
      brand_id: data.brand_id || null,
      default_qty: parseFloat(data.default_qty) || 1,
      custom_rate: data.custom_rate ? parseFloat(data.custom_rate) : null,
      credit_limit: parseFloat(data.credit_limit) || 0,
      outstanding: parseFloat(data.outstanding) || 0,
      active: true,
      portal_token: data.code,
      joined_date: new Date().toISOString().split("T")[0],
    }),
  });
}
export async function updateCustomer(id, data) {
  return sb(`/customers?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      code: data.code,
      name: data.name,
      phone: data.phone,
      address: data.address,
      area_id: data.area_id || null,
      subgroup_id: data.subgroup_id || null,
      brand_id: data.brand_id || null,
      default_qty: parseFloat(data.default_qty) || 1,
      custom_rate: data.custom_rate ? parseFloat(data.custom_rate) : null,
      credit_limit: parseFloat(data.credit_limit) || 0,
      outstanding: parseFloat(data.outstanding) || 0,
      portal_token: data.code,
    }),
  });
}
export async function deactivateCustomer(id) {
  return sb(`/customers?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ active: false }),
  });
}
export async function deleteCustomer(id) {
  return sb(`/customers?id=eq.${id}`, { method: "DELETE" });
}

// ─── DAILY ENTRIES ───────────────────────────────────────────────────────────
export async function getDailyEntries(date) {
  return sb(
    `/daily_entries?select=*,customers(id,code,name,subgroup_id,area_id)&entry_date=eq.${date}&order=created_at`
  );
}
export async function getDailyEntriesForCustomer(customer_id) {
  return sb(
    `/daily_entries?select=*&customer_id=eq.${customer_id}&order=entry_date.desc&limit=30`
  );
}
export async function upsertDailyEntry(data) {
  const existing = await sb(
    `/daily_entries?customer_id=eq.${data.customer_id}&entry_date=eq.${data.entry_date}`
  );
  if (existing.length > 0) {
    return sb(`/daily_entries?id=eq.${existing[0].id}`, {
      method: "PATCH",
      body: JSON.stringify({
        quantity: data.quantity,
        brand_id: data.brand_id,
        rate: data.rate,
        amount: data.quantity * data.rate,
        submitted_by: data.submitted_by || "father",
      }),
    });
  }
  return sb("/daily_entries", {
    method: "POST",
    body: JSON.stringify({
      customer_id: data.customer_id,
      entry_date: data.entry_date,
      brand_id: data.brand_id,
      quantity: data.quantity,
      rate: data.rate,
      amount: data.quantity * data.rate,
      submitted_by: data.submitted_by || "father",
    }),
  });
}
export async function deleteDailyEntry(customer_id, entry_date) {
  return sb(
    `/daily_entries?customer_id=eq.${customer_id}&entry_date=eq.${entry_date}`,
    { method: "DELETE" }
  );
}
export async function getMonthEntries(customer_id, month, year) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;
  return sb(
    `/daily_entries?customer_id=eq.${customer_id}&entry_date=gte.${from}&entry_date=lte.${to}&order=entry_date`
  );
}

// ─── BILLS ───────────────────────────────────────────────────────────────────
export async function getBills(customer_id = null) {
  const filter = customer_id ? `&customer_id=eq.${customer_id}` : "";
  return sb(`/bills?select=*,customers(name,code,phone)${filter}&order=created_at.desc`);
}
export async function getBillByCode(bill_number) {
  const rows = await sb(
    `/bills?select=*,customers(*)&bill_number=eq.${encodeURIComponent(bill_number)}`
  );
  return rows[0] || null;
}
export async function createBill(data) {
  return sb("/bills", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export async function updateBill(id, data) {
  return sb(`/bills?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
export async function getPayments(customer_id = null) {
  const filter = customer_id ? `&customer_id=eq.${customer_id}` : "";
  return sb(
    `/payments?select=*,customers(name,code)${filter}&order=created_at.desc`
  );
}
export async function getPendingPayments() {
  return sb(
    "/payments?select=*,customers(name,code,phone)&status=eq.pending&order=created_at.desc"
  );
}
export async function addPayment(data) {
  return sb("/payments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export async function updatePayment(id, status, notes = "") {
  return sb(`/payments?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      notes,
      confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
    }),
  });
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
export async function getSetting(key) {
  const rows = await sb(`/settings?key=eq.${key}`);
  return rows[0]?.value || null;
}
export async function setSetting(key, value) {
  const existing = await sb(`/settings?key=eq.${key}`);
  if (existing.length > 0) {
    return sb(`/settings?key=eq.${key}`, {
      method: "PATCH",
      body: JSON.stringify({ value, updated_at: new Date().toISOString() }),
    });
  }
  return sb("/settings", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
}

// ─── NOTIFICATION LOG ────────────────────────────────────────────────────────
export async function logNotification(customer_id, type, message) {
  return sb("/notification_log", {
    method: "POST",
    body: JSON.stringify({
      customer_id,
      type,
      message,
      sent_at: new Date().toISOString(),
      status: "sent",
    }),
  });
}

// ─── BULK IMPORT ──────────────────────────────────────────────────────────────
export async function bulkImportCustomers(rows, brands, areas, subgroups) {
  const results = { success: 0, failed: 0, errors: [] };

  for (const row of rows) {
    try {
      // Resolve group
      let area_id = null;
      if (row.group_name) {
        let area = areas.find(
          (a) => a.name.toLowerCase() === row.group_name.toLowerCase()
        );
        if (!area) {
          const created = await addArea(row.group_name, row.delivery_boy || "");
          area = created[0];
          areas.push(area);
        }
        area_id = area.id;
      }

      // Resolve subgroup
      let subgroup_id = null;
      if (row.subgroup_name && area_id) {
        let sg = subgroups.find(
          (s) =>
            s.name.toLowerCase() === row.subgroup_name.toLowerCase() &&
            s.area_id === area_id
        );
        if (!sg) {
          const created = await addSubgroup(area_id, row.subgroup_name);
          sg = created[0];
          subgroups.push(sg);
        }
        subgroup_id = sg.id;
      }

      // Resolve brand
      let brand_id = null;
      if (row.brand_name) {
        const brand = brands.find(
          (b) => b.name.toLowerCase() === row.brand_name.toLowerCase()
        );
        if (brand) brand_id = brand.id;
      }

      await addCustomer({
        code: row.code,
        name: row.name,
        phone: row.phone || "",
        address: row.address || "",
        area_id,
        subgroup_id,
        brand_id,
        default_qty: row.qty || 1,
        custom_rate: row.rate || null,
        credit_limit: row.credit_limit || 0,
        outstanding: row.opening_balance || 0,
      });
      results.success++;
    } catch (e) {
      results.failed++;
      results.errors.push(`Row ${row.code}: ${e.message}`);
    }
  }
  return results;
}
