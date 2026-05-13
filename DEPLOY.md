# MilkFlow — Deployment Guide
**Saikrishna Milk Supply Business Automation**

---

## 🚀 Deploy to Vercel (5 minutes)

### Step 1 — Upload to GitHub
1. Go to github.com → New Repository
2. Name it: `milkflow`
3. Upload ALL files from this zip
4. Click "Commit changes"

### Step 2 — Deploy on Vercel
1. Go to vercel.com → "Add New Project"
2. Import from GitHub → select `milkflow`
3. Framework: **Vite** (auto-detected)
4. Click **Deploy**
5. Done! Your app is live in 2 minutes.

### Step 3 — Your URLs
After deploy, you get:
- `https://milkflow.vercel.app` — Home screen
- `https://milkflow.vercel.app/?role=father` — Father's entry (bookmark this on Android)
- `https://milkflow.vercel.app/?role=owner` — Owner dashboard
- `https://milkflow.vercel.app/c/C001` — Customer C001's portal

---

## 📱 Add to Android Home Screen (Father's phone)

1. Open Chrome on Father's phone
2. Go to: `https://milkflow.vercel.app/?role=father`
3. Tap ⋮ menu → "Add to Home screen"
4. Name it: **పాలు నమోదు**
5. Father taps this icon → goes directly to PIN screen

---

## 🔐 PINs

| User | PIN |
|------|-----|
| Father | `0000` |
| Owner | `1234` |

Change PINs in Supabase → settings table.

---

## 🗄️ Supabase Connection

Already configured in App.jsx:
- URL: `https://ehsqnfmctdosebfcakwv.supabase.co`
- Key: `sb_publishable_r85tUWIcXp-tRJ7OypsXWw_Oy4ijkfh`
- All 12 tables ready ✅

**Add customers:** Go to Owner Dashboard → Customers → Add
Or import via Excel (coming in Week 6)

---

## 📦 File Structure

```
milkflow/
├── index.html              — App entry point
├── vite.config.js          — Build config
├── vercel.json             — Deployment routing
├── package.json            — Dependencies
├── public/
│   └── manifest.json       — PWA manifest (home screen icon)
└── src/
    ├── main.jsx            — React root
    ├── App.jsx             — ENTIRE APP (all screens)
    └── lib/
        └── supabase.js     — DB connection
```

---

## 🔜 What's Built (Week 1-2)

✅ Home screen — role selector
✅ Father's entry screen — Telugu, icon-based, PIN protected
✅ Owner dashboard — 5 sections (Home, Customers, Records, Billing, Payments)
✅ Customer portal — Bill view, Records, Pay button
✅ Supabase integration — all screens connected
✅ Demo data fallback — works even if DB not accessible
✅ PWA manifest — add to home screen
✅ Vercel routing — /c/CODE for customer portals

## 🔜 Coming Next (Week 3-4)

- [ ] WhatsApp bill sending button
- [ ] Screenshot OCR payment upload
- [ ] SMS parsing integration
- [ ] Bill PDF generation
- [ ] Excel import/export
- [ ] Bulk WhatsApp sending

---

## 💡 Customer Portal Links

Format: `https://yourdomain.vercel.app/c/C001`

Send each customer their personal link once on WhatsApp.
They bookmark it forever — no login needed.

---

*MilkFlow v1.0 — Week 1-2 Build Complete*
