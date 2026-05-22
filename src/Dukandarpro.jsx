import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ScatterChart, Scatter } from "recharts";

/* ─────────────────────── DESIGN SYSTEM ──────────────────────── */
const THEME = {
  colors: {
    primary: { light: "#10b981", dark: "#059669", accent: "#34d399" },
    secondary: { light: "#8b5cf6", dark: "#7c3aed" },
    danger: { light: "#ef4444", dark: "#dc2626" },
    warning: { light: "#f59e0b", dark: "#d97706" },
    info: { light: "#0ea5e9", dark: "#0284c7" },
    success: { light: "#10b981", dark: "#059669" },
  },
  bg: { light: "#ffffff", dark: "#1e293b" },
  text: { light: "#000000", dark: "#ffffff" },
};

/* ─────────────────────── SAMPLE DATA ──────────────────────────── */
const INITIAL_PRODUCTS = [
  { id:1, name:"Basmati Rice 5kg", nameUr:"باسمتی چاول 5کلو", sku:"GR001", cat:"Grocery", buy:1200, sell:1450, stock:45, minStock:10, unit:"bag", expiry:null, supplier:"Rehman Traders", barcode:"123456789012" },
  { id:2, name:"Sunflower Oil 1L", nameUr:"سورج مکھی تیل 1لٹر", sku:"GR002", cat:"Grocery", buy:380, sell:430, stock:4, minStock:8, unit:"btl", expiry:"2026-06", supplier:"Al-Karam Wholesale", barcode:"123456789013" },
  { id:3, name:"Doodh Patti 250g", nameUr:"دودھ پتی 250گرام", sku:"GR003", cat:"Grocery", buy:240, sell:280, stock:32, minStock:10, unit:"pkt", expiry:"2025-12", supplier:"Tapal Agency", barcode:"123456789014" },
  { id:4, name:"Surf Excel 1kg", nameUr:"سرف ایکسل 1کلو", sku:"HH001", cat:"Household", buy:540, sell:600, stock:3, minStock:6, unit:"pkt", expiry:null, supplier:"Unilever Dist.", barcode:"123456789015" },
  { id:5, name:"Nestle Water 1.5L", nameUr:"نیسلے پانی 1.5لٹر", sku:"BV001", cat:"Beverages", buy:55, sell:70, stock:72, minStock:20, unit:"btl", expiry:"2025-10", supplier:"Nestle Direct", barcode:"123456789016" },
  { id:6, name:"Dalda Ghee 1kg", nameUr:"دالدا گھی 1کلو", sku:"GR004", cat:"Grocery", buy:680, sell:750, stock:18, minStock:6, unit:"tin", expiry:"2026-03", supplier:"Dalda Agency", barcode:"123456789017" },
  { id:7, name:"Pepsi 1.5L", nameUr:"پیپسی 1.5لٹر", sku:"BV002", cat:"Beverages", buy:95, sell:120, stock:24, minStock:10, unit:"btl", expiry:"2025-11", supplier:"Pepsi Direct", barcode:"123456789018" },
  { id:8, name:"Lays Masala 50g", nameUr:"لے مصالحہ 50گرام", sku:"SN001", cat:"Snacks", buy:35, sell:50, stock:60, minStock:20, unit:"pkt", expiry:"2025-09", supplier:"Frito-Lay Dist.", barcode:"123456789019" },
  { id:9, name:"Head & Shoulders", nameUr:"ہیڈ شولڈرز", sku:"COS001", cat:"Cosmetics", buy:520, sell:599, stock:2, minStock:5, unit:"btl", expiry:null, supplier:"P&G Agency", barcode:"123456789020" },
  { id:10, name:"Panadol 10s", nameUr:"پینیڈول 10گولیاں", sku:"PH001", cat:"Pharmacy", buy:28, sell:38, stock:80, minStock:30, unit:"strip", expiry:"2026-08", supplier:"GSK Pharma", barcode:"123456789021" },
];

const INITIAL_CUSTOMERS = [
  { id:1, name:"Ahmed Bhai", nameUr:"احمد بھائی", phone:"0300-1234567", email:"ahmed@example.com", addr:"Block 5, Gulshan", udhaar:2300, totalOrders:14, totalSpent:22400, points:224, notes:"Regular customer, pays on 1st of month", joined:"2024-01-15" },
  { id:2, name:"Razia Begum", nameUr:"رضیہ بیگم", phone:"0321-9876543", email:"razia@example.com", addr:"Nazimabad No.3", udhaar:0, totalOrders:9, totalSpent:13600, points:136, notes:"", joined:"2024-02-20" },
  { id:3, name:"Tariq Sahab", nameUr:"طارق صاحب", phone:"0333-5556677", email:"tariq@example.com", addr:"Liaquatabad #7", udhaar:5800, totalOrders:27, totalSpent:48000, points:480, notes:"Shop owner, bulk buyer. Call before closing.", joined:"2024-01-01" },
  { id:4, name:"Sana Bibi", nameUr:"ثنا بی بی", phone:"0311-2223344", email:"sana@example.com", addr:"North Karachi", udhaar:1200, totalOrders:6, totalSpent:8200, points:82, notes:"Prefers WhatsApp reminders", joined:"2024-03-10" },
  { id:5, name:"Kamran Bhai", nameUr:"کامران بھائی", phone:"0345-7778889", email:"kamran@example.com", addr:"Orangi Town", udhaar:0, totalOrders:18, totalSpent:31000, points:310, notes:"", joined:"2024-02-05" },
];

const INITIAL_ORDERS = [
  { id:"INV-0041", customerId:1, customerName:"Ahmed Bhai", cashier:"Ali", items:[{pid:1,name:"Basmati Rice 5kg",qty:2,buy:1200,sell:1450,disc:0},{pid:5,name:"Nestle Water 1.5L",qty:6,buy:55,sell:70,disc:0}], subtotal:3320, disc:0, total:3320, profit:620, status:"paid", method:"cash", udhaarAmt:0, createdAt:"2025-05-21T09:30:00", notes:"", timeline:[{time:"2025-05-21T09:30:00",evt:"Order created"},{time:"2025-05-21T09:31:00",evt:"Payment received"}], refunds:[] },
  { id:"INV-0040", customerId:3, customerName:"Tariq Sahab", cashier:"Ali", items:[{pid:6,name:"Dalda Ghee 1kg",qty:3,buy:680,sell:750,disc:0},{pid:3,name:"Doodh Patti 250g",qty:2,buy:240,sell:280,disc:0}], subtotal:2810, disc:100, total:2710, profit:270, status:"credit", method:"udhaar", udhaarAmt:2710, createdAt:"2025-05-21T10:15:00", notes:"He will pay at month end", timeline:[{time:"2025-05-21T10:15:00",evt:"Order created"},{time:"2025-05-21T10:16:00",evt:"Udhaar recorded"}], refunds:[] },
  { id:"INV-0039", customerId:2, customerName:"Razia Begum", cashier:"Bilal", items:[{pid:7,name:"Pepsi 1.5L",qty:4,buy:95,sell:120,disc:0},{pid:8,name:"Lays Masala 50g",qty:8,buy:35,sell:50,disc:0}], subtotal:880, disc:0, total:880, profit:220, status:"paid", method:"online", udhaarAmt:0, createdAt:"2025-05-21T11:00:00", notes:"", timeline:[{time:"2025-05-21T11:00:00",evt:"Order created"},{time:"2025-05-21T11:02:00",evt:"Payment confirmed"}], refunds:[] },
];

const INITIAL_EXPENSES = [
  { id:1, cat:"Rent", desc:"Monthly shop rent", amt:15000, date:"2025-05-01", by:"Owner" },
  { id:2, cat:"Electricity", desc:"KESC bill", amt:4200, date:"2025-05-05", by:"Owner" },
  { id:3, cat:"Staff", desc:"Staff salaries", amt:60000, date:"2025-05-10", by:"Owner" },
  { id:4, cat:"Misc", desc:"Shop supplies", amt:2500, date:"2025-05-15", by:"Ali" },
];

const INITIAL_STAFF = [
  { id:1, name:"Muhammad Ali", role:"Cashier", phone:"0301-1111222", shift:"Morning 9am-5pm", salary:22000, joined:"2024-01-15", status:"active" },
  { id:2, name:"Bilal Ahmed", role:"Cashier", phone:"0302-3334455", shift:"Evening 4pm-10pm", salary:20000, joined:"2024-03-01", status:"active" },
  { id:3, name:"Farhan Bhai", role:"Stock Manager", phone:"0303-6667788", shift:"Full Day", salary:25000, joined:"2023-08-10", status:"active" },
];

const CATEGORIES = ["All", "Grocery", "Beverages", "Household", "Snacks", "Cosmetics", "Pharmacy"];

/* ─────────────────────── UTILITIES ────────────────────────────── */
const rs = (n) => `Rs. ${Number(n).toLocaleString("en-PK")}`;
const fmtDate = (s) => new Date(s).toLocaleDateString("en-PK", { day:"numeric", month:"short", year:"numeric" });
const fmtTime = (s) => new Date(s).toLocaleTimeString("en-PK", { hour:"2-digit", minute:"2-digit" });
const fmtDT = (s) => `${fmtDate(s)} ${fmtTime(s)}`;

const loadFromStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
};
const saveToStorage = (key, val) => {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(val));
};

/* ─────────────────────── REUSABLE COMPONENTS ─────────────────── */

const Badge = ({ color, children, size = "sm" }) => {
  const sizeClass = size === "lg" ? "px-3 py-1" : "px-2.5 py-0.5";
  const colorClass = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    gray: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  };
  return (
    <span className={`inline-flex items-center ${sizeClass} rounded-full text-xs font-semibold ${colorClass[color]}`}>
      {children}
    </span>
  );
};

const Card = ({ children, className = "", onClick, selected = false }) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-2 transition-all ${selected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700'} ${className} ${onClick ? "cursor-pointer hover:shadow-md active:scale-[0.98]" : ""}`}>
    {children}
  </div>
);

const StatCard = ({ icon, label, value, sub, subColor = "text-emerald-500", gradient, onClick }) => (
  <Card onClick={onClick} className={`p-4 ${gradient || ""}`}>
    <div className="flex items-start justify-between mb-3">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl bg-white/20 dark:bg-white/10 backdrop-blur-sm">
        {icon}
      </div>
      {sub && <span className={`text-xs font-semibold ${subColor}`}>{sub}</span>}
    </div>
    <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
  </Card>
);

const Toast = ({ msg, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  const colors = { success: "bg-emerald-500", error: "bg-red-500", info: "bg-sky-500", warning: "bg-amber-500" };
  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[200] ${colors[type]} text-white px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm flex items-center gap-2 animate-bounce-in`}>
      {type === "success" ? "✅" : type === "error" ? "❌" : type === "warning" ? "⚠️" : "ℹ️"} {msg}
    </div>
  );
};

const Modal = ({ open, onClose, title, children, size = "md" }) => {
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl w-full ${sizes[size]} max-h-[92vh] overflow-y-auto shadow-2xl`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder = "", required = false }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-colors text-sm font-medium" />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>}
    <select value={value} onChange={onChange}
      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition-colors text-sm font-medium">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Btn = ({ children, onClick, variant = "primary", size = "md", className = "", disabled = false, full = false }) => {
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30",
    secondary: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-200",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400",
    violet: "bg-violet-500 hover:bg-violet-600 text-white shadow-sm shadow-violet-200",
    amber: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3.5 text-base" };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${full ? "w-full" : ""} flex items-center justify-center gap-2 ${className}`}>
      {children}
    </button>
  );
};

const EmptyState = ({ icon, title, desc, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{title}</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{desc}</p>
    {action}
  </div>
);

const KPIGrid = ({ items }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    {items.map((item, idx) => (
      <Card key={idx} className="p-4 text-center" onClick={item.onClick}>
        <div className="text-2xl mb-2">{item.icon}</div>
        <div className="text-xs text-slate-500 mb-1">{item.label}</div>
        <div className="text-lg font-black text-slate-900 dark:text-white">{item.value}</div>
        {item.change && <div className={`text-xs font-semibold mt-1 ${item.change.includes('+') ? 'text-emerald-500' : 'text-red-500'}`}>{item.change}</div>}
      </Card>
    ))}
  </div>
);

/* ─────────────────────── MAIN SECTIONS ─────────────────────── */

/* ── DASHBOARD ── */
const Dashboard = ({ products, orders, customers, expenses, lang, setPage }) => {
  const L = lang === "ur";
  const todayOrders = orders.filter(o => o.createdAt.startsWith("2025-05-21"));
  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
  const todayProfit = todayOrders.reduce((s, o) => s + o.profit, 0);
  const thisMonthOrders = orders.filter(o => o.createdAt.startsWith("2025-05"));
  const thisMonthSales = thisMonthOrders.reduce((s, o) => s + o.total, 0);
  const pendingUdhaar = customers.reduce((s, c) => s + c.udhaar, 0);
  const lowStock = products.filter(p => p.stock <= p.minStock);

  const kpis = [
    { icon: "💰", label: L ? "آج کی فروخت" : "Today Sales", value: rs(todaySales), change: "+12%", onClick: () => setPage("orders") },
    { icon: "📈", label: L ? "اس مہینے کی فروخت" : "Month Sales", value: rs(thisMonthSales), change: "+18%", onClick: () => setPage("analytics") },
    { icon: "🏦", label: L ? "آج کا منافع" : "Today Profit", value: rs(todayProfit), change: "+8%", onClick: () => setPage("analytics") },
    { icon: "🤝", label: L ? "باقی ادھار" : "Pending Udhaar", value: rs(pendingUdhaar), change: `${customers.filter(c=>c.udhaar>0).length}`, onClick: () => setPage("customers") },
  ];

  return (
    <div className="space-y-5 pb-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-emerald-100 text-sm font-medium">{L ? "خوش آمدید" : "Welcome Back"} · {fmtDate("2025-05-21")}</p>
        <h2 className="text-3xl font-black mt-1">{L ? "علی جنرل اسٹور" : "Ali General Store"}</h2>
        <div className="flex gap-8 mt-4 text-sm">
          <div><div className="text-emerald-100 text-xs">{L ? "آج کے آرڈر" : "Today Orders"}</div><div className="text-2xl font-black">{todayOrders.length}</div></div>
          <div><div className="text-emerald-100 text-xs">{L ? "کل اسٹاک" : "Total Stock Value"}</div><div className="text-2xl font-black">{rs(products.reduce((s,p)=>s+p.stock*p.buy,0))}</div></div>
          <div><div className="text-emerald-100 text-xs">{L ? "فعال سٹاف" : "Active Staff"}</div><div className="text-2xl font-black">3</div></div>
        </div>
      </div>

      {/* KPI Grid */}
      <KPIGrid items={kpis} />

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{L ? "فوری عمل" : "Quick Actions"}</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon:"🛒", label: L ? "نئی بلنگ" : "New Sale", page:"pos" },
            { icon:"📦", label: L ? "اسٹاک" : "Add Stock", page:"inventory" },
            { icon:"👥", label: L ? "گاہک" : "Customers", page:"customers" },
            { icon:"📊", label: L ? "رپورٹ" : "Reports", page:"analytics" },
          ].map(a => (
            <button key={a.page} onClick={() => setPage(a.page)}
              className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400 transition-all active:scale-95 gap-1">
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs font-bold text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-2">{L ? "کم اسٹاک الرٹ" : "Low Stock Alert"}</h3>
              <div className="space-y-1">
                {lowStock.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-amber-900 dark:text-amber-100">{p.name}</span>
                    <Badge color="amber">{p.stock} left</Badge>
                  </div>
                ))}
              </div>
              {lowStock.length > 3 && <div className="text-xs text-amber-700 dark:text-amber-300 mt-2">+{lowStock.length - 3} more items</div>}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{L ? "حالیہ فروخت" : "Recent Sales"}</h3>
          <button onClick={() => setPage("orders")} className="text-emerald-500 text-xs font-semibold hover:text-emerald-600">View All →</button>
        </div>
        <div className="space-y-2">
          {orders.slice(0, 4).map(o => (
            <div key={o.id} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-lg">🧾</div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-sm">{o.customerName}</div>
                  <div className="text-xs text-slate-500">{o.id} · {fmtTime(o.createdAt)}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900 dark:text-white text-sm">{rs(o.total)}</div>
                <Badge color={o.status === "paid" ? "green" : o.status === "credit" ? "red" : "amber"}>{o.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sales Chart */}
      <Card className="p-4">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">{L ? "اس مہینے کی فروخت" : "Monthly Trend"}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={[
            { day: "1", sales: 12400 }, { day: "5", sales: 15600 }, { day: "10", sales: 18900 },
            { day: "15", sales: 22100 }, { day: "20", sales: 27800 }, { day: "21", sales: 31200 }
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Tooltip formatter={(v) => rs(v)} />
            <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

/* ── POS / BILLING ── */
const POS = ({ products, customers, setOrders, setProducts, setCustomers, showToast, lang }) => {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [showCart, setShowCart] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const L = lang === "ur";

  const filtered = products.filter(p =>
    (activeCat === "All" || p.cat === activeCat) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const addToCart = (p) => {
    setCart(c => {
      const ex = c.find(i => i.pid === p.id);
      if (ex) return c.map(i => i.pid === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { pid: p.id, name: p.name, buy: p.buy, sell: p.sell, qty: 1, disc: 0 }];
    });
    showToast(`✅ ${p.name} added`, "success");
  };

  const removeItem = (pid) => setCart(c => c.filter(i => i.pid !== pid));
  const updateQty = (pid, qty) => {
    if (qty < 1) { removeItem(pid); return; }
    setCart(c => c.map(i => i.pid === pid ? { ...i, qty } : i));
  };
  const updateItemDisc = (pid, disc) => setCart(c => c.map(i => i.pid === pid ? { ...i, disc: +disc } : i));

  const subtotal = cart.reduce((s, i) => s + i.qty * i.sell, 0);
  const totalDisc = cart.reduce((s, i) => s + i.disc * i.qty, 0) + +discount;
  const total = subtotal - totalDisc;
  const profit = cart.reduce((s, i) => s + i.qty * (i.sell - i.buy - (i.disc || 0)), 0) - +discount;

  const checkout = () => {
    if (cart.length === 0) { showToast("Cart is empty!", "error"); return; }
    if (!selectedCustomer) { showToast("Please select a customer", "error"); return; }
    
    const inv = `INV-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const order = {
      id: inv, customerId: selectedCustomer.id, customerName: selectedCustomer.name,
      cashier: "Ali", items: cart.map(i => ({ pid: i.pid, name: i.name, qty: i.qty, buy: i.buy, sell: i.sell, disc: i.disc })),
      subtotal, disc: totalDisc, total, profit, status: payMethod === "udhaar" ? "credit" : "paid",
      method: payMethod, udhaarAmt: payMethod === "udhaar" ? total : 0,
      createdAt: new Date().toISOString(), notes: "", timeline: [{ time: new Date().toISOString(), evt: "Order created" }], refunds: []
    };

    setOrders(prev => [order, ...prev]);
    setProducts(prev => prev.map(p => {
      const ci = cart.find(i => i.pid === p.id);
      return ci ? { ...p, stock: Math.max(0, p.stock - ci.qty) } : p;
    }));

    if (payMethod === "udhaar") {
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, udhaar: c.udhaar + total } : c));
    }

    setCart([]); setSelectedCustomer(null); setDiscount(0); setShowCart(false);
    showToast(`✅ ${inv} saved! ${rs(total)}`, "success");
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch));

  return (
    <div className="flex flex-col h-full pb-24">
      {/* Customer Select & Search */}
      <div className="space-y-3 mb-4">
        <button onClick={() => setShowCustomerSearch(true)}
          className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-emerald-400 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👤</span>
            <div className="text-left">
              <div className={`text-sm font-semibold ${selectedCustomer ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                {selectedCustomer ? selectedCustomer.name : (L ? "گاہک منتخب کریں" : "Select Customer")}
              </div>
              {selectedCustomer && <div className="text-xs text-slate-500">{selectedCustomer.phone}</div>}
            </div>
          </div>
          {selectedCustomer?.udhaar > 0 && <Badge color="red">Owes {rs(selectedCustomer.udhaar)}</Badge>}
        </button>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L ? "پروڈکٹ تلاش کریں..." : "Search products..."}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none text-sm font-medium" />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeCat === cat ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}>{cat}</button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-3 mb-8 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm">{L ? "کوئی پروڈکٹ نہیں" : "No products found"}</div>
          </div>
        ) : filtered.map(p => {
          const inCart = cart.find(i => i.pid === p.id);
          const outOfStock = p.stock <= 0;
          return (
            <button key={p.id} onClick={() => !outOfStock && addToCart(p)} disabled={outOfStock}
              className={`relative p-4 rounded-2xl text-left transition-all border-2 ${
                inCart ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300"
              } ${outOfStock ? "opacity-40" : ""}`}>
              {inCart && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold shadow-sm">{inCart.qty}</div>}
              <div className="text-2xl mb-2">📦</div>
              <div className="font-bold text-slate-900 dark:text-white text-xs leading-tight mb-1 line-clamp-2">{p.name}</div>
              <div className="text-emerald-600 dark:text-emerald-400 font-black text-sm">{rs(p.sell)}</div>
              <div className="text-xs text-slate-400 mt-0.5">{outOfStock ? "Out of stock" : `${p.stock} ${p.unit}`}</div>
            </button>
          );
        })}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-50">
          <button onClick={() => setShowCart(true)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-base shadow-2xl shadow-emerald-200 dark:shadow-emerald-900 flex items-center justify-between px-5 active:scale-98 transition-all">
            <div className="flex items-center gap-3">
              <span className="bg-white text-emerald-600 w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm">{cart.reduce((s,i)=>s+i.qty,0)}</span>
              <span>{L ? "کارٹ دیکھیں" : "View Cart"}</span>
            </div>
            <span className="text-lg font-black">{rs(total)}</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      <Modal open={showCart} onClose={() => setShowCart(false)} title={`🛒 ${L ? "کارٹ" : "Cart"} (${cart.reduce((s,i)=>s+i.qty,0)} items)`} size="lg">
        <div className="space-y-3 mb-4">
          {cart.map(item => (
            <div key={item.pid} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</div>
                  <div className="text-xs text-slate-500">{rs(item.sell)} each</div>
                </div>
                <button onClick={() => removeItem(item.pid)} className="text-red-400 hover:text-red-500">✕</button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white dark:bg-slate-600 rounded-lg p-1">
                  <button onClick={() => updateQty(item.pid, item.qty - 1)} className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-500 flex items-center justify-center font-bold text-sm">−</button>
                  <span className="w-8 text-center font-black text-sm text-slate-900 dark:text-white">{item.qty}</span>
                  <button onClick={() => updateQty(item.pid, item.qty + 1)} className="w-7 h-7 rounded-md bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">+</button>
                </div>
                <input type="number" value={item.disc} onChange={e => updateItemDisc(item.pid, e.target.value)} placeholder="Disc"
                  className="flex-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                <div className="text-right">
                  <div className="font-black text-slate-900 dark:text-white text-sm">{rs(item.qty * item.sell)}</div>
                  <div className="text-xs text-emerald-500">+{rs(item.qty * (item.sell - item.buy))}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Billing Summary */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4 space-y-2 border border-slate-200 dark:border-slate-600">
          <div className="flex justify-between text-sm"><span className="text-slate-600 dark:text-slate-400">Subtotal</span><span className="font-semibold text-slate-900 dark:text-white">{rs(subtotal)}</span></div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">Discount</span>
            <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0"
              className="w-24 text-right px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm" />
          </div>
          <div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between">
            <span className="font-bold text-slate-900 dark:text-white">Total</span>
            <span className="font-black text-xl text-emerald-600 dark:text-emerald-400">{rs(total)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-4">
          <div className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-3">{L ? "ادائیگی کا طریقہ" : "Payment Method"}</div>
          <div className="grid grid-cols-3 gap-2">
            {[["cash", "💵", "Cash"], ["online", "📱", "Online"], ["udhaar", "📒", "Udhaar"]].map(([v, ico, label]) => (
              <button key={v} onClick={() => setPayMethod(v)}
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${payMethod === v ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"}`}>
                <span className="text-xl mb-1">{ico}</span>
                <span className="text-xs font-bold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => setShowCart(false)} full>Cancel</Btn>
          <Btn variant="primary" onClick={checkout} full>✅ {L ? "آرڈر مکمل" : "Complete"}</Btn>
        </div>
      </Modal>

      {/* Customer Search Modal */}
      <Modal open={showCustomerSearch} onClose={() => setShowCustomerSearch(false)} title={L ? "گاہک منتخب کریں" : "Select Customer"}>
        <Input placeholder={L ? "نام یا نمبر..." : "Name or phone..."} value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredCustomers.map(c => (
            <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerSearch(false); setCustomerSearch(""); }}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{c.name}</div>
                <div className="text-xs text-slate-500">{c.phone}</div>
              </div>
              {c.udhaar > 0 && <Badge color="red">{rs(c.udhaar)}</Badge>}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

/* ── INVENTORY MANAGEMENT ── */
const Inventory = ({ products, setProducts, showToast, lang }) => {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name: "", sku: "", cat: "Grocery", buy: "", sell: "", stock: "", minStock: "5", unit: "pcs", expiry: "", supplier: "" });
  const L = lang === "ur";

  const filtered = products.filter(p =>
    (activeCat === "All" || p.cat === activeCat) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => {
    setForm({ name: "", sku: "", cat: "Grocery", buy: "", sell: "", stock: "", minStock: "5", unit: "pcs", expiry: "", supplier: "" });
    setEditProduct(null);
    setShowAdd(true);
  };

  const saveProduct = () => {
    if (!form.name || !form.sell) { showToast("Name & sell price required", "error"); return; }
    const p = { ...form, buy: +form.buy, sell: +form.sell, stock: +form.stock, minStock: +form.minStock };
    if (editProduct) {
      setProducts(prev => prev.map(x => x.id === editProduct ? { ...x, ...p } : x));
      showToast("✅ Product updated!", "success");
    } else {
      setProducts(prev => [...prev, { ...p, id: Date.now() }]);
      showToast("✅ Product added!", "success");
    }
    setShowAdd(false);
  };

  const lowCount = products.filter(p => p.stock <= p.minStock).length;
  const stockValue = products.reduce((s, p) => s + p.stock * p.buy, 0);

  return (
    <div className="space-y-4 pb-8">
      {/* KPI Summary */}
      <KPIGrid items={[
        { icon: "📦", label: "Total SKUs", value: products.length, change: `${lowCount} low` },
        { icon: "⚠️", label: "Low Stock", value: lowCount, change: "Critical" },
        { icon: "💼", label: "Stock Value", value: rs(stockValue), change: null },
        { icon: "📊", label: "Avg Margin", value: `${Math.round(products.reduce((s, p) => s + (p.sell - p.buy) / p.sell * 100, 0) / products.length)}%`, change: null },
      ]} />

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L ? "تلاش کریں..." : "Search..."}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium" />
        </div>
        <Btn variant="primary" onClick={openAdd}>+ {L ? "شامل" : "Add"}</Btn>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeCat === cat ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Products List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon="📦" title="No products" desc="Add a product to get started" />
        ) : filtered.map(p => {
          const isLow = p.stock <= p.minStock;
          return (
            <Card key={p.id} className={`p-4 ${isLow ? "border-amber-300 dark:border-amber-700" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                    {isLow && <Badge color="amber">Low</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">{p.sku} · {p.cat}</div>
                </div>
                <Badge color="violet" size="lg">{rs(p.sell)}</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: "Buy", v: rs(p.buy), c: "text-slate-600" },
                  { l: "Stock", v: `${p.stock}`, c: isLow ? "text-amber-500 font-bold" : "" },
                  { l: "Min", v: `${p.minStock}`, c: "" },
                  { l: "Margin", v: `${Math.round((p.sell - p.buy) / p.sell * 100)}%`, c: "text-sky-500" },
                ].map(({ l, v, c }) => (
                  <div key={l} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2 text-center text-xs">
                    <div className="text-slate-400 text-[10px]">{l}</div>
                    <div className={`font-bold mt-0.5 ${c}`}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editProduct ? "Edit Product" : "Add Product"} size="lg">
        <div className="space-y-3">
          <Input label="Product Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <Input label="SKU" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
          <Select label="Category" value={form.cat} onChange={e => setForm({...form, cat: e.target.value})} options={CATEGORIES.slice(1).map(c => ({value: c, label: c}))} />
          <Input label="Buy Price" type="number" value={form.buy} onChange={e => setForm({...form, buy: e.target.value})} />
          <Input label="Sell Price *" type="number" value={form.sell} onChange={e => setForm({...form, sell: e.target.value})} required />
          <Input label="Stock" type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
          <Input label="Min Stock" type="number" value={form.minStock} onChange={e => setForm({...form, minStock: e.target.value})} />
          <Select label="Unit" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} options={["pcs", "kg", "l", "bag", "box", "pkt"].map(u => ({value: u, label: u}))} />
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setShowAdd(false)} full>Cancel</Btn>
            <Btn variant="primary" onClick={saveProduct} full>💾 Save</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ── ORDERS HISTORY ── */
const OrdersHistory = ({ orders, lang }) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const L = lang === "ur";

  const filtered = orders.filter(o => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4 pb-8">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L ? "تلاش کریں..." : "Search..."}
          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm" />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {[["all", "All"], ["paid", "Paid"], ["credit", "Credit"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === v ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState icon="🧾" title="No orders" desc="Start making sales" />
        ) : filtered.map(o => (
          <Card key={o.id} className="p-4" onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-emerald-600 dark:text-emerald-400">{o.id}</span>
                  <Badge color={o.status === "paid" ? "green" : "red"}>{o.status}</Badge>
                </div>
                <div className="font-bold text-slate-900 dark:text-white">{o.customerName}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-slate-900 dark:text-white text-lg">{rs(o.total)}</div>
                <div className="text-xs text-emerald-500">+{rs(o.profit)}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{fmtDT(o.createdAt)}</span>
              <span className="transition-transform" style={{transform: expandedId === o.id ? "rotate(180deg)" : ""}}>▾</span>
            </div>

            {expandedId === o.id && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                {o.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{item.name} ×{item.qty}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{rs(item.qty * item.sell)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold">
                  <span>Total</span>
                  <span className="text-emerald-600">{rs(o.total)}</span>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ── CUSTOMERS ── */
const Customers = ({ customers, setCustomers, orders, showToast, lang }) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", addr: "", notes: "" });
  const L = lang === "ur";

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const saveCustomer = () => {
    if (!form.name || !form.phone) { showToast("Name & phone required", "error"); return; }
    setCustomers(prev => [...prev, { ...form, id: Date.now(), udhaar: 0, totalOrders: 0, totalSpent: 0, points: 0, joined: new Date().toISOString().split('T')[0] }]);
    showToast(`✅ ${form.name} added!`, "success");
    setShowAdd(false);
    setForm({ name: "", phone: "", addr: "", notes: "" });
  };

  const totalUdhaar = customers.reduce((s, c) => s + c.udhaar, 0);

  if (selected) {
    const customerOrders = orders.filter(o => o.customerId === selected.id);
    return (
      <div className="space-y-4 pb-8">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-emerald-500 font-bold text-sm">← Back</button>
        <Card className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-black text-2xl">{selected.name[0]}</div>
            <div>
              <h2 className="font-black text-xl text-slate-900 dark:text-white">{selected.name}</h2>
              <div className="text-sm text-slate-500">{selected.phone}</div>
              {selected.addr && <div className="text-xs text-slate-400">📍 {selected.addr}</div>}
            </div>
          </div>
          <KPIGrid items={[
            { icon: "📊", label: "Orders", value: selected.totalOrders },
            { icon: "💰", label: "Spent", value: rs(selected.totalSpent) },
            { icon: "🏆", label: "Points", value: selected.points },
            { icon: "🤝", label: "Udhaar", value: rs(selected.udhaar) },
          ]} />
        </Card>

        <div>
          <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-3">Order History</h3>
          {customerOrders.length === 0 ? (
            <EmptyState icon="🧾" title="No orders" desc="No purchase history" />
          ) : (
            <div className="space-y-2">
              {customerOrders.map(o => (
                <Card key={o.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{o.id}</div>
                      <div className="text-xs text-slate-500">{fmtDate(o.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900 dark:text-white">{rs(o.total)}</div>
                      <Badge color={o.status === "paid" ? "green" : "red"}>{o.status}</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <KPIGrid items={[
        { icon: "👥", label: "Total", value: customers.length },
        { icon: "🤝", label: "Udhaar", value: rs(totalUdhaar) },
        { icon: "💰", label: "Avg Spent", value: rs(customers.length > 0 ? customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length : 0) },
        { icon: "🏆", label: "Points", value: customers.reduce((s, c) => s + c.points, 0) },
      ]} />

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L ? "تلاش کریں..." : "Search..."}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm" />
        </div>
        <Btn variant="primary" onClick={() => setShowAdd(true)}>+ Add</Btn>
      </div>

      <div className="space-y-3">
        {filtered.map(c => (
          <Card key={c.id} className="p-4" onClick={() => setSelected(c)}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-black text-lg">{c.name[0]}</div>
              <div className="flex-1">
                <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                <div className="text-xs text-slate-500">{c.phone} · {c.totalOrders} orders</div>
              </div>
              {c.udhaar > 0 ? <Badge color="red">{rs(c.udhaar)}</Badge> : <Badge color="green">Clear</Badge>}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={L ? "گاہک شامل کریں" : "Add Customer"}>
        <Input label="Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <Input label="Phone *" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} type="tel" required />
        <Input label="Address" value={form.addr} onChange={e => setForm({...form, addr: e.target.value})} />
        <Input label="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        <Btn variant="primary" onClick={saveCustomer} full>✅ Save</Btn>
      </Modal>
    </div>
  );
};

/* ── EXPENSES ── */
const Expenses = ({ expenses, setExpenses, showToast, lang }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ cat: "Rent", desc: "", amt: "", date: "", by: "Owner" });
  const L = lang === "ur";
  const totalExp = expenses.reduce((s, e) => s + e.amt, 0);

  const save = () => {
    if (!form.desc || !form.amt) { showToast("Fill all fields", "error"); return; }
    setExpenses(prev => [...prev, { ...form, id: Date.now(), amt: +form.amt }]);
    showToast("✅ Expense added!", "success");
    setShowAdd(false);
    setForm({ cat: "Rent", desc: "", amt: "", date: "", by: "Owner" });
  };

  return (
    <div className="space-y-4 pb-8">
      <StatCard icon="💸" label={L ? "کل اخراجات" : "Total Expenses"} value={rs(totalExp)} sub="This month" />

      <Btn variant="danger" onClick={() => setShowAdd(true)} full>+ Add Expense</Btn>

      <div className="space-y-3">
        {expenses.map(e => (
          <Card key={e.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">{e.desc}</div>
                <div className="text-xs text-slate-500">{e.cat} · {e.date} · {e.by}</div>
              </div>
              <div className="font-black text-red-500">{rs(e.amt)}</div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Expense">
        <Select label="Category" value={form.cat} onChange={e => setForm({...form, cat: e.target.value})} options={["Rent", "Electricity", "Staff", "Misc"].map(c => ({value: c, label: c}))} />
        <Input label="Description *" value={form.desc} onChange={e => setForm({...form, desc: e.target.value})} required />
        <Input label="Amount *" type="number" value={form.amt} onChange={e => setForm({...form, amt: e.target.value})} required />
        <Input label="Date" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
        <Btn variant="danger" onClick={save} full>💾 Save</Btn>
      </Modal>
    </div>
  );
};

/* ── STAFF ── */
const Staff = ({ staff, setStaff, showToast, lang }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Cashier", phone: "", shift: "9am-5pm", salary: "", status: "active" });
  const L = lang === "ur";

  const save = () => {
    if (!form.name || !form.salary) { showToast("Fill required fields", "error"); return; }
    setStaff(prev => [...prev, { ...form, id: Date.now(), joined: new Date().toISOString().split('T')[0], salary: +form.salary }]);
    showToast(`✅ ${form.name} added!`, "success");
    setShowAdd(false);
  };

  return (
    <div className="space-y-4 pb-8">
      <StatCard icon="👔" label={L ? "کل سٹاف" : "Total Staff"} value={staff.length} sub="Active members" />

      <Btn variant="violet" onClick={() => setShowAdd(true)} full>+ Add Staff</Btn>

      <div className="space-y-3">
        {staff.map(s => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-black text-lg">{s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
              <div className="flex-1">
                <div className="font-black text-slate-900 dark:text-white">{s.name}</div>
                <div className="text-sm text-slate-500">{s.role}</div>
              </div>
              <Badge color={s.status === "active" ? "green" : "gray"}>{s.status}</Badge>
            </div>
            <KPIGrid items={[
              { icon: "💰", label: "Salary", value: rs(s.salary) },
              { icon: "⏰", label: "Shift", value: s.shift },
              { icon: "📅", label: "Joined", value: fmtDate(s.joined) },
            ]} />
          </Card>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Staff">
        <Input label="Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <Select label="Role" value={form.role} onChange={e => setForm({...form, role: e.target.value})} options={["Cashier", "Stock Manager", "Manager"].map(r => ({value: r, label: r}))} />
        <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} type="tel" />
        <Input label="Shift" value={form.shift} onChange={e => setForm({...form, shift: e.target.value})} />
        <Input label="Salary *" type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} required />
        <Btn variant="violet" onClick={save} full>💾 Save</Btn>
      </Modal>
    </div>
  );
};

/* ── ANALYTICS ── */
const Analytics = ({ orders, products, customers, expenses, lang }) => {
  const L = lang === "ur";
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalProfit = orders.reduce((s, o) => s + o.profit, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amt, 0);
  const netProfit = totalProfit - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0;

  const topProducts = products
    .map(p => {
      let sold = 0, rev = 0;
      orders.forEach(o => o.items.forEach(i => {
        if (i.pid === p.id) { sold += i.qty; rev += i.qty * i.sell; }
      }));
      return { ...p, sold, rev };
    })
    .filter(p => p.sold > 0)
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 5);

  return (
    <div className="space-y-5 pb-8">
      <KPIGrid items={[
        { icon: "💰", label: "Revenue", value: rs(totalRevenue), change: orders.length + " orders" },
        { icon: "📈", label: "Profit", value: rs(totalProfit), change: profitMargin + "% margin" },
        { icon: "💸", label: "Expenses", value: rs(totalExpenses), change: "This month" },
        { icon: "🏦", label: "Net Profit", value: rs(netProfit), change: netProfit > 0 ? "Positive ✅" : "Negative ⚠️" },
      ]} />

      <Card className="p-4">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Top Products</h3>
        <div className="space-y-3">
          {topProducts.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center font-bold text-sm">{i + 1}</div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</div>
                  <div className="text-xs text-slate-500">{p.sold} units sold</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-emerald-600 dark:text-emerald-400">{rs(p.rev)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ── SETTINGS ── */
const Settings = ({ lang, setLang, dark, setDark, showToast }) => {
  const L = lang === "ur";
  const [shop, setShop] = useState({ name: "Ali General Store", owner: "Muhammad Ali", phone: "0300-1234567", address: "Block 5, Gulshan-e-Iqbal, Karachi" });

  return (
    <div className="space-y-5 pb-8">
      <Card className="p-5">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">{L ? "دکان کی معلومات" : "Shop Information"}</h3>
        <Input label="Shop Name" value={shop.name} onChange={e => setShop({...shop, name: e.target.value})} />
        <Input label="Owner Name" value={shop.owner} onChange={e => setShop({...shop, owner: e.target.value})} />
        <Input label="Phone" value={shop.phone} onChange={e => setShop({...shop, phone: e.target.value})} type="tel" />
        <Input label="Address" value={shop.address} onChange={e => setShop({...shop, address: e.target.value})} />
      </Card>

      <Card className="p-5">
        <h3 className="font-bold text-slate-800 dark:text-white mb-4">{L ? "ترجیحات" : "Preferences"}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{L ? "زبان" : "Language"}</span>
            <div className="flex gap-2">
              {[["en", "EN"], ["ur", "اردو"]].map(([k, l]) => (
                <button key={k} onClick={() => setLang(k)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${lang === k ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{L ? "ڈارک موڈ" : "Dark Mode"}</span>
            <button onClick={() => setDark(!dark)}
              className={`w-14 h-7 rounded-full transition-colors relative ${dark ? "bg-emerald-500" : "bg-slate-200"}`}>
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${dark ? "left-8" : "left-1"}`} />
            </button>
          </div>
        </div>
      </Card>

      <Btn variant="primary" onClick={() => showToast("✅ Settings saved!", "success")} full size="lg">💾 Save All</Btn>

      <div className="text-center py-6">
        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">🏪 DukanDar Pro</div>
        <div className="text-xs text-slate-500 mt-2">Professional Shop Management System</div>
        <div className="text-xs text-slate-400 mt-1">v2.0.0 • Made for Pakistani Shopkeepers</div>
      </div>
    </div>
  );
};

/* ─────────────────────── MAIN APP ──────────────────────────────── */
export default function DukanDarPro() {
  const [page, setPage] = useState("home");
  const [lang, setLang] = useState("en");
  const [dark, setDark] = useState(false);
  const [products, setProducts] = useState(loadFromStorage("products", INITIAL_PRODUCTS));
  const [customers, setCustomers] = useState(loadFromStorage("customers", INITIAL_CUSTOMERS));
  const [orders, setOrders] = useState(loadFromStorage("orders", INITIAL_ORDERS));
  const [expenses, setExpenses] = useState(loadFromStorage("expenses", INITIAL_EXPENSES));
  const [staff, setStaff] = useState(loadFromStorage("staff", INITIAL_STAFF));
  const [toast, setToast] = useState(null);

  // Save to localStorage whenever data changes
  useEffect(() => { saveToStorage("products", products); }, [products]);
  useEffect(() => { saveToStorage("customers", customers); }, [customers]);
  useEffect(() => { saveToStorage("orders", orders); }, [orders]);
  useEffect(() => { saveToStorage("expenses", expenses); }, [expenses]);
  useEffect(() => { saveToStorage("staff", staff); }, [staff]);

  const showToast = useCallback((msg, type = "success") => setToast({ msg, type }), []);

  const L = lang === "ur";
  const lowCount = products.filter(p => p.stock <= p.minStock).length;

  const navItems = [
    { key: "home", icon: "🏠", label: L ? "ہوم" : "Home" },
    { key: "pos", icon: "🛒", label: L ? "بلنگ" : "POS" },
    { key: "orders", icon: "🧾", label: L ? "آرڈر" : "Orders" },
    { key: "inventory", icon: "📦", label: L ? "اسٹاک" : "Stock", badge: lowCount },
    { key: "customers", icon: "👥", label: L ? "گاہک" : "People" },
  ];

  const moreItems = [
    { key: "expenses", icon: "💸", label: L ? "اخراجات" : "Expenses" },
    { key: "staff", icon: "👔", label: L ? "سٹاف" : "Staff" },
    { key: "analytics", icon: "📊", label: L ? "رپورٹ" : "Reports" },
    { key: "settings", icon: "⚙️", label: L ? "سیٹنگ" : "Settings" },
  ];

  const pageComponents = {
    home: <Dashboard products={products} orders={orders} customers={customers} expenses={expenses} lang={lang} setPage={setPage} />,
    pos: <POS products={products} customers={customers} setOrders={setOrders} setProducts={setProducts} setCustomers={setCustomers} showToast={showToast} lang={lang} />,
    orders: <OrdersHistory orders={orders} lang={lang} />,
    inventory: <Inventory products={products} setProducts={setProducts} showToast={showToast} lang={lang} />,
    customers: <Customers customers={customers} setCustomers={setCustomers} orders={orders} showToast={showToast} lang={lang} />,
    expenses: <Expenses expenses={expenses} setExpenses={setExpenses} showToast={showToast} lang={lang} />,
    staff: <Staff staff={staff} setStaff={setStaff} showToast={showToast} lang={lang} />,
    analytics: <Analytics orders={orders} products={products} customers={customers} expenses={expenses} lang={lang} />,
    settings: <Settings lang={lang} setLang={setLang} dark={dark} setDark={setDark} showToast={showToast} />,
  };

  const pageTitles = {
    home: "Dashboard", pos: "POS", orders: "Orders", inventory: "Inventory",
    customers: "Customers", expenses: "Expenses", staff: "Staff", analytics: "Analytics", settings: "Settings"
  };

  return (
    <div className={dark ? "dark" : ""} dir={L ? "rtl" : "ltr"}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans pb-24">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap');
          .no-scrollbar::-webkit-scrollbar { display:none; }
          .no-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
          @keyframes bounce-in { 0%{transform:translate(-50%,-20px);opacity:0} 60%{transform:translate(-50%,4px);opacity:1} 100%{transform:translate(-50%,0)} }
          .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
          * { font-family: ${L ? "'Noto Nastaliq Urdu', serif" : "'Outfit', sans-serif"}; }
          .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        `}</style>

        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

        {/* Header */}
        <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-md">د</div>
              <div>
                <div className="font-black text-slate-900 dark:text-white text-lg">{L ? "دکانDar" : "DukanDar"}</div>
                <div className="text-xs text-slate-500">{pageTitles[page]}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lowCount > 0 && (
                <button onClick={() => setPage("inventory")} className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-200">
                  ⚠️ {lowCount}
                </button>
              )}
              <button onClick={() => setDark(!dark)} className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg hover:bg-slate-200">
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>

          {/* Secondary Nav */}
          <div className="flex gap-1 px-3 pb-2 overflow-x-auto no-scrollbar max-w-2xl mx-auto">
            {moreItems.map(n => (
              <button key={n.key} onClick={() => setPage(n.key)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${page === n.key ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200"}`}>
                {n.icon} {n.label}
              </button>
            ))}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 pt-5">
          {pageComponents[page]}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-2xl">
          <div className="flex items-center justify-around px-2 py-3 max-w-2xl mx-auto">
            {navItems.map(n => (
              <button key={n.key} onClick={() => setPage(n.key)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all ${page === n.key ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}>
                <div className="relative">
                  <span className="text-xl">{n.icon}</span>
                  {n.badge > 0 && (
                    <span className="absolute -top-2 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-sm">{n.badge}</span>
                  )}
                </div>
                <span className={`text-[10px] font-bold ${page === n.key ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>{n.label}</span>
                {page === n.key && <div className="w-1 h-1 rounded-full bg-emerald-500" />}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}